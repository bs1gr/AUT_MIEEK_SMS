"""
Notification service - Core business logic for creating, managing, and querying notifications.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Any

from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session

from backend.models import Notification, NotificationPreference, User

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications."""

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[dict[str, Any]] = None,
    ) -> Notification:
        """Create a new notification for a user.

        Args:
            db: Database session
            user_id: ID of user receiving notification
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional context data

        Returns:
            Created Notification object

        Raises:
            ValueError: If user not found
        """
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        logger.info(f"Created notification {notification.id} for user {user_id}")

        return notification

    @staticmethod
    def get_notifications(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int]:
        """Get notifications for a user.

        Args:
            db: Database session
            user_id: ID of user
            skip: Number of records to skip
            limit: Maximum records to return
            unread_only: If True, return only unread notifications

        Returns:
            Tuple of (notifications list, total count)
        """
        query = db.query(Notification).filter(and_(Notification.user_id == user_id, Notification.deleted_at.is_(None)))

        if unread_only:
            query = query.filter(~Notification.is_read)

        total = query.count()
        notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

        return notifications, total

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
        """Mark a notification as read.

        Args:
            db: Database session
            notification_id: ID of notification
            user_id: ID of user (for authorization)

        Returns:
            Updated Notification or None if not found

        Raises:
            PermissionError: If user doesn't own the notification
        """
        notification = db.query(Notification).filter(Notification.id == notification_id).first()

        if not notification:
            return None

        if notification.user_id != user_id:
            raise PermissionError("Cannot update notification belonging to another user")

        notification.is_read = True  # type: ignore[assignment]
        notification.read_at = datetime.now(timezone.utc)  # type: ignore[assignment]

        db.commit()
        db.refresh(notification)

        logger.info(f"Marked notification {notification_id} as read")

        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        """Mark all notifications as read for a user.

        Args:
            db: Database session
            user_id: ID of user

        Returns:
            Number of notifications marked as read
        """
        count = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.user_id == user_id,
                    ~Notification.is_read,
                    Notification.deleted_at.is_(None),
                )
            )
            .update(
                {Notification.is_read: True, Notification.read_at: datetime.now(timezone.utc)},
                synchronize_session=False,
            )
        )

        db.commit()

        logger.info(f"Marked {count} notifications as read for user {user_id}")

        return count

    @staticmethod
    def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
        """Soft-delete a notification.

        Args:
            db: Database session
            notification_id: ID of notification
            user_id: ID of user (for authorization)

        Returns:
            True if deleted, False if not found

        Raises:
            PermissionError: If user doesn't own the notification
        """
        notification = db.query(Notification).filter(Notification.id == notification_id).first()

        if not notification:
            return False

        if notification.user_id != user_id:
            raise PermissionError("Cannot delete notification belonging to another user")

        notification.deleted_at = datetime.now(timezone.utc)  # type: ignore[assignment]
        db.commit()

        logger.info(f"Deleted notification {notification_id}")

        return True

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get count of unread notifications for a user.

        Args:
            db: Database session
            user_id: ID of user

        Returns:
            Number of unread notifications
        """
        return (
            db.query(func.count(Notification.id))
            .filter(
                and_(
                    Notification.user_id == user_id,
                    ~Notification.is_read,
                    Notification.deleted_at.is_(None),
                )
            )
            .scalar()
        )


class NotificationPreferenceService:
    """Service for managing notification preferences."""

    @staticmethod
    def get_or_create_preferences(db: Session, user_id: int) -> NotificationPreference:
        """Get or create notification preferences for a user.

        Args:
            db: Database session
            user_id: ID of user

        Returns:
            NotificationPreference object
        """
        prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()

        if not prefs:
            # Create default preferences
            prefs = NotificationPreference(user_id=user_id)
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
            logger.info(f"Created default notification preferences for user {user_id}")

        return prefs

    @staticmethod
    def update_preferences(db: Session, user_id: int, updates: dict[str, Any]) -> NotificationPreference:
        """Update notification preferences for a user.

        Args:
            db: Database session
            user_id: ID of user
            updates: Dictionary of preference updates

        Returns:
            Updated NotificationPreference object
        """
        prefs = NotificationPreferenceService.get_or_create_preferences(db, user_id)

        for key, value in updates.items():
            if hasattr(prefs, key):
                setattr(prefs, key, value)

        prefs.updated_at = datetime.now(timezone.utc)  # type: ignore[assignment]
        db.commit()
        db.refresh(prefs)

        logger.info(f"Updated notification preferences for user {user_id}")

        return prefs

    @staticmethod
    def should_notify(db: Session, user_id: int, notification_type: str, delivery_method: str) -> bool:
        """Check if a user should receive a notification.

        Args:
            db: Database session
            user_id: ID of user
            notification_type: Type of notification (grade_update, attendance_change, etc.)
            delivery_method: Delivery method (in_app, email, sms)

        Returns:
            True if notification should be sent, False otherwise
        """
        prefs = NotificationPreferenceService.get_or_create_preferences(db, user_id)

        # Check if delivery method is enabled
        if delivery_method == "in_app":
            if not prefs.in_app_enabled:
                return False
            # Check specific notification type preference
            type_field = f"in_app_{notification_type}"
            if hasattr(prefs, type_field):
                return getattr(prefs, type_field)
            return True

        elif delivery_method == "email":
            if not prefs.email_enabled:
                return False
            # Check specific notification type preference
            type_field = f"email_{notification_type}"
            if hasattr(prefs, type_field):
                return getattr(prefs, type_field)
            return True

        elif delivery_method == "sms":
            if not prefs.sms_enabled or not prefs.sms_phone:
                return False
            # Check specific notification type preference
            type_field = f"sms_{notification_type}"
            if hasattr(prefs, type_field):
                return getattr(prefs, type_field)
            return True

        return False
