"""Grade sheets of a course (plan todo 75): one assessment, every assessment, or by category.

Main scenario (numbers checked by hand). MATH has the rules Homework 40% / Final Exam 60%:
- Ζήσης:      Άσκηση 1 16/20 (80 %); the final twice, 12/20 on 1 Feb then 15/20 on 3 Feb (75 %):
              the latest counts. Final grade 0.4*80 + 0.6*75 = 77.
- Άβερωφ:     Άσκηση 1 10/20 (50 %); the final 9/20 (45 %), saved as "Τελική εξέταση" under the
              Greek category. Final grade 0.4*50 + 0.6*45 = 47.
- Ελευθερίου: nothing graded yet.
- Κανελλόπουλος is inactive and Μαρκόπουλος dropped MATH: neither is listed.
NORULES has no rules: Ζήσης Lab 60 (weight 1) and Lab 90 (weight 2) -> 80; Project 70.

The other tests build their own small course. A course has 3 periods a week by default, so 42 in
the semester: more than 4 absences lose Class Participation, more than 12 fail the course.
"""

from __future__ import annotations

from datetime import date, timedelta
from io import BytesIO

import pytest

from backend.models import CourseEnrollment, Student
from backend.tests.test_analytics_router import _create_att, _create_course, _create_dp, _post_with_csrf

BASE = "/api/v1/grade-sheets/course"


