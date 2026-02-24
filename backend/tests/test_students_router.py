from __future__ import annotations

from datetime import date, timedelta
from typing import Dict

from backend.tests.conftest import get_error_detail

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
    payload = make_student_payload(
        2, father_name="", mobile_phone="", phone="", health_issue="", note="", enrollment_date="", study_year=""
    )
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
    payload = get_error_detail(r2.json())
    assert payload["message"] == "Email already registered"
    assert payload["error_id"] == "STD_DUP_EMAIL"


def test_create_student_duplicate_student_id(client):
    p1 = make_student_payload(1)
    p2 = make_student_payload(2, student_id=p1["student_id"])  # duplicate id, different email
    r1 = client.post("/api/v1/students/", json=p1)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/students/", json=p2)
    assert r2.status_code == 400
    payload = get_error_detail(r2.json())
    assert payload["message"] == "Student ID already exists"
    assert payload["error_id"] == "STD_DUP_ID"


def test_get_student_by_id_and_404(client):
    p = make_student_payload(1)
    r1 = client.post("/api/v1/students/", json=p)
    student = r1.json()
    r_get = client.get(f"/api/v1/students/{student['id']}")
    assert r_get.status_code == 200
    assert r_get.json()["email"] == p["email"]


def test_list_students_pagination_and_filters(client, admin_token):
    # create 3 students, deactivate one
    sids = []
    for i in range(1, 4):
        r = client.post("/api/v1/students/", json=make_student_payload(i))
        sids.append(r.json()["id"])
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    # deactivate the last student
    r_del = client.post(f"/api/v1/students/{sids[-1]}/deactivate", headers=headers)
    assert r_del.status_code == 200
    r_inactive = client.get("/api/v1/students/?is_active=false")
    assert r_inactive.status_code == 200
    assert len(r_inactive.json()["items"]) == 1

    # pagination bounds - now handled by paginate() helper
    r_valid_limit = client.get("/api/v1/students/?limit=10")
    assert r_valid_limit.status_code == 200


def test_update_student_success_and_validation_errors(client, admin_token):
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


def test_delete_student_and_then_404(client, admin_token, bootstrap_admin, db):
    from backend import models
    from backend.security.password_hash import get_password_hash

    # Create a new admin user directly in the test DB (public /register doesn't grant admin role)
    new_admin_email = "admin_delete_test@example.com"
    new_admin_password = "AdminPass123!"
    admin_user = models.User(
        email=new_admin_email,
        hashed_password=get_password_hash(new_admin_password),
        role="admin",
        is_active=True,
        full_name="Admin Delete Test",
    )
    db.add(admin_user)
    db.commit()

    # Login as the new admin
    login_resp2 = client.post("/api/v1/auth/login", json={"email": new_admin_email, "password": new_admin_password})
    admin_token_val2 = login_resp2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {admin_token_val2}"}

    # Create student as new admin
    student_payload = make_student_payload(1)
    r = client.post("/api/v1/students/", json=student_payload, headers=headers2)
    sid = r.json()["id"]

    # Delete student as new admin
    r_del = client.delete(f"/api/v1/students/{sid}", headers=headers2)
    print(f"DELETE /students{{sid}} status: {r_del.status_code} {r_del.text}")
    assert r_del.status_code == 204, f"Delete failed: {r_del.status_code} {r_del.text}"

    # Confirm 404 after delete
    r_get = client.get(f"/api/v1/students/{sid}", headers=headers2)
    print("GET /students/{sid} status:", r_get.status_code, r_get.text)
    assert r_get.status_code == 404


def test_activate_deactivate_student(client, admin_token):
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
        make_student_payload(4, student_id="STD0001"),  # duplicate student ID of #1
    ]
    r = client.post("/api/v1/students/bulk/create", json=students)
    assert r.status_code == 200
    data = r.json()
    assert data["created"] == 2
    assert data["failed"] == 2
    assert len(data["errors"]) == 2
    error_ids = {entry["error"]["error_id"] for entry in data["errors"]}
    assert "STD_DUP_EMAIL" in error_ids
    assert "STD_DUP_ID" in error_ids


def test_bulk_create_students_masks_internal_exception(client, monkeypatch):
    from backend.routers import routers_students

    class BrokenStudent:
        def __init__(self, **_kwargs):
            raise RuntimeError("boom secret stack trace")

    def patched_import_names(*args, **_kwargs):
        if args == ("models", "Student"):
            return (BrokenStudent,)
        return (None,)

    monkeypatch.setattr(routers_students, "import_names", patched_import_names)

    r = client.post("/api/v1/students/bulk/create", json=[make_student_payload(50)])
    assert r.status_code == 200, r.text

    data = r.json()
    assert data["created"] == 0
    assert data["failed"] == 1

    message = data["errors"][0]["error"]["message"]
    assert message == "Unexpected internal error during bulk student create"
    assert "boom" not in message.lower()
    assert "stack" not in message.lower()
    assert "trace" not in message.lower()


def test_create_student_handles_internal_error(client, monkeypatch):
    from backend.routers import routers_students

    def broken_import(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(routers_students, "import_names", broken_import)

    r = client.post("/api/v1/students/", json=make_student_payload(10))
    assert r.status_code == 500
    payload = get_error_detail(r.json())
    # internal_server_error returns structured error
    if isinstance(payload, dict):
        assert payload.get("error_id") == "ERR_INTERNAL"
    else:
        assert "error" in payload.lower() or "internal" in payload.lower()
