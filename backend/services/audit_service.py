"""Audit logging service for tracking system actions."""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.orm import Session
from fastapi import Request

from backend.models import AuditLog
from backend.schemas.audit import AuditAction, AuditResource


class AuditLogger:
    """Service for logging audit events to the database."""

    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        action: AuditAction,
        resource: AuditResource,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        Log an audit event.

        Args:
            action: The action being performed
            resource: The type of resource being acted upon
            resource_id: ID of the specific resource (if applicable)
            user_id: ID of the user performing the action
            user_email: Email of the user performing the action
            ip_address: IP address of the client
            user_agent: User agent string of the client
            details: Additional contextual information (stored as JSON)
            success: Whether the action succeeded
            error_message: Error message if action failed

        Returns:
            The created AuditLog instance
        """
        audit_log = AuditLog(
            action=action.value,
            resource=resource.value,
            resource_id=resource_id,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            success=success,
            error_message=error_message,
            timestamp=datetime.now(timezone.utc),
        )

        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)

        return audit_log

    def log_from_request(
        self,
        request: Request,
        action: AuditAction,
        resource: AuditResource,
        resource_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        Log an audit event, extracting user/client info from the request.

        Args:
            request: FastAPI Request object
            action: The action being performed
            resource: The type of resource being acted upon
            resource_id: ID of the specific resource (if applicable)
            details: Additional contextual information
            success: Whether the action succeeded
            error_message: Error message if action failed

        Returns:
            The created AuditLog instance
        """
        # Extract user info from request state (set by auth middleware)
        current_user = getattr(request.state, "current_user", None)
        user_id = current_user.id if current_user else None
        user_email = current_user.email if current_user else None

        # Extract client info
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent")

        return self.log_action(
            action=action,
            resource=resource,
            resource_id=resource_id,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            success=success,
            error_message=error_message,
        )

    @staticmethod
    def _get_client_ip(request: Request) -> Optional[str]:
        """Extract client IP address from request, handling proxies."""
        # Check X-Forwarded-For header first (for proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()

        # Check X-Real-IP header (for Nginx proxies)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return None


def get_audit_logger(db: Session) -> AuditLogger:
    """Dependency for getting an audit logger instance."""
    return AuditLogger(db)
