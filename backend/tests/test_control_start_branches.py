import os
from types import SimpleNamespace
import pytest
from backend import environment
import backend.main as main

# The 'client' fixture will be provided by conftest.py

# Control panel tests are only relevant in native/development mode
# In Docker, the frontend is served as static files, not via npm dev server
pytestmark = pytest.mark.skipif(
    environment.get_runtime_context().is_docker,
    reason="Control panel tests require native environment with frontend source",
)


def test_control_start_success(monkeypatch, client):
    # Ensure frontend not already running
    import backend.main as main

    monkeypatch.setattr(main, "_is_port_open", lambda host, port, timeout=0.5: False)

    # Make frontend dir exist and node_modules present
    orig_isdir = os.path.isdir
    monkeypatch.setattr(
        os.path,
        "isdir",
        lambda p: True
        if ("frontend" in str(p) and "node_modules" not in str(p))
        or "node_modules" in str(p)
        else orig_isdir(p),
    )

    # Simulate npm found
    monkeypatch.setattr(main, "_resolve_npm_command", lambda: "npm")

    # Simulate npm -v success
    def fake_run_version(
        args,
        cwd=None,
        stdout=None,
        stderr=None,
        shell=False,
        check=False,
        timeout=None,
        text=None,
    ):
        if args and args[1] == "-v":
            return SimpleNamespace(returncode=0, stdout="9.0.0\n", stderr="")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(main.subprocess, "run", fake_run_version)

    # Fake Popen that sets port open after creation
    created = {"started": False}

    class FakeProc:
        def __init__(self):
            self.pid = 99999

        def poll(self):
            return None

    def fake_popen(
        args, cwd=None, shell=False, stdout=None, stderr=None, text=None, **kwargs
    ):
        created["started"] = True
        # after starting, simulate that port is open
        monkeypatch.setattr(main, "_is_port_open", lambda host, port, timeout=0.5: True)
        return FakeProc()

    monkeypatch.setattr(main.subprocess, "Popen", fake_popen)

    resp = client.post("/control/api/start")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("success") is True
    assert "port" in data


def test_control_start_install_failure(monkeypatch, tmp_path, client):
    # Ensure frontend not already running
    monkeypatch.setattr(main, "_is_port_open", lambda host, port, timeout=0.5: False)

    # Frontend dir exists but node_modules missing
    monkeypatch.setattr(
        os.path,
        "isdir",
        lambda p: True
        if ("frontend" in str(p) and "node_modules" not in str(p))
        else False,
    )

    # npm found
    monkeypatch.setattr(main, "_resolve_npm_command", lambda: "npm")

    # Version check succeeds
    def fake_run(
        args,
        cwd=None,
        stdout=None,
        stderr=None,
        shell=False,
        check=False,
        timeout=None,
        text=None,
    ):
        # npm -v
        if args and args == ["npm", "-v"]:
            return SimpleNamespace(returncode=0, stdout="9.0.0\n", stderr="")
        # npm ci fails
        if args and args[:2] == ["npm", "ci"]:
            return SimpleNamespace(returncode=1, stdout="ci failed", stderr="")
        # fallback npm install also fails
        if args and args[:2] == ["npm", "install"]:
            return SimpleNamespace(returncode=1, stdout="install failed", stderr="")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(main.subprocess, "run", fake_run)

    resp = client.post("/control/api/start")
    # Expect failure due to dependency install failing and normalized message
    assert resp.status_code == 500
    data = resp.json()
    assert data.get("message") == "Failed to install frontend dependencies"


def test_control_start_process_terminated(monkeypatch, client):
    # Ensure frontend not already running
    monkeypatch.setattr(main, "_is_port_open", lambda host, port, timeout=0.5: False)

    # frontend dir and node_modules present
    monkeypatch.setattr(os.path, "isdir", lambda p: True)

    monkeypatch.setattr(main, "_resolve_npm_command", lambda: "npm")

    # version_check ok
    monkeypatch.setattr(
        main.subprocess,
        "run",
        lambda *a, **k: SimpleNamespace(returncode=0, stdout="9.0.0\n"),
    )

    # Popen that has already terminated
    class DeadProc:
        def __init__(self):
            self.pid = 11111

        def poll(self):
            return 1

    monkeypatch.setattr(main.subprocess, "Popen", lambda *a, **k: DeadProc())

    resp = client.post("/control/api/start")
    assert resp.status_code == 500
    data = resp.json()
    assert data.get("message") == "Frontend process terminated unexpectedly"
