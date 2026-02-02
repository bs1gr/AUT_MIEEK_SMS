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
from pathlib import Path
from typing import Any, Dict

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
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


# Translation dictionaries for report labels
REPORT_LABELS = {
    "en": {
        "title": "Student Performance Report",
        "student_information": "Student Information",
        "student_name": "Student Name:",
        "email": "Email:",
        "report_period": "Report Period:",
        "start_date": "Start Date",
        "end_date": "End Date",
        "date_range": "Date Range:",
        "generated": "Generated:",
        "attendance_summary": "Attendance Summary",
        "overall_attendance_summary": "Overall Attendance Summary",
        "grades_summary": "Grades Summary",
        "overall_grades_summary": "Overall Grades Summary",
        "metric": "Metric",
        "value": "Value",
        "attendance_rate": "Attendance Rate",
        "attendance_rate_percent": "Attendance Rate (%)",
        "total_days": "Total Days",
        "present": "Present",
        "absent": "Absent",
        "unexcused_absences": "Unexcused Absences",
        "average_grade": "Average Grade",
        "average_percentage": "Average Percentage",
        "total_assignments": "Total Assignments",
        "highest_grade": "Highest Grade",
        "lowest_grade": "Lowest Grade",
        "trend": "Trend",
        "trend_improving": "Improving",
        "trend_declining": "Declining",
        "trend_stable": "Stable",
        "period_week": "Week",
        "period_month": "Month",
        "period_semester": "Semester",
        "period_year": "Year",
        "period_custom": "Custom",
        "course_breakdown": "Course-by-Course Breakdown",
        "course_code": "Course Code",
        "course_title": "Course Title",
        "recommendations": "Recommendations",
        "highlights": "Highlights",
        "date": "Date",
        "category": "Category",
        "description": "Description",
        "rec_attendance_low": "✓ Low attendance. Please improve attendance.",
        "rec_attendance_medium": "✓ Medium attendance. Try not to miss classes.",
        "rec_grades_failing": "✓ Grades need improvement. Review study habits and seek help in challenging subjects.",
        "rec_grades_needs_improvement": "✓ Room for improvement. Focus on challenging topics.",
        "rec_grades_excellent": "✓ Excellent academic performance! Keep up the great work.",
        "rec_trend_declining": "✓ Declining trend. Analyze what's changing and adjust your approach.",
        "rec_trend_improving": "✓ Improving trend. Keep up the effort you're making.",
        "rec_focus_courses": "✓ Focus on these courses with low grades: {courses}",
        "rec_satisfactory": "✓ Satisfactory overall performance. Maintain consistency.",
    },
    "el": {
        "title": "Αναφορά Απόδοσης Μαθητή",
        "student_information": "Πληροφορίες Μαθητή",
        "student_name": "Όνομα Μαθητή:",
        "email": "Email:",
        "report_period": "Περίοδος Αναφοράς:",
        "start_date": "Ημερομηνία Έναρξης",
        "end_date": "Ημερομηνία Λήξης",
        "date_range": "Εύρος Ημερομηνιών:",
        "generated": "Δημιουργήθηκε:",
        "attendance_summary": "Σύνοψη Παρουσιών",
        "overall_attendance_summary": "Συνολική Σύνοψη Παρουσιών",
        "grades_summary": "Σύνοψη Βαθμών",
        "overall_grades_summary": "Συνολική Σύνοψη Βαθμών",
        "metric": "Μέτρο",
        "value": "Τιμή",
        "attendance_rate": "Ποσοστό Παρουσιών",
        "attendance_rate_percent": "Ποσοστό Παρουσιών (%)",
        "total_days": "Συνολικές Ημέρες",
        "present": "Παρών",
        "absent": "Απών",
        "unexcused_absences": "Αδικαιολόγητες Απουσίες",
        "average_grade": "Μέσος Βαθμός",
        "average_percentage": "Μέσο Ποσοστό",
        "total_assignments": "Συνολικές Εργασίες",
        "highest_grade": "Υψηλότερος Βαθμός",
        "lowest_grade": "Χαμηλότερος Βαθμός",
        "trend": "Τάση",
        "trend_improving": "Βελτιούμενη",
        "trend_declining": "Πτωτική",
        "trend_stable": "Σταθερή",
        "period_week": "Εβδομάδα",
        "period_month": "Μήνας",
        "period_semester": "Εξάμηνο",
        "period_year": "Έτος",
        "period_custom": "Προσαρμοσμένο",
        "course_breakdown": "Ανάλυση ανά Μάθημα",
        "course_code": "Κωδικός Μαθήματος",
        "course_title": "Τίτλος Μαθήματος",
        "recommendations": "Συστάσεις",
        "highlights": "Σημαντικά Σημεία",
        "date": "Ημερομηνία",
        "category": "Κατηγορία",
        "description": "Περιγραφή",
        "rec_attendance_low": "✓ Χαμηλή παρουσία. Παρακαλώ βελτιώστε την παρακολούθηση.",
        "rec_attendance_medium": "✓ Μέτρια παρουσία. Προσπαθήστε να μην χάνετε μαθήματα.",
        "rec_grades_failing": "✓ Οι βαθμοί χρειάζονται βελτίωση. Αναθεωρήστε τις συνήθειες μελέτης και ζητήστε βοήθεια στα δύσκολα μαθήματα.",
        "rec_grades_needs_improvement": "✓ Υπάρχει περιθώριο βελτίωσης. Επικεντρωθείτε στα δύσκολα θέματα.",
        "rec_grades_excellent": "✓ Εξαιρετική ακαδημαϊκή επίδοση! Συνεχίστε την καλή δουλειά.",
        "rec_trend_declining": "✓ Πτωτική τάση. Αναλύστε τι αλλάζει και προσαρμόστε την προσέγγισή σας.",
        "rec_trend_improving": "✓ Βελτιούμενη τάση. Συνεχίστε την προσπάθεια που κάνετε.",
        "rec_focus_courses": "✓ Εστιάστε σε αυτά τα μαθήματα με χαμηλούς βαθμούς: {courses}",
        "rec_satisfactory": "✓ Ικανοποιητική συνολική επίδοση. Διατηρήστε τη συνέπεια.",
    },
}


