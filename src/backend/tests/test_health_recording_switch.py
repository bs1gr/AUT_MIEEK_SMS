"""Health information is not recorded unless the installation switches it on (HEALTH_DATA_ENABLED).

With the default (off) nothing can store it: not the student routes, not the importers, not the
semester import, and not a code path that writes the model directly. Switching it on restores the
administrator-only behaviour tested in test_privacy_hardening.py.
"""

import json

import pytest

STUDENTS = "/api/v1/students/"


def _stored_health(db, registry_number: str):
    from backend.models import Student

    db.expire_all()
    return db.query(Student).filter(Student.student_id == registry_number).one().health_issue


def _payload(n: int, **extra) -> dict:
    return {"first_name": "A", "last_name": f"B{n}", "email": f"off{n}@example.com", "student_id": f"OFF{n:03d}", **extra}


def test_the_default_is_off():
    from backend.config import Settings

    assert Settings.model_fields["HEALTH_DATA_ENABLED"].default is False


def test_create_update_and_bulk_create_do_not_store_it(client, db):
    created = client.post(STUDENTS, json=_payload(1, health_issue="Διαβήτης"))
    assert created.status_code == 201, created.text
    assert _stored_health(db, "OFF001") is None

    updated = client.put(f"{STUDENTS}{created.json()['id']}", json={"phone": "22000000", "health_issue": "Άσθμα"})
    assert updated.status_code == 200, updated.text
    assert _stored_health(db, "OFF001") is None

    bulk = client.post(f"{STUDENTS}bulk/create", json=[_payload(2, health_issue="x")])
    assert bulk.status_code in (200, 201), bulk.text
    assert _stored_health(db, "OFF002") is None


def test_the_health_endpoint_shows_nothing_and_refuses_writes(client, db):
    student_id = client.post(STUDENTS, json=_payload(1)).json()["id"]

    read = client.get(f"{STUDENTS}{student_id}/health")
    assert read.status_code == 200, read.text
    assert read.json() == {"student_id": student_id, "health_issue": None, "recording_enabled": False}

    write = client.put(f"{STUDENTS}{student_id}/health", json={"health_issue": "Άσθμα"})
    assert write.status_code == 409, write.text
    assert _stored_health(db, "OFF001") is None


def test_the_semester_import_drops_it_and_the_export_never_has_it(client, db):
    package = {
        "metadata": {"semester": "Fall 2026"},
        "courses": [{"course_code": "OFF101", "course_name": "Course", "semester": "Fall 2026", "credits": 3}],
        "students": [{**_payload(1), "health_issue": "Επιληψία"}],
        "enrollments": [{"student_id_ref": "OFF001", "course_code_ref": "OFF101", "enrolled_at": "2026-09-01"}],
        "grades": [],
        "attendance": [],
        "daily_performance": [],
        "highlights": [],
    }
    files = {"file": ("session.json", json.dumps(package).encode("utf-8"), "application/json")}

    assert client.post("/api/v1/sessions/import", files=files).status_code == 200
    assert _stored_health(db, "OFF001") is None

    exported = client.get("/api/v1/sessions/export", params={"semester": "Fall 2026", "include_health": "true"})
    assert exported.status_code == 200, exported.text
    assert "health_issue" not in json.loads(exported.content.decode("utf-8"))["students"][0]


def test_the_students_upload_drops_the_health_column(client, db):
    rows = [{**_payload(1), "health_issue": "Αλλεργία"}]
    files = {"files": ("students.json", json.dumps(rows).encode("utf-8"), "application/json")}

    resp = client.post("/api/v1/imports/upload", files=files, data={"import_type": "students"})

    assert resp.status_code == 200, resp.text
    assert _stored_health(db, "OFF001") is None


def test_no_code_path_can_store_it_while_recording_is_off(db):
    # The model itself refuses: whatever writes a Student, the text does not reach the database.
    from backend.models import Student

    student = Student(first_name="A", last_name="B", email="direct@example.com", student_id="OFF900", health_issue="x")
    db.add(student)
    db.commit()
    assert _stored_health(db, "OFF900") is None

    student = db.query(Student).filter(Student.student_id == "OFF900").one()
    student.health_issue = "set later"
    db.commit()
    assert _stored_health(db, "OFF900") is None


def test_an_edit_of_something_else_leaves_stored_text_alone(db, monkeypatch):
    # An installation that recorded health data before switching off keeps it until it decides
    # to clear it; only a write to the field itself is refused.
    from backend.config import settings
    from backend.models import Student

    monkeypatch.setattr(settings, "HEALTH_DATA_ENABLED", True, raising=False)
    db.add(Student(first_name="A", last_name="B", email="kept@example.com", student_id="OFF901", health_issue="kept"))
    db.commit()
    monkeypatch.setattr(settings, "HEALTH_DATA_ENABLED", False, raising=False)

    student = db.query(Student).filter(Student.student_id == "OFF901").one()
    student.phone = "22000000"
    db.commit()

    assert _stored_health(db, "OFF901") == "kept"


def test_switching_it_on_restores_recording(client, db, monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "HEALTH_DATA_ENABLED", True, raising=False)
    student_id = client.post(STUDENTS, json=_payload(1, health_issue="Διαβήτης")).json()["id"]

    assert _stored_health(db, "OFF001") == "Διαβήτης"
    assert client.get(f"{STUDENTS}{student_id}/health").json() == {
        "student_id": student_id,
        "health_issue": "Διαβήτης",
        "recording_enabled": True,
    }


@pytest.mark.parametrize("enabled", [False, True])
def test_the_semester_archive_follows_the_switch(db, client, monkeypatch, enabled):
    from backend.config import settings
    from backend.services.session_data_service import build_semester_export_payload

    monkeypatch.setattr(settings, "HEALTH_DATA_ENABLED", True, raising=False)
    student_id = client.post(STUDENTS, json=_payload(1, health_issue="Διαβήτης")).json()["id"]
    course = client.post(
        "/api/v1/courses/", json={"course_code": "OFF102", "course_name": "C", "semester": "Fall 2026", "credits": 3}
    ).json()
    assert client.post(f"/api/v1/enrollments/course/{course['id']}", json={"student_ids": [student_id]}).status_code == 200
    monkeypatch.setattr(settings, "HEALTH_DATA_ENABLED", enabled, raising=False)

    payload = build_semester_export_payload(db, "Fall 2026", include_health=bool(settings.HEALTH_DATA_ENABLED))

    assert ("health_issue" in payload["students"][0]) is enabled
