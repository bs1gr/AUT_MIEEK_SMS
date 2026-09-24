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

    def test_preview_detects_existing_student_as_update(self, client: TestClient):
        """Regression test for the N+1 fix in the preview endpoint: existence
        detection now comes from a bulk pre-fetch instead of a query per row,
        so it must still correctly flag an already-existing student_id/email
        as 'update' rather than 'create', for both the matched row and an
        unrelated new row in the same batch.
        """
        existing = client.post(
            "/api/v1/students/",
            json={
                "student_id": "PREV001",
                "first_name": "Existing",
                "last_name": "Student",
                "email": "existing.preview@example.com",
            },
        )
        assert existing.status_code == 201

        payload = [
            {"student_id": "PREV001", "first_name": "Existing", "last_name": "Student", "email": "existing.preview@example.com"},
            {"student_id": "PREV999", "first_name": "New", "last_name": "Student", "email": "new.preview@example.com"},
        ]
        files = {"files": ("students.json", json.dumps(payload).encode("utf-8"), "application/json")}
        resp = client.post(
            "/api/v1/imports/preview", files=files, data={"import_type": "students", "allow_updates": "true"}
        )
        assert resp.status_code == 200
        body = resp.json()
        items = {item["data"]["student_id"]: item for item in body["items"]}
        assert items["PREV001"]["action"] == "update"
        assert items["PREV999"]["action"] == "create"

    def test_preview_existing_course_code_in_other_semester_is_update(self, client: TestClient):
        """course_code is unique across semesters, and the import matches on code
        alone, so the same code in a different semester updates (moves) the
        existing course. The preview used to call that a 'create' -- promising
        something the import would not do."""
        existing = client.post(
            "/api/v1/courses/",
            json={"course_code": "PREVCS1", "course_name": "Preview Course", "semester": "Α' Εξάμηνο", "credits": 3},
        )
        assert existing.status_code == 201

        payload = [{"course_code": "PREVCS1", "course_name": "Preview Course", "semester": "Β' Εξάμηνο"}]
        files = {"files": ("courses.json", json.dumps(payload).encode("utf-8"), "application/json")}
        resp = client.post(
            "/api/v1/imports/preview", files=files, data={"import_type": "courses", "allow_updates": "true"}
        )
        assert resp.status_code == 200
        (item,) = resp.json()["items"]
        assert item["action"] == "update"
        assert any("another semester" in issue for issue in item["issues"])

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

        # The job must actually run: TestClient executes background tasks before returning.
        # (Regression: the job used to be created and never processed, stuck at "pending".)
        job = JobManager.get_job(job_id)
        assert job is not None
        assert job.job_type == "student_import"
        assert job.status == "completed", job.error_message
        assert job.result is not None and job.result.data == {"type": "students", "created": 1, "updated": 0, "skipped": 0}
        assert job.progress is not None and job.progress.percentage == 100

        students = client.get("/api/v1/students/", params={"search": "STU_EXEC_001"}).json()
        items = students.get("items", students) if isinstance(students, dict) else students
        assert any(s.get("student_id") == "STU_EXEC_001" for s in items)

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
        assert job.status == "completed", job.error_message
        assert job.result is not None and job.result.data["created"] == 1

    def test_execute_all_rows_invalid_marks_job_failed(self, client: TestClient):
        """A job where every row is rejected must end as failed, not hang or report success."""
        data = {"import_type": "students", "json_text": json.dumps([{"student_id": "NO_EMAIL"}])}
        resp = client.post("/api/v1/imports/execute", data=data)
        assert resp.status_code == 200

        job = JobManager.get_job(resp.json()["job_id"])
        assert job is not None
        assert job.status == "failed"
        assert job.error_message and "missing student_id or email" in job.error_message

    def test_execute_respects_allow_updates_false(self, client: TestClient):
        """Regression: allow_updates was accepted but ignored -- existing students were overwritten."""
        created = client.post(
            "/api/v1/students/",
            json={"student_id": "UPD001", "first_name": "Original", "last_name": "Name", "email": "upd001@example.com"},
        )
        assert created.status_code == 201
        rows = [
            {"student_id": "UPD001", "first_name": "Changed", "last_name": "Name", "email": "upd001@example.com"},
            {"student_id": "UPD002", "first_name": "New", "last_name": "Student", "email": "upd002@example.com"},
        ]
        resp = client.post(
            "/api/v1/imports/execute",
            data={"import_type": "students", "json_text": json.dumps(rows), "allow_updates": "false"},
        )
        job = JobManager.get_job(resp.json()["job_id"])
        assert job is not None and job.status == "completed", job and job.error_message
        assert job.result.data == {"type": "students", "created": 1, "updated": 0, "skipped": 1}
        assert any("UPD001" in w and "updates are not allowed" in w for w in job.result.warnings)

        student = client.get(f"/api/v1/students/{created.json()['id']}").json()
        assert student["first_name"] == "Original"

    def test_execute_allow_updates_true_updates_existing(self, client: TestClient):
        created = client.post(
            "/api/v1/students/",
            json={"student_id": "UPD101", "first_name": "Original", "last_name": "Name", "email": "upd101@example.com"},
        )
        rows = [{"student_id": "UPD101", "first_name": "Changed", "last_name": "Name", "email": "upd101@example.com"}]
        resp = client.post(
            "/api/v1/imports/execute",
            data={"import_type": "students", "json_text": json.dumps(rows), "allow_updates": "true"},
        )
        job = JobManager.get_job(resp.json()["job_id"])
        assert job.result.data == {"type": "students", "created": 0, "updated": 1, "skipped": 0}
        assert client.get(f"/api/v1/students/{created.json()['id']}").json()["first_name"] == "Changed"

    def test_execute_skip_duplicates(self, client: TestClient):
        """Regression: skip_duplicates was ignored -- the second copy silently overwrote the first."""
        rows = [
            {"student_id": "DUP001", "first_name": "First", "last_name": "Copy", "email": "dup001@example.com"},
            {"student_id": "DUP001", "first_name": "Second", "last_name": "Copy", "email": "dup001@example.com"},
        ]
        resp = client.post(
            "/api/v1/imports/execute",
            data={"import_type": "students", "json_text": json.dumps(rows), "skip_duplicates": "true"},
        )
        job = JobManager.get_job(resp.json()["job_id"])
        assert job.result.data == {"type": "students", "created": 1, "updated": 0, "skipped": 1}
        found = client.get("/api/v1/students/", params={"search": "DUP001"}).json()
        items = found.get("items", found) if isinstance(found, dict) else found
        assert [s["first_name"] for s in items if s["student_id"] == "DUP001"] == ["First"]

    def test_execute_all_rows_skipped_is_not_a_failure(self, client: TestClient):
        client.post(
            "/api/v1/courses/",
            json={"course_code": "SKIPC1", "course_name": "Existing", "semester": "Α' Εξάμηνο", "credits": 3},
        )
        rows = [{"course_code": "SKIPC1", "course_name": "Renamed", "semester": "Β' Εξάμηνο"}]
        resp = client.post(
            "/api/v1/imports/execute",
            data={"import_type": "courses", "json_text": json.dumps(rows), "allow_updates": "false"},
        )
        job = JobManager.get_job(resp.json()["job_id"])
        assert job.status == "completed"
        assert job.result.data["skipped"] == 1

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
        # Row has no email/last_name, so the job runs to a terminal "failed" state
        assert job_info["status"] == "failed"
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
        assert job.status == "completed", job.error_message


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
        from backend.tests.db_setup import TestingSessionLocal

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
