"""Who may send a message to other accounts (``POST /notifications/broadcast``).

The endpoint asks for the permission ``notifications:manage``. Administrators have it, and so
has the teacher role, by default and in the grants made at start. The page offered the form to
administrators only until November 2026; the owner's decision of 2026-11-17 is that teachers
may send, and the page offers them the form. These tests say who the server lets send.

``test_broadcast_notification_requires_admin`` in ``test_notifications_router.py`` was the only
test of that: it sent no token to a server that asks for none, and accepted 200, 400, 401 and
403 alike.
"""

import pytest
from fastapi.testclient import TestClient

from backend.tests.test_rbac_enforcement import _login, _register_user, rbac_client  # noqa: F401

PASSWORD = "Str0ngPass!123"  # pragma: allowlist secret
MESSAGE = {"notification_type": "announcement", "title": "Workshop moved", "message": "Tomorrow in room 4."}


def _account(client: TestClient, email: str, role: str) -> dict[str, str]:
    """An account of that role, signed in. Registration through the API makes a teacher of
    everyone who asks, whatever role they ask for, so the other roles are written to the
    database directly."""
    if role == "teacher":
        _register_user(client, email, PASSWORD, role=role)
    else:
        from backend import models
        from backend.db import get_session as db_get_session
        from backend.security.password_hash import get_password_hash

        with next(client.app.dependency_overrides[db_get_session]()) as db:
            db.add(models.User(email=email, hashed_password=get_password_hash(PASSWORD), role=role, is_active=True))
            db.commit()
    headers = {"Authorization": f"Bearer {_login(client, email, PASSWORD)}"}
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200 and me.json()["role"] == role, me.text
    return headers


def _titles(client: TestClient, headers: dict[str, str]) -> list[str]:
    response = client.get("/api/v1/notifications/", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    items = body.get("items", body) if isinstance(body, dict) else body
    return [item["title"] for item in items]


def test_a_teacher_may_send_to_every_account(rbac_client: TestClient):  # noqa: F811
    client = rbac_client
    teacher = _account(client, "sender@example.com", "teacher")
    colleague = _account(client, "colleague@example.com", "teacher")
    admin = _account(client, "head@example.com", "admin")

    sent = client.post("/api/v1/notifications/broadcast", json=MESSAGE, headers=teacher)

    assert sent.status_code == 200, sent.text
    assert (sent.json()["total_users"], sent.json()["sent_count"]) == (3, 3)
    for headers in (teacher, colleague, admin):
        assert _titles(client, headers) == ["Workshop moved"]


def test_a_teacher_may_send_to_one_role(rbac_client: TestClient):  # noqa: F811
    client = rbac_client
    teacher = _account(client, "sender@example.com", "teacher")
    colleague = _account(client, "colleague@example.com", "teacher")
    admin = _account(client, "head@example.com", "admin")

    sent = client.post("/api/v1/notifications/broadcast", json={**MESSAGE, "role_filter": "admin"}, headers=teacher)

    assert sent.status_code == 200, sent.text
    assert sent.json()["total_users"] == 1
    assert _titles(client, admin) == ["Workshop moved"]
    assert _titles(client, colleague) == []
    assert _titles(client, teacher) == []


def test_an_administrator_may_send(rbac_client: TestClient):  # noqa: F811
    client = rbac_client
    admin = _account(client, "head@example.com", "admin")
    teacher = _account(client, "teacher@example.com", "teacher")

    sent = client.post("/api/v1/notifications/broadcast", json=MESSAGE, headers=admin)

    assert sent.status_code == 200, sent.text
    assert _titles(client, teacher) == ["Workshop moved"]


@pytest.mark.parametrize("role", ["student", "viewer", "guest"])
def test_an_account_without_the_permission_is_refused_and_nothing_is_sent(rbac_client: TestClient, role: str):  # noqa: F811
    client = rbac_client
    admin = _account(client, "head@example.com", "admin")
    reader = _account(client, f"{role}@example.com", role)

    refused = client.post("/api/v1/notifications/broadcast", json=MESSAGE, headers=reader)

    assert refused.status_code == 403, refused.text
    assert _titles(client, admin) == []
    assert _titles(client, reader) == []


def test_nobody_sends_without_an_account_where_a_sign_in_is_required(rbac_client: TestClient):  # noqa: F811
    client = rbac_client
    admin = _account(client, "head@example.com", "admin")

    import backend.config as config

    config.settings.AUTH_MODE = "strict"

    refused = client.post("/api/v1/notifications/broadcast", json=MESSAGE)

    assert refused.status_code == 401, refused.text
    assert _titles(client, admin) == []


def test_the_teacher_role_has_the_permission_by_default_and_the_reading_roles_have_not():
    # What a role may do while the database holds no grant of its own for it. The page shows
    # the form by these: to an administrator and to a teacher.
    from backend.rbac import _default_role_permissions

    assert "notifications:manage" in _default_role_permissions("teacher")
    for role in ("viewer", "guest", "student"):
        assert "notifications:manage" not in _default_role_permissions(role), role
