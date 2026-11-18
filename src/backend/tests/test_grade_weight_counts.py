"""The Weight of a grade counts in the average of its category.

Grades > Grade Entry has a Weight box ("Weight (multiplier)"), and Grade History shows what
was typed ("×2"). Until November 2026 the number was stored and never read: the final grade
took the plain average of a category's grades. Found on
18 November 2026 while the help was read against the pages (20/20 with weight 1 and 0/20 with
weight 3 gave 50%), and the owner's decision the same day: "make it count".

What counts how:

- a grade counts as many times as its weight says, within its category;
- a grade without a weight, or with 0, counts once (the pages show such a grade as "×1");
- Midterm Exam and Final Exam take the latest grade only, so a weight changes nothing there;
- a day's rating from Attendance counts like one more grade, with the multiplier of the
  category's rule (1 unless set), beside the weighted grades.
"""

from typing import Any, Dict, List, Optional

import pytest

from backend.services.analytics_service import AnalyticsService

_counter = {"n": 0}


def _post(client, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    response = client.post(url, json=payload)
    assert response.status_code in (200, 201), response.text
    return response.json()


def _course_and_student(client, rules: List[Dict[str, Any]]) -> tuple[int, int]:
    _counter["n"] += 1
    n = _counter["n"]
    course = _post(
        client,
        "/api/v1/courses/",
        {
            "course_code": f"WGT{n:03d}",
            "course_name": "Weights",
            "semester": "Α' Εξάμηνο",
            "credits": 3,
            "evaluation_rules": rules,
        },
    )
    student = _post(
        client,
        "/api/v1/students/",
        {"student_id": f"WGTS{n:03d}", "first_name": "Weight", "last_name": f"Student{n}", "email": f"wgt{n}@example.com"},
    )
    enrolled = client.post(f"/api/v1/enrollments/course/{course['id']}", json={"student_ids": [student["id"]]})
    assert enrolled.status_code == 200, enrolled.text
    return course["id"], student["id"]


def _grade(
    client,
    course_id: int,
    student_id: int,
    grade: float,
    weight: Optional[float] = None,
    category: str = "Homework",
    day: str = "2026-10-01",
) -> None:
    payload: Dict[str, Any] = {
        "student_id": student_id,
        "course_id": course_id,
        "assignment_name": f"{category} of {day}",
        "category": category,
        "grade": grade,
        "max_grade": 20,
        "date_assigned": day,
        "date_submitted": day,
    }
    if weight is not None:
        payload["weight"] = weight
    _post(client, "/api/v1/grades/", payload)


def _final(client, course_id: int, student_id: int) -> Dict[str, Any]:
    response = client.get(f"/api/v1/analytics/student/{student_id}/course/{course_id}/final-grade")
    assert response.status_code == 200, response.text
    return response.json()


HOMEWORK_ONLY = [{"category": "Homework", "weight": 100}]


def test_a_grade_with_weight_three_counts_like_three(client):
    course, student = _course_and_student(client, HOMEWORK_ONLY)
    _grade(client, course, student, 20, weight=1)
    _grade(client, course, student, 0, weight=3, day="2026-10-08")

    data = _final(client, course, student)

    # (100 x 1 + 0 x 3) / 4. It was 50, the plain average.
    assert data["category_breakdown"]["Homework"]["average"] == pytest.approx(25.0)
    assert data["final_grade"] == 25.0
    # Two grades, whatever they weigh.
    assert data["category_breakdown"]["Homework"]["total_items"] == 2


def test_equal_weights_give_the_plain_average(client):
    course, student = _course_and_student(client, HOMEWORK_ONLY)
    for grade, day in ((20, "2026-10-01"), (10, "2026-10-08"), (0, "2026-10-15")):
        _grade(client, course, student, grade, weight=2.5, day=day)

    assert _final(client, course, student)["final_grade"] == 50.0


@pytest.mark.parametrize("weight", [None, 0])
def test_a_grade_without_a_weight_or_with_zero_counts_once(client, weight):
    course, student = _course_and_student(client, HOMEWORK_ONLY)
    _grade(client, course, student, 20, weight=weight)
    _grade(client, course, student, 0, weight=1, day="2026-10-08")

    data = _final(client, course, student)

    assert data["final_grade"] == 50.0
    assert data["category_breakdown"]["Homework"]["total_items"] == 2


def test_a_fraction_is_a_weight_too(client):
    course, student = _course_and_student(client, HOMEWORK_ONLY)
    _grade(client, course, student, 20, weight=0.5)
    _grade(client, course, student, 10, weight=1.5, day="2026-10-08")

    # (100 x 0.5 + 50 x 1.5) / 2
    assert _final(client, course, student)["final_grade"] == 62.5


def test_an_exam_takes_the_latest_grade_whatever_the_weights(client):
    course, student = _course_and_student(client, [{"category": "Final Exam", "weight": 100}])
    _grade(client, course, student, 10, weight=3, category="Final Exam", day="2026-10-01")
    _grade(client, course, student, 20, weight=1, category="Final Exam", day="2026-10-20")

    data = _final(client, course, student)

    assert data["final_grade"] == 100.0
    assert data["category_breakdown"]["Final Exam"]["total_items"] == 1


def test_a_days_rating_counts_beside_the_weighted_grades(client):
    course, student = _course_and_student(client, HOMEWORK_ONLY)
    _grade(client, course, student, 20, weight=2)
    _post(
        client,
        "/api/v1/daily-performance/",
        {"student_id": student, "course_id": course, "date": "2026-10-02", "category": "Homework", "score": 4, "max_score": 10},
    )

    data = _final(client, course, student)

    # (100 x 2 + 40 x 1) / 3
    assert data["final_grade"] == 80.0
    assert data["category_breakdown"]["Homework"]["total_items"] == 2


def test_the_weight_stays_inside_its_category(client):
    course, student = _course_and_student(
        client, [{"category": "Homework", "weight": 40}, {"category": "Final Exam", "weight": 60}]
    )
    _grade(client, course, student, 20, weight=3)
    _grade(client, course, student, 0, weight=1, day="2026-10-08")
    _grade(client, course, student, 10, weight=3, category="Final Exam", day="2026-10-20")

    data = _final(client, course, student)

    # Homework 75% of 40, Final Exam 50% of 60: a heavy homework does not weigh on the exam.
    assert data["category_breakdown"]["Homework"]["average"] == pytest.approx(75.0)
    assert data["category_breakdown"]["Homework"]["contribution"] == pytest.approx(30.0)
    assert data["category_breakdown"]["Final Exam"]["contribution"] == pytest.approx(30.0)
    assert data["final_grade"] == 60.0


def test_a_changed_weight_changes_the_final_grade_at_once(client):
    course, student = _course_and_student(client, HOMEWORK_ONLY)
    _grade(client, course, student, 20, weight=1)
    _grade(client, course, student, 0, weight=1, day="2026-10-08")
    assert _final(client, course, student)["final_grade"] == 50.0
    listed = client.get("/api/v1/grades/", params={"student_id": student, "course_id": course}).json()
    best = next(g for g in listed.get("items", listed) if g["grade"] == 20)

    changed = client.put(f"/api/v1/grades/{best['id']}", json={"weight": 3})

    assert changed.status_code == 200, changed.text
    assert _final(client, course, student)["final_grade"] == 75.0


class _Grade:
    def __init__(self, weight: Any):
        self.weight = weight


@pytest.mark.parametrize(
    ("stored", "counts"),
    [(1.0, 1.0), (2.5, 2.5), (3, 3.0), (0.5, 0.5), (None, 1.0), (0, 1.0), (0.0, 1.0), (-2, 1.0), ("abc", 1.0), ("2", 2.0)],
)
def test_what_a_stored_weight_counts_as(stored, counts):
    # A session file or an older database can hold anything in the column.
    assert AnalyticsService.grade_weight(_Grade(stored)) == counts


def test_a_grade_object_without_the_field_counts_once():
    assert AnalyticsService.grade_weight(object()) == 1.0
