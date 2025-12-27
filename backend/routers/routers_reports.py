"""
Reports router for generating student performance and progress reports.

Provides endpoints for:
- Individual student performance reports
- Bulk report generation
- Report download
"""

import csv
import io
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from backend.cache import cache_key, redis_cache, CacheConfig
from backend.db import get_session
from backend.models import Attendance, Course, DailyPerformance, Grade, Highlight, Student
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
from backend.services.report_exporters import generate_pdf_report, generate_csv_report
from backend.schemas import (
    AttendanceSummary,
    BulkReportRequest,
    CourseSummary,
    GradeSummary,
    HighlightSummary,
    PerformanceReportRequest,
    PerformanceSummary,
    ReportFormat,
    ReportPeriod,
    StudentPerformanceReport,
)

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


def _calculate_period_dates(
    period: ReportPeriod, start_date: Optional[date], end_date: Optional[date]
) -> tuple[date, date]:
    """Calculate start and end dates based on period type."""
    today = date.today()

    if period == ReportPeriod.CUSTOM:
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="start_date and end_date required for custom period")
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
    """Generate recommendations based on report data."""
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
            recommendations.append("⚠️ Attendance is below 75%. Regular attendance is crucial for academic success.")
        elif attendance_rate < 85:
            recommendations.append("✓ Attendance could be improved. Aim for 90%+ attendance rate.")

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
            recommendations.append("⚠️ Grades are below passing threshold. Consider scheduling tutoring sessions.")
        elif avg_percentage < 70:
            recommendations.append(
                "✓ Grades need improvement. Review study habits and seek help in challenging subjects."
            )
        elif avg_percentage >= 90:
            recommendations.append("🌟 Excellent academic performance! Keep up the great work.")

        if trend == "declining":
            recommendations.append(
                "⚠️ Grade trend is declining. Review recent assignments and identify areas needing improvement."
            )
        elif trend == "improving":
            recommendations.append("✓ Grade trend is improving. Continue the positive momentum!")

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
        recommendations.append(f"📚 Focus on: {', '.join(course_names)}. Consider extra study time or tutoring.")

    # If no issues found
    if not recommendations:
        recommendations.append("✓ Overall performance is satisfactory. Continue maintaining good study habits.")

    return recommendations


