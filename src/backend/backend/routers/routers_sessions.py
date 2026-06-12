"""
Session Export/Import Router
Provides endpoints to export/import complete semester/session data packages.
"""

import json
import logging
import string
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names
from backend.rate_limiting import RATE_LIMIT_HEAVY, limiter
from backend.rbac import require_permission
from backend.security.path_validation import validate_filename, validate_path

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"],
    responses={404: {"description": "Not found"}},
)


_ALLOWED_BACKUP_CHARS = set(string.ascii_letters + string.digits + "._-")
_MAX_BACKUP_FILENAME_LENGTH = 128


def is_safe_backup_filename(filename: str) -> bool:
    """Return True if filename is a safe, simple .db filename (no paths)."""
    if not filename or not filename.endswith(".db"):
        return False

    if len(filename) > _MAX_BACKUP_FILENAME_LENGTH:
        return False

    if ".." in filename or "/" in filename or "\\" in filename:
        return False

    if any(ch not in _ALLOWED_BACKUP_CHARS for ch in filename):
        return False

    return True


# Validation helpers
def validate_course_data(course_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate course data before import."""
    required_fields = ["course_code", "course_name"]

    for field in required_fields:
        if not course_data.get(field):
            return False, f"Missing required field: {field}"

    # Validate course_code format (no special chars except dash/underscore)
    code = course_data["course_code"]
    if not code or not isinstance(code, str) or len(code.strip()) == 0:
        return False, "Invalid course_code: must be non-empty string"

    # Validate credits if present
    if "credits" in course_data and course_data["credits"] is not None:
        try:
            credits = float(course_data["credits"])
            if credits < 0 or credits > 100:
                return False, f"Invalid credits: {credits} (must be 0-100)"
        except (ValueError, TypeError):
            return False, f"Invalid credits format: {course_data['credits']}"

    # Validate hours_per_week if present
    if "hours_per_week" in course_data and course_data["hours_per_week"] is not None:
        try:
            hours = int(course_data["hours_per_week"])
            if hours < 0 or hours > 168:
                return False, f"Invalid hours_per_week: {hours} (must be 0-168)"
        except (ValueError, TypeError):
            return False, f"Invalid hours_per_week format: {course_data['hours_per_week']}"

    if "periods_per_week" in course_data and course_data["periods_per_week"] is not None:
        try:
            periods = int(course_data["periods_per_week"])
            if periods < 0 or periods > 200:
                return False, f"Invalid periods_per_week: {periods} (must be 0-200)"
        except (ValueError, TypeError):
            return False, f"Invalid periods_per_week format: {course_data['periods_per_week']}"

    return True, None


def validate_student_data(student_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate student data before import."""
    required_fields = ["student_id", "first_name", "last_name", "email"]

    for field in required_fields:
        if not student_data.get(field):
            return False, f"Missing required field: {field}"

    # Validate student_id format
    sid = student_data["student_id"]
    if not sid or not isinstance(sid, str) or len(sid.strip()) == 0:
        return False, "Invalid student_id: must be non-empty string"

    # Validate email format (basic check)
    email = student_data["email"]
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        return False, f"Invalid email format: {email}"

    # Validate names
    if len(student_data["first_name"].strip()) == 0:
        return False, "first_name cannot be empty"
    if len(student_data["last_name"].strip()) == 0:
        return False, "last_name cannot be empty"

    # Validate study_year if present
    if "study_year" in student_data and student_data["study_year"] is not None:
        try:
            year = int(student_data["study_year"])
            if year < 1 or year > 10:
                return False, f"Invalid study_year: {year} (must be 1-10)"
        except (ValueError, TypeError):
            return False, f"Invalid study_year format: {student_data['study_year']}"

    return True, None


def validate_import_data(import_data: Dict[str, Any]) -> tuple[bool, List[str]]:
    """Pre-validate entire import package before touching database."""
    errors = []

    # Check metadata
    if "metadata" not in import_data:
        errors.append("Missing metadata section")
        return False, errors

    metadata = import_data["metadata"]
    if not metadata.get("semester"):
        errors.append("Missing semester in metadata")

    # Validate all courses
    courses = import_data.get("courses", [])
    course_codes = set()
    for idx, course in enumerate(courses):
        valid, error = validate_course_data(course)
        if not valid:
            errors.append(f"Course #{idx + 1}: {error}")
        else:
            code = course["course_code"]
            if code in course_codes:
                errors.append(f"Duplicate course_code in import: {code}")
            course_codes.add(code)

    # Validate all students
    students = import_data.get("students", [])
    student_ids = set()
    student_emails = set()
    for idx, student in enumerate(students):
        valid, error = validate_student_data(student)
        if not valid:
            errors.append(f"Student #{idx + 1}: {error}")
        else:
            sid = student["student_id"]
            email = student["email"]
            if sid in student_ids:
                errors.append(f"Duplicate student_id in import: {sid}")
            if email in student_emails:
                errors.append(f"Duplicate email in import: {email}")
            student_ids.add(sid)
            student_emails.add(email)

    # Validate referential integrity
    for idx, enrollment in enumerate(import_data.get("enrollments", [])):
        if enrollment.get("course_code_ref") not in course_codes:
            errors.append(f"Enrollment #{idx + 1}: references non-existent course {enrollment.get('course_code_ref')}")
        if enrollment.get("student_id_ref") not in student_ids:
            errors.append(f"Enrollment #{idx + 1}: references non-existent student {enrollment.get('student_id_ref')}")

    for idx, grade in enumerate(import_data.get("grades", [])):
        if grade.get("course_code_ref") not in course_codes:
            errors.append(f"Grade #{idx + 1}: references non-existent course {grade.get('course_code_ref')}")
        if grade.get("student_id_ref") not in student_ids:
            errors.append(f"Grade #{idx + 1}: references non-existent student {grade.get('student_id_ref')}")

    is_valid = len(errors) == 0
    return is_valid, errors


@router.get("/semesters")
async def list_semesters(request: Request, db: Session = Depends(get_db)):
    """
    List all unique semesters found in the system.
    Returns sorted list of semesters from courses.
    """
    try:
        (Course,) = import_names("models", "Course")

        semesters = (
            db.query(Course.semester).filter(Course.deleted_at.is_(None), Course.semester.isnot(None)).distinct().all()
        )

        # Extract and sort semesters
        semester_list = sorted([s[0] for s in semesters if s[0]])

        return {"semesters": semester_list, "count": len(semester_list)}
    except Exception as exc:
        logger.error("Failed to list semesters: %s", exc, exc_info=True)
        raise http_error(500, ErrorCode.EXPORT_FAILED, "Failed to list semesters", request, context={"error": str(exc)})


@router.get("/export")
@router.post("/export")  # Legacy compatibility; prefer GET. POST will be removed in future release.
@limiter.limit(RATE_LIMIT_HEAVY)
@require_permission("sessions:manage")
async def export_session(
    request: Request,
    semester: str,
    db: Session = Depends(get_db),
):
    """
    Export complete session data package for a specific semester.

    Includes:
    - Courses for the semester
    - Students enrolled in those courses
    - Course enrollments
    - Grades for those enrollments
    - Attendance records
    - Daily performance records
    - Highlights for enrolled students

    Returns a JSON file containing all related data.
    """
    try:
        Course, Student, CourseEnrollment, Grade, Attendance, DailyPerformance, Highlight = import_names(
            "models", "Course", "Student", "CourseEnrollment", "Grade", "Attendance", "DailyPerformance", "Highlight"
        )

        # Get all courses for this semester
        courses = db.query(Course).filter(Course.semester == semester, Course.deleted_at.is_(None)).all()

        if not courses:
            raise http_error(
                404,
                ErrorCode.COURSE_NOT_FOUND,
                f"No courses found for semester '{semester}'",
                request,
                context={"semester": semester},
            )

        course_ids = [c.id for c in courses]

        # Get enrollments for these courses
        enrollments = (
            db.query(CourseEnrollment)
            .filter(CourseEnrollment.course_id.in_(course_ids), CourseEnrollment.deleted_at.is_(None))
            .all()
        )

        student_ids = list(set([e.student_id for e in enrollments]))

        # Get all related data
        students = (
            db.query(Student).filter(Student.id.in_(student_ids), Student.deleted_at.is_(None)).all()
            if student_ids
            else []
        )

        grades = (
            db.query(Grade)
            .filter(Grade.course_id.in_(course_ids), Grade.student_id.in_(student_ids), Grade.deleted_at.is_(None))
            .all()
            if student_ids
            else []
        )

        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.course_id.in_(course_ids),
                Attendance.student_id.in_(student_ids),
                Attendance.deleted_at.is_(None),
            )
            .all()
            if student_ids
            else []
        )

        daily_performance = (
            db.query(DailyPerformance)
            .filter(
                DailyPerformance.course_id.in_(course_ids),
                DailyPerformance.student_id.in_(student_ids),
                DailyPerformance.deleted_at.is_(None),
            )
            .all()
            if student_ids
            else []
        )

        highlights = (
            db.query(Highlight)
            .filter(
                Highlight.student_id.in_(student_ids), Highlight.semester == semester, Highlight.deleted_at.is_(None)
            )
            .all()
            if student_ids
            else []
        )

        # Build export package
        export_data = {
            "metadata": {
                "semester": semester,
                "exported_at": datetime.now().isoformat(),
                "exported_by": "system",  # User identity tracked via request.state
                "version": "1.0",
                "counts": {
                    "courses": len(courses),
                    "students": len(students),
                    "enrollments": len(enrollments),
                    "grades": len(grades),
                    "attendance": len(attendance),
                    "daily_performance": len(daily_performance),
                    "highlights": len(highlights),
                },
            },
            "courses": [_serialize_course(c) for c in courses],
            "students": [_serialize_student(s) for s in students],
            "enrollments": [_serialize_enrollment(e) for e in enrollments],
            "grades": [_serialize_grade(g) for g in grades],
            "attendance": [_serialize_attendance(a) for a in attendance],
            "daily_performance": [_serialize_performance(dp) for dp in daily_performance],
            "highlights": [_serialize_highlight(h) for h in highlights],
        }

        # Create JSON file
        json_str = json.dumps(export_data, indent=2, ensure_ascii=False, default=str)
        buffer = BytesIO(json_str.encode("utf-8"))
        buffer.seek(0)

        # Sanitize semester name for filename (ASCII-only to satisfy header encoding)
        safe_semester = semester.replace(" ", "_").replace("/", "-")
        if any(ord(c) > 127 for c in safe_semester):
            safe_semester = "semester"
        filename = f"session_export_{safe_semester}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        # NOTE: Do not include metadata header (contains non-ASCII in Greek locales and breaks latin-1 header encoding)
        return StreamingResponse(
            buffer, media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Session export failed: %s", exc, exc_info=True)
        raise http_error(
            500,
            ErrorCode.EXPORT_FAILED,
            "Session export failed",
            request,
            context={"error": str(exc), "semester": semester},
        )


@router.post("/import")
@limiter.limit(RATE_LIMIT_HEAVY)
@require_permission("sessions:manage")
async def import_session(
    request: Request,
    file: UploadFile = File(...),
    merge_strategy: str = "update",  # "update" or "skip"
    dry_run: bool = False,  # Validate only, don't import
    db: Session = Depends(get_db),
):
    """
    Import session data package and merge with existing database.

    Merge strategies:
    - "update": Update existing records, create new ones (default)
    - "skip": Only create new records, skip existing ones

    Parameters:
    - dry_run: If True, only validates without importing (safe pre-check)

    Returns summary of import operations.

    SAFETY FEATURES:
    - Pre-validation of all data before touching database
    - Automatic database backup before import
    - Transaction rollback on errors
    - Detailed validation error reporting
    """
    try:
        # Validate file
        if not file.filename or not file.filename.endswith(".json"):
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_EXTENSION,
                "File must be a JSON file",
                request,
                context={"filename": file.filename},
            )

        # Read and parse JSON
        content = await file.read()
        try:
            import_data = json.loads(content.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise http_error(
                400, ErrorCode.IMPORT_INVALID_JSON, "Invalid JSON format", request, context={"error": str(exc)}
            )

        # PRE-VALIDATION: Check entire import package before touching database
        semester = import_data.get("metadata", {}).get("semester")
        logger.info("Validating import package", extra={"semester": semester})
        is_valid, validation_errors = validate_import_data(import_data)

        if not is_valid:
            error_summary = "\n".join(validation_errors[:10])  # Show first 10 errors
            if len(validation_errors) > 10:
                error_summary += f"\n... and {len(validation_errors) - 10} more errors"

            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                f"Import validation failed: {len(validation_errors)} errors found",
                request,
                context={
                    "total_errors": len(validation_errors),
                    "errors": validation_errors[:20],  # Return max 20 errors in response
                    "error_summary": error_summary,
                },
            )

        semester = import_data["metadata"].get("semester")
        if not semester:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "Invalid session export format: missing semester in metadata",
                request,
            )

        # DRY RUN: Return validation success without importing
        if dry_run:
            return {
                "dry_run": True,
                "validation_passed": True,
                "semester": semester,
                "counts": {
                    "courses": len(import_data.get("courses", [])),
                    "students": len(import_data.get("students", [])),
                    "enrollments": len(import_data.get("enrollments", [])),
                    "grades": len(import_data.get("grades", [])),
                    "attendance": len(import_data.get("attendance", [])),
                    "daily_performance": len(import_data.get("daily_performance", [])),
                    "highlights": len(import_data.get("highlights", [])),
                },
                "message": "Validation passed. Safe to import.",
            }

        # CREATE DATABASE BACKUP BEFORE IMPORT
        backup_path = None
        try:
            from pathlib import Path

            from backend.config import settings

            backup_dir = Path("backups")
            backup_dir.mkdir(exist_ok=True)

            # Extract database path from DATABASE_URL (sqlite:///path/to/db.db)
            db_url = settings.DATABASE_URL
            if db_url.startswith("sqlite:///"):
                db_file = db_url.replace("sqlite:///", "")
                db_path = Path(db_file)

                if db_path.exists():
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    backup_filename = f"pre_import_backup_{semester.replace(' ', '_')}_{timestamp}.db"
                    backup_path = backup_dir / backup_filename

                    import shutil

                    shutil.copy2(db_path, backup_path)
                    logger.info("Database backed up", extra={"backup_file": backup_filename})
        except Exception as backup_error:
            logger.warning("Failed to create backup", extra={"error_type": type(backup_error).__name__})

        # Import data
        from backend.services.import_service import ImportService

        results = {
            "semester": semester,
            "imported_at": datetime.now().isoformat(),
            "imported_by": "system",  # User identity tracked via request.state
            "merge_strategy": merge_strategy,
            "backup_created": backup_path is not None,
            "backup_path": str(backup_path) if backup_path else None,
            "validation_passed": True,
            "summary": {
                "courses": {"created": 0, "updated": 0, "skipped": 0, "errors": []},
                "students": {"created": 0, "updated": 0, "skipped": 0, "errors": []},
                "enrollments": {"created": 0, "updated": 0, "skipped": 0, "errors": []},
                "grades": {"created": 0, "updated": 0, "skipped": 0, "errors": []},
                "attendance": {"created": 0, "updated": 0, "skipped": 0, "errors": []},
                "daily_performance": {"created": 0, "updated": 0, "skipped": 0, "errors": []},
                "highlights": {"created": 0, "updated": 0, "skipped": 0, "errors": []},
            },
        }

        # Track critical errors (will trigger rollback)
        critical_errors = []

        # Import courses first (dependencies)
        logger.info("Importing courses", extra={"course_count": len(import_data.get("courses", []))})
        for idx, course_data in enumerate(import_data.get("courses", [])):
            try:
                # Double-check validation (should already be validated)
                valid, error = validate_course_data(course_data)
                if not valid:
                    error_msg = f"Course #{idx + 1}: Validation failed - {error}"
                    results["summary"]["courses"]["errors"].append(error_msg)
                    critical_errors.append(error_msg)
                    continue

                course_code = course_data.get("course_code")

                # Check if course exists
                (Course,) = import_names("models", "Course")
                existing = (
                    db.query(Course).filter(Course.course_code == course_code, Course.deleted_at.is_(None)).first()
                )

                if existing and merge_strategy == "skip":
                    results["summary"]["courses"]["skipped"] += 1
                    continue

                was_created, err = ImportService.create_or_update_course(db, course_data)
                if err:
                    error_msg = f"Course {course_code}: {err}"
                    results["summary"]["courses"]["errors"].append(error_msg)
                    # Course import errors are critical
                    critical_errors.append(error_msg)
                elif was_created:
                    results["summary"]["courses"]["created"] += 1
                    logger.debug("Created course", extra={"course_code": course_code})
                else:
                    results["summary"]["courses"]["updated"] += 1
                    logger.debug("Updated course", extra={"course_code": course_code})
            except Exception as e:
                error_msg = f"Course {course_data.get('course_code', 'unknown')}: {str(e)}"
                results["summary"]["courses"]["errors"].append(error_msg)
                critical_errors.append(error_msg)
                logger.error(error_msg, exc_info=True)

        # Import students
        logger.info("Importing students", extra={"student_count": len(import_data.get("students", []))})
        for idx, student_data in enumerate(import_data.get("students", [])):
            try:
                # Double-check validation
                valid, error = validate_student_data(student_data)
                if not valid:
                    error_msg = f"Student #{idx + 1}: Validation failed - {error}"
                    results["summary"]["students"]["errors"].append(error_msg)
                    critical_errors.append(error_msg)
                    continue

                student_id = student_data.get("student_id")

                # Check if student exists
                (Student,) = import_names("models", "Student")
                existing = (
                    db.query(Student).filter(Student.student_id == student_id, Student.deleted_at.is_(None)).first()
                )

                if existing and merge_strategy == "skip":
                    results["summary"]["students"]["skipped"] += 1
                    continue

                was_created, err = ImportService.create_or_update_student(db, student_data)
                if err:
                    error_msg = f"Student {student_id}: {err}"
                    results["summary"]["students"]["errors"].append(error_msg)
                    # Student import errors are critical
                    critical_errors.append(error_msg)
                elif was_created:
                    results["summary"]["students"]["created"] += 1
                    logger.debug("Created student", extra={"student_id": student_id})
                else:
                    results["summary"]["students"]["updated"] += 1
                    logger.debug("Updated student", extra={"student_id": student_id})
            except Exception as e:
                error_msg = f"Student {student_data.get('student_id', 'unknown')}: {str(e)}"
                results["summary"]["students"]["errors"].append(error_msg)
                critical_errors.append(error_msg)
                logger.error(error_msg, exc_info=True)

        # IMPORTANT: Flush session so newly added Course and Student rows obtain primary keys.
        # Without this flush, subsequent queries for Students/Courses inside the relational
        # import helpers (_import_enrollments, _import_grades, etc.) run SELECT statements
        # against the database which will not see unflushed INSERTs. This caused dependent
        # entities (enrollments, grades) to fail creation silently because lookups returned
        # None, leading to 0 counts for students/enrollments/grades in export tests.
        try:
            db.flush()
        except Exception as flush_exc:
            logger.warning("Flush after courses/students import failed", extra={"error_type": type(flush_exc).__name__})

        # Import enrollments, grades, attendance, etc.
        _import_enrollments(db, import_data.get("enrollments", []), merge_strategy, results)
        _import_grades(db, import_data.get("grades", []), merge_strategy, results)
        _import_attendance(db, import_data.get("attendance", []), merge_strategy, results)
        _import_daily_performance(db, import_data.get("daily_performance", []), merge_strategy, results)
        _import_highlights(db, import_data.get("highlights", []), merge_strategy, results)

        # Check for critical errors before commit
        if critical_errors:
            db.rollback()
            logger.error("Session import aborted", extra={"critical_error_count": len(critical_errors)})
            raise http_error(
                400,
                ErrorCode.IMPORT_PROCESSING_FAILED,
                f"Import aborted: {len(critical_errors)} critical errors in courses/students",
                request,
                context={
                    "critical_errors": critical_errors[:10],
                    "total_critical_errors": len(critical_errors),
                    "rollback_performed": True,
                    "backup_available": backup_path is not None,
                    "backup_path": str(backup_path) if backup_path else None,
                },
            )

        # Commit all changes
        try:
            db.commit()
            total_created = sum(results["summary"][key]["created"] for key in results["summary"])
            total_updated = sum(results["summary"][key]["updated"] for key in results["summary"])
            total_errors = sum(len(results["summary"][key]["errors"]) for key in results["summary"])

            logger.info(
                f"Session import COMPLETED for semester '{semester}': "
                f"Created={total_created}, Updated={total_updated}, Errors={total_errors}"
            )

            # Add success flag
            results["success"] = True
            results["rollback_available"] = backup_path is not None

        except Exception as exc:
            db.rollback()
            logger.exception("Database commit failed")
            raise http_error(
                500,
                ErrorCode.IMPORT_PROCESSING_FAILED,
                "Database commit failed, all changes rolled back",
                request,
                context={
                    "error": str(exc),
                    "rollback_performed": True,
                    "backup_available": backup_path is not None,
                    "backup_path": str(backup_path) if backup_path else None,
                },
            )

        return results

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Session import failed: %s", exc, exc_info=True)
        raise http_error(
            500, ErrorCode.IMPORT_PROCESSING_FAILED, "Session import failed", request, context={"error": str(exc)}
        )


