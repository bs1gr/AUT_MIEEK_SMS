"""
Custom report generation service for Phase 6 Reporting Enhancements.

Handles report data retrieval and export to PDF/Excel/CSV.
Uses a background-task-friendly entrypoint that opens its own DB session.
"""

from __future__ import annotations

import csv
import logging
import os
import time
from datetime import date, datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    Flowable = Any  # type: ignore

from backend.config import settings
from backend.models import Attendance, Course, CourseEnrollment, GeneratedReport, Grade, Report, Student
from backend.services.analytics_service import AnalyticsService
from backend.services.email_notification_service import EmailNotificationService

logger = logging.getLogger(__name__)

PDF_FONT_REGULAR = "DejaVuSans"
PDF_FONT_BOLD = "DejaVuSans-Bold"
_PDF_FONTS_REGISTERED = False

DEFAULT_REPORT_LANG = "en"
STATUS_TRANSLATIONS_EL = {
    "present": "Παρόν",
    "absent": "Απών",
    "late": "Καθυστέρηση",
    "excused": "Δικαιολογημένη",
    "active": "Ενεργός",
    "inactive": "Ανενεργός",
}
FIELD_LABELS_EL = {
    "id": "Α/Α",
    "student_id": "Κωδικός Μαθητή",
    "student_name": "Ονοματεπώνυμο",
    "first_name": "Όνομα",
    "last_name": "Επώνυμο",
    "email": "Email",
    "mobile_phone": "Κινητό Τηλέφωνο",
    "father_name": "Όνομα Πατέρα",
    "phone": "Τηλέφωνο",
    "enrollment_date": "Ημερομηνία Εγγραφής",
    "is_active": "Ενεργός",
    "school_id": "Κωδικός Σχολής",
    "study_year": "Έτος Σπουδών",
    "year_of_study": "Έτος Σπουδών",
    "academic_year": "Ακαδημαϊκό Έτος",
    "class_division": "Τμήμα",
    "health_issue": "Θέμα Υγείας",
    "note": "Σημείωση",
    "gpa": "Μέσος Όρος",
    "overall_gpa": "Συνολικός Μέσος Όρος",
    "average_grade": "Μέσος Βαθμός",
    "attendance_rate": "Ποσοστό Παρουσίας",
    "total_classes": "Σύνολο Μαθημάτων",
    "attended": "Παρουσίες",
    "total_assignments": "Σύνολο Εργασιών",
    "total_courses": "Σύνολο Μαθημάτων",
    "passed_courses": "Επιτυχημένα Μαθήματα",
    "failed_courses": "Αποτυχημένα Μαθήματα",
    "total_credits": "Σύνολο Πιστωτικών Μονάδων",
    "enrollment_status": "Κατάσταση Εγγραφής",
    "trend": "Τάση Απόδοσης",
    "course_id": "Κωδικός Μαθήματος",
    "course_code": "Κωδικός Μαθήματος",
    "course_name": "Όνομα Μαθήματος",
    "name": "Όνομα",
    "description": "Περιγραφή",
    "credits": "Πιστωτικές Μονάδες",
    "semester": "Εξάμηνο",
    "hours_per_week": "Ώρες ανά Εβδομάδα",
    "absence_penalty": "Ποινή Απουσίας",
    "enrollment_count": "Αριθμός Εγγραφών",
    "total_students": "Σύνολο Σπουδαστών",
    "assignment_name": "Όνομα Εργασίας",
    "category": "Κατηγορία",
    "grade": "Βαθμός",
    "grade_value": "Τιμή Βαθμού",
    "max_grade": "Μέγιστος Βαθμός",
    "percentage": "Ποσοστό",
    "weight": "Βαρύτητα",
    "points": "Μόρια",
    "date_assigned": "Ημερομηνία Καταχώρισης",
    "exam_date": "Ημερομηνία Εξέτασης",
    "date_submitted": "Ημερομηνία Υποβολής",
    "letter_grade": "Γράμμα Βαθμού",
    "notes": "Σημειώσεις",
    "date": "Ημερομηνία",
    "status": "Κατάσταση",
    "period_number": "Περίοδος",
    "assignment": "Εργασία",
    "category_name": "Κατηγορία",
    "status_label": "Κατάσταση",
    "student_code": "Κωδικός Μαθητή",
}

