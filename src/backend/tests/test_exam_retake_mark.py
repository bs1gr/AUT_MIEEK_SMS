"""Plan todo 80: a retake is a Midterm or Final Exam grade the teacher marks as one.

The owner, 2026-11-24: "teacher shall have the option to select the date exam was taken and also
to select a retake exam as an overwrite of the first final exam. After retake exam the first final
exam should not count in grading and the retake exam replaces it at the final grading. The same
should happen with a midterm retake". And from 2026-11-23, kept: "in the second effort, iff the
exam grade is under 50, is considered a fail" (the final exam only; the course failed, the grade
still worked out and shown, as with the ΜΙΕΕΚ absence limit).

A missed first sitting has no grade recorded, and a grade's date was the day it was typed in, so
neither the number of grades nor their dates can tell a retake (the "by date" build of the night
before misread an on-time final typed in late as a failed retake). The mark is `grades.is_retake`
(migration c7d4e2a9f1b6); without it every grade counts as it did since todo 77 point 2: of an
exam, the latest sitting.
"""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace as N

import pytest
from sqlalchemy import create_engine, inspect, text

from backend.services.analytics_service import AnalyticsService
from backend.tests.test_analytics_router import _create_course, _post_with_csrf
from backend.tests.test_grade_sheets import (
    _attendance,
    _enroll,
    _excel_rows,
    _export,
    _header_and_rows,
    _pdf_text,
    _sheet,
    _student,
)

GRADES = "/api/v1/grades/"
FIRST = date(2026, 1, 30)
LATER = date(2026, 2, 10)
RULES = [{"category": "Homework", "weight": 40.0}, {"category": "Final Exam", "weight": 60.0}]
EXAM_RULES = [{"category": "Midterm Exam", "weight": 40.0}, {"category": "Final Exam", "weight": 60.0}]
BEFORE_REVISION = "f4c2a8d6e1b3"
REVISION = "c7d4e2a9f1b6"


def _grade(client, sid, cid, name, category, grade, *, day=FIRST, retake=False, max_grade=20.0, expect=201):
    payload = {
        "student_id": sid,
        "course_id": cid,
        "assignment_name": name,
        "category": category,
        "grade": grade,
        "max_grade": max_grade,
        "date_submitted": day.isoformat() if day else None,
    }
    if retake:
        payload["is_retake"] = True
    response = _post_with_csrf(client, GRADES, payload)
    assert response.status_code == expect, response.text
    return response.json()


def _final_grade(client, student_id: int, course_id: int) -> dict:
    response = client.get(f"/api/v1/analytics/student/{student_id}/course/{course_id}/final-grade")
    assert response.status_code == 200, response.text
    return response.json()


def _overview_row(client, student_id: int, code: str) -> dict:
    response = client.get(f"/api/v1/analytics/student/{student_id}/overview")
    assert response.status_code == 200, response.text
    return next(c for c in response.json()["courses"] if c["course_code"] == code)


def _flat(text_: str) -> str:
    """PDF text with its line breaks as spaces: a long note wraps wherever the page ends."""
    return " ".join(text_.split())


def _setup(client, code: str, number: int, rules=RULES) -> tuple[dict, dict]:
    course = _create_course(client, code, rules=rules)
    student = _student(client, number, "Αντωνίου", "Λία")
    _enroll(client, course["id"], student["id"])
    return course, student


# ---------------------------------------------------------------------------
# Which sitting counts
# ---------------------------------------------------------------------------


def _g(i, category, score, day=FIRST, retake=False):
    return N(id=i, category=category, grade=score, max_grade=20.0, date_submitted=day, is_retake=retake)


def test_without_a_mark_the_latest_sitting_counts_as_before():
    first, second = _g(1, "Final Exam", 16), _g(2, "Final Exam", 8, day=LATER)
    assert AnalyticsService.counted_grades([second, first]) == [second]
    assert AnalyticsService.final_exam_retake([first, second]) is None  # no mark, no retake