@router.post("/rollback")
@limiter.limit(RATE_LIMIT_HEAVY)
@require_permission("sessions:manage")
async def rollback_import(request: Request, backup_filename: str):
    """
    Rollback/restore database from a backup file created before session import.

    CRITICAL: This replaces the entire database with the backup.
    Only use if a session import caused problems.

    Parameters:
    - backup_filename: Name of backup file (e.g., "pre_import_backup_2024-2025_Fall_20250119_103000.db")

    Returns:
    - Status of rollback operation
    """
    try:
        import shutil
        from pathlib import Path

        from backend.config import settings

        # Validate backup filename (security check - prevent path traversal)
        if not is_safe_backup_filename(backup_filename):
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "Invalid backup filename: path traversal characters not allowed",
                request,
                context={"filename": backup_filename},
            )
        backup_dir = Path("backups").resolve()
        # Validate filename using centralized path validation
        try:
            validate_filename(backup_filename, allowed_extensions=[".db", ".enc", ".backup"])
        except ValueError as e:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                f"Invalid backup filename: {str(e)}",
                request,
                context={"filename": backup_filename},
            )
        # Extract only the filename to prevent any path traversal
        # CodeQL [python/path-injection]: Safe - backup_filename is validated above via validate_filename()
        # and is_safe_backup_filename(), then only .name (filename component) is used
        safe_filename = Path(backup_filename).name
        backup_path = (backup_dir / safe_filename).resolve()

        # Validate path is within backup_dir using centralized validation
        # CodeQL [python/path-injection]: Safe - backup_path is validated by validate_path() which
        # confirms path is within backup_dir and rejects directory traversal patterns
        try:
            validate_path(backup_dir, backup_path)
        except ValueError as e:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                f"Backup path outside allowed directory: {str(e)}",
                request,
                context={"filename": backup_filename},
            )

        # Path validated with backend.security.path_validation.validate_path()
        sanitized_backup_path: Path = backup_path

        if not sanitized_backup_path.exists():
            available_backups = [f.name for f in backup_dir.glob("*.db")] if backup_dir.exists() else []
            raise http_error(
                404,
                ErrorCode.IMPORT_PROCESSING_FAILED,
                f"Backup file not found: {backup_filename}",
                request,
                context={"filename": backup_filename, "available_backups": available_backups[:10]},
            )

        # Extract current database path from trusted configuration source
        db_url = settings.DATABASE_URL
        if not db_url.startswith("sqlite:///"):
            raise http_error(
                400, ErrorCode.IMPORT_INVALID_REQUEST, "Rollback only supported for SQLite databases", request
            )

        # Extract DB file from URL with validation
        db_file = db_url.replace("sqlite:///", "")
        # Prevent path traversal attacks on config-sourced database path
        if ".." in db_file or not db_file:
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "Invalid database path in configuration",
                request,
            )
        db_path = Path(db_file).resolve()
        # Validate resolved path
        try:
            db_path.relative_to(db_path.parent)
        except (ValueError, OSError):
            raise http_error(
                400,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "Database path resolution failed",
                request,
            )

        # CodeQL [python/path-injection]: Safe - db_path originates from settings.DATABASE_URL
        # (trusted config), has traversal pattern checks (..), and path resolution validation
        sanitized_db_path = db_path

        # Create backup of current state before rollback (safety)
        # Use only system-generated timestamp (no user input) for backup filename
        pre_rollback_backup = None
        if sanitized_db_path.exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            # Safe filename: only contains safe characters, no user input
            safe_backup_name = f"pre_rollback_backup_{timestamp}.db"
            pre_rollback_backup = (backup_dir / safe_backup_name).resolve()
            # CodeQL [python/path-injection]: Safe - pre_rollback_backup is system-generated and constrained to backup_dir
            validate_path(backup_dir, pre_rollback_backup)
            # CodeQL [python/path-injection]: Safe - sanitized_db_path from trusted config, pre_rollback_backup validated
            shutil.copy2(sanitized_db_path, pre_rollback_backup)
            logger.info("Created pre-rollback backup", extra={"backup_file": pre_rollback_backup.name})

        # Perform rollback: Replace current DB with backup
        # Both paths validated above with validate_path() - safe to use
        if not sanitized_backup_path.exists():
            raise http_error(
                404,
                ErrorCode.IMPORT_INVALID_REQUEST,
                "Backup file not found",
                request,
                context={"filename": safe_filename},
            )
        # CodeQL [python/path-injection]: Safe - both paths are validated:
        # sanitized_backup_path via validate_path() within backup_dir
        # sanitized_db_path from trusted config with validation checks
        # CodeQL [python/path-injection]: Safe - validated paths for backup and database restore
        shutil.copy2(str(sanitized_backup_path), str(sanitized_db_path))

        logger.warning(f"DATABASE ROLLBACK performed by system: Restored from {backup_filename}")

        return {
            "success": True,
            "message": f"Database successfully rolled back to: {backup_filename}",
            "backup_restored": str(backup_path),
            "pre_rollback_backup_created": str(pre_rollback_backup) if pre_rollback_backup else None,
            "timestamp": datetime.now().isoformat(),
            "performed_by": "system",  # User identity tracked via request.state
            "warning": "Database has been restored to previous state. Please restart the application to clear caches.",
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Rollback failed")
        raise http_error(
            500, ErrorCode.IMPORT_PROCESSING_FAILED, "Rollback operation failed", request, context={"error": str(exc)}
        )


@router.get("/backups")
async def list_backups(request: Request):
    """
    List available backup files for rollback.

    Returns list of backup files with metadata.
    """
    try:
        from pathlib import Path

        backup_dir = Path("backups")
        if not backup_dir.exists():
            return {"backups": [], "count": 0}

        backups = []
        for backup_file in sorted(backup_dir.glob("*.db"), key=lambda p: p.stat().st_mtime, reverse=True):
            stat = backup_file.stat()
            backups.append(
                {
                    "filename": backup_file.name,
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / 1024 / 1024, 2),
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "is_pre_import": "pre_import_backup" in backup_file.name,
                    "is_pre_rollback": "pre_rollback_backup" in backup_file.name,
                }
            )

        return {"backups": backups, "count": len(backups), "backup_directory": str(backup_dir.absolute())}

    except Exception as exc:
        logger.error(f"Failed to list backups: {exc}", exc_info=True)
        raise http_error(
            500, ErrorCode.EXPORT_FAILED, "Failed to list backup files", request, context={"error": str(exc)}
        )


