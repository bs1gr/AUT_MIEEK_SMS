import shutil
import logging
from datetime import datetime, UTC
from typing import Optional, Dict, Any, List
from pathlib import Path

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.orm import Session

from backend.models import ImportJob, ExportJob, ImportExportHistory, Student, Course, Grade
# Assuming these models exist or will be created. If not, we use generic approach.
# For now, we'll implement the logic assuming standard SQLAlchemy models.

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("data/imports")
EXPORT_DIR = Path("data/exports")

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


class ImportExportService:
    def __init__(self):
        pass

    def create_import_job(
        self,
        db: Session,
        file_name: str,
        file_type: str,
        import_type: str,
        total_rows: int,
        user_id: Optional[int],
        file_object: UploadFile,
    ) -> ImportJob:
        """Create a new import job and save the uploaded file."""

        # Create job record
        job = ImportJob(
            file_name=file_name,
            file_type=file_type,
            import_type=import_type,
            status="pending",
            total_rows=total_rows,
            imported_by=user_id,
            created_at=datetime.now(UTC),
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Save file
        file_path = UPLOAD_DIR / f"{job.id}_{file_name}"
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file_object.file, buffer)

            job.file_path = str(file_path)  # type: ignore
            db.commit()
        except Exception as e:
            logger.error(f"Failed to save import file: {e}")
            job.status = "failed"  # type: ignore
            job.validation_errors = {"error": f"File save failed: {str(e)}"}  # type: ignore
            db.commit()
            raise e

        return job

    def process_import_job(self, db: Session, job_id: int):
        """Background task to process the import file."""
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            return

        try:
            job.status = "validating"  # type: ignore[assignment]
            db.commit()

            # Parse file
            df = self._parse_file(str(job.file_path), str(job.file_type))
            job.total_rows = len(df)  # type: ignore[assignment]

            # Validate data
            validation_results = self._validate_data(df, str(job.import_type), db)

            job.successful_rows = validation_results["valid_count"]  # type: ignore[assignment]
            job.failed_rows = validation_results["invalid_count"]  # type: ignore[assignment]
            job.validation_errors = validation_results["errors"]  # type: ignore[assignment]

            if validation_results["invalid_count"] == 0:
                job.status = "ready"  # type: ignore[assignment]  # Ready for commit
            else:
                # For now, we mark as ready even with errors, but UI should warn
                # Or we could mark as 'review_required'
                job.status = "ready"  # type: ignore[assignment]

            db.commit()

            # Log history
            self._log_history(
                db,
                "import",
                str(job.import_type),
                "validate",
                int(job.imported_by) if job.imported_by is not None else None,
                int(job.id) if job.id else 0,
                {
                    "total": int(job.total_rows) if job.total_rows else 0,
                    "valid": int(job.successful_rows) if job.successful_rows else 0,
                },
            )

        except Exception as e:
            logger.error(f"Import processing failed: {e}")
            job.status = "failed"  # type: ignore[assignment]
            job.validation_errors = {"system_error": str(e)}  # type: ignore[assignment]
            db.commit()

    def commit_import_job(self, db: Session, job_id: int):
        """Execute the import job (write to DB)."""
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            return

        try:
            job.status = "importing"  # type: ignore[assignment]
            db.commit()

            # Parse file again (or retrieve from cache if we implemented caching)
            df = self._parse_file(str(job.file_path), str(job.file_type))

            if str(job.import_type) == "students":
                self._import_students(db, df)
            elif str(job.import_type) == "courses":
                self._import_courses(db, df)
            elif str(job.import_type) == "grades":
                self._import_grades(db, df)

            job.status = "completed"  # type: ignore[assignment]
            job.completed_at = datetime.now(UTC)  # type: ignore[assignment]
            db.commit()

            self._log_history(
                db,
                "import",
                str(job.import_type),
                "commit",
                int(job.imported_by) if job.imported_by is not None else None,
                int(job.id) if job.id else 0,
                {"count": int(job.successful_rows) if job.successful_rows else 0},
            )

        except Exception as e:
            logger.error(f"Import commit failed: {e}")
            job.status = "failed"  # type: ignore[assignment]
            job.validation_errors = {"commit_error": str(e)}  # type: ignore[assignment]
            db.commit()

    def _import_students(self, db: Session, df: pd.DataFrame):
        for _, row in df.iterrows():
            email = row.get("email")
            if not email or pd.isna(email):
                continue

            student = db.query(Student).filter(Student.email == email).first()
            if not student:
                student = Student(
                    first_name=row.get("first_name"),
                    last_name=row.get("last_name"),
                    email=email,
                    student_id=row.get("student_id", f"S{datetime.now().timestamp()}"),
                    enrollment_date=datetime.now(UTC),
                )
                db.add(student)
        db.flush()

    def _import_courses(self, db: Session, df: pd.DataFrame):
        for _, row in df.iterrows():
            code = row.get("course_code")
            if not code or pd.isna(code):
                continue

            course = db.query(Course).filter(Course.course_code == code).first()
            if not course:
                course = Course(course_code=code, course_name=row.get("course_name"))
                db.add(course)
        db.flush()

    def _import_grades(self, db: Session, df: pd.DataFrame):
        for _, row in df.iterrows():
            # Try to find student by ID or Email
            student = None
            if "student_id" in row and pd.notna(row["student_id"]):
                student = db.query(Student).filter(Student.student_id == str(row["student_id"])).first()
            if not student and "email" in row and pd.notna(row["email"]):
                student = db.query(Student).filter(Student.email == str(row["email"])).first()

            if not student:
                continue

            # Try to find course by Code
            course = None
            if "course_code" in row and pd.notna(row["course_code"]):
                course = db.query(Course).filter(Course.course_code == str(row["course_code"])).first()

            if not course:
                continue

            # Prepare grade data
            assignment_name = row.get("assignment", "Imported Grade")
            category = row.get("category", "General")
            try:
                grade_val = float(row.get("grade", 0))
                max_grade = float(row.get("max_grade", 100))
                weight = float(row.get("weight", 1.0))
            except (ValueError, TypeError):
                continue

            # Check if grade exists
            grade = (
                db.query(Grade)
                .filter(
                    Grade.student_id == student.id,
                    Grade.course_id == course.id,
                    Grade.assignment_name == assignment_name,
                )
                .first()
            )

            if grade:
                grade.grade = grade_val  # type: ignore[assignment]
                grade.max_grade = max_grade  # type: ignore[assignment]
                grade.weight = weight  # type: ignore[assignment]
                grade.category = category  # type: ignore[assignment]
            else:
                grade = Grade(
                    student_id=student.id,
                    course_id=course.id,
                    assignment_name=assignment_name,
                    category=category,
                    grade=grade_val,
                    max_grade=max_grade,
                    weight=weight,
                    date_submitted=datetime.now(UTC),
                )
                db.add(grade)
        db.flush()

    def _parse_file(self, file_path: str, file_type: str) -> pd.DataFrame:
        """Parse CSV or Excel file into DataFrame."""
        if file_type == "csv":
            return pd.read_csv(file_path)
        elif file_type in ["xlsx", "xls"]:
            return pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def _validate_data(self, df: pd.DataFrame, import_type: str, db: Session) -> Dict[str, Any]:
        """Validate data based on import type."""
        errors = {}
        valid_count = 0
        invalid_count = 0

        # Basic required columns mapping
        required_columns = {
            "students": ["first_name", "last_name", "email"],
            "courses": ["course_code", "course_name"],
            "grades": ["student_id", "course_code", "grade"],
        }

        req_cols = required_columns.get(import_type, [])

        # Check missing columns
        missing_cols = [col for col in req_cols if col not in df.columns]
        if missing_cols:
            return {
                "valid_count": 0,
                "invalid_count": len(df),
                "errors": {"global": f"Missing required columns: {', '.join(missing_cols)}"},
            }

        # Row-by-row validation (simplified for MVP)
        # In a real scenario, we would do bulk validation or more complex checks
        for index, row in df.iterrows():
            row_errors = []

            # Generic checks
            for col in req_cols:
                if pd.isna(row[col]) or str(row[col]).strip() == "":
                    row_errors.append(f"Missing {col}")

            # Specific checks
            if import_type == "students":
                if "email" in row and "@" not in str(row["email"]):
                    row_errors.append("Invalid email format")

            if row_errors:
                errors[index] = row_errors
                invalid_count += 1
            else:
                valid_count += 1

        return {"valid_count": valid_count, "invalid_count": invalid_count, "errors": errors if errors else None}

    def create_export_job(
        self, db: Session, export_type: str, file_format: str, filters: Optional[Dict[str, Any]], user_id: Optional[int]
    ) -> ExportJob:
        """Create a new export job."""
        job = ExportJob(
            export_type=export_type,
            file_format=file_format,
            status="pending",
            filters=filters,
            created_by=user_id,
            created_at=datetime.now(UTC),
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def process_export_job(self, db: Session, job_id: int):
        """Background task to generate export file."""
        job = db.query(ExportJob).filter(ExportJob.id == job_id).first()
        if not job:
            return

        try:
            job.status = "processing"  # type: ignore[assignment]
            db.commit()

            # Fetch data
            data = self._fetch_export_data(db, str(job.export_type), job.filters)  # type: ignore
            job.total_records = len(data)  # type: ignore[assignment]

            # Generate file
            filename = f"export_{job.export_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{job.file_format}"
            file_path = EXPORT_DIR / filename

            self._write_export_file(data, file_path, str(job.file_format))

            job.file_path = str(file_path)  # type: ignore[assignment]
            job.status = "completed"  # type: ignore[assignment]
            job.completed_at = datetime.now(UTC)  # type: ignore[assignment]

            db.commit()

            self._log_history(
                db,
                "export",
                str(job.export_type),
                "generate",
                int(job.created_by) if job.created_by is not None else None,
                int(job.id) if job.id else 0,
                {"count": int(job.total_records) if job.total_records else 0, "format": str(job.file_format)},
            )

        except Exception as e:
            logger.error(f"Export processing failed: {e}")
            job.status = "failed"  # type: ignore[assignment]
            db.commit()

    def _fetch_export_data(self, db: Session, export_type: str, filters: Optional[Dict]) -> List[Dict]:
        """Fetch data for export based on type and filters."""
        # Simplified fetching logic
        if export_type == "students":
            query = db.query(Student)
            # Apply filters if needed
            students = query.all()
            return [
                {
                    "id": s.id,
                    "student_id": s.student_id,
                    "first_name": s.first_name,
                    "last_name": s.last_name,
                    "email": s.email,
                    "enrollment_date": s.enrollment_date,
                }
                for s in students
            ]
        elif export_type == "courses":
            courses = db.query(Course).all()
            return [{"id": c.id, "code": c.course_code, "name": c.course_name, "credits": c.credits} for c in courses]
        elif export_type == "grades":
            grades = db.query(Grade).all()
            return [
                {"id": g.id, "student_id": g.student_id, "course_id": g.course_id, "grade": g.grade} for g in grades
            ]
        return []

    def _write_export_file(self, data: List[Dict], file_path: Path, file_format: str):
        """Write data to file."""
        df = pd.DataFrame(data)

        if file_format == "csv":
            df.to_csv(file_path, index=False)
        elif file_format == "xlsx":
            df.to_excel(file_path, index=False)
        elif file_format == "pdf":
            # Basic PDF generation using matplotlib/pandas or reportlab
            # For simplicity in this MVP, we might fallback to CSV or implement basic PDF
            # Here we'll just raise or do a simple dump if libraries allow
            try:
                # Requires matplotlib/jinja2 usually
                # df.to_html() -> pdfkit could be an option
                # For now, treat as error or fallback
                raise NotImplementedError("PDF export requires additional libraries")
            except Exception:
                # Fallback to CSV with .pdf extension is bad practice, so we fail
                raise ValueError("PDF export not fully implemented in this version")
        else:
            raise ValueError(f"Unsupported format: {file_format}")

    def get_history(
        self,
        db: Session,
        operation_type: Optional[str],
        resource_type: Optional[str],
        user_id: Optional[int],
        limit: int = 50,
    ) -> List[ImportExportHistory]:
        """Retrieve history records."""
        query = db.query(ImportExportHistory)

        if operation_type:
            query = query.filter(ImportExportHistory.operation_type == operation_type)
        if resource_type:
            query = query.filter(ImportExportHistory.resource_type == resource_type)
        if user_id:
            query = query.filter(ImportExportHistory.user_id == user_id)

        return query.order_by(ImportExportHistory.timestamp.desc()).limit(limit).all()

    def _log_history(
        self, db: Session, op_type: str, res_type: str, action: str, user_id: Optional[int], job_id: int, details: Dict
    ):
        """Create a history entry."""
        entry = ImportExportHistory(
            operation_type=op_type,
            resource_type=res_type,
            action=action,
            user_id=user_id,
            job_id=job_id,
            details=details,
            timestamp=datetime.now(UTC),
        )
        db.add(entry)
        db.commit()

    def cleanup_old_export_jobs(self, db: Session, days_old: int = 30, delete_files: bool = True) -> Dict[str, Any]:
        """Clean up old completed/failed export jobs.

        Args:
            db: Database session
            days_old: Delete jobs older than this many days (default: 30)
            delete_files: Whether to delete associated files (default: True)

        Returns:
            Dictionary with cleanup statistics
        """
        from datetime import timedelta

        cutoff_date = datetime.now(UTC) - timedelta(days=days_old)

        # Find old completed or failed jobs
        old_jobs = (
            db.query(ExportJob)
            .filter(
                ExportJob.status.in_(["completed", "failed"]),
                ExportJob.created_at < cutoff_date,
            )
            .all()
        )

        deleted_jobs = 0
        deleted_files = 0
        errors = []

        for job in old_jobs:
            try:
                # Delete associated file if requested
                if delete_files and job.file_path:
                    file_path = Path(job.file_path)
                    if file_path.exists():
                        file_path.unlink()
                        deleted_files += 1
                        logger.info(f"Deleted export file: {job.file_path}")

                # Delete job record
                db.delete(job)
                deleted_jobs += 1

            except Exception as e:
                error_msg = f"Failed to delete job {job.id}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)

        # Commit all deletions
        if deleted_jobs > 0:
            db.commit()
            logger.info(f"Cleanup complete: {deleted_jobs} jobs, {deleted_files} files deleted")

        return {
            "deleted_jobs": deleted_jobs,
            "deleted_files": deleted_files,
            "cutoff_date": cutoff_date.isoformat(),
            "errors": errors,
        }

    def archive_export_job(self, db: Session, job_id: int, archive_path: Optional[str] = None) -> bool:
        """Archive an export job by moving its file to archive directory.

        Args:
            db: Database session
            job_id: Export job ID to archive
            archive_path: Custom archive path (default: data/exports/archive/)

        Returns:
            True if archived successfully, False otherwise
        """
        job = db.query(ExportJob).filter(ExportJob.id == job_id).first()
        if not job or not job.file_path:
            return False

        # Set up archive directory
        if archive_path is None:
            archive_dir = EXPORT_DIR / "archive"
        else:
            archive_dir = Path(archive_path)

        archive_dir.mkdir(parents=True, exist_ok=True)

        try:
            source_file = Path(job.file_path)
            if not source_file.exists():
                logger.warning(f"Export file not found: {job.file_path}")
                return False

            # Create archive filename with timestamp
            archive_filename = f"{job.id}_{source_file.name}"
            archive_file = archive_dir / archive_filename

            # Move file to archive
            shutil.move(str(source_file), str(archive_file))

            # Update job record with new path
            job.file_path = str(archive_file)  # type: ignore[assignment]
            db.commit()

            logger.info(f"Archived export job {job_id} to {archive_file}")
            return True

        except Exception as e:
            logger.error(f"Failed to archive export job {job_id}: {str(e)}")
            db.rollback()
            return False