@router.post("/student-performance", response_model=StudentPerformanceReport)
@limiter.limit(RATE_LIMIT_WRITE)
async def generate_student_performance_report(
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
        raise HTTPException(status_code=404, detail="Student not found")

    # Calculate date range
    start_date, end_date = _calculate_period_dates(
        report_request.period, report_request.start_date, report_request.end_date
    )

    logger.info(
        f"Generating performance report for student {student.id} "
        f"from {start_date} to {end_date} (period={report_request.period.value})"
    )

    # Initialize report data
    report_data = {
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
            present = len([a for a in attendance_records if a.status == "Present"])
            absent = len([a for a in attendance_records if a.status == "Absent"])
            late = len([a for a in attendance_records if a.status == "Late"])
            excused = len([a for a in attendance_records if a.status == "Excused"])
            unexcused = absent - excused

            report_data["overall_attendance"] = AttendanceSummary(
                total_days=total_days,
                present=present,
                absent=absent,
                late=late,
                excused=excused,
                attendance_rate=round((present / total_days) * 100, 1) if total_days > 0 else 0,
                unexcused_absences=max(0, unexcused),
            )

    # Get grades summary
    if report_request.include_grades:
        # Use date_submitted or fallback to date_assigned for filtering
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
        course_summary = {
            "course_id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
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
                course_summary["grade_average"] = round(sum(g.grade for g in course_grades) / len(course_grades), 2)
                course_summary["grade_percentage"] = round(
                    sum(g.percentage for g in course_grades) / len(course_grades), 1
                )
                course_summary["latest_grade"] = course_grades[-1].grade if course_grades else None

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
                present_count = len([a for a in course_attendance if a.status == "Present"])
                course_summary["attendance_rate"] = round((present_count / total) * 100, 1) if total > 0 else 0
                course_summary["total_absences"] = total - present_count

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
            category_data = {}
            for perf in performance_records:
                if perf.category not in category_data:
                    category_data[perf.category] = []
                category_data[perf.category].append(perf)

            for category, records in category_data.items():
                scores = [r.score for r in records]
                percentages = [r.percentage for r in records]

                perf_summary = PerformanceSummary(
                    category=category,
                    total_entries=len(records),
                    average_score=round(sum(scores) / len(scores), 2),
                    min_score=min(scores),
                    max_score=max(scores),
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

    # Create response model
    report_response = StudentPerformanceReport(**report_data)

    # Cache the result (serialize to dict for storage)
    redis_cache.set(report_cache_key, report_response.model_dump(), CacheConfig.STUDENT_REPORT)
    logger.info(f"Cached report for student {report_request.student_id} with key {report_cache_key}")

    return report_response


@router.get("/formats", response_model=List[str])
async def get_available_formats():
    """Get list of available report formats."""
    return [format.value for format in ReportFormat]


@router.get("/periods", response_model=List[str])
async def get_available_periods():
    """Get list of available report periods."""
    return [period.value for period in ReportPeriod]


@router.post("/student-performance/download")
@limiter.limit(RATE_LIMIT_WRITE)
async def download_student_performance_report(
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
    # First generate the report data using the existing endpoint logic
    # Validate student exists
    student = db.query(Student).filter(Student.id == report_request.student_id, Student.deleted_at.is_(None)).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Calculate date range
    start_date, end_date = _calculate_period_dates(
        report_request.period, report_request.start_date, report_request.end_date
    )

    logger.info(
        f"Generating downloadable report for student {student.id} "
        f"from {start_date} to {end_date} in format {report_request.format.value}"
    )

    # Generate report data (reuse logic from main endpoint)
    report_data = {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "student_email": student.email,
        "report_period": report_request.period.value,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "overall_attendance": None,
        "overall_grades": None,
        "courses": [],
        "highlights": [],
        "recommendations": [],
    }

    # Get course filter
    course_ids = report_request.course_ids if report_request.course_ids else None

    # Build overall attendance summary
    if report_request.include_attendance:
        att_query = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.date >= start_date,
            Attendance.date <= end_date,
            Attendance.deleted_at.is_(None),
        )
        if course_ids:
            att_query = att_query.filter(Attendance.course_id.in_(course_ids))

        attendances = att_query.all()

        if attendances:
            total_days = len(attendances)
            present = sum(1 for a in attendances if a.status.lower() in ["present", "late"])
            absent = sum(1 for a in attendances if a.status.lower() in ["absent", "excused"])
            unexcused = sum(1 for a in attendances if a.status.lower() == "absent")
            attendance_rate = (present / total_days * 100) if total_days > 0 else 0

            report_data["overall_attendance"] = {
                "total_days": total_days,
                "present": present,
                "absent": absent,
                "attendance_rate": round(attendance_rate, 1),
                "unexcused_absences": unexcused,
            }

    # Build overall grades summary
    if report_request.include_grades:
        grade_query = db.query(Grade).filter(
            Grade.student_id == student.id,
            Grade.date_assigned >= start_date,
            Grade.date_assigned <= end_date,
            Grade.deleted_at.is_(None),
        )
        if course_ids:
            grade_query = grade_query.filter(Grade.course_id.in_(course_ids))

        grades = grade_query.all()

        if grades:
            percentages = [(g.grade / g.max_grade * 100) for g in grades if g.max_grade > 0]
            if percentages:
                avg_percentage = sum(percentages) / len(percentages)
                trend = _calculate_trend(percentages)

                report_data["overall_grades"] = {
                    "total_assignments": len(grades),
                    "average_grade": sum(g.grade for g in grades) / len(grades),
                    "average_percentage": round(avg_percentage, 1),
                    "highest_grade": max(g.grade for g in grades),
                    "lowest_grade": min(g.grade for g in grades),
                    "grade_trend": trend,
                }

    # Get courses for breakdown
    if course_ids:
        courses = db.query(Course).filter(Course.id.in_(course_ids), Course.deleted_at.is_(None)).all()
    else:
        # Get all courses student is enrolled in
        from backend.models import CourseEnrollment

        enrollments = (
            db.query(CourseEnrollment)
            .filter(CourseEnrollment.student_id == student.id, CourseEnrollment.deleted_at.is_(None))
            .all()
        )
        course_ids = [e.course_id for e in enrollments]
        courses = (
            db.query(Course).filter(Course.id.in_(course_ids), Course.deleted_at.is_(None)).all() if course_ids else []
        )

    # Build course summaries (simplified version)
    for course in courses:
        course_data = {
            "course_code": course.code,
            "course_title": course.title,
            "attendance": None,
            "grades": None,
        }

        # Course attendance
        if report_request.include_attendance:
            course_att = [
                a
                for a in db.query(Attendance)
                .filter(
                    Attendance.student_id == student.id,
                    Attendance.course_id == course.id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date,
                    Attendance.deleted_at.is_(None),
                )
                .all()
            ]
            if course_att:
                total = len(course_att)
                present = sum(1 for a in course_att if a.status.lower() in ["present", "late"])
                course_data["attendance"] = {
                    "total_days": total,
                    "present": present,
                    "absent": total - present,
                    "attendance_rate": round((present / total * 100) if total > 0 else 0, 1),
                }

        # Course grades
        if report_request.include_grades:
            course_grades = [
                g
                for g in db.query(Grade)
                .filter(
                    Grade.student_id == student.id,
                    Grade.course_id == course.id,
                    Grade.date_assigned >= start_date,
                    Grade.date_assigned <= end_date,
                    Grade.deleted_at.is_(None),
                )
                .all()
            ]
            if course_grades:
                percentages = [(g.grade / g.max_grade * 100) for g in course_grades if g.max_grade > 0]
                if percentages:
                    course_data["grades"] = {
                        "total_assignments": len(course_grades),
                        "average_percentage": round(sum(percentages) / len(percentages), 1),
                        "grade_trend": _calculate_trend(percentages),
                    }

        report_data["courses"].append(course_data)

    # Add highlights
    if report_request.include_highlights:
        highlights = (
            db.query(Highlight)
            .filter(
                Highlight.student_id == student.id,
                Highlight.date_created >= start_date,
                Highlight.date_created <= end_date,
                Highlight.deleted_at.is_(None),
            )
            .all()
        )

        report_data["highlights"] = [
            {
                "date": str(h.date_created),
                "category": h.category,
                "description": h.highlight_text,
            }
            for h in highlights
        ]

    # Generate recommendations
    report_data["recommendations"] = _generate_recommendations(report_data)

    # Generate format-specific response
    if report_request.format == ReportFormat.PDF:
        try:
            pdf_bytes = generate_pdf_report(report_data)
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
        csv_string = generate_csv_report(report_data)
        filename = f"student_performance_{student.id}_{start_date}_{end_date}.csv"
        return Response(
            content=csv_string,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    else:  # JSON (default)
        return report_data


@router.post("/bulk/student-performance")
@limiter.limit(RATE_LIMIT_WRITE)
async def generate_bulk_student_reports(
    request: Request,
    bulk_request: BulkReportRequest,
    db: Session = Depends(get_session),
):
    """
    Generate performance reports for multiple students at once.

    Returns a list of reports or a downloadable file depending on format.

    **Limitations**:
    - Maximum 50 students per request
    - Rate limit: 10 requests per minute
    - Large requests may take time to process

    **Recommended**: Use for batches of 10-20 students
    """
    # Validate student count
    if len(bulk_request.student_ids) > 50:
        raise HTTPException(
            status_code=400, detail="Maximum 50 students per bulk request. Please split into smaller batches."
        )

    if len(bulk_request.student_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one student ID required")

    logger.info(f"Generating bulk reports for {len(bulk_request.student_ids)} students")

    # Calculate date range
    start_date, end_date = _calculate_period_dates(bulk_request.period, bulk_request.start_date, bulk_request.end_date)

    # Generate reports for each student
    reports = []
    failed_students = []

    for student_id in bulk_request.student_ids:
        try:
            # Check if student exists
            student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()

            if not student:
                failed_students.append({"student_id": student_id, "error": "Student not found"})
                continue

            # Build report data (simplified version)
            report_data = {
                "student_id": student.id,
                "student_name": f"{student.first_name} {student.last_name}",
                "student_email": student.email,
                "report_period": bulk_request.period.value,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "overall_attendance": None,
                "overall_grades": None,
            }

            # Get attendance summary
            if bulk_request.include_attendance:
                att_query = db.query(Attendance).filter(
                    Attendance.student_id == student.id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date,
                    Attendance.deleted_at.is_(None),
                )
                if bulk_request.course_ids:
                    att_query = att_query.filter(Attendance.course_id.in_(bulk_request.course_ids))

                attendances = att_query.all()
                if attendances:
                    total_days = len(attendances)
                    present = sum(1 for a in attendances if a.status.lower() in ["present", "late"])
                    absent = sum(1 for a in attendances if a.status.lower() in ["absent", "excused"])
                    report_data["overall_attendance"] = {
                        "total_days": total_days,
                        "present": present,
                        "absent": absent,
                        "attendance_rate": round((present / total_days * 100) if total_days > 0 else 0, 1),
                    }

            # Get grades summary
            if bulk_request.include_grades:
                grade_query = db.query(Grade).filter(
                    Grade.student_id == student.id,
                    Grade.date_assigned >= start_date,
                    Grade.date_assigned <= end_date,
                    Grade.deleted_at.is_(None),
                )
                if bulk_request.course_ids:
                    grade_query = grade_query.filter(Grade.course_id.in_(bulk_request.course_ids))

                grades = grade_query.all()
                if grades:
                    percentages = [(g.grade / g.max_grade * 100) for g in grades if g.max_grade > 0]
                    if percentages:
                        report_data["overall_grades"] = {
                            "total_assignments": len(grades),
                            "average_percentage": round(sum(percentages) / len(percentages), 1),
                            "grade_trend": _calculate_trend(percentages),
                        }

            reports.append(report_data)

        except Exception as e:
            logger.error(
                "Error generating report for student",
                extra={"student_id": student_id, "error": str(e)},
                exc_info=True,
            )
            failed_students.append({"student_id": student_id, "error": str(e)})

    # Return results based on format
    if bulk_request.format == ReportFormat.CSV:
        # Generate combined CSV for all students
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(["Bulk Student Performance Reports"])
        writer.writerow(["Generated:", date.today().strftime("%Y-%m-%d")])
        writer.writerow(["Period:", bulk_request.period.value])
        writer.writerow(["Date Range:", f"{start_date} to {end_date}"])
        writer.writerow(["Total Students:", len(reports)])
        writer.writerow([])

        # Data headers
        headers = [
            "Student ID",
            "Student Name",
            "Email",
            "Attendance Rate",
            "Present",
            "Absent",
            "Average Grade %",
            "Total Assignments",
            "Grade Trend",
        ]
        writer.writerow(headers)

        # Student data
        for report in reports:
            att = report.get("overall_attendance", {})
            grades = report.get("overall_grades", {})
            writer.writerow(
                [
                    report["student_id"],
                    report["student_name"],
                    report["student_email"],
                    att.get("attendance_rate", "N/A") if att else "N/A",
                    att.get("present", "N/A") if att else "N/A",
                    att.get("absent", "N/A") if att else "N/A",
                    grades.get("average_percentage", "N/A") if grades else "N/A",
                    grades.get("total_assignments", "N/A") if grades else "N/A",
                    grades.get("grade_trend", "N/A") if grades else "N/A",
                ]
            )

        # Failed students section
        if failed_students:
            writer.writerow([])
            writer.writerow(["Failed Students"])
            writer.writerow(["Student ID", "Error"])
            for failed in failed_students:
                writer.writerow([failed["student_id"], failed["error"]])

        csv_string = output.getvalue()
        output.close()

        filename = f"bulk_performance_report_{start_date}_{end_date}.csv"
        return Response(
            content=csv_string,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    else:  # JSON (default)
        return {
            "success": True,
            "total_requested": len(bulk_request.student_ids),
            "total_generated": len(reports),
            "total_failed": len(failed_students),
            "period": bulk_request.period.value,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reports": reports,
            "failed_students": failed_students if failed_students else None,
        }


@router.delete("/cache/{student_id}")
@limiter.limit(RATE_LIMIT_WRITE)
async def invalidate_student_report_cache(
    student_id: int,
    request: Request,
    db: Session = Depends(get_session),
):
    """
    Invalidate all cached reports for a specific student.

    This endpoint should be called when student data is updated
    (grades, attendance, courses, etc.) to ensure fresh reports.

    **Rate limit**: 10 requests per minute
    """
    # Verify student exists
    student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Invalidate all cache entries for this student
    pattern = f"student_report:{student_id}:*"
    count = redis_cache.invalidate_pattern(pattern)

    logger.info(f"Invalidated {count} cached reports for student {student_id}")

    return {
        "success": True,
        "student_id": student_id,
        "invalidated_count": count,
        "message": f"Cleared {count} cached report(s) for student {student_id}",
    }


@router.delete("/cache")
@limiter.limit(RATE_LIMIT_WRITE)
async def invalidate_all_report_caches(request: Request):
    """
    Invalidate all cached student reports.

    Use this when you need to force regeneration of all reports,
    such as after bulk data imports or system-wide changes.

    **Rate limit**: 10 requests per minute
    """
    # Invalidate all report cache entries
    pattern = "student_report:*"
    count = redis_cache.invalidate_pattern(pattern)

    logger.info(f"Invalidated {count} total cached reports")

    return {
        "success": True,
        "invalidated_count": count,
        "message": f"Cleared {count} cached report(s) from the system",
    }