LABEL_TRANSLATIONS_EL = {
    "id": "Α/Α",
    "student id": "Κωδικός Μαθητή",
    "student name": "Ονοματεπώνυμο",
    "first name": "Όνομα",
    "last name": "Επώνυμο",
    "email": "Email",
    "mobile phone": "Κινητό Τηλέφωνο",
    "father name": "Όνομα Πατέρα",
    "phone": "Τηλέφωνο",
    "enrollment date": "Ημερομηνία Εγγραφής",
    "active": "Ενεργός",
    "inactive": "Ανενεργός",
    "study year": "Έτος Σπουδών",
    "academic year": "Ακαδημαϊκό Έτος",
    "class division": "Τμήμα",
    "health issue": "Θέμα Υγείας",
    "note": "Σημείωση",
    "gpa": "Μέσος Όρος",
    "overall gpa": "Συνολικός Μέσος Όρος",
    "average grade": "Μέσος Βαθμός",
    "attendance rate": "Ποσοστό Παρουσίας",
    "total classes": "Σύνολο Μαθημάτων",
    "attended": "Παρουσίες",
    "total assignments": "Σύνολο Εργασιών",
    "total courses": "Σύνολο Μαθημάτων",
    "passed courses": "Επιτυχημένα Μαθήματα",
    "failed courses": "Αποτυχημένα Μαθήματα",
    "total credits": "Σύνολο Πιστωτικών Μονάδων",
    "enrollment status": "Κατάσταση Εγγραφής",
    "trend": "Τάση Απόδοσης",
    "course id": "Κωδικός Μαθήματος",
    "course code": "Κωδικός Μαθήματος",
    "course name": "Όνομα Μαθήματος",
    "name": "Όνομα",
    "description": "Περιγραφή",
    "credits": "Πιστωτικές Μονάδες",
    "semester": "Εξάμηνο",
    "hours per week": "Ώρες ανά Εβδομάδα",
    "absence penalty": "Ποινή Απουσίας",
    "enrollment count": "Αριθμός Εγγραφών",
    "total students": "Σύνολο Σπουδαστών",
    "assignment name": "Όνομα Εργασίας",
    "assignment": "Εργασία",
    "category": "Κατηγορία",
    "grade": "Βαθμός",
    "max grade": "Μέγιστος Βαθμός",
    "percentage": "Ποσοστό",
    "weight": "Βαρύτητα",
    "points": "Μόρια",
    "date assigned": "Ημερομηνία Καταχώρισης",
    "exam date": "Ημερομηνία Εξέτασης",
    "date submitted": "Ημερομηνία Υποβολής",
    "letter grade": "Γράμμα Βαθμού",
    "notes": "Σημειώσεις",
    "date": "Ημερομηνία",
    "status": "Κατάσταση",
    "period": "Περίοδος",
}


def _register_pdf_fonts() -> None:
    global _PDF_FONTS_REGISTERED
    if _PDF_FONTS_REGISTERED:
        return

    fonts_dir = os.path.join(os.path.dirname(__file__), "..", "fonts")
    regular_font = os.path.join(fonts_dir, "DejaVuSans.ttf")
    bold_font = os.path.join(fonts_dir, "DejaVuSans-Bold.ttf")

    try:
        pdfmetrics.registerFont(TTFont(PDF_FONT_REGULAR, regular_font))
        pdfmetrics.registerFont(TTFont(PDF_FONT_BOLD, bold_font))
        _PDF_FONTS_REGISTERED = True
    except Exception:
        logger.warning("Unable to register PDF fonts for Unicode support", exc_info=True)


def _contains_greek(text: str) -> bool:
    return any("\u0370" <= char <= "\u03ff" or "\u1f00" <= char <= "\u1fff" for char in text)


def _normalize_lang(lang: Optional[str]) -> str:
    if not lang:
        return DEFAULT_REPORT_LANG
    normalized = lang.strip().lower()
    if normalized.startswith("el"):
        return "el"
    if normalized.startswith("en"):
        return "en"
    return DEFAULT_REPORT_LANG


def _compute_column_widths(
    headers: Sequence[Any],
    rows: Sequence[Sequence[Any]],
    available_width: float,
    min_width: float = 40,
) -> List[float]:
    column_count = max(len(headers), 1)
    sample_rows = rows[:50] if rows else []
    max_lengths: List[int] = []
    for col_index in range(column_count):
        header_text = str(headers[col_index]) if col_index < len(headers) else ""
        max_len = len(header_text)
        for row in sample_rows:
            if col_index < len(row):
                max_len = max(max_len, len(str(row[col_index])))
        max_lengths.append(max_len or 1)

    total_weight = sum(max_lengths) or column_count
    widths = [max(min_width, (length / total_weight) * available_width) for length in max_lengths]
    total_width = sum(widths)
    if total_width > available_width and total_width > 0:
        scale = available_width / total_width
        widths = [max(min_width, width * scale) for width in widths]
    return widths


