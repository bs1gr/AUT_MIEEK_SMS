"""
Export performance monitoring service.

Tracks and logs export performance metrics including:
- Export duration
- Records processed per second
- File size
- Memory usage
- Performance trends
"""

import logging
import time
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
import json

from sqlalchemy.orm import Session
from backend.models import ExportJob

logger = logging.getLogger(__name__)


@dataclass
class ExportMetrics:
    """Export performance metrics."""

    export_id: int
    export_type: str
    export_format: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_records: int = 0
    total_duration_seconds: float = 0.0
    records_per_second: float = 0.0
    file_size_bytes: int = 0
    file_size_mb: float = 0.0
    status: str = "pending"
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return asdict(self)

    def calculate_derived_metrics(self):
        """Calculate derived metrics like records per second."""
        if self.end_time and self.total_records > 0:
            self.total_duration_seconds = (self.end_time - self.start_time).total_seconds()
            if self.total_duration_seconds > 0:
                self.records_per_second = self.total_records / self.total_duration_seconds


class ExportPerformanceMonitor:
    """Monitors and logs export performance metrics."""

    def __init__(self, db: Session, metrics_file: Optional[str] = None):
        self.db = db
        self.metrics_file = metrics_file or "data/exports/metrics.jsonl"
        self._ensure_metrics_file()

    def _ensure_metrics_file(self):
        """Ensure metrics file directory exists."""
        os.makedirs(os.path.dirname(self.metrics_file), exist_ok=True)

    def start_tracking(self, export_id: int, export_type: str, export_format: str) -> ExportMetrics:
        """Start tracking export performance.

        Args:
            export_id: Export job ID
            export_type: Type of export (students, courses, grades)
            export_format: Export format (excel, csv, pdf)

        Returns:
            ExportMetrics object to track
        """
        metrics = ExportMetrics(
            export_id=export_id,
            export_type=export_type,
            export_format=export_format,
            start_time=datetime.now(timezone.utc)
        )
        logger.info(f"Started tracking export {export_id} ({export_type}/{export_format})")
        return metrics

    def end_tracking(self, metrics: ExportMetrics, file_path: Optional[str] = None, error: Optional[str] = None) -> ExportMetrics:
        """End tracking and record metrics.

        Args:
            metrics: ExportMetrics object being tracked
            file_path: Path to generated export file
            error: Error message if export failed

        Returns:
            Updated ExportMetrics object
        """
        metrics.end_time = datetime.now(timezone.utc)
        metrics.calculate_derived_metrics()

        if error:
            metrics.status = "failed"
            metrics.error_message = error
        else:
            metrics.status = "completed"
            if file_path and os.path.exists(file_path):
                metrics.file_size_bytes = os.path.getsize(file_path)
                metrics.file_size_mb = metrics.file_size_bytes / (1024 * 1024)

        # Log metrics
        self._log_metrics(metrics)

        # Update export job with performance data
        export_job = self.db.query(ExportJob).filter(ExportJob.id == metrics.export_id).first()
        if export_job:
            export_job.file_size_bytes = metrics.file_size_bytes
            export_job.duration_seconds = metrics.total_duration_seconds
            self.db.commit()

        logger.info(
            f"Export {metrics.export_id} complete: "
            f"{metrics.total_records} records, "
            f"{metrics.total_duration_seconds:.2f}s, "
            f"{metrics.records_per_second:.2f} rps, "
            f"{metrics.file_size_mb:.2f}MB"
        )

        return metrics

    def _log_metrics(self, metrics: ExportMetrics):
        """Log metrics to file for historical analysis.

        Args:
            metrics: ExportMetrics object to log
        """
        try:
            with open(self.metrics_file, "a") as f:
                f.write(json.dumps(metrics.to_dict(), default=str) + "\n")
        except Exception as e:
            logger.error(f"Failed to log metrics: {e}")

    def get_performance_stats(self, export_type: Optional[str] = None, days: int = 7) -> Dict[str, Any]:
        """Get performance statistics for recent exports.

        Args:
            export_type: Optional filter by export type
            days: Number of days to include in stats

        Returns:
            Dictionary with performance statistics
        """
        stats = {
            "period_days": days,
            "export_type": export_type,
            "total_exports": 0,
            "successful": 0,
            "failed": 0,
            "avg_duration_seconds": 0.0,
            "avg_records_per_second": 0.0,
            "avg_file_size_mb": 0.0,
            "total_records_processed": 0,
            "total_file_size_mb": 0.0,
            "exports_by_format": {},
        }

        try:
            # Read metrics from file
            cutoff_time = datetime.now(timezone.utc) - timedelta(days=days)
            metrics_list = []

            if os.path.exists(self.metrics_file):
                with open(self.metrics_file, "r") as f:
                    for line in f:
                        try:
                            data = json.loads(line)
                            # Parse datetime strings
                            data['start_time'] = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
                            if data.get('end_time'):
                                data['end_time'] = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))

                            if data['start_time'] > cutoff_time:
                                if export_type is None or data.get('export_type') == export_type:
                                    metrics_list.append(data)
                        except json.JSONDecodeError:
                            continue

            # Calculate statistics
            if metrics_list:
                stats['total_exports'] = len(metrics_list)
                stats['successful'] = sum(1 for m in metrics_list if m.get('status') == 'completed')
                stats['failed'] = sum(1 for m in metrics_list if m.get('status') == 'failed')

                completed = [m for m in metrics_list if m.get('status') == 'completed']
                if completed:
                    stats['avg_duration_seconds'] = sum(m.get('total_duration_seconds', 0) for m in completed) / len(completed)
                    stats['avg_records_per_second'] = sum(m.get('records_per_second', 0) for m in completed) / len(completed)
                    stats['avg_file_size_mb'] = sum(m.get('file_size_mb', 0) for m in completed) / len(completed)
                    stats['total_records_processed'] = sum(m.get('total_records', 0) for m in completed)
                    stats['total_file_size_mb'] = sum(m.get('file_size_mb', 0) for m in completed)

                    # Count by format
                    formats = {}
                    for m in completed:
                        fmt = m.get('export_format', 'unknown')
                        if fmt not in formats:
                            formats[fmt] = 0
                        formats[fmt] += 1
                    stats['exports_by_format'] = formats

            return stats

        except Exception as e:
            logger.error(f"Failed to get performance stats: {e}")
            return stats

    def get_slowest_exports(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest exports for analysis.

        Args:
            limit: Number of slowest exports to return

        Returns:
            List of slowest export metrics, sorted by duration
        """
        try:
            exports = []
            if os.path.exists(self.metrics_file):
                with open(self.metrics_file, "r") as f:
                    for line in f:
                        try:
                            data = json.loads(line)
                            exports.append(data)
                        except json.JSONDecodeError:
                            continue

            # Sort by duration (descending)
            exports.sort(key=lambda x: x.get('total_duration_seconds', 0), reverse=True)
            return exports[:limit]

        except Exception as e:
            logger.error(f"Failed to get slowest exports: {e}")
            return []


def get_export_performance_monitor(db: Session) -> ExportPerformanceMonitor:
    """Factory function to create performance monitor."""
    return ExportPerformanceMonitor(db)
