"""The health endpoints keep the event loop free (plan todo 52, stage 3 finding).

Measured on the cloud host (2026-11-20, `/metrics` and a probe from the VM itself): `/health`
was 440 of 501 requests since the container started and 96 per cent of their total time. It
was an `async def` that never awaited, so its database work (about 0.7 s per call at 65 ms a
round trip) ran on the event loop: Docker's check every 30 seconds stalled every other
request, and 15 `/health` calls at once held `/health/live` for 13 seconds. They are plain
`def` now, which FastAPI runs in a worker thread.
"""

import ast
import asyncio
import pathlib
import time
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI

from backend import admin_routes, app_factory
from backend.db import get_session
from backend.health_checks import HealthChecker
from backend.rbac import get_db

BLOCK = 0.4  # seconds a blocking database step takes in these tests
BACKEND = pathlib.Path(app_factory.__file__).parent


def _run(app: FastAPI, scenario):
    async def main():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await scenario(client)

    return asyncio.run(main())


async def _longest_stall_during(awaitable):
    """Await something while a heartbeat ticks on the same loop; return (result, longest gap)."""
    longest = 0.0
    finished = False

    async def heartbeat():
        nonlocal longest
        last = time.perf_counter()
        while not finished:
            await asyncio.sleep(0.005)
            now = time.perf_counter()
            longest = max(longest, now - last)
            last = now

    ticking = asyncio.create_task(heartbeat())
    try:
        result = await awaitable
    finally:
        finished = True
        await ticking
    return result, longest


@pytest.fixture
def slow_health_app(monkeypatch):
    """The real `/health*` routes, with a database that takes BLOCK seconds to answer."""

    def slow_health(self, db):
        time.sleep(BLOCK)
        return {"status": "healthy", "checks": {"database": {"status": "healthy"}}, "system": {}}

    def slow_readiness(self, db):
        time.sleep(BLOCK)
        return {"status": "ready"}

    monkeypatch.setattr(HealthChecker, "check_health", slow_health)
    monkeypatch.setattr(HealthChecker, "check_readiness", slow_readiness)
    app = FastAPI()
    app_factory._register_health_endpoints(app)
    app.dependency_overrides[get_session] = lambda: object()
    return app


@pytest.mark.parametrize("path", ["/health", "/health/ready"])
def test_a_slow_database_does_not_hold_the_loop(slow_health_app, path):
    async def scenario(client):
        started = time.perf_counter()
        response, stall = await _longest_stall_during(client.get(path))
        return response, time.perf_counter() - started, stall

    response, took, stall = _run(slow_health_app, scenario)

    assert response.status_code == 200
    assert took >= BLOCK
    # Run inline, the endpoint held the loop for as long as it ran.
    assert stall < BLOCK / 2, f"the event loop was held for {stall:.2f}s"


def test_calls_at_once_run_side_by_side_and_liveness_answers_meanwhile(slow_health_app):
    async def scenario(client):
        started = time.perf_counter()
        healths = asyncio.gather(*(client.get("/health") for _ in range(5)))
        live, stall = await _longest_stall_during(client.get("/health/live"))
        responses = await healths
        return responses, live, time.perf_counter() - started, stall

    responses, live, took, stall = _run(slow_health_app, scenario)

    assert [r.status_code for r in responses] == [200] * 5
    assert live.status_code == 200
    # One after another this is 5 x BLOCK.
    assert took < BLOCK * 2.5, f"five requests took {took:.2f}s"


def test_the_answer_keeps_its_shape(slow_health_app):
    response = _run(slow_health_app, lambda client: client.get("/health"))
    assert response.status_code == 200
    answer = response.json()
    assert answer["status"] == "healthy"
    assert answer["database"] == "connected"
    assert set(answer["database_target"]) >= {"engine", "host", "port", "database", "is_remote", "driver"}
    assert answer["services"] == {"database": "healthy"}
    assert set(answer["network"]) == {"hostname", "ips"}


def test_the_admin_health_check_does_not_hold_the_loop():
    class SlowDb:
        def query(self, *_):
            time.sleep(BLOCK)
            return SimpleNamespace(count=lambda: 0)

    app = FastAPI()
    app.include_router(admin_routes.router)
    app.dependency_overrides[get_db] = lambda: SlowDb()
    app.dependency_overrides[admin_routes.require_control_admin] = lambda: None

    async def scenario(client):
        response, stall = await _longest_stall_during(client.get("/health"))
        return response, stall

    response, stall = _run(app, scenario)

    assert response.status_code == 200, response.text
    assert response.json()["students_count"] == 0
    assert stall < BLOCK / 2, f"the event loop was held for {stall:.2f}s"


# --- the rule behind it, so that it stays true -----------------------------------------------

ROUTE_ATTRS = {"get", "post", "put", "patch", "delete", "head", "options", "api_route"}
# `async def` routers that do wait for something (asyncio, a thread pool, background tasks):
# the seven stage 2 left on purpose. Anything else in `routers/` that never awaits is a bug.
LEFT_ASYNC_ON_PURPOSE = {
    ("routers_custom_reports.py", "generate_report"),
    ("routers_custom_reports.py", "bulk_generate_reports"),
    ("routers_import_export.py", "create_student_import"),
    ("routers_import_export.py", "create_course_import"),
    ("routers_import_export.py", "create_grade_import"),
    ("routers_import_export.py", "commit_import_job"),
    ("routers_import_export.py", "create_export"),
}


def _is_route(fn: ast.AsyncFunctionDef) -> bool:
    for decorator in fn.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if isinstance(target, ast.Attribute) and target.attr in ROUTE_ATTRS:
            return True
    return False


def _awaits(fn: ast.AsyncFunctionDef) -> bool:
    return any(isinstance(n, (ast.Await, ast.AsyncFor, ast.AsyncWith)) for n in ast.walk(fn))


def test_no_router_endpoint_is_an_async_def_that_never_awaits():
    found = set()
    for path in sorted((BACKEND / "routers").glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.AsyncFunctionDef) and _is_route(node) and not _awaits(node):
                found.add((path.name, node.name))

    assert found == LEFT_ASYNC_ON_PURPOSE, (
        "an `async def` endpoint that never awaits runs its blocking work on the event loop; "
        f"make it a plain `def`. Unexpected: {sorted(found - LEFT_ASYNC_ON_PURPOSE)}; "
        f"no longer async: {sorted(LEFT_ASYNC_ON_PURPOSE - found)}"
    )