def test_a_retake_replaces_the_earlier_sitting_whatever_the_dates():
    # Typed in with an earlier date than the first sitting: the mark decides, not the day.
    first, retake = _g(1, "Final Exam", 16, day=LATER), _g(2, "Τελική Εξέταση", 8, day=FIRST, retake=True)
    assert AnalyticsService.counted_grades([first, retake]) == [retake]


def test_of_two_retakes_the_latest_counts_and_other_grades_all_count():
    hw = _g(1, "Homework", 10)
    early, late = _g(2, "Final", 6, day=FIRST, retake=True), _g(3, "Final", 12, day=LATER, retake=True)
    assert AnalyticsService.counted_grades([late, hw, early]) == [hw, late]


def test_the_midterm_and_the_final_are_replaced_apart():
    mid1, mid2 = _g(1, "Midterm Exam", 4), _g(2, "Ενδιάμεση Εξέταση", 14, day=LATER, retake=True)
    final = _g(3, "Final Exam", 15)
    assert sorted(g.id for g in AnalyticsService.counted_grades([mid1, mid2, final])) == [2, 3]
    assert AnalyticsService.final_exam_retake([mid1, mid2, final]) is None  # a midterm retake fails nothing


def test_the_retake_figures():
    assert AnalyticsService.final_exam_retake([_g(1, "ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ", 9, day=LATER, retake=True)]) == {
        "date": "2026-02-10",
        "percentage": 45.0,
        "failed": True,
    }
    assert AnalyticsService.final_exam_retake([_g(1, "Final Exam", 10, retake=True)])["failed"] is False  # 50
    assert AnalyticsService.final_exam_retake([_g(1, "Final Exam", 9.9, retake=True)])["failed"] is True  # 49.5
    assert AnalyticsService.final_exam_retake([_g(1, "Final Exam", 9, day=None, retake=True)])["date"] is None
    # A first sitting marked after it is the one that counts no longer: the retake is reported.
    assert AnalyticsService.final_exam_retake([_g(2, "Final Exam", 19, day=LATER), _g(1, "Final", 9, retake=True)])[
        "percentage"
    ] == 45.0


# ---------------------------------------------------------------------------
# The final grade
# ---------------------------------------------------------------------------


def test_a_final_retake_under_50_fails_the_course_and_the_final_grade_stays(client):
    course, s = _setup(client, "RTK1", 801)
    _grade(client, s["id"], course["id"], "Άσκηση 1", "Homework", 18)  # 90 %
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 19)  # 95 %, the first sitting
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 9, day=LATER, retake=True)  # 45 %

    data = _final_grade(client, s["id"], course["id"])

    # The first sitting no longer counts: 0.4 x 90 + 0.6 x 45 = 63, a pass on the figure, which
    # stays as worked out; the retake under 50 fails the course.
    assert data["final_grade"] == 63.0
    assert data["final_exam_retake"] == {"date": "2026-02-10", "percentage": 45.0, "failed": True}
    row = _overview_row(client, s["id"], "RTK1")
    assert (row["final_grade"], row["passing"]) == (63.0, False)
    assert row["final_exam_retake"]["failed"] is True


def test_a_missed_first_sitting_has_no_grade_and_the_retake_alone_counts(client):
    course, s = _setup(client, "RTK2", 802)
    _grade(client, s["id"], course["id"], "Άσκηση 1", "Homework", 18)
    _grade(client, s["id"], course["id"], "Τελική", "Τελική Εξέταση", 9, day=LATER, retake=True)

    data = _final_grade(client, s["id"], course["id"])

    assert (data["final_grade"], data["final_exam_retake"]["failed"]) == (63.0, True)


def test_a_retake_fails_a_course_without_rules_too(client):
    course, s = _setup(client, "RTK3", 803, rules=None)
    _grade(client, s["id"], course["id"], "HW", "Homework", 20)  # 100 %
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 18)  # 90 %, replaced
    _grade(client, s["id"], course["id"], "Final", "Final Exam", 9, day=LATER, retake=True)  # 45 %

    data = _final_grade(client, s["id"], course["id"])

    assert (data["grade_basis"], data["final_grade"]) == ("average", 72.5)
    assert data["final_exam_retake"]["failed"] is True
    assert _overview_row(client, s["id"], "RTK3")["passing"] is False


