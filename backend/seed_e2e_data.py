"""Seed test data for E2E tests.

This script creates test users, students, courses, and other entities
needed for end-to-end testing.

Run from project root: python backend/seed_e2e_data.py
"""

import sys
from pathlib import Path

# Ensure we can import backend modules
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import User, Student, Course, Base
from backend.routers.routers_auth import get_password_hash


def seed_e2e_data():
    """Seed database with E2E test data."""
    # Use SQLite database
    DATABASE_URL = "sqlite:///./data/student_management.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if test user already exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if existing_user:
            print("✓ Test data already exists, skipping seed")
            return
        
        print("Seeding E2E test data...")
        
        # Create test user
        test_user = User(
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("password123"),
            role="admin",
            is_active=True
        )
        db.add(test_user)
        db.flush()
        
        # Create test students
        students_data = [
            {"first_name": "John", "last_name": "Doe", "email": "john.doe@example.com", "student_id": "S001"},
            {"first_name": "Jane", "last_name": "Smith", "email": "jane.smith@example.com", "student_id": "S002"},
            {"first_name": "Alice", "last_name": "Johnson", "email": "alice.j@example.com", "student_id": "S003"},
            {"first_name": "Bob", "last_name": "Williams", "email": "bob.w@example.com", "student_id": "S004"},
        ]
        
        for student_data in students_data:
            student = Student(**student_data)
            db.add(student)
        
        # Create test courses
        courses_data = [
            {"course_code": "CS101", "course_name": "Introduction to Computer Science", "semester": "Fall 2024"},
            {"course_code": "MATH201", "course_name": "Calculus II", "semester": "Fall 2024"},
        ]
        
        for course_data in courses_data:
            course = Course(**course_data)
            db.add(course)
        
        db.commit()
        print("✓ E2E test data seeded successfully")
        print(f"  - Created test user: test@example.com (password: password123)")
        print(f"  - Created {len(students_data)} students")
        print(f"  - Created {len(courses_data)} courses")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_e2e_data()
