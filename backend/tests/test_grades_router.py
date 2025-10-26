from __future__ import annotations

from datetime import date, timedelta
from typing import Dict

import pytest


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
    student = client.post("/api/v1/students/", json={
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "student_id": "STD0001",
        "enrollment_date": date.today().isoformat(),
    }).json()
    
    # Setup: create course
    course = client.post("/api/v1/courses/", json={
        "course_code": "CS101",
        "course_name": "Intro to CS",
        "semester": "Fall 2025",
        "credits": 3,
    }).json()
    
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
    student = client.post("/api/v1/students/", json={
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@example.com",
        "student_id": "STD0002",
    }).json()
    
    course = client.post("/api/v1/courses/", json={
        "course_code": "MATH101",
        "course_name": "Calculus I",
        "semester": "Fall 2025",
    }).json()
    
    # Attempt to create grade with weight > 3.0
    payload = make_grade_payload(
        1,
        student_id=student["id"],
        course_id=course["id"],
        weight=3.5
    )
    r = client.post("/api/v1/grades/", json=payload)
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert any("weight" in str(err).lower() for err in detail)


def test_create_grade_submitted_before_assigned(client):
    """Test that date_submitted < date_assigned is rejected."""
    # Setup
    student = client.post("/api/v1/students/", json={
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice.j@example.com",
        "student_id": "STD0003",
    }).json()
    
    course = client.post("/api/v1/courses/", json={
        "course_code": "PHY101",
        "course_name": "Physics I",
        "semester": "Fall 2025",
    }).json()
    
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
    student = client.post("/api/v1/students/", json={
        "first_name": "Bob",
        "last_name": "Brown",
        "email": "bob.brown@example.com",
        "student_id": "STD0004",
    }).json()
    
    course = client.post("/api/v1/courses/", json={
        "course_code": "ENG101",
        "course_name": "English Lit",
        "semester": "Fall 2025",
    }).json()
    
    # lowercase category should normalize
    payload = make_grade_payload(
        1,
        student_id=student["id"],
        course_id=course["id"],
        category="homework"
    )
    r = client.post("/api/v1/grades/", json=payload)
    assert r.status_code == 201
    assert r.json()["category"] == "Homework"


def test_get_grades_by_student_and_course(client):
    """Test filtering grades by student_id and course_id."""
    # Setup
    s1 = client.post("/api/v1/students/", json={
        "first_name": "S1",
        "last_name": "Student",
        "email": "s1@example.com",
        "student_id": "S1",
    }).json()
    
    s2 = client.post("/api/v1/students/", json={
        "first_name": "S2",
        "last_name": "Student",
        "email": "s2@example.com",
        "student_id": "S2",
    }).json()
    
    c1 = client.post("/api/v1/courses/", json={
        "course_code": "C1",
        "course_name": "Course 1",
        "semester": "Fall 2025",
    }).json()
    
    c2 = client.post("/api/v1/courses/", json={
        "course_code": "C2",
        "course_name": "Course 2",
        "semester": "Fall 2025",
    }).json()
    
    # Create multiple grades
    client.post("/api/v1/grades/", json=make_grade_payload(1, student_id=s1["id"], course_id=c1["id"]))
    client.post("/api/v1/grades/", json=make_grade_payload(2, student_id=s1["id"], course_id=c2["id"]))
    client.post("/api/v1/grades/", json=make_grade_payload(3, student_id=s2["id"], course_id=c1["id"]))
    
    # Filter by student
    r_s1 = client.get(f"/api/v1/grades/?student_id={s1['id']}")
    assert r_s1.status_code == 200
    assert len(r_s1.json()) == 2
    
    # Filter by course
    r_c1 = client.get(f"/api/v1/grades/?course_id={c1['id']}")
    assert r_c1.status_code == 200
    assert len(r_c1.json()) == 2
    
    # Filter by both
    r_both = client.get(f"/api/v1/grades/?student_id={s1['id']}&course_id={c1['id']}")
    assert r_both.status_code == 200
    assert len(r_both.json()) == 1


def test_update_grade_validation(client):
    """Test that update also enforces validation (weight, dates)."""
    # Setup
    student = client.post("/api/v1/students/", json={
        "first_name": "Charlie",
        "last_name": "Davis",
        "email": "charlie.d@example.com",
        "student_id": "STD0005",
    }).json()
    
    course = client.post("/api/v1/courses/", json={
        "course_code": "CHEM101",
        "course_name": "Chemistry I",
        "semester": "Fall 2025",
    }).json()
    
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
    r_bad_dates = client.put(f"/api/v1/grades/{grade_id}", json={
        "date_assigned": today.isoformat(),
        "date_submitted": yesterday.isoformat(),
    })
    assert r_bad_dates.status_code == 422


def test_delete_grade(client):
    """Test deleting a grade."""
    # Setup
    student = client.post("/api/v1/students/", json={
        "first_name": "Dave",
        "last_name": "Evans",
        "email": "dave.e@example.com",
        "student_id": "STD0006",
    }).json()
    
    course = client.post("/api/v1/courses/", json={
        "course_code": "BIO101",
        "course_name": "Biology I",
        "semester": "Fall 2025",
    }).json()
    
    payload = make_grade_payload(1, student_id=student["id"], course_id=course["id"])
    r_create = client.post("/api/v1/grades/", json=payload)
    grade_id = r_create.json()["id"]
    
    # Delete
    r_del = client.delete(f"/api/v1/grades/{grade_id}")
    assert r_del.status_code == 204
    
    # Verify 404 after delete
    r_get = client.get(f"/api/v1/grades/{grade_id}")
    assert r_get.status_code == 404
