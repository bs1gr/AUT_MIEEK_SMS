import os

from fastapi import APIRouter, Depends, HTTPException, Request
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Simple i18n dict for EN/EL (expand as needed)
TRANSLATIONS = {
    "en": {
        "report_title": "Comprehensive Student Report",
        "attendance_summary": "Attendance Summary",
        "total_classes": "Total Classes",
        "present": "Present",
        "absent": "Absent",
        "late": "Late",
        "excused": "Excused",
        "attendance_rate": "Attendance Rate",
        "grades_by_course": "Grades by Course",
        "assignment": "Assignment",
        "category": "Category",
        "score": "Score",
        "max_score": "Max Score",
        "percentage": "Percentage",
        "letter": "Letter",
        "average": "Average:",
        "daily_performance_summary": "Daily Performance Summary",
        "total_daily_entries": "Total Daily Performance Entries",
        "avg_performance": "Average Performance",
        "generated_on": "Generated on",
        "system": "Student Management System",
        "sheet_students": "Students",
        "sheet_grades": "Grades",
        "sheet_attendance": "Attendance",
        "sheet_overview": "Overview",
        "sheet_course_summary": "Course Summary",
        "sheet_period_summary": "Period Summary",
        "sheet_course_periods": "Course Periods",
        "sheet_student_summary": "Student Summary",
        "sheet_daily_overview": "Daily Overview",
        "sheet_courses": "Courses",
        "sheet_enrollments": "Enrollments",
        "sheet_all_grades": "All Grades",
        "sheet_daily_performance": "Daily Performance",
        "sheet_highlights": "Highlights",
        "title_attendance_export": "Attendance Analytics Export",
        "title_course_catalog": "Course Catalog",
        "title_course_analytics": "Course Analytics Report",
        "title_course_statistics": "Course Statistics",
        "title_grade_distribution": "Grade Distribution",
        "student_directory_title": "Student Directory",
        "grade_report_title": "Grade Report: {student_name} ({student_code})",
        "label_metric": "Metric",
        "label_value": "Value",
        "label_total_records": "Total Records",
        "label_unique_students": "Unique Students",
        "label_unique_courses": "Unique Courses",
        "label_date_range": "Date Range",
        "label_present_share": "Present Share",
        "label_status": "Status",
        "label_count": "Count",
        "label_notice": "Notice",
        "label_no_attendance": "No attendance records were found in the system.",
        "label_total_students_enrolled": "Total Students Enrolled",
        "label_total_assignments": "Total Assignments",
        "label_average_grade": "Average Grade",
        "label_highest_grade": "Highest Grade",
        "label_lowest_grade": "Lowest Grade",
        "label_letter_grade": "Letter Grade",
        "label_percentage": "Percentage",
        "label_most_frequent_status": "Most Frequent Status",
        "status_active": "Active",
        "status_inactive": "Inactive",
        "not_available": "N/A",
        "yes_label": "Yes",
        "no_label": "No",
        "attendance_rate_percent": "Attendance Rate (%)",
        "label_enrolled_date": "Enrolled Date",
        "label_date_submitted": "Date Submitted",
        "label_hours_per_week": "Hours/Week",
        "label_description": "Description",
        "label_highlight_text": "Highlight Text",
        "label_date_created": "Date Created",
        "label_is_positive": "Is Positive",
        "label_rating": "Rating",
        "label_course_code": "Course Code",
        "label_course_name": "Course Name",
        "label_course_id": "Course ID",
        "label_student_name": "Student Name",
        "label_student_id": "Student ID",
        "label_first_name": "First Name",
        "label_last_name": "Last Name",
        "label_email": "Email",
        "label_enrollment_date": "Enrollment Date",
        "label_period": "Period",
        "label_date": "Date",
        "label_notes": "Notes",
        "label_semester": "Semester",
        "label_credits": "Credits",
        "label_hours": "Hours/Week",
        "label_generated_on_table": "Generated On",
        "label_daily_entries": "Daily Performance Entries",
        "label_avg_performance_short": "Average Performance",
        "distribution_a": "A (90-100%)",
        "distribution_b": "B (80-89%)",
        "distribution_c": "C (70-79%)",
        "distribution_d": "D (60-69%)",
        "distribution_f": "F (<60%)",
        "header_id": "ID",
        "label_weight": "Weight",
        "label_grade": "Grade",
    },
    "el": {
        "report_title": "Αναλυτική Αναφορά Σπουδαστή",
        "attendance_summary": "Σύνοψη Παρουσιών",
        "total_classes": "Σύνολο Μαθημάτων",
        "present": "Παρόν",
        "absent": "Απών",
        "late": "Καθυστέρηση",
        "excused": "Δικαιολογημένη",
        "attendance_rate": "Ποσοστό Παρουσιών",
        "grades_by_course": "Βαθμοί ανά Μάθημα",
        "assignment": "Άσκηση",
        "category": "Κατηγορία",
        "score": "Βαθμός",
        "max_score": "Μέγιστος Βαθμός",
        "percentage": "Ποσοστό",
        "letter": "Γράμμα",
        "average": "Μέσος όρος:",
        "daily_performance_summary": "Σύνοψη Ημερήσιας Επίδοσης",
        "total_daily_entries": "Σύνολο Καταχωρήσεων Ημερήσιας Επίδοσης",
        "avg_performance": "Μέση Επίδοση",
        "generated_on": "Δημιουργήθηκε στις",
        "system": "Σύστημα Διαχείρισης Σπουδαστών",
        "sheet_students": "Φοιτητές",
        "sheet_grades": "Βαθμοί",
        "sheet_attendance": "Παρουσίες",
        "sheet_overview": "Επισκόπηση",
        "sheet_course_summary": "Σύνοψη Μαθημάτων",
        "sheet_period_summary": "Σύνοψη Περιόδων",
        "sheet_course_periods": "Περίοδοι Μαθημάτων",
        "sheet_student_summary": "Σύνοψη Σπουδαστών",
        "sheet_daily_overview": "Ημερήσια Επισκόπηση",
        "sheet_courses": "Μαθήματα",
        "sheet_enrollments": "Εγγραφές",
        "sheet_all_grades": "Όλες οι Βαθμολογίες",
        "sheet_daily_performance": "Ημερήσια Επίδοση",
        "sheet_highlights": "Επισημάνσεις",
        "title_attendance_export": "Εξαγωγή Αναλύσεων Παρουσιών",
        "title_course_catalog": "Κατάλογος Μαθημάτων",
        "title_course_analytics": "Αναφορά Αναλυτικών Μαθήματος",
        "title_course_statistics": "Στατιστικά Μαθήματος",
        "title_grade_distribution": "Κατανομή Βαθμών",
        "student_directory_title": "Κατάλογος Σπουδαστών",
        "grade_report_title": "Αναφορά Βαθμολογίας: {student_name} ({student_code})",
        "label_metric": "Μετρική",
        "label_value": "Τιμή",
        "label_total_records": "Σύνολο Εγγραφών",
        "label_unique_students": "Μοναδικοί Σπουδαστές",
        "label_unique_courses": "Μοναδικά Μαθήματα",
        "label_date_range": "Εύρος Ημερομηνιών",
        "label_present_share": "Ποσοστό Παρόντων",
        "label_status": "Κατάσταση",
        "label_count": "Πλήθος",
        "label_notice": "Σημείωση",
        "label_no_attendance": "Δεν βρέθηκαν εγγραφές παρουσιών στο σύστημα.",
        "label_total_students_enrolled": "Σύνολο Εγγεγραμμένων Σπουδαστών",
        "label_total_assignments": "Σύνολο Εργασιών",
        "label_average_grade": "Μέσος Όρος Βαθμολογίας",
        "label_highest_grade": "Υψηλότερη Βαθμολογία",
        "label_lowest_grade": "Χαμηλότερη Βαθμολογία",
        "label_letter_grade": "Βαθμός Γράμματος",
        "label_percentage": "Ποσοστό",
        "label_most_frequent_status": "Συχνότερη Κατάσταση",
        "status_active": "Ενεργός",
        "status_inactive": "Ανενεργός",
        "not_available": "Μ/Δ",
        "yes_label": "Ναι",
        "no_label": "Όχι",
        "attendance_rate_percent": "Ποσοστό Παρουσιών (%)",
        "label_enrolled_date": "Ημερομηνία Εγγραφής",
        "label_date_submitted": "Ημερομηνία Υποβολής",
        "label_hours_per_week": "Ώρες/Εβδομάδα",
        "label_description": "Περιγραφή",
        "label_highlight_text": "Κείμενο Επισήμανσης",
        "label_date_created": "Ημερομηνία Δημιουργίας",
        "label_is_positive": "Θετική Αναφορά",
        "label_rating": "Αξιολόγηση",
        "label_course_code": "Κωδικός Μαθήματος",
        "label_course_name": "Τίτλος Μαθήματος",
        "label_course_id": "Αναγνωριστικό Μαθήματος",
        "label_student_name": "Όνομα Σπουδαστή",
        "label_student_id": "Αριθμός Μητρώου",
        "label_first_name": "Όνομα",
        "label_last_name": "Επώνυμο",
        "label_email": "Email",
        "label_enrollment_date": "Ημερομηνία Εγγραφής",
        "label_period": "Περίοδος",
        "label_date": "Ημερομηνία",
        "label_notes": "Σημειώσεις",
        "label_semester": "Εξάμηνο",
        "label_credits": "Πιστωτικές Μονάδες",
        "label_hours": "Ώρες/Εβδομάδα",
        "label_generated_on_table": "Δημιουργήθηκε",
        "label_daily_entries": "Καταχωρήσεις Ημερήσιας Επίδοσης",
        "label_avg_performance_short": "Μέση Επίδοση",
        "distribution_a": "A (90-100%)",
        "distribution_b": "B (80-89%)",
        "distribution_c": "C (70-79%)",
        "distribution_d": "D (60-69%)",
        "distribution_f": "F (<60%)",
        "header_id": "Κωδικός",
        "label_weight": "Βαρύτητα",
        "label_grade": "Βαθμός",
    },
}


