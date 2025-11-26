import asyncio
import os
import sys
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

import backend.main as main
import backend.routers.routers_control as control
from backend import environment
from backend.errors import ErrorCode

client = TestClient(main.app)

# Control panel tests require frontend source directory (package.json, etc)
# Skip in Docker where only built static files are present
pytestmark = pytest.mark.skipif(
    environment.get_runtime_context().is_docker,
    reason="Control panel tests require native environment with frontend source",
)


def test_control_status_monkeypatched(monkeypatch):
    # No frontend running
    monkeypatch.setattr(main, "_detect_frontend_port", lambda: None)
    resp = client.get("/control/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "backend" in data and "frontend" in data


def test_control_start_npm_missing(monkeypatch):
    # Ensure port not open so start path proceeds
    monkeypatch.setattr(main, "_is_port_open", lambda host, port, timeout=0.5: False)

    # Make frontend dir exist for the check in control_start
    orig_isdir = os.path.isdir

    def fake_isdir(p):
        if "frontend" in str(p):
            return True
        return orig_isdir(p)

    monkeypatch.setattr(os.path, "isdir", fake_isdir)

    # Simulate npm not found
    monkeypatch.setattr(main, "_resolve_npm_command", lambda: None)

    resp = client.post("/control/api/start")
    assert resp.status_code in (400, 500)
    data = resp.json()
    assert data.get("message") == "npm not found. Please install Node.js and npm (https://nodejs.org/)"


def test_control_stop_kills_pids(monkeypatch):
    # Ensure no tracked FRONTEND_PROCESS
    main.FRONTEND_PROCESS = None

    # Return a PID for the frontend port scan
    monkeypatch.setattr(
        main, "_find_pids_on_port", lambda port: [12345] if port == main.FRONTEND_PORT_PREFERRED else []
    )

    # Fake subprocess.run to always succeed for taskkill
    def fake_run(*args, **kwargs):
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(main.subprocess, "run", fake_run)

    resp = client.post("/control/api/stop")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("success") is True


def test_control_restart_schedules_thread(monkeypatch):
    monkeypatch.delenv("SMS_EXECUTION_MODE", raising=False)

    called = {}

    def fake_infer():
        return [sys.executable, "-m", "uvicorn", "backend.main:app"]

    def fake_spawn(cmd):
        called["cmd"] = cmd

    monkeypatch.setattr(main, "_infer_restart_command", fake_infer)
    monkeypatch.setattr(main, "_spawn_restart_thread", fake_spawn)

    resp = client.post("/control/api/restart")
    assert resp.status_code == 200
    assert called["cmd"] == [sys.executable, "-m", "uvicorn", "backend.main:app"]


def test_control_restart_blocked_in_docker(monkeypatch):
    monkeypatch.setenv("SMS_EXECUTION_MODE", "docker")
    resp = client.post("/control/api/restart")
    assert resp.status_code == 400
    data = resp.json()
    assert data["message"].lower().startswith("in-container restart")
    assert data["restart_supported"] is False
    assert data["execution_mode"] == "docker"


def test_restart_diagnostics_reports_native(monkeypatch):
    monkeypatch.delenv("ENABLE_CONTROL_API", raising=False)
    monkeypatch.delenv("SMS_EXECUTION_MODE", raising=False)
    resp = client.get("/control/api/restart")
    assert resp.status_code == 200
    data = resp.json()
    assert data["restart_supported"] is True
    assert data["control_api_enabled"] is True


def test_restart_disabled_when_control_api_off(monkeypatch):
    monkeypatch.setenv("ENABLE_CONTROL_API", "0")
    diag = client.get("/control/api/restart")
    assert diag.status_code == 200
    diag_body = diag.json()
    assert diag_body["restart_supported"] is False
    assert diag_body["control_api_enabled"] is False

    resp = client.post("/control/api/restart")
    assert resp.status_code == 404
    payload = resp.json()
    assert payload["control_api_enabled"] is False
    assert payload["message"].lower().startswith("control api disabled")


def test_install_frontend_deps_missing_package_json(monkeypatch):
    package_path = str((Path(control.__file__).resolve().parents[2] / "frontend" / "package.json"))
    original_exists = Path.exists

    def fake_exists(self):
        if str(self) == package_path:
            return False
        return original_exists(self)

    monkeypatch.setattr(Path, "exists", fake_exists)

    resp = client.post("/control/api/operations/install-frontend-deps")
    assert resp.status_code == 404
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_PACKAGE_JSON_MISSING.value
    assert Path(detail["context"]["path"]).name == "package.json"


def test_install_frontend_deps_npm_missing(monkeypatch):
    monkeypatch.setattr(control, "_check_npm_installed", lambda: (False, None))

    resp = client.post("/control/api/operations/install-frontend-deps")
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_NPM_NOT_FOUND.value
    assert detail["context"]["command"] == "npm --version"


def test_install_backend_deps_missing_requirements(monkeypatch):
    requirements_path = str((Path(control.__file__).resolve().parents[2] / "backend" / "requirements.txt"))
    original_exists = Path.exists

    def fake_exists(self):
        if str(self) == requirements_path:
            return False
        return original_exists(self)

    monkeypatch.setattr(Path, "exists", fake_exists)

    resp = client.post("/control/api/operations/install-backend-deps")
    assert resp.status_code == 404
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_REQUIREMENTS_MISSING.value
    assert Path(detail["context"]["path"]).name == "requirements.txt"


def test_docker_build_when_docker_not_running(monkeypatch):
    monkeypatch.setattr(control, "_check_docker_running", lambda: False)

    resp = client.post("/control/api/operations/docker-build")
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_DOCKER_NOT_RUNNING.value


def test_docker_update_volume_when_docker_not_running(monkeypatch):
    monkeypatch.setattr(control, "_check_docker_running", lambda: False)

    resp = client.post("/control/api/operations/docker-update-volume")
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_DOCKER_NOT_RUNNING.value


def test_download_database_backup_success(tmp_path):
    backup_dir = Path(control.__file__).resolve().parents[2] / "backups" / "database"
    backup_dir.mkdir(parents=True, exist_ok=True)

    filename = f"test_backup_{uuid.uuid4().hex}.db"
    backup_path = backup_dir / filename
    backup_path.write_bytes(b"fake-backup")

    try:
        resp = client.get(f"/control/api/operations/database-backups/{filename}/download")
        assert resp.status_code == 200
        assert resp.content == b"fake-backup"
        assert resp.headers["content-type"] == "application/octet-stream"
        assert filename in resp.headers["content-disposition"]
    finally:
        backup_path.unlink(missing_ok=True)


def test_download_database_backup_not_found():
    missing = f"missing_backup_{uuid.uuid4().hex}.db"
    resp = client.get(f"/control/api/operations/database-backups/{missing}/download")
    assert resp.status_code == 404
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_BACKUP_NOT_FOUND.value


def test_download_database_backup_rejects_traversal():
    """Ensure we can't escape backup directory when hitting the handler directly."""

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/control/api/operations/database-backups/hack/download",
        "headers": [],
        "query_string": b"",
        "client": ("testclient", 1234),
        "app": main.app,
        "server": ("testserver", 80),
    }

    async def _receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    request = Request(scope, _receive)

    async def _run():
        with pytest.raises(HTTPException) as excinfo:
            await control.download_database_backup(request, "../outside.db")

        assert excinfo.value.status_code == 400
        detail = excinfo.value.detail
        assert detail["error_id"] == ErrorCode.CONTROL_BACKUP_NOT_FOUND.value

    asyncio.run(_run())
