"""A final grade where no evaluation rule takes the grades (plan todo 77 point 3; the owner,
2026-11-23).

The owner: "The final grade should use the Weight too." And, asked that evening, both the
recommended answers: the course's absence penalty comes off it, as the guide says it comes off
every final grade ("Apply the penalty"), and an exam counts its latest grade only, with or without
rules ("Latest exam grade only": a retake replaces the first sitting).

Until then a course without rules had no final grade on the Grading page ("No evaluation rules
defined for this course") and was left off the Students page's results, while Analytics and the
grade sheets showed the plain mean of the grades: every grade once whatever its Weight, both
sittings of an exam, and no absence penalty. A student whose grades matched none of the course's
rules got 0 on the Grading page and that plain mean on Analytics.

Numbers checked by hand; every grade is out of 100.
"""

from __future__ import annotations

from datetime import date

import pytest

from backend.services.semester_archive_service import SemesterArchiveService
from backend.tests.test_analytics_categories import _student_categories
from backend.tests.test_analytics_router import _create_course, _create_dp
from backend.tests.test_grade_sheets import _attendance, _enroll, _grade, _sheet, _student


def _setup(client, code: str, i: int, rules=None, absence_penalty: float = 0.0) -> tuple[dict, dict]:
    course = _create_course(client, code, rules=rules, absence_penalty=absence_penalty)
    student = _student(client, i, "Μεσογείτη", "Ηρώ")
    _enroll(client, course["id"], student["id"])
    return course, student


def _final(client, course: dict, student: dict) -> dict:
    response = client.get(f"/api/v1/analytics/student/{student['id']}/course/{course['id']}/final-grade")
    assert response.status_code == 200, response.text
    return response.json()


def _on_every_page(client, course: dict, student: dict) -> dict:
    """The student's final grade in the course as each page shows it."""
    summary = client.get(f"/api/v1/analytics/student/{student['id']}/all-courses-summary")
    assert summary.status_code == 200, summary.text
    overview = client.get(f"/api/v1/analytics/student/{student['id']}/overview")
    assert overview.status_code == 200, overview.text
    code = course["course_code"]
    (matrix_row,) = _sheet(client, course["id"], "matrix")["rows"]
    (categories_row,) = _sheet(client, course["id"], "categories")["rows"]
    return {
        "grading": _final(client, course, student)["final_grade"],
        "students": next(c["final_grade"] for c in summary.json()["courses"] if c["course_code"] == code),
        "analytics": next(c["final_grade"] for c in overview.json()["courses"] if c["course_code"] == code),
        "matrix": matrix_row["final_grade"],
        "categories": categories_row["final_grade"],
    }


def test_without_rules_each_grade_counts_as_often_as_its_weight(client):
    # Lab 60 (weight 1), Lab 90 (weight 2), Quiz 70 (weight 0, which counts once):
    # (60 + 180 + 70) / 4 = 77.5. The plain mean was 73.33.
    course, student = _setup(client, "NR1", 401)
    _grade(client, student["id"], course["id"], "Lab A", "Lab Work", 60, max_grade=100, weight=1.0)
    _grade(client, student["id"], course["id"], "Lab B", "Lab Work", 90, max_grade=100, weight=2.0)
    _grade(client, student["id"], course["id"], "Quiz", "Quizzes", 70, max_grade=100, weight=0.0)

    final = _final(client, course, student)

    assert final["final_grade"] == 77.5
    assert (final["grade_basis"], final["total_weight_used"], final["category_breakdown"]) == ("average", 0, {})
    assert final["letter_grade"] == "C+"


