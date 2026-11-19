"""A semester's session file is the teacher's too, and a grade is known by its category as well.

Two things the owner asked to have finished on 19 November 2026, both left open by the work of
the day before:

1. *Teachers and the session file.* "Who may import: both teachers and admins" was read on 18
   November as the import of students and courses; the session file of a semester (export,
   import, the list of the backups made before an import) stayed with the administrator. The
   role teacher now holds ``sessions:manage``: the seed gives it in a new database, migration
   ``9c41f7e2a6d3`` in an existing one. Two things stay the administrator's: returning the
   whole database to a backup (``POST /sessions/rollback`` asks for ``adminops:restore`` now,
   as every other restore does), and students' health information (a file imported by a
   teacher is imported without it).
2. *What identifies a grade.* The session import, and the older import of the Control Panel,
   took student, course and assignment name. The same assignment is kept under two categories
   on purpose, and those two grades were one record to both: with "update" the second
   overwrote the first. The category is part of what identifies a grade now.
"""

# The fixtures old_database and strict_auth are imported from test_two_roles_model: a test that
# takes one as an argument is not redefining it.
# ruff: noqa: F811

import json

import pandas as pd
import pytest
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from backend import models
from backend.tests.test_two_roles_model import REVISION as TWO_ROLES
from backend.tests.test_two_roles_model import (  # noqa: F401
    _fill_as_the_version_before,
    _headers,
    _state,
    old_database,
    strict_auth,
)

REVISION = "9c41f7e2a6d3"
SESSION = "sessions:manage"
SEMESTER = "Fall 2026"


# --- the grant in an existing database ------------------------------------------------------------


def test_the_migration_gives_teachers_the_session_file_and_changes_nothing_else(old_database):
    from alembic import command

    cfg, engine = old_database
    _fill_as_the_version_before(engine)
    command.upgrade(cfg, TWO_ROLES)
    before = _state(engine)
    assert SESSION not in before["held"]["teacher"] and SESSION not in before["held"]["admin"]

    command.upgrade(cfg, REVISION)
    after = _state(engine)

    assert after["held"]["teacher"] == before["held"]["teacher"] | {SESSION}
    assert after["held"]["admin"] == before["held"]["admin"] | {SESSION}
    for part in ("words", "rows", "roles", "permissions", "direct", "orphans"):
        assert after[part] == before[part], part


def test_the_migration_can_be_taken_back_and_run_again(old_database):
    from alembic import command

    cfg, engine = old_database
    _fill_as_the_version_before(engine)
    command.upgrade(cfg, REVISION)
    upgraded = _state(engine)

    command.downgrade(cfg, TWO_ROLES)
    back = _state(engine)

    assert SESSION not in back["held"]["teacher"]
    # The administrator's stays: the wildcard opens the same.
    assert SESSION in back["held"]["admin"]
    assert back["permissions"] == upgraded["permissions"]

    command.upgrade(cfg, REVISION)
    assert _state(engine) == upgraded


def test_a_database_that_lacks_the_permission_gets_it_with_the_grant(old_database):
    from alembic import command

    cfg, engine = old_database
    _fill_as_the_version_before(engine)
    command.upgrade(cfg, TWO_ROLES)
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM permissions WHERE key = 'sessions:manage'"))

    command.upgrade(cfg, REVISION)
    after = _state(engine)

    assert SESSION in after["permissions"]
    assert SESSION in after["held"]["teacher"]
    assert after["orphans"] == 0


def test_the_migration_leaves_a_database_without_roles_to_the_seed(old_database):
    from alembic import command

    cfg, engine = old_database
    with sessionmaker(bind=engine)() as db:
        db.add(models.User(email="head@example.com", hashed_password="x", role="admin", is_active=True))
        db.commit()

    command.upgrade(cfg, REVISION)
    after = _state(engine)

    assert (after["roles"], after["permissions"], after["held"]) == (set(), set(), {})


# --- what a teacher may do with it ----------------------------------------------------------------


