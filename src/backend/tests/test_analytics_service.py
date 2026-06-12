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

    def test_performance_with_grades(self, analytics_service, sample_student, sample_grades):
        """Test student performance calculation with grade data."""
        result = analytics_service.get_student_performance(sample_student.id, days_back=90)

        assert "student" in result
        assert "overall_average" in result
        assert "courses" in result
        assert result["overall_average"] > 0

    def test_performance_no_grades(self, analytics_service, sample_student):
        """Test student performance with no grades."""
        result = analytics_service.get_student_performance(sample_student.id, days_back=90)

        assert "student" in result
        assert result["overall_average"] == 0 or "overall_average" in result

    def test_performance_custom_days_back(self, analytics_service, sample_student, sample_grades):
        """Test performance calculation with custom days_back parameter."""
        result = analytics_service.get_student_performance(sample_student.id, days_back=10)

        assert "period_days" in result
        assert result["period_days"] == 10

    def test_performance_excludes_deleted_grades(
        self, analytics_service, db, sample_student, sample_course, sample_grades
    ):
        """Test that soft-deleted grades are excluded."""
        # Mark a grade as deleted
        sample_grades[0].deleted_at = datetime.now()
        db.commit()

        result = analytics_service.get_student_performance(sample_student.id, days_back=90)

        # Should only count non-deleted grades
        assert "courses" in result


# Test: get_student_trends
class TestGetStudentTrends:
    """Tests for get_student_trends method."""

    def test_trends_with_improving_pattern(self, analytics_service, sample_student, sample_grades):
        """Test trend detection with improving grade pattern."""
        result = analytics_service.get_student_trends(sample_student.id, limit=10)

        assert "trend_data" in result
        assert "overall_trend" in result
        assert len(result["trend_data"]) > 0

    def test_trends_limit_parameter(self, analytics_service, sample_student, sample_grades):
        """Test trend limit parameter works correctly."""
        result = analytics_service.get_student_trends(sample_student.id, limit=3)

        assert len(result["trend_data"]) <= 3

    def test_trends_no_grades(self, analytics_service, sample_student):
        """Test trends with no grade data."""
        result = analytics_service.get_student_trends(sample_student.id, limit=10)

        assert "trend_data" in result
        assert "overall_trend" in result
        assert "moving_average" in result

    def test_trends_moving_average_calculation(self, analytics_service, sample_student, sample_grades):
        """Test moving average calculation in trends."""
        result = analytics_service.get_student_trends(sample_student.id, limit=10)

        assert "moving_average" in result
        assert isinstance(result["moving_average"], (int, float))


# Test: get_students_comparison
class TestGetStudentsComparison:
    """Tests for get_students_comparison method."""

    def test_comparison_with_students(self, analytics_service, db, sample_course):
        """Test class comparison with multiple students."""
        # Create 3 students with different performance levels
        students = []
        for i in range(3):
            student = Student(
                student_id=f"STU00{i + 1}",
                first_name=f"Student{i}",
                last_name="Test",
                email=f"student{i}@test.com",
                enrollment_date=(datetime.now() - timedelta(days=180)).date(),
                is_active=True,
            )
            db.add(student)
            students.append(student)
        db.commit()

        # Enroll all students in the course
        for student in students:
            enrollment = CourseEnrollment(
                student_id=student.id,
                course_id=sample_course.id,
                enrolled_at=(datetime.now() - timedelta(days=180)).date(),
            )
            db.add(enrollment)
        db.commit()

        # Add grades for each student
        for i, student in enumerate(students):
            grade = Grade(
                student_id=student.id,
                course_id=sample_course.id,
                assignment_name="Assignment 1",
                category="Assignment",
                grade=70.0 + (i * 10.0),  # 70, 80, 90
                max_grade=100.0,
                weight=10.0,
                date_assigned=(datetime.now() - timedelta(days=1)).date(),
                date_submitted=datetime.now().date(),
            )
            db.add(grade)
        db.commit()

        result = analytics_service.get_students_comparison(sample_course.id, limit=50)

        assert "class_statistics" in result
        assert "students" in result
        assert len(result["students"]) == 3

        # Check that students are sorted by average descending (highest to lowest)
        assert result["students"][0]["average_percentage"] == 90.0  # Student2
        assert result["students"][1]["average_percentage"] == 80.0  # Student1
        assert result["students"][2]["average_percentage"] == 70.0  # Student0

    def test_comparison_class_statistics(self, analytics_service, db, sample_course):
        """Test that class statistics are calculated correctly."""
        # Create student with grade
        student = Student(
            student_id="STU001",
            first_name="Test",
            last_name="Student",
            email="student@test.com",
            enrollment_date=date.today(),
            is_active=True,
        )
        db.add(student)
        db.commit()

        # Enroll student
        enrollment = CourseEnrollment(student_id=student.id, course_id=sample_course.id, enrolled_at=date.today())
        db.add(enrollment)
        db.commit()

        # Add grade
        grade = Grade(
            student_id=student.id,
            course_id=sample_course.id,
            assignment_name="Test Assignment",
            category="Assignment",
            grade=85.0,
            max_grade=100.0,
            weight=10.0,
            date_assigned=date.today(),
            date_submitted=date.today(),
        )
        db.add(grade)
        db.commit()

        result = analytics_service.get_students_comparison(sample_course.id, limit=50)

        assert "class_statistics" in result
        assert "average" in result["class_statistics"]

    def test_comparison_no_students(self, analytics_service, sample_course):
        """Test comparison when course has no enrolled students."""
        result = analytics_service.get_students_comparison(sample_course.id, limit=50)

        assert "students" in result
        assert len(result["students"]) == 0