@pytest.mark.parametrize(("score", "failed"), [(10.0, False), (16.0, False), (9.9, True)])
def test_a_retake_of_50_or_more_passes(client, score, failed):
    course, s = _setup(client, "RTK4", 804)
    _grade(client, s["id"], course["id"], "HW", "Homework", 18)
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", score, day=LATER, retake=True)

    retake = _final_grade(client, s["id"], course["id"])["final_exam_retake"]

    assert retake == {"date": "2026-02-10", "percentage": round(score / 20 * 100, 2), "failed": failed}
    assert _overview_row(client, s["id"], "RTK4")["passing"] is not failed


def test_an_unmarked_second_sitting_is_no_retake_and_fails_nothing(client):
    course, s = _setup(client, "RTK5", 805)
    _grade(client, s["id"], course["id"], "HW", "Homework", 20)
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 16)
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 9, day=LATER)  # 45 %, the latest

    data = _final_grade(client, s["id"], course["id"])

    # The latest sitting counts, as since todo 77 point 2: 0.4 x 100 + 0.6 x 45 = 67, passed.
    assert (data["final_grade"], data["final_exam_retake"]) == (67.0, None)
    assert _overview_row(client, s["id"], "RTK5")["passing"] is True


def test_a_midterm_retake_replaces_the_first_midterm_and_fails_nothing(client):
    course, s = _setup(client, "RTK6", 806, rules=EXAM_RULES)
    _grade(client, s["id"], course["id"], "Ενδιάμεση", "Midterm Exam", 4, day=LATER)  # 20 %, dated later
    _grade(client, s["id"], course["id"], "Ενδιάμεση", "Midterm Exam", 6, day=FIRST, retake=True)  # 30 %
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 16)  # 80 %

    data = _final_grade(client, s["id"], course["id"])

    # 0.4 x 30 + 0.6 x 80 = 60: the retake counts, not the later-dated first sitting; under 50 a
    # midterm retake fails nothing.
    assert (data["final_grade"], data["final_exam_retake"]) == (60.0, None)


# ---------------------------------------------------------------------------
# The API
# ---------------------------------------------------------------------------


def test_the_mark_is_saved_returned_and_cleared(client):
    course, s = _setup(client, "RTKA", 811)
    created = _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 9, day=LATER, retake=True)
    assert (created["is_retake"], created["date_submitted"]) == (True, "2026-02-10")
    plain = _grade(client, s["id"], course["id"], "Άσκηση", "Homework", 9)
    assert plain["is_retake"] is False

    cleared = client.put(f"{GRADES}{created['id']}", json={"is_retake": False})
    assert cleared.status_code == 200 and cleared.json()["is_retake"] is False
    marked = client.put(f"{GRADES}{created['id']}", json={"is_retake": True, "date_submitted": "2026-02-12"})
    assert marked.status_code == 200
    assert (marked.json()["is_retake"], marked.json()["date_submitted"]) == (True, "2026-02-12")
    # Another field saved alone keeps the mark.
    assert client.put(f"{GRADES}{created['id']}", json={"grade": 10}).json()["is_retake"] is True
    assert client.put(f"{GRADES}{created['id']}", json={"is_retake": None}).status_code == 422


@pytest.mark.parametrize("category", ["Homework", "Τελική Εργασία", "Final Quiz", None])
def test_only_an_exam_grade_can_be_a_retake(client, category):
    course, s = _setup(client, "RTKB", 812)
    _grade(client, s["id"], course["id"], "Εργασία", category, 9, retake=True, expect=422)
    plain = _grade(client, s["id"], course["id"], "Εργασία", category, 9)
    assert client.put(f"{GRADES}{plain['id']}", json={"is_retake": True}).status_code == 422


