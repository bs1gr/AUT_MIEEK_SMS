def test_change_password_flow(client):
    # Register a user
    payload = {
        "email": "changeme@example.com",
        "password": "OldPass123!",  # pragma: allowlist secret
    }
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text

    # Login to get access token
    login = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login.status_code == 200, login.text
    token = login.json().get("access_token")
    assert token and isinstance(token, str)

    headers = {"Authorization": f"Bearer {token}"}

    # Change password
    change_resp = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": payload["password"], "new_password": "NewPass456!"},
        headers=headers,
    )
    assert change_resp.status_code == 200, change_resp.text
    body = change_resp.json()
    assert body.get("status") == "password_changed"
    assert body.get("access_token") and isinstance(body.get("access_token"), str)

    # Old password should no longer work
    r_old = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": "OldPass123!"},
    )
    assert r_old.status_code == 400

    # New password should work
    r_new = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": "NewPass456!"},
    )
    assert r_new.status_code == 200
