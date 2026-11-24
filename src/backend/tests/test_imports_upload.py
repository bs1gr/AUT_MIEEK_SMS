import json

from fastapi.testclient import TestClient


def test_upload_courses_accepts_octet_stream(client: TestClient):
    # Minimal valid course payload
    payload = {
        "course_code": "TEST101",
        "course_name": "Test Course",
        "semester": "Α' Εξάμηνο",
        "credits": 3,
        "description": "Automated test import",
        "evaluation_rules": [],
        "hours_per_week": 1,
    }

    files = {
        # filename, content, content_type
        "files": (
            "test_course.json",
            json.dumps(payload).encode("utf-8"),
            "application/octet-stream",
        ),
    }
    data = {"import_type": "courses"}

    # Upload should succeed and create one course
    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("type") == "courses"
    assert body.get("created", 0) == 1
    assert body.get("updated", 0) == 0

    # Verify course is present via list endpoint
    resp2 = client.get("/api/v1/courses/?limit=1000")
    assert resp2.status_code == 200, resp2.text
    data2 = resp2.json()
    assert any(item.get("course_code") == "TEST101" for item in data2.get("items", []))


def test_upload_courses_accepts_application_json(client: TestClient):
    payload = {
        "course_code": "TEST102",
        "course_name": "Test Course 2",
        "semester": "Α' Εξάμηνο",
        "credits": 2,
        "description": "Automated test import JSON",
        "evaluation_rules": [{"category": "Final Exam", "weight": 100}],
        "hours_per_week": 2,
    }

    files = {
        "files": (
            "test_course2.json",
            json.dumps(payload).encode("utf-8"),
            "application/json",
        ),
    }
    data = {"import_type": "courses"}

    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("type") == "courses"
    assert body.get("created", 0) == 1
    assert body.get("updated", 0) == 0

    # Verify course presence and that evaluation rules normalized
    resp2 = client.get("/api/v1/courses/?limit=1000")
    assert resp2.status_code == 200
    data2 = resp2.json()
    found = next(
        (item for item in data2.get("items", []) if item.get("course_code") == "TEST102"),
        None,
    )
    assert found is not None
    # evaluation_rules should be a list of dicts with category/weight
    er = found.get("evaluation_rules")
    assert isinstance(er, list)
    assert any(isinstance(x, dict) and x.get("category") == "Final Exam" for x in er)


def test_upload_courses_preserves_evaluation_rules(client: TestClient):
    """Test that courses with multiple evaluation rules are preserved correctly."""
    payload = {
        "course_code": "TEST103",
        "course_name": "Test Course with Rules",
        "semester": "Α' Εξάμηνο",
        "credits": 3,
        "description": "Test course with multiple evaluation rules",
        "evaluation_rules": [
            {"category": "Class Participation", "weight": 10.0},
            {"category": "Continuous Assessment", "weight": 20.0},
            {"category": "Midterm Exam", "weight": 30.0},
            {"category": "Final Exam", "weight": 40.0},
        ],
        "hours_per_week": 3.0,
    }

    files = {
        "files": (
            "test_course3.json",
            json.dumps(payload).encode("utf-8"),
            "application/json",
        ),
    }
    data = {"import_type": "courses"}

    resp = client.post("/api/v1/imports/upload", files=files, data=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("created", 0) == 1

    # Verify course has all evaluation rules preserved
    resp2 = client.get("/api/v1/courses/")
    assert resp2.status_code == 200
    data2 = resp2.json()
    found = next(
        (item for item in data2.get("items", []) if item.get("course_code") == "TEST103"),
        None,
    )
    assert found is not None

    # Check that all 4 evaluation rules are present
    er = found.get("evaluation_rules", [])
    assert isinstance(er, list)
    assert len(er) == 4, f"Expected 4 rules, got {len(er)}: {er}"

    # Verify weights sum to 100
    total_weight = sum(rule.get("weight", 0) for rule in er)
    assert abs(total_weight - 100.0) < 0.01, f"Total weight should be 100, got {total_weight}"

    # Verify all expected categories are present (may be translated)
    categories = [rule.get("category") for rule in er]
    assert len(categories) == 4


def test_upload_courses_keeps_the_rule_names_and_every_rule(client: TestClient):
    """Plan todo 81 (the owner, 2026-11-23: keep names): a standard category is saved under the course
    editor's name, any other name as written, and two rules are never merged. Until then the lab
    templates' continuous rule lost its closing bracket and became plain "Continuous Assessment" (its
    midterm lost), and «Θεωρητική Εξέταση» and «Πρακτική Εξέταση» became one "Exam" of the last weight."""
    own = "Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι και Ενδιάμεση Εξέταση)"
    payload = {
        "course_code": "TEST104",
        "course_name": "Lab template",
        "semester": "Α' Εξάμηνο",
        "credits": 3,
        "evaluation_rules": [
            {"category": "Συμμετοχή στο Μάθημα", "weight": 10.0},
            {"category": own, "weight": 30.0},
            {"category": "Θεωρητική  Εξέταση", "weight": 30.0},
            {"category": "Πρακτική Εξέταση", "weight": 30.0},
        ],
        "hours_per_week": 3.0,
    }
    files = {"files": ("test_course4.json", json.dumps(payload).encode("utf-8"), "application/json")}

    resp = client.post("/api/v1/imports/upload", files=files, data={"import_type": "courses"})
    assert resp.status_code == 200, resp.text

    courses = client.get("/api/v1/courses/?limit=1000").json().get("items", [])
    found = next(c for c in courses if c.get("course_code") == "TEST104")
    assert [(r["category"], r["weight"]) for r in found["evaluation_rules"]] == [
        ("Class Participation", 10.0),
        (own, 30.0),
        ("Θεωρητική Εξέταση", 30.0),
        ("Πρακτική Εξέταση", 30.0),
    ]
