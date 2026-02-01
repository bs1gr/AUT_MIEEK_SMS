"""
Report scheduler service for automated report generation.

Uses APScheduler to schedule report generation based on report schedule settings.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional, Any, cast, TYPE_CHECKING

if TYPE_CHECKING:
    from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore[import-not-found]
    from apscheduler.triggers.cron import CronTrigger  # type: ignore[import-not-found]
    from apscheduler.triggers.interval import IntervalTrigger  # type: ignore[import-not-found]

try:
    from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore[import-not-found]
    from apscheduler.triggers.cron import CronTrigger  # type: ignore[import-not-found]
    from apscheduler.triggers.interval import IntervalTrigger  # type: ignore[import-not-found]

    APSCHEDULER_AVAILABLE = True
except ImportError:  # pragma: no cover - optional dependency
    BackgroundScheduler = None  # type: ignore[assignment]
    CronTrigger = None  # type: ignore[assignment]
    IntervalTrigger = None  # type: ignore[assignment]
    APSCHEDULER_AVAILABLE = False

from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.models import GeneratedReport, Report
from backend.services.custom_report_generation_service import CustomReportGenerationService

logger = logging.getLogger(__name__)


class ReportScheduler:
    """Service for managing scheduled report generation."""

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
            logger.warning("APScheduler not available. Scheduled reports disabled.")
            return

        scheduler = self.scheduler
        if scheduler and not scheduler.running:
            scheduler.start()
            logger.info("Report scheduler started")

    def stop(self) -> None:
        """Stop the scheduler."""
        scheduler = self.scheduler
        if self.is_available() and scheduler and scheduler.running:
            scheduler.shutdown()
            logger.info("Report scheduler stopped")

    def schedule_report(self, report: Report) -> Optional[datetime]:
        """Schedule a report based on its stored schedule configuration."""
        if not self.is_available():
            return None

        if not bool(cast(bool, report.schedule_enabled)):
            return None

        trigger = self._get_trigger(
            cast(Optional[str], report.schedule_frequency),
            cast(Optional[str], report.schedule_cron),
        )
        if not trigger:
            logger.error("Invalid report schedule configuration for report %s", report.id)
            return None

        job_id = f"report_{report.id}"
        scheduler = self.scheduler
        if not scheduler:
            return None
        scheduler.add_job(
            self._run_scheduled_report,
            trigger=trigger,
            id=job_id,
            name=f"Scheduled Report {report.id}",
            replace_existing=True,
            kwargs={"report_id": report.id},
        )

        job = scheduler.get_job(job_id)
        return job.next_run_time if job else None

    def cancel_report(self, report_id: int) -> None:
        """Cancel a scheduled report job if it exists."""
        if not self.is_available():
            return

        job_id = f"report_{report_id}"
        scheduler = self.scheduler
        if not scheduler:
            return
        try:
            scheduler.remove_job(job_id)
            logger.info("Cancelled scheduled report job %s", job_id)
        except Exception:
            pass

    def schedule_all_reports(self, db: Session) -> None:
        """Schedule all reports that have scheduling enabled."""
        if not self.is_available():
            return

        schedule_enabled = cast(Any, Report.schedule_enabled)
        deleted_at = cast(Any, Report.deleted_at)
        reports = db.query(Report).filter(schedule_enabled.is_(True), deleted_at.is_(None)).all()
        for report in reports:
            next_run = self.schedule_report(report)
            if next_run:
                report.next_run_at = next_run  # type: ignore[assignment]
        db.commit()

    @staticmethod
    def compute_next_run_at(
        schedule_frequency: Optional[str],
        schedule_cron: Optional[str],
        last_run_at: Optional[datetime] = None,
    ) -> Optional[datetime]:
        """Compute the next run time for a schedule configuration."""
        trigger = ReportScheduler._get_trigger(schedule_frequency, schedule_cron)
        if not trigger:
            return None

        now = datetime.now(timezone.utc)
        previous = last_run_at if last_run_at else None
        return trigger.get_next_fire_time(previous, now)

    @staticmethod
    def _get_trigger(schedule_frequency: Optional[str], schedule_cron: Optional[str]):
        if not APSCHEDULER_AVAILABLE:
            return None
        if not schedule_frequency:
            return None

        try:
            if schedule_frequency == "hourly":
                assert IntervalTrigger is not None
                return IntervalTrigger(hours=1, timezone=timezone.utc)
            if schedule_frequency == "daily":
                assert CronTrigger is not None
                return CronTrigger(hour=2, minute=0, timezone=timezone.utc)
            if schedule_frequency == "weekly":
                assert CronTrigger is not None
                return CronTrigger(day_of_week=0, hour=2, minute=0, timezone=timezone.utc)
            if schedule_frequency == "monthly":
                assert CronTrigger is not None
                return CronTrigger(day=1, hour=2, minute=0, timezone=timezone.utc)
            if schedule_frequency == "custom" and schedule_cron:
                parts = schedule_cron.split()
                if len(parts) == 5:
                    minute, hour, day, month, day_of_week = parts
                    assert CronTrigger is not None
                    return CronTrigger(
                        minute=minute,
                        hour=hour,
                        day=day,
                        month=month,
                        day_of_week=day_of_week,
                        timezone=timezone.utc,
                    )
                if len(parts) == 6:
                    second, minute, hour, day, month, day_of_week = parts
                    assert CronTrigger is not None
                    return CronTrigger(
                        second=second,
                        minute=minute,
                        hour=hour,
                        day=day,
                        month=month,
                        day_of_week=day_of_week,
                        timezone=timezone.utc,
                    )
        except Exception as exc:
            logger.error("Invalid report trigger configuration: %s", exc)
            return None

        return None

    @staticmethod
    def _run_scheduled_report(report_id: int) -> None:
        db = SessionLocal()
        try:
            schedule_enabled = cast(Any, Report.schedule_enabled)
            deleted_at = cast(Any, Report.deleted_at)
            report = (
                db.query(Report)
                .filter(Report.id == report_id, schedule_enabled.is_(True), deleted_at.is_(None))
                .first()
            )
            if not report:
                return

            export_format = str(report.export_format or "pdf")
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            file_name = f"report_{report_id}_{timestamp}.{export_format}"

            generated = GeneratedReport(
                report_id=report_id,
                user_id=report.user_id,
                file_name=file_name,
                export_format=export_format,
                status="pending",
            )
            db.add(generated)
            db.commit()
            db.refresh(generated)

            CustomReportGenerationService.run_generation_task(
                report_id,
                int(cast(int, generated.id)),
                int(cast(int, report.user_id)),
                export_format,
                bool(report.include_charts),
            )

            db.refresh(report)
            report.next_run_at = ReportScheduler.compute_next_run_at(  # type: ignore[assignment]
                cast(Optional[str], report.schedule_frequency),
                cast(Optional[str], report.schedule_cron),
                cast(Optional[datetime], report.last_run_at),
            )
            db.commit()
        except Exception as exc:
            logger.error("Scheduled report run failed: %s", exc)
        finally:
            db.close()


_report_scheduler_instance = None


def get_report_scheduler() -> ReportScheduler:
    """Get or create the global report scheduler instance."""
    global _report_scheduler_instance
    if _report_scheduler_instance is None:
        _report_scheduler_instance = ReportScheduler()
    return _report_scheduler_instance
