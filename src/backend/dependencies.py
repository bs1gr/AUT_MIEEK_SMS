"""FastAPI dependency providers shared across routers.

get_db and get_notification_service are the only symbols here with live
callers (routers_dashboards, routers_custom_reports, routers_search,
routers_notifications, and tests/conftest.py). Everything else that used to
live in this file (a StudentManagementException hierarchy, ValidationMixin,
validate_string/email/grade/percentage, create_error_response,
log_api_call/log_database_operation, db_session_context/with_db_session,
paginate_query, and a standalone setup_logging()/logger pair) had zero
callers anywhere in the codebase and was removed — see the workspace audit
in docs/plans/UNIFIED_WORK_PLAN.md (2026-09) for how that was verified.
"""

from typing import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from backend.db import SessionLocal, get_session
from backend.services.notification_service import NotificationService


def get_db() -> Generator[Session, None, None]:
    """Yield a database session (compatibility shim)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_notification_service(db: Session = Depends(get_session)) -> NotificationService:
    return NotificationService(db)
