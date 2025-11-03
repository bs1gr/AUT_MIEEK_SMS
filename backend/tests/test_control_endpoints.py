import os
from types import SimpleNamespace
from fastapi.testclient import TestClient
import backend.main as main

client = TestClient(main.app)


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
