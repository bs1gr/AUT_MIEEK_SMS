"""The Android app gets its refresh token in the body; browsers never do.

The app is served from https://localhost and talks to the server at another address, so its
WebView neither keeps nor sends the SameSite=Lax refresh cookie (seen on the owner's phone,
2026-11-19: closing and reopening the app always led back to the sign-in page).
"""

from sqlalchemy.orm import Session

APP = {"Origin": "https://localhost", "X-SMS-Native-Session": "1"}


def _account(client, email):
    payload = {"email": email, "password": "Passw0rd!", "full_name": "App User"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 200
    return payload


def _login(client, payload, headers=None):
    return client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
        headers=headers or {},
    )


def test_app_gets_refresh_token_and_renews_with_it_alone(client, db: Session):
    payload = _account(client, "app.user@example.com")
    r = _login(client, payload, APP)
    assert r.status_code == 200
    first = r.json().get("refresh_token")
    assert first, r.json()

    # The app has no cookie: it sends the token in the body only.
    client.cookies.clear()
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": first}, headers=APP, add_auth=False)
    assert r2.status_code == 200
    second = r2.json().get("refresh_token")
    assert second and second != first
    assert r2.json().get("access_token")

    # Rotation: the old one is spent, the new one works.
    client.cookies.clear()
    assert (
        client.post("/api/v1/auth/refresh", json={"refresh_token": first}, headers=APP, add_auth=False).status_code
        == 401
    )
    client.cookies.clear()
    r3 = client.post("/api/v1/auth/refresh", json={"refresh_token": second}, headers=APP, add_auth=False)
    assert r3.status_code == 200
    third = r3.json()["refresh_token"]

    # Signing out with the token in the body revokes it.
    client.cookies.clear()
    r4 = client.post("/api/v1/auth/logout", json={"refresh_token": third}, headers=APP, add_auth=False)
    assert r4.status_code == 200
    client.cookies.clear()
    assert (
        client.post("/api/v1/auth/refresh", json={"refresh_token": third}, headers=APP, add_auth=False).status_code
        == 401
    )


def test_browser_never_gets_refresh_token_in_body(client, db: Session):
    payload = _account(client, "browser.user@example.com")
    for headers in (
        {},  # an ordinary browser page
        {"Origin": "https://sms.example.com", "X-SMS-Native-Session": "1"},  # a web page asking for it
        {"Origin": "https://localhost"},  # the app's origin without asking
        {"Origin": "https://localhost:8443", "X-SMS-Native-Session": "1"},  # another localhost port
        {"Origin": "http://localhost", "X-SMS-Native-Session": "1"},  # not the app's scheme
    ):
        r = _login(client, payload, headers)
        assert r.status_code == 200, headers
        assert r.json().get("refresh_token") is None, headers
        assert client.cookies.get("refresh_token"), headers

        r2 = client.post("/api/v1/auth/refresh", headers=headers, add_auth=False)
        assert r2.status_code == 200, headers
        assert r2.json().get("refresh_token") is None, headers


def test_capacitor_scheme_origin_is_the_app_too(client, db: Session):
    payload = _account(client, "ios.style@example.com")
    r = _login(client, payload, {"Origin": "capacitor://localhost", "X-SMS-Native-Session": "1"})
    assert r.status_code == 200
    assert r.json().get("refresh_token")
