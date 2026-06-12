from fastapi.testclient import TestClient


def test_create_student_import_job(client: TestClient, admin_headers: dict):
    """Test creating a student import job."""
    # Create a dummy CSV file
    file_content = b"first_name,last_name,email\nJohn,Doe,john@example.com"
    files = {"file": ("students.csv", file_content, "text/csv")}

    response = client.post("/api/v1/import-export/imports/students", headers=admin_headers, files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["import_type"] == "students"
    assert data["data"]["status"] == "pending"
    assert "id" in data["data"]


def test_create_course_import_job(client: TestClient, admin_headers: dict):
    """Test creating a course import job."""
    file_content = b"course_code,course_name\nCS101,Intro to CS"
    files = {"file": ("courses.csv", file_content, "text/csv")}

    response = client.post("/api/v1/import-export/imports/courses", headers=admin_headers, files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["import_type"] == "courses"


def test_create_grade_import_job(client: TestClient, admin_headers: dict):
    """Test creating a grade import job."""
    file_content = b"student_id,course_code,grade\nS1,CS101,85"
    files = {"file": ("grades.csv", file_content, "text/csv")}

    response = client.post("/api/v1/import-export/imports/grades", headers=admin_headers, files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["import_type"] == "grades"


def test_list_import_jobs(client: TestClient, admin_headers: dict):
    """Test listing import jobs."""
    response = client.get("/api/v1/import-export/imports", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"]["jobs"], list)


def test_create_export_job(client: TestClient, admin_headers: dict):
    """Test creating an export job."""
    payload = {"export_type": "students", "file_format": "csv", "filters": {}}
    response = client.post("/api/v1/import-export/exports", headers=admin_headers, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["export_type"] == "students"
    assert data["data"]["status"] == "pending"


def test_list_export_jobs(client: TestClient, admin_headers: dict):
    """Test listing export jobs."""
    response = client.get("/api/v1/import-export/exports", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"]["exports"], list)


def test_get_history(client: TestClient, admin_headers: dict):
    """Test retrieving import/export history."""
    response = client.get("/api/v1/import-export/history", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"]["history"], list)
