"""
Prometheus Metrics Middleware for Student Management System

This module provides comprehensive metrics collection for monitoring:
- HTTP request metrics (rate, duration, status codes)
- Database query metrics
- Business metrics (students, courses, grades)
- System metrics (memory, CPU)
- Custom application metrics
"""

import logging
import time
from typing import Callable

from fastapi import FastAPI, Request
from prometheus_client import Counter, Gauge, Histogram, Info
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ============================================================================
# CUSTOM METRICS REGISTRY
# ============================================================================

# Business Metrics
students_total = Gauge(
    "sms_students_total",
    "Total number of students in the system",
    ["status"],  # active, inactive
)

courses_total = Gauge(
    "sms_courses_total",
    "Total number of courses",
    ["semester"],
)

grades_total = Counter(
    "sms_grades_total",
    "Total number of grades recorded",
    ["course", "grade_type"],
)

attendance_total = Counter(
    "sms_attendance_total",
    "Total attendance records",
    ["status"],  # present, absent, late, excused
)

enrollments_total = Gauge(
    "sms_enrollments_total",
    "Total active enrollments",
)

# Authentication Metrics
auth_attempts_total = Counter(
    "sms_auth_attempts_total",
    "Total authentication attempts",
    ["status"],  # success, failed, locked
)

auth_active_sessions = Gauge(
    "sms_auth_active_sessions",
    "Number of active user sessions",
)

# Database Metrics
db_connections_active = Gauge(
    "sms_db_connections_active",
    "Number of active database connections",
)

