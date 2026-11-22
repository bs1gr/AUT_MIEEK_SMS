"""Plan todo 71 (the owner's choice of 2026-11-22): the weeks already taught keep their count.

A course's absence total was its periods per week times 14, for the whole semester, so a
schedule changed in the middle of a semester rewrote the weeks already taught (2 to 3 periods
from week 8 made the total 42 instead of 7 x 2 + 7 x 3 = 35). Now a course can keep its own
total (`semester_periods`, empty by default). When the Teaching Schedule's dialog says the change
applies from week N on (`schedule_change_from_week`), the server keeps the weeks before N at the
old count; a change without a week is a correction and counts the whole semester again, as
before. An administrator can also type the total in Edit Course.
"""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace
from typing import Dict

import pytest

from backend.services import absence_limit_service as als

COURSES = "/api/v1/courses/"
TWO = [{"day": "Monday", "periods": 2, "start_time": "08:00", "duration": 45}]
THREE = [{"day": "Monday", "periods": 2, "start_time": "08:00", "duration": 45}, {"day": "Thursday", "periods": 1}]
ONE = [{"day": "Monday", "periods": 1, "start_time": "08:00", "duration": 45}]
_counter = {"n": 0}


def _ns(periods=2, total=None):
    return SimpleNamespace(
        id=1,
        periods_per_week=periods,
        hours_per_week=0,
        absence_limit_percent=30.0,
        participation_limit_percent=10.0,
        semester_periods=total,
    )


# ----------------------------- the rule --------------------------------------


def test_a_stored_total_is_the_total():
    result = als.evaluate(_ns(periods=3, total=35), absent=10, excused=0)
    assert result["scheduled_periods"] == 35
    assert result["allowed_absences"] == 10  # floor(35 x 30 %)
    assert result["participation_allowed_absences"] == 3  # floor(35 x 10 %)
    assert als.evaluate(_ns(periods=3), absent=0, excused=0)["scheduled_periods"] == 42


def test_each_change_keeps_the_weeks_before_it():
    # Weeks 1-7 at 2, then 3 from week 8: 14 + 21 = 35.
    first = als.total_after_change(_ns(periods=2), new_weekly=3, from_week=8, weeks=14)
    assert first == 35
    # Then 1 from week 11: 14 (weeks 1-7) + 9 (8-10) + 4 (11-14) = 27.
    assert als.total_after_change(_ns(periods=3, total=first), new_weekly=1, from_week=11, weeks=14) == 27
    # From week 1 is the whole semester at the new count.
    assert als.total_after_change(_ns(periods=2), new_weekly=3, from_week=1, weeks=14) == 42


def test_the_week_suggested_is_the_one_today_falls_in_counting_from_the_first_lesson(monkeypatch):
    monkeypatch.setattr(als, "_today", lambda: date(2026, 10, 27))  # a Tuesday
    # First lesson Thursday 3 September: its week starts Monday 31 August; 27 October is in week 9.
    assert als.week_of(date(2026, 9, 3)) == 9
    monkeypatch.setattr(als, "_today", lambda: date(2027, 3, 1))
    assert als.week_of(date(2026, 9, 3)) == 14  # never past the last week


# ----------------------------- the API ---------------------------------------


