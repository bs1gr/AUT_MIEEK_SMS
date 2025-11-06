from __future__ import annotations

from datetime import date, timedelta
from typing import Dict

import pytest

from backend.routers import routers_grades
from backend.config import settings


def make_grade_payload(i: int = 1, **overrides) -> Dict:
    """Helper to create grade payloads with sequential defaults."""
    base = {
        "student_id": 1,
        "course_id": 1,
        "assignment_name": f"Assignment {i}",
        "category": "Homework",
        "grade": 85.0,
        "max_grade": 100.0,
        "weight": 1.0,
        "date_assigned": date.today().isoformat(),
        "date_submitted": date.today().isoformat(),
        "notes": None,
    }
    base.update(overrides)
    return base


def test_create_grade_success(client):
    """Test successful grade creation after creating student and course."""
    # Setup: create student
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "student_id": "STD0001",
            "enrollment_date": date.today().isoformat(),
        },
    ).json()

    # Setup: create course
    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS101",
            "course_name": "Intro to CS",
            "semester": "Fall 2025",
            "credits": 3,
        },
    ).json()

    # Create grade
    payload = make_grade_payload(1, student_id=student["id"], course_id=course["id"])
    r = client.post("/api/v1/grades/", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["id"] > 0
    assert data["grade"] == 85.0
    assert data["category"] == "Homework"


def test_create_grade_weight_exceeds_limit(client):
    """Test that weight > 3.0 is rejected by Pydantic validator."""
    # Setup: create student and course
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "student_id": "STD0002",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "MATH101",
            "course_name": "Calculus I",
            "semester": "Fall 2025",
        },
    ).json()

    # Attempt to create grade with weight > 3.0
    payload = make_grade_payload(1, student_id=student["id"], course_id=course["id"], weight=3.5)
    r = client.post("/api/v1/grades/", json=payload)
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert any("weight" in str(err).lower() for err in detail)


def test_create_grade_submitted_before_assigned(client):
    """Test that date_submitted < date_assigned is rejected."""
    # Setup
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice.j@example.com",
            "student_id": "STD0003",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "PHY101",
            "course_name": "Physics I",
            "semester": "Fall 2025",
        },
    ).json()

    # date_submitted before date_assigned
    assigned = date.today()
    submitted = assigned - timedelta(days=1)
    payload = make_grade_payload(
        1,
        student_id=student["id"],
        course_id=course["id"],
        date_assigned=assigned.isoformat(),
        date_submitted=submitted.isoformat(),
    )
    r = client.post("/api/v1/grades/", json=payload)
    assert r.status_code == 422


def test_create_grade_category_normalized(client):
    """Test that category is normalized to title case."""
    # Setup
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Bob",
            "last_name": "Brown",
            "email": "bob.brown@example.com",
            "student_id": "STD0004",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "ENG101",
            "course_name": "English Lit",
            "semester": "Fall 2025",
        },
    ).json()

    # lowercase category should normalize
    payload = make_grade_payload(1, student_id=student["id"], course_id=course["id"], category="homework")
    r = client.post("/api/v1/grades/", json=payload)
    assert r.status_code == 201
    assert r.json()["category"] == "Homework"


def test_get_grades_by_student_and_course(client):
    """Test filtering grades by student_id and course_id."""
    # Setup
    s1 = client.post(
        "/api/v1/students/",
        json={
            "first_name": "S1",
            "last_name": "Student",
            "email": "s1@example.com",
            "student_id": "S1",
        },
    ).json()

    s2 = client.post(
        "/api/v1/students/",
        json={
            "first_name": "S2",
            "last_name": "Student",
            "email": "s2@example.com",
            "student_id": "S2",
        },
    ).json()

    c1 = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "C1",
            "course_name": "Course 1",
            "semester": "Fall 2025",
        },
    ).json()

    c2 = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "C2",
            "course_name": "Course 2",
            "semester": "Fall 2025",
        },
    ).json()

    # Create multiple grades
    client.post("/api/v1/grades/", json=make_grade_payload(1, student_id=s1["id"], course_id=c1["id"]))
    client.post("/api/v1/grades/", json=make_grade_payload(2, student_id=s1["id"], course_id=c2["id"]))
    client.post("/api/v1/grades/", json=make_grade_payload(3, student_id=s2["id"], course_id=c1["id"]))

    # Filter by student
    r_s1 = client.get(f"/api/v1/grades/?student_id={s1['id']}")
    assert r_s1.status_code == 200
    s1_data = r_s1.json()
    assert s1_data["total"] == 2
    assert len(s1_data["items"]) == 2

    # Filter by course
    r_c1 = client.get(f"/api/v1/grades/?course_id={c1['id']}")
    assert r_c1.status_code == 200
    c1_data = r_c1.json()
    assert c1_data["total"] == 2
    assert len(c1_data["items"]) == 2

    # Filter by both
    r_both = client.get(f"/api/v1/grades/?student_id={s1['id']}&course_id={c1['id']}")
    assert r_both.status_code == 200
    both_data = r_both.json()
    assert both_data["total"] == 1
    assert len(both_data["items"]) == 1


