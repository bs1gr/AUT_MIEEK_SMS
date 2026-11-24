"""Plan todo 83: a course's figure is its final grade once the Final Exam is graded, else the average.

The owner, 2026-11-24: "should show averages if not exams grades published yet. otherwise, the real
grades should populate", then, asked which exam decides: the Final Exam. The figures labelled
"Average" on the Students page and the Student Profile took the plain mean of every grade, so a
course whose final grade was settled showed another figure there. The server says, for each course,
whether its final grade is ready (`final_grade_ready`): the student's Final Exam is graded, or the
course's rules name no Final Exam (nothing to wait for); a course without rules waits for a Final
Exam grade.
"""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace as N

import pytest

from backend.services.analytics_service import AnalyticsService
from backend.tests.test_analytics_router import _create_course, _post_with_csrf
from backend.tests.test_grade_sheets import _enroll, _student

RULES = [{"category": "Homework", "weight": 40}, {"category": "Final Exam", "weight": 60}]


def _g(i, category, score=15.0):
    return N(id=i, category=category, grade=score, max_grade=20.0, date_submitted=date(2026, 1, 20), is_retake=False)


@pytest.mark.parametrize(
    ("rules", "grades", "ready"),
    [
        (RULES, [_g(1, "Homework")], False),  # the final is still to come
        (RULES, [_g(1, "Homework"), _g(2, "Midterm Exam")], False),  # a midterm alone does not do
        (RULES, [_g(1, "Homework"), _g(2, "Final Exam")], True),
        (RULES, [_g(1, "Τελική Εξέταση")], True),  # any spelling of the final
        (RULES, [_g(1, "Τελική Εργασία")], False),  # homework, not the final exam (todo 77 point 2)
        ([{"category": "Continuous Assessment", "weight": 60}, {"category": "Project", "weight": 40}], [], True),
        ([{"category": "Ενδιάμεση Εξέταση", "weight": 50}, {"category": "Εργαστήριο", "weight": 50}], [], True),
        ([], [_g(1, "Homework")], False),  # no rules: waits for a Final Exam grade
        ([], [_g(1, "Homework"), _g(2, "Final")], True),
        (None, [], False),
    ],
)
def test_the_final_grade_is_ready_once_the_final_exam_is_graded(rules, grades, ready):
    assert AnalyticsService.final_grade_ready(N(evaluation_rules=rules), grades) is ready


def _grade(client, sid, cid, category, score):
    response = _post_with_csrf(
        client,
        "/api/v1/grades/",
        {
            "student_id": sid,
            "course_id": cid,
            "assignment_name": category,
            "category": category,
            "grade": score,
            "max_grade": 20,
            "date_submitted": "2026-01-20",
        },  # fmt: skip
    )
    assert response.status_code == 201, response.text


def test_the_final_grade_and_the_courses_summary_say_it(client):
    waiting = _create_course(client, "FGR1", rules=RULES)
    graded = _create_course(client, "FGR2", rules=RULES)
    s = _student(client, 871, "Αντωνίου", "Λία")
    _enroll(client, waiting["id"], s["id"])
    _enroll(client, graded["id"], s["id"])
    for course in (waiting, graded):
        _grade(client, s["id"], course["id"], "Homework", 18)
    _grade(client, s["id"], graded["id"], "Final Exam", 12)

    def final(course):
        response = client.get(f"/api/v1/analytics/student/{s['id']}/course/{course['id']}/final-grade")
        assert response.status_code == 200, response.text
        return response.json()["final_grade_ready"]

    assert (final(waiting), final(graded)) == (False, True)
    summary = client.get(f"/api/v1/analytics/student/{s['id']}/all-courses-summary")
    assert summary.status_code == 200, summary.text
    rows = {c["course_code"]: c for c in summary.json()["courses"]}
    assert (rows["FGR1"]["course_id"], rows["FGR1"]["final_grade_ready"]) == (waiting["id"], False)
    assert (rows["FGR2"]["course_id"], rows["FGR2"]["final_grade_ready"]) == (graded["id"], True)