def test_a_retake_moved_out_of_the_exams_is_no_retake_any_more(client):
    course, s = _setup(client, "RTKC", 813)
    grade = _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 9, retake=True)

    moved = client.put(f"{GRADES}{grade['id']}", json={"category": "Homework"})

    assert moved.status_code == 200
    assert (moved.json()["category"], moved.json()["is_retake"]) == ("Homework", False)
    # Moved and marked in one edit: refused, nothing changes.
    again = _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 9, retake=True)
    assert client.put(f"{GRADES}{again['id']}", json={"category": "Homework", "is_retake": True}).status_code == 422
    assert client.get(f"{GRADES}{again['id']}").json()["category"] == "Final Exam"


def test_the_audit_entry_names_the_mark(client, db):
    from backend.models import AuditLog

    course, s = _setup(client, "RTKD", 814)
    grade = _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 9)
    assert client.put(f"{GRADES}{grade['id']}", json={"is_retake": True}).status_code == 200

    db.expire_all()
    entry = db.query(AuditLog).filter(AuditLog.resource == "grade", AuditLog.action == "update").one()
    assert (entry.old_values["is_retake"], entry.new_values["is_retake"]) == (False, True)


# ---------------------------------------------------------------------------
# The grade sheets
# ---------------------------------------------------------------------------


@pytest.fixture
def sheet_course(client):
    """Αντωνίου fails on the retake (final grade 63), Βασιλείου passes on a first sitting (75)."""
    course = _create_course(client, "RTKS", rules=RULES)
    a = _student(client, 821, "Αντωνίου", "Λία")
    b = _student(client, 822, "Βασιλείου", "Τάσος")
    _enroll(client, course["id"], a["id"], b["id"])
    _grade(client, a["id"], course["id"], "Άσκηση 1", "Homework", 18)
    _grade(client, a["id"], course["id"], "Τελική", "Final Exam", 19)
    _grade(client, a["id"], course["id"], "Τελική", "Final Exam", 9, day=LATER, retake=True)
    _grade(client, b["id"], course["id"], "Άσκηση 1", "Homework", 15)
    _grade(client, b["id"], course["id"], "Τελική", "Final Exam", 15)
    return course


@pytest.mark.parametrize("kind", ["matrix", "categories"])
def test_the_grade_sheets_fail_a_retake_under_50_whatever_the_grade(client, sheet_course, kind):
    sheet = _sheet(client, sheet_course["id"], kind)

    rows = {r["student"]["last_name"]: r for r in sheet["rows"]}
    assert (rows["Αντωνίου"]["final_grade"], rows["Αντωνίου"]["result"]) == (63.0, "failed_retake")
    assert rows["Αντωνίου"]["final_exam_retake"] == {"date": "2026-02-10", "percentage": 45.0, "failed": True}
    assert (rows["Βασιλείου"]["result"], rows["Βασιλείου"]["final_exam_retake"]) == ("passed", None)
    assert sheet["summary"] == {
        "enrolled": 2,
        "final_average": 69.0,
        "passed": 1,
        "failed": 1,
        "failed_absences": 0,
        "failed_retake": 1,
        "no_grade": 0,
    }


def test_the_pdf_marks_the_retake_and_says_why_in_both_languages(client, sheet_course):
    english = _flat(_pdf_text(_export(client, sheet_course["id"], "pdf", kind="matrix")))
    assert "63 §" in english
    assert "Passed 1, failed 1 (1 of them on a final exam retake under 50), no grade yet 0." in english
    assert "§ Final exam retake under 50: the course is failed whatever the grade." in english
    assert "over the absence limit" not in english

    greek = _flat(_pdf_text(_export(client, sheet_course["id"], "pdf", kind="categories", lang="el")))
    assert "63 §" in greek
    assert "αποτυχόντες 1 (εκ των οποίων 1 λόγω επαναληπτικής τελικής εξέτασης κάτω από 50)" in greek
    assert "§ Επαναληπτική τελική εξέταση κάτω από 50: το μάθημα δεν περνά, όποιος κι αν είναι ο βαθμός." in greek


