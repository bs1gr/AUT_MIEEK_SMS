"""
IMPROVED: Student Management Routes
Handles all student-related CRUD operations and endpoints
Split from main.py for better organization
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from backend.config import settings
from backend.errors import ErrorCode, build_error_detail, http_error, internal_server_error
from backend.rate_limiting import limiter, RATE_LIMIT_READ, RATE_LIMIT_WRITE

# Setup logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/students", tags=["Students"], responses={404: {"description": "Not found"}})


from backend.schemas.students import StudentCreate, StudentUpdate, StudentResponse
from backend.routers.routers_auth import optional_require_role
from backend.import_resolver import import_names


# ========== DEPENDENCY INJECTION ==========
from backend.db import get_session as get_db


# ========== ENDPOINTS ==========


@router.post("/", response_model=StudentResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
def create_student(
    request: Request,
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Create a new student.

    **Rate Limit**: 10 requests per minute

    - **first_name**: Student's first name (required)
    - **last_name**: Student's last name (required)
    - **email**: Student's email (required, unique)
    - **student_id**: Student ID (required, unique)
    - **enrollment_date**: Date of enrollment (optional)
    """
    try:
        (Student,) = import_names("models", "Student")

        # Use database-level locking to prevent race conditions
        # Check if student with same email already exists
        existing = db.query(Student).filter(Student.email == student.email).with_for_update().first()
        if existing:
            if existing.deleted_at is None:
                logger.warning(f"Attempted to create duplicate student with email: {student.email}")
                raise http_error(
                    400,
                    ErrorCode.STUDENT_DUPLICATE_EMAIL,
                    "Email already registered",
                    request,
                )
            logger.warning(
                "Attempted to create student with archived email %s; restoration required",
                student.email,
            )
            raise http_error(
                409,
                ErrorCode.STUDENT_ARCHIVED,
                "Student email is archived; contact support to restore",
                request,
                context={"email": student.email},
            )

        # Check if student_id already exists
        existing_id = db.query(Student).filter(Student.student_id == student.student_id).with_for_update().first()
        if existing_id:
            if existing_id.deleted_at is None:
                logger.warning(f"Attempted to create duplicate student with ID: {student.student_id}")
                raise http_error(
                    400,
                    ErrorCode.STUDENT_DUPLICATE_ID,
                    "Student ID already exists",
                    request,
                )
            logger.warning(
                "Attempted to create student with archived ID %s; restoration required",
                student.student_id,
            )
            raise http_error(
                409,
                ErrorCode.STUDENT_ARCHIVED,
                "Student ID is archived; contact support to restore",
                request,
                context={"student_id": student.student_id},
            )

        db_student = Student(**student.model_dump())
        db.add(db_student)
        db.commit()
        db.refresh(db_student)

        logger.info(f"Created student: {db_student.id} - {db_student.student_id}")
        return db_student

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating student: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/", response_model=List[StudentResponse])
@limiter.limit(RATE_LIMIT_READ)
def get_all_students(
    request: Request, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None, db: Session = Depends(get_db)
):
    """
    Retrieve all students with optional filtering.

    **Rate Limit**: 60 requests per minute

    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum records to return (default: 100, max: 1000)
    - **is_active**: Filter by active status (optional)
    """
    try:
        # Validate pagination
        if skip < 0:
            # Enforce non-negative skip
            raise http_error(400, ErrorCode.VALIDATION_FAILED, "Skip cannot be negative", request)
        # Validate limit
        if limit < settings.MIN_PAGE_SIZE or limit > settings.MAX_PAGE_SIZE:
            raise http_error(
                400,
                ErrorCode.VALIDATION_FAILED,
                f"Limit must be between {settings.MIN_PAGE_SIZE} and {settings.MAX_PAGE_SIZE}",
                request,
            )

        (Student,) = import_names("models", "Student")

        query = db.query(Student).filter(Student.deleted_at.is_(None))

        # Apply filters
        if is_active is not None:
            query = query.filter(Student.is_active == is_active)

        students = query.offset(skip).limit(limit).all()
        logger.info(f"Retrieved {len(students)} students (skip={skip}, limit={limit})")

        return students

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving students: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(request: Request, student_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific student by ID.

    - **student_id**: The ID of the student to retrieve
    """
    try:
        (Student,) = import_names("models", "Student")

        student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()

        if not student:
            logger.warning(f"Student not found: {student_id}")
            raise http_error(404, ErrorCode.STUDENT_NOT_FOUND, "Student not found", request)

        logger.info(f"Retrieved student: {student_id}")
        return student

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving student {student_id}: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    request: Request,
    student_id: int,
    student_data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Update a student's information.

    - **student_id**: The ID of the student to update
    - **student_data**: Updated student information
    """
    try:
        (Student,) = import_names("models", "Student")

        db_student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()

        if not db_student:
            logger.warning(f"Attempted update on non-existent student: {student_id}")
            raise http_error(404, ErrorCode.STUDENT_NOT_FOUND, "Student not found", request)

        # Update only provided fields
        update_data = student_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_student, key, value)

        db.commit()
        db.refresh(db_student)

        logger.info(f"Updated student: {student_id}")
        return db_student

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating student {student_id}: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)


