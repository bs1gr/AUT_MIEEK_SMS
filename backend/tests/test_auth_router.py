import asyncio
from types import SimpleNamespace

import pytest


def test_register_login_me_flow(client):
    # Register
    payload = {"email": "admin@example.com", "password": "S3curePass!", "full_name": "Admin User", "role": "admin"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == payload["email"].lower()
    # Registration without an admin bearer token must not grant admin role
    assert data["role"] == "teacher"
    assert data["is_active"] is True

    # Duplicate register should fail
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 400

    # Login
    r3 = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert r3.status_code == 200, r3.text
    token = r3.json()["access_token"]
    assert isinstance(token, str) and len(token) > 10

    # Me
    r4 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r4.status_code == 200, r4.text
    me = r4.json()
    assert me["email"] == payload["email"].lower()
    # The logged-in user should match the role returned at registration
    assert me["role"] == "teacher"


def test_login_wrong_password(client):
    # Setup user
    payload = {
        "email": "user@example.com",
        "password": "GoodPass123!",
    }
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200

    # Wrong password
    r2 = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "wrong"})
    assert r2.status_code == 400


@pytest.mark.parametrize(
    ("idx", "password"),
    [
        (1, "nocaps123!"),
        (2, "NOLOWER123!"),
        (3, "NoDigits!!!!"),
        (4, "NoSpecial123"),
        (5, "Space Pass1!"),
    ],
)
def test_register_rejects_weak_passwords(client, idx, password):
    payload = {
        "email": f"weak{idx}@example.com",
        "password": password,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_me_requires_token(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code in (401, 403)


def test_verify_password_invalid_hash():
    from backend.routers.routers_auth import verify_password

    assert verify_password("password", "not-a-hash") is False


def test_get_current_user_invalid_token():
    from fastapi import HTTPException

    from backend.routers.routers_auth import get_current_user
    from backend.tests.conftest import TestingSessionLocal
    from starlette.requests import Request

    session = TestingSessionLocal()
    try:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(get_current_user(request=Request({"type": "http"}), token="invalid", db=session))
        assert exc.value.status_code == 401
    finally:
        session.close()


def test_get_current_user_inactive_user():
    from fastapi import HTTPException

    from backend.models import User
    from backend.routers.routers_auth import (
        create_access_token,
        get_current_user,
        get_password_hash,
    )
    from backend.tests.conftest import TestingSessionLocal
    from starlette.requests import Request

    session = TestingSessionLocal()
    try:
        hashed = get_password_hash("secret")
        user = User(
            email="inactive@example.com",
            hashed_password=hashed,
            role="teacher",
            is_active=False,
        )
        session.add(user)
        session.commit()

        token = create_access_token(subject=str(user.email))
        with pytest.raises(HTTPException) as exc:
            asyncio.run(get_current_user(request=Request({"type": "http"}), token=token, db=session))
        assert exc.value.status_code == 401
    finally:
        session.close()


def test_require_role_denies_mismatch():
    from fastapi import HTTPException

    from backend.routers.routers_auth import require_role
    from starlette.requests import Request

    dependency = require_role("admin")
    with pytest.raises(HTTPException) as exc:
        dependency(Request({"type": "http"}), SimpleNamespace(role="student"))
    assert exc.value.status_code == 403


def test_optional_require_role_returns_dummy_when_disabled(monkeypatch):
    from backend.routers import routers_auth
    from backend.routers.routers_auth import optional_require_role

    monkeypatch.setattr(routers_auth.settings, "AUTH_ENABLED", False)
    dependency = optional_require_role("admin")
    dummy = dependency()  # type: ignore[call-arg]
    assert dummy.role == "admin"
    assert dummy.is_active is True


def test_optional_require_role_enforces_when_enabled(monkeypatch):
    from backend.routers import routers_auth
    from backend.routers.routers_auth import optional_require_role
    from starlette.requests import Request

    monkeypatch.setattr(routers_auth.settings, "AUTH_ENABLED", True)
    dependency = optional_require_role("admin")
    admin = SimpleNamespace(role="admin")
    assert dependency(Request({"type": "http"}), admin) is admin  # type: ignore[misc]