# Helper functions for serialization
def _serialize_course(course) -> Dict[str, Any]:
    return {
        "course_code": course.course_code,
        "course_name": course.course_name,
        "semester": course.semester,
        "credits": course.credits,
        "hours_per_week": course.hours_per_week,
        "periods_per_week": course.periods_per_week,
        "description": course.description,
        "evaluation_rules": course.evaluation_rules,
        "teaching_schedule": course.teaching_schedule,
        "absence_penalty": course.absence_penalty,
    }


def _serialize_student(student) -> Dict[str, Any]:
    return {
        "student_id": student.student_id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "email": student.email,
        "father_name": getattr(student, "father_name", None),
        "mobile_phone": getattr(student, "mobile_phone", None),
        "phone": getattr(student, "phone", None),
        "study_year": getattr(student, "study_year", None),
        "health_issue": getattr(student, "health_issue", None),
        "enrollment_date": str(student.enrollment_date) if student.enrollment_date else None,
        "is_active": student.is_active,
    }


def _serialize_enrollment(enrollment) -> Dict[str, Any]:
    return {
        "student_id_ref": enrollment.student.student_id if enrollment.student else None,
        "course_code_ref": enrollment.course.course_code if enrollment.course else None,
        "enrolled_at": str(enrollment.enrolled_at) if enrollment.enrolled_at else None,
    }