ATTENDANCE_STATUSES = ("Present", "Absent", "Late", "Excused")
STATUS_LOOKUP = {status.upper(): status for status in ATTENDANCE_STATUSES}


def get_lang(request: Request):
    # Try query param, then Accept-Language header
    lang = request.query_params.get("lang")
    if lang and lang.lower() in TRANSLATIONS:
        return lang.lower()
    accept = request.headers.get("accept-language", "").lower()
    if "el" in accept:
        return "el"
    return "en"


def t(key: str, lang: str) -> str:
    return TRANSLATIONS.get(lang, TRANSLATIONS["en"]).get(key, key)


HEADER_DEFINITIONS = {
    "students": [
        "header_id",
        "label_first_name",
        "label_last_name",
        "label_email",
        "label_student_id",
        "label_enrollment_date",
        "label_status",
    ],
    "student_grades": [
        "assignment",
        "category",
        "score",
        "max_score",
        "percentage",
        "label_weight",
        "label_grade",
        "label_date",
    ],
    "attendance": [
        "header_id",
        "label_student_id",
        "label_course_id",
        "label_date",
        "label_status",
        "label_period",
        "label_notes",
    ],
    "overview": ["label_metric", "label_value"],
    "status_counts": ["label_status", "label_count"],
    "course_summary": [
        "label_course_code",
        "label_course_name",
        "label_total_records",
        "present",
        "absent",
        "late",
        "excused",
        "attendance_rate_percent",
    ],
    "period_summary": [
        "label_period",
        "label_total_records",
        "present",
        "absent",
        "late",
        "excused",
        "attendance_rate_percent",
    ],
    "course_periods": [
        "label_course_code",
        "label_course_name",
        "label_period",
        "label_total_records",
        "present",
        "absent",
        "late",
        "excused",
        "attendance_rate_percent",
    ],
    "student_summary": [
        "label_student_id",
        "label_student_name",
        "label_total_records",
        "present",
        "absent",
        "late",
        "excused",
        "label_most_frequent_status",
    ],
    "daily_overview": [
        "label_date",
        "label_total_records",
        "present",
        "absent",
        "late",
        "excused",
    ],
    "courses": [
        "header_id",
        "label_course_code",
        "label_course_name",
        "label_semester",
        "label_credits",
        "label_hours_per_week",
        "label_description",
    ],
    "enrollments": [
        "header_id",
        "label_student_id",
        "label_student_name",
        "label_course_id",
        "label_course_code",
        "label_course_name",
        "label_enrolled_date",
    ],
    "all_grades": [
        "header_id",
        "label_student_id",
        "label_student_name",
        "label_course_id",
        "label_course_name",
        "assignment",
        "category",
        "score",
        "max_score",
        "percentage",
        "label_weight",
        "label_date_submitted",
    ],
    "daily_performance": [
        "header_id",
        "label_student_id",
        "label_student_name",
        "label_course_id",
        "label_course_name",
        "label_date",
        "category",
        "score",
        "max_score",
        "percentage",
        "label_notes",
    ],
    "highlights": [
        "header_id",
        "label_student_id",
        "label_student_name",
        "label_semester",
        "category",
        "label_rating",
        "label_highlight_text",
        "label_date_created",
        "label_is_positive",
    ],
}


