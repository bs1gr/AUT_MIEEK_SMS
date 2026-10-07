"""ΜΙΕΕΚ absence rules (owner, 2026-10-07): fail over 30% of the semester's scheduled periods;
over 10% the Class Participation share of the final grade counts as 0. No extended limit.

Covers backend.services.absence_limit_service (the rule), the status endpoints, course
defaults, the final-grade calculation (flag over 30%, Class Participation lost over 10%) and
the import of exports written under the old 10%/15% rule.
"""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace
from typing import Dict

from backend.models import Course
from backend.services import absence_limit_service as als
from backend.services.import_service import ImportService


def _course_ns(periods=3, hours=3.0, fail=30.0, participation=10.0):
    return SimpleNamespace(
        id=1,
        periods_per_week=periods,
        hours_per_week=hours,
        absence_limit_percent=fail,
        participation_limit_percent=participation,
    )


# ----------------------------- the rule --------------------------------------
# 3 periods x 14 weeks = 42 scheduled: fail allows floor(12.6) = 12, warning from 10 (80%),
# Class Participation allows floor(4.2) = 4.


def _status(absent=0, excused=0, **course):
    return als.evaluate(_course_ns(**course), absent=absent, excused=excused, weeks=14)


def test_thresholds_in_whole_periods():
    assert (_status(4)["status"], _status(4)["participation_forfeited"]) == ("ok", False)
    assert (_status(5)["status"], _status(5)["participation_forfeited"]) == ("ok", True)
    assert _status(9)["status"] == "ok"
    assert _status(10)["status"] == "warning"
    assert _status(12)["status"] == "warning"  # at the limit is not over it
    over = _status(13)
    assert over["status"] == "insufficient" and over["attendance_insufficient"] is True
    assert (over["allowed_absences"], over["participation_allowed_absences"]) == (12, 4)
    assert (over["limit_percent"], over["participation_limit_percent"]) == (30.0, 10.0)


def test_excused_counts_and_late_does_not():
    assert _status(absent=2, excused=3)["absences"] == 5
    rows = [SimpleNamespace(status=s) for s in ["Absent", "Excused", "Late", "Late", "Present", "excused"]]
    result = als.evaluate_records(_course_ns(periods=1), rows)  # 14 periods: CP allows 1, fail 4 (warn from 3.2)
    assert result["absences"] == 3
    assert result["participation_forfeited"] is True
    assert result["status"] == "ok"


def test_hours_per_week_stands_in_when_no_period_schedule():
    assert _status(periods=0, hours=2.0)["scheduled_periods"] == 28


def test_course_without_schedule_is_unknown_and_never_forfeits():
    result = _status(30, periods=0, hours=0)
    assert result["status"] == "unknown"
    assert result["allowed_absences"] is None
    assert result["participation_forfeited"] is False


def test_missing_limits_fall_back_to_defaults():
    assert als.course_limits(_course_ns(fail=None, participation=None)) == (30.0, 10.0)


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
    start = date(2026, 9, 1)
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


def _post(client, url: str, payload: dict) -> None:
    r = client.post(url, json=payload)
    assert r.status_code in (200, 201), r.text


def test_new_course_gets_default_limits_and_keeps_absence_penalty(client):
    course = _course(client, absence_penalty=2.0)
    assert course["absence_limit_percent"] == 30.0
    assert course["participation_limit_percent"] == 10.0
    assert course["absence_penalty"] == 2.0
    assert "absence_limit_extended_percent" not in course

    r = client.put(f"/api/v1/courses/{course['id']}", json={"participation_limit_percent": 12})
    assert r.status_code == 200, r.text
    assert r.json()["participation_limit_percent"] == 12.0


def test_course_status_flags_each_threshold(client):
    course = _course(client)
    ok, lost_cp, failed = _student(client), _student(client), _student(client)
    for s in (ok, lost_cp, failed):
        _enroll(client, course["id"], s["id"])
    _mark(client, course["id"], ok["id"], ["Absent", "Late", "Present"])
    _mark(client, course["id"], lost_cp["id"], ["Absent"] * 3 + ["Excused"] * 2)
    _mark(client, course["id"], failed["id"], ["Absent"] * 13)

    status = _course_status(client, course["id"])
    assert (status[ok["id"]]["status"], status[ok["id"]]["participation_forfeited"]) == ("ok", False)
    assert (status[lost_cp["id"]]["status"], status[lost_cp["id"]]["participation_forfeited"]) == ("ok", True)
    assert status[failed["id"]]["status"] == "insufficient"
    assert status[failed["id"]]["scheduled_periods"] == 42
    assert "extended_approved" not in status[ok["id"]]


