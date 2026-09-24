"""A course is active exactly while it has students with an active enrollment.

Covers backend.services.course_activation and every API path that changes
enrollments (enroll, unenroll, status change, student deactivation, end /
reactivate), plus the nightly reconcile that replaced the semester-date guess.
"""

from __future__ import annotations

from typing import Dict

from backend.services.course_activation import sync_course_activation

_counter = {"n": 0}


def _course(client, **overrides) -> Dict:
    _counter["n"] += 1
    payload = {
        "course_code": f"ACT{_counter['n']:03d}",
        "course_name": "Activation course",
        # Program semester that the old date heuristic misread as "spring"
        "semester": "Β' Εξάμηνο",
        "credits": 3,
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
        json={"student_id": f"ACTS{n:03d}", "first_name": "Act", "last_name": f"Student{n}", "email": f"act{n}@example.com"},
    )
    assert r.status_code == 201, r.text
    return r.json()


def _is_active(client, course_id: int) -> bool:
    r = client.get(f"/api/v1/courses/{course_id}")
    assert r.status_code == 200, r.text
    return r.json()["is_active"]


def _enroll(client, course_id: int, *student_ids: int) -> None:
    r = client.post(f"/api/v1/enrollments/course/{course_id}", json={"student_ids": list(student_ids)})
    assert r.status_code == 200, r.text


def test_new_course_starts_inactive_even_if_requested_active(client):
    course = _course(client, is_active=True)
    assert course["is_active"] is False


def test_enrolling_first_student_activates_and_last_unenroll_deactivates(client):
    course = _course(client)
    s1, s2 = _student(client), _student(client)

    _enroll(client, course["id"], s1["id"], s2["id"])
    assert _is_active(client, course["id"]) is True

    assert client.delete(f"/api/v1/enrollments/course/{course['id']}/student/{s1['id']}").status_code == 200
    assert _is_active(client, course["id"]) is True  # s2 still enrolled

    assert client.delete(f"/api/v1/enrollments/course/{course['id']}/student/{s2['id']}").status_code == 200
    assert _is_active(client, course["id"]) is False


def test_enrollment_status_change_drives_activation(client):
    course = _course(client)
    s = _student(client)
    _enroll(client, course["id"], s["id"])

    url = f"/api/v1/enrollments/course/{course['id']}/student/{s['id']}/status"
    assert client.patch(url, json={"status": "completed"}).status_code == 200
    assert _is_active(client, course["id"]) is False
    assert client.patch(url, json={"status": "active"}).status_code == 200
    assert _is_active(client, course["id"]) is True


def test_put_cannot_override_derived_is_active(client):
    course = _course(client)
    r = client.put(f"/api/v1/courses/{course['id']}", json={"is_active": True, "course_name": "Renamed"})
    assert r.status_code == 200, r.text
    assert r.json()["course_name"] == "Renamed"
    assert r.json()["is_active"] is False


def test_end_and_reactivate_course(client):
    course = _course(client)
    s = _student(client)
    _enroll(client, course["id"], s["id"])

    r = client.post(f"/api/v1/courses/{course['id']}/end")
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is False
    enrollments = client.get(f"/api/v1/enrollments/course/{course['id']}").json()
    assert [e["status"] for e in enrollments] == ["completed"]  # kept, not deleted

    r = client.post(f"/api/v1/courses/{course['id']}/reactivate")
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is True


def test_reactivate_without_students_is_409(client):
    course = _course(client)
    r = client.post(f"/api/v1/courses/{course['id']}/reactivate")
    assert r.status_code == 409, r.text
    assert _is_active(client, course["id"]) is False


def test_re_enrolling_into_ended_course_reactivates_it(client):
    """Regression: a 'completed' enrollment used to count as 'already enrolled' and was skipped."""
    course = _course(client)
    s = _student(client)
    _enroll(client, course["id"], s["id"])
    assert client.post(f"/api/v1/courses/{course['id']}/end").status_code == 200

    _enroll(client, course["id"], s["id"])
    assert _is_active(client, course["id"]) is True


def test_deactivating_last_student_deactivates_course(client):
    course = _course(client)
    s = _student(client)
    _enroll(client, course["id"], s["id"])

    r = client.put(f"/api/v1/students/{s['id']}", json={"is_active": False})
    assert r.status_code == 200, r.text
    assert _is_active(client, course["id"]) is False


def test_sync_reconciles_drifted_flags(client, db):
    """The nightly reconcile (and the migration) re-derive stale flags."""
    from backend.models import Course

    course = _course(client)
    db.query(Course).filter(Course.id == course["id"]).update({"is_active": True})
    db.commit()
    assert _is_active(client, course["id"]) is True  # drifted

    assert sync_course_activation(db) >= 1
    db.commit()
    assert _is_active(client, course["id"]) is False
