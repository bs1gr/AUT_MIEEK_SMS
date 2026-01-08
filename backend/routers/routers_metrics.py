"""
Metrics Router for Business Analytics

Provides endpoints for business intelligence and metrics reporting.

Part of Phase 1 v1.15.0 - Improvement #5 (Business Metrics Dashboard)
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.db import get_session
from backend.security.permissions import optional_require_permission
from backend.rate_limiting import RATE_LIMIT_READ, limiter
from backend.schemas.metrics import (
    AttendanceMetrics,
    CourseMetrics,
    DashboardMetrics,
    GradeMetrics,
    StudentMetrics,
)
from backend.services.metrics_service import MetricsService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/students", response_model=StudentMetrics)
@limiter.limit(RATE_LIMIT_READ)
async def get_student_metrics(
    request: Request,
    semester: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user=Depends(optional_require_permission("analytics:view")),
) -> StudentMetrics:
    """
    Get student population and enrollment metrics.

    **Admin only** - Requires administrator authentication.

    Args:
        semester: Optional semester filter (e.g., "Fall 2025")
        db: Database session (injected)

    Returns:
        StudentMetrics with population breakdown

    Example Response:
        ```json
        {
            "total": 150,
            "active": 142,
            "inactive": 8,
            "new_this_semester": 25,
            "by_semester": {"Fall 2025": 75, "Spring 2026": 67}
        }
        ```
    """
    service = MetricsService(db)
    return service.get_student_metrics(semester=semester)


@router.get("/courses", response_model=CourseMetrics)
@limiter.limit(RATE_LIMIT_READ)
async def get_course_metrics(
    request: Request,
    db: Session = Depends(get_session),
    current_user=Depends(optional_require_permission("analytics:view")),
) -> CourseMetrics:
    """
    Get course enrollment and completion metrics.

    **Admin only** - Requires administrator authentication.

    Args:
        db: Database session (injected)

    Returns:
        CourseMetrics with enrollment statistics

    Example Response:
        ```json
        {
            "total_courses": 12,
            "active_courses": 10,
            "total_enrollments": 450,
            "avg_enrollment": 37.5,
            "completion_rate": 83.3
        }
        ```
    """
    service = MetricsService(db)
    return service.get_course_metrics()


@router.get("/grades", response_model=GradeMetrics)
@limiter.limit(RATE_LIMIT_READ)
async def get_grade_metrics(
    request: Request,
    db: Session = Depends(get_session),
    current_user=Depends(optional_require_permission("analytics:view")),
) -> GradeMetrics:
    """
    Get grade distribution and performance metrics.

    **Admin only** - Requires administrator authentication.

    Args:
        db: Database session (injected)

    Returns:
        GradeMetrics with grade distribution and statistics

    Example Response:
        ```json
        {
            "total_grades": 1250,
            "average_grade": 76.5,
            "median_grade": 78.0,
            "grade_distribution": {
                "A (18-20)": 250,
                "B (15-17)": 400,
                "C (12-14)": 350,
                "D (10-11)": 150,
                "F (0-9)": 100
            },
            "gpa_distribution": {...},
            "failing_count": 100
        }
        ```
    """
    service = MetricsService(db)
    return service.get_grade_metrics()


@router.get("/attendance", response_model=AttendanceMetrics)
@limiter.limit(RATE_LIMIT_READ)
async def get_attendance_metrics(
    request: Request,
    db: Session = Depends(get_session),
    current_user=Depends(optional_require_permission("analytics:view")),
) -> AttendanceMetrics:
    """
    Get attendance tracking and compliance metrics.

    **Admin only** - Requires administrator authentication.

    Args:
        db: Database session (injected)

    Returns:
        AttendanceMetrics with attendance rates and trends

    Example Response:
        ```json
        {
            "total_records": 5000,
            "present_count": 4650,
            "absent_count": 350,
            "attendance_rate": 93.0,
            "by_course": {"CS101": 95.5, "MATH201": 88.2},
            "by_date": {"2026-01-01": 94.5, "2026-01-02": 91.2}
        }
        ```
    """
    service = MetricsService(db)
    return service.get_attendance_metrics()


@router.get("/dashboard", response_model=DashboardMetrics)
@limiter.limit(RATE_LIMIT_READ)
async def get_dashboard_metrics(
    request: Request,
    db: Session = Depends(get_session),
    current_user=Depends(optional_require_permission("analytics:view")),
) -> DashboardMetrics:
    """
    Get comprehensive dashboard metrics for executive overview.

    **Admin only** - Requires administrator authentication.

    Combines student, course, grade, and attendance metrics into
    a single response for dashboard visualization.

    Args:
        db: Database session (injected)

    Returns:
        DashboardMetrics with all metrics combined

    Example Response:
        ```json
        {
            "timestamp": "2026-01-04T12:00:00Z",
            "students": {...},
            "courses": {...},
            "grades": {...},
            "attendance": {...}
        }
        ```
    """
    service = MetricsService(db)
    return service.get_dashboard_metrics()
