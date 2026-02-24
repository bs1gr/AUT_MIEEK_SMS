from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import (
    ErrorCode,
    build_error_detail,
    http_error,
    internal_server_error,
)
from backend.schemas.audit import AuditAction, AuditResource
from backend.schemas.students import StudentCreate, StudentUpdate
from backend.services.audit_service import AuditLogger

logger = logging.getLogger(__name__)

DuplicateCheckResult = Tuple[int, ErrorCode, str, Optional[Dict[str, Any]]]


class StudentService:
    """Encapsulates business logic for student CRUD + bulk operations."""

    def __init__(self, db: Session, request: Optional[Request] = None) -> None:
        self.db = db
        self.request = request
        self.audit = AuditLogger(db)
        try:
            # import_names returns a tuple of requested attributes; unpack the class
            (self.Student,) = self._get_import_names()("models", "Student")
        except Exception as exc:  # pragma: no cover - critical import failure
            logger.error("Failed to import Student model: %s", exc, exc_info=True)
            raise internal_server_error(request=self.request)

    # ------------------------------------------------------------------
    # CRUD operations
    # ------------------------------------------------------------------
    def create_student(self, student: StudentCreate):
        self._assert_unique_email(student.email)
        self._assert_unique_student_id(student.student_id)

        with transaction(self.db):
            db_student = self.Student(**student.model_dump())
            self.db.add(db_student)
            self.db.flush()
            self.db.refresh(db_student)

        logger.info("Created student: %s - %s", db_student.id, db_student.student_id)
        self._log_audit(
            action=AuditAction.CREATE,
            resource_id=str(db_student.id),
            new_values=self._serialize_student(db_student),
        )
        return db_student

    def list_students(self, skip: int, limit: int, is_active: Optional[bool]):
        """List students with eager-loaded relationships.

        OPTIMIZATION (v1.15.0): Added eager loading of related records
        (enrollments, grades, attendance) to prevent N+1 queries.
        """
        from sqlalchemy.orm import selectinload

        query = self.db.query(self.Student).filter(self.Student.deleted_at.is_(None))

        # Eager-load relationships for common access patterns
        query = query.options(
            selectinload(self.Student.enrollments),
            selectinload(self.Student.grades),
            selectinload(self.Student.attendances),
        )

        if is_active is not None:
            query = query.filter(self.Student.is_active == is_active)
        return paginate(query, skip, limit)

    def search_students(self, q: str, skip: int, limit: int, is_active: Optional[bool] = None):
        """Full-text like search on first_name + last_name with Postgres optimization.

        Fallback to ILIKE on non-Postgres dialects.

        OPTIMIZATION (v1.15.0): Added eager loading to prevent N+1 queries
        on search results.
        """
        from sqlalchemy.orm import selectinload

        q = (q or "").strip()
        if not q:
            return self.list_students(skip, limit, is_active)

        query = self.db.query(self.Student).filter(self.Student.deleted_at.is_(None))

        # Eager-load relationships for search results
        query = query.options(
            selectinload(self.Student.enrollments),
            selectinload(self.Student.grades),
            selectinload(self.Student.attendances),
        )

        if is_active is not None:
            query = query.filter(self.Student.is_active == is_active)

        try:
            dialect = str(self.db.bind.dialect.name) if self.db.bind else ""
        except Exception:
            dialect = ""

        if dialect == "postgresql":
            # Use to_tsvector match
            vector = func.to_tsvector("simple", func.concat_ws(" ", self.Student.first_name, self.Student.last_name))
            ts_query = func.plainto_tsquery("simple", q)
            query = query.filter(vector.op("@@")(ts_query))
        else:
            like = f"%{q}%"
            query = query.filter((self.Student.first_name.ilike(like)) | (self.Student.last_name.ilike(like)))

        return paginate(query, skip, limit)

    def get_student(self, student_id: int):
        student = get_by_id_or_404(self.db, self.Student, student_id)
        logger.info("Retrieved student: %s", student_id)
        return student

    def update_student(self, student_id: int, student_data: StudentUpdate):
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        update_data = student_data.model_dump(exclude_unset=True)
        re_enroll_previous = update_data.pop("re_enroll_previous", False)
        old_values = self._serialize_student(db_student)
        details: Optional[Dict[str, Any]] = None

        with transaction(self.db):
            # If deactivating student (is_active being set to False), unenroll from all courses
            if "is_active" in update_data and update_data["is_active"] is False and db_student.is_active:
                removed_courses = self._unenroll_from_all_courses(db_student)
                details = {
                    "action": "deactivate",
                    "unenrolled_courses": removed_courses,
                }
                logger.info("Unenrolled student %s from all courses (deactivation)", student_id)

            if (
                "is_active" in update_data
                and update_data["is_active"] is True
                and not db_student.is_active
                and re_enroll_previous
            ):
                restored_courses = self._reenroll_previous_courses(db_student)
                details = {
                    "action": "reactivate",
                    "reenrolled_courses": restored_courses,
                }

            for key, value in update_data.items():
                setattr(db_student, key, value)
            self.db.flush()
            self.db.refresh(db_student)

        logger.info("Updated student: %s", student_id)
        self._log_audit(
            action=AuditAction.UPDATE,
            resource_id=str(db_student.id),
            old_values=old_values,
            new_values=self._serialize_student(db_student),
            details=details,
        )
        return db_student

    def delete_student(self, student_id: int):
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        old_values = self._serialize_student(db_student)
        with transaction(self.db):
            removed_courses = self._unenroll_from_all_courses(db_student)
            db_student.mark_deleted()
            db_student.is_active = False  # type: ignore[assignment]
        logger.info("Soft-deleted student: %s", student_id)
        self._log_audit(
            action=AuditAction.DELETE,
            resource_id=str(student_id),
            old_values=old_values,
            details={
                "action": "delete",
                "unenrolled_courses": removed_courses,
            },
            new_values={
                "deleted_at": str(db_student.deleted_at),
                "is_active": db_student.is_active,
            },
        )

    def activate_student(self, student_id: int) -> Dict[str, Any]:
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        old_values = self._serialize_student(db_student)
        with transaction(self.db):
            db_student.is_active = True  # type: ignore[assignment]
        logger.info("Activated student: %s", student_id)
        self._log_audit(
            action=AuditAction.UPDATE,
            resource_id=str(student_id),
            old_values=old_values,
            new_values=self._serialize_student(db_student),
            details={"action": "activate"},
        )
        return {"message": "Student activated successfully", "student_id": student_id}

    def deactivate_student(self, student_id: int) -> Dict[str, Any]:
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        old_values = self._serialize_student(db_student)
        with transaction(self.db):
            removed_courses = self._unenroll_from_all_courses(db_student)
            db_student.is_active = False  # type: ignore[assignment]
        logger.info("Deactivated student: %s", student_id)
        self._log_audit(
            action=AuditAction.UPDATE,
            resource_id=str(student_id),
            old_values=old_values,
            new_values=self._serialize_student(db_student),
            details={
                "action": "deactivate",
                "unenrolled_courses": removed_courses,
            },
        )
        return {"message": "Student deactivated successfully", "student_id": student_id}

    def _unenroll_from_all_courses(self, db_student) -> List[Dict[str, Any]]:
        """Soft-delete all course enrollments for a student during deactivation.

        When a student is marked as inactive, they are automatically unenrolled
        from all courses to prevent them from appearing in course rosters.
        """
        removed_courses: List[Dict[str, Any]] = []
        try:
            from sqlalchemy.orm import selectinload

            from backend.models import CourseEnrollment

            # Get all active enrollments for this student
            enrollments = (
                self.db.query(CourseEnrollment)
                .options(selectinload(CourseEnrollment.course))
                .filter(CourseEnrollment.student_id == db_student.id, CourseEnrollment.deleted_at.is_(None))
                .all()
            )

            # Soft-delete each enrollment
            for enrollment in enrollments:
                course = enrollment.course
                removed_courses.append(
                    {
                        "course_id": enrollment.course_id,
                        "course_code": getattr(course, "course_code", None) if course else None,
                        "course_name": getattr(course, "course_name", None) if course else None,
                    }
                )
                enrollment.mark_deleted()
                logger.info(
                    "Unenrolled student %s from course %s (id: %s)",
                    db_student.id,
                    enrollment.course_id,
                    enrollment.id,
                )
        except Exception as exc:  # pragma: no cover
            logger.exception("Error unenrolling student from courses: %s", exc)
            # Don't raise - log and continue (enrollment removal is secondary to deactivation)
        return removed_courses

    def _reenroll_previous_courses(self, db_student) -> List[Dict[str, Any]]:
        """Restore previously soft-deleted course enrollments for a student.

        Used when reactivating a student with re-enrollment enabled.
        """
        restored_courses: List[Dict[str, Any]] = []
        try:
            from sqlalchemy.orm import selectinload

            from backend.models import CourseEnrollment

            enrollments = (
                self.db.query(CourseEnrollment)
                .execution_options(include_deleted=True)
                .options(selectinload(CourseEnrollment.course))
                .filter(CourseEnrollment.student_id == db_student.id, CourseEnrollment.deleted_at.is_not(None))
                .all()
            )

            for enrollment in enrollments:
                course = enrollment.course
                restored_courses.append(
                    {
                        "course_id": enrollment.course_id,
                        "course_code": getattr(course, "course_code", None) if course else None,
                        "course_name": getattr(course, "course_name", None) if course else None,
                    }
                )
                enrollment.deleted_at = None  # type: ignore[assignment]
        except Exception as exc:  # pragma: no cover
            logger.exception("Error re-enrolling student into courses: %s", exc)
        return restored_courses

    def bulk_create_students(self, students_data: List[StudentCreate]) -> Dict[str, Any]:
        created: List[str] = []
        errors: List[Dict[str, Any]] = []

        for idx, student_data in enumerate(students_data):
            duplicate_email = self._duplicate_error("email", student_data.email)
            if duplicate_email:
                _, code, message, context = duplicate_email
                errors.append(
                    {
                        "index": idx,
                        "error": build_error_detail(code, message, request=self.request, context=context),
                    }
                )
                continue

            duplicate_id = self._duplicate_error("student_id", student_data.student_id)
            if duplicate_id:
                _, code, message, context = duplicate_id
                errors.append(
                    {
                        "index": idx,
                        "error": build_error_detail(code, message, request=self.request, context=context),
                    }
                )
                continue

            try:
                with transaction(self.db):
                    db_student = self.Student(**student_data.model_dump())
                    self.db.add(db_student)
                    self.db.flush()
                    self.db.refresh(db_student)
                    created.append(str(db_student.student_id))
            except IntegrityError as exc:
                logger.warning("Integrity error during bulk student create: %s", exc)
                errors.append(
                    {
                        "index": idx,
                        "error": build_error_detail(
                            ErrorCode.VALIDATION_FAILED,
                            "Integrity constraint violation during bulk student create",
                            request=self.request,
                        ),
                    }
                )
            except Exception as exc:  # pragma: no cover - unexpected errors logged
                logger.exception("Unexpected error during bulk student create")
                errors.append(
                    {
                        "index": idx,
                        "error": build_error_detail(
                            ErrorCode.INTERNAL_SERVER_ERROR,
                            "Unexpected internal error during bulk student create",
                            request=self.request,
                        ),
                    }
                )

        logger.info("Bulk created %s students with %s errors", len(created), len(errors))
        self._log_audit(
            action=AuditAction.BULK_IMPORT,
            resource_id=None,
            new_values={"created": created},
            details={"failed": errors},
        )
        return {
            "created": len(created),
            "failed": len(errors),
            "created_ids": created,
            "errors": errors,
        }

    def bulk_autofill_academic_year(self) -> Dict[str, Any]:
        """Autofill academic_year based on study_year for missing entries.

        Mapping: study_year 1 -> A, study_year 2 -> B. Leaves others unchanged.
        """
        updated = 0
        skipped = 0

        with transaction(self.db):
            students = self.db.query(self.Student).filter(self.Student.deleted_at.is_(None)).all()
            for student in students:
                current = (getattr(student, "academic_year", None) or "").strip()
                if current:
                    skipped += 1
                    continue
                if student.study_year == 1:
                    student.academic_year = "A"  # type: ignore[assignment]
                    updated += 1
                elif student.study_year == 2:
                    student.academic_year = "B"  # type: ignore[assignment]
                    updated += 1
                else:
                    skipped += 1

        self._log_audit(
            action=AuditAction.UPDATE,
            resource_id=None,
            details={
                "action": "bulk_autofill_academic_year",
                "updated": updated,
                "skipped": skipped,
            },
            new_values={"academic_year": "A/B"},
        )

        return {"updated": updated, "skipped": skipped}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _get_import_names(self):
        """Resolve import_names dynamically to support test monkeypatching.

        Tests patch routers_students.import_names to simulate failures.
        Resolve from that module when available, otherwise fall back to
        the canonical backend.import_resolver implementation.
        """
        try:  # Local import to pick up runtime monkeypatches
            from backend.routers import (
                routers_students as _routers_students,  # type: ignore
            )

            return getattr(_routers_students, "import_names")
        except Exception:
            from backend.import_resolver import import_names as _import_names

            return _import_names

    def _assert_unique_email(self, email: str) -> None:
        duplicate = self._duplicate_error("email", email)
        if duplicate:
            status_code, code, message, context = duplicate
            raise http_error(status_code, code, message, self.request, context=context)

    def _assert_unique_student_id(self, student_id: str) -> None:
        duplicate = self._duplicate_error("student_id", student_id)
        if duplicate:
            status_code, code, message, context = duplicate
            raise http_error(status_code, code, message, self.request, context=context)

    def _duplicate_error(self, field_name: str, value: str) -> Optional[DuplicateCheckResult]:
        attribute = getattr(self.Student, field_name)
        existing = self.db.query(self.Student).filter(attribute == value).with_for_update().first()
        if not existing:
            return None

        if existing.deleted_at is None:
            if field_name == "email":
                return (400, ErrorCode.STUDENT_DUPLICATE_EMAIL, "Email already registered", None)
            return (400, ErrorCode.STUDENT_DUPLICATE_ID, "Student ID already exists", None)

        if field_name == "email":
            message = "Student email is archived; contact support to restore"
            context = {"email": value}
        else:
            message = "Student ID is archived; contact support to restore"
            context = {"student_id": value}
        return (409, ErrorCode.STUDENT_ARCHIVED, message, context)

    # ------------------------------------------------------------------
    # Audit helpers
    # ------------------------------------------------------------------
    def _serialize_student(self, student) -> Dict[str, Any]:
        """Minimal serialization for audit logging without relationships."""

        return {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
            "student_id": student.student_id,
            "enrollment_date": str(student.enrollment_date) if student.enrollment_date else None,
            "is_active": student.is_active,
            "father_name": student.father_name,
            "mobile_phone": student.mobile_phone,
            "phone": student.phone,
            "health_issue": student.health_issue,
            "note": student.note,
            "study_year": student.study_year,
            "academic_year": getattr(student, "academic_year", None),
            "class_division": getattr(student, "class_division", None),
        }

    def _log_audit(
        self,
        *,
        action: AuditAction,
        resource_id: Optional[str],
        details: Optional[Dict[str, Any]] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        try:
            if self.request:
                self.audit.log_from_request(
                    request=self.request,
                    action=action,
                    resource=AuditResource.STUDENT,
                    resource_id=resource_id,
                    details=details,
                    success=success,
                    error_message=error_message,
                    old_values=old_values,
                    new_values=new_values,
                )
            else:
                self.audit.log_action(
                    action=action,
                    resource=AuditResource.STUDENT,
                    resource_id=resource_id,
                    details=details,
                    success=success,
                    error_message=error_message,
                    old_values=old_values,
                    new_values=new_values,
                )
        except Exception:  # pragma: no cover - audit failures must not break main flow
            logger.exception("Failed to log audit event for student action")
