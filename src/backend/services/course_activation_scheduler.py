"""
Course activation scheduler service for automatic is_active updates.

Uses APScheduler to periodically re-derive course activation status from enrollments
(a course is active while it has students with an active enrollment).
"""

from __future__ import annotations

import logging
from datetime import timezone
from typing import Optional, Any, cast, TYPE_CHECKING

if TYPE_CHECKING:
    from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore[import-not-found]
    from apscheduler.triggers.cron import CronTrigger  # type: ignore[import-not-found]

try:
    from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore[import-not-found]
    from apscheduler.triggers.cron import CronTrigger  # type: ignore[import-not-found]

    APSCHEDULER_AVAILABLE = True
except ImportError:  # pragma: no cover - optional dependency
    BackgroundScheduler = None  # type: ignore[assignment]
    CronTrigger = None  # type: ignore[assignment]
    APSCHEDULER_AVAILABLE = False


from backend.db import SessionLocal
from backend.services.course_activation import sync_course_activation

logger = logging.getLogger(__name__)


class CourseActivationScheduler:
    """Service for managing automatic course activation updates."""

    def __init__(self) -> None:
        self.scheduler: Optional[Any] = None
        if APSCHEDULER_AVAILABLE:
            self.scheduler = cast(Any, BackgroundScheduler)(timezone=timezone.utc)

    def is_available(self) -> bool:
        """Check if scheduler is available."""
        return APSCHEDULER_AVAILABLE and self.scheduler is not None

    def start(self) -> None:
        """Start the scheduler."""
        if not self.is_available():
            logger.warning("APScheduler not available. Course activation scheduler disabled.")
            return

        scheduler = self.scheduler
        if scheduler and not scheduler.running:
            scheduler.start()
            logger.info("Course activation scheduler started")

    def stop(self) -> None:
        """Stop the scheduler."""
        scheduler = self.scheduler
        if self.is_available() and scheduler and scheduler.running:
            scheduler.shutdown()
            logger.info("Course activation scheduler stopped")

    def schedule_daily_update(self) -> None:
        """Schedule daily course activation updates at 3:00 AM UTC."""
        if not self.is_available():
            logger.warning("Cannot schedule course activation updates: APScheduler not available")
            return

        if not CronTrigger:
            logger.warning("CronTrigger not available, cannot schedule course activation updates")
            return

        job_id = "course_activation_daily_update"
        trigger = cast(Any, CronTrigger)(hour=3, minute=0, timezone=timezone.utc)

        scheduler = self.scheduler
        if scheduler:
            scheduler.add_job(
                self._run_bulk_update,
                trigger=trigger,
                id=job_id,
                name="Daily Course Activation Update",
                replace_existing=True,
            )
            logger.info("Scheduled daily course activation update at 3:00 AM UTC")

    @staticmethod
    def _run_bulk_update() -> None:
        """Background task: re-derive every course's is_active from its enrollments.

        The activation rule lives in services.course_activation and is applied
        inline whenever enrollments change; this nightly pass is a safety net
        for any path that missed it. (It used to guess activation from the
        semester name's dates, which misread program semesters such as
        "Β' Εξάμηνο" and completed enrollments of courses still being taught.)
        """
        db = SessionLocal()
        try:
            updated_count = sync_course_activation(db)
            if updated_count > 0:
                db.commit()
                logger.info(f"Course activation reconcile: {updated_count} courses updated")
            else:
                logger.info("Course activation reconcile: no courses needed updates")

        except Exception as e:
            logger.error(f"Failed to run bulk course activation update: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()


# Global singleton instance
_course_activation_scheduler_instance: Optional[CourseActivationScheduler] = None


def get_course_activation_scheduler() -> CourseActivationScheduler:
    """Get or create the global course activation scheduler instance."""
    global _course_activation_scheduler_instance
    if _course_activation_scheduler_instance is None:
        _course_activation_scheduler_instance = CourseActivationScheduler()
    return _course_activation_scheduler_instance
