"""Privacy hardening (2026-11-13).

- Health information (GDPR Art. 9) is no longer part of the general student response; only an
  administrator reads or writes it, the audit log never stores its text, and the semester export
  leaves it out unless an administrator asks for it.
- A staff member's notes about students are stored per account on the server (migration
  f6c3d8b1a2e4) instead of in the browser.
- The public privacy-info endpoint returns the configured controller contact and nothing else.
"""

import json
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect

STUDENTS = "/api/v1/students/"
NOTES = "/api/v1/student-notes/"


def _student(client, n: int = 1, **extra) -> dict:
    payload = {
        "first_name": "Μαρία",
        "last_name": f"Δοκιμή{n}",
        "email": f"privacy{n}@example.com",
        "student_id": f"PRV{n:03d}",
        **extra,
    }
    resp = client.post(STUDENTS, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _headers(db, email: str, role: str) -> dict:
    from backend.models import User
    from backend.routers.routers_auth import create_access_token

    db.add(User(email=email, hashed_password="x", role=role, is_active=True))
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(subject=email, role=role)}"}


@pytest.fixture
def strict_auth(monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)


@pytest.fixture
def student_with_health(client):
    """Created while auth is still off (an install without accounts may record it)."""
    student = _student(client, 1, health_issue="Διαβήτης τύπου 1")
    return student["id"]


# ---------------------------------------------------------------------------
# Health information
# ---------------------------------------------------------------------------


def test_student_responses_never_carry_health_information(client, student_with_health):
    created = _student(client, 2, health_issue="Άσθμα")
    listed = client.get(STUDENTS).json()["items"]
    single = client.get(f"{STUDENTS}{student_with_health}").json()
    updated = client.put(f"{STUDENTS}{student_with_health}", json={"phone": "22123456"}).json()

    for body in [created, single, updated, *listed]:
        assert "health_issue" not in body
    assert "Διαβήτης" not in json.dumps(listed, ensure_ascii=False)


def test_the_health_endpoint_reads_and_writes_it(client, student_with_health):
    url = f"{STUDENTS}{student_with_health}/health"

    assert client.get(url).json() == {"student_id": student_with_health, "health_issue": "Διαβήτης τύπου 1"}
    assert client.put(url, json={"health_issue": "Αλλεργία"}).json()["health_issue"] == "Αλλεργία"
    assert client.put(url, json={"health_issue": "  "}).json()["health_issue"] is None
    assert client.get(f"{STUDENTS}987654/health").status_code == 404


@pytest.mark.auth_required
@pytest.mark.parametrize("role", ["teacher", "staff", "viewer"])
def test_only_an_administrator_reaches_health_information(client, db, student_with_health, strict_auth, role):
    headers = _headers(db, f"{role}@example.com", role)
    admin = _headers(db, "admin2@example.com", "admin")
    url = f"{STUDENTS}{student_with_health}/health"

    assert client.get(url, headers=headers).status_code == 403
    assert client.put(url, json={"health_issue": "x"}, headers=headers).status_code == 403
    assert client.get(url).status_code == 401
    assert client.get(url, headers=admin).json()["health_issue"] == "Διαβήτης τύπου 1"


