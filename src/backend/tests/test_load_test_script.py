"""`scripts/run_load_tests.py`, CI's load test, sends real requests (plan todo 73).

Until 2026-11-22 it unpacked its (method, path) pairs the wrong way round, so every request was
a POST to "/GET"; several of its paths were not routes of the application, and it signed in
with a password the seed does not set. All its requests failed, and the CI step ended in
`|| echo`, so the job stayed green.
"""

from __future__ import annotations

import importlib.util
import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from backend.main import app

REPO = Path(__file__).resolve().parents[3]
SCRIPT = REPO / "scripts" / "run_load_tests.py"
SEED = REPO / "src" / "backend" / "seed_e2e_data.py"
WORKFLOW = REPO / ".github" / "workflows" / "ci-cd-pipeline.yml"
USER_TYPES = ["teacher", "admin"]


def _load_script():
    spec = importlib.util.spec_from_file_location("run_load_tests", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _choices(module, user_type, monkeypatch) -> list[tuple[str, str]]:
    """The (method, path) pairs a user of that kind picks from."""
    seen: list[list] = []
    monkeypatch.setattr(module.random, "choice", lambda seq: seen.append(list(seq)) or seq[0])
    module.LoadTestUser(0, "http://127.0.0.1:1", module.LoadTestMetrics(), 0, user_type)._select_endpoint()
    return seen[0]


def _routes() -> dict[str, set[str]]:
    routes: dict[str, set[str]] = {}
    for path, operations in app.openapi()["paths"].items():
        routes.setdefault(path, set()).update(method.upper() for method in operations)
    for route in app.routes:  # /health is outside the API schema
        if getattr(route, "methods", None):
            routes.setdefault(route.path, set()).update(route.methods)
    return routes


@pytest.mark.parametrize("user_type", USER_TYPES)
def test_every_request_is_a_route_of_the_application(user_type, monkeypatch):
    routes = _routes()
    module = _load_script()

    for method, path in _choices(module, user_type, monkeypatch):
        route = path.split("?", 1)[0]
        assert method in routes.get(route, set()), f"{method} {path} is not a route of the application"


def test_a_user_signs_in_with_the_seeded_account_then_sends_each_request_as_listed(monkeypatch):
    module = _load_script()
    received: list[tuple[str, str, bytes]] = []

    class Handler(BaseHTTPRequestHandler):
        def _answer(self):
            length = int(self.headers.get("Content-Length") or 0)
            received.append((self.command, self.path, self.rfile.read(length) if length else b""))
            body = json.dumps({"access_token": "token"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        do_GET = _answer
        do_POST = _answer

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    monkeypatch.setattr(module.random, "uniform", lambda low, high: 0.01)  # no think time
    try:
        base = f"http://127.0.0.1:{server.server_address[1]}"
        module.LoadTestUser(0, base, module.LoadTestMetrics(), 0.5, "teacher").run()
    finally:
        server.shutdown()
        server.server_close()

    (method, path, body), *sent = received
    assert (method, path) == ("POST", "/api/v1/auth/login")
    password = re.search(r'test_password = "([^"]+)"', SEED.read_text(encoding="utf-8")).group(1)
    assert json.loads(body) == {"email": "test@example.com", "password": password}
    assert sent, "nothing was sent after the sign-in"
    for method, path, _ in sent:
        assert method == "GET", f"{method} {path}"
        assert path == "/health" or path.startswith("/api/v1/"), f"{method} {path}"


def test_the_ci_step_fails_when_the_load_test_fails():
    step = WORKFLOW.read_text(encoding="utf-8").split("- name: Run load tests", 1)[1].split("- name:", 1)[0]
    assert "scripts/run_load_tests.py" in step
    assert "||" not in step, "the step swallows the load test's exit code"
