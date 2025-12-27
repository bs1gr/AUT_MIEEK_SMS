"""Enrollment business logic service."""

import logging
from datetime import date
from typing import Dict, List

from sqlalchemy.orm import Session

from backend.db_utils import get_by_id_or_404, paginate
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names
from backend.schemas.common import PaginationParams
from backend.schemas.enrollments import (
    EnrollmentCreate,
    EnrollmentResponse,
    StudentBrief,
)

logger = logging.getLogger(__name__)


class EnrollmentService:
    """Service for managing course enrollments."""

    @staticmethod
    def get_all_enrollments(db: Session, pagination: PaginationParams):
        """
        Get all course enrollments with pagination.

        Args:
            db: Database session
            pagination: Pagination parameters

        Returns:
            Paginated enrollment response
        """
        (CourseEnrollment,) = import_names("models", "CourseEnrollment")

        query = db.query(CourseEnrollment).filter(CourseEnrollment.deleted_at.is_(None))
        result = paginate(query, skip=pagination.skip, limit=pagination.limit)

        logger.info(
            f"Retrieved {len(result.items)} enrollments (skip={pagination.skip}, limit={pagination.limit}, total={result.total})"
        )

        return result.dict()

    @staticmethod
    def list_course_enrollments(db: Session, course_id: int, request=None) -> List[EnrollmentResponse]:
        """
        Get all enrollments for a specific course.

        Args:
            db: Database session
            course_id: Course ID
            request: Optional request object for error context

        Returns:
            List of enrollments

        Raises:
            HTTPException: If course not found
        """
        CourseEnrollment, Course = import_names("models", "CourseEnrollment", "Course")

        # Verify course exists
        get_by_id_or_404(db, Course, course_id)

        enrollments = (
            db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.deleted_at.is_(None),
            )
            .all()
        )

        logger.info(f"Retrieved {len(enrollments)} enrollments for course {course_id}")

        return enrollments

    @staticmethod
    def list_student_enrollments(db: Session, student_id: int, request=None) -> List[EnrollmentResponse]:
        """
        Get all enrollments for a specific student.

        Args:
            db: Database session
            student_id: Student ID
            request: Optional request object for error context

        Returns:
            List of enrollments

        Raises:
            HTTPException: If student not found
        """
        Student, CourseEnrollment = import_names("models", "Student", "CourseEnrollment")

        # Verify student exists
        get_by_id_or_404(db, Student, student_id)

        enrollments = (
            db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.student_id == student_id,
                CourseEnrollment.deleted_at.is_(None),
            )
            .all()
        )

        logger.info(f"Retrieved {len(enrollments)} enrollments for student {student_id}")

        return enrollments

    @staticmethod
    def list_enrolled_students(db: Session, course_id: int, request=None) -> List[StudentBrief]:
        """
        Get all students enrolled in a course.

        Args:
            db: Database session
            course_id: Course ID
            request: Optional request object for error context

        Returns:
            List of enrolled students

        Raises:
            HTTPException: If course not found
        """
        Course, Student, CourseEnrollment = import_names("models", "Course", "Student", "CourseEnrollment")

        # Verify course exists
        _course = get_by_id_or_404(db, Course, course_id)

        students = (
            db.query(Student)
            .join(CourseEnrollment, CourseEnrollment.student_id == Student.id)
            .filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.deleted_at.is_(None),
                Student.deleted_at.is_(None),
            )
            .all()
        )

        logger.info(f"Retrieved {len(students)} students enrolled in course {course_id}")

        return students

    @staticmethod
    def enroll_students(db: Session, course_id: int, payload: EnrollmentCreate, request=None) -> Dict[str, int]:
        """
        Enroll multiple students in a course.

        Uses database locking to prevent race conditions and handles:
        - Invalid student IDs (skipped)
        - Duplicate enrollments (reactivated if soft-deleted)
        - Concurrent enrollment attempts (with_for_update)

        Args:
            db: Database session
            course_id: Course ID
            payload: Enrollment data with student IDs and optional enrollment date
            request: Optional request object for error context

        Returns:
            Dict with counts: {"created": int, "reactivated": int}

        Raises:
            HTTPException: If course not found
        """
        CourseEnrollment, Course, Student = import_names("models", "CourseEnrollment", "Course", "Student")

        # Verify course exists
        _course = get_by_id_or_404(db, Course, course_id)

        # Fetch all students at once to avoid N+1 queries
        students = db.query(Student).filter(Student.id.in_(payload.student_ids), Student.deleted_at.is_(None)).all()
        valid_student_ids = {s.id for s in students}

        if not valid_student_ids:
            logger.warning(f"No valid students found for enrollment in course {course_id}")
            return {"created": 0, "reactivated": 0}

        created = 0
        reactivated = 0

        for sid in payload.student_ids:
            if sid not in valid_student_ids:
                logger.debug(f"Skipping invalid student ID {sid} for enrollment")
                continue

            # Use locking to prevent race conditions
            existing = (
                db.query(CourseEnrollment)
                .filter(
                    CourseEnrollment.student_id == sid,
                    CourseEnrollment.course_id == course_id,
                )
                .with_for_update()
                .first()
            )

            if existing:
                # Reactivate if soft-deleted
                if existing.deleted_at is not None:
                    existing.deleted_at = None
                    if payload.enrolled_at:
                        existing.enrolled_at = payload.enrolled_at
                    reactivated += 1
                    logger.debug(f"Reactivated enrollment for student {sid} in course {course_id}")
                else:
                    logger.debug(f"Student {sid} already enrolled in course {course_id}")
                continue

            # Create new enrollment
            enrollment = CourseEnrollment(
                student_id=sid,
                course_id=course_id,
                enrolled_at=payload.enrolled_at or date.today(),
            )
            db.add(enrollment)
            created += 1

        db.flush()

        logger.info(f"Enrolled {created} students and reactivated {reactivated} enrollments in course {course_id}")

        return {"created": created, "reactivated": reactivated}

    @staticmethod
    def unenroll_student(db: Session, course_id: int, student_id: int, request=None) -> Dict[str, str]:
        """
        Unenroll a student from a course (soft delete).

        Args:
            db: Database session
            course_id: Course ID
            student_id: Student ID
            request: Optional request object for error context

        Returns:
            Dict with message: {"message": "Unenrolled"}

        Raises:
            HTTPException: If enrollment not found
        """
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
                404,
                ErrorCode.ENROLLMENT_NOT_FOUND,
                "Enrollment not found",
                request,
                context={"course_id": course_id, "student_id": student_id},
            )

        enrollment.mark_deleted()
        db.flush()

        logger.info(f"Unenrolled student {student_id} from course {course_id}")

        return {"message": "Unenrolled"}