def get_header_row(key: str, lang: str) -> list[str]:
    keys = HEADER_DEFINITIONS.get(key, [])
    return [t(k, lang) for k in keys]


def translate_status_value(status: str, lang: str) -> str:
    normalized = (status or "").strip().lower()
    if normalized in {"present", "absent", "late", "excused"}:
        return t(normalized, lang)
    return status or ""


def not_available(lang: str) -> str:
    return t("not_available", lang)


def yes_no(value: bool, lang: str) -> str:
    return t("yes_label", lang) if value else t("no_label", lang)


def grade_report_heading(student_name: str, student_code: str, lang: str) -> str:
    template = t("grade_report_title", lang)
    return template.format(student_name=student_name, student_code=student_code)


"""
Export Routes
Provides endpoints to export data to Excel/PDF.
"""

import logging
from datetime import datetime
from io import BytesIO
from typing import Any

import openpyxl
from fastapi.responses import StreamingResponse
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

HEADER_FILL = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")


def _init_status_counts():
    return {status: 0 for status in ATTENDANCE_STATUSES}


def _normalize_status(status: str | None) -> str:
    if not status:
        return "Present"
    if not isinstance(status, str):
        return "Present"
    normalized = STATUS_LOOKUP.get(status.strip().upper())
    return normalized or "Present"


def _apply_table_header(ws: Worksheet, headers, row: int = 1):
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col, value=header)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center")


def _auto_fit_columns(ws: Any):
    for column_cells in ws.columns:
        max_length = 0
        column_letter = get_column_letter(column_cells[0].column)
        for cell in column_cells:
            try:
                cell_length = len(str(cell.value)) if cell.value is not None else 0
            except Exception:
                cell_length = 0
            if cell_length > max_length:
                max_length = cell_length
        ws.column_dimensions[column_letter].width = min(max(max_length + 2, 12), 45)


def _dominant_status(counts: dict[str, int]) -> str:
    best_status = ATTENDANCE_STATUSES[0]
    best_value = -1
    for status in ATTENDANCE_STATUSES:
        value = counts.get(status, 0)
        if value > best_value:
            best_status = status
            best_value = value
    return best_status


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/export",
    tags=["Export"],
    responses={404: {"description": "Not found"}},
)


from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names
from backend.schemas.audit import AuditAction, AuditResource
from backend.rbac import require_permission
from backend.services.audit_service import AuditLogger


@router.get("/students/excel")
@require_permission("exports:generate")
async def export_students_excel(
    request: Request,
    db: Session = Depends(get_db),
):
    audit = AuditLogger(db)
    try:
        (Student,) = import_names("models", "Student")
        lang = get_lang(request)

        students = db.query(Student).filter(Student.deleted_at.is_(None)).all()

        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_students", lang)
        headers = get_header_row("students", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")
        for row, s in enumerate(students, 2):
            ws.cell(row=row, column=1, value=s.id)
            ws.cell(row=row, column=2, value=s.first_name)
            ws.cell(row=row, column=3, value=s.last_name)
            ws.cell(row=row, column=4, value=s.email)
            ws.cell(row=row, column=5, value=s.student_id)
            ws.cell(row=row, column=6, value=str(s.enrollment_date))
            ws.cell(row=row, column=7, value=t("status_active", lang) if s.is_active else t("status_inactive", lang))
        for col in range(1, len(headers) + 1):
            ws.column_dimensions[get_column_letter(col)].width = 18
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"students_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        # Log successful export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.STUDENT,
            details={"count": len(students), "format": "excel", "filename": filename},
            success=True,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export students excel failed: %s", exc, exc_info=True)
        # Log failed export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.STUDENT,
            details={"error": str(exc), "format": "excel"},
            success=False,
        )
        raise http_error(500, ErrorCode.EXPORT_FAILED, "Export failed", request)


@router.get("/grades/excel/{student_id}")
@require_permission("exports:generate")
async def export_student_grades_excel(student_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        Student, Grade = import_names("models", "Student", "Grade")
        lang = get_lang(request)

        student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()
        if not student:
            raise http_error(
                404,
                ErrorCode.STUDENT_NOT_FOUND,
                "Student not found",
                request,
                context={"student_id": student_id},
            )
        grades = db.query(Grade).filter(Grade.student_id == student_id, Grade.deleted_at.is_(None)).all()

        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_grades", lang)
        ws.merge_cells("A1:H1")
        title = ws["A1"]
        student_name = f"{student.first_name} {student.last_name}".strip()
        title.value = grade_report_heading(student_name, student.student_id, lang)
        title.font = Font(size=16, bold=True)
        title.alignment = Alignment(horizontal="center")
        headers = get_header_row("student_grades", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=3, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        total_percentage = 0
        for row, g in enumerate(grades, 4):
            pct = (g.grade / g.max_grade) * 100 if g.max_grade else 0
            total_percentage += pct
            ws.cell(row=row, column=1, value=g.assignment_name)
            ws.cell(row=row, column=2, value=g.category or not_available(lang))
            ws.cell(row=row, column=3, value=g.grade)
            ws.cell(row=row, column=4, value=g.max_grade)
            ws.cell(row=row, column=5, value=f"{pct:.2f}%")
            ws.cell(row=row, column=6, value=g.weight)
            ws.cell(row=row, column=7, value=_letter_grade(pct))
            ws.cell(row=row, column=8, value=str(g.date_submitted) if g.date_submitted else not_available(lang))
        for col in range(1, 9):
            ws.column_dimensions[get_column_letter(col)].width = 18
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"grades_{student.student_id}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Export grades excel failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


def _letter_grade(percentage: float) -> str:
    """
    Convert a percentage grade to a letter grade using standard academic scale.

    Args:
        percentage: Numeric grade as a percentage (0-100)

    Returns:
        Letter grade: A+ (97-100), A (93-96), A- (90-92), B+ (87-89), B (83-86),
                     B- (80-82), C+ (77-79), C (70-76), D (60-69), F (0-59)
    """
    if percentage >= 97:
        return "A+"
    if percentage >= 93:
        return "A"
    if percentage >= 90:
        return "A-"
    if percentage >= 87:
        return "B+"
    if percentage >= 83:
        return "B"
    if percentage >= 80:
        return "B-"
    if percentage >= 77:
        return "C+"
    if percentage >= 70:
        return "C"
    if percentage >= 60:
        return "D"
    return "F"


@router.get("/students/pdf")
@require_permission("exports:generate")
async def export_students_pdf(request: Request, db: Session = Depends(get_db)):
    try:
        (Student,) = import_names("models", "Student")
        lang = get_lang(request)
        font_path = os.path.join(os.path.dirname(__file__), "../fonts/DejaVuSans.ttf")
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))

        students = db.query(Student).filter(Student.deleted_at.is_(None)).all()
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements: list[Flowable] = []
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontName="DejaVuSans",
            fontSize=24,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=30,
            alignment=1,
        )
        elements.append(Paragraph(t("student_directory_title", lang), title_style))
        elements.append(Spacer(1, 0.2 * inch))
        data = [
            [
                t("header_id", lang),
                t("label_student_name", lang),
                t("label_student_id", lang),
                t("label_email", lang),
                t("label_enrollment_date", lang),
                t("label_status", lang),
            ]
        ]
        for s in students:
            data.append(
                [
                    str(s.id),
                    f"{s.first_name} {s.last_name}",
                    s.student_id,
                    s.email,
                    str(s.enrollment_date),
                    t("status_active", lang) if s.is_active else t("status_inactive", lang),
                ]
            )
        table = Table(data, colWidths=[0.5 * inch, 1.5 * inch, 1 * inch, 2 * inch, 1 * inch, 0.8 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), "DejaVuSans"),
                    ("FONTSIZE", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        filename = f"students_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export students pdf failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/attendance/excel")
