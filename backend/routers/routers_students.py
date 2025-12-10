"""
IMPROVED: Student Management Routes
Handles all student-related CRUD operations and endpoints
Split from main.py for better organization
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.cache import cached, invalidate_cache, CacheConfig

# Setup logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/students", tags=["Students"], responses={404: {"description": "Not found"}})


# ========== DEPENDENCY INJECTION ==========
from backend.db import get_session as get_db
from backend.import_resolver import (
    import_names,  # noqa: F401 - re-export for tests that monkeypatch
)
from backend.routers.routers_auth import optional_require_role
from backend.schemas.common import PaginatedResponse
from backend.schemas.students import StudentCreate, StudentResponse, StudentUpdate
from backend.services import StudentService

# ========== ENDPOINTS ==========


@router.post("/", response_model=StudentResponse, status_code=201)
@limiter.limit(RATE_LIMIT_WRITE)
def create_student(
    request: Request,
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Create a new student with duplicate protections."""

    service = StudentService(db, request)
    result = service.create_student(student)
    # Invalidate cache
    invalidate_cache("get_all_students")
    return result


@router.get("/", response_model=PaginatedResponse[StudentResponse])
@limiter.limit(RATE_LIMIT_READ)
@cached(ttl=CacheConfig.STUDENTS_LIST)
def get_all_students(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve all students with optional filtering and pagination."""

    service = StudentService(db, request)
    if q:
        result = service.search_students(q=q, skip=skip, limit=limit, is_active=is_active)
    else:
        result = service.list_students(skip=skip, limit=limit, is_active=is_active)
    logger.info("Retrieved %s students (skip=%s, limit=%s)", len(result.items), skip, limit)
    return result


@router.get("/{student_id}", response_model=StudentResponse)
@limiter.limit(RATE_LIMIT_READ)
@cached(ttl=CacheConfig.STUDENT_DETAIL)
def get_student(request: Request, student_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific student by ID."""

    service = StudentService(db, request)
    return service.get_student(student_id)


@router.put("/{student_id}", response_model=StudentResponse)
@limiter.limit(RATE_LIMIT_WRITE)
def update_student(
    request: Request,
    student_id: int,
    student_data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Update a student's information."""

    service = StudentService(db, request)
    result = service.update_student(student_id, student_data)
    # Invalidate cache
    invalidate_cache("get_all_students")
    invalidate_cache("get_student", student_id)
    return result


@router.delete("/{student_id}", status_code=204)
@limiter.limit(RATE_LIMIT_WRITE)
def delete_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Soft-delete a student and hide associated records."""

    service = StudentService(db, request)
    service.delete_student(student_id)
    # Invalidate cache
    invalidate_cache("get_all_students")
    invalidate_cache("get_student", student_id)
    return None


@router.post("/{student_id}/activate")
@limiter.limit(RATE_LIMIT_WRITE)
def activate_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Activate a student account."""

    service = StudentService(db, request)
    return service.activate_student(student_id)


@router.post("/{student_id}/deactivate")
@limiter.limit(RATE_LIMIT_WRITE)
def deactivate_student(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """Deactivate a student account."""

    service = StudentService(db, request)
    return service.deactivate_student(student_id)


# ========== BULK OPERATIONS ==========


@router.post("/bulk/create")
@limiter.limit(RATE_LIMIT_WRITE)
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
    service = StudentService(db, request)
    result = service.bulk_create_students(students_data)
    # Invalidate cache
    invalidate_cache("get_all_students")
    logger.info("Bulk created %s students, %s errors", result["created"], result["failed"])
    return result