def test_update_grade_validation(client):
    """Test that update also enforces validation (weight, dates)."""
    # Setup
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Charlie",
            "last_name": "Davis",
            "email": "charlie.d@example.com",
            "student_id": "STD0005",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CHEM101",
            "course_name": "Chemistry I",
            "semester": "Fall 2025",
        },
    ).json()

    # Create valid grade
    payload = make_grade_payload(1, student_id=student["id"], course_id=course["id"])
    r_create = client.post("/api/v1/grades/", json=payload)
    grade_id = r_create.json()["id"]

    # Update with invalid weight
    r_bad_weight = client.put(f"/api/v1/grades/{grade_id}", json={"weight": 5.0})
    assert r_bad_weight.status_code == 422

    # Update with invalid dates
    today = date.today()
    yesterday = today - timedelta(days=1)
    r_bad_dates = client.put(
        f"/api/v1/grades/{grade_id}",
        json={
            "date_assigned": today.isoformat(),
            "date_submitted": yesterday.isoformat(),
        },
    )
    assert r_bad_dates.status_code == 422


def test_delete_grade(client):
    """Test deleting a grade."""
    # Setup
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Dave",
            "last_name": "Evans",
            "email": "dave.e@example.com",
            "student_id": "STD0006",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "BIO101",
            "course_name": "Biology I",
            "semester": "Fall 2025",
        },
    ).json()

    payload = make_grade_payload(1, student_id=student["id"], course_id=course["id"])
    r_create = client.post("/api/v1/grades/", json=payload)
    grade_id = r_create.json()["id"]

    # Delete
    r_del = client.delete(f"/api/v1/grades/{grade_id}")
    assert r_del.status_code == 204

    # Verify 404 after delete
    r_get = client.get(f"/api/v1/grades/{grade_id}")
    assert r_get.status_code == 404


def test_grades_date_range_filtering_assigned_and_submitted(client):
    """Validate date range filtering for grades using date_assigned (default) and date_submitted when requested."""
    # Setup student and course
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Eve",
            "last_name": "Foster",
            "email": "eve.f@example.com",
            "student_id": "STD0101",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "HIST101",
            "course_name": "History I",
            "semester": "Fall 2025",
        },
    ).json()

    today = date.today()
    d0 = today
    d1 = today - timedelta(days=10)
    d2 = today - timedelta(days=30)

    # Create three grades with different assigned and submitted dates
    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            1,
            student_id=student["id"],
            course_id=course["id"],
            date_assigned=d0.isoformat(),
            date_submitted=(d0 + timedelta(days=1)).isoformat(),
        ),
    )
    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            2,
            student_id=student["id"],
            course_id=course["id"],
            date_assigned=d1.isoformat(),
            date_submitted=(d1 + timedelta(days=1)).isoformat(),
        ),
    )
    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            3,
            student_id=student["id"],
            course_id=course["id"],
            date_assigned=d2.isoformat(),
            date_submitted=(d2 + timedelta(days=1)).isoformat(),
        ),
    )

    # Filter by assigned date: range to include only d1
    start = (today - timedelta(days=15)).isoformat()
    end = (today - timedelta(days=5)).isoformat()
    r_assigned = client.get(
        f"/api/v1/grades/?student_id={student['id']}&course_id={course['id']}&start_date={start}&end_date={end}"
    )
    assert r_assigned.status_code == 200
    assigned_data = r_assigned.json()
    assigned_dates = {g["date_assigned"] for g in assigned_data["items"]}
    assert assigned_dates == {d1.isoformat()}

    # Filter by submitted date using use_submitted=true: range to include only the submitted day for d1 (d1+1)
    start2 = (today - timedelta(days=14)).isoformat()
    end2 = (today - timedelta(days=6)).isoformat()
    r_sub = client.get(
        f"/api/v1/grades/?student_id={student['id']}&course_id={course['id']}&start_date={start2}&end_date={end2}&use_submitted=true"
    )
    assert r_sub.status_code == 200
    sub_data = r_sub.json()
    submitted_dates = {g["date_submitted"] for g in sub_data["items"]}
    assert submitted_dates == {(d1 + timedelta(days=1)).isoformat()}

    # Invalid range (start after end)
    bad = client.get(
        f"/api/v1/grades/?start_date={(today).isoformat()}&end_date={(today - timedelta(days=1)).isoformat()}"
    )
    assert bad.status_code == 400
    bad_detail = bad.json()["detail"]
    assert bad_detail["message"] == "start_date must be before end_date"
    assert bad_detail["error_id"] == "ERR_VALIDATION"