@router.delete("/{student_id}", status_code=204)
def delete_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Soft-delete a student and hide associated records.

    - **student_id**: The ID of the student to delete
    """
    try:
        (Student,) = import_names("models", "Student")

        db_student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()

        if not db_student:
            logger.warning(f"Attempted delete on non-existent student: {student_id}")
            raise http_error(404, ErrorCode.STUDENT_NOT_FOUND, "Student not found", request)

        db_student.mark_deleted()
        db_student.is_active = False  # type: ignore[assignment]
        db.commit()

        logger.info(f"Soft-deleted student: {student_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting student {student_id}: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)


@router.post("/{student_id}/activate")
def activate_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Activate a student account"""
    try:
        (Student,) = import_names("models", "Student")

        db_student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()

        if not db_student:
            raise http_error(404, ErrorCode.STUDENT_NOT_FOUND, "Student not found", request)

        db_student.is_active = True  # type: ignore[assignment]
        db.commit()

        logger.info(f"Activated student: {student_id}")
        return {"message": "Student activated successfully", "student_id": student_id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error activating student {student_id}: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)


@router.post("/{student_id}/deactivate")
def deactivate_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Deactivate a student account"""
    try:
        (Student,) = import_names("models", "Student")
        db_student = db.query(Student).filter(Student.id == student_id, Student.deleted_at.is_(None)).first()

        if not db_student:
            raise http_error(404, ErrorCode.STUDENT_NOT_FOUND, "Student not found", request)

        db_student.is_active = False  # type: ignore[assignment]
        db.commit()

        logger.info(f"Deactivated student: {student_id}")
        return {"message": "Student deactivated successfully", "student_id": student_id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deactivating student {student_id}: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)


# ========== BULK OPERATIONS ==========


@router.post("/bulk/create")
def bulk_create_students(
    request: Request,
    students_data: List[StudentCreate],
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Create multiple students at once.

    Useful for importing student lists.
    """
    try:
        (Student,) = import_names("models", "Student")

        created: List[str] = []
        errors: List[dict] = []

        # Commit per-student to avoid transaction-wide rollback on a single failure
        from sqlalchemy.exc import IntegrityError

        for idx, student_data in enumerate(students_data):
            try:
                # Proactive duplicate checks (using committed state)
                existing_email = db.query(Student).filter(Student.email == student_data.email).with_for_update().first()
                if existing_email:
                    if existing_email.deleted_at is None:
                        errors.append(
                            {
                                "index": idx,
                                "error": build_error_detail(
                                    ErrorCode.STUDENT_DUPLICATE_EMAIL,
                                    f"Email already exists: {student_data.email}",
                                ),
                            }
                        )
                    else:
                        errors.append(
                            {
                                "index": idx,
                                "error": build_error_detail(
                                    ErrorCode.STUDENT_ARCHIVED,
                                    f"Email archived; restore existing record: {student_data.email}",
                                ),
                            }
                        )
                    continue

                existing_sid = (
                    db.query(Student).filter(Student.student_id == student_data.student_id).with_for_update().first()
                )
                if existing_sid:
                    if existing_sid.deleted_at is None:
                        errors.append(
                            {
                                "index": idx,
                                "error": build_error_detail(
                                    ErrorCode.STUDENT_DUPLICATE_ID,
                                    f"Student ID already exists: {student_data.student_id}",
                                ),
                            }
                        )
                    else:
                        errors.append(
                            {
                                "index": idx,
                                "error": build_error_detail(
                                    ErrorCode.STUDENT_ARCHIVED,
                                    f"Student ID archived; restore existing record: {student_data.student_id}",
                                ),
                            }
                        )
                    continue

                db_student = Student(**student_data.model_dump())
                db.add(db_student)
                # Flush + commit to surface DB-level uniqueness early and persist successes
                db.commit()
                db.refresh(db_student)
                created.append(str(db_student.student_id))

            except IntegrityError as ie:
                db.rollback()
                msg = str(getattr(ie, "orig", ie))
                errors.append(
                    {
                        "index": idx,
                        "error": build_error_detail(
                            ErrorCode.VALIDATION_FAILED,
                            f"Integrity error: {msg}",
                        ),
                    }
                )
            except Exception as e:
                db.rollback()
                errors.append(
                    {
                        "index": idx,
                        "error": build_error_detail(
                            ErrorCode.INTERNAL_SERVER_ERROR,
                            str(e),
                        ),
                    }
                )

        logger.info(f"Bulk created {len(created)} students, {len(errors)} errors")

        return {
            "created": len(created),
            "failed": len(errors),
            "created_ids": created,
            "errors": errors,
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error in bulk create: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)
