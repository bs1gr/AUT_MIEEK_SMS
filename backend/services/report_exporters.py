"""
Report export utilities for generating PDF and CSV formats.

Provides:
- PDF generation using ReportLab
- CSV generation with proper formatting
- Styling and layout for professional reports
"""

import csv
import io
from datetime import date
from typing import Dict, Any

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
    )
    from reportlab.lib.enums import TA_CENTER

    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


from reportlab.platypus import Flowable


def generate_pdf_report(report_data: Dict[str, Any]) -> bytes:
    """
    Generate PDF report from report data.

    Args:
        report_data: StudentPerformanceReport data as dict

    Returns:
        PDF bytes

    Raises:
        ImportError: If reportlab is not installed
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError(
            "ReportLab is required for PDF generation. Install with: pip install reportlab"
        )

    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, topMargin=0.5 * inch, bottomMargin=0.5 * inch
    )

    # Container for elements
    elements: list[Flowable] = []

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=12,
        alignment=TA_CENTER,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=10,
        spaceBefore=10,
    )
    normal_style = styles["Normal"]

    # Title
    elements.append(Paragraph("Student Performance Report", title_style))
    elements.append(Spacer(1, 0.2 * inch))

    # Student Information
    student_info_data = [
        ["Student Name:", report_data.get("student_name", "N/A")],
        ["Email:", report_data.get("student_email", "N/A")],
        ["Report Period:", report_data.get("report_period", "N/A")],
        [
            "Date Range:",
            f"{report_data.get('start_date', 'N/A')} to {report_data.get('end_date', 'N/A')}",
        ],
        ["Generated:", date.today().strftime("%Y-%m-%d")],
    ]

    student_table = Table(student_info_data, colWidths=[2 * inch, 4 * inch])
    student_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E0E7FF")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),  # type: ignore[arg-type]
            ]
        )
    )
    elements.append(student_table)
    elements.append(Spacer(1, 0.3 * inch))

    # Overall Attendance Summary
    if report_data.get("overall_attendance"):
        elements.append(Paragraph("Attendance Summary", heading_style))
        att = report_data["overall_attendance"]
        att_data = [
            ["Metric", "Value"],
            ["Attendance Rate", f"{att.get('attendance_rate', 0):.1f}%"],
            ["Total Days", str(att.get("total_days", 0))],
            ["Present", str(att.get("present", 0))],
            ["Absent", str(att.get("absent", 0))],
            ["Unexcused Absences", str(att.get("unexcused_absences", 0))],
        ]

        att_table = Table(att_data, colWidths=[3 * inch, 3 * inch])
        att_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),  # type: ignore[arg-type]
                    # type: ignore[list-item]
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#F3F4F6")],
                    ),
                ]
            )
        )
        elements.append(att_table)
        elements.append(Spacer(1, 0.2 * inch))

    # Overall Grades Summary
    if report_data.get("overall_grades"):
        elements.append(Paragraph("Grades Summary", heading_style))
        grades = report_data["overall_grades"]
        grades_data = [
            ["Metric", "Value"],
            ["Average Grade", f"{grades.get('average_percentage', 0):.1f}%"],
            ["Total Assignments", str(grades.get("total_assignments", 0))],
            ["Highest Grade", f"{grades.get('highest_grade', 0):.1f}"],
            ["Lowest Grade", f"{grades.get('lowest_grade', 0):.1f}"],
            ["Trend", grades.get("grade_trend", "N/A").capitalize()],
        ]

        grades_table = Table(grades_data, colWidths=[3 * inch, 3 * inch])
        grades_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    # type: ignore[list-item]
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#F3F4F6")],
                    ),
                ]
            )
        )
        elements.append(grades_table)
        elements.append(Spacer(1, 0.2 * inch))

    # Course Breakdown
    if report_data.get("courses"):
        elements.append(Paragraph("Course-by-Course Breakdown", heading_style))

        for course in report_data["courses"]:
            elements.append(
                Paragraph(
                    f"<b>{course['course_code']}: {course['course_title']}</b>",
                    normal_style,
                )
            )

            course_data = [["Metric", "Value"]]

            if course.get("attendance"):
                course_data.append(
                    [
                        "Attendance Rate",
                        f"{course['attendance']['attendance_rate']:.1f}%",
                    ]
                )

            if course.get("grades"):
                course_data.append(
                    ["Average Grade", f"{course['grades']['average_percentage']:.1f}%"]
                )
                course_data.append(
                    ["Trend", course["grades"]["grade_trend"].capitalize()]
                )

            if len(course_data) > 1:  # If we have data beyond header
                course_table = Table(course_data, colWidths=[2.5 * inch, 3.5 * inch])
                course_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E0E7FF")),
                            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, -1), 9),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                            ("TOPPADDING", (0, 0), (-1, -1), 6),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),  # type: ignore[arg-type]
                        ]
                    )
                )
                elements.append(course_table)

            elements.append(Spacer(1, 0.15 * inch))

    # Recommendations
    if report_data.get("recommendations"):
        elements.append(Paragraph("Recommendations", heading_style))
        for rec in report_data["recommendations"]:
            elements.append(Paragraph(f"• {rec}", normal_style))
        elements.append(Spacer(1, 0.2 * inch))

    # Highlights
    if report_data.get("highlights"):
        elements.append(Paragraph("Highlights", heading_style))
        for highlight in report_data["highlights"][:10]:  # Limit to 10
            highlight_text = f"<b>{highlight['date']}</b> - {highlight['category']}: {highlight['description']}"
            elements.append(Paragraph(f"• {highlight_text}", normal_style))
        elements.append(Spacer(1, 0.2 * inch))

    # Build PDF
    doc.build(elements)

    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def generate_csv_report(report_data: Dict[str, Any]) -> str:
    """
    Generate CSV report from report data.

    Args:
        report_data: StudentPerformanceReport data as dict

    Returns:
        CSV string
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(["Student Performance Report"])
    writer.writerow([])

    # Student Information
    writer.writerow(["Student Information"])
    writer.writerow(["Name", report_data.get("student_name", "N/A")])
    writer.writerow(["Email", report_data.get("student_email", "N/A")])
    writer.writerow(["Report Period", report_data.get("report_period", "N/A")])
    writer.writerow(["Start Date", report_data.get("start_date", "N/A")])
    writer.writerow(["End Date", report_data.get("end_date", "N/A")])
    writer.writerow(["Generated", date.today().strftime("%Y-%m-%d")])
    writer.writerow([])

    # Overall Attendance
    if report_data.get("overall_attendance"):
        writer.writerow(["Overall Attendance Summary"])
        att = report_data["overall_attendance"]
        writer.writerow(["Attendance Rate (%)", f"{att.get('attendance_rate', 0):.1f}"])
        writer.writerow(["Total Days", att.get("total_days", 0)])
        writer.writerow(["Present", att.get("present", 0)])
        writer.writerow(["Absent", att.get("absent", 0)])
        writer.writerow(["Unexcused Absences", att.get("unexcused_absences", 0)])
        writer.writerow([])

    # Overall Grades
    if report_data.get("overall_grades"):
        writer.writerow(["Overall Grades Summary"])
        grades = report_data["overall_grades"]
        writer.writerow(
            ["Average Percentage", f"{grades.get('average_percentage', 0):.1f}"]
        )
        writer.writerow(["Total Assignments", grades.get("total_assignments", 0)])
        writer.writerow(["Highest Grade", f"{grades.get('highest_grade', 0):.1f}"])
        writer.writerow(["Lowest Grade", f"{grades.get('lowest_grade', 0):.1f}"])
        writer.writerow(["Trend", grades.get("grade_trend", "N/A")])
        writer.writerow([])

    # Course Breakdown
    if report_data.get("courses"):
        writer.writerow(["Course-by-Course Breakdown"])
        writer.writerow(
            [
                "Course Code",
                "Course Title",
                "Attendance Rate",
                "Average Grade",
                "Grade Trend",
            ]
        )

        for course in report_data["courses"]:
            att_rate = course.get("attendance", {}).get("attendance_rate", "N/A")
            if att_rate != "N/A":
                att_rate = f"{att_rate:.1f}"

            avg_grade = course.get("grades", {}).get("average_percentage", "N/A")
            if avg_grade != "N/A":
                avg_grade = f"{avg_grade:.1f}"

            trend = course.get("grades", {}).get("grade_trend", "N/A")

            writer.writerow(
                [
                    course["course_code"],
                    course["course_title"],
                    att_rate,
                    avg_grade,
                    trend,
                ]
            )
        writer.writerow([])

    # Recommendations
    if report_data.get("recommendations"):
        writer.writerow(["Recommendations"])
        for rec in report_data["recommendations"]:
            writer.writerow([rec])
        writer.writerow([])

    # Highlights
    if report_data.get("highlights"):
        writer.writerow(["Highlights"])
        writer.writerow(["Date", "Category", "Description"])
        for highlight in report_data["highlights"]:
            writer.writerow(
                [highlight["date"], highlight["category"], highlight["description"]]
            )
        writer.writerow([])

    csv_string = output.getvalue()
    output.close()

    return csv_string
