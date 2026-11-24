"""The final grade matches a course's rule names to its grades without accents, case or plural,
and a lab is not homework (plan todo 77, point 2; the owner, 2026-11-23).

The owner: a rule named "Εργαστήρια" or "Εργαστηριακή Εργασία" "is wrongly matched as homework by
the final grade. The lab always happens in class, the matching should be reordered or corrected
properly." And, asked that day: compare Greek names without accents; a rule typed "Παρουσία" or
"Παρουσίες" is the Attendance rule; an Attendance rule under any spelling counts the attendance
records; Midterm and Final under any spelling take the latest grade.

Until then the matching took the first stem it found in a fixed order: "εργασ" (homework) came
before "εργαστηρ" (lab), "παρουσ" (attendance) caught "Παρουσίαση" (a presentation), the
Attendance rule had to be spelled exactly "attendance" or "παρουσία", an exam exactly one of
eight spellings, and accents counted ("Θεωρητική Εξέταση" was not "ΘΕΩΡΗΤΙΚΗ ΕΞΕΤΑΣΗ").
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

from backend.services.analytics_service import normalize_rule_category
from backend.tests.test_analytics_router import _create_course
from backend.tests.test_grade_sheets import _attendance, _enroll, _grade, _sheet, _student


@pytest.mark.parametrize(
    "name, key",
    [
        # A lab is a lab, whatever else the name says.
        ("Εργαστήρια", "lab"),
        ("Εργαστηριακή Εργασία", "lab"),
        ("ΕΡΓΑΣΤΗΡΙΑΚΕΣ ΕΡΓΑΣΙΕΣ", "lab"),
        ("Εργασία Εργαστηρίου", "lab"),
        ("Lab Work", "lab"),
        # A presentation is not attendance, though the words share a stem.
        ("Παρουσίαση", "presentation"),
        ("Παρουσιάσεις", "presentation"),
        ("Presentation", "presentation"),
        # Attendance under any spelling.
        ("Παρουσία", "attendance"),
        ("Παρουσίες", "attendance"),
        ("ΠΑΡΟΥΣΙΑ", "attendance"),
        ("Attendance", "attendance"),
        # Exams under any spelling.
        ("Τελική Εξέταση", "final"),
        ("ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ", "final"),
        ("Τελικές Εξετάσεις", "final"),
        ("Final Exam", "final"),
        ("Ενδιάμεση Εξέταση", "midterm"),
        ("ΕΝΔΙΑΜΕΣΗ", "midterm"),
        ("Ενδιάμεσες εξετάσεις", "midterm"),
        ("Midterm", "midterm"),
        # Accents no longer count: «Ασκήσεις» is homework, as «Άσκηση» and «ΑΣΚΗΣΕΙΣ» already were.
        ("Ασκήσεις", "homework"),
        ("ΑΣΚΗΣΕΙΣ", "homework"),
        ("Άσκηση", "homework"),
        # Unchanged.
        ("Εργασίες", "homework"),
        ("Homework/Assignments", "homework"),
        ("Συμμετοχή στο Μάθημα", "participation"),
        ("ΣΥΜΜΕΤΟΧΗ", "participation"),
        ("Class Participation", "participation"),
        ("Project", "project"),
        # A project before a lab and homework, as the standard category list has it.
        ("Lab Project", "project"),
        # Coursework before the exams (the owner, 2026-11-23): a final project is no final exam.
        ("Τελική Εργασία", "homework"),
        ("Final Project", "project"),
        ("Mid-Term Project", "project"),
        ("Τελική Εξέταση Εργαστηρίου", "lab"),
        # A quiz or a presentation is no exam either (plan todo 86).
        ("Final Quiz", "quiz"),
        ("Τελικό Τεστ", "quiz"),
        ("Ενδιάμεσο Τεστ", "quiz"),
        ("Final Presentation", "presentation"),
        ("Τελική Παρουσίαση", "presentation"),
        ("Τελικό Διαγώνισμα", "final"),
        ("Εργασία Project", "project"),
        ("Κουίζ", "quiz"),
        ("No participation", "no participation"),
        ("Minor participation", "minor participation"),
        ("Minor participation (mobile usage)", "minor participation (mobile usage)"),
        # The observations as the Greek page names them: they were read as Class Participation.
        ("Καμία συμμετοχή", "no participation"),
        ("Μικρή συμμετοχή", "minor participation"),
        ("Μικρή συμμετοχή (χρήση κινητού)", "minor participation (mobile usage)"),
        # Continuous assessment, whatever its brackets name (the templates' rules; the owner,
        # 2026-11-23): the first read as homework, the second as a midterm.
        ("Συνεχής Αξιολόγηση", "continuous"),
        ("Continuous Assessment", "continuous"),
        ("Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)", "continuous"),
        ("Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι και Ενδιάμεση Εξέταση)", "continuous"),
        # A stem counts at the start of a word only, as in the standard category list: with a
        # lab checked before homework, "Collaborative" would otherwise make a lab.
        ("Collaborative assignment", "homework"),
        ("Εξάσκηση", "homework"),
        ("Επεξεργασία Δεδομένων", "επεξεργασια δεδομενων"),
        ("Συνεργασία", "συνεργασια"),
    ],
)
def test_a_rule_name_matches_its_category(name, key):
    assert normalize_rule_category(name) == key


def test_a_course_own_name_matches_without_accents_or_case():
    assert normalize_rule_category("Θεωρητική Εξέταση") == normalize_rule_category("ΘΕΩΡΗΤΙΚΗ ΕΞΕΤΑΣΗ")
    assert normalize_rule_category("Θεωρητική Εξέταση") != normalize_rule_category("Πρακτική Εξέταση")


# One table of names for the final grade and the course editor (categoryLabels.test.ts reads it
# too): the editor saves each name as `saved` (a standard name as that category, any other as
# typed: the owner, 2026-11-23) and finds its `kind` by the final grade's keywords; the final grade
# must make the same category of the name and of what is saved, or saving a course would change
# its grades (todo 77 point 2's reviews: the editor saved «Παρουσία και Συμμετοχή» as Attendance,
# then «1η» and «2η Ενδιάμεση Εξέταση» both as "Midterm Exam").
CASES = json.loads(
    (Path(__file__).resolve().parents[3] / "src/frontend/src/utils/__tests__/ruleNameCases.json").read_text(
        encoding="utf-8"
    )
)


@pytest.mark.parametrize("case", CASES, ids=[case["name"] for case in CASES])
def test_saving_a_rule_never_changes_what_the_final_grade_makes_of_it(case):
    assert normalize_rule_category(case["name"]) == case["key"]
    assert normalize_rule_category(case["saved"]) == case["key"]


# Through the final grade, as the Grading page, the grade sheets and Analytics get it.


def _course(client, code: str, rules: list, i: int) -> tuple[dict, dict]:
    course = _create_course(client, code, rules=rules)
    student = _student(client, i, "Κατηγορίδου", "Κλειώ")
    _enroll(client, course["id"], student["id"])
    return course, student


def _final(client, course: dict, student: dict) -> dict:
    response = client.get(f"/api/v1/analytics/student/{student['id']}/course/{course['id']}/final-grade")
    assert response.status_code == 200, response.text
    return response.json()


def test_a_lab_rule_takes_the_lab_grades_not_the_homework(client):
    # Εργαστήρια 40 / Εργασίες 60; Lab Work 90, Homework 50: 0.4 * 90 + 0.6 * 50 = 66. It took the
    # homework grades for the lab rule: 50 and 50.
    rules = [{"category": "Εργαστήρια", "weight": 40.0}, {"category": "Εργασίες", "weight": 60.0}]
    course, student = _course(client, "MATCH1", rules, 301)
    _grade(client, student["id"], course["id"], "Lab 1", "Lab Work", 90, max_grade=100)
    _grade(client, student["id"], course["id"], "HW 1", "Homework", 50, max_grade=100)

    final = _final(client, course, student)

    assert final["category_breakdown"]["Εργαστήρια"]["average"] == 90.0
    assert final["category_breakdown"]["Εργασίες"]["average"] == 50.0
    assert final["final_grade"] == 66.0
    # The categories sheet counts the same.
    sheet = _sheet(client, course["id"], "categories")
    (row,) = sheet["rows"]
    assert row["cells"] == [90.0, 50.0] and row["final_grade"] == 66.0


def test_an_attendance_rule_counts_the_periods_under_any_spelling(client):
    # Παρουσίες 20 / Homework 80; Present, Present, Late, Absent (3 of 4) and Homework 80:
    # 0.2 * 75 + 0.8 * 80 = 79. It counted no period for "Παρουσίες": the final grade was 80.
    rules = [{"category": "Παρουσίες", "weight": 20.0}, {"category": "Homework", "weight": 80.0}]
    course, student = _course(client, "MATCH2", rules, 302)
    _grade(client, student["id"], course["id"], "HW 1", "Homework", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Present", "Present", "Late", "Absent")

    final = _final(client, course, student)

    assert final["category_breakdown"]["Παρουσίες"]["average"] == 75.0
    assert final["final_grade"] == 79.0


def test_an_exam_takes_its_latest_grade_under_any_spelling(client):
    # ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ 100: a retake (90) replaces the first sitting (40). It averaged them: 65.
    rules = [{"category": "ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ", "weight": 100.0}]
    course, student = _course(client, "MATCH3", rules, 303)
    _grade(client, student["id"], course["id"], "Τελική", "Final Exam", 40, max_grade=100, day=date(2026, 1, 20))
    _grade(
        client, student["id"], course["id"], "Τελική (επανάληψη)", "Final Exam", 90, max_grade=100, day=date(2026, 2, 3)
    )

    assert _final(client, course, student)["final_grade"] == 90.0


def test_a_presentation_rule_takes_the_presentation_grades(client):
    # Παρουσίαση 30 / Homework 70; Presentation 90, Homework 60: 0.3 * 90 + 0.7 * 60 = 69. It was
    # taken for attendance and matched nothing: 60.
    rules = [{"category": "Παρουσίαση", "weight": 30.0}, {"category": "Homework", "weight": 70.0}]
    course, student = _course(client, "MATCH4", rules, 304)
    _grade(client, student["id"], course["id"], "Talk", "Presentation", 90, max_grade=100)
    _grade(client, student["id"], course["id"], "HW 1", "Homework", 60, max_grade=100)

    final = _final(client, course, student)

    assert final["category_breakdown"]["Παρουσίαση"]["average"] == 90.0
    assert final["final_grade"] == 69.0


def test_an_attendance_rule_in_the_genitive_counts_the_periods(client):
    # «Ποσοστό Παρουσίας» 20 / Homework 80; periods P, P, L, A (75 %), Homework 80, and a
    # Presentation grade of 30 it must not take: 0.2 * 75 + 0.8 * 80 = 79. Casefolded, the genitive
    # reads "παρουσιασ", the presentation stem, so the rule took the presentation grade: 70.
    rules = [{"category": "Ποσοστό Παρουσίας", "weight": 20.0}, {"category": "Homework", "weight": 80.0}]
    course, student = _course(client, "MATCH6", rules, 306)
    _grade(client, student["id"], course["id"], "HW 1", "Homework", 80, max_grade=100)
    _grade(client, student["id"], course["id"], "Talk", "Presentation", 30, max_grade=100)
    _attendance(client, student["id"], course["id"], "Present", "Present", "Late", "Absent")

    final = _final(client, course, student)

    assert final["category_breakdown"]["Ποσοστό Παρουσίας"]["average"] == 75.0
    assert final["final_grade"] == 79.0


@pytest.mark.parametrize(
    "names",
    [
        ("Midterm 1", "Midterm 2"),
        ("1η Ενδιάμεση Εξέταση", "2η Ενδιάμεση Εξέταση"),
        ("Midterm Exam", "Midterm Exam"),
    ],
)
def test_a_midterm_counts_one_grade_however_its_rules_are_named(client, names):
    # The owner, 2026-11-23: "There is only one official midterm per semester for each course. The
    # second midterm is only if the student missed the first one." Rules A 20 / B 20 / Final Exam 60;
    # 40 under A's name (20 Jan), the 90 that replaces it under B's (3 Feb), Final Exam 70: both
    # rules count the 90, 0.2 * 90 + 0.2 * 90 + 0.6 * 70 = 78, whatever the names, so saving the
    # course (which may rename them) cannot change it. Different names averaged both sittings: 68.
    first, second = names
    rules = [
        {"category": first, "weight": 20.0},
        {"category": second, "weight": 20.0},
        {"category": "Final Exam", "weight": 60.0},
    ]
    course, student = _course(client, f"MATCH7{len(first)}{len(second)}", rules, 307)
    _grade(client, student["id"], course["id"], "A", first, 40, max_grade=100, day=date(2026, 1, 20))
    _grade(client, student["id"], course["id"], "B", second, 90, max_grade=100, day=date(2026, 2, 3))
    _grade(client, student["id"], course["id"], "Final", "Final Exam", 70, max_grade=100, day=date(2026, 2, 10))

    assert _final(client, course, student)["final_grade"] == 78.0


def test_a_plural_exam_rule_counts_its_latest_grade_too(client):
    # «Ενδιάμεσες Εξετάσεις» 40 / Τελική Εξέταση 60; midterm 90 (20 Jan), then 30 (3 Feb), final 50:
    # 0.4 * 30 + 0.6 * 50 = 42 ("there should no averaging any exam per course"). v1.18.80 matched
    # no "Midterm Exam" grade to the plural rule and counted the final alone: 50.
    rules = [{"category": "Ενδιάμεσες Εξετάσεις", "weight": 40.0}, {"category": "Τελική Εξέταση", "weight": 60.0}]
    course, student = _course(client, "MATCH8", rules, 308)
    _grade(client, student["id"], course["id"], "M1", "Midterm Exam", 90, max_grade=100, day=date(2026, 1, 20))
    _grade(client, student["id"], course["id"], "M2", "Midterm Exam", 30, max_grade=100, day=date(2026, 2, 3))
    _grade(client, student["id"], course["id"], "F", "Final Exam", 50, max_grade=100, day=date(2026, 2, 10))

    assert _final(client, course, student)["final_grade"] == 42.0


# Continuous assessment (the owner, 2026-11-23): "midterm exam and final exam are always unique
# single weights. homework, any other exercise or any other assessment and task during the
# lesson's period, belongs to «Συνεχής Αξιολόγηση»".

TEMPLATE_HOMEWORK = "Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)"
TEMPLATE_WITH_MIDTERM = "Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι και Ενδιάμεση Εξέταση)"
TEMPLATE_LAB = "Αξιολόγηση εργαστηριακών μετρήσεων, εκτέλεση εργαστηριακής εργασίας"


def test_continuous_assessment_takes_every_task_no_other_rule_takes(client):
    # A template course: the continuous rule 20 / Ενδιάμεση 30 / Τελική 50. Homework 60, a quiz 90,
    # a project 30 and a grade filed under the Grading page's «Συνεχής Αξιολόγηση» option, 100:
    # continuous (60 + 90 + 30 + 100) / 4 = 70; 0.2 * 70 + 0.3 * 50 + 0.5 * 80 = 69. The rule read
    # as homework: 60, the quiz, the project and the 100 counted nowhere, 0.2*60 + 15 + 40 = 67.
    rules = [
        {"category": TEMPLATE_HOMEWORK, "weight": 20.0},
        {"category": "Ενδιάμεση Εξέταση", "weight": 30.0},
        {"category": "Τελική Εξέταση", "weight": 50.0},
    ]
    course, student = _course(client, "CONT1", rules, 311)
    _grade(client, student["id"], course["id"], "HW", "Εργασία", 60, max_grade=100)
    _grade(client, student["id"], course["id"], "Q", "Quizzes", 90, max_grade=100)
    _grade(client, student["id"], course["id"], "P", "Project", 30, max_grade=100)
    _grade(client, student["id"], course["id"], "Task", "Continuous Assessment", 100, max_grade=100)
    _grade(client, student["id"], course["id"], "M", "Midterm Exam", 50, max_grade=100)
    _grade(client, student["id"], course["id"], "F", "Final Exam", 80, max_grade=100)

    final = _final(client, course, student)

    assert final["category_breakdown"][TEMPLATE_HOMEWORK]["average"] == 70.0
    assert final["category_breakdown"][TEMPLATE_HOMEWORK]["total_items"] == 4
    assert final["final_grade"] == 69.0


def test_continuous_assessment_takes_the_midterm_of_a_course_without_a_midterm_rule(client):
    # The templates' AUT0201: lab 40 / «… και Ενδιάμεση Εξέταση» 30 / final 30 (the owner: "there is no
    # course without a midterm exam and a final exam in MIEEK"). Lab 80, homework 60, the midterm 30
    # and its retake 90, final 70: continuous (60 + 90) / 2 = 75, the midterm by its one counted
    # grade; 0.4 * 80 + 0.3 * 75 + 0.3 * 70 = 75.5. v1.18.80: the lab rule took the homework and the
    # template rule averaged both sittings, 0.4 * 60 + 0.3 * 60 + 0.3 * 70 = 63.
    rules = [
        {"category": TEMPLATE_LAB, "weight": 40.0},
        {"category": TEMPLATE_WITH_MIDTERM, "weight": 30.0},
        {"category": "Τελική Εξέταση", "weight": 30.0},
    ]
    course, student = _course(client, "CONT2", rules, 312)
    _grade(client, student["id"], course["id"], "Lab", "Lab Work", 80, max_grade=100)
    _grade(client, student["id"], course["id"], "HW", "Εργασία", 60, max_grade=100)
    _grade(client, student["id"], course["id"], "M", "Midterm Exam", 30, max_grade=100, day=date(2026, 1, 10))
    _grade(client, student["id"], course["id"], "M2", "Midterm Exam", 90, max_grade=100, day=date(2026, 2, 1))
    _grade(client, student["id"], course["id"], "F", "Final Exam", 70, max_grade=100, day=date(2026, 2, 10))

    final = _final(client, course, student)

    assert final["category_breakdown"][TEMPLATE_WITH_MIDTERM]["average"] == 75.0
    assert final["category_breakdown"][TEMPLATE_LAB]["average"] == 80.0
    assert final["final_grade"] == 75.5


def test_a_midterm_with_its_own_rule_stays_out_of_continuous_assessment(client):
    # The same rule beside a Midterm rule of its own: the midterm goes there. Continuous 40 /
    # Ενδιάμεση 60; homework 60, midterm 90: 0.4 * 60 + 0.6 * 90 = 78.
    rules = [{"category": TEMPLATE_WITH_MIDTERM, "weight": 40.0}, {"category": "Ενδιάμεση Εξέταση", "weight": 60.0}]
    course, student = _course(client, "CONT3", rules, 313)
    _grade(client, student["id"], course["id"], "HW", "Εργασία", 60, max_grade=100)
    _grade(client, student["id"], course["id"], "M", "Midterm Exam", 90, max_grade=100)

    final = _final(client, course, student)

    assert final["category_breakdown"][TEMPLATE_WITH_MIDTERM]["average"] == 60.0
    assert final["final_grade"] == 78.0


def test_the_imported_lab_course_counts_its_midterm_in_continuous_assessment(client):
    # The course importer saves AUT0201's rules as Lab Work 40 / "Continuous Assessment" 30 / Final
    # Exam 30: the midterm has no rule there either. Lab 90, homework 60, midterm 80, final 50:
    # continuous (60 + 80) / 2 = 70; 0.4 * 90 + 0.3 * 70 + 0.3 * 50 = 72. v1.18.80's rule took only
    # grades filed "Continuous Assessment": none, so 0.4 * 90 + 0.3 * 50 normalized = 72.86.
    rules = [
        {"category": "Lab Work", "weight": 40.0},
        {"category": "Continuous Assessment", "weight": 30.0},
        {"category": "Final Exam", "weight": 30.0},
    ]
    course, student = _course(client, "CONT6", rules, 316)
    _grade(client, student["id"], course["id"], "Lab", "Lab Work", 90, max_grade=100)
    _grade(client, student["id"], course["id"], "HW", "Homework", 60, max_grade=100)
    _grade(client, student["id"], course["id"], "M", "Midterm Exam", 80, max_grade=100)
    _grade(client, student["id"], course["id"], "F", "Final Exam", 50, max_grade=100)

    final = _final(client, course, student)

    assert final["category_breakdown"]["Continuous Assessment"]["average"] == 70.0
    assert final["final_grade"] == 72.0


def test_continuous_assessment_takes_an_exam_without_a_rule_once_never_participation(client):
    # Only «Συνεχής Αξιολόγηση» 100: homework 80, the final exam 20 then its retake 60 (one grade, the
    # 60), a Class Participation grade (no task of the course) and a grade without a category (it
    # could be anything; the owner: count nowhere): (80 + 60) / 2 = 70.
    rules = [{"category": "Συνεχής Αξιολόγηση", "weight": 100.0}]
    course, student = _course(client, "CONT4", rules, 314)
    _grade(client, student["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _grade(client, student["id"], course["id"], "Talk", "Class Participation", 10, max_grade=100)
    _grade(client, student["id"], course["id"], "F", "Final Exam", 20, max_grade=100, day=date(2026, 1, 20))
    _grade(client, student["id"], course["id"], "F2", "Final Exam", 60, max_grade=100, day=date(2026, 2, 20))
    _grade(client, student["id"], course["id"], "Blank", None, 0, max_grade=100)

    final = _final(client, course, student)

    assert final["category_breakdown"]["Συνεχής Αξιολόγηση"]["average"] == 70.0
    assert final["category_breakdown"]["Συνεχής Αξιολόγηση"]["total_items"] == 2
    assert final["final_grade"] == 70.0


def test_a_final_project_rule_keeps_its_grades_beside_the_final_exam(client):
    # Τελική Εξέταση 60 / Τελική Εργασία 40 (the owner: a final project is coursework). The project
    # 95 (1 June), the exam 40 (20 June): 0.6 * 40 + 0.4 * 95 = 62. Read as the exam, both rules took
    # its one grade, 40; v1.18.80 averaged the project with the exam: 0.6 * 40 + 0.4 * 67.5 = 51.
    rules = [{"category": "Τελική Εξέταση", "weight": 60.0}, {"category": "Τελική Εργασία", "weight": 40.0}]
    course, student = _course(client, "CONT7", rules, 317)
    _grade(client, student["id"], course["id"], "P", "Τελική Εργασία", 95, max_grade=100, day=date(2026, 6, 1))
    _grade(client, student["id"], course["id"], "F", "Final Exam", 40, max_grade=100, day=date(2026, 6, 20))

    final = _final(client, course, student)

    assert final["category_breakdown"]["Τελική Εργασία"]["average"] == 95.0
    assert final["final_grade"] == 62.0


def test_without_a_continuous_rule_a_task_no_rule_names_still_counts_nowhere(client):
    # Homework 50 / Final Exam 50; a quiz of 100 has no rule: (0.5 * 60 + 0.5 * 70) = 65.
    rules = [{"category": "Homework", "weight": 50.0}, {"category": "Final Exam", "weight": 50.0}]
    course, student = _course(client, "CONT5", rules, 315)
    _grade(client, student["id"], course["id"], "HW", "Homework", 60, max_grade=100)
    _grade(client, student["id"], course["id"], "Q", "Quizzes", 100, max_grade=100)
    _grade(client, student["id"], course["id"], "F", "Final Exam", 70, max_grade=100)

    assert _final(client, course, student)["final_grade"] == 65.0


def test_a_course_own_rule_takes_its_grades_whatever_the_accents(client):
    # The rule as the teacher typed it, the grades as a file wrote them.
    rules = [{"category": "Θεωρητική Εξέταση", "weight": 100.0}]
    course, student = _course(client, "MATCH5", rules, 305)
    _grade(client, student["id"], course["id"], "Θεωρία", "ΘΕΩΡΗΤΙΚΗ ΕΞΕΤΑΣΗ", 70, max_grade=100)

    final = _final(client, course, student)

    assert final["category_breakdown"]["Θεωρητική Εξέταση"]["average"] == 70.0
    assert final["final_grade"] == 70.0


def test_a_final_quiz_rule_keeps_its_grades_beside_the_final_exam(client):
    # Plan todo 86: Final Exam 60 / "Final Quiz" 40; the exam 80 (30 Jan), the quiz 40 (5 Feb):
    # 0.6 * 80 + 0.4 * 40 = 64. Read as the exam, the quiz was the exam's latest sitting and both
    # rules took its 40 (and, with a final exam date, it would have been a retake under 50).
    rules = [{"category": "Final Exam", "weight": 60.0}, {"category": "Final Quiz", "weight": 40.0}]
    course, student = _course(client, "CONT8", rules, 318)
    _grade(client, student["id"], course["id"], "F", "Final Exam", 80, max_grade=100, day=date(2026, 1, 30))
    _grade(client, student["id"], course["id"], "Q", "Final Quiz", 40, max_grade=100, day=date(2026, 2, 5))

    final = _final(client, course, student)

    assert final["category_breakdown"]["Final Exam"]["average"] == 80.0
    assert final["final_grade"] == 64.0