@require_permission("exports:generate")
async def export_attendance_excel(request: Request, db: Session = Depends(get_db)):
    audit = AuditLogger(db)
    try:
        (Attendance,) = import_names("models", "Attendance")
        lang = get_lang(request)

        records = db.query(Attendance).filter(Attendance.deleted_at.is_(None)).all()
        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_attendance", lang)
        headers = get_header_row("attendance", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        for row, r in enumerate(records, 2):
            ws.cell(row=row, column=1, value=r.id)
            ws.cell(row=row, column=2, value=r.student_id)
            ws.cell(row=row, column=3, value=r.course_id)
            ws.cell(row=row, column=4, value=str(r.date))
            ws.cell(row=row, column=5, value=translate_status_value(r.status, lang))
            ws.cell(row=row, column=6, value=r.period_number)
            ws.cell(row=row, column=7, value=r.notes or "")
        for col in range(1, 8):
            ws.column_dimensions[get_column_letter(col)].width = 15
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"attendance_{datetime.now().strftime('%Y%m%d')}.xlsx"
        # Log successful export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.ATTENDANCE,
            details={"count": len(records), "format": "excel", "filename": filename},
            success=True,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export attendance excel failed: %s", exc, exc_info=True)
        # Log failed export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.ATTENDANCE,
            details={"error": str(exc), "format": "excel"},
            success=False,
        )
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/attendance/analytics/excel")
@require_permission("exports:generate")
async def export_attendance_analytics_excel(request: Request, db: Session = Depends(get_db)):
    try:
        Attendance, Student, Course = import_names("models", "Attendance", "Student", "Course")
        lang = get_lang(request)
        na_value = not_available(lang)

        rows = (
            db.query(
                Attendance.id,
                Attendance.date,
                Attendance.status,
                Attendance.period_number,
                Attendance.course_id,
                Attendance.student_id,
                Student.student_id.label("student_code"),
                Student.first_name,
                Student.last_name,
                Course.course_code,
                Course.course_name,
            )
            .join(Student, Student.id == Attendance.student_id)
            .join(Course, Course.id == Attendance.course_id)
            .filter(Attendance.deleted_at.is_(None))
            .all()
        )

        overall_counts = _init_status_counts()
        course_summary: dict[int, dict[str, Any]] = {}
        period_summary: dict[int, dict[str, Any]] = {}
        course_period_summary: dict[tuple[int, int], dict[str, Any]] = {}
        student_summary: dict[int, dict[str, Any]] = {}
        daily_summary: dict[Any, dict[str, Any]] = {}
        unique_students = set()
        unique_courses = set()
        date_values = set()

        for (
            _attendance_id,
            att_date,
            status,
            period_number,
            course_id,
            student_id,
            student_code,
            first_name,
            last_name,
            course_code,
            course_name,
        ) in rows:
            safe_status = _normalize_status(status)
            period = period_number or 1
            student_label = (f"{first_name or ''} {last_name or ''}").strip() or na_value
            course_label = course_code or na_value
            course_title = course_name or na_value

            overall_counts[safe_status] += 1
            unique_students.add(student_id)
            unique_courses.add(course_id)
            if att_date:
                date_values.add(att_date)

            course_entry = course_summary.setdefault(
                course_id,
                {"course_code": course_label, "course_name": course_title, "counts": _init_status_counts(), "total": 0},
            )
            course_entry["counts"][safe_status] += 1
            course_entry["total"] += 1

            period_entry = period_summary.setdefault(
                period,
                {"counts": _init_status_counts(), "total": 0},
            )
            period_entry["counts"][safe_status] += 1
            period_entry["total"] += 1

            course_period_entry = course_period_summary.setdefault(
                (course_id, period),
                {
                    "course_code": course_label,
                    "course_name": course_title,
                    "period": period,
                    "counts": _init_status_counts(),
                    "total": 0,
                },
            )
            course_period_entry["counts"][safe_status] += 1
            course_period_entry["total"] += 1

            student_entry = student_summary.setdefault(
                student_id,
                {
                    "student_code": student_code or str(student_id),
                    "student_name": student_label,
                    "counts": _init_status_counts(),
                    "total": 0,
                },
            )
            student_entry["counts"][safe_status] += 1
            student_entry["total"] += 1

            if att_date:
                daily_entry = daily_summary.setdefault(att_date, {"counts": _init_status_counts(), "total": 0})
                daily_entry["counts"][safe_status] += 1
                daily_entry["total"] += 1

        total_records = sum(overall_counts.values())
        present_share = (overall_counts["Present"] / total_records * 100) if total_records else 0
        date_range = na_value
        if date_values:
            sorted_dates = sorted(date_values)
            date_range = f"{sorted_dates[0].isoformat()} → {sorted_dates[-1].isoformat()}"

        wb = openpyxl.Workbook()
        overview_ws: Any = wb.active
        overview_ws.title = t("sheet_overview", lang)
        overview_ws["A1"] = t("title_attendance_export", lang)
        overview_ws["A1"].font = Font(size=16, bold=True)
        overview_ws.append(get_header_row("overview", lang))
        overview_ws.append([t("label_total_records", lang), total_records])
        overview_ws.append([t("label_unique_students", lang), len(unique_students)])
        overview_ws.append([t("label_unique_courses", lang), len(unique_courses)])
        overview_ws.append([t("label_date_range", lang), date_range])
        overview_ws.append([t("label_present_share", lang), f"{present_share:.1f}%"])
        overview_ws.append([t("label_generated_on_table", lang), datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        overview_ws.append([])
        overview_ws.append(get_header_row("status_counts", lang))
        for status in ATTENDANCE_STATUSES:
            overview_ws.append([t(status.lower(), lang), overall_counts[status]])
        if total_records == 0:
            overview_ws.append([])
            overview_ws.append([t("label_notice", lang), t("label_no_attendance", lang)])
        _auto_fit_columns(overview_ws)

        course_ws = wb.create_sheet(t("sheet_course_summary", lang))
        course_headers = get_header_row("course_summary", lang)
        _apply_table_header(course_ws, course_headers)
        for row_idx, data in enumerate(sorted(course_summary.values(), key=lambda item: item["course_code"]), start=2):
            counts = data["counts"]
            total = data["total"]
            rate = (counts["Present"] / total * 100) if total else 0
            values = [
                data["course_code"],
                data["course_name"],
                total,
                counts["Present"],
                counts["Absent"],
                counts["Late"],
                counts["Excused"],
                f"{rate:.1f}%",
            ]
            for col, value in enumerate(values, 1):
                course_ws.cell(row=row_idx, column=col, value=value)
        _auto_fit_columns(course_ws)

        period_ws = wb.create_sheet(t("sheet_period_summary", lang))
        period_headers = get_header_row("period_summary", lang)
        _apply_table_header(period_ws, period_headers)
        for row_idx, period in enumerate(sorted(period_summary.keys()), start=2):
            counts = period_summary[period]["counts"]
            total = period_summary[period]["total"]
            rate = (counts["Present"] / total * 100) if total else 0
            values = [
                period,
                total,
                counts["Present"],
                counts["Absent"],
                counts["Late"],
                counts["Excused"],
                f"{rate:.1f}%",
            ]
            for col, value in enumerate(values, 1):
                period_ws.cell(row=row_idx, column=col, value=value)
        _auto_fit_columns(period_ws)

        course_period_ws = wb.create_sheet(t("sheet_course_periods", lang))
        course_period_headers = get_header_row("course_periods", lang)
        _apply_table_header(course_period_ws, course_period_headers)
        for row_idx, key in enumerate(
            sorted(
                course_period_summary.keys(), key=lambda item: (course_period_summary[item]["course_code"], item[1])
            ),
            start=2,
        ):
            data = course_period_summary[key]
            counts = data["counts"]
            total = data["total"]
            rate = (counts["Present"] / total * 100) if total else 0
            values = [
                data["course_code"],
                data["course_name"],
                data["period"],
                total,
                counts["Present"],
                counts["Absent"],
                counts["Late"],
                counts["Excused"],
                f"{rate:.1f}%",
            ]
            for col, value in enumerate(values, 1):
                course_period_ws.cell(row=row_idx, column=col, value=value)
        _auto_fit_columns(course_period_ws)

        student_ws = wb.create_sheet(t("sheet_student_summary", lang))
        student_headers = get_header_row("student_summary", lang)
        _apply_table_header(student_ws, student_headers)
        for row_idx, data in enumerate(
            sorted(student_summary.values(), key=lambda item: item["student_name"]), start=2
        ):
            counts = data["counts"]
            most_common = _dominant_status(counts)
            values = [
                data["student_code"],
                data["student_name"],
                data["total"],
                counts["Present"],
                counts["Absent"],
                counts["Late"],
                counts["Excused"],
                translate_status_value(most_common, lang),
            ]
            for col, value in enumerate(values, 1):
                student_ws.cell(row=row_idx, column=col, value=value)
        _auto_fit_columns(student_ws)

        daily_ws = wb.create_sheet(t("sheet_daily_overview", lang))
        daily_headers = get_header_row("daily_overview", lang)
        _apply_table_header(daily_ws, daily_headers)
        for row_idx, day in enumerate(sorted(daily_summary.keys()), start=2):
            counts = daily_summary[day]["counts"]
            values = [
                day.isoformat(),
                daily_summary[day]["total"],
                counts["Present"],
                counts["Absent"],
                counts["Late"],
                counts["Excused"],
            ]
            for col, value in enumerate(values, 1):
                daily_ws.cell(row=row_idx, column=col, value=value)
        _auto_fit_columns(daily_ws)

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"attendance_analytics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export attendance analytics excel failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/courses/excel")
@require_permission("exports:generate")
async def export_courses_excel(request: Request, db: Session = Depends(get_db)):
    """Export all courses to Excel"""
    audit = AuditLogger(db)
    try:
        (Course,) = import_names("models", "Course")
        lang = get_lang(request)

        courses = db.query(Course).filter(Course.deleted_at.is_(None)).all()

        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_courses", lang)
        headers = get_header_row("courses", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, c in enumerate(courses, 2):
            ws.cell(row=row, column=1, value=c.id)
            ws.cell(row=row, column=2, value=c.course_code)
            ws.cell(row=row, column=3, value=c.course_name)
            ws.cell(row=row, column=4, value=c.semester)
            ws.cell(row=row, column=5, value=c.credits)
            ws.cell(row=row, column=6, value=c.hours_per_week)
            ws.cell(row=row, column=7, value=c.description or "")

        for col in range(1, 8):
            ws.column_dimensions[get_column_letter(col)].width = 20

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"courses_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        # Log successful export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.COURSE,
            details={"count": len(courses), "format": "excel", "filename": filename},
            success=True,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export courses excel failed: %s", exc, exc_info=True)
        # Log failed export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.COURSE,
            details={"error": str(exc), "format": "excel"},
            success=False,
        )
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/enrollments/excel")
@require_permission("exports:generate")
async def export_enrollments_excel(request: Request, db: Session = Depends(get_db)):
    """Export all course enrollments to Excel"""
    audit = AuditLogger(db)
    try:
        CourseEnrollment, Student, Course = import_names("models", "CourseEnrollment", "Student", "Course")
        lang = get_lang(request)
        na_value = not_available(lang)

        enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.deleted_at.is_(None)).all()

        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_enrollments", lang)
        headers = get_header_row("enrollments", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, e in enumerate(enrollments, 2):
            student = db.query(Student).filter(Student.id == e.student_id, Student.deleted_at.is_(None)).first()
            course = db.query(Course).filter(Course.id == e.course_id, Course.deleted_at.is_(None)).first()

            ws.cell(row=row, column=1, value=e.id)
            ws.cell(row=row, column=2, value=e.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else na_value)
            ws.cell(row=row, column=4, value=e.course_id)
            ws.cell(row=row, column=5, value=course.course_code if course else na_value)
            ws.cell(row=row, column=6, value=course.course_name if course else na_value)
            ws.cell(row=row, column=7, value=str(e.enrolled_at))

        for col in range(1, 8):
            ws.column_dimensions[get_column_letter(col)].width = 18

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"enrollments_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        # Log successful export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.ENROLLMENT,
            details={"count": len(enrollments), "format": "excel", "filename": filename},
            success=True,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export enrollments excel failed: %s", exc, exc_info=True)
        # Log failed export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.ENROLLMENT,
            details={"error": str(exc), "format": "excel"},
            success=False,
        )
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/grades/excel")
@require_permission("exports:generate")
async def export_all_grades_excel(request: Request, db: Session = Depends(get_db)):
    """Export all grades to Excel"""
    audit = AuditLogger(db)
    try:
        Grade, Student, Course = import_names("models", "Grade", "Student", "Course")
        lang = get_lang(request)
        na_value = not_available(lang)

        grades = db.query(Grade).filter(Grade.deleted_at.is_(None)).all()

        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_all_grades", lang)
        headers = get_header_row("all_grades", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, g in enumerate(grades, 2):
            student = db.query(Student).filter(Student.id == g.student_id, Student.deleted_at.is_(None)).first()
            course = db.query(Course).filter(Course.id == g.course_id, Course.deleted_at.is_(None)).first()
            pct = (g.grade / g.max_grade) * 100 if g.max_grade else 0

            ws.cell(row=row, column=1, value=g.id)
            ws.cell(row=row, column=2, value=g.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else na_value)
            ws.cell(row=row, column=4, value=g.course_id)
            ws.cell(row=row, column=5, value=course.course_name if course else na_value)
            ws.cell(row=row, column=6, value=g.assignment_name)
            ws.cell(row=row, column=7, value=g.category or na_value)
            ws.cell(row=row, column=8, value=g.grade)
            ws.cell(row=row, column=9, value=g.max_grade)
            ws.cell(row=row, column=10, value=f"{pct:.2f}%")
            ws.cell(row=row, column=11, value=g.weight)
            ws.cell(row=row, column=12, value=str(g.date_submitted) if g.date_submitted else na_value)

        for col in range(1, 13):
            ws.column_dimensions[get_column_letter(col)].width = 15

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"all_grades_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        # Log successful export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.GRADE,
            details={"count": len(grades), "format": "excel", "filename": filename},
            success=True,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export all grades excel failed: %s", exc, exc_info=True)
        # Log failed export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.GRADE,
            details={"error": str(exc), "format": "excel"},
            success=False,
        )
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/performance/excel")
@require_permission("exports:generate")
async def export_daily_performance_excel(request: Request, db: Session = Depends(get_db)):
    """Export all daily performance records to Excel"""
    audit = AuditLogger(db)
    try:
        DailyPerformance, Student, Course = import_names("models", "DailyPerformance", "Student", "Course")
        lang = get_lang(request)
        na_value = not_available(lang)

        performances = db.query(DailyPerformance).filter(DailyPerformance.deleted_at.is_(None)).all()

        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_daily_performance", lang)
        headers = get_header_row("daily_performance", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, p in enumerate(performances, 2):
            student = db.query(Student).filter(Student.id == p.student_id, Student.deleted_at.is_(None)).first()
            course = db.query(Course).filter(Course.id == p.course_id, Course.deleted_at.is_(None)).first()

            ws.cell(row=row, column=1, value=p.id)
            ws.cell(row=row, column=2, value=p.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else na_value)
            ws.cell(row=row, column=4, value=p.course_id)
            ws.cell(row=row, column=5, value=course.course_name if course else na_value)
            ws.cell(row=row, column=6, value=str(p.date))
            ws.cell(row=row, column=7, value=p.category or na_value)
            ws.cell(row=row, column=8, value=p.score)
            ws.cell(row=row, column=9, value=p.max_score)
            ws.cell(row=row, column=10, value=f"{p.percentage:.2f}%")
            ws.cell(row=row, column=11, value=p.notes or "")

        for col in range(1, 12):
            ws.column_dimensions[get_column_letter(col)].width = 15

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"daily_performance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        # Log successful export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.PERFORMANCE,
            details={"count": len(performances), "format": "excel", "filename": filename},
            success=True,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export daily performance excel failed: %s", exc, exc_info=True)
        # Log failed export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.PERFORMANCE,
            details={"error": str(exc), "format": "excel"},
            success=False,
        )
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/highlights/excel")
@require_permission("exports:generate")
async def export_highlights_excel(request: Request, db: Session = Depends(get_db)):
    """Export all student highlights to Excel"""
    audit = AuditLogger(db)
    try:
        Highlight, Student = import_names("models", "Highlight", "Student")
        lang = get_lang(request)
        na_value = not_available(lang)

        highlights = db.query(Highlight).filter(Highlight.deleted_at.is_(None)).all()

        wb = openpyxl.Workbook()
        ws: Any = wb.active
        ws.title = t("sheet_highlights", lang)
        headers = get_header_row("highlights", lang)
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, h in enumerate(highlights, 2):
            student = db.query(Student).filter(Student.id == h.student_id, Student.deleted_at.is_(None)).first()

            ws.cell(row=row, column=1, value=h.id)
            ws.cell(row=row, column=2, value=h.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else na_value)
            ws.cell(row=row, column=4, value=h.semester)
            ws.cell(row=row, column=5, value=h.category or na_value)
            ws.cell(row=row, column=6, value=h.rating or na_value)
            ws.cell(row=row, column=7, value=h.highlight_text)
            ws.cell(row=row, column=8, value=str(h.date_created))
            ws.cell(row=row, column=9, value=yes_no(bool(h.is_positive), lang))

        for col in range(1, 10):
            ws.column_dimensions[get_column_letter(col)].width = 18

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"highlights_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        # Log successful export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.HIGHLIGHT,
            details={"count": len(highlights), "format": "excel", "filename": filename},
            success=True,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export highlights excel failed: %s", exc, exc_info=True)
        # Log failed export
        audit.log_from_request(
            request=request,
            action=AuditAction.BULK_EXPORT,
            resource=AuditResource.HIGHLIGHT,
            details={"error": str(exc), "format": "excel"},
            success=False,
        )
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/student-report/pdf/{student_id}")
@require_permission("exports:generate")
async def export_student_report_pdf(student_id: int, request: Request, db: Session = Depends(get_db)):
    """Generate comprehensive student report PDF with grades, attendance, and analytics"""
    try:
        Student, Grade, Attendance, Course, DailyPerformance = import_names(
            "models", "Student", "Grade", "Attendance", "Course", "DailyPerformance"
        )
        lang = get_lang(request)
        # Register DejaVu Sans font for Unicode/Greek support
        font_path = os.path.join(os.path.dirname(__file__), "../fonts/DejaVuSans.ttf")
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
        elements: list[Flowable] = []
        styles = getSampleStyleSheet()
        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontName="DejaVuSans",
            fontSize=20,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
            alignment=1,
        )
        student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()
        if not student:
            raise http_error(
                404,
                ErrorCode.STUDENT_NOT_FOUND,
                "Student not found",
                request,
                context={"student_id": student_id},
            )
        elements.append(Paragraph(t("report_title", lang), title_style))
        # Student Info
        info_style = ParagraphStyle(
            "InfoStyle",
            parent=styles["Normal"],
            fontName="DejaVuSans",
            fontSize=12,
            spaceAfter=20,
            alignment=1,
        )
        elements.append(
            Paragraph(
                f"<b>{student.first_name} {student.last_name}</b> ({student.student_id})<br/>{student.email}",
                info_style,
            )
        )
        elements.append(Spacer(1, 0.3 * inch))
        # Attendance Summary
        subtitle_style = ParagraphStyle(
            "SubtitleStyle",
            parent=styles["Heading2"],
            fontName="DejaVuSans",
            fontSize=14,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
        )
        elements.append(Paragraph(t("attendance_summary", lang), subtitle_style))
        attendance_records = (
            db.query(Attendance).filter(Attendance.student_id == student_id, Attendance.deleted_at.is_(None)).all()
        )
        total_att = len(attendance_records)
        present = len([a for a in attendance_records if a.status == "Present"])
        absent = len([a for a in attendance_records if a.status == "Absent"])
        late = len([a for a in attendance_records if a.status == "Late"])
        excused = len([a for a in attendance_records if a.status == "Excused"])
        att_rate = (present / total_att * 100) if total_att > 0 else 0
        att_data = [
            [
                t("total_classes", lang),
                t("present", lang),
                t("absent", lang),
                t("late", lang),
                t("excused", lang),
                t("attendance_rate", lang),
            ],
            [str(total_att), str(present), str(absent), str(late), str(excused), f"{att_rate:.1f}%"],
        ]
        att_table = Table(att_data, colWidths=[1.2 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch, 1.3 * inch])
        att_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), "DejaVuSans"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(att_table)
        elements.append(Spacer(1, 0.3 * inch))
        # Grades by Course
        elements.append(Paragraph(t("grades_by_course", lang), subtitle_style))
        grades = db.query(Grade).filter(Grade.student_id == student_id, Grade.deleted_at.is_(None)).all()
        course_grades = {}
        for g in grades:
            if g.course_id not in course_grades:
                course_grades[g.course_id] = []
            course_grades[g.course_id].append(g)
        for course_id, course_grade_list in course_grades.items():
            course = db.query(Course).filter(Course.id == course_id, Course.deleted_at.is_(None)).first()
            if not course:
                continue
            elements.append(
                Paragraph(
                    f"<b>{course.course_code} - {course.course_name}</b>",
                    ParagraphStyle("CourseTitle", parent=styles["Normal"], fontName="DejaVuSans"),
                )
            )
            elements.append(Spacer(1, 0.1 * inch))
            grade_data = [
                [
                    t("assignment", lang),
                    t("category", lang),
                    t("score", lang),
                    t("max_score", lang),
                    t("percentage", lang),
                    t("letter", lang),
                ]
            ]
            total_pct = 0
            for g in course_grade_list:
                pct = (g.grade / g.max_grade * 100) if g.max_grade else 0
                total_pct += pct
                grade_data.append(
                    [
                        g.assignment_name[:20],
                        g.category or "N/A",
                        str(g.grade),
                        str(g.max_grade),
                        f"{pct:.1f}%",
                        _letter_grade(pct),
                    ]
                )
            avg_pct = total_pct / len(course_grade_list) if course_grade_list else 0
            grade_data.append(["", "", "", t("average", lang), f"{avg_pct:.1f}%", _letter_grade(avg_pct)])
            grade_table = Table(
                grade_data, colWidths=[2 * inch, 1.2 * inch, 0.8 * inch, 1 * inch, 1 * inch, 0.8 * inch]
            )
            grade_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, -1), "DejaVuSans"),
                        ("FONTSIZE", (0, 0), (-1, 0), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                        ("BACKGROUND", (0, 1), (-1, -2), colors.beige),
                        ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
                        ("FONTNAME", (0, -1), (-1, -1), "DejaVuSans"),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
            )
            elements.append(grade_table)
            elements.append(Spacer(1, 0.2 * inch))
        # Daily Performance Summary
        daily_perf = (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.student_id == student_id,
                DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )
        if daily_perf:
            elements.append(Paragraph(t("daily_performance_summary", lang), subtitle_style))
            avg_perf = sum(dp.percentage for dp in daily_perf) / len(daily_perf)
            perf_text = (
                f"{t('total_daily_entries', lang)}: {len(daily_perf)}<br/>{t('avg_performance', lang)}: {avg_perf:.1f}%"
            )
            elements.append(
                Paragraph(perf_text, ParagraphStyle("PerfText", parent=styles["Normal"], fontName="DejaVuSans"))
            )
            elements.append(Spacer(1, 0.2 * inch))
        # Footer
        footer_style = ParagraphStyle(
            "FooterStyle",
            parent=styles["Normal"],
            fontName="DejaVuSans",
            fontSize=8,
            textColor=colors.grey,
            alignment=1,
        )
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(
            Paragraph(
                f"{t('generated_on', lang)} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>{t('system', lang)}",
                footer_style,
            )
        )
        doc.build(elements)
        buffer.seek(0)
        filename = f"student_report_{student.student_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Export student report pdf failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/courses/pdf")
