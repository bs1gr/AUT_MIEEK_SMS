# -*- coding: utf-8 -*-
"""
Analytics Export Service
Provides functionality to export analytics data to PDF and Excel formats.
"""

import io
import logging
from datetime import datetime as dt, timezone
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Flowable
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _register_analytics_fonts() -> tuple[str, str]:
    """Register Unicode-capable fonts for PDF rendering - exact pattern from report_exporters.py"""
    font_regular = "DejaVuSans"
    font_bold = "DejaVuSans-Bold"

    from pathlib import Path

    fonts_dir = Path(__file__).resolve().parents[1] / "fonts"
    regular_path = fonts_dir / "DejaVuSans.ttf"
    bold_path = fonts_dir / "DejaVuSans-Bold.ttf"

    if regular_path.exists() and bold_path.exists():
        try:
            registered = set(pdfmetrics.getRegisteredFontNames())
            if font_regular not in registered:
                pdfmetrics.registerFont(TTFont(font_regular, str(regular_path)))
            if font_bold not in registered:
                pdfmetrics.registerFont(TTFont(font_bold, str(bold_path)))
            return font_regular, font_bold
        except Exception as e:
            logger.error(f"Failed to register DejaVuSans fonts: {e}. Using Helvetica fallback.")
            return "Helvetica", "Helvetica-Bold"

    logger.warning(f"DejaVuSans fonts not found at {fonts_dir}. Greek PDFs will render with Helvetica fallback.")
    return "Helvetica", "Helvetica-Bold"


