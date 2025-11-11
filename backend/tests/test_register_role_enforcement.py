from backend.db import get_session as db_get_session


def test_public_registration_cannot_set_admin(client):
    payload = {"email": "public_admin@example.com", "password": "Passw0rd!", "role": "admin"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    # Public registration must not yield admin role
    assert data.get("role") == "teacher"


def test_admin_token_allows_setting_role(client):
    # Step 1: register a user who will be promoted to admin by direct DB update
    creator = {"email": "creator@example.com", "password": "CreatorPass1"}
    r = client.post("/api/v1/auth/register", json=creator)
    assert r.status_code == 200, r.text

    # Promote this user to admin directly in the test DB
    from backend import models

    # Use the test DB session override (conftest provides dep override)
    db_gen = next(client.app.dependency_overrides[db_get_session]())
    with db_gen as db:
        user = db.query(models.User).filter(models.User.email == creator["email"]).first()
        assert user is not None
        user.role = "admin"
        db.add(user)
        db.commit()

    # Login as promoted admin
    r2 = client.post("/api/v1/auth/login", json={"email": creator["email"], "password": creator["password"]})
    assert r2.status_code == 200, r2.text
    token = r2.json().get("access_token")
    assert token

    # Use admin token to register a new user with role=admin
    new_user = {"email": "elevated@example.com", "password": "UserPass1", "role": "admin"}
    r3 = client.post("/api/v1/auth/register", json=new_user, headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 200, r3.text
    data = r3.json()
    assert data.get("role") == "admin"


def test_invalid_or_expired_admin_token_is_ignored(client):
    # Create a token that is expired (exp in past) or signed with wrong secret
    import jwt
    from datetime import datetime, timedelta, timezone
    from backend import config

    # Expired token
    payload = {"sub": "noone@example.com", "exp": datetime.now(timezone.utc) - timedelta(hours=1)}
    expired_token = jwt.encode(payload, config.settings.SECRET_KEY, algorithm=config.settings.ALGORITHM)

    new_user = {"email": "shouldberegistered@example.com", "password": "UserPass1", "role": "admin"}
    r = client.post("/api/v1/auth/register", json=new_user, headers={"Authorization": f"Bearer {expired_token}"})
    assert r.status_code == 200, r.text
    data = r.json()
    # Expired token must be ignored and role fallback to teacher
    assert data.get("role") == "teacher"

    # Token signed with wrong secret
    bad_token = jwt.encode({"sub": "noone@example.com", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, "wrongsecret", algorithm=config.settings.ALGORITHM)
    # Use a valid password so the request reaches role-checking logic
    r2 = client.post(
        "/api/v1/auth/register",
        json={"email": "also@example.com", "password": "UserPass2", "role": "admin"},
        headers={"Authorization": f"Bearer {bad_token}"},
    )
    assert r2.status_code == 200, r2.text
    assert r2.json().get("role") == "teacher"
