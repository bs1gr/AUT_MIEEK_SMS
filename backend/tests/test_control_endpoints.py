import os
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient

import backend.main as main
import backend.routers.routers_control as control
from backend.errors import ErrorCode
from backend import environment

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


def test_install_frontend_deps_missing_package_json(monkeypatch):
    package_path = str((Path(control.__file__).resolve().parents[2] / "frontend" / "package.json"))
    original_exists = Path.exists

    def fake_exists(self):
        if str(self) == package_path:
            return False
        return original_exists(self)

    monkeypatch.setattr(Path, "exists", fake_exists)

    resp = client.post("/api/v1/control/api/operations/install-frontend-deps")
    assert resp.status_code == 404
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_PACKAGE_JSON_MISSING.value
    assert Path(detail["context"]["path"]).name == "package.json"


def test_install_frontend_deps_npm_missing(monkeypatch):
    monkeypatch.setattr(control, "_check_npm_installed", lambda: (False, None))

    resp = client.post("/api/v1/control/api/operations/install-frontend-deps")
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

    resp = client.post("/api/v1/control/api/operations/install-backend-deps")
    assert resp.status_code == 404
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_REQUIREMENTS_MISSING.value
    assert Path(detail["context"]["path"]).name == "requirements.txt"


def test_docker_build_when_docker_not_running(monkeypatch):
    monkeypatch.setattr(control, "_check_docker_running", lambda: False)

    resp = client.post("/api/v1/control/api/operations/docker-build")
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_DOCKER_NOT_RUNNING.value


def test_docker_update_volume_when_docker_not_running(monkeypatch):
    monkeypatch.setattr(control, "_check_docker_running", lambda: False)

    resp = client.post("/api/v1/control/api/operations/docker-update-volume")
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["error_id"] == ErrorCode.CONTROL_DOCKER_NOT_RUNNING.value
