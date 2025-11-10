
"""Course enrollment endpoints with structured error responses."""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enrollments", tags=["Enrollments"], responses={404: {"description": "Not found"}})

from backend.schemas.enrollments import EnrollmentCreate, EnrollmentResponse, StudentBrief
from backend.schemas.common import PaginatedResponse, PaginationParams
from backend.routers.routers_auth import optional_require_role

# ===== Dependency =====
from backend.db import get_session as get_db
from backend.db_utils import transaction, get_by_id_or_404, paginate
from backend.import_resolver import import_names
from backend.errors import ErrorCode, http_error, internal_server_error


# ===== Endpoints =====
@router.get("/", response_model=PaginatedResponse[EnrollmentResponse])
def get_all_enrollments(
    request: Request,
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db),
):
    """Get all course enrollments"""
    try:
        (CourseEnrollment,) = import_names("models", "CourseEnrollment")

        query = db.query(CourseEnrollment).filter(CourseEnrollment.deleted_at.is_(None))
        result = paginate(query, skip=pagination.skip, limit=pagination.limit)
        logger.info(
            f"Retrieved {len(result.items)} enrollments (skip={pagination.skip}, limit={pagination.limit}, total={result.total})"
        )
        return result.dict()
    except Exception as exc:
        logger.error("Error retrieving all enrollments: %s", exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/course/{course_id}", response_model=List[EnrollmentResponse])
def list_course_enrollments(course_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        CourseEnrollment, Course = import_names("models", "CourseEnrollment", "Course")

        _course = get_by_id_or_404(db, Course, course_id)
        enrollments = (
            db.query(CourseEnrollment)
            .filter(CourseEnrollment.course_id == course_id, CourseEnrollment.deleted_at.is_(None))
            .all()
        )
        return enrollments
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing enrollments for course %s: %s", course_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/student/{student_id}", response_model=List[EnrollmentResponse])
def list_student_enrollments(student_id: int, request: Request, db: Session = Depends(get_db)):
    """Get all course enrollments for a specific student"""
    try:
        Student, CourseEnrollment = import_names("models", "Student", "CourseEnrollment")

        _student = get_by_id_or_404(db, Student, student_id)
        enrollments = (
            db.query(CourseEnrollment)
            .filter(CourseEnrollment.student_id == student_id, CourseEnrollment.deleted_at.is_(None))
            .all()
        )
        logger.info(f"Retrieved {len(enrollments)} enrollments for student {student_id}")
        return enrollments
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing enrollments for student %s: %s", student_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.get("/course/{course_id}/students", response_model=List[StudentBrief])
def list_enrolled_students(course_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        Course, Student, CourseEnrollment = import_names("models", "Course", "Student", "CourseEnrollment")

        _course = get_by_id_or_404(db, Course, course_id)
        q = (
            db.query(Student)
            .join(CourseEnrollment, CourseEnrollment.student_id == Student.id)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.deleted_at.is_(None),
                Student.deleted_at.is_(None),
            )
        )
        return q.all()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error listing students for course %s: %s", course_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.post("/course/{course_id}")
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
        CourseEnrollment, Course, Student = import_names("models", "CourseEnrollment", "Course", "Student")

        _course = get_by_id_or_404(db, Course, course_id)

        # Fetch all students at once to avoid N+1 queries
        students = db.query(Student).filter(Student.id.in_(payload.student_ids), Student.deleted_at.is_(None)).all()
        valid_student_ids = {s.id for s in students}

        created = 0
        reactivated = 0

        with transaction(db):
            for sid in payload.student_ids:
                if sid not in valid_student_ids:
                    continue
                # Use locking to prevent race conditions
                existing = (
                    db.query(CourseEnrollment)
                    .filter(CourseEnrollment.student_id == sid, CourseEnrollment.course_id == course_id)
                    .with_for_update()
                    .first()
                )
                if existing:
                    if existing.deleted_at is not None:
                        existing.deleted_at = None
                        if payload.enrolled_at:
                            existing.enrolled_at = payload.enrolled_at
                        reactivated += 1
                    continue
                enrollment = CourseEnrollment(student_id=sid, course_id=course_id, enrolled_at=payload.enrolled_at)
                db.add(enrollment)
                created += 1
            db.flush()

        logger.info(f"Enrolled {created} students and reactivated {reactivated} enrollments in course {course_id}")
        return {"created": created, "reactivated": reactivated}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error enrolling students in course %s: %s", course_id, exc, exc_info=True)
        raise internal_server_error(request=request)


@router.delete("/course/{course_id}/student/{student_id}")
def unenroll_student(
    course_id: int,
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    try:
        (CourseEnrollment,) = import_names("models", "CourseEnrollment")

        enrollment = (
            db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.student_id == student_id,
                CourseEnrollment.deleted_at.is_(None),
            )
            .first()
        )
        if not enrollment:
            raise http_error(
                status.HTTP_404_NOT_FOUND,
                ErrorCode.ENROLLMENT_NOT_FOUND,
                "Enrollment not found",
                request,
                context={"course_id": course_id, "student_id": student_id},
            )
        with transaction(db):
            enrollment.mark_deleted()
            db.flush()

        return {"message": "Unenrolled"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error unenrolling student %s from course %s: %s", student_id, course_id, exc, exc_info=True)
        raise internal_server_error(request=request)
