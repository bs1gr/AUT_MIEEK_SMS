"""
Unit tests for WebSocket connection management and notifications

Tests:
- Connection manager operations (connect/disconnect)
- Notification service
- Real-time delivery
"""

import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from backend.websocket_config import ConnectionManager
from backend.services.notification_service import NotificationService
from backend.models import User


class TestConnectionManager:
    """Test suite for WebSocket ConnectionManager"""

    @pytest.fixture
    def connection_manager(self):
        """Create a fresh connection manager for each test"""
        return ConnectionManager()

    @pytest.mark.asyncio
    async def test_connect(self, connection_manager):
        """Test user connection"""
        await connection_manager.connect(user_id=1, session_id="session_1")

        assert connection_manager.is_user_online(1)
        assert connection_manager.get_user_connections(1) == 1
        assert connection_manager.get_connection_count() == 1

    @pytest.mark.asyncio
    async def test_multiple_connections_same_user(self, connection_manager):
        """Test multiple connections for same user (different tabs)"""
        await connection_manager.connect(user_id=1, session_id="session_1")
        await connection_manager.connect(user_id=1, session_id="session_2")

        assert connection_manager.is_user_online(1)
        assert connection_manager.get_user_connections(1) == 2
        assert connection_manager.get_connection_count() == 2

    @pytest.mark.asyncio
    async def test_disconnect(self, connection_manager):
        """Test user disconnection"""
        await connection_manager.connect(user_id=1, session_id="session_1")
        await connection_manager.disconnect(user_id=1, session_id="session_1")

        assert not connection_manager.is_user_online(1)
        assert connection_manager.get_user_connections(1) == 0
        assert connection_manager.get_connection_count() == 0

    @pytest.mark.asyncio
    async def test_disconnect_one_connection_of_many(self, connection_manager):
        """Test disconnecting one connection when user has multiple"""
        await connection_manager.connect(user_id=1, session_id="session_1")
        await connection_manager.connect(user_id=1, session_id="session_2")
        await connection_manager.disconnect(user_id=1, session_id="session_1")

        assert connection_manager.is_user_online(1)
        assert connection_manager.get_user_connections(1) == 1

    @pytest.mark.asyncio
    async def test_get_online_users(self, connection_manager):
        """Test getting list of online users"""
        await connection_manager.connect(user_id=1, session_id="session_1")
        await connection_manager.connect(user_id=2, session_id="session_2")
        await connection_manager.connect(user_id=1, session_id="session_3")

        online_users = connection_manager.get_online_users()
        assert len(online_users) == 2
        assert 1 in online_users
        assert 2 in online_users

    @pytest.mark.asyncio
    async def test_join_room(self, connection_manager):
        """Test user joining a room"""
        await connection_manager.join_room(user_id=1, room_name="course_123")
        await connection_manager.join_room(user_id=2, room_name="course_123")

        room_users = connection_manager.get_room_users("course_123")
        assert len(room_users) == 2
        assert 1 in room_users
        assert 2 in room_users

    @pytest.mark.asyncio
    async def test_leave_room(self, connection_manager):
        """Test user leaving a room"""
        await connection_manager.join_room(user_id=1, room_name="course_123")
        await connection_manager.leave_room(user_id=1, room_name="course_123")

        room_users = connection_manager.get_room_users("course_123")
        assert len(room_users) == 0

    @pytest.mark.asyncio
    async def test_heartbeat_update(self, connection_manager):
        """Test updating heartbeat for a session"""
        await connection_manager.connect(user_id=1, session_id="session_1")

        connection = connection_manager.session_map["session_1"]
        old_heartbeat = connection.last_heartbeat

        # Simulate time passing and update heartbeat
        connection_manager.update_heartbeat("session_1")
        new_heartbeat = connection.last_heartbeat

        assert new_heartbeat >= old_heartbeat

    @pytest.mark.asyncio
    async def test_get_stale_sessions(self, connection_manager):
        """Test detecting stale sessions"""
        await connection_manager.connect(user_id=1, session_id="session_1")

        # Manually set a stale heartbeat
        connection = connection_manager.session_map["session_1"]
        connection.last_heartbeat = datetime.now(timezone.utc) - timedelta(seconds=400)

        stale = connection_manager.get_stale_sessions(timeout_seconds=300)
        assert "session_1" in stale

    @pytest.mark.asyncio
    async def test_get_connection_stats(self, connection_manager):
        """Test getting connection statistics"""
        await connection_manager.connect(user_id=1, session_id="session_1")
        await connection_manager.connect(user_id=2, session_id="session_2")
        await connection_manager.join_room(user_id=1, room_name="room_1")

        stats = connection_manager.get_connection_stats()

        assert stats["total_connections"] == 2
        assert stats["online_users"] == 2
        assert stats["rooms"] >= 1
        assert "timestamp" in stats


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


@pytest.fixture(scope="session")
def pytest_configure(config):
    """Configure pytest with markers"""
    config.addinivalue_line("markers", "asyncio: mark test as async")
