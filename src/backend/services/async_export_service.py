"""
Async export service for background Excel/CSV/PDF generation.

Provides task queue management for large exports to improve response times.
Uses in-memory queue pattern with background processing.
Supports multiple export formats: Excel (XLSX), CSV, and PDF.

Rewritten in November 2026 (plan todo 62). It had nine generators, one for each kind of record
and format, written against columns the models do not have (``Student.status``,
``Course.code``, ``Grade.points``): only the Excel file of students could be made, every other
job failed, and two kinds the endpoint accepted (attendance, dashboard) were handled by nothing
and stayed "processing" for ever. Now a kind of record is one table (headers and rows, the same
in every format) and a format is one writer.
"""

import csv
import logging
import os
import tempfile
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, cast

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from backend.models import Attendance, Course, ExportJob, Grade, Student

logger = logging.getLogger(__name__)


class ExportStatus(str, Enum):
    """Export job status states."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


def _can_write_in(folder: str) -> bool:
    """Make the folder if it is missing and try to put a file in it. Never raises.

    A real write, not os.access(): on Windows that only looks at the read-only attribute and
    says yes for a folder the user may not write to.
    """
    try:
        os.makedirs(folder, exist_ok=True)
        with tempfile.TemporaryFile(dir=folder):
            pass
        return True
    except OSError:
        return False


def exports_folder() -> str:
    """Where generated export files are written: the first of these that can be written to.

    1. Next to the code (``backend/exports``), where it always was.
    2. ``data/exports`` under the working directory, where the other export files already go.

    The service used to create the first one when the module was imported, and nothing else.
    In an installed SMS Lite that is the program folder, which a normal user cannot write to:
    creating it raised, the whole Import/Export router failed to load, and its endpoints
    (the mail settings among them) answered 404. That showed on an installation whose very
    first start was not an elevated one; after an elevated first start the folder existed
    and only the exports themselves failed. Seen 2026-11-16 with a fresh build and a read-only
    program folder.

    When neither can be written to, the first is returned: an export then fails and says why,
    and the rest of the API still loads.
    """
    next_to_the_code = os.path.join(os.path.dirname(__file__), "..", "exports")
    for folder in (next_to_the_code, os.path.join("data", "exports")):
        if _can_write_in(folder):
            return folder
    logger.warning("No folder for export files can be written to; exports will fail until one can")
    return next_to_the_code


# What the page calls a format, what the address used to call it, and the file's extension.
FORMATS = {"xlsx": "xlsx", "excel": "xlsx", "csv": "csv", "pdf": "pdf"}

Table_ = tuple[List[str], List[List[Any]]]


def _text(value: Any) -> str:
    return "" if value is None else str(value)


def _students_table(db: Session, filters: Dict[str, Any], limit: int) -> Table_:
    query = db.query(Student).filter(Student.deleted_at.is_(None))
    if filters.get("is_active") is not None:
        query = query.filter(Student.is_active == bool(filters["is_active"]))
    if filters.get("search"):
        like = f"%{filters['search']}%"
        query = query.filter(
            Student.first_name.ilike(like)
            | Student.last_name.ilike(like)
            | Student.email.ilike(like)
            | Student.student_id.ilike(like)
        )
    students = query.order_by(Student.last_name, Student.first_name, Student.id).limit(limit).all()
    headers = ["Student ID", "First Name", "Last Name", "Email", "Study Year", "Enrollment Date", "Status"]
    rows = [
        [
            student.student_id,
            student.first_name,
            student.last_name,
            student.email,
            _text(student.study_year),
            _text(student.enrollment_date),
            "Active" if student.is_active else "Inactive",
        ]
        for student in students
    ]
    return headers, rows


def _courses_table(db: Session, filters: Dict[str, Any], limit: int) -> Table_:
    query = db.query(Course).filter(Course.deleted_at.is_(None))
    if filters.get("is_active") is not None:
        query = query.filter(Course.is_active == bool(filters["is_active"]))
    if filters.get("semester"):
        query = query.filter(Course.semester == filters["semester"])
    if filters.get("search"):
        like = f"%{filters['search']}%"
        query = query.filter(Course.course_code.ilike(like) | Course.course_name.ilike(like))
    courses = query.order_by(Course.course_code, Course.id).limit(limit).all()
    headers = ["Course Code", "Course Name", "Semester", "Credits", "Hours per Week", "Status"]
    rows = [
        [
            course.course_code,
            course.course_name,
            _text(course.semester),
            course.credits if course.credits is not None else "",
            course.hours_per_week if course.hours_per_week is not None else "",
            "Active" if course.is_active else "Inactive",
        ]
        for course in courses
    ]
    return headers, rows


def _grades_table(db: Session, filters: Dict[str, Any], limit: int) -> Table_:
    query = (
        db.query(Grade, Student, Course)
        .join(Student, Student.id == Grade.student_id)
        .join(Course, Course.id == Grade.course_id)
        .filter(Grade.deleted_at.is_(None), Student.deleted_at.is_(None), Course.deleted_at.is_(None))
    )
    if filters.get("student_id"):
        query = query.filter(Grade.student_id == filters["student_id"])
    if filters.get("course_id"):
        query = query.filter(Grade.course_id == filters["course_id"])
    found = query.order_by(Course.course_code, Student.last_name, Student.first_name, Grade.id).limit(limit).all()
    headers = [
        "Student ID",
        "Student",
        "Course Code",
        "Assignment",
        "Category",
        "Grade",
        "Max Grade",
        "Weight",
        "Date Assigned",
    ]
    rows = [
        [
            student.student_id,
            f"{student.last_name} {student.first_name}",
            course.course_code,
            grade.assignment_name,
            _text(grade.category),
            grade.grade,
            grade.max_grade if grade.max_grade is not None else "",
            grade.weight if grade.weight is not None else "",
            _text(grade.date_assigned),
        ]
        for grade, student, course in found
    ]
    return headers, rows


def _attendance_table(db: Session, filters: Dict[str, Any], limit: int) -> Table_:
    query = (
        db.query(Attendance, Student, Course)
        .join(Student, Student.id == Attendance.student_id)
        .join(Course, Course.id == Attendance.course_id)
        .filter(Attendance.deleted_at.is_(None), Student.deleted_at.is_(None), Course.deleted_at.is_(None))
    )
    if filters.get("student_id"):
        query = query.filter(Attendance.student_id == filters["student_id"])
    if filters.get("course_id"):
        query = query.filter(Attendance.course_id == filters["course_id"])
    found = (
        query.order_by(
            Attendance.date, Course.course_code, Student.last_name, Student.first_name, Attendance.period_number
        )
        .limit(limit)
        .all()
    )
    headers = ["Date", "Course Code", "Student ID", "Student", "Period", "Status"]
    rows = [
        [
            _text(mark.date),
            course.course_code,
            student.student_id,
            f"{student.last_name} {student.first_name}",
            mark.period_number or 1,
            mark.status,
        ]
        for mark, student, course in found
    ]
    return headers, rows


# The kinds of record a job can be asked for: the sheet's title, the table, the colour of the
# header row. "dashboard" was accepted until November 2026 and nothing ever wrote it.
EXPORT_TABLES: Dict[str, tuple[str, Callable[[Session, Dict[str, Any], int], Table_], str]] = {
    "students": ("Students", _students_table, "4F46E5"),
    "courses": ("Courses", _courses_table, "059669"),
    "grades": ("Grades", _grades_table, "7C3AED"),
    "attendance": ("Attendance", _attendance_table, "B45309"),
}


def _write_excel(path: str, title: str, colour: str, headers: List[str], rows: List[List[Any]]) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title
    for column, header in enumerate(headers, 1):
        cell = sheet.cell(row=1, column=column, value=header)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color=colour, end_color=colour, fill_type="solid")
        cell.alignment = Alignment(horizontal="center")
    for row_number, row in enumerate(rows, 2):
        for column, value in enumerate(row, 1):
            sheet.cell(row=row_number, column=column, value=value)
    for column in range(1, len(headers) + 1):
        sheet.column_dimensions[get_column_letter(column)].width = 20
    workbook.save(path)


def _write_csv(path: str, headers: List[str], rows: List[List[Any]]) -> None:
    # With a byte order mark: Excel then opens a file with Greek names as it is.
    with open(path, "w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)


def _write_pdf(path: str, title: str, colour: str, headers: List[str], rows: List[List[Any]]) -> None:
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("ReportLab is not installed: a PDF file cannot be made")
    # The fonts the other PDF files use: Helvetica has no Greek letters.
    from backend.services.analytics_export_service import _register_analytics_fonts

    regular, bold = _register_analytics_fonts()
    styles = getSampleStyleSheet()
    cell_style = ParagraphStyle("ExportCell", parent=styles["Normal"], fontName=regular, fontSize=8, leading=10)
    head_style = ParagraphStyle("ExportHead", parent=cell_style, fontName=bold, textColor=colors.white)
    title_style = ParagraphStyle("ExportTitle", parent=styles["Heading1"], fontName=bold, fontSize=14, spaceAfter=10)

    document = SimpleDocTemplate(
        path,
        pagesize=landscape(A4),
        leftMargin=1.2 * cm,
        rightMargin=1.2 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.2 * cm,
    )
    elements: List[Flowable] = [Paragraph(title, title_style), Spacer(1, 0.2 * cm)]
    data = [[Paragraph(header, head_style) for header in headers]]
    data += [[Paragraph(_escape(_text(value)), cell_style) for value in row] for row in rows]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{colour}")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
            ]
        )
    )
    elements.append(table)
    document.build(elements)


def _escape(text: str) -> str:
    """A cell is a Paragraph, which reads <, > and & as markup."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class AsyncExportService:
    """Service for managing async export tasks.

    Handles background generation of Excel, CSV and PDF files with status tracking.
    Uses background task queue pattern for non-blocking exports.
    """

    def __init__(self):
        self.exports_dir = exports_folder()

    @staticmethod
    def _set_job_fields(export_job: ExportJob, **fields: Any) -> None:
        job_any = cast(Any, export_job)
        for key, value in fields.items():
            setattr(job_any, key, value)

    def get_export_path(self, export_id: int, format: str) -> str:
        """Generate file path for export."""
        ext = FORMATS.get((format or "").lower(), "xlsx")
        return os.path.join(self.exports_dir, f"export_{export_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}")

    def generate(
        self,
        db: Session,
        export_job_id: int,
        export_type: str,
        export_format: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10000,
    ) -> tuple[bool, Optional[str], str]:
        """Write the file of one job and say on the job how it went.

        Returns: (success, file_path, error_message). Whatever goes wrong, the job ends as
        "failed": a job must not stay "processing" for ever.
        """
        try:
            extension = FORMATS.get((export_format or "").lower())
            if extension is None:
                raise ValueError(f"Unknown export format: {export_format}")
            if export_type not in EXPORT_TABLES:
                raise ValueError(f"Unknown export type: {export_type}")
            title, table, colour = EXPORT_TABLES[export_type]
            headers, rows = table(db, filters or {}, limit)

            file_path = self.get_export_path(export_job_id, extension)
            if extension == "xlsx":
                _write_excel(file_path, title, colour, headers, rows)
            elif extension == "csv":
                _write_csv(file_path, headers, rows)
            else:
                _write_pdf(file_path, title, colour, headers, rows)

            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                self._set_job_fields(
                    export_job,
                    status=ExportStatus.COMPLETED,
                    file_path=file_path,
                    total_records=len(rows),
                    progress_percent=100,
                    completed_at=datetime.now(timezone.utc),
                )
                db.commit()
            logger.info("Export %s completed: %s %s row(s) as %s", export_job_id, len(rows), export_type, extension)
            return True, file_path, ""

        except Exception as error:
            logger.error("Export %s failed: %s", export_job_id, error, exc_info=True)
            db.rollback()
            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                self._set_job_fields(export_job, status=ExportStatus.FAILED, completed_at=datetime.now(timezone.utc))
                db.commit()
            return False, None, str(error)

    def process_export_task(
        self,
        export_job_id: int,
        export_type: str,
        export_format: str = "xlsx",
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10000,
    ) -> tuple[bool, Optional[str], str]:
        """Process export task in background.

        This is called as a background task and handles the heavy lifting.
        Formats: 'xlsx' (or 'excel'), 'csv', 'pdf'.
        """
        # Create fresh session for background task
        from backend.db import SessionLocal

        db = SessionLocal()

        try:
            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                self._set_job_fields(export_job, status=ExportStatus.PROCESSING)
                db.commit()
            return self.generate(db, export_job_id, export_type, export_format, filters, limit)
        finally:
            db.close()

    def get_export_download_url(self, export_job_id: int) -> Optional[str]:
        """Get download URL for completed export."""
        return f"/api/v1/import-export/exports/{export_job_id}/download"
