"""Plan todo 75 stage 4: the Analytics export follows the filters on screen.

The export took no filter and covered every active student ("school totals"), whatever the page
showed, and carried only the summary, the class and the course averages. Now it takes the page's
class, division and course (and, in the student view, the student), says which they were, and
carries the selection's students and its categories (strengths and difficulties), or that
student's courses and categories. The scenario is test_analytics_overview's (its docstring has
the figures).
"""

from __future__ import annotations

import io

import pytest
from openpyxl import load_workbook

from backend.routers.routers_analytics import _build_dashboard_export_data
from backend.services.grade_categories import LABELS
from backend.tests.test_analytics_overview import scenario  # noqa: F401  (the fixture)


def test_without_filters_it_covers_every_active_student_and_says_so(db, scenario):  # noqa: F811
    data = _build_dashboard_export_data(db)

    assert data["scope"] == {"academic_year": None, "class_division": None, "course": None, "student": None}
    assert {s["student_id"] for s in data["students"]} == {"OV0001", "OV0002", "OV0003"}
    assert data["summary"]["total_students"] == 3


def test_the_class_and_division_narrow_every_figure(db, scenario):  # noqa: F811
    data = _build_dashboard_export_data(db, academic_year="A", class_division="A2")

    assert data["scope"]["academic_year"] == "A" and data["scope"]["class_division"] == "A2"
    assert [s["student_id"] for s in data["students"]] == ["OV0002"]
    assert data["summary"]["total_students"] == 1
    assert data["summary"]["average_grade"] == 34.0
    assert [s["name"] for s in data["categories"]["students"]] == ["S2 Overview2"]


def test_a_course_narrows_to_its_students_and_is_named(db, scenario):  # noqa: F811
    data = _build_dashboard_export_data(db, course_id=scenario["phys"]["id"])

    assert data["scope"]["course"] == "PHYS — Course PHYS"
    assert {s["student_id"] for s in data["students"]} == {"OV0001", "OV0003"}
    assert [c["label"] for c in data["course_averages"]] == ["Course PHYS"]


def test_the_categories_are_named_in_the_export_language(db, scenario):  # noqa: F811
    english = _build_dashboard_export_data(db, language="en")["categories"]
    greek = _build_dashboard_export_data(db, language="el")["categories"]

    assert LABELS["en"]["homework"] in english["columns"]
    assert LABELS["el"]["homework"] in greek["columns"]
    assert len(english["columns"]) == len(greek["columns"]) == len(english["averages"])
    s1 = next(row for row in english["students"] if row["name"] == "S1 Overview1")
    assert len(s1["cells"]) == len(s1["signals"]) == len(english["columns"])


def test_the_student_view_exports_that_student_narrowed_to_the_course(db, scenario):  # noqa: F811
    s1, math = scenario["s1"]["id"], scenario["math"]["id"]

    everything = _build_dashboard_export_data(db, student_id=s1)["student_view"]
    one_course = _build_dashboard_export_data(db, student_id=s1, course_id=math)

    assert [c["course"] for c in everything["courses"]] == ["MATH — Course MATH", "PHYS — Course PHYS"]
    view = one_course["student_view"]
    assert one_course["scope"]["student"] == "S1 Overview1"
    assert [c["course"] for c in view["courses"]] == ["MATH — Course MATH"]
    assert view["courses"][0]["final_grade"] == 74.0
    # MATH's own figures per category (Homework 80, Final Exam 70), PHYS's quizzes left out.
    assert {c["name"]: c["average"] for c in view["categories"]} == {
        LABELS["en"]["homework"]: 80.0,
        LABELS["en"]["final"]: 70.0,
    }
    homework = next(c for c in view["categories"] if c["name"] == LABELS["en"]["homework"])
    assert homework["difference"] == round(homework["average"] - homework["class_average"], 1)


def _excel(client, **params):
    response = client.post("/api/v1/analytics/export/excel", params=params)
    assert response.status_code == 200, response.text
    return load_workbook(io.BytesIO(response.content))


def test_the_excel_export_follows_the_filters_with_students_and_categories(client, scenario):  # noqa: F811
    workbook = _excel(client, language="el", academic_year="A", class_division="A2")

    assert workbook.sheetnames == ["Analytics Dashboard", "Σπουδαστές", "Κατηγορίες"]
    assert workbook["Analytics Dashboard"]["A3"].value == "Επιλογή: Τάξη: A · Τμήμα: A2"
    students = workbook["Σπουδαστές"]
    assert students.cell(row=3, column=1).value == "Σπουδαστής"
    assert [students.cell(row=r, column=1).value for r in range(4, students.max_row + 1)] == ["S2 Overview2"]
    assert students.cell(row=4, column=6).value == 34.0  # a number, not "34.00%"
    categories = workbook["Κατηγορίες"]
    assert categories.cell(row=5, column=1).value == "Μέσος Όρος Τάξης"
    assert categories.cell(row=6, column=1).value == "S2 Overview2"


def test_the_excel_export_of_the_student_view(client, scenario):  # noqa: F811
    workbook = _excel(client, language="en", student_id=scenario["s1"]["id"], course_id=scenario["math"]["id"])

    assert workbook.sheetnames == ["Analytics Dashboard"]  # the class sheets belong to the class view
    sheet = workbook["Analytics Dashboard"]
    assert sheet["A3"].value == "Selection: Course: MATH — Course MATH · Student: S1 Overview1"
    values = [sheet.cell(row=r, column=1).value for r in range(1, sheet.max_row + 1)]
    assert "Student: S1 Overview1" in values
    assert "MATH — Course MATH" in values and "PHYS — Course PHYS" not in values


def test_the_pdf_export_follows_the_filters_in_greek(client, scenario):  # noqa: F811
    from pypdf import PdfReader

    response = client.post(
        "/api/v1/analytics/export/pdf", params={"language": "el", "academic_year": "A", "class_division": "A2"}
    )

    assert response.status_code == 200, response.text
    text = "".join(page.extract_text() for page in PdfReader(io.BytesIO(response.content)).pages)
    assert "Τμήμα: A2" in text
    assert "S2 Overview2" in text
    assert "S1 Overview1" not in text
    assert "Δυνατά σημεία και δυσκολίες ανά κατηγορία" in text


def test_the_pdf_export_of_the_student_view(client, scenario):  # noqa: F811
    from pypdf import PdfReader

    response = client.post("/api/v1/analytics/export/pdf", params={"student_id": scenario["s1"]["id"]})

    assert response.status_code == 200, response.text
    text = "".join(page.extract_text() for page in PdfReader(io.BytesIO(response.content)).pages)
    assert "Student: S1 Overview1" in text
    assert "S2 Overview2" not in text


@pytest.mark.parametrize("file_format", ["excel", "pdf"])
def test_a_student_that_does_not_exist_is_a_404(client, scenario, file_format):  # noqa: F811
    response = client.post(f"/api/v1/analytics/export/{file_format}", params={"student_id": 999999})

    assert response.status_code == 404, response.text
