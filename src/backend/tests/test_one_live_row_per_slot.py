"""One live attendance row per teaching period, one live rating per category.

Nothing in the database stopped a second attendance row for the same student, course, date and
period, or a second daily-performance row for the same student, course, date and category. The
absence limits count attendance rows (fail above 30%, Class Participation lost above 10%) and
every rating row is one item in its category's average, so a repeat changed a student's result.
The live database had three ratings stored three times each.

Two partial unique indexes now keep one live row per slot (`deleted_at IS NULL`), and every
writer either updates the row that is there or reports the repeat:

- POST /daily-performance/ updates the slot's rating instead of adding another one;
- the per-record upserts and the sheet retry once when another save takes the slot first;
- the bulk endpoint and the semester import no longer add a slot twice within one request or
  file, and a file without a period no longer re-imports what is already stored.
"""

from datetime import date, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

pytestmark = pytest.mark.auth_required

TODAY = date.today()
DAY = str(TODAY)
ATTENDANCE = "/api/v1/attendance/"
RATINGS = "/api/v1/daily-performance/"


def _student(client, code: str) -> int:
    response = client.post(
        "/api/v1/students/",
        json={"student_id": code, "email": f"{code.lower()}@test.com", "first_name": "Slot", "last_name": code},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _course(client, code: str = "SLOT101") -> int:
    response = client.post(
        "/api/v1/courses/",
        json={"course_code": code, "course_name": "Slot course", "semester": "Fall 2026", "credits": 3},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _attendance_rows(client, course_id: int, day: str = DAY) -> list[dict]:
    response = client.get(f"/api/v1/attendance/date/{day}/course/{course_id}")
    assert response.status_code == 200, response.text
    return response.json()


def _rating_rows(client, course_id: int, day: str = DAY) -> list[dict]:
    response = client.get(f"/api/v1/daily-performance/date/{day}/course/{course_id}")
    assert response.status_code == 200, response.text
    return response.json()


def _rate(client, student_id: int, course_id: int, **fields) -> dict:
    payload = {"student_id": student_id, "course_id": course_id, "date": DAY, "category": "Homework", "score": 5}
    response = client.post(RATINGS, json={**payload, **fields})
    assert response.status_code == 200, response.text
    return response.json()


def _mark(client, student_id: int, course_id: int, **fields) -> dict:
    payload = {"student_id": student_id, "course_id": course_id, "date": DAY, "status": "Present"}
    response = client.post(ATTENDANCE, json={**payload, **fields})
    assert response.status_code == 201, response.text
    return response.json()


# ---------------------------------------------------------------------------
# The rule itself, in the database
# ---------------------------------------------------------------------------


def test_the_database_refuses_a_second_live_attendance_row_for_a_period(client, db):
    from backend.models import Attendance

    student_id, course_id = _student(client, "DBA001"), _course(client)
    slot = {"student_id": student_id, "course_id": course_id, "date": TODAY, "period_number": 2}
    db.add(Attendance(status="Absent", **slot))
    db.add(Attendance(status="Absent", **{**slot, "period_number": 3}))  # another period is fine
    db.flush()

    db.add(Attendance(status="Absent", **slot))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_a_deleted_attendance_row_does_not_keep_its_period(client, db):
    from backend.models import Attendance

    student_id, course_id = _student(client, "DBA002"), _course(client)
    slot = {"student_id": student_id, "course_id": course_id, "date": TODAY, "period_number": 1}
    first = Attendance(status="Absent", **slot)
    db.add(first)
    db.flush()
    first.mark_deleted()
    db.flush()

    db.add(Attendance(status="Present", **slot))
    db.flush()  # not refused: the index only covers live rows

    live = db.query(Attendance).filter(Attendance.student_id == student_id, Attendance.deleted_at.is_(None)).all()
    assert [row.status for row in live] == ["Present"]


def test_an_attendance_row_without_a_period_is_the_first_period(client, db):
    from backend.models import Attendance

    student_id, course_id = _student(client, "DBA003"), _course(client)
    row = Attendance(student_id=student_id, course_id=course_id, date=TODAY, status="Absent", period_number=None)
    db.add(row)
    db.flush()
    assert row.period_number == 1  # a NULL would be outside the unique key

    db.add(Attendance(student_id=student_id, course_id=course_id, date=TODAY, status="Absent", period_number=1))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_the_database_refuses_a_second_live_rating_for_a_category_but_not_after_a_delete(client, db):
    from backend.models import DailyPerformance

    student_id, course_id = _student(client, "DBR001"), _course(client)
    slot = {"student_id": student_id, "course_id": course_id, "date": TODAY, "category": "Homework"}
    first = DailyPerformance(score=5, **slot)
    db.add(first)
    db.add(DailyPerformance(score=5, **{**slot, "category": "Behaviour"}))  # another category is fine
    db.flush()

    first.mark_deleted()
    db.flush()
    db.add(DailyPerformance(score=7, **slot))
    db.flush()  # the deleted rating does not keep its place

    db.add(DailyPerformance(score=9, **slot))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


# ---------------------------------------------------------------------------
# Ratings: the per-record endpoints
# ---------------------------------------------------------------------------


def test_posting_a_rating_again_updates_it_instead_of_storing_it_twice(client):
    student_id, course_id = _student(client, "RAT001"), _course(client)

    first = _rate(client, student_id, course_id, score=5)
    other = _rate(client, student_id, course_id, category="Behaviour", score=3)
    # What a client sends when it does not know the row's id (its list was not loaded yet).
    again = _rate(client, student_id, course_id, score=8, max_score=20)

    assert again["id"] == first["id"]
    rows = {row["category"]: (row["id"], row["score"], row["max_score"]) for row in _rating_rows(client, course_id)}
    # The other rating is still there: the save was an update, not an insert that was refused,
    # rolled back (in this fixture that undoes the whole test) and then repeated.
    assert rows == {"Homework": (first["id"], 8, 20), "Behaviour": (other["id"], 3, 10)}


def test_posting_a_rating_again_keeps_its_notes_unless_new_ones_are_sent(client):
    student_id, course_id = _student(client, "RAT002"), _course(client)
    _rate(client, student_id, course_id, score=5, notes="forgot the book")

    assert _rate(client, student_id, course_id, score=6)["notes"] == "forgot the book"
    assert _rate(client, student_id, course_id, score=6, notes="brought it")["notes"] == "brought it"


def test_a_rating_can_be_recorded_again_after_it_was_deleted(client):
    student_id, course_id = _student(client, "RAT003"), _course(client)
    first = _rate(client, student_id, course_id, score=5)
    assert client.delete(f"{RATINGS}{first['id']}").status_code == 204

    second = _rate(client, student_id, course_id, score=9)

    assert second["id"] != first["id"]
    assert [(row["id"], row["score"]) for row in _rating_rows(client, course_id)] == [(second["id"], 9)]


def test_ratings_for_other_days_categories_and_students_are_separate_rows(client):
    course_id = _course(client)
    first_student, second_student = _student(client, "RAT004"), _student(client, "RAT005")
    yesterday = str(TODAY - timedelta(days=1))

    ids = {
        _rate(client, first_student, course_id)["id"],
        _rate(client, first_student, course_id, category="Behaviour")["id"],
        _rate(client, first_student, course_id, date=yesterday)["id"],
        _rate(client, second_student, course_id)["id"],
    }

    assert len(ids) == 4


def test_moving_a_rating_onto_a_category_that_is_taken_is_a_conflict(client):
    student_id, course_id = _student(client, "RAT006"), _course(client)
    _rate(client, student_id, course_id, category="Homework", score=5)
    behaviour = _rate(client, student_id, course_id, category="Behaviour", score=6)

    # Last step on purpose: the refused request rolls its transaction back, which in this
    # fixture (one outer transaction for the whole test) also undoes the rows created above.
    refused = client.put(f"{RATINGS}{behaviour['id']}", json={"category": "Homework"})

    assert refused.status_code == 409, refused.text
    assert "PRF_CONFLICT" in refused.text


def test_a_rating_can_move_to_a_free_category_and_a_null_category_is_not_a_change(client):
    student_id, course_id = _student(client, "RAT007"), _course(client)
    _rate(client, student_id, course_id, category="Homework", score=5)
    behaviour = _rate(client, student_id, course_id, category="Behaviour", score=6)

    assert client.put(f"{RATINGS}{behaviour['id']}", json={"category": "Effort"}).status_code == 200
    kept = client.put(f"{RATINGS}{behaviour['id']}", json={"category": None, "score": 7})

    assert kept.status_code == 200, kept.text
    assert (kept.json()["category"], kept.json()["score"]) == ("Effort", 7)
    assert sorted(row["category"] for row in _rating_rows(client, course_id)) == ["Effort", "Homework"]


# ---------------------------------------------------------------------------
# Attendance: the per-record endpoints
# ---------------------------------------------------------------------------


def test_an_attendance_update_with_a_null_period_keeps_the_period(client):
    student_id, course_id = _student(client, "ATT001"), _course(client)
    record = _mark(client, student_id, course_id, period_number=2)

    updated = client.put(f"{ATTENDANCE}{record['id']}", json={"status": "Absent", "period_number": None})

    assert updated.status_code == 200, updated.text
    assert (updated.json()["status"], updated.json()["period_number"]) == ("Absent", 2)


def test_moving_attendance_onto_a_period_that_is_taken_is_a_conflict(client):
    student_id, course_id = _student(client, "ATT002"), _course(client)
    _mark(client, student_id, course_id, period_number=1)
    second = _mark(client, student_id, course_id, period_number=2)

    assert sorted(row["period_number"] for row in _attendance_rows(client, course_id)) == [1, 2]

    refused = client.put(f"{ATTENDANCE}{second['id']}", json={"period_number": 1})

    assert refused.status_code == 409, refused.text
    assert "ATT_CONFLICT" in refused.text


def test_bulk_create_reports_a_slot_repeated_in_the_request_and_saves_the_rest(client):
    course_id = _course(client)
    first_student, second_student = _student(client, "BLK001"), _student(client, "BLK002")

    def record(student_id: int, status: str = "Present") -> dict:
        return {"student_id": student_id, "course_id": course_id, "date": DAY, "status": status, "period_number": 1}

    response = client.post(
        "/api/v1/attendance/bulk/create",
        json=[record(first_student), record(first_student, "Absent"), record(second_student)],
    )

    # It used to store both rows of the first student; with the unique key it would fail as a whole.
    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["created"], body["failed"]) == (2, 1)
    assert [error["index"] for error in body["errors"]] == [1]
    saved = {row["student_id"]: row["status"] for row in _attendance_rows(client, course_id)}
    assert saved == {first_student: "Present", second_student: "Present"}


# ---------------------------------------------------------------------------
# Races: another save takes the slot between the lookup and the insert
# ---------------------------------------------------------------------------
# The shared `db` session is bound to an outer transaction in "rollback_only" mode: its rollback()
# undoes the whole test's data, including the other save's row. In production that row is really
# committed, so these use a session whose rollback only undoes the failed attempt (a SAVEPOINT).


def test_an_attendance_save_that_loses_the_race_is_retried_as_an_update(client, db):
    from backend.models import Attendance
    from backend.schemas.attendance import AttendanceCreate
    from backend.services.attendance_service import AttendanceService

    student_id, course_id = _student(client, "RACE01"), _course(client)
    other = _mark(client, student_id, course_id, status="Present", period_number=1)

    session = Session(bind=db.get_bind(), join_transaction_mode="create_savepoint")
    try:
        service = AttendanceService(session)
        real_find = service._find_live
        lookups = []

        def blind_the_first_time(*args):
            # The other save committed after this one looked, so this one tries to insert.
            lookups.append(args)
            return None if len(lookups) == 1 else real_find(*args)

        service._find_live = blind_the_first_time  # type: ignore[method-assign]

        saved = service.create_attendance(
            AttendanceCreate(student_id=student_id, course_id=course_id, date=TODAY, status="Absent", period_number=1)
        )

        assert len(lookups) == 2
        assert saved.id == other["id"]
        assert saved.status == "Absent"
        assert session.query(Attendance).filter(Attendance.student_id == student_id).count() == 1
    finally:
        session.close()


def test_a_rating_save_that_loses_the_race_is_retried_as_an_update(client, db, monkeypatch):
    from backend.models import DailyPerformance
    from backend.routers.routers_performance import DailyPerformanceCreate
    from backend.services.daily_performance_service import DailyPerformanceService

    student_id, course_id = _student(client, "RACE02"), _course(client)
    other = _rate(client, student_id, course_id, score=5, notes="from the other tab")

    session = Session(bind=db.get_bind(), join_transaction_mode="create_savepoint")
    try:
        real_find = DailyPerformanceService._find_live
        lookups = []

        def blind_the_first_time(*args):
            lookups.append(args)
            return None if len(lookups) == 1 else real_find(*args)

        monkeypatch.setattr(DailyPerformanceService, "_find_live", staticmethod(blind_the_first_time))

        saved = DailyPerformanceService.create(
            session,
            DailyPerformanceCreate(
                student_id=student_id, course_id=course_id, date=TODAY, category="Homework", score=9
            ),
        )

        assert len(lookups) == 2
        assert saved.id == other["id"]
        assert (saved.score, saved.notes) == (9, "from the other tab")
        assert session.query(DailyPerformance).filter(DailyPerformance.student_id == student_id).count() == 1
    finally:
        session.close()


def test_a_sheet_that_loses_the_race_is_applied_once_more_and_no_more(client, db, monkeypatch):
    import backend.services.attendance_sheet_service as sheet_service
    from backend.schemas.attendance import AttendanceSheetResult, AttendanceSheetSave

    course_id = _course(client)
    sheet = AttendanceSheetSave(course_id=course_id, date=TODAY)
    lost = IntegrityError("INSERT INTO attendances", {}, Exception("UNIQUE constraint failed"))
    attempts = []

    def lose_then_win(*_args):
        attempts.append(1)
        if len(attempts) == 1:
            raise lost
        return AttendanceSheetResult(attendance_updated=3)

    monkeypatch.setattr(sheet_service, "_apply_sheet", lose_then_win)
    result = sheet_service.save_attendance_sheet(db, sheet)
    assert (len(attempts), result.attendance_updated) == (2, 3)

    def always_lose(*_args):
        attempts.append(1)
        raise lost

    attempts.clear()
    monkeypatch.setattr(sheet_service, "_apply_sheet", always_lose)
    with pytest.raises(IntegrityError):
        sheet_service.save_attendance_sheet(db, sheet)
    assert len(attempts) == 2


def test_a_sheet_can_clear_a_rating_and_set_it_again_in_one_request(client):
    # The soft delete and the new row for the same slot are written in one flush; the unique
    # key must see them in that order.
    student_id, course_id = _student(client, "SHT001"), _course(client)
    first = _rate(client, student_id, course_id, score=4)

    response = client.post(
        "/api/v1/attendance/sheet",
        json={
            "course_id": course_id,
            "date": DAY,
            "daily_performance_deletes": [{"student_id": student_id, "category": "Homework"}],
            "daily_performance": [{"student_id": student_id, "category": "Homework", "score": 9}],
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["performance_deleted"], body["performance_created"]) == (1, 1)
    rows = _rating_rows(client, course_id)
    assert [row["score"] for row in rows] == [9]
    assert rows[0]["id"] != first["id"]


# ---------------------------------------------------------------------------
# The semester import
# ---------------------------------------------------------------------------


def _import_results() -> dict:
    counters = {"created": 0, "updated": 0, "skipped": 0, "errors": []}
    return {"summary": {"attendance": dict(counters, errors=[]), "daily_performance": dict(counters, errors=[])}}


def test_importing_attendance_without_a_period_does_not_store_it_again(client, db):
    from backend.models import Attendance
    from backend.routers.routers_sessions import _import_attendance

    student_id, course_id = _student(client, "IMP001"), _course(client, "IMP101")
    _mark(client, student_id, course_id, status="Absent")  # period 1
    record = {"student_id_ref": "IMP001", "course_code_ref": "IMP101", "date": DAY, "status": "Absent"}

    results = _import_results()
    # No "period_number" in the file. The lookup used to ask for a row "without a period", never
    # found the stored one, and added the absence a second time.
    _import_attendance(db, [record, {**record, "period_number": None}], "skip", results)
    db.flush()

    summary = results["summary"]["attendance"]
    assert (summary["created"], summary["skipped"], summary["errors"]) == (0, 2, [])
    assert db.query(Attendance).filter(Attendance.student_id == student_id).count() == 1


def test_an_import_file_that_repeats_a_slot_adds_it_once(client, db):
    from backend.models import Attendance, DailyPerformance
    from backend.routers.routers_sessions import _import_attendance, _import_daily_performance

    student_id, _course_id = _student(client, "IMP002"), _course(client, "IMP102")
    refs = {"student_id_ref": "IMP002", "course_code_ref": "IMP102", "date": DAY}
    results = _import_results()

    _import_attendance(
        db,
        [{**refs, "status": "Present", "period_number": 1}, {**refs, "status": "Absent", "period_number": 1}],
        "update",
        results,
    )
    _import_daily_performance(
        db,
        [
            {**refs, "category": "Homework", "score": 5, "max_score": 10},
            {**refs, "category": "Homework", "score": 8, "max_score": 10},
        ],
        "skip",
        results,
    )
    db.flush()  # used to write two rows per slot; with the unique key it would fail here

    attendance = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    ratings = db.query(DailyPerformance).filter(DailyPerformance.student_id == student_id).all()
    assert [row.status for row in attendance] == ["Absent"]  # "update": the later line wins
    assert [row.score for row in ratings] == [5]  # "skip": the first line stays
    assert (results["summary"]["attendance"]["created"], results["summary"]["attendance"]["updated"]) == (1, 1)
    assert (
        results["summary"]["daily_performance"]["created"],
        results["summary"]["daily_performance"]["skipped"],
    ) == (1, 1)