def register_report_fonts() -> tuple[str, str]:
    """Register Unicode-capable fonts for PDF rendering and return (regular, bold) names."""
    font_regular = "DejaVuSans"
    font_bold = "DejaVuSans-Bold"
    fonts_dir = Path(__file__).resolve().parents[1] / "fonts"
    regular_path = fonts_dir / "DejaVuSans.ttf"
    bold_path = fonts_dir / "DejaVuSans-Bold.ttf"

    if regular_path.exists() and bold_path.exists():
        registered = set(pdfmetrics.getRegisteredFontNames())
        if font_regular not in registered:
            pdfmetrics.registerFont(TTFont(font_regular, str(regular_path)))
        if font_bold not in registered:
            pdfmetrics.registerFont(TTFont(font_bold, str(bold_path)))
        return font_regular, font_bold

    return "Helvetica", "Helvetica-Bold"


def get_label(key: str, language: str = "en") -> str:
    """Get translated label for given key and language."""
    lang_dict = REPORT_LABELS.get(language, REPORT_LABELS["en"])
    return lang_dict.get(key, key)


def translate_recommendation(rec_key: str, language: str = "en") -> str:
    """
    Translate recommendation key from format 'reports:rec_key' or 'reports:rec_key||data'.
    Handles interpolation for keys that need dynamic data.
    """
    # Handle format: "reports:rec_key||interpolationData"
    if "||" in rec_key:
        key_part, data_part = rec_key.split("||")
    else:
        key_part = rec_key
        data_part = None

    # Extract key from "reports:rec_key" format
    if ":" in key_part:
        _, key_name = key_part.split(":")
    else:
        key_name = key_part

    # Get the translated text
    translated = get_label(key_name, language)

    # Handle interpolation if present
    if data_part and "{courses}" in translated:
        translated = translated.replace("{courses}", data_part)

    return translated


def translate_report_period(period: str, language: str = "en") -> str:
    """Translate report period value (week/month/semester/year/custom)."""
    key = f"period_{period}"
    return get_label(key, language)


def translate_trend(trend: str, language: str = "en") -> str:
    """Translate trend value (improving/declining/stable)."""
    key = f"trend_{trend}"
    return get_label(key, language)