def test_the_excel_file_says_it_in_a_column_of_its_own(client, sheet_course):
    rows = _excel_rows(_export(client, sheet_course["id"], "excel", kind="matrix"))
    header, body = _header_and_rows(rows)
    assert header[-1] == "Final exam retake"
    assert (body["Αντωνίου"][-1], body["Βασιλείου"][-1]) == ("under 50", None)
    assert body["Αντωνίου"][-2] == 63  # the final grade stays a number
    notes = [str(r[0]) for r in rows if isinstance(r[0], str)]
    assert 'Final exam retake "under 50": the course is failed whatever the grade.' in notes
    assert not any(note.startswith("§") for note in notes)  # no Excel cell carries the mark

    greek = _excel_rows(_export(client, sheet_course["id"], "excel", kind="matrix", lang="el"))
    header, body = _header_and_rows([tuple("#" if c == "Α/Α" else c for c in r) for r in greek])
    assert header[-1] == "Επαναληπτική τελική εξέταση"
    assert body["Αντωνίου"][-1] == "κάτω από 50"


@pytest.mark.parametrize("kind", ["matrix", "categories"])
def test_the_final_exam_column_shows_the_retake_not_the_first_sitting(client, sheet_course, kind):
    sheet = _sheet(client, sheet_course["id"], kind)
    final_column = next(i for i, c in enumerate(sheet["columns"]) if c["category_key"] == "final")
    cells = {r["student"]["last_name"]: r["cells"][final_column] for r in sheet["rows"]}
    # Αντωνίου sat it at 95 % and retook it at 45 %: the retake replaced the first sitting.
    assert cells == {"Αντωνίου": 45.0, "Βασιλείου": 75.0}


def test_the_absence_limit_and_the_retake_are_counted_apart(client):
    course = _create_course(client, "RTKT", rules=RULES)
    over = _student(client, 831, "Αντωνίου", "Λία")  # over the absence limit, retake under 50 too
    retake = _student(client, 832, "Βασιλείου", "Τάσος")
    passed = _student(client, 833, "Γεωργίου", "Άννα")
    _enroll(client, course["id"], over["id"], retake["id"], passed["id"])
    for s in (over, retake, passed):
        _grade(client, s["id"], course["id"], "Άσκηση 1", "Homework", 18)
    _grade(client, over["id"], course["id"], "Τελική", "Final Exam", 9, day=LATER, retake=True)
    _grade(client, retake["id"], course["id"], "Τελική", "Final Exam", 9, day=LATER, retake=True)
    _grade(client, passed["id"], course["id"], "Τελική", "Final Exam", 15, day=LATER, retake=True)  # 75
    _attendance(client, over["id"], course["id"], *(["Absent"] * 13))  # more than 12 of 42

    sheet = _sheet(client, course["id"], "matrix")

    # One result each: the absence limit first, as it applies whatever the grades.
    assert [r["result"] for r in sheet["rows"]] == ["failed_absences", "failed_retake", "passed"]
    summary = sheet["summary"]
    assert (summary["passed"], summary["failed"], summary["failed_absences"], summary["failed_retake"]) == (1, 2, 1, 1)
    text_ = _flat(_pdf_text(_export(client, course["id"], "pdf", kind="matrix")))
    assert "63 *" in text_ and "63 §" in text_
    assert "failed 2 (1 of them over the absence limit, 1 on a final exam retake under 50)" in text_
    greek = _flat(_pdf_text(_export(client, course["id"], "pdf", kind="matrix", lang="el")))
    assert (
        "αποτυχόντες 2 (εκ των οποίων 1 λόγω ορίου απουσιών και 1 λόγω επαναληπτικής τελικής εξέτασης κάτω από 50)"
        in greek
    )


def test_a_mixed_sheet_keeps_both_marks_on_one_line(client):
    # Βασιλείου has a Final Exam grade only, which no rule of this course takes: the final grade is
    # the mean of the grades (†), and the retake under 50 fails the course (§), in the 18 mm column.
    course = _create_course(client, "RTKM", rules=[{"category": "Homework", "weight": 100.0}])
    a = _student(client, 841, "Αντωνίου", "Λία")
    b = _student(client, 842, "Βασιλείου", "Τάσος")
    _enroll(client, course["id"], a["id"], b["id"])
    _grade(client, a["id"], course["id"], "Άσκηση 1", "Homework", 18)
    _grade(client, b["id"], course["id"], "Τελική", "Final Exam", 9.5, day=LATER, retake=True)  # 47.5 %

    for lang in ("en", "el"):
        lines = _pdf_text(_export(client, course["id"], "pdf", kind="matrix", lang=lang)).splitlines()
        assert any("47.5 † §" in line for line in lines), lang


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


