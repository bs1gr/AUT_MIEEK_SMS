from datetime import datetime, timezone
from sqlalchemy.orm import Session


def test_refresh_rotation_and_logout(client, db: Session):
    # Register and login to obtain initial refresh token
    payload = {"email": "carol@example.com", "password": "Passw0rd!", "full_name": "Carol"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200

    r2 = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert r2.status_code == 200
    # Test client stores cookies; login should set HttpOnly refresh_token cookie
    assert "refresh_token" in client.cookies and client.cookies.get("refresh_token")
    old_refresh = client.cookies.get("refresh_token")

    # Use refresh to obtain rotated tokens
    # Call refresh without JSON body; server should read cookie and rotate it
    r3 = client.post("/api/v1/auth/refresh", add_auth=False)
    assert r3.status_code == 200
    new = r3.json()
    assert "access_token" in new
    # New refresh token should be set as cookie
    assert "refresh_token" in client.cookies and client.cookies.get("refresh_token")
    new_refresh = client.cookies.get("refresh_token")
    assert new_refresh != old_refresh

    # Check DB: the user should have two refresh token records (old rotated + new)
    from backend import models

    user = db.query(models.User).filter(models.User.email == payload["email"]).one()
    tokens = list(db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).all())
    assert len(tokens) >= 2
    revoked_count = sum(1 for t in tokens if t.revoked)
    active_count = sum(1 for t in tokens if not t.revoked)
    assert revoked_count >= 1 and active_count >= 1

    # Old refresh should no longer work
    # Old refresh (previous cookie) should no longer work
    r4 = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh}, add_auth=False)
    assert r4.status_code == 401

    # Logout the new refresh token
    # Logout should clear the refresh cookie
    r5 = client.post("/api/v1/auth/logout", add_auth=False)
    assert r5.status_code == 200
    assert r5.json().get("ok") is True
    assert client.cookies.get("refresh_token") is None

    # Using the logged-out refresh should fail
    r6 = client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh}, add_auth=False)
    assert r6.status_code == 401

    # DB: after logout all refresh tokens for the user should be revoked
    user = db.query(models.User).filter(models.User.email == payload["email"]).one()
    tokens = list(db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).all())
    assert len(tokens) >= 2
    assert all(t.revoked for t in tokens)


def test_refresh_expiry(client, db: Session, monkeypatch):
    # Temporarily set refresh expiry to -1 days so issued token is immediately expired
    # Use monkeypatch to safely modify the settings instance
    from backend.config import settings

    try:
        monkeypatch.setattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", -1, raising=False)
    except Exception:
        object.__setattr__(settings, "REFRESH_TOKEN_EXPIRE_DAYS", -1)

    payload = {"email": "dave@example.com", "password": "Expiry1!", "full_name": "Dave"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200

    r2 = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert r2.status_code == 200
    # Login should set the refresh_token cookie
    assert "refresh_token" in client.cookies and client.cookies.get("refresh_token")
    expired_refresh = client.cookies.get("refresh_token")

    # Immediately attempting to refresh should fail due to expiry
    r3 = client.post("/api/v1/auth/refresh", json={"refresh_token": expired_refresh})
    assert r3.status_code == 401
    # DB: the token record should exist and have an expires_at in the past
    from backend import models

    user = db.query(models.User).filter(models.User.email == payload["email"]).one()
    tokens = list(db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).all())
    assert len(tokens) >= 1
    # The stored expires_at should be in the past (or at least <= now).
    # Normalize naive datetimes to UTC before comparing to avoid tz errors.
    now_utc = datetime.now(timezone.utc)

    def _is_past(exp):
        if exp is None:
            return False
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return exp <= now_utc

    assert any(_is_past(t.expires_at) for t in tokens)
