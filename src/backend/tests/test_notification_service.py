"""Unit tests for NotificationService: create, read, delete, list and count."""

import pytest
from sqlalchemy.orm import Session

from backend.models import User
from backend.services.notification_service import NotificationService


class TestNotificationService:
    """Test suite for NotificationService"""

    @pytest.fixture
    def notification_service(self, db: Session):
        """Create notification service with database session"""
        return NotificationService(db)

    @pytest.fixture
    def test_user(self, db: Session):
        """Create a test user"""
        user = User(
            email="test@example.com",
            full_name="Test User",
            hashed_password="hashed_password",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def test_create_notification(self, notification_service, test_user, db: Session):
        """Test creating a notification"""
        notification = notification_service.create_notification(
            user_id=test_user.id,
            title="Test Notification",
            message="This is a test notification",
            notification_type="test",
        )

        assert notification.id is not None
        assert notification.user_id == test_user.id
        assert notification.title == "Test Notification"
        assert not notification.is_read

    def test_create_notification_invalid_user(self, notification_service):
        """Test creating notification for non-existent user"""
        with pytest.raises(ValueError):
            notification_service.create_notification(
                user_id=9999, title="Test", message="Test body", notification_type="test"
            )

    def test_mark_as_read(self, notification_service, test_user, db: Session):
        """Test marking notification as read"""
        # Create notification
        notification = notification_service.create_notification(
            user_id=test_user.id, title="Test", message="Test body", notification_type="test"
        )

        # Mark as read
        updated = notification_service.mark_as_read(notification_id=notification.id, user_id=test_user.id)

        assert updated.is_read
        assert updated.read_at is not None

    def test_delete_notification(self, notification_service, test_user, db: Session):
        """Test soft-deleting a notification"""
        notification = notification_service.create_notification(
            user_id=test_user.id, title="Test", message="Test body", notification_type="test"
        )

        success = notification_service.delete_notification(notification_id=notification.id, user_id=test_user.id)

        assert success

    def test_get_user_notifications(self, notification_service, test_user, db: Session):
        """Test retrieving user notifications"""
        # Create multiple notifications
        for i in range(5):
            notification_service.create_notification(
                user_id=test_user.id,
                title=f"Notification {i}",
                message=f"Body {i}",
                notification_type="test",
            )

        notifications, total = notification_service.get_notifications(user_id=test_user.id, limit=10)

        assert total == 5
        assert len(notifications) == 5

    def test_get_unread_count(self, notification_service, test_user, db: Session):
        """Test getting unread notification count"""
        # Create notifications
        notif1 = notification_service.create_notification(
            user_id=test_user.id, title="Unread 1", message="Body", notification_type="test"
        )
        notification_service.create_notification(
            user_id=test_user.id, title="Unread 2", message="Body", notification_type="test"
        )

        # Mark one as read
        notification_service.mark_as_read(notification_id=notif1.id, user_id=test_user.id)

        unread_count = notification_service.get_unread_count(user_id=test_user.id)
        assert unread_count == 1
