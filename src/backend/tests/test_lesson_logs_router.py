"""Tests for the lesson log API (/api/v1/lesson-logs): the material covered and the teacher's notes
for each teaching period of a course.

Covers the upsert that autosave calls (create, partial update, clearing, one log per period,
validation), listing and its filters, logs of deleted courses, the retry when two saves race to
create the same period, route registration, and who may read or write: the teacher's notes are
private to people who can edit attendance, so read-only roles are refused even on GET.
"""

from datetime import date

import pytest

URL = "/api/v1/lesson-logs/"
DAY = date(2026, 11, 12)


def _course(client, code: str = "LL101") -> int:
    resp = client.post(
        "/api/v1/courses/",
        json={"course_code": code, "course_name": f"Course {code}", "semester": "Fall 2026", "credits": 3},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _save(client, course_id: int, day: date = DAY, period: int = 1, headers=None, **text):
    return client.put(
        URL,
        json={"course_id": course_id, "date": str(day), "period_number": period, **text},
        headers=headers,
    )


# ---------------------------------------------------------------------------
# Upsert (what autosave calls)
# ---------------------------------------------------------------------------


def test_put_creates_a_log(client):
    course_id = _course(client)

    resp = _save(client, course_id, material_covered="Chapter 1: vectors", teacher_notes="Ran out of time")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert (body["course_id"], body["date"], body["period_number"]) == (course_id, "2026-11-12", 1)
    assert body["material_covered"] == "Chapter 1: vectors"
    assert body["teacher_notes"] == "Ran out of time"
    assert body["id"] and body["created_at"] and body["updated_at"]


def test_a_field_left_out_keeps_its_stored_value(client):
    # The two textareas autosave on their own, so each save sends only the field that changed.
    course_id = _course(client)

    first = _save(client, course_id, material_covered="Chapter 1").json()
    second = _save(client, course_id, teacher_notes="Quiz next week").json()
    third = _save(client, course_id, material_covered="Chapters 1 and 2").json()

    assert first["id"] == second["id"] == third["id"]
    assert second["material_covered"] == "Chapter 1"
    assert third["teacher_notes"] == "Quiz next week"
    assert third["material_covered"] == "Chapters 1 and 2"
    assert client.get(URL, params={"course_id": course_id}).json()["total"] == 1


def test_empty_blank_and_null_text_clear_the_field(client):
    course_id = _course(client)
    _save(client, course_id, material_covered="x", teacher_notes="y")

    cleared = _save(client, course_id, material_covered="", teacher_notes="   \n").json()
    assert cleared["material_covered"] is None
    assert cleared["teacher_notes"] is None

    _save(client, course_id, material_covered="again")
    nulled = client.put(
        URL, json={"course_id": course_id, "date": str(DAY), "period_number": 1, "material_covered": None}
    ).json()
    assert nulled["material_covered"] is None


def test_text_is_stored_exactly_as_typed(client):
    course_id = _course(client)
    text = "  Πρώτο κεφάλαιο: διανύσματα\n\n• ορισμοί\n• παραδείγματα  "

    saved = _save(client, course_id, material_covered=text).json()

    assert saved["material_covered"] == text
    listed = client.get(URL, params={"course_id": course_id}).json()["items"][0]
    assert listed["material_covered"] == text


def test_text_may_be_exactly_the_maximum_length(client):
    course_id = _course(client)
    assert _save(client, course_id, material_covered="x" * 20000).status_code == 200


def test_each_period_has_its_own_log(client):
    course_id = _course(client)

    first = _save(client, course_id, period=1, material_covered="first hour").json()
    second = _save(client, course_id, period=2, material_covered="second hour").json()

    assert first["id"] != second["id"]
    items = client.get(URL, params={"course_id": course_id, "date": str(DAY)}).json()["items"]
    assert [(i["period_number"], i["material_covered"]) for i in items] == [(1, "first hour"), (2, "second hour")]


def test_the_period_defaults_to_one(client):
    course_id = _course(client)

    resp = client.put(URL, json={"course_id": course_id, "date": str(DAY), "material_covered": "x"})

    assert resp.status_code == 200, resp.text
    assert resp.json()["period_number"] == 1


def test_an_unknown_course_is_a_404(client):
    assert _save(client, 987654, material_covered="x").status_code == 404


@pytest.mark.parametrize(
    "override",
    [
        {"period_number": 0},
        {"period_number": -1},
        {"course_id": 0},
        {"date": "not-a-date"},
        {"material_covered": "x" * 20001},
        {"teacher_notes": "x" * 20001},
    ],
)
def test_invalid_bodies_are_rejected(client, override):
    course_id = _course(client)
    body = {"course_id": course_id, "date": str(DAY), "period_number": 1, **override}

    assert client.put(URL, json=body).status_code == 422


def test_a_missing_date_is_rejected(client):
    course_id = _course(client)
    assert client.put(URL, json={"course_id": course_id, "material_covered": "x"}).status_code == 422


# ---------------------------------------------------------------------------
# Listing
# ---------------------------------------------------------------------------


def test_list_filters_and_orders_newest_first(client):
    course_id = _course(client, "LL101")
    other_id = _course(client, "LL102")
    _save(client, course_id, date(2026, 11, 10), 1, material_covered="mon")
    _save(client, course_id, date(2026, 11, 12), 2, material_covered="wed-2")
    _save(client, course_id, date(2026, 11, 12), 1, material_covered="wed-1")
    _save(client, other_id, date(2026, 11, 12), 1, material_covered="other course")

    def materials(**params):
        resp = client.get(URL, params=params)
        assert resp.status_code == 200, resp.text
        return [item["material_covered"] for item in resp.json()["items"]]

    assert materials(course_id=course_id) == ["wed-1", "wed-2", "mon"]
    assert materials(course_id=course_id, date="2026-11-12") == ["wed-1", "wed-2"]
    assert materials(course_id=course_id, date="2026-11-12", period_number=2) == ["wed-2"]
    assert materials(course_id=course_id, start_date="2026-11-11") == ["wed-1", "wed-2"]
    assert materials(course_id=course_id, end_date="2026-11-10") == ["mon"]
    assert sorted(materials(date="2026-11-12")) == ["other course", "wed-1", "wed-2"]
    assert materials(course_id=course_id, date="2026-11-11") == []


def test_list_is_paginated(client):
    course_id = _course(client)
    for day in range(1, 6):
        _save(client, course_id, date(2026, 11, day), material_covered=f"d{day}")

    page = client.get(URL, params={"course_id": course_id, "skip": 2, "limit": 2}).json()

    assert (page["total"], page["skip"], page["limit"]) == (5, 2, 2)
    assert page["pages"] == 3
    assert [item["material_covered"] for item in page["items"]] == ["d3", "d2"]


def test_a_reversed_date_range_is_a_400(client):
    resp = client.get(URL, params={"start_date": "2026-11-12", "end_date": "2026-11-01"})
    assert resp.status_code == 400, resp.text


def test_logs_of_a_deleted_course_are_hidden(client):
    course_id = _course(client)
    _save(client, course_id, material_covered="goes with the course")

    assert client.delete(f"/api/v1/courses/{course_id}").status_code in (200, 204)

    assert client.get(URL, params={"course_id": course_id}).json()["items"] == []
    assert client.get(URL).json()["items"] == []


# ---------------------------------------------------------------------------
# Races, registration
# ---------------------------------------------------------------------------


def test_a_save_that_loses_the_race_to_create_is_retried_as_an_update(client, db):
    from sqlalchemy.orm import Session

    from backend.models import LessonLog
    from backend.schemas.lesson_log import LessonLogUpsert
    from backend.services.lesson_log_service import LessonLogService

    course_id = _course(client)
    existing = _save(client, course_id, material_covered="saved by the other tab").json()

    # The shared `db` session is bound to an outer transaction in "rollback_only" mode: its
    # commit() never commits, but its rollback() undoes the whole test's data, including the other
    # tab's row. In production that save is really committed, so use a session whose rollback
    # only undoes the failed attempt (a SAVEPOINT) to see the same thing.
    session = Session(bind=db.get_bind(), join_transaction_mode="create_savepoint")
    try:
        service = LessonLogService(session)
        real_find = service._find
        lookups = []

        def blind_the_first_time(*args, **kwargs):
            # The other save committed after this one looked, so this one tries to insert.
            lookups.append(args)
            return None if len(lookups) == 1 else real_find(*args, **kwargs)

        service._find = blind_the_first_time  # type: ignore[method-assign]

        saved = service.upsert(LessonLogUpsert(course_id=course_id, date=DAY, teacher_notes="mine"))

        assert len(lookups) == 2
        assert saved.id == existing["id"]
        assert saved.material_covered == "saved by the other tab"  # not sent, so not overwritten
        assert saved.teacher_notes == "mine"
        assert session.query(LessonLog).count() == 1
    finally:
        session.close()


def test_the_router_is_registered(client):
    # The registry swallows import errors, so a broken router would otherwise vanish silently.
    methods = set(client.get("/openapi.json").json()["paths"][URL])
    assert {"get", "put"} <= methods


# ---------------------------------------------------------------------------
# Access: the teacher's notes are private to people who can edit attendance
# ---------------------------------------------------------------------------


def _headers_for(db, email: str, role: str) -> dict:
    from backend.models import User
    from backend.routers.routers_auth import create_access_token

    db.add(User(email=email, hashed_password="x", role=role, is_active=True))
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(subject=email, role=role)}"}