def test_analytics_counts_the_retake_as_a_fail(client, sheet_course):
    overview = client.get("/api/v1/analytics/overview", params={"course_id": sheet_course["id"]})
    assert overview.status_code == 200, overview.text
    data = overview.json()

    (course_row,) = data["courses"]
    assert (course_row["graded"], course_row["passing"], course_row["failing"]) == (2, 1, 1)
    assert data["summary"]["pass_rate"] == 50.0
    students = {r["name"]: r for r in data["students"]}
    assert students["Λία Αντωνίου"]["failing_courses"] == ["Course RTKS"]
    assert students["Λία Αντωνίου"]["at_risk"] is True
    assert students["Τάσος Βασιλείου"]["failing_courses"] == []


def test_the_student_view_counts_it_too(client, sheet_course):
    student = next(r for r in _sheet(client, sheet_course["id"], "matrix")["rows"] if r["result"] == "failed_retake")
    response = client.get(f"/api/v1/analytics/student/{student['student']['id']}/overview")
    assert response.status_code == 200, response.text
    summary = response.json()["summary"]
    assert (summary["passing"], summary["failing"], summary["at_risk"]) == (0, 1, True)


# ---------------------------------------------------------------------------
# A semester file and the grades file import
# ---------------------------------------------------------------------------


def _session_results() -> dict:
    return {"summary": {"grades": {"created": 0, "updated": 0, "skipped": 0, "errors": []}}}


def test_a_semester_file_keeps_the_retake_beside_the_sitting_it_replaces(client, db):
    from backend.models import Grade
    from backend.routers.routers_sessions import _import_grades
    from backend.services.session_data_service import serialize_grade

    course, s = _setup(client, "RTKX", 851)
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 19)
    _grade(client, s["id"], course["id"], "Τελική", "Final Exam", 9, day=LATER, retake=True)
    db.expire_all()
    exported = [serialize_grade(g) for g in db.query(Grade).filter(Grade.student_id == s["id"]).order_by(Grade.id)]
    assert [g["is_retake"] for g in exported] == [False, True]

    # Back in as an update: two grades stay two, each updated by its own row.
    exported[1]["grade"] = 8
    results = _session_results()
    _import_grades(db, exported, "update", results)
    db.flush()
    assert results["summary"]["grades"]["updated"] == 2 and results["summary"]["grades"]["errors"] == []
    stored = db.query(Grade).filter(Grade.student_id == s["id"]).order_by(Grade.id).all()
    assert [(g.grade, g.is_retake) for g in stored] == [(19.0, False), (8.0, True)]

    # A file from before the mark has no such field: its grades are no retakes.
    old_row = {**exported[0], "assignment_name": "Παλιά", "is_retake": None}
    old_row.pop("is_retake")
    _import_grades(db, [old_row], "skip", results)
    db.flush()
    assert db.query(Grade).filter(Grade.assignment_name == "Παλιά").one().is_retake is False


def test_a_semester_file_cannot_mark_another_grade_a_retake(client, db):
    from backend.routers.routers_sessions import _import_grades

    course, s = _setup(client, "RTKY", 852)
    row = {"student_id_ref": s["student_id"], "course_code_ref": "RTKY", "assignment_name": "Εργασία",
           "category": "Homework", "grade": 9, "max_grade": 20, "is_retake": True}  # fmt: skip
    results = _session_results()

    _import_grades(db, [row], "skip", results)

    assert results["summary"]["grades"]["created"] == 0
    assert results["summary"]["grades"]["errors"] == ["Grade #1: only a Midterm or Final Exam grade can be a retake"]


def _import_rows(db, rows):
    import pandas as pd

    from backend.services.import_export_service import ImportExportService

    frame = pd.DataFrame(rows)
    service = ImportExportService()
    checked = service._validate_data(frame, "grades", db)
    if not checked["errors"]:
        service._import_grades(db, frame)
        db.commit()
    return checked


