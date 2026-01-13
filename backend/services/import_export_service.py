"""
Import/Export Service for bulk data operations (Feature #127).

Handles:
- CSV/Excel file parsing
- Data validation
- Database import/export operations
- Transaction management and rollback
"""

import logging
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.models import (
    ImportExportHistory,
    ImportJob,
    ImportRow,
    ExportJob,
    Student,
)

logger = logging.getLogger(__name__)


class ImportExportService:
    """
    Service layer for bulk import/export operations.

    Provides high-level operations for:
    - Validating import data
    - Processing imports with transaction support
    - Generating exports in multiple formats
    - Tracking history and audit trail
    """

    UPLOAD_DIR = Path("uploads/imports")
    EXPORT_DIR = Path("exports")
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    ALLOWED_IMPORT_TYPES = ["students", "courses", "grades"]
    ALLOWED_EXPORT_TYPES = ["students", "courses", "grades", "attendance", "dashboard"]
    ALLOWED_FORMATS = ["csv", "xlsx", "pdf"]

    def __init__(self):
        """Initialize the service and ensure directories exist."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    # ========== VALIDATION METHODS ==========

    def validate_students_import(self, data: List[Dict[str, Any]]) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Validate student import data.

        Args:
            data: List of student records from CSV/Excel

        Returns:
            Tuple[is_valid, errors] where errors is list of validation errors
        """
        errors = []

        for row_num, row in enumerate(data, start=1):
            row_errors = []

            # Required fields
            if not row.get("first_name", "").strip():
                row_errors.append("first_name is required")
            if not row.get("last_name", "").strip():
                row_errors.append("last_name is required")
            if not row.get("email", "").strip():
                row_errors.append("email is required")
            if not row.get("student_id", "").strip():
                row_errors.append("student_id is required")

            # Email format validation
            email = row.get("email", "").strip()
            if email and "@" not in email:
                row_errors.append(f"email '{email}' is invalid")

            # Unique fields check
            if row.get("email"):
                # TODO: Check against database for uniqueness
                pass

            if row_errors:
                errors.append({"row": row_num, "errors": row_errors})

        return len(errors) == 0, errors

    def validate_courses_import(self, data: List[Dict[str, Any]]) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Validate course import data.

        Args:
            data: List of course records

        Returns:
            Tuple[is_valid, errors]
        """
        errors = []

        for row_num, row in enumerate(data, start=1):
            row_errors = []

            # Required fields
            if not row.get("title", "").strip():
                row_errors.append("title is required")
            if not row.get("code", "").strip():
                row_errors.append("code is required")

            if row_errors:
                errors.append({"row": row_num, "errors": row_errors})

        return len(errors) == 0, errors

    def validate_grades_import(self, data: List[Dict[str, Any]]) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Validate grade import data.

        Args:
            data: List of grade records

        Returns:
            Tuple[is_valid, errors]
        """
        errors = []

        for row_num, row in enumerate(data, start=1):
            row_errors = []

            # Required fields
            if not row.get("student_id"):
                row_errors.append("student_id is required")
            if not row.get("course_id"):
                row_errors.append("course_id is required")
            if "grade_value" not in row:
                row_errors.append("grade_value is required")

            # Grade value validation (0-100)
            try:
                grade = float(row.get("grade_value", 0))
                if not 0 <= grade <= 100:
                    row_errors.append("grade_value must be between 0 and 100")
            except (ValueError, TypeError):
                row_errors.append("grade_value must be a number")

            if row_errors:
                errors.append({"row": row_num, "errors": row_errors})

        return len(errors) == 0, errors

    # ========== IMPORT METHODS ==========

    def create_import_job(
        self,
        db: Session,
        file_name: str,
        file_type: str,
        import_type: str,
        total_rows: int,
        user_id: Optional[int],
    ) -> ImportJob:
        """
        Create a new import job record.

        Args:
            db: Database session
            file_name: Original file name
            file_type: File type (csv, xlsx)
            import_type: Import type (students, courses, grades)
            total_rows: Total rows in file
            user_id: User creating the import

        Returns:
            Created ImportJob instance
        """
        job = ImportJob(
            file_name=file_name,
            file_type=file_type,
            import_type=import_type,
            status="pending",
            total_rows=total_rows,
            successful_rows=0,
            failed_rows=0,
            imported_by=user_id,
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Log in history
        self._log_history(db, "import", import_type, "started", user_id, int(job.id))

        return job

    def add_import_rows(self, db: Session, import_job_id: int, rows: List[Dict[str, Any]]) -> None:
        """
        Add rows to an import job.

        Args:
            db: Database session
            import_job_id: ImportJob ID
            rows: List of row data
        """
        for row_num, row_data in enumerate(rows, start=1):
            import_row = ImportRow(
                import_job_id=import_job_id,
                row_number=row_num,
                original_data=row_data,
                status="pending",
            )
            db.add(import_row)

        db.commit()

    def validate_import_job(self, db: Session, job_id: int, validation_func) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Validate all rows in an import job.

        Args:
            db: Database session
            job_id: ImportJob ID
            validation_func: Function to validate row data

        Returns:
            Tuple[is_valid, errors]
        """
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            raise ValueError(f"ImportJob {job_id} not found")

        rows = db.query(ImportRow).filter(ImportRow.import_job_id == job_id).all()
        row_data = [row.original_data for row in rows]

        is_valid, errors = validation_func(row_data)

        # Update row status
        for error_info in errors:
            row_num = error_info["row"]
            row = next((r for r in rows if r.row_number == row_num), None)
            if row:
                row.status = "error"
                row.error_messages = error_info["errors"]

        # Mark valid rows
        for row in rows:
            if row.status == "pending":
                row.status = "valid"

        # Update job status
        job.failed_rows = len(errors)
        job.successful_rows = len(rows) - len(errors)
        job.status = "validated" if is_valid else "failed"
        job.validation_errors = {str(e["row"]): e["errors"] for e in errors}

        db.commit()

        return is_valid, errors

    def commit_import(self, db: Session, job_id: int) -> bool:
        """
        Finalize an import job by writing data to database.

        Args:
            db: Database session
            job_id: ImportJob ID

        Returns:
            Success status
        """
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            raise ValueError(f"ImportJob {job_id} not found")

        if job.status != "validated":
            raise ValueError(f"Import job {job_id} is not in validated state")

        rows = db.query(ImportRow).filter(ImportRow.import_job_id == job_id, ImportRow.status == "valid").all()

        try:
            for row in rows:
                # TODO: Implement actual import logic based on import_type
                row.status = "committed"
                row.target_id = None  # Set to actual created record ID

            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            db.commit()

            # Log success
            self._log_history(db, "import", job.import_type, "completed", job.imported_by, job.id)
            return True

        except Exception as e:
            db.rollback()
            job.status = "failed"
            logger.error(f"Import failed for job {job_id}: {str(e)}")
            self._log_history(db, "import", job.import_type, "failed", job.imported_by, job.id, {"error": str(e)})
            return False

    def rollback_import(self, db: Session, job_id: int) -> bool:
        """
        Rollback a completed import.

        Args:
            db: Database session
            job_id: ImportJob ID

        Returns:
            Success status
        """
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            raise ValueError(f"ImportJob {job_id} not found")

        if job.status != "completed":
            raise ValueError(f"Cannot rollback import job {job_id} in {job.status} state")

        try:
            rows = db.query(ImportRow).filter(ImportRow.import_job_id == job_id, ImportRow.status == "committed").all()

            # TODO: Implement actual rollback logic (delete created records)
            for row in rows:
                row.status = "rolled_back"

            job.status = "rolled_back"
            db.commit()

            # Log rollback
            self._log_history(db, "import", job.import_type, "rolled_back", job.imported_by, job.id)
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Rollback failed for job {job_id}: {str(e)}")
            return False

    # ========== EXPORT METHODS ==========

    def create_export_job(
        self,
        db: Session,
        export_type: str,
        file_format: str,
        filters: Optional[Dict[str, Any]],
        user_id: Optional[int],
    ) -> ExportJob:
        """
        Create a new export job.

        Args:
            db: Database session
            export_type: Type of export (students, courses, grades, etc.)
            file_format: File format (csv, xlsx, pdf)
            filters: Optional filtering criteria
            user_id: User creating the export

        Returns:
            Created ExportJob instance
        """
        job = ExportJob(
            export_type=export_type,
            file_format=file_format,
            status="pending",
            total_records=0,
            filters=filters,
            created_by=user_id,
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Log in history
        self._log_history(db, "export", export_type, "started", user_id, int(job.id))

        return job

    def generate_students_export(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> BytesIO:
        """
        Generate student export data.

        Args:
            db: Database session
            filters: Optional filtering criteria

        Returns:
            BytesIO object with export data
        """
        query = db.query(Student).filter(Student.deleted_at.is_(None))

        # Apply filters
        if filters:
            if filters.get("is_active") is not None:
                query = query.filter(Student.is_active == filters["is_active"])

        # TODO: Implement CSV/Excel/PDF generation
        return BytesIO(b"placeholder")

    def generate_courses_export(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> BytesIO:
        """Generate course export data."""
        return BytesIO(b"placeholder")

    def generate_grades_export(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> BytesIO:
        """Generate grade export data."""
        return BytesIO(b"placeholder")

    # ========== HISTORY & AUDIT METHODS ==========

    def _log_history(
        self,
        db: Session,
        operation_type: str,
        resource_type: str,
        action: str,
        user_id: Optional[int],
        job_id: Optional[int],
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log import/export operation to history.

        Args:
            db: Database session
            operation_type: 'import' or 'export'
            resource_type: 'students', 'courses', 'grades', etc.
            action: 'started', 'completed', 'failed', 'rolled_back'
            user_id: User performing operation
            job_id: Associated job ID
            details: Additional details
        """
        history = ImportExportHistory(
            operation_type=operation_type,
            resource_type=resource_type,
            user_id=user_id,
            job_id=job_id,
            action=action,
            details=details or {},
        )
        db.add(history)
        db.commit()

    def get_history(
        self,
        db: Session,
        operation_type: Optional[str] = None,
        resource_type: Optional[str] = None,
        user_id: Optional[int] = None,
        limit: int = 50,
    ) -> List[ImportExportHistory]:
        """
        Retrieve import/export history.

        Args:
            db: Database session
            operation_type: Filter by operation type
            resource_type: Filter by resource type
            user_id: Filter by user
            limit: Max results

        Returns:
            List of history entries
        """
        query = db.query(ImportExportHistory)

        if operation_type:
            query = query.filter(ImportExportHistory.operation_type == operation_type)
        if resource_type:
            query = query.filter(ImportExportHistory.resource_type == resource_type)
        if user_id:
            query = query.filter(ImportExportHistory.user_id == user_id)

        return query.order_by(ImportExportHistory.timestamp.desc()).limit(limit).all()