@pytest.mark.auth_required
def test_a_teacher_can_neither_set_nor_wipe_health_information(client, db, student_with_health, strict_auth):
    teacher = _headers(db, "teacher@example.com", "teacher")
    admin = _headers(db, "admin2@example.com", "admin")

    # The edit form does not send the field; a hand-made request that does is ignored for it.
    edited = client.put(
        f"{STUDENTS}{student_with_health}", json={"phone": "22000000", "health_issue": ""}, headers=teacher
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["phone"] == "22000000"
    assert client.get(f"{STUDENTS}{student_with_health}/health", headers=admin).json()["health_issue"] == "Διαβήτης τύπου 1"

    created = client.post(
        STUDENTS,
        json={"first_name": "A", "last_name": "B", "email": "t-made@example.com", "student_id": "PRV900", "health_issue": "x"},
        headers=teacher,
    )
    assert created.status_code == 201, created.text
    assert client.get(f"{STUDENTS}{created.json()['id']}/health", headers=admin).json()["health_issue"] is None


def test_the_audit_log_does_not_copy_the_health_text(client, db, student_with_health):
    from backend.models import AuditLog

    client.put(f"{STUDENTS}{student_with_health}/health", json={"health_issue": "Επιληψία"})
    client.put(f"{STUDENTS}{student_with_health}", json={"phone": "22111111"})

    rows = db.query(AuditLog).all()
    dumped = json.dumps(
        [[row.old_values, row.new_values, row.details] for row in rows], ensure_ascii=False, default=str
    )
    assert rows, "the student changes above are audited"
    assert "Επιληψία" not in dumped and "Διαβήτης" not in dumped
    assert "[recorded]" in dumped


def _export(client, semester: str, **params) -> dict:
    resp = client.get("/api/v1/sessions/export", params={"semester": semester, **params})
    assert resp.status_code == 200, resp.text
    return json.loads(resp.content.decode("utf-8"))


@pytest.fixture
def enrolled(client, student_with_health):
    course = client.post(
        "/api/v1/courses/",
        json={"course_code": "PRV101", "course_name": "Privacy", "semester": "Fall 2026", "credits": 3},
    ).json()
    resp = client.post(f"/api/v1/enrollments/course/{course['id']}", json={"student_ids": [student_with_health]})
    assert resp.status_code == 200, resp.text
    return student_with_health


def test_the_semester_export_leaves_health_out_unless_asked(client, enrolled):
    plain = _export(client, "Fall 2026")
    assert len(plain["students"]) == 1
    assert "health_issue" not in plain["students"][0]
    assert "Διαβήτης" not in json.dumps(plain, ensure_ascii=False)

    full = _export(client, "Fall 2026", include_health="true")
    assert full["students"][0]["health_issue"] == "Διαβήτης τύπου 1"


def test_importing_an_export_without_health_keeps_what_is_stored(client, enrolled):
    package = _export(client, "Fall 2026")
    files = {"file": ("session.json", json.dumps(package).encode("utf-8"), "application/json")}

    assert client.post("/api/v1/sessions/import", files=files).status_code == 200

    assert client.get(f"{STUDENTS}{enrolled}/health").json()["health_issue"] == "Διαβήτης τύπου 1"


@pytest.mark.auth_required
def test_include_health_is_ignored_for_a_non_administrator(client, db, enrolled, strict_auth):
    teacher = _headers(db, "teacher@example.com", "teacher")
    resp = client.get(
        "/api/v1/sessions/export", params={"semester": "Fall 2026", "include_health": "true"}, headers=teacher
    )
    # Whether a teacher may export a semester at all is not this test's business.
    if resp.status_code == 200:
        assert "Διαβήτης" not in resp.content.decode("utf-8")
    else:
        assert resp.status_code == 403


def test_the_encrypted_semester_archive_keeps_health(db, client, enrolled):
    from backend.services.session_data_service import build_semester_export_payload

    assert "health_issue" not in build_semester_export_payload(db, "Fall 2026")["students"][0]
    kept = build_semester_export_payload(db, "Fall 2026", include_health=True)["students"][0]
    assert kept["health_issue"] == "Διαβήτης τύπου 1"


# ---------------------------------------------------------------------------
# Private notes
# ---------------------------------------------------------------------------


def test_a_note_is_saved_listed_changed_and_removed(client):
    first, second = _student(client, 1)["id"], _student(client, 2)["id"]

    assert client.get(NOTES).json() == {"notes": {}}
    saved = client.put(f"{NOTES}{first}", json={"text": "Χρειάζεται στήριξη\nστα μαθηματικά"})
    assert saved.status_code == 200, saved.text
    client.put(f"{NOTES}{second}", json={"text": "ok"})
    assert client.get(NOTES).json() == {"notes": {str(first): "Χρειάζεται στήριξη\nστα μαθηματικά", str(second): "ok"}}

    client.put(f"{NOTES}{first}", json={"text": "changed"})
    client.put(f"{NOTES}{second}", json={"text": "   "})
    assert client.get(NOTES).json() == {"notes": {str(first): "changed"}}


def test_note_validation(client):
    student_id = _student(client)["id"]

    assert client.put(f"{NOTES}987654", json={"text": "x"}).status_code == 404
    assert client.put(f"{NOTES}{student_id}", json={"text": "x" * 20001}).status_code == 422
    assert client.put(f"{NOTES}{student_id}", json={"text": "x" * 20000}).status_code == 200


def test_notes_of_a_deleted_student_are_not_listed(client):
    student_id = _student(client)["id"]
    client.put(f"{NOTES}{student_id}", json={"text": "x"})

    assert client.delete(f"{STUDENTS}{student_id}").status_code in (200, 204)

    assert client.get(NOTES).json() == {"notes": {}}


@pytest.mark.auth_required
def test_each_account_sees_only_its_own_notes(client, db, strict_auth):
    from backend.models import Student

    db.add(Student(first_name="A", last_name="B", email="own-notes@example.com", student_id="PRV777"))
    db.commit()
    student_id = db.query(Student).filter(Student.student_id == "PRV777").one().id
    maria = _headers(db, "maria@example.com", "teacher")
    nikos = _headers(db, "nikos@example.com", "teacher")

    client.put(f"{NOTES}{student_id}", json={"text": "Maria's note"}, headers=maria)
    client.put(f"{NOTES}{student_id}", json={"text": "Nikos's note"}, headers=nikos)

    assert client.get(NOTES, headers=maria).json() == {"notes": {str(student_id): "Maria's note"}}
    assert client.get(NOTES, headers=nikos).json() == {"notes": {str(student_id): "Nikos's note"}}
    assert client.get(NOTES).status_code == 401
    student_role = _headers(db, "student@example.com", "student")
    assert client.get(NOTES, headers=student_role).status_code == 403
    assert client.put(f"{NOTES}{student_id}", json={"text": "x"}, headers=student_role).status_code == 403


@pytest.mark.auth_required
def test_deleting_an_account_removes_its_notes(client, db, strict_auth):
    from backend.models import Student, StudentPrivateNote, User

    db.add(Student(first_name="A", last_name="B", email="gone-notes@example.com", student_id="PRV778"))
    db.commit()
    student_id = db.query(Student).filter(Student.student_id == "PRV778").one().id
    admin = _headers(db, "admin2@example.com", "admin")
    maria = _headers(db, "maria@example.com", "teacher")
    client.put(f"{NOTES}{student_id}", json={"text": "Maria's note"}, headers=maria)
    client.put(f"{NOTES}{student_id}", json={"text": "Admin's note"}, headers=admin)
    maria_id = db.query(User).filter(User.email == "maria@example.com").one().id

    assert client.delete(f"/api/v1/admin/users/{maria_id}", headers=admin).status_code == 204

    assert [row.text for row in db.query(StudentPrivateNote).all()] == ["Admin's note"]


def test_the_notes_migration_adds_one_table_and_reverses(tmp_path):
    from alembic import command
    from alembic.config import Config

    # No alembic.ini on purpose: see test_lesson_logs_migration._alembic.
    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = Config()
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "e5b2c7a9d4f1")
    engine = create_engine(url)
    try:
        before = set(inspect(engine).get_table_names())

        command.upgrade(cfg, "f6c3d8b1a2e4")
        command.stamp(cfg, "e5b2c7a9d4f1")
        command.upgrade(cfg, "f6c3d8b1a2e4")  # table already there: must not fail

        inspector = inspect(engine)
        assert set(inspector.get_table_names()) - before == {"student_private_notes"}
        unique = [i["column_names"] for i in inspector.get_indexes("student_private_notes") if i["unique"]]
        assert unique == [["student_id", "user_id"]]

        command.downgrade(cfg, "e5b2c7a9d4f1")
        assert set(inspect(engine).get_table_names()) == before
    finally:
        engine.dispose()


