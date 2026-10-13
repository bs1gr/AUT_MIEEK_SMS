"""Tests for maintenance endpoints in Control Panel.

Tests authentication settings management via /control/api/maintenance/*.
"""

import json
from pathlib import Path

import pytest

from backend.environment import RuntimeContext, RuntimeEnvironment
from backend.routers.control import maintenance


def test_get_auth_settings(client):
    """Test retrieving current auth settings."""
    resp = client.get("/control/api/maintenance/auth-settings")
    assert resp.status_code == 200

    data = resp.json()
    assert "auth_enabled" in data
    assert "auth_mode" in data
    assert "auth_login_max_attempts" in data
    assert "auth_login_lockout_seconds" in data
    assert "source" in data
    assert "effective_policy" in data

    # Check auth_mode is one of valid values
    assert data["auth_mode"] in ["disabled", "permissive", "strict"]


def test_get_auth_policy_guide(client):
    """Test retrieving auth policy documentation."""
    resp = client.get("/control/api/maintenance/auth-policy-guide")
    assert resp.status_code == 200

    data = resp.json()
    assert "policies" in data
    assert "settings" in data
    assert "examples" in data

    # Check all three policies are documented
    assert "disabled" in data["policies"]
    assert "permissive" in data["policies"]
    assert "strict" in data["policies"]

    # strict is the recommended mode; permissive lets anonymous requests through
    # unchecked (rbac.require_permission) and must never be recommended
    assert data["policies"]["strict"].get("recommended") is True
    assert not data["policies"]["permissive"].get("recommended")
    assert data["examples"]["production_recommended"]["AUTH_MODE"] == "strict"


@pytest.fixture(autouse=True)
def sandbox_env_file(tmp_path, monkeypatch):
    """Point the auth-settings writer at a temp .env.

    _resolve_env_file() resolves to the developer's real src/backend/.env. These
    tests used to POST auth_mode=permissive there unsandboxed (the old Path.resolve
    mock never worked), so every test run silently switched the local dev server
    to permissive auth.
    """
    env_file = tmp_path / ".env"
    env_file.write_text("AUTH_ENABLED=false\nAUTH_MODE=disabled\n", encoding="utf-8")
    monkeypatch.setattr(maintenance, "_resolve_env_file", lambda: (env_file, "backend/.env"))
    return env_file


def test_update_auth_settings_with_auth_mode(client, sandbox_env_file):
    """Updating AUTH_MODE rewrites the active .env."""
    resp = client.post("/control/api/maintenance/auth-settings", json={"auth_mode": "strict"})

    assert resp.status_code == 200, resp.text
    assert "AUTH_MODE=strict" in sandbox_env_file.read_text(encoding="utf-8").splitlines()


