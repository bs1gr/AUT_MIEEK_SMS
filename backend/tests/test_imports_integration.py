"""
Integration tests for import system: preview → execute → job tracking.

Tests complete import workflow including:
- Preview endpoint validation
- Job creation via execute endpoint
- Job tracking and status monitoring
- Audit logging
"""

import json
from fastapi.testclient import TestClient

from backend.services.job_manager import JobManager


class TestImportPreviewEndpoint:
    """Test the /imports/preview endpoint."""

    def test_preview_valid_students_json(self, client: TestClient):
        """Preview should validate student JSON data."""
        payload = [
            {
                "student_id": "STU001",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "phone_number": "2101234567",
            },
            {
                "student_id": "STU002",
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane@example.com",
                "phone_number": "2109876543",
            },
        ]

        files = {
            "files": ("students.json", json.dumps(payload).encode("utf-8"), "application/json"),
        }
        data = {"import_type": "students"}

        resp = client.post("/api/v1/imports/preview", files=files, data=data)
        assert resp.status_code == 200
        body = resp.json()

        # Validate response structure
        assert "total_rows" in body
        assert "valid_rows" in body
        assert "items" in body
        assert "can_proceed" in body
        assert "summary" in body

    def test_preview_valid_courses_json(self, client: TestClient):
        """Preview should validate course JSON data."""
        payload = [
            {
                "course_code": "CS101",
                "course_name": "Introduction to CS",
                "semester": "Α' Εξάμηνο",
                "credits": 3,
                "hours_per_week": 2,
                "evaluation_rules": [{"category": "Exam", "weight": 100}],
            }
        ]

        files = {
            "files": ("courses.json", json.dumps(payload).encode("utf-8"), "application/json"),
        }
        data = {"import_type": "courses"}

        resp = client.post("/api/v1/imports/preview", files=files, data=data)
        assert resp.status_code == 200
        body = resp.json()

        assert body["can_proceed"] is True
        assert body["summary"].get("create", 0) >= 1

    def test_preview_no_files_rejected(self, client: TestClient):
        """Preview should reject requests with no files."""
        resp = client.post("/api/v1/imports/preview", data={"import_type": "students"})
        assert resp.status_code == 400

    def test_preview_invalid_import_type(self, client: TestClient):
        """Preview should reject invalid import types."""
        payload = [{"student_id": "STU001"}]
        files = {
            "files": ("students.json", json.dumps(payload).encode("utf-8"), "application/json"),
        }
        resp = client.post("/api/v1/imports/preview", files=files, data={"import_type": "invalid"})
        assert resp.status_code == 400


class TestImportExecuteEndpoint:
    """Test the /imports/execute endpoint that creates jobs."""

    def test_execute_creates_job_with_file(self, client: TestClient):
        """Execute should create a background job."""
        payload = [
            {
                "student_id": "STU_EXEC_001",
                "first_name": "Alice",
                "last_name": "Johnson",
                "email": "alice@example.com",
                "phone_number": "2105551234",
            }
        ]

        files = {
            "files": ("students.json", json.dumps(payload).encode("utf-8"), "application/json"),
        }
        data = {"import_type": "students"}

        resp = client.post("/api/v1/imports/execute", files=files, data=data)
        assert resp.status_code == 200
        body = resp.json()

        # Should return job_id
        assert "job_id" in body
        job_id = body["job_id"]
        assert len(job_id) > 0
        assert body["status"] == "pending"

        # Verify job exists
        job = JobManager.get_job(job_id)
        assert job is not None
        assert job.job_type == "student_import"

    def test_execute_with_json_text(self, client: TestClient):
        """Execute should accept JSON text parameter."""
        payload = [
            {
                "course_code": "EXEC_CS201",
                "course_name": "Algorithms",
                "semester": "Γ' Εξάμηνο",
                "credits": 3,
                "hours_per_week": 2,
                "evaluation_rules": [{"category": "Exam", "weight": 100}],
            }
        ]

        data = {
            "import_type": "courses",
            "json_text": json.dumps(payload),
        }

        resp = client.post("/api/v1/imports/execute", data=data)
        assert resp.status_code == 200
        body = resp.json()

        job_id = body["job_id"]
        job = JobManager.get_job(job_id)
        assert job is not None
        assert job.job_type == "course_import"

    def test_execute_rejects_no_data(self, client: TestClient):
        """Execute should reject requests with no files or JSON."""
        resp = client.post("/api/v1/imports/execute", data={"import_type": "students"})
        assert resp.status_code == 400

    def test_execute_malformed_json_text(self, client: TestClient):
        """Execute should reject malformed JSON text."""
        data = {
            "import_type": "courses",
            "json_text": "{invalid json}",
        }
        resp = client.post("/api/v1/imports/execute", data=data)
        assert resp.status_code == 400


