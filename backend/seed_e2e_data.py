import os
import sys
from pathlib import Path

# Ensure we can import backend modules FIRST
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import User, Student, Course, CourseEnrollment, Base
from backend.security.password_hash import get_password_hash

"""Seed test data for E2E tests.

This script creates test users, students, courses, and other entities
needed for end-to-end testing.

Run from project root: python backend/seed_e2e_data.py
In Docker: python /app/backend/seed_e2e_data.py
"""


def seed_e2e_data(force: bool = False):
    """Seed database with E2E test data.

    Args:
        force: If True, delete and recreate test user even if it exists
    """
    # Use the same database path logic as the main application
    is_docker = os.environ.get("SMS_EXECUTION_MODE", "native").lower() == "docker"
    if is_docker:
        db_path = "/data/student_management.db"
    else:
        db_path = str(Path(__file__).parent.parent / "data" / "student_management.db")
    DATABASE_URL = f"sqlite:///{db_path}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Check if test user already exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if existing_user:
            if force:
                print("⚠ Deleting existing test user for recreation...")
                db.delete(existing_user)
                db.commit()
            else:
                print("✓ Test data already exists, skipping seed")
                return

        print("Seeding E2E test data...")

        # Create test user
        test_user = User(
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("Test@Pass123"),  # Meets password requirements
            role="admin",
            is_active=True,
        )
        db.add(test_user)
        db.flush()

        # Create test students
        students_data = [
            {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "student_id": "S001",
            },
            {
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane.smith@example.com",
                "student_id": "S002",
            },
            {
                "first_name": "Alice",
                "last_name": "Johnson",
                "email": "alice.j@example.com",
                "student_id": "S003",
            },
            {
                "first_name": "Bob",
                "last_name": "Williams",
                "email": "bob.w@example.com",
                "student_id": "S004",
            },
        ]

        for student_data in students_data:
            student = Student(**student_data)
            db.add(student)

        # Create test courses
        courses_data = [
            {
                "course_code": "CS101",
                "course_name": "Introduction to Computer Science",
                "semester": "Fall 2024",
            },
            {
                "course_code": "MATH201",
                "course_name": "Calculus II",
                "semester": "Fall 2024",
            },
        ]

        for course_data in courses_data:
            course = Course(**course_data)
            db.add(course)

        db.flush()

        # Create enrollments for all students in all courses
        students = db.query(Student).all()
        courses = db.query(Course).all()

        enrollment_count = 0
        for student in students:
            for course in courses:
                # Check if enrollment already exists
                existing = (
                    db.query(CourseEnrollment)
                    .filter(
                        CourseEnrollment.student_id == student.id,
                        CourseEnrollment.course_id == course.id,
                    )
                    .first()
                )

                if not existing:
                    enrollment = CourseEnrollment(
                        student_id=student.id,
                        course_id=course.id,
                    )
                    db.add(enrollment)
                    enrollment_count += 1

        db.commit()
        print("✓ E2E test data seeded successfully")
        # nosec B101 - CWE-312 pragma: E2E test data only, not production
        print("  - Created test user: test@example.com (password: Test@Pass123)")
        print(f"  - Created {len(students_data)} students")
        print(f"  - Created {len(courses_data)} courses")
        print(f"  - Created {enrollment_count} enrollments")

    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import sys

    force = "--force" in sys.argv
    seed_e2e_data(force=force)
