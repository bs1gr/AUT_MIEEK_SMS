"""
Tests for Enrollments Router (/api/v1/enrollments)

Coverage:
- Enroll students in courses
- Prevent duplicate enrollments
- List enrollments (all, by course, by student)
- List enrolled students for a course
- Unenroll students from courses
- Validation (student/course existence)
"""

from datetime import date

from backend.tests.utils import get_error_message


import pytest


@pytest.mark.auth_required
@pytest.mark.requires_params(["a", "k"])
def test_enroll_single_student_success(client):
    """Enroll a single student in a course"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ENR001",
            "email": "enr001@test.com",
            "first_name": "Test",
            "last_name": "Student",
        },
        params={"a": "dummy", "k": "dummy"},
    )
    assert student_resp.status_code == 201
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS201",
            "course_name": "Test Course",
            "semester": "Fall 2025",
            "credits": 3,
        },
        params={"a": "dummy", "k": "dummy"},
    )
    assert course_resp.status_code == 201
    course_id = course_resp.json()["id"]

    # Enroll student
    response = client.post(
        f"/api/v1/enrollments/course/{course_id}",
        json={"student_ids": [student_id], "enrolled_at": str(date.today())},
        params={"a": "dummy", "k": "dummy"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 1


@pytest.mark.auth_required
@pytest.mark.requires_params(["a", "k"])
def test_enroll_multiple_students(client):
    """Enroll multiple students in a course at once"""
    # Create students
    student_ids = []
    for i in range(3):
        student_resp = client.post(
            "/api/v1/students/",
            json={
                "student_id": f"ENRM{i:03d}",
                "email": f"enrm{i}@test.com",
                "first_name": f"Student{i}",
                "last_name": "Test",
            },
            params={"a": "dummy", "k": "dummy"},
        )
        student_ids.append(student_resp.json()["id"])

    # Create course
    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS202",
            "course_name": "Bulk Enrollment Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
        params={"a": "dummy", "k": "dummy"},
    )
    course_id = course_resp.json()["id"]

    # Enroll all students
    response = client.post(
        f"/api/v1/enrollments/course/{course_id}",
        json={"student_ids": student_ids, "enrolled_at": str(date.today())},
        params={"a": "dummy", "k": "dummy"},
    )

    assert response.status_code == 200
    assert response.json()["created"] == 3


def test_enroll_duplicate_prevention(client):
    """Enrolling the same student twice should not create duplicates"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ENR002",
            "email": "enr002@test.com",
            "first_name": "Test",
            "last_name": "Student2",
        },
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS203",
            "course_name": "Duplicate Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    # First enrollment
    response1 = client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [student_id]}
    )
    assert response1.json()["created"] == 1

    # Try to enroll again (should skip duplicate)
    response2 = client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [student_id]}
    )
    assert response2.json()["created"] == 0


def test_enroll_nonexistent_course(client):
    """Enrolling in non-existent course should fail"""
    response = client.post(
        "/api/v1/enrollments/course/99999", json={"student_ids": [1]}
    )

    assert response.status_code == 404
    detail = response.json()["detail"]
    assert "Course" in detail and "not found" in detail


def test_enroll_nonexistent_student_skipped(client):
    """Enrolling non-existent students should skip them gracefully"""
    # Create course
    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS204",
            "course_name": "Skip Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    # Try to enroll non-existent students
    response = client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [99999, 88888]}
    )

    assert response.status_code == 200
    assert response.json()["created"] == 0


