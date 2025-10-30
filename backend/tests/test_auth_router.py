def test_register_login_me_flow(client):
    # Register
    payload = {"email": "admin@example.com", "password": "S3curePass!", "full_name": "Admin User", "role": "admin"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == payload["email"].lower()
    assert data["role"] == "admin"
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
    assert me["role"] == "admin"


def test_login_wrong_password(client):
    # Setup user
    payload = {
        "email": "user@example.com",
        "password": "GoodPass123",
    }
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200

    # Wrong password
    r2 = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "wrong"})
    assert r2.status_code == 400


def test_me_requires_token(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code in (401, 403)
