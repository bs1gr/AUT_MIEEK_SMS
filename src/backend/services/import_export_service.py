import shutil
import logging
from datetime import date, datetime, UTC
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

# Ensure directories exist. Loading this module must not fail when they cannot be made (a
# working directory that cannot be written to): the router that imports it would not load,
# and every endpoint in it would answer 404. An import or export then fails and says why.
for _folder in (UPLOAD_DIR, EXPORT_DIR):
    try:
        _folder.mkdir(parents=True, exist_ok=True)
    except OSError as _exc:
        logger.warning("Could not create %s: %s", _folder, _exc)


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
        """Background task: read the uploaded file and say what is wrong with it.

        A file without a fault ends as "ready" and can be committed. One with faults ends as
        "invalid" and cannot: until November 2026 it was "ready" all the same, so the check
        stopped nothing.
        """
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
            job.status = "ready" if validation_results["invalid_count"] == 0 else "invalid"  # type: ignore[assignment]

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
            db.rollback()
            job.status = "failed"  # type: ignore[assignment]
            job.validation_errors = {"system_error": str(e)}  # type: ignore[assignment]
            db.commit()

    def commit_import_job(self, db: Session, job_id: int):
        """Execute the import job (write to DB): all of the file, or nothing of it.

        Only a job that was checked and found without a fault. When a row cannot be stored the
        rows before it are taken back; they used to stay, with the job marked "failed".
        """
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            return
        if str(job.status) not in ("ready", "importing"):
            return

        try:
            job.status = "importing"  # type: ignore[assignment]
            db.commit()

            # Parse file again (or retrieve from cache if we implemented caching)
            df = self._parse_file(str(job.file_path), str(job.file_type))

            counts = {"created": 0, "updated": 0}
            if str(job.import_type) == "students":
                counts = self._import_students(db, df)
            elif str(job.import_type) == "courses":
                counts = self._import_courses(db, df)
            elif str(job.import_type) == "grades":
                counts = self._import_grades(db, df)

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
                {"count": counts["created"] + counts["updated"], **counts},
            )

        except Exception as e:
            logger.error(f"Import commit failed: {e}")
            db.rollback()
            job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
            if job:
                job.status = "failed"  # type: ignore[assignment]
                job.validation_errors = {"commit_error": str(e)}  # type: ignore[assignment]
                db.commit()

    @staticmethod
    def _cell(row: Any, name: str) -> Optional[str]:
        """A cell as text, None when it is empty. A number that Excel made of an ID ("12345.0")
        is the ID again."""
        if name not in row:
            return None
        value = row[name]
        if value is None or (not isinstance(value, str) and pd.isna(value)):
            return None
        if isinstance(value, float) and value.is_integer():
            value = int(value)
        text = str(value).strip()
        return text or None

    @staticmethod
    def _grade_day(text: Optional[str]) -> Optional[date]:
        """A grade row's own date (column date_submitted, for an exam the day it was taken):
        YYYY-MM-DD, or the date and time Excel gives a date cell. None without one; ValueError
        for anything else."""
        return None if text is None else date.fromisoformat(text.strip()[:10])

    @staticmethod
    def _is_retake(text: Optional[str]) -> bool:
        """Column is_retake (plan todo 80): yes, true, 1 or «ναι» marks the Midterm or Final Exam
        grade that replaces the earlier sitting; empty or anything else, no."""
        return str(text or "").strip().lower() in {"true", "1", "yes", "y", "ναι"}

    def _import_students(self, db: Session, df: pd.DataFrame) -> Dict[str, int]:
        """With the rule of Utils > Imports: a student is the one with that student ID or that
        e-mail address; one that is there is updated, a deleted one comes back."""
        from backend.services.import_service import ImportService

        counts = {"created": 0, "updated": 0}
        for index, row in df.iterrows():
            data = {
                name: self._cell(row, name)
                for name in ("student_id", "first_name", "last_name", "email", "study_year", "father_name", "phone")
            }
            data = {name: value for name, value in data.items() if value is not None}
            created, error = ImportService.create_or_update_student(db, data)
            if error:
                raise ValueError(f"Row {int(index) + 2}: {error}")
            counts["created" if created else "updated"] += 1
            db.flush()
        return counts

    def _import_courses(self, db: Session, df: pd.DataFrame) -> Dict[str, int]:
        from backend.services.import_service import ImportService

        counts = {"created": 0, "updated": 0}
        for index, row in df.iterrows():
            data: Dict[str, Any] = {
                name: self._cell(row, name) for name in ("course_code", "course_name", "semester", "description")
            }
            data = {name: value for name, value in data.items() if value is not None}
            credits = self._cell(row, "credits")
            if credits is not None:
                data["credits"] = int(float(credits))
            created, error = ImportService.create_or_update_course(db, data)
            if error:
                raise ValueError(f"Row {int(index) + 2}: {error}")
            counts["created" if created else "updated"] += 1
            db.flush()
        return counts

    def _student_of(self, db: Session, row: Any) -> Optional[Student]:
        """The student a grade row is for: by student ID, else by e-mail address. Not a deleted one."""
        student_id, email = self._cell(row, "student_id"), self._cell(row, "email")
        student = None
        if student_id:
            student = (
                db.query(Student).filter(Student.student_id == student_id, Student.deleted_at.is_(None)).first()
            )
        if student is None and email:
            student = db.query(Student).filter(Student.email == email, Student.deleted_at.is_(None)).first()
        return student

    def _course_of(self, db: Session, row: Any) -> Optional[Course]:
        code = self._cell(row, "course_code")
        if not code:
            return None
        return db.query(Course).filter(Course.course_code == code, Course.deleted_at.is_(None)).first()

    def _import_grades(self, db: Session, df: pd.DataFrame) -> Dict[str, int]:
        counts = {"created": 0, "updated": 0}
        for index, row in df.iterrows():
            student, course = self._student_of(db, row), self._course_of(db, row)
            if student is None or course is None:
                raise ValueError(f"Row {int(index) + 2}: the student or the course is not there")

            assignment_name = self._cell(row, "assignment") or "Imported Grade"
            category = self._cell(row, "category") or "General"
            grade_val = float(row.get("grade"))
            max_grade = float(self._cell(row, "max_grade") or 100)
            weight = float(self._cell(row, "weight") or 1.0)
            # Plan todo 80: an exam's row can give the day it was taken and whether it is the
            # retake that replaces the earlier sitting (checked in _validate_data).
            own_day = self._grade_day(self._cell(row, "date_submitted"))
            is_retake = self._is_retake(self._cell(row, "is_retake"))
            if is_retake:
                from backend.services.grade_service import GradeService

                if not GradeService.is_exam_category(category):
                    raise ValueError(f"Row {int(index) + 2}: only a Midterm or Final Exam grade can be a retake")

            # The grade this row stands for: the same student, course, assignment name and
            # category, and not a deleted one. The same assignment is kept under two categories
            # on purpose, so the name alone does not say which grade is meant (as in the
            # session import, routers_sessions._import_grades). A retake usually has the name
            # and category of the sitting it replaces, so the mark belongs to it too.
            grade = (
                db.query(Grade)
                .filter(
                    Grade.student_id == student.id,
                    Grade.course_id == course.id,
                    Grade.assignment_name == assignment_name,
                    Grade.category == category,
                    Grade.is_retake.is_(True) if is_retake else Grade.is_retake.is_(False),
                    Grade.deleted_at.is_(None),
                )
                .order_by(Grade.id)
                .first()
            )

            if grade:
                grade.grade = grade_val  # type: ignore[assignment]
                grade.max_grade = max_grade  # type: ignore[assignment]
                grade.weight = weight  # type: ignore[assignment]
                if own_day is not None:  # a grade that is there keeps its date unless the row has one
                    grade.date_submitted = own_day  # type: ignore[assignment]
                counts["updated"] += 1
            else:
                grade = Grade(
                    student_id=student.id,
                    course_id=course.id,
                    assignment_name=assignment_name,
                    category=category,
                    grade=grade_val,
                    max_grade=max_grade,
                    weight=weight,
                    date_submitted=own_day or datetime.now(UTC),
                    is_retake=is_retake,
                )
                db.add(grade)
                counts["created"] += 1
            db.flush()
        return counts

    def _parse_file(self, file_path: str, file_type: str) -> pd.DataFrame:
        """Parse CSV or Excel file into DataFrame."""
        if file_type == "csv":
            return pd.read_csv(file_path)
        elif file_type in ["xlsx", "xls"]:
            return pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def _validate_data(self, df: pd.DataFrame, import_type: str, db: Session) -> Dict[str, Any]:
        """What is wrong with the file, row by row (the first data row is row 2, as a
        spreadsheet shows it)."""
        errors: Dict[str, Any] = {}
        valid_count = 0
        invalid_count = 0

        required_columns = {
            "students": ["student_id", "first_name", "last_name", "email"],
            "courses": ["course_code", "course_name"],
            "grades": ["student_id", "course_code", "grade"],
        }
        req_cols = required_columns.get(import_type, [])

        missing_cols = [col for col in req_cols if col not in df.columns]
        if missing_cols:
            return {
                "valid_count": 0,
                "invalid_count": len(df),
                "errors": {"global": f"Missing required columns: {', '.join(missing_cols)}"},
            }

        seen: Dict[str, int] = {}
        for index, row in df.iterrows():
            row_number = int(index) + 2
            row_errors: List[str] = []

            for col in req_cols:
                if self._cell(row, col) is None:
                    row_errors.append(f"Missing {col}")

            if import_type == "students":
                email = self._cell(row, "email")
                if email is not None and "@" not in email:
                    row_errors.append("Invalid email format")
                key = self._cell(row, "student_id")
            elif import_type == "courses":
                credits = self._cell(row, "credits")
                if credits is not None:
                    try:
                        int(float(credits))
                    except ValueError:
                        row_errors.append("credits is not a number")
                key = self._cell(row, "course_code")
            else:
                key = None
                if self._cell(row, "student_id") is not None and self._student_of(db, row) is None:
                    row_errors.append("No student with this student ID")
                if self._cell(row, "course_code") is not None and self._course_of(db, row) is None:
                    row_errors.append("No course with this course code")
                for column in ("grade", "max_grade", "weight"):
                    text = self._cell(row, column)
                    if text is None:
                        continue
                    try:
                        float(text)
                    except ValueError:
                        row_errors.append(f"{column} is not a number")
                try:
                    self._grade_day(self._cell(row, "date_submitted"))
                except ValueError:
                    row_errors.append("date_submitted is not a date (YYYY-MM-DD)")
                if self._is_retake(self._cell(row, "is_retake")):
                    from backend.services.grade_service import GradeService

                    if not GradeService.is_exam_category(self._cell(row, "category")):
                        row_errors.append("is_retake: only a Midterm or Final Exam grade can be a retake")

            # The same student or course twice in one file: which row is to count?
            if key is not None:
                if key in seen:
                    row_errors.append(f"The same {req_cols[0]} as row {seen[key]}")
                else:
                    seen[key] = row_number

            if row_errors:
                errors[str(row_number)] = row_errors
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
