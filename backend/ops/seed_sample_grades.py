"""Seed script to create sample grade data for testing report templates.

Run directly: python -m backend.ops.seed_sample_grades
Or from python: seed_sample_grades(db)
"""

import logging
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from backend.models import Course, Grade, Student

logger = logging.getLogger(__name__)


def get_sample_grades() -> List[Dict[str, Any]]:
    """Generate sample grade data for testing.

    Creates grades for all students/courses combinations with varying scores.
    Includes some low grades (<60) for at-risk student reports.
    """
    return [
        # High achieving students
        {"student_id": 1, "course_id": 1, "grade": 92, "category": "exam", "days_ago": 30},
        {"student_id": 1, "course_id": 2, "grade": 88, "category": "exam", "days_ago": 25},
        {"student_id": 1, "course_id": 3, "grade": 95, "category": "project", "days_ago": 20},

        # Average students
        {"student_id": 2, "course_id": 1, "grade": 75, "category": "exam", "days_ago": 30},
        {"student_id": 2, "course_id": 2, "grade": 78, "category": "exam", "days_ago": 25},
        {"student_id": 2, "course_id": 3, "grade": 72, "category": "assignment", "days_ago": 20},

        # At-risk students (low grades)
        {"student_id": 3, "course_id": 1, "grade": 45, "category": "exam", "days_ago": 30},
        {"student_id": 3, "course_id": 2, "grade": 52, "category": "exam", "days_ago": 25},
        {"student_id": 3, "course_id": 3, "grade": 38, "category": "project", "days_ago": 20},

        {"student_id": 4, "course_id": 1, "grade": 55, "category": "exam", "days_ago": 28},
        {"student_id": 4, "course_id": 2, "grade": 48, "category": "exam", "days_ago": 22},
        {"student_id": 4, "course_id": 3, "grade": 58, "category": "assignment", "days_ago": 18},

        # Mid-range students
        {"student_id": 5, "course_id": 1, "grade": 82, "category": "exam", "days_ago": 29},
        {"student_id": 5, "course_id": 2, "grade": 85, "category": "exam", "days_ago": 24},
        {"student_id": 5, "course_id": 3, "grade": 80, "category": "project", "days_ago": 19},

        # More at-risk
        {"student_id": 6, "course_id": 1, "grade": 42, "category": "exam", "days_ago": 31},
        {"student_id": 6, "course_id": 2, "grade": 50, "category": "exam", "days_ago": 26},

        # Mixed performance
        {"student_id": 7, "course_id": 1, "grade": 68, "category": "exam", "days_ago": 27},
        {"student_id": 7, "course_id": 2, "grade": 71, "category": "exam", "days_ago": 23},
        {"student_id": 7, "course_id": 3, "grade": 75, "category": "project", "days_ago": 21},

        {"student_id": 8, "course_id": 1, "grade": 89, "category": "exam", "days_ago": 32},
        {"student_id": 8, "course_id": 2, "grade": 91, "category": "exam", "days_ago": 27},

        # Low achiever
        {"student_id": 9, "course_id": 1, "grade": 35, "category": "exam", "days_ago": 28},
        {"student_id": 9, "course_id": 3, "grade": 40, "category": "project", "days_ago": 19},

        # Good student
        {"student_id": 10, "course_id": 2, "grade": 87, "category": "exam", "days_ago": 26},
        {"student_id": 10, "course_id": 3, "grade": 90, "category": "assignment", "days_ago": 17},
    ]


def seed_sample_grades(db: Session) -> int:
    """Seed sample grade data into the database.

    Args:
        db: Database session

    Returns:
        Number of grades created
    """
    # First, check how many students and courses exist
    student_count = db.query(Student).filter(Student.deleted_at.is_(None)).count()
    course_count = db.query(Course).filter(Course.deleted_at.is_(None)).count()

    if student_count == 0 or course_count == 0:
        logger.warning(f"Not enough data to seed grades: {student_count} students, {course_count} courses")
        logger.warning("Make sure students and courses are seeded first")
        return 0

    logger.info(f"Found {student_count} students and {course_count} courses")

    # Get sample data
    sample_grades = get_sample_grades()
    created_count = 0
    today = date.today()

    for grade_data in sample_grades:
        student_id = grade_data["student_id"]
        course_id = grade_data["course_id"]

        # Verify student and course exist
        student = db.query(Student).filter(
            Student.id == student_id,
            Student.deleted_at.is_(None)
        ).first()

        course = db.query(Course).filter(
            Course.id == course_id,
            Course.deleted_at.is_(None)
        ).first()

        if not student or not course:
            logger.warning(f"Skipping grade for student {student_id}, course {course_id} - not found")
            continue

        # Check if grade already exists
        existing = db.query(Grade).filter(
            Grade.student_id == student_id,
            Grade.course_id == course_id,
            Grade.assignment_name == "Sample Assignment",
            Grade.deleted_at.is_(None)
        ).first()

        if existing:
            logger.debug(f"Grade already exists for student {student_id}, course {course_id}")
            continue

        # Create grade
        date_assigned = today - timedelta(days=grade_data["days_ago"])
        grade = Grade(
            student_id=student_id,
            course_id=course_id,
            assignment_name=f"Sample {grade_data['category'].title()} Assignment",
            category=grade_data["category"],
            grade=grade_data["grade"],
            max_grade=100.0,
            weight=1.0,
            date_assigned=date_assigned,
            date_submitted=date_assigned + timedelta(days=1),
            notes=f"Sample grade for testing ({grade_data['grade']}/100)"
        )

        db.add(grade)
        created_count += 1
        logger.debug(f"Created grade: student {student_id}, course {course_id}, grade {grade_data['grade']}")

    if created_count > 0:
        db.commit()
        logger.info(f"Successfully seeded {created_count} grades")
    else:
        logger.info("No new grades to seed")

    return created_count


if __name__ == "__main__":
    # For direct execution
    from backend.db import SessionLocal

    db = SessionLocal()
    try:
        count = seed_sample_grades(db)
        print(f"Seeded {count} grades")
    finally:
        db.close()
