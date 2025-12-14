"""
Student management load testing scenarios.
"""

import random
from faker import Faker
from locust import TaskSet, task

fake = Faker()


class StudentScenarios(TaskSet):
    """Student management load testing scenarios."""

    def on_start(self):
        """Setup method called when a user starts."""
        self.student_ids = []
        self._load_student_ids()

    def _load_student_ids(self):
        """Load student IDs from API."""
        response = self.client.get("/api/v1/students?skip=0&limit=1000")
        if response.status_code == 200:
            students = response.json().get("students", [])
            self.student_ids = [s["id"] for s in students]

    def get_random_student_id(self):
        """Get a random student ID."""
        return random.choice(self.student_ids) if self.student_ids else None

    @task(5)
    def list_students_paginated(self):
        """List students with different pagination patterns."""
        pagination_patterns = [
            {"skip": 0, "limit": 10},
            {"skip": 0, "limit": 50},
            {"skip": random.randint(0, 900), "limit": 20},
            {"skip": random.randint(0, 950), "limit": 50},
        ]

        params = random.choice(pagination_patterns)
        self.client.get(f"/api/v1/students?skip={params['skip']}&limit={params['limit']}")

    @task(4)
    def get_student_detail(self):
        """Get detailed student information."""
        student_id = self.get_random_student_id()
        if student_id:
            self.client.get(f"/api/v1/students/{student_id}")

    @task(3)
    def search_students(self):
        """Search students by various criteria."""
        search_scenarios = [
            fake.first_name(),
            fake.last_name(),
            fake.email(),
            f"student{random.randint(1, 1000)}",
            fake.phone_number(),
            fake.city(),
        ]

        search_term = random.choice(search_scenarios)
        self.client.get(f"/api/v1/students/search?q={search_term}")

    @task(2)
    def filter_students(self):
        """Filter students by different criteria."""
        filter_scenarios = [
            {"enrolled_after": fake.date_this_year().isoformat()},
            {"enrolled_before": fake.date_this_year().isoformat()},
            {"course_id": random.randint(1, 50)},
            {"has_grades": random.choice([True, False])},
            {"attendance_rate_min": random.uniform(0.5, 1.0)},
        ]

        filters = random.choice(filter_scenarios)
        query_params = "&".join([f"{k}={v}" for k, v in filters.items()])
        self.client.get(f"/api/v1/students/filter?{query_params}")

    @task(2)
    def create_student(self):
        """Create new students (admin/teacher operations)."""
        student_data = {
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.unique.email(),
            "student_id": f"STU{random.randint(100000, 999999)}",
            "date_of_birth": fake.date_of_birth(minimum_age=18, maximum_age=25).isoformat(),
            "phone": fake.phone_number(),
            "address": fake.address().replace('\n', ', '),
            "enrollment_date": fake.date_this_year().isoformat()
        }

        self.client.post("/api/v1/students", json=student_data)

    @task(3)
    def update_student(self):
        """Update existing student information."""
        student_id = self.get_random_student_id()
        if student_id:
            update_data = {
                "phone": fake.phone_number(),
                "address": fake.address().replace('\n', ', '),
                "emergency_contact": {
                    "name": fake.name(),
                    "phone": fake.phone_number(),
                    "relationship": random.choice(["parent", "guardian", "sibling", "friend"])
                }
            }
            self.client.put(f"/api/v1/students/{student_id}", json=update_data)

    @task(1)
    def bulk_student_operations(self):
        """Perform bulk student operations."""
        # Bulk create
        bulk_students = [
            {
                "first_name": fake.first_name(),
                "last_name": fake.last_name(),
                "email": fake.unique.email(),
                "student_id": f"STU{random.randint(100000, 999999)}",
                "date_of_birth": fake.date_of_birth(minimum_age=18, maximum_age=25).isoformat(),
            } for _ in range(random.randint(5, 20))
        ]

        self.client.post("/api/v1/students/bulk", json={"students": bulk_students})

    @task(1)
    def student_performance_history(self):
        """Get student performance history."""
        student_id = self.get_random_student_id()
        if student_id:
            # Get grades
            self.client.get(f"/api/v1/grades/student/{student_id}")

            # Get attendance
            self.client.get(f"/api/v1/attendance/student/{student_id}")

            # Get highlights
            self.client.get(f"/api/v1/highlights/student/{student_id}")

    @task(2)
    def student_course_enrollment(self):
        """Check student course enrollments."""
        student_id = self.get_random_student_id()
        if student_id:
            self.client.get(f"/api/v1/enrollments/student/{student_id}")

    @task(1)
    def delete_student(self):
        """Delete student (admin only - use with caution)."""
        # Only delete test students (those with high student IDs)
        if self.student_ids:
            high_id_students = [sid for sid in self.student_ids if sid > 1000]
            if high_id_students:
                student_id = random.choice(high_id_students)
                self.client.delete(f"/api/v1/students/{student_id}")