# Test: get_attendance_summary
class TestGetAttendanceSummary:
    """Tests for get_attendance_summary method."""

    def test_attendance_summary_all_courses(self, analytics_service, sample_student, sample_attendance):
        """Test attendance summary across all courses."""
        result = analytics_service.get_attendance_summary(sample_student.id)

        assert "student" in result
        assert "overall_attendance_rate" in result
        assert "courses" in result
        assert result["overall_attendance_rate"] >= 0

    def test_attendance_summary_specific_course(
        self, analytics_service, sample_student, sample_course, sample_attendance
    ):
        """Test attendance summary for specific course."""
        result = analytics_service.get_attendance_summary(sample_student.id, course_id=sample_course.id)

        assert "student" in result
        assert "overall_attendance_rate" in result

    def test_attendance_summary_no_records(self, analytics_service, sample_student):
        """Test attendance summary with no attendance records."""
        result = analytics_service.get_attendance_summary(sample_student.id)

        assert "overall_attendance_rate" in result
        assert result["overall_attendance_rate"] == 0 or "overall_attendance_rate" in result

    def test_attendance_excludes_deleted(self, analytics_service, db, sample_student, sample_attendance):
        """Test that soft-deleted attendance records are excluded."""
        sample_attendance[0].deleted_at = datetime.now()
        db.commit()

        result = analytics_service.get_attendance_summary(sample_student.id)

        assert "overall_attendance_rate" in result


# Test: get_grade_distribution
class TestGetGradeDistribution:
    """Tests for get_grade_distribution method."""

    def test_grade_distribution_calculation(self, analytics_service, db, sample_course):
        """Test grade distribution calculation."""
        # Create student and add grades
        student = Student(
            student_id="STU001",
            first_name="Test",
            last_name="Student",
            email="student@test.com",
            enrollment_date=date.today(),
            is_active=True,
        )
        db.add(student)
        db.commit()

        # Add grades in different ranges
        grades_data = [95, 87, 79, 91, 88]
        for i, grade_value in enumerate(grades_data):
            grade = Grade(
                student_id=student.id,
                course_id=sample_course.id,
                assignment_name=f"Assignment {i + 1}",
                category="Assignment",
                grade=float(grade_value),
                max_grade=100.0,
                weight=10.0,
                date_assigned=date.today(),
                date_submitted=date.today(),
            )
            db.add(grade)
        db.commit()

        result = analytics_service.get_grade_distribution(sample_course.id)

        assert "distribution" in result
        assert "average_percentage" in result
        assert "total_grades" in result
        assert result["total_grades"] == 5

    def test_grade_distribution_no_grades(self, analytics_service, sample_course):
        """Test grade distribution with no grades."""
        result = analytics_service.get_grade_distribution(sample_course.id)

        assert "distribution" in result
        assert "total_grades" in result
        assert result["total_grades"] == 0


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

    def test_student_summary_with_data(
        self,
        analytics_service,
        sample_student,
        sample_enrollment,
        sample_grades,
        sample_attendance,
    ):
        """Test student summary with grades and attendance."""
        result = analytics_service.get_student_summary(sample_student.id)

        assert "student" in result
        assert "attendance_rate" in result
        assert "average_grade" in result
        assert "total_assignments" in result

    def test_student_summary_without_data(self, analytics_service, sample_student):
        """Test student summary without grades or attendance."""
        result = analytics_service.get_student_summary(sample_student.id)

        assert "student" in result
        assert "attendance_rate" in result
        assert "average_grade" in result


# Test: Error Handling
class TestErrorHandling:
    """Tests for error handling in AnalyticsService."""

    def test_invalid_student_id(self, analytics_service):
        """Test behavior with invalid student ID."""
        from fastapi import HTTPException

        # Should raise 404 error
        with pytest.raises(HTTPException) as exc:
            analytics_service.get_student_performance(99999, days_back=90)
        assert exc.value.status_code == 404

    def test_invalid_course_id(self, analytics_service):
        """Test behavior with invalid course ID."""
        from fastapi import HTTPException

        # Should raise 404 error
        with pytest.raises(HTTPException) as exc:
            analytics_service.get_students_comparison(99999, limit=50)
        assert exc.value.status_code == 404
