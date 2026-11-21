"""Plan todo 70: a change to a course leaves an audit entry with what was there before.

A course's schedule sets every student's absence limits (periods per week times the semester's
weeks), and every teacher may edit every course. `PUT /courses/{id}` wrote no audit entry, so an
overwritten schedule left no trace of the old one or of who changed it. Now each change writes
one entry naming the changed fields, with their old and new values; a save that changes nothing
writes none, and a failure to write the entry never fails the save.
"""

import pytest

COURSES = "/api/v1/courses/"
OLD_SCHEDULE = [{"day": "Monday", "start_time": "08:00", "periods": 2, "duration": 45}]
NEW_SCHEDULE = [
    {"day": "Monday", "start_time": "08:00", "periods": 2, "duration": 45},
    {"day": "Thursday", "start_time": "10:00", "periods": 1, "duration": 45},
]


def _headers(db, email: str, role: str) -> dict:
    from backend.models import User
    from backend.routers.routers_auth import create_access_token
    from backend.tests.conftest import started_installation

    db.add(User(email=email, hashed_password="x", role=role, is_active=True))
    db.commit()
    started_installation(db)  # the roles and this account's role row, as after a start
    return {"Authorization": f"Bearer {create_access_token(subject=email, role=role)}"}


def _entries(db):
    from backend.models import AuditLog

    db.expire_all()
    return (
        db.query(AuditLog)
        .filter(AuditLog.resource == "course", AuditLog.action == "update")
        .order_by(AuditLog.id)
        .all()
    )


@pytest.fixture
def course(client):
    """Made while sign-in is still off, as on an installation without accounts."""
    payload = {
        "course_code": "AUD101",
        "course_name": "Δίκτυα",
        "semester": "Χειμερινό 2026",
        "credits": 3,
        "teaching_schedule": OLD_SCHEDULE,
    }
    created = client.post(COURSES, json=payload)
    assert created.status_code == 201, created.text
    assert created.json()["periods_per_week"] == 2
    return created.json()


@pytest.fixture
def strict_auth(monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)


def test_a_new_schedule_is_recorded_with_the_old_one_and_who_changed_it(client, db, course, strict_auth):
    teacher = _headers(db, "teacher@example.com", "teacher")

    changed = client.put(f"{COURSES}{course['id']}", json={"teaching_schedule": NEW_SCHEDULE}, headers=teacher)
    assert changed.status_code == 200, changed.text
    assert changed.json()["periods_per_week"] == 3

    [entry] = _entries(db)
    assert entry.user_email == "teacher@example.com"
    assert entry.resource_id == str(course["id"])
    assert entry.details == {
        "operation": "update_course",
        "course": "AUD101",
        "fields": "teaching_schedule, periods_per_week",
    }
    assert entry.old_values == {"teaching_schedule": course["teaching_schedule"], "periods_per_week": 2}
    assert entry.new_values == {"teaching_schedule": changed.json()["teaching_schedule"], "periods_per_week": 3}
    assert entry.old_values["teaching_schedule"] == OLD_SCHEDULE


def test_only_what_changed_goes_into_the_entry_and_a_save_without_a_change_writes_none(client, db, course):
    # The Edit Course dialog sends the whole course back, the unchanged fields included.
    fields = (
        "course_code",
        "course_name",
        "semester",
        "credits",
        "description",
        "hours_per_week",
        "absence_penalty",
        "absence_limit_percent",
        "participation_limit_percent",
        "teaching_schedule",
        "evaluation_rules",
    )
    whole = {field: course[field] for field in fields}

    unchanged = client.put(f"{COURSES}{course['id']}", json=whole)
    assert unchanged.status_code == 200, unchanged.text
    assert _entries(db) == []

    renamed = client.put(f"{COURSES}{course['id']}", json={**whole, "course_name": "Δίκτυα Υπολογιστών"})
    assert renamed.status_code == 200, renamed.text
    [entry] = _entries(db)
    assert entry.details["fields"] == "course_name"
    assert entry.old_values == {"course_name": "Δίκτυα"}
    assert entry.new_values == {"course_name": "Δίκτυα Υπολογιστών"}


def test_a_change_of_the_evaluation_rules_is_recorded_too(client, db, course):
    rules = [{"category": "Midterm", "weight": 40}, {"category": "Final Exam", "weight": 60}]

    saved = client.put(f"{COURSES}{course['id']}/evaluation-rules", json={"evaluation_rules": rules})
    assert saved.status_code == 200, saved.text

    [entry] = _entries(db)
    assert entry.details["fields"] == "evaluation_rules"
    assert entry.old_values == {"evaluation_rules": None}
    assert entry.new_values == {"evaluation_rules": saved.json()["evaluation_rules"]}
    assert [rule["weight"] for rule in entry.new_values["evaluation_rules"]] == [40, 60]


def test_the_change_is_saved_when_the_entry_cannot_be_written(client, db, course, monkeypatch):
    from backend.models import Course
    from backend.routers import routers_courses

    class BrokenLogger:
        def log_from_request(self, *args, **kwargs):
            raise RuntimeError("the audit table is not there")

    monkeypatch.setattr(routers_courses, "get_audit_logger", lambda _db: BrokenLogger())

    changed = client.put(f"{COURSES}{course['id']}", json={"teaching_schedule": NEW_SCHEDULE})
    assert changed.status_code == 200, changed.text
    db.expire_all()
    assert db.get(Course, course["id"]).periods_per_week == 3
    assert _entries(db) == []