def test_get_all_enrollments(client):
    """Get all enrollments in the system"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ENR003",
            "email": "enr003@test.com",
            "first_name": "Test",
            "last_name": "Student3",
        },
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS205",
            "course_name": "List Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    # Enroll
    client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [student_id]}
    )

    # Get all enrollments
    response = client.get("/api/v1/enrollments/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any(
        e["student_id"] == student_id and e["course_id"] == course_id
        for e in data["items"]
    )


def test_list_course_enrollments(client):
    """List all enrollments for a specific course"""
    # Create course and students
    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS206",
            "course_name": "Course List Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    student_ids = []
    for i in range(2):
        student_resp = client.post(
            "/api/v1/students/",
            json={
                "student_id": f"ENRC{i:03d}",
                "email": f"enrc{i}@test.com",
                "first_name": f"Student{i}",
                "last_name": "Test",
            },
        )
        student_ids.append(student_resp.json()["id"])

    # Enroll students
    client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": student_ids}
    )

    # List course enrollments
    response = client.get(f"/api/v1/enrollments/course/{course_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(e["course_id"] == course_id for e in data)


def test_list_course_enrollments_not_found(client):
    """Listing enrollments for non-existent course should fail"""
    response = client.get("/api/v1/enrollments/course/99999")
    assert response.status_code == 404
    detail = response.json()["detail"]
    assert "Course" in detail and "not found" in detail


def test_list_student_enrollments(client):
    """List all enrollments for a specific student"""
    # Create student
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ENR004",
            "email": "enr004@test.com",
            "first_name": "Test",
            "last_name": "Student4",
        },
    )
    student_id = student_resp.json()["id"]

    # Create multiple courses
    course_ids = []
    for i in range(2):
        course_resp = client.post(
            "/api/v1/courses/",
            json={
                "course_code": f"CS20{7 + i}",
                "course_name": f"Student List Test {i}",
                "semester": "Fall 2025",
                "credits": 3,
            },
        )
        course_ids.append(course_resp.json()["id"])

    # Enroll student in multiple courses
    for course_id in course_ids:
        client.post(
            f"/api/v1/enrollments/course/{course_id}",
            json={"student_ids": [student_id]},
        )

    # List student enrollments
    response = client.get(f"/api/v1/enrollments/student/{student_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(e["student_id"] == student_id for e in data)


def test_list_student_enrollments_not_found(client):
    """Listing enrollments for non-existent student should fail"""
    response = client.get("/api/v1/enrollments/student/99999")
    assert response.status_code == 404
    detail = response.json()["detail"]
    assert "Student" in detail and "not found" in detail


def test_list_enrolled_students(client):
    """List all students enrolled in a course"""
    # Create course
    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS209",
            "course_name": "Enrolled Students Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    # Create and enroll students
    student_ids = []
    for i in range(3):
        student_resp = client.post(
            "/api/v1/students/",
            json={
                "student_id": f"ENRS{i:03d}",
                "email": f"enrs{i}@test.com",
                "first_name": f"FirstName{i}",
                "last_name": f"LastName{i}",
            },
        )
        student_ids.append(student_resp.json()["id"])

    client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": student_ids}
    )

    # List enrolled students
    response = client.get(f"/api/v1/enrollments/course/{course_id}/students")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all(
        "first_name" in s and "last_name" in s and "student_id" in s for s in data
    )


def test_list_enrolled_students_not_found(client):
    """Listing enrolled students for non-existent course should fail"""
    response = client.get("/api/v1/enrollments/course/99999/students")
    assert response.status_code == 404
    detail = response.json()["detail"]
    assert "Course" in detail and "not found" in detail


def test_unenroll_student_success(client):
    """Unenroll a student from a course"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ENR005",
            "email": "enr005@test.com",
            "first_name": "Test",
            "last_name": "Student5",
        },
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS210",
            "course_name": "Unenroll Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    # Enroll student
    client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": [student_id]}
    )

    # Verify enrollment exists
    enrollments = client.get(f"/api/v1/enrollments/course/{course_id}").json()
    assert len(enrollments) == 1

    # Unenroll student
    response = client.delete(
        f"/api/v1/enrollments/course/{course_id}/student/{student_id}"
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Unenrolled"

    # Verify enrollment removed
    enrollments_after = client.get(f"/api/v1/enrollments/course/{course_id}").json()
    assert len(enrollments_after) == 0


def test_unenroll_student_not_found(client):
    """Unenrolling non-existent enrollment should fail"""
    # Create course and student (but don't enroll)
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ENR006",
            "email": "enr006@test.com",
            "first_name": "Test",
            "last_name": "Student6",
        },
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS211",
            "course_name": "Unenroll Not Found Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    # Try to unenroll without enrolling first
    response = client.delete(
        f"/api/v1/enrollments/course/{course_id}/student/{student_id}"
    )
    assert response.status_code == 404
    payload = response.json()
    assert get_error_message(payload) == "Enrollment not found"
    assert payload["detail"]["error_id"] == "ENR_NOT_FOUND"


def test_enrollment_pagination(client):
    """Test pagination for get all enrollments"""
    # Create students and course
    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS212",
            "course_name": "Pagination Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    student_ids = []
    for i in range(5):
        student_resp = client.post(
            "/api/v1/students/",
            json={
                "student_id": f"ENRP{i:03d}",
                "email": f"enrp{i}@test.com",
                "first_name": f"Page{i}",
                "last_name": "Student",
            },
        )
        student_ids.append(student_resp.json()["id"])

    # Enroll all students
    client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": student_ids}
    )

    # Test pagination
    response_page1 = client.get("/api/v1/enrollments/?skip=0&limit=3")
    assert response_page1.status_code == 200
    page1_data = response_page1.json()

    response_page2 = client.get("/api/v1/enrollments/?skip=3&limit=3")
    assert response_page2.status_code == 200
    page2_data = response_page2.json()

    # Verify pagination works (different results)
    if len(page1_data["items"]) >= 3:
        assert (
            page1_data["items"][0]["id"] != page2_data["items"][0]["id"]
            if len(page2_data["items"]) > 0
            else True
        )


def test_enroll_with_custom_date(client):
    """Enroll students with a custom enrollment date"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ENR007",
            "email": "enr007@test.com",
            "first_name": "Test",
            "last_name": "Student7",
        },
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS213",
            "course_name": "Custom Date Test",
            "semester": "Fall 2025",
            "credits": 3,
        },
    )
    course_id = course_resp.json()["id"]

    # Enroll with custom date
    custom_date = "2025-09-01"
    response = client.post(
        f"/api/v1/enrollments/course/{course_id}",
        json={"student_ids": [student_id], "enrolled_at": custom_date},
    )
    assert response.status_code == 200

    # Verify the enrollment date
    enrollments = client.get(f"/api/v1/enrollments/course/{course_id}").json()
    assert len(enrollments) == 1
    assert enrollments[0]["enrolled_at"] == custom_date
