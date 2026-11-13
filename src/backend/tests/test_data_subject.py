"""Data-subject requests for a student (GDPR Art. 15 and 17): the personal-data export and the
permanent erasure, both for administrators only."""

import json

import pytest

STUDENTS = "/api/v1/students/"
EXPORT = "/api/v1/data-subject/students/{id}/export"
ERASE = "/api/v1/data-subject/students/{id}"


def _headers(db, email: str, role: str) -> dict:
    from backend.models import User
    from backend.routers.routers_auth import create_access_token

    db.add(User(email=email, hashed_password="x", role=role, is_active=True))
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(subject=email, role=role)}"}


@pytest.fixture(autouse=True)
def health_recording_on(monkeypatch):
    """These tests are about an installation that records health information (off by default)."""
    from backend.config import settings

    monkeypatch.setattr(settings, "HEALTH_DATA_ENABLED", True, raising=False)


@pytest.fixture
def strict_auth(monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)


@pytest.fixture
def subject(client):
    """A student with one of everything, plus a second student who must stay untouched."""
    student = client.post(
        STUDENTS,
        json={
            "first_name": "Μαρία",
            "last_name": "Κωνσταντίνου",
            "email": "subject@example.com",
            "student_id": "DS001",
            "health_issue": "Άσθμα",
        },
    ).json()
    other = client.post(
        STUDENTS, json={"first_name": "Other", "last_name": "Student", "email": "other@example.com", "student_id": "DS002"}
    ).json()
    course = client.post(
        "/api/v1/courses/",
        json={"course_code": "DS101", "course_name": "Δίκαιο", "semester": "Fall 2026", "credits": 3},
    ).json()
    enrolled = client.post(
        f"/api/v1/enrollments/course/{course['id']}", json={"student_ids": [student["id"], other["id"]]}
    )
    assert enrolled.status_code == 200, enrolled.text
    for sid in (student["id"], other["id"]):
        grade = client.post(
            "/api/v1/grades/",
            json={
                "student_id": sid,
                "course_id": course["id"],
                "assignment_name": "Quiz 1",
                "category": "Homework",
                "grade": 80.0,
                "max_grade": 100.0,
                "weight": 1.0,
                "date_assigned": "2026-10-01",
                "date_submitted": "2026-10-01",
            },
        )
        assert grade.status_code == 201, grade.text
        attendance = client.post(
            "/api/v1/attendance/",
            json={"student_id": sid, "course_id": course["id"], "date": "2026-10-02", "status": "Absent", "period_number": 1},
        )
        assert attendance.status_code in (200, 201), attendance.text
        assert client.put(f"/api/v1/student-notes/{sid}", json={"text": "a staff note"}).status_code == 200
    return {"id": student["id"], "other": other["id"], "course": course["id"]}


# ---------------------------------------------------------------------------
# Export (access request)
# ---------------------------------------------------------------------------


def test_the_export_holds_everything_about_the_student_and_nobody_else(client, subject):
    resp = client.get(EXPORT.format(id=subject["id"]))

    assert resp.status_code == 200, resp.text
    assert resp.headers["content-disposition"].startswith("attachment; filename=personal_data_DS001_")
    package = json.loads(resp.content.decode("utf-8"))
    assert package["student"]["email"] == "subject@example.com"
    assert package["student"]["health_issue"] == "Άσθμα"
    assert len(package["enrollments"]) == 1
    assert [g["assignment_name"] for g in package["grades"]] == ["Quiz 1"]
    assert package["grades"][0]["course"]["course_code"] == "DS101"
    assert [a["status"] for a in package["attendance"]] == ["Absent"]
    text = resp.content.decode("utf-8")
    assert "other@example.com" not in text
    assert "a staff note" not in text  # staff members' private working notes are not the subject's file


def test_the_export_still_works_for_a_student_who_was_deleted_the_normal_way(client, subject):
    assert client.delete(f"{STUDENTS}{subject['id']}").status_code in (200, 204)
    assert client.get(f"{STUDENTS}{subject['id']}").status_code == 404

    resp = client.get(EXPORT.format(id=subject["id"]))

    assert resp.status_code == 200, resp.text
    package = json.loads(resp.content.decode("utf-8"))
    assert package["student"]["deleted_at"] is not None
    assert len(package["grades"]) == 1  # hidden, but still held


