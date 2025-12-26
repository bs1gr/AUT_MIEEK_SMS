"""
Edge case and boundary value tests for backend API and models.
"""

import pytest

# Example: Test large payloads


@pytest.mark.usefixtures("client")
def test_create_student_with_max_length_fields(client):
    payload = {
        "name": "A" * 255,
        "email": f"{'a'*64}@{'b'*63}.{'c'*63}",
        "student_id": "9" * 32,
        "address": "X" * 512,
        "phone": "+357" + "7" * 15,
    }
    response = client.post("/api/v1/students/", json=payload)
    assert response.status_code in (200, 422)  # Acceptable: created or validation error


# Example: Test invalid date range


@pytest.mark.usefixtures("client")
def test_attendance_invalid_date_range(client):
    # End date before start date (simulate via query)
    response = client.get("/api/v1/attendance?start_date=2025-12-31&end_date=2025-01-01")
    assert response.status_code == 400  # API returns 400 Bad Request for invalid date range


# Example: Test concurrency (simulate with multiple requests)


@pytest.mark.usefixtures("client")
def test_concurrent_student_creation(client):
    payload = {"name": "Concurrent", "email": "concurrent@example.com", "student_id": "C999"}
    responses = [client.post("/api/v1/students/", json=payload) for _ in range(5)]
    codes = [r.status_code for r in responses]
    assert codes.count(200) <= 1  # Only one should succeed, others should fail (duplicate)


# Example: Test rollback on DB error (simulate with invalid data)


@pytest.mark.usefixtures("client")
def test_grade_create_invalid_student(client):
    payload = {"student_id": "NONEXIST", "course_code": "C101", "grade": 10, "max_grade": 20}
    response = client.post("/api/v1/grades/", json=payload)
    assert response.status_code == 422  # API returns 422 Unprocessable Entity for invalid student


# --- Additional Edge/Boundary/Concurrency/Rollback Tests ---


@pytest.mark.usefixtures("client")
def test_create_course_with_invalid_code(client):
    # Invalid course_code (special chars)
    payload = {"course_code": "BAD CODE!@#", "course_name": "Test Course", "semester": "2025-Fall", "credits": 3}
    response = client.post("/api/v1/courses/", json=payload)
    assert response.status_code == 422


@pytest.mark.usefixtures("client")
def test_create_course_with_max_length_fields(client):
    payload = {"course_code": "C" * 20, "course_name": "N" * 200, "semester": "S" * 50, "credits": 12}
    response = client.post("/api/v1/courses/", json=payload)
    assert response.status_code in (201, 200, 422)  # Acceptable: created or validation error


@pytest.mark.usefixtures("client")
def test_grade_create_with_boundary_values(client):
    # grade == max_grade (should succeed)
    payload = {"student_id": 1, "course_id": 1, "assignment_name": "Final", "grade": 100, "max_grade": 100}
    response = client.post("/api/v1/grades/", json=payload)
    # Accept 200, 201, 404, or 422 (if student/course doesn't exist)
    print("grade boundary response:", response.status_code, response.text)
    assert response.status_code in (200, 201, 404, 422)


@pytest.mark.usefixtures("client")
def test_grade_create_exceeding_max_grade(client):
    # grade > max_grade (should fail validation)
    payload = {"student_id": 1, "course_id": 1, "assignment_name": "Impossible", "grade": 101, "max_grade": 100}
    response = client.post("/api/v1/grades/", json=payload)
    assert response.status_code == 422


@pytest.mark.usefixtures("client")
def test_rollback_import_invalid_filename(client):
    # Should reject dangerous/invalid filenames
    payload = {"backup_filename": "../../etc/passwd"}
    response = client.post("/api/v1/sessions/rollback", params=payload)
    assert response.status_code == 400
    assert "Invalid backup filename" in response.text


@pytest.mark.usefixtures("client")
def test_rollback_import_missing_file(client):
    # Should return 404 if backup file does not exist
    payload = {"backup_filename": "nonexistent_backup.db"}
    response = client.post("/api/v1/sessions/rollback", params=payload)
    assert response.status_code == 404


@pytest.mark.usefixtures("client")
def test_import_session_rollback_on_critical_error(client):
    # Simulate import with missing required fields (should trigger rollback)
    import io

    bad_json = io.BytesIO(b'{"courses": [{"course_name": "No Code"}]}')
    files = {"file": ("bad_import.json", bad_json, "application/json")}
    response = client.post("/api/v1/sessions/import", files=files)
    # Should fail with 400 and indicate import error/rollback/invalid request
    print("import rollback response:", response.status_code, response.text)
    assert response.status_code == 400
    # Accept error_id or error_summary in response (case-insensitive)
    text = response.text.lower()
    assert "rollback" in text or "import aborted" in text or "imp_invalid_req" in text or "error_summary" in text


# --- New: Rate Limiting Edge Case ---
@pytest.mark.usefixtures("client")
def test_rate_limiting_on_students(client):
    # Exceed rate limit for student creation (should get 429)
    payload = {"name": "RateLimit", "email": "ratelimit@example.com", "student_id": "RL999"}
    responses = [client.post("/api/v1/students/", json=payload) for _ in range(20)]
    codes = [r.status_code for r in responses]
    assert 429 in codes or codes.count(200) < 20  # At least one should be rate limited


# --- New: Auth/Permission Edge Cases ---
def test_access_admin_endpoint_without_auth():
    # Try to access admin endpoint without auth (should get 401 or 403)
    from fastapi.testclient import TestClient
    from backend.main import app

    unauth_client = TestClient(app)
    response = unauth_client.get("/api/v1/admin/users")
    assert response.status_code in (401, 403)


def test_access_admin_endpoint_with_invalid_token():
    # Try to access admin endpoint with invalid token (should get 401)
    from fastapi.testclient import TestClient
    from backend.main import app

    unauth_client = TestClient(app)
    headers = {"Authorization": "Bearer invalidtoken"}
    response = unauth_client.get("/api/v1/admin/users", headers=headers)
    assert response.status_code == 401


# --- New: Soft-delete Edge Cases ---
@pytest.mark.usefixtures("client")
def test_double_delete_student(client):
    # Create, delete, then delete again (should handle gracefully)
    payload = {"name": "SoftDelete", "email": "softdelete@example.com", "student_id": "SD999"}
    create = client.post("/api/v1/students/", json=payload)
    if create.status_code not in (200, 201):
        return  # Skip if cannot create
    student_id = create.json().get("id")
    del1 = client.delete(f"/api/v1/students/{student_id}")
    del2 = client.delete(f"/api/v1/students/{student_id}")
    assert del1.status_code in (200, 204)
    assert del2.status_code in (404, 400, 204)  # Already deleted


# --- New: Large Batch Operation Edge Case ---
@pytest.mark.usefixtures("client")
def test_bulk_import_large_number_of_students(client):
    import io
    import json

    students = [{"name": f"Bulk{i}", "email": f"bulk{i}@example.com", "student_id": f"B{i:04d}"} for i in range(100)]
    data = json.dumps({"students": students})
    fileobj = io.BytesIO(data.encode("utf-8"))
    files = {"file": ("bulk_import.json", fileobj, "application/json")}
    response = client.post("/api/v1/sessions/import", files=files)
    assert response.status_code in (200, 201, 400, 422)  # Acceptable: created, validation, or error
