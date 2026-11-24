"""
Reports router for generating student performance and progress reports.

Provides endpoints for:
- Individual student performance reports
- Bulk report generation
- Report download
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from backend.cache import CacheConfig, cache_key, redis_cache
from backend.db import get_session
from backend.error_messages import ErrorCode, get_error_message
from backend.models import Attendance, Course, DailyPerformance, Grade, Highlight, Student
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.schemas import (
    AttendanceSummary,
    CourseSummary,
    GradeSummary,
    HighlightSummary,
    PerformanceReportRequest,
    PerformanceSummary,
    ReportFormat,
    ReportPeriod,
    StudentPerformanceReport,
)
from backend.services.absence_limit_service import ATTENDED_STATUSES
from backend.services.analytics_service import AnalyticsService
from backend.services.report_exporters import generate_csv_report, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


def _calculate_period_dates(
    period: ReportPeriod, start_date: Optional[date], end_date: Optional[date]
) -> tuple[date, date]:
    """Calculate start and end dates based on period type."""
    today = date.today()

    if period == ReportPeriod.CUSTOM:
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail=get_error_message(ErrorCode.INVALID_PERIOD, lang="en"))
        return start_date, end_date

    elif period == ReportPeriod.WEEK:
        # Last 7 days
        return today - timedelta(days=7), today

    elif period == ReportPeriod.MONTH:
        # Last 30 days
        return today - timedelta(days=30), today

    elif period == ReportPeriod.SEMESTER:
        # Last 120 days (~4 months)
        return today - timedelta(days=120), today

    elif period == ReportPeriod.YEAR:
        # Last 365 days
        return today - timedelta(days=365), today

    else:
        # Default to semester
        return today - timedelta(days=120), today


def _status_counts(records: List[Attendance]) -> Dict[str, int]:
    """Present / Absent / Late / Excused periods, whatever the case the status was stored in."""
    counts = {"present": 0, "absent": 0, "late": 0, "excused": 0}
    for record in records:
        status = str(record.status or "").strip().lower()
        if status in counts:
            counts[status] += 1
    return counts


def _attended_rate(counts: Dict[str, int], total: int) -> float:
    """Present and Late over every period recorded (plan todo 77: the one meaning of attended)."""
    attended = sum(counts[status] for status in ATTENDED_STATUSES)
    return round(attended / total * 100, 1) if total > 0 else 0


def _calculate_trend(values: List[float]) -> str:
    """Calculate trend (improving, declining, stable) from list of scores."""
    if len(values) < 2:
        return "stable"

    # Split into first half and second half
    mid = len(values) // 2
    first_half_avg = sum(values[:mid]) / len(values[:mid]) if mid > 0 else 0
    second_half_avg = sum(values[mid:]) / len(values[mid:]) if len(values[mid:]) > 0 else 0

    diff = second_half_avg - first_half_avg

    if diff > 5:  # >5% improvement
        return "improving"
    elif diff < -5:  # >5% decline
        return "declining"
    else:
        return "stable"


def _generate_recommendations(report_data: dict) -> List[str]:
    """
    Generate recommendations based on report data.

    Returns translation keys prefixed with 'reports:rec_' for frontend i18n.
    Special handling for course-specific recommendations with interpolation.
    """
    recommendations = []

    # Check attendance
    if report_data.get("overall_attendance"):
        attendance = report_data["overall_attendance"]
        # Handle both Pydantic model and dict
        attendance_rate = (
            attendance.attendance_rate
            if hasattr(attendance, "attendance_rate")
            else attendance.get("attendance_rate", 100)
        )
        if attendance_rate < 75:
            recommendations.append("reports:rec_attendance_low")
        elif attendance_rate < 85:
            recommendations.append("reports:rec_attendance_medium")

    # Check grades
    if report_data.get("overall_grades"):
        grades = report_data["overall_grades"]
        # Handle both Pydantic model and dict
        avg_percentage = (
            grades.average_percentage
            if hasattr(grades, "average_percentage")
            else grades.get("average_percentage", 100)
        )
        trend = grades.grade_trend if hasattr(grades, "grade_trend") else grades.get("grade_trend", "stable")

        if avg_percentage < 60:
            recommendations.append("reports:rec_grades_failing")
        elif avg_percentage < 70:
            recommendations.append("reports:rec_grades_needs_improvement")
        elif avg_percentage >= 90:
            recommendations.append("reports:rec_grades_excellent")

        if trend == "declining":
            recommendations.append("reports:rec_trend_declining")
        elif trend == "improving":
            recommendations.append("reports:rec_trend_improving")

    # Check course-specific issues
    courses_data = report_data.get("courses", [])
    struggling_courses = []
    for c in courses_data:
        grade_pct = c.grade_percentage if hasattr(c, "grade_percentage") else c.get("grade_percentage", 100)
        if grade_pct and grade_pct < 60:
            struggling_courses.append(c)

    if struggling_courses:
        course_names = []
        for c in struggling_courses[:3]:
            course_name = c.course_name if hasattr(c, "course_name") else c.get("course_name", "Unknown")
            course_names.append(course_name)
        # Return key with interpolation data separated by ||
        recommendations.append(f"reports:rec_focus_courses||{', '.join(course_names)}")

    # If no issues found
    if not recommendations:
        recommendations.append("reports:rec_satisfactory")

    return recommendations


def _build_student_report(
    student: Student,
    report_request: PerformanceReportRequest,
    db: Session,
    start_date: date,
    end_date: date,
) -> StudentPerformanceReport:
    """Build student performance report data.

    Shared by both the JSON endpoint and the download endpoint
    to ensure consistent data building logic.
    """
    report_data: dict = {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "student_email": student.email,
        "report_period": report_request.period.value,
        "start_date": start_date,
        "end_date": end_date,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "courses": [],
        "highlights": [],
    }

    # Get attendance summary
    if report_request.include_attendance:
        attendance_records = (
            db.query(Attendance)
            .filter(
                Attendance.student_id == student.id,
                Attendance.date >= start_date,
                Attendance.date <= end_date,
                Attendance.deleted_at.is_(None),
            )
            .all()
        )

        if attendance_records:
            total_days = len(attendance_records)
            counts = _status_counts(attendance_records)

            report_data["overall_attendance"] = AttendanceSummary(
                total_days=total_days,
                present=counts["present"],
                absent=counts["absent"],
                late=counts["late"],
                excused=counts["excused"],
                # Present and Late are attended (todo 77); until then Late lowered this rate.
                attendance_rate=_attended_rate(counts, total_days),
                unexcused_absences=counts["absent"],
            )

    # Get grades summary using date_submitted with fallback to date_assigned
    if report_request.include_grades:
        grade_records = (
            db.query(Grade)
            .filter(
                Grade.student_id == student.id,
                Grade.deleted_at.is_(None),
            )
            .filter(
                and_(
                    or_(
                        and_(Grade.date_submitted.isnot(None), Grade.date_submitted >= start_date),
                        and_(Grade.date_submitted.is_(None), Grade.date_assigned >= start_date),
                    ),
                    or_(
                        and_(Grade.date_submitted.isnot(None), Grade.date_submitted <= end_date),
                        and_(Grade.date_submitted.is_(None), Grade.date_assigned <= end_date),
                    ),
                )
            )
            .order_by(Grade.date_submitted.desc().nullslast())
            .all()
        )

        if grade_records:
            percentages = [g.percentage for g in grade_records]
            report_data["overall_grades"] = GradeSummary(
                total_assignments=len(grade_records),
                average_grade=round(sum(g.grade for g in grade_records) / len(grade_records), 2),
                average_percentage=round(sum(percentages) / len(percentages), 1),
                highest_grade=max(g.grade for g in grade_records),
                lowest_grade=min(g.grade for g in grade_records),
                grade_trend=_calculate_trend(percentages),
            )

    # Get course-specific data
    course_filter = report_request.course_ids if report_request.course_ids else None
    courses_query = db.query(Course).filter(Course.deleted_at.is_(None))

    if course_filter:
        courses_query = courses_query.filter(Course.id.in_(course_filter))

    courses = courses_query.all()

    for course in courses:
        course_summary: dict = {
            "course_id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
            "course_title": course.course_name,
            "performance_categories": [],
        }

        # Course grades
        if report_request.include_grades:
            course_grades = (
                db.query(Grade)
                .filter(
                    Grade.student_id == student.id,
                    Grade.course_id == course.id,
                    Grade.deleted_at.is_(None),
                )
                .filter(
                    and_(
                        or_(
                            and_(Grade.date_submitted.isnot(None), Grade.date_submitted >= start_date),
                            and_(Grade.date_submitted.is_(None), Grade.date_assigned >= start_date),
                        ),
                        or_(
                            and_(Grade.date_submitted.isnot(None), Grade.date_submitted <= end_date),
                            and_(Grade.date_submitted.is_(None), Grade.date_assigned <= end_date),
                        ),
                    )
                )
                .all()
            )

            if course_grades:
                course_percentages = [g.percentage for g in course_grades]
                course_figure = round(sum(course_percentages) / len(course_percentages), 1)
                # Plan todo 83 (the owner, 2026-11-24: "should show averages if not exams grades
                # published yet. otherwise, the real grades should populate"): once the Final Exam
                # is graded the course's figure is its final grade, as on every page; before, the
                # average of the grades in the period, as before.
                final = AnalyticsService(db).calculate_final_grade(student.id, course.id)
                ready = "error" not in final and bool(final.get("final_grade_ready"))
                if ready:
                    course_figure = round(float(final["final_grade"]), 1)
                course_summary["grade_basis"] = "final" if ready else "average"
                course_summary["grade_average"] = round(sum(g.grade for g in course_grades) / len(course_grades), 2)
                course_summary["grade_percentage"] = course_figure
                course_summary["latest_grade"] = course_grades[-1].grade if course_grades else None
                course_summary["grades"] = GradeSummary(
                    total_assignments=len(course_grades),
                    average_grade=round(sum(g.grade for g in course_grades) / len(course_grades), 2),
                    average_percentage=course_figure,
                    highest_grade=max(g.grade for g in course_grades),
                    lowest_grade=min(g.grade for g in course_grades),
                    grade_trend=_calculate_trend(course_percentages),
                )

        # Course attendance
        if report_request.include_attendance:
            course_attendance = (
                db.query(Attendance)
                .filter(
                    Attendance.student_id == student.id,
                    Attendance.course_id == course.id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date,
                    Attendance.deleted_at.is_(None),
                )
                .all()
            )

            if course_attendance:
                total = len(course_attendance)
                course_counts = _status_counts(course_attendance)
                course_summary["attendance_rate"] = _attended_rate(course_counts, total)
                # The absences the ΜΙΕΕΚ limit counts: Absent and Excused, never a Late (until
                # todo 77 every period not Present was counted here, a Late included).
                course_summary["total_absences"] = course_counts["absent"] + course_counts["excused"]
                course_summary["attendance"] = AttendanceSummary(
                    total_days=total,
                    present=course_counts["present"],
                    absent=course_counts["absent"],
                    late=course_counts["late"],
                    excused=course_counts["excused"],
                    attendance_rate=_attended_rate(course_counts, total),
                    unexcused_absences=course_counts["absent"],
                )

        # Daily performance
        if report_request.include_daily_performance:
            performance_records = (
                db.query(DailyPerformance)
                .filter(
                    DailyPerformance.student_id == student.id,
                    DailyPerformance.course_id == course.id,
                    DailyPerformance.date >= start_date,
                    DailyPerformance.date <= end_date,
                    DailyPerformance.deleted_at.is_(None),
                )
                .all()
            )

            # Group by category
            category_data: dict = {}
            for perf in performance_records:
                if perf.category not in category_data:
                    category_data[perf.category] = []
                category_data[perf.category].append(perf)

            for category, records in category_data.items():
                scores = [r.score for r in records]
                percentages = [r.percentage for r in records]
                max_possible = max(r.max_score for r in records)

                perf_summary = PerformanceSummary(
                    category=category,
                    total_entries=len(records),
                    average_score=round(sum(scores) / len(scores), 2),
                    score=round(sum(scores) / len(scores), 2),
                    min_score=min(scores),
                    max_score=max_possible,
                    average_percentage=round(sum(percentages) / len(percentages), 1),
                    trend=_calculate_trend(percentages),
                )
                course_summary["performance_categories"].append(perf_summary)

        # Only add course if it has data
        if any(
            [
                course_summary.get("grade_average"),
                course_summary.get("attendance_rate"),
                course_summary.get("performance_categories"),
            ]
        ):
            report_data["courses"].append(CourseSummary(**course_summary))

    # Plan todo 83: the overall figure counts each course once by its figure (its final grade once
    # ready, else its average), as the Students page and the Profile do; until then it was the plain
    # mean of every grade of the period, a course with many grades weighing more.
    figures = [c.grade_percentage for c in report_data["courses"] if c.grade_percentage is not None]
    if report_data.get("overall_grades") is not None and figures:
        report_data["overall_grades"].average_percentage = round(sum(figures) / len(figures), 1)

    # Get highlights
    if report_request.include_highlights:
        highlights = (
            db.query(Highlight)
            .filter(
                Highlight.student_id == student.id,
                Highlight.date_created >= start_date,
                Highlight.date_created <= end_date,
                Highlight.deleted_at.is_(None),
            )
            .order_by(Highlight.date_created.desc())
            .all()
        )

        for highlight in highlights:
            report_data["highlights"].append(
                HighlightSummary(
                    semester=highlight.semester,
                    rating=highlight.rating,
                    category=highlight.category,
                    text=highlight.highlight_text,
                    is_positive=highlight.is_positive,
                    date_created=highlight.date_created,
                )
            )

    # Generate recommendations
    report_data["recommendations"] = _generate_recommendations(report_data)

    return StudentPerformanceReport(**report_data)


@router.post("/student-performance", response_model=StudentPerformanceReport)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("reports:generate")
def generate_student_performance_report(
    request: Request,
    report_request: PerformanceReportRequest,
    db: Session = Depends(get_session),
):
    """
    Generate comprehensive performance report for a student.

    Includes:
    - Overall attendance and grade summaries
    - Course-by-course breakdown
    - Performance trends
    - Highlights and recommendations

    **Caching**: Reports are cached for 15 minutes
    **Rate limit**: 10 requests per minute
    """
    # Build cache key from request parameters
    cache_key_parts = [
        "student_report",
        str(report_request.student_id),
        report_request.period.value,
        str(report_request.start_date) if report_request.start_date else "none",
        str(report_request.end_date) if report_request.end_date else "none",
        str(report_request.include_attendance),
        str(report_request.include_grades),
        str(report_request.include_daily_performance),
        str(report_request.include_highlights),
        ":".join(str(c) for c in (report_request.course_ids or [])),
    ]
    report_cache_key = cache_key(*cache_key_parts)

    # Try to get from cache
    cached_report = redis_cache.get(report_cache_key)
    if cached_report:
        logger.info(f"Cache HIT: Returning cached report for student {report_request.student_id}")
        return StudentPerformanceReport(**cached_report)

    logger.info(f"Cache MISS: Generating new report for student {report_request.student_id}")

    # Validate student exists
    student = db.query(Student).filter(Student.id == report_request.student_id, Student.deleted_at.is_(None)).first()

    if not student:
        raise HTTPException(status_code=404, detail=get_error_message(ErrorCode.STUDENT_NOT_FOUND, lang="en"))

    # Calculate date range
    start_date, end_date = _calculate_period_dates(
        report_request.period, report_request.start_date, report_request.end_date
    )

    logger.info(
        f"Generating performance report for student {student.id} "
        f"from {start_date} to {end_date} (period={report_request.period.value})"
    )

    # Build report using shared helper
    report_response = _build_student_report(student, report_request, db, start_date, end_date)

    # Cache the result (serialize to dict for storage)
    redis_cache.set(report_cache_key, report_response.model_dump(), CacheConfig.STUDENT_REPORT)
    logger.info(f"Cached report for student {report_request.student_id} with key {report_cache_key}")

    return report_response


@router.post("/student-performance/download")
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("reports:generate")
def download_student_performance_report(
    request: Request,
    report_request: PerformanceReportRequest,
    db: Session = Depends(get_session),
):
    """
    Generate and download student performance report in requested format.

    Supports:
    - JSON: Returns JSON response (default)
    - PDF: Returns PDF file for download
    - CSV: Returns CSV file for download

    **Rate limit**: 10 requests per minute
    """
    # Validate student exists
    student = db.query(Student).filter(Student.id == report_request.student_id, Student.deleted_at.is_(None)).first()

    if not student:
        raise HTTPException(status_code=404, detail=get_error_message(ErrorCode.STUDENT_NOT_FOUND, lang="en"))

    # Calculate date range
    start_date, end_date = _calculate_period_dates(
        report_request.period, report_request.start_date, report_request.end_date
    )

    logger.info(
        f"Generating downloadable report for student {student.id} "
        f"from {start_date} to {end_date} in format {report_request.format.value}"
    )

    # Build report using shared helper (same data as JSON endpoint)
    report_response = _build_student_report(student, report_request, db, start_date, end_date)
    report_data = report_response.model_dump(mode="json")

    # Generate format-specific response
    # Inject course notes into report data if provided
    course_notes = None
    if report_request.course_notes:
        course_notes = report_request.course_notes

    if report_request.format == ReportFormat.PDF:
        try:
            pdf_bytes = generate_pdf_report(report_data, report_request.language, course_notes=course_notes)
            filename = f"student_performance_{student.id}_{start_date}_{end_date}.pdf"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )
        except ImportError as e:
            raise HTTPException(
                status_code=501,
                detail="PDF export not available. Install reportlab: pip install reportlab",
            ) from e

    elif report_request.format == ReportFormat.CSV:
        csv_string = generate_csv_report(report_data, report_request.language, course_notes=course_notes)
        filename = f"student_performance_{student.id}_{start_date}_{end_date}.csv"
        return Response(
            content=csv_string,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    else:  # JSON (default)
        return report_data