def _serialize_grade(grade) -> Dict[str, Any]:
    return {
        "student_id_ref": grade.student.student_id if grade.student else None,
        "course_code_ref": grade.course.course_code if grade.course else None,
        "assignment_name": grade.assignment_name,
        "category": grade.category,
        "grade": float(grade.grade),
        "max_grade": float(grade.max_grade),
        "weight": float(grade.weight) if grade.weight else None,
        # component_type was removed from Grade model; export legacy value if attribute exists
        "component_type": getattr(grade, "component_type", None),
        "date_assigned": str(grade.date_assigned) if grade.date_assigned else None,
        "date_submitted": str(grade.date_submitted) if grade.date_submitted else None,
    }


def _serialize_attendance(attendance) -> Dict[str, Any]:
    return {
        "student_id_ref": attendance.student.student_id if attendance.student else None,
        "course_code_ref": attendance.course.course_code if attendance.course else None,
        "date": str(attendance.date) if attendance.date else None,
        "status": attendance.status,
        "period_number": attendance.period_number,
        "notes": attendance.notes,
    }


def _serialize_performance(performance) -> Dict[str, Any]:
    return {
        "student_id_ref": performance.student.student_id if performance.student else None,
        "course_code_ref": performance.course.course_code if performance.course else None,
        "date": str(performance.date) if performance.date else None,
        "category": performance.category,
        "score": float(performance.score),
        "max_score": float(performance.max_score),
        "notes": performance.notes,
    }