def test_create_grade_missing_student(client):
    """Creating a grade for a non-existent student returns 404."""
    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CS404",
            "course_name": "Missing Student Course",
            "semester": "Fall 2025",
        },
    ).json()

    payload = make_grade_payload(1, student_id=99999, course_id=course["id"])
    r = client.post("/api/v1/grades/", json=payload)
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "Student" in detail and "not found" in detail


def test_get_course_grades_missing_course(client):
    """Requesting grades for a missing course returns 404."""
    r = client.get("/api/v1/grades/course/99999")
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "Course" in detail and "not found" in detail


def test_update_grade_not_found(client):
    """Updating a non-existent grade returns 404."""
    r = client.put("/api/v1/grades/99999", json={"grade": 90})
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "Grade" in detail and "not found" in detail


def test_delete_grade_not_found(client):
    """Deleting a non-existent grade returns 404."""
    r = client.delete("/api/v1/grades/99999")
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "Grade" in detail and "not found" in detail


def test_get_grade_analysis_with_and_without_data(client):
    """Grade analysis should return summary when data exists and a message otherwise."""
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Gina",
            "last_name": "Analyst",
            "email": "gina@example.com",
            "student_id": "ANA100",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "AN101",
            "course_name": "Analysis 101",
            "semester": "Fall 2025",
        },
    ).json()

    # No grades yet -> message response
    r_empty = client.get(f"/api/v1/grades/analysis/student/{student['id']}/course/{course['id']}")
    assert r_empty.status_code == 200
    assert r_empty.json()["message"] == "No grades found for this student in this course"

    # Create a few grades across distribution buckets
    payloads = [
        make_grade_payload(1, student_id=student["id"], course_id=course["id"], grade=95, max_grade=100),
        make_grade_payload(2, student_id=student["id"], course_id=course["id"], grade=82, max_grade=100),
        make_grade_payload(3, student_id=student["id"], course_id=course["id"], grade=68, max_grade=100),
        make_grade_payload(4, student_id=student["id"], course_id=course["id"], grade=55, max_grade=100),
    ]
    for payload in payloads:
        # Ensure unique assignment names to satisfy DB constraints
        client.post("/api/v1/grades/", json=payload)

    r_analysis = client.get(f"/api/v1/grades/analysis/student/{student['id']}/course/{course['id']}")
    assert r_analysis.status_code == 200
    data = r_analysis.json()
    assert data["total_grades"] == 4
    assert data["grade_distribution"]["A (90-100)"] == 1
    assert data["grade_distribution"]["B (80-89)"] == 1
    assert data["grade_distribution"]["D (60-69)"] == 1
    assert data["grade_distribution"]["F (below 60)"] == 1


@pytest.mark.parametrize(
    "start,end,expected_delta",
    [
        (date(2025, 1, 10), None, settings.SEMESTER_WEEKS * 7 - 1),
        (None, date(2025, 2, 10), settings.SEMESTER_WEEKS * 7 - 1),
    ],
)
def test_normalize_date_range_partial_bounds(start, end, expected_delta):
    """Ensure _normalize_date_range fills missing bounds using semester weeks."""
    result = routers_grades._normalize_date_range(start, end)
    assert result is not None
    normalized_start, normalized_end = result
    assert (normalized_end - normalized_start).days == expected_delta


def test_get_student_grades_missing_student(client):
    """Fetching grades for an unknown student returns 404."""
    r = client.get("/api/v1/grades/student/99999")
    assert r.status_code == 404
    detail = r.json()["detail"]
    assert "Student" in detail and "not found" in detail


