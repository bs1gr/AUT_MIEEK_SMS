"""API-level tests for the semester archive router."""

from datetime import date

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from backend.models import Course, CourseEnrollment, Grade, SemesterArchiveExport, Student
from backend.routers.routers_auth import optional_require_role

SEMESTER = "API Test Semester 2026"


def _make_passing_pair(db: Session, suffix: str = "1"):
    student = Student(
        student_id=f"STU-API-{suffix}",
        first_name="Api",
        last_name=f"Student{suffix}",
        email=f"api.archive.{suffix}@example.com",
        enrollment_date=date.today(),
        is_active=True,
    )
    course = Course(
        course_code=f"APIC{suffix}",
        course_name=f"API Course {suffix}",
        semester=SEMESTER,
        credits=3,
        evaluation_rules=[{"category": "homework", "weight": 100}],
    )
    db.add(student)
    db.add(course)
    db.commit()
    db.refresh(student)
    db.refresh(course)

    enrollment = CourseEnrollment(student_id=student.id, course_id=course.id, enrolled_at=date.today())
    grade = Grade(
        student_id=student.id,
        course_id=course.id,
        assignment_name="Homework",
        category="homework",
        grade=88.0,
        max_grade=100.0,
    )
    db.add(enrollment)
    db.add(grade)
    db.commit()

    return student, course


def test_list_semesters_includes_seeded_semester(client, db):
    _make_passing_pair(db, "list")

    resp = client.get("/api/v1/semester-archive/semesters")
    assert resp.status_code == 200
    semesters = [row["semester"] for row in resp.json()]
    assert SEMESTER in semesters


def test_preview_reports_eligible_pair(client, db):
    _make_passing_pair(db, "preview")

    resp = client.post("/api/v1/semester-archive/preview", json={"semester": SEMESTER, "pass_threshold": 60.0})
    assert resp.status_code == 200
    body = resp.json()
    assert body["eligible_count"] == 1
    assert body["eligible"][0]["final_grade"] == 88.0


def test_execute_rejects_confirm_text_mismatch(client, db):
    _make_passing_pair(db, "mismatch")

    resp = client.post(
        "/api/v1/semester-archive/execute",
        json={"semester": SEMESTER, "pass_threshold": 60.0, "confirm_text": "wrong-semester-name"},
    )
    assert resp.status_code == 422


def test_execute_archives_and_download_works(client, db, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", tmp_path)

    student, course = _make_passing_pair(db, "exec")

    resp = client.post(
        "/api/v1/semester-archive/execute",
        json={"semester": SEMESTER, "pass_threshold": 60.0, "confirm_text": SEMESTER},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["enrollments_archived"] == 1
    export_id = body["export_id"]

    # Enrollment gone at the DB level, profile untouched.
    assert db.query(CourseEnrollment).filter_by(student_id=student.id, course_id=course.id).first() is None
    refreshed = db.query(Student).filter_by(id=student.id).first()
    assert refreshed is not None

    history_resp = client.get(f"/api/v1/enrollments/student/{student.id}/performance-history")
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) == 1
    assert history[0]["course_code"] == course.course_code

    download_resp = client.get(f"/api/v1/semester-archive/exports/{export_id}/download")
    assert download_resp.status_code == 200
    assert download_resp.content


def test_download_rejects_path_traversal_export_filename(client, db, tmp_path, monkeypatch):
    from backend.services import semester_export_service

    backup_dir = tmp_path / "semester_archives"
    backup_dir.mkdir()
    monkeypatch.setattr(semester_export_service, "SEMESTER_ARCHIVE_DIR", backup_dir)

    # A file that genuinely exists *outside* the configured backup directory,
    # so a 404 here can only come from the is_relative_to guard rejecting the
    # escaped path -- not from a plain "file doesn't exist" check.
    secret_dir = tmp_path / "outside"
    secret_dir.mkdir()
    secret_file = secret_dir / "secret.enc"
    secret_file.write_bytes(b"should never be served")

    export_row = SemesterArchiveExport(
        semester=SEMESTER,
        status="completed",
        export_filename="../outside/secret",
        pass_threshold=60.0,
    )
    db.add(export_row)
    db.commit()
    db.refresh(export_row)

    resp = client.get(f"/api/v1/semester-archive/exports/{export_row.id}/download")
    assert resp.status_code == 404
    assert b"should never be served" not in resp.content


def test_optional_require_role_rejects_wrong_role_when_auth_enabled(monkeypatch):
    from types import SimpleNamespace

    import backend.config as config

    monkeypatch.setattr(config.settings, "AUTH_ENABLED", True)
    monkeypatch.setattr(config.settings, "AUTH_MODE", "permissive")

    dependency = optional_require_role("admin")
    fake_request = Request(scope={"type": "http", "path": "/api/v1/semester-archive/preview", "headers": []})
    teacher_user = SimpleNamespace(id=2, role="teacher")

    try:
        dependency(request=fake_request, user=teacher_user)
        assert False, "expected HTTPException for non-admin role"
    except HTTPException as exc:
        assert exc.status_code == 403