@pytest.fixture
def strict_auth(monkeypatch):
    """Turn real permission checks on; the suite runs with auth disabled by default."""
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)


@pytest.fixture
def course_id(client):
    """Created while auth is still off, so request this before strict_auth."""
    return _course(client)


@pytest.mark.auth_required
def test_anonymous_requests_are_refused(client, course_id, strict_auth):
    assert client.get(URL).status_code == 401
    assert _save(client, course_id, material_covered="x").status_code == 401


@pytest.mark.auth_required
@pytest.mark.parametrize("role", ["viewer", "guest", "student"])
def test_read_only_and_student_roles_can_neither_read_nor_write(client, db, course_id, strict_auth, role):
    headers = _headers_for(db, f"{role}@example.com", role)

    assert client.get(URL, headers=headers).status_code == 403
    assert _save(client, course_id, headers=headers, teacher_notes="x").status_code == 403


@pytest.mark.auth_required
@pytest.mark.parametrize("role", ["teacher", "staff", "admin"])
def test_people_who_can_edit_attendance_can_read_and_write(client, db, course_id, strict_auth, role):
    headers = _headers_for(db, f"{role}@example.com", role)

    saved = _save(client, course_id, headers=headers, teacher_notes="private")
    assert saved.status_code == 200, saved.text

    listed = client.get(URL, params={"course_id": course_id}, headers=headers)
    assert listed.status_code == 200, listed.text
    assert listed.json()["items"][0]["teacher_notes"] == "private"
