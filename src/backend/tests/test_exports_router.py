"""Smoke tests for backend.routers.routers_exports (31 export endpoints).

Previously completely untested despite being a 3,200+ line router. These are
deliberately *smoke* tests, not exhaustive content verification: for every
endpoint we assert 200, the right content-type, a non-empty body, and that
the body is actually well-formed for its format (openpyxl can load the
xlsx, csv.reader can parse the csv, the PDF starts with the %PDF magic
bytes) - not that every cell/row is pixel-perfect (there's no tool in this
environment to visually verify PDF/Excel rendering).

This exists as the safety net that should exist *before* any future
deduplication of this router (a services/report_exporters.py module already
exists but is currently unused per the codebase review - see
docs/plans/UNIFIED_WORK_PLAN.md) - that migration should not be attempted
without tests like these already passing, given the size of the router and
the complete absence of prior coverage.
"""

import csv
import io
from datetime import date

import openpyxl
import pytest

from backend.models import (
    Attendance,
    Course,
    CourseEnrollment,
    DailyPerformance,
    Grade,
    Highlight,
    Student,
)


@pytest.fixture
def export_dataset(db):
    student = Student(
        first_name="Export", last_name="Test", email="export-test@example.com", student_id="EXP1"
    )
    other_student = Student(
        first_name="Second", last_name="Student", email="export-test2@example.com", student_id="EXP2"
    )
    course = Course(course_code="EXP101", course_name="Export Course", semester="Fall 2026")
    db.add_all([student, other_student, course])
    db.commit()
    db.refresh(student)
    db.refresh(other_student)
    db.refresh(course)

    db.add(CourseEnrollment(student_id=student.id, course_id=course.id))
    db.add(
        Grade(
            student_id=student.id,
            course_id=course.id,
            assignment_name="HW1",
            category="Homework",
            grade=85,
            max_grade=100,
            weight=1.0,
            date_submitted=date.today(),
        )
    )
    db.add(Attendance(student_id=student.id, course_id=course.id, date=date.today(), status="Present"))
    db.add(
        DailyPerformance(
            student_id=student.id,
            course_id=course.id,
            date=date.today(),
            category="Participation",
            score=8,
            max_score=10,
        )
    )
    db.add(
        Highlight(
            student_id=student.id,
            semester="Fall 2026",
            rating=8,
            category="Academic",
            highlight_text="Great work this semester",
        )
    )
    db.commit()

    return {"student": student, "other_student": other_student, "course": course}


def _assert_excel(response, filename_prefix=None):
    assert response.status_code == 200, response.text
    assert (
        response.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    wb = openpyxl.load_workbook(io.BytesIO(response.content))
    assert wb.active is not None
    if filename_prefix:
        assert filename_prefix in response.headers["content-disposition"]


def _assert_csv(response, filename_prefix=None):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/csv")
    text = response.content.decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text)))
    assert len(rows) >= 1
    if filename_prefix:
        assert filename_prefix in response.headers["content-disposition"]


def _assert_pdf(response, filename_prefix=None):
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    if filename_prefix:
        assert filename_prefix in response.headers["content-disposition"]


class TestBulkExport:
    def test_export_all_zip(self, client, export_dataset):
        response = client.get("/api/v1/export/all/zip")
        assert response.status_code == 200, response.text
        assert response.headers["content-type"] == "application/zip"
        assert response.content[:2] == b"PK"


class TestStudentsExport:
    def test_students_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/students/excel"), "students_export")

    def test_students_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/students/csv"), "students_export")

    def test_students_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/students/pdf"))


class TestPerStudentExports:
    def test_grades_excel(self, client, export_dataset):
        student = export_dataset["student"]
        _assert_excel(client.get(f"/api/v1/export/grades/excel/{student.id}"), "grades_")

    def test_grades_excel_missing_student_404(self, client, export_dataset):
        response = client.get("/api/v1/export/grades/excel/999999")
        assert response.status_code == 404

    def test_attendance_excel_for_student(self, client, export_dataset):
        student = export_dataset["student"]
        _assert_excel(client.get(f"/api/v1/export/attendance/excel/{student.id}"))

    def test_performance_excel_for_student(self, client, export_dataset):
        student = export_dataset["student"]
        _assert_excel(client.get(f"/api/v1/export/performance/excel/{student.id}"))

    def test_highlights_excel_for_student(self, client, export_dataset):
        student = export_dataset["student"]
        _assert_excel(client.get(f"/api/v1/export/highlights/excel/{student.id}"))

    def test_enrollments_excel_for_student(self, client, export_dataset):
        student = export_dataset["student"]
        _assert_excel(client.get(f"/api/v1/export/enrollments/excel/{student.id}"))


class TestAttendanceExports:
    def test_attendance_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/attendance/excel"))

    def test_attendance_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/attendance/csv"))

    def test_attendance_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/attendance/pdf"))

    def test_attendance_analytics_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/attendance/analytics/excel"))

    def test_attendance_analytics_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/attendance/analytics/csv"))

    def test_attendance_analytics_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/attendance/analytics/pdf"))


class TestCoursesExports:
    def test_courses_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/courses/excel"))

    def test_courses_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/courses/csv"))

    def test_courses_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/courses/pdf"))


class TestEnrollmentsExports:
    def test_enrollments_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/enrollments/excel"))

    def test_enrollments_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/enrollments/csv"))

    def test_enrollments_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/enrollments/pdf"))


class TestGradesExports:
    def test_grades_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/grades/excel"))

    def test_grades_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/grades/csv"))

    def test_grades_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/grades/pdf"))


class TestPerformanceExports:
    def test_performance_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/performance/excel"))

    def test_performance_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/performance/csv"))

    def test_performance_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/performance/pdf"))


class TestHighlightsExports:
    def test_highlights_excel(self, client, export_dataset):
        _assert_excel(client.get("/api/v1/export/highlights/excel"))

    def test_highlights_csv(self, client, export_dataset):
        _assert_csv(client.get("/api/v1/export/highlights/csv"))

    def test_highlights_pdf(self, client, export_dataset):
        _assert_pdf(client.get("/api/v1/export/highlights/pdf"))


class TestReportPdfs:
    def test_student_report_pdf(self, client, export_dataset):
        student = export_dataset["student"]
        response = client.get(f"/api/v1/export/student-report/pdf/{student.id}")
        assert response.status_code == 200, response.text
        assert response.content.startswith(b"%PDF")

    def test_course_analytics_pdf(self, client, export_dataset):
        course = export_dataset["course"]
        response = client.get(f"/api/v1/export/analytics/course/{course.id}/pdf")
        assert response.status_code == 200, response.text
        assert response.content.startswith(b"%PDF")