def test_update_auth_settings_multiple_values(client, sandbox_env_file):
    """Updating several auth settings at once writes all of them."""
    resp = client.post(
        "/control/api/maintenance/auth-settings",
        json={"auth_enabled": True, "auth_mode": "permissive", "auth_login_max_attempts": 10},
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    lines = sandbox_env_file.read_text(encoding="utf-8").splitlines()
    assert "AUTH_MODE=permissive" in lines
    assert "AUTH_LOGIN_MAX_ATTEMPTS=10" in lines


def test_update_auth_settings_validation(client):
    """Test validation of auth settings."""
    # Invalid auth_mode
    resp = client.post("/control/api/maintenance/auth-settings", json={"auth_mode": "invalid_mode"})
    assert resp.status_code == 422  # Validation error

    # Invalid auth_login_max_attempts (too high)
    resp = client.post("/control/api/maintenance/auth-settings", json={"auth_login_max_attempts": 999})
    assert resp.status_code == 422  # Validation error


def test_auth_settings_endpoint_exists_in_openapi(client):
    """Verify maintenance endpoints are registered in OpenAPI schema."""
    resp = client.get("/openapi.json")
    assert resp.status_code == 200

    openapi = resp.json()
    paths = openapi.get("paths", {})

    # Check our new endpoints are registered
    assert "/control/api/maintenance/auth-settings" in paths
    assert "/control/api/maintenance/auth-policy-guide" in paths


def test_updates_check_preview_channel(client, monkeypatch):
    """Preview channel check should return selected channel metadata."""
    from backend.routers.control import maintenance

    monkeypatch.setattr(
        maintenance,
        "_fetch_github_release",
        lambda channel="stable": {
            "tag_name": "v9.9.9",
            "html_url": "https://example.invalid/release",
            "name": "Preview build",
            "body": "Preview notes",
            "assets": [],
        },
    )

    resp = client.get("/control/api/maintenance/updates/check?channel=preview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["release_channel"] == "preview"
    assert data["latest_version"] == "9.9.9"


def test_updates_check_docker_mode_returns_manual_instructions(client, monkeypatch):
    """Docker deployments should return manual host-script update instructions."""
    from backend.routers.control import maintenance
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(
            environment=RuntimeEnvironment.PRODUCTION,
            is_docker=True,
            is_ci=False,
            source="test",
        ),
    )
    monkeypatch.setattr(
        maintenance,
        "_fetch_github_release",
        lambda channel="stable": {
            "tag_name": "v9.9.9",
            "html_url": "https://example.invalid/release",
            "name": "Docker release",
            "body": "Release notes",
            "assets": [],
        },
    )
    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.0.0")

    monkeypatch.setenv("SMS_HOST_UPDATER_BRIDGE", "0")

    resp = client.get("/control/api/maintenance/updates/check")
    assert resp.status_code == 200
    data = resp.json()
    assert data["deployment_mode"] == "docker"
    assert data["update_method"] == "host_task"
    assert data["host_updater_ready"] is False
    assert data["update_available"] is True
    assert data["update_instructions_key"] == "maintenance.update.instructions_docker"
    # -UpdateClean only rebuilds the installed sources; a release needs its installer first
    assert "DOCKER.ps1 -Update" in data["update_instructions"]
    assert "SMS_Installer" in data["update_instructions"]


def test_auto_install_update_docker_mode_blocked(client, monkeypatch):
    """Auto-installer must be blocked in Docker deployments."""
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(
            environment=RuntimeEnvironment.PRODUCTION,
            is_docker=True,
            is_ci=False,
            source="test",
        ),
    )
    monkeypatch.setenv("SMS_HOST_UPDATER_BRIDGE", "0")

    resp = client.post(
        "/control/api/maintenance/updates/auto-install",
        json={"channel": "stable", "install_mode": "silent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert data["message_key"] == "maintenance.update.auto_install_docker_blocked"
    assert data["details"]["deployment_mode"] == "docker"
    assert data["details"]["bridge_enabled"] is False
    assert data["details"]["host_updater_ready"] is False


def _docker_context(monkeypatch):
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(environment=RuntimeEnvironment.PRODUCTION, is_docker=True, is_ci=False, source="test"),
    )


def _heartbeat(trigger_dir: Path, age_seconds: float = 0.0) -> None:
    import os
    import time

    beat = trigger_dir / "update_watcher_heartbeat.json"
    beat.write_text("{}", encoding="utf-8")
    stamp = time.time() - age_seconds
    os.utime(beat, (stamp, stamp))


def test_docker_update_is_refused_when_the_host_task_is_not_running(client, monkeypatch, tmp_path):
    # A writable trigger directory with nobody watching it used to accept the request, which then
    # waited forever. Without a recent heartbeat from the host task the update is refused.
    _docker_context(monkeypatch)
    monkeypatch.setenv("SMS_HOST_UPDATER_BRIDGE", "auto")
    monkeypatch.setenv("SMS_HOST_UPDATER_TRIGGER_DIR", str(tmp_path))
    _heartbeat(tmp_path, age_seconds=600)  # a task that stopped ten minutes ago

    data = client.post("/control/api/maintenance/updates/auto-install", json={"channel": "stable"}).json()
    assert data["success"] is False
    assert data["message_key"] == "maintenance.update.auto_install_docker_blocked"
    assert not list(tmp_path.glob("update_request_*.json"))


def test_docker_status_survives_the_container_rebuild(client, monkeypatch, tmp_path):
    # The update rebuilds the container, so the job held in memory is gone when the app returns;
    # the host task's status file still says how it ended.
    from backend.routers.control import maintenance

    _docker_context(monkeypatch)
    monkeypatch.setenv("SMS_HOST_UPDATER_BRIDGE", "1")
    monkeypatch.setenv("SMS_HOST_UPDATER_TRIGGER_DIR", str(tmp_path))
    job_id = "ab" * 16
    (tmp_path / f"update_status_{job_id}.json").write_text(
        json.dumps({"job_id": job_id, "status": "completed", "phase": "bridge_completed",
                    "progress_percent": 100, "message": "Updated to 1.18.57.", "target_version": "1.18.57"}),
        encoding="utf-8",
    )
    assert maintenance._get_auto_update_job(job_id) is None

    data = client.get(f"/control/api/maintenance/updates/auto-install/{job_id}/status").json()
    assert (data["status"], data["phase"], data["target_version"]) == ("completed", "bridge_completed", "1.18.57")


def test_native_checkout_is_never_updated_with_the_installer(client, monkeypatch):
    # A developer's checkout (NATIVE.ps1) used to download and run the full installer over itself.
    from backend.routers.control import maintenance
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(environment=RuntimeEnvironment.DEVELOPMENT, is_docker=False, is_ci=False, source="test"),
    )
    monkeypatch.delenv("SMS_DEPLOYMENT_MODE", raising=False)
    started = []
    monkeypatch.setattr(maintenance, "_start_auto_update_job", lambda *args: started.append(args))

    data = client.post("/control/api/maintenance/updates/auto-install", json={"channel": "stable"}).json()
    assert data["success"] is False
    assert data["message_key"] == "maintenance.update.auto_install_native_manual"
    assert started == []

    monkeypatch.setattr(maintenance, "_fetch_github_release", lambda channel="stable": {"tag_name": "v9.9.9", "assets": []})
    check = client.get("/control/api/maintenance/updates/check").json()
    assert (check["deployment_mode"], check["update_method"]) == ("native", "manual")
    assert "git pull --ff-only" in check["update_instructions"]


