from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, paginate, transaction
from backend.errors import (
    ErrorCode,
    build_error_detail,
    http_error,
    internal_server_error,
)
from backend.schemas.students import StudentCreate, StudentUpdate

logger = logging.getLogger(__name__)

DuplicateCheckResult = Tuple[int, ErrorCode, str, Optional[Dict[str, Any]]]


class StudentService:
    """Encapsulates business logic for student CRUD + bulk operations."""

    def __init__(self, db: Session, request: Optional[Request] = None) -> None:
        self.db = db
        self.request = request
        try:
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
        return db_student

    def list_students(self, skip: int, limit: int, is_active: Optional[bool]):
        query = self.db.query(self.Student).filter(self.Student.deleted_at.is_(None))
        if is_active is not None:
            query = query.filter(self.Student.is_active == is_active)
        return paginate(query, skip, limit)

    def get_student(self, student_id: int):
        student = get_by_id_or_404(self.db, self.Student, student_id)
        logger.info("Retrieved student: %s", student_id)
        return student

    def update_student(self, student_id: int, student_data: StudentUpdate):
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        update_data = student_data.model_dump(exclude_unset=True)

        with transaction(self.db):
            for key, value in update_data.items():
                setattr(db_student, key, value)
            self.db.flush()
            self.db.refresh(db_student)

        logger.info("Updated student: %s", student_id)
        return db_student

    def delete_student(self, student_id: int):
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        with transaction(self.db):
            db_student.mark_deleted()
            db_student.is_active = False  # type: ignore[assignment]
        logger.info("Soft-deleted student: %s", student_id)

    def activate_student(self, student_id: int) -> Dict[str, Any]:
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        with transaction(self.db):
            db_student.is_active = True  # type: ignore[assignment]
        logger.info("Activated student: %s", student_id)
        return {"message": "Student activated successfully", "student_id": student_id}

    def deactivate_student(self, student_id: int) -> Dict[str, Any]:
        db_student = get_by_id_or_404(self.db, self.Student, student_id)
        with transaction(self.db):
            db_student.is_active = False  # type: ignore[assignment]
        logger.info("Deactivated student: %s", student_id)
        return {"message": "Student deactivated successfully", "student_id": student_id}

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
                            f"Integrity error: {str(getattr(exc, 'orig', exc))}",
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
                            str(exc),
                            request=self.request,
                        ),
                    }
                )

        logger.info("Bulk created %s students with %s errors", len(created), len(errors))
        return {
            "created": len(created),
            "failed": len(errors),
            "created_ids": created,
            "errors": errors,
        }

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