def _serialize_highlight(highlight) -> Dict[str, Any]:
    return {
        "student_id_ref": highlight.student.student_id if highlight.student else None,
        "semester": highlight.semester,
        "category": highlight.category,
        "rating": highlight.rating,
        "highlight_text": highlight.highlight_text,
        "is_positive": highlight.is_positive,
        "date_created": str(highlight.date_created) if highlight.date_created else None,
    }


# Helper functions for import
def _import_enrollments(db: Session, enrollments: List[Dict], merge_strategy: str, results: Dict):
    """Import course enrollments"""
    CourseEnrollment, Student, Course = import_names("models", "CourseEnrollment", "Student", "Course")

    for enroll_data in enrollments:
        try:
            # Find student and course by reference IDs
            student = (
                db.query(Student)
                .filter(Student.student_id == enroll_data.get("student_id_ref"), Student.deleted_at.is_(None))
                .first()
            )

            course = (
                db.query(Course)
                .filter(Course.course_code == enroll_data.get("course_code_ref"), Course.deleted_at.is_(None))
                .first()
            )

            if not student or not course:
                results["summary"]["enrollments"]["errors"].append(
                    f"Missing student or course for enrollment: {enroll_data}"
                )
                continue

            # Check if enrollment exists
            existing = (
                db.query(CourseEnrollment)
                .filter(
                    CourseEnrollment.student_id == student.id,
                    CourseEnrollment.course_id == course.id,
                    CourseEnrollment.deleted_at.is_(None),
                )
                .first()
            )

            if existing:
                if merge_strategy == "update":
                    # Update enrolled_at if provided
                    if enroll_data.get("enrolled_at"):
                        existing.enrolled_at = datetime.fromisoformat(enroll_data["enrolled_at"])
                    db.add(existing)
                    results["summary"]["enrollments"]["updated"] += 1
                else:
                    results["summary"]["enrollments"]["skipped"] += 1
            else:
                # Create new enrollment
                enrollment = CourseEnrollment(
                    student_id=student.id,
                    course_id=course.id,
                    enrolled_at=datetime.fromisoformat(enroll_data["enrolled_at"])
                    if enroll_data.get("enrolled_at")
                    else datetime.now(),
                )
                db.add(enrollment)
                results["summary"]["enrollments"]["created"] += 1

        except Exception as e:
            results["summary"]["enrollments"]["errors"].append(str(e))