def test_auto_install_update_docker_mode_host_bridge_start(client, monkeypatch, tmp_path):
    """Docker mode should queue host-bridge update when enabled."""
    from backend.routers.control import maintenance
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(
            environment=RuntimeEnvironment.PRODUCTION,
            is_docker=True,
            is_ci=False,
            source="test",
        ),
    )
    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.18.7")
    monkeypatch.setenv("SMS_HOST_UPDATER_BRIDGE", "1")
    monkeypatch.setenv("SMS_HOST_UPDATER_TRIGGER_DIR", str(tmp_path))
    _heartbeat(tmp_path)

    resp = client.post(
        "/control/api/maintenance/updates/auto-install",
        json={"channel": "stable", "install_mode": "silent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["details"]["mode"] == "docker_host_bridge"
    job_id = data["details"]["job_id"]
    trigger_file = tmp_path / f"update_request_{job_id}.json"
    assert trigger_file.exists() is True

    trigger_payload = json.loads(trigger_file.read_text(encoding="utf-8"))
    assert trigger_payload["job_id"] == job_id
    assert trigger_payload["action"] == "install_latest_release"
    assert "command" not in trigger_payload  # the host task never runs a command from the container


def test_auto_install_update_docker_mode_status_sync_from_bridge(client, monkeypatch, tmp_path):
    """Status endpoint should reflect bridge watcher status payload updates."""
    from backend.routers.control import maintenance
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(
            environment=RuntimeEnvironment.PRODUCTION,
            is_docker=True,
            is_ci=False,
            source="test",
        ),
    )
    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.18.7")
    monkeypatch.setenv("SMS_HOST_UPDATER_BRIDGE", "1")
    monkeypatch.setenv("SMS_HOST_UPDATER_TRIGGER_DIR", str(tmp_path))
    _heartbeat(tmp_path)

    resp = client.post(
        "/control/api/maintenance/updates/auto-install",
        json={"channel": "stable", "install_mode": "silent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    job_id = data["details"]["job_id"]

    status_file = tmp_path / f"update_status_{job_id}.json"
    status_file.write_text(
        json.dumps(
            {
                "job_id": job_id,
                "status": "completed",
                "phase": "bridge_completed",
                "progress_percent": 100,
                "message": "Host update completed successfully.",
                "target_version": "1.18.8",
            }
        ),
        encoding="utf-8",
    )

    status_resp = client.get(f"/control/api/maintenance/updates/auto-install/{job_id}/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "completed"
    assert status_data["phase"] == "bridge_completed"
    assert status_data["progress_percent"] == 100
    assert status_data["target_version"] == "1.18.8"


def _lite_launch_mocks(monkeypatch):
    """SMS Lite mode with the UAC launch and the process exit replaced by recorders."""
    from backend.routers.control import maintenance
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(environment=RuntimeEnvironment.DEVELOPMENT, is_docker=False, is_ci=False, source="test"),
    )
    monkeypatch.setenv("SMS_DEPLOYMENT_MODE", "lite")
    monkeypatch.setattr(maintenance, "_is_native_windows", lambda: True)
    calls = {"launched": [], "exits": 0}
    monkeypatch.setattr(maintenance, "_launch_installer_elevated", lambda path, args: calls["launched"].append((path, args)))

    def _exit():
        calls["exits"] += 1

    monkeypatch.setattr(maintenance, "_schedule_lite_exit", _exit)
    monkeypatch.setattr(maintenance, "_start_auto_update_job", lambda job_id, payload, current: maintenance._run_auto_update_job(job_id, payload, current))
    return calls


def test_lite_update_installs_only_the_lite_edition_through_uac(client, monkeypatch, tmp_path):
    """SMS Lite: download, verify, start the installer elevated with the Lite-only switches, exit."""
    from backend.routers.control import maintenance

    calls = _lite_launch_mocks(monkeypatch)
    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.0.0")
    monkeypatch.setattr(
        maintenance,
        "_fetch_github_release",
        lambda channel="stable": {
            "tag_name": "v1.0.1",
            "html_url": "https://example.invalid/release",
            "assets": [
                {"name": "SMS_Installer_1.0.1.exe", "browser_download_url": "https://example.invalid/sms.exe"},
                {
                    "name": "SMS_Installer_1.0.1.exe.sha256",
                    "browser_download_url": "https://example.invalid/sms.exe.sha256",
                },
            ],
        },
    )
    monkeypatch.setattr(maintenance, "_download_text", lambda _url: "deadbeef" * 8)

    def _mock_download_file(_url, destination, progress_callback=None):
        destination.write_bytes(b"x")
        if progress_callback:
            progress_callback(1, 1)
        return "deadbeef" * 8

    monkeypatch.setattr(maintenance, "_download_file", _mock_download_file)
    monkeypatch.setattr(maintenance, "_get_updates_download_dir", lambda: Path(tmp_path))

    resp = client.post(
        "/control/api/maintenance/updates/auto-install",
        json={"channel": "stable", "install_mode": "silent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    job_id = data["details"]["job_id"]
    assert isinstance(job_id, str) and len(job_id) > 8

    # Only the Lite edition, restarted afterwards, after this SMS Lite has exited
    assert calls["launched"] == [(tmp_path / "sms.exe", maintenance.LITE_INSTALLER_ARGS)]
    for switch in ("/VERYSILENT", "/EDITION=lite", "/RESTARTLITE=1", "/WAITLITE=1"):
        assert switch in maintenance.LITE_INSTALLER_ARGS
    assert calls["exits"] == 1

    status_resp = client.get(f"/control/api/maintenance/updates/auto-install/{job_id}/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "completed"
    assert status_data["target_version"] == "1.0.1"
    assert status_data["installer_launched"] is True
    history = status_data.get("phase_history")
    assert isinstance(history, list)
    assert len(history) >= 4
    phase_names = {entry.get("phase") for entry in history}
    assert "queued" in phase_names
    assert "downloading" in phase_names
    assert "verifying" in phase_names
    assert "completed" in phase_names
    assert all(entry.get("timestamp") for entry in history)


def test_auto_install_status_not_found(client):
    """Unknown updater jobs should return not_found status payload."""
    resp = client.get("/control/api/maintenance/updates/auto-install/does-not-exist/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "not_found"
    assert data["phase"] == "not_found"
    assert data["phase_history"] == []


def test_auto_install_status_invalid_job_id_returns_not_found(client):
    """Invalid job ids must not be used to build filesystem paths."""
    resp = client.get("/control/api/maintenance/updates/auto-install/not-a-valid-job-id/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "not_found"
    assert data["phase"] == "not_found"


def test_updates_check_native_uses_asset_digest_without_sha_sidecar(client, monkeypatch):
    """Update checks should surface installer digest metadata even without .sha256 assets."""
    from backend.routers.control import maintenance
    import backend.environment as environment_module

    monkeypatch.setattr(
        environment_module,
        "get_runtime_context",
        lambda: RuntimeContext(
            environment=RuntimeEnvironment.DEVELOPMENT,
            is_docker=False,
            is_ci=False,
            source="test",
        ),
    )
    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.0.0")
    monkeypatch.setattr(
        maintenance,
        "_fetch_github_release",
        lambda channel="stable": {
            "tag_name": "v1.0.1",
            "html_url": "https://example.invalid/release",
            "name": "Installer-only release",
            "body": "Notes",
            "assets": [
                {
                    "name": "SMS_Installer_1.0.1.exe",
                    "browser_download_url": "https://example.invalid/sms.exe",
                    "digest": "sha256:" + ("deadbeef" * 8),
                }
            ],
        },
    )

    resp = client.get("/control/api/maintenance/updates/check")
    assert resp.status_code == 200
    data = resp.json()
    assert data["update_available"] is True
    assert data["installer_hash"] == ("deadbeef" * 8)


def test_lite_update_uses_the_asset_digest(client, monkeypatch, tmp_path):
    """The installer's SHA-256 can come from the asset's digest when no sidecar exists."""
    from backend.routers.control import maintenance

    _lite_launch_mocks(monkeypatch)
    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.0.0")
    monkeypatch.setattr(
        maintenance,
        "_fetch_github_release",
        lambda channel="stable": {
            "tag_name": "v1.0.1",
            "html_url": "https://example.invalid/release",
            "assets": [
                {
                    "name": "SMS_Installer_1.0.1.exe",
                    "browser_download_url": "https://example.invalid/sms.exe",
                    "digest": "sha256:" + ("deadbeef" * 8),
                }
            ],
        },
    )

    def _mock_download_file(_url, destination, progress_callback=None):
        destination.write_bytes(b"x")
        if progress_callback:
            progress_callback(1, 1)
        return "deadbeef" * 8

    monkeypatch.setattr(maintenance, "_download_file", _mock_download_file)
    monkeypatch.setattr(maintenance, "_get_updates_download_dir", lambda: tmp_path)

    resp = client.post(
        "/control/api/maintenance/updates/auto-install",
        json={"channel": "stable", "install_mode": "silent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    job_id = data["details"]["job_id"]

    status_resp = client.get(f"/control/api/maintenance/updates/auto-install/{job_id}/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "completed"
    assert status_data["installer_sha256"] == ("deadbeef" * 8)


def _lite_release(monkeypatch, assets):
    from backend.routers.control import maintenance

    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.0.0")
    monkeypatch.setattr(maintenance, "_fetch_github_release", lambda channel="stable": {"tag_name": "v1.0.1", "assets": assets})

    def _download(_url, destination, progress_callback=None):
        destination.write_bytes(b"x")
        return "deadbeef" * 8

    monkeypatch.setattr(maintenance, "_download_file", _download)


def test_lite_update_declined_at_uac_keeps_sms_lite_running(client, monkeypatch, tmp_path):
    from backend.routers.control import maintenance

    calls = _lite_launch_mocks(monkeypatch)
    monkeypatch.setattr(maintenance, "_get_updates_download_dir", lambda: tmp_path)
    _lite_release(monkeypatch, [{"name": "SMS_Installer_1.0.1.exe", "browser_download_url": "https://example.invalid/s.exe",
                                 "digest": "sha256:" + "deadbeef" * 8}])

    def _declined(path, args):
        err = OSError("The operation was canceled by the user.")
        err.winerror = 1223
        raise err

    monkeypatch.setattr(maintenance, "_launch_installer_elevated", _declined)
    job_id = client.post("/control/api/maintenance/updates/auto-install", json={"channel": "stable"}).json()["details"]["job_id"]

    status = client.get(f"/control/api/maintenance/updates/auto-install/{job_id}/status").json()
    assert status["status"] == "failed"
    assert "cancelled at the Windows security prompt" in status["message"]
    assert calls["exits"] == 0  # SMS Lite keeps running


def test_lite_update_refuses_an_installer_without_a_published_hash(client, monkeypatch, tmp_path):
    from backend.routers.control import maintenance

    calls = _lite_launch_mocks(monkeypatch)
    monkeypatch.setattr(maintenance, "_get_updates_download_dir", lambda: tmp_path)
    _lite_release(monkeypatch, [{"name": "SMS_Installer_1.0.1.exe", "browser_download_url": "https://example.invalid/s.exe"}])

    job_id = client.post("/control/api/maintenance/updates/auto-install", json={"channel": "stable"}).json()["details"]["job_id"]
    status = client.get(f"/control/api/maintenance/updates/auto-install/{job_id}/status").json()
    assert status["status"] == "failed"
    assert "no SHA-256" in status["message"]
    assert calls["launched"] == [] and calls["exits"] == 0
    assert not (tmp_path / "s.exe").exists()


def test_installer_asset_is_chosen_by_name():
    from backend.routers.control import maintenance

    url, digest = maintenance._pick_installer_asset([
        {"name": "helper-tool.exe", "browser_download_url": "https://example.invalid/helper.exe"},
        {"name": "SMS_Installer_1.0.1.exe", "browser_download_url": "https://example.invalid/sms.exe",
         "digest": "sha256:" + "ab" * 32},
    ])
    assert url == "https://example.invalid/sms.exe"
    assert digest == "ab" * 32


def test_installed_version_comes_from_backend_version(monkeypatch):
    # The Docker image (/app/VERSION) and SMS Lite (_internal/VERSION) keep VERSION elsewhere than
    # a checkout; a path fixed relative to maintenance.py made both report "unknown", so neither
    # was ever offered an update (v1.18.57 smoke test). backend.version handles every layout.
    from backend.version import get_version

    assert maintenance._get_version() == get_version() != "unknown"
    monkeypatch.setattr(maintenance, "get_version", lambda: "v9.8.7")
    assert maintenance._get_version() == "v9.8.7"
