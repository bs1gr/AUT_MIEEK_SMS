"""
Analytics Export Service
Provides functionality to export analytics data to PDF and Excel formats.
"""

import io
import logging
from datetime import datetime as dt
from typing import Any, Dict, List, Optional

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class AnalyticsExportService:
    """Service for exporting analytics data to various formats."""

    def __init__(self, db: Session):
        self.db = db

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
            ws["A1"] = "Analytics Dashboard Report"
            ws["A1"].font = Font(bold=True, size=14)
            ws.merge_cells("A1:D1")

            # Date exported
            ws["A2"] = f"Exported: {dt.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
            ws["A2"].font = Font(italic=True, size=10)
            ws.merge_cells("A2:D2")

            row = 4

            # Summary Section
            if data and "summary" in data:
                summary = data["summary"]
                ws[f"A{row}"] = "Summary Statistics"
                ws[f"A{row}"].fill = subheader_fill
                ws[f"A{row}"].font = subheader_font
                ws.merge_cells(f"A{row}:B{row}")
                row += 1

                summary_items = [
                    ("Total Students", summary.get("total_students", 0)),
                    ("Total Courses", summary.get("total_courses", 0)),
                    ("Average Grade %", f"{summary.get('average_grade', 0):.2f}%"),
                    ("Average Attendance %", f"{summary.get('average_attendance', 0):.2f}%"),
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
                ws[f"A{row}"] = "Class Averages"
                ws[f"A{row}"].fill = subheader_fill
                ws[f"A{row}"].font = subheader_font
                ws.merge_cells(f"A{row}:C{row}")
                row += 1

                # Headers
                headers = ["Class", "Student Count", "Average Grade %"]
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
                ws[f"A{row}"] = "Course Averages"
                ws[f"A{row}"].fill = subheader_fill
                ws[f"A{row}"].font = subheader_font
                ws.merge_cells(f"A{row}:C{row}")
                row += 1

                # Headers
                headers = ["Course Name", "Enrollments", "Average Grade %"]
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
            ws.column_dimensions["A"].width = 25
            ws.column_dimensions["B"].width = 18
            ws.column_dimensions["C"].width = 18
            ws.column_dimensions["D"].width = 18

            # Save to bytes
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return output.getvalue()

        except Exception as exc:
            logger.error("Failed to export dashboard to Excel: %s", exc, exc_info=True)
            raise

    def export_dashboard_to_pdf(
        self,
        filename: str = "analytics_dashboard.pdf",
        data: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """Export dashboard summary data to PDF format."""
        try:
            output = io.BytesIO()
            doc = SimpleDocTemplate(
                output,
                pagesize=letter,
                rightMargin=0.5 * inch,
                leftMargin=0.5 * inch,
                topMargin=0.75 * inch,
                bottomMargin=0.75 * inch,
            )

            # Styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                "CustomTitle",
                parent=styles["Heading1"],
                fontSize=18,
                textColor=colors.HexColor("#4472C4"),
                spaceAfter=12,
            )
            heading_style = ParagraphStyle(
                "CustomHeading",
                parent=styles["Heading2"],
                fontSize=14,
                textColor=colors.HexColor("#2F5496"),
                spaceAfter=10,
                spaceBefore=6,
            )

            elements = []

            # Title
            elements.append(Paragraph("Analytics Dashboard Report", title_style))
            elements.append(Paragraph(f"Generated: {dt.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", styles["Normal"]))
            elements.append(Spacer(1, 0.3 * inch))

            # Summary Section
            if data and "summary" in data:
                summary = data["summary"]
                elements.append(Paragraph("Summary Statistics", heading_style))

                summary_data = [
                    ["Total Students", str(summary.get("total_students", 0))],
                    ["Total Courses", str(summary.get("total_courses", 0))],
                    ["Average Grade", f"{summary.get('average_grade', 0):.2f}%"],
                    ["Average Attendance", f"{summary.get('average_attendance', 0):.2f}%"],
                ]

                summary_table = Table(summary_data, colWidths=[3.5 * inch, 2 * inch])
                summary_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, 0), 12),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                            ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ]
                    )
                )
                elements.append(summary_table)
                elements.append(Spacer(1, 0.3 * inch))

            # Class Averages Section
            if data and "class_averages" in data:
                elements.append(Paragraph("Class Averages", heading_style))

                class_data = [["Class", "Student Count", "Average Grade %"]]
                for item in data["class_averages"][:10]:  # Limit to first 10
                    class_data.append([
                        item.get("label", ""),
                        str(item.get("count", 0)),
                        f"{item.get('average', 0):.2f}%",
                    ])

                class_table = Table(class_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
                class_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, -1), 10),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                            ("GRID", (0, 0), (-1, -1), 1, colors.black),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                        ]
                    )
                )
                elements.append(class_table)
                elements.append(Spacer(1, 0.3 * inch))

                # Page break if we have more data
                if data.get("course_averages"):
                    elements.append(PageBreak())

            # Course Averages Section
            if data and "course_averages" in data:
                elements.append(Paragraph("Course Averages", heading_style))

                course_data = [["Course Name", "Enrollments", "Average Grade %"]]
                for item in data["course_averages"][:15]:  # Limit to first 15
                    course_data.append([
                        item.get("label", "")[:30],  # Truncate long names
                        str(item.get("count", 0)),
                        f"{item.get('average', 0):.2f}%",
                    ])

                course_table = Table(course_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
                course_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, -1), 10),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                            ("GRID", (0, 0), (-1, -1), 1, colors.black),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                        ]
                    )
                )
                elements.append(course_table)

            # Build PDF
            doc.build(elements)
            output.seek(0)
            return output.getvalue()

        except Exception as exc:
            logger.error("Failed to export dashboard to PDF: %s", exc, exc_info=True)
            raise

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
