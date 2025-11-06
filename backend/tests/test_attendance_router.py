"""
Tests for Attendance Router (/api/v1/attendance)

Coverage:
- Create attendance (status validation, duplicate detection)
- Get all attendance (with filters)
- Get attendance by student
- Get attendance by course
- Get attendance by date and course
- Update attendance
- Delete attendance
- Attendance statistics
- Bulk create attendance
"""

from datetime import date, timedelta

from backend.errors import ErrorCode
from backend.tests.utils import get_error_message


def test_create_attendance_success(client):
    """Create attendance record successfully"""
    # Create test student
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT001", "email": "att001@test.com", "first_name": "Test", "last_name": "Student"},
    )
    assert student_resp.status_code == 201
    student_id = student_resp.json()["id"]

    # Create test course
    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS101", "course_name": "Test Course", "semester": "Fall 2025", "credits": 3},
    )
    assert course_resp.status_code == 201
    course_id = course_resp.json()["id"]

    # Create attendance
    response = client.post(
        "/api/v1/attendance/",
        json={
            "student_id": student_id,
            "course_id": course_id,
            "date": str(date.today()),
            "status": "Present",
            "period_number": 1,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["student_id"] == student_id
    assert data["course_id"] == course_id
    assert data["status"] == "Present"
    assert "id" in data


def test_create_attendance_invalid_student(client):
    """Create attendance with non-existent student should fail"""
    # Create test course first
    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS102", "course_name": "Test Course 2", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    response = client.post(
        "/api/v1/attendance/",
        json={"student_id": 99999, "course_id": course_id, "date": str(date.today()), "status": "Present"},
    )

    assert response.status_code == 404
    payload = response.json()
    detail = payload["detail"]
    assert "Student" in detail and "not found" in detail


def test_create_attendance_invalid_course(client):
    """Create attendance with non-existent course should fail"""
    # Create test student first
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT002", "email": "att002@test.com", "first_name": "Test", "last_name": "Student2"},
    )
    student_id = student_resp.json()["id"]

    response = client.post(
        "/api/v1/attendance/",
        json={"student_id": student_id, "course_id": 99999, "date": str(date.today()), "status": "Present"},
    )

    assert response.status_code == 404
    payload = response.json()
    detail = payload["detail"]
    assert "Course" in detail and "not found" in detail


