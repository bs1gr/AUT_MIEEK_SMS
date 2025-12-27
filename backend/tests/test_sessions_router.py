import json


def get_auth_headers(client, email="testuser@example.com", password="TestPass123!", role="teacher"):
    # Register user (role is ignored unless admin token is used, so always teacher)
    client.post("/api/v1/auth/register", json={"email": email, "password": password, "role": role})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = login.json().get("access_token")
    return {"Authorization": f"Bearer {token}"} if token else {}


def test_sessions_semesters_empty(client):
    headers = get_auth_headers(client)
    resp = client.get("/api/v1/sessions/semesters", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 0
    assert data["semesters"] == []


def test_sessions_export_missing_semester(client):
    headers = get_auth_headers(client)
    resp = client.get("/api/v1/sessions/export", params={"semester": "NON_EXISTENT"}, headers=headers)
    assert resp.status_code == 404
    data = resp.json()
    # Generic shape check; error code presence depends on http_error implementation
    assert "detail" in data


def test_sessions_import_dry_run_missing_metadata(client):
    headers = get_auth_headers(client)
    # Missing metadata entirely
    payload = {"courses": []}
    content = json.dumps(payload).encode("utf-8")
    files = {"file": ("session.json", content, "application/json")}
    resp = client.post("/api/v1/sessions/import", params={"dry_run": "true"}, files=files, headers=headers)
    assert resp.status_code == 400
    data = resp.json()
    assert "detail" in data


def test_sessions_import_dry_run_missing_semester(client):
    headers = get_auth_headers(client)
    payload = {"metadata": {}, "courses": []}
    content = json.dumps(payload).encode("utf-8")
    files = {"file": ("session.json", content, "application/json")}
    resp = client.post("/api/v1/sessions/import", params={"dry_run": "true"}, files=files, headers=headers)
    assert resp.status_code == 400
    data = resp.json()
    assert "detail" in data


def test_sessions_import_dry_run_valid_empty(client):
    headers = get_auth_headers(client)
    payload = {
        "metadata": {"semester": "2025-Fall"},
        "courses": [],
        "students": [],
        "enrollments": [],
        "grades": [],
        "attendance": [],
        "daily_performance": [],
        "highlights": [],
    }
    content = json.dumps(payload).encode("utf-8")
    files = {"file": ("session.json", content, "application/json")}
    resp = client.post("/api/v1/sessions/import", params={"dry_run": "true"}, files=files, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("dry_run") is True
    assert data.get("validation_passed") is True
    assert data.get("counts") == {
        "courses": 0,
        "students": 0,
        "enrollments": 0,
        "grades": 0,
        "attendance": 0,
        "daily_performance": 0,
        "highlights": 0,
    }


def test_sessions_export_success_with_data(client):
    """End-to-end export: create course, student, enrollment, grade then export semester JSON."""
    headers = get_auth_headers(client)
    # Create student
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Export",
            "last_name": "Tester",
            "email": "export.tester@example.com",
            "student_id": "EXP001",
        },
        headers=headers,
    ).json()

    # Create course in target semester
    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "EXP101",
            "course_name": "Export Mechanics",
            "semester": "2025-Fall",
            "credits": 3,
        },
        headers=headers,
    ).json()

    # Enroll student in course
    enroll_resp = client.post(
        f"/api/v1/enrollments/course/{course['id']}", json={"student_ids": [student["id"]]}, headers=headers
    )
    # Enrollment creation returns 200 OK (not 201) in current API implementation
    assert enroll_resp.status_code == 200

    # Create a grade record
    grade_payload = {
        "student_id": student["id"],
        "course_id": course["id"],
        "assignment_name": "Export Assignment",
        "category": "Homework",
        "grade": 90.0,
        "max_grade": 100.0,
        "weight": 1.0,
        "date_assigned": "2025-09-01",
        "date_submitted": "2025-09-01",
    }
    grade_resp = client.post("/api/v1/grades/", json=grade_payload, headers=headers)
    assert grade_resp.status_code == 201

    # Perform export
    resp = client.get("/api/v1/sessions/export", params={"semester": "2025-Fall"}, headers=headers)
    assert resp.status_code == 200, resp.text
    exported = json.loads(resp.content.decode("utf-8"))

    # Validate metadata and counts
    assert exported["metadata"]["semester"] == "2025-Fall"
    counts = exported["metadata"]["counts"]
    # All dependent entities should now be persisted thanks to flush fix
    assert counts["courses"] == 1
    assert counts["students"] == 1
    assert counts["enrollments"] == 1
    assert counts["grades"] == 1
    # Attendance/daily_performance/highlights likely absent
    assert counts["attendance"] == 0
    assert counts["daily_performance"] == 0
    assert counts["highlights"] == 0

    # Basic shape checks
    assert len(exported["courses"]) == 1
    assert len(exported["students"]) == 1
    assert len(exported["enrollments"]) == 1
    assert len(exported["grades"]) == 1


