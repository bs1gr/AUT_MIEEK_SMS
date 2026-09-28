"""Public self-registration: approval (default), open and disabled modes."""

import pytest

from backend import models
from backend.config import settings
from backend.routers.routers_auth import get_password_hash

APPLICANT = {
    "email": "applicant@example.com",
    "password": "Applicant1!",  # pragma: allowlist secret
    "full_name": "Νέος Εκπαιδευτής",
    "role": "admin",
}
ADMIN_PASSWORD = "AdminPass1!"  # pragma: allowlist secret


@pytest.fixture
def registration_mode(monkeypatch):
    def _set(mode: str) -> None:
        monkeypatch.setattr(settings, "SELF_REGISTRATION_MODE", mode, raising=False)

    return _set


def _make_admin(db, email="approver@example.com", active=True) -> models.User:
    admin = models.User(
        email=email,
        full_name="Approver",
        role="admin",
        hashed_password=get_password_hash(ADMIN_PASSWORD),
        is_active=active,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def _login(client, email, password):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def _error_code(response) -> str | None:
    return ((response.json().get("error") or {}).get("details") or {}).get("error_code")


def _registration_notifications(db):
    return db.query(models.Notification).filter(models.Notification.notification_type == "registration").all()


def test_default_mode_is_approval():
    from backend.config import Settings

    assert Settings.model_fields["SELF_REGISTRATION_MODE"].default == "approval"


def test_approval_mode_creates_inactive_teacher_and_blocks_login(client, db, registration_mode):
    registration_mode("approval")

    r = client.post("/api/v1/auth/register", json=APPLICANT)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_active"] is False
    assert body["role"] == "teacher"  # requested admin role is still ignored

    login = _login(client, APPLICANT["email"], APPLICANT["password"])
    assert login.status_code == 403, login.text
    assert _error_code(login) == "AUTH_ACCOUNT_INACTIVE"
    assert "refresh_token" not in login.cookies


def test_pending_account_with_wrong_password_reveals_nothing(client, registration_mode):
    registration_mode("approval")
    assert client.post("/api/v1/auth/register", json=APPLICANT).status_code == 200

    login = _login(client, APPLICANT["email"], "WrongPass1!")
    assert login.status_code == 400
    assert _error_code(login) == "AUTH_INVALID_CREDENTIALS"


def test_approval_mode_notifies_every_active_admin(client, db, registration_mode):
    registration_mode("approval")
    active_admin = _make_admin(db)
    _make_admin(db, email="retired@example.com", active=False)

    r = client.post("/api/v1/auth/register", json=APPLICANT)
    assert r.status_code == 200, r.text

    notes = _registration_notifications(db)
    assert [n.user_id for n in notes] == [active_admin.id]
    assert notes[0].data["user_id"] == r.json()["id"]
    assert notes[0].data["email"] == APPLICANT["email"]
    assert notes[0].data["url"] == "#/power?showControl=1&showUsers=1"


def test_admin_activation_lets_the_user_log_in(client, db, registration_mode):
    registration_mode("approval")
    _make_admin(db)
    user_id = client.post("/api/v1/auth/register", json=APPLICANT).json()["id"]

    admin_login = _login(client, "approver@example.com", ADMIN_PASSWORD)
    assert admin_login.status_code == 200, admin_login.text
    token = admin_login.json()["access_token"]

    patch = client.patch(
        f"/api/v1/admin/users/{user_id}",
        json={"is_active": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["is_active"] is True

    login = _login(client, APPLICANT["email"], APPLICANT["password"])
    assert login.status_code == 200, login.text


@pytest.fixture
def smtp(monkeypatch):
    """Fake SMTP: records sends; `configured` / `succeed` control the outcome."""
    from backend.services.email_notification_service import EmailNotificationService

    state = {"configured": True, "succeed": True, "sent": []}

    def _send(to_email, subject, html_body, text_body=None, attachments=None):
        state["sent"].append({"to": to_email, "subject": subject, "html": html_body, "text": text_body})
        return state["succeed"]

    monkeypatch.setattr(EmailNotificationService, "is_enabled", staticmethod(lambda: state["configured"]))
    monkeypatch.setattr(EmailNotificationService, "send_email", staticmethod(_send))
    return state


def _approve(client, db, headers=None):
    """Register the applicant (approval mode) and have the approver activate them."""
    user_id = client.post("/api/v1/auth/register", json=APPLICANT).json()["id"]
    token = _login(client, "approver@example.com", ADMIN_PASSWORD).json()["access_token"]
    return client.patch(
        f"/api/v1/admin/users/{user_id}",
        json={"is_active": True},
        headers={"Authorization": f"Bearer {token}", **(headers or {})},
    )


def _failed_email_notifications(db):
    return (
        db.query(models.Notification).filter(models.Notification.notification_type == "activation_email_failed").all()
    )


def test_activation_emails_the_user(client, db, registration_mode, smtp):
    registration_mode("approval")
    _make_admin(db)

    r = _approve(client, db)
    assert r.status_code == 200, r.text
    assert r.json()["activation_email"] == "sent"
    assert [m["to"] for m in smtp["sent"]] == [APPLICANT["email"]]
    assert "Your account has been activated" in smtp["sent"][0]["subject"]
    assert APPLICANT["full_name"] in smtp["sent"][0]["html"]
    text = smtp["sent"][0]["text"]
    assert APPLICANT["full_name"] in text and APPLICANT["email"] in text
    assert "<" not in text  # a real plain-text part, not the HTML-with-tags fallback
    assert _failed_email_notifications(db) == []


@pytest.mark.parametrize(
    ("configured", "succeed", "reason"), [(True, False, "failed"), (False, True, "not_configured")]
)
def test_unsent_activation_email_asks_the_approver_to_tell_the_user(
    client, db, registration_mode, smtp, configured, succeed, reason
):
    registration_mode("approval")
    smtp["configured"], smtp["succeed"] = configured, succeed
    approver = _make_admin(db)
    _make_admin(db, email="other-admin@example.com")

    r = _approve(client, db)
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is True  # activation stands even though the email didn't go out
    assert r.json()["activation_email"] == reason

    notes = _failed_email_notifications(db)
    assert [n.user_id for n in notes] == [approver.id]  # only the admin who approved
    assert notes[0].data["email"] == APPLICANT["email"]
    assert notes[0].data["reason"] == reason
    assert _login(client, APPLICANT["email"], APPLICANT["password"]).status_code == 200


def test_editing_an_active_user_sends_no_email(client, db, smtp):
    _make_admin(db)
    user = models.User(
        email="already@example.com", role="teacher", hashed_password=get_password_hash("Already1!x"), is_active=True
    )
    db.add(user)
    db.commit()

    r = client.patch(f"/api/v1/admin/users/{user.id}", json={"full_name": "Renamed"})
    assert r.status_code == 200, r.text
    assert r.json()["activation_email"] is None
    assert smtp["sent"] == []


def test_admin_user_endpoints_do_not_return_password_hashes(client, db, registration_mode, smtp):
    registration_mode("approval")
    _make_admin(db)
    patched = _approve(client, db).json()
    created = client.post(
        "/api/v1/admin/users",
        json={"email": "made@example.com", "password": "MadeByAdmin1!", "role": "teacher"},
    )
    assert created.status_code == 201, created.text
    for body in (patched, created.json()):
        assert "hashed_password" not in body
        assert "failed_login_attempts" not in body
        assert "lockout_until" not in body


def test_activation_email_links_only_to_a_reachable_origin(client, db, registration_mode, smtp):
    registration_mode("approval")
    _make_admin(db)
    assert _approve(client, db, headers={"Origin": "http://192.168.1.20:8080"}).status_code == 200
    assert 'href="http://192.168.1.20:8080/"' in smtp["sent"][0]["html"]

    from backend.routers.routers_auth import _login_url_from_request
    from starlette.requests import Request

    def _req(origin):
        return Request({"type": "http", "headers": [(b"origin", origin.encode())]})

    assert _login_url_from_request(_req("http://localhost:5173")) is None
    assert _login_url_from_request(_req("http://127.0.0.1:8080")) is None
    assert _login_url_from_request(_req("capacitor://localhost")) is None


def test_activation_email_escapes_user_supplied_name():
    from backend.services.email_notification_service import EmailTemplates

    _, body = EmailTemplates.account_activated("<script>alert(1)</script>", "x@example.com")
    assert "<script>" not in body
    assert "&lt;script&gt;" in body


def test_admin_token_registration_skips_approval(client, db, registration_mode):
    registration_mode("approval")
    _make_admin(db)
    token = _login(client, "approver@example.com", ADMIN_PASSWORD).json()["access_token"]

    r = client.post("/api/v1/auth/register", json=APPLICANT, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is True
    assert r.json()["role"] == "admin"
    assert _registration_notifications(db) == []


def test_open_mode_activates_immediately_without_notification(client, db, registration_mode):
    registration_mode("open")
    _make_admin(db)

    r = client.post("/api/v1/auth/register", json=APPLICANT)
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is True
    assert _login(client, APPLICANT["email"], APPLICANT["password"]).status_code == 200
    assert _registration_notifications(db) == []


def test_disabled_mode_refuses_public_registration(client, db, registration_mode):
    registration_mode("disabled")

    r = client.post("/api/v1/auth/register", json=APPLICANT)
    assert r.status_code == 403, r.text
    assert _error_code(r) == "AUTH_REGISTRATION_DISABLED"
    assert db.query(models.User).filter(models.User.email == APPLICANT["email"]).first() is None


def test_disabled_mode_still_allows_admin_token_registration(client, db, registration_mode):
    registration_mode("disabled")
    _make_admin(db)
    token = _login(client, "approver@example.com", ADMIN_PASSWORD).json()["access_token"]

    r = client.post("/api/v1/auth/register", json=APPLICANT, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is True


def test_login_refused_for_admin_deactivated_account(client, db):
    user = models.User(
        email="deactivated@example.com",
        role="teacher",
        hashed_password=get_password_hash(APPLICANT["password"]),
        is_active=False,
    )
    db.add(user)
    db.commit()

    login = _login(client, "deactivated@example.com", APPLICANT["password"])
    assert login.status_code == 403
    assert _error_code(login) == "AUTH_ACCOUNT_INACTIVE"
