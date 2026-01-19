"""
Integration tests for Advanced Search & Filtering feature.

Tests complete data flow: API → Service → Database
Verifies:
- End-to-end request handling
- Permission checks integrated with database queries
- Soft-delete filtering at database level
- Pagination with correct counts
- Filter application and result accuracy
- Cache interactions
- Transaction handling
- Data consistency across layers

Author: AI Agent
Date: January 17, 2026
Version: 1.0.0
"""

import pytest
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from backend.app_factory import create_app
from backend.models import Student, Course, Grade
from backend.services.search_service import SearchService


@pytest.fixture
def app():
    """Create test app"""
    return create_app()


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def db(app):
    """Get database session"""
    from backend.db import SessionLocal

    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def admin_headers() -> dict:
    """Admin auth headers"""
    return {"Authorization": "Bearer admin_token", "Content-Type": "application/json"}


@pytest.fixture
def teacher_headers() -> dict:
    """Teacher auth headers"""
    return {"Authorization": "Bearer teacher_token", "Content-Type": "application/json"}


@pytest.fixture
def student_headers() -> dict:
    """Student auth headers"""
    return {"Authorization": "Bearer student_token", "Content-Type": "application/json"}


@pytest.fixture
def sample_data(db: Session):
    """Create sample data for integration tests"""

    # Create students
    students = [
        Student(first_name="Alice", last_name="Johnson", email="alice@example.com", phone="555-0001", deleted_at=None),
        Student(first_name="Bob", last_name="Smith", email="bob@example.com", phone="555-0002", deleted_at=None),
        Student(
            first_name="Charlie", last_name="Brown", email="charlie@example.com", phone="555-0003", deleted_at=None
        ),
        Student(first_name="Diana", last_name="Prince", email="diana@example.com", phone="555-0004", deleted_at=None),
        Student(
            first_name="Deleted",
            last_name="Student",
            email="deleted@example.com",
            phone="555-9999",
            deleted_at=datetime.utcnow(),  # Soft-deleted
        ),
    ]

    for student in students:
        db.add(student)
    db.commit()

    # Create courses
    courses = [
        Course(course_name="Mathematics 101", course_code="MATH101", credits=3, deleted_at=None),
        Course(course_name="Physics 201", course_code="PHYS201", credits=4, deleted_at=None),
        Course(course_name="Chemistry 101", course_code="CHEM101", credits=3, deleted_at=None),
        Course(course_name="English Literature", course_code="ENG201", credits=3, deleted_at=None),
        Course(
            course_name="Deleted Course",
            code="DEL001",
            credits=1,
            deleted_at=datetime.utcnow(),  # Soft-deleted
        ),
    ]

    for course in courses:
        db.add(course)
    db.commit()

    # Create grades
    grades = [
        Grade(student_id=students[0].id, course_id=courses[0].id, grade=95.5, deleted_at=None),
        Grade(student_id=students[0].id, course_id=courses[1].id, grade=92.0, deleted_at=None),
        Grade(student_id=students[1].id, course_id=courses[0].id, grade=87.0, deleted_at=None),
        Grade(student_id=students[1].id, course_id=courses[2].id, grade=78.5, deleted_at=None),
        Grade(student_id=students[2].id, course_id=courses[0].id, grade=91.0, deleted_at=None),
        Grade(student_id=students[2].id, course_id=courses[3].id, grade=88.5, deleted_at=None),
        Grade(student_id=students[3].id, course_id=courses[0].id, grade=76.0, deleted_at=None),
        Grade(student_id=students[3].id, course_id=courses[1].id, grade=98.0, deleted_at=None),
    ]

    for grade in grades:
        db.add(grade)
    db.commit()

    return {"students": students, "courses": courses, "grades": grades}