def _package(**parts) -> dict:
    package = {
        "metadata": {"semester": SEMESTER},
        "courses": [{"course_code": "TSF101", "course_name": "Course", "semester": SEMESTER, "credits": 3}],
        "students": [{"first_name": "Anna", "last_name": "Beta", "email": "tsf1@example.com", "student_id": "TSF001"}],
        "enrollments": [{"student_id_ref": "TSF001", "course_code_ref": "TSF101", "enrolled_at": "2026-09-01"}],
        "grades": [],
        "attendance": [],
        "daily_performance": [],
        "highlights": [],
    }
    package.update(parts)
    return package


def _grade(category, value: float, name: str = "Project") -> dict:
    row = {
        "student_id_ref": "TSF001",
        "course_code_ref": "TSF101",
        "assignment_name": name,
        "grade": value,
        "max_grade": 100.0,
        "weight": 1.0,
        "date_assigned": "2026-10-01",
    }
    if category is not ...:
        row["category"] = category
    return row


def _import(client, package: dict, headers=None, **params):
    files = {"file": ("session.json", json.dumps(package).encode("utf-8"), "application/json")}
    return client.post("/api/v1/sessions/import", params=params, files=files, headers=headers)


def _grades_of(response) -> dict:
    body = response.json()
    summary = body.get("summary") or body.get("data", {}).get("summary") or {}
    return summary.get("grades", {})


def _stored(db) -> list[tuple]:
    db.expire_all()
    rows = db.query(models.Grade).filter(models.Grade.deleted_at.is_(None)).order_by(models.Grade.id).all()
    return [(row.assignment_name, row.category, row.grade) for row in rows]


@pytest.mark.auth_required
def test_a_teacher_exports_and_imports_a_semester(client, db, strict_auth) -> None:
    teacher = _headers(db, "teacher@example.com", "teacher")

    tried = _import(client, _package(), headers=teacher, dry_run="true")
    assert tried.status_code == 200, tried.text
    done = _import(client, _package(grades=[_grade("Midterm Exam", 70.0)]), headers=teacher)
    assert done.status_code == 200, done.text

    assert client.get("/api/v1/sessions/semesters", headers=teacher).status_code == 200
    exported = client.get("/api/v1/sessions/export", params={"semester": SEMESTER}, headers=teacher)
    assert exported.status_code == 200, exported.text
    package = json.loads(exported.content.decode("utf-8"))
    assert [row["student_id"] for row in package["students"]] == ["TSF001"]
    assert [(row["assignment_name"], row["category"]) for row in package["grades"]] == [("Project", "Midterm Exam")]
    assert client.get("/api/v1/sessions/backups", headers=teacher).status_code == 200


@pytest.mark.auth_required
def test_returning_the_database_to_a_backup_stays_with_the_administrator(client, db, strict_auth) -> None:
    teacher = _headers(db, "teacher@example.com", "teacher")
    admin = _headers(db, "head@example.com", "admin")
    backup = {"backup_filename": "no_such_backup.db"}

    assert client.post("/api/v1/sessions/rollback", params=backup, headers=teacher).status_code == 403
    # The administrator passes the check; the file is simply not there.
    assert client.post("/api/v1/sessions/rollback", params=backup, headers=admin).status_code == 404


@pytest.mark.auth_required
def test_an_account_without_a_role_gets_none_of_it(client, db, strict_auth) -> None:
    nobody = _headers(db, "former@example.com", "none")

    assert client.get("/api/v1/sessions/semesters", headers=nobody).status_code == 403
    assert client.get("/api/v1/sessions/export", params={"semester": SEMESTER}, headers=nobody).status_code == 403
    assert _import(client, _package(), headers=nobody).status_code == 403


@pytest.mark.auth_required
def test_a_file_imported_by_a_teacher_stores_no_health_information(client, db, strict_auth, monkeypatch) -> None:
    from backend.config import settings

    monkeypatch.setattr(settings, "HEALTH_DATA_ENABLED", True, raising=False)
    teacher = _headers(db, "teacher@example.com", "teacher")
    admin = _headers(db, "head@example.com", "admin")
    with_health = _package()
    with_health["students"][0]["health_issue"] = "Άσθμα"

    def stored():
        db.expire_all()
        return db.query(models.Student).filter(models.Student.student_id == "TSF001").one().health_issue

    assert _import(client, with_health, headers=teacher).status_code == 200
    assert stored() is None

    # Recording is on and the account is an administrator's: stored, as before.
    assert _import(client, with_health, headers=admin).status_code == 200
    assert stored() == "Άσθμα"

    # And a teacher's later import of a file with another text leaves it as it is.
    with_health["students"][0]["health_issue"] = "something else"
    assert _import(client, with_health, headers=teacher).status_code == 200
    assert stored() == "Άσθμα"