def test_get_student_grades_filtered_view(client):
    """Student-grade endpoint supports course filter and submitted date range."""
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Sam",
            "last_name": "Filter",
            "email": "sam.filter@example.com",
            "student_id": "SF100",
        },
    ).json()

    course_primary = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "FIL101",
            "course_name": "Filtering 101",
            "semester": "Fall 2025",
        },
    ).json()

    course_other = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "FIL102",
            "course_name": "Filtering 102",
            "semester": "Fall 2025",
        },
    ).json()

    anchor = date(2025, 2, 1)
    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            1,
            student_id=student["id"],
            course_id=course_primary["id"],
            date_assigned=anchor.isoformat(),
            date_submitted=(anchor + timedelta(days=2)).isoformat(),
            category="Project",
        ),
    )
    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            2,
            student_id=student["id"],
            course_id=course_other["id"],
            date_assigned=(anchor - timedelta(days=20)).isoformat(),
            date_submitted=(anchor - timedelta(days=18)).isoformat(),
        ),
    )

    start = anchor
    end = anchor + timedelta(days=3)
    r = client.get(
        f"/api/v1/grades/student/{student['id']}?course_id={course_primary['id']}&start_date={start.isoformat()}&end_date={end.isoformat()}&use_submitted=true"
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["course_id"] == course_primary["id"]
    assert body[0]["category"] == "Project"


def test_get_course_grades_with_submitted_range(client):
    """Course-grade endpoint respects submitted-based filtering."""
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Chris",
            "last_name": "Course",
            "email": "chris.course@example.com",
            "student_id": "CC200",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CRS200",
            "course_name": "Course Range",
            "semester": "Fall 2025",
        },
    ).json()

    base = date(2025, 3, 1)
    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            1,
            student_id=student["id"],
            course_id=course["id"],
            date_assigned=base.isoformat(),
            date_submitted=(base + timedelta(days=1)).isoformat(),
        ),
    )
    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            2,
            student_id=student["id"],
            course_id=course["id"],
            date_assigned=(base + timedelta(days=20)).isoformat(),
            date_submitted=(base + timedelta(days=30)).isoformat(),
        ),
    )

    r = client.get(
        f"/api/v1/grades/course/{course['id']}?start_date={(base + timedelta(days=29)).isoformat()}&end_date={(base + timedelta(days=31)).isoformat()}&use_submitted=true"
    )
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["assignment_name"] == "Assignment 2"


def test_get_all_grades_category_filter(client):
    """Category filter performs case-insensitive matching."""
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Casey",
            "last_name": "Category",
            "email": "casey@example.com",
            "student_id": "CAT100",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "CAT101",
            "course_name": "Category 101",
            "semester": "Fall 2025",
        },
    ).json()

    client.post(
        "/api/v1/grades/",
        json=make_grade_payload(
            1,
            student_id=student["id"],
            course_id=course["id"],
            category="Pop Quiz",
        ),
    )

    r = client.get("/api/v1/grades/?category=quiz")
    assert r.status_code == 200
    results = r.json()
    assert results["total"] == 1
    assert len(results["items"]) == 1
    assert results["items"][0]["category"] == "Pop Quiz"


def test_get_grade_success_and_not_found(client):
    """Fetch grade by id covers success and 404 paths."""
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Gary",
            "last_name": "Grade",
            "email": "gary.grade@example.com",
            "student_id": "G100",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "GRA100",
            "course_name": "Grading",
            "semester": "Fall 2025",
        },
    ).json()

    created = client.post(
        "/api/v1/grades/",
        json=make_grade_payload(1, student_id=student["id"], course_id=course["id"]),
    ).json()

    r_ok = client.get(f"/api/v1/grades/{created['id']}")
    assert r_ok.status_code == 200
    assert r_ok.json()["id"] == created["id"]

    r_missing = client.get("/api/v1/grades/99999")
    assert r_missing.status_code == 404
    missing_detail = r_missing.json()["detail"]
    assert "Grade" in missing_detail and "not found" in missing_detail


def test_update_grade_successful(client):
    """Successful grade update persists new values."""
    student = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Uma",
            "last_name": "Updater",
            "email": "uma.updater@example.com",
            "student_id": "UP100",
        },
    ).json()

    course = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "UPD101",
            "course_name": "Update 101",
            "semester": "Fall 2025",
        },
    ).json()

    grade = client.post(
        "/api/v1/grades/",
        json=make_grade_payload(1, student_id=student["id"], course_id=course["id"]),
    ).json()

    r_update = client.put(
        f"/api/v1/grades/{grade['id']}",
        json={"grade": 92.0, "max_grade": 95.0, "notes": "Improved after retake"},
    )
    assert r_update.status_code == 200
    payload = r_update.json()
    assert payload["grade"] == 92.0
    assert payload["max_grade"] == 95.0
    assert payload["category"] == grade["category"]
    assert payload["notes"] == "Improved after retake"
