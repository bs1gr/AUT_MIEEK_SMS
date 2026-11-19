"""Three of the findings of todo 59 (2026-11-17), repaired on 2026-11-19.

- A message one account sends to others says who sent it. Nothing of the sender was stored, so
  a teacher's message to all users looked like an administrator's.
- A receiver who switched in-app notifications off in their preferences gets no copy. The
  preferences were stored and never read (``should_notify`` had no caller).
- Notifications deleted in the bell are removed after 30 days. "Delete" only marked the row and
  nothing ever removed it.
"""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from backend.tests.test_notifications_broadcast_roles import MESSAGE, _account
from backend.tests.test_rbac_enforcement import rbac_client  # noqa: F401


def _items(client: TestClient, headers: dict[str, str]) -> list[dict]:
    response = client.get("/api/v1/notifications/", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    return body.get("items", body) if isinstance(body, dict) else body


def _db(client: TestClient):
    from backend.db import get_session as db_get_session

    return next(client.app.dependency_overrides[db_get_session]())


def test_every_copy_names_its_sender_and_the_body_cannot_forge_it(rbac_client: TestClient):  # noqa: F811
    client = rbac_client
    teacher = _account(client, "sender@example.com", "teacher")
    admin = _account(client, "head@example.com", "admin")
    forged = {**MESSAGE, "data": {"sender_name": "The Director", "sender_id": 999, "url": "/attendance"}}

    sent = client.post("/api/v1/notifications/broadcast", json=forged, headers=teacher)

    assert sent.status_code == 200, sent.text
    (item,) = _items(client, admin)
    assert item["data"]["sender_name"] == "sender@example.com"
    assert item["data"]["sender_id"] != 999
    assert item["data"]["url"] == "/attendance"


def test_a_receiver_who_switched_in_app_notifications_off_gets_no_copy(rbac_client: TestClient):  # noqa: F811
    client = rbac_client
    admin = _account(client, "head@example.com", "admin")
    quiet = _account(client, "quiet@example.com", "teacher")
    switched_off = client.put("/api/v1/notifications/preferences", json={"in_app_enabled": False}, headers=quiet)
    assert switched_off.status_code == 200, switched_off.text

    sent = client.post("/api/v1/notifications/broadcast", json=MESSAGE, headers=admin)

    assert sent.status_code == 200, sent.text
    assert (sent.json()["total_users"], sent.json()["sent_count"], sent.json()["skipped_count"]) == (2, 1, 1)
    assert _items(client, quiet) == []
    assert [item["title"] for item in _items(client, admin)] == ["Workshop moved"]


def test_deleted_notifications_are_removed_after_thirty_days_and_no_others(rbac_client: TestClient):  # noqa: F811
    from backend import models
    from backend.services.notification_cleanup import purge_deleted_notifications

    client = rbac_client
    _account(client, "head@example.com", "admin")
    now = datetime.now(timezone.utc)
    with _db(client) as db:
        user_id = db.query(models.User).filter_by(email="head@example.com").one().id

        def add(title: str, deleted_days_ago: int | None, created_days_ago: int = 400) -> None:
            db.add(
                models.Notification(
                    user_id=user_id,
                    notification_type="system",
                    title=title,
                    message="m",
                    created_at=now - timedelta(days=created_days_ago),
                    deleted_at=None if deleted_days_ago is None else now - timedelta(days=deleted_days_ago),
                )
            )

        add("deleted long ago", 31)
        add("deleted lately", 5)
        add("old but kept", None)
        add("new", None, created_days_ago=0)
        db.commit()

        assert purge_deleted_notifications(db, now=now) == 1

        left = {
            row.title for row in db.query(models.Notification).execution_options(include_deleted=True).all()
        }
    assert left == {"deleted lately", "old but kept", "new"}
