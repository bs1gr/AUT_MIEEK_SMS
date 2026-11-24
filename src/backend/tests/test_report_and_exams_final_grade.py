"""Plan todo 83, the second part: the student report and Analytics' "top by exams".

The owner, 2026-11-24: "should show averages if not exams grades published yet. otherwise, the real
grades should populate", the Final Exam deciding (todo 83's first part did the Students page and the
Profile). The student report (the page, PDF, CSV) gave each course and the student the plain mean of
the period's grades; Analytics' exam average counted every sitting of an exam, and any name with
"final" or «τελικ» in it ("Final Quiz", «Τελική Εργασία») as an exam.
"""

from __future__ import annotations

import csv
import io
from datetime import date, timedelta

from backend.tests.test_analytics_router import _create_course, _post_with_csrf
from backend.tests.test_grade_sheets import _enroll, _student

RULES = [{"category": "Homework", "weight": 40}, {"category": "Final Exam", "weight": 60}]
REPORT = "/api/v1/reports/student-performance"


def _grade(client, sid, cid, category, score, day=None, retake=False, name=None):
    response = _post_with_csrf(
        client,
        "/api/v1/grades/",
        {
            "student_id": sid,
            "course_id": cid,
            "assignment_name": name or category,
            "category": category,
            "grade": score,
            "max_grade": 100,
            "date_submitted": (day or date.today()).isoformat(),
            "is_retake": retake,
        },
    )
    assert response.status_code == 201, response.text


def _report(client, sid, fmt="json"):
    body = {
        "student_id": sid,
        "period": "custom",
        "start_date": (date.today() - timedelta(days=30)).isoformat(),
        "end_date": date.today().isoformat(),
        "format": fmt,
        "include_grades": True,
        "include_attendance": False,
        "include_performance": False,
        "include_highlights": False,
    }
    if fmt == "json":
        response = client.post(REPORT, json=body)
    else:
        response = client.post(f"{REPORT}/download", json={**body, "language": "en"})
    assert response.status_code == 200, response.text
    return response


def test_the_report_takes_a_course_by_its_final_grade_once_the_final_exam_is_graded(client):
    done = _create_course(client, "RPF1", rules=RULES)
    waiting = _create_course(client, "RPF2", rules=RULES)
    s = _student(client, 881, "Αντωνίου", "Λία")
    _enroll(client, done["id"], s["id"])
    _enroll(client, waiting["id"], s["id"])
    _grade(client, s["id"], done["id"], "Homework", 90)
    _grade(client, s["id"], done["id"], "Final Exam", 40)  # final grade 0.4 x 90 + 0.6 x 40 = 60
    _grade(client, s["id"], waiting["id"], "Homework", 80)
    _grade(client, s["id"], waiting["id"], "Homework", 70, name="Homework 2")

    report = _report(client, s["id"]).json()
    data = report.get("data", report)
    courses = {c["course_code"]: c for c in data["courses"]}

    # RPF1: its final grade 60, not the 65 average of its two grades; RPF2: the average, 75.
    assert (courses["RPF1"]["grade_percentage"], courses["RPF1"]["grade_basis"]) == (60.0, "final")
    assert courses["RPF1"]["grades"]["average_percentage"] == 60.0
    assert (courses["RPF2"]["grade_percentage"], courses["RPF2"]["grade_basis"]) == (75.0, "average")
    # Each course once: (60 + 75) / 2, where the mean of the four grades was 70.
    assert data["overall_grades"]["average_percentage"] == 67.5

    rows = list(csv.reader(io.StringIO(_report(client, s["id"], "csv").content.decode("utf-8-sig"))))
    by_code = {r[0]: r for r in rows if r and r[0] in ("RPF1", "RPF2") and len(r) == 7}
    assert (by_code["RPF1"][4], by_code["RPF1"][6]) == ("60.0", "final grade")
    assert (by_code["RPF2"][4], by_code["RPF2"][6]) == ("75.0", "average so far")


def test_analytics_counts_each_exam_once_and_only_exams(client):
    course = _create_course(client, "EXA1", rules=RULES + [{"category": "Quiz", "weight": 0}])
    s = _student(client, 882, "Βασιλείου", "Τάσος")
    _enroll(client, course["id"], s["id"])
    _grade(client, s["id"], course["id"], "Final Exam", 40, day=date.today() - timedelta(days=10))
    _grade(client, s["id"], course["id"], "Final Exam", 80, retake=True, name="Final Exam B")
    _grade(client, s["id"], course["id"], "Final Quiz", 10)  # a quiz, not the exam (todo 86)
    _grade(client, s["id"], course["id"], "Τελική Εργασία", 20)  # homework (todo 77 point 2)

    overview = client.get("/api/v1/analytics/overview", params={"course_id": course["id"]})
    assert overview.status_code == 200, overview.text
    (row,) = [r for r in overview.json()["students"] if r["student_id"] == s["student_id"]]

    # The retake of 80 alone: the first sitting, the quiz and the homework count nowhere here
    # (the mean of all four was 37.5).
    assert row["exam_average"] == 80.0