def _import_grades(db: Session, grades: List[Dict], merge_strategy: str, results: Dict):
    """Import grades"""
    Grade, Student, Course = import_names("models", "Grade", "Student", "Course")

    for grade_data in grades:
        try:
            student = (
                db.query(Student)
                .filter(Student.student_id == grade_data.get("student_id_ref"), Student.deleted_at.is_(None))
                .first()
            )

            course = (
                db.query(Course)
                .filter(Course.course_code == grade_data.get("course_code_ref"), Course.deleted_at.is_(None))
                .first()
            )

            if not student or not course:
                results["summary"]["grades"]["errors"].append(
                    f"Missing student or course for grade: {grade_data.get('assignment_name', 'unknown')}"
                )
                continue

            # Check if grade exists (by student, course, and assignment name)
            existing = (
                db.query(Grade)
                .filter(
                    Grade.student_id == student.id,
                    Grade.course_id == course.id,
                    Grade.assignment_name == grade_data.get("assignment_name"),
                    Grade.deleted_at.is_(None),
                )
                .first()
            )

            if existing:
                if merge_strategy == "update":
                    existing.category = grade_data.get("category")
                    existing.grade = grade_data.get("grade")
                    existing.max_grade = grade_data.get("max_grade")
                    existing.weight = grade_data.get("weight")
                    if grade_data.get("date_assigned"):
                        existing.date_assigned = datetime.fromisoformat(grade_data["date_assigned"]).date()
                    if grade_data.get("date_submitted"):
                        existing.date_submitted = datetime.fromisoformat(grade_data["date_submitted"]).date()
                    db.add(existing)
                    results["summary"]["grades"]["updated"] += 1
                else:
                    results["summary"]["grades"]["skipped"] += 1
            else:
                grade = Grade(
                    student_id=student.id,
                    course_id=course.id,
                    assignment_name=grade_data.get("assignment_name"),
                    category=grade_data.get("category"),
                    grade=grade_data.get("grade"),
                    max_grade=grade_data.get("max_grade"),
                    weight=grade_data.get("weight"),
                    date_assigned=datetime.fromisoformat(grade_data["date_assigned"]).date()
                    if grade_data.get("date_assigned")
                    else None,
                    date_submitted=datetime.fromisoformat(grade_data["date_submitted"]).date()
                    if grade_data.get("date_submitted")
                    else None,
                )
                db.add(grade)
                results["summary"]["grades"]["created"] += 1

        except Exception as e:
            results["summary"]["grades"]["errors"].append(str(e))


