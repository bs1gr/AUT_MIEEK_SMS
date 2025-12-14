"""
Student Management System Load Testing Suite

This module contains Locust-based load testing scenarios for the SMS application.
Supports authentication, student management, course operations, and analytics testing.
"""

import json
import logging
import random
import time
from typing import Dict, List, Optional

from faker import Faker
from locust import HttpUser, TaskSet, between, constant, task
from locust.contrib.fasthttp import FastHttpUser

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize Faker for test data generation
fake = Faker()

# Test data constants
STUDENT_COUNT = 1000
COURSE_COUNT = 50
USER_COUNT = 100


class BaseSMSUser(FastHttpUser):
    """Base user class with authentication and common utilities."""

    # Default wait time between tasks (seconds)
    wait_time = between(1, 3)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token: Optional[str] = None
        self.user_id: Optional[int] = None
        self.student_ids: List[int] = []
        self.course_ids: List[int] = []

    def on_start(self):
        """Setup method called when a user starts."""
        self.authenticate()

    def authenticate(self):
        """Skip authentication for load testing - assume AUTH_MODE=disabled."""
        # For load testing, skip authentication to avoid rate limiting and credential issues
        # Assume the backend is running with AUTH_MODE=disabled for testing
        self.token = None
        logger.info("Skipping authentication for load testing (assuming AUTH_MODE=disabled)")

    def get_random_student_id(self) -> Optional[int]:
        """Get a random student ID from cached list."""
        if not self.student_ids:
            self._load_student_ids()
        return random.choice(self.student_ids) if self.student_ids else None

    def get_random_course_id(self) -> Optional[int]:
        """Get a random course ID from cached list."""
        if not self.course_ids:
            self._load_course_ids()
        return random.choice(self.course_ids) if self.course_ids else None

    def _load_student_ids(self):
        """Load student IDs from API."""
        response = self.client.get("/api/v1/students?skip=0&limit=1000")
        if response.status_code == 200:
            students = response.json().get("students", [])
            self.student_ids = [s["id"] for s in students]

    def _load_course_ids(self):
        """Load course IDs from API."""
        response = self.client.get("/api/v1/courses?skip=0&limit=1000")
        if response.status_code == 200:
            courses = response.json().get("courses", [])
            self.course_ids = [c["id"] for c in courses]


class AuthTasks(TaskSet):
    """Authentication-related tasks."""

    @task(3)
    def login_logout_cycle(self):
        """Complete login/logout cycle."""
        # Login
        user = {"email": "student@example.com", "password": "student123"}
        response = self.client.post("/api/v1/auth/login", json=user)

        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")

            # Set token for next request
            self.client.headers.update({"Authorization": f"Bearer {token}"})

            # Small delay
            time.sleep(random.uniform(0.5, 2.0))

            # Logout
            self.client.post("/api/v1/auth/logout")

            # Clear token
            self.client.headers.pop("Authorization", None)

    @task(2)
    def health_check(self):
        """Test health endpoint (no authentication required)."""
        self.client.get("/health")

    @task(1)
    def refresh_token(self):
        """Test token refresh functionality."""
        # First login to get initial token
        user = {"email": "student@example.com", "password": "student123"}
        response = self.client.post("/api/v1/auth/login", json=user)

        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            refresh_token = data.get("refresh_token")

            if refresh_token:
                # Attempt token refresh
                refresh_data = {"refresh_token": refresh_token}
                self.client.post("/api/v1/auth/refresh", json=refresh_data)


class StudentTasks(TaskSet):
    """Student management tasks."""

    @task(5)
    def list_students(self):
        """List students with pagination."""
        skip = random.randint(0, max(0, STUDENT_COUNT - 50))
        limit = random.randint(10, 50)

        self.client.get(f"/api/v1/students?skip={skip}&limit={limit}")

    @task(3)
    def get_student_detail(self):
        """Get detailed student information."""
        student_id = self.user.get_random_student_id()
        if student_id:
            self.client.get(f"/api/v1/students/{student_id}")

    @task(2)
    def search_students(self):
        """Search students by various criteria."""
        search_terms = [
            fake.first_name(),
            fake.last_name(),
            fake.email(),
            f"student{random.randint(1, 100)}"
        ]

        term = random.choice(search_terms)
        self.client.get(f"/api/v1/students/search?q={term}")

    @task(1)
    def create_student(self):
        """Create a new student (admin/teacher only)."""
        student_data = {
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.email(),
            "student_id": f"STU{random.randint(10000, 99999)}",
            "date_of_birth": fake.date_of_birth(minimum_age=18, maximum_age=25).isoformat(),
            "phone": fake.phone_number()
        }

        self.client.post("/api/v1/students", json=student_data)

    @task(2)
    def update_student(self):
        """Update student information."""
        student_id = self.user.get_random_student_id()
        if student_id:
            update_data = {
                "phone": fake.phone_number(),
                "address": fake.address().replace('\n', ', ')
            }
            self.client.put(f"/api/v1/students/{student_id}", json=update_data)


class CourseTasks(TaskSet):
    """Course management tasks."""

    @task(4)
    def list_courses(self):
        """List courses with pagination."""
        skip = random.randint(0, max(0, COURSE_COUNT - 20))
        limit = random.randint(5, 20)

        self.client.get(f"/api/v1/courses?skip={skip}&limit={limit}")

    @task(3)
    def get_course_detail(self):
        """Get detailed course information."""
        course_id = self.user.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/courses/{course_id}")

    @task(2)
    def get_course_students(self):
        """Get students enrolled in a course."""
        course_id = self.user.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/courses/{course_id}/students")

    @task(1)
    def enroll_student(self):
        """Enroll student in course."""
        student_id = self.user.get_random_student_id()
        course_id = self.user.get_random_course_id()

        if student_id and course_id:
            enrollment_data = {
                "student_id": student_id,
                "enrollment_date": fake.date_this_year().isoformat()
            }
            self.client.post(f"/api/v1/enrollments/course/{course_id}", json=enrollment_data)