@pytest.mark.parametrize(
    "first, second, expected",
    [
        # One exam under two spellings: the retake (80) replaces the first sitting (30):
        # (80 + 60) / 2. Every grade once was (30 + 80 + 60) / 3 = 56.67.
        ("Midterm Exam", "Ενδιάμεση Εξέταση", 70.0),
        ("Final Exam", "final exam", 70.0),
        # One midterm per course, whatever its grades are called (the owner, 2026-11-23: "The second
        # midterm is only if the student missed the first one").
        ("Midterm 1", "Midterm 2", 70.0),
    ],
)
def test_without_rules_an_exam_counts_its_latest_grade(client, first, second, expected):
    course, student = _setup(client, f"NR2{len(first)}{len(second)}", 402)
    _grade(client, student["id"], course["id"], "Sitting 1", first, 30, max_grade=100, day=date(2026, 1, 10))
    _grade(client, student["id"], course["id"], "Sitting 2", second, 80, max_grade=100, day=date(2026, 1, 20))
    _grade(client, student["id"], course["id"], "HW", "Homework", 60, max_grade=100, day=date(2026, 1, 5))

    assert _final(client, course, student)["final_grade"] == expected


def test_an_undated_sitting_counts_as_the_oldest(client):
    # The undated 95 was entered last, but the dated 50 is the one that counts: (50 + 70) / 2.
    course, student = _setup(client, "NR3", 403)
    _grade(client, student["id"], course["id"], "Final", "Final Exam", 50, max_grade=100, day=date(2026, 2, 1))
    _grade(client, student["id"], course["id"], "Final (no date)", "Final Exam", 95, max_grade=100, dated=False)
    _grade(client, student["id"], course["id"], "HW", "Homework", 70, max_grade=100)

    assert _final(client, course, student)["final_grade"] == 60.0