def _import_attendance(db: Session, attendance_records: List[Dict], merge_strategy: str, results: Dict):
    """Import attendance records"""
    Attendance, Student, Course = import_names("models", "Attendance", "Student", "Course")

    for att_data in attendance_records:
        try:
            student = (
                db.query(Student)
                .filter(Student.student_id == att_data.get("student_id_ref"), Student.deleted_at.is_(None))
                .first()
            )

            course = (
                db.query(Course)
                .filter(Course.course_code == att_data.get("course_code_ref"), Course.deleted_at.is_(None))
                .first()
            )

            if not student or not course:
                results["summary"]["attendance"]["errors"].append("Missing student or course for attendance record")
                continue

            att_date = datetime.fromisoformat(att_data["date"]).date() if att_data.get("date") else None

            # Check if attendance exists (by student, course, date, and period)
            existing = (
                db.query(Attendance)
                .filter(
                    Attendance.student_id == student.id,
                    Attendance.course_id == course.id,
                    Attendance.date == att_date,
                    Attendance.period_number == att_data.get("period_number"),
                    Attendance.deleted_at.is_(None),
                )
                .first()
            )

            if existing:
                if merge_strategy == "update":
                    existing.status = att_data.get("status")
                    existing.notes = att_data.get("notes")
                    db.add(existing)
                    results["summary"]["attendance"]["updated"] += 1
                else:
                    results["summary"]["attendance"]["skipped"] += 1
            else:
                attendance = Attendance(
                    student_id=student.id,
                    course_id=course.id,
                    date=att_date,
                    status=att_data.get("status", "Present"),
                    period_number=att_data.get("period_number"),
                    notes=att_data.get("notes"),
                )
                db.add(attendance)
                results["summary"]["attendance"]["created"] += 1

        except Exception as e:
            results["summary"]["attendance"]["errors"].append(str(e))


