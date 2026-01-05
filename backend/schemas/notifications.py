"""
Notification schemas for Pydantic validation and API responses.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class NotificationBase(BaseModel):
    """Base notification schema."""

    notification_type: str = Field(
        ..., min_length=1, max_length=50, description="Type of notification (grade_update, attendance_change, etc.)"
    )
    title: str = Field(..., min_length=1, max_length=255, description="Notification title")
    message: str = Field(..., min_length=1, description="Notification message")
    data: Optional[dict[str, Any]] = Field(None, description="Additional context data")


class NotificationCreate(NotificationBase):
    """Create notification schema."""

    user_id: int = Field(..., gt=0, description="ID of user receiving notification")


class NotificationUpdate(BaseModel):
    """Update notification schema (mark as read)."""

    is_read: bool = Field(..., description="Whether notification has been read")


class NotificationResponse(NotificationBase):
    """Notification response schema."""

    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NotificationPreferenceBase(BaseModel):
    """Base notification preference schema."""

    # In-app notifications
    in_app_enabled: bool = Field(default=True)
    in_app_grade_updates: bool = Field(default=True)
    in_app_attendance: bool = Field(default=True)
    in_app_course_updates: bool = Field(default=True)
    in_app_system_messages: bool = Field(default=True)

    # Email notifications
    email_enabled: bool = Field(default=True)
    email_grade_updates: bool = Field(default=True)
    email_attendance: bool = Field(default=False)
    email_course_updates: bool = Field(default=True)
    email_system_messages: bool = Field(default=False)

    # SMS notifications
    sms_enabled: bool = Field(default=False)
    sms_phone: Optional[str] = Field(None, max_length=20)
    sms_grade_updates: bool = Field(default=False)
    sms_attendance: bool = Field(default=False)

    # Quiet hours
    quiet_hours_enabled: bool = Field(default=False)
    quiet_hours_start: Optional[str] = Field(None, pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern=r"^[0-2][0-9]:[0-5][0-9]$")


class NotificationPreferenceCreate(NotificationPreferenceBase):
    """Create notification preference schema."""

    pass


class NotificationPreferenceUpdate(BaseModel):
    """Update notification preference schema (partial update)."""

    in_app_enabled: Optional[bool] = None
    in_app_grade_updates: Optional[bool] = None
    in_app_attendance: Optional[bool] = None
    in_app_course_updates: Optional[bool] = None
    in_app_system_messages: Optional[bool] = None

    email_enabled: Optional[bool] = None
    email_grade_updates: Optional[bool] = None
    email_attendance: Optional[bool] = None
    email_course_updates: Optional[bool] = None
    email_system_messages: Optional[bool] = None

    sms_enabled: Optional[bool] = None
    sms_phone: Optional[str] = Field(None, max_length=20)
    sms_grade_updates: Optional[bool] = None
    sms_attendance: Optional[bool] = None

    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = Field(None, pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern=r"^[0-2][0-9]:[0-5][0-9]$")


class NotificationPreferenceResponse(NotificationPreferenceBase):
    """Notification preference response schema."""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """List notifications response with pagination."""

    total: int = Field(..., ge=0, description="Total number of notifications")
    unread_count: int = Field(..., ge=0, description="Number of unread notifications")
    items: list[NotificationResponse] = Field(default_factory=list)


class BroadcastNotificationCreate(BaseModel):
    """Create and broadcast notification to multiple users."""

    notification_type: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    data: Optional[dict[str, Any]] = None
    user_ids: Optional[list[int]] = Field(None, description="Specific users to notify; if None, broadcast to all")
    role_filter: Optional[str] = Field(None, description="Filter by role (admin, teacher, student)")
