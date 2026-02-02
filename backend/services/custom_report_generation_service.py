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
from sqlalchemy.orm import Session, joinedload

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    Flowable = Any  # type: ignore

from backend.models import Attendance, Course, GeneratedReport, Grade, Report, Student

logger = logging.getLogger(__name__)


class CustomReportGenerationService:
    """Generate report files for custom report definitions."""

    def __init__(self, db: Session):
        self.db = db
        self.reports_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
        os.makedirs(self.reports_dir, exist_ok=True)

    @staticmethod
    def run_generation_task(
        report_id: int,
        generated_report_id: int,
        user_id: int,
        export_format: str,
        include_charts: bool,
    ) -> None:
        """Background task entrypoint with isolated DB session."""
        from backend.db import SessionLocal

        db = SessionLocal()
        try:
            service = CustomReportGenerationService(db)
            service.generate_report(report_id, generated_report_id, user_id, export_format, include_charts)
        finally:
            db.close()

    def generate_report(
        self,
        report_id: int,
        generated_report_id: int,
        user_id: int,
        export_format: str,
        include_charts: bool,
    ) -> None:
        """Generate a report file and update the GeneratedReport record."""
        start_time = time.perf_counter()
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
            rows, headers = self._build_report_rows(report)
            file_path = self._export_report(rows, headers, export_format, str(generated.file_name))  # type: ignore[arg-type]
            duration = time.perf_counter() - start_time

            generated.file_path = file_path  # type: ignore[assignment]
            generated.file_size_bytes = os.path.getsize(file_path) if file_path else None  # type: ignore[assignment]
            generated.record_count = len(rows)  # type: ignore[assignment]
            generated.generation_duration_seconds = round(float(duration), 3)  # type: ignore[arg-type,assignment]
            generated.status = "completed"  # type: ignore[assignment]
            generated.error_message = None  # type: ignore[assignment]

            report.last_run_at = datetime.now(timezone.utc)  # type: ignore[assignment]
            self.db.commit()
        except Exception as exc:
            logger.error("Report generation failed: %s", exc, exc_info=True)
            self._mark_failed(generated, str(exc))

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

    def _build_report_rows(self, report: Report) -> Tuple[List[List[Any]], List[str]]:
        model, query = self._build_query(report)
        # Handle filters as a list of filter objects or dict
        filters_list: list = report.filters or []  # type: ignore[assignment]
        sort_list: list = report.sort_by or []  # type: ignore[assignment]

        query = self._apply_filters(query, model, filters_list)
        query = self._apply_sort(query, model, sort_list)

        columns = self._normalize_columns(str(report.report_type), report.fields)  # type: ignore[arg-type]
        headers = [label for _, label in columns]

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
                    query = query.filter(column == value)  # type: ignore[operator]
                elif operator == "not_equals":
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
                        query = query.filter(column == value)  # type: ignore[operator]
                    elif operator == "not_equals":
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

    def _resolve_field(self, record: Any, field: str) -> Any:
        """Resolve a field value from a record, handling relationships and nested fields."""

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
            if isinstance(value, (datetime, date)):
                return value.isoformat()
            return value

        # For Grade records, try to resolve from related models
        # e.g., first_name -> student.first_name, last_name -> student.last_name
        if hasattr(record, "student"):
            student = getattr(record, "student", None)
            if student and hasattr(student, field):
                value = getattr(student, field, "")
                if isinstance(value, (datetime, date)):
                    return value.isoformat()
                return value

        # Try Course relationship
        if hasattr(record, "course"):
            course = getattr(record, "course", None)
            if course and hasattr(course, field):
                value = getattr(course, field, "")
                if isinstance(value, (datetime, date)):
                    return value.isoformat()
                return value

        return ""

    def _export_report(self, rows: List[List[Any]], headers: List[str], export_format: str, file_name: str) -> str:  # type: ignore[override]
        format_lower = (export_format or "pdf").lower()
        file_path = os.path.join(self.reports_dir, file_name)

        if format_lower == "csv":
            self._export_csv(rows, headers, file_path)
            return file_path

        if format_lower == "excel":
            self._export_excel(rows, headers, file_path)
            return file_path

        if format_lower == "pdf":
            self._export_pdf(rows, headers, file_path)
            return file_path

        raise ValueError(f"Unsupported export format: {export_format}")

    def _export_csv(self, rows: Iterable[Sequence[Any]], headers: Sequence[str], file_path: str) -> None:
        with open(file_path, "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(headers)
            for row in rows:
                writer.writerow([self._stringify_value(value) for value in row])

    def _export_excel(self, rows: Iterable[Sequence[Any]], headers: Sequence[str], file_path: str) -> None:
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
                ws.cell(row=row_index, column=col_index, value=self._stringify_value(value))

        for col_index, header in enumerate(headers, 1):
            width = max(len(str(header)), 10)
            ws.column_dimensions[get_column_letter(col_index)].width = max(width, 12)

        wb.save(file_path)

    def _export_pdf(self, rows: List[List[Any]], headers: List[str], file_path: str) -> None:
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab is required for PDF generation. Install with: pip install reportlab")

        doc = SimpleDocTemplate(file_path, pagesize=letter)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontSize=16,
            textColor=colors.HexColor("#1f77b4"),
            spaceAfter=12,
        )

        elements: List[Flowable] = [Paragraph("Custom Report", title_style), Spacer(1, 0.2 * inch)]

        table_data = [headers] + [[self._stringify_value(value) for value in row] for row in rows]
        table = Table(table_data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f77b4")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                ]
            )
        )
        elements.append(table)
        doc.build(elements)

    def _stringify_value(self, value: Any) -> Any:
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if value is None:
            return ""
        if isinstance(value, bool):
            return "Yes" if value else "No"
        return value
