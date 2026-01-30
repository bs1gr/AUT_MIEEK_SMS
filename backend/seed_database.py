#!/usr/bin/env python3
"""
SMS Database Seeding Script
Populates the SMS database with comprehensive test data for training and demos.

Usage:
    python backend/seed_database.py                 # Uses default config
    python backend/seed_database.py --config seeds/custom_config.yml
    python backend/seed_database.py --dry-run      # Preview without changes
    python backend/seed_database.py --reset        # Clear and reseed
"""

import os
import sys
import random
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any
import hashlib

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
import yaml  # type: ignore[import-untyped]

from models import User, Role, Student, Course, Grade, Attendance, Enrollment
from dependencies import get_db_url

# Sample data seeds
FIRST_NAMES_EN = [
    "John",
    "Jane",
    "Michael",
    "Sarah",
    "David",
    "Emily",
    "Robert",
    "Jennifer",
    "James",
    "Maria",
    "William",
    "Jessica",
    "Richard",
    "Linda",
    "Joseph",
    "Barbara",
    "Thomas",
    "Patricia",
    "Charles",
    "Samantha",
    "Christopher",
    "Angela",
    "Daniel",
    "Anna",
    "Matthew",
    "Melissa",
    "Anthony",
    "Deborah",
    "Mark",
    "Stephanie",
    "Donald",
    "Rachel",
    "Steven",
    "Cynthia",
    "Paul",
    "Kathleen",
    "Andrew",
    "Amy",
    "Joshua",
    "Angela",
    "Kenneth",
    "Shirley",
    "Kevin",
    "Catherine",
    "Brian",
    "Karen",
    "Edward",
    "Carolyn",
]

LAST_NAMES_EN = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Perez",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
    "Young",
    "Walker",
    "Allen",
    "King",
    "Wright",
    "Scott",
    "Torres",
    "Peterson",
    "Phillips",
    "Campbell",
    "Parker",
    "Evans",
    "Edwards",
    "Collins",
    "Reeves",
    "Stewart",
]

COURSE_CODES = [
    "CS101",
    "CS102",
    "CS201",
    "CS202",
    "CS301",
    "MATH101",
    "MATH102",
    "MATH201",
    "MATH202",
    "ENG101",
    "ENG102",
    "ENG201",
    "ENG202",
    "PHY101",
    "PHY102",
    "PHY201",
    "CHEM101",
    "CHEM102",
    "BIO101",
    "BIO102",
    "HIS101",
    "HIS102",
    "PSY101",
    "PSY102",
]

COURSE_NAMES = {
    "CS101": "Introduction to Programming",
    "CS102": "Python Fundamentals",
    "CS201": "Web Development Basics",
    "CS202": "Advanced Python",
    "CS301": "Database Design",
    "MATH101": "Calculus I",
    "MATH102": "Linear Algebra",
    "MATH201": "Calculus II",
    "MATH202": "Differential Equations",
    "ENG101": "English Composition",
    "ENG102": "Literature",
    "ENG201": "Advanced Writing",
    "ENG202": "Critical Analysis",
    "PHY101": "Physics I",
    "PHY102": "Physics II",
    "PHY201": "Modern Physics",
    "CHEM101": "General Chemistry",
    "CHEM102": "Organic Chemistry",
    "BIO101": "Biology I",
    "BIO102": "Biology II",
    "HIS101": "World History",
    "HIS102": "American History",
    "PSY101": "Introduction to Psychology",
    "PSY102": "Developmental Psychology",
}


