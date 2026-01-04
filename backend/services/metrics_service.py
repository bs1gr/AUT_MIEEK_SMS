"""
Business Metrics Service for Student Management System

Provides analytics and metrics calculation for business intelligence.

Part of Phase 1 v1.15.0 - Improvement #5 (Business Metrics Dashboard)
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.models import Attendance, Course, CourseEnrollment, Grade, Student
from backend.schemas.metrics import (
    AttendanceMetrics,
    CourseMetrics,
    DashboardMetrics,
    GradeMetrics,
    StudentMetrics,
)


class MetricsService:
    """
    Service for calculating business metrics and analytics.

    All metrics calculations are optimized with aggregation queries
    to minimize database load and response time.
    """

    def __init__(self, db: Session):
        """
        Initialize metrics service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def get_student_metrics(self, semester: Optional[str] = None) -> StudentMetrics:
        """
        Calculate student population metrics.

        Args:
            semester: Optional semester filter (e.g., "Fall 2025")

        Returns:
            StudentMetrics with population breakdown
        """
        # Total students (including soft-deleted)
        total = self.db.query(func.count(Student.id)).scalar() or 0

        # Active students (not soft-deleted)
        active = (
            self.db.query(func.count(Student.id))
            .filter(Student.is_active == True)  # noqa: E712
            .scalar()
            or 0
        )

        inactive = total - active

        # Students enrolled in current semester
        if semester:
            new_this_semester = (
                self.db.query(func.count(func.distinct(CourseEnrollment.student_id)))
                .join(Course)
                .filter(Course.semester == semester)
                .scalar()
                or 0
            )
        else:
            # Default to most recent semester
            new_this_semester = 0

        # Students by semester
        by_semester_raw = (
            self.db.query(Course.semester, func.count(func.distinct(CourseEnrollment.student_id)))
            .join(CourseEnrollment)
            .group_by(Course.semester)
            .all()
        )
        by_semester = {semester: count for semester, count in by_semester_raw if semester}

        return StudentMetrics(
            total=total,
            active=active,
            inactive=inactive,
            new_this_semester=new_this_semester,
            by_semester=by_semester,
        )

    def get_course_metrics(self) -> CourseMetrics:
        """
        Calculate course enrollment and completion metrics.

        Returns:
            CourseMetrics with enrollment statistics
        """
        # Total courses
        total_courses = self.db.query(func.count(Course.id)).scalar() or 0

        # Courses with enrollments
        active_courses = self.db.query(func.count(func.distinct(CourseEnrollment.course_id))).scalar() or 0

        # Total enrollments
        total_enrollments = self.db.query(func.count(CourseEnrollment.id)).scalar() or 0

        # Average enrollment per course
        avg_enrollment = total_enrollments / active_courses if active_courses > 0 else 0.0

        # Completion rate (courses with grades / total courses)
        courses_with_grades = self.db.query(func.count(func.distinct(Grade.course_id))).scalar() or 0
        completion_rate = (courses_with_grades / total_courses * 100) if total_courses > 0 else 0.0

        return CourseMetrics(
            total_courses=total_courses,
            active_courses=active_courses,
            total_enrollments=total_enrollments,
            avg_enrollment=round(avg_enrollment, 2),
            completion_rate=round(completion_rate, 2),
        )

    def get_grade_metrics(self) -> GradeMetrics:
        """
        Calculate grade distribution and performance metrics.

        Returns:
            GradeMetrics with distribution analysis
        """
        # Total grades
        total_grades = self.db.query(func.count(Grade.id)).scalar() or 0

        if total_grades == 0:
            return GradeMetrics(
                total_grades=0,
                average_grade=0.0,
                median_grade=0.0,
                grade_distribution={},
                gpa_distribution={},
                failing_count=0,
            )

        # Average grade
        average_grade = self.db.query(func.avg(Grade.grade)).scalar() or 0.0

        # Get all grades for median and distribution calculation
        all_grades = [g[0] for g in self.db.query(Grade.grade).filter(Grade.grade.isnot(None)).all()]

        # Median grade
        if all_grades:
            sorted_grades = sorted(all_grades)
            n = len(sorted_grades)
            median_grade = (
                sorted_grades[n // 2] if n % 2 != 0 else (sorted_grades[n // 2 - 1] + sorted_grades[n // 2]) / 2
            )
        else:
            median_grade = 0.0

        # Grade distribution (Greek 0-20 scale)
        grade_distribution = {
            "A (18-20)": sum(1 for g in all_grades if 18 <= g <= 20),
            "B (15-17)": sum(1 for g in all_grades if 15 <= g < 18),
            "C (12-14)": sum(1 for g in all_grades if 12 <= g < 15),
            "D (10-11)": sum(1 for g in all_grades if 10 <= g < 12),
            "F (0-9)": sum(1 for g in all_grades if 0 <= g < 10),
        }

        # Failing count (< 10 in Greek scale)
        failing_count = grade_distribution["F (0-9)"]

        # GPA distribution (simplified - would need actual GPA calculations)
        gpa_distribution = {
            "4.0": grade_distribution["A (18-20)"],
            "3.0-3.9": grade_distribution["B (15-17)"],
            "2.0-2.9": grade_distribution["C (12-14)"],
            "1.0-1.9": grade_distribution["D (10-11)"],
            "<1.0": grade_distribution["F (0-9)"],
        }

        return GradeMetrics(
            total_grades=total_grades,
            average_grade=round(average_grade, 2),
            median_grade=round(median_grade, 2),
            grade_distribution=grade_distribution,
            gpa_distribution=gpa_distribution,
            failing_count=failing_count,
        )

    def get_attendance_metrics(self) -> AttendanceMetrics:
        """
        Calculate attendance tracking and compliance metrics.

        Returns:
            AttendanceMetrics with attendance rates
        """
        # Total attendance records
        total_records = self.db.query(func.count(Attendance.id)).scalar() or 0

        if total_records == 0:
            return AttendanceMetrics(
                total_records=0,
                present_count=0,
                absent_count=0,
                attendance_rate=0.0,
                by_course={},
                by_date={},
            )

        # Present/absent counts
        present_count = self.db.query(func.count(Attendance.id)).filter(Attendance.status == "present").scalar() or 0
        absent_count = total_records - present_count

        # Overall attendance rate
        attendance_rate = (present_count / total_records * 100) if total_records > 0 else 0.0

        # Attendance by course
        by_course_raw = (
            self.db.query(
                Course.course_code,
                func.count(Attendance.id).label("total"),
                func.sum(case((Attendance.status == "present", 1), else_=0)).label("present"),
            )
            .join(Course)
            .group_by(Course.course_code)
            .all()
        )
        by_course = {
            code: round((present / total * 100), 2) if total > 0 else 0.0 for code, total, present in by_course_raw
        }

        # Attendance by date (last 7 days)
        by_date_raw = (
            self.db.query(
                Attendance.date,
                func.count(Attendance.id).label("total"),
                func.sum(case((Attendance.status == "present", 1), else_=0)).label("present"),
            )
            .group_by(Attendance.date)
            .order_by(Attendance.date.desc())
            .limit(7)
            .all()
        )
        by_date = {
            date.isoformat(): round((present / total * 100), 2) if total > 0 else 0.0
            for date, total, present in by_date_raw
            if date
        }

        return AttendanceMetrics(
            total_records=total_records,
            present_count=present_count,
            absent_count=absent_count,
            attendance_rate=round(attendance_rate, 2),
            by_course=by_course,
            by_date=by_date,
        )

    def get_dashboard_metrics(self) -> DashboardMetrics:
        """
        Get comprehensive dashboard metrics for executive overview.

        Returns:
            DashboardMetrics with all metrics combined
        """
        return DashboardMetrics(
            timestamp=datetime.now(timezone.utc),
            students=self.get_student_metrics(),
            courses=self.get_course_metrics(),
            grades=self.get_grade_metrics(),
            attendance=self.get_attendance_metrics(),
        )
