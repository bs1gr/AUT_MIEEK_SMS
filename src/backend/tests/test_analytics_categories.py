"""The Analytics page by category, whatever the course (plan todo 75 stage 3).

Scenario (numbers checked by hand; every grade out of 100 but s1's "Lab 1", 18 out of 20):
- Course A, rules "Θεωρητική Εξέταση" 50 / "Πρακτική Εξέταση" 50: both are exams, taken together
  by their weights. s1 80 and 60 -> exam 70; s2 40 and 50 -> 45; s3 90 and 100 -> 95. Class: 70.
- Course B, no rules: s1 "Εξέταση" 75, "Lab Work" 18/20 (90 %, weight 1) and "Εργαστήριο" 60
  (weight 2) -> exam 75, lab (90 + 120) / 3 = 70; s2 "Εξέταση" 30, "Lab Work" 50. Class: exam
  52.5, lab 60.
- Course C, rules Lab Work 40 / Final Exam 60: s1 lab 80, final 90; s3 lab 100, final 70.
  Class: lab 90, final 80.
A student's category is marked against the same courses: s1's exams 72.5 against the mean of
A's 70 and B's 52.5 (61.25), though the exam average of all three students is 68.33. Every figure
is sent, and judged, as the page shows it: one decimal, a half rounded up (61.25 -> 61.3).
"""

from __future__ import annotations

from datetime import date

import pytest

from backend.services.analytics_overview_service import category_signal
from backend.tests.test_analytics_router import _create_course, _create_dp, _post_with_csrf
from backend.tests.test_grade_sheets import _attendance, _enroll, _grade, _student


@pytest.fixture
def scenario(client):
    a = _create_course(
        client,
        "A101",
        rules=[{"category": "Θεωρητική Εξέταση", "weight": 50.0}, {"category": "Πρακτική Εξέταση", "weight": 50.0}],
    )
    b = _create_course(client, "B101")
    c = _create_course(
        client, "C101", rules=[{"category": "Lab Work", "weight": 40.0}, {"category": "Final Exam", "weight": 60.0}]
    )
    s1 = _student(client, 61, "Αλεξίου", "Ανδρέας")
    s2 = _student(client, 62, "Βασιλείου", "Βάσω")
    s3 = _student(client, 63, "Γεωργίου", "Γιώργος")
    _enroll(client, a["id"], s1["id"], s2["id"], s3["id"])
    _enroll(client, b["id"], s1["id"], s2["id"])
    _enroll(client, c["id"], s1["id"], s3["id"])

    def grade(student, course, category, value, weight=1.0, name=None, max_grade=100):
        _grade(client, student["id"], course["id"], name or category, category, value, max_grade=max_grade, weight=weight)

    for student, theory, practice in ((s1, 80, 60), (s2, 40, 50), (s3, 90, 100)):
        grade(student, a, "Θεωρητική Εξέταση", theory)
        grade(student, a, "Πρακτική Εξέταση", practice)
    grade(s1, b, "Εξέταση", 75)
    grade(s1, b, "Lab Work", 18, name="Lab 1", max_grade=20)  # 90 %: grades are compared as percentages
    grade(s1, b, "Εργαστήριο", 60, weight=2.0, name="Lab 2")
    grade(s2, b, "Εξέταση", 30)
    grade(s2, b, "Lab Work", 50, name="Lab 1")
    grade(s1, c, "Lab Work", 80)
    grade(s1, c, "Final Exam", 90)
    grade(s3, c, "Lab Work", 100)
    grade(s3, c, "Final Exam", 70)
    return {"a": a, "b": b, "c": c, "s1": s1, "s2": s2, "s3": s3}


def _overview(client, student_id: int) -> dict:
    response = client.get(f"/api/v1/analytics/student/{student_id}/overview")
    assert response.status_code == 200, response.text
    return response.json()


def _student_categories(client, student_id: int) -> dict:
    return {row["key"]: row for row in _overview(client, student_id)["categories"]}


