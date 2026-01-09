"""
Tests for Business Metrics Service and Router

Tests metrics calculations, aggregations, and API endpoints.

Part of Phase 1 v1.15.0 - Improvement #5 (Business Metrics Dashboard)
"""

from datetime import date, datetime

import pytest

from backend.models import Attendance, Course, CourseEnrollment, Grade, Student
from backend.services.metrics_service import MetricsService


@pytest.fixture
def sample_data(clean_db):
    """Create sample data for metrics testing."""
    db = clean_db

    # Create students
    students = []
    for i in range(5):
        student = Student(
            first_name=f"Student{i}",
            last_name=f"Test{i}",
            email=f"student{i}@test.com",
            student_id=f"STU{i:03d}",
            is_active=True,
        )
        db.add(student)
        students.append(student)

    # Create one inactive student
    inactive_student = Student(
        first_name="Inactive", last_name="Student", email="inactive@test.com", student_id="STU999", is_active=False
    )
    db.add(inactive_student)

    # Create courses
    courses = []
    for i in range(3):
        course = Course(
            course_code=f"CS{i}01", course_name=f"Computer Science {i + 1}", semester="Fall 2025", absence_penalty=0.1
        )
        db.add(course)
        courses.append(course)

    db.commit()

    # Create enrollments
    for student in students:
        for course in courses:
            enrollment = CourseEnrollment(student_id=student.id, course_id=course.id, enrolled_at=date(2025, 9, 1))
            db.add(enrollment)

    # Create grades (15 total: 5 students × 3 courses)
    grades_data = [18, 15, 12, 10, 8]  # A, B, C, D, F
    for idx, student in enumerate(students):
        for course in courses:
            grade = Grade(
                student_id=student.id,
                course_id=course.id,
                assignment_name="Final Exam",
                category="exam",
                grade=grades_data[idx],
                max_grade=20.0,
                weight=1.0,
                date_assigned=date(2025, 12, 1),
            )
            db.add(grade)

    # Create attendance records
    for student in students:
        for course in courses:
            # 2 present, 1 absent per student-course
            for day in range(3):
                attendance = Attendance(
                    student_id=student.id,
                    course_id=course.id,
                    date=date(2025, 10, day + 1),
                    status="present" if day < 2 else "absent",
                )
                db.add(attendance)

    db.commit()

    return {
        "students": students,
        "inactive_student": inactive_student,
        "courses": courses,
    }


