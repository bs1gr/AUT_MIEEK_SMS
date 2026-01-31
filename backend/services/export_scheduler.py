"""
Export scheduler service for automated periodic exports.

Provides background job scheduling for automated data exports.
Uses APScheduler for reliable, persistent scheduling.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any, Callable
from enum import Enum

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ScheduleFrequency(str, Enum):
    """Export schedule frequency options."""

    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class ExportScheduler:
    """Service for managing scheduled exports.

    Handles creation, execution, and management of recurring export jobs.
    """

    def __init__(self):
        self.scheduler = None
        if APSCHEDULER_AVAILABLE:
            self.scheduler = BackgroundScheduler()

    def is_available(self) -> bool:
        """Check if scheduler is available."""
        return APSCHEDULER_AVAILABLE and self.scheduler is not None

    def start(self):
        """Start the scheduler."""
        if not self.is_available():
            logger.warning("APScheduler not available. Scheduled exports disabled.")
            return

        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Export scheduler started")

    def stop(self):
        """Stop the scheduler."""
        if self.is_available() and self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Export scheduler stopped")

    def schedule_export(
        self,
        db: Session,
        user_id: int,
        export_type: str,
        export_format: str,
        frequency: str,
        export_callback: Callable,
        filters: Optional[Dict[str, Any]] = None,
        cron_expression: Optional[str] = None,
    ) -> bool:
        """Schedule a recurring export.

        Args:
            db: Database session
            user_id: User ID for scheduling the export
            export_type: Type of export (students, courses, grades)
            export_format: Export format (excel, csv, pdf)
            frequency: Schedule frequency (hourly, daily, weekly, monthly, custom)
            export_callback: Callback function to execute the export
            filters: Optional filters to apply
            cron_expression: Custom cron expression for 'custom' frequency

        Returns:
            True if scheduled successfully, False otherwise
        """
        if not self.is_available():
            logger.error("Scheduler not available")
            return False

        try:
            job_id = f"export_{export_type}_{export_format}_{user_id}_{datetime.now().timestamp()}"

            # Determine trigger
            trigger = self._get_trigger(frequency, cron_expression)
            if not trigger:
                logger.error(f"Invalid frequency: {frequency}")
                return False

            # Schedule job
            self.scheduler.add_job(
                export_callback,
                trigger=trigger,
                id=job_id,
                args=[export_type, export_format, user_id, filters],
                name=f"Export {export_type} as {export_format}",
                replace_existing=False,
            )

            logger.info(f"Scheduled export job: {job_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to schedule export: {e}")
            return False

    def cancel_scheduled_export(self, job_id: str) -> bool:
        """Cancel a scheduled export job.

        Args:
            job_id: The job ID to cancel

        Returns:
            True if cancelled successfully, False otherwise
        """
        if not self.is_available():
            return False

        try:
            self.scheduler.remove_job(job_id)
            logger.info(f"Cancelled scheduled export: {job_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {e}")
            return False

    def list_scheduled_exports(self) -> list:
        """List all scheduled export jobs.

        Returns:
            List of scheduled job information dictionaries
        """
        if not self.is_available():
            return []

        jobs = []
        for job in self.scheduler.get_jobs():
            if job.id.startswith("export_"):
                jobs.append(
                    {
                        "id": job.id,
                        "name": job.name,
                        "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                        "trigger": str(job.trigger),
                    }
                )
        return jobs

    def _get_trigger(self, frequency: str, cron_expression: Optional[str] = None):
        """Get APScheduler trigger based on frequency.

        Args:
            frequency: Schedule frequency
            cron_expression: Custom cron expression for 'custom' frequency

        Returns:
            APScheduler trigger object or None
        """
        try:
            if frequency == ScheduleFrequency.HOURLY:
                return IntervalTrigger(hours=1)
            elif frequency == ScheduleFrequency.DAILY:
                return CronTrigger(hour=2, minute=0)  # Daily at 2 AM
            elif frequency == ScheduleFrequency.WEEKLY:
                return CronTrigger(day_of_week=0, hour=2, minute=0)  # Weekly on Monday at 2 AM
            elif frequency == ScheduleFrequency.MONTHLY:
                return CronTrigger(day=1, hour=2, minute=0)  # Monthly on 1st at 2 AM
            elif frequency == ScheduleFrequency.CUSTOM and cron_expression:
                # Parse cron expression
                parts = cron_expression.split()
                if len(parts) >= 5:
                    minute, hour, day, month, day_of_week = parts[:5]
                    return CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=day_of_week)
            return None
        except Exception as e:
            logger.error(f"Invalid trigger configuration: {e}")
            return None


# Global scheduler instance
_scheduler_instance = None


def get_export_scheduler() -> ExportScheduler:
    """Get or create the global export scheduler instance."""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = ExportScheduler()
    return _scheduler_instance