def test_extended_absence_endpoint_is_gone(client):
    course, s = _course(client), _student(client)
    _enroll(client, course["id"], s["id"])
    r = client.put(f"/api/v1/enrollments/course/{course['id']}/student/{s['id']}/extended-absence", json={"approved": True})
    assert r.status_code in (404, 405)


def test_student_status_lists_each_enrolled_course(client):
    c1, c2 = _course(client), _course(client)
    s = _student(client)
    _enroll(client, c1["id"], s["id"])
    _enroll(client, c2["id"], s["id"])
    _mark(client, c1["id"], s["id"], ["Absent"] * 13)

    r = client.get(f"/api/v1/attendance/absence-status/student/{s['id']}")
    assert r.status_code == 200, r.text
    by_course = {row["course_id"]: row for row in r.json()}
    assert by_course[c1["id"]]["status"] == "insufficient"
    assert by_course[c1["id"]]["course_code"] == c1["course_code"]
    assert by_course[c2["id"]]["status"] == "ok"


def test_final_grade_over_the_fail_limit_is_flagged_not_blocked(client):
    course = _course(client, evaluation_rules=[{"category": "Final Exam", "weight": 100}])
    s = _student(client)
    _enroll(client, course["id"], s["id"])
    _mark(client, course["id"], s["id"], ["Absent"] * 13)
    _post(client, "/api/v1/grades/", {
        "student_id": s["id"], "course_id": course["id"], "assignment_name": "Final",
        "category": "Final Exam", "grade": 80, "max_grade": 100,
    })

    data = client.get(f"/api/v1/analytics/student/{s['id']}/course/{course['id']}/final-grade").json()
    assert data["attendance_insufficient"] is True
    assert data["absence_limit"]["status"] == "insufficient"
    assert data["final_grade"] == 80.0


def _participation_course(client):
    """Class Participation 8% with a 2% special sub-weight, Final Exam 90%."""
    rules = [
        {"category": "Class Participation", "weight": 8},
        {"category": "No participation", "weight": 2},
        {"category": "Final Exam", "weight": 90},
    ]
    course = _course(client, evaluation_rules=rules)
    s = _student(client)
    _enroll(client, course["id"], s["id"])
    _post(client, "/api/v1/grades/", {
        "student_id": s["id"], "course_id": course["id"], "assignment_name": "Final",
        "category": "Final Exam", "grade": 80, "max_grade": 100,
    })
    for category, score in (("Class Participation", 10), ("No participation", 0)):
        _post(client, "/api/v1/daily-performance/", {
            "student_id": s["id"], "course_id": course["id"], "date": "2026-09-01",
            "category": category, "score": score, "max_score": 10,
        })
    return course, s


def test_class_participation_counts_up_to_the_participation_limit(client):
    course, s = _participation_course(client)
    _mark(client, course["id"], s["id"], ["Absent"] * 4)  # 4 of 4 allowed
    data = client.get(f"/api/v1/analytics/student/{s['id']}/course/{course['id']}/final-grade").json()
    assert data["participation_forfeited"] is False
    assert data["final_grade"] == 80.0  # (100*8 + 0*2 + 80*90) / 100


def test_class_participation_share_is_lost_over_the_participation_limit(client):
    course, s = _participation_course(client)
    _mark(client, course["id"], s["id"], ["Absent"] * 4 + ["Excused"])  # 5 > 4
    data = client.get(f"/api/v1/analytics/student/{s['id']}/course/{course['id']}/final-grade").json()
    assert data["participation_forfeited"] is True
    assert data["final_grade"] == 72.0  # (0*8 + 0*2 + 80*90) / 100
    assert data["category_breakdown"]["Class Participation"]["forfeited"] is True
    assert data["category_breakdown"]["No participation"]["forfeited"] is True
    assert data["attendance_insufficient"] is False


def test_import_of_an_old_export_does_not_restore_the_old_limit(db):
    created, error = ImportService.create_or_update_course(
        db,
        {"course_code": "OLDRULE", "course_name": "Old", "semester": "S1", "credits": 3,
         "absence_limit_percent": 10.0, "absence_limit_extended_percent": 15.0},
    )
    assert (created, error) == (True, None)
    db.flush()
    course = db.query(Course).filter(Course.course_code == "OLDRULE").one()
    assert (course.absence_limit_percent, course.participation_limit_percent) == (30.0, 10.0)

    ImportService.create_or_update_course(
        db,
        {"course_code": "OLDRULE", "course_name": "Old", "absence_limit_percent": 25.0, "participation_limit_percent": 8.0},
    )
    db.flush()
    db.refresh(course)
    assert (course.absence_limit_percent, course.participation_limit_percent) == (25.0, 8.0)
