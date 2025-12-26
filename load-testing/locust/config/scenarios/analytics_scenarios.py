"""
Analytics and reporting load testing scenarios.
"""

import random
from locust import TaskSet, task


class AnalyticsScenarios(TaskSet):
    """Analytics and reporting load testing scenarios."""

    def on_start(self):
        """Setup method called when a user starts."""
        self.student_ids = []
        self.course_ids = []
        self._load_ids()

    def _load_ids(self):
        """Load student and course IDs from API."""
        # Load students
        response = self.client.get("/api/v1/students?skip=0&limit=1000")
        if response.status_code == 200:
            students = response.json().get("students", [])
            self.student_ids = [s["id"] for s in students]

        # Load courses
        response = self.client.get("/api/v1/courses?skip=0&limit=1000")
        if response.status_code == 200:
            courses = response.json().get("courses", [])
            self.course_ids = [c["id"] for c in courses]

    def get_random_student_id(self):
        """Get a random student ID."""
        return random.choice(self.student_ids) if self.student_ids else None

    def get_random_course_id(self):
        """Get a random course ID."""
        return random.choice(self.course_ids) if self.course_ids else None

    @task(4)
    def dashboard_analytics(self):
        """Get main dashboard analytics."""
        self.client.get("/api/v1/analytics/dashboard")

    @task(3)
    def student_analytics(self):
        """Get analytics for specific students."""
        student_id = self.get_random_student_id()
        if student_id:
            self.client.get(f"/api/v1/analytics/student/{student_id}")

    @task(3)
    def course_analytics(self):
        """Get analytics for specific courses."""
        course_id = self.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/analytics/course/{course_id}")

    @task(2)
    def department_analytics(self):
        """Get department-level analytics."""
        departments = [
            "Computer Science",
            "Mathematics",
            "Physics",
            "Chemistry",
            "Biology",
        ]
        department = random.choice(departments)
        self.client.get(f"/api/v1/analytics/department/{department}")

    @task(3)
    def performance_analytics(self):
        """Get performance analytics."""
        # Overall performance
        self.client.get("/api/v1/analytics/performance")

        # Performance by time period
        periods = ["week", "month", "semester", "year"]
        period = random.choice(periods)
        self.client.get(f"/api/v1/analytics/performance/{period}")

    @task(2)
    def attendance_analytics(self):
        """Get attendance analytics."""
        # Overall attendance
        self.client.get("/api/v1/analytics/attendance")

        # Course-specific attendance
        course_id = self.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/analytics/attendance/course/{course_id}")

    @task(2)
    def grade_analytics(self):
        """Get grade distribution analytics."""
        # Overall grade distribution
        self.client.get("/api/v1/analytics/grades")

        # Course-specific grades
        course_id = self.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/analytics/grades/course/{course_id}")

    @task(3)
    def generate_student_report(self):
        """Generate comprehensive student performance reports."""
        student_id = self.get_random_student_id()
        if student_id:
            report_config = {
                "student_id": student_id,
                "period": random.choice(["week", "month", "semester", "year"]),
                "include_grades": random.choice([True, False]),
                "include_attendance": random.choice([True, False]),
                "include_highlights": random.choice([True, False]),
                "include_participation": random.choice([True, False]),
                "format": random.choice(["json", "pdf", "csv"]),
            }
            self.client.post("/api/v1/reports/student-performance", json=report_config)

    @task(2)
    def generate_course_report(self):
        """Generate course performance reports."""
        course_id = self.get_random_course_id()
        if course_id:
            report_config = {
                "course_id": course_id,
                "period": random.choice(["week", "month", "semester"]),
                "include_grades": True,
                "include_attendance": True,
                "include_participation": random.choice([True, False]),
                "format": random.choice(["json", "pdf", "csv"]),
            }
            self.client.post("/api/v1/reports/course-performance", json=report_config)

    @task(2)
    def export_operations(self):
        """Test various export operations."""
        export_types = [
            "/api/v1/export/students/excel",
            "/api/v1/export/courses/excel",
            "/api/v1/export/attendance/excel",
            f"/api/v1/export/grades/excel/{self.get_random_student_id() or 1}",
            f"/api/v1/export/analytics/course/{self.get_random_course_id() or 1}/pdf",
        ]

        export_url = random.choice(export_types)
        self.client.get(export_url)

    @task(1)
    def bulk_analytics_queries(self):
        """Perform bulk analytics queries."""
        # Multiple analytics queries in sequence
        queries = [
            "/api/v1/analytics/dashboard",
            "/api/v1/analytics/performance",
            "/api/v1/analytics/attendance",
            "/api/v1/analytics/grades",
        ]

        for query in random.sample(queries, k=random.randint(2, 4)):
            self.client.get(query)

    @task(1)
    def real_time_analytics(self):
        """Test real-time analytics updates."""
        # Simulate real-time dashboard polling
        for _ in range(random.randint(3, 8)):
            self.client.get("/api/v1/analytics/dashboard")
            # Small delay to simulate polling interval
            import time

            time.sleep(random.uniform(0.5, 2.0))

    @task(1)
    def comparative_analytics(self):
        """Compare analytics across different dimensions."""
        # Compare different time periods
        periods = ["week", "month", "semester"]
        for period in random.sample(periods, k=2):
            self.client.get(f"/api/v1/analytics/performance/{period}")

        # Compare different courses
        for _ in range(min(3, len(self.course_ids))):
            course_id = self.get_random_course_id()
            if course_id:
                self.client.get(f"/api/v1/analytics/course/{course_id}")

    @task(1)
    def predictive_analytics(self):
        """Test predictive analytics endpoints."""
        # Student performance predictions
        student_id = self.get_random_student_id()
        if student_id:
            self.client.get(f"/api/v1/analytics/predict/student/{student_id}")

        # Course completion predictions
        course_id = self.get_random_course_id()
        if course_id:
            self.client.get(f"/api/v1/analytics/predict/course/{course_id}/completion")
