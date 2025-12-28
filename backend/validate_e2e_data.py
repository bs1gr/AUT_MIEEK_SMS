"""Validate E2E test data exists and is accessible.

This script checks that the seed_e2e_data.py script successfully created
all necessary test data for E2E tests.

Exit codes:
- 0: All validation checks passed
- 1: Validation failed (missing data or inaccessible)
"""

import sys
from pathlib import Path

# Ensure we can import backend modules
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import User, Student, Course, CourseEnrollment


def validate_e2e_data():
    """Validate that E2E test data exists and is accessible."""
    DATABASE_URL = "sqlite:///./data/student_management.db"

    try:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        print("Validating E2E test data...")

        # Check test user exists
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("❌ FAILED: Test user 'test@example.com' not found")
            return False
        print(f"✅ Test user found: {test_user.email} (role: {test_user.role})")

        # Verify password can be checked (hashed_password exists)
        if not test_user.hashed_password:
            print("❌ FAILED: Test user has no hashed_password")
            return False
        print(f"✅ Test user has hashed password: {test_user.hashed_password[:20]}...")

        # Check students exist
        student_count = db.query(Student).count()
        if student_count < 4:
            print(f"❌ FAILED: Expected at least 4 students, found {student_count}")
            return False
        print(f"✅ Students found: {student_count}")

        # List students for verification
        students = db.query(Student).limit(5).all()
        for s in students:
            print(f"   - {s.student_id}: {s.first_name} {s.last_name} ({s.email})")

        # Check courses exist
        course_count = db.query(Course).count()
        if course_count < 2:
            print(f"❌ FAILED: Expected at least 2 courses, found {course_count}")
            return False
        print(f"✅ Courses found: {course_count}")

        # List courses for verification
        courses = db.query(Course).limit(5).all()
        for c in courses:
            print(f"   - {c.course_code}: {c.course_name} ({c.semester})")

        # Check enrollments exist
        enrollment_count = db.query(CourseEnrollment).count()
        if enrollment_count < 8:  # 4 students * 2 courses minimum
            print(f"❌ FAILED: Expected at least 8 enrollments (4 students × 2 courses), found {enrollment_count}")
            return False
        print(f"✅ Enrollments found: {enrollment_count}")

        print("\n✅ All E2E data validation checks passed!")
        return True

    except Exception as e:
        print(f"❌ FAILED: Validation error: {e}")
        import traceback

        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = validate_e2e_data()
    sys.exit(0 if success else 1)