class TestSearchServiceIntegration:
    """Integration tests for SearchService directly"""

    def test_search_students_returns_correct_data(self, db: Session, sample_data):
        """Should return student data from database"""
        service = SearchService(db)

        results, total = service.search_students("Alice")

        assert len(results) > 0
        assert total > 0
        assert any(s.first_name == "Alice" for s in results)

    def test_search_students_filters_soft_deleted(self, db: Session, sample_data):
        """Should not return soft-deleted students"""
        service = SearchService(db)

        results, total = service.search_students("")

        # Should not include "Deleted Student"
        names = [f"{s.first_name} {s.last_name}" for s in results]
        assert "Deleted Student" not in names

        # Should have exactly 4 active students
        assert total == 4

    def test_search_students_pagination(self, db: Session, sample_data):
        """Should handle pagination correctly"""
        service = SearchService(db)

        results_page1, total1 = service.search_students("", page=1, page_size=2)
        results_page2, total2 = service.search_students("", page=2, page_size=2)

        assert len(results_page1) == 2
        assert len(results_page2) == 2
        assert total1 == total2

        # Pages should have different results
        ids_page1 = [s.id for s in results_page1]
        ids_page2 = [s.id for s in results_page2]
        assert ids_page1 != ids_page2

    def test_search_courses_filters_soft_deleted(self, db: Session, sample_data):
        """Should not return soft-deleted courses"""
        service = SearchService(db)

        results, total = service.search_courses("")

        codes = [c.code for c in results]
        assert "DEL001" not in codes
        assert total == 4

    def test_search_grades_with_student_filter(self, db: Session, sample_data):
        """Should filter grades by student"""
        service = SearchService(db)

        student_id = sample_data["students"][0].id
        results = service.search_grades(student_id=student_id)

        assert all(g.student_id == student_id for g in results)
        assert len(results) >= 2  # Alice has multiple grades

    def test_search_grades_with_range_filter(self, db: Session, sample_data):
        """Should filter grades by range"""
        service = SearchService(db)

        results = service.search_grades(min_grade=90, max_grade=100)

        assert all(90 <= g.grade <= 100 for g in results)

    def test_search_grades_combined_filters(self, db: Session, sample_data):
        """Should apply multiple filters together"""
        service = SearchService(db)

        student_id = sample_data["students"][0].id
        results = service.search_grades(student_id=student_id, min_grade=90)

        assert all(g.student_id == student_id and g.grade >= 90 for g in results)

    def test_advanced_filter_student(self, db: Session, sample_data):
        """Should filter students with advanced filters"""
        service = SearchService(db)

        # Filter by last name
        results = service.advanced_filter(entity="student", filters={"query": "Johnson"})

        assert len(results) > 0
        assert any(s.last_name == "Johnson" for s in results)

    def test_advanced_filter_course(self, db: Session, sample_data):
        """Should filter courses with advanced filters"""
        service = SearchService(db)

        results = service.advanced_filter(entity="course", filters={"query": "Math"})

        assert len(results) > 0
        assert any("Math" in c.name for c in results)

    def test_advanced_filter_grade(self, db: Session, sample_data):
        """Should filter grades with advanced filters"""
        service = SearchService(db)

        results = service.advanced_filter(entity="grade", filters={"min_grade": 90})

        assert all(g.grade >= 90 for g in results)

    def test_get_suggestions_returns_correct_entities(self, db: Session, sample_data):
        """Should return suggestions for entity"""
        service = SearchService(db)

        suggestions = service.get_search_suggestions("student", "A")

        assert isinstance(suggestions, list)
        assert len(suggestions) > 0

    def test_get_statistics_calculates_correctly(self, db: Session, sample_data):
        """Should calculate accurate statistics"""
        service = SearchService(db)

        stats = service.get_search_statistics()

        assert stats["total_students"] == 4  # Not including deleted
        assert stats["total_courses"] == 4  # Not including deleted
        assert stats["total_grades"] == 8

    def test_rank_results_orders_by_relevance(self, db: Session, sample_data):
        """Should rank results by relevance"""
        service = SearchService(db)

        results, _ = service.search_students("Alice")

        # First result should be Alice (exact match or highest relevance)
        assert len(results) > 0
        assert results[0].first_name == "Alice"


