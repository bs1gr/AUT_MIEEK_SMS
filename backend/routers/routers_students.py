"""
IMPROVED: Student Management Routes
Handles all student-related CRUD operations and endpoints
Split from main.py for better organization
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from backend.db_utils import transaction, get_by_id_or_404, paginate
from backend.errors import ErrorCode, build_error_detail, http_error, internal_server_error
from backend.rate_limiting import limiter, RATE_LIMIT_READ, RATE_LIMIT_WRITE

# Setup logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/students", tags=["Students"], responses={404: {"description": "Not found"}})


from backend.schemas.students import StudentCreate, StudentUpdate, StudentResponse
from backend.schemas.common import PaginatedResponse
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
    except Exception as e:
        logger.error(f"Error importing models: {str(e)}", exc_info=True)
        raise internal_server_error(request=request)

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

    with transaction(db):
        db_student = Student(**student.model_dump())
        db.add(db_student)
        db.flush()
        db.refresh(db_student)

    logger.info(f"Created student: {db_student.id} - {db_student.student_id}")
    return db_student


@router.get("/", response_model=PaginatedResponse[StudentResponse])
@limiter.limit(RATE_LIMIT_READ)
def get_all_students(
    request: Request, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None, db: Session = Depends(get_db)
):
    """
    Retrieve all students with optional filtering and pagination.

    **Rate Limit**: 60 requests per minute

    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum records to return (default: 100, max: 1000)
    - **is_active**: Filter by active status (optional)
    """
    (Student,) = import_names("models", "Student")

    query = db.query(Student).filter(Student.deleted_at.is_(None))

    # Apply filters
    if is_active is not None:
        query = query.filter(Student.is_active == is_active)

    result = paginate(query, skip, limit)
    logger.info(f"Retrieved {len(result.items)} students (skip={skip}, limit={limit})")

    return result


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(request: Request, student_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific student by ID.

    - **student_id**: The ID of the student to retrieve
    """
    (Student,) = import_names("models", "Student")
    student = get_by_id_or_404(db, Student, student_id)
    logger.info(f"Retrieved student: {student_id}")
    return student


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
    (Student,) = import_names("models", "Student")
    db_student = get_by_id_or_404(db, Student, student_id)

    # Update only provided fields
    update_data = student_data.model_dump(exclude_unset=True)

    with transaction(db):
        for key, value in update_data.items():
            setattr(db_student, key, value)
        db.flush()
        db.refresh(db_student)

    logger.info(f"Updated student: {student_id}")
    return db_student


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
    (Student,) = import_names("models", "Student")
    db_student = get_by_id_or_404(db, Student, student_id)

    with transaction(db):
        db_student.mark_deleted()
        db_student.is_active = False  # type: ignore[assignment]

    logger.info(f"Soft-deleted student: {student_id}")
    return None


@router.post("/{student_id}/activate")
def activate_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Activate a student account"""
    (Student,) = import_names("models", "Student")
    db_student = get_by_id_or_404(db, Student, student_id)

    with transaction(db):
        db_student.is_active = True  # type: ignore[assignment]

    logger.info(f"Activated student: {student_id}")
    return {"message": "Student activated successfully", "student_id": student_id}


@router.post("/{student_id}/deactivate")
def deactivate_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Deactivate a student account"""
    (Student,) = import_names("models", "Student")
    db_student = get_by_id_or_404(db, Student, student_id)

    with transaction(db):
        db_student.is_active = False  # type: ignore[assignment]

    logger.info(f"Deactivated student: {student_id}")
    return {"message": "Student deactivated successfully", "student_id": student_id}


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

            with transaction(db):
                db_student = Student(**student_data.model_dump())
                db.add(db_student)
                db.flush()
                db.refresh(db_student)
                created.append(str(db_student.student_id))

        except IntegrityError as ie:
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
