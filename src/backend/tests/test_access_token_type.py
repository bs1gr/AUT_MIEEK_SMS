"""A refresh token is not a login credential.

Access tokens carried no "type" and nothing that authenticates a request looked at it. A refresh
token is signed with the same key and names the same account, so it was accepted as a bearer
token everywhere: a 30-day access token (against 30 minutes) that logging out did not end, since
only /auth/refresh checks the stored copy for revocation. Now every place that takes a bearer
token reads it through `decode_access_token`.

(The Socket.IO server, which never looked at the token at all, got the same check in the same
change. It carried nothing and has since been removed, and its tests with it.)
"""

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


def test_the_refresh_token_does_not_open_the_api_in_strict_mode(client, db, strict_auth):
    from backend.tests.conftest import started_installation

    access, refresh = _login(client, role="admin")
    started_installation(db)  # the roles and this account's role row, as after a start

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