def test_export_of_an_unknown_student_is_a_404(client):
    assert client.get(EXPORT.format(id=987654)).status_code == 404


# ---------------------------------------------------------------------------
# Erasure
# ---------------------------------------------------------------------------


def test_erasure_needs_the_registry_number_typed_exactly(client, subject):
    assert client.delete(ERASE.format(id=subject["id"])).status_code == 422
    assert client.delete(ERASE.format(id=subject["id"]), params={"confirm": "DS002"}).status_code == 400
    assert client.get(f"{STUDENTS}{subject['id']}").status_code == 200


def test_erasure_removes_the_student_and_every_record_and_leaves_others_alone(client, db, subject):
    from backend.models import Attendance, AuditLog, CourseEnrollment, Grade, Student, StudentPrivateNote

    resp = client.delete(ERASE.format(id=subject["id"]), params={"confirm": "DS001"})

    assert resp.status_code == 200, resp.text
    removed = resp.json()["removed"]
    assert (removed["grades"], removed["attendance"], removed["enrollments"], removed["staff_notes"]) == (1, 1, 1, 1)

    def left(model, student_id):
        return (
            db.query(model).execution_options(include_deleted=True).filter(model.student_id == student_id).count()
        )

    for model in (Grade, Attendance, CourseEnrollment, StudentPrivateNote):
        assert left(model, subject["id"]) == 0
        assert left(model, subject["other"]) == 1
    assert db.query(Student).execution_options(include_deleted=True).filter(Student.id == subject["id"]).count() == 0
    assert client.get(f"{STUDENTS}{subject['other']}").status_code == 200
    assert client.get(EXPORT.format(id=subject["id"])).status_code == 404

    # The audit trail no longer carries the person's details.
    entries = db.query(AuditLog).filter(AuditLog.resource == "student", AuditLog.resource_id == str(subject["id"])).all()
    assert entries
    dumped = json.dumps([[e.old_values, e.new_values] for e in entries], ensure_ascii=False, default=str)
    assert "subject@example.com" not in dumped and "Κωνσταντίνου" not in dumped

    # The registry number and e-mail are free again.
    again = client.post(
        STUDENTS, json={"first_name": "New", "last_name": "Person", "email": "subject@example.com", "student_id": "DS001"}
    )
    assert again.status_code == 201, again.text


def test_erasure_also_reaches_a_student_who_was_only_hidden(client, db, subject):
    from backend.models import Grade

    assert client.delete(f"{STUDENTS}{subject['id']}").status_code in (200, 204)

    resp = client.delete(ERASE.format(id=subject["id"]), params={"confirm": "DS001"})

    assert resp.status_code == 200, resp.text
    remaining = (
        db.query(Grade).execution_options(include_deleted=True).filter(Grade.student_id == subject["id"]).count()
    )
    assert remaining == 0


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------


@pytest.mark.auth_required
@pytest.mark.parametrize("role", ["teacher", "staff", "viewer"])
def test_only_an_administrator_may_export_or_erase(client, db, subject, strict_auth, role):
    headers = _headers(db, f"{role}@example.com", role)
    admin = _headers(db, "admin2@example.com", "admin")

    assert client.get(EXPORT.format(id=subject["id"]), headers=headers).status_code == 403
    assert client.delete(ERASE.format(id=subject["id"]), params={"confirm": "DS001"}, headers=headers).status_code == 403
    assert client.get(EXPORT.format(id=subject["id"])).status_code == 401
    assert client.get(f"{STUDENTS}{subject['id']}", headers=admin).status_code == 200  # still there

    assert client.get(EXPORT.format(id=subject["id"]), headers=admin).status_code == 200
    assert client.delete(ERASE.format(id=subject["id"]), params={"confirm": "DS001"}, headers=admin).status_code == 200


def test_the_router_is_registered(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert "get" in paths["/api/v1/data-subject/students/{student_id}/export"]
    assert "delete" in paths["/api/v1/data-subject/students/{student_id}"]
