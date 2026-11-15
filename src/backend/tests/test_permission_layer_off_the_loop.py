"""The permission decorators keep the event loop free (plan todo 52, first stage).

Every edition runs one uvicorn process. The decorators in `backend.rbac` wrap an endpoint in a
coroutine, and whatever that coroutine does without awaiting holds the event loop, and with it
every other request and `/health`. They used to look the user up, check the permissions and
call a plain `def` endpoint inline, all of it blocking database work, so requests were served
one at a time. Each of those now runs in a worker thread.

What is still on the loop, by design of this stage: the body of an `async def` endpoint.
"""

import asyncio
import threading
import time

import httpx
import pytest
from fastapi import Depends, FastAPI, Request
from sqlalchemy.orm import Session

from backend import rbac
from backend.config import settings
from backend.models import User
from backend.rbac import get_db, require_all_permissions, require_any_permission, require_permission
from backend.routers.routers_auth import create_access_token

BLOCK = 0.4  # seconds a blocking step takes in these tests
DECORATORS = {
    "require_permission": lambda: require_permission("students:view"),
    "require_any_permission": lambda: require_any_permission("students:view", "courses:view"),
    "require_all_permissions": lambda: require_all_permissions("students:view"),
}


def _app(decorator, db) -> FastAPI:
    app = FastAPI()

    @app.get("/blocking")
    @decorator
    def blocking(request: Request, db: Session = Depends(get_db)):
        time.sleep(BLOCK)  # stands in for a slow database call in a plain `def` endpoint
        return {"thread": threading.get_ident()}

    @app.get("/coroutine")
    @decorator
    async def coroutine(request: Request, db: Session = Depends(get_db)):
        return {"thread": threading.get_ident()}

    @app.get("/ping")
    async def ping():
        return {"thread": threading.get_ident()}

    app.dependency_overrides[get_db] = lambda: db
    return app


def _run(app: FastAPI, scenario, headers: dict | None = None):
    async def main():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test", headers=headers) as client:
            return await scenario(client)

    return asyncio.run(main())


async def _longest_stall_during(awaitable):
    """Await something while a heartbeat ticks on the same loop.

    Returns (result, longest gap between two ticks). A loop that is held by blocking work
    cannot tick, so the gap is as long as the block; a free loop ticks every few milliseconds.
    Issuing a second request and timing it does not show this reliably: it can slip through
    before the blocking part begins.
    """
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
def strict_auth(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)


@pytest.fixture
def admin_headers(db):
    db.add(User(email="loop-admin@example.com", hashed_password="x", role="admin", is_active=True))
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(subject='loop-admin@example.com', role='admin')}"}


# --- a plain `def` endpoint -----------------------------------------------------------------


@pytest.mark.parametrize("name", DECORATORS)
def test_a_def_endpoint_does_not_hold_the_loop(db, name):
    app = _app(DECORATORS[name](), db)

    async def scenario(client):
        started = time.perf_counter()
        response, stall = await _longest_stall_during(client.get("/blocking"))
        ping = await client.get("/ping")
        return response, time.perf_counter() - started, stall, ping

    response, took, stall, ping = _run(app, scenario)

    assert response.status_code == 200
    assert took >= BLOCK
    # Called inline, the endpoint held the loop for as long as it ran.
    assert stall < BLOCK / 2, f"the event loop was held for {stall:.2f}s"
    assert response.json()["thread"] != ping.json()["thread"]

def test_def_endpoints_run_side_by_side(db):
    app = _app(DECORATORS["require_permission"](), db)

    async def scenario(client):
        started = time.perf_counter()
        responses = await asyncio.gather(*(client.get("/blocking") for _ in range(5)))
        return time.perf_counter() - started, responses

    took, responses = _run(app, scenario)

    assert [r.status_code for r in responses] == [200] * 5
    # One after another this is 5 x BLOCK.
    assert took < BLOCK * 2.5, f"five requests took {took:.2f}s"


@pytest.mark.parametrize("name", DECORATORS)
def test_a_coroutine_endpoint_still_runs_on_the_loop(db, name):
    app = _app(DECORATORS[name](), db)

    async def scenario(client):
        return (await client.get("/coroutine")).json()["thread"], (await client.get("/ping")).json()["thread"]

    coroutine_thread, loop_thread = _run(app, scenario)

    assert coroutine_thread == loop_thread


# --- the user lookup and the permission check -----------------------------------------------