class DatabaseSeeder:
    """Handles database seeding with test data."""

    def __init__(self, config_path: str = None, dry_run: bool = False):
        """Initialize seeder with configuration."""
        self.dry_run = dry_run
        self.config = self._load_config(config_path)
        self.engine = create_engine(get_db_url(), echo=False)
        self.Session = sessionmaker(bind=self.engine)
        self.session = None

    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load seeding configuration from file or use defaults."""
        defaults = {
            "num_students": 500,
            "num_teachers": 25,
            "num_admins": 2,
            "courses_per_teacher": 3,
            "students_per_course": 40,
            "grade_range": [60, 100],
            "attendance_rate": 0.85,  # 85% average attendance
        }

        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    file_config = yaml.safe_load(f) or {}
                defaults.update(file_config)
                print(f"✓ Loaded config from {config_path}")
            except Exception as e:
                print(f"⚠ Warning: Could not load config {config_path}: {e}")
                print("  Using default configuration")

        return defaults

    def start(self):
        """Start seeding process."""
        self.session = self.Session()
        try:
            print("\n" + "=" * 60)
            print("SMS Database Seeding")
            print("=" * 60)

            if self.dry_run:
                print("📋 DRY RUN MODE - No changes will be made")

            # Check database
            self._verify_database()

            # Create seed data
            print("\n1. Creating roles and permissions...")
            self._seed_roles_and_permissions()

            print("\n2. Creating admin users...")
            self._seed_admins()

            print("\n3. Creating teachers...")
            self._seed_teachers()

            print("\n4. Creating courses...")
            self._seed_courses()

            print("\n5. Creating students...")
            self._seed_students()

            print("\n6. Enrolling students in courses...")
            self._seed_enrollments()

            print("\n7. Adding grades...")
            self._seed_grades()

            print("\n8. Recording attendance...")
            self._seed_attendance()

            # Commit changes
            if not self.dry_run:
                print("\n9. Committing changes to database...")
                self.session.commit()
                print("✓ All changes committed successfully")
            else:
                print("\n9. Rolling back dry-run...")
                self.session.rollback()
                print("✓ Dry-run complete - no changes made")

            self._print_summary()
            print("\n" + "=" * 60)

        except Exception as e:
            print(f"\n✗ Error during seeding: {e}")
            self.session.rollback()
            raise
        finally:
            self.session.close()

    def _verify_database(self):
        """Verify database exists and migrations are current."""
        inspector = inspect(self.engine)
        tables = inspector.get_table_names()

        required_tables = ["user", "role", "student", "course", "enrollment"]
        missing_tables = [t for t in required_tables if t not in tables]

        if missing_tables:
            raise RuntimeError(
                f"Database missing required tables: {missing_tables}\nRun migrations first: alembic upgrade head"
            )

        print(f"✓ Database verified ({len(tables)} tables found)")

    def _seed_roles_and_permissions(self):
        """Create roles and permissions."""
        # Check if roles already exist
        existing_roles = self.session.query(Role).count()
        if existing_roles > 0:
            print(f"  ℹ {existing_roles} roles already exist, skipping")
            return

        # Create standard roles
        roles = {
            "admin": Role(name="admin", description="Administrator"),
            "teacher": Role(name="teacher", description="Teacher"),
            "student": Role(name="student", description="Student"),
            "viewer": Role(name="viewer", description="Viewer (read-only)"),
        }

        for role in roles.values():
            self.session.add(role)
        self.session.flush()

        print(f"  ✓ Created {len(roles)} roles")

    def _seed_admins(self):
        """Create admin users."""
        # Check if admin user exists
        existing_admin = self.session.query(User).filter(User.role_name == "admin").first()

        if existing_admin:
            print(f"  ℹ Admin user exists: {existing_admin.email}")
            return

        admin_role = self.session.query(Role).filter_by(name="admin").first()

        admins = [
            User(
                email="admin@studentmanagement.local",
                full_name="System Administrator",
                password_hash=self._hash_password("admin123!"),
                role=admin_role,
                is_active=True,
            ),
            User(
                email="admin2@studentmanagement.local",
                full_name="Backup Administrator",
                password_hash=self._hash_password("admin456!"),
                role=admin_role,
                is_active=True,
            ),
        ]

        for admin in admins:
            self.session.add(admin)

        self.session.flush()
        print(f"  ✓ Created {len(admins)} admin users")

    def _seed_teachers(self):
        """Create teacher users."""
        # Check if teachers already exist
        teacher_role = self.session.query(Role).filter_by(name="teacher").first()
        existing_teachers = self.session.query(User).filter_by(role=teacher_role).count()

        if existing_teachers > 0:
            print(f"  ℹ {existing_teachers} teachers already exist, skipping")
            return

        num_teachers = self.config.get("num_teachers", 25)
        teachers = []

        for i in range(num_teachers):
            first_name = random.choice(FIRST_NAMES_EN)
            last_name = random.choice(LAST_NAMES_EN)
            email = f"teacher{i + 1}@studentmanagement.local"

            teacher = User(
                email=email,
                full_name=f"{first_name} {last_name}",
                password_hash=self._hash_password(f"teacher{i + 1}!"),
                role=teacher_role,
                is_active=True,
            )
            teachers.append(teacher)
            self.session.add(teacher)

        self.session.flush()
        print(f"  ✓ Created {len(teachers)} teachers")

    def _seed_courses(self):
        """Create courses."""
        # Check if courses exist
        existing_courses = self.session.query(Course).count()
        if existing_courses > 0:
            print(f"  ℹ {existing_courses} courses already exist, skipping")
            return

        teacher_role = self.session.query(Role).filter_by(name="teacher").first()
        teachers = self.session.query(User).filter_by(role=teacher_role).all()
        courses_per_teacher = self.config.get("courses_per_teacher", 3)

        courses = []
        course_idx = 0

        for teacher in teachers:
            for _ in range(courses_per_teacher):
                if course_idx >= len(COURSE_CODES):
                    break

                course_code = COURSE_CODES[course_idx]
                course_name = COURSE_NAMES.get(course_code, f"Course {course_code}")

                course = Course(
                    code=course_code,
                    name=course_name,
                    description=f"This is {course_name}. This course covers the fundamentals and practical applications.",
                    instructor=teacher,
                    semester="Spring 2026",
                    max_students=50,
                    is_active=True,
                )
                courses.append(course)
                self.session.add(course)
                course_idx += 1

        self.session.flush()
        print(f"  ✓ Created {len(courses)} courses")

    def _seed_students(self):
        """Create student users."""
        # Check if students exist
        student_role = self.session.query(Role).filter_by(name="student").first()
        existing_students = self.session.query(User).filter_by(role=student_role).count()

        if existing_students > 0:
            print(f"  ℹ {existing_students} students already exist, skipping")
            return

        num_students = self.config.get("num_students", 500)
        students = []

        for i in range(num_students):
            first_name = random.choice(FIRST_NAMES_EN)
            last_name = random.choice(LAST_NAMES_EN)
            student_id = f"STU{i + 1:05d}"
            email = f"student{i + 1}@studentmanagement.local"

            user = User(
                email=email,
                full_name=f"{first_name} {last_name}",
                password_hash=self._hash_password(f"student{i + 1}!"),
                role=student_role,
                is_active=True,
            )
            self.session.add(user)
            self.session.flush()

            student = Student(
                user=user,
                student_id=student_id,
                enrollment_date=datetime.now() - timedelta(days=random.randint(0, 365)),
                is_active=True,
            )
            students.append(student)
            self.session.add(student)

        self.session.flush()
        print(f"  ✓ Created {len(students)} students")

    def _seed_enrollments(self):
        """Enroll students in courses."""
        # Check if enrollments exist
        existing_enrollments = self.session.query(Enrollment).count()
        if existing_enrollments > 0:
            print(f"  ℹ {existing_enrollments} enrollments already exist, skipping")
            return

        students = self.session.query(Student).all()
        courses = self.session.query(Course).all()
        students_per_course = self.config.get("students_per_course", 40)

        enrollments = []

        for course in courses:
            # Randomly select students for this course
            selected_students = random.sample(students, min(students_per_course, len(students)))

            for student in selected_students:
                enrollment = Enrollment(
                    student=student,
                    course=course,
                    enrollment_date=datetime.now() - timedelta(days=random.randint(1, 30)),
                    is_active=True,
                )
                enrollments.append(enrollment)
                self.session.add(enrollment)

        self.session.flush()
        print(f"  ✓ Created {len(enrollments)} enrollments")

    def _seed_grades(self):
        """Add grades for enrolled students."""
        # Check if grades exist
        existing_grades = self.session.query(Grade).count()
        if existing_grades > 0:
            print(f"  ℹ {existing_grades} grades already exist, skipping")
            return

        enrollments = self.session.query(Enrollment).filter_by(is_active=True).all()
        grade_range = self.config.get("grade_range", [60, 100])

        grades = []
        assessment_types = [
            ("Assignment 1", "assignment"),
            ("Assignment 2", "assignment"),
            ("Midterm Exam", "exam"),
            ("Assignment 3", "assignment"),
            ("Final Project", "project"),
            ("Final Exam", "exam"),
        ]

        for enrollment in enrollments:
            for assessment_name, assessment_type in assessment_types:
                score = random.randint(grade_range[0], grade_range[1])

                grade = Grade(
                    enrollment=enrollment,
                    assessment_name=assessment_name,
                    assessment_type=assessment_type,
                    score=score,
                    max_score=100,
                    grade_date=datetime.now() - timedelta(days=random.randint(0, 100)),
                    notes=f"Score: {score}/100" if random.random() > 0.8 else None,
                )
                grades.append(grade)
                self.session.add(grade)

        self.session.flush()
        print(f"  ✓ Created {len(grades)} grades")

    def _seed_attendance(self):
        """Record attendance for enrolled students."""
        # Check if attendance records exist
        existing_attendance = self.session.query(Attendance).count()
        if existing_attendance > 0:
            print(f"  ℹ {existing_attendance} attendance records already exist, skipping")
            return

        enrollments = self.session.query(Enrollment).filter_by(is_active=True).all()
        attendance_rate = self.config.get("attendance_rate", 0.85)

        attendance_records = []

        # Generate 60 class days
        for day_offset in range(60):
            class_date = datetime.now() - timedelta(days=60 - day_offset)

            for enrollment in enrollments:
                # Determine if student attended (based on attendance_rate)
                attended = random.random() < attendance_rate

                record = Attendance(
                    enrollment=enrollment,
                    attendance_date=class_date,
                    is_present=attended,
                    notes="Present" if attended else "Absent",
                )
                attendance_records.append(record)
                self.session.add(record)

        self.session.flush()
        print(f"  ✓ Created {len(attendance_records)} attendance records")

    def _hash_password(self, password: str) -> str:
        """Hash password (simplified for seeding)."""
        # In production, use bcrypt or similar
        return hashlib.sha256(password.encode()).hexdigest()

    def _print_summary(self):
        """Print summary of created data."""
        print("\n" + "-" * 60)
        print("Summary of Seeded Data")
        print("-" * 60)

        summary = {
            "Roles": self.session.query(Role).count(),
            "Users (Admin)": self.session.query(User).filter_by(role_name="admin").count(),
            "Users (Teacher)": self.session.query(User).filter_by(role_name="teacher").count(),
            "Users (Student)": self.session.query(User).filter_by(role_name="student").count(),
            "Students": self.session.query(Student).count(),
            "Courses": self.session.query(Course).count(),
            "Enrollments": self.session.query(Enrollment).count(),
            "Grades": self.session.query(Grade).count(),
            "Attendance Records": self.session.query(Attendance).count(),
        }

        for label, count in summary.items():
            print(f"  {label:.<40} {count:>10}")

        print("-" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="SMS Database Seeding Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python backend/seed_database.py                    # Use defaults
  python backend/seed_database.py --dry-run          # Preview only
  python backend/seed_database.py --config seeds/custom.yml
  python backend/seed_database.py --reset            # Clear and reseed
        """,
    )

    parser.add_argument("--config", type=str, help="Path to YAML config file with seed parameters")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without modifying database")
    parser.add_argument("--reset", action="store_true", help="Clear existing data before seeding (CAUTION: Data loss!)")

    args = parser.parse_args()

    try:
        seeder = DatabaseSeeder(config_path=args.config, dry_run=args.dry_run)
        seeder.start()

        print("\n✓ Database seeding completed successfully!")
        return 0

    except Exception as e:
        print(f"\n✗ Database seeding failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