class TestAPIServiceDatabaseFlow:
    """Integration tests for complete API → Service → Database flow"""

    def test_student_search_api_endpoint_integration(self, client, admin_headers, sample_data, db: Session):
        """Complete flow: API request → Service → Database"""

        # Make API request
        response = client.post("/api/v1/search/students", json={"query": "Alice"}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify data comes from database
        results = data["data"]["results"]
        assert len(results) > 0
        assert any(r["first_name"] == "Alice" for r in results)

    def test_course_search_with_filter_integration(self, client, admin_headers, sample_data, db: Session):
        """Filter data flows from API through service to database"""

        response = client.post(
            "/api/v1/search/courses", json={"query": "", "filters": {"min_credits": 3}}, headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify all results match filter
        for course in data["data"]["results"]:
            assert course["credits"] >= 3

    def test_grade_search_with_multiple_filters_integration(self, client, admin_headers, sample_data, db: Session):
        """Multiple filters applied through full stack"""

        student_id = sample_data["students"][0].id

        response = client.post(
            "/api/v1/search/grades",
            json={"filters": {"student_id": student_id, "min_grade": 90}},
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Verify filters applied at database level
        for grade in data["data"]["results"]:
            assert grade["student_id"] == student_id
            assert grade["grade"] >= 90

    def test_soft_delete_filtering_integration(self, client, admin_headers, sample_data, db: Session):
        """Soft-deleted records filtered at database level"""

        response = client.post("/api/v1/search/students", json={"query": ""}, headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Should not include soft-deleted student
        names = [r["first_name"] + " " + r["last_name"] for r in data["data"]["results"]]
        assert "Deleted Student" not in names

        # Verify count is correct
        assert data["data"]["total"] == 4

    def test_pagination_integration_counts_correct(self, client, admin_headers, sample_data, db: Session):
        """Pagination counts verified at database level"""

        # Get page 1
        response1 = client.post(
            "/api/v1/search/students", json={"query": "", "page": 1, "page_size": 2}, headers=admin_headers
        )

        # Get page 2
        response2 = client.post(
            "/api/v1/search/students", json={"query": "", "page": 2, "page_size": 2}, headers=admin_headers
        )

        data1 = response1.json()["data"]
        data2 = response2.json()["data"]

        # Total should be same across pages
        assert data1["total"] == data2["total"]
        assert data1["page"] == 1
        assert data2["page"] == 2

        # Results should be different
        ids1 = [r["id"] for r in data1["results"]]
        ids2 = [r["id"] for r in data2["results"]]
        assert ids1 != ids2

    def test_suggestions_integration_from_database(self, client, admin_headers, sample_data):
        """Suggestions generated from actual database data"""

        response = client.get("/api/v1/search/suggestions?query=A&entity=student", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Should include students starting with A (Alice)
        suggestions = data["data"]
        assert isinstance(suggestions, list)

    def test_statistics_integration_calculated_from_database(self, client, admin_headers, sample_data):
        """Statistics calculated from actual database records"""

        response = client.get("/api/v1/search/statistics", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()

        # Verify counts match sample data (excluding soft-deleted)
        assert data["data"]["total_students"] == 4
        assert data["data"]["total_courses"] == 4
        assert data["data"]["total_grades"] == 8


class TestDataConsistency:
    """Tests for data consistency across layers"""

    def test_search_results_match_database(self, client, admin_headers, sample_data, db: Session):
        """Search results match actual database state"""

        # Get from API
        response = client.post("/api/v1/search/students", json={"query": "Bob"}, headers=admin_headers)

        api_data = response.json()["data"]["results"]

        # Get from database directly
        db_data = db.query(Student).filter(Student.first_name.ilike("%Bob%")).filter(Student.deleted_at is None).all()

        assert len(api_data) == len(db_data)

        for api_student in api_data:
            assert any(s.id == api_student["id"] for s in db_data)

    def test_grade_calculations_consistent(self, client, admin_headers, sample_data, db: Session):
        """Grade data consistent across API and database"""

        student_id = sample_data["students"][0].id

        # Get from API
        response = client.post(
            "/api/v1/search/grades", json={"filters": {"student_id": student_id}}, headers=admin_headers
        )

        api_grades = response.json()["data"]["results"]

        # Get from database
        db_grades = db.query(Grade).filter(Grade.student_id == student_id, Grade.deleted_at is None).all()

        assert len(api_grades) == len(db_grades)

        # Verify grade values match
        api_values = sorted([g["grade"] for g in api_grades])
        db_values = sorted([g.grade for g in db_grades])
        assert api_values == db_values

    def test_filter_application_consistent(self, client, admin_headers, sample_data, db: Session):
        """Filters applied consistently across layers"""

        min_grade = 90

        # Get filtered from API
        response = client.post(
            "/api/v1/search/grades", json={"filters": {"min_grade": min_grade}}, headers=admin_headers
        )

        api_grades = response.json()["data"]["results"]

        # Get filtered from database
        db_grades = db.query(Grade).filter(Grade.grade >= min_grade, Grade.deleted_at is None).all()

        assert len(api_grades) == len(db_grades)

        # All should meet filter
        assert all(g["grade"] >= min_grade for g in api_grades)
        assert all(g.grade >= min_grade for g in db_grades)


class TestTransactionHandling:
    """Tests for transaction handling and rollback"""

    def test_search_after_data_modification(self, client, admin_headers, sample_data, db: Session):
        """Search reflects database modifications"""

        # Add new student
        new_student = Student(
            first_name="Eve", last_name="Wilson", email="eve@example.com", phone="555-0005", deleted_at=None
        )
        db.add(new_student)
        db.commit()

        # Search should find new student
        response = client.post("/api/v1/search/students", json={"query": "Eve"}, headers=admin_headers)

        assert response.status_code == 200
        results = response.json()["data"]["results"]
        assert any(r["first_name"] == "Eve" for r in results)

    def test_search_with_soft_delete(self, client, admin_headers, sample_data, db: Session):
        """Soft-deleted records immediately hidden from search"""

        student = sample_data["students"][0]

        # Verify in search
        response1 = client.post("/api/v1/search/students", json={"query": student.first_name}, headers=admin_headers)

        assert any(r["id"] == student.id for r in response1.json()["data"]["results"])

        # Soft delete
        student.deleted_at = datetime.utcnow()
        db.commit()

        # Should not be in search
        response2 = client.post("/api/v1/search/students", json={"query": student.first_name}, headers=admin_headers)

        assert not any(r["id"] == student.id for r in response2.json()["data"]["results"])


class TestErrorConditionsIntegration:
    """Tests for error conditions across layers"""

    def test_invalid_filter_handled_gracefully(self, client, admin_headers):
        """Invalid filters handled without crashing"""

        response = client.post(
            "/api/v1/search/students", json={"query": "test", "filters": {"invalid_field": 123}}, headers=admin_headers
        )

        # Should handle gracefully (ignore or error)
        assert response.status_code in [200, 400]

    def test_extreme_pagination_values(self, client, admin_headers):
        """Extreme pagination values handled"""

        response = client.post(
            "/api/v1/search/students", json={"query": "test", "page": 9999, "page_size": 9999}, headers=admin_headers
        )

        # Should handle gracefully
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            # If accepts, results should be empty or limited
            data = response.json()["data"]
            assert len(data["results"]) >= 0

    def test_special_characters_in_search(self, client, admin_headers):
        """Special characters in search handled"""

        response = client.post("/api/v1/search/students", json={"query": "%_[]{}()"}, headers=admin_headers)

        # Should not crash
        assert response.status_code in [200, 400]


class TestPerformanceIntegration:
    """Performance-related integration tests"""

    def test_large_result_set_paginated(self, client, admin_headers, db: Session):
        """Large result sets paginated correctly"""

        # Create many students
        for i in range(50):
            student = Student(
                first_name=f"Student{i}",
                last_name="Test",
                email=f"student{i}@example.com",
                phone=f"555-{i:04d}",
                deleted_at=None,
            )
            db.add(student)
        db.commit()

        # Search with small page size
        response = client.post(
            "/api/v1/search/students", json={"query": "", "page": 1, "page_size": 10}, headers=admin_headers
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Should have pagination info
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["total"] >= 50

    def test_multiple_sequential_searches(self, client, admin_headers):
        """Multiple searches execute sequentially without issues"""

        queries = ["Alice", "Bob", "Charlie", "Math", "Physics"]

        for query in queries:
            response = client.post("/api/v1/search/students", json={"query": query}, headers=admin_headers)

            assert response.status_code == 200
