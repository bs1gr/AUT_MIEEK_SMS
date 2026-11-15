"""A refresh token is not a login credential, and a Socket.IO connection must prove who it is.

Access tokens carried no "type" and nothing that authenticates a request looked at it. A refresh
token is signed with the same key and names the same account, so it was accepted as a bearer
token everywhere: a 30-day access token (against 30 minutes) that logging out did not end, since
only /auth/refresh checks the stored copy for revocation. Now every place that takes a bearer
token reads it through `decode_access_token`.

The Socket.IO server went further and never looked at the token at all: it registered the
connection under whatever `user_id` the client sent.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest

ME = "/api/v1/auth/me"


@pytest.fixture
def strict_auth(monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str = "dana@example.com", role: str | None = None) -> tuple[str, str]:
    """Register and log in; returns (access token, refresh token from the HttpOnly cookie)."""
    payload = {"email": email, "password": "Passw0rd!x", "full_name": "Dana"}
    if role:
        payload["role"] = role
    assert client.post("/api/v1/auth/register", json=payload).status_code in (200, 201)
    login = client.post("/api/v1/auth/login", json={"email": email, "password": payload["password"]})
    assert login.status_code == 200, login.text
    refresh = client.cookies.get("refresh_token")
    assert refresh
    return login.json()["access_token"], refresh


def _signed(claims: dict) -> str:
    from backend.config import settings

    claims = {"exp": datetime.now(timezone.utc) + timedelta(minutes=5), **claims}
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _user(db, email: str, **fields):
    """An account written straight to the database (no registration rules in the way)."""
    from backend.models import User

    user = User(**{"email": email, "hashed_password": "x", "role": "teacher", "is_active": True, **fields})
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _access_for(email: str, role: str = "teacher") -> str:
    from backend.routers.routers_auth import create_access_token

    return create_access_token(subject=email, role=role)


def _session_factory(db):
    """Stands in for SessionLocal: hands out the test's session and leaves it open."""

    class _Session:
        def __enter__(self):
            return db

        def __exit__(self, *exc):
            return False

    return _Session


# ---------------------------------------------------------------------------
# Bearer tokens
# ---------------------------------------------------------------------------


def test_the_refresh_token_does_not_log_in(client):
    access, refresh = _login(client)

    assert client.get(ME, headers=_bearer(access)).status_code == 200
    # The same account, the same signature: it used to answer 200 with the user.
    refused = client.get(ME, headers=_bearer(refresh))
    assert refused.status_code == 401, refused.text


def test_the_refresh_token_does_not_open_the_api_in_strict_mode(client, strict_auth):
    access, refresh = _login(client, role="admin")

    assert client.get("/api/v1/students/", headers=_bearer(access)).status_code == 200
    assert client.get("/api/v1/students/", headers=_bearer(refresh)).status_code == 401


def test_the_refresh_token_still_refreshes_and_logout_still_ends_it(client):
    _, refresh = _login(client)

    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert rotated.status_code == 200, rotated.text
    new_refresh = client.cookies.get("refresh_token")
    assert new_refresh and new_refresh != refresh

    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh}).status_code == 401
    assert client.get(ME, headers=_bearer(new_refresh)).status_code == 401


def test_access_tokens_say_what_they_are(client):
    from backend.security.current_user import decode_access_token, decode_token

    access, refresh = _login(client)

    assert decode_token(access)["type"] == "access"
    assert decode_token(refresh)["type"] == "refresh"
    assert decode_access_token(access)["sub"] == "dana@example.com"
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(refresh)

    # /auth/refresh hands out an access token too.
    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert decode_token(rotated.json()["access_token"])["type"] == "access"


def test_an_access_token_from_before_the_claim_is_still_accepted(client):
    _login(client)

    # What every access token looked like until now: no "type". They expire within minutes;
    # refusing them would only log everyone out at the moment of the update.
    assert client.get(ME, headers=_bearer(_signed({"sub": "dana@example.com"}))).status_code == 200
    # Anything that names itself and is not an access token is refused.
    assert client.get(ME, headers=_bearer(_signed({"sub": "dana@example.com", "type": "reset"}))).status_code == 401


def test_the_control_api_does_not_take_an_admins_refresh_token(db, monkeypatch):
    import backend.control_auth as control_auth
    from backend.routers.routers_auth import create_refresh_token_for_user

    admin = _user(db, "ctl-admin@example.com", role="admin")
    access = _access_for("ctl-admin@example.com", role="admin")
    refresh = create_refresh_token_for_user(db, admin)
    monkeypatch.setattr(control_auth, "SessionLocal", _session_factory(db))

    assert control_auth._admin_from_bearer(SimpleNamespace(headers=_bearer(access))) is True
    assert control_auth._admin_from_bearer(SimpleNamespace(headers=_bearer(refresh))) is False