@require_permission("exports:generate")
async def export_courses_pdf(request: Request, db: Session = Depends(get_db)):
    """Export all courses to PDF"""
    try:
        (Course,) = import_names("models", "Course")
        lang = get_lang(request)
        font_path = os.path.join(os.path.dirname(__file__), "../fonts/DejaVuSans.ttf")
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))

        courses = db.query(Course).filter(Course.deleted_at.is_(None)).all()

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements: list[Flowable] = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontName="DejaVuSans",
            fontSize=24,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=30,
            alignment=1,
        )
        elements.append(Paragraph(t("title_course_catalog", lang), title_style))
        elements.append(Spacer(1, 0.2 * inch))

        data = [
            [
                t("label_course_code", lang),
                t("label_course_name", lang),
                t("label_semester", lang),
                t("label_credits", lang),
                t("label_hours", lang),
            ]
        ]
        for c in courses:
            data.append(
                [
                    c.course_code,
                    c.course_name[:30],
                    c.semester or not_available(lang),
                    str(c.credits or 0),
                    str(c.hours_per_week or 0),
                ]
            )

        table = Table(data, colWidths=[1 * inch, 2.5 * inch, 1.3 * inch, 0.8 * inch, 1 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), "DejaVuSans"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)
        filename = f"courses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as exc:
        logger.error("Export courses pdf failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )


@router.get("/analytics/course/{course_id}/pdf")
@require_permission("exports:generate")
async def export_course_analytics_pdf(course_id: int, request: Request, db: Session = Depends(get_db)):
    """Export course analytics report to PDF"""
    try:
        Course, Grade, CourseEnrollment = import_names("models", "Course", "Grade", "CourseEnrollment")
        lang = get_lang(request)
        font_path = os.path.join(os.path.dirname(__file__), "../fonts/DejaVuSans.ttf")
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))

        course = db.query(Course).filter(Course.id == course_id, Course.deleted_at.is_(None)).first()
        if not course:
            raise http_error(
                404,
                ErrorCode.COURSE_NOT_FOUND,
                "Course not found",
                request,
                context={"course_id": course_id},
            )

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch)
        elements: list[Flowable] = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontName="DejaVuSans",
            fontSize=20,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
            alignment=1,
        )
        elements.append(Paragraph(t("title_course_analytics", lang), title_style))

        # Course Info
        info_style = ParagraphStyle(
            "InfoStyle",
            parent=styles["Normal"],
            fontName="DejaVuSans",
            fontSize=12,
            spaceAfter=20,
            alignment=1,
        )
        elements.append(
            Paragraph(
                f"<b>{course.course_code} - {course.course_name}</b><br/>{t('label_semester', lang)}: {course.semester or not_available(lang)}<br/>{t('label_credits', lang)}: {course.credits or 0}",
                info_style,
            )
        )
        elements.append(Spacer(1, 0.3 * inch))

        # Get enrollments
        enrollments = (
            db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.deleted_at.is_(None),
            )
            .all()
        )

        # Get all grades for this course
        grades = db.query(Grade).filter(Grade.course_id == course_id, Grade.deleted_at.is_(None)).all()

        # Calculate statistics
        student_ids = set([e.student_id for e in enrollments])
        total_students = len(student_ids)
        total_assignments = len(grades)

        percentages: list[float] = []
        if grades:
            percentages = [(g.grade / g.max_grade * 100) if g.max_grade else 0 for g in grades]
            avg_grade = sum(percentages) / len(percentages)
            highest = max(percentages)
            lowest = min(percentages)
        else:
            avg_grade = highest = lowest = 0

        # Statistics Table
        subtitle_style = ParagraphStyle(
            "SubtitleStyle",
            parent=styles["Heading2"],
            fontName="DejaVuSans",
            fontSize=14,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
        )
        elements.append(Paragraph(t("title_course_statistics", lang), subtitle_style))

        stats_data = [
            [t("label_metric", lang), t("label_value", lang)],
            [t("label_total_students_enrolled", lang), str(total_students)],
            [t("label_total_assignments", lang), str(total_assignments)],
            [t("label_average_grade", lang), f"{avg_grade:.1f}%"],
            [t("label_highest_grade", lang), f"{highest:.1f}%"],
            [t("label_lowest_grade", lang), f"{lowest:.1f}%"],
        ]

        stats_table = Table(stats_data, colWidths=[3 * inch, 2 * inch])
        stats_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, -1), "DejaVuSans"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(stats_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Grade Distribution
        if grades:
            elements.append(Paragraph(t("title_grade_distribution", lang), subtitle_style))

            # Count letter grades
            a_count = sum(1 for p in percentages if p >= 90)
            b_count = sum(1 for p in percentages if 80 <= p < 90)
            c_count = sum(1 for p in percentages if 70 <= p < 80)
            d_count = sum(1 for p in percentages if 60 <= p < 70)
            f_count = sum(1 for p in percentages if p < 60)

            dist_data = [
                [t("label_letter_grade", lang), t("label_count", lang), t("label_percentage", lang)],
                [t("distribution_a", lang), str(a_count), f"{a_count / len(grades) * 100:.1f}%"],
                [t("distribution_b", lang), str(b_count), f"{b_count / len(grades) * 100:.1f}%"],
                [t("distribution_c", lang), str(c_count), f"{c_count / len(grades) * 100:.1f}%"],
                [t("distribution_d", lang), str(d_count), f"{d_count / len(grades) * 100:.1f}%"],
                [t("distribution_f", lang), str(f_count), f"{f_count / len(grades) * 100:.1f}%"],
            ]

            dist_table = Table(dist_data, colWidths=[2 * inch, 1.5 * inch, 1.5 * inch])
            dist_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, -1), "DejaVuSans"),
                        ("FONTSIZE", (0, 0), (-1, 0), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
            )
            elements.append(dist_table)

        # Footer
        footer_style = ParagraphStyle(
            "FooterStyle",
            parent=styles["Normal"],
            fontName="DejaVuSans",
            fontSize=8,
            textColor=colors.grey,
            alignment=1,
        )
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(
            Paragraph(
                f"{t('generated_on', lang)} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>{t('system', lang)}",
                footer_style,
            )
        )

        doc.build(elements)
        buffer.seek(0)
        filename = f"course_analytics_{course.course_code}_{datetime.now().strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Export course analytics pdf failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Export failed",
            request,
            context={"error": str(exc)},
        )