def test_both_routers_are_registered(client):
    # The registry swallows import errors, so a broken router would otherwise vanish silently.
    paths = client.get("/openapi.json").json()["paths"]
    assert {"get"} <= set(paths[NOTES])
    assert "/api/v1/privacy/info" in paths
    assert "/api/v1/students/{student_id}/health" in paths


# ---------------------------------------------------------------------------
# Privacy info
# ---------------------------------------------------------------------------


def test_privacy_info_is_empty_until_configured(client):
    body = client.get("/api/v1/privacy/info").json()

    assert body == {"controller_name": "", "contact": "", "dpo_contact": "", "notice_url": "", "configured": False}


@pytest.mark.auth_required
def test_privacy_info_is_public_and_returns_the_configured_contact(client, monkeypatch, strict_auth):
    from backend.config import settings

    monkeypatch.setattr(settings, "PRIVACY_CONTROLLER_NAME", "ΜΙΕΕΚ Λεμεσού", raising=False)
    monkeypatch.setattr(settings, "PRIVACY_CONTACT", "office@example.org", raising=False)
    monkeypatch.setattr(settings, "PRIVACY_DPO_CONTACT", "dpo@example.org", raising=False)
    monkeypatch.setattr(settings, "PRIVACY_NOTICE_URL", "javascript:alert(1)", raising=False)

    resp = client.get("/api/v1/privacy/info")  # no token: the notice is linked from the sign-in screen

    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "controller_name": "ΜΙΕΕΚ Λεμεσού",
        "contact": "office@example.org",
        "dpo_contact": "dpo@example.org",
        "notice_url": "",  # only http(s) links are passed on
        "configured": True,
    }
