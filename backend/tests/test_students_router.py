from __future__ import annotations

from datetime import date, timedelta
from typing import Dict

import pytest

# Uses the TestClient fixture from conftest


def make_student_payload(i: int = 1, **overrides) -> Dict:
    base = {
        "first_name": f"John{i}",
        "last_name": f"Doe{i}",
        "email": f"john{i}.doe{i}@example.com",
        "student_id": f"STD{i:04d}",
        "enrollment_date": date.today().isoformat(),
        "study_year": 1,
    }
    base.update(overrides)
    return base


def test_create_student_success(client):
    payload = make_student_payload(1)
    r = client.post("/api/v1/students/", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["id"] > 0
    assert data["email"] == payload["email"]
    assert data["student_id"] == payload["student_id"]
    assert data["is_active"] is True


def test_create_student_allows_empty_optional_strings(client):
    # Optional fields provided as empty strings should be treated as null/None
    payload = make_student_payload(2,
                                   father_name="",
                                   mobile_phone="",
                                   phone="",
                                   health_issue="",
                                   note="",
                                   enrollment_date="",
                                   study_year="")
    r = client.post("/api/v1/students/", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    # Optional fields should come back as null
    assert data["father_name"] is None
    assert data["mobile_phone"] is None
    assert data["phone"] is None
    assert data["health_issue"] is None
    assert data["note"] is None
    assert data["enrollment_date"] is None
    assert data["study_year"] is None


def test_create_student_duplicate_email(client):
    p1 = make_student_payload(1)
    p2 = make_student_payload(2, email=p1["email"])  # duplicate email, different student_id
    r1 = client.post("/api/v1/students/", json=p1)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/students/", json=p2)
    assert r2.status_code == 400
    assert r2.json()["detail"] == "Email already registered"


def test_create_student_duplicate_student_id(client):
    p1 = make_student_payload(1)
    p2 = make_student_payload(2, student_id=p1["student_id"])  # duplicate id, different email
    r1 = client.post("/api/v1/students/", json=p1)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/students/", json=p2)
    assert r2.status_code == 400
    assert r2.json()["detail"] == "Student ID already exists"


def test_get_student_by_id_and_404(client):
    p = make_student_payload(1)
    r1 = client.post("/api/v1/students/", json=p)
    student = r1.json()
    r_get = client.get(f"/api/v1/students/{student['id']}")
    assert r_get.status_code == 200
    assert r_get.json()["email"] == p["email"]
    r_404 = client.get("/api/v1/students/9999")
    assert r_404.status_code == 404


def test_list_students_pagination_and_filters(client):
    # create 3 students, deactivate one
    for i in range(1, 4):
        client.post("/api/v1/students/", json=make_student_payload(i))
    # deactivate id 2
    r_list = client.get("/api/v1/students/")
    assert r_list.status_code == 200
    students = r_list.json()
    sid2 = students[1]["id"]
    client.post(f"/api/v1/students/{sid2}/deactivate")

    # list active only
    r_active = client.get("/api/v1/students/?is_active=true")
    assert r_active.status_code == 200
    assert len(r_active.json()) == 2

    # list inactive only
    r_inactive = client.get("/api/v1/students/?is_active=false")
    assert r_inactive.status_code == 200
    assert len(r_inactive.json()) == 1

    # pagination bounds
    r_bad_limit = client.get("/api/v1/students/?limit=0")
    assert r_bad_limit.status_code == 400
    r_bad_limit2 = client.get("/api/v1/students/?limit=1001")
    assert r_bad_limit2.status_code == 400
    r_bad_skip = client.get("/api/v1/students/?skip=-1")
    assert r_bad_skip.status_code == 400


def test_update_student_success_and_validation_errors(client):
    p = make_student_payload(1)
    r = client.post("/api/v1/students/", json=p)
    sid = r.json()["id"]

    # Successful partial update
    upd = {"study_year": 3, "phone": "+1234567890"}
    r_upd = client.put(f"/api/v1/students/{sid}", json=upd)
    assert r_upd.status_code == 200
    assert r_upd.json()["study_year"] == 3
    assert r_upd.json()["phone"] == "+1234567890"

    # Validation error: study_year out of range
    upd_bad_year = {"study_year": 5}
    r_bad = client.put(f"/api/v1/students/{sid}", json=upd_bad_year)
    assert r_bad.status_code == 422

    # Validation error: bad phone format
    upd_bad_phone = {"phone": "abc-123"}
    r_bad2 = client.put(f"/api/v1/students/{sid}", json=upd_bad_phone)
    assert r_bad2.status_code == 422

    # Validation error: enrollment_date in the future
    future_date = (date.today() + timedelta(days=1)).isoformat()
    upd_future = {"enrollment_date": future_date}
    r_bad3 = client.put(f"/api/v1/students/{sid}", json=upd_future)
    assert r_bad3.status_code == 422


def test_delete_student_and_then_404(client):
    p = make_student_payload(1)
    r = client.post("/api/v1/students/", json=p)
    sid = r.json()["id"]

    r_del = client.delete(f"/api/v1/students/{sid}")
    assert r_del.status_code == 204

    r_get = client.get(f"/api/v1/students/{sid}")
    assert r_get.status_code == 404


def test_activate_deactivate_student(client):
    p = make_student_payload(1)
    r = client.post("/api/v1/students/", json=p)
    sid = r.json()["id"]

    r_deact = client.post(f"/api/v1/students/{sid}/deactivate")
    assert r_deact.status_code == 200
    r_get = client.get(f"/api/v1/students/{sid}")
    assert r_get.json()["is_active"] is False

    r_act = client.post(f"/api/v1/students/{sid}/activate")
    assert r_act.status_code == 200
    r_get2 = client.get(f"/api/v1/students/{sid}")
    assert r_get2.json()["is_active"] is True


def test_bulk_create_students_with_duplicates(client):
    students = [
        make_student_payload(1),
        make_student_payload(2),
        make_student_payload(3, email="john1.doe1@example.com"),  # duplicate email of #1
    ]
    r = client.post("/api/v1/students/bulk/create", json=students)
    assert r.status_code == 200
    data = r.json()
    assert data["created"] == 2
    assert data["failed"] == 1
    assert len(data["errors"]) == 1
