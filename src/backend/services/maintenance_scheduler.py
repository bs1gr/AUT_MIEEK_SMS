"""
Maintenance scheduler for background operations.

Integrates export cleanup, performance monitoring, and scheduled exports.
Runs maintenance tasks at regular intervals.
"""

import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

from backend.db import SessionLocal
from backend.services.import_export_service import ImportExportService
from backend.services.export_performance_monitor import get_export_performance_monitor
from backend.services.export_scheduler import get_export_scheduler
from backend.services.report_scheduler import get_report_scheduler
from backend.services.course_activation_scheduler import get_course_activation_scheduler

logger = logging.getLogger(__name__)


class MaintenanceScheduler:
    """Handles background maintenance operations."""

    def __init__(self):
        self.import_export_service = ImportExportService()
        self.export_scheduler = get_export_scheduler()
        self.report_scheduler = get_report_scheduler()
        self.course_activation_scheduler = get_course_activation_scheduler()

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

    def purge_dead_refresh_tokens(self) -> int:
        """Delete refresh tokens that can never be used again (revoked or expired)."""
        from backend.services.refresh_token_cleanup import purge_dead_refresh_tokens_in_own_session

        return purge_dead_refresh_tokens_in_own_session(SessionLocal)

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

    def start_report_scheduler(self):
        """Start the report scheduler and schedule enabled reports."""
        if not self.report_scheduler.is_available():
            logger.warning("Report scheduler not available (APScheduler not installed)")
            return

        self.report_scheduler.start()

        db = SessionLocal()
        try:
            self.report_scheduler.schedule_all_reports(db)
            logger.info("Report scheduler started and reports scheduled")
        except Exception as e:
            logger.error(f"Failed to schedule reports: {e}")
        finally:
            db.close()

    def stop_export_scheduler(self):
        """Stop the export scheduler."""
        self.export_scheduler.stop()
        logger.info("Export scheduler stopped")

    def stop_report_scheduler(self):
        """Stop the report scheduler."""
        self.report_scheduler.stop()
        logger.info("Report scheduler stopped")

    def start_course_activation_scheduler(self):
        """Start the course activation scheduler and schedule daily updates."""
        if not self.course_activation_scheduler.is_available():
            logger.warning("Course activation scheduler not available (APScheduler not installed)")
            return

        self.course_activation_scheduler.start()
        self.course_activation_scheduler.schedule_daily_update()
        logger.info("Course activation scheduler started with daily updates at 3:00 AM UTC")

    def stop_course_activation_scheduler(self):
        """Stop the course activation scheduler."""
        self.course_activation_scheduler.stop()
        logger.info("Course activation scheduler stopped")

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

                # Same schedule: a server that runs for weeks (the cloud host) is not restarted
                # often enough for the purge at startup to keep the table small.
                self.export_scheduler.scheduler.add_job(
                    self.purge_dead_refresh_tokens,
                    trigger=trigger,
                    id=f"purge_refresh_tokens_{frequency}",
                    name=f"Remove dead refresh tokens ({frequency})",
                    replace_existing=True,
                )

                logger.info(f"Scheduled export cleanup and refresh-token purge ({frequency})")

        except Exception as e:
            logger.error(f"Failed to schedule cleanup: {e}")

    def schedule_automatic_backup(self, first_check_after_seconds: int = 60) -> bool:
        """Check once an hour whether the automatic database backup is due.

        The check, not the backup, runs hourly: `run_automatic_backup` makes one only when the
        newest automatic backup is older than AUTO_BACKUP_INTERVAL_HOURS. The first check
        comes a minute after the start, so an edition that is only up while somebody works
        with it still gets its backup, and a start is not slowed down by it.

        Returns True when the job was scheduled.
        """
        from backend.config import get_settings
        from backend.services.database_backup import run_automatic_backup

        settings = get_settings()
        if not getattr(settings, "AUTO_BACKUP_ENABLED", True):
            logger.warning(
                "Automatic database backup is switched off (AUTO_BACKUP_ENABLED=false): "
                "a backup exists only when somebody makes one"
            )
            return False

        if not self.export_scheduler.is_available():
            logger.warning("Cannot schedule the automatic database backup: scheduler not available")
            return False

        try:
            from apscheduler.triggers.interval import IntervalTrigger

            self.export_scheduler.scheduler.add_job(
                run_automatic_backup,
                trigger=IntervalTrigger(hours=1),
                next_run_time=datetime.now(timezone.utc) + timedelta(seconds=first_check_after_seconds),
                id="automatic_database_backup",
                name="Automatic database backup (hourly check)",
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=3600,
            )
            logger.info(
                "Automatic database backup scheduled: every %s h, the newest %s kept, in %s",
                getattr(settings, "AUTO_BACKUP_INTERVAL_HOURS", 24),
                getattr(settings, "AUTO_BACKUP_KEEP", 30),
                str(Path(settings.BACKUPS_DIR) / "database"),
            )
            return True
        except Exception as e:
            logger.error(f"Failed to schedule the automatic database backup: {e}")
            return False

    def schedule_monitor_heartbeat(self, first_after_seconds: int = 150) -> bool:
        """Tell a monitoring service outside, at a fixed pace, that this server is alive and well.

        Off unless MONITOR_PING_URL is set (services/monitor_heartbeat.py). The first signal
        comes after the first backup check has had time to finish, so that a server which
        starts with a failing backup does not first report that all is well.

        Returns True when the job was scheduled.
        """
        from backend.services.monitor_heartbeat import heartbeat_settings, send_heartbeat

        ping_url, _fail_url, minutes = heartbeat_settings()
        if not ping_url:
            logger.info("No monitoring service is set (MONITOR_PING_URL): nobody is told when this server stops")
            return False
        if not ping_url.lower().startswith(("https://", "http://")):
            logger.warning("MONITOR_PING_URL is not a web address; the heartbeat is off")
            return False

        if not self.export_scheduler.is_available():
            logger.warning("Cannot schedule the heartbeat: scheduler not available")
            return False

        try:
            from apscheduler.triggers.interval import IntervalTrigger

            self.export_scheduler.scheduler.add_job(
                send_heartbeat,
                trigger=IntervalTrigger(minutes=minutes),
                next_run_time=datetime.now(timezone.utc) + timedelta(seconds=first_after_seconds),
                id="monitor_heartbeat",
                name="Heartbeat to the monitoring service",
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=600,
            )
            # The address is a secret of sorts (whoever has it can send the signal): not logged.
            logger.info("Heartbeat to the monitoring service scheduled: every %s minutes", minutes)
            return True
        except Exception as e:
            logger.error(f"Failed to schedule the heartbeat: {e}")
            return False


# Global maintenance scheduler instance
_maintenance_scheduler = None


def get_maintenance_scheduler() -> MaintenanceScheduler:
    """Get or create the global maintenance scheduler instance."""
    global _maintenance_scheduler
    if _maintenance_scheduler is None:
        _maintenance_scheduler = MaintenanceScheduler()
    return _maintenance_scheduler