def _class_categories(client, **params) -> dict:
    response = client.get("/api/v1/analytics/overview", params=params)
    assert response.status_code == 200, response.text
    return response.json()["categories"]


def _cells(block: dict, student_id: int) -> dict:
    """One student's row of the class map, by category key: (figure, reference, mark)."""
    keys = [c["key"] for c in block["columns"]]
    (row,) = [r for r in block["students"] if r["id"] == student_id]
    return {
        key: (cell, reference, signal)
        for key, cell, reference, signal in zip(keys, row["cells"], row["class_averages"], row["signals"])
        if cell is not None
    }


def test_a_students_categories_across_courses_against_the_class(client, scenario):
    found = _student_categories(client, scenario["s1"]["id"])

    assert list(found) == ["final", "exam", "lab"]  # standard order: final, exam, ..., lab
    exam = found["exam"]
    # As shown: 72.5 against 61.3 is +11.2 (the unrounded 61.25 would make it 11.25).
    assert (exam["average"], exam["class_average"], exam["difference"]) == (72.5, 61.3, 11.2)
    assert exam["signal"] == "strength"  # 11.2 points over the class
    assert exam["label_key"] == "exam"
    assert [(c["course_code"], c["average"], c["class_average"], c["signal"]) for c in exam["courses"]] == [
        ("A101", 70.0, 70.0, None),
        ("B101", 75.0, 52.5, "strength"),
    ]
    final = found["final"]
    assert (final["average"], final["signal"], [c["signal"] for c in final["courses"]]) == (90.0, "strength", ["strength"])
    lab = found["lab"]
    assert (lab["average"], lab["class_average"], lab["signal"]) == (75.0, 75.0, None)
    # Course by course, what the one-course view shows: 70 is 10 over B101's 60, 80 is 10 under
    # C101's 90.
    assert [(c["course_code"], c["average"], c["class_average"], c["signal"]) for c in lab["courses"]] == [
        ("B101", 70.0, 60.0, "strength"),
        ("C101", 80.0, 90.0, "difficulty"),
    ]


def test_difficulties_under_the_pass_mark_or_ten_points_under_the_class(client, scenario):
    found = _student_categories(client, scenario["s2"]["id"])

    assert (found["exam"]["average"], found["exam"]["signal"]) == (37.5, "difficulty")
    # 50 passes, but it is 10 points under the class's 60.
    assert (found["lab"]["average"], found["lab"]["class_average"], found["lab"]["signal"]) == (
        50.0,
        60.0,
        "difficulty",
    )


def test_the_class_by_category_whatever_the_course(client, scenario):
    block = _class_categories(client)

    assert [c["key"] for c in block["columns"]] == ["final", "exam", "lab"]
    assert block["averages"] == [80.0, 68.3, 75.0]
    students = {row["name"]: row for row in block["students"]}
    s1 = students["Ανδρέας Αλεξίου"]
    # Exams 72.5 against A101's 70 and B101's 52.5: a strength, though the row of averages says 68.3.
    assert (s1["cells"], s1["class_averages"], s1["signals"]) == (
        [90.0, 72.5, 75.0],
        [80.0, 61.3, 75.0],
        ["strength", "strength", None],
    )
    assert (s1["strengths"], s1["difficulties"]) == (2, 0)
    s2 = students["Βάσω Βασιλείου"]
    assert (s2["cells"], s2["class_averages"], s2["signals"], s2["difficulties"]) == (
        [None, 37.5, 50.0],
        [None, 61.3, 60.0],
        [None, "difficulty", "difficulty"],
        2,
    )
    s3 = students["Γιώργος Γεωργίου"]
    # 70 in the finals is 10 under C101's 80: a difficulty, beside two strengths.
    assert (s3["cells"], s3["class_averages"], s3["signals"]) == (
        [70.0, 95.0, 100.0],
        [80.0, 70.0, 90.0],
        ["difficulty", "strength", "strength"],
    )
    assert (s3["strengths"], s3["difficulties"]) == (2, 1)
    courses = {row["course_code"]: row["cells"] for row in block["courses"]}
    assert courses == {"A101": [None, 70.0, None], "B101": [None, 52.5, 60.0], "C101": [80.0, None, 90.0]}


