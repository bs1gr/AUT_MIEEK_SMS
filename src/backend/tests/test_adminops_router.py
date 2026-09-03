"""Tests for backend.routers.routers_adminops (backup / restore / clear).

Previously untested despite being destructive (restore overwrites the live
database file; clear deletes rows). /adminops/backup and /adminops/restore
bypass the FastAPI DB dependency override entirely - they read
backend.db.engine directly via a module-level import - so the usual
client/db test fixtures do not isolate them from whatever
settings.DATABASE_URL/BACKUPS_DIR actually resolve to in this environment
(which may be a real, non-sqlite database). The isolated_adminops fixture
below monkeypatches routers_adminops.db_engine and .BACKUPS_DIR to a
throwaway sqlite file under pytest's tmp_path before any test touches these
endpoints.
"""

import sqlite3
from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import create_engine

from backend.models import Attendance, Course, CourseEnrollment, Grade, Student
from backend.routers import routers_adminops


def _make_sqlite_db(path: Path, note: str = "source") -> None:
    conn = sqlite3.connect(str(path))
    conn.execute("CREATE TABLE marker (id INTEGER PRIMARY KEY, note TEXT)")
    conn.execute("INSERT INTO marker (note) VALUES (?)", (note,))
    conn.commit()
    conn.close()


@pytest.fixture
def isolated_adminops(tmp_path, monkeypatch):
    db_file = tmp_path / "source.db"
    _make_sqlite_db(db_file, note="source")
    backups_dir = tmp_path / "backups"

    temp_engine = create_engine(f"sqlite:///{db_file}")
    monkeypatch.setattr(routers_adminops, "db_engine", temp_engine)
    monkeypatch.setattr(routers_adminops, "BACKUPS_DIR", str(backups_dir))

    yield {"db_file": db_file, "backups_dir": backups_dir, "tmp_path": tmp_path}

    temp_engine.dispose()


class TestBackup:
    def test_backup_creates_file_with_source_data(self, client, isolated_adminops):
        response = client.post("/api/v1/adminops/backup")
        assert response.status_code == 200, response.text
        data = response.json()

        backup_file = Path(data["backup_file"])
        assert backup_file.exists()
        assert backup_file.parent == isolated_adminops["backups_dir"]

        conn = sqlite3.connect(str(backup_file))
        rows = conn.execute("SELECT note FROM marker").fetchall()
        conn.close()
        assert rows == [("source",)]

    def test_backup_404_when_source_db_missing(self, client, isolated_adminops):
        isolated_adminops["db_file"].unlink()
        response = client.post("/api/v1/adminops/backup")
        assert response.status_code == 404, response.text


class TestRestore:
    def test_restore_replaces_db_and_creates_auto_backup(self, client, isolated_adminops):
        upload_path = isolated_adminops["tmp_path"] / "new_content.db"
        _make_sqlite_db(upload_path, note="restored")

        with open(upload_path, "rb") as f:
            response = client.post(
                "/api/v1/adminops/restore",
                files={"file": ("new_content.db", f, "application/octet-stream")},
            )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "restored"

        conn = sqlite3.connect(str(isolated_adminops["db_file"]))
        rows = conn.execute("SELECT note FROM marker").fetchall()
        conn.close()
        assert rows == [("restored",)]

        auto_backups = list(isolated_adminops["backups_dir"].glob("auto_before_restore_*.db"))
        assert len(auto_backups) == 1, "restore should back up the pre-existing DB before overwriting it"

        conn = sqlite3.connect(str(auto_backups[0]))
        rows = conn.execute("SELECT note FROM marker").fetchall()
        conn.close()
        assert rows == [("source",)], "auto-backup should contain the content that existed before restore"

    def test_restore_without_pre_existing_db_skips_auto_backup(self, client, isolated_adminops):
        isolated_adminops["db_file"].unlink()
        upload_path = isolated_adminops["tmp_path"] / "new_content.db"
        _make_sqlite_db(upload_path, note="restored")

        with open(upload_path, "rb") as f:
            response = client.post(
                "/api/v1/adminops/restore",
                files={"file": ("new_content.db", f, "application/octet-stream")},
            )
        assert response.status_code == 200, response.text
        assert not list(isolated_adminops["backups_dir"].glob("auto_before_restore_*.db"))


class TestClear:
    def test_clear_requires_confirmation(self, client):
        response = client.post("/api/v1/adminops/clear", json={"confirm": False})
        assert response.status_code == 400, response.text

    def test_clear_data_only_keeps_students_and_courses(self, client, db):
        student = Student(first_name="A", last_name="B", email="clear-data-only@example.com", student_id="CLR1")
        course = Course(course_code="CLR101", course_name="Clear Test Course", semester="Fall 2026")
        db.add_all([student, course])
        db.commit()
        db.refresh(student)
        db.refresh(course)

        db.add(
            Grade(
                student_id=student.id,
                course_id=course.id,
                assignment_name="HW1",
                grade=90,
                max_grade=100,
                weight=1.0,
            )
        )
        db.add(Attendance(student_id=student.id, course_id=course.id, date=date.today(), status="Present"))
        db.add(CourseEnrollment(student_id=student.id, course_id=course.id))
        db.commit()

        response = client.post("/api/v1/adminops/clear", json={"confirm": True, "scope": "data_only"})
        assert response.status_code == 200, response.text
        assert response.json() == {"status": "cleared", "scope": "data_only"}

        assert db.query(Grade).count() == 0
        assert db.query(Attendance).count() == 0
        assert db.query(CourseEnrollment).count() == 0
        assert db.query(Student).filter(Student.id == student.id).count() == 1
        assert db.query(Course).filter(Course.id == course.id).count() == 1

    def test_clear_all_removes_students_and_courses(self, client, db):
        student = Student(first_name="C", last_name="D", email="clear-all@example.com", student_id="CLR2")
        course = Course(course_code="CLR102", course_name="Clear Test Course 2", semester="Fall 2026")
        db.add_all([student, course])
        db.commit()

        response = client.post("/api/v1/adminops/clear", json={"confirm": True, "scope": "all"})
        assert response.status_code == 200, response.text
        assert response.json() == {"status": "cleared", "scope": "all"}

        assert db.query(Student).count() == 0
        assert db.query(Course).count() == 0
