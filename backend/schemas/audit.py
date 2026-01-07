"""
Audit logging schemas for tracking system actions.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class AuditAction(str, Enum):
    """Types of auditable actions."""

    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"  # pragma: allowlist secret

    # Data Operations
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    BULK_IMPORT = "bulk_import"
    BULK_EXPORT = "bulk_export"

    # Admin Operations
    ROLE_CHANGE = "role_change"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"

    # System Operations
    BACKUP_CREATE = "backup_create"
    BACKUP_RESTORE = "backup_restore"
    CONFIG_CHANGE = "config_change"


class AuditResource(str, Enum):
    """Resource types for audit logging."""

    USER = "user"
    STUDENT = "student"
    COURSE = "course"
    GRADE = "grade"
    ATTENDANCE = "attendance"
    ENROLLMENT = "enrollment"
    PERFORMANCE = "performance"
    HIGHLIGHT = "highlight"
    REPORT = "report"
    SESSION = "session"
    SYSTEM = "system"


class AuditLogCreate(BaseModel):
    """Schema for creating audit log entry."""

    action: AuditAction = Field(..., description="Action performed")
    resource: AuditResource = Field(..., description="Resource affected")
    resource_id: Optional[str] = Field(None, description="ID of affected resource")
    user_id: Optional[int] = Field(None, description="User who performed action")
    user_email: Optional[str] = Field(None, description="Email of user")
    ip_address: Optional[str] = Field(None, description="IP address of request")
    user_agent: Optional[str] = Field(None, description="User agent string")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    success: bool = Field(True, description="Whether action succeeded")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class AuditLogResponse(BaseModel):
    """Audit log entry response."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Audit log ID")
    action: AuditAction = Field(..., description="Action performed")
    resource: AuditResource = Field(..., description="Resource affected")
    resource_id: Optional[str] = Field(None, description="ID of affected resource")
    user_id: Optional[int] = Field(None, description="User who performed action")
    user_email: Optional[str] = Field(None, description="Email of user")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    success: bool = Field(..., description="Whether action succeeded")
    error_message: Optional[str] = Field(None, description="Error if failed")
    timestamp: datetime = Field(..., description="When action occurred")


class AuditLogListResponse(BaseModel):
    """List of audit logs with pagination."""

    logs: list[AuditLogResponse] = Field(..., description="Audit log entries")
    total: int = Field(..., description="Total number of logs")
    skip: int = Field(..., description="Number of logs skipped")
    limit: int = Field(..., description="Max items returned")