def test_create_duplicate_attendance(client):
    """Creating duplicate attendance should fail"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT003", "email": "att003@test.com", "first_name": "Test", "last_name": "Student3"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS103", "course_name": "Test Course 3", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    attendance_data = {
        "student_id": student_id,
        "course_id": course_id,
        "date": str(date.today()),
        "status": "Present",
        "period_number": 1,
    }

    # Create first attendance
    response1 = client.post("/api/v1/attendance/", json=attendance_data)
    assert response1.status_code == 201

    # Try to create duplicate
    response2 = client.post("/api/v1/attendance/", json=attendance_data)
    assert response2.status_code == 400
    payload = response2.json()
    detail = payload["detail"]
    assert detail["error_id"] == ErrorCode.ATTENDANCE_ALREADY_EXISTS.value
    assert "already exists" in get_error_message(payload)


def test_get_all_attendance(client):
    """Get all attendance records"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT004", "email": "att004@test.com", "first_name": "Test", "last_name": "Student4"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS104", "course_name": "Test Course 4", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create multiple attendance records
    for i in range(3):
        client.post(
            "/api/v1/attendance/",
            json={
                "student_id": student_id,
                "course_id": course_id,
                "date": str(date.today() - timedelta(days=i)),
                "status": "Present",
                "period_number": 1,
            },
        )

    response = client.get("/api/v1/attendance/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


def test_filter_attendance_by_student(client):
    """Filter attendance by student_id"""
    # Create two students
    student1_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT005", "email": "att005@test.com", "first_name": "Test", "last_name": "Student5"},
    )
    student1_id = student1_resp.json()["id"]

    student2_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT006", "email": "att006@test.com", "first_name": "Test", "last_name": "Student6"},
    )
    student2_id = student2_resp.json()["id"]

    # Create course
    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS105", "course_name": "Test Course 5", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create attendance for both students
    client.post(
        "/api/v1/attendance/",
        json={"student_id": student1_id, "course_id": course_id, "date": str(date.today()), "status": "Present"},
    )
    client.post(
        "/api/v1/attendance/",
        json={"student_id": student2_id, "course_id": course_id, "date": str(date.today()), "status": "Absent"},
    )

    # Filter by student1
    response = client.get(f"/api/v1/attendance/?student_id={student1_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all(a["student_id"] == student1_id for a in data["items"])


def test_filter_attendance_by_status(client):
    """Filter attendance by status"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT007", "email": "att007@test.com", "first_name": "Test", "last_name": "Student7"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS106", "course_name": "Test Course 6", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create attendance with different statuses
    statuses = ["Present", "Absent", "Late", "Excused"]
    for i, status in enumerate(statuses):
        client.post(
            "/api/v1/attendance/",
            json={
                "student_id": student_id,
                "course_id": course_id,
                "date": str(date.today() - timedelta(days=i)),
                "status": status,
                "period_number": 1,
            },
        )

    # Filter by "Absent"
    response = client.get("/api/v1/attendance/?status=Absent")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all(a["status"] == "Absent" for a in data["items"])


def test_get_student_attendance(client):
    """Get all attendance for a specific student"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT008", "email": "att008@test.com", "first_name": "Test", "last_name": "Student8"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS107", "course_name": "Test Course 7", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create attendance
    client.post(
        "/api/v1/attendance/",
        json={"student_id": student_id, "course_id": course_id, "date": str(date.today()), "status": "Present"},
    )

    response = client.get(f"/api/v1/attendance/student/{student_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(a["student_id"] == student_id for a in data)


def test_get_course_attendance(client):
    """Get all attendance for a specific course"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT009", "email": "att009@test.com", "first_name": "Test", "last_name": "Student9"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS108", "course_name": "Test Course 8", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create attendance
    client.post(
        "/api/v1/attendance/",
        json={"student_id": student_id, "course_id": course_id, "date": str(date.today()), "status": "Present"},
    )

    response = client.get(f"/api/v1/attendance/course/{course_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(a["course_id"] == course_id for a in data)


def test_get_attendance_by_date_and_course(client):
    """Get attendance for a specific course on a specific date"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT010", "email": "att010@test.com", "first_name": "Test", "last_name": "Student10"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS109", "course_name": "Test Course 9", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    today = date.today()
    # Create attendance for today
    client.post(
        "/api/v1/attendance/",
        json={"student_id": student_id, "course_id": course_id, "date": str(today), "status": "Present"},
    )

    response = client.get(f"/api/v1/attendance/date/{today}/course/{course_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(a["course_id"] == course_id for a in data)


def test_attendance_date_range_filtering(client):
    """Filter attendance records by explicit start_date/end_date and validate defaults."""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT014", "email": "att014@test.com", "first_name": "Test", "last_name": "Student14"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS114", "course_name": "Test Course 14", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    today = date.today()
    d0 = today
    d1 = today - timedelta(days=10)
    d2 = today - timedelta(days=30)

    # Create three records spread across dates
    for d, status in [(d0, "Present"), (d1, "Absent"), (d2, "Late")]:
        client.post(
            "/api/v1/attendance/",
            json={
                "student_id": student_id,
                "course_id": course_id,
                "date": str(d),
                "status": status,
                "period_number": 1,
            },
        )

    # Range that should only include d1 (from 15 days ago to 5 days ago)
    start = (today - timedelta(days=15)).isoformat()
    end = (today - timedelta(days=5)).isoformat()
    r = client.get(
        f"/api/v1/attendance/?student_id={student_id}&course_id={course_id}&start_date={start}&end_date={end}"
    )
    assert r.status_code == 200
    js = r.json()
    assert js["total"] == 1
    assert len(js["items"]) == 1
    assert js["items"][0]["date"] == d1.isoformat()

    # Only start_date provided: end should default using SEMESTER_WEEKS (14w).
    # With start=today-20d, should include d0 and d1, but exclude d2 (30d ago < start)
    r2 = client.get(
        f"/api/v1/attendance/?student_id={student_id}&course_id={course_id}&start_date={(today - timedelta(days=20)).isoformat()}"
    )
    assert r2.status_code == 200
    r2_data = r2.json()
    dates = {x["date"] for x in r2_data["items"]}
    assert d0.isoformat() in dates and d1.isoformat() in dates
    assert d2.isoformat() not in dates

    # Invalid range (start after end)
    bad = client.get(
        f"/api/v1/attendance/?start_date={(today).isoformat()}&end_date={(today - timedelta(days=1)).isoformat()}"
    )
    assert bad.status_code == 400


def test_update_attendance(client):
    """Update attendance status"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT011", "email": "att011@test.com", "first_name": "Test", "last_name": "Student11"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS110", "course_name": "Test Course 10", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create attendance
    create_resp = client.post(
        "/api/v1/attendance/",
        json={"student_id": student_id, "course_id": course_id, "date": str(date.today()), "status": "Absent"},
    )
    attendance_id = create_resp.json()["id"]

    # Update to Present
    response = client.put(f"/api/v1/attendance/{attendance_id}", json={"status": "Present"})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Present"


def test_delete_attendance(client):
    """Delete attendance record"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT012", "email": "att012@test.com", "first_name": "Test", "last_name": "Student12"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS111", "course_name": "Test Course 11", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create attendance
    create_resp = client.post(
        "/api/v1/attendance/",
        json={"student_id": student_id, "course_id": course_id, "date": str(date.today()), "status": "Present"},
    )
    attendance_id = create_resp.json()["id"]

    # Delete
    response = client.delete(f"/api/v1/attendance/{attendance_id}")
    assert response.status_code == 204

    # Verify deleted
    get_resp = client.get(f"/api/v1/attendance/{attendance_id}")
    assert get_resp.status_code == 404
    payload = get_resp.json()
    detail = payload["detail"]
    assert "Attendance" in detail and "not found" in detail


def test_attendance_stats(client):
    """Get attendance statistics for a student in a course"""
    # Create test data
    student_resp = client.post(
        "/api/v1/students/",
        json={"student_id": "ATT013", "email": "att013@test.com", "first_name": "Test", "last_name": "Student13"},
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS112", "course_name": "Test Course 12", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Create attendance records
    statuses = ["Present", "Present", "Absent", "Late", "Present"]
    for i, status in enumerate(statuses):
        client.post(
            "/api/v1/attendance/",
            json={
                "student_id": student_id,
                "course_id": course_id,
                "date": str(date.today() - timedelta(days=i)),
                "status": status,
                "period_number": 1,
            },
        )

    # Get stats
    response = client.get(f"/api/v1/attendance/stats/student/{student_id}/course/{course_id}")
    assert response.status_code == 200
    data = response.json()

    assert data["total_classes"] == 5
    assert data["present_count"] == 3
    assert data["absent_count"] == 1
    assert data["late_count"] == 1
    assert data["attendance_rate"] == 60.0  # 3/5 * 100


def test_attendance_stats_no_records_returns_message(client):
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ATT015",
            "email": "att015@test.com",
            "first_name": "Test",
            "last_name": "Student15",
        },
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS115", "course_name": "Test Course 15", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    response = client.get(f"/api/v1/attendance/stats/student/{student_id}/course/{course_id}")
    assert response.status_code == 200
    assert response.json() == {"message": "No attendance records found"}


def test_bulk_create_attendance(client):
    """Bulk create attendance records"""
    # Create test data
    students = []
    for i in range(3):
        student_resp = client.post(
            "/api/v1/students/",
            json={
                "student_id": f"ATTBULK{i:03d}",
                "email": f"attbulk{i}@test.com",
                "first_name": f"Bulk{i}",
                "last_name": "Student",
            },
        )
        students.append(student_resp.json()["id"])

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS113", "course_name": "Test Course Bulk", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    # Bulk create
    attendance_list = [
        {
            "student_id": student_id,
            "course_id": course_id,
            "date": str(date.today()),
            "status": "Present",
            "period_number": 1,
        }
        for student_id in students
    ]

    response = client.post("/api/v1/attendance/bulk/create", json=attendance_list)
    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 3
    assert data["failed"] == 0


def test_attendance_date_range_with_only_end_date(client):
    student_resp = client.post(
        "/api/v1/students/",
        json={
            "student_id": "ATT016",
            "email": "att016@test.com",
            "first_name": "Test",
            "last_name": "Student16",
        },
    )
    student_id = student_resp.json()["id"]

    course_resp = client.post(
        "/api/v1/courses/",
        json={"course_code": "CS116", "course_name": "Test Course 16", "semester": "Fall 2025", "credits": 3},
    )
    course_id = course_resp.json()["id"]

    today = date.today()
    within_range = today - timedelta(days=5)
    outside_range = today - timedelta(days=120)

    for d, status in [(within_range, "Present"), (outside_range, "Absent")]:
        client.post(
            "/api/v1/attendance/",
            json={
                "student_id": student_id,
                "course_id": course_id,
                "date": str(d),
                "status": status,
                "period_number": 1,
            },
        )

    response = client.get(
        f"/api/v1/attendance/?student_id={student_id}&course_id={course_id}&end_date={today.isoformat()}"
    )
    assert response.status_code == 200
    data = response.json()
    dates = {item["date"] for item in data["items"]}
    assert within_range.isoformat() in dates
    assert outside_range.isoformat() not in dates


def test_update_attendance_not_found(client):
    response = client.put("/api/v1/attendance/9999", json={"status": "Late"})
    assert response.status_code == 404
    payload = response.json()
    detail = payload["detail"]
    assert "Attendance" in detail and "not found" in detail


def test_delete_attendance_not_found(client):
    response = client.delete("/api/v1/attendance/9999")
    assert response.status_code == 404
    payload = response.json()
    detail = payload["detail"]
    assert "Attendance" in detail and "not found" in detail


def test_get_student_attendance_not_found(client):
    response = client.get("/api/v1/attendance/student/9999")
    assert response.status_code == 404
    payload = response.json()
    detail = payload["detail"]
    assert "Student" in detail and "not found" in detail


def test_get_course_attendance_not_found(client):
    response = client.get("/api/v1/attendance/course/9999")
    assert response.status_code == 404
    payload = response.json()
    detail = payload["detail"]
    assert "Course" in detail and "not found" in detail


def test_get_attendance_by_date_course_not_found(client):
    today = date.today().isoformat()
    response = client.get(f"/api/v1/attendance/date/{today}/course/9999")
    assert response.status_code == 404
    payload = response.json()
    detail = payload["detail"]
    assert "Course" in detail and "not found" in detail