def generate_pdf_report(report_data: Dict[str, Any], language: str = "en") -> bytes:
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
        raise ImportError("ReportLab is required for PDF generation. Install with: pip install reportlab")

    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch, bottomMargin=0.5 * inch)

    # Container for elements
    elements: list[Flowable] = []

    # Styles
    styles = getSampleStyleSheet()
    base_font, base_font_bold = register_report_fonts()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName=base_font,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=10,
        spaceBefore=10,
        fontName=base_font,
    )
    normal_style = ParagraphStyle("Normal", parent=styles["Normal"], fontName=base_font)

    # Title
    elements.append(Paragraph(get_label("title", language), title_style))
    elements.append(Spacer(1, 0.2 * inch))

    # Student Information
    student_info_data = [
        [get_label("student_name", language), report_data.get("student_name", "N/A")],
        [get_label("email", language), report_data.get("student_email", "N/A")],
        [
            get_label("report_period", language),
            translate_report_period(report_data.get("report_period", "N/A"), language),
        ],
        [
            get_label("date_range", language),
            f"{report_data.get('start_date', 'N/A')} to {report_data.get('end_date', 'N/A')}",
        ],
        [get_label("generated", language), date.today().strftime("%Y-%m-%d")],
    ]

    student_table = Table(student_info_data, colWidths=[2 * inch, 4 * inch])
    student_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E0E7FF")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, -1), base_font),
                ("FONTNAME", (0, 0), (0, -1), base_font_bold),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),  # type: ignore[arg-type, list-item]
            ]
        )
    )
    elements.append(student_table)
    elements.append(Spacer(1, 0.3 * inch))

    # Overall Attendance Summary
    if report_data.get("overall_attendance"):
        elements.append(Paragraph(get_label("attendance_summary", language), heading_style))
        att = report_data["overall_attendance"]
        att_data = [
            [get_label("metric", language), get_label("value", language)],
            [get_label("attendance_rate", language), f"{att.get('attendance_rate', 0):.1f}%"],
            [get_label("total_days", language), str(att.get("total_days", 0))],
            [get_label("present", language), str(att.get("present", 0))],
            [get_label("absent", language), str(att.get("absent", 0))],
            [get_label("unexcused_absences", language), str(att.get("unexcused_absences", 0))],
        ]

        att_table = Table(att_data, colWidths=[3 * inch, 3 * inch])
        att_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), base_font),
                    ("FONTNAME", (0, 0), (-1, 0), base_font_bold),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),  # type: ignore[arg-type, list-item]
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                ]
            )
        )
        elements.append(att_table)
        elements.append(Spacer(1, 0.2 * inch))

    # Overall Grades Summary
    if report_data.get("overall_grades"):
        elements.append(Paragraph(get_label("grades_summary", language), heading_style))
        grades = report_data["overall_grades"]
        grades_data = [
            [get_label("metric", language), get_label("value", language)],
            [get_label("average_grade", language), f"{grades.get('average_percentage', 0):.1f}%"],
            [get_label("total_assignments", language), str(grades.get("total_assignments", 0))],
            [get_label("highest_grade", language), f"{grades.get('highest_grade', 0):.1f}"],
            [get_label("lowest_grade", language), f"{grades.get('lowest_grade', 0):.1f}"],
            [
                get_label("trend", language),
                translate_trend(grades.get("grade_trend", "N/A"), language),
            ],
        ]

        grades_table = Table(grades_data, colWidths=[3 * inch, 3 * inch])
        grades_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), base_font),
                    ("FONTNAME", (0, 0), (-1, 0), base_font_bold),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),  # type: ignore[arg-type, list-item]
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                ]
            )
        )
        elements.append(grades_table)
        elements.append(Spacer(1, 0.2 * inch))

    # Course Breakdown
    if report_data.get("courses"):
        elements.append(Paragraph(get_label("course_breakdown", language), heading_style))

        for course in report_data["courses"]:
            elements.append(Paragraph(f"<b>{course['course_code']}: {course['course_title']}</b>", normal_style))

            course_data = [[get_label("metric", language), get_label("value", language)]]

            if course.get("attendance"):
                course_data.append(
                    [get_label("attendance_rate", language), f"{course['attendance']['attendance_rate']:.1f}%"]
                )

            if course.get("grades"):
                course_data.append(
                    [get_label("average_grade", language), f"{course['grades']['average_percentage']:.1f}%"]
                )
                course_data.append(
                    [get_label("trend", language), translate_trend(course["grades"]["grade_trend"], language)]
                )

            if len(course_data) > 1:  # If we have data beyond header
                course_table = Table(course_data, colWidths=[2.5 * inch, 3.5 * inch])
                course_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E0E7FF")),
                            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                            ("FONTNAME", (0, 0), (-1, -1), base_font),
                            ("FONTNAME", (0, 0), (0, -1), base_font_bold),
                            ("FONTSIZE", (0, 0), (-1, -1), 9),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                            ("TOPPADDING", (0, 0), (-1, -1), 6),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),  # type: ignore[arg-type, list-item]
                        ]
                    )
                )
                elements.append(course_table)

            elements.append(Spacer(1, 0.15 * inch))

    # Recommendations
    if report_data.get("recommendations"):
        elements.append(Paragraph(get_label("recommendations", language), heading_style))
        for rec in report_data["recommendations"]:
            translated_rec = translate_recommendation(rec, language)
            elements.append(Paragraph(f"• {translated_rec}", normal_style))
        elements.append(Spacer(1, 0.2 * inch))

    # Highlights
    if report_data.get("highlights"):
        elements.append(Paragraph(get_label("highlights", language), heading_style))
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


