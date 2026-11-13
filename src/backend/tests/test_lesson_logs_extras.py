"""Lesson log follow-ups (plan todos 45-47).

- 45: the PDF / Excel export of one course's log, and that the teacher's private notes stay out of
  it unless they are asked for.
- 46: the last editor is recorded (migration e5b2c7a9d4f1) when the text really changes.
- 47: the semester export / import carries the lesson logs.
"""

import json
from datetime import date
from io import BytesIO
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text

URL = "/api/v1/lesson-logs/"
EXPORT_URL = "/api/v1/lesson-logs/export"
DAY = date(2026, 11, 12)
SEMESTER = "Fall 2026"


def _course(client, code: str = "LX101", semester: str = SEMESTER) -> int:
    resp = client.post(
        "/api/v1/courses/",
        json={"course_code": code, "course_name": f"Μάθημα {code}", "semester": semester, "credits": 3},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _save(client, course_id: int, day: date = DAY, period: int = 1, headers=None, **fields):
    return client.put(
        URL,
        json={"course_id": course_id, "date": str(day), "period_number": period, **fields},
        headers=headers,
    )


def _user_headers(db, email: str, role: str = "teacher", full_name: str | None = None) -> dict:
    from backend.models import User
    from backend.routers.routers_auth import create_access_token

    db.add(User(email=email, hashed_password="x", role=role, is_active=True, full_name=full_name))
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(subject=email, role=role)}"}


@pytest.fixture
def strict_auth(monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)


@pytest.fixture
def course_id(client):
    """Created while auth is still off, so request this before strict_auth."""
    return _course(client)


# ---------------------------------------------------------------------------
# 46: last editor
# ---------------------------------------------------------------------------


@pytest.mark.auth_required
def test_the_signed_in_user_is_recorded_as_the_last_editor(client, db, course_id, strict_auth):
    maria = _user_headers(db, "maria@example.com", full_name="Μαρία Παπαδοπούλου")
    nikos = _user_headers(db, "nikos@example.com")  # no full name: the e-mail stands in

    created = _save(client, course_id, headers=maria, material_covered="Κεφάλαιο 1").json()
    assert created["updated_by_name"] == "Μαρία Παπαδοπούλου"

    edited = _save(client, course_id, headers=nikos, teacher_notes="quiz next week").json()
    assert edited["updated_by_name"] == "nikos@example.com"

    listed = client.get(URL, params={"course_id": course_id}, headers=maria).json()["items"][0]
    assert listed["updated_by_name"] == "nikos@example.com"


@pytest.mark.auth_required
def test_resending_the_stored_text_does_not_change_the_last_editor(client, db, course_id, strict_auth):
    # An autosave retry or the offline queue replaying must not put a second name on the entry.
    maria = _user_headers(db, "maria@example.com", full_name="Maria")
    nikos = _user_headers(db, "nikos@example.com", full_name="Nikos")
    _save(client, course_id, headers=maria, material_covered="Chapter 1")

    same = _save(client, course_id, headers=nikos, material_covered="Chapter 1").json()
    assert same["updated_by_name"] == "Maria"

    changed = _save(client, course_id, headers=nikos, material_covered="Chapters 1 and 2").json()
    assert changed["updated_by_name"] == "Nikos"


def test_with_authentication_off_nobody_is_recorded(client):
    # The placeholder "Admin User" of disabled auth is not a person and must not be stored.
    course_id = _course(client)

    saved = _save(client, course_id, material_covered="x").json()

    assert saved["updated_by_name"] is None


def _alembic(url: str):
    from alembic.config import Config

    # No alembic.ini on purpose: see test_lesson_logs_migration._alembic.
    cfg = Config()
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def test_the_migration_adds_two_nullable_columns_and_keeps_existing_rows(tmp_path):
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, "d3a7b9c1e5f2")
    engine = create_engine(url)
    try:
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO lesson_logs (course_id, date, period_number, material_covered) VALUES (1, '2026-11-12', 1, 'kept')")
            )
        before = {column["name"] for column in inspect(engine).get_columns("lesson_logs")}

        command.upgrade(cfg, "e5b2c7a9d4f1")
        command.stamp(cfg, "d3a7b9c1e5f2")
        command.upgrade(cfg, "e5b2c7a9d4f1")  # columns already there: must not fail

        columns = {column["name"]: column for column in inspect(engine).get_columns("lesson_logs")}
        assert set(columns) - before == {"updated_by_id", "updated_by_name"}
        assert columns["updated_by_id"]["nullable"] and columns["updated_by_name"]["nullable"]
        with engine.connect() as conn:
            row = conn.execute(text("SELECT material_covered, updated_by_name FROM lesson_logs")).one()
        assert tuple(row) == ("kept", None)

        command.downgrade(cfg, "d3a7b9c1e5f2")
        assert {column["name"] for column in inspect(engine).get_columns("lesson_logs")} == before
    finally:
        engine.dispose()