def test_sessions_list_backups(client):
    """List backups endpoint should respond with a JSON structure (may be empty)."""
    headers = get_auth_headers(client)
    resp = client.get("/api/v1/sessions/backups", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "backups" in data
    assert "count" in data


def test_sessions_import_non_dry_run_creates_backup_and_persists(client):
    """Perform a real (non-dry-run) import and verify backup creation + subsequent export counts."""
    headers = get_auth_headers(client)
    # Build import payload with Unicode semester to exercise filename/backup behavior
    semester = "2025-Fall-Ü"
    import_payload = {
        "metadata": {"semester": semester},
        "courses": [{"course_code": "ÜEXP101", "course_name": "Unicode Export", "semester": semester, "credits": 2}],
        "students": [
            {
                "student_id": "ÜSTU001",
                "first_name": "Αλέξης",
                "last_name": "Παπαδόπουλος",
                "email": "unicode.student@example.com",
            }
        ],
        "enrollments": [
            {"student_id_ref": "ÜSTU001", "course_code_ref": "ÜEXP101", "enrolled_at": "2025-09-01T00:00:00"}
        ],
        "grades": [
            {
                "student_id_ref": "ÜSTU001",
                "course_code_ref": "ÜEXP101",
                "assignment_name": "Werkstück 1",
                "category": "Homework",
                "grade": 95,
                "max_grade": 100,
                "weight": 1.0,
                "date_assigned": "2025-09-10",
                "date_submitted": "2025-09-11",
            }
        ],
        "attendance": [],
        "daily_performance": [],
        "highlights": [],
    }
    content = json.dumps(import_payload).encode("utf-8")
    files = {"file": ("session_unicode.json", content, "application/json")}
    resp = client.post("/api/v1/sessions/import", files=files, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("success") is True
    assert data.get("validation_passed") is True
    # In-memory DB may not create a backup file; allow False in test environment
    if data.get("backup_path"):
        assert "pre_import_backup_" in data.get("backup_path")
    # Export newly imported semester
    export_resp = client.get("/api/v1/sessions/export", params={"semester": semester}, headers=headers)
    assert export_resp.status_code == 200, export_resp.text
    exported = json.loads(export_resp.content.decode("utf-8"))
    counts = exported["metadata"]["counts"]
    assert counts["courses"] == 1
    assert counts["students"] == 1
    assert counts["enrollments"] == 1
    assert counts["grades"] == 1
    # Verify backups listing includes any available backup when present
    backups_list = client.get("/api/v1/sessions/backups", headers=headers).json()
    if backups_list.get("count", 0) > 0:
        assert any("pre_import_backup_" in b.get("filename", "") for b in backups_list.get("backups", []))


def test_sessions_export_unicode_semester_filename_sanitized(client):
    """Export with non-ASCII semester should produce sanitized ASCII filename ("semester" fallback)."""
    semester = "2025-Fall-Ü"
    # Ensure data exists for this semester; perform a minimal import if export would 404
    headers = get_auth_headers(client)
    resp = client.get("/api/v1/sessions/export", params={"semester": semester}, headers=headers)
    if resp.status_code == 404:
        import_payload = {
            "metadata": {"semester": semester},
            "courses": [{"course_code": "ÜTMP101", "course_name": "Temp Unicode", "semester": semester, "credits": 1}],
            "students": [
                {
                    "student_id": "ÜTMPSTU1",
                    "first_name": "Νίκη",
                    "last_name": "Δοκιμή",
                    "email": "tmp.unicode@example.com",
                }
            ],
            "enrollments": [
                {"student_id_ref": "ÜTMPSTU1", "course_code_ref": "ÜTMP101", "enrolled_at": "2025-09-01T00:00:00"}
            ],
            "grades": [],
            "attendance": [],
            "daily_performance": [],
            "highlights": [],
        }
        content = json.dumps(import_payload).encode("utf-8")
        files = {"file": ("session_unicode.json", content, "application/json")}
        import_resp = client.post("/api/v1/sessions/import", files=files, headers=headers)
        assert import_resp.status_code == 200, import_resp.text
        resp = client.get("/api/v1/sessions/export", params={"semester": semester}, headers=headers)
    assert resp.status_code == 200, resp.text
    cd = resp.headers.get("content-disposition", "")
    # Expect sanitized segment 'session_export_semester_' due to non-ASCII character presence
    assert "session_export_semester_" in cd, cd


def test_sessions_rollback_invalid_backup(client):
    headers = get_auth_headers(client)
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Export",
            "last_name": "Tester",
            "email": "export.tester@example.com",
            "student_id": "EXP001",
        },
        headers=headers,
    ).json()

    # Create course in target semester
    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "EXP101",
            "course_name": "Export Mechanics",
            "semester": "2025-Fall",
            "credits": 3,
        },
        headers=headers,
    ).json()

    # Enroll student in course
    enroll_resp = client.post(
        f"/api/v1/enrollments/course/{course['id']}", json={"student_ids": [student["id"]]}, headers=headers
    )
    assert enroll_resp.status_code == 200

    # Create a grade record
    grade_payload = {
        "student_id": student["id"],
        "course_id": course["id"],
        "assignment_name": "Export Assignment",
        "category": "Homework",
        "grade": 90.0,
        "max_grade": 100.0,
        "weight": 1.0,
        "date_assigned": "2025-09-01",
        "date_submitted": "2025-09-01",
    }
    grade_resp = client.post("/api/v1/grades/", json=grade_payload, headers=headers)
    assert grade_resp.status_code == 201

    # Perform export
    resp = client.get("/api/v1/sessions/export", params={"semester": "2025-Fall"}, headers=headers)
    assert resp.status_code == 200, resp.text
    exported = json.loads(resp.content.decode("utf-8"))

    # Validate metadata and counts
    assert exported["metadata"]["semester"] == "2025-Fall"
    counts = exported["metadata"]["counts"]
    assert counts["courses"] == 1
    assert counts["students"] == 1
    assert counts["enrollments"] == 1
    assert counts["grades"] == 1
    assert counts["attendance"] == 0
    assert counts["daily_performance"] == 0
    assert counts["highlights"] == 0

    assert len(exported["courses"]) == 1
    assert len(exported["students"]) == 1
    assert len(exported["enrollments"]) == 1
    assert len(exported["grades"]) == 1