class AnalyticsExportService:
    """Service for exporting analytics data to various formats."""

    # Localization strings
    TRANSLATIONS = {
        "en": {
            "title": "Analytics Dashboard Report",
            "exported": "Exported",
            "generated": "Generated",
            "summary_statistics": "Summary Statistics",
            "total_students": "Total Students",
            "total_courses": "Total Courses",
            "average_grade": "Average Grade %",
            "average_attendance": "Average Attendance %",
            "class_averages": "Class Averages",
            "class": "Class",
            "student_count": "Student Count",
            "course_averages": "Course Averages",
            "course_name": "Course Name",
            "enrollments": "Enrollments",
            # Plan todo 75 stage 4: the filters on screen, the students and the categories.
            "selection": "Selection",
            "all_students": "All active students",
            "division": "Division",
            "course": "Course",
            "student": "Student",
            "students": "Students",
            "student_number": "Student ID",
            "courses": "Courses",
            "average_final_grade": "Average Final Grade",
            "exam_average": "Exam Average",
            "attendance": "Attendance %",
            "late": "Late",
            "absence_limit": "Absence Limit",
            "failing_courses": "Failing Courses",
            "at_risk": "At Risk",
            "yes": "Yes",
            "no": "No",
            "categories": "Strengths and difficulties by category",
            "categories_sheet": "Categories",
            "category": "Category",
            "class_average": "Class Average",
            "difference": "Difference",
            "mark": "Mark",
            "final_grade": "Final Grade",
            "strength": "Strength",
            "difficulty": "Difficulty",
            "legend": "▲ Strength: 85 or more, or at least 10 points over the average of the same courses. "
            "▼ Difficulty: under 50, or at least 10 points under it.",
            "absence_ok": "Within limit",
            "absence_warning": "Near the fail limit",
            "absence_insufficient": "Failed (absences)",
            "absence_unknown": "No schedule",
        },
        "el": {
            "title": "Αναφορά Αναλυτικών Δεδομένων",
            "exported": "Εξαγωγή",
            "generated": "Δημιουργήθηκε",
            "summary_statistics": "Στατιστικά Σύνοψης",
            "total_students": "Σύνολο Φοιτητών",
            "total_courses": "Σύνολο Μαθημάτων",
            "average_grade": "Μέσος Όρος Βαθμών %",
            "average_attendance": "Μέσος Όρος Παρουσίας %",
            "class_averages": "Μέσοι Όροι Τάξης",
            "class": "Τάξη",
            "student_count": "Αριθμός Φοιτητών",
            "course_averages": "Μέσοι Όροι Μαθήματος",
            "course_name": "Όνομα Μαθήματος",
            "enrollments": "Εγγραφές",
            # Todo 75 στάδιο 4: τα φίλτρα της οθόνης, οι σπουδαστές και οι κατηγορίες.
            "selection": "Επιλογή",
            "all_students": "Όλοι οι ενεργοί σπουδαστές",
            "division": "Τμήμα",
            "course": "Μάθημα",
            "student": "Σπουδαστής",
            "students": "Σπουδαστές",
            "student_number": "Αριθμός Μητρώου",
            "courses": "Μαθήματα",
            "average_final_grade": "Μέσος Τελικός Βαθμός",
            "exam_average": "Μέσος Όρος Εξετάσεων",
            "attendance": "Παρουσία %",
            "late": "Αργοπορίες",
            "absence_limit": "Όριο Απουσιών",
            "failing_courses": "Μαθήματα κάτω από τη βάση",
            "at_risk": "Σε Κίνδυνο",
            "yes": "Ναι",
            "no": "Όχι",
            "categories": "Δυνατά σημεία και δυσκολίες ανά κατηγορία",
            "categories_sheet": "Κατηγορίες",
            "category": "Κατηγορία",
            "class_average": "Μέσος Όρος Τάξης",
            "difference": "Διαφορά",
            "mark": "Σημείωση",
            "final_grade": "Τελικός Βαθμός",
            "strength": "Δυνατό σημείο",
            "difficulty": "Δυσκολία",
            "legend": "▲ Δυνατό σημείο: 85 και πάνω, ή τουλάχιστον 10 μονάδες πάνω από τον μέσο όρο των ίδιων "
            "μαθημάτων. ▼ Δυσκολία: κάτω από 50, ή τουλάχιστον 10 μονάδες κάτω από αυτόν.",
            "absence_ok": "Εντός ορίου",
            "absence_warning": "Κοντά στο όριο αποτυχίας",
            "absence_insufficient": "Αποτυχία (απουσίες)",
            "absence_unknown": "Χωρίς πρόγραμμα",
        },
    }

    def __init__(self, db: Session, language: str = "en", timezone: str = "Europe/Athens"):
        self.db = db
        self.language = language if language in self.TRANSLATIONS else "en"
        self.timezone = timezone
        self.t = self.TRANSLATIONS[self.language]
        logger.info(f"AnalyticsExportService initialized with language={language}, timezone={timezone}")

    def _get_bold_font_name(self, font_name: str) -> str:
        """Get the appropriate bold font name for the given font."""
        if font_name == "DejaVuSans":
            return "DejaVuSans-Bold"
        elif font_name == "Helvetica":
            return "Helvetica-Bold"
        elif "-Bold" in font_name:
            return font_name
        else:
            return f"{font_name}-Bold"

    def format_datetime(self, dt_obj: Optional[Any] = None) -> str:
        """Format datetime with localized date format matching frontend settings."""
        if dt_obj is None:
            dt_obj = dt.now(timezone.utc).replace(tzinfo=None)

        if not isinstance(dt_obj, dt):
            logger.error(f"format_datetime called with non-datetime: {type(dt_obj)}")
            return "Invalid date"

        try:
            from zoneinfo import ZoneInfo

            # Convert UTC to the specified timezone
            utc_tz = ZoneInfo("UTC")
            local_tz = ZoneInfo(self.timezone)

            # If dt_obj is naive, assume it's UTC
            if dt_obj.tzinfo is None:
                dt_obj = dt_obj.replace(tzinfo=utc_tz)

            local_dt = dt_obj.astimezone(local_tz)
            tz_abbr = local_dt.strftime("%Z")  # e.g., 'EEST' or 'EET'

            if self.language == "el":
                # Greek date format: DD/MM/YYYY HH:MM:SS TZ (matching gr-ddmmyyyy frontend setting)
                return local_dt.strftime(f"%d/%m/%Y %H:%M:%S {tz_abbr}")
            else:
                # English date format: MM/DD/YYYY HH:MM:SS TZ (matching en-us frontend setting)
                return local_dt.strftime(f"%m/%d/%Y %H:%M:%S {tz_abbr}")
        except Exception as e:
            logger.warning(f"Failed to format datetime with timezone {self.timezone}: {e}, falling back to UTC")
            try:
                if self.language == "el":
                    return dt_obj.strftime("%d/%m/%Y %H:%M:%S UTC")
                else:
                    return dt_obj.strftime("%m/%d/%Y %H:%M:%S UTC")
            except (AttributeError, TypeError):
                return "Invalid date"

    # ----- Plan todo 75 stage 4: the selection, the students, the categories -----

    def scope_text(self, data: Optional[Dict[str, Any]]) -> str:
        """Which students the export covers: the filters on screen, or all active students."""
        scope = (data or {}).get("scope") or {}
        parts = [
            f"{self.t[label]}: {scope[key]}"
            for key, label in (
                ("academic_year", "class"),
                ("class_division", "division"),
                ("course", "course"),
                ("student", "student"),
            )
            if scope.get(key)
        ]
        return f"{self.t['selection']}: " + (" · ".join(parts) if parts else self.t["all_students"])

    def absence_label(self, status: Optional[str]) -> str:
        return self.t.get(f"absence_{status}", status or "") if status else ""

    @staticmethod
    def mark(signal: Optional[str]) -> str:
        return "▲" if signal == "strength" else "▼" if signal == "difficulty" else ""

    def student_rows(self, data: Dict[str, Any]) -> tuple[List[str], List[List[Any]]]:
        """The selection's students, one row each, as the class view lists them."""
        headers = [
            self.t["student"],
            self.t["student_number"],
            self.t["class"],
            self.t["division"],
            self.t["courses"],
            self.t["average_final_grade"],
            self.t["exam_average"],
            self.t["attendance"],
            self.t["late"],
            self.t["absence_limit"],
            self.t["failing_courses"],
            self.t["at_risk"],
        ]
        rows = [
            [
                s.get("name", ""),
                s.get("student_id", ""),
                s.get("academic_year") or "",
                s.get("class_division") or "",
                s.get("courses", 0),
                s.get("average_final_grade"),
                s.get("exam_average"),
                s.get("attendance_rate"),
                s.get("late", 0),
                self.absence_label(s.get("absence_status")),
                ", ".join(s.get("failing_courses") or []),
                self.t["yes"] if s.get("at_risk") else self.t["no"],
            ]
            for s in data.get("students") or []
        ]
        return headers, rows

    @staticmethod
    def shown(value: Any) -> str:
        """A figure as the page shows it: one decimal, an empty one as a dash."""
        return "—" if value is None else f"{float(value):.1f}"

    def export_dashboard_to_excel(
        self,
        filename: str = "analytics_dashboard.xlsx",
        data: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """Export dashboard summary data to Excel format."""
        try:
            wb = Workbook()
            ws = wb.active
            ws.title = "Analytics Dashboard"

            # Style definitions
            header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            header_font = Font(bold=True, color="FFFFFF", size=12)
            subheader_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            subheader_font = Font(bold=True, size=11)
            border = Border(
                left=Side(style="thin"),
                right=Side(style="thin"),
                top=Side(style="thin"),
                bottom=Side(style="thin"),
            )

            # Title
            ws["A1"] = self.t["title"]
            ws["A1"].font = Font(bold=True, size=14)
            ws.merge_cells("A1:D1")

            # Date exported
            ws["A2"] = f"{self.t['exported']}: {self.format_datetime()}"
            ws["A2"].font = Font(italic=True, size=10)
            ws.merge_cells("A2:D2")

            # The filters on screen (plan todo 75 stage 4).
            ws["A3"] = self.scope_text(data)
            ws["A3"].font = Font(bold=True, size=10)
            ws.merge_cells("A3:F3")

            row = 5
            student_view = (data or {}).get("student_view")
            if student_view:
                # The student view: that student's courses and categories, not the class tables.
                self._excel_student_view(
                    ws, student_view, row, header_fill, header_font, subheader_fill, subheader_font, border
                )
                data = None

            # Summary Section
            if data and "summary" in data:
                summary = data["summary"]
                ws[f"A{row}"] = self.t["summary_statistics"]
                ws[f"A{row}"].fill = subheader_fill
                ws[f"A{row}"].font = subheader_font
                ws.merge_cells(f"A{row}:B{row}")
                row += 1

                summary_items = [
                    (self.t["total_students"], summary.get("total_students", 0)),
                    (self.t["total_courses"], summary.get("total_courses", 0)),
                    (self.t["average_grade"], f"{summary.get('average_grade', 0):.2f}%"),
                    (self.t["average_attendance"], f"{summary.get('average_attendance', 0):.2f}%"),
                ]

                for label, value in summary_items:
                    ws[f"A{row}"] = label
                    ws[f"B{row}"] = value
                    ws[f"A{row}"].fill = PatternFill(start_color="E7E6E6", end_color="E7E6E6", fill_type="solid")
                    ws[f"A{row}"].border = border
                    ws[f"B{row}"].border = border
                    row += 1

            # Class Averages Section
            if data and "class_averages" in data:
                row += 1
                ws[f"A{row}"] = self.t["class_averages"]
                ws[f"A{row}"].fill = subheader_fill
                ws[f"A{row}"].font = subheader_font
                ws.merge_cells(f"A{row}:C{row}")
                row += 1

                # Headers
                headers = [self.t["class"], self.t["student_count"], self.t["average_grade"]]
                for col, header in enumerate(headers, 1):
                    cell = ws.cell(row=row, column=col)
                    cell.value = header
                    cell.fill = header_fill
                    cell.font = header_font
                    cell.border = border
                    cell.alignment = Alignment(horizontal="center")

                row += 1

                # Data
                for item in data["class_averages"]:
                    ws[f"A{row}"] = item.get("label", "")
                    ws[f"B{row}"] = item.get("count", 0)
                    ws[f"C{row}"] = f"{item.get('average', 0):.2f}%"
                    for col in range(1, 4):
                        ws.cell(row=row, column=col).border = border
                        ws.cell(row=row, column=col).alignment = Alignment(horizontal="center")
                    row += 1

            # Course Averages Section
            if data and "course_averages" in data:
                row += 1
                ws[f"A{row}"] = self.t["course_averages"]
                ws[f"A{row}"].fill = subheader_fill
                ws[f"A{row}"].font = subheader_font
                ws.merge_cells(f"A{row}:C{row}")
                row += 1

                # Headers
                headers = [self.t["course_name"], self.t["enrollments"], self.t["average_grade"]]
                for col, header in enumerate(headers, 1):
                    cell = ws.cell(row=row, column=col)
                    cell.value = header
                    cell.fill = header_fill
                    cell.font = header_font
                    cell.border = border
                    cell.alignment = Alignment(horizontal="center")

                row += 1

                # Data
                for item in data["course_averages"][:20]:  # Limit to first 20 for readability
                    ws[f"A{row}"] = item.get("label", "")
                    ws[f"B{row}"] = item.get("count", 0)
                    ws[f"C{row}"] = f"{item.get('average', 0):.2f}%"
                    for col in range(1, 4):
                        ws.cell(row=row, column=col).border = border
                        ws.cell(row=row, column=col).alignment = Alignment(horizontal="center")
                    row += 1

            # Adjust column widths
            ws.column_dimensions["A"].width = 25 if not student_view else 34
            ws.column_dimensions["B"].width = 18
            ws.column_dimensions["C"].width = 18
            ws.column_dimensions["D"].width = 18
            ws.column_dimensions["E"].width = 18
            ws.column_dimensions["F"].width = 22

            if data and data.get("students") is not None:
                self._excel_students_sheet(wb, data, header_fill, header_font, border)
                self._excel_categories_sheet(wb, data.get("categories") or {}, header_fill, header_font, border)

            # Save to bytes
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return output.getvalue()

        except Exception as exc:
            logger.error("Failed to export dashboard to Excel: %s", exc, exc_info=True)
            raise

    # Excel number formats: a figure stays a number, its mark shown beside it.
    _MARK_FORMATS = {"strength": '"▲ "0.0', "difficulty": '"▼ "0.0'}
    _MARK_FILLS = {"strength": "C6EFCE", "difficulty": "FFC7CE"}

    @staticmethod
    def _excel_header(ws: Any, row: int, headers: List[str], fill: Any, font: Any, border: Any) -> None:
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.fill = fill
            cell.font = font
            cell.border = border
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    def _excel_figure(self, cell: Any, value: Any, signal: Optional[str] = None) -> None:
        """A figure as a number with one decimal (empty stays empty), marked when it is a signal."""
        cell.value = value
        if value is None:
            return
        cell.number_format = self._MARK_FORMATS.get(signal or "", "0.0")
        if signal in self._MARK_FILLS:
            colour = self._MARK_FILLS[signal]
            cell.fill = PatternFill(start_color=colour, end_color=colour, fill_type="solid")

    def _excel_students_sheet(self, wb: Any, data: Dict[str, Any], fill: Any, font: Any, border: Any) -> None:
        ws = wb.create_sheet(self.t["students"][:31])
        ws["A1"] = self.scope_text(data)
        ws["A1"].font = Font(bold=True, size=10)
        headers, rows = self.student_rows(data)
        self._excel_header(ws, 3, headers, fill, font, border)
        figures = {5, 6, 7}  # 0-based: the averages and the attendance rate
        for r, values in enumerate(rows, 4):
            for c, value in enumerate(values):
                cell = ws.cell(row=r, column=c + 1)
                if c in figures:
                    self._excel_figure(cell, value)
                else:
                    cell.value = value
                cell.border = border
        for col, width in zip("ABCDEFGHIJKL", (28, 14, 10, 10, 10, 14, 14, 13, 11, 22, 30, 11)):
            ws.column_dimensions[col].width = width
        ws.freeze_panes = "B4"

    def _excel_categories_sheet(self, wb: Any, categories: Dict[str, Any], fill: Any, font: Any, border: Any) -> None:
        """Each student's average per category against the class's, the marks as the page shows them."""
        ws = wb.create_sheet(self.t["categories_sheet"][:31])
        ws["A1"] = self.t["categories"]
        ws["A1"].font = Font(bold=True, size=12)
        ws["A2"] = self.t["legend"]
        ws["A2"].font = Font(italic=True, size=9)
        columns = categories.get("columns") or []
        self._excel_header(ws, 4, [self.t["student"], *columns], fill, font, border)
        average_row = ws.cell(row=5, column=1, value=self.t["class_average"])
        average_row.font = Font(bold=True)
        average_row.border = border
        for c, value in enumerate(categories.get("averages") or [], 2):
            cell = ws.cell(row=5, column=c)
            self._excel_figure(cell, value)
            cell.font = Font(bold=True)
            cell.border = border
        for r, student in enumerate(categories.get("students") or [], 6):
            ws.cell(row=r, column=1, value=student.get("name", "")).border = border
            signals = student.get("signals") or []
            for c, value in enumerate(student.get("cells") or []):
                cell = ws.cell(row=r, column=c + 2)
                self._excel_figure(cell, value, signals[c] if c < len(signals) else None)
                cell.border = border
        ws.column_dimensions["A"].width = 28
        for c in range(2, len(columns) + 2):
            ws.column_dimensions[ws.cell(row=4, column=c).column_letter].width = 16
        ws.freeze_panes = "B6"

    def _excel_student_view(
        self, ws: Any, view: Dict[str, Any], row: int, fill: Any, font: Any, subfill: Any, subfont: Any, border: Any
    ) -> int:
        student = view.get("student") or {}
        ws.cell(row=row, column=1, value=f"{self.t['student']}: {student.get('name', '')}").font = Font(
            bold=True, size=12
        )
        row += 2
        ws.cell(row=row, column=1, value=self.t["courses"]).font = subfont
        ws.cell(row=row, column=1).fill = subfill
        row += 1
        headers = [
            self.t["course"],
            self.t["final_grade"],
            self.t["class_average"],
            self.t["attendance"],
            self.t["late"],
            self.t["absence_limit"],
        ]
        self._excel_header(ws, row, headers, fill, font, border)
        for course in view.get("courses") or []:
            row += 1
            ws.cell(row=row, column=1, value=course.get("course"))
            self._excel_figure(ws.cell(row=row, column=2), course.get("final_grade"))
            self._excel_figure(ws.cell(row=row, column=3), course.get("class_average"))
            self._excel_figure(ws.cell(row=row, column=4), course.get("attendance_rate"))
            ws.cell(row=row, column=5, value=course.get("late"))
            ws.cell(row=row, column=6, value=self.absence_label(course.get("absence_status")))
            for col in range(1, 7):
                ws.cell(row=row, column=col).border = border
        row += 2
        ws.cell(row=row, column=1, value=self.t["categories"]).font = subfont
        ws.cell(row=row, column=1).fill = subfill
        row += 1
        ws.cell(row=row, column=1, value=self.t["legend"]).font = Font(italic=True, size=9)
        row += 1
        self._excel_header(
            ws,
            row,
            [self.t["category"], self.t["student"], self.t["class_average"], self.t["difference"], self.t["mark"]],
            fill,
            font,
            border,
        )
        for category in view.get("categories") or []:
            row += 1
            signal = category.get("signal")
            ws.cell(row=row, column=1, value=category.get("name"))
            self._excel_figure(ws.cell(row=row, column=2), category.get("average"), signal)
            self._excel_figure(ws.cell(row=row, column=3), category.get("class_average"))
            difference = ws.cell(row=row, column=4)
            self._excel_figure(difference, category.get("difference"))
            if category.get("difference") is not None:
                difference.number_format = "+0.0;-0.0;0.0"
            ws.cell(row=row, column=5, value=self.t.get(signal, "") if signal else "")
            for col in range(1, 6):
                ws.cell(row=row, column=col).border = border
        return row

    def export_dashboard_to_pdf(
        self,
        filename: str = "analytics_dashboard.pdf",
        data: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """Export dashboard summary data to PDF format using proven report_exporters pattern."""
        try:
            # Register fonts each time (same as report_exporters.py)
            base_font, base_font_bold = _register_analytics_fonts()

            output = io.BytesIO()
            # Landscape: the students and the categories take more columns (plan todo 75 stage 4).
            doc = SimpleDocTemplate(
                output,
                pagesize=landscape(letter),
                topMargin=0.5 * inch,
                bottomMargin=0.5 * inch,
                leftMargin=0.5 * inch,
                rightMargin=0.5 * inch,
            )

            elements: List[Flowable] = []
            styles = getSampleStyleSheet()

            # Styles - matching report_exporters.py pattern
            title_style = ParagraphStyle(
                "CustomTitle",
                parent=styles["Heading1"],
                fontSize=24,
                textColor=colors.HexColor("#4472C4"),
                spaceAfter=12,
                fontName=base_font,
            )
            heading_style = ParagraphStyle(
                "CustomHeading",
                parent=styles["Heading2"],
                fontSize=16,
                textColor=colors.HexColor("#2F5496"),
                spaceAfter=10,
                spaceBefore=10,
                fontName=base_font,
            )
            normal_style = ParagraphStyle(
                "AnalyticsNormal",
                parent=styles["Normal"],
                fontName=base_font,
                fontSize=10,
                leading=12,
            )
            table_header_style = ParagraphStyle(
                "AnalyticsTableHeader",
                parent=styles["Normal"],
                fontName=base_font_bold,
                fontSize=10,
                leading=12,
                alignment=1,
                textColor=colors.whitesmoke,
            )
            table_cell_style = ParagraphStyle(
                "AnalyticsTableCell",
                parent=styles["Normal"],
                fontName=base_font,
                fontSize=10,
                leading=12,
                alignment=1,
            )

            # Title
            elements.append(Paragraph(self.t["title"], title_style))
            # The filters on screen (plan todo 75 stage 4).
            elements.append(Paragraph(escape(self.scope_text(data)), normal_style))
            elements.append(Spacer(1, 0.2 * inch))

            small_header = ParagraphStyle("AnalyticsSmallHeader", parent=table_header_style, fontSize=8, leading=10)
            small_cell = ParagraphStyle("AnalyticsSmallCell", parent=table_cell_style, fontSize=8, leading=10)
            small_left = ParagraphStyle("AnalyticsSmallLeft", parent=small_cell, alignment=0)
            student_view = (data or {}).get("student_view")
            if student_view:
                # The student view: that student's courses and categories, not the class tables.
                elements.extend(
                    self._pdf_student_view(
                        student_view,
                        heading_style,
                        normal_style,
                        small_header,
                        small_cell,
                        small_left,
                        base_font,
                        base_font_bold,
                    )
                )
                data = None

            # Summary Section
            if data and "summary" in data:
                summary = data["summary"]
                elements.append(Paragraph(self.t["summary_statistics"], heading_style))

                summary_data = [
                    [
                        Paragraph(self.t["total_students"], table_header_style),
                        Paragraph(str(summary.get("total_students", 0)), table_cell_style),
                    ],
                    [
                        Paragraph(self.t["total_courses"], table_header_style),
                        Paragraph(str(summary.get("total_courses", 0)), table_cell_style),
                    ],
                    [
                        Paragraph(self.t["average_grade"], table_header_style),
                        Paragraph(f"{summary.get('average_grade', 0):.2f}%", table_cell_style),
                    ],
                    [
                        Paragraph(self.t["average_attendance"], table_header_style),
                        Paragraph(f"{summary.get('average_attendance', 0):.2f}%", table_cell_style),
                    ],
                ]

                summary_table = Table(summary_data, colWidths=[3 * inch, 3 * inch])
                summary_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            # Apply base font to all cells, then override header with bold
                            ("FONTNAME", (0, 0), (-1, -1), base_font),
                            ("FONTSIZE", (0, 0), (-1, -1), 10),
                            ("FONTNAME", (0, 0), (-1, 0), base_font_bold),  # Overrides above for row 0
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                            ("TOPPADDING", (0, 0), (-1, -1), 8),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                        ]
                    )
                )
                elements.append(summary_table)
                elements.append(Spacer(1, 0.3 * inch))

            # Class Averages Section
            if data and "class_averages" in data:
                elements.append(Paragraph(self.t["class_averages"], heading_style))

                class_data = [
                    [
                        Paragraph(self.t["class"], table_header_style),
                        Paragraph(self.t["student_count"], table_header_style),
                        Paragraph(self.t["average_grade"], table_header_style),
                    ]
                ]
                for item in data["class_averages"][:10]:
                    class_data.append(
                        [
                            Paragraph(item.get("label", ""), table_cell_style),
                            Paragraph(str(item.get("count", 0)), table_cell_style),
                            Paragraph(f"{item.get('average', 0):.2f}%", table_cell_style),
                        ]
                    )

                class_table = Table(class_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
                class_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            # Apply base font to all cells, then override header with bold
                            ("FONTNAME", (0, 0), (-1, -1), base_font),
                            ("FONTSIZE", (0, 0), (-1, -1), 10),
                            ("FONTNAME", (0, 0), (-1, 0), base_font_bold),  # Overrides above for row 0
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                            ("TOPPADDING", (0, 0), (-1, -1), 8),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                        ]
                    )
                )
                elements.append(class_table)
                elements.append(Spacer(1, 0.3 * inch))

            # Course Averages Section
            if data and "course_averages" in data:
                elements.append(Paragraph(self.t["course_averages"], heading_style))

                course_data = [
                    [
                        Paragraph(self.t["course_name"], table_header_style),
                        Paragraph(self.t["enrollments"], table_header_style),
                        Paragraph(self.t["average_grade"], table_header_style),
                    ]
                ]
                for item in data["course_averages"][:15]:
                    course_data.append(
                        [
                            Paragraph(item.get("label", "")[:30], table_cell_style),
                            Paragraph(str(item.get("count", 0)), table_cell_style),
                            Paragraph(f"{item.get('average', 0):.2f}%", table_cell_style),
                        ]
                    )

                course_table = Table(course_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
                course_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            # Apply base font to all cells, then override header with bold
                            ("FONTNAME", (0, 0), (-1, -1), base_font),
                            ("FONTSIZE", (0, 0), (-1, -1), 10),
                            ("FONTNAME", (0, 0), (-1, 0), base_font_bold),  # Overrides above for row 0
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                            ("TOPPADDING", (0, 0), (-1, -1), 8),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                        ]
                    )
                )
                elements.append(course_table)
                elements.append(Spacer(1, 0.2 * inch))

            # The selection's students and its categories (plan todo 75 stage 4).
            if data and data.get("students"):
                headers, rows = self.student_rows(data)
                keep = [0, 2, 3, 4, 5, 6, 7, 8, 9, 11]  # the PDF leaves out the student ID and the course names
                table_rows = [[Paragraph(escape(headers[i]), small_header) for i in keep]]
                for values in rows:
                    cells = []
                    for i in keep:
                        value = values[i]
                        text = self.shown(value) if i in (5, 6, 7) else str(value)
                        cells.append(Paragraph(escape(text), small_left if i == 0 else small_cell))
                    table_rows.append(cells)
                widths = [2.2, 0.7, 0.7, 0.7, 0.9, 0.9, 0.9, 0.7, 1.3, 0.7]
                elements.append(Paragraph(self.t["students"], heading_style))
                elements.append(self._pdf_table(table_rows, [w * inch for w in widths], base_font, base_font_bold))
                elements.append(Spacer(1, 0.2 * inch))

            categories = (data or {}).get("categories") or {}
            if data and categories.get("columns") and categories.get("students"):
                elements.append(Paragraph(self.t["categories"], heading_style))
                elements.append(Paragraph(escape(self.t["legend"]), normal_style))
                elements.append(Spacer(1, 0.1 * inch))
                columns = categories["columns"]
                table_rows = [[Paragraph(escape(name), small_header) for name in [self.t["student"], *columns]]]
                table_rows.append(
                    [Paragraph(f"<b>{escape(self.t['class_average'])}</b>", small_left)]
                    + [Paragraph(f"<b>{self.shown(v)}</b>", small_cell) for v in categories.get("averages") or []]
                )
                for student in categories["students"]:
                    signals = student.get("signals") or []
                    row_cells = [Paragraph(escape(student.get("name", "")), small_left)]
                    for c, value in enumerate(student.get("cells") or []):
                        row_cells.append(
                            Paragraph(self._pdf_marked(value, signals[c] if c < len(signals) else None), small_cell)
                        )
                    table_rows.append(row_cells)
                first = 2.2 * inch
                rest = max((10 * inch - first) / max(len(columns), 1), 0.6 * inch)
                elements.append(self._pdf_table(table_rows, [first] + [rest] * len(columns), base_font, base_font_bold))
                elements.append(Spacer(1, 0.2 * inch))

            # Add generated timestamp at end
            elements.append(Paragraph(f"{self.t['generated']}: {self.format_datetime()}", normal_style))

            doc.build(elements)
            output.seek(0)
            return output.getvalue()

        except Exception as exc:
            logger.error("Failed to export dashboard to PDF: %s", exc, exc_info=True)
            raise

    _MARK_COLOURS = {"strength": "#00804C", "difficulty": "#C00000"}

    def _pdf_marked(self, value: Any, signal: Optional[str]) -> str:
        """A figure for a PDF cell: one decimal, with its mark and colour when it is a signal."""
        text = self.shown(value)
        if signal in self._MARK_COLOURS and value is not None:
            return f'<font color="{self._MARK_COLOURS[signal]}">{self.mark(signal)} {text}</font>'
        return text

    @staticmethod
    def _pdf_table(rows: List[List[Any]], widths: List[float], base_font: str, base_font_bold: str) -> Table:
        table = Table(rows, colWidths=widths, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                    ("FONTNAME", (0, 0), (-1, -1), base_font),
                    ("FONTNAME", (0, 0), (-1, 0), base_font_bold),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                ]
            )
        )
        return table

    def _pdf_student_view(
        self,
        view: Dict[str, Any],
        heading_style: Any,
        normal_style: Any,
        small_header: Any,
        small_cell: Any,
        small_left: Any,
        base_font: str,
        base_font_bold: str,
    ) -> List[Flowable]:
        student = view.get("student") or {}
        elements: List[Flowable] = [Paragraph(escape(f"{self.t['student']}: {student.get('name', '')}"), heading_style)]
        headers = [
            self.t["course"],
            self.t["final_grade"],
            self.t["class_average"],
            self.t["attendance"],
            self.t["late"],
            self.t["absence_limit"],
        ]
        rows = [[Paragraph(escape(h), small_header) for h in headers]]
        for course in view.get("courses") or []:
            rows.append(
                [
                    Paragraph(escape(str(course.get("course", ""))), small_left),
                    Paragraph(self.shown(course.get("final_grade")), small_cell),
                    Paragraph(self.shown(course.get("class_average")), small_cell),
                    Paragraph(self.shown(course.get("attendance_rate")), small_cell),
                    Paragraph(str(course.get("late") or 0), small_cell),
                    Paragraph(escape(self.absence_label(course.get("absence_status"))), small_cell),
                ]
            )
        elements.append(Paragraph(self.t["courses"], heading_style))
        elements.append(
            self._pdf_table(rows, [w * inch for w in (3.6, 1.2, 1.2, 1.2, 1.0, 1.8)], base_font, base_font_bold)
        )
        if view.get("categories"):
            elements.append(Paragraph(self.t["categories"], heading_style))
            elements.append(Paragraph(escape(self.t["legend"]), normal_style))
            rows = [
                [
                    Paragraph(escape(h), small_header)
                    for h in (
                        self.t["category"],
                        self.t["student"],
                        self.t["class_average"],
                        self.t["difference"],
                        self.t["mark"],
                    )
                ]
            ]
            for category in view["categories"]:
                signal = category.get("signal")
                difference = category.get("difference")
                rows.append(
                    [
                        Paragraph(escape(str(category.get("name", ""))), small_left),
                        Paragraph(self._pdf_marked(category.get("average"), signal), small_cell),
                        Paragraph(self.shown(category.get("class_average")), small_cell),
                        Paragraph("—" if difference is None else f"{difference:+.1f}", small_cell),
                        Paragraph(escape(self.t.get(signal, "") if signal else ""), small_cell),
                    ]
                )
            elements.append(
                self._pdf_table(rows, [w * inch for w in (3.6, 1.4, 1.4, 1.4, 1.8)], base_font, base_font_bold)
            )
        elements.append(Spacer(1, 0.2 * inch))
        return elements

    def export_student_performance_to_excel(
        self,
        student_id: int,
        performance_data: List[Dict[str, Any]],
        student_name: str = "Student",
        filename: str = "student_performance.xlsx",
    ) -> bytes:
        """Export student performance data to Excel."""
        try:
            wb = Workbook()
            ws = wb.active
            ws.title = "Performance"

            header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            header_font = Font(bold=True, color="FFFFFF")
            border = Border(
                left=Side(style="thin"),
                right=Side(style="thin"),
                top=Side(style="thin"),
                bottom=Side(style="thin"),
            )

            # Header
            ws["A1"] = f"Performance Report: {student_name}"
            ws["A1"].font = Font(bold=True, size=12)
            ws.merge_cells("A1:D1")

            ws["A2"] = f"Generated: {dt.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
            ws["A2"].font = Font(italic=True, size=9)
            ws.merge_cells("A2:D2")

            row = 4

            # Headers
            headers = ["Date", "Course", "Grade", "Percentage %"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=row, column=col)
                cell.value = header
                cell.fill = header_fill
                cell.font = header_font
                cell.border = border
                cell.alignment = Alignment(horizontal="center")

            row += 1

            # Data
            for item in performance_data:
                ws[f"A{row}"] = item.get("date", "")
                ws[f"B{row}"] = item.get("course", "")
                ws[f"C{row}"] = item.get("grade", 0)
                ws[f"D{row}"] = f"{item.get('percentage', 0):.2f}%"
                for col in range(1, 5):
                    ws.cell(row=row, column=col).border = border
                row += 1

            # Adjust widths
            ws.column_dimensions["A"].width = 15
            ws.column_dimensions["B"].width = 20
            ws.column_dimensions["C"].width = 12
            ws.column_dimensions["D"].width = 15

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return output.getvalue()

        except Exception as exc:
            logger.error("Failed to export student performance: %s", exc, exc_info=True)
            raise
