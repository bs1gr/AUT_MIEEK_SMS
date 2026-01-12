"""
Analytics Routes
Provides endpoints for student analytics and final grade computations.
Optimized with eager loading to prevent N+1 query problems.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import internal_server_error
from backend.rate_limiting import RATE_LIMIT_READ, limiter
from backend.rbac import require_permission
from backend.services import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    responses={404: {"description": "Not found"}},
)


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("/student/{student_id}/course/{course_id}/final-grade")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def calculate_final_grade(
    request: Request,
    student_id: int,
    course_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Calculate final grade using evaluation rules, grades, daily performance, and attendance."""
    try:
        return service.calculate_final_grade(student_id, course_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Final grade calculation failed: %s", exc, exc_info=True)
        raise internal_server_error("Final grade calculation failed", request)


@router.get("/student/{student_id}/all-courses-summary")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_student_all_courses_summary(
    request: Request,
    student_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
):
    try:
        return service.get_student_all_courses_summary(student_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student courses summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Student courses summary failed", request)


@router.get("/student/{student_id}/summary")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_student_summary(
    request: Request,
    student_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
):
    try:
        return service.get_student_summary(student_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Student summary failed", request)


@router.get("/dashboard")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_dashboard(
    request: Request,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Lightweight dashboard summary used by the frontend and load tests."""
    try:
        return service.get_dashboard_summary()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Dashboard summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Dashboard summary failed", request)


@router.get("/student/{student_id}/performance")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_student_performance(
    request: Request,
    student_id: int,
    days_back: int = 90,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get student performance metrics over time (last N days)."""
    try:
        return service.get_student_performance(student_id, days_back)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student performance failed: %s", exc, exc_info=True)
        raise internal_server_error("Student performance failed", request)


@router.get("/student/{student_id}/trends")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_student_trends(
    request: Request,
    student_id: int,
    limit: int = 10,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get student performance trends showing improvement/decline over time."""
    try:
        return service.get_student_trends(student_id, limit)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Student trends failed: %s", exc, exc_info=True)
        raise internal_server_error("Student trends failed", request)


@router.get("/course/{course_id}/students-comparison")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_students_comparison(
    request: Request,
    course_id: int,
    limit: int = 50,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get comparison data for all students in a course."""
    try:
        return service.get_students_comparison(course_id, limit)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Students comparison failed: %s", exc, exc_info=True)
        raise internal_server_error("Students comparison failed", request)


@router.get("/student/{student_id}/attendance")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_attendance_summary(
    request: Request,
    student_id: int,
    course_id: int = None,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get attendance summary for a student (all courses or specific course)."""
    try:
        return service.get_attendance_summary(student_id, course_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Attendance summary failed: %s", exc, exc_info=True)
        raise internal_server_error("Attendance summary failed", request)


@router.get("/course/{course_id}/grade-distribution")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_grade_distribution(
    request: Request,
    course_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Get grade distribution for a course (histogram data)."""
    try:
        return service.get_grade_distribution(course_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Grade distribution failed: %s", exc, exc_info=True)
        raise internal_server_error("Grade distribution failed", request)


# ==================== Cache Management ====================


@router.delete("/cache/clear")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("admin:manage")
def clear_analytics_cache(request: Request, service: AnalyticsService = Depends(get_analytics_service)):
    """
    Clear all cached analytics data.

    This endpoint clears the entire analytics cache and should only be used
    when data integrity is critical (e.g., after bulk imports or system corrections).

    **Requires**: admin:manage permission
    **Rate limit**: 60 requests per minute (read limit)
    """
    try:
        service.clear_all_cache()
        logger.info("Analytics cache cleared by %s", request.state.request_id)
        return {
            "success": True,
            "message": "All analytics cache cleared",
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.error("Failed to clear analytics cache: %s", exc, exc_info=True)
        raise internal_server_error("Failed to clear analytics cache", request)


@router.delete("/cache/student/{student_id}")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("admin:manage")
def clear_student_analytics_cache(
    request: Request,
    student_id: int,
    course_id: int = None,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """
    Clear cached analytics for a specific student.

    Optionally target a specific course for that student.

    **Requires**: admin:manage permission
    **Rate limit**: 60 requests per minute (read limit)

    Args:
        student_id: Student ID
        course_id: Optional course ID to target specific course analytics
    """
    try:
        service.invalidate_cache_for_student(student_id, course_id)
        logger.info("Analytics cache cleared for student %d by %s", student_id, request.state.request_id)
        return {
            "success": True,
            "student_id": student_id,
            "course_id": course_id,
            "message": f"Cleared analytics cache for student {student_id}",
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.error("Failed to clear student analytics cache: %s", exc, exc_info=True)
        raise internal_server_error("Failed to clear student analytics cache", request)


@router.delete("/cache/course/{course_id}")
@limiter.limit(RATE_LIMIT_READ)
@require_permission("admin:manage")
def clear_course_analytics_cache(
    request: Request,
    course_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
):
    """
    Clear cached analytics for a specific course.

    **Requires**: admin:manage permission
    **Rate limit**: 60 requests per minute (read limit)

    Args:
        course_id: Course ID
    """
    try:
        service.invalidate_cache_for_course(course_id)
        logger.info("Analytics cache cleared for course %d by %s", course_id, request.state.request_id)
        return {
            "success": True,
            "course_id": course_id,
            "message": f"Cleared analytics cache for course {course_id}",
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.error("Failed to clear course analytics cache: %s", exc, exc_info=True)
        raise internal_server_error("Failed to clear course analytics cache", request)
