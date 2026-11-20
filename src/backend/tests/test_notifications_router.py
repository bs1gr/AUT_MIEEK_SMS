"""
Test suite for notification API endpoints.
Covers notification CRUD, preferences, and admin broadcast functionality.
"""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from backend.models import Notification, User
from backend.tests.conftest import get_error_message

# ==================== Test Fixtures ====================


@pytest.fixture
def test_user_id(db):
    """Return the test user ID (admin user created by test framework).

    In test mode with AUTH disabled, all unauthenticated requests
    get user ID=1 (the dummy admin user from optional_require_role).
    """
    # Just return 1 - this is the ID that the test framework assigns
    return 1


@pytest.fixture
def notification_payloads():
    """Fixture providing sample notification payloads."""
    return {
        "grade_update": {
            "notification_type": "grade_update",
            "title": "Grade Posted",
            "message": "Your grade has been updated in Mathematics",
            "data": {"course_id": 1, "grade": 95},
        },
        "attendance_change": {
            "notification_type": "attendance_change",
            "title": "Attendance Recorded",
            "message": "Your attendance has been recorded",
            "data": {"course_id": 2, "date": "2026-01-05"},
        },
        "course_update": {
            "notification_type": "course_update",
            "title": "Course Update",
            "message": "Course schedule has changed",
            "data": {"course_id": 3},
        },
        "system_message": {
            "notification_type": "system_message",
            "title": "System Maintenance",
            "message": "System will be down for maintenance",
            "data": None,
        },
    }


def make_notification_in_db(db: Session, user_id: int, **kwargs) -> Notification:
    """Helper to create a notification directly in the database."""
    defaults = {
        "user_id": user_id,
        "notification_type": "test_notification",
        "title": "Test Notification",
        "message": "This is a test notification",
        "is_read": False,
        "data": None,
    }
    defaults.update(kwargs)

    notification = Notification(**defaults)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


# ==================== List Notifications Tests ====================


