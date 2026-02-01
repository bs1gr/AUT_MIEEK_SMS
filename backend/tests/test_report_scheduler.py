"""
Basic unit tests for ReportScheduler service.

Tests core scheduler functionality including startup, shutdown, and scheduling.
"""

from __future__ import annotations

from datetime import datetime, timezone
import pytest

from backend.services.report_scheduler import (
    ReportScheduler,
    get_report_scheduler,
    APSCHEDULER_AVAILABLE,
)


class TestReportSchedulerBasics:
    """Test basic scheduler functionality."""

    def test_scheduler_singleton(self):
        """Test that get_report_scheduler returns same instance."""
        scheduler1 = get_report_scheduler()
        scheduler2 = get_report_scheduler()
        assert scheduler1 is scheduler2

    def test_scheduler_starts_and_stops(self):
        """Test scheduler can start and stop without errors."""
        scheduler = ReportScheduler()
        scheduler.start()
        # Should be running or gracefully disabled
        assert scheduler.is_available() or not APSCHEDULER_AVAILABLE
        scheduler.stop()

    def test_apscheduler_available_flag_set(self):
        """Test APSCHEDULER_AVAILABLE flag is properly set."""
        # Should be True since APScheduler 3.11.2 is installed
        assert APSCHEDULER_AVAILABLE is True


class TestReportSchedulerTriggers:
    """Test trigger generation and computation."""

    @pytest.mark.skipif(not APSCHEDULER_AVAILABLE, reason="APScheduler not installed")
    def test_compute_next_run_at_daily(self):
        """Test daily report scheduled for 2:00 AM UTC."""
        next_run = ReportScheduler.compute_next_run_at("daily", None, None)

        # Should fire at 2:00 AM UTC
        assert next_run is not None
        assert next_run.hour == 2
        assert next_run.minute == 0
        assert next_run.tzinfo == timezone.utc

    @pytest.mark.skipif(not APSCHEDULER_AVAILABLE, reason="APScheduler not installed")
    def test_compute_next_run_at_hourly(self):
        """Test hourly report scheduled for 1 hour from now."""
        now = datetime.now(timezone.utc)
        next_run = ReportScheduler.compute_next_run_at("hourly", None, None)

        # Should be approximately 1 hour from now
        assert next_run is not None
        delta = (next_run - now).total_seconds()
        # IntervalTrigger fires every hour, so ~3600 seconds
        assert 3500 < delta < 3700

    @pytest.mark.skipif(not APSCHEDULER_AVAILABLE, reason="APScheduler not installed")
    def test_compute_next_run_at_weekly(self):
        """Test weekly report scheduled for Monday 2:00 AM UTC."""
        next_run = ReportScheduler.compute_next_run_at("weekly", None, None)

        # Should fire on Monday (weekday 0) at 2:00 AM UTC
        assert next_run is not None
        assert next_run.weekday() == 0  # Monday
        assert next_run.hour == 2
        assert next_run.minute == 0

    @pytest.mark.skipif(not APSCHEDULER_AVAILABLE, reason="APScheduler not installed")
    def test_compute_next_run_at_monthly(self):
        """Test monthly report scheduled for 1st at 2:00 AM UTC."""
        next_run = ReportScheduler.compute_next_run_at("monthly", None, None)

        # Should fire on 1st of month at 2:00 AM UTC
        assert next_run is not None
        assert next_run.day == 1
        assert next_run.hour == 2
        assert next_run.minute == 0


class TestReportSchedulerEdgeCases:
    """Test edge cases and error handling."""

    def test_invalid_frequency_returns_none(self):
        """Test invalid frequency is handled gracefully."""
        if not APSCHEDULER_AVAILABLE:
            pytest.skip("APScheduler not installed")

        next_run = ReportScheduler.compute_next_run_at("invalid_frequency", None, None)
        assert next_run is None

    def test_cancel_nonexistent_report_no_error(self):
        """Test canceling non-existent report doesn't raise error."""
        scheduler = ReportScheduler()
        scheduler.start()

        try:
            # Should not raise error even if job doesn't exist
            scheduler.cancel_report(9999)
        finally:
            scheduler.stop()

    def test_compute_next_run_preserves_utc_timezone(self):
        """Test all computed next run times are in UTC."""
        if not APSCHEDULER_AVAILABLE:
            pytest.skip("APScheduler not installed")

        for frequency in ["hourly", "daily", "weekly", "monthly"]:
            next_run = ReportScheduler.compute_next_run_at(frequency, None, None)
            if next_run:
                assert next_run.tzinfo == timezone.utc


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
