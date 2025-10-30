"""
Export Routes
Provides endpoints to export data to Excel/PDF.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/export",
    tags=["Export"],
    responses={404: {"description": "Not found"}},
)


from backend.db import get_session as get_db


@router.get("/students/excel")
async def export_students_excel(db: Session = Depends(get_db)):
    try:
        from backend.models import Student
        students = db.query(Student).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Students"
        headers = ["ID", "First Name", "Last Name", "Email", "Student ID", "Enrollment Date", "Status"]
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
            ws.cell(row=row, column=7, value="Active" if s.is_active else "Inactive")
        for col in range(1, len(headers) + 1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 18
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"students_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export students excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/grades/excel/{student_id}")
async def export_student_grades_excel(student_id: int, db: Session = Depends(get_db)):
    try:
        from backend.models import Student, Grade
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        grades = db.query(Grade).filter(Grade.student_id == student_id).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Grades"
        ws.merge_cells("A1:H1")
        title = ws["A1"]
        title.value = f"Grade Report: {student.first_name} {student.last_name} ({student.student_id})"
        title.font = Font(size=16, bold=True)
        title.alignment = Alignment(horizontal="center")
        headers = ["Assignment", "Category", "Score", "Max Score", "Percentage", "Weight", "Grade", "Date"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=3, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        total_percentage = 0
        for row, g in enumerate(grades, 4):
            pct = (g.grade / g.max_grade) * 100 if g.max_grade else 0
            total_percentage += pct
            ws.cell(row=row, column=1, value=g.assignment_name)
            ws.cell(row=row, column=2, value=g.category or "N/A")
            ws.cell(row=row, column=3, value=g.grade)
            ws.cell(row=row, column=4, value=g.max_grade)
            ws.cell(row=row, column=5, value=f"{pct:.2f}%")
            ws.cell(row=row, column=6, value=g.weight)
            ws.cell(row=row, column=7, value=_letter_grade(pct))
            ws.cell(row=row, column=8, value=str(g.date_submitted) if g.date_submitted else "N/A")
        for col in range(1, 9):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 18
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
    except Exception as e:
        logger.error(f"Export grades excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


def _letter_grade(percentage: float) -> str:
    """
    Convert a percentage grade to a letter grade.
    
    Args:
        percentage: Numeric grade as a percentage (0-100)
    
    Returns:
        Letter grade: A (90-100), B (80-89), C (70-79), D (60-69), F (0-59)
    """
    if percentage >= 90:
        return "A"
    if percentage >= 80:
        return "B"
    if percentage >= 70:
        return "C"
    if percentage >= 60:
        return "D"
    return "F"


@router.get("/students/pdf")
async def export_students_pdf(db: Session = Depends(get_db)):
    try:
        from backend.models import Student
        students = db.query(Student).all()
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=30,
            alignment=1,
        )
        elements.append(Paragraph("Student Directory", title_style))
        elements.append(Spacer(1, 0.2 * inch))
        data = [["ID", "Name", "Student ID", "Email", "Enrollment", "Status"]]
        for s in students:
            data.append([
                str(s.id),
                f"{s.first_name} {s.last_name}",
                s.student_id,
                s.email,
                str(s.enrollment_date),
                "Active" if s.is_active else "Inactive",
            ])
        table = Table(data, colWidths=[0.5 * inch, 1.5 * inch, 1 * inch, 2 * inch, 1 * inch, 0.8 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
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
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        filename = f"students_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export students pdf failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/attendance/excel")
async def export_attendance_excel(db: Session = Depends(get_db)):
    try:
        from backend.models import Attendance
        records = db.query(Attendance).all()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance"
        headers = ["ID", "Student ID", "Course ID", "Date", "Status", "Period", "Notes"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        for row, r in enumerate(records, 2):
            ws.cell(row=row, column=1, value=r.id)
            ws.cell(row=row, column=2, value=r.student_id)
            ws.cell(row=row, column=3, value=r.course_id)
            ws.cell(row=row, column=4, value=str(r.date))
            ws.cell(row=row, column=5, value=r.status)
            ws.cell(row=row, column=6, value=r.period_number)
            ws.cell(row=row, column=7, value=r.notes or "")
        for col in range(1, 8):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 15
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"attendance_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export attendance excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/courses/excel")
async def export_courses_excel(db: Session = Depends(get_db)):
    """Export all courses to Excel"""
    try:
        from backend.models import Course
        courses = db.query(Course).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Courses"
        headers = ["ID", "Course Code", "Course Name", "Semester", "Credits", "Hours/Week", "Description"]
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
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 20

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"courses_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export courses excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/enrollments/excel")
async def export_enrollments_excel(db: Session = Depends(get_db)):
    """Export all course enrollments to Excel"""
    try:
        from backend.models import CourseEnrollment, Student, Course
        enrollments = db.query(CourseEnrollment).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Enrollments"
        headers = ["ID", "Student ID", "Student Name", "Course ID", "Course Code", "Course Name", "Enrolled Date"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, e in enumerate(enrollments, 2):
            student = db.query(Student).filter(Student.id == e.student_id).first()
            course = db.query(Course).filter(Course.id == e.course_id).first()

            ws.cell(row=row, column=1, value=e.id)
            ws.cell(row=row, column=2, value=e.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else "N/A")
            ws.cell(row=row, column=4, value=e.course_id)
            ws.cell(row=row, column=5, value=course.course_code if course else "N/A")
            ws.cell(row=row, column=6, value=course.course_name if course else "N/A")
            ws.cell(row=row, column=7, value=str(e.enrolled_at))

        for col in range(1, 8):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 18

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"enrollments_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export enrollments excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/grades/excel")
async def export_all_grades_excel(db: Session = Depends(get_db)):
    """Export all grades to Excel"""
    try:
        from backend.models import Grade, Student, Course
        grades = db.query(Grade).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "All Grades"
        headers = ["ID", "Student ID", "Student Name", "Course ID", "Course Name", "Assignment", "Category", "Score", "Max Score", "Percentage", "Weight", "Date Submitted"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, g in enumerate(grades, 2):
            student = db.query(Student).filter(Student.id == g.student_id).first()
            course = db.query(Course).filter(Course.id == g.course_id).first()
            pct = (g.grade / g.max_grade) * 100 if g.max_grade else 0

            ws.cell(row=row, column=1, value=g.id)
            ws.cell(row=row, column=2, value=g.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else "N/A")
            ws.cell(row=row, column=4, value=g.course_id)
            ws.cell(row=row, column=5, value=course.course_name if course else "N/A")
            ws.cell(row=row, column=6, value=g.assignment_name)
            ws.cell(row=row, column=7, value=g.category or "N/A")
            ws.cell(row=row, column=8, value=g.grade)
            ws.cell(row=row, column=9, value=g.max_grade)
            ws.cell(row=row, column=10, value=f"{pct:.2f}%")
            ws.cell(row=row, column=11, value=g.weight)
            ws.cell(row=row, column=12, value=str(g.date_submitted) if g.date_submitted else "N/A")

        for col in range(1, 13):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 15

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"all_grades_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export all grades excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/performance/excel")
async def export_daily_performance_excel(db: Session = Depends(get_db)):
    """Export all daily performance records to Excel"""
    try:
        from backend.models import DailyPerformance, Student, Course
        performances = db.query(DailyPerformance).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Daily Performance"
        headers = ["ID", "Student ID", "Student Name", "Course ID", "Course Name", "Date", "Category", "Score", "Max Score", "Percentage", "Notes"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, p in enumerate(performances, 2):
            student = db.query(Student).filter(Student.id == p.student_id).first()
            course = db.query(Course).filter(Course.id == p.course_id).first()

            ws.cell(row=row, column=1, value=p.id)
            ws.cell(row=row, column=2, value=p.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else "N/A")
            ws.cell(row=row, column=4, value=p.course_id)
            ws.cell(row=row, column=5, value=course.course_name if course else "N/A")
            ws.cell(row=row, column=6, value=str(p.date))
            ws.cell(row=row, column=7, value=p.category)
            ws.cell(row=row, column=8, value=p.score)
            ws.cell(row=row, column=9, value=p.max_score)
            ws.cell(row=row, column=10, value=f"{p.percentage:.2f}%")
            ws.cell(row=row, column=11, value=p.notes or "")

        for col in range(1, 12):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 15

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"daily_performance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export daily performance excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/highlights/excel")
async def export_highlights_excel(db: Session = Depends(get_db)):
    """Export all student highlights to Excel"""
    try:
        from backend.models import Highlight, Student
        highlights = db.query(Highlight).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Highlights"
        headers = ["ID", "Student ID", "Student Name", "Semester", "Category", "Rating", "Highlight Text", "Date Created", "Is Positive"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        for row, h in enumerate(highlights, 2):
            student = db.query(Student).filter(Student.id == h.student_id).first()

            ws.cell(row=row, column=1, value=h.id)
            ws.cell(row=row, column=2, value=h.student_id)
            ws.cell(row=row, column=3, value=f"{student.first_name} {student.last_name}" if student else "N/A")
            ws.cell(row=row, column=4, value=h.semester)
            ws.cell(row=row, column=5, value=h.category or "N/A")
            ws.cell(row=row, column=6, value=h.rating or "N/A")
            ws.cell(row=row, column=7, value=h.highlight_text)
            ws.cell(row=row, column=8, value=str(h.date_created))
            ws.cell(row=row, column=9, value="Yes" if h.is_positive else "No")

        for col in range(1, 10):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 18

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"highlights_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export highlights excel failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/student-report/pdf/{student_id}")
async def export_student_report_pdf(student_id: int, db: Session = Depends(get_db)):
    """Generate comprehensive student report PDF with grades, attendance, and analytics"""
    try:
        from backend.models import Student, Grade, Attendance, Course, DailyPerformance

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=20,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
            alignment=1,
        )
        elements.append(Paragraph("Comprehensive Student Report", title_style))

        # Student Info
        info_style = ParagraphStyle(
            "InfoStyle",
            parent=styles["Normal"],
            fontSize=12,
            spaceAfter=20,
            alignment=1,
        )
        elements.append(Paragraph(
            f"<b>{student.first_name} {student.last_name}</b> ({student.student_id})<br/>{student.email}",
            info_style
        ))
        elements.append(Spacer(1, 0.3 * inch))

        # Attendance Summary
        subtitle_style = ParagraphStyle(
            "SubtitleStyle",
            parent=styles["Heading2"],
            fontSize=14,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
        )
        elements.append(Paragraph("Attendance Summary", subtitle_style))

        attendance_records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
        total_att = len(attendance_records)
        present = len([a for a in attendance_records if a.status == "Present"])
        absent = len([a for a in attendance_records if a.status == "Absent"])
        late = len([a for a in attendance_records if a.status == "Late"])
        excused = len([a for a in attendance_records if a.status == "Excused"])
        att_rate = (present / total_att * 100) if total_att > 0 else 0

        att_data = [
            ["Total Classes", "Present", "Absent", "Late", "Excused", "Attendance Rate"],
            [str(total_att), str(present), str(absent), str(late), str(excused), f"{att_rate:.1f}%"]
        ]
        att_table = Table(att_data, colWidths=[1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.3*inch])
        att_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(att_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Grades by Course
        elements.append(Paragraph("Grades by Course", subtitle_style))

        grades = db.query(Grade).filter(Grade.student_id == student_id).all()
        course_grades = {}
        for g in grades:
            if g.course_id not in course_grades:
                course_grades[g.course_id] = []
            course_grades[g.course_id].append(g)

        for course_id, course_grade_list in course_grades.items():
            course = db.query(Course).filter(Course.id == course_id).first()
            if not course:
                continue

            elements.append(Paragraph(f"<b>{course.course_code} - {course.course_name}</b>", styles["Normal"]))
            elements.append(Spacer(1, 0.1 * inch))

            grade_data = [["Assignment", "Category", "Score", "Max Score", "Percentage", "Letter"]]
            total_pct = 0
            for g in course_grade_list:
                pct = (g.grade / g.max_grade * 100) if g.max_grade else 0
                total_pct += pct
                grade_data.append([
                    g.assignment_name[:20],
                    g.category or "N/A",
                    str(g.grade),
                    str(g.max_grade),
                    f"{pct:.1f}%",
                    _letter_grade(pct)
                ])

            avg_pct = total_pct / len(course_grade_list) if course_grade_list else 0
            grade_data.append(["", "", "", "Average:", f"{avg_pct:.1f}%", _letter_grade(avg_pct)])

            grade_table = Table(grade_data, colWidths=[2*inch, 1.2*inch, 0.8*inch, 1*inch, 1*inch, 0.8*inch])
            grade_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("BACKGROUND", (0, 1), (-1, -2), colors.beige),
                ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(grade_table)
            elements.append(Spacer(1, 0.2 * inch))

        # Daily Performance Summary
        daily_perf = db.query(DailyPerformance).filter(DailyPerformance.student_id == student_id).all()
        if daily_perf:
            elements.append(Paragraph("Daily Performance Summary", subtitle_style))
            avg_perf = sum(dp.percentage for dp in daily_perf) / len(daily_perf)
            perf_text = f"Total Daily Performance Entries: {len(daily_perf)}<br/>Average Performance: {avg_perf:.1f}%"
            elements.append(Paragraph(perf_text, styles["Normal"]))
            elements.append(Spacer(1, 0.2 * inch))

        # Footer
        footer_style = ParagraphStyle(
            "FooterStyle",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.grey,
            alignment=1,
        )
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>Student Management System",
            footer_style
        ))

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
    except Exception as e:
        logger.error(f"Export student report pdf failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/courses/pdf")
async def export_courses_pdf(db: Session = Depends(get_db)):
    """Export all courses to PDF"""
    try:
        from backend.models import Course
        courses = db.query(Course).all()

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=30,
            alignment=1,
        )
        elements.append(Paragraph("Course Catalog", title_style))
        elements.append(Spacer(1, 0.2 * inch))

        data = [["Code", "Course Name", "Semester", "Credits", "Hours/Week"]]
        for c in courses:
            data.append([
                c.course_code,
                c.course_name[:30],
                c.semester or "N/A",
                str(c.credits or 0),
                str(c.hours_per_week or 0),
            ])

        table = Table(data, colWidths=[1*inch, 2.5*inch, 1.3*inch, 0.8*inch, 1*inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 11),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)
        filename = f"courses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export courses pdf failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")


@router.get("/analytics/course/{course_id}/pdf")
async def export_course_analytics_pdf(course_id: int, db: Session = Depends(get_db)):
    """Export course analytics report to PDF"""
    try:
        from backend.models import Course, Grade, CourseEnrollment

        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=20,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
            alignment=1,
        )
        elements.append(Paragraph("Course Analytics Report", title_style))

        # Course Info
        info_style = ParagraphStyle(
            "InfoStyle",
            parent=styles["Normal"],
            fontSize=12,
            spaceAfter=20,
            alignment=1,
        )
        elements.append(Paragraph(
            f"<b>{course.course_code} - {course.course_name}</b><br/>Semester: {course.semester or 'N/A'}<br/>Credits: {course.credits or 0}",
            info_style
        ))
        elements.append(Spacer(1, 0.3 * inch))

        # Get enrollments
        enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).all()

        # Get all grades for this course
        grades = db.query(Grade).filter(Grade.course_id == course_id).all()

        # Calculate statistics
        student_ids = set([e.student_id for e in enrollments])
        total_students = len(student_ids)
        total_assignments = len(grades)

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
            fontSize=14,
            textColor=colors.HexColor("#4F46E5"),
            spaceAfter=10,
        )
        elements.append(Paragraph("Course Statistics", subtitle_style))

        stats_data = [
            ["Metric", "Value"],
            ["Total Students Enrolled", str(total_students)],
            ["Total Assignments", str(total_assignments)],
            ["Average Grade", f"{avg_grade:.1f}%"],
            ["Highest Grade", f"{highest:.1f}%"],
            ["Lowest Grade", f"{lowest:.1f}%"],
        ]

        stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
        stats_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 11),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Grade Distribution
        if grades:
            elements.append(Paragraph("Grade Distribution", subtitle_style))

            # Count letter grades
            a_count = sum(1 for p in percentages if p >= 90)
            b_count = sum(1 for p in percentages if 80 <= p < 90)
            c_count = sum(1 for p in percentages if 70 <= p < 80)
            d_count = sum(1 for p in percentages if 60 <= p < 70)
            f_count = sum(1 for p in percentages if p < 60)

            dist_data = [
                ["Letter Grade", "Count", "Percentage"],
                ["A (90-100%)", str(a_count), f"{a_count/len(grades)*100:.1f}%"],
                ["B (80-89%)", str(b_count), f"{b_count/len(grades)*100:.1f}%"],
                ["C (70-79%)", str(c_count), f"{c_count/len(grades)*100:.1f}%"],
                ["D (60-69%)", str(d_count), f"{d_count/len(grades)*100:.1f}%"],
                ["F (<60%)", str(f_count), f"{f_count/len(grades)*100:.1f}%"],
            ]

            dist_table = Table(dist_data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
            dist_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(dist_table)

        # Footer
        footer_style = ParagraphStyle(
            "FooterStyle",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.grey,
            alignment=1,
        )
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>Student Management System",
            footer_style
        ))

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
    except Exception as e:
        logger.error(f"Export course analytics pdf failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Export failed")
