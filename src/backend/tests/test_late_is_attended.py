"""A Late is attended, not an absence, on every page; its number is shown for the evaluation.

Plan todo 77, point 1 (the owner, 2026-11-23): "Late should not count as absent, but should be
referenced in a students attendance results in order to be considered in the teacher's final
evaluation", and one meaning of attended everywhere: Present and Late. Absent and Excused stay
absences, as the ΜΙΕΕΚ absence limit counts them.

Until then the app had five meanings: the final grade's Attendance rule, the student summary,
the dashboard, the attendance statistics, the student report and the exports counted Present
alone (a Late lost); the Student Profile's outlook counted Present and Excused; the admin metrics
compared with a lower-case "present" that the stored "Present" never matched.

The main student: one course, four periods recorded today: Present, Late, Late, Excused.
Attended 3 of 4 = 75 % (Present alone gave 25 %, Present and Excused 50 %).
"""

from __future__ import annotations

import csv
import io
from datetime import date, timedelta

from backend.models import Attendance, Grade
from backend.tests.test_analytics_router import _create_course
from backend.tests.test_grade_sheets import (
    _attendance,
    _enroll,
    _excel_rows,
    _export,
    _grade,
    _header_and_rows,
    _pdf_text,
    _sheet,
    _student,
)

STATUSES = ("Present", "Late", "Late", "Excused")


def _setup(client, code: str = "LATE1", rules=None, i: int = 201) -> tuple[dict, dict]:
    course = _create_course(client, code, rules=rules)
    student = _student(client, i, "Λαμπράκη", "Λυδία")
    _enroll(client, course["id"], student["id"])
    return course, student


def test_every_attendance_rate_counts_late_as_attended(client, admin_headers):
    course, student = _setup(client)
    _grade(client, student["id"], course["id"], "Quiz", "Quizzes", 16)
    _attendance(client, student["id"], course["id"], *STATUSES)
    sid, cid = student["id"], course["id"]

    summary = client.get(f"/api/v1/analytics/student/{sid}/summary").json()
    assert summary["attendance_rate"] == 75.0

    attendance = client.get(f"/api/v1/analytics/student/{sid}/attendance").json()
    assert (attendance["overall_attendance_rate"], attendance["late"]) == (75.0, 2)
    assert attendance["courses"][str(cid)]["attendance_rate"] == 75.0

    stats = client.get(f"/api/v1/attendance/stats/student/{sid}/course/{cid}").json()
    assert (stats["attendance_rate"], stats["late_count"]) == (75.0, 2)

    dashboard = client.get("/api/v1/analytics/dashboard", headers=admin_headers).json()
    assert dashboard["average_attendance"] == 75.0

    metrics = client.get("/api/v1/metrics/attendance").json()
    assert (metrics["attendance_rate"], metrics["present_count"], metrics["absent_count"]) == (75.0, 3, 1)


def test_the_student_report_counts_late_as_attended_and_never_as_an_absence(client):
    course, student = _setup(client, "LATE2", i=202)
    _attendance(client, student["id"], course["id"], *STATUSES)
    request = {"student_id": student["id"], "period": "month", "include_attendance": True, "format": "json"}

    report = client.post("/api/v1/reports/student-performance", json=request).json()

    assert report["overall_attendance"]["attendance_rate"] == 75.0
    (row,) = [c for c in report["courses"] if c["course_id"] == course["id"]]
    # The absences are the Excused one, never the two Lates (it said 3: every period not Present).
    assert (row["attendance_rate"], row["total_absences"], row["attendance"]["late"]) == (75.0, 1, 2)

    pdf = client.get(f"/api/v1/export/student-report/pdf/{student['id']}")
    assert pdf.status_code == 200, pdf.text
    assert "75.0%" in _pdf_text(pdf.content)


def test_the_attendance_exports_count_late_as_attended(client):
    course, student = _setup(client, "LATE3", i=203)
    _attendance(client, student["id"], course["id"], *STATUSES)

    response = client.get("/api/v1/export/attendance/analytics/csv", params={"lang": "en"})

    assert response.status_code == 200, response.text
    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    (share,) = [row for row in rows if row and row[0] == "Attended Share (Present + Late)"]
    assert share[1] == "75.0%"
    # The course summary (8 columns; the course's periods follow in a 9-column section).
    (course_row,) = [row for row in rows if row and row[0] == "LATE3" and len(row) == 8]
    assert course_row[-1] == "75.0%"
    periods = [row for row in rows if row and row[0] == "LATE3" and len(row) == 9]
    assert [row[-1] for row in periods] == ["100.0%", "100.0%", "100.0%", "0.0%"]  # Late periods attended