def test_without_rules_the_absence_penalty_comes_off_the_mean(client):
    # Homework 80; Absent twice (Present, Late and Excused are not penalised), 5 points each: 70.
    course, student = _setup(client, "NR4", 404, absence_penalty=5.0)
    _grade(client, student["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Absent", "Present", "Absent", "Late", "Excused")

    final = _final(client, course, student)

    assert (final["final_grade"], final["absence_deduction"], final["unexcused_absences"]) == (70.0, 10.0, 2)
    assert final["grade_basis"] == "average"
    (row,) = _sheet(client, course["id"], "matrix")["rows"]
    assert (row["final_grade"], row["absence_deduction"]) == (70.0, 10.0)


def test_a_penalty_larger_than_the_mean_stops_at_zero(client):
    # Homework 30, three absences at 20 points: the grade is 0, and the sheet shows the 30 it lost.
    course, student = _setup(client, "NR5", 405, absence_penalty=20.0)
    _grade(client, student["id"], course["id"], "HW", "Homework", 30, max_grade=100)
    _attendance(client, student["id"], course["id"], "Absent", "Absent", "Absent")

    assert _final(client, course, student)["final_grade"] == 0.0
    (row,) = _sheet(client, course["id"], "matrix")["rows"]
    assert (row["final_grade"], row["absence_deduction"]) == (0.0, 30.0)


def test_rules_that_take_none_of_the_grades_give_their_mean(client):
    # Rules Final Exam 100, but only quizzes so far: 50 (weight 1) and 100 (weight 3) make
    # (50 + 300) / 4 = 87.5, less one absence at 2.5 = 85. The Grading page said 0.
    rules = [{"category": "Final Exam", "weight": 100.0}]
    course, student = _setup(client, "NR6", 406, rules=rules, absence_penalty=2.5)
    _grade(client, student["id"], course["id"], "Quiz 1", "Quizzes", 50, max_grade=100, weight=1.0)
    _grade(client, student["id"], course["id"], "Quiz 2", "Quizzes", 100, max_grade=100, weight=3.0)
    _attendance(client, student["id"], course["id"], "Absent")

    final = _final(client, course, student)

    assert (final["final_grade"], final["grade_basis"]) == (85.0, "average")


def test_rules_that_take_a_grade_leave_the_others_out(client):
    # Rules Homework 100; Homework 60 and a Quiz 100 no rule takes: the rules decide, 60.
    rules = [{"category": "Homework", "weight": 100.0}]
    course, student = _setup(client, "NR7", 407, rules=rules)
    _grade(client, student["id"], course["id"], "HW", "Homework", 60, max_grade=100)
    _grade(client, student["id"], course["id"], "Quiz", "Quizzes", 100, max_grade=100)

    final = _final(client, course, student)

    assert (final["final_grade"], final["grade_basis"]) == (60.0, "rules")


def test_one_final_grade_on_every_page(client):
    # No rules: Final Exam 40 then its retake 90, Lab 60 (weight 2), Quiz 75; one absence at 3.
    # (90 + 120 + 75) / 4 = 71.25, less 3 = 68.25. Analytics and the grade sheets showed the plain
    # mean (40 + 90 + 60 + 75) / 4 = 66.25; the Grading page had none, the Students page left it out.
    course, student = _setup(client, "NR8", 408, absence_penalty=3.0)
    _grade(client, student["id"], course["id"], "Final", "Final Exam", 40, max_grade=100, day=date(2026, 1, 10))
    _grade(client, student["id"], course["id"], "Retake", "Final Exam", 90, max_grade=100, day=date(2026, 2, 10))
    _grade(client, student["id"], course["id"], "Lab", "Lab Work", 60, max_grade=100, weight=2.0)
    _grade(client, student["id"], course["id"], "Quiz", "Quizzes", 75, max_grade=100)
    _attendance(client, student["id"], course["id"], "Absent", "Present")

    assert set(_on_every_page(client, course, student).values()) == {68.25}


def test_the_category_figures_count_an_exams_latest_sitting(client):
    # No rules: Final Exam 40 then 90, Lab 70. The grade sheet's Final Exam column and the
    # Analytics category show the 90 that counts, not 65.
    course, student = _setup(client, "NR9", 409)
    _grade(client, student["id"], course["id"], "Final", "Final Exam", 40, max_grade=100, day=date(2026, 1, 10))
    _grade(client, student["id"], course["id"], "Retake", "Final Exam", 90, max_grade=100, day=date(2026, 2, 10))
    _grade(client, student["id"], course["id"], "Lab", "Lab Work", 70, max_grade=100)

    sheet = _sheet(client, course["id"], "categories")
    (row,) = sheet["rows"]
    assert [c["category_key"] for c in sheet["columns"]] == ["final", "lab"]
    assert (row["cells"], row["final_grade"]) == ([90.0, 70.0], 80.0)
    found = _student_categories(client, student["id"])
    assert {key: entry["average"] for key, entry in found.items()} == {"final": 90.0, "lab": 70.0}


def test_without_rules_or_grades_there_is_still_no_final_grade(client):
    course, student = _setup(client, "NR10", 410)
    _attendance(client, student["id"], course["id"], "Present", "Absent")

    assert "error" in _final(client, course, student)
    summary = client.get(f"/api/v1/analytics/student/{student['id']}/all-courses-summary").json()
    assert summary["courses"] == []


def test_the_semester_archive_still_needs_the_rules(client, db):
    # The archive records a final grade only from rules that cover the whole course: a course
    # without rules, or a student whose grades no rule takes, is left out as before.
    without, student = _setup(client, "NR11", 411)
    _grade(client, student["id"], without["id"], "HW", "Homework", 90, max_grade=100)
    outside = _create_course(client, "NR12", rules=[{"category": "Final Exam", "weight": 100.0}])
    _enroll(client, outside["id"], student["id"])
    _grade(client, student["id"], outside["id"], "Quiz", "Quizzes", 90, max_grade=100)

    preview = SemesterArchiveService(db).preview(without["semester"])

    reasons = {pair["course_code"]: pair["reason"] for pair in preview["excluded"]}
    assert reasons == {"NR11": "no_evaluation_rules", "NR12": "incomplete_grading"}
    assert preview["eligible"] == []

@pytest.mark.parametrize("other", ["attendance rule", "participation forfeited", "participation rated"])
def test_grades_no_rule_takes_count_by_their_mean_whatever_else_a_rule_counts(client, other):
    # The owner: "a student whose grades match no rule" gets their mean. A rule that counts
    # something else (the attendance records, a forfeited Class Participation share, a rating)
    # does not make the grade: Homework 90, no rule takes it, so 90. Until the review it was 100
    # (the attendance alone), 0 (a forfeited share) or 50 (one rating of 5/10).
    first = {
        "attendance rule": "Attendance",
        "participation forfeited": "Class Participation",
        "participation rated": "Class Participation",
    }[other]
    rules = [{"category": first, "weight": 10.0}, {"category": "Final Exam", "weight": 90.0}]
    course, student = _setup(client, f"NR13{len(other)}", 413, rules=rules)
    _grade(client, student["id"], course["id"], "HW", "Homework", 90, max_grade=100)
    if other == "attendance rule":
        _attendance(client, student["id"], course["id"], "Present")
    elif other == "participation forfeited":
        # 42 periods in the semester: more than 4 absences lose Class Participation.
        _attendance(client, student["id"], course["id"], *["Absent"] * 5)
    else:
        assert _create_dp(client, student["id"], course["id"], "Class Participation", 5, 10).status_code == 200
        # And a "No participation" tick, which a participation rule would take off its share.
        assert _create_dp(client, student["id"], course["id"], "No participation", 0, 10).status_code == 200

    final = _final(client, course, student)

    assert (final["final_grade"], final["grade_basis"]) == (90.0, "average")
    assert (final["total_weight_used"], final["category_breakdown"], final["participation_deduction"]) == (0, {}, 0)
    # No share was lost from a grade that has none (the Grading page's banner reads this).
    assert final["participation_forfeited"] is False


def test_without_rules_absences_lose_no_participation_share(client):
    # Over the Class Participation absence limit in a course without rules: there is no share to
    # lose, and the Grading page must not say there is.
    course, student = _setup(client, "NR14", 414)
    _grade(client, student["id"], course["id"], "HW", "Homework", 90, max_grade=100)
    _attendance(client, student["id"], course["id"], *["Absent"] * 5)

    final = _final(client, course, student)

    assert (final["final_grade"], final["participation_forfeited"]) == (90.0, False)


def test_the_category_sheet_without_rules_lists_only_the_sitting_that_counts(client):
    # "Midterm 1" 30 (10 Jan), its retake "Midterm 2" 80 (20 Jan), homework 60: one midterm per
    # course, so the sheet shows the 80 and not the 30, as the final grade (70) counts them.
    course, student = _setup(client, "NR15", 415)
    _grade(client, student["id"], course["id"], "M1", "Midterm 1", 30, max_grade=100, day=date(2026, 1, 10))
    _grade(client, student["id"], course["id"], "M2", "Midterm 2", 80, max_grade=100, day=date(2026, 1, 20))
    _grade(client, student["id"], course["id"], "HW", "Homework", 60, max_grade=100, day=date(2026, 1, 5))

    sheet = _sheet(client, course["id"], "categories")
    (row,) = sheet["rows"]

    assert [c["category"] for c in sheet["columns"]] == ["Homework", "Midterm 2"]
    assert (row["cells"], row["final_grade"]) == ([60.0, 80.0], 70.0)

def test_without_rules_an_exam_counts_once_whatever_weight_it_was_given(client):
    # The Grading page closes an exam's Weight box (it counts one grade); an import may still store
    # a weight. Midterm 50 at weight 3 and homework 90: (50 + 90) / 2 = 70, not 60.
    course, student = _setup(client, "NR16", 416)
    _grade(client, student["id"], course["id"], "M", "Midterm Exam", 50, max_grade=100, weight=3.0)
    _grade(client, student["id"], course["id"], "HW", "Homework", 90, max_grade=100)

    assert _final(client, course, student)["final_grade"] == 70.0
