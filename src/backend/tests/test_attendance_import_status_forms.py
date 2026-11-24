"""A semester file's attendance statuses are stored as the API writes them (plan todo 78, point 1).

Every page and the API take only "Present", "Absent", "Late" and "Excused", and the Attendance
page compares the word as written. The semester import stored whatever the file said: a "late"
counted as a Late in the server's figures and as nothing on the Attendance page, "Late " counted
on some pages and not on others, a "Tardy" counted nowhere, an empty status was stored as one,
and a null one failed the whole import when it was written. The import now stores one of the
four forms whatever the case and spacing, and lists any other word among its errors instead of
storing it. A row with no status field is still a Present.
"""

from datetime import date

import pytest

from backend.services import absence_limit_service

DAY = str(date.today())


def _results() -> dict:
    return {"summary": {"attendance": {"created": 0, "updated": 0, "skipped": 0, "errors": []}}}


@pytest.fixture
def slot(db):
    """A student and a course the file names, and the reference fields of one period."""
    from backend.models import Course, Student

    student = Student(student_id="STF001", email="stf001@example.com", first_name="Status", last_name="Form")
    course = Course(course_code="STF101", course_name="Status course", semester="Fall 2026", credits=3)
    db.add_all([student, course])
    db.flush()
    return {"student_id_ref": "STF001", "course_code_ref": "STF101", "date": DAY}, student.id


def _stored(db, student_id: int) -> dict[int, str]:
    from backend.models import Attendance

    rows = db.query(Attendance).filter(Attendance.student_id == student_id, Attendance.deleted_at.is_(None)).all()
    return {row.period_number: row.status for row in rows}


@pytest.mark.parametrize(
    ("written", "stored"),
    [
        ("late", "Late"),
        ("LATE", "Late"),
        ("Late ", "Late"),
        ("  absent", "Absent"),
        ("excused", "Excused"),
        ("present", "Present"),
        ("Present", "Present"),
    ],
)
def test_a_status_in_any_case_or_spacing_is_stored_as_the_api_writes_it(db, slot, written, stored):
    from backend.routers.routers_sessions import _import_attendance

    refs, student_id = slot
    results = _results()

    _import_attendance(db, [{**refs, "period_number": 1, "status": written}], "skip", results)
    db.flush()

    assert results["summary"]["attendance"]["errors"] == []
    assert results["summary"]["attendance"]["created"] == 1
    assert _stored(db, student_id) == {1: stored}


def test_an_update_stores_the_form_too(db, slot):
    from backend.routers.routers_sessions import _import_attendance

    refs, student_id = slot
    _import_attendance(db, [{**refs, "period_number": 1, "status": "Present"}], "skip", _results())
    db.flush()

    results = _results()
    _import_attendance(db, [{**refs, "period_number": 1, "status": "late"}], "update", results)
    db.flush()

    assert results["summary"]["attendance"]["updated"] == 1
    assert _stored(db, student_id) == {1: "Late"}


@pytest.mark.parametrize("written", ["Tardy", "", "   ", None, "Παρών"])
def test_any_other_status_is_listed_and_not_stored(db, slot, written):
    from backend.routers.routers_sessions import _import_attendance

    refs, student_id = slot
    results = _results()

    _import_attendance(
        db,
        [
            {**refs, "period_number": 1, "status": written},
            {**refs, "period_number": 2, "status": "Absent"},
        ],
        "skip",
        results,
    )
    db.flush()

    summary = results["summary"]["attendance"]
    assert summary["created"] == 1  # the next row is still imported
    assert len(summary["errors"]) == 1
    assert summary["errors"][0].startswith("Attendance #1: status ")
    assert "Present, Absent, Late, Excused" in summary["errors"][0]
    assert _stored(db, student_id) == {2: "Absent"}


def test_an_update_with_another_status_keeps_the_stored_one(db, slot):
    from backend.routers.routers_sessions import _import_attendance

    refs, student_id = slot
    _import_attendance(db, [{**refs, "period_number": 1, "status": "Absent"}], "skip", _results())
    db.flush()

    results = _results()
    _import_attendance(db, [{**refs, "period_number": 1, "status": "Tardy"}], "update", results)
    db.flush()

    assert results["summary"]["attendance"]["updated"] == 0
    assert len(results["summary"]["attendance"]["errors"]) == 1
    assert _stored(db, student_id) == {1: "Absent"}


def test_a_row_with_no_status_field_is_a_present(db, slot):
    from backend.routers.routers_sessions import _import_attendance

    refs, student_id = slot
    results = _results()

    _import_attendance(db, [{**refs, "period_number": 1}], "skip", results)
    db.flush()

    assert results["summary"]["attendance"]["errors"] == []
    assert _stored(db, student_id) == {1: "Present"}


def test_status_form_names_the_four_statuses_only():
    assert absence_limit_service.STATUS_FORMS == ("Present", "Absent", "Late", "Excused")
    assert [absence_limit_service.status_form(s) for s in ("present", " LATE ", "Excused", "absent")] == [
        "Present",
        "Late",
        "Excused",
        "Absent",
    ]
    assert [absence_limit_service.status_form(s) for s in ("Tardy", "", None, 1)] == [None, None, None, None]
