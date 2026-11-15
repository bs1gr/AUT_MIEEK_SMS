"""Removal of refresh tokens that can never be used again.

Every login and every token refresh stores one row in ``refresh_tokens``, and a refresh
revokes the row it used. Nothing removed the old rows, so the table only grew: 835 rows with
one usable in the shared database in November 2026.

A row is dead when it is revoked or past its expiry. ``POST /auth/refresh`` answers 401 for
a revoked row, for an expired one and for a missing one alike, so removing dead rows changes
no answer. It runs at startup and in the daily maintenance job, never inside a request.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.models import RefreshToken

logger = logging.getLogger(__name__)


def purge_dead_refresh_tokens(db: Session, now: Optional[datetime] = None) -> int:
    """Delete revoked and expired refresh tokens and commit. Returns the number removed."""
    moment = now or datetime.now(timezone.utc)
    removed = (
        db.query(RefreshToken)
        .filter(or_(RefreshToken.revoked.is_(True), RefreshToken.expires_at < moment))
        .delete(synchronize_session=False)
    )
    db.commit()
    return int(removed or 0)


def purge_dead_refresh_tokens_in_own_session(session_factory: Callable[[], Any]) -> int:
    """Run the purge in a session of its own, for startup and scheduled jobs.

    Never raises: tidying a table must not stop a server from starting or break the job
    that runs beside it. Returns 0 when the purge could not run.
    """
    db = session_factory()
    try:
        removed = purge_dead_refresh_tokens(db)
        if removed:
            logger.info("Removed %d dead refresh tokens (revoked or expired)", removed)
        return removed
    except Exception:
        db.rollback()
        logger.warning("Could not remove dead refresh tokens", exc_info=True)
        return 0
    finally:
        db.close()
