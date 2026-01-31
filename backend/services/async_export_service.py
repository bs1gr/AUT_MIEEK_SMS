"""
Async export service for background Excel/PDF generation.

Provides task queue management for large exports to improve response times.
Uses in-memory queue pattern with background processing.
"""

import logging
import os
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional, Dict, Any, List
from enum import Enum

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session

from backend.models import Student, Course, Grade, ExportJob
from backend.db import get_session as get_db

logger = logging.getLogger(__name__)


class ExportStatus(str, Enum):
    """Export job status states."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AsyncExportService:
    """Service for managing async export tasks.

    Handles background generation of Excel/PDF files with status tracking.
    Uses background task queue pattern for non-blocking exports.
    """

    def __init__(self):
        self.exports_dir = os.path.join(os.path.dirname(__file__), "..", "exports")
        os.makedirs(self.exports_dir, exist_ok=True)

    def get_export_path(self, export_id: int, format: str) -> str:
        """Generate file path for export."""
        ext = "xlsx" if format == "excel" else format
        return os.path.join(self.exports_dir, f"export_{export_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}")

    def generate_students_excel(
        self,
        db: Session,
        export_job_id: int,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10000
    ) -> tuple[bool, Optional[str], str]:
        """Generate Excel export of students.

        Returns: (success, file_path, error_message)
        """
        try:
            query = db.query(Student).filter(Student.deleted_at.is_(None))

            # Apply filters if provided
            if filters:
                if filters.get("is_active") is not None:
                    query = query.filter(Student.is_active == filters.get("is_active"))
                if filters.get("status"):
                    query = query.filter(Student.status == filters.get("status"))

            # Apply limit and fetch
            students = query.order_by(Student.last_name, Student.first_name).limit(limit).all()

            # Generate workbook
            wb = Workbook()
            ws = wb.active
            ws.title = "Students"

            # Headers
            headers = ["ID", "First Name", "Last Name", "Email", "Student ID", "Enrollment Date", "Status"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
                cell.alignment = Alignment(horizontal="center")

            # Data rows
            for row, student in enumerate(students, 2):
                ws.cell(row=row, column=1, value=student.id)
                ws.cell(row=row, column=2, value=student.first_name)
                ws.cell(row=row, column=3, value=student.last_name)
                ws.cell(row=row, column=4, value=student.email)
                ws.cell(row=row, column=5, value=student.student_id)
                ws.cell(row=row, column=6, value=str(student.enrollment_date) if student.enrollment_date else "")
                ws.cell(row=row, column=7, value="Active" if student.is_active else "Inactive")

            # Adjust column widths
            for col in range(1, len(headers) + 1):
                ws.column_dimensions[get_column_letter(col)].width = 18

            # Save file
            file_path = self.get_export_path(export_job_id, "excel")
            wb.save(file_path)

            # Update export job
            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                export_job.status = ExportStatus.COMPLETED
                export_job.file_path = file_path
                export_job.total_records = len(students)
                export_job.completed_at = datetime.now(timezone.utc)
                db.commit()

            logger.info(f"Export {export_job_id} completed: {len(students)} students")
            return True, file_path, ""

        except Exception as e:
            logger.error(f"Export {export_job_id} failed: {str(e)}", exc_info=True)

            # Update export job status
            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                export_job.status = ExportStatus.FAILED
                export_job.completed_at = datetime.now(timezone.utc)
                db.commit()

            return False, None, str(e)

    def generate_courses_excel(
        self,
        db: Session,
        export_job_id: int,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10000
    ) -> tuple[bool, Optional[str], str]:
        """Generate Excel export of courses."""
        try:
            query = db.query(Course).filter(Course.deleted_at.is_(None))

            if filters:
                if filters.get("is_active") is not None:
                    query = query.filter(Course.is_active == filters.get("is_active"))

            courses = query.order_by(Course.code).limit(limit).all()

            # Generate workbook
            wb = Workbook()
            ws = wb.active
            ws.title = "Courses"

            headers = ["Code", "Name", "Description", "Instructor", "Credits", "Status"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill(start_color="059669", end_color="059669", fill_type="solid")
                cell.alignment = Alignment(horizontal="center")

            for row, course in enumerate(courses, 2):
                ws.cell(row=row, column=1, value=course.code)
                ws.cell(row=row, column=2, value=course.name)
                ws.cell(row=row, column=3, value=course.description or "")
                ws.cell(row=row, column=4, value=course.instructor or "")
                ws.cell(row=row, column=5, value=course.credits or 0)
                ws.cell(row=row, column=6, value="Active" if course.is_active else "Inactive")

            for col in range(1, len(headers) + 1):
                ws.column_dimensions[get_column_letter(col)].width = 18

            file_path = self.get_export_path(export_job_id, "excel")
            wb.save(file_path)

            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                export_job.status = ExportStatus.COMPLETED
                export_job.file_path = file_path
                export_job.total_records = len(courses)
                export_job.completed_at = datetime.now(timezone.utc)
                db.commit()

            logger.info(f"Export {export_job_id} completed: {len(courses)} courses")
            return True, file_path, ""

        except Exception as e:
            logger.error(f"Export {export_job_id} failed: {str(e)}", exc_info=True)

            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                export_job.status = ExportStatus.FAILED
                export_job.completed_at = datetime.now(timezone.utc)
                db.commit()

            return False, None, str(e)

    def generate_grades_excel(
        self,
        db: Session,
        export_job_id: int,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10000
    ) -> tuple[bool, Optional[str], str]:
        """Generate Excel export of grades."""
        try:
            query = db.query(Grade).filter(Grade.deleted_at.is_(None))

            if filters:
                if filters.get("student_id"):
                    query = query.filter(Grade.student_id == filters.get("student_id"))
                if filters.get("course_id"):
                    query = query.filter(Grade.course_id == filters.get("course_id"))

            grades = query.order_by(Grade.created_at.desc()).limit(limit).all()

            wb = Workbook()
            ws = wb.active
            ws.title = "Grades"

            headers = ["Student ID", "Course Code", "Grade", "Points", "Recorded Date"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill(start_color="7C3AED", end_color="7C3AED", fill_type="solid")
                cell.alignment = Alignment(horizontal="center")

            for row, grade in enumerate(grades, 2):
                ws.cell(row=row, column=1, value=grade.student_id if grade.student else "")
                ws.cell(row=row, column=2, value=grade.course.code if grade.course else "")
                ws.cell(row=row, column=3, value=grade.grade)
                ws.cell(row=row, column=4, value=grade.points)
                ws.cell(row=row, column=5, value=str(grade.created_at) if grade.created_at else "")

            for col in range(1, len(headers) + 1):
                ws.column_dimensions[get_column_letter(col)].width = 18

            file_path = self.get_export_path(export_job_id, "excel")
            wb.save(file_path)

            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                export_job.status = ExportStatus.COMPLETED
                export_job.file_path = file_path
                export_job.total_records = len(grades)
                export_job.completed_at = datetime.now(timezone.utc)
                db.commit()

            logger.info(f"Export {export_job_id} completed: {len(grades)} grades")
            return True, file_path, ""

        except Exception as e:
            logger.error(f"Export {export_job_id} failed: {str(e)}", exc_info=True)

            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                export_job.status = ExportStatus.FAILED
                export_job.completed_at = datetime.now(timezone.utc)
                db.commit()

            return False, None, str(e)

    def process_export_task(
        self,
        export_job_id: int,
        export_type: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10000
    ) -> tuple[bool, Optional[str], str]:
        """Process export task in background.

        This is called as a background task and handles the heavy lifting.
        """
        # Create fresh session for background task
        from backend.db import SessionLocal
        db = SessionLocal()

        try:
            # Update status to processing
            export_job = db.query(ExportJob).filter(ExportJob.id == export_job_id).first()
            if export_job:
                export_job.status = ExportStatus.PROCESSING
                db.commit()

            # Route to appropriate generator
            if export_type == "students":
                return self.generate_students_excel(db, export_job_id, filters, limit)
            elif export_type == "courses":
                return self.generate_courses_excel(db, export_job_id, filters, limit)
            elif export_type == "grades":
                return self.generate_grades_excel(db, export_job_id, filters, limit)
            else:
                raise ValueError(f"Unknown export type: {export_type}")

        finally:
            db.close()

    def get_export_download_url(self, export_job_id: int) -> Optional[str]:
        """Get download URL for completed export."""
        # This would be the endpoint where users can download the file
        # Format: /api/v1/export-jobs/{export_job_id}/download
        return f"/api/v1/export-jobs/{export_job_id}/download"