def test_the_grades_file_takes_the_exam_date_and_the_mark(client, db):
    from backend.models import Grade

    course, s = _setup(client, "RTKI", 861)
    row = {"student_id": s["student_id"], "course_code": "RTKI", "max_grade": 20}

    checked = _import_rows(
        db,
        [
            {**row, "assignment": "Άσκηση 1", "category": "Homework", "grade": 18},
            {**row, "assignment": "Τελική", "category": "Final Exam", "grade": 19, "date_submitted": "2026-01-30"},
            {**row, "assignment": "Τελική", "category": "Final Exam", "grade": 9, "date_submitted": "2026-02-10",
             "is_retake": "ναι"},  # fmt: skip
        ],
    )

    assert checked["errors"] is None
    db.expire_all()
    finals = db.query(Grade).filter(Grade.student_id == s["id"], Grade.category == "Final Exam").order_by(Grade.id)
    assert [(g.date_submitted, g.is_retake) for g in finals] == [(FIRST, False), (LATER, True)]
    assert _final_grade(client, s["id"], course["id"])["final_exam_retake"]["failed"] is True


def test_the_grades_file_refuses_a_retake_mark_on_another_grade_and_a_wrong_date(client, db):
    course, s = _setup(client, "RTKJ", 862)
    row = {"student_id": s["student_id"], "course_code": "RTKJ", "grade": 9}

    checked = _import_rows(
        db,
        [
            {**row, "category": "Homework", "is_retake": "yes"},
            {**row, "category": "Final Exam", "date_submitted": "10/02/2026"},
        ],
    )

    assert checked["errors"] == {
        "2": ["is_retake: only a Midterm or Final Exam grade can be a retake"],
        "3": ["date_submitted is not a date (YYYY-MM-DD)"],
    }


# ---------------------------------------------------------------------------
# The migration
# ---------------------------------------------------------------------------


def test_the_migration_adds_the_mark_as_no_for_every_grade_and_goes_back(tmp_path):
    from alembic import command

    from backend.tests.test_unmapped_legacy_columns import _alembic

    url = f"sqlite:///{(tmp_path / 'retake.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, BEFORE_REVISION)
    engine = create_engine(url)
    try:

        def columns() -> set[str]:
            return {c["name"] for c in inspect(engine).get_columns("grades")}

        assert "is_retake" not in columns()
        with engine.begin() as conn:
            conn.execute(text("INSERT INTO students (first_name, last_name, email, student_id) VALUES ('A', 'B', 'a@example.com', 'S-1')"))
            conn.execute(text("INSERT INTO courses (course_code, course_name, semester) VALUES ('MIG-1', 'Before', 'S1')"))
            conn.execute(
                text(
                    "INSERT INTO grades (student_id, course_id, assignment_name, category, grade, max_grade) "
                    "VALUES (1, 1, 'Final', 'Final Exam', 9, 20)"
                )
            )

        command.upgrade(cfg, REVISION)
        assert "is_retake" in columns()
        with engine.begin() as conn:
            assert conn.execute(text("SELECT assignment_name, is_retake FROM grades")).one() == ("Final", 0)
            # An older version writes a grade without the column: the server default says no.
            conn.execute(
                text(
                    "INSERT INTO grades (student_id, course_id, assignment_name, category, grade, max_grade) "
                    "VALUES (1, 1, 'Older', 'Final Exam', 10, 20)"
                )
            )
            assert conn.execute(text("SELECT is_retake FROM grades WHERE assignment_name = 'Older'")).scalar() == 0
            conn.execute(text("UPDATE grades SET is_retake = 1 WHERE assignment_name = 'Final'"))
        command.upgrade(cfg, "head")

        command.downgrade(cfg, BEFORE_REVISION)
        assert "is_retake" not in columns()
        with engine.connect() as conn:
            assert sorted(r[0] for r in conn.execute(text("SELECT assignment_name FROM grades"))) == ["Final", "Older"]
        command.upgrade(cfg, REVISION)
        assert "is_retake" in columns()
    finally:
        engine.dispose()
