from __future__ import annotations

from typing import Any, Dict, List

from backend.routers.routers_courses import _normalize_evaluation_rules


def make_course_payload(i: int = 1, **overrides) -> Dict:
    """Helper to create course payloads with sequential defaults."""
    base = {
        "course_code": f"CS{100 + i}",
        "course_name": f"Course {i}",
        "semester": "Fall 2025",
        "credits": 3,
        "description": f"Description for course {i}",
        "hours_per_week": 3.0,
        "absence_penalty": 0.0,
    }
    base.update(overrides)
    return base


def test_create_course_success(client):
    """Test successful course creation."""
    payload = make_course_payload(1)
    r = client.post("/api/v1/courses/", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["id"] > 0
    assert data["course_code"] == "CS101"
    assert data["course_name"] == "Course 1"
    assert data["credits"] == 3


def test_create_course_allows_empty_optional_strings(client):
    # Optional string/number fields sent as empty strings should be normalized
    payload = make_course_payload(
        2, description="", evaluation_rules="", absence_penalty="", hours_per_week="", teaching_schedule=""
    )
    r = client.post("/api/v1/courses/", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["description"] is None
    assert data["evaluation_rules"] is None
    assert data["absence_penalty"] is None or data["absence_penalty"] == 0.0
    assert data["hours_per_week"] is None or data["hours_per_week"] == 3.0
    assert data["teaching_schedule"] is None


def test_create_course_duplicate_code(client):
    """Test that duplicate course codes are rejected."""
    payload = make_course_payload(1)
    r1 = client.post("/api/v1/courses/", json=payload)
    assert r1.status_code == 201

    r2 = client.post("/api/v1/courses/", json=payload)
    assert r2.status_code == 400
    detail_payload = r2.json().get("detail")
    if isinstance(detail_payload, dict):
        detail_text = detail_payload.get("message", "")
    else:
        detail_text = detail_payload or ""
    assert "already exists" in detail_text.lower()


def test_update_course_basic_fields(client):
    """Test updating basic course fields."""
    # Create
    payload = make_course_payload(1)
    r_create = client.post("/api/v1/courses/", json=payload)
    course = r_create.json()

    # Update
    update_data = {
        "course_name": "Updated Course Name",
        "credits": 4,
        "description": "Updated description",
        "hours_per_week": 4.5,
        "absence_penalty": 5.0,
    }
    r_update = client.put(f"/api/v1/courses/{course['id']}", json=update_data)
    assert r_update.status_code == 200

    updated = r_update.json()
    assert updated["course_name"] == "Updated Course Name"
    assert updated["credits"] == 4
    assert updated["description"] == "Updated description"
    assert updated["hours_per_week"] == 4.5
    assert updated["absence_penalty"] == 5.0
    # Course code should remain unchanged
    assert updated["course_code"] == "CS101"


def test_update_course_preserves_unset_fields(client):
    """Test that updating one field doesn't clear other fields."""
    # Create with all fields
    payload = make_course_payload(
        1,
        description="Original description",
        hours_per_week=3.5,
        absence_penalty=2.5,
    )
    r_create = client.post("/api/v1/courses/", json=payload)
    course = r_create.json()

    # Update only course name
    r_update = client.put(f"/api/v1/courses/{course['id']}", json={"course_name": "New Name Only"})
    assert r_update.status_code == 200

    updated = r_update.json()
    assert updated["course_name"] == "New Name Only"
    # Other fields should be preserved
    assert updated["description"] == "Original description"
    assert updated["hours_per_week"] == 3.5
    assert updated["absence_penalty"] == 2.5


def test_update_course_evaluation_rules_validation(client):
    """Test that evaluation rules weights must sum to 100%."""
    # Create
    payload = make_course_payload(1)
    r_create = client.post("/api/v1/courses/", json=payload)
    course = r_create.json()

    # Try to update with invalid weights (sum != 100)
    bad_rules = [
        {"category": "Homework", "weight": 30},
        {"category": "Exams", "weight": 40},
        # Total: 70%, not 100%
    ]
    r_bad = client.put(f"/api/v1/courses/{course['id']}", json={"evaluation_rules": bad_rules})
    assert r_bad.status_code == 400
    bad_detail = r_bad.json().get("detail")
    if isinstance(bad_detail, dict):
        bad_detail_text = bad_detail.get("message", "")
    else:
        bad_detail_text = bad_detail or ""
    assert "100" in bad_detail_text

    # Valid weights (sum = 100)
    good_rules = [
        {"category": "Homework", "weight": 30},
        {"category": "Exams", "weight": 70},
    ]
    r_good = client.put(f"/api/v1/courses/{course['id']}", json={"evaluation_rules": good_rules})
    assert r_good.status_code == 200


def test_get_course_by_id(client):
    """Test retrieving a specific course."""
    payload = make_course_payload(1)
    r_create = client.post("/api/v1/courses/", json=payload)
    course_id = r_create.json()["id"]

    r_get = client.get(f"/api/v1/courses/{course_id}")
    assert r_get.status_code == 200
    assert r_get.json()["id"] == course_id


def test_get_course_404(client):
    """Test 404 for non-existent course."""
    r = client.get("/api/v1/courses/9999")
    assert r.status_code == 404


def test_list_courses_with_semester_filter(client):
    """Test filtering courses by semester."""
    # Create courses in different semesters
    client.post("/api/v1/courses/", json=make_course_payload(1, semester="Fall 2025"))
    client.post("/api/v1/courses/", json=make_course_payload(2, semester="Spring 2026"))
    client.post("/api/v1/courses/", json=make_course_payload(3, semester="Fall 2025"))

    # Filter by semester
    r_fall = client.get("/api/v1/courses/?semester=Fall 2025")
    assert r_fall.status_code == 200
    fall_data = r_fall.json()
    assert fall_data["total"] == 2
    assert len(fall_data["items"]) == 2

    r_spring = client.get("/api/v1/courses/?semester=Spring 2026")
    assert r_spring.status_code == 200
    spring_data = r_spring.json()
    assert spring_data["total"] == 1
    assert len(spring_data["items"]) == 1


def test_delete_course(client):
    """Test deleting a course."""
    payload = make_course_payload(1)
    r_create = client.post("/api/v1/courses/", json=payload)
    course_id = r_create.json()["id"]

    r_del = client.delete(f"/api/v1/courses/{course_id}")
    assert r_del.status_code == 204

    # Verify 404 after delete
    r_get = client.get(f"/api/v1/courses/{course_id}")
    assert r_get.status_code == 404


def test_evaluation_rules_endpoints(client):
    course = client.post("/api/v1/courses/", json=make_course_payload(10)).json()

    r_get_missing = client.get("/api/v1/courses/9999/evaluation-rules")
    assert r_get_missing.status_code == 404

    update_payload = {"evaluation_rules": ["Homework", "40", "Exams", "60%"]}
    r_update = client.put(f"/api/v1/courses/{course['id']}/evaluation-rules", json=update_payload)
    assert r_update.status_code == 200
    normalized: List[Dict[str, Any]] = r_update.json()["evaluation_rules"]
    assert normalized == [
        {"category": "Homework", "weight": 40.0},
        {"category": "Exams", "weight": 60.0},
    ]

    r_update_missing = client.put("/api/v1/courses/9999/evaluation-rules", json=update_payload)
    assert r_update_missing.status_code == 404


def test_normalize_evaluation_rules_variants():
    assert _normalize_evaluation_rules(None) is None
    assert _normalize_evaluation_rules([]) == []

    dict_rules = [{"category": "Midterm", "weight": 50}, {"category": "Final", "weight": 50}]
    assert _normalize_evaluation_rules(dict_rules) == dict_rules

    list_rules = ["Quiz", "20", "Project", 80]
    assert _normalize_evaluation_rules(list_rules) == [
        {"category": "Quiz", "weight": 20.0},
        {"category": "Project", "weight": 80.0},
    ]

    string_rules = ["Lab: 30%"]
    assert _normalize_evaluation_rules(string_rules) == [
        {"category": "Lab", "weight": 30.0},
    ]

    fallback_strings = ["Unparsed entry", "Still unparsed"]
    assert _normalize_evaluation_rules(fallback_strings) == [
        {"category": "Unparsed entry", "weight": 0.0},
    ]

    wrapped = {"category": "Participation", "weight": 10}
    assert _normalize_evaluation_rules(wrapped) == [wrapped]

    garbage = [object(), {"not": "valid"}]
    assert _normalize_evaluation_rules(garbage) == []
