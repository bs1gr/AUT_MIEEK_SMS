"""
Maintenance scheduler for background operations.

Integrates export cleanup, performance monitoring, and scheduled exports.
Runs maintenance tasks at regular intervals.
"""

import logging
from datetime import datetime, timezone, timedelta

from backend.db import SessionLocal
from backend.services.import_export_service import ImportExportService
from backend.services.export_performance_monitor import get_export_performance_monitor
from backend.services.export_scheduler import get_export_scheduler

logger = logging.getLogger(__name__)


class MaintenanceScheduler:
    """Handles background maintenance operations."""

    def __init__(self):
        self.import_export_service = ImportExportService()
        self.export_scheduler = get_export_scheduler()

    def cleanup_old_exports(self, days_old: int = 30, delete_files: bool = True):
        """Clean up old export jobs.

        Args:
            days_old: Delete exports older than this many days
            delete_files: Whether to delete associated files
        """
        db = SessionLocal()
        try:
            logger.info(f"Starting cleanup of exports older than {days_old} days")
            stats = self.import_export_service.cleanup_old_export_jobs(days_old=days_old, delete_files=delete_files)

            logger.info(
                f"Cleanup complete: Deleted {stats.get('deleted_jobs', 0)} jobs, {stats.get('deleted_files', 0)} files"
            )
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
        finally:
            db.close()

    def cleanup_and_archive_old_exports(self, days_old: int = 30, archive_path: str = "data/exports/archive"):
        """Archive old export jobs instead of deleting them.

        Args:
            days_old: Archive exports older than this many days
            archive_path: Path where archived files will be stored
        """
        db = SessionLocal()
        try:
            from backend.models import ExportJob

            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)

            old_exports = (
                db.query(ExportJob).filter(ExportJob.created_at < cutoff_date, ExportJob.status == "completed").all()
            )

            for export_job in old_exports:
                try:
                    self.import_export_service.archive_export_job(export_job.id, archive_path)
                    logger.info(f"Archived export job {export_job.id}")
                except Exception as e:
                    logger.error(f"Failed to archive export {export_job.id}: {e}")

        except Exception as e:
            logger.error(f"Archive operation failed: {e}")
        finally:
            db.close()

    def generate_performance_report(self, days: int = 7) -> dict:
        """Generate performance report for exports.

        Args:
            days: Number of days to include in report

        Returns:
            Performance statistics dictionary
        """
        db = SessionLocal()
        try:
            monitor = get_export_performance_monitor(db)
            stats = monitor.get_performance_stats(days=days)

            logger.info(
                f"Performance report for last {days} days: "
                f"{stats['total_exports']} exports, "
                f"{stats['successful']} successful, "
                f"{stats['failed']} failed"
            )

            return stats

        except Exception as e:
            logger.error(f"Failed to generate performance report: {e}")
            return {}
        finally:
            db.close()

    def start_export_scheduler(self):
        """Start the export scheduler."""
        if self.export_scheduler.is_available():
            self.export_scheduler.start()
            logger.info("Export scheduler started")
        else:
            logger.warning("Export scheduler not available (APScheduler not installed)")

    def stop_export_scheduler(self):
        """Stop the export scheduler."""
        self.export_scheduler.stop()
        logger.info("Export scheduler stopped")

    def schedule_cleanup_task(self, frequency: str = "daily"):
        """Schedule automatic export cleanup.

        Args:
            frequency: How often to run cleanup (hourly, daily, weekly, monthly)
        """
        if not self.export_scheduler.is_available():
            logger.warning("Cannot schedule cleanup: scheduler not available")
            return

        try:
            # Map frequency to cron expression
            cron_map = {
                "hourly": ("*/1", "*", "*", "*", "*"),  # Every hour
                "daily": ("0", "2", "*", "*", "*"),  # Daily at 2 AM
                "weekly": ("0", "2", "*", "*", "0"),  # Weekly on Monday at 2 AM
                "monthly": ("0", "2", "1", "*", "*"),  # Monthly on 1st at 2 AM
            }

            if frequency in cron_map:
                from apscheduler.triggers.cron import CronTrigger

                minute, hour, day, month, day_of_week = cron_map[frequency]
                trigger = CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=day_of_week)

                self.export_scheduler.scheduler.add_job(
                    self.cleanup_old_exports,
                    trigger=trigger,
                    id=f"cleanup_exports_{frequency}",
                    name=f"Cleanup old exports ({frequency})",
                    replace_existing=True,
                    kwargs={"days_old": 30, "delete_files": True},
                )

                logger.info(f"Scheduled export cleanup ({frequency})")

        except Exception as e:
            logger.error(f"Failed to schedule cleanup: {e}")


# Global maintenance scheduler instance
_maintenance_scheduler = None


def get_maintenance_scheduler() -> MaintenanceScheduler:
    """Get or create the global maintenance scheduler instance."""
    global _maintenance_scheduler
    if _maintenance_scheduler is None:
        _maintenance_scheduler = MaintenanceScheduler()
    return _maintenance_scheduler
