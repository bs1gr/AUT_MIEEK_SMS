"""
Course activation scheduler service for automatic is_active updates.

Uses APScheduler to periodically update course activation status based on semester dates.
Ensures stored is_active values stay synchronized with current date for reporting consistency.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
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
from backend.models import Course, CourseEnrollment

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
        """Background task to bulk-update course activation status."""
        db = SessionLocal()
        try:
            # Import here to avoid circular imports
            from backend.routers.routers_courses import (
                _semester_date_range,
            )

            # Get all non-deleted courses with semester strings
            deleted_at = cast(Any, Course.deleted_at)
            courses = db.query(Course).filter(deleted_at.is_(None), Course.semester.isnot(None)).all()

            updated_count = 0
            activated_count = 0
            deactivated_count = 0
            enrollment_updated = 0
            inactive_course_ids: list[int] = []

            for course in courses:
                semester = str(course.semester or "")
                if not semester:
                    continue

                # Compute auto-activation status
                today = datetime.now(timezone.utc).date()
                date_range = _semester_date_range(semester, today)
                if not date_range:
                    continue

                start_date, end_date = date_range

                should_be_active = start_date <= today <= end_date
                current_is_active = bool(course.is_active) if course.is_active is not None else True

                # Only update if status changed
                if should_be_active != current_is_active:
                    old_status = current_is_active
                    course.is_active = should_be_active  # type: ignore[assignment]
                    updated_count += 1

                    if should_be_active:
                        activated_count += 1
                    else:
                        deactivated_count += 1

                    logger.info(
                        f"Course {course.id} ({course.course_code}): "
                        f"auto-updated is_active from {old_status} to {should_be_active} "
                        f"(semester: {semester})"
                    )

                if not should_be_active:
                    inactive_course_ids.append(int(course.id))

            if inactive_course_ids:
                deleted_at_enrollment = cast(Any, CourseEnrollment.deleted_at)
                enrollment_updated = (
                    db.query(CourseEnrollment)
                    .filter(
                        CourseEnrollment.course_id.in_(inactive_course_ids),
                        deleted_at_enrollment.is_(None),
                        CourseEnrollment.status == "active",
                    )
                    .update({"status": "completed"}, synchronize_session=False)
                )

            if updated_count > 0 or enrollment_updated > 0:
                db.commit()
                logger.info(
                    f"Bulk course activation update complete: "
                    f"{updated_count} courses updated "
                    f"({activated_count} activated, {deactivated_count} deactivated)"
                )
                if enrollment_updated > 0:
                    logger.info(
                        f"Enrollment status cleanup complete: {enrollment_updated} enrollments set to completed"
                    )
            else:
                logger.info("Bulk course activation update: No courses needed updates")

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
