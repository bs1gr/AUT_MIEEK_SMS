import time

from backend.config import settings
from backend.errors import ErrorCode


def _csrf_headers(client):
    resp = client.get("/api/v1/security/csrf")
    assert resp.status_code == 200
    data = resp.json()
    return {data["header_name"]: data["csrf_token"]}


def _post_with_csrf(client, url: str, payload: dict):
    return client.post(url, json=payload, headers=_csrf_headers(client))


def test_register_login_me_success(client):
    # Register a new user
    payload = {"email": "alice@example.com", "password": "S3curePass!", "full_name": "Alice"}
    r = _post_with_csrf(client, "/api/v1/auth/register", payload)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "alice@example.com"
    assert data["is_active"] is True
    assert "id" in data

    # Login with the new user
    r2 = _post_with_csrf(client, "/api/v1/auth/login", {"email": "alice@example.com", "password": "S3curePass!"})
    assert r2.status_code == 200
    token_data = r2.json()
    assert "access_token" in token_data
    access_token = token_data["access_token"]

    # Use token to call /auth/me
    headers = {"Authorization": f"Bearer {access_token}"}
    r3 = client.get("/api/v1/auth/me", headers=headers)
    assert r3.status_code == 200
    me = r3.json()
    assert me["email"] == "alice@example.com"


def test_register_duplicate_and_bad_login(client):
    payload = {"email": "bob@example.com", "password": "AnotherPass1!", "full_name": "Bob"}
    r = _post_with_csrf(client, "/api/v1/auth/register", payload)
    assert r.status_code == 200

    # Duplicate register should fail
    r2 = _post_with_csrf(client, "/api/v1/auth/register", payload)
    assert r2.status_code == 400

    # Wrong password login should fail
    r3 = _post_with_csrf(client, "/api/v1/auth/login", {"email": "bob@example.com", "password": "wrong"})
    assert r3.status_code == 400


def test_login_lockout_after_failed_attempts(client):
    payload = {"email": "lock@example.com", "password": "LockPass1!", "full_name": "Lock User"}
    assert _post_with_csrf(client, "/api/v1/auth/register", payload).status_code == 200

    for _ in range(4):
        resp = _post_with_csrf(client, "/api/v1/auth/login", {"email": payload["email"], "password": "badPass!1"})
        assert resp.status_code == 400

    resp = _post_with_csrf(client, "/api/v1/auth/login", {"email": payload["email"], "password": "badPass!1"})
    assert resp.status_code == 429
    body = resp.json()
    assert body["detail"]["error_id"] == ErrorCode.AUTH_ACCOUNT_LOCKED.value
    assert "Retry-After" in resp.headers


def test_login_recovers_after_lockout_window(client):
    prev_attempts = settings.AUTH_LOGIN_MAX_ATTEMPTS
    prev_lockout = settings.AUTH_LOGIN_LOCKOUT_SECONDS
    prev_window = settings.AUTH_LOGIN_TRACKING_WINDOW_SECONDS
    settings.AUTH_LOGIN_MAX_ATTEMPTS = 3
    settings.AUTH_LOGIN_LOCKOUT_SECONDS = 1
    settings.AUTH_LOGIN_TRACKING_WINDOW_SECONDS = 1

    payload = {"email": "recover@example.com", "password": "RecoverPass1!", "full_name": "Recovery"}
    try:
        assert _post_with_csrf(client, "/api/v1/auth/register", payload).status_code == 200

        for _ in range(3):
            resp = _post_with_csrf(client, "/api/v1/auth/login", {"email": payload["email"], "password": "Wrong123!"})
            assert resp.status_code in (400, 429)

        resp = _post_with_csrf(client, "/api/v1/auth/login", {"email": payload["email"], "password": "Wrong123!"})
        assert resp.status_code == 429

        time.sleep(1.2)

        success = _post_with_csrf(
            client,
            "/api/v1/auth/login",
            {"email": payload["email"], "password": payload["password"]},
        )
        assert success.status_code == 200
    finally:
        settings.AUTH_LOGIN_MAX_ATTEMPTS = prev_attempts
        settings.AUTH_LOGIN_LOCKOUT_SECONDS = prev_lockout
        settings.AUTH_LOGIN_TRACKING_WINDOW_SECONDS = prev_window