def test_registering_with_a_role_does_not_take_an_admins_refresh_token(db):
    from starlette.requests import Request

    from backend.routers.routers_auth import _active_admin_from_bearer, create_refresh_token_for_user

    admin = _user(db, "reg-admin@example.com", role="admin")
    access = _access_for("reg-admin@example.com", role="admin")
    refresh = create_refresh_token_for_user(db, admin)

    def request_with(token: str) -> Request:
        return Request({"type": "http", "headers": [(b"authorization", f"Bearer {token}".encode())]})

    found = _active_admin_from_bearer(request_with(access), db)
    assert found is not None and found.email == "reg-admin@example.com"
    assert _active_admin_from_bearer(request_with(refresh), db) is None


def test_the_notification_websocket_does_not_take_a_refresh_token(client):
    from starlette.websockets import WebSocketDisconnect

    _, refresh = _login(client)

    with pytest.raises(WebSocketDisconnect) as closed:
        with client._inner.websocket_connect(f"/api/v1/notifications/ws?token={refresh}"):
            pass
    assert closed.value.code == 1008


# ---------------------------------------------------------------------------
# Socket.IO
# ---------------------------------------------------------------------------


@pytest.fixture
def socket_db(db, monkeypatch):
    import backend.websocket_server as websocket_server

    monkeypatch.setattr(websocket_server, "SessionLocal", _session_factory(db))
    return db


def test_socket_connections_are_named_by_their_token_not_by_the_id_they_claim(socket_db, strict_auth):
    from backend.websocket_server import user_id_for_connection

    victim = _user(socket_db, "victim@example.com")
    caller = _user(socket_db, "caller@example.com")
    token = _access_for("caller@example.com")

    # Claiming someone else's id used to be enough, with or without a token.
    assert user_id_for_connection({"user_id": victim.id}) is None
    assert user_id_for_connection({"token": token, "user_id": victim.id}) == caller.id
    assert user_id_for_connection({"token": token}) == caller.id


def test_socket_connections_need_a_valid_access_token_of_a_usable_account(socket_db, strict_auth):
    from backend.routers.routers_auth import create_refresh_token_for_user
    from backend.websocket_server import user_id_for_connection

    active = _user(socket_db, "active@example.com")
    _user(socket_db, "gone@example.com", is_active=False)
    _user(socket_db, "mustchange@example.com", password_change_required=True)

    assert user_id_for_connection({"token": _access_for("active@example.com"), "user_id": active.id}) == active.id

    refresh = create_refresh_token_for_user(socket_db, active)
    for refused in (
        None,
        "not-a-dict",
        {},
        {"token": "garbage", "user_id": active.id},
        {"token": refresh, "user_id": active.id},
        {"token": _access_for("nobody@example.com"), "user_id": active.id},
        {"token": _access_for("gone@example.com"), "user_id": active.id},
        {"token": _access_for("mustchange@example.com"), "user_id": active.id},
    ):
        assert user_id_for_connection(refused) is None, refused


def test_without_authentication_the_claimed_id_is_accepted_as_before(socket_db):
    # The suite's default: AUTH_ENABLED off, AUTH_MODE disabled. No accounts to tell apart.
    from backend.websocket_server import user_id_for_connection

    assert user_id_for_connection({"user_id": 7}) == 7
    for refused in ({"user_id": 0}, {"user_id": -3}, {"user_id": "7"}, {"user_id": True}, {"token": "x"}, {}):
        assert user_id_for_connection(refused) is None, refused


def test_permissive_mode_checks_a_token_when_one_is_sent(socket_db, monkeypatch):
    from backend.config import settings
    from backend.websocket_server import user_id_for_connection

    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AUTH_MODE", "permissive", raising=False)
    caller = _user(socket_db, "permissive@example.com")

    assert user_id_for_connection({"user_id": 9}) == 9  # anonymous, like the rest of the API there
    assert user_id_for_connection({"token": _access_for("permissive@example.com"), "user_id": 9}) == caller.id
    assert user_id_for_connection({"token": "garbage", "user_id": 9}) is None


def test_the_connect_handler_registers_the_tokens_account_or_refuses(socket_db, strict_auth):
    from backend.websocket_config import connection_manager
    from backend.websocket_server import connect, disconnect

    victim = _user(socket_db, "victim2@example.com")
    caller = _user(socket_db, "caller2@example.com")

    async def scenario():
        refused = await connect("sid-anonymous", {}, {"user_id": victim.id})
        accepted = await connect("sid-caller", {}, {"token": _access_for("caller2@example.com"), "user_id": victim.id})
        try:
            return {
                "refused": refused,
                "accepted": accepted,
                "anonymous_registered": "sid-anonymous" in connection_manager.session_map,
                "registered_as": connection_manager.session_map["sid-caller"].user_id,
                "victim_sessions": set(connection_manager.active_connections.get(victim.id, set())),
            }
        finally:
            await disconnect("sid-caller")

    state = asyncio.run(scenario())

    assert state["refused"] is False
    assert state["anonymous_registered"] is False
    assert state["accepted"] is True
    assert state["registered_as"] == caller.id
    assert state["victim_sessions"] == set()