# ---------------------------------------------------------------------------
# 45: PDF / Excel export
# ---------------------------------------------------------------------------


def _sheet(resp):
    from openpyxl import load_workbook

    assert resp.status_code == 200, resp.text
    return load_workbook(BytesIO(resp.content)).active


def _cells(ws) -> list[str]:
    return [str(cell.value) for row in ws.iter_rows() for cell in row if cell.value is not None]


def _pdf_text(content: bytes) -> str:
    pypdf = pytest.importorskip("pypdf")
    reader = pypdf.PdfReader(BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def test_excel_lists_the_material_in_teaching_order_without_the_notes(client):
    course_id = _course(client)
    _save(client, course_id, date(2026, 11, 12), 2, material_covered="wed second hour", teacher_notes="PRIVATE-A")
    _save(client, course_id, date(2026, 11, 12), 1, material_covered="wed first hour")
    _save(client, course_id, date(2026, 11, 10), 1, material_covered="Δευτέρα: διανύσματα")
    _save(client, course_id, date(2026, 11, 11), 1, teacher_notes="PRIVATE-ONLY")  # nothing to print

    resp = client.get(f"{EXPORT_URL}/excel", params={"course_id": course_id, "lang": "el"})

    ws = _sheet(resp)
    assert resp.headers["content-type"].startswith("application/vnd.openxmlformats")
    assert resp.headers["content-disposition"].startswith("attachment; filename=lesson_log_LX101_")
    cells = _cells(ws)
    material = [value for value in cells if value in ("wed first hour", "wed second hour", "Δευτέρα: διανύσματα")]
    assert material == ["Δευτέρα: διανύσματα", "wed first hour", "wed second hour"]
    assert "Διδακτέα ύλη" in cells and "Σημειώσεις καθηγητή" not in cells
    assert not any("PRIVATE" in value for value in cells)
    # The note-only period is not even listed as an empty row.
    assert not any("2026-11-11" in value for value in cells)


def test_excel_includes_the_notes_only_on_request(client):
    course_id = _course(client)
    _save(client, course_id, date(2026, 11, 12), 1, material_covered="material", teacher_notes="PRIVATE-A")
    _save(client, course_id, date(2026, 11, 11), 1, teacher_notes="PRIVATE-ONLY")

    cells = _cells(_sheet(client.get(f"{EXPORT_URL}/excel", params={"course_id": course_id, "include_notes": "true"})))

    assert "Teacher's notes" in cells
    assert "PRIVATE-A" in cells and "PRIVATE-ONLY" in cells


def test_excel_keeps_typed_text_as_text(client):
    # A line that starts with "=" must not become a formula in the teacher's spreadsheet.
    course_id = _course(client)
    _save(client, course_id, material_covered='=HYPERLINK("http://example.com","x")')

    ws = _sheet(client.get(f"{EXPORT_URL}/excel", params={"course_id": course_id}))

    cell = next(cell for row in ws.iter_rows() for cell in row if str(cell.value).startswith("=HYPERLINK"))
    assert cell.data_type == "s"


def test_export_respects_the_date_range(client):
    course_id = _course(client)
    _save(client, course_id, date(2026, 11, 10), material_covered="early")
    _save(client, course_id, date(2026, 11, 20), material_covered="late")

    cells = _cells(
        _sheet(client.get(f"{EXPORT_URL}/excel", params={"course_id": course_id, "start_date": "2026-11-15"}))
    )

    assert "late" in cells and "early" not in cells


def test_pdf_is_a_pdf_with_greek_text_and_no_notes(client):
    course_id = _course(client)
    _save(client, course_id, material_covered="Πρώτο κεφάλαιο: διανύσματα\n<b>δεύτερη γραμμή</b> & άλλα", teacher_notes="PRIVATE-A")

    resp = client.get(f"{EXPORT_URL}/pdf", params={"course_id": course_id, "lang": "el"})

    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")
    assert resp.headers["content-disposition"].endswith(".pdf")
    extracted = _pdf_text(resp.content)
    assert "Καταγραφή μαθήματος" in extracted
    assert "διανύσματα" in extracted
    assert "<b>" in extracted  # typed markup is printed, not interpreted
    assert "PRIVATE" not in extracted

    with_notes = client.get(f"{EXPORT_URL}/pdf", params={"course_id": course_id, "include_notes": "true"})
    assert "PRIVATE-A" in _pdf_text(with_notes.content)


def test_pdf_handles_an_entry_longer_than_a_page(client):
    # A table row cannot break across pages; this is why the PDF is built from paragraphs.
    course_id = _course(client)
    _save(client, course_id, material_covered="\n".join(f"γραμμή {n}" for n in range(1, 400)))

    resp = client.get(f"{EXPORT_URL}/pdf", params={"course_id": course_id})

    assert resp.status_code == 200, resp.text
    pypdf = pytest.importorskip("pypdf")
    assert len(pypdf.PdfReader(BytesIO(resp.content)).pages) > 1


def test_export_of_an_empty_log_still_produces_a_file(client):
    course_id = _course(client)

    assert client.get(f"{EXPORT_URL}/pdf", params={"course_id": course_id}).content.startswith(b"%PDF")
    cells = _cells(_sheet(client.get(f"{EXPORT_URL}/excel", params={"course_id": course_id})))
    assert any(value.startswith("No lesson log entries") for value in cells)


def test_export_rejects_bad_requests(client):
    course_id = _course(client)

    assert client.get(f"{EXPORT_URL}/excel").status_code == 422  # no course
    assert client.get(f"{EXPORT_URL}/csv", params={"course_id": course_id}).status_code == 422
    assert client.get(f"{EXPORT_URL}/pdf", params={"course_id": 987654}).status_code == 404
    reversed_range = {"course_id": course_id, "start_date": "2026-11-12", "end_date": "2026-11-01"}
    assert client.get(f"{EXPORT_URL}/pdf", params=reversed_range).status_code == 400


@pytest.mark.auth_required
@pytest.mark.parametrize("role", ["viewer", "guest", "student"])
def test_read_only_roles_cannot_export(client, db, course_id, strict_auth, role):
    headers = _user_headers(db, f"{role}@example.com", role)

    assert client.get(f"{EXPORT_URL}/pdf", params={"course_id": course_id}, headers=headers).status_code == 403
    assert client.get(f"{EXPORT_URL}/excel", params={"course_id": course_id}).status_code == 401


@pytest.mark.auth_required
def test_a_teacher_can_export(client, db, course_id, strict_auth):
    headers = _user_headers(db, "teacher@example.com", "teacher", "Teacher One")
    _save(client, course_id, headers=headers, material_covered="taught")

    cells = _cells(_sheet(client.get(f"{EXPORT_URL}/excel", params={"course_id": course_id}, headers=headers)))

    assert "taught" in cells and "Teacher One" in cells


# ---------------------------------------------------------------------------
# 47: semester export / import
# ---------------------------------------------------------------------------


def _export(client, semester: str = SEMESTER) -> dict:
    resp = client.get("/api/v1/sessions/export", params={"semester": semester})
    assert resp.status_code == 200, resp.text
    return json.loads(resp.content.decode("utf-8"))


def _import(client, package: dict, **params):
    files = {"file": ("session.json", json.dumps(package).encode("utf-8"), "application/json")}
    return client.post("/api/v1/sessions/import", params=params, files=files)


def test_semester_export_carries_the_lesson_logs(client):
    course_id = _course(client, "LX101")
    other_semester = _course(client, "LX900", semester="Spring 2027")
    _save(client, course_id, date(2026, 11, 12), 2, material_covered="second", teacher_notes="note")
    _save(client, course_id, date(2026, 11, 12), 1, material_covered="first")
    _save(client, other_semester, material_covered="not this semester")

    exported = _export(client)

    assert exported["metadata"]["counts"]["lesson_logs"] == 2
    assert exported["lesson_logs"] == [
        {
            "course_code_ref": "LX101",
            "date": "2026-11-12",
            "period_number": 1,
            "material_covered": "first",
            "teacher_notes": None,
            "updated_by_name": None,
        },
        {
            "course_code_ref": "LX101",
            "date": "2026-11-12",
            "period_number": 2,
            "material_covered": "second",
            "teacher_notes": "note",
            "updated_by_name": None,
        },
    ]


def _package(lesson_logs: list[dict]) -> dict:
    return {
        "metadata": {"semester": SEMESTER},
        "courses": [{"course_code": "LX101", "course_name": "Course LX101", "semester": SEMESTER, "credits": 3}],
        "students": [],
        "enrollments": [],
        "grades": [],
        "attendance": [],
        "daily_performance": [],
        "highlights": [],
        "lesson_logs": lesson_logs,
    }


def _log(day: str = "2026-11-12", period: int = 1, **fields) -> dict:
    return {"course_code_ref": "LX101", "date": day, "period_number": period, **fields}


def test_semester_import_creates_the_lesson_logs(client):
    package = _package(
        [
            _log(material_covered="Κεφάλαιο 1", teacher_notes="note", updated_by_name="Μαρία"),
            _log(period=2, material_covered="Κεφάλαιο 2"),
        ]
    )

    dry = _import(client, package, dry_run="true")
    assert dry.status_code == 200, dry.text
    assert dry.json()["counts"]["lesson_logs"] == 2

    resp = _import(client, package)

    assert resp.status_code == 200, resp.text
    assert resp.json()["summary"]["lesson_logs"] == {"created": 2, "updated": 0, "skipped": 0, "errors": []}
    items = client.get(URL, params={"date": "2026-11-12"}).json()["items"]
    assert [(i["period_number"], i["material_covered"], i["teacher_notes"], i["updated_by_name"]) for i in items] == [
        (1, "Κεφάλαιο 1", "note", "Μαρία"),
        (2, "Κεφάλαιο 2", None, None),
    ]


def test_semester_import_updates_or_skips_existing_lesson_logs(client):
    course_id = _course(client, "LX101")
    _save(client, course_id, material_covered="here already")
    package = _package([_log(material_covered="from the file", updated_by_name="Maria")])

    skipped = _import(client, package, merge_strategy="skip")
    assert skipped.json()["summary"]["lesson_logs"]["skipped"] == 1
    assert client.get(URL, params={"course_id": course_id}).json()["items"][0]["material_covered"] == "here already"

    updated = _import(client, package, merge_strategy="update")
    assert updated.json()["summary"]["lesson_logs"]["updated"] == 1
    item = client.get(URL, params={"course_id": course_id}).json()["items"]
    assert len(item) == 1
    assert (item[0]["material_covered"], item[0]["updated_by_name"]) == ("from the file", "Maria")


def test_semester_import_survives_a_repeated_key_and_bad_entries(client):
    package = _package(
        [
            _log(material_covered="first copy"),
            _log(material_covered="second copy"),  # same course, date and period
            {"course_code_ref": "NOPE", "date": "2026-11-12", "period_number": 1, "material_covered": "x"},
            {"course_code_ref": "LX101", "period_number": 1, "material_covered": "no date"},
        ]
    )

    resp = _import(client, package)

    assert resp.status_code == 200, resp.text
    summary = resp.json()["summary"]["lesson_logs"]
    assert (summary["created"], summary["updated"], len(summary["errors"])) == (1, 1, 2)
    items = client.get(URL).json()["items"]
    assert [item["material_covered"] for item in items] == ["second copy"]


def test_an_export_file_from_before_lesson_logs_still_imports(client):
    package = _package([])
    del package["lesson_logs"]

    resp = _import(client, package)

    assert resp.status_code == 200, resp.text
    assert resp.json()["summary"]["lesson_logs"]["created"] == 0


def test_a_semester_round_trip_keeps_the_lesson_logs(client, db):
    from backend.models import LessonLog

    course_id = _course(client, "LX101")
    _save(client, course_id, material_covered="Κεφάλαιο 1", teacher_notes="σημείωση")
    exported = _export(client)

    db.query(LessonLog).delete()
    db.commit()
    assert client.get(URL).json()["total"] == 0

    assert _import(client, exported).status_code == 200

    item = client.get(URL, params={"course_id": course_id}).json()["items"][0]
    assert (item["material_covered"], item["teacher_notes"]) == ("Κεφάλαιο 1", "σημείωση")
