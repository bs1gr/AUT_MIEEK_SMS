"""Export data retrieval service - queries for data export endpoints."""

import logging

from sqlalchemy.orm import Session

from backend.import_resolver import import_names

logger = logging.getLogger(__name__)


class ExportService:
    """
    Service for retrieving data for export endpoints.

    Note: This service focuses on data queries only. Export formatting
    (Excel/PDF generation) remains in the router layer as it's tightly
    coupled to presentation libraries (openpyxl, reportlab).
    """

    @staticmethod
    def get_all_students(db: Session, include_inactive: bool = False):
        """
        Get all students for export.

        Args:
            db: Database session
            include_inactive: If True, include soft-deleted students

        Returns:
            List of student records
        """
        (Student,) = import_names("models", "Student")
        query = db.query(Student)
        if not include_inactive:
            query = query.filter(Student.deleted_at.is_(None))
        return query.order_by(Student.last_name, Student.first_name).all()

    @staticmethod
    def get_student_grades_with_course(db: Session, student_id: int):
        """
        Get all grades for a student with course information.

        Args:
            db: Database session
            student_id: Student ID to query

        Returns:
            List of grade records with course relationship loaded
        """
        Grade, Course = import_names("models", "Grade", "Course")
        from sqlalchemy.orm import joinedload

        return (
            db.query(Grade)
            .options(joinedload(Grade.course))
            .filter(Grade.student_id == student_id, Grade.deleted_at.is_(None))
            .order_by(Grade.date_assigned.desc())
            .all()
        )

    @staticmethod
    def get_all_attendance(db: Session):
        """Get all attendance records with student and course relationships."""
        (Attendance,) = import_names("models", "Attendance")
        from sqlalchemy.orm import joinedload

        return (
            db.query(Attendance)
            .options(joinedload(Attendance.student), joinedload(Attendance.course))
            .filter(Attendance.deleted_at.is_(None))
            .order_by(Attendance.date.desc())
            .all()
        )

    @staticmethod
    def get_attendance_analytics(db: Session):
        """
        Get aggregated attendance analytics for export.

        Returns:
            Dictionary with aggregated metrics and records
        """
        (Attendance,) = import_names("models", "Attendance")

        records = (
            db.query(Attendance)
            .filter(Attendance.deleted_at.is_(None))
            .order_by(Attendance.student_id, Attendance.course_id, Attendance.date.desc())
            .all()
        )

        if not records:
            return {
                "total_records": 0,
                "unique_students": 0,
                "unique_courses": 0,
                "date_range": None,
                "status_counts": {},
                "records": [],
            }

        # Calculate aggregates
        student_ids = {r.student_id for r in records}
        course_ids = {r.course_id for r in records}
        dates = [r.date for r in records if r.date]

        status_counts = {}
        for r in records:
            status = r.status or "unknown"
            status_counts[status] = status_counts.get(status, 0) + 1

        date_range = None
        if dates:
            date_range = f"{min(dates)} to {max(dates)}"

        return {
            "total_records": len(records),
            "unique_students": len(student_ids),
            "unique_courses": len(course_ids),
            "date_range": date_range,
            "status_counts": status_counts,
            "records": records,
        }

    @staticmethod
    def get_all_courses(db: Session):
        """Get all courses for export."""
        (Course,) = import_names("models", "Course")
        return db.query(Course).filter(Course.deleted_at.is_(None)).order_by(Course.course_code).all()

    @staticmethod
    def get_all_enrollments(db: Session):
        """Get all enrollments with student and course relationships."""
        (CourseEnrollment,) = import_names("models", "CourseEnrollment")
        from sqlalchemy.orm import joinedload

        return (
            db.query(CourseEnrollment)
            .options(joinedload(CourseEnrollment.student), joinedload(CourseEnrollment.course))
            .order_by(CourseEnrollment.course_id, CourseEnrollment.student_id)
            .all()
        )

    @staticmethod
    def get_all_grades(db: Session):
        """Get all grades with student and course relationships."""
        Grade, Student, Course = import_names("models", "Grade", "Student", "Course")
        from sqlalchemy.orm import joinedload

        return (
            db.query(Grade)
            .options(joinedload(Grade.student), joinedload(Grade.course))
            .filter(Grade.deleted_at.is_(None))
            .order_by(Grade.course_id, Grade.student_id, Grade.date_assigned.desc())
            .all()
        )

    @staticmethod
    def get_all_daily_performance(db: Session):
        """Get all daily performance records with student and course relationships."""
        (DailyPerformance,) = import_names("models", "DailyPerformance")
        from sqlalchemy.orm import joinedload

        return (
            db.query(DailyPerformance)
            .options(joinedload(DailyPerformance.student), joinedload(DailyPerformance.course))
            .order_by(DailyPerformance.date.desc(), DailyPerformance.student_id)
            .all()
        )

    @staticmethod
    def get_all_highlights(db: Session):
        """Get all highlights with student relationship."""
        (Highlight,) = import_names("models", "Highlight")
        from sqlalchemy.orm import joinedload

        return (
            db.query(Highlight)
            .options(joinedload(Highlight.student))
            .filter(Highlight.deleted_at.is_(None))
            .order_by(Highlight.student_id, Highlight.date_created.desc())
            .all()
        )

    @staticmethod
    def get_student_comprehensive_data(db: Session, student_id: int):
        """
        Get comprehensive student data for detailed report.

        Args:
            db: Database session
            student_id: Student ID

        Returns:
            Dictionary with student, grades, attendance, and performance data
        """
        Student, Grade, Attendance, DailyPerformance = import_names(
            "models", "Student", "Grade", "Attendance", "DailyPerformance"
        )
        from sqlalchemy.orm import joinedload

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None

        grades = (
            db.query(Grade)
            .options(joinedload(Grade.course))
            .filter(Grade.student_id == student_id, Grade.deleted_at.is_(None))
            .order_by(Grade.course_id, Grade.date_assigned.desc())
            .all()
        )

        attendance = (
            db.query(Attendance)
            .options(joinedload(Attendance.course))
            .filter(Attendance.student_id == student_id, Attendance.deleted_at.is_(None))
            .order_by(Attendance.date.desc())
            .all()
        )

        performance = (
            db.query(DailyPerformance)
            .options(joinedload(DailyPerformance.course))
            .filter(DailyPerformance.student_id == student_id)
            .order_by(DailyPerformance.date.desc())
            .all()
        )

        return {
            "student": student,
            "grades": grades,
            "attendance": attendance,
            "performance": performance,
        }

    @staticmethod
    def get_course_analytics_data(db: Session, course_id: int):
        """
        Get comprehensive course analytics data.

        Args:
            db: Database session
            course_id: Course ID

        Returns:
            Dictionary with course, enrollments, grades, and statistics
        """
        Course, CourseEnrollment, Grade, Attendance = import_names(
            "models", "Course", "CourseEnrollment", "Grade", "Attendance"
        )
        from sqlalchemy.orm import joinedload

        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return None

        enrollments = (
            db.query(CourseEnrollment)
            .options(joinedload(CourseEnrollment.student))
            .filter(CourseEnrollment.course_id == course_id)
            .all()
        )

        grades = (
            db.query(Grade)
            .options(joinedload(Grade.student))
            .filter(Grade.course_id == course_id, Grade.deleted_at.is_(None))
            .order_by(Grade.student_id, Grade.date_assigned.desc())
            .all()
        )

        # Calculate statistics
        if grades:
            grade_values = [(g.grade / g.max_grade * 100) if g.max_grade > 0 else 0 for g in grades]
            avg_grade = sum(grade_values) / len(grade_values) if grade_values else 0
            highest = max(grade_values) if grade_values else 0
            lowest = min(grade_values) if grade_values else 0
        else:
            avg_grade = highest = lowest = 0

        attendance_records = (
            db.query(Attendance)
            .filter(Attendance.course_id == course_id, Attendance.deleted_at.is_(None))
            .all()
        )

        return {
            "course": course,
            "enrollments": enrollments,
            "grades": grades,
            "attendance": attendance_records,
            "statistics": {
                "total_students": len(enrollments),
                "total_assignments": len(grades),
                "avg_grade": round(avg_grade, 2),
                "highest_grade": round(highest, 2),
                "lowest_grade": round(lowest, 2),
            },
        }
