"""
Course management load testing scenarios.
"""

import random
from faker import Faker
from locust import TaskSet, task

fake = Faker()


class CourseScenarios(TaskSet):
    """Course management load testing scenarios."""

    def on_start(self):
        """Setup method called when a user starts."""
        self.course_ids = []
        self._load_course_ids()

    def _load_course_ids(self):
        """Load course IDs from API."""
        response = self.client.get("/api/v1/courses?skip=0&limit=1000")
        if response.status_code == 200:
            courses = response.json().get("courses", [])
            self.course_ids = [c["id"] for c in courses]

    def get_random_course_id(self):
        """Get a random course ID."""
        return random.choice(self.course_ids) if self.course_ids else None

    @task(4)
    def list_courses_paginated(self):
        """List courses with different pagination patterns."""
        pagination_patterns = [
            {"skip": 0, "limit": 10},
            {"skip": 0, "limit": 25},
            {"skip": random.randint(0, 40), "limit": 15},
            {"skip": random.randint(0, 45), "limit": 25},
        ]

        params = random.choice(pagination_patterns)
        self.client.get(
            f"/api/v1/courses?skip={params['skip']}&limit={params['limit']}"
        )

    @task(3)
    def get_course_detail(self):
        """Get detailed course information."""
        course_id = self.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/courses/{course_id}")

    @task(3)
    def get_course_students(self):
        """Get students enrolled in a course."""
        course_id = self.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/courses/{course_id}/students")

    @task(2)
    def search_courses(self):
        """Search courses by various criteria."""
        search_scenarios = [
            fake.word().title(),
            f"CS{random.randint(100, 500)}",
            f"MATH{random.randint(100, 500)}",
            fake.sentence(nb_words=2),
            random.choice(
                ["Computer Science", "Mathematics", "Physics", "Chemistry", "Biology"]
            ),
        ]

        search_term = random.choice(search_scenarios)
        self.client.get(f"/api/v1/courses/search?q={search_term}")

    @task(2)
    def filter_courses(self):
        """Filter courses by different criteria."""
        filter_scenarios = [
            {"semester": random.choice(["Fall", "Spring", "Summer"])},
            {"year": random.randint(2023, 2025)},
            {"instructor_id": random.randint(1, 10)},
            {"department": random.choice(["CS", "MATH", "PHYS", "CHEM", "BIO"])},
            {"credits": random.randint(2, 6)},
            {"has_students": random.choice([True, False])},
        ]

        filters = random.choice(filter_scenarios)
        query_params = "&".join([f"{k}={v}" for k, v in filters.items()])
        self.client.get(f"/api/v1/courses/filter?{query_params}")

    @task(2)
    def create_course(self):
        """Create new courses (admin/teacher operations)."""
        course_data = {
            "course_code": f"CS{random.randint(100, 999)}",
            "course_name": f"{fake.word().title()} {random.randint(100, 999)}",
            "description": fake.paragraph(nb_sentences=3),
            "credits": random.randint(2, 6),
            "department": random.choice(["Computer Science", "Mathematics", "Physics"]),
            "semester": random.choice(["Fall", "Spring", "Summer"]),
            "year": random.randint(2024, 2026),
            "instructor_id": random.randint(1, 10),
            "max_students": random.randint(20, 100),
            "schedule": {
                "days": random.sample(
                    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    k=random.randint(2, 3),
                ),
                "start_time": f"{random.randint(8, 16):02d}:00",
                "end_time": f"{random.randint(9, 17):02d}:00",
                "room": f"{random.choice(['A', 'B', 'C'])}{random.randint(100, 999)}",
            },
            "prerequisites": [
                f"CS{random.randint(100, 200)}" for _ in range(random.randint(0, 2))
            ],
        }

        self.client.post("/api/v1/courses", json=course_data)

    @task(3)
    def update_course(self):
        """Update existing course information."""
        course_id = self.get_random_course_id()
        if course_id:
            update_data = {
                "description": fake.paragraph(nb_sentences=2),
                "max_students": random.randint(20, 100),
                "schedule": {
                    "room": f"{random.choice(['A', 'B', 'C'])}{random.randint(100, 999)}"
                },
            }
            self.client.put(f"/api/v1/courses/{course_id}", json=update_data)

    @task(2)
    def course_analytics(self):
        """Get course analytics and statistics."""
        course_id = self.get_random_course_id()
        if course_id:
            # Course overview analytics
            self.client.get(f"/api/v1/analytics/course/{course_id}")

            # Grade distribution
            self.client.get(f"/api/v1/analytics/course/{course_id}/grades")

            # Attendance statistics
            self.client.get(f"/api/v1/analytics/course/{course_id}/attendance")

    @task(2)
    def course_enrollment_operations(self):
        """Perform course enrollment operations."""
        course_id = self.get_random_course_id()
        if course_id:
            # Get enrollment count
            self.client.get(f"/api/v1/enrollments/course/{course_id}/count")

            # Get enrollment details
            self.client.get(f"/api/v1/enrollments/course/{course_id}")

    @task(1)
    def bulk_course_operations(self):
        """Perform bulk course operations."""
        # Bulk course creation
        bulk_courses = [
            {
                "course_code": f"BULK{random.randint(100, 999)}",
                "course_name": f"Bulk Course {i+1}",
                "credits": random.randint(2, 4),
                "department": "Test",
                "semester": "Fall",
                "year": 2024,
                "max_students": 30,
            }
            for i in range(random.randint(3, 10))
        ]

        self.client.post("/api/v1/courses/bulk", json={"courses": bulk_courses})

    @task(1)
    def course_performance_report(self):
        """Generate course performance reports."""
        course_id = self.get_random_course_id()
        if course_id:
            report_data = {
                "course_id": course_id,
                "period": random.choice(["semester", "month", "week"]),
                "include_grades": True,
                "include_attendance": True,
                "include_participation": random.choice([True, False]),
            }
            self.client.post("/api/v1/reports/course-performance", json=report_data)