class AnalyticsTasks(TaskSet):
    """Analytics and reporting tasks."""

    @task(3)
    def get_dashboard_analytics(self):
        """Get dashboard analytics data."""
        self.client.get("/api/v1/analytics/dashboard")

    @task(2)
    def get_course_analytics(self):
        """Get analytics for a specific course."""
        course_id = self.user.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/analytics/course/{course_id}")

    @task(2)
    def get_student_performance_report(self):
        """Generate student performance report."""
        student_id = self.user.get_random_student_id()
        if student_id:
            report_data = {
                "student_id": student_id,
                "period": random.choice(["semester", "month", "week"]),
                "include_grades": random.choice([True, False]),
                "include_attendance": random.choice([True, False]),
                "include_highlights": random.choice([True, False])
            }
            self.client.post("/api/v1/reports/student-performance", json=report_data)

    @task(1)
    def export_students(self):
        """Export students data."""
        self.client.get("/api/v1/export/students/excel")

    @task(1)
    def export_grades(self):
        """Export grades data."""
        student_id = self.user.get_random_student_id()
        if student_id:
            self.client.get(f"/api/v1/export/grades/excel/{student_id}")


class AttendanceTasks(TaskSet):
    """Attendance management tasks."""

    @task(4)
    def get_course_attendance(self):
        """Get attendance for a course."""
        course_id = self.user.get_random_course_id()
        if course_id:
            date = fake.date_this_year().isoformat()
            self.client.get(f"/api/v1/attendance/course/{course_id}?date={date}")

    @task(3)
    def record_attendance(self):
        """Record attendance for students."""
        course_id = self.user.get_random_course_id()
        if course_id:
            attendance_data = {
                "course_id": course_id,
                "date": fake.date_this_year().isoformat(),
                "records": [
                    {
                        "student_id": self.user.get_random_student_id(),
                        "status": random.choice(["present", "absent", "late"]),
                        "notes": fake.sentence() if random.random() > 0.7 else None
                    } for _ in range(random.randint(5, 20))
                ]
            }
            self.client.post("/api/v1/attendance", json=attendance_data)


class GradeTasks(TaskSet):
    """Grade management tasks."""

    @task(3)
    def get_student_grades(self):
        """Get grades for a student."""
        student_id = self.user.get_random_student_id()
        if student_id:
            self.client.get(f"/api/v1/grades/student/{student_id}")

    @task(2)
    def get_course_grades(self):
        """Get all grades for a course."""
        course_id = self.user.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/grades/course/{course_id}")

    @task(2)
    def record_grade(self):
        """Record a grade for a student."""
        student_id = self.user.get_random_student_id()
        course_id = self.user.get_random_course_id()

        if student_id and course_id:
            grade_data = {
                "student_id": student_id,
                "course_id": course_id,
                "grade": round(random.uniform(0, 20), 1),  # Greek grading scale
                "max_grade": 20.0,
                "component_type": random.choice(["exam", "assignment", "project", "participation"]),
                "component_name": fake.sentence(nb_words=3),
                "weight": random.randint(10, 50),
                "date_assigned": fake.date_this_year().isoformat(),
                "date_submitted": fake.date_this_year().isoformat() if random.random() > 0.3 else None
            }
            self.client.post("/api/v1/grades", json=grade_data)


# User classes combining different task sets
class LightUser(BaseSMSUser):
    """Light user - mostly read operations."""
    tasks = [StudentTasks, CourseTasks, AnalyticsTasks]
    weight = 7  # 70% of users


class MediumUser(BaseSMSUser):
    """Medium user - mix of read/write operations."""
    tasks = [StudentTasks, CourseTasks, AnalyticsTasks, AttendanceTasks, GradeTasks]
    weight = 2  # 20% of users


class HeavyUser(BaseSMSUser):
    """Heavy user - intensive operations (admin/teacher)."""
    tasks = [StudentTasks, CourseTasks, AnalyticsTasks, AttendanceTasks, GradeTasks, AuthTasks]
    weight = 1  # 10% of users

    # Shorter wait times for heavy users
    wait_time = between(0.5, 1.5)


class AuthUser(BaseSMSUser):
    """User focused on authentication operations."""
    tasks = [AuthTasks]
    weight = 1  # 10% of users


class SmokeUser(FastHttpUser):
    """User for smoke tests - only health checks."""
    wait_time = between(1, 3)

    @task(1)
    def health_check_only(self):
        """Test health endpoint only."""
        self.client.get("/health")


# Configuration for different test scenarios
TEST_CONFIGS = {
    "smoke": {
        "users": 5,
        "spawn_rate": 1,
        "run_time": "30s",
        "description": "Basic smoke test"
    },
    "light": {
        "users": 50,
        "spawn_rate": 5,
        "run_time": "2m",
        "description": "Light load test"
    },
    "medium": {
        "users": 200,
        "spawn_rate": 10,
        "run_time": "5m",
        "description": "Medium load test"
    },
    "heavy": {
        "users": 500,
        "spawn_rate": 20,
        "run_time": "10m",
        "description": "Heavy load test"
    },
    "stress": {
        "users": 1000,
        "spawn_rate": 50,
        "run_time": "15m",
        "description": "Stress test"
    }
}