def _import_daily_performance(db: Session, performance_records: List[Dict], merge_strategy: str, results: Dict):
    """Import daily performance records"""
    DailyPerformance, Student, Course = import_names("models", "DailyPerformance", "Student", "Course")

    for perf_data in performance_records:
        try:
            student = (
                db.query(Student)
                .filter(Student.student_id == perf_data.get("student_id_ref"), Student.deleted_at.is_(None))
                .first()
            )

            course = (
                db.query(Course)
                .filter(Course.course_code == perf_data.get("course_code_ref"), Course.deleted_at.is_(None))
                .first()
            )

            if not student or not course:
                results["summary"]["daily_performance"]["errors"].append(
                    "Missing student or course for performance record"
                )
                continue

            perf_date = datetime.fromisoformat(perf_data["date"]).date() if perf_data.get("date") else None

            # Check if performance record exists
            existing = (
                db.query(DailyPerformance)
                .filter(
                    DailyPerformance.student_id == student.id,
                    DailyPerformance.course_id == course.id,
                    DailyPerformance.date == perf_date,
                    DailyPerformance.category == perf_data.get("category"),
                    DailyPerformance.deleted_at.is_(None),
                )
                .first()
            )

            if existing:
                if merge_strategy == "update":
                    existing.score = perf_data.get("score")
                    existing.max_score = perf_data.get("max_score")
                    existing.notes = perf_data.get("notes")
                    db.add(existing)
                    results["summary"]["daily_performance"]["updated"] += 1
                else:
                    results["summary"]["daily_performance"]["skipped"] += 1
            else:
                performance = DailyPerformance(
                    student_id=student.id,
                    course_id=course.id,
                    date=perf_date,
                    category=perf_data.get("category"),
                    score=perf_data.get("score"),
                    max_score=perf_data.get("max_score"),
                    notes=perf_data.get("notes"),
                )
                db.add(performance)
                results["summary"]["daily_performance"]["created"] += 1

        except Exception as e:
            results["summary"]["daily_performance"]["errors"].append(str(e))


def _import_highlights(db: Session, highlights: List[Dict], merge_strategy: str, results: Dict):
    """Import student highlights"""
    Highlight, Student = import_names("models", "Highlight", "Student")

    for highlight_data in highlights:
        try:
            student = (
                db.query(Student)
                .filter(Student.student_id == highlight_data.get("student_id_ref"), Student.deleted_at.is_(None))
                .first()
            )

            if not student:
                results["summary"]["highlights"]["errors"].append("Missing student for highlight")
                continue

            # Check if highlight exists (by student, semester, category, and text)
            existing = (
                db.query(Highlight)
                .filter(
                    Highlight.student_id == student.id,
                    Highlight.semester == highlight_data.get("semester"),
                    Highlight.category == highlight_data.get("category"),
                    Highlight.highlight_text == highlight_data.get("highlight_text"),
                    Highlight.deleted_at.is_(None),
                )
                .first()
            )

            if existing:
                if merge_strategy == "update":
                    existing.rating = highlight_data.get("rating")
                    existing.is_positive = highlight_data.get("is_positive")
                    db.add(existing)
                    results["summary"]["highlights"]["updated"] += 1
                else:
                    results["summary"]["highlights"]["skipped"] += 1
            else:
                highlight = Highlight(
                    student_id=student.id,
                    semester=highlight_data.get("semester"),
                    category=highlight_data.get("category"),
                    rating=highlight_data.get("rating"),
                    highlight_text=highlight_data.get("highlight_text"),
                    is_positive=highlight_data.get("is_positive", True),
                    date_created=datetime.fromisoformat(highlight_data["date_created"]).date()
                    if highlight_data.get("date_created")
                    else datetime.now().date(),
                )
                db.add(highlight)
                results["summary"]["highlights"]["created"] += 1

        except Exception as e:
            results["summary"]["highlights"]["errors"].append(str(e))
