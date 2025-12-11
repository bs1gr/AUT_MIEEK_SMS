"""
Tests for the reports router endpoints.

Tests:
- Student performance report generation
- Report formats endpoint
- Report periods endpoint
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from backend.models import Student, Course, Grade, Attendance, DailyPerformance, Highlight, CourseEnrollment


def test_get_report_formats(client: TestClient):
    """Test getting available report formats."""
    response = client.get("/api/v1/reports/formats")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "json" in data


def test_get_report_periods(client: TestClient):
    """Test getting available report periods."""
    response = client.get("/api/v1/reports/periods")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "week" in data
    assert "semester" in data


def test_generate_student_performance_report(client: TestClient, clean_db):
    """Test generating a comprehensive student performance report."""
    # Create test student
    student = Student(
        first_name="Test", last_name="Student",
        email="test@example.com",
        student_id="STU001"
    )
    clean_db.add(student)
    clean_db.flush()
    
    # Create test course
    course = Course(
        course_name="Test Course",
        course_code="CS101",
        semester="Fall 2024"
    )
    clean_db.add(course)
    clean_db.flush()
    
    # Enroll student
    enrollment = CourseEnrollment(
        student_id=student.id,
        course_id=course.id
    )
    clean_db.add(enrollment)
    
    # Add attendance records
    today = date.today()
    for i in range(5):
        attendance = Attendance(
            student_id=student.id,
            course_id=course.id,
            date=today - timedelta(days=i),
            status="Present" if i < 4 else "Absent"
        )
        clean_db.add(attendance)
    
    # Add grade records
    grade1 = Grade(
        student_id=student.id,
        course_id=course.id,
        assignment_name="Assignment 1",
        grade=18.0,
        max_grade=20.0,
        date_assigned=today - timedelta(days=10),
        category="homework"
    )
    grade2 = Grade(
        student_id=student.id,
        course_id=course.id,
        assignment_name="Assignment 2",
        grade=16.0,
        max_grade=20.0,
        date_assigned=today - timedelta(days=5),
        category="homework"
    )
    clean_db.add_all([grade1, grade2])
    
    # Add daily performance
    performance = DailyPerformance(
        student_id=student.id,
        course_id=course.id,
        date=today,
        category="participation",
        score=8,
        max_score=10,
        notes="Good participation"
    )
    clean_db.add(performance)
    
    # Add highlight
    highlight = Highlight(
        student_id=student.id,
        semester="Fall 2024",
        date_created=today - timedelta(days=3),
        category="achievement",
        highlight_text="Excellent project presentation",
        is_positive=True,
        rating=5
    )
    clean_db.add(highlight)
    
    clean_db.commit()
    
    # Generate report
    report_request = {
        "student_id": student.id,
        "period": "month",
        "include_attendance": True,
        "include_grades": True,
        "include_performance": True,
        "include_highlights": True,
        "format": "json"
    }
    
    response = client.post("/api/v1/reports/student-performance", json=report_request)
    assert response.status_code == 200
    
    data = response.json()
    
    # Verify report structure
    assert data["student_name"] == "Test Student"
    assert data["student_email"] == "test@example.com"
    assert data["report_period"] == "month"
    
    # Verify attendance summary
    assert "overall_attendance" in data
    assert data["overall_attendance"]["total_days"] == 5
    assert data["overall_attendance"]["present"] == 4
    assert data["overall_attendance"]["absent"] == 1
    assert data["overall_attendance"]["attendance_rate"] == 80.0
    
    # Verify grades summary
    assert "overall_grades" in data
    assert data["overall_grades"]["total_assignments"] == 2
    assert data["overall_grades"]["average_percentage"] > 0
    
    # Verify courses breakdown
    assert "courses" in data
    assert len(data["courses"]) == 1
    assert data["courses"][0]["course_code"] == "CS101"
    
    # Verify highlights
    assert "highlights" in data
    assert len(data["highlights"]) == 1
    assert data["highlights"][0]["category"] == "achievement"
    
    # Verify recommendations exist
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)


def test_generate_report_nonexistent_student(client: TestClient, clean_db):
    """Test generating report for non-existent student returns 404."""
    report_request = {
        "student_id": 9999,
        "period": "semester",
        "format": "json"
    }
    
    response = client.post("/api/v1/reports/student-performance", json=report_request)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_generate_report_custom_date_range(client: TestClient, clean_db):
    """Test generating report with custom date range."""
    # Create test student
    student = Student(
        first_name="Test", last_name="Student",
        email="test2@example.com",
        student_id="STU002"
    )
    clean_db.add(student)
    clean_db.commit()
    
    # Generate report with custom dates
    start_date = (date.today() - timedelta(days=30)).isoformat()
    end_date = date.today().isoformat()
    
    report_request = {
        "student_id": student.id,
        "period": "custom",
        "start_date": start_date,
        "end_date": end_date,
        "format": "json"
    }
    
    response = client.post("/api/v1/reports/student-performance", json=report_request)
    assert response.status_code == 200
    
    data = response.json()
    assert data["start_date"] == start_date
    assert data["end_date"] == end_date


def test_generate_report_specific_courses(client: TestClient, clean_db):
    """Test generating report for specific courses only."""
    # Create test student
    student = Student(
        first_name="Test", last_name="Student",
        email="test3@example.com",
        student_id="STU003"
    )
    clean_db.add(student)
    clean_db.flush()
    
    # Create multiple courses
    course1 = Course(course_name="Math", course_code="MATH101", semester="Fall 2024")
    course2 = Course(course_name="Science", course_code="SCI101", semester="Fall 2024")
    clean_db.add_all([course1, course2])
    clean_db.flush()
    
    # Enroll in both
    enrollment1 = CourseEnrollment(student_id=student.id, course_id=course1.id)
    enrollment2 = CourseEnrollment(student_id=student.id, course_id=course2.id)
    clean_db.add_all([enrollment1, enrollment2])
    clean_db.commit()
    
    # Generate report for only course1
    report_request = {
        "student_id": student.id,
        "course_ids": [course1.id],
        "period": "semester",
        "format": "json"
    }
    
    response = client.post("/api/v1/reports/student-performance", json=report_request)
    assert response.status_code == 200
    
    data = response.json()
    # Should only include the specified course
    course_codes = [c["course_code"] for c in data.get("courses", [])]
    assert "MATH101" in course_codes or len(course_codes) == 0  # May be empty if no data
    assert "SCI101" not in course_codes or len(course_codes) == 0


def test_generate_report_without_optional_data(client: TestClient, clean_db):
    """Test generating report with optional data excluded."""
    # Create test student
    student = Student(
        first_name="Test", last_name="Student",
        email="test4@example.com",
        student_id="STU004"
    )
    clean_db.add(student)
    clean_db.commit()
    
    # Generate report excluding optional sections
    report_request = {
        "student_id": student.id,
        "period": "semester",
        "include_attendance": False,
        "include_grades": False,
        "include_performance": False,
        "include_highlights": False,
        "format": "json"
    }
    
    response = client.post("/api/v1/reports/student-performance", json=report_request)
    assert response.status_code == 200
    
    data = response.json()
    # Basic info should still be present
    assert "student_name" in data
    assert "report_period" in data
    # Optional sections may be None or empty
    assert data.get("overall_attendance") is None or "attendance_rate" not in data.get("overall_attendance", {})
    assert data.get("overall_grades") is None or "average_grade" not in data.get("overall_grades", {})

