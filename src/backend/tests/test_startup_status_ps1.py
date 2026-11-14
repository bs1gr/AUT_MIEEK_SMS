"""NATIVE.ps1's startup display (infra/scripts/dev/STARTUP_STATUS.ps1) reports the real stage.

The backend can need two minutes before it accepts connections; until then the Vite proxy only
shows ECONNREFUSED. The script reads the stage from what is observable - the process tree, the
startup lines in the log, the port and /health - so each of those is exercised here against a
stand-in backend that starts slowly, one whose worker dies, and one that is not there at all.

The stage names depend on log messages written by the real backend; the first test fails if one
of them is renamed without the script following.
"""

import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
# The reload-worker check reads the Windows process table (Win32_Process).
pytestmark = pytest.mark.skipif(
    PWSH is None or sys.platform != "win32", reason="Windows dev tool; needs pwsh on Windows"
)

REPO = Path(__file__).resolve().parents[3]
SCRIPT = REPO / "infra" / "scripts" / "dev" / "STARTUP_STATUS.ps1"
BACKEND = REPO / "src" / "backend"

HEALTH = {
    "status": "healthy",
    "version": "v9.9.9",
    "checks": {"database": {"status": "healthy", "dialect": "sqlite"}},
}

# A reloader-shaped stand-in: the started process only supervises, a multiprocessing child does
# the "startup" (log lines with pauses) and then serves /health - or dies before serving.
FAKE_BACKEND = r"""
import http.server, json, multiprocessing, sys, time
from datetime import datetime

HEALTH = %(health)r

def log(path, message):
    stamp = datetime.now().strftime("%%Y-%%m-%%d %%H:%%M:%%S,%%f")[:-3]
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(f"{stamp} - backend.fake - INFO - [-] - {message}\n")

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps(HEALTH).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args):
        pass

def worker(port, log_path, mode):
    time.sleep(3)
    if mode == "crash":
        sys.exit(1)
    for message in (
        "Logging initialized",
        "Registered routers: Students, Admin",
        "FastAPI application created successfully (version=v9.9.9)",
        "[run_migrations] ENTER",
    ):
        log(log_path, message)
        time.sleep(1.5)
    http.server.HTTPServer(("127.0.0.1", port), Handler).serve_forever()

if __name__ == "__main__":
    child = multiprocessing.Process(target=worker, args=(int(sys.argv[1]), sys.argv[2], sys.argv[3]))
    child.start()
    while True:
        time.sleep(1)
""" % {"health": HEALTH}


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _run_status(*args: object, timeout: int = 90) -> subprocess.CompletedProcess:
    return subprocess.run(
        [str(PWSH), "-NoProfile", "-NonInteractive", "-File", str(SCRIPT), *[str(a) for a in args]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


@pytest.fixture
def fake_backend(tmp_path):
    started = []

    def start(mode: str):
        script = tmp_path / "fake_backend.py"
        script.write_text(FAKE_BACKEND, encoding="utf-8")
        log_path = tmp_path / "app.log"
        # An older run's lines must not be mistaken for this start.
        log_path.write_text(
            "2020-01-01 00:00:00,000 - backend.fake - INFO - [-] - [run_migrations] ENTER\n",
            encoding="utf-8",
        )
        port = _free_port()
        proc = subprocess.Popen([sys.executable, str(script), str(port), str(log_path), mode])
        started.append(proc)
        return proc, port, log_path

    yield start

    for proc in started:
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)


def test_stage_markers_are_still_logged_by_the_backend():
    markers = re.findall(r"Marker = '([^']+)'", SCRIPT.read_text(encoding="utf-8"))
    assert len(markers) == 4, markers

    sources = "".join(
        (BACKEND / name).read_text(encoding="utf-8")
        for name in (
            "logging_config.py",
            "router_registry.py",
            "app_factory.py",
            "scripts/migrate/runner.py",
        )
    )
    missing = [marker for marker in markers if marker not in sources]
    assert not missing, f"STARTUP_STATUS.ps1 waits for log lines the backend no longer writes: {missing}"


def test_slow_start_is_reported_stage_by_stage_until_health_answers(fake_backend):
    proc, port, log_path = fake_backend("slow")

    result = _run_status("-BackendPort", port, "-BackendPid", proc.pid, "-LogPath", log_path, "-TimeoutSec", 60)

    assert result.returncode == 0, result.stdout + result.stderr
    stages = [
        "Importing application modules",
        "Registering API routers",
        "Assembling the application",
        "Starting services",
        "Checking database migrations",
    ]
    positions = [result.stdout.find(f"> {stage}...") for stage in stages]
    assert -1 not in positions, result.stdout
    assert positions == sorted(positions), result.stdout
    assert "Backend ready in" in result.stdout
    assert "v9.9.9, database sqlite: healthy" in result.stdout


def test_a_worker_that_dies_during_startup_is_reported_instead_of_waited_on(fake_backend):
    proc, port, log_path = fake_backend("crash")

    result = _run_status("-BackendPort", port, "-BackendPid", proc.pid, "-LogPath", log_path, "-TimeoutSec", 60)

    assert result.returncode == 1, result.stdout + result.stderr
    assert "Backend worker exited during startup" in result.stdout
    assert "Stopped at: Importing application modules" in result.stdout


def test_a_backend_that_is_not_running_is_reported_as_stopped(tmp_path):
    gone = subprocess.Popen([sys.executable, "-c", "pass"])
    gone.wait()

    result = _run_status(
        "-BackendPort", _free_port(), "-BackendPid", gone.pid, "-LogPath", tmp_path / "app.log", "-Once"
    )

    assert result.returncode == 1, result.stdout + result.stderr
    assert "is no longer running" in result.stdout


def test_once_reports_not_ready_without_waiting(tmp_path):
    result = _run_status(
        "-BackendPort", _free_port(), "-BackendPid", os.getpid(), "-LogPath", tmp_path / "app.log", "-Once"
    )

    assert result.returncode == 2, result.stdout + result.stderr
    assert "Not ready - backend: Starting Python and uvicorn" in result.stdout


def test_an_already_running_backend_and_frontend_are_reported_at_once():
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            body = json.dumps(HEALTH).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        port = server.server_address[1]
        result = _run_status("-BackendPort", port, "-FrontendPort", port, "-BackendPid", os.getpid(), "-Once")
    finally:
        server.shutdown()

    assert result.returncode == 0, result.stdout + result.stderr
    assert f"Backend is up on port {port} - v9.9.9" in result.stdout
    assert f"Frontend (Vite) ready on port {port}" in result.stdout