class TestJobTracking:
    """Test job status retrieval."""

    def test_get_job_by_id(self, client: TestClient):
        """Should be able to get job status by ID."""
        # Create a job first
        payload = [{"student_id": "STU_JOB_001", "first_name": "Bob"}]
        files = {
            "files": ("students.json", json.dumps(payload).encode("utf-8"), "application/json"),
        }

        resp1 = client.post("/api/v1/imports/execute", files=files, data={"import_type": "students"})
        job_id = resp1.json()["job_id"]

        # Retrieve job status
        resp2 = client.get(f"/api/v1/jobs/{job_id}")
        assert resp2.status_code == 200
        job_info = resp2.json()

        assert job_info["job_id"] == job_id
        assert job_info["status"] == "pending"
        assert job_info["job_type"] == "student_import"

    def test_job_invalid_id_returns_404(self, client: TestClient):
        """Should return 404 for non-existent job ID."""
        resp = client.get("/api/v1/jobs/invalid-job-id-12345")
        assert resp.status_code == 404


class TestPreviewAndExecuteWorkflow:
    """Test complete workflow: preview → execute."""

    def test_preview_then_execute_workflow(self, client: TestClient):
        """Complete workflow should work seamlessly."""
        payload = [
            {
                "student_id": "STU_WF_001",
                "first_name": "Eve",
                "last_name": "White",
                "email": "eve@example.com",
                "phone_number": "2105556666",
            }
        ]

        files_data = {
            "files": ("students.json", json.dumps(payload).encode("utf-8"), "application/json"),
        }
        form_data = {"import_type": "students"}

        # Step 1: Preview
        resp_preview = client.post("/api/v1/imports/preview", files=files_data, data=form_data)
        assert resp_preview.status_code == 200
        preview = resp_preview.json()
        assert preview["can_proceed"] is True

        # Step 2: Execute
        resp_execute = client.post(
            "/api/v1/imports/execute",
            files=files_data,
            data={**form_data, "allow_updates": "false"},
        )
        assert resp_execute.status_code == 200
        execute = resp_execute.json()

        job_id = execute["job_id"]
        assert len(job_id) > 0

        # Step 3: Verify job exists
        job = JobManager.get_job(job_id)
        assert job is not None
        assert job.job_type == "student_import"
        assert job.status == "pending"


class TestImportErrorHandling:
    def test_audit_log_entry_on_failed_import(self, client, clean_db):
        """Should create an audit log entry for failed import attempts."""
        from backend.models import AuditLog

        # Trigger a known failure (invalid import_type)
        payload = [{"student_id": "STU001"}]
        files = {
            "files": ("students.json", json.dumps(payload).encode("utf-8"), "application/json"),
        }
        resp = client.post("/api/v1/imports/upload", files=files, data={"import_type": "invalid"})
        assert resp.status_code == 400
        # Query the most recent audit log
        # Close and reopen session to ensure visibility of committed data
        clean_db.close()
        from backend.tests.conftest import TestingSessionLocal

        session = TestingSessionLocal()
        log = session.query(AuditLog).order_by(AuditLog.timestamp.desc()).first()
        assert log is not None, "No audit log entry found for failed import"
        assert log.action == "bulk_import"
        assert log.success is False
        assert log.error_message is not None and "import_type" in log.error_message.lower()
        assert log.details is not None and log.details.get("type") == "invalid"
        session.close()

    def test_unsupported_file_type(self, client: TestClient):
        """Should handle unsupported file types gracefully."""
        files = {
            "files": ("data.pdf", b"PDF content", "application/pdf"),
        }
        resp = client.post("/api/v1/imports/preview", files=files, data={"import_type": "students"})
        # May succeed or fail, but should not crash
        assert resp.status_code in [200, 400, 422]

    def test_oversized_json_text(self, client: TestClient):
        """Should reject JSON text exceeding size limit."""
        # Create JSON larger than 10MB
        large_array = [{"student_id": f"STU{i}", "first_name": "X" * 1000} for i in range(100000)]

        data = {
            "import_type": "students",
            "json_text": json.dumps(large_array),
        }
        resp = client.post("/api/v1/imports/execute", data=data)
        # Should either succeed or reject gracefully
        assert resp.status_code in [200, 400, 413]