def _course(client, schedule=TWO) -> Dict:
    _counter["n"] += 1
    payload = {
        "course_code": f"SEM{_counter['n']:03d}",
        "course_name": "Semester total",
        "semester": "Α' Εξάμηνο",
        "credits": 3,
        "teaching_schedule": schedule,
    }
    r = client.post(COURSES, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def _put(client, course_id: int, payload: dict) -> Dict:
    r = client.put(f"{COURSES}{course_id}", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def _first_lesson(client, course_id: int, day: date) -> None:
    _counter["n"] += 1
    n = _counter["n"]
    student = client.post(
        "/api/v1/students/",
        json={"student_id": f"SEMS{n:03d}", "first_name": "Ελένη", "last_name": f"Δοκιμή{n}", "email": f"sem{n}@example.com"},
    ).json()
    assert client.post(f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [student["id"]]}).status_code == 200
    r = client.post(
        "/api/v1/attendance/bulk/create",
        json=[{"student_id": student["id"], "course_id": course_id, "date": str(day), "status": "Absent"}],
    )
    assert r.status_code == 200 and r.json()["failed"] == 0, r.text


def test_a_change_from_week_8_keeps_the_weeks_before_it_and_the_limits_follow(client):
    course = _course(client)
    assert course["semester_periods"] is None

    saved = _put(client, course["id"], {"teaching_schedule": THREE, "schedule_change_from_week": 8})

    assert (saved["periods_per_week"], saved["semester_periods"]) == (3, 35)
    _first_lesson(client, course["id"], date(2026, 9, 1))
    [row] = client.get(f"/api/v1/attendance/absence-status/course/{course['id']}").json()
    assert (row["scheduled_periods"], row["allowed_absences"], row["participation_allowed_absences"]) == (35, 10, 3)

    # A second change, from week 11: the earlier one stays counted.
    again = _put(client, course["id"], {"teaching_schedule": ONE, "schedule_change_from_week": 11})
    assert (again["periods_per_week"], again["semester_periods"]) == (1, 27)


def test_a_change_without_a_week_is_a_correction_and_counts_the_whole_semester_again(client):
    course = _course(client)
    _put(client, course["id"], {"teaching_schedule": THREE, "schedule_change_from_week": 8})

    corrected = _put(client, course["id"], {"teaching_schedule": ONE})

    assert (corrected["periods_per_week"], corrected["semester_periods"]) == (1, None)


def test_a_save_that_keeps_the_periods_keeps_the_total(client):
    course = _course(client)
    _put(client, course["id"], {"teaching_schedule": THREE, "schedule_change_from_week": 8})

    # The Edit Course dialog sends the course back whole; the Teaching Schedule tab can move hours.
    renamed = _put(client, course["id"], {"course_name": "Renamed", "semester_periods": 35})
    moved = _put(
        client,
        course["id"],
        {"teaching_schedule": [{"day": "Tuesday", "periods": 2, "start_time": "10:00"}, {"day": "Friday", "periods": 1}]},
    )

    assert renamed["semester_periods"] == 35
    assert (moved["periods_per_week"], moved["semester_periods"]) == (3, 35)


def test_an_administrator_can_type_the_total_or_clear_it(client):
    course = _course(client)

    typed = _put(client, course["id"], {"semester_periods": 40})
    assert typed["semester_periods"] == 40
    cleared = _put(client, course["id"], {"semester_periods": None})
    assert cleared["semester_periods"] is None
    assert client.put(f"{COURSES}{course['id']}", json={"semester_periods": -1}).status_code == 422


def test_the_change_and_the_new_total_are_in_the_audit_entry(client, db):
    from backend.models import AuditLog

    course = _course(client)
    _put(client, course["id"], {"teaching_schedule": THREE, "schedule_change_from_week": 8})

    db.expire_all()
    [entry] = db.query(AuditLog).filter(AuditLog.resource == "course", AuditLog.action == "update").all()
    assert entry.old_values["semester_periods"] is None
    assert entry.new_values["semester_periods"] == 35
    assert (entry.old_values["periods_per_week"], entry.new_values["periods_per_week"]) == (2, 3)


def test_the_preview_counts_from_the_week_asked_and_suggests_the_current_one(client, monkeypatch):
    monkeypatch.setattr(als, "_today", lambda: date(2026, 10, 20))
    course = _course(client)
    _first_lesson(client, course["id"], date(2026, 9, 1))  # week of Monday 31 August: 20 October is week 8

    def preview(payload):
        r = client.post(f"{COURSES}{course['id']}/schedule-change-preview", json=payload)
        assert r.status_code == 200, r.text
        return r.json()

    correction = preview({"teaching_schedule": THREE})
    assert (correction["periods_change"], correction["suggested_from_week"], correction["semester_weeks"]) == (True, 8, 14)
    assert correction["after"]["scheduled_periods"] == 42
    from_week = preview({"teaching_schedule": THREE, "change_from_week": 8})
    assert from_week["after"]["scheduled_periods"] == 35
    assert from_week["after"]["allowed_absences"] == 10
    # Nothing was saved.
    assert client.get(f"{COURSES}{course['id']}").json()["semester_periods"] is None


def test_an_import_that_changes_the_periods_counts_the_whole_semester_again(client, db):
    from backend.models import Course
    from backend.services.import_service import ImportService

    course = _course(client)
    _put(client, course["id"], {"teaching_schedule": THREE, "schedule_change_from_week": 8})
    code = course["course_code"]

    ImportService.create_or_update_course(db, {"course_code": code, "course_name": "Semester total", "periods_per_week": 3})
    db.flush()
    assert db.get(Course, course["id"]).semester_periods == 35  # same periods: kept

    ImportService.create_or_update_course(db, {"course_code": code, "course_name": "Semester total", "periods_per_week": 4})
    db.flush()
    assert db.get(Course, course["id"]).semester_periods is None

    ImportService.create_or_update_course(
        db, {"course_code": code, "course_name": "Semester total", "periods_per_week": 4, "semester_periods": 50}
    )
    db.flush()
    assert db.get(Course, course["id"]).semester_periods == 50  # a session export brings its own


def test_a_session_export_carries_the_total(client, db):
    from backend.models import Course
    from backend.services.session_data_service import serialize_course

    course = _course(client)
    _put(client, course["id"], {"semester_periods": 33})
    db.expire_all()
    assert serialize_course(db.get(Course, course["id"]))["semester_periods"] == 33


@pytest.mark.parametrize("week", [0, 15, 53])  # the semester has 14 weeks
def test_a_week_outside_the_semester_is_refused(client, week):
    course = _course(client)
    r = client.put(f"{COURSES}{course['id']}", json={"teaching_schedule": THREE, "schedule_change_from_week": week})
    assert r.status_code == 422