db_query_duration = Histogram(
    "sms_db_query_duration_seconds",
    "Database query duration in seconds",
    ["operation"],  # select, insert, update, delete
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

db_errors_total = Counter(
    "sms_db_errors_total",
    "Total database errors",
    ["error_type"],
)

# API Performance Metrics
api_response_size_bytes = Histogram(
    "sms_api_response_size_bytes",
    "API response size in bytes",
    ["endpoint", "method"],
    buckets=(100, 500, 1000, 5000, 10000, 50000, 100000, 500000),
)

api_slow_requests_total = Counter(
    "sms_api_slow_requests_total",
    "Total number of slow requests (>1s)",
    ["endpoint", "method"],
)

# Rate Limiting Metrics
rate_limit_exceeded_total = Counter(
    "sms_rate_limit_exceeded_total",
    "Total rate limit violations",
    ["endpoint", "limit_type"],
)

# Cache Metrics
cache_hits_total = Counter(
    "sms_cache_hits_total",
    "Total cache hits",
    ["cache_type"],
)

cache_misses_total = Counter(
    "sms_cache_misses_total",
    "Total cache misses",
    ["cache_type"],
)

# Error Metrics
errors_total = Counter(
    "sms_errors_total",
    "Total application errors",
    ["error_type", "endpoint"],
)

# System Info
app_info = Info(
    "sms_app",
    "Application information",
)

# HTTP metrics
http_request_size_bytes = Histogram(
    "sms_http_request_size_bytes",
    "Size of HTTP requests in bytes",
    ["endpoint", "method", "status"],
    buckets=(100, 500, 1000, 5000, 10000, 50000, 100000, 500000),
)

http_response_size_bytes = Histogram(
    "sms_http_response_size_bytes",
    "Size of HTTP responses in bytes",
    ["endpoint", "method", "status"],
    buckets=(100, 500, 1000, 5000, 10000, 50000, 100000, 500000),
)

http_request_duration_seconds = Histogram(
    "sms_http_request_duration_seconds",
    "Duration of HTTP requests in seconds",
    ["endpoint", "method", "status"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

http_requests_total = Counter(
    "sms_http_requests_total",
    "Total number of HTTP requests",
    ["endpoint", "method", "status"],
)

http_requests_inprogress = Gauge(
    "sms_http_requests_inprogress",
    "Current number of in-progress HTTP requests",
    ["endpoint", "method"],
)


# ==========================================================================
# METRICS HELPERS
# ============================================================================


def _get_endpoint_label(request: Request) -> str:
    """Resolve a stable endpoint label for metrics."""
    route = getattr(request.scope, "route", None)
    if route is not None and getattr(route, "path", None):
        return str(route.path)
    return request.url.path


def _parse_content_length(value: str | None) -> int | None:
    """Parse a Content-Length header into an integer, if present."""
    if not value:
        return None

    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return None


# ==========================================================================
# METRICS COLLECTION FUNCTIONS
# ============================================================================


def collect_business_metrics(db: Session) -> None:
    """
    Collect business metrics from the database.

    This should be called periodically (e.g., every 60 seconds) to update
    gauges with current system state.

    Args:
        db: Database session
    """
    try:
        # Note: Enrollment model is named CourseEnrollment in this codebase
        from backend.models import Course, CourseEnrollment, Student

        # Student metrics
        active_students = db.query(Student).filter(Student.is_active.is_(True)).count()
        inactive_students = db.query(Student).filter(Student.is_active.is_(False)).count()
        students_total.labels(status="active").set(active_students)
        students_total.labels(status="inactive").set(inactive_students)

        # Course metrics
        courses = db.query(Course.semester, Course).all()
        from typing import Dict

        semester_counts: Dict[str, int] = {}
        for course in courses:
            semester = course.semester or "unknown"
            semester_counts[semester] = semester_counts.get(semester, 0) + 1

        for semester, count in semester_counts.items():
            courses_total.labels(semester=semester).set(count)

        # Enrollment metrics
        # CourseEnrollment does not have an is_active flag; count distinct active links
        # If a soft-delete flag exists via SoftDeleteMixin, respect it; otherwise count all rows
        try:
            # Prefer filtering out soft-deleted records when attribute exists
            if hasattr(CourseEnrollment, "deleted_at"):
                active_enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.deleted_at.is_(None)).count()
            else:
                active_enrollments = db.query(CourseEnrollment).count()
        except Exception:
            active_enrollments = db.query(CourseEnrollment).count()
        enrollments_total.set(active_enrollments)

        logger.debug("Business metrics collected successfully")

    except Exception as e:
        logger.error(f"Failed to collect business metrics: {e}")


def track_database_query(operation: str) -> Callable:
    """
    Decorator to track database query performance.

    Usage:
        @track_database_query("select")
        def get_students(db):
            return db.query(Student).all()

    Args:
        operation: Type of operation (select, insert, update, delete)

    Returns:
        Decorator function
    """

    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                db_query_duration.labels(operation=operation).observe(duration)
                return result
            except Exception as e:
                db_errors_total.labels(error_type=type(e).__name__).inc()
                raise

        return wrapper

    return decorator


# ============================================================================
# FASTAPI INSTRUMENTATOR SETUP
# ============================================================================


def setup_metrics(app: FastAPI, version: str = "unknown") -> None:
    """
    Set up Prometheus metrics for the FastAPI application.

    This configures:
    - Automatic HTTP metrics (requests, duration, status codes)
    - Custom business metrics
    - System metrics
    - Database metrics

    Args:
        app: FastAPI application instance
        version: Application version
    """
    try:
        # Set application info
        app_info.info(
            {
                "version": version,
                "application": "student-management-system",
                "framework": "fastapi",
            }
        )

        @app.middleware("http")
        async def track_http_metrics(request: Request, call_next):
            endpoint = _get_endpoint_label(request)
            method = request.method
            excluded = {"/metrics", "/health/live"}
            if endpoint in excluded:
                return await call_next(request)

            request_size = _parse_content_length(request.headers.get("content-length"))
            inprogress_labels = {"endpoint": endpoint, "method": method}
            http_requests_inprogress.labels(**inprogress_labels).inc()
            start_time = time.perf_counter()
            status = "500"

            try:
                response = await call_next(request)
                status = str(response.status_code)

                duration = time.perf_counter() - start_time
                http_requests_total.labels(endpoint=endpoint, method=method, status=status).inc()
                http_request_duration_seconds.labels(endpoint=endpoint, method=method, status=status).observe(duration)

                if request_size is not None:
                    http_request_size_bytes.labels(endpoint=endpoint, method=method, status=status).observe(
                        request_size
                    )

                response_size = _parse_content_length(response.headers.get("content-length"))
                if response_size is not None:
                    http_response_size_bytes.labels(endpoint=endpoint, method=method, status=status).observe(
                        response_size
                    )

                if duration > 1.0:
                    api_slow_requests_total.labels(endpoint=endpoint, method=method).inc()

                return response
            except Exception:
                duration = time.perf_counter() - start_time
                http_requests_total.labels(endpoint=endpoint, method=method, status=status).inc()
                http_request_duration_seconds.labels(endpoint=endpoint, method=method, status=status).observe(duration)
                if request_size is not None:
                    http_request_size_bytes.labels(endpoint=endpoint, method=method, status=status).observe(
                        request_size
                    )
                raise
            finally:
                http_requests_inprogress.labels(**inprogress_labels).dec()

        logger.info("Prometheus metrics instrumentation completed")

    except Exception as e:
        logger.error(f"Failed to setup Prometheus metrics: {e}")
        logger.warning("Application will continue without metrics")


# ============================================================================
# HELPER FUNCTIONS FOR METRICS TRACKING
# ============================================================================


def track_auth_attempt(status: str) -> None:
    """
    Track authentication attempt.

    Args:
        status: 'success', 'failed', or 'locked'
    """
    auth_attempts_total.labels(status=status).inc()


def track_grade_submission(course_code: str, grade_type: str) -> None:
    """
    Track grade submission.

    Args:
        course_code: Course code
        grade_type: Type of grade (exam, assignment, etc.)
    """
    grades_total.labels(course=course_code, grade_type=grade_type).inc()


def track_attendance(status: str) -> None:
    """
    Track attendance record.

    Args:
        status: 'present', 'absent', 'late', or 'excused'
    """
    attendance_total.labels(status=status).inc()


def track_rate_limit_exceeded(endpoint: str, limit_type: str) -> None:
    """
    Track rate limit violation.

    Args:
        endpoint: API endpoint path
        limit_type: Type of rate limit (read, write, auth)
    """
    rate_limit_exceeded_total.labels(
        endpoint=endpoint,
        limit_type=limit_type,
    ).inc()


def track_cache_hit(cache_type: str) -> None:
    """
    Track cache hit.

    Args:
        cache_type: Type of cache (response, query, etc.)
    """
    cache_hits_total.labels(cache_type=cache_type).inc()


def track_cache_miss(cache_type: str) -> None:
    """
    Track cache miss.

    Args:
        cache_type: Type of cache (response, query, etc.)
    """
    cache_misses_total.labels(cache_type=cache_type).inc()


def track_error(error_type: str, endpoint: str) -> None:
    """
    Track application error.

    Args:
        error_type: Type/class of error
        endpoint: API endpoint where error occurred
    """
    errors_total.labels(error_type=error_type, endpoint=endpoint).inc()


# ============================================================================
# PERIODIC METRICS COLLECTION
# ============================================================================


def create_metrics_collector_task(interval: int = 60):
    """
    Create a background task factory for periodically collecting business metrics.

    This function returns an async task that can be scheduled from the lifespan
    context manager.

    Args:
        interval: Collection interval in seconds (default: 60)

    Returns:
        Async task function that collects metrics periodically
    """
    import asyncio

    from backend.db import SessionLocal

    async def collect_metrics_task():
        """Background task to collect metrics periodically."""
        logger.info(f"Metrics collector started (interval: {interval}s)")
        while True:
            try:
                db = SessionLocal()
                try:
                    collect_business_metrics(db)
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error collecting metrics: {e}")

            await asyncio.sleep(interval)

    return collect_metrics_task