# --- what identifies a grade ----------------------------------------------------------------------


def test_two_grades_of_one_assignment_in_two_categories_stay_two(client, db):
    first = _import(client, _package(grades=[_grade("Midterm Exam", 60.0), _grade("Final Exam", 80.0)]))
    assert first.status_code == 200, first.text
    assert _grades_of(first)["created"] == 2
    assert _stored(db) == [("Project", "Midterm Exam", 60.0), ("Project", "Final Exam", 80.0)]

    # The same file again with other marks, "update": each grade gets its own. It used to find
    # the first record for both rows: that one ended as "Final Exam, 81" and the other kept 80.
    again = _import(client, _package(grades=[_grade("Midterm Exam", 61.0), _grade("Final Exam", 81.0)]))
    assert again.status_code == 200, again.text
    assert (_grades_of(again)["created"], _grades_of(again)["updated"]) == (0, 2)
    assert _stored(db) == [("Project", "Midterm Exam", 61.0), ("Project", "Final Exam", 81.0)]


def test_skip_leaves_both_alone_and_adds_the_grade_of_a_third_category(client, db):
    assert (
        _import(client, _package(grades=[_grade("Midterm Exam", 60.0), _grade("Final Exam", 80.0)])).status_code == 200
    )

    rows = [_grade("Midterm Exam", 1.0), _grade("Final Exam", 2.0), _grade("Homework", 90.0)]
    skipped = _import(client, _package(grades=rows), merge_strategy="skip")

    assert skipped.status_code == 200, skipped.text
    counts = _grades_of(skipped)
    assert (counts["created"], counts["skipped"], counts["updated"]) == (1, 2, 0)
    assert _stored(db) == [
        ("Project", "Midterm Exam", 60.0),
        ("Project", "Final Exam", 80.0),
        ("Project", "Homework", 90.0),
    ]


@pytest.mark.parametrize("empty", [None, "", "  ", ...], ids=["null", "empty", "spaces", "left out"])
def test_a_grade_without_a_category_is_found_again_without_one(client, db, empty):
    assert _import(client, _package(grades=[_grade(None, 50.0)])).status_code == 200

    again = _import(client, _package(grades=[_grade(empty, 55.0)]))

    assert again.status_code == 200, again.text
    assert (_grades_of(again)["created"], _grades_of(again)["updated"]) == (0, 1)
    assert [(name, grade) for name, _category, grade in _stored(db)] == [("Project", 55.0)]


def test_a_deleted_grade_is_not_the_one_a_row_stands_for(client, db):
    assert _import(client, _package(grades=[_grade("Homework", 40.0)])).status_code == 200
    db.expire_all()
    db.query(models.Grade).one().mark_deleted()
    db.commit()

    again = _import(client, _package(grades=[_grade("Homework", 45.0)]))

    assert _grades_of(again)["created"] == 1
    assert _stored(db) == [("Project", "Homework", 45.0)]


def test_the_older_import_of_the_control_panel_knows_a_grade_by_its_category_too(client, db):
    from backend.services.import_export_service import ImportExportService

    assert (
        _import(client, _package(grades=[_grade("Midterm Exam", 60.0), _grade("Final Exam", 80.0)])).status_code == 200
    )
    rows = pd.DataFrame(
        [
            {
                "student_id": "TSF001",
                "course_code": "TSF101",
                "assignment": "Project",
                "category": "Final Exam",
                "grade": 85,
            },
            {
                "student_id": "TSF001",
                "course_code": "TSF101",
                "assignment": "Project",
                "category": "Homework",
                "grade": 95,
            },
        ]
    )

    ImportExportService()._import_grades(db, rows)
    db.commit()

    # It used to take the first record of that name, the midterm, and make it "Final Exam, 85".
    assert _stored(db) == [
        ("Project", "Midterm Exam", 60.0),
        ("Project", "Final Exam", 85.0),
        ("Project", "Homework", 95.0),
    ]