def test_the_class_map_marks_as_the_student_view_does(client, scenario):
    # A name in the map opens the student view: each category has the same figures and mark there.
    block = _class_categories(client)

    assert len(block["students"]) == 3
    for row in block["students"]:
        profile = _student_categories(client, row["id"])
        mine = _cells(block, row["id"])
        assert set(mine) == set(profile), row["name"]
        for key, (cell, reference, signal) in mine.items():
            shown = profile[key]
            assert (cell, reference, signal) == (shown["average"], shown["class_average"], shown["signal"]), key


def test_each_course_of_a_profile_marks_as_the_class_view_of_that_course(client, scenario):
    # With a course chosen, the student view shows each category's figures in that course: the
    # same as the class view filtered to that course.
    for name in ("s1", "s2", "s3"):
        student_id = scenario[name]["id"]
        for key, category in _student_categories(client, student_id).items():
            for item in category["courses"]:
                found = _cells(_class_categories(client, course_id=item["id"]), student_id)[key]
                assert found == (item["average"], item["class_average"], item["signal"]), (name, key, item["course_code"])


def test_a_course_filter_keeps_its_own_categories(client, scenario):
    block = _class_categories(client, course_id=scenario["c"]["id"])

    assert [c["key"] for c in block["columns"]] == ["final", "lab"]
    assert block["averages"] == [80.0, 90.0]
    # Only C101's students, against C101 alone: 80 in the labs is 10 under its 90.
    assert {row["name"]: (row["cells"], row["signals"]) for row in block["students"]} == {
        "Ανδρέας Αλεξίου": ([90.0, 80.0], ["strength", "difficulty"]),
        "Γιώργος Γεωργίου": ([70.0, 100.0], ["difficulty", "strength"]),
    }


def test_a_student_with_nothing_graded_has_no_row(client, scenario):
    s4 = _student(client, 66, "Δαμιανού", "Δανάη")
    _enroll(client, scenario["a"]["id"], s4["id"])

    block = _class_categories(client)

    assert [row["name"] for row in block["students"] if row["id"] == s4["id"]] == []
    assert block["averages"] == [80.0, 68.3, 75.0]
    assert {row["course_code"]: row["cells"] for row in block["courses"]}["A101"] == [None, 70.0, None]