def _student(client, i: int, last: str, first: str) -> dict:
    response = _post_with_csrf(
        client,
        "/api/v1/students/",
        {"first_name": first, "last_name": last, "email": f"sheet{i}@example.com", "student_id": f"GS{i:04d}"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _enroll(client, course_id: int, *student_ids: int) -> None:
    response = _post_with_csrf(client, f"/api/v1/enrollments/course/{course_id}", {"student_ids": list(student_ids)})
    assert response.status_code in (200, 201), response.text


def _grade(client, sid, cid, name, category, grade, max_grade=20.0, day=date(2026, 1, 20), weight=1.0, dated=True):
    payload = {
        "student_id": sid,
        "course_id": cid,
        "assignment_name": name,
        "category": category,
        "grade": grade,
        "max_grade": max_grade,
        "weight": weight,
    }
    if dated:
        payload.update(date_assigned=day.isoformat(), date_submitted=day.isoformat())
    response = _post_with_csrf(client, "/api/v1/grades/", payload)
    assert response.status_code == 201, response.text


def _attendance(client, sid, cid, *statuses: str) -> None:
    for period, status in enumerate(statuses, start=1):
        response = _create_att(client, sid, cid, status, period=period)
        assert response.status_code == 201, response.text


@pytest.fixture
def scenario(client, db):
    rules = [{"category": "Homework", "weight": 40.0}, {"category": "Final Exam", "weight": 60.0}]
    math = _create_course(client, "MATH", rules=rules)
    norules = _create_course(client, "NORULES")

    zisis = _student(client, 1, "Ζήσης", "Νίκος")
    averof = _student(client, 2, "Άβερωφ", "Ελένη")
    eleftheriou = _student(client, 3, "Ελευθερίου", "Μαρία")
    inactive = _student(client, 4, "Κανελλόπουλος", "Πέτρος")
    dropped = _student(client, 5, "Μαρκόπουλος", "Άννα")

    _enroll(client, math["id"], zisis["id"], averof["id"], eleftheriou["id"], inactive["id"], dropped["id"])
    _enroll(client, norules["id"], zisis["id"])

    _grade(client, zisis["id"], math["id"], "Άσκηση 1", "Homework", 16, day=date(2026, 1, 20))
    _grade(client, averof["id"], math["id"], "άσκηση 1 ", "Homework", 10, day=date(2026, 1, 21))
    _grade(client, zisis["id"], math["id"], "Τελική", "Final Exam", 12, day=date(2026, 2, 1))
    _grade(client, zisis["id"], math["id"], "Τελική", "Final Exam", 15, day=date(2026, 2, 3))
    _grade(client, averof["id"], math["id"], "τελική", "Τελική εξέταση", 9, day=date(2026, 2, 1))
    _grade(client, inactive["id"], math["id"], "Άσκηση 1", "Homework", 20)
    _grade(client, dropped["id"], math["id"], "Άσκηση 1", "Homework", 20)

    _grade(client, zisis["id"], norules["id"], "Lab A", "Lab Work", 60, max_grade=100, weight=1.0)
    _grade(client, zisis["id"], norules["id"], "Lab B", "Εργαστήριο", 90, max_grade=100, weight=2.0)
    _grade(client, zisis["id"], norules["id"], "Poster", "Project", 70, max_grade=100)

    db.query(Student).filter(Student.id == inactive["id"]).update({"is_active": False})
    db.query(CourseEnrollment).filter(
        CourseEnrollment.student_id == dropped["id"], CourseEnrollment.course_id == math["id"]
    ).update({"status": "dropped"})
    db.commit()
    return {"math": math, "norules": norules, "zisis": zisis, "averof": averof, "eleftheriou": eleftheriou}


def _assessments(client, course_id: int) -> list[dict]:
    response = client.get(f"{BASE}/{course_id}/assessments")
    assert response.status_code == 200, response.text
    return response.json()["assessments"]


def _sheet(client, course_id: int, kind: str, assessment: str | None = None) -> dict:
    params = {"kind": kind, **({"assessment": assessment} if assessment else {})}
    response = client.get(f"{BASE}/{course_id}", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def _surnames(rows: list[dict]) -> list[str]:
    return [row["student"]["last_name"] for row in rows]


def _pdf_text(content: bytes) -> str:
    from pypdf import PdfReader

    return "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages)


def _excel_rows(content: bytes) -> list[tuple]:
    from openpyxl import load_workbook

    return [tuple(row) for row in load_workbook(BytesIO(content)).active.iter_rows(values_only=True)]


def _export(client, course_id: int, file_format: str, **params) -> bytes:
    response = client.get(f"{BASE}/{course_id}/export/{file_format}", params={"lang": "en", **params})
    assert response.status_code == 200, response.text
    return response.content


def _header_and_rows(rows: list[tuple]) -> tuple[tuple, dict]:
    """The table's header row, and its student rows by surname."""
    index = next(i for i, row in enumerate(rows) if row[0] == "#")
    body = {row[2]: row for row in rows[index + 1 :] if isinstance(row[0], int)}
    return rows[index], body


# ---------------------------------------------------------------------------
# The main scenario
# ---------------------------------------------------------------------------


def test_the_assessments_of_a_course_merge_spellings_and_count_the_live_students(client, scenario):
    found = _assessments(client, scenario["math"]["id"])

    assert [(a["name"], a["category_key"]) for a in found] == [("Άσκηση 1", "homework"), ("Τελική", "final")]
    homework, final = found
    assert homework["graded"] == 2  # the inactive and the dropped student's 20/20 are not counted
    assert final["graded"] == 2
    assert homework["enrolled"] == final["enrolled"] == 3
    assert final["max_grade"] == 20.0
    assert (final["first_date"], final["last_date"]) == ("2026-02-01", "2026-02-03")
    assert not homework["shared_name"] and not final["shared_name"]


def test_one_assessment_lists_every_student_a_to_z_with_the_latest_score(client, scenario):
    final = _assessments(client, scenario["math"]["id"])[1]

    sheet = _sheet(client, scenario["math"]["id"], "assessment", final["key"])

    assert _surnames(sheet["rows"]) == ["Άβερωφ", "Ελευθερίου", "Ζήσης"]  # nobody inactive or dropped
    averof, eleftheriou, zisis = sheet["rows"]
    assert [r["number"] for r in sheet["rows"]] == [1, 2, 3]
    assert (zisis["score"], zisis["max_grade"], zisis["percentage"], zisis["entries"]) == (15.0, 20.0, 75.0, 2)
    assert zisis["date"] == "2026-02-03"
    assert (averof["score"], averof["percentage"], averof["passed"]) == (9.0, 45.0, False)
    # Not graded: still on the list, with an empty score.
    assert (eleftheriou["score"], eleftheriou["percentage"], eleftheriou["entries"]) == (None, None, 0)

    assert sheet["summary"] == {
        "enrolled": 3,
        "graded": 2,
        "missing": 1,
        "average": 60.0,
        "median": 60.0,
        "highest": 75.0,
        "lowest": 45.0,
        "passed": 1,
        "failed": 1,
    }


def test_the_matrix_has_one_column_per_assessment_and_the_analytics_final_grade(client, scenario):
    sheet = _sheet(client, scenario["math"]["id"], "matrix")

    assert [c["name"] for c in sheet["columns"]] == ["Άσκηση 1", "Τελική"]
    rows = {row["student"]["last_name"]: row for row in sheet["rows"]}
    assert rows["Ζήσης"]["cells"] == [80.0, 75.0]
    assert rows["Άβερωφ"]["cells"] == [50.0, 45.0]
    assert rows["Ελευθερίου"]["cells"] == [None, None]
    assert (rows["Ζήσης"]["final_grade"], rows["Άβερωφ"]["final_grade"]) == (77.0, 47.0)
    assert (rows["Ζήσης"]["result"], rows["Άβερωφ"]["result"], rows["Ελευθερίου"]["result"]) == (
        "passed",
        "failed",
        None,
    )
    assert rows["Ελευθερίου"]["final_grade"] is None
    assert sheet["column_averages"] == [65.0, 60.0]
    assert sheet["summary"] == {
        "enrolled": 3,
        "final_average": 62.0,
        "passed": 1,
        "failed": 1,
        "failed_absences": 0,
        "no_grade": 1,
    }

    # The same final grade as the Analytics page shows for that student and course.
    overview = client.get(f"/api/v1/analytics/student/{scenario['zisis']['id']}/overview").json()
    math = next(c for c in overview["courses"] if c["course_code"] == "MATH")
    assert math["final_grade"] == rows["Ζήσης"]["final_grade"]


def test_category_totals_follow_the_course_rules(client, scenario):
    sheet = _sheet(client, scenario["math"]["id"], "categories")

    assert sheet["basis"] == "rules"
    assert [(c["key"], c["category"], c["category_key"], c["weight"]) for c in sheet["columns"]] == [
        ("rule:0", "Homework", "homework", 40.0),
        ("rule:1", "Final Exam", "final", 60.0),
    ]
    rows = {row["student"]["last_name"]: row for row in sheet["rows"]}
    assert rows["Ζήσης"]["cells"] == [80.0, 75.0]  # the final counts its latest grade only
    assert rows["Άβερωφ"]["cells"] == [50.0, 45.0]  # "Τελική εξέταση" counts as the Final Exam
    assert rows["Ελευθερίου"]["cells"] == [None, None]
    assert rows["Ζήσης"]["forfeited"] == [False, False]
    assert rows["Ζήσης"]["final_grade"] == 77.0


def test_category_totals_without_rules_use_the_grades_own_categories(client, scenario):
    sheet = _sheet(client, scenario["norules"]["id"], "categories")

    assert sheet["basis"] == "grades"
    assert [c["category_key"] for c in sheet["columns"]] == ["lab", "project"]  # Lab Work + Εργαστήριο
    assert all(c["weight"] is None for c in sheet["columns"])
    (row,) = sheet["rows"]
    assert row["cells"] == [80.0, 70.0]  # (60*1 + 90*2) / 3
    assert row["final_grade"] == 73.33  # no rules: the plain mean of 60, 90 and 70, weights aside
    assert row["grade_basis"] == "average"


def test_wrong_requests(client, scenario):
    course_id = scenario["math"]["id"]
    unknown = client.get(f"{BASE}/{course_id}", params={"kind": "assessment", "assessment": "final|nothing"})
    assert unknown.status_code == 404
    assert client.get(f"{BASE}/{course_id}", params={"kind": "assessment"}).status_code == 400
    assert client.get(f"{BASE}/{course_id}", params={"kind": "everything"}).status_code == 422
    assert client.get(f"{BASE}/999999/assessments").status_code == 404


def test_a_course_with_nobody_enrolled_has_empty_sheets(client):
    course = _create_course(client, "EMPTY")

    assert client.get(f"{BASE}/{course['id']}/assessments").json()["assessments"] == []
    matrix = _sheet(client, course["id"], "matrix")
    assert (matrix["rows"], matrix["columns"], matrix["summary"]["enrolled"]) == ([], [], 0)
    assert client.get(f"{BASE}/{course['id']}/export/pdf", params={"kind": "matrix"}).status_code == 200


def test_the_pdf_is_in_greek_with_the_students_in_order(client, scenario):
    course_id = scenario["math"]["id"]
    final = _assessments(client, course_id)[1]

    response = client.get(
        f"{BASE}/{course_id}/export/pdf", params={"kind": "assessment", "assessment": final["key"], "lang": "el"}
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/pdf"
    # The assessment is in the file name, in Latin letters.
    assert response.headers["content-disposition"].startswith(
        "attachment; filename=grade_sheet_MATH_assessment_Teliki_"
    )
    text = _pdf_text(response.content)
    assert "Κατάσταση βαθμολογίας" in text
    assert "Τελική Εξέταση" in text  # the category in the page's language
    assert text.index("Άβερωφ") < text.index("Ελευθερίου") < text.index("Ζήσης")
    assert "GS0002" in text  # the registration number
    assert "Υπογραφή" in text


@pytest.mark.parametrize("kind", ["matrix", "categories"])
def test_the_wide_sheets_print_too(client, scenario, kind):
    text = _pdf_text(_export(client, scenario["math"]["id"], "pdf", kind=kind))
    assert "Final grade" in text
    assert "77" in text
    assert "GS0001" in text  # the registration number tells two students of the same name apart


def test_the_excel_file_keeps_numbers_as_numbers(client, scenario):
    rows = _excel_rows(_export(client, scenario["math"]["id"], "excel", kind="matrix"))

    assert rows[1][0] == "Course: MATH - Course MATH"  # one readable cell per heading line
    header, body = _header_and_rows(rows)
    assert header == ("#", "Reg. no.", "Surname", "First name", "Άσκηση 1", "Τελική", "Final grade")
    zisis = body["Ζήσης"]
    assert zisis[:2] == (3, "GS0001")
    assert zisis[4:7] == (80.0, 75.0, 77.0)
    assert all(isinstance(value, (int, float)) for value in zisis[4:7])  # not "80.00%" text


def test_the_excel_tab_and_file_name(client, scenario):
    from openpyxl import load_workbook

    response = client.get(f"{BASE}/{scenario['math']['id']}/export/excel", params={"kind": "matrix", "lang": "el"})
    assert response.headers["content-disposition"].startswith("attachment; filename=grade_sheet_MATH_matrix_")
    assert load_workbook(BytesIO(response.content)).active.title == "Όλες οι αξιολογήσεις"


# ---------------------------------------------------------------------------
# Which grade is the latest, and what one assessment is
# ---------------------------------------------------------------------------


def test_the_latest_grade_is_the_latest_date_not_the_latest_entry(client):
    # The final grade takes an exam's latest date_submitted; the sheet must show that same grade
    # even when the earlier exam was entered afterwards.
    course = _create_course(client, "LATE", rules=[{"category": "Final Exam", "weight": 100.0}])
    s = _student(client, 31, "Πέτρου", "Άννα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 18, day=date(2026, 2, 10))  # the re-sit
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 6, day=date(2026, 2, 1))  # entered later

    (row,) = _sheet(client, course["id"], "matrix")["rows"]

    assert row["cells"] == [90.0]
    assert row["final_grade"] == 90.0


def test_an_undated_exam_grade_beside_a_dated_one_breaks_nothing(client):
    # A grade without date_submitted (an API client, a session import) next to a dated one used to
    # make the final grade raise TypeError ("1970-01-01" < a date): every sheet of the course and
    # the Analytics page answered 500. The undated grade now counts as the oldest.
    course = _create_course(client, "UNDATED", rules=[{"category": "Final Exam", "weight": 100.0}])
    s = _student(client, 32, "Σάββα", "Ελένη")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 14, day=date(2026, 2, 3))
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 4, dated=False)

    assert client.get(f"{BASE}/{course['id']}/assessments").status_code == 200
    (row,) = _sheet(client, course["id"], "matrix")["rows"]
    assert (row["cells"], row["final_grade"]) == ([70.0], 70.0)
    assert client.get(f"/api/v1/analytics/student/{s['id']}/overview").status_code == 200


def test_names_keep_their_symbols_and_a_shared_name_says_its_category(client):
    course = _create_course(client, "PROG")
    s = _student(client, 33, "Χριστοδούλου", "Μάριος")
    _enroll(client, course["id"], s["id"])
    for day, name, score in ((10, "C Project", 50), (20, "C++ Project", 70), (30, "C# Project", 90)):
        _grade(client, s["id"], course["id"], name, "Project", score, max_grade=100, day=date(2026, 1, day))
    _grade(client, s["id"], course["id"], "Άσκηση 1", "Lab Work", 12, day=date(2026, 2, 1))
    _grade(client, s["id"], course["id"], "Άσκηση 1", "Homework", 16, day=date(2026, 2, 2))

    found = _assessments(client, course["id"])

    assert [a["name"] for a in found] == ["C Project", "C++ Project", "C# Project", "Άσκηση 1", "Άσκηση 1"]
    assert [a["shared_name"] for a in found] == [False, False, False, True, True]
    header, _ = _header_and_rows(_excel_rows(_export(client, course["id"], "excel", kind="matrix")))
    assert header[4:9] == ("C Project", "C++ Project", "C# Project", "Άσκηση 1 (Lab Work)", "Άσκηση 1 (Homework)")

    # Five assessments, five file names.
    names = []
    for a in found:
        response = client.get(
            f"{BASE}/{course['id']}/export/pdf", params={"kind": "assessment", "assessment": a["key"]}
        )
        names.append(response.headers["content-disposition"].split("filename=")[1].rsplit("_", 1)[0])
    assert names == [
        "grade_sheet_PROG_assessment_C_Project",
        "grade_sheet_PROG_assessment_C_plus_plus_Project",
        "grade_sheet_PROG_assessment_C_sharp_Project",
        "grade_sheet_PROG_assessment_Askisi_1_Lab_Work",
        "grade_sheet_PROG_assessment_Askisi_1_Homework",
    ]


def test_two_rules_that_both_read_as_exams_keep_their_assessments_apart(client):
    # "Θεωρητική Εξέταση" and "Πρακτική Εξέταση" are two rules of the final grade: a "Τελική"
    # under each is two assessments, not one exam with a re-sit.
    rules = [{"category": "Θεωρητική Εξέταση", "weight": 50.0}, {"category": "Πρακτική Εξέταση", "weight": 50.0}]
    course = _create_course(client, "THEORY", rules=rules)
    s = _student(client, 36, "Νικολάου", "Άννα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Τελική", "Θεωρητική Εξέταση", 80, max_grade=100, day=date(2026, 6, 10))
    _grade(client, s["id"], course["id"], "Τελική", "Πρακτική Εξέταση", 40, max_grade=100, day=date(2026, 6, 12))

    found = _assessments(client, course["id"])

    assert [(a["name"], a["category"], a["shared_name"]) for a in found] == [
        ("Τελική", "Θεωρητική Εξέταση", True),
        ("Τελική", "Πρακτική Εξέταση", True),
    ]
    (row,) = _sheet(client, course["id"], "matrix")["rows"]
    assert (row["cells"], row["final_grade"]) == ([80.0, 40.0], 60.0)

    # Without rules, two categories that differ in a symbol stay two columns as well.
    other = _create_course(client, "LANGS")
    _enroll(client, other["id"], s["id"])
    _grade(client, s["id"], other["id"], "Project", "C++", 90, max_grade=100)
    _grade(client, s["id"], other["id"], "Project", "C#", 20, max_grade=100)
    sheet = _sheet(client, other["id"], "categories")
    assert [c["category"] for c in sheet["columns"]] == ["C#", "C++"]
    assert sheet["rows"][0]["cells"] == [20.0, 90.0]


def test_a_score_out_of_another_maximum_says_so(client):
    course = _create_course(client, "MAXES")
    a = _student(client, 34, "Αλεξίου", "Γιώργος")
    b = _student(client, 35, "Βασιλείου", "Κατερίνα")
    _enroll(client, course["id"], a["id"], b["id"])
    _grade(client, a["id"], course["id"], "Midterm", "Midterm Exam", 15, max_grade=20)
    _grade(client, b["id"], course["id"], "Midterm", "Midterm Exam", 75, max_grade=100)
    (midterm,) = _assessments(client, course["id"])

    text = _pdf_text(_export(client, course["id"], "pdf", kind="assessment", assessment=midterm["key"]))
    rows = _excel_rows(_export(client, course["id"], "excel", kind="assessment", assessment=midterm["key"]))

    assert "75 / 100" in text  # not "75" under "Out of 20"
    header, body = _header_and_rows(rows)
    assert header[4:7] == ("Score", "Out of", "%")
    assert (body["Αλεξίου"][4:7], body["Βασιλείου"][4:7]) == ((15.0, 20.0, 75.0), (75.0, 100.0, 75.0))


def test_surnames_sort_without_their_accents(client):
    # By code point "Έλληνας" and "Ωραιόπουλος" (accented capitals) would come before "Αθανασίου".
    course = _create_course(client, "SORT")
    ids = [_student(client, 40 + i, last, "Χ")["id"] for i, last in enumerate(("Ωραιόπουλος", "Έλληνας", "Αθανασίου"))]
    _enroll(client, course["id"], *ids)

    rows = _sheet(client, course["id"], "matrix")["rows"]

    assert _surnames(rows) == ["Αθανασίου", "Έλληνας", "Ωραιόπουλος"]


# ---------------------------------------------------------------------------
# What the final grade lost, and why
# ---------------------------------------------------------------------------


def test_only_the_cells_the_final_grade_zeroed_say_absences(client):
    # 5 absences of 42 periods: Class Participation is lost. The Attendance rule is not
    # Class Participation (the final grade counts it as the share of periods present), and its
    # column keeps its own name.
    rules = [
        {"category": "Class Participation", "weight": 10.0},
        {"category": "Attendance", "weight": 20.0},
        {"category": "Final Exam", "weight": 70.0},
    ]
    course = _create_course(client, "FORFEIT", rules=rules)
    s = _student(client, 50, "Δημητρίου", "Στέλλα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 80, max_grade=100)
    _attendance(client, s["id"], course["id"], *(["Absent"] * 5 + ["Present"] * 5))

    sheet = _sheet(client, course["id"], "categories")
    (row,) = sheet["rows"]
    assert row["cells"] == [0.0, 50.0, 80.0]
    assert row["forfeited"] == [True, False, False]
    assert row["final_grade"] == 66.0  # 0*0.1 + 50*0.2 + 80*0.7

    content = _export(client, course["id"], "excel", kind="categories")
    rows = _excel_rows(content)
    header, body = _header_and_rows(rows)
    assert header[4:7] == ("Class Participation (10%)", "Attendance (20%)", "Final Exam (70%)")
    # A number for Excel's own sums, shown with the reason.
    assert body["Δημητρίου"][4:8] == (0, 50.0, 80.0, 66.0)
    from openpyxl import load_workbook

    ws = load_workbook(BytesIO(content)).active
    zeroed = next(row[4] for row in ws.iter_rows() if row[2].value == "Δημητρίου")
    assert zeroed.number_format == '0 "(absences)"'
    notes = [str(r[0]) for r in rows if isinstance(r[0], str)]
    assert '"0 (absences)": over the Class Participation absence limit, the category counts 0.' in notes
    assert not any("‡" in note for note in notes)  # no Excel cell carries the mark

    # The PDF's narrow column takes a mark, explained under the table.
    text = _pdf_text(_export(client, course["id"], "pdf", kind="categories"))
    assert "0 ‡" in text
    assert "‡ Over the Class Participation absence limit: the category counts 0." in text


def test_a_course_without_rules_never_says_absences_or_rules(client):
    course = _create_course(client, "NOFORFEIT")
    s = _student(client, 51, "Ευαγγέλου", "Νίκη")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Participation", "Class Participation", 90, max_grade=100)
    _grade(client, s["id"], course["id"], "Lab", "Lab Work", 50, max_grade=100)
    _attendance(client, s["id"], course["id"], *(["Absent"] * 5))

    rows = _excel_rows(_export(client, course["id"], "excel", kind="categories"))
    text = _pdf_text(_export(client, course["id"], "pdf", kind="matrix"))

    _, body = _header_and_rows(rows)
    assert body["Ευαγγέλου"][4:7] == (50.0, 90.0, 70.0)  # Lab Work, Class Participation, final
    notes = " ".join(str(r[0]) for r in rows if r[0])
    assert "the mean of the student's grades" in notes
    assert "evaluation rules, scaled" not in notes
    assert "evaluation rules, scaled" not in text


def test_a_student_over_the_absence_limit_fails_on_every_count(client):
    course = _create_course(client, "OVER", rules=[{"category": "Homework", "weight": 100.0}])
    a = _student(client, 52, "Αντωνίου", "Λία")
    b = _student(client, 53, "Γεωργίου", "Τάσος")
    _enroll(client, course["id"], a["id"], b["id"])
    _grade(client, a["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _grade(client, b["id"], course["id"], "HW", "Homework", 70, max_grade=100)
    _attendance(client, a["id"], course["id"], *(["Absent"] * 13))  # more than 12 of 42

    sheet = _sheet(client, course["id"], "matrix")
    assert [r["result"] for r in sheet["rows"]] == ["failed_absences", "passed"]
    assert sheet["summary"]["passed"] == 1
    assert sheet["summary"]["failed"] == 1
    assert sheet["summary"]["failed_absences"] == 1

    text = _pdf_text(_export(client, course["id"], "pdf", kind="matrix"))
    assert "80 *" in text
    assert "Passed 1, failed 1 (1 of them over the absence limit)" in text

    rows = _excel_rows(_export(client, course["id"], "excel", kind="matrix"))
    header, body = _header_and_rows(rows)
    assert header[-1] == "Absence limit"
    assert (body["Αντωνίου"][-1], body["Γεωργίου"][-1]) == ("over the limit", None)
    notes = [str(r[0]) for r in rows if isinstance(r[0], str)]
    assert 'Absence limit "over the limit": the course is failed whatever the grade.' in notes
    assert not any(note.startswith("*") for note in notes)  # no Excel cell carries the mark


def test_a_mean_shown_as_50_passes(client):
    # 5/15 and 10/15: 33.33 % and 66.67 %, a mean a hair under 50 in floating point, shown as 50.
    course = _create_course(client, "FIFTY")
    s = _student(client, 37, "Ξενοφώντος", "Λένα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Quiz 1", "Quizzes", 5, max_grade=15)
    _grade(client, s["id"], course["id"], "Quiz 2", "Quizzes", 10, max_grade=15)

    sheet = _sheet(client, course["id"], "matrix")

    (row,) = sheet["rows"]
    assert (row["final_grade"], row["result"]) == (50.0, "passed")
    assert (sheet["summary"]["passed"], sheet["summary"]["failed"]) == (1, 0)
    # The Analytics page agrees.
    overview = client.get(f"/api/v1/analytics/student/{s['id']}/overview").json()
    (fifty,) = [c for c in overview["courses"] if c["course_code"] == "FIFTY"]
    assert fifty["passing"] is True


def test_final_grades_from_ratings_alone_are_not_called_nothing_graded(client):
    # Early in a semester only participation may be rated: the rules already give a final grade.
    rules = [{"category": "Class Participation", "weight": 30.0}, {"category": "Final Exam", "weight": 70.0}]
    course = _create_course(client, "RATE", rules=rules)
    s = _student(client, 38, "Ορφανίδης", "Πέτρος")
    _enroll(client, course["id"], s["id"])
    assert _create_dp(client, s["id"], course["id"], "Class Participation", 8, 10).status_code in (200, 201)

    text = _pdf_text(_export(client, course["id"], "pdf", kind="matrix"))

    assert "No assessment has been graded yet: the final grades so far come from the daily ratings." in text
    assert "Nothing has been graded" not in text
    assert "80" in text


def test_the_deductions_never_exceed_what_the_final_grade_had(client):
    # A penalty of 5 per absence, 2 absences, a grade of 3: the final grade stops at 0, so it
    # lost 3 points, not 10.
    course = _create_course(client, "FLOOR", rules=[{"category": "Homework", "weight": 100.0}], absence_penalty=5.0)
    s = _student(client, 39, "Παύλου", "Ηρώ")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "HW", "Homework", 3, max_grade=100)
    _attendance(client, s["id"], course["id"], "Absent", "Absent")

    (row,) = _sheet(client, course["id"], "categories")["rows"]

    assert (row["cells"], row["absence_deduction"], row["final_grade"]) == ([3.0], 3.0, 0.0)
    header, body = _header_and_rows(_excel_rows(_export(client, course["id"], "excel", kind="categories")))
    assert header[5:7] == ("Deductions", "Final grade")
    assert body["Παύλου"][5:7] == (-3.0, 0)


def test_a_long_double_name_breaks_at_its_hyphen(client):
    course = _create_course(client, "NAMES")
    s = _student(client, 46, "Παπαδοπούλου-Χατζηγεωργίου", "Αικατερίνη-Μαρία")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Quiz", "Quizzes", 15)

    for kind, params in (("matrix", {}), ("categories", {})):
        text = _pdf_text(_export(client, course["id"], "pdf", kind=kind, **params))
        # Whole words on each line, never "Παπαδοπούλου-Χα" / "τζηγεωργίου" or "Αικατερίνη-Μ" /
        # "αρία". (Text extraction may drop the hyphen at a line end, so the words are checked.)
        assert "Χατζηγεωργίου" in text
        assert "Μαρία" in text


def test_the_deductions_close_the_gap_to_the_final_grade(client):
    # Class Participation 20 / Homework 80: 0.2*90 + 0.8*80 = 82. "No participation" ticked on 4
    # of 5 attended days takes 60 % of each day's slice: 4 * 0.6 * 20 / 5 = 9.6. Final 72.4.
    rules = [{"category": "Class Participation", "weight": 20.0}, {"category": "Homework", "weight": 80.0}]
    course = _create_course(client, "DEDUCT", rules=rules)
    s = _student(client, 54, "Ιωάννου", "Ραφαέλα")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    assert _create_dp(client, s["id"], course["id"], "Class Participation", 9, 10).status_code in (200, 201)
    for days_ago in range(1, 5):
        ticked = _create_dp(client, s["id"], course["id"], "No participation", 0, 10, days_ago=days_ago)
        assert ticked.status_code in (200, 201), ticked.text
    _attendance(client, s["id"], course["id"], "Present")

    (row,) = _sheet(client, course["id"], "categories")["rows"]
    assert row["cells"] == [90.0, 80.0]
    assert (row["participation_deduction"], row["final_grade"]) == (9.6, 72.4)

    header, body = _header_and_rows(_excel_rows(_export(client, course["id"], "excel", kind="categories")))
    assert header[6:8] == ("Deductions", "Final grade")
    assert body["Ιωάννου"][6:8] == (-9.6, 72.4)


def test_two_rules_of_one_category_keep_their_own_weights(client):
    rules = [
        {"category": "Midterm Exam", "weight": 15.0},
        {"category": "Midterm Exam", "weight": 25.0},
        {"category": "Final Exam", "weight": 60.0},
    ]
    course = _create_course(client, "TWOMIDS", rules=rules)
    s = _student(client, 55, "Κωνσταντίνου", "Άρης")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Midterm", "Midterm Exam", 50, max_grade=100)
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 80, max_grade=100)

    sheet = _sheet(client, course["id"], "categories")

    assert [(c["key"], c["weight"]) for c in sheet["columns"]] == [("rule:0", 15.0), ("rule:1", 25.0), ("rule:2", 60.0)]
    assert sheet["rows"][0]["final_grade"] == 68.0  # 0.15*50 + 0.25*50 + 0.6*80


def test_a_matrix_wider_than_the_page_prints_in_column_groups(client):
    course = _create_course(client, "WIDE")
    a = _student(client, 56, "Λαμπρου", "Ηλίας")
    b = _student(client, 57, "Μιχαήλ", "Ζωή")
    _enroll(client, course["id"], a["id"], b["id"])
    for n in range(1, 26):
        _grade(client, a["id"], course["id"], f"Lab {n:02d}", "Lab Work", 15, day=date(2026, 1, 1) + timedelta(days=n))
    _grade(client, b["id"], course["id"], "Lab 01", "Lab Work", 10, day=date(2026, 1, 2))

    content = _export(client, course["id"], "pdf", kind="matrix")

    from pypdf import PdfReader

    found = []
    for page in PdfReader(BytesIO(content)).pages:
        width = float(page.mediabox.width)

        def visit(text, cm, tm, font_dict, font_size, width=width):
            if text.strip():
                found.append((cm[0] * tm[4] + cm[2] * tm[5] + cm[4], width, text))

        page.extract_text(visitor_text=visit)
    assert found
    off_page = [(round(x), text) for x, width, text in found if not 30 <= x <= width - 30]
    assert off_page == []
    text = _pdf_text(content)
    assert "Columns 1-9 of 25" in text and "Columns 19-25 of 25" in text
    # Every group repeats the students and ends with the final grade (its averages row too).
    assert text.count("Λαμπρου") == 3
    assert text.count("Average") == 3


# ---------------------------------------------------------------------------
# Who prints it
# ---------------------------------------------------------------------------


@pytest.fixture
def strict_auth(monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)


def _teacher_headers(db) -> dict:
    from backend.models import User
    from backend.routers.routers_auth import create_access_token
    from backend.tests.conftest import started_installation

    db.add(
        User(
            email="teacher@example.com",
            hashed_password="x",
            role="teacher",
            is_active=True,
            full_name="Μαρία Παπαδοπούλου",
        )
    )
    db.commit()
    started_installation(db)
    return {"Authorization": f"Bearer {create_access_token(subject='teacher@example.com', role='teacher')}"}


@pytest.mark.auth_required
def test_a_teacher_can_print_a_sheet_with_their_name_on_it(client, db, scenario, strict_auth):
    course_id = scenario["math"]["id"]
    assert client.get(f"{BASE}/{course_id}", params={"kind": "matrix"}).status_code == 401

    headers = _teacher_headers(db)
    response = client.get(
        f"{BASE}/{course_id}/export/pdf", params={"kind": "categories", "lang": "el"}, headers=headers
    )

    assert response.status_code == 200, response.text
    assert "Μαρία Παπαδοπούλου" in _pdf_text(response.content)


@pytest.mark.auth_required
def test_the_teacher_is_looked_up_off_the_event_loop(client, db, scenario, strict_auth, monkeypatch):
    # The account read blocks; on the event loop it would hold every other request meanwhile.
    import asyncio

    from backend.security import current_user

    where: list[str] = []
    original = current_user.resolve_current_user

    def spy(*args, **kwargs):
        try:
            asyncio.get_running_loop()
            where.append("event loop")
        except RuntimeError:
            where.append("worker thread")
        return original(*args, **kwargs)

    monkeypatch.setattr(current_user, "resolve_current_user", spy)
    headers = _teacher_headers(db)

    response = client.get(f"{BASE}/{scenario['math']['id']}/export/excel", params={"kind": "matrix"}, headers=headers)

    assert response.status_code == 200, response.text
    assert where and "event loop" not in where