def test_the_outlook_counts_late_and_not_excused(client, db, admin_headers):
    # Three dated grades and the four periods on separate days: 75 %, where Present and Excused
    # gave 50 % (the Student Profile's outlook).
    course, student = _setup(client, "LATE4", i=204)
    start = date(2026, 9, 7)
    for i, value in enumerate((12, 14, 16)):
        db.add(
            Grade(
                student_id=student["id"],
                course_id=course["id"],
                assignment_name=f"T{i}",
                category="Exam",
                grade=value,
                max_grade=20,
                date_submitted=start + timedelta(weeks=i),
            )
        )
    for i, status in enumerate(STATUSES):
        db.add(
            Attendance(student_id=student["id"], course_id=course["id"], date=start + timedelta(days=i), status=status)
        )
    db.commit()

    body = client.get(
        "/api/v1/analytics/predictive/student", params={"student_id": student["id"]}, headers=admin_headers
    )

    assert body.status_code == 200, body.text
    assert body.json()["risk_assessment"]["attendance_rate"] == 75.0


def test_an_attendance_rule_counts_late_as_attended(client):
    # Attendance 20 / Homework 80, Homework 80. Present, Present, Present, Late, Absent: the rule
    # is 4 of 5 = 80, so the final grade 0.2 * 80 + 0.8 * 80 = 80 (Present alone: 60 and 76).
    rules = [{"category": "Attendance", "weight": 20.0}, {"category": "Homework", "weight": 80.0}]
    course, student = _setup(client, "LATE5", rules=rules, i=205)
    _grade(client, student["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Present", "Present", "Present", "Late", "Absent")

    final = client.get(f"/api/v1/analytics/student/{student['id']}/course/{course['id']}/final-grade").json()

    assert final["final_grade"] == 80.0
    assert final["category_breakdown"]["Attendance"]["average"] == 80.0
    # The periods by status, for the Grading page's breakdown: the Late counted apart.
    assert final["attendance"] == {"present": 3, "late": 1, "absent": 1, "excused": 0, "recorded": 5}


def test_the_lates_are_counted_where_the_teacher_evaluates(client):
    # Attendance page limits, Analytics (student and class views) and the grade sheets carry the
    # number of Lates; it is never among the absences.
    rules = [{"category": "Homework", "weight": 100.0}]
    course, student = _setup(client, "LATE6", rules=rules, i=206)
    other = _student(client, 207, "Μαυρίδου", "Μελίνα")
    _enroll(client, course["id"], other["id"])
    for s in (student, other):
        _grade(client, s["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Late", "Late", "Absent")
    _attendance(client, other["id"], course["id"], "Present", "Present", "Present")

    limits = client.get(f"/api/v1/attendance/absence-status/course/{course['id']}")
    assert limits.status_code == 200, limits.text
    rows = {row["student_id"]: row for row in limits.json()}
    assert (rows[student["id"]]["absences"], rows[student["id"]]["late"]) == (1, 2)
    assert rows[other["id"]]["late"] == 0

    overview = client.get("/api/v1/analytics/overview").json()
    lates = {row["id"]: row["late"] for row in overview["students"]}
    assert (lates[student["id"]], lates[other["id"]]) == (2, 0)
    (course_row,) = overview["courses"]
    assert course_row["attendance"]["late"] == 2

    sheet = _sheet(client, course["id"], "categories")
    assert {row["student"]["id"]: row["late"] for row in sheet["rows"]} == {student["id"]: 2, other["id"]: 0}
    header, body = _header_and_rows(_excel_rows(_export(client, course["id"], "excel", kind="categories")))
    late_at = header.index("Late")
    assert header[late_at + 1] == "Final grade"
    assert (body["Λαμπράκη"][late_at], body["Μαυρίδου"][late_at]) == (2, None)
    text = _pdf_text(_export(client, course["id"], "pdf", kind="matrix"))
    assert "Late: periods the student arrived late" in text


def test_no_late_column_without_a_late(client):
    course, student = _setup(client, "LATE7", rules=[{"category": "Homework", "weight": 100.0}], i=208)
    _grade(client, student["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Present", "Absent")

    header, _ = _header_and_rows(_excel_rows(_export(client, course["id"], "excel", kind="categories")))

    assert "Late" not in header


def test_the_report_files_list_the_lates_and_the_excused_beside_the_rate(client):
    # The rate counts the two Lates as attended: the files list them (and the Excused), so the
    # 75 % can be read off the rows. Until then: rate, total, Present 1, Absent 0, nothing else.
    course, student = _setup(client, "LATE8", i=209)
    _attendance(client, student["id"], course["id"], *STATUSES)
    request = {"student_id": student["id"], "period": "month", "include_attendance": True}

    # The total counts records, one per teaching period (four on one day here), so it says periods.
    words = (
        ("en", "Periods recorded", "Present", "Late", "Absent", "Excused"),
        ("el", "Καταγεγραμμένες ώρες", "Παρών", "Αργοπορία", "Απών", "Δικαιολογημένος"),
    )
    for language, total, present, late, absent, excused in words:
        response = client.post(
            "/api/v1/reports/student-performance/download", json={**request, "format": "csv", "language": language}
        )
        assert response.status_code == 200, response.text
        rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
        assert [total, "4"] in rows and [late, "2"] in rows and [excused, "1"] in rows, rows
        # The course row names its Lates beside its rate.
        (header,) = [row for row in rows if row and len(row) == 6 and row[3] == late]
        (course_row,) = [row for row in rows if row and row[0] == "LATE8"]
        assert course_row[header.index(late)] == "2" and course_row[2] == "75.0"

        pdf = client.post(
            "/api/v1/reports/student-performance/download", json={**request, "format": "pdf", "language": language}
        )
        assert pdf.status_code == 200, pdf.text
        text = _pdf_text(pdf.content)
        # The overall table lists both, in its own rows; the course's table names its Lates
        # under its rate.
        assert f"\n{total}\n4\n{present}\n1\n{late}\n2\n{absent}\n0\n{excused}\n1\n" in text, text
        assert "Attendance Rate\n75.0%\nLate\n2" in text or "Ποσοστό Παρουσιών\n75.0%\nΑργοπορία\n2" in text, text


def test_a_course_without_rules_still_counts_the_periods(client):
    # Its final grade stops before counting (no rules: plan todo 77 point 3); the Grading page and
    # the breakdown still name the Lates.
    course, student = _setup(client, "LATE9", rules=[], i=210)
    _grade(client, student["id"], course["id"], "HW", "Homework", 70, max_grade=100)
    _attendance(client, student["id"], course["id"], "Late", "Late", "Present")

    final = client.get(f"/api/v1/analytics/student/{student['id']}/course/{course['id']}/final-grade").json()

    assert final["attendance"] == {"present": 1, "late": 2, "absent": 0, "excused": 0, "recorded": 3}


def test_the_late_header_prints_whole_in_greek(client):
    # 'Αργοπορίες' printed split in two ('Αργοπορί' / 'ες') in a 14 mm column.
    course, student = _setup(client, "LATE10", rules=[{"category": "Homework", "weight": 100.0}], i=211)
    _grade(client, student["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Late", "Present")

    for kind in ("categories", "matrix"):
        text = _pdf_text(_export(client, course["id"], "pdf", kind=kind, lang="el"))
        assert "Αργοπορί\nες" not in text
        assert "Αργοπορίες\nΤελικός" in text, text


def test_every_fixed_header_word_fits_its_pdf_column():
    # header_size() goes down to 5.5 pt and no further: a word wider than its column then splits.
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    from backend.services import grade_sheet_export as export

    pdfmetrics.registerFont(TTFont(export.FONT_BOLD, f"{export.FONT_DIR}/DejaVuSans-Bold.ttf"))
    for lang in ("en", "el"):
        labels = export._labels(lang)
        widths = {
            "number": export._MM_NUMBER,
            "reg_no": export._MM_REG,
            "surname": export._MM_SURNAME,
            "first_name": export._MM_FIRST,
            "late": export._MM_LATE[lang],
            "deductions": export._MM_DEDUCTIONS,
            "final": export._MM_FINAL,
        }
        for key, width in widths.items():
            for word in labels[key].split():
                assert pdfmetrics.stringWidth(word, export.FONT_BOLD, 5.5) <= width * mm - 8, (lang, key, word)
    # And no wider than it needs: every millimetre more comes out of the value columns.
    assert export._MM_LATE["en"] == 14.0


def test_the_late_column_takes_no_room_english_headers_need(client):
    # At 16 mm in English too, eight "Εργαστηριακή άσκηση N" headers printed "Εργαστηριακ" / "ή":
    # the 2 mm "Αργοπορίες" needs came out of the value columns, for a header ("Late") that fits 14.
    course, student = _setup(client, "LATE11", rules=[{"category": "Lab Work", "weight": 100.0}], i=212)
    for n in range(1, 9):
        _grade(client, student["id"], course["id"], f"Εργαστηριακή άσκηση {n}", "Lab Work", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Late", "Present")

    text = _pdf_text(_export(client, course["id"], "pdf", kind="matrix", lang="en"))

    assert "Εργαστηριακ\nή" not in text
    assert text.count("Εργαστηριακή\nάσκηση") == 8, text


def test_every_fixed_header_word_fits_its_excel_column(client):
    # Excel breaks a bold header word wider than its column: at width 10 "Αργοπορίες" printed in
    # two lines (measured with Excel's AutoFit: a 10-letter word needs a width of 12).
    from openpyxl import load_workbook
    from openpyxl.utils import get_column_letter

    from backend.services import grade_sheet_export as export

    course, student = _setup(client, "LATE12", rules=[{"category": "Homework", "weight": 100.0}], i=213)
    _grade(client, student["id"], course["id"], "HW", "Homework", 80, max_grade=100)
    _attendance(client, student["id"], course["id"], "Late", "Present")

    for lang in ("en", "el"):
        labels = export._labels(lang)
        fixed = {labels[key] for key in ("number", "reg_no", "surname", "first_name", "late", "final")}
        workbook = load_workbook(io.BytesIO(_export(client, course["id"], "excel", kind="categories", lang=lang)))
        sheet = workbook.active
        header = next(row for row in sheet.iter_rows() if row[0].value == labels["number"])
        seen = set()
        for cell in header:
            if cell.value in fixed:
                width = sheet.column_dimensions[get_column_letter(cell.column)].width
                for word in str(cell.value).split():
                    assert len(word) <= width - 2, (lang, cell.value, width)
                seen.add(cell.value)
        assert seen == fixed, (lang, seen)
