from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.models import AuditLog


def _seed_logs(db):
    now = datetime.now(timezone.utc)
    entries = [
        AuditLog(
            action="create",
            resource="student",
            resource_id="1",
            user_id=1,
            user_email="admin@example.com",
            success=True,
            details={"field": "name"},
            timestamp=now - timedelta(minutes=3),
            request_id="req-1",
        ),
        AuditLog(
            action="update",
            resource="grade",
            resource_id="42",
            user_id=2,
            user_email="teacher@example.com",
            success=True,
            details={"old": 8, "new": 9},
            timestamp=now - timedelta(minutes=2),
            request_id="req-2",
        ),
        AuditLog(
            action="delete",
            resource="course",
            resource_id="7",
            user_id=1,
            user_email="admin@example.com",
            success=False,
            error_message="forbidden",
            timestamp=now - timedelta(minutes=1),
            request_id="req-3",
        ),
    ]
    db.add_all(entries)
    db.commit()


def test_list_audit_logs_pagination(client, db):
    _seed_logs(db)

    r = client.get("/api/v1/audit/logs?page=1&page_size=2")
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["total"] == 3
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["has_next"] is True
    assert len(data["logs"]) == 2
    # Sorted by timestamp desc, latest first
    assert data["logs"][0]["request_id"] == "req-3"
    assert data["logs"][1]["request_id"] == "req-2"

    r2 = client.get("/api/v1/audit/logs?page=2&page_size=2")
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["total"] == 3
    assert data2["page"] == 2
    assert data2["page_size"] == 2
    assert data2["has_next"] is False
    assert len(data2["logs"]) == 1
    assert data2["logs"][0]["request_id"] == "req-1"


def test_get_user_audit_logs(client, db):
    _seed_logs(db)

    r = client.get("/api/v1/audit/logs/user/1?page=1&page_size=10")
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["total"] == 2
    assert data["has_next"] is False
    assert all(log["user_id"] == 1 for log in data["logs"])
    # Verify new fields flow through response
    assert any(log.get("request_id") for log in data["logs"])
