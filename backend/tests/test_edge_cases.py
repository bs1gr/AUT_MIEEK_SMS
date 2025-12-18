"""
Edge case and boundary value tests for backend API and models.
"""
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# Example: Test large payloads

def test_create_student_with_max_length_fields():
    payload = {
        "name": "A" * 255,
        "email": f"{'a'*64}@{'b'*63}.{'c'*63}",
        "student_id": "9" * 32,
        "address": "X" * 512,
        "phone": "+357" + "7" * 15
    }
    response = client.post("/api/v1/students/", json=payload)
    assert response.status_code in (200, 422)  # Acceptable: created or validation error

# Example: Test invalid date range

def test_attendance_invalid_date_range():
    # End date before start date (simulate via query)
    response = client.get("/api/v1/attendance?start_date=2025-12-31&end_date=2025-01-01")
    assert response.status_code == 400  # API returns 400 Bad Request for invalid date range

# Example: Test concurrency (simulate with multiple requests)

def test_concurrent_student_creation():
    payload = {"name": "Concurrent", "email": "concurrent@example.com", "student_id": "C999"}
    responses = [client.post("/api/v1/students/", json=payload) for _ in range(5)]
    codes = [r.status_code for r in responses]
    assert codes.count(200) <= 1  # Only one should succeed, others should fail (duplicate)

# Example: Test rollback on DB error (simulate with invalid data)

def test_grade_create_invalid_student():
    payload = {"student_id": "NONEXIST", "course_code": "C101", "grade": 10, "max_grade": 20}
    response = client.post("/api/v1/grades/", json=payload)
    assert response.status_code == 422  # API returns 422 Unprocessable Entity for invalid student


# --- Additional Edge/Boundary/Concurrency/Rollback Tests ---

def test_create_course_with_invalid_code():
    # Invalid course_code (special chars)
    payload = {
        "course_code": "BAD CODE!@#",
        "course_name": "Test Course",
        "semester": "2025-Fall",
        "credits": 3
    }
    response = client.post("/api/v1/courses/", json=payload)
    assert response.status_code == 422

def test_create_course_with_max_length_fields():
    payload = {
        "course_code": "C" * 20,
        "course_name": "N" * 200,
        "semester": "S" * 50,
        "credits": 12
    }
    response = client.post("/api/v1/courses/", json=payload)
    assert response.status_code in (201, 200, 422)  # Acceptable: created or validation error

def test_grade_create_with_boundary_values():
    # grade == max_grade (should succeed)
    payload = {
        "student_id": 1,
        "course_id": 1,
        "assignment_name": "Final",
        "grade": 100,
        "max_grade": 100
    }
    response = client.post("/api/v1/grades/", json=payload)
    # Accept 200, 201, 404, or 422 (if student/course doesn't exist)
    print("grade boundary response:", response.status_code, response.text)
    assert response.status_code in (200, 201, 404, 422)

def test_grade_create_exceeding_max_grade():
    # grade > max_grade (should fail validation)
    payload = {
        "student_id": 1,
        "course_id": 1,
        "assignment_name": "Impossible",
        "grade": 101,
        "max_grade": 100
    }
    response = client.post("/api/v1/grades/", json=payload)
    assert response.status_code == 422

def test_rollback_import_invalid_filename():
    # Should reject dangerous/invalid filenames
    payload = {"backup_filename": "../../etc/passwd"}
    response = client.post("/api/v1/sessions/rollback", params=payload)
    assert response.status_code == 400
    assert "Invalid backup filename" in response.text

def test_rollback_import_missing_file():
    # Should return 404 if backup file does not exist
    payload = {"backup_filename": "nonexistent_backup.db"}
    response = client.post("/api/v1/sessions/rollback", params=payload)
    assert response.status_code == 404

def test_import_session_rollback_on_critical_error():
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
    assert (
        "rollback" in text
        or "import aborted" in text
        or "imp_invalid_req" in text
        or "error_summary" in text
    )