@pytest.mark.parametrize("name", DECORATORS)
def test_the_user_lookup_and_the_permission_check_run_off_the_loop(db, name, strict_auth, admin_headers, monkeypatch):
    seen: dict[str, int] = {}
    real_resolve, real_has_permission = rbac.resolve_current_user, rbac.has_permission

    def resolve(request, token, session):
        seen["lookup"] = threading.get_ident()
        return real_resolve(request, token, session)

    def has_permission(user, key, session):
        seen["check"] = threading.get_ident()
        return real_has_permission(user, key, session)

    monkeypatch.setattr(rbac, "resolve_current_user", resolve)
    monkeypatch.setattr(rbac, "has_permission", has_permission)
    app = _app(DECORATORS[name](), db)

    async def scenario(client):
        return await client.get("/coroutine"), (await client.get("/ping")).json()["thread"]

    response, loop_thread = _run(app, scenario, admin_headers)

    assert response.status_code == 200, response.text
    assert seen["lookup"] != loop_thread
    assert seen["check"] != loop_thread


@pytest.mark.parametrize("name", DECORATORS)
def test_a_slow_database_does_not_hold_the_loop_during_the_checks(db, name, strict_auth, admin_headers, monkeypatch):
    real_resolve, real_has_permission = rbac.resolve_current_user, rbac.has_permission

    def slow_resolve(request, token, session):
        time.sleep(BLOCK)  # a database that takes its time over the user lookup...
        return real_resolve(request, token, session)

    def slow_has_permission(user, key, session):
        time.sleep(BLOCK)  # ...and over the permission check
        return real_has_permission(user, key, session)

    monkeypatch.setattr(rbac, "resolve_current_user", slow_resolve)
    monkeypatch.setattr(rbac, "has_permission", slow_has_permission)
    app = _app(DECORATORS[name](), db)

    async def scenario(client):
        started = time.perf_counter()
        response, stall = await _longest_stall_during(client.get("/coroutine"))
        return response, time.perf_counter() - started, stall

    response, took, stall = _run(app, scenario, admin_headers)

    assert response.status_code == 200, response.text
    assert took >= 2 * BLOCK
    assert stall < BLOCK / 2, f"the event loop was held for {stall:.2f}s"

# --- nothing about the answers changed --------------------------------------------------------


@pytest.mark.parametrize("name", DECORATORS)
def test_strict_mode_still_refuses_and_admits(db, name, strict_auth, admin_headers):
    # A student account holds only the "self" permissions, neither students:view nor courses:view.
    db.add(User(email="loop-student@example.com", hashed_password="x", role="student", is_active=True))
    db.commit()
    student = {"Authorization": f"Bearer {create_access_token(subject='loop-student@example.com', role='student')}"}
    app = _app(DECORATORS[name](), db)

    async def scenario(client):
        return {
            "no token": (await client.get("/coroutine")).status_code,
            "garbage token": (await client.get("/coroutine", headers={"Authorization": "Bearer garbage"})).status_code,
            "no permission": (await client.get("/blocking", headers=student)).status_code,
            "admin, def endpoint": (await client.get("/blocking", headers=admin_headers)).status_code,
            "admin, coroutine endpoint": (await client.get("/coroutine", headers=admin_headers)).status_code,
        }

    assert _run(app, scenario) == {
        "no token": 401,
        "garbage token": 401,
        "no permission": 403,
        "admin, def endpoint": 200,
        "admin, coroutine endpoint": 200,
    }


def test_a_replaced_get_current_user_is_still_the_one_that_is_asked(db, strict_auth, monkeypatch):
    # Tests replace `backend.rbac.get_current_user`; the decorators must not go around it.
    asked: list[str] = []

    async def stand_in(request, db=None):
        asked.append("stand-in")
        return User(id=7, email="stand-in@example.com", hashed_password="x", role="admin", is_active=True)

    monkeypatch.setattr(rbac, "get_current_user", stand_in)
    monkeypatch.setattr(rbac, "has_permission", lambda user, key, session: True)
    app = _app(DECORATORS["require_permission"](), db)

    async def scenario(client):
        return await client.get("/coroutine", headers={"Authorization": "Bearer anything"})

    assert _run(app, scenario).status_code == 200
    assert asked == ["stand-in"]


def test_a_plain_function_that_returns_a_coroutine_is_awaited(db):
    # A decorator around an async endpoint can leave a plain function that hands back a
    # coroutine; the result has to be awaited, not returned as an object.
    app = FastAPI()

    async def real(request: Request):
        return {"answered": True}

    def plain(request: Request):
        return real(request)

    app.get("/wrapped")(require_permission("students:view")(plain))

    async def scenario(client):
        return await client.get("/wrapped")

    response = _run(app, scenario)
    assert response.status_code == 200
    assert response.json() == {"answered": True}
