"""ΜΙΕΕΚ absence limit: 10% of the semester's scheduled periods, 15% with Directorate approval.

Covers backend.services.absence_limit_service (the rule itself) and the API that
exposes it: course/student status endpoints, the per-enrollment approval, and the
warning flag on the final-grade calculation (the grade itself is never blocked).
"""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace
from typing import Dict

from backend.services import absence_limit_service as als


def _course_ns(periods=3, hours=3.0, base=10.0, extended=15.0):
    return SimpleNamespace(
        id=1,
        periods_per_week=periods,
        hours_per_week=hours,
        absence_limit_percent=base,
        absence_limit_extended_percent=extended,
    )


# ----------------------------- the rule --------------------------------------


def test_limit_is_ten_percent_of_scheduled_periods_and_only_exceeding_it_is_insufficient():
    course = _course_ns(periods=4)  # 4 x 10 weeks = 40 periods -> 10% = exactly 4 absences

    at_limit = als.evaluate(course, absent=4, excused=0, extended_approved=False, weeks=10)
    assert at_limit["scheduled_periods"] == 40
    assert at_limit["allowed_absences"] == 4
    assert at_limit["status"] == "warning"
    assert at_limit["attendance_insufficient"] is False

    over = als.evaluate(course, absent=5, excused=0, extended_approved=False, weeks=10)
    assert over["status"] == "insufficient"
    assert over["attendance_insufficient"] is True
    assert over["absence_percent"] == 12.5
    assert over["remaining_absences"] == 0


def test_fractional_limit_rounds_down_to_whole_periods():
    course = _course_ns(periods=3)  # 3 x 14 = 42 -> 10% = 4.2 -> 4 allowed, the 5th is over
    assert als.evaluate(course, absent=4, excused=0, extended_approved=False, weeks=14)["status"] == "warning"
    assert als.evaluate(course, absent=5, excused=0, extended_approved=False, weeks=14)["status"] == "insufficient"
    assert als.evaluate(course, absent=2, excused=0, extended_approved=False, weeks=14)["status"] == "ok"


def test_excused_absences_count_toward_the_limit():
    course = _course_ns(periods=3)
    result = als.evaluate(course, absent=2, excused=3, extended_approved=False, weeks=14)
    assert result["absences"] == 5
    assert result["unexcused_absences"] == 2
    assert result["excused_absences"] == 3
    assert result["status"] == "insufficient"


def test_extended_limit_applies_only_with_approval():
    course = _course_ns(periods=3)  # 42 periods -> 15% = 6.3 -> 6 allowed
    without = als.evaluate(course, absent=0, excused=6, extended_approved=False, weeks=14)
    assert without["limit_percent"] == 10.0
    assert without["status"] == "insufficient"

    approved = als.evaluate(course, absent=0, excused=6, extended_approved=True, weeks=14)
    assert approved["limit_percent"] == 15.0
    assert approved["allowed_absences"] == 6
    assert approved["attendance_insufficient"] is False

    assert als.evaluate(course, absent=0, excused=7, extended_approved=True, weeks=14)["status"] == "insufficient"


def test_late_does_not_count_but_absent_and_excused_rows_do():
    course = _course_ns(periods=1)  # 14 periods -> 1 allowed
    rows = [SimpleNamespace(status=s) for s in ("Late", "Late", "Late", "Present", "Absent", "excused")]
    result = als.evaluate_records(course, rows, extended_approved=False)
    assert result["absences"] == 2
    assert result["status"] == "insufficient"


def test_hours_per_week_stands_in_when_no_period_schedule():
    course = _course_ns(periods=0, hours=2.0)
    assert als.evaluate(course, absent=0, excused=0, extended_approved=False, weeks=14)["scheduled_periods"] == 28


def test_course_without_schedule_is_unknown_not_insufficient():
    course = _course_ns(periods=0, hours=0)
    result = als.evaluate(course, absent=3, excused=0, extended_approved=False, weeks=14)
    assert result["status"] == "unknown"
    assert result["attendance_insufficient"] is False
    assert result["allowed_absences"] is None


def test_missing_limits_fall_back_to_defaults_and_extended_never_below_base():
    assert als.course_limits(_course_ns(base=None, extended=None)) == (10.0, 15.0)
    assert als.course_limits(_course_ns(base=12.0, extended=5.0)) == (12.0, 12.0)


# ----------------------------- the API ---------------------------------------

_counter = {"n": 0}


def _course(client, **overrides) -> Dict:
    _counter["n"] += 1
    payload = {
        "course_code": f"ABS{_counter['n']:03d}",
        "course_name": "Absence limit course",
        "semester": "Α' Εξάμηνο",
        "credits": 3,
        "periods_per_week": 3,
    }
    payload.update(overrides)
    r = client.post("/api/v1/courses/", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def _student(client) -> Dict:
    _counter["n"] += 1
    n = _counter["n"]
    r = client.post(
        "/api/v1/students/",
        json={"student_id": f"ABSS{n:03d}", "first_name": "Abs", "last_name": f"Student{n}", "email": f"abs{n}@example.com"},
    )
    assert r.status_code == 201, r.text
    return r.json()


def _enroll(client, course_id: int, student_id: int) -> None:
    r = client.post(f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [student_id]})
    assert r.status_code == 200, r.text


