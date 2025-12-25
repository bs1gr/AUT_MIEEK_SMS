import json
from datetime import date

from backend import models
from backend.tests.db_setup import TestingSessionLocal


def test_import_students_reactivates_soft_deleted_record(client, tmp_path, monkeypatch):
    session = TestingSessionLocal()
    student = models.Student(
        first_name="Archived",  # type: ignore[arg-type]
        last_name="Student",  # type: ignore[arg-type]
        email="archived@example.com",  # type: ignore[arg-type]
        student_id="S123",  # type: ignore[arg-type]
        enrollment_date=date(2024, 9, 1),  # type: ignore[arg-type]
    )
    session.add(student)
    session.commit()
    student.mark_deleted()
    session.commit()
    session.close()

    payload = [
        {
            "first_name": "Restored",
            "last_name": "Student",
            "email": "archived@example.com",
            "student_id": "S123",
            "is_active": True,
        }
    ]
    students_file = tmp_path / "students.json"
    students_file.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr("backend.routers.routers_imports.STUDENTS_DIR", str(tmp_path))

    response = client.post("/api/v1/imports/students")
    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 1

    session = TestingSessionLocal()
    restored = session.query(models.Student).filter_by(student_id="S123").one()
    assert restored.deleted_at is None
    assert restored.first_name == "Restored"
    session.close()


def test_import_courses_reactivates_soft_deleted_record(client, tmp_path, monkeypatch):
    session = TestingSessionLocal()
    course = models.Course(
        course_code="CS101",  # type: ignore[arg-type]
        course_name="Archived Course",  # type: ignore[arg-type]
        semester="Fall 2024",  # type: ignore[arg-type]
        credits=3,  # type: ignore[arg-type]
    )
    session.add(course)
    session.commit()
    course.mark_deleted()
    session.commit()
    session.close()

    payload = [
        {
            "course_code": "CS101",
            "course_name": "Restored Course",
            "semester": "Fall 2024",
            "credits": 4,
            "description": "Updated description",
        }
    ]
    courses_file = tmp_path / "courses.json"
    courses_file.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr("backend.routers.routers_imports.COURSES_DIR", str(tmp_path))

    response = client.post("/api/v1/imports/courses")
    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 1

    session = TestingSessionLocal()
    restored = session.query(models.Course).filter_by(course_code="CS101").one()
    assert restored.deleted_at is None
    assert restored.course_name == "Restored Course"
    assert restored.credits == 4
    session.close()