def _student_in(client, i: int, last: str, first: str, division: str) -> dict:
    payload = {
        "first_name": first,
        "last_name": last,
        "email": f"category{i}@example.com",
        "student_id": f"CT{i:04d}",
        "class_division": division,
    }
    response = _post_with_csrf(client, "/api/v1/students/", payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_a_division_is_marked_against_its_own_students_in_each_course(client):
    # As every figure of the class view, a course's average counts the selection's students:
    # D101's exams are 80, 60 and 20 (53.3); division Α1 alone has 80 and 60 (70).
    course = _create_course(client, "D101")
    d1 = _student_in(client, 71, "Ζαχαρίου", "Ζωή", "Α1")
    d2 = _student_in(client, 72, "Ηλιάδης", "Ηλίας", "Α1")
    d3 = _student_in(client, 73, "Θεοδώρου", "Θέμης", "Α2")
    _enroll(client, course["id"], d1["id"], d2["id"], d3["id"])
    for student, value in ((d1, 80), (d2, 60), (d3, 20)):
        _grade(client, student["id"], course["id"], "Εξέταση", "Εξέταση", value, max_grade=100)

    whole = {row["name"]: (row["class_averages"], row["signals"]) for row in _class_categories(client)["students"]}
    a1 = {
        row["name"]: (row["class_averages"], row["signals"])
        for row in _class_categories(client, class_division="Α1")["students"]
    }

    assert whole == {
        "Ζωή Ζαχαρίου": ([53.3], ["strength"]),
        "Ηλίας Ηλιάδης": ([53.3], [None]),
        "Θέμης Θεοδώρου": ([53.3], ["difficulty"]),
    }
    assert a1 == {"Ζωή Ζαχαρίου": ([70.0], ["strength"]), "Ηλίας Ηλιάδης": ([70.0], ["difficulty"])}


def test_a_category_lost_to_absences_is_not_counted_as_a_score(client):
    # Over the participation absence limit the final grade counts Class Participation as 0; that
    # is attendance, not how the student participates, so it stays out of the profile.
    rules = [{"category": "Class Participation", "weight": 20.0}, {"category": "Homework", "weight": 80.0}]
    course = _create_course(client, "P101", rules=rules)
    s = _student(client, 64, "Δημητρίου", "Δέσποινα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "HW", "Homework", 70, max_grade=100)
    _grade(client, s["id"], course["id"], "Participation", "Class Participation", 90, max_grade=100)
    _attendance(client, s["id"], course["id"], *(["Absent"] * 5))

    found = _student_categories(client, s["id"])

    assert list(found) == ["homework"]
    assert found["homework"]["average"] == 70.0


def _participation_course(client, code: str) -> dict:
    rules = [{"category": "Class Participation", "weight": 20.0}, {"category": "Homework", "weight": 80.0}]
    return _create_course(client, code, rules=rules)


def _no_participation(client, student: dict, course: dict, days_ago: int) -> None:
    response = _create_dp(client, student["id"], course["id"], "No participation", 0, 10, days_ago=days_ago)
    assert response.status_code in (200, 201), response.text


def _rate(client, student: dict, course: dict, score: float, days_ago: int = 0) -> None:
    response = _create_dp(client, student["id"], course["id"], "Class Participation", score, 10, days_ago=days_ago)
    assert response.status_code in (200, 201), response.text


def test_participation_counts_the_observations_as_the_final_grade_does(client):
    # Class Participation 20 / Homework 80. Both students: Homework 80, rated 9/10, Present today.
    # Ιωάννου also has "No participation" ticked on 4 earlier days: 5 attended days, and each tick
    # takes 60 % of its day's slice, so 48 of her 90 go. 42 is the share her final grade counts
    # (0.2 * 42 + 0.8 * 80 = 72.4), a difficulty; Κυριάκου keeps 90. Class: 66.
    course = _participation_course(client, "OBS1")
    ticked = _student(client, 81, "Ιωάννου", "Ραφαέλα")
    other = _student(client, 82, "Κυριάκου", "Κλεονίκη")
    _enroll(client, course["id"], ticked["id"], other["id"])
    for s in (ticked, other):
        _grade(client, s["id"], course["id"], "HW", "Homework", 80, max_grade=100)
        _rate(client, s, course, 9)
        _attendance(client, s["id"], course["id"], "Present")
    for days_ago in range(1, 5):
        _no_participation(client, ticked, course, days_ago)

    mine = _student_categories(client, ticked["id"])["participation"]
    theirs = _student_categories(client, other["id"])["participation"]

    assert (mine["average"], mine["class_average"], mine["difference"], mine["signal"]) == (
        42.0,
        66.0,
        -24.0,
        "difficulty",
    )
    assert (theirs["average"], theirs["signal"]) == (90.0, "strength")
    assert _overview(client, ticked["id"])["courses"][0]["final_grade"] == 72.4
    block = _class_categories(client)
    assert _cells(block, ticked["id"])["participation"] == (42.0, 66.0, "difficulty")
    assert _cells(block, other["id"])["participation"] == (90.0, 66.0, "strength")


def test_ticks_without_ratings_count_from_the_whole_share(client):
    # Nobody is rated (the owner, 2026-11-23: "Tick-only courses: 100 less ticks"): each attended
    # day keeps its whole slice for being present, less what a tick takes. Ιωάννου's 4 ticks over
    # 5 days take 48: 52. Κυριάκου, never ticked, keeps 100, which only says "never ticked": no
    # strength. Her final grade loses the same 9.6 points: 80 - 9.6 = 70.4.
    course = _participation_course(client, "OBS2")
    ticked = _student(client, 83, "Ιωάννου", "Ραφαέλα")
    other = _student(client, 84, "Κυριάκου", "Κλεονίκη")
    _enroll(client, course["id"], ticked["id"], other["id"])
    for s in (ticked, other):
        _grade(client, s["id"], course["id"], "HW", "Homework", 80, max_grade=100)
        _attendance(client, s["id"], course["id"], "Present")
    for days_ago in range(1, 5):
        _no_participation(client, ticked, course, days_ago)

    mine = _student_categories(client, ticked["id"])["participation"]
    theirs = _student_categories(client, other["id"])["participation"]

    assert (mine["average"], mine["class_average"], mine["signal"]) == (52.0, 76.0, "difficulty")
    assert (theirs["average"], theirs["signal"]) == (100.0, None)
    assert _overview(client, ticked["id"])["courses"][0]["final_grade"] == 70.4


def test_the_ticks_count_whatever_else_is_graded(client):
    # Nobody rated. The same 4 ticks over 5 days take 48 of the share with no grade yet (the final
    # grade has nothing to take them from) or with a Homework of 5 (where the final grade stops at
    # 0): 52 both times. Λάμπρου, present and never ticked, nothing graded, keeps the whole share.
    course = _participation_course(client, "OBS4")
    empty = _student(client, 94, "Παππά", "Πέτρος")
    low = _student(client, 95, "Ρήγα", "Ροδάνθη")
    clean = _student(client, 96, "Λάμπρου", "Λευτέρης")
    _enroll(client, course["id"], empty["id"], low["id"], clean["id"])
    _grade(client, low["id"], course["id"], "HW", "Homework", 5, max_grade=100)
    for s in (empty, low, clean):
        _attendance(client, s["id"], course["id"], "Present")
    for s in (empty, low):
        for days_ago in range(1, 5):
            _no_participation(client, s, course, days_ago)

    found = {s["id"]: _student_categories(client, s["id"]).get("participation") for s in (empty, low, clean)}

    # Class: (52 + 52 + 100) / 3 = 68; 52 is 16 under it.
    assert {sid: (p["average"], p["class_average"], p["signal"]) for sid, p in found.items()} == {
        empty["id"]: (52.0, 68.0, "difficulty"),
        low["id"]: (52.0, 68.0, "difficulty"),
        clean["id"]: (100.0, 68.0, None),
    }
    assert _overview(client, empty["id"])["courses"][0]["final_grade"] is None


def test_a_course_that_rates_participation_judges_it_among_the_rated(client):
    # One scale per course (the owner, 2026-11-23): where anyone is rated, only ratings count.
    # Κωνσταντίνου, rated 8/10, is 80 among the rated (herself), not a difficulty under her
    # unrated classmates' 100s for being present. Those classmates, one of them ticked, have no
    # participation figure, as the final grade and the grade sheet leave an unrated category out.
    course = _participation_course(client, "MIX1")
    rated = _student(client, 97, "Κωνσταντίνου", "Κλειώ")
    plain = _student(client, 98, "Λουκά", "Λίνα")
    ticked = _student(client, 99, "Μανωλάκη", "Μάρω")
    _enroll(client, course["id"], rated["id"], plain["id"], ticked["id"])
    for s in (rated, plain, ticked):
        _grade(client, s["id"], course["id"], "HW", "Homework", 80, max_grade=100)
        _attendance(client, s["id"], course["id"], "Present")
    _rate(client, rated, course, 8)
    _no_participation(client, ticked, course, 1)

    participation = _student_categories(client, rated["id"])["participation"]

    assert (participation["average"], participation["class_average"], participation["signal"]) == (80.0, 80.0, None)
    assert "participation" not in _student_categories(client, plain["id"])
    assert "participation" not in _student_categories(client, ticked["id"])
    block = _class_categories(client, course_id=course["id"])
    assert _cells(block, rated["id"])["participation"] == (80.0, 80.0, None)


def test_attendance_is_a_difficulty_at_most(client):
    # Being there is what is asked: an Attendance rule's figure can be a difficulty, never a
    # strength, though 100 is 85 or more and 25 over the class (75). Half the periods: 50 is 25
    # under the class, a difficulty.
    rules = [{"category": "Attendance", "weight": 20.0}, {"category": "Homework", "weight": 80.0}]
    course = _create_course(client, "ATT1", rules=rules)
    full = _student(client, 100, "Νικολαΐδη", "Νίκη")
    half = _student(client, 101, "Ξανθοπούλου", "Ξανθή")
    _enroll(client, course["id"], full["id"], half["id"])
    for s in (full, half):
        _grade(client, s["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, full["id"], course["id"], "Present", "Present", "Present", "Present")
    _attendance(client, half["id"], course["id"], "Present", "Present", "Absent", "Absent")

    found = {s["id"]: _student_categories(client, s["id"])["attendance"] for s in (full, half)}

    assert {sid: (a["average"], a["class_average"], a["signal"]) for sid, a in found.items()} == {
        full["id"]: (100.0, 75.0, None),
        half["id"]: (50.0, 75.0, "difficulty"),
    }
    block = _class_categories(client, course_id=course["id"])
    assert _cells(block, full["id"])["attendance"] == (100.0, 75.0, None)


def test_a_grade_out_of_twenty_rounds_as_a_teacher_rounds_it(client):
    # 16.99 / 20 is 84.95 %, though the float holds 84.94999...: shown 85.0, so a strength (as the
    # grade list shows it); 10.25 / 20 is 51.25 %, shown 51.3.
    course = _create_course(client, "ROUND")
    s = _student(client, 102, "Ορφανίδου", "Ουρανία")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Lab 1", "Lab Work", 16.99, max_grade=20)
    _grade(client, s["id"], course["id"], "Poster", "Project", 10.25, max_grade=20)

    found = _student_categories(client, s["id"])

    assert (found["lab"]["average"], found["lab"]["signal"]) == (85.0, "strength")
    assert found["project"]["average"] == 51.3


def test_a_course_row_says_whether_the_course_has_rules(client):
    # With rules but grades outside them the final grade is their mean by Weight: the row says
    # the course has rules, so the page can explain an empty profile.
    with_rules = _create_course(client, "OUT1", rules=[{"category": "Final Exam", "weight": 100.0}])
    without = _create_course(client, "OUT2")
    s = _student(client, 103, "Παπαδάκη", "Πηνελόπη")
    _enroll(client, with_rules["id"], s["id"])
    _enroll(client, without["id"], s["id"])
    _grade(client, s["id"], with_rules["id"], "Quiz", "Quizzes", 90, max_grade=100)
    _grade(client, s["id"], without["id"], "Quiz", "Quizzes", 70, max_grade=100)

    overview = _overview(client, s["id"])

    rows = {row["course_code"]: (row["has_rules"], row["grade_basis"], row["final_grade"]) for row in overview["courses"]}
    assert rows == {"OUT1": (True, "average", 90.0), "OUT2": (False, "average", 70.0)}
    assert [(c["key"], [i["course_code"] for i in c["courses"]]) for c in overview["categories"]] == [("quiz", ["OUT2"])]


def test_no_participation_figure_where_nothing_about_it_is_recorded(client):
    # Neither rated nor ticked by anyone in this course: no participation figure, not a 100.
    course = _participation_course(client, "OBS3")
    s = _student(client, 85, "Λαμπράκη", "Λήδα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, s["id"], course["id"], "Present")

    assert list(_student_categories(client, s["id"])) == ["homework"]


def test_a_course_with_rules_shows_what_its_final_grade_counts(client):
    # An exam counts its latest grade (40 on 10 Jan, the retake 80 on 10 Feb), and daily ratings
    # count in their rule: a participation grade of 60 and two days rated 10/10 make 86.67.
    rules = [
        {"category": "Final Exam", "weight": 50.0},
        {"category": "Class Participation", "weight": 25.0},
        {"category": "Homework", "weight": 25.0},
    ]
    course = _create_course(client, "RULES", rules=rules)
    s = _student(client, 86, "Μαρκίδου", "Μυρτώ")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 40, max_grade=100, day=date(2026, 1, 10))
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 80, max_grade=100, day=date(2026, 2, 10))
    _grade(client, s["id"], course["id"], "Participation", "Class Participation", 60, max_grade=100)
    _grade(client, s["id"], course["id"], "HW", "Homework", 70, max_grade=100)
    for days_ago in (1, 2):
        _rate(client, s, course, 10, days_ago=days_ago)

    found = _student_categories(client, s["id"])

    assert {key: row["average"] for key, row in found.items()} == {"final": 80.0, "participation": 86.7, "homework": 70.0}


def test_two_rules_of_one_kind_count_by_their_weights(client):
    # Θεωρητική Εξέταση 70 / Πρακτική Εξέταση 30, graded 90 and 50: the exam share of the final
    # grade is 0.7 * 90 + 0.3 * 50 = 78 (the final grade itself here), not the mean of the two, 70.
    rules = [{"category": "Θεωρητική Εξέταση", "weight": 70.0}, {"category": "Πρακτική Εξέταση", "weight": 30.0}]
    course = _create_course(client, "SPLIT", rules=rules)
    s = _student(client, 87, "Νικολάου", "Νεφέλη")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Θεωρία", "Θεωρητική Εξέταση", 90, max_grade=100)
    _grade(client, s["id"], course["id"], "Πράξη", "Πρακτική Εξέταση", 50, max_grade=100)

    found = _student_categories(client, s["id"])

    assert {key: row["average"] for key, row in found.items()} == {"exam": 78.0}
    assert _overview(client, s["id"])["courses"][0]["final_grade"] == 78.0


def test_a_course_with_rules_counts_only_its_rules_for_every_student(client):
    # Homework 50 / Final Exam 50. Ξενάκη's Lab Work is outside the rules. Ψυχογιού has only Lab
    # Work: her final grade is the mean of her grades, but, as on the grade sheet by category,
    # she has no category of this course, and the course's figures are not made of hers alone.
    rules = [{"category": "Homework", "weight": 50.0}, {"category": "Final Exam", "weight": 50.0}]
    course = _create_course(client, "MX101", rules=rules)
    x = _student(client, 88, "Ξενάκη", "Ξένια")
    y = _student(client, 89, "Ψυχογιού", "Ψυχή")
    _enroll(client, course["id"], x["id"], y["id"])
    _grade(client, x["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _grade(client, x["id"], course["id"], "Lab", "Lab Work", 40, max_grade=100)
    _grade(client, y["id"], course["id"], "Lab", "Lab Work", 90, max_grade=100)

    assert list(_student_categories(client, x["id"])) == ["homework"]
    assert _student_categories(client, y["id"]) == {}
    block = _class_categories(client, course_id=course["id"])
    assert [c["key"] for c in block["columns"]] == ["homework"]
    assert [row["id"] for row in block["students"]] == [x["id"]]
    assert block["courses"][0]["cells"] == [80.0]


def test_a_grade_without_a_category_is_shown_as_uncategorized(client):
    course = _create_course(client, "BLANK")
    s = _student(client, 90, "Οικονόμου", "Όλγα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Lab 1", "Lab Work", 90, max_grade=100)
    _grade(client, s["id"], course["id"], "Quiz 1", None, 40, max_grade=100)

    found = _student_categories(client, s["id"])

    assert [(row["key"], row["label_key"], row["average"]) for row in found.values()] == [
        ("lab", "lab", 90.0),
        ("custom:", "uncategorized", 40.0),
    ]
    assert [(c["key"], c["label_key"]) for c in _class_categories(client)["columns"]] == [
        ("lab", "lab"),
        ("custom:", "uncategorized"),
    ]


def test_a_custom_category_keeps_its_name(client):
    course = _create_course(client, "V101")
    s = _student(client, 65, "Ευαγγέλου", "Έλενα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Poster", "Οπτικοποίηση", 88, max_grade=100)

    (row,) = _student_categories(client, s["id"]).values()

    assert (row["key"], row["label_key"], row["name"], row["average"]) == (
        "custom:οπτικοποιηση",
        None,
        "Οπτικοποίηση",
        88.0,
    )


def test_a_custom_category_is_named_as_most_of_its_grades_spell_it(client):
    # One grade typed without the accent, two with it: every view names the column "Οπτικοποίηση",
    # whichever student comes first or which rows the database returns first.
    course = _create_course(client, "SPELL")
    a = _student(client, 91, "Αλεξίου", "Άλκης")
    b = _student(client, 92, "Βασιλείου", "Βέρα")
    c = _student(client, 93, "Γεωργίου", "Γαλάτεια")
    _enroll(client, course["id"], a["id"], b["id"], c["id"])
    for student, spelling, value in ((a, "Οπτικοποιηση", 70), (b, "Οπτικοποίηση", 80), (c, "Οπτικοποίηση", 90)):
        _grade(client, student["id"], course["id"], "Poster", spelling, value, max_grade=100)

    (column,) = _class_categories(client)["columns"]
    (row,) = _student_categories(client, a["id"]).values()

    assert (column["name"], row["name"]) == ("Οπτικοποίηση", "Οπτικοποίηση")


@pytest.mark.parametrize(
    "average, class_average, signal",
    [
        (None, 70.0, None),
        # Judged as shown, one decimal with a half rounded up: 49.95 shows as 50.0.
        (49.94, None, "difficulty"),
        (49.95, None, None),
        (49.99, None, None),
        (84.94, None, None),
        (84.95, None, "strength"),
        (85.0, None, "strength"),
        (60.0, 70.0, "difficulty"),
        (60.04, 70.0, "difficulty"),  # 60.0 against 70.0
        (60.05, 70.0, None),  # 60.1
        (60.0, 69.996, "difficulty"),  # the class too is judged as shown: 70.0
        (80.0, 70.0, "strength"),
        (79.99, 70.0, "strength"),  # 80.0
        (79.94, 70.0, None),
        (80.0, 70.04, "strength"),  # 80.0 against 70.0
        # Exactly 10 points as shown, whatever the binary fractions (64.02 - 10 is 54.0199...).
        (54.02, 64.02, "difficulty"),
        (64.02, 54.02, "strength"),
        (60.1, 70.1, "difficulty"),
        # The levels come first: under 50 is a difficulty and 85 or more a strength, whatever
        # the class; in between, 10 points under or over the class decide.
        (45.0, 30.0, "difficulty"),
        (88.0, 98.0, "strength"),
        (84.0, 99.0, "difficulty"),
        # The float noise of the arithmetic is not a figure: 16.99 / 20 * 100 is a teacher's 84.95.
        (16.99 / 20 * 100, None, "strength"),
        # A figure too large for the decimal rounding still gets its mark, never an error.
        (1e30, None, "strength"),
    ],
)
def test_the_signal_thresholds(average, class_average, signal):
    assert category_signal(average, class_average) == signal


@pytest.mark.parametrize(
    "average, class_average, signal",
    [
        (100.0, 70.0, None),  # 85 or more, and 30 over the class: still no strength
        (79.0, 60.0, None),
        (49.9, None, "difficulty"),
        (60.0, 70.0, "difficulty"),
    ],
)
def test_a_presence_figure_is_never_a_strength(average, class_average, signal):
    assert category_signal(average, class_average, strengths=False) == signal
