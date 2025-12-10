#!/usr/bin/env python3
"""Seed E2E test data in Docker container."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import User, Student, Course, Base
from backend.routers.routers_auth import get_password_hash

# Connect to Docker database
DATABASE_URL = "sqlite:////data/student_management.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
try:
    # Check if test user exists
    existing = db.query(User).filter(User.email == "test@example.com").first()
    
    if existing:
        print("✓ Test user already exists")
        print(f"  Email: {existing.email}")
        print(f"  Role: {existing.role}")
        print(f"  Active: {existing.is_active}")
    else:
        # Create test user
        test_user = User(
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("password123"),
            role="admin",
            is_active=True
        )
        db.add(test_user)
        db.commit()
        print("✓ Created test user: test@example.com (password: password123)")

    # Add test students if they don't exist
    student_count = db.query(Student).count()
    if student_count == 0:
        students_data = [
            {"first_name": "John", "last_name": "Doe", "email": "john.doe@example.com", "student_id": "S001"},
            {"first_name": "Jane", "last_name": "Smith", "email": "jane.smith@example.com", "student_id": "S002"},
            {"first_name": "Alice", "last_name": "Johnson", "email": "alice.j@example.com", "student_id": "S003"},
            {"first_name": "Bob", "last_name": "Williams", "email": "bob.w@example.com", "student_id": "S004"},
        ]
        
        for student_data in students_data:
            student = Student(**student_data)
            db.add(student)
        
        db.commit()
        print(f"✓ Created {len(students_data)} test students")
    else:
        print(f"✓ {student_count} students already exist")

    # Add test courses if they don't exist
    course_count = db.query(Course).count()
    if course_count == 0:
        courses_data = [
            {"course_code": "CS101", "course_name": "Introduction to Computer Science", "semester": "Fall 2024"},
            {"course_code": "MATH201", "course_name": "Calculus II", "semester": "Fall 2024"},
        ]
        
        for course_data in courses_data:
            course = Course(**course_data)
            db.add(course)
        
        db.commit()
        print(f"✓ Created {len(courses_data)} test courses")
    else:
        print(f"✓ {course_count} courses already exist")

except Exception as e:
    print(f"✗ Error: {e}")
    db.rollback()
    raise
finally:
    db.close()