class CustomReportGenerationService:
    """Generate report files for custom report definitions."""

    def __init__(self, db: Session):
        self.db = db
        self.reports_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
        os.makedirs(self.reports_dir, exist_ok=True)
        self._analytics_service: Optional[AnalyticsService] = None
        self._analytics_cache: Dict[str, Dict[int, Any]] = {
            "student_summary": {},
            "student_all_courses": {},
            "course_enrollment_count": {},
            "course_average_grade": {},
            "course_attendance_rate": {},
        }

    def _get_analytics_service(self) -> AnalyticsService:
        if not self._analytics_service:
            self._analytics_service = AnalyticsService(self.db)
        return self._analytics_service

    def _get_student_summary(self, student_id: int) -> Dict[str, Any]:
        cached = self._analytics_cache["student_summary"].get(student_id)
        if cached is not None:
            return cached
        try:
            summary = self._get_analytics_service().get_student_summary(student_id)
        except Exception:
            summary = {}
        self._analytics_cache["student_summary"][student_id] = summary
        return summary

    def _get_student_all_courses(self, student_id: int) -> Dict[str, Any]:
        cached = self._analytics_cache["student_all_courses"].get(student_id)
        if cached is not None:
            return cached
        try:
            summary = self._get_analytics_service().get_student_all_courses_summary(student_id)
        except Exception:
            summary = {}
        self._analytics_cache["student_all_courses"][student_id] = summary
        return summary

    def _get_course_enrollment_count(self, course_id: int) -> int:
        cached = self._analytics_cache["course_enrollment_count"].get(course_id)
        if cached is not None:
            return cached
        count = (
            self.db.query(CourseEnrollment)
            .filter(CourseEnrollment.course_id == course_id, CourseEnrollment.deleted_at.is_(None))
            .count()
        )
        self._analytics_cache["course_enrollment_count"][course_id] = count
        return count

    def _get_course_average_grade(self, course_id: int) -> float:
        cached = self._analytics_cache["course_average_grade"].get(course_id)
        if cached is not None:
            return float(cached)
        grades = self.db.query(Grade).filter(Grade.course_id == course_id, Grade.deleted_at.is_(None)).all()
        total = 0.0
        count = 0
        for grade in grades:
            if not grade.max_grade or grade.max_grade <= 0:
                continue
            total += (grade.grade / grade.max_grade) * 100
            count += 1
        average = total / count if count > 0 else 0.0
        self._analytics_cache["course_average_grade"][course_id] = average
        return average

    def _get_course_attendance_rate(self, course_id: int) -> float:
        cached = self._analytics_cache["course_attendance_rate"].get(course_id)
        if cached is not None:
            return float(cached)
        records = (
            self.db.query(Attendance).filter(Attendance.course_id == course_id, Attendance.deleted_at.is_(None)).all()
        )
        total = len(records)
        present = len([r for r in records if str(r.status).lower() == "present"])
        rate = (present / total * 100) if total > 0 else 0.0
        self._analytics_cache["course_attendance_rate"][course_id] = rate
        return rate

    @staticmethod
    def run_generation_task(
        report_id: int,
        generated_report_id: int,
        user_id: int,
        export_format: str,
        include_charts: bool,
        email_recipients: Optional[List[str]] = None,
        email_enabled: Optional[bool] = None,
        lang: Optional[str] = None,
    ) -> None:
        """Background task entrypoint with isolated DB session."""
        from backend.db import SessionLocal

        db = SessionLocal()
        try:
            service = CustomReportGenerationService(db)
            service.generate_report(
                report_id,
                generated_report_id,
                user_id,
                export_format,
                include_charts,
                email_recipients=email_recipients,
                email_enabled=email_enabled,
                lang=lang,
            )
        finally:
            db.close()

    def generate_report(
        self,
        report_id: int,
        generated_report_id: int,
        user_id: int,
        export_format: str,
        include_charts: bool,
        email_recipients: Optional[List[str]] = None,
        email_enabled: Optional[bool] = None,
        lang: Optional[str] = None,
    ) -> None:
        """Generate a report file and update the GeneratedReport record."""
        start_time = time.perf_counter()
        normalized_lang = _normalize_lang(lang)
        generated = self._get_generated_report(report_id, generated_report_id, user_id)
        if not generated:
            logger.error("Generated report record not found: %s", generated_report_id)
            return

        report = self._get_report(report_id, user_id)
        if not report:
            self._mark_failed(generated, "Report not found or access denied")
            return

        self._update_status(generated, "generating")

        try:
            rows, headers = self._build_report_rows(report, normalized_lang)
            file_path = self._export_report(
                rows,
                headers,
                export_format,
                str(generated.file_name),
                title=str(report.name),
                lang=normalized_lang,
            )  # type: ignore[arg-type]
            duration = time.perf_counter() - start_time

            generated.file_path = file_path  # type: ignore[assignment]
            generated.file_size_bytes = os.path.getsize(file_path) if file_path else None  # type: ignore[assignment]
            generated.record_count = len(rows)  # type: ignore[assignment]
            generated.generation_duration_seconds = round(float(duration), 3)  # type: ignore[arg-type,assignment]
            generated.status = "completed"  # type: ignore[assignment]
            generated.error_message = None  # type: ignore[assignment]

            report.last_run_at = datetime.now(timezone.utc)  # type: ignore[assignment]
            self.db.commit()

            self._send_report_email(
                report=report,
                generated=generated,
                export_format=export_format,
                email_recipients=email_recipients,
                email_enabled=email_enabled,
            )
        except Exception as exc:
            logger.error("Report generation failed: %s", exc, exc_info=True)
            self._mark_failed(generated, str(exc))

    def _send_report_email(
        self,
        report: Report,
        generated: GeneratedReport,
        export_format: str,
        email_recipients: Optional[List[str]] = None,
        email_enabled: Optional[bool] = None,
    ) -> None:
        recipients = email_recipients if email_recipients is not None else report.email_recipients
        if isinstance(recipients, str):
            recipients = [recipients]
        if not recipients:
            return

        send_enabled = email_enabled if email_enabled is not None else bool(report.email_enabled)
        if not send_enabled:
            return

        if not EmailNotificationService.is_enabled():
            logger.warning("Email delivery skipped: SMTP not configured")
            return

        file_path = str(generated.file_path or "")
        attachment_paths: list[str] = []
        attachment_note: Optional[str] = None
        max_mb = int(getattr(settings, "SMTP_ATTACHMENT_MAX_MB", 10) or 10)
        max_bytes = max_mb * 1024 * 1024

        if file_path and os.path.exists(file_path):
            try:
                file_size = os.path.getsize(file_path)
                if file_size <= max_bytes:
                    attachment_paths = [file_path]
                else:
                    attachment_note = (
                        f"Attachment not included because the file exceeds {max_mb} MB. "
                        "You can download it from the reports page."
                    )
            except Exception as exc:
                logger.warning("Failed to prepare attachment: %s", exc)
        else:
            attachment_note = "Attachment not found on disk. You can download it from the reports page."

        generated_at = generated.generated_at.isoformat() if generated.generated_at else ""
        success_count, failed = EmailNotificationService.send_report_ready(
            recipients=recipients,
            report_name=str(report.name),
            export_format=export_format,
            record_count=int(generated.record_count) if generated.record_count is not None else None,
            generated_at=generated_at,
            attachment_paths=attachment_paths or None,
            attachment_note=attachment_note,
        )

        if failed:
            generated.email_sent = False  # type: ignore[assignment]
            generated.email_error = f"Failed to send to: {', '.join(failed)}"  # type: ignore[assignment]
        else:
            generated.email_sent = True  # type: ignore[assignment]
            generated.email_error = None  # type: ignore[assignment]
        if success_count > 0:
            generated.email_sent_at = datetime.now(timezone.utc)  # type: ignore[assignment]
        self.db.commit()

    def _get_report(self, report_id: int, user_id: int) -> Optional[Report]:
        return (
            self.db.query(Report)
            .filter(Report.id == report_id, Report.user_id == user_id, Report.deleted_at.is_(None))
            .first()
        )

    def _get_generated_report(self, report_id: int, generated_id: int, user_id: int) -> Optional[GeneratedReport]:
        return (
            self.db.query(GeneratedReport)
            .filter(
                GeneratedReport.id == generated_id,
                GeneratedReport.report_id == report_id,
                GeneratedReport.user_id == user_id,
            )
            .first()
        )

    def _update_status(self, generated: GeneratedReport, status: str) -> None:
        generated.status = status  # type: ignore[assignment]
        self.db.commit()

    def _mark_failed(self, generated: GeneratedReport, message: str) -> None:
        generated.status = "failed"  # type: ignore[assignment]
        generated.error_message = message  # type: ignore[assignment]
        self.db.commit()

    def _build_report_rows(self, report: Report, lang: str) -> Tuple[List[List[Any]], List[str]]:
        model, query = self._build_query(report)
        # Handle filters as a list of filter objects or dict
        filters_list: list = report.filters or []  # type: ignore[assignment]
        sort_list: list = report.sort_by or []  # type: ignore[assignment]

        query = self._apply_filters(query, model, filters_list)
        query = self._apply_sort(query, model, sort_list)

        columns = self._normalize_columns(str(report.report_type), report.fields)  # type: ignore[arg-type]
        headers = [self._localize_header(key, label, lang) for key, label in columns]

        rows: List[List[Any]] = []
        for record in query.all():
            row = [self._resolve_field(record, key) for key, _ in columns]
            rows.append(row)

        return rows, headers

    def _build_query(self, report: Report):
        report_type = str(report.report_type or "").lower()

        if report_type == "student":
            query = self.db.query(Student).filter(Student.deleted_at.is_(None))
            return Student, query

        if report_type == "course":
            query = self.db.query(Course).filter(Course.deleted_at.is_(None))
            return Course, query

        if report_type == "grade":
            query = (
                self.db.query(Grade)
                .options(joinedload(Grade.student), joinedload(Grade.course))
                .filter(Grade.deleted_at.is_(None))
            )
            return Grade, query

        if report_type == "attendance":
            query = (
                self.db.query(Attendance)
                .options(joinedload(Attendance.student), joinedload(Attendance.course))
                .filter(Attendance.deleted_at.is_(None))
            )
            return Attendance, query

        raise ValueError(f"Unsupported report type: {report.report_type}")

    def _apply_filters(self, query, model, filters: Any) -> Any:  # type: ignore[no-untyped-def]
        """Apply filters to the query. Handles multiple filter formats."""
        if not filters:
            return query

        # Convert list of filter objects to proper queries
        if isinstance(filters, list):
            for filter_obj in filters:
                if not isinstance(filter_obj, dict):
                    continue

                field = filter_obj.get("field")
                operator = filter_obj.get("operator", "equals")
                value = filter_obj.get("value")

                if not field or not hasattr(model, field):
                    continue

                column = getattr(model, field)

                # Apply operator-specific logic
                if operator == "equals":
                    if isinstance(value, str):
                        query = query.filter(func.lower(column) == value.lower())  # type: ignore[operator]
                    else:
                        query = query.filter(column == value)  # type: ignore[operator]
                elif operator == "not_equals":
                    if isinstance(value, str):
                        query = query.filter(func.lower(column) != value.lower())  # type: ignore[operator]
                    else:
                        query = query.filter(column != value)  # type: ignore[operator]
                elif operator == "contains":
                    query = query.filter(column.ilike(f"%{value}%"))  # type: ignore[operator]
                elif operator == "not_contains":
                    query = query.filter(~column.ilike(f"%{value}%"))  # type: ignore[operator]
                elif operator == "greater_than" or operator == "gt":
                    query = query.filter(column > value)  # type: ignore[operator]
                elif operator == "less_than" or operator == "lt":
                    query = query.filter(column < value)  # type: ignore[operator]
                elif operator == "greater_than_or_equal":
                    query = query.filter(column >= value)  # type: ignore[operator]
                elif operator == "less_than_or_equal":
                    query = query.filter(column <= value)  # type: ignore[operator]
                elif operator == "in":
                    if isinstance(value, (list, tuple)):
                        query = query.filter(column.in_(value))  # type: ignore[operator]
                elif operator == "between":
                    if isinstance(value, dict) and "from" in value and "to" in value:
                        query = query.filter(column.between(value["from"], value["to"]))  # type: ignore[operator]

        # Nested dict format: {"grade": {"operator": "less_than", "value": 60}}
        elif isinstance(filters, dict):
            for field_name, filter_spec in filters.items():
                # If value is a dict with operator/value, it's the new format
                if isinstance(filter_spec, dict) and "operator" in filter_spec and "value" in filter_spec:
                    operator = filter_spec.get("operator", "equals")
                    value = filter_spec.get("value")

                    if not hasattr(model, field_name):
                        continue

                    column = getattr(model, field_name)

                    # Apply operator-specific logic
                    if operator == "equals":
                        if isinstance(value, str):
                            query = query.filter(func.lower(column) == value.lower())  # type: ignore[operator]
                        else:
                            query = query.filter(column == value)  # type: ignore[operator]
                    elif operator == "not_equals":
                        if isinstance(value, str):
                            query = query.filter(func.lower(column) != value.lower())  # type: ignore[operator]
                        else:
                            query = query.filter(column != value)  # type: ignore[operator]
                    elif operator == "contains":
                        query = query.filter(column.ilike(f"%{value}%"))  # type: ignore[operator]
                    elif operator == "not_contains":
                        query = query.filter(~column.ilike(f"%{value}%"))  # type: ignore[operator]
                    elif operator == "greater_than" or operator == "gt":
                        query = query.filter(column > value)  # type: ignore[operator]
                    elif operator == "less_than" or operator == "lt":
                        query = query.filter(column < value)  # type: ignore[operator]
                    elif operator == "greater_than_or_equal":
                        query = query.filter(column >= value)  # type: ignore[operator]
                    elif operator == "less_than_or_equal":
                        query = query.filter(column <= value)  # type: ignore[operator]
                    elif operator == "in":
                        if isinstance(value, (list, tuple)):
                            query = query.filter(column.in_(value))  # type: ignore[operator]
                    elif operator == "between":
                        if isinstance(value, dict) and "from" in value and "to" in value:
                            query = query.filter(column.between(value["from"], value["to"]))  # type: ignore[operator]
                # Legacy simple format: {"field_name": value}
                else:
                    if hasattr(model, field_name):
                        column = getattr(model, field_name)
                        if isinstance(filter_spec, str):
                            query = query.filter(func.lower(column) == filter_spec.lower())  # type: ignore[operator]
                        else:
                            query = query.filter(column == filter_spec)  # type: ignore[operator]

        return query

    def _apply_sort(self, query, model, sort_by: Any) -> Any:  # type: ignore[no-untyped-def]
        """Apply sorting to the query. Handles both list and dict formats."""
        # Handle list of sort objects
        if isinstance(sort_by, list):
            for sort_obj in sort_by:
                if not isinstance(sort_obj, dict):
                    continue

                field = sort_obj.get("field")
                order = str(sort_obj.get("order", "asc")).lower()

                if field and hasattr(model, field):
                    column = getattr(model, field)
                    query = query.order_by(column.desc() if order == "desc" else column.asc())  # type: ignore[operator]

        # Legacy dict format support
        elif isinstance(sort_by, dict):
            field = sort_by.get("field") if isinstance(sort_by, dict) else None
            direction = str(sort_by.get("direction", "asc")).lower() if isinstance(sort_by, dict) else "asc"
            if field and hasattr(model, field):
                column = getattr(model, field)
                query = query.order_by(column.desc() if direction == "desc" else column.asc())  # type: ignore[operator]

        return query

    def _normalize_columns(self, report_type: str, fields: Any) -> List[Tuple[str, str]]:  # type: ignore[no-untyped-def]
        columns = self._extract_columns(fields)
        if columns:
            return columns

        defaults: Dict[str, List[str]] = {
            "student": ["first_name", "last_name", "email", "student_id", "is_active"],
            "course": ["course_code", "course_name", "semester", "credits"],
            "grade": ["student_name", "course_code", "grade", "max_grade", "date_assigned"],
            "attendance": ["student_name", "course_code", "date", "status"],
        }
        fallback = defaults.get(report_type.lower(), [])
        return [(key, self._label_from_key(key)) for key in fallback]

    def _extract_columns(self, fields: Any) -> List[Tuple[str, str]]:
        columns: Sequence[Any] = []
        if isinstance(fields, dict):
            columns = fields.get("columns") or fields.get("fields") or []
        elif isinstance(fields, list):
            columns = fields

        result: List[Tuple[str, str]] = []
        for col in columns:
            if isinstance(col, dict):
                key = col.get("key") or col.get("field") or col.get("name")
                if not key:
                    continue
                label = col.get("label") or self._label_from_key(str(key))
                result.append((str(key), str(label)))
            else:
                key = str(col)
                result.append((key, self._label_from_key(key)))
        return result

    def _label_from_key(self, key: str) -> str:
        return key.replace("_", " ").replace(".", " ").title()

    def _localize_header(self, key: str, label: str, lang: str) -> str:
        if lang != "el":
            return label
        if _contains_greek(label):
            return label
        normalized_label = label.strip().lower().replace("_", " ")
        if normalized_label in LABEL_TRANSLATIONS_EL:
            return LABEL_TRANSLATIONS_EL[normalized_label]
        return FIELD_LABELS_EL.get(key, label)

    def _resolve_field(self, record: Any, field: str) -> Any:
        """Resolve a field value from a record, handling relationships and nested fields."""

        # Aliases for legacy template fields
        if field == "grade_value":
            return getattr(record, "grade", "")
        if field == "exam_date":
            return getattr(record, "date_assigned", "")
        if field == "year_of_study":
            if hasattr(record, "study_year"):
                return getattr(record, "study_year", "")
            student = getattr(record, "student", None)
            if student and hasattr(student, "study_year"):
                return getattr(student, "study_year", "")
            return ""
        if field == "name" and hasattr(record, "course_name"):
            return getattr(record, "course_name", "")
        if field == "code" and hasattr(record, "course_code"):
            return getattr(record, "course_code", "")

        # Analytics-derived fields
        student_id: Optional[int] = None
        course_id: Optional[int] = None

        if hasattr(record, "student_id"):
            raw_student_id = getattr(record, "student_id", None)
            if isinstance(raw_student_id, int):
                student_id = raw_student_id
        if hasattr(record, "course_id"):
            raw_course_id = getattr(record, "course_id", None)
            if isinstance(raw_course_id, int):
                course_id = raw_course_id
        if student_id is None and hasattr(record, "id") and isinstance(record, Student):
            if isinstance(record.id, int):
                student_id = record.id
        if course_id is None and hasattr(record, "id") and isinstance(record, Course):
            if isinstance(record.id, int):
                course_id = record.id

        if (
            field in {"gpa", "overall_gpa", "total_courses", "passed_courses", "failed_courses", "total_credits"}
            and student_id
        ):
            summary = self._get_student_all_courses(student_id)
            courses = summary.get("courses") or []
            if field in {"gpa", "overall_gpa"}:
                return summary.get("overall_gpa", "")
            if field == "total_credits":
                return summary.get("total_credits", "")
            if field == "total_courses":
                return len(courses)
            if field in {"passed_courses", "failed_courses"}:
                passed = 0
                failed = 0
                for course_summary in courses:
                    letter = str(course_summary.get("letter_grade", ""))
                    final_grade = float(course_summary.get("final_grade", 0) or 0)
                    if letter and letter.upper() != "F" and final_grade >= 60:
                        passed += 1
                    else:
                        failed += 1
                return passed if field == "passed_courses" else failed

        if (
            field in {"attendance_rate", "total_classes", "average_grade", "total_assignments", "attended", "trend"}
            and student_id
        ):
            summary = self._get_student_summary(student_id)
            if field == "attendance_rate":
                return summary.get("attendance_rate", "")
            if field == "total_classes":
                return summary.get("total_classes", "")
            if field == "average_grade":
                return summary.get("average_grade", "")
            if field == "total_assignments":
                return summary.get("total_assignments", "")
            if field == "attended":
                total_classes = summary.get("total_classes", 0) or 0
                attendance_rate = summary.get("attendance_rate", 0) or 0
                return int(round((attendance_rate / 100) * total_classes))
            if field == "trend":
                return ""

        if field in {"enrollment_count", "total_students"} and course_id:
            count = self._get_course_enrollment_count(course_id)
            return count

        if field == "average_grade" and course_id:
            return round(self._get_course_average_grade(course_id), 2)

        if field == "attendance_rate" and course_id:
            return round(self._get_course_attendance_rate(course_id), 2)

        if field == "enrollment_status":
            if hasattr(record, "is_active"):
                return "active" if getattr(record, "is_active", False) else "inactive"
            student = getattr(record, "student", None)
            if student and hasattr(student, "is_active"):
                return "active" if getattr(student, "is_active", False) else "inactive"
            return ""

        if field == "letter_grade":
            if hasattr(record, "percentage"):
                percentage = getattr(record, "percentage", 0) or 0
            elif hasattr(record, "grade") and hasattr(record, "max_grade"):
                grade_value = getattr(record, "grade", None)
                max_grade_value = getattr(record, "max_grade", None)
                if isinstance(grade_value, (int, float)) and isinstance(max_grade_value, (int, float)):
                    if max_grade_value:
                        percentage = (grade_value / max_grade_value) * 100
                    else:
                        percentage = 0
                else:
                    percentage = 0
            else:
                percentage = 0
            return AnalyticsService.get_letter_grade(float(percentage))

        # Special handling for computed fields
        if field == "student_name":
            student = getattr(record, "student", None)
            if student:
                return f"{student.first_name} {student.last_name}".strip()
            if hasattr(record, "first_name") and hasattr(record, "last_name"):
                return f"{record.first_name} {record.last_name}".strip()
            return ""

        if field == "course_code":
            course = getattr(record, "course", None)
            if course and hasattr(course, "course_code"):
                return course.course_code
            if hasattr(record, "course_code"):
                return record.course_code
            return ""

        if field == "course_name":
            course = getattr(record, "course", None)
            if course and hasattr(course, "course_name"):
                return course.course_name
            if hasattr(record, "course_name"):
                return record.course_name
            return ""

        # Handle nested dot notation
        if "." in field:
            value = record
            for part in field.split("."):
                value = getattr(value, part, None)
                if value is None:
                    return ""
            return value

        # Try to get directly from record
        if hasattr(record, field):
            value = getattr(record, field, "")
            return value

        # For Grade records, try to resolve from related models
        # e.g., first_name -> student.first_name, last_name -> student.last_name
        if hasattr(record, "student"):
            student = getattr(record, "student", None)
            if student and hasattr(student, field):
                value = getattr(student, field, "")
                return value

        # Try Course relationship
        if hasattr(record, "course"):
            course = getattr(record, "course", None)
            if course and hasattr(course, field):
                value = getattr(course, field, "")
                return value

        return ""

    def _export_report(
        self,
        rows: List[List[Any]],
        headers: List[str],
        export_format: str,
        file_name: str,
        title: Optional[str] = None,
        lang: str = DEFAULT_REPORT_LANG,
    ) -> str:  # type: ignore[override]
        format_lower = (export_format or "pdf").lower()
        file_path = os.path.join(self.reports_dir, file_name)

        if format_lower == "csv":
            self._export_csv(rows, headers, file_path, lang)
            return file_path

        if format_lower == "excel":
            self._export_excel(rows, headers, file_path, lang)
            return file_path

        if format_lower == "pdf":
            self._export_pdf(rows, headers, file_path, title=title, lang=lang)
            return file_path

        raise ValueError(f"Unsupported export format: {export_format}")

    def _export_csv(self, rows: Iterable[Sequence[Any]], headers: Sequence[str], file_path: str, lang: str) -> None:
        with open(file_path, "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(headers)
            for row in rows:
                writer.writerow([self._stringify_value(value, lang) for value in row])

    def _export_excel(self, rows: Iterable[Sequence[Any]], headers: Sequence[str], file_path: str, lang: str) -> None:
        wb = Workbook()
        ws = wb.active
        ws.title = "Report"

        header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        for col_index, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_index, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        for row_index, row in enumerate(rows, 2):
            for col_index, value in enumerate(row, 1):
                ws.cell(row=row_index, column=col_index, value=self._stringify_value(value, lang))

        for col_index, header in enumerate(headers, 1):
            width = max(len(str(header)), 10)
            ws.column_dimensions[get_column_letter(col_index)].width = max(width, 12)

        wb.save(file_path)

    def _export_pdf(
        self,
        rows: List[List[Any]],
        headers: List[str],
        file_path: str,
        title: Optional[str] = None,
        lang: str = DEFAULT_REPORT_LANG,
    ) -> None:
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab is required for PDF generation. Install with: pip install reportlab")
        _register_pdf_fonts()

        doc = SimpleDocTemplate(
            file_path,
            pagesize=letter,
            leftMargin=0.5 * inch,
            rightMargin=0.5 * inch,
            topMargin=0.6 * inch,
            bottomMargin=0.6 * inch,
        )
        styles = getSampleStyleSheet()
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["BodyText"],
            fontName=PDF_FONT_REGULAR,
            fontSize=8,
            leading=10,
        )
        header_style = ParagraphStyle(
            "ReportHeader",
            parent=styles["BodyText"],
            fontName=PDF_FONT_BOLD,
            fontSize=8,
            leading=10,
            textColor=colors.whitesmoke,
            alignment=1,
        )
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontName=PDF_FONT_BOLD,
            fontSize=16,
            textColor=colors.HexColor("#1f77b4"),
            spaceAfter=12,
        )

        report_title = title or "Custom Report"
        elements: List[Flowable] = [Paragraph(report_title, title_style), Spacer(1, 0.2 * inch)]

        column_count = max(len(headers), 1)
        if column_count > 12:
            body_style.fontSize = 6
            body_style.leading = 8
            header_style.fontSize = 6
            header_style.leading = 8
        elif column_count > 8:
            body_style.fontSize = 7
            body_style.leading = 9
            header_style.fontSize = 7
            header_style.leading = 9

        header_cells = [Paragraph(str(header), header_style) for header in headers]
        body_rows: List[List[Any]] = []
        for row in rows:
            formatted_row: List[Any] = []
            for value in row:
                string_value = str(self._stringify_value(value, lang))
                formatted_row.append(Paragraph(string_value, body_style))
            body_rows.append(formatted_row)

        if not body_rows:
            no_data_message = "Δεν υπάρχουν δεδομένα" if lang == "el" else "No data available"
            placeholder_row = [Paragraph(no_data_message, body_style)] + ["" for _ in range(column_count - 1)]
            body_rows = [placeholder_row]

        table_data = [header_cells] + body_rows

        col_widths = _compute_column_widths(headers, rows, doc.width, min_width=40)
        table = Table(table_data, repeatRows=1, colWidths=col_widths)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f77b4")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                    ("ALIGN", (0, 1), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), PDF_FONT_BOLD),
                    ("FONTNAME", (0, 1), (-1, -1), PDF_FONT_REGULAR),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                ]
            )
        )
        if not rows:
            table.setStyle(
                TableStyle(
                    [
                        ("SPAN", (0, 1), (-1, 1)),
                        ("ALIGN", (0, 1), (-1, 1), "CENTER"),
                    ]
                )
            )
        elements.append(table)
        doc.build(elements)

    def _stringify_value(self, value: Any, lang: str) -> Any:
        if value is None:
            return ""
        if isinstance(value, (datetime, date)):
            return self._format_date_value(value, lang)
        if isinstance(value, bool):
            if lang == "el":
                return "Ναι" if value else "Όχι"
            return "Yes" if value else "No"
        if isinstance(value, str):
            return self._localize_string_value(value, lang)
        return value

    def _format_date_value(self, value: Any, lang: str) -> str:
        if isinstance(value, datetime):
            dt = value
        elif isinstance(value, date):
            dt = datetime.combine(value, datetime.min.time())
        elif isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value)
            except ValueError:
                return value
        else:
            return str(value)

        include_time = False
        if isinstance(value, datetime):
            include_time = True
        elif isinstance(value, str) and dt.time() != datetime.min.time():
            include_time = True

        if include_time:
            fmt = "%d/%m/%Y %H:%M" if lang == "el" else "%Y-%m-%d %H:%M"
        else:
            fmt = "%d/%m/%Y" if lang == "el" else "%Y-%m-%d"
        return dt.strftime(fmt)

    def _localize_string_value(self, value: str, lang: str) -> str:
        if lang != "el":
            return value
        normalized = value.strip().lower()
        if normalized in STATUS_TRANSLATIONS_EL:
            return STATUS_TRANSLATIONS_EL[normalized]
        return value
