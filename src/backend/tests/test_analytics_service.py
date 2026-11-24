"""
Unit tests for AnalyticsService
Tests core functionality of analytics methods
"""

import pytest
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from backend.services.analytics_service import AnalyticsService
from backend.models import Student, Course, Grade, Attendance, CourseEnrollment


@pytest.fixture
def analytics_service(db: Session):
    """Create AnalyticsService instance for testing."""
    return AnalyticsService(db)


@pytest.fixture
def sample_student(db: Session):
    """Create a sample student for testing."""
    student = Student(
        student_id="STU001",
        first_name="Test",
        last_name="Student",
        email="analytics.test@example.com",
        enrollment_date=(datetime.now() - timedelta(days=180)).date(),
        is_active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@pytest.fixture
def sample_course(db: Session):
    """Create a sample course for testing."""
    course = Course(
        course_code="MATH101",
        course_name="Mathematics 101",
        description="Intro to Math",
        credits=3,
        semester="Fall 2025",
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@pytest.fixture
def sample_enrollment(db: Session, sample_student, sample_course):
    """Create a course enrollment for testing."""
    enrollment = CourseEnrollment(
        student_id=sample_student.id,
        course_id=sample_course.id,
        enrolled_at=date.today(),
    )
    db.add(enrollment)
    db.commit()
    return enrollment


@pytest.fixture
def sample_grades(db: Session, sample_student, sample_course):
    """Create sample grades for testing."""
    grades = []
    base_date = (datetime.now() - timedelta(days=30)).date()

    for i in range(5):
        grade = Grade(
            student_id=sample_student.id,
            course_id=sample_course.id,
            assignment_name=f"Assignment {i + 1}",
            category="Assignment",
            grade=75.0 + (i * 2),  # Improving trend
            max_grade=100.0,
            weight=10.0,
            date_assigned=base_date + timedelta(days=i * 6),
            date_submitted=base_date + timedelta(days=i * 6 + 1),
        )
        db.add(grade)
        grades.append(grade)
    db.commit()
    return grades


@pytest.fixture
def sample_attendance(db: Session, sample_student, sample_course):
    """Create sample attendance records for testing."""
    attendance_records = []
    base_date = (datetime.now() - timedelta(days=30)).date()

    for i in range(10):
        status = "Present" if i % 2 == 0 else "Absent"
        attendance = Attendance(
            student_id=sample_student.id,
            course_id=sample_course.id,
            date=base_date + timedelta(days=i),
            status=status,
        )
        db.add(attendance)
        attendance_records.append(attendance)
    db.commit()
    return attendance_records


# Test: get_student_performance
class TestGetStudentPerformance:
    """Tests for get_student_performance method."""


# Test: get_student_trends
class TestGetStudentTrends:
    """Tests for get_student_trends method."""


class TestGetAttendanceSummary:
    """Tests for get_attendance_summary method."""


# Test: get_grade_distribution
class TestGetGradeDistribution:
    """Tests for get_grade_distribution method."""


# Test: calculate_final_grade (existing method)
class TestCalculateFinalGrade:
    """Tests for calculate_final_grade method."""

    def test_final_grade_calculation(self, analytics_service, db, sample_student, sample_course):
        """Test final grade calculation requires evaluation_rules."""
        # Note: calculate_final_grade requires evaluation_rules in course
        # Our test course doesn't have evaluation_rules - test the error case
        result = analytics_service.calculate_final_grade(sample_student.id, sample_course.id)

        assert "error" in result
        assert result["error"] == "No evaluation rules defined for this course"


# Test: get_student_summary (existing method)
class TestGetStudentSummary:
    """Tests for get_student_summary method."""


# Test: Error Handling
class TestErrorHandling:
    """Tests for error handling in AnalyticsService."""
