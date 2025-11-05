from __future__ import annotations

from datetime import date
from typing import Any, Dict, cast

import pytest


def _student_payload(idx: int) -> Dict[str, Any]:
    return {
        "first_name": f"Student{idx}",
        "last_name": f"Example{idx}",
        "email": f"student{idx}@example.com",
        "student_id": f"STD{idx:04d}",
        "enrollment_date": date.today().isoformat(),
    }


def _course_payload(idx: int) -> Dict[str, Any]:
    return {
        "course_code": f"COURSE{idx:03d}",
        "course_name": f"Course {idx}",
        "semester": "Fall 2025",
        "credits": 3,
    }


def _create_student(client, idx: int = 1) -> Dict[str, Any]:
    response = client.post("/api/v1/students/", json=_student_payload(idx))
    assert response.status_code == 201, response.text
    return cast(Dict[str, Any], response.json())


def _create_course(client, idx: int = 1) -> Dict[str, Any]:
    response = client.post("/api/v1/courses/", json=_course_payload(idx))
    assert response.status_code == 201, response.text
    return cast(Dict[str, Any], response.json())


def _create_daily_performance(client, student_id: int, course_id: int, **overrides) -> Dict[str, Any]:
    payload: Dict[str, object] = {
        "student_id": student_id,
        "course_id": course_id,
        "date": date.today().isoformat(),
        "category": "Participation",
        "score": 8.5,
        "max_score": 10.0,
        "notes": "Great effort",
    }
    payload.update(overrides)
    response = client.post("/api/v1/daily-performance/", json=payload)
    assert response.status_code == 200, response.text
    return cast(Dict[str, Any], response.json())


def test_create_daily_performance_success(client):
    student = _create_student(client, 1)
    course = _create_course(client, 1)

    created = _create_daily_performance(client, student["id"], course["id"], notes="Showing improvement")

    assert created["student_id"] == student["id"]
    assert created["course_id"] == course["id"]
    assert created["category"] == "Participation"
    assert created["score"] == pytest.approx(8.5)
    assert created["notes"] == "Showing improvement"


def test_get_student_daily_performance_returns_only_matching_records(client):
    primary_student = _create_student(client, 1)
    other_student = _create_student(client, 2)
    course = _create_course(client, 1)

    _create_daily_performance(client, primary_student["id"], course["id"], score=7.0)
    _create_daily_performance(client, other_student["id"], course["id"], score=6.0)

    response = client.get(f"/api/v1/daily-performance/student/{primary_student['id']}")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["student_id"] == primary_student["id"]
    assert items[0]["score"] == pytest.approx(7.0)


def test_get_student_course_daily_performance_filters_by_course(client):
    student = _create_student(client, 1)
    course_a = _create_course(client, 1)
    course_b = _create_course(client, 2)

    _create_daily_performance(client, student["id"], course_a["id"], category="Presentation")
    _create_daily_performance(client, student["id"], course_b["id"], category="Homework")

    response = client.get(
        f"/api/v1/daily-performance/student/{student['id']}/course/{course_a['id']}"
    )
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["course_id"] == course_a["id"]
    assert items[0]["category"] == "Presentation"


def test_get_course_daily_performance_by_date_requires_iso_format(client):
    course = _create_course(client, 1)
    response = client.get(f"/api/v1/daily-performance/date/not-a-date/course/{course['id']}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid date format. Use YYYY-MM-DD"


def test_get_course_daily_performance_by_date_filters_results(client):
    student = _create_student(client, 1)
    course = _create_course(client, 1)

    target_date = date(2025, 1, 15)
    _create_daily_performance(client, student["id"], course["id"], date=target_date.isoformat())
    _create_daily_performance(client, student["id"], course["id"], date=date(2025, 1, 16).isoformat())

    response = client.get(f"/api/v1/daily-performance/date/{target_date.isoformat()}/course/{course['id']}")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["date"] == target_date.isoformat()


def test_create_daily_performance_handles_internal_errors(client, monkeypatch):
    student = _create_student(client, 1)
    course = _create_course(client, 1)

    def _raise_import_error(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("backend.routers.routers_performance.import_names", _raise_import_error)

    response = client.post(
        "/api/v1/daily-performance/",
        json={
            "student_id": student["id"],
            "course_id": course["id"],
            "date": date.today().isoformat(),
            "category": "Participation",
            "score": 8.0,
        },
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error"


def test_get_student_daily_performance_handles_unexpected_errors(client, monkeypatch):
    def _raise_import_error(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("backend.routers.routers_performance.import_names", _raise_import_error)

    response = client.get("/api/v1/daily-performance/student/1")

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error"
