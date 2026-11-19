"""Removal of notifications their reader deleted.

"Delete" in the bell marks a notification (``deleted_at``) and every list leaves it out from
then on; nothing removed the row, so the table only grew. A marked row is removed once it has
been marked for ``KEEP_DELETED_DAYS``: long enough to look into a complaint about a message,
and no answer of the application changes, because no page shows a marked row.

Unread and read notifications are not touched: how long those are kept is not decided.
It runs at startup and in the daily maintenance job, never inside a request.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.models import Notification

logger = logging.getLogger(__name__)

KEEP_DELETED_DAYS = 30


def purge_deleted_notifications(db: Session, now: Optional[datetime] = None) -> int:
    """Delete notifications marked as deleted more than KEEP_DELETED_DAYS ago and commit."""
    moment = now or datetime.now(timezone.utc)
    cutoff = moment - timedelta(days=KEEP_DELETED_DAYS)
    result: Any = db.execute(
        delete(Notification).where(Notification.deleted_at.is_not(None), Notification.deleted_at < cutoff)
    )
    db.commit()
    return int(result.rowcount or 0)


def purge_deleted_notifications_in_own_session(session_factory: Callable[[], Any]) -> int:
    """Run the purge in a session of its own. Never raises; returns 0 when it could not run."""
    db = session_factory()
    try:
        removed = purge_deleted_notifications(db)
        if removed:
            logger.info("Removed %d notifications deleted more than %d days ago", removed, KEEP_DELETED_DAYS)
        return removed
    except Exception:
        db.rollback()
        logger.warning("Could not remove deleted notifications", exc_info=True)
        return 0
    finally:
        db.close()
