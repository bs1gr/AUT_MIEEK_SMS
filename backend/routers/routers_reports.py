"""
Reports router for generating student performance and progress reports.

Provides endpoints for:
- Individual student performance reports
- Bulk report generation
- Report download
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from backend.db import get_session
from backend.models import Attendance, Course, DailyPerformance, Grade, Highlight, Student
from backend.rate_limiting import RATE_LIMIT_WRITE, limiter
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

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


def _calculate_period_dates(period: ReportPeriod, start_date: Optional[date], end_date: Optional[date]) -> tuple[date, date]:
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
        attendance_rate = report_data["overall_attendance"].get("attendance_rate", 100)
        if attendance_rate < 75:
            recommendations.append("⚠️ Attendance is below 75%. Regular attendance is crucial for academic success.")
        elif attendance_rate < 85:
            recommendations.append("✓ Attendance could be improved. Aim for 90%+ attendance rate.")

    # Check grades
    if report_data.get("overall_grades"):
        avg_percentage = report_data["overall_grades"].get("average_percentage", 100)
        trend = report_data["overall_grades"].get("grade_trend", "stable")

        if avg_percentage < 60:
            recommendations.append("⚠️ Grades are below passing threshold. Consider scheduling tutoring sessions.")
        elif avg_percentage < 70:
            recommendations.append("✓ Grades need improvement. Review study habits and seek help in challenging subjects.")
        elif avg_percentage >= 90:
            recommendations.append("🌟 Excellent academic performance! Keep up the great work.")

        if trend == "declining":
            recommendations.append("⚠️ Grade trend is declining. Review recent assignments and identify areas needing improvement.")
        elif trend == "improving":
            recommendations.append("✓ Grade trend is improving. Continue the positive momentum!")

    # Check course-specific issues
    courses_data = report_data.get("courses", [])
    struggling_courses = [c for c in courses_data if c.get("grade_percentage", 100) < 60]

    if struggling_courses:
        course_names = [c["course_name"] for c in struggling_courses[:3]]
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

    **Rate limit**: 10 requests per minute
    """
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
        grade_records = (
            db.query(Grade)
            .filter(
                Grade.student_id == student.id,
                Grade.deleted_at.is_(None),
            )
            .filter(
                and_(
                    Grade.date_submitted >= start_date if start_date else True,
                    Grade.date_submitted <= end_date if end_date else True,
                )
            )
            .order_by(Grade.date_submitted)
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
                        Grade.date_submitted >= start_date if start_date else True,
                        Grade.date_submitted <= end_date if end_date else True,
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

    return StudentPerformanceReport(**report_data)


@router.get("/formats", response_model=List[str])
async def get_available_formats():
    """Get list of available report formats."""
    return [format.value for format in ReportFormat]


@router.get("/periods", response_model=List[str])
async def get_available_periods():
    """Get list of available report periods."""
    return [period.value for period in ReportPeriod]
