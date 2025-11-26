"""Course enrollment endpoints with structured error responses."""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enrollments", tags=["Enrollments"], responses={404: {"description": "Not found"}})

# ===== Dependency =====
from backend.db import get_session as get_db
from backend.db_utils import transaction
from backend.errors import internal_server_error
from backend.rate_limiting import (  # Rate limiting for write endpoints
    RATE_LIMIT_WRITE,
    limiter,
)
from backend.routers.routers_auth import optional_require_role
from backend.schemas.common import PaginatedResponse, PaginationParams
from backend.schemas.enrollments import (
    EnrollmentCreate,
    EnrollmentResponse,
    StudentBrief,
)
from backend.services.enrollment_service import EnrollmentService


# ===== Endpoints =====
@router.get("/", response_model=PaginatedResponse[EnrollmentResponse])
def get_all_enrollments(
    request: Request,
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db),
):
    """Get all course enrollments"""
    try:
        return EnrollmentService.get_all_enrollments(db, pagination)
    except Exception as exc:
        logger.error("Error retrieving all enrollments: %s", exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/course/{course_id}", response_model=List[EnrollmentResponse])
def list_course_enrollments(course_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        return EnrollmentService.list_course_enrollments(db, course_id, request)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing enrollments for course %s: %s", course_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/student/{student_id}", response_model=List[EnrollmentResponse])
def list_student_enrollments(student_id: int, request: Request, db: Session = Depends(get_db)):
    """Get all course enrollments for a specific student"""
    try:
        return EnrollmentService.list_student_enrollments(db, student_id, request)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing enrollments for student %s: %s", student_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/course/{course_id}/students", response_model=List[StudentBrief])
def list_enrolled_students(course_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        return EnrollmentService.list_enrolled_students(db, course_id, request)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing students for course %s: %s", course_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.post("/course/{course_id}")
@limiter.limit(RATE_LIMIT_WRITE)
def enroll_students(
    course_id: int,
    payload: EnrollmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Enroll multiple students in a course.
    Uses database locking to prevent race conditions.
    """
    try:
        with transaction(db):
            result = EnrollmentService.enroll_students(db, course_id, payload, request)
            db.flush()
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error enrolling students in course %s: %s", course_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.delete("/course/{course_id}/student/{student_id}")
@limiter.limit(RATE_LIMIT_WRITE)
def unenroll_student(
    course_id: int,
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    try:
        with transaction(db):
            result = EnrollmentService.unenroll_student(db, course_id, student_id, request)
            db.flush()
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error unenrolling student %s from course %s: %s", student_id, course_id, exc, exc_info=True)
        raise internal_server_error(request=request)
