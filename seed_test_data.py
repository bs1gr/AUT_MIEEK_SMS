#!/usr/bin/env python3
"""
Seed test data into the database for demonstration
"""

import sys

from backend.models import Student, Course, CourseEnrollment
from backend.db import engine
from sqlalchemy.orm import Session


def seed_data():
    """Populate database with test students and courses"""
    with Session(engine) as session:
        # Check if data already exists
        existing_students = session.query(Student).count()
        if existing_students > 0:
            print(f"✓ Database already has {existing_students} students, skipping seed")
            return

        # Create test students
        students_data = [
            {
                "first_name": "John",
                "last_name": "Anderson",
                "student_id": "STU001",
                "email": "john.anderson@school.edu",
                "phone": "+30123456789",
            },
            {
                "first_name": "Maria",
                "last_name": "Papadopoulos",
                "student_id": "STU002",
                "email": "maria.papadopoulos@school.edu",
                "phone": "+30987654321",
            },
            {
                "first_name": "Alexander",
                "last_name": "Dimitris",
                "student_id": "STU003",
                "email": "alex.dimitris@school.edu",
                "phone": "+30123123123",
            },
            {
                "first_name": "Sofia",
                "last_name": "Nikolaou",
                "student_id": "STU004",
                "email": "sofia.nikolaou@school.edu",
                "phone": "+30456456456",
            },
            {
                "first_name": "Georgios",
                "last_name": "Vasiliadis",
                "student_id": "STU005",
                "email": "georgios.v@school.edu",
                "phone": "+30789789789",
            },
        ]

        students = []
        for data in students_data:
            student = Student(**data)
            session.add(student)
            students.append(student)

        session.flush()  # Get IDs
        print(f"✓ Created {len(students)} test students")

        # Create test courses
        courses_data = [
            {
                "course_code": "MATH101",
                "course_name": "Mathematics 101",
                "semester": "1st",
                "description": "Introduction to Mathematics",
            },
            {
                "course_code": "PHYS101",
                "course_name": "Physics 101",
                "semester": "1st",
                "description": "General Physics",
            },
            {
                "course_code": "CHEM101",
                "course_name": "Chemistry 101",
                "semester": "2nd",
                "description": "General Chemistry",
            },
            {
                "course_code": "ENG201",
                "course_name": "English Literature",
                "semester": "2nd",
                "description": "English Literature and Composition",
            },
            {
                "course_code": "HIST101",
                "course_name": "History 101",
                "semester": "1st",
                "description": "World History",
            },
        ]

        courses = []
        for data in courses_data:
            course = Course(**data)
            session.add(course)
            courses.append(course)

        session.flush()  # Get IDs
        print(f"✓ Created {len(courses)} test courses")

        # Enroll all students in all courses
        for student in students:
            for course in courses:
                enrollment = CourseEnrollment(
                    student_id=student.id, course_id=course.id
                )
                session.add(enrollment)

        session.commit()
        print(f"✓ Enrolled {len(students)} students in {len(courses)} courses")
        print("\n✅ Test data seeding complete!")


if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
