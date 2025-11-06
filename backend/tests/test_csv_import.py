"""Test CSV import functionality for students."""
import io
from fastapi.testclient import TestClient


def test_csv_import_students_with_greek_columns(client: TestClient):
    """Test CSV import with Greek column names (AUT registration format)."""
    
    # Create a test CSV with Greek column headers
    csv_content = """Αριθμός Δελτίου Ταυτότητας:;Επώνυμο:;Όνομα:;Όνομα Πατέρα:;Ηλ. Ταχυδρομείο:;Αρ. Κινητού Τηλεφώνου:;Αρ. Σταθερού Τηλεφώνου:;Έτος Σπουδών:;Τυχόν σοβαρό πρόβλημα υγείας - οποιαδήποτε μορφή ανεπάρκειας ή μεινονεξία (προαιρετική συμπλήρωση):
123456;Παπαδόπουλος;Γιώργος;Νίκος;test1@example.com;+30 6912345678;210-1234567;Α';Διαβήτης
789012;Γεωργίου;Μαρία;Κώστας;test2@example.com;+30 6987654321;;Β';
"""
    
    files = {
        "files": ("test_students.csv", csv_content.encode("utf-8"), "text/csv"),
    }
    data = {"import_type": "students"}
    
    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("type") == "students"
    assert body.get("created", 0) == 2
    assert body.get("updated", 0) == 0
    assert len(body.get("errors", [])) == 0
    
    # Verify first student has all fields
    resp2 = client.get("/api/v1/students/")
    assert resp2.status_code == 200
    data2 = resp2.json()
    students = data2.get("items", [])
    
    # Find student by ID
    student1 = next((s for s in students if s.get("student_id") == "S123456"), None)
    assert student1 is not None
    assert student1.get("first_name") == "Γιώργος"
    assert student1.get("last_name") == "Παπαδόπουλος"
    assert student1.get("father_name") == "Νίκος"
    assert student1.get("email") == "test1@example.com"
    assert student1.get("mobile_phone") == "+30 6912345678"
    assert student1.get("phone") == "210-1234567"
    assert student1.get("health_issue") == "Διαβήτης"
    assert student1.get("study_year") == 1  # Α' -> 1
    
    # Verify second student
    student2 = next((s for s in students if s.get("student_id") == "S789012"), None)
    assert student2 is not None
    assert student2.get("first_name") == "Μαρία"
    assert student2.get("study_year") == 2  # Β' -> 2
    assert student2.get("health_issue") is None or student2.get("health_issue") == ""


def test_csv_import_rejects_for_courses(client: TestClient):
    """Test that CSV import is rejected for courses (only JSON supported)."""
    
    csv_content = "course_code;course_name\nCSV101;Test Course\n"
    
    files = {
        "files": ("test_courses.csv", csv_content.encode("utf-8"), "text/csv"),
    }
    data = {"import_type": "courses"}
    
    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200
    body = resp.json()
    # Should have error message about CSV only for students
    errors = body.get("errors", [])
    assert any("CSV import only supported for students" in str(e) for e in errors)


def test_csv_import_handles_missing_required_fields(client: TestClient):
    """Test that CSV import handles missing required fields gracefully."""
    
    # Missing email in second row
    csv_content = """Αριθμός Δελτίου Ταυτότητας:;Επώνυμο:;Όνομα:;Ηλ. Ταχυδρομείο:;Έτος Σπουδών:
111111;Valid;Student;valid@example.com;Α'
222222;Invalid;Student;;Α'
"""
    
    files = {
        "files": ("test_invalid.csv", csv_content.encode("utf-8"), "text/csv"),
    }
    data = {"import_type": "students"}
    
    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("created", 0) == 1  # Only first student created
    errors = body.get("errors", [])
    assert len(errors) == 1  # One error for missing email
    assert "Missing email" in str(errors[0])


def test_csv_import_converts_study_years(client: TestClient):
    """Test that Greek study year codes are correctly converted to integers."""
    
    csv_content = """Αριθμός Δελτίου Ταυτότητας:;Επώνυμο:;Όνομα:;Ηλ. Ταχυδρομείο:;Έτος Σπουδών:
Y1;Test1;Student1;y1@example.com;Α'
Y2;Test2;Student2;y2@example.com;Β'
Y3;Test3;Student3;y3@example.com;Γ'
Y4;Test4;Student4;y4@example.com;Δ'
"""
    
    files = {
        "files": ("test_years.csv", csv_content.encode("utf-8"), "text/csv"),
    }
    data = {"import_type": "students"}
    
    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("created", 0) == 4
    
    # Verify study years
    resp2 = client.get("/api/v1/students/")
    students = resp2.json().get("items", [])
    
    y1 = next((s for s in students if s.get("student_id") == "SY1"), None)
    assert y1 and y1.get("study_year") == 1
    
    y2 = next((s for s in students if s.get("student_id") == "SY2"), None)
    assert y2 and y2.get("study_year") == 2
    
    y3 = next((s for s in students if s.get("student_id") == "SY3"), None)
    assert y3 and y3.get("study_year") == 3
    
    y4 = next((s for s in students if s.get("student_id") == "SY4"), None)
    assert y4 and y4.get("study_year") == 4
