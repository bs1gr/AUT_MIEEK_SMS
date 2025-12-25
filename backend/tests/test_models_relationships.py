from __future__ import annotations

from datetime import date

from backend.models import (
    Attendance,
    Course,
    CourseEnrollment,
    DailyPerformance,
    Grade,
    Highlight,
    Student,
)
from backend.tests.db_setup import TestingSessionLocal


def test_deleting_student_cascades_related_records():
    session = TestingSessionLocal()
    try:
        course = Course(course_code="MTH101", course_name="Mathematics", semester="Fall")
        student = Student(
            first_name="Ada",
            last_name="Lovelace",
            email="ada@example.com",
            student_id="S-001",
            enrollment_date=date(2024, 9, 1),
        )
        session.add_all([course, student])
        session.commit()

        attendance = Attendance(student=student, course=course, date=date.today(), status="present")
        grade = Grade(
            student=student,
            course=course,
            assignment_name="Midterm",
            grade=85,
            max_grade=100,
            weight=0.5,
        )
        highlight = Highlight(
            student=student,
            semester="Fall",
            highlight_text="Outstanding participation",
            rating=5,
        )
        performance = DailyPerformance(
            student=student,
            course=course,
            date=date.today(),
            category="Participation",
            score=9,
            max_score=10,
        )
        enrollment = CourseEnrollment(student=student, course=course)
        session.add_all([attendance, grade, highlight, performance, enrollment])
        session.commit()

        session.delete(student)
        session.commit()

        assert session.query(Student).count() == 0
        assert session.query(Attendance).count() == 0
        assert session.query(Grade).count() == 0
        assert session.query(Highlight).count() == 0
        assert session.query(DailyPerformance).count() == 0
        assert session.query(CourseEnrollment).count() == 0
        # Course remains unaffected by student deletion
        assert session.query(Course).count() == 1
    finally:
        session.close()


def test_deleting_course_cascades_enrollments_only():
    session = TestingSessionLocal()
    try:
        course = Course(course_code="PHY101", course_name="Physics", semester="Spring")
        student = Student(
            first_name="Grace",
            last_name="Hopper",
            email="grace@example.com",
            student_id="S-002",
            enrollment_date=date(2024, 9, 1),
        )
        enrollment = CourseEnrollment(student=student, course=course)
        session.add_all([course, student, enrollment])
        session.commit()

        session.delete(course)
        session.commit()

        assert session.query(Course).count() == 0
        assert session.query(CourseEnrollment).count() == 0
        # Student should still exist because cascade is limited to enrollments
        assert session.query(Student).count() == 1
    finally:
        session.close()
