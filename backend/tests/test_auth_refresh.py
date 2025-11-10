from datetime import datetime, timezone

import backend.config as config_mod


def _get_test_db_session():
    """Return (gen, db) where gen is the generator from the app dependency override
    so the caller can close it when done. This mirrors how the test app creates
    DB sessions in `conftest.py` by overriding the `backend.db.get_session` dependency.
    """
    from backend.main import app
    from backend.db import get_session as db_get_session

    override = app.dependency_overrides.get(db_get_session)
    gen = override() if override is not None else db_get_session()
    db = next(gen)
    return gen, db


def test_refresh_rotation_and_logout(client):
    # Register and login to obtain initial refresh token
    payload = {"email": "carol@example.com", "password": "Passw0rd!", "full_name": "Carol"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200

    r2 = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert r2.status_code == 200
    td = r2.json()
    assert "refresh_token" in td and td["refresh_token"]
    old_refresh = td["refresh_token"]

    # Use refresh to obtain rotated tokens
    r3 = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert r3.status_code == 200
    new = r3.json()
    assert "access_token" in new and "refresh_token" in new
    new_refresh = new["refresh_token"]
    assert new_refresh != old_refresh

    # Check DB: the user should have two refresh token records (old rotated + new)
    from backend import models

    gen, db = _get_test_db_session()
    try:
        user = db.query(models.User).filter(models.User.email == payload["email"]).one()
        tokens = list(db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).all())
        assert len(tokens) >= 2
        revoked_count = sum(1 for t in tokens if t.revoked)
        active_count = sum(1 for t in tokens if not t.revoked)
        assert revoked_count >= 1 and active_count >= 1
    finally:
        try:
            gen.close()
        except Exception:
            pass

    # Old refresh should no longer work
    r4 = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert r4.status_code == 401

    # Logout the new refresh token
    r5 = client.post("/api/v1/auth/logout", json={"refresh_token": new_refresh})
    assert r5.status_code == 200
    assert r5.json().get("ok") is True

    # Using the logged-out refresh should fail
    r6 = client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh})
    assert r6.status_code == 401

    # DB: after logout all refresh tokens for the user should be revoked
    gen, db = _get_test_db_session()
    try:
        user = db.query(models.User).filter(models.User.email == payload["email"]).one()
        tokens = list(db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).all())
        assert len(tokens) >= 2
        assert all(t.revoked for t in tokens)
    finally:
        try:
            gen.close()
        except Exception:
            pass


def test_refresh_expiry(client):
    # Temporarily set refresh expiry to -1 days so issued token is immediately expired
    # Modify the Settings class attribute so create_refresh_token_for_user will use it
    SettingsClass = config_mod.Settings
    orig = getattr(SettingsClass, "REFRESH_TOKEN_EXPIRE_DAYS", None)
    try:
        SettingsClass.REFRESH_TOKEN_EXPIRE_DAYS = -1

        payload = {"email": "dave@example.com", "password": "Expiry1!", "full_name": "Dave"}
        r = client.post("/api/v1/auth/register", json=payload)
        assert r.status_code == 200

        r2 = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
        assert r2.status_code == 200
        td = r2.json()
        assert "refresh_token" in td and td["refresh_token"]
        expired_refresh = td["refresh_token"]

        # Immediately attempting to refresh should fail due to expiry
        r3 = client.post("/api/v1/auth/refresh", json={"refresh_token": expired_refresh})
        assert r3.status_code == 401
        # DB: the token record should exist and have an expires_at in the past
        from backend import models

        gen, db = _get_test_db_session()
        try:
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
        finally:
            try:
                gen.close()
            except Exception:
                pass
    finally:
        # restore
        if orig is None:
            try:
                delattr(SettingsClass, "REFRESH_TOKEN_EXPIRE_DAYS")
            except Exception:
                pass
        else:
            SettingsClass.REFRESH_TOKEN_EXPIRE_DAYS = orig