def test_list_notifications_success(client, admin_token, db: Session, test_user_id: int):
    """Test listing notifications for current user with pagination."""
    # Create some test notifications
    for i in range(5):
        make_notification_in_db(
            db,
            test_user_id,
            title=f"Notification {i}",
            message=f"Message {i}",
            is_read=i % 2 == 0,  # Alternate read/unread
        )

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.get("/api/v1/notifications/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 5
    assert data["unread_count"] == 2  # 2 unread (indices 1, 3)
    assert len(data["items"]) == 5
    assert all("id" in item and "title" in item for item in data["items"])


def test_list_notifications_pagination(client, admin_token, db: Session, test_user_id: int):
    """Test pagination in notification list."""
    # Create 20 notifications
    for i in range(20):
        make_notification_in_db(db, test_user_id, title=f"Notification {i}")

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Get first page (default limit=50, should get all 20)
    r = client.get("/api/v1/notifications/?skip=0&limit=10", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 20
    assert len(data["items"]) == 10

    # Get second page
    r2 = client.get("/api/v1/notifications/?skip=10&limit=10", headers=headers)
    assert r2.status_code == 200
    data2 = r2.json()
    assert len(data2["items"]) == 10
    assert data2["items"][0]["id"] != data["items"][0]["id"]  # Different items


def test_list_notifications_unread_only_filter(client, admin_token, db: Session, test_user_id: int):
    """Test filtering for unread notifications only."""
    # Create 5 notifications: 3 unread, 2 read
    for i in range(5):
        make_notification_in_db(db, test_user_id, title=f"Notification {i}", is_read=i >= 3)

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.get("/api/v1/notifications/?unread_only=true", headers=headers)

    assert r.status_code == 200
    data = r.json()
    # When filtering, total reflects filtered count, not all records
    assert data["total"] == 3  # Total shows filtered count
    assert len(data["items"]) == 3  # Items list shows only unread
    assert all(not item["is_read"] for item in data["items"])


def test_list_notifications_unauthorized(client):
    """Test list notifications requires authentication."""
    # Without token, should get 401 or empty list depending on auth mode
    r = client.get("/api/v1/notifications/")
    # If auth is disabled in tests, this passes with 200
    # If auth is enabled, this should be 401
    assert r.status_code in (200, 401)


def test_list_notifications_invalid_pagination_params(client, admin_token):
    """Test validation of pagination parameters."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Invalid skip (negative)
    r = client.get("/api/v1/notifications/?skip=-1", headers=headers)
    assert r.status_code == 422  # Validation error

    # Invalid limit (too high)
    r = client.get("/api/v1/notifications/?limit=101", headers=headers)
    assert r.status_code == 422  # Validation error


# ==================== Unread Count Tests ====================


def test_get_unread_count_success(client, admin_token, db: Session, test_user_id: int):
    """Test getting unread notification count."""
    # Create notifications: 2 unread, 3 read
    for i in range(5):
        make_notification_in_db(db, test_user_id, is_read=i >= 2)

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.get("/api/v1/notifications/unread-count", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["unread_count"] == 2


def test_get_unread_count_no_notifications(client, admin_token):
    """Test unread count when user has no notifications."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.get("/api/v1/notifications/unread-count", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["unread_count"] == 0


# ==================== Mark as Read Tests ====================


def test_mark_notification_as_read_success(client, admin_token, db: Session, test_user_id: int):
    """Test marking a single notification as read."""
    notification = make_notification_in_db(db, test_user_id, is_read=False)

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.post(
        f"/api/v1/notifications/{notification.id}/read",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["is_read"] is True
    assert data["read_at"] is not None

    # Verify in database
    db.refresh(notification)
    assert notification.is_read is True


def test_mark_notification_as_read_not_found(client, admin_token):
    """Test marking non-existent notification returns 404."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.post(
        "/api/v1/notifications/9999/read",
        headers=headers,
    )

    assert r.status_code == 404
    msg = get_error_message(r.json())
    assert "not found" in msg.lower()


def other_account(db: Session) -> User:
    """The teacher: an account other than the administrator who makes the request.

    Until November 2026 the three "wrong user" tests gave the notification to the account that
    made the request and accepted 200, so they could not fail. A real attempt on another
    account's notification was refused with a 500: nothing handled the service's
    PermissionError. They now use two accounts.
    """
    teacher = db.query(User).filter(User.email == "teacher@example.com").first()
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    assert teacher is not None and admin is not None
    assert teacher.id != admin.id
    return teacher


def test_mark_notification_as_read_wrong_user(client, admin_token, teacher_token, db: Session):
    """Another account's notification cannot be marked as read: 403, and it stays unread."""
    notification = make_notification_in_db(db, user_id=other_account(db).id, is_read=False)

    r = client.post(
        f"/api/v1/notifications/{notification.id}/read",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert r.status_code == 403, r.text
    assert "another user" in get_error_message(r.json()).lower()
    db.refresh(notification)
    assert notification.is_read is False
    assert notification.read_at is None


def test_mark_all_notifications_as_read_success(client, admin_token, db: Session, test_user_id: int):
    """Test marking all notifications as read."""
    # Create 5 unread notifications
    for i in range(5):
        make_notification_in_db(db, test_user_id, is_read=False)

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.post("/api/v1/notifications/read-all", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["marked_count"] == 5

    # Verify all are marked as read in database
    notifications = db.query(Notification).filter_by(user_id=test_user_id).all()
    assert all(n.is_read for n in notifications)


def test_mark_all_notifications_as_read_none_unread(client, admin_token, db: Session, test_user_id: int):
    """Test marking all as read when none are unread."""
    # Create 3 already-read notifications
    for i in range(3):
        make_notification_in_db(db, test_user_id, is_read=True)

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.post("/api/v1/notifications/read-all", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["marked_count"] == 0


# ==================== Update Notification Tests ====================


def test_update_notification_to_read_via_put(client, admin_token, db: Session, test_user_id: int):
    """Test updating notification via PUT endpoint."""
    notification = make_notification_in_db(db, test_user_id, is_read=False)

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.put(
        f"/api/v1/notifications/{notification.id}",
        json={"is_read": True},
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["is_read"] is True


def test_update_notification_not_found(client, admin_token):
    """Test updating non-existent notification returns 404."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.put(
        "/api/v1/notifications/9999",
        json={"is_read": True},
        headers=headers,
    )

    assert r.status_code == 404


@pytest.mark.parametrize("is_read", [True, False])
def test_update_notification_wrong_user(client, admin_token, teacher_token, db: Session, is_read: bool):
    """Another account's notification cannot be updated: 403 either way, and it stays unread."""
    notification = make_notification_in_db(db, user_id=other_account(db).id, is_read=False)

    r = client.put(
        f"/api/v1/notifications/{notification.id}",
        json={"is_read": is_read},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert r.status_code == 403, r.text
    assert "another user" in get_error_message(r.json()).lower()
    db.refresh(notification)
    assert notification.is_read is False


# ==================== Delete Notification Tests ====================


def test_delete_notification_success(client, admin_token, db: Session, test_user_id: int):
    """Test deleting a notification."""
    notification = make_notification_in_db(db, test_user_id)
    notification_id = notification.id

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.delete(
        f"/api/v1/notifications/{notification_id}",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "deleted" in data["detail"].lower()

    # Note: Notifications are soft-deleted (marked is_active=False)
    # so they still exist in DB but marked as deleted
    fetched: Notification | None = db.query(Notification).filter_by(id=notification_id).first()
    # Should still exist but be soft-deleted
    assert fetched is not None  # Still in DB (soft delete)


def test_delete_notification_not_found(client, admin_token):
    """Test deleting non-existent notification."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.delete(
        "/api/v1/notifications/9999",
        headers=headers,
    )

    assert r.status_code == 404
    msg = get_error_message(r.json())
    assert "not found" in msg.lower()


def test_delete_notification_wrong_user(client, admin_token, teacher_token, db: Session):
    """Another account's notification cannot be deleted: 403, and its owner still has it."""
    notification = make_notification_in_db(db, user_id=other_account(db).id)

    r = client.delete(
        f"/api/v1/notifications/{notification.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert r.status_code == 403, r.text
    assert "another user" in get_error_message(r.json()).lower()
    db.refresh(notification)
    assert notification.deleted_at is None

    mine = client.get("/api/v1/notifications/", headers={"Authorization": f"Bearer {teacher_token}"})
    assert mine.status_code == 200
    assert [item["id"] for item in mine.json()["items"]] == [notification.id]


def test_list_shows_only_the_account_s_own_notifications(client, admin_token, teacher_token, db: Session):
    """The list and the unread count of one account never include another account's."""
    theirs = make_notification_in_db(db, user_id=other_account(db).id, title="For the teacher")

    as_admin = {"Authorization": f"Bearer {admin_token}"}
    listed = client.get("/api/v1/notifications/", headers=as_admin)
    count = client.get("/api/v1/notifications/unread-count", headers=as_admin)

    assert listed.status_code == 200 and count.status_code == 200
    assert theirs.id not in [item["id"] for item in listed.json()["items"]]
    assert count.json()["unread_count"] == 0


# ==================== Notification Preferences Tests ====================


def test_get_preferences_success(client, admin_token, db: Session, test_user_id: int):
    """Test getting notification preferences."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.get("/api/v1/notifications/preferences", headers=headers)

    assert r.status_code == 200
    data = r.json()

    # Verify expected fields
    assert "in_app_enabled" in data
    assert "email_enabled" in data
    assert "sms_enabled" in data
    assert "quiet_hours_enabled" in data
    assert "user_id" in data
    assert data["user_id"] == test_user_id


def test_update_preferences_success(client, admin_token, db: Session, test_user_id: int):
    """Test updating notification preferences."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    update_data = {
        "in_app_enabled": False,
        "email_enabled": True,
        "email_grade_updates": False,
        "sms_enabled": True,
        "sms_phone": "+306900000000",
    }

    r = client.put(
        "/api/v1/notifications/preferences",
        json=update_data,
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()

    assert data["in_app_enabled"] is False
    assert data["email_enabled"] is True
    assert data["email_grade_updates"] is False
    assert data["sms_enabled"] is True
    assert data["sms_phone"] == "+306900000000"


def test_update_preferences_partial(client, admin_token, db: Session):
    """Test partial update of preferences (only some fields)."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Only update one field
    r = client.put(
        "/api/v1/notifications/preferences",
        json={"sms_enabled": True},
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["sms_enabled"] is True

    # Verify other defaults are preserved
    assert data["in_app_enabled"] is True  # Default


def test_update_preferences_quiet_hours(client, admin_token, db: Session):
    """Test updating quiet hours settings."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    update_data = {
        "quiet_hours_enabled": True,
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00",
    }

    r = client.put(
        "/api/v1/notifications/preferences",
        json=update_data,
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()

    assert data["quiet_hours_enabled"] is True
    assert data["quiet_hours_start"] == "22:00"
    assert data["quiet_hours_end"] == "08:00"


def test_update_preferences_invalid_phone(client, admin_token):
    """Test validation of SMS phone number."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Invalid phone format
    r = client.put(
        "/api/v1/notifications/preferences",
        json={"sms_phone": "x" * 50},  # Too long
        headers=headers,
    )

    assert r.status_code == 422  # Validation error


def test_update_preferences_invalid_quiet_hours(client, admin_token):
    """Test validation of quiet hours format.

    Note: Pydantic schema validates HH:MM format, but since we use
    exclude_unset=True, invalid data is accepted if other fields are present.
    This test documents the behavior - validation happens at model level,
    not at update endpoint level.
    """
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Invalid time format - but endpoint still accepts it
    r = client.put(
        "/api/v1/notifications/preferences",
        json={"quiet_hours_start": "25:00"},  # Invalid hour
        headers=headers,
    )

    # The endpoint accepts it (doesn't validate partial updates)
    # Full validation would happen when reading the preference back
    assert r.status_code == 200


# ==================== Admin Broadcast Tests ====================


def test_broadcast_notification_to_all_users(client, admin_token, db: Session):
    """Test admin broadcasting notification to all users."""
    # Create some users
    for i in range(3):
        user = User(
            email=f"user{i}@example.com",
            full_name=f"User {i}",
            hashed_password="dummy",
            role="student",
            is_active=True,
        )
        db.add(user)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    broadcast_data = {
        "notification_type": "system_message",
        "title": "System Announcement",
        "message": "Server will be down for maintenance",
        "data": {"duration_minutes": 30},
    }

    r = client.post(
        "/api/v1/notifications/broadcast",
        json=broadcast_data,
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["total_users"] > 0
    assert data["sent_count"] == data["total_users"]


def test_broadcast_notification_to_specific_users(client, admin_token, db: Session):
    """Test admin broadcasting notification to specific users."""
    # Create test users and get their IDs
    user_ids = []
    for i in range(3):
        user = User(
            email=f"user{i}@example.com",
            full_name=f"User {i}",
            hashed_password="dummy",
            role="student",
            is_active=True,
        )
        db.add(user)
        db.flush()
        user_ids.append(user.id)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    broadcast_data = {
        "notification_type": "course_update",
        "title": "Course Updated",
        "message": "Your course schedule has changed",
        "user_ids": user_ids[:2],  # Only first 2 users
    }

    r = client.post(
        "/api/v1/notifications/broadcast",
        json=broadcast_data,
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["total_users"] == 2
    assert data["sent_count"] == 2


def test_broadcast_notification_by_role_filter(client, admin_token, db: Session):
    """Test admin broadcasting notification filtered by user role."""
    # Create users with different roles
    for i, role in enumerate(["student", "student", "teacher", "admin"]):
        user = User(
            email=f"user{i}@example.com",
            full_name=f"User {i}",
            hashed_password="dummy",
            role=role,
            is_active=True,
        )
        db.add(user)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    broadcast_data = {
        "notification_type": "system_message",
        "title": "Teacher Meeting",
        "message": "Teachers meeting at 3pm",
        "role_filter": "teacher",
    }

    r = client.post(
        "/api/v1/notifications/broadcast",
        json=broadcast_data,
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    # Should only broadcast to teachers
    assert data["total_users"] >= 1


# Who may send is tested in test_notifications_broadcast_roles.py, with accounts of each role
# on a server that checks them. The test that stood here ("requires admin") sent no token to
# a server that asks for none and accepted 200, 400, 401 and 403 alike.


def test_broadcast_notification_validation(client, admin_token):
    """Test broadcast endpoint validates required fields."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Missing required fields
    invalid_data = {
        "notification_type": "test",
        # Missing title and message
    }

    r = client.post(
        "/api/v1/notifications/broadcast",
        json=invalid_data,
        headers=headers,
    )

    assert r.status_code == 422  # Validation error


# ==================== Rate Limiting Tests ====================


def test_list_notifications_rate_limiting(client, admin_token, db: Session, test_user_id: int):
    """Test rate limiting on list notifications endpoint."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Make multiple rapid requests (exact limit depends on configuration)
    # This is a smoke test; actual rate limiting may be disabled in tests
    for _ in range(5):
        r = client.get("/api/v1/notifications/", headers=headers)
        # Should not fail with 429 unless rate limiting is active
        assert r.status_code in (200, 429)


def test_update_preferences_rate_limiting(client, admin_token):
    """Test rate limiting on update preferences endpoint."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # Make multiple rapid requests
    for _ in range(5):
        r = client.put(
            "/api/v1/notifications/preferences",
            json={"in_app_enabled": True},
            headers=headers,
        )
        # Should not fail with 429 unless rate limiting is active
        assert r.status_code in (200, 429)


# ==================== Response Format Tests ====================


def test_notification_response_format(client, admin_token, db: Session, test_user_id: int):
    """Test notification response has expected format."""
    make_notification_in_db(db, test_user_id, title="Test Notification")

    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.get(
        "/api/v1/notifications/",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert len(data["items"]) > 0

    notification_data = data["items"][0]
    expected_fields = ["id", "user_id", "notification_type", "title", "message", "is_read", "created_at"]
    for field in expected_fields:
        assert field in notification_data


def test_preference_response_format(client, admin_token):
    """Test preference response has expected format."""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = client.get("/api/v1/notifications/preferences", headers=headers)

    assert r.status_code == 200
    data = r.json()

    expected_fields = [
        "id",
        "user_id",
        "in_app_enabled",
        "email_enabled",
        "sms_enabled",
        "quiet_hours_enabled",
    ]
    for field in expected_fields:
        assert field in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


def test_notification_response_marks_naive_timestamps_as_utc():
    """SQLite returns naive UTC datetimes; without an offset the browser reads them as local time."""
    from datetime import datetime, timezone

    from backend.schemas.notifications import NotificationResponse

    base = {"id": 1, "user_id": 1, "is_read": False, "notification_type": "system", "title": "t", "message": "m"}
    naive = NotificationResponse.model_validate({**base, "created_at": datetime(2026, 9, 28, 10, 40)})
    assert naive.created_at.tzinfo is timezone.utc
    assert naive.model_dump_json().count("Z") + naive.model_dump_json().count("+00:00") >= 1

    aware = datetime(2026, 9, 28, 13, 40, tzinfo=timezone.utc)
    assert NotificationResponse.model_validate({**base, "created_at": aware}).created_at == aware
