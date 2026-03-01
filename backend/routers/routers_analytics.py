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
from backend.models import Course, CourseEnrollment, Grade, Student
from backend.rbac import require_permission
from backend.schemas.analytics import AnalyticsLookupsResponse
from backend.schemas.courses import CourseResponse
from backend.schemas.students import StudentResponse
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


@router.get("/lookups", response_model=AnalyticsLookupsResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("reports:generate")
def get_analytics_lookups(request: Request, db: Session = Depends(get_db)):
    """Return student/course lists for analytics selectors.

    OPTIMIZED: Uses database aggregations instead of loading all records into memory.
    This prevents N+1 queries and memory exhaustion with large datasets.
    """
    try:
        from sqlalchemy import func

        # Step 1: Load students and courses (small set, needed for responses)
        students_query = db.query(Student).order_by(Student.last_name.asc(), Student.first_name.asc())
        if hasattr(Student, "deleted_at"):
            students_query = students_query.filter(Student.deleted_at.is_(None))
        students = students_query.all()

        courses_query = db.query(Course).order_by(Course.course_name.asc())
        if hasattr(Course, "deleted_at"):
            courses_query = courses_query.filter(Course.deleted_at.is_(None))
        courses = courses_query.all()

        # Build lookup maps for joining with aggregation results
        student_by_id = {student.id: student for student in students}
        course_by_id = {course.id: course for course in courses}

        def _class_label(student: Student) -> str:
            if getattr(student, "academic_year", None):
                return str(student.academic_year)
            if student.study_year in (1, 2):
                return "A" if student.study_year == 1 else "B"
            if student.study_year:
                return f"Year {student.study_year}"
            return "Unknown Class"

        # Step 2: Compute class/division counts from loaded students (small set)
        class_counts: dict[str, int] = {}
        division_counts: dict[str, int] = {}
        for student in students:
            label = _class_label(student)
            class_counts[label] = class_counts.get(label, 0) + 1
            division_label = student.class_division or "Unassigned Division"
            division_counts[division_label] = division_counts.get(division_label, 0) + 1

        # Step 3: Use database aggregation for grades (critical optimization)
        # This prevents loading potentially tens of thousands of grade records
        grade_filter = Grade.deleted_at.is_(None) if hasattr(Grade, "deleted_at") else True
        valid_grade_filter = (Grade.max_grade.isnot(None)) & (Grade.max_grade > 0)

        # Build percentage computation for SQL
        grade_percentage = (Grade.grade / Grade.max_grade) * 100

        # Get enrollment counts by course
        enrollment_query = db.query(CourseEnrollment.course_id, func.count(CourseEnrollment.id).label("count"))
        if hasattr(CourseEnrollment, "deleted_at"):
            enrollment_query = enrollment_query.filter(CourseEnrollment.deleted_at.is_(None))
        enrollment_counts_raw = enrollment_query.group_by(CourseEnrollment.course_id).all()
        enrollment_counts = {cid: count for cid, count in enrollment_counts_raw}

        # Get grade statistics aggregated at database level
        grade_stats_by_course = {}
        course_grade_query = (
            db.query(Grade.course_id, func.count(Grade.id).label("count"), func.avg(grade_percentage).label("avg_pct"))
            .filter(grade_filter, valid_grade_filter)
            .group_by(Grade.course_id)
            .all()
        )

        for course_id, count, avg_pct in course_grade_query:
            grade_stats_by_course[course_id] = {"count": count or 0, "average": float(avg_pct or 0.0)}

        # Step 4: Build aggregates for class and division
        # Note: We need student-grade mapping which requires JOIN - do this efficiently
        class_grade_totals: dict[str, dict[str, float]] = {}
        division_grade_totals: dict[str, dict[str, float]] = {}

        # Only join Student and Grade tables - minimal data transfer
        student_grade_query = (
            db.query(Student.id, Grade.grade, Grade.max_grade)
            .join(Grade, Student.id == Grade.student_id)
            .filter(
                (Student.deleted_at.is_(None) if hasattr(Student, "deleted_at") else True),
                (Grade.deleted_at.is_(None) if hasattr(Grade, "deleted_at") else True),
                valid_grade_filter,
            )
            .all()
        )

        for student_id, grade_value, max_grade in student_grade_query:
            if not max_grade or max_grade <= 0:
                continue
            percentage = (grade_value / max_grade) * 100
            student = student_by_id.get(student_id)
            if student:
                label = _class_label(student)
                stats = class_grade_totals.setdefault(label, {"count": 0.0, "total": 0.0})
                stats["count"] += 1
                stats["total"] += percentage

                division_label = student.class_division or "Unassigned Division"
                division_stats = division_grade_totals.setdefault(division_label, {"count": 0.0, "total": 0.0})
                division_stats["count"] += 1
                division_stats["total"] += percentage

        # Step 5: Format results
        class_averages = []
        for label, count in class_counts.items():
            stats = class_grade_totals.get(label, {"count": 0.0, "total": 0.0})
            class_averages.append(
                {
                    "label": label,
                    "count": count,
                    "average": (stats["total"] / stats["count"]) if stats["count"] else 0,
                }
            )
        class_averages.sort(key=lambda item: item["count"], reverse=True)

        division_averages = []
        for label, count in division_counts.items():
            stats = division_grade_totals.get(label, {"count": 0.0, "total": 0.0})
            division_averages.append(
                {
                    "label": label,
                    "count": count,
                    "average": (stats["total"] / stats["count"]) if stats["count"] else 0,
                }
            )
        division_averages.sort(key=lambda item: item["count"], reverse=True)

        course_averages = []
        for course_id, course in course_by_id.items():
            stats = grade_stats_by_course.get(course_id, {"count": 0, "average": 0.0})
            course_averages.append(
                {
                    "label": course.course_name,
                    "count": enrollment_counts.get(course_id, 0),
                    "average": stats["average"],
                }
            )
        course_averages.sort(key=lambda item: item["count"], reverse=True)

        return {
            "students": [StudentResponse.model_validate(s) for s in students],
            "courses": [CourseResponse.model_validate(c) for c in courses],
            "class_averages": class_averages,
            "course_averages": course_averages,
            "division_averages": division_averages,
        }
    except Exception as exc:
        logger.error("Analytics lookups failed: %s", exc, exc_info=True)
        raise internal_server_error("Analytics lookups failed", request)


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