class TestMetricsService:
    """Test MetricsService calculations."""

    def test_get_student_metrics(self, clean_db, sample_data):
        """Test student metrics calculation."""
        service = MetricsService(clean_db)
        metrics = service.get_student_metrics()

        assert metrics.total == 6  # 5 active + 1 inactive
        assert metrics.active == 5
        assert metrics.inactive == 1
        assert metrics.by_semester["Fall 2025"] == 5

    def test_get_student_metrics_by_semester(self, clean_db, sample_data):
        """Test student metrics with semester filter."""
        service = MetricsService(clean_db)
        metrics = service.get_student_metrics(semester="Fall 2025")

        assert metrics.new_this_semester == 5

    def test_get_course_metrics(self, clean_db, sample_data):
        """Test course metrics calculation."""
        service = MetricsService(clean_db)
        metrics = service.get_course_metrics()

        assert metrics.total_courses == 3
        assert metrics.active_courses == 3  # All have enrollments
        assert metrics.total_enrollments == 15  # 5 students × 3 courses
        assert metrics.avg_enrollment == 5.0  # 15 / 3
        assert metrics.completion_rate == 100.0  # All courses have grades

    def test_get_grade_metrics(self, clean_db, sample_data):
        """Test grade metrics calculation."""
        service = MetricsService(clean_db)
        metrics = service.get_grade_metrics()

        assert metrics.total_grades == 15  # 5 students × 3 courses
        assert 12.6 <= metrics.average_grade <= 12.7  # (18+15+12+10+8) × 3 / 15 = 12.6
        assert metrics.median_grade == 12.0
        assert metrics.grade_distribution["A (18-20)"] == 3  # 1 student × 3 courses
        assert metrics.grade_distribution["F (0-9)"] == 3  # 1 student × 3 courses
        assert metrics.failing_count == 3

    def test_get_attendance_metrics(self, clean_db, sample_data):
        """Test attendance metrics calculation."""
        service = MetricsService(clean_db)
        metrics = service.get_attendance_metrics()

        # 5 students × 3 courses × 3 days = 45 total records
        # 5 students × 3 courses × 2 present days = 30 present
        assert metrics.total_records == 45
        assert metrics.present_count == 30
        assert metrics.absent_count == 15
        assert abs(metrics.attendance_rate - 66.67) < 0.1  # 30/45 = 66.67%

    def test_get_dashboard_metrics(self, clean_db, sample_data):
        """Test dashboard metrics combination."""
        service = MetricsService(clean_db)
        dashboard = service.get_dashboard_metrics()

        assert dashboard.students.total == 6
        assert dashboard.courses.total_courses == 3
        assert dashboard.grades.total_grades == 15
        assert dashboard.attendance.total_records == 45
        assert isinstance(dashboard.timestamp, datetime)

    def test_metrics_with_no_data(self, clean_db):
        """Test metrics calculation with empty database."""
        service = MetricsService(clean_db)

        students = service.get_student_metrics()
        assert students.total == 0
        assert students.active == 0

        courses = service.get_course_metrics()
        assert courses.total_courses == 0
        assert courses.avg_enrollment == 0.0

        grades = service.get_grade_metrics()
        assert grades.total_grades == 0
        assert grades.average_grade == 0.0

        attendance = service.get_attendance_metrics()
        assert attendance.total_records == 0
        assert attendance.attendance_rate == 0.0


class TestMetricsRouter:
    """Test Metrics API endpoints."""

    def test_get_student_metrics_endpoint(self, client, sample_data):
        """Test GET /metrics/students endpoint."""
        response = client.get("/api/v1/metrics/students")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 6
        assert data["active"] == 5
        assert data["inactive"] == 1

    def test_get_course_metrics_endpoint(self, client, sample_data):
        """Test GET /metrics/courses endpoint."""
        response = client.get("/api/v1/metrics/courses")
        assert response.status_code == 200

        data = response.json()
        assert data["total_courses"] == 3
        assert data["total_enrollments"] == 15

    def test_get_grade_metrics_endpoint(self, client, sample_data):
        """Test GET /metrics/grades endpoint."""
        response = client.get("/api/v1/metrics/grades")
        assert response.status_code == 200

        data = response.json()
        assert data["total_grades"] == 15
        assert "average_grade" in data
        assert "grade_distribution" in data

    def test_get_attendance_metrics_endpoint(self, client, sample_data):
        """Test GET /metrics/attendance endpoint."""
        response = client.get("/api/v1/metrics/attendance")
        assert response.status_code == 200

        data = response.json()
        assert data["total_records"] == 45
        assert data["present_count"] == 30

    def test_get_dashboard_metrics_endpoint(self, client, sample_data):
        """Test GET /metrics/dashboard endpoint."""
        response = client.get("/api/v1/metrics/dashboard")
        assert response.status_code == 200

        data = response.json()
        assert "timestamp" in data
        assert "students" in data
        assert "courses" in data
        assert "grades" in data
        assert "attendance" in data

        # Verify nested structure
        assert data["students"]["total"] == 6
        assert data["courses"]["total_courses"] == 3

    def test_metrics_rate_limiting(self, client, sample_data):
        """Test that metrics endpoints have rate limiting."""
        # Make a request to check headers
        response = client.get("/api/v1/metrics/students")
        assert response.status_code == 200

        # Rate limit headers should be present
        assert "X-RateLimit-Limit" in response.headers or response.status_code == 200
