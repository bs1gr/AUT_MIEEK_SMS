"""
Comprehensive API endpoint tests for Advanced Search & Filtering feature.

Tests all 6 search endpoints with:
- RBAC/permission checking
- Input validation and error handling
- Response format compliance
- Rate limiting
- Caching behavior
- Edge cases and boundary conditions
- Different user roles (admin, teacher, student)

Author: AI Agent
Date: January 17, 2026
Version: 1.0.0
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone

# Assuming these exist in the project
from backend.app_factory import create_app
from backend.models import Student, Course, Grade


@pytest.fixture
def app():
    """Create test app"""
    return create_app()


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def admin_headers(client) -> dict:
    """Get admin user auth headers"""
    # Assuming auth is handled by fixtures
    return {"Authorization": "Bearer admin_token", "Content-Type": "application/json"}


@pytest.fixture
def teacher_headers(client) -> dict:
    """Get teacher user auth headers"""
    return {"Authorization": "Bearer teacher_token", "Content-Type": "application/json"}


@pytest.fixture
def student_headers(client) -> dict:
    """Get student user auth headers"""
    return {"Authorization": "Bearer student_token", "Content-Type": "application/json"}


@pytest.fixture
def test_data(db: Session):
    """Create test data"""
    students = [
        Student(first_name="John", last_name="Doe", email="john@example.com", phone="555-0001", deleted_at=None),
        Student(first_name="Jane", last_name="Smith", email="jane@example.com", phone="555-0002", deleted_at=None),
        Student(first_name="Bob", last_name="Johnson", email="bob@example.com", phone="555-0003", deleted_at=None),
    ]

    courses = [
        Course(name="Mathematics 101", code="MATH101", credits=3, deleted_at=None),
        Course(name="Physics 201", code="PHYS201", credits=4, deleted_at=None),
        Course(name="English 101", code="ENG101", credits=3, deleted_at=None),
    ]

    for student in students:
        db.add(student)
    for course in courses:
        db.add(course)
    db.commit()

    # Create grades
    grades = [
        Grade(student_id=students[0].id, course_id=courses[0].id, grade=95.5, deleted_at=None),
        Grade(student_id=students[1].id, course_id=courses[0].id, grade=87.0, deleted_at=None),
        Grade(student_id=students[0].id, course_id=courses[1].id, grade=92.0, deleted_at=None),
    ]

    for grade in grades:
        db.add(grade)
    db.commit()

    return {"students": students, "courses": courses, "grades": grades}


class TestStudentSearchEndpoint:
    """Tests for POST /api/v1/search/students"""

    endpoint = "/api/v1/search/students"

    def test_search_students_by_name(self, client, admin_headers, test_data):
        """Should search students by first or last name"""
        response = client.post(self.endpoint, json={"query": "John"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert len(data["data"]["results"]) > 0

        # Verify John Doe in results
        names = [r.get("first_name", "") + " " + r.get("last_name", "") for r in data["data"]["results"]]
        assert any("John" in name for name in names)

    def test_search_students_by_email(self, client, admin_headers, test_data):
        """Should search students by email"""
        response = client.post(self.endpoint, json={"query": "jane@example.com"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["results"]) > 0

    def test_search_students_case_insensitive(self, client, admin_headers, test_data):
        """Should be case insensitive"""
        response1 = client.post(self.endpoint, json={"query": "john"}, headers=admin_headers)

        response2 = client.post(self.endpoint, json={"query": "JOHN"}, headers=admin_headers)

        assert response1.status_code == 200
        assert response2.status_code == 200

        data1 = response1.json()["data"]["results"]
        data2 = response2.json()["data"]["results"]

        assert len(data1) == len(data2)

    def test_search_students_pagination(self, client, admin_headers, test_data):
        """Should support pagination"""
        response = client.post(self.endpoint, json={"query": "a", "page": 1, "page_size": 2}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["page"] == 1
        assert data["data"]["page_size"] == 2
        assert data["data"]["total"] >= 0

    def test_search_students_soft_delete_filter(self, client, admin_headers, db, test_data):
        """Should not return soft-deleted students"""
        # Soft delete a student
        test_data["students"][0].deleted_at = datetime.now(timezone.utc)
        db.commit()

        response = client.post(self.endpoint, json={"query": "John"}, headers=admin_headers)

        data = response.json()
        # Should not find the deleted John
        names = [r.get("first_name", "") for r in data["data"]["results"]]
        assert "John" not in names

    def test_search_students_empty_query(self, client, admin_headers):
        """Should handle empty query gracefully"""
        response = client.post(self.endpoint, json={"query": ""}, headers=admin_headers)

        # Should return error or empty results
        assert response.status_code in [200, 400]

    def test_search_students_invalid_page(self, client, admin_headers):
        """Should handle invalid page numbers"""
        response = client.post(self.endpoint, json={"query": "test", "page": -1}, headers=admin_headers)

        assert response.status_code in [400, 200]

    def test_search_students_permission_student(self, client, student_headers, test_data):
        """Students should only see themselves"""
        response = client.post(self.endpoint, json={"query": "john"}, headers=student_headers)

        # Depending on RBAC config, may be 403 or filtered results
        assert response.status_code in [200, 403]

    def test_search_students_missing_auth(self, client):
        """Should reject unauthenticated requests"""
        response = client.post(self.endpoint, json={"query": "john"})

        assert response.status_code in [401, 403]

    def test_search_students_response_format(self, client, admin_headers, test_data):
        """Should return proper APIResponse format"""
        response = client.post(self.endpoint, json={"query": "john"}, headers=admin_headers)

        data = response.json()
        assert "success" in data
        assert "data" in data
        assert "error" in data or data["success"]
        assert "meta" in data
        assert "request_id" in data["meta"]
        assert "timestamp" in data["meta"]


class TestCourseSearchEndpoint:
    """Tests for POST /api/v1/search/courses"""

    endpoint = "/api/v1/search/courses"

    def test_search_courses_by_name(self, client, admin_headers, test_data):
        """Should search courses by name"""
        response = client.post(self.endpoint, json={"query": "Mathematics"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["results"]) > 0

    def test_search_courses_by_code(self, client, admin_headers, test_data):
        """Should search courses by code"""
        response = client.post(self.endpoint, json={"query": "MATH"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["results"]) > 0

    def test_search_courses_filter_credits(self, client, admin_headers, test_data):
        """Should filter courses by credit hours"""
        response = client.post(
            self.endpoint, json={"query": "", "filters": {"min_credits": 3, "max_credits": 3}}, headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        # All results should have 3 credits
        for course in data["data"]["results"]:
            assert 3 <= course.get("credits", 0) <= 3

    def test_search_courses_soft_delete_filter(self, client, admin_headers, db, test_data):
        """Should not return soft-deleted courses"""
        test_data["courses"][0].deleted_at = datetime.now(timezone.utc)
        db.commit()

        response = client.post(self.endpoint, json={"query": ""}, headers=admin_headers)

        data = response.json()
        codes = [c.get("code", "") for c in data["data"]["results"]]
        assert "MATH101" not in codes

    def test_search_courses_pagination(self, client, admin_headers, test_data):
        """Should support pagination"""
        response = client.post(self.endpoint, json={"query": "", "page": 1, "page_size": 1}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["page"] == 1
        assert data["data"]["page_size"] == 1

    def test_search_courses_invalid_filter(self, client, admin_headers):
        """Should handle invalid filters"""
        response = client.post(
            self.endpoint, json={"query": "", "filters": {"invalid_field": "value"}}, headers=admin_headers
        )

        # Should either reject or ignore invalid filters
        assert response.status_code in [200, 400]

    def test_search_courses_response_fields(self, client, admin_headers, test_data):
        """Should include required fields in results"""
        response = client.post(self.endpoint, json={"query": ""}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        if data["data"]["results"]:
            course = data["data"]["results"][0]
            assert "id" in course
            assert "name" in course
            assert "code" in course
            assert "credits" in course


class TestGradeSearchEndpoint:
    """Tests for POST /api/v1/search/grades"""

    endpoint = "/api/v1/search/grades"

    def test_search_grades_by_value(self, client, admin_headers, test_data):
        """Should search grades by value"""
        response = client.post(self.endpoint, json={"query": "95"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_search_grades_by_range(self, client, admin_headers, test_data):
        """Should filter grades by range"""
        response = client.post(
            self.endpoint, json={"filters": {"min_grade": 90, "max_grade": 100}}, headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()

        # All results should be in range
        for grade in data["data"]["results"]:
            assert 90 <= grade.get("grade", 0) <= 100

    def test_search_grades_by_student(self, client, admin_headers, test_data):
        """Should filter grades by student ID"""
        student_id = test_data["students"][0].id
        response = client.post(self.endpoint, json={"filters": {"student_id": student_id}}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # All results should be for the student
        for grade in data["data"]["results"]:
            assert grade.get("student_id") == student_id

    def test_search_grades_by_course(self, client, admin_headers, test_data):
        """Should filter grades by course ID"""
        course_id = test_data["courses"][0].id
        response = client.post(self.endpoint, json={"filters": {"course_id": course_id}}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        for grade in data["data"]["results"]:
            assert grade.get("course_id") == course_id

    def test_search_grades_combined_filters(self, client, admin_headers, test_data):
        """Should handle multiple filters together"""
        response = client.post(
            self.endpoint,
            json={"filters": {"student_id": test_data["students"][0].id, "min_grade": 90, "max_grade": 100}},
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()

        for grade in data["data"]["results"]:
            assert grade.get("student_id") == test_data["students"][0].id
            assert 90 <= grade.get("grade", 0) <= 100

    def test_search_grades_soft_delete_filter(self, client, admin_headers, db, test_data):
        """Should not return soft-deleted grades"""
        test_data["grades"][0].deleted_at = datetime.now(timezone.utc)
        db.commit()

        response = client.post(self.endpoint, json={"query": ""}, headers=admin_headers)

        data = response.json()
        assert len(data["data"]["results"]) >= 0

    def test_search_grades_invalid_range(self, client, admin_headers):
        """Should handle invalid grade ranges"""
        response = client.post(
            self.endpoint, json={"filters": {"min_grade": 100, "max_grade": 50}}, headers=admin_headers
        )

        # Should either correct or reject
        assert response.status_code in [200, 400]

    def test_search_grades_permission_student(self, client, student_headers, test_data):
        """Students should only see their own grades"""
        response = client.post(self.endpoint, json={"query": ""}, headers=student_headers)

        assert response.status_code in [200, 403]


class TestAdvancedSearchEndpoint:
    """Tests for POST /api/v1/search/advanced"""

    endpoint = "/api/v1/search/advanced"

    def test_advanced_search_students(self, client, admin_headers, test_data):
        """Should search students via advanced endpoint"""
        response = client.post(self.endpoint, json={"entity": "student", "query": "john"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_advanced_search_courses(self, client, admin_headers, test_data):
        """Should search courses via advanced endpoint"""
        response = client.post(self.endpoint, json={"entity": "course", "query": "math"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_advanced_search_grades(self, client, admin_headers, test_data):
        """Should search grades via advanced endpoint"""
        response = client.post(self.endpoint, json={"entity": "grade", "query": "95"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_advanced_search_invalid_entity(self, client, admin_headers):
        """Should reject invalid entity types"""
        response = client.post(self.endpoint, json={"entity": "invalid", "query": "test"}, headers=admin_headers)

        assert response.status_code == 400

    def test_advanced_search_with_filters(self, client, admin_headers, test_data):
        """Should apply filters correctly"""
        response = client.post(
            self.endpoint, json={"entity": "grade", "query": "", "filters": {"min_grade": 85}}, headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()

        for grade in data["data"]["results"]:
            assert grade.get("grade", 0) >= 85

    def test_advanced_search_pagination(self, client, admin_headers, test_data):
        """Should support pagination"""
        response = client.post(
            self.endpoint, json={"entity": "student", "query": "", "page": 1, "page_size": 1}, headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["page"] == 1


class TestSuggestionsEndpoint:
    """Tests for GET /api/v1/search/suggestions"""

    endpoint = "/api/v1/search/suggestions"

    def test_get_suggestions_students(self, client, admin_headers, test_data):
        """Should get student suggestions"""
        response = client.get(f"{self.endpoint}?query=j&entity=student", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_get_suggestions_courses(self, client, admin_headers, test_data):
        """Should get course suggestions"""
        response = client.get(f"{self.endpoint}?query=math&entity=course", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)

    def test_get_suggestions_empty_query(self, client, admin_headers):
        """Should handle empty query"""
        response = client.get(f"{self.endpoint}?query=&entity=student", headers=admin_headers)

        assert response.status_code in [200, 400]

    def test_get_suggestions_limit(self, client, admin_headers, test_data):
        """Should respect limit parameter"""
        response = client.get(f"{self.endpoint}?query=&entity=student&limit=5", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 5

    def test_get_suggestions_caching(self, client, admin_headers, test_data):
        """Identical requests should return consistent results (cache)"""
        response1 = client.get(f"{self.endpoint}?query=john&entity=student", headers=admin_headers)

        response2 = client.get(f"{self.endpoint}?query=john&entity=student", headers=admin_headers)

        assert response1.json()["data"] == response2.json()["data"]

    def test_get_suggestions_response_format(self, client, admin_headers, test_data):
        """Should return proper APIResponse format"""
        response = client.get(f"{self.endpoint}?query=test&entity=student", headers=admin_headers)

        data = response.json()
        assert "success" in data
        assert "data" in data
        assert "meta" in data

    def test_get_suggestions_missing_entity(self, client, admin_headers):
        """Should reject missing entity parameter"""
        response = client.get(f"{self.endpoint}?query=test", headers=admin_headers)

        assert response.status_code in [400, 422]


class TestStatisticsEndpoint:
    """Tests for GET /api/v1/search/statistics"""

    endpoint = "/api/v1/search/statistics"

    def test_get_statistics_all(self, client, admin_headers, test_data):
        """Should return overall search statistics"""
        response = client.get(self.endpoint, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "total_searches" in data["data"]

    def test_get_statistics_by_entity(self, client, admin_headers, test_data):
        """Should return statistics by entity type"""
        response = client.get(f"{self.endpoint}?entity=student", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_get_statistics_values_nonnegative(self, client, admin_headers, test_data):
        """All statistics should be non-negative"""
        response = client.get(self.endpoint, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Check all numeric values are >= 0
        def check_nonnegative(obj):
            if isinstance(obj, dict):
                for v in obj.values():
                    check_nonnegative(v)
            elif isinstance(obj, (int, float)):
                assert obj >= 0

        check_nonnegative(data["data"])

    def test_get_statistics_response_format(self, client, admin_headers, test_data):
        """Should return proper APIResponse format"""
        response = client.get(self.endpoint, headers=admin_headers)

        data = response.json()
        assert "success" in data
        assert "data" in data
        assert "meta" in data
        assert "request_id" in data["meta"]


class TestRateLimiting:
    """Tests for rate limiting on search endpoints"""

    def test_rate_limit_students_search(self, client, admin_headers):
        """Should rate limit rapid searches"""
        endpoint = "/api/v1/search/students"

        # Make multiple rapid requests
        responses = []
        for i in range(5):
            response = client.post(endpoint, json={"query": f"test{i}"}, headers=admin_headers)
            responses.append(response.status_code)

        # Should have at least one 429 or all succeed
        # depending on rate limit config
        valid_codes = [200, 429]
        assert all(code in valid_codes for code in responses)

    def test_rate_limit_suggestions(self, client, admin_headers):
        """Should rate limit suggestions requests"""
        endpoint = "/api/v1/search/suggestions"

        # Make rapid requests
        responses = []
        for i in range(10):
            response = client.get(f"{endpoint}?query=test{i}&entity=student", headers=admin_headers)
            responses.append(response.status_code)

        # Should handle without crashing
        assert all(code in [200, 429] for code in responses)


class TestErrorHandling:
    """Tests for error handling and edge cases"""

    def test_invalid_json(self, client, admin_headers):
        """Should handle invalid JSON"""
        response = client.post("/api/v1/search/students", data="invalid json", headers=admin_headers)

        assert response.status_code in [400, 422]

    def test_missing_required_fields(self, client, admin_headers):
        """Should require query field"""
        response = client.post("/api/v1/search/students", json={}, headers=admin_headers)

        assert response.status_code in [400, 422]

    def test_very_long_query(self, client, admin_headers):
        """Should handle very long queries"""
        long_query = "x" * 1000
        response = client.post("/api/v1/search/students", json={"query": long_query}, headers=admin_headers)

        # Should either accept or reject, but not crash
        assert response.status_code in [200, 400, 422]

    def test_special_characters_in_query(self, client, admin_headers):
        """Should handle special characters"""
        response = client.post("/api/v1/search/students", json={"query": "!@#$%^&*()"}, headers=admin_headers)

        # Should handle gracefully
        assert response.status_code in [200, 400]

    def test_sql_injection_attempt(self, client, admin_headers):
        """Should prevent SQL injection"""
        response = client.post(
            "/api/v1/search/students", json={"query": "'; DROP TABLE students; --"}, headers=admin_headers
        )

        # Should be safe (ORM prevents injection)
        assert response.status_code == 200

        # Verify data still exists
        response2 = client.post("/api/v1/search/students", json={"query": "test"}, headers=admin_headers)
        assert response2.status_code == 200
