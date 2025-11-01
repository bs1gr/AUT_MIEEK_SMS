"""
Course Enrollments Router
Provides endpoints to manage student enrollments to courses.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enrollments", tags=["Enrollments"], responses={404: {"description": "Not found"}})

from backend.schemas.enrollments import EnrollmentCreate, EnrollmentResponse, StudentBrief
from backend.routers.routers_auth import optional_require_role

# ===== Dependency =====
from backend.db import get_session as get_db
from backend.import_resolver import import_names


# ===== Endpoints =====
@router.get("/", response_model=List[EnrollmentResponse])
def get_all_enrollments(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    """Get all course enrollments"""
    try:
        CourseEnrollment, = import_names('models', 'CourseEnrollment')

        enrollments = db.query(CourseEnrollment).offset(skip).limit(limit).all()
        logger.info(f"Retrieved {len(enrollments)} enrollments (skip={skip}, limit={limit})")
        return enrollments
    except Exception as e:
        logger.error(f"Error retrieving all enrollments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/course/{course_id}", response_model=List[EnrollmentResponse])
def list_course_enrollments(course_id: int, db: Session = Depends(get_db)):
    try:
        CourseEnrollment, Course = import_names('models', 'CourseEnrollment', 'Course')

        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).all()
        return enrollments
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing enrollments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/student/{student_id}", response_model=List[EnrollmentResponse])
def list_student_enrollments(student_id: int, db: Session = Depends(get_db)):
    """Get all course enrollments for a specific student"""
    try:
        Student, CourseEnrollment = import_names('models', 'Student', 'CourseEnrollment')

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.student_id == student_id).all()
        logger.info(f"Retrieved {len(enrollments)} enrollments for student {student_id}")
        return enrollments
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing student enrollments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/course/{course_id}/students", response_model=List[StudentBrief])
def list_enrolled_students(course_id: int, db: Session = Depends(get_db)):
    try:
        Course, Student, CourseEnrollment = import_names('models', 'Course', 'Student', 'CourseEnrollment')

        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        q = (
            db.query(Student)
            .join(CourseEnrollment, CourseEnrollment.student_id == Student.id)
            .filter(CourseEnrollment.course_id == course_id)
        )
        return q.all()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing enrolled students: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/course/{course_id}")
def enroll_students(
    course_id: int,
    payload: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    """
    Enroll multiple students in a course.
    Uses database locking to prevent race conditions.
    """
    try:
        CourseEnrollment, Course, Student = import_names('models', 'CourseEnrollment', 'Course', 'Student')

        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Fetch all students at once to avoid N+1 queries
        students = db.query(Student).filter(Student.id.in_(payload.student_ids)).all()
        valid_student_ids = {s.id for s in students}

        created = 0
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
                continue
            enrollment = CourseEnrollment(student_id=sid, course_id=course_id, enrolled_at=payload.enrolled_at)
            db.add(enrollment)
            created += 1
        db.commit()
        logger.info(f"Enrolled {created} students in course {course_id}")
        return {"created": created}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error enrolling students: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/course/{course_id}/student/{student_id}")
def unenroll_student(
    course_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin", "teacher")),
):
    try:
        CourseEnrollment, = import_names('models', 'CourseEnrollment')

        enrollment = (
            db.query(CourseEnrollment)
            .filter(CourseEnrollment.course_id == course_id, CourseEnrollment.student_id == student_id)
            .first()
        )
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        db.delete(enrollment)
        db.commit()
        return {"message": "Unenrolled"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error unenrolling student: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