def generate_csv_report(report_data: Dict[str, Any], language: str = "en") -> str:
    """
    Generate CSV report from report data.

    Args:
        report_data: StudentPerformanceReport data as dict
        language: Language for report output (en or el)

    Returns:
        CSV string
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([get_label("title", language)])
    writer.writerow([])

    # Student Information
    writer.writerow([get_label("student_information", language)])
    writer.writerow([get_label("student_name", language), report_data.get("student_name", "N/A")])
    writer.writerow([get_label("email", language), report_data.get("student_email", "N/A")])
    writer.writerow(
        [
            get_label("report_period", language),
            translate_report_period(report_data.get("report_period", "N/A"), language),
        ]
    )
    writer.writerow([get_label("start_date", language), report_data.get("start_date", "N/A")])
    writer.writerow([get_label("end_date", language), report_data.get("end_date", "N/A")])
    writer.writerow([get_label("generated", language), date.today().strftime("%Y-%m-%d")])
    writer.writerow([])

    # Overall Attendance
    if report_data.get("overall_attendance"):
        writer.writerow([get_label("overall_attendance_summary", language)])
        att = report_data["overall_attendance"]
        writer.writerow([get_label("attendance_rate_percent", language), f"{att.get('attendance_rate', 0):.1f}"])
        writer.writerow([get_label("total_days", language), att.get("total_days", 0)])
        writer.writerow([get_label("present", language), att.get("present", 0)])
        writer.writerow([get_label("absent", language), att.get("absent", 0)])
        writer.writerow([get_label("unexcused_absences", language), att.get("unexcused_absences", 0)])
        writer.writerow([])

    # Overall Grades
    if report_data.get("overall_grades"):
        writer.writerow([get_label("overall_grades_summary", language)])
        grades = report_data["overall_grades"]
        writer.writerow([get_label("average_percentage", language), f"{grades.get('average_percentage', 0):.1f}"])
        writer.writerow([get_label("total_assignments", language), grades.get("total_assignments", 0)])
        writer.writerow([get_label("highest_grade", language), f"{grades.get('highest_grade', 0):.1f}"])
        writer.writerow([get_label("lowest_grade", language), f"{grades.get('lowest_grade', 0):.1f}"])
        writer.writerow([get_label("trend", language), translate_trend(grades.get("grade_trend", "N/A"), language)])
        writer.writerow([])

    # Course Breakdown
    if report_data.get("courses"):
        writer.writerow([get_label("course_breakdown", language)])
        writer.writerow(
            [
                get_label("course_code", language),
                get_label("course_title", language),
                get_label("attendance_rate", language),
                get_label("average_grade", language),
                get_label("trend", language),
            ]
        )

        for course in report_data["courses"]:
            attendance = course.get("attendance") or {}
            att_rate = attendance.get("attendance_rate", "N/A")
            if att_rate != "N/A":
                att_rate = f"{att_rate:.1f}"

            grades = course.get("grades") or {}
            avg_grade = grades.get("average_percentage", "N/A")
            if avg_grade != "N/A":
                avg_grade = f"{avg_grade:.1f}"

            trend = translate_trend(grades.get("grade_trend", "N/A"), language)

            writer.writerow([course["course_code"], course["course_title"], att_rate, avg_grade, trend])
        writer.writerow([])

    # Recommendations
    if report_data.get("recommendations"):
        writer.writerow([get_label("recommendations", language)])
        for rec in report_data["recommendations"]:
            translated_rec = translate_recommendation(rec, language)
            writer.writerow([translated_rec])
        writer.writerow([])

    # Highlights
    if report_data.get("highlights"):
        writer.writerow([get_label("highlights", language)])
        writer.writerow(
            [get_label("date", language), get_label("category", language), get_label("description", language)]
        )
        for highlight in report_data["highlights"]:
            writer.writerow([highlight["date"], highlight["category"], highlight["description"]])
        writer.writerow([])

    csv_string = output.getvalue()
    output.close()

    return csv_string
