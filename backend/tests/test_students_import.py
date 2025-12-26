"""Test student import functionality to ensure all fields are preserved."""

import json

from fastapi.testclient import TestClient


def test_upload_students_preserves_all_fields(client: TestClient):
    """Test that students with extended profile fields are preserved correctly."""
    payload = [
        {
            "student_id": "S2025TEST001",
            "email": "test.student1@example.gr",
            "first_name": "Test",
            "last_name": "Student",
            "enrollment_date": "2025-09-01",
            "is_active": True,
            "father_name": "Test Father",
            "mobile_phone": "+30 6901234567",
            "phone": "210-1234567",
            "health_issue": "None reported",
            "note": "Test note for verification",
            "study_year": 1,
        },
        {
            "student_id": "S2025TEST002",
            "email": "test.student2@example.gr",
            "first_name": "Another",
            "last_name": "Student",
            "enrollment_date": "2024-09-01",
            "is_active": True,
            "study_year": 2,
            # Missing optional fields - should work fine
        },
    ]

    files = {
        "files": (
            "test_students.json",
            json.dumps(payload).encode("utf-8"),
            "application/json",
        ),
    }
    data = {"import_type": "students"}

    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("type") == "students"
    assert body.get("created", 0) == 2
    assert body.get("updated", 0) == 0

    # Verify first student has all extended fields preserved
    resp2 = client.get("/api/v1/students/")
    assert resp2.status_code == 200
    data2 = resp2.json()
    found = next(
        (
            item
            for item in data2.get("items", [])
            if item.get("student_id") == "S2025TEST001"
        ),
        None,
    )
    assert found is not None

    # Check all extended fields
    assert found.get("father_name") == "Test Father"
    assert found.get("mobile_phone") == "+30 6901234567"
    assert found.get("phone") == "210-1234567"
    assert found.get("health_issue") == "None reported"
    assert found.get("note") == "Test note for verification"
    assert found.get("study_year") == 1

    # Verify second student exists and has basic fields
    found2 = next(
        (
            item
            for item in data2.get("items", [])
            if item.get("student_id") == "S2025TEST002"
        ),
        None,
    )
    assert found2 is not None
    assert found2.get("study_year") == 2
    # Optional fields should be null when not provided
    assert found2.get("father_name") is None
    assert found2.get("mobile_phone") is None
    assert found2.get("phone") is None


def test_upload_students_accepts_octet_stream(client: TestClient):
    """Test that students upload accepts application/octet-stream MIME type."""
    payload = {
        "student_id": "S2025MIME",
        "email": "mime.test@example.gr",
        "first_name": "MIME",
        "last_name": "Test",
        "is_active": True,
        "study_year": 1,
    }

    files = {
        "files": (
            "test_student_mime.json",
            json.dumps(payload).encode("utf-8"),
            "application/octet-stream",
        ),
    }
    data = {"import_type": "students"}

    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("created", 0) == 1
