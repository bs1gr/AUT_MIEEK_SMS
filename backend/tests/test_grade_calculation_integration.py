"""Integration test for final grade calculation including absence penalties."""
from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def _create_student(payload: dict) -> int:
    resp = client.post("/api/v1/students/", json=payload)
    assert resp.status_code in (200, 201), resp.text
    return int(resp.json()["id"])  # type: ignore[index]


def _create_course(payload: dict) -> int:
    resp = client.post("/api/v1/courses/", json=payload)
    assert resp.status_code in (200, 201), resp.text
    return int(resp.json()["id"])  # type: ignore[index]


def _create_grade(payload: dict) -> int:
    resp = client.post("/api/v1/grades/", json=payload)
    assert resp.status_code in (200, 201), resp.text
    return int(resp.json()["id"])  # type: ignore[index]


def _create_attendance(payload: dict) -> int:
    resp = client.post("/api/v1/attendance/", json=payload)
    assert resp.status_code in (200, 201), resp.text
    return int(resp.json()["id"])  # type: ignore[index]


def test_final_grade_with_absence_penalty():
    # Create student
    student_id = _create_student(
        {
            "first_name": "Alice",
            "last_name": "Smith",
            "email": "alice@example.com",
            "student_id": "S1001",
        }
    )

    # Create course with 100% homework weight and absence penalty 5 per absence
    course_id = _create_course(
        {
            "course_code": "MATH101",
            "course_name": "Math",
            "semester": "Fall 2025",
            "credits": 3,
            "evaluation_rules": [{"category": "Homework", "weight": 100}],
            "absence_penalty": 5.0,
        }
    )

    # Add one homework grade: 90/100
    _ = _create_grade(
        {
            "student_id": student_id,
            "course_id": course_id,
            "assignment_name": "HW1",
            "category": "Homework",
            "grade": 90.0,
            "max_grade": 100.0,
        }
    )

    # Add two absences
    for d in [date(2025, 9, 10), date(2025, 9, 17)]:
        _ = _create_attendance(
            {
                "student_id": student_id,
                "course_id": course_id,
                "date": d.isoformat(),
                "status": "Absent",
                "period_number": 1,
            }
        )

    # Calculate final grade
    resp = client.get(f"/api/v1/analytics/student/{student_id}/course/{course_id}/final-grade")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["final_grade"] == 80.0
    assert data["absence_penalty"] == 5.0
    assert data["unexcused_absences"] == 2
