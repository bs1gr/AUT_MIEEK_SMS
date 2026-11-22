"""Plan todo 69: before a change in periods per week is saved, show what it does to absences.

A course's absence total is its periods per week times the semester's 14 weeks, so a change in
periods recalculates every student's limits for the whole semester, past weeks included, and can
push a student over the fail (30 %) or the Class Participation (10 %) limit, or back under it.
`POST /courses/{id}/schedule-change-preview` answers, without saving anything, with the totals
before and after and the students whose status or participation share would change.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Dict

_counter = {"n": 0}


def _course(client, **overrides) -> Dict:
    _counter["n"] += 1
    payload = {
        "course_code": f"PRE{_counter['n']:03d}",
        "course_name": "Preview course",
        "semester": "Α' Εξάμηνο",
        "credits": 3,
        "periods_per_week": 3,
    }
    payload.update(overrides)
    r = client.post("/api/v1/courses/", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def _student(client, last_name: str) -> Dict:
    _counter["n"] += 1
    n = _counter["n"]
    r = client.post(
        "/api/v1/students/",
        json={"student_id": f"PRES{n:03d}", "first_name": "Μαρία", "last_name": last_name, "email": f"pre{n}@example.com"},
    )
    assert r.status_code == 201, r.text
    return r.json()


def _enrolled_with_absences(client, course_id: int, last_name: str, absences: int) -> int:
    student = _student(client, last_name)
    r = client.post(f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [student["id"]]})
    assert r.status_code == 200, r.text
    if absences:
        start = date(2026, 9, 1)
        records = [
            {"student_id": student["id"], "course_id": course_id, "date": str(start + timedelta(days=i)), "status": "Absent"}
            for i in range(absences)
        ]
        r = client.post("/api/v1/attendance/bulk/create", json=records)
        assert r.status_code == 200, r.text
        assert r.json()["failed"] == 0, r.text
    return student["id"]


def _preview(client, course_id: int, payload: dict) -> Dict:
    r = client.post(f"/api/v1/courses/{course_id}/schedule-change-preview", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def test_going_from_3_to_2_periods_lists_the_students_whose_status_changes(client):
    # 3 periods x 14 = 42: fail allows 12 (warning from 10), participation allows 4.
    # 2 periods x 14 = 28: fail allows 8, participation allows 2.
    course = _course(client)
    unchanged = _enrolled_with_absences(client, course["id"], "Αβέρωφ", 5)  # ok + forfeited both times
    loses_share = _enrolled_with_absences(client, course["id"], "Βλάχου", 3)  # 3 > 2 only after
    fails = _enrolled_with_absences(client, course["id"], "Γεωργίου", 9)  # 9 > 8 only after

    answer = _preview(client, course["id"], {"periods_per_week": 2})

    assert answer["before"] == {
        "periods_per_week": 3.0,
        "scheduled_periods": 42.0,
        "allowed_absences": 12,
        "participation_allowed_absences": 4,
    }
    assert answer["after"] == {
        "periods_per_week": 2.0,
        "scheduled_periods": 28.0,
        "allowed_absences": 8,
        "participation_allowed_absences": 2,
    }
    assert answer["enrolled_students"] == 3
    assert answer["has_attendance"] is True
    changes = {change["student_id"]: change for change in answer["changes"]}
    assert set(changes) == {loses_share, fails}
    assert unchanged not in changes
    assert changes[loses_share]["student_name"] == "Μαρία Βλάχου"
    assert (changes[loses_share]["status_before"], changes[loses_share]["status_after"]) == ("ok", "ok")
    assert (
        changes[loses_share]["participation_forfeited_before"],
        changes[loses_share]["participation_forfeited_after"],
    ) == (False, True)
    assert (changes[fails]["absences"], changes[fails]["status_before"], changes[fails]["status_after"]) == (
        9,
        "ok",
        "insufficient",
    )
    # By name, for the page.
    assert [change["student_name"] for change in answer["changes"]] == ["Μαρία Βλάχου", "Μαρία Γεωργίου"]


def test_the_preview_saves_nothing(client):
    course = _course(client)
    _enrolled_with_absences(client, course["id"], "Δημητρίου", 4)
    before = client.get(f"/api/v1/courses/{course['id']}").json()

    answer = _preview(client, course["id"], {"periods_per_week": 6, "absence_limit_percent": 20})

    assert answer["after"]["periods_per_week"] == 6.0
    assert client.get(f"/api/v1/courses/{course['id']}").json() == before


def test_a_schedule_sets_the_periods_as_a_save_would(client):
    course = _course(client)
    schedule = [{"day": "Monday", "periods": 2, "start_time": "08:00"}, {"day": "Thursday", "periods": 2}]

    answer = _preview(client, course["id"], {"teaching_schedule": schedule, "participation_limit_percent": 20})

    assert answer["after"]["periods_per_week"] == 4.0
    assert answer["after"]["scheduled_periods"] == 56.0
    assert answer["after"]["participation_allowed_absences"] == 11  # floor(56 x 20 %)


def test_an_import_that_changes_the_periods_of_a_taught_course_says_so(client, db):
    from backend.services.import_service import ImportService

    taught = _course(client)  # 3 contact hours a week stand in for its periods
    _enrolled_with_absences(client, taught["id"], "Ευαγγέλου", 2)
    untaught = _course(client)
    code = taught["course_code"]

    warnings: list = []
    for course_code in (code, untaught["course_code"]):
        result = ImportService.create_or_update_course(
            db, {"course_code": course_code, "course_name": "Preview course", "periods_per_week": 2}, warnings=warnings
        )
        assert result == (False, None)

    assert warnings == [
        f"warning: {code}: periods per week 3 -> 2; its students' absence limits are now counted "
        "from 2 periods a week for the whole semester"
    ]

    # The same periods again: nothing to say.
    again: list = []
    ImportService.create_or_update_course(
        db, {"course_code": code, "course_name": "Preview course", "periods_per_week": 2}, warnings=again
    )
    assert again == []


def test_a_course_without_students_or_attendance_has_nothing_to_warn_about(client):
    course = _course(client)

    answer = _preview(client, course["id"], {"periods_per_week": 1})

    assert (answer["enrolled_students"], answer["has_attendance"], answer["changes"]) == (0, False, [])
