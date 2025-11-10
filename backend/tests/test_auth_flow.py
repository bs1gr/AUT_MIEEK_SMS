
def test_register_login_me_success(client):
    # Register a new user
    payload = {"email": "alice@example.com", "password": "S3curePass!", "full_name": "Alice"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "alice@example.com"
    assert data["is_active"] is True
    assert "id" in data

    # Login with the new user
    r2 = client.post("/api/v1/auth/login", json={"email": "alice@example.com", "password": "S3curePass!"})
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
    payload = {"email": "bob@example.com", "password": "AnotherPass1", "full_name": "Bob"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200

    # Duplicate register should fail
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 400

    # Wrong password login should fail
    r3 = client.post("/api/v1/auth/login", json={"email": "bob@example.com", "password": "wrong"})
    assert r3.status_code == 400
