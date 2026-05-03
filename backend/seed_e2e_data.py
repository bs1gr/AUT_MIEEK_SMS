import sys
from datetime import date, timedelta
from pathlib import Path

# Ensure we can import backend modules FIRST
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import settings
from backend.models import Attendance, Base, Course, CourseEnrollment, Grade, Role, Student, User, UserRole
from backend.routers.routers_rbac import ensure_defaults_startup
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
    DATABASE_URL = settings.DATABASE_URL
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        ensure_defaults_startup(SessionLocal)
    except Exception:
        pass

    try:
        # Check if test users already exist
        existing_test_user = db.query(User).filter(User.email == "test@example.com").first()
        existing_admin_user = db.query(User).filter(User.email == "admin@example.com").first()

        if existing_test_user and existing_admin_user:
            if force:
                print("[WARN] Deleting existing test users for recreation...")
                db.delete(existing_test_user)
                db.delete(existing_admin_user)
                db.commit()
            else:
                print("[OK] Test data already exists, skipping seed")
                return

        print("Seeding E2E test data...")

        # Create test user (used by some tests)
        test_user = User(
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("Test@Pass123"),  # Meets password requirements
            role="admin",
            is_active=True,
        )
        db.add(test_user)

        # Create admin user (used by E2E tests: admin@example.com / YourSecurePassword123!)
        admin_user = User(
            email="admin@example.com",
            full_name="Admin User",
            hashed_password=get_password_hash("YourSecurePassword123!"),  # E2E test password
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        db.flush()

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if admin_role:
            for user in [test_user, admin_user]:
                existing = (
                    db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role_id == admin_role.id).first()
                )
                if not existing:
                    db.add(UserRole(user_id=user.id, role_id=admin_role.id))

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
            existing_student = db.query(Student).filter(Student.student_id == student_data["student_id"]).first()
            if not existing_student:
                student = Student(**student_data)
                db.add(student)
            else:
                print(f"[OK] Student {student_data['student_id']} already exists, skipping")

        # Create test courses (skip if they already exist)
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
            existing_course = db.query(Course).filter(Course.course_code == course_data["course_code"]).first()
            if not existing_course:
                course = Course(**course_data)
                db.add(course)
            else:
                print(f"[OK] Course {course_data['course_code']} already exists, skipping")

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

        today = date.today()
        grade_values = [88.0, 76.0, 93.0, 68.0]
        grade_count = 0
        attendance_count = 0
        for student_index, student in enumerate(students):
            for course_index, course in enumerate(courses):
                assignment_name = f"E2E Analytics Assessment {course.course_code}"
                existing_grade = (
                    db.query(Grade)
                    .filter(
                        Grade.student_id == student.id,
                        Grade.course_id == course.id,
                        Grade.assignment_name == assignment_name,
                    )
                    .first()
                )
                if not existing_grade:
                    db.add(
                        Grade(
                            student_id=student.id,
                            course_id=course.id,
                            assignment_name=assignment_name,
                            category="Exam" if course_index == 0 else "Coursework",
                            grade=grade_values[(student_index + course_index) % len(grade_values)],
                            max_grade=100.0,
                            weight=1.0,
                            date_assigned=today - timedelta(days=14 + course_index),
                            date_submitted=today - timedelta(days=7 + course_index),
                        )
                    )
                    grade_count += 1

                for day_offset in range(3):
                    attendance_date = today - timedelta(days=day_offset)
                    existing_attendance = (
                        db.query(Attendance)
                        .filter(
                            Attendance.student_id == student.id,
                            Attendance.course_id == course.id,
                            Attendance.date == attendance_date,
                        )
                        .first()
                    )
                    if not existing_attendance:
                        db.add(
                            Attendance(
                                student_id=student.id,
                                course_id=course.id,
                                date=attendance_date,
                                status="Absent" if (student_index + day_offset) % 5 == 0 else "Present",
                                period_number=1,
                                notes="E2E analytics seed",
                            )
                        )
                        attendance_count += 1

        db.commit()

        # Validate seeded data
        final_test_user = db.query(User).filter(User.email == "test@example.com").first()
        final_admin_user = db.query(User).filter(User.email == "admin@example.com").first()
        final_students = db.query(Student).all()
        final_courses = db.query(Course).all()
        final_enrollments = db.query(CourseEnrollment).all()
        final_grades = db.query(Grade).all()
        final_attendance = db.query(Attendance).all()

        print("[OK] E2E test data seeded successfully")
        print("\n=== SEED DATA VALIDATION ===")
        # nosec B101 - CWE-312 pragma: E2E test data only, not production
        print("✅ Test users created:")
        print("   - test@example.com (password: Test@Pass123)")
        print(f"     Role: {final_test_user.role if final_test_user else 'NOT FOUND'}")
        print(f"     Active: {final_test_user.is_active if final_test_user else 'NOT FOUND'}")
        print("   - admin@example.com (password: YourSecurePassword123!)")
        print(f"     Role: {final_admin_user.role if final_admin_user else 'NOT FOUND'}")
        print(f"     Active: {final_admin_user.is_active if final_admin_user else 'NOT FOUND'}")
        print(f"\n✅ Students in database: {len(final_students)}")
        for s in final_students[:5]:  # Show first 5
            print(f"   - {s.student_id}: {s.first_name} {s.last_name} ({s.email})")
        print(f"\n✅ Courses in database: {len(final_courses)}")
        for c in final_courses:
            print(f"   - {c.course_code}: {c.course_name} (Semester: {c.semester})")
        print(f"\n✅ Enrollments in database: {len(final_enrollments)}")
        print(f"   - Average enrollments per student: {len(final_enrollments) / max(len(final_students), 1):.1f}")
        print(f"\n✅ Grades in database: {len(final_grades)} ({grade_count} new)")
        print(f"✅ Attendance records in database: {len(final_attendance)} ({attendance_count} new)")
        print("\n=== END VALIDATION ===\n")

        # Verification checks
        if not final_test_user or not final_admin_user:
            raise RuntimeError("CRITICAL: Test users were not created!")
        if len(final_students) == 0:
            raise RuntimeError("CRITICAL: No students were created!")
        if len(final_courses) == 0:
            raise RuntimeError("CRITICAL: No courses were created!")
        if len(final_grades) == 0:
            raise RuntimeError("CRITICAL: No grades were created!")
        if len(final_attendance) == 0:
            raise RuntimeError("CRITICAL: No attendance records were created!")

        print("[SUCCESS] All validation checks passed ✅")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding data: {e}")
        import traceback

        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import sys

    force = "--force" in sys.argv
    seed_e2e_data(force=force)
