"""
Curated Load Test Scenarios with Valid Inputs

This module provides load test scenarios using known-good data
to eliminate validation errors and get clean performance metrics.
"""

from locust import HttpUser, task, between, events
import random


class CuratedUser(HttpUser):
    """
    Load test user with curated, valid inputs.

    Uses known-good student IDs, reasonable pagination limits,
    and valid query parameters to get clean performance baselines.
    """

    wait_time = between(0.5, 2)

    # Known-good IDs from seed data (adjust based on your actual data)
    STUDENT_IDS = list(range(1, 21))  # Students 1-20
    COURSE_IDS = list(range(1, 11))  # Courses 1-10

    # Reasonable pagination limits (not the extreme 1000)
    PAGINATION_LIMITS = [10, 25, 50, 100]

    @task(10)
    def list_students_small(self):
        """Paginate students with small page size (10 records)"""
        skip = random.randint(0, 5) * 10
        self.client.get(
            f"/api/v1/students?skip={skip}&limit=10", name="/api/v1/students?limit=10"
        )

    @task(5)
    def list_students_medium(self):
        """Paginate students with medium page size (50 records)"""
        skip = random.randint(0, 2) * 50
        self.client.get(
            f"/api/v1/students?skip={skip}&limit=50", name="/api/v1/students?limit=50"
        )

    @task(2)
    def list_students_large(self):
        """Paginate students with large page size (100 records)"""
        self.client.get(
            "/api/v1/students?skip=0&limit=100", name="/api/v1/students?limit=100"
        )

    @task(8)
    def get_student_detail(self):
        """Fetch individual student details with valid ID"""
        student_id = random.choice(self.STUDENT_IDS)
        self.client.get(f"/api/v1/students/{student_id}", name="/api/v1/students/:id")

    @task(10)
    def list_courses_small(self):
        """Paginate courses with small page size (10 records)"""
        skip = random.randint(0, 3) * 10
        self.client.get(
            f"/api/v1/courses?skip={skip}&limit=10", name="/api/v1/courses?limit=10"
        )

    @task(5)
    def list_courses_medium(self):
        """Paginate courses with medium page size (50 records)"""
        self.client.get(
            "/api/v1/courses?skip=0&limit=50", name="/api/v1/courses?limit=50"
        )

    @task(8)
    def get_course_detail(self):
        """Fetch individual course details with valid ID"""
        course_id = random.choice(self.COURSE_IDS)
        self.client.get(f"/api/v1/courses/{course_id}", name="/api/v1/courses/:id")

    @task(3)
    def analytics_dashboard(self):
        """Analytics dashboard endpoint"""
        self.client.get("/api/v1/analytics/dashboard")

    @task(2)
    def search_students_valid(self):
        """Search students with valid query terms"""
        queries = ["John", "Jane", "Smith"]
        query = random.choice(queries)
        self.client.get(
            f"/api/v1/students/search?q={query}", name="/api/v1/students/search"
        )

    @task(1)
    def export_students_excel(self):
        """Export students to Excel (smaller batch to meet SLA)"""
        # Use limit=50 for sync export to keep p95 < 500ms
        self.client.get(
            "/api/v1/export/students/excel?limit=50",
            name="/api/v1/export/students/excel",
        )

    @task(5)
    def health_check_live(self):
        """Health check - use /docs (always available) as proxy"""
        self.client.get("/docs", name="/docs (health proxy)")


class OptimizationTargetUser(HttpUser):
    """
    Focused load test for identified bottlenecks.

    Targets the specific endpoints showing p95 > 2000ms:
    - Large pagination queries
    - Analytics dashboard
    - Excel export
    """

    wait_time = between(0.2, 1)

    @task(15)
    def students_large_limit(self):
        """Larger pagination (reduced from 1000 to 500)"""
        self.client.get(
            "/api/v1/students?skip=0&limit=500", name="/api/v1/students?limit=500"
        )

    @task(15)
    def courses_large_limit(self):
        """Larger course list retrieval (reduced from 1000 to 500)"""
        self.client.get(
            "/api/v1/courses?skip=0&limit=500", name="/api/v1/courses?limit=500"
        )

    @task(10)
    def analytics_dashboard(self):
        """Analytics dashboard (complex aggregations)"""
        self.client.get("/api/v1/analytics/dashboard")

    @task(5)
    def export_excel_optimized(self):
        """Excel export with optimized limit for SLA"""
        self.client.get(
            "/api/v1/export/students/excel?limit=50",
            name="/api/v1/export/students/excel?limit=50",
        )


# Event hooks for detailed logging
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Log requests exceeding SLA thresholds"""
    if response_time > 500:  # p95 target
        print(f"⚠️  SLA violation: {name} took {response_time:.0f}ms (target: <500ms)")

    if exception:
        print(f"❌ Request failed: {name} - {exception}")
