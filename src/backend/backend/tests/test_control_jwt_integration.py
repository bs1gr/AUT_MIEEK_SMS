from types import SimpleNamespace


def test_jwt_admin_can_call_control_stop(client, monkeypatch):
    """Integration-style test: create admin user, login, and call control stop via JWT.

    This test avoids destructive actions by monkeypatching process scanning and
    subprocess calls so no real processes are terminated.
    """
    # Register admin
    payload = {
        "email": "jwtadmin@example.com",  # pragma: allowlist secret
        "password": "S3curePass!",  # pragma: allowlist secret
        "full_name": "JWT Admin",
        "role": "admin",
    }
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text

    # Login to get token
    r2 = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert r2.status_code == 200, r2.text
    token = r2.json().get("access_token")
    assert isinstance(token, str) and token

    # Make sure no FRONTEND_PROCESS is tracked
    import backend.main as main

    main.FRONTEND_PROCESS = None

    # Monkeypatch _find_pids_on_port to return no pids
    monkeypatch.setattr(main, "_find_pids_on_port", lambda port: [])

    # Monkeypatch subprocess.run to a harmless stub that reports success
    def fake_run(*args, **kwargs):
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(main.subprocess, "run", fake_run)

    # Call the control stop endpoint using JWT in Authorization header
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/control/api/stop", headers=headers)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("success") is True