def _mark(client, course_id: int, student_id: int, statuses) -> None:
    start = date(2026, 10, 5)
    records = [
        {"student_id": student_id, "course_id": course_id, "date": str(start + timedelta(days=i)), "status": s}
        for i, s in enumerate(statuses)
    ]
    r = client.post("/api/v1/attendance/bulk/create", json=records)
    assert r.status_code == 200, r.text
    assert r.json()["failed"] == 0, r.text


def _course_status(client, course_id: int) -> Dict[int, Dict]:
    r = client.get(f"/api/v1/attendance/absence-status/course/{course_id}")
    assert r.status_code == 200, r.text
    return {row["student_id"]: row for row in r.json()}


def test_new_course_gets_default_limits_and_keeps_absence_penalty(client):
    course = _course(client, absence_penalty=2.0)
    assert course["absence_limit_percent"] == 10.0
    assert course["absence_limit_extended_percent"] == 15.0
    assert course["absence_penalty"] == 2.0

    r = client.put(f"/api/v1/courses/{course['id']}", json={"absence_limit_percent": 12})
    assert r.status_code == 200, r.text
    assert r.json()["absence_limit_percent"] == 12.0


def test_course_status_flags_students_over_the_limit(client):
    course = _course(client)  # 3 periods/week x SEMESTER_WEEKS (14) = 42 -> 4 allowed
    ok, over = _student(client), _student(client)
    _enroll(client, course["id"], ok["id"])
    _enroll(client, course["id"], over["id"])
    _mark(client, course["id"], ok["id"], ["Absent", "Late", "Present"])
    _mark(client, course["id"], over["id"], ["Absent", "Absent", "Absent", "Excused", "Excused"])

    status = _course_status(client, course["id"])
    assert status[ok["id"]]["status"] == "ok"
    assert status[ok["id"]]["absences"] == 1
    assert status[over["id"]]["status"] == "insufficient"
    assert status[over["id"]]["absences"] == 5
    assert status[over["id"]]["scheduled_periods"] == 42


def test_directorate_approval_raises_the_limit_and_can_be_withdrawn(client):
    course = _course(client)
    s = _student(client)
    _enroll(client, course["id"], s["id"])
    _mark(client, course["id"], s["id"], ["Excused"] * 5)
    assert _course_status(client, course["id"])[s["id"]]["status"] == "insufficient"

    url = f"/api/v1/enrollments/course/{course['id']}/student/{s['id']}/extended-absence"
    r = client.put(url, json={"approved": True, "note": "Medical certificate"})
    assert r.status_code == 200, r.text
    assert r.json()["extended_absence_approved"] is True
    assert r.json()["extended_absence_approved_at"] == str(date.today())

    row = _course_status(client, course["id"])[s["id"]]
    assert row["limit_percent"] == 15.0
    assert row["attendance_insufficient"] is False
    assert row["extended_absence_note"] == "Medical certificate"

    r = client.put(url, json={"approved": False})
    assert r.status_code == 200, r.text
    assert r.json()["extended_absence_note"] is None
    assert _course_status(client, course["id"])[s["id"]]["status"] == "insufficient"


def test_approval_for_missing_enrollment_is_404(client):
    course = _course(client)
    s = _student(client)
    r = client.put(f"/api/v1/enrollments/course/{course['id']}/student/{s['id']}/extended-absence", json={"approved": True})
    assert r.status_code == 404


def test_student_status_lists_each_enrolled_course(client):
    c1, c2 = _course(client), _course(client)
    s = _student(client)
    _enroll(client, c1["id"], s["id"])
    _enroll(client, c2["id"], s["id"])
    _mark(client, c1["id"], s["id"], ["Absent"] * 6)

    r = client.get(f"/api/v1/attendance/absence-status/student/{s['id']}")
    assert r.status_code == 200, r.text
    by_course = {row["course_id"]: row for row in r.json()}
    assert by_course[c1["id"]]["status"] == "insufficient"
    assert by_course[c1["id"]]["course_code"] == c1["course_code"]
    assert by_course[c2["id"]]["status"] == "ok"


def test_final_grade_is_flagged_not_blocked(client):
    course = _course(client, evaluation_rules=[{"category": "Final Exam", "weight": 100}])
    s = _student(client)
    _enroll(client, course["id"], s["id"])
    _mark(client, course["id"], s["id"], ["Absent"] * 5)
    r = client.post(
        "/api/v1/grades/",
        json={
            "student_id": s["id"],
            "course_id": course["id"],
            "assignment_name": "Final",
            "category": "Final Exam",
            "grade": 80,
            "max_grade": 100,
        },
    )
    assert r.status_code == 201, r.text

    r = client.get(f"/api/v1/analytics/student/{s['id']}/course/{course['id']}/final-grade")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["attendance_insufficient"] is True
    assert data["absence_limit"]["status"] == "insufficient"
    assert data["final_grade"] == 80.0
