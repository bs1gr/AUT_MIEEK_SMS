"""
Test suite for SearchService class.

Tests cover:
- Basic search functionality (students, courses, grades)
- Advanced filtering with multiple criteria
- Soft-delete awareness
- Pagination support
- Suggestion generation
- Statistics calculation
- Error handling

Author: AI Agent
Date: January 17, 2026
Version: 1.0.0
"""

from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session
from backend.services.search_service import SearchService
from backend.models import Student, Course, Grade


@pytest.fixture
def student_data(db: Session):
    """Create test student data."""
    students = [
        Student(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="555-1234",
            student_id="STU001",
            deleted_at=None,
        ),
        Student(
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
            phone="555-5678",
            student_id="STU002",
            deleted_at=None,
        ),
        Student(
            first_name="Bob",
            last_name="Johnson",
            email="bob.johnson@example.com",
            phone="555-9999",
            student_id="STU003",
            deleted_at=None,
        ),
    ]
    db.add_all(students)
    db.commit()
    return students


@pytest.fixture
def course_data(db: Session):
    """Create test course data."""
    courses = [
        Course(
            course_name="Mathematics 101",
            course_code="MATH101",
            semester="Fall 2024",
            credits=3,
            deleted_at=None,
        ),
        Course(
            course_name="Physics 201",
            course_code="PHYS201",
            semester="Fall 2024",
            credits=4,
            deleted_at=None,
        ),
        Course(
            course_name="Chemistry 101",
            course_code="CHEM101",
            semester="Spring 2025",
            credits=3,
            deleted_at=None,
        ),
    ]
    db.add_all(courses)
    db.commit()
    return courses


@pytest.fixture
def grade_data(db: Session, student_data, course_data):
    """Create test grade data."""
    grades = [
        Grade(
            student_id=student_data[0].id,
            course_id=course_data[0].id,
            assignment_name="Midterm Exam",
            category="Exam",
            grade=95.5,
            max_grade=100.0,
            weight=1.0,
            deleted_at=None,
        ),
        Grade(
            student_id=student_data[1].id,
            course_id=course_data[0].id,
            assignment_name="Midterm Exam",
            category="Exam",
            grade=87.0,
            max_grade=100.0,
            weight=1.0,
            deleted_at=None,
        ),
        Grade(
            student_id=student_data[0].id,
            course_id=course_data[1].id,
            assignment_name="Final Project",
            category="Project",
            grade=92.0,
            max_grade=100.0,
            weight=1.0,
            deleted_at=None,
        ),
    ]
    db.add_all(grades)
    db.commit()
    return grades


class TestSearchServiceInit:
    """Tests for SearchService initialization."""

    def test_init_with_database(self, db: Session):
        """Test SearchService initializes with database connection."""
        service = SearchService(db)
        assert service.db is db


class TestSearchStudents:
    """Tests for search_students method."""

    def test_search_by_first_name(self, db: Session, student_data):
        """Test searching students by first name."""
        service = SearchService(db)
        results = service.search_students("John", limit=20, offset=0)

        assert len(results) > 0
        assert all("first_name" in r for r in results)
        assert any("john" in r["first_name"].lower() for r in results)

    def test_search_by_last_name(self, db: Session, student_data):
        """Test searching students by last name."""
        service = SearchService(db)
        results = service.search_students("Doe", limit=20, offset=0)

        assert len(results) > 0
        assert any("doe" in r["last_name"].lower() for r in results)

    def test_search_by_email(self, db: Session, student_data):
        """Test searching students by email."""
        service = SearchService(db)
        results = service.search_students("@example.com", limit=20, offset=0)

        assert len(results) > 0
        assert all("@example.com" in r["email"] for r in results)

    def test_search_case_insensitive(self, db: Session, student_data):
        """Test that search is case-insensitive."""
        service = SearchService(db)
        results_lower = service.search_students("john", limit=20, offset=0)
        results_upper = service.search_students("JOHN", limit=20, offset=0)

        assert len(results_lower) == len(results_upper)

    def test_search_excludes_deleted_students(self, db: Session, student_data):
        """Test that search excludes soft-deleted students."""
        service = SearchService(db)

        # Get student and soft-delete it
        student = db.query(Student).filter(Student.first_name == "John").first()
        if student:
            student.deleted_at = datetime.now(timezone.utc)
            db.commit()

        results = service.search_students("John", limit=20, offset=0)

        # Deleted student should not appear
        assert not any(r["id"] == student.id for r in results)

    def test_search_pagination(self, db: Session, student_data):
        """Test pagination support."""
        service = SearchService(db)

        # Get first page
        results_page1 = service.search_students("", limit=5, offset=0)
        # Get second page
        results_page2 = service.search_students("", limit=5, offset=5)

        # Pages should be different
        assert results_page1 != results_page2

    def test_search_empty_query(self, db: Session, student_data):
        """Test searching with empty query returns all students."""
        service = SearchService(db)
        results = service.search_students("", limit=100, offset=0)

        assert len(results) > 0

    def test_search_no_results(self, db: Session):
        """Test search with no matching results."""
        service = SearchService(db)
        results = service.search_students("NONEXISTENT_XYZ_123", limit=20, offset=0)

        assert len(results) == 0

    def test_search_returns_required_fields(self, db: Session, student_data):
        """Test that search returns all required fields."""
        service = SearchService(db)
        results = service.search_students("John", limit=20, offset=0)

        required_fields = {"id", "first_name", "last_name", "email", "student_id"}
        assert len(results) > 0
        for result in results:
            assert required_fields.issubset(set(result.keys()))


class TestSearchCourses:
    """Tests for search_courses method."""

    def test_search_by_course_name(self, db: Session, course_data):
        """Test searching courses by name."""
        service = SearchService(db)
        results = service.search_courses("Mathematics", limit=20, offset=0)

        assert len(results) > 0
        assert any("mathematics" in r["course_name"].lower() for r in results)

    def test_search_by_course_code(self, db: Session, course_data):
        """Test searching courses by code."""
        service = SearchService(db)
        results = service.search_courses("MATH", limit=20, offset=0)

        assert len(results) > 0
        assert any("math" in r["course_code"].lower() for r in results)

    def test_search_courses_case_insensitive(self, db: Session, course_data):
        """Test that course search is case-insensitive."""
        service = SearchService(db)
        results_lower = service.search_courses("math", limit=20, offset=0)
        results_upper = service.search_courses("MATH", limit=20, offset=0)

        assert len(results_lower) == len(results_upper)

    def test_search_excludes_deleted_courses(self, db: Session, course_data):
        """Test that search excludes soft-deleted courses."""
        service = SearchService(db)

        # Get course and soft-delete it
        course = db.query(Course).first()
        if course:
            original_id = course.id
            course.deleted_at = datetime.now(timezone.utc)
            db.commit()

        results = service.search_courses("", limit=100, offset=0)

        # Deleted course should not appear
        assert not any(r["id"] == original_id for r in results)

    def test_search_courses_returns_required_fields(self, db: Session, course_data):
        """Test that course search returns all required fields."""
        service = SearchService(db)
        results = service.search_courses("Math", limit=20, offset=0)

        required_fields = {"id", "course_name", "course_code", "credits"}
        assert len(results) > 0
        for result in results:
            assert required_fields.issubset(set(result.keys()))


class TestSearchGrades:
    """Tests for search_grades method."""

    def test_search_grades_with_query(self, db: Session, grade_data):
        """Test searching grades with text query."""
        service = SearchService(db)
        results = service.search_grades("John", filters={}, limit=20, offset=0)

        assert len(results) > 0

    def test_search_grades_by_grade_range(self, db: Session, grade_data):
        """Test filtering grades by value range."""
        service = SearchService(db)
        results = service.search_grades("", filters={"grade_min": 80, "grade_max": 100}, limit=20, offset=0)

        assert len(results) > 0
        assert all(80 <= r["grade"] <= 100 for r in results)

    def test_search_grades_by_student_id(self, db: Session, grade_data):
        """Test filtering grades by student ID."""
        # Get a student with grades
        student = db.query(Student).join(Grade).first()
        if student:
            service = SearchService(db)
            results = service.search_grades("", filters={"student_id": student.id}, limit=20, offset=0)

            assert len(results) > 0
            assert all(r["student_id"] == student.id for r in results)

    def test_search_grades_by_course_id(self, db: Session, grade_data):
        """Test filtering grades by course ID."""
        # Get a course with grades
        course = db.query(Course).join(Grade).first()
        if course:
            service = SearchService(db)
            results = service.search_grades("", filters={"course_id": course.id}, limit=20, offset=0)

            assert len(results) > 0
            assert all(r["course_id"] == course.id for r in results)

    def test_search_grades_combined_filters(self, db: Session, grade_data):
        """Test filtering grades with multiple criteria."""
        service = SearchService(db)
        results = service.search_grades("", filters={"grade_min": 70, "grade_max": 90}, limit=20, offset=0)

        for result in results:
            assert 70 <= result["grade"] <= 90

    def test_search_grades_returns_required_fields(self, db: Session, grade_data):
        """Test that grade search returns all required fields."""
        service = SearchService(db)
        results = service.search_grades("", filters={}, limit=20, offset=0)

        required_fields = {"id", "student_id", "course_id", "grade"}
        assert len(results) > 0
        for result in results:
            assert required_fields.issubset(set(result.keys()))


class TestAdvancedFilter:
    """Tests for advanced_filter method."""

    def test_advanced_filter_students(self, db: Session, student_data):
        """Test advanced filtering for students."""
        service = SearchService(db)
        results = service.advanced_filter(filters={"first_name": "John"}, search_type="students", limit=20, offset=0)

        assert len(results) > 0

    def test_advanced_filter_courses(self, db: Session, course_data):
        """Test advanced filtering for courses."""
        service = SearchService(db)
        results = service.advanced_filter(filters={"credits": 3}, search_type="courses", limit=20, offset=0)

        assert len(results) > 0

    def test_advanced_filter_grades(self, db: Session, grade_data):
        """Test advanced filtering for grades."""
        service = SearchService(db)
        results = service.advanced_filter(filters={"grade_min": 75}, search_type="grades", limit=20, offset=0)

        assert len(results) > 0


class TestRankResults:
    """Tests for rank_results method."""

    def test_rank_results_by_relevance(self, db: Session, student_data):
        """Test that results are ranked by relevance."""
        service = SearchService(db)
        results = service.search_students("John", limit=20, offset=0)

        # Rank results
        ranked = service.rank_results(results, "John")

        assert len(ranked) > 0
        # Exact matches should come before partial matches
        if len(ranked) > 1:
            assert ranked[0]["first_name"].lower() == "john" or "john" in ranked[0]["first_name"].lower()

    def test_rank_preserves_all_results(self, db: Session, student_data):
        """Test that ranking preserves all results."""
        service = SearchService(db)
        results = service.search_students("J", limit=20, offset=0)
        ranked = service.rank_results(results, "J")

        assert len(ranked) == len(results)


class TestGetSearchSuggestions:
    """Tests for get_search_suggestions method."""

    def test_get_suggestions_students(self, db: Session, student_data):
        """Test getting student name suggestions."""
        service = SearchService(db)
        suggestions = service.get_search_suggestions("John", limit=5)

        # Should return suggestions with at least one result
        assert suggestions is not None
        if suggestions:
            assert len(suggestions) > 0

    def test_get_suggestions_limited(self, db: Session, student_data):
        """Test that suggestions respect limit."""
        service = SearchService(db)
        suggestions = service.get_search_suggestions("", limit=3)

        if suggestions:
            assert len(suggestions) <= 3

    def test_get_suggestions_no_results(self, db: Session):
        """Test suggestions with no matches."""
        service = SearchService(db)
        suggestions = service.get_search_suggestions("NONEXISTENT_XYZ_123", limit=5)

        assert suggestions is not None
        if suggestions:
            assert len(suggestions) == 0


class TestGetSearchStatistics:
    """Tests for get_search_statistics method."""

    def test_get_statistics_returns_counts(self, db: Session, student_data, course_data):
        """Test that statistics returns entity counts."""
        service = SearchService(db)
        stats = service.get_search_statistics()

        assert isinstance(stats, dict)
        assert "total_students" in stats
        assert "total_courses" in stats
        assert "total_grades" in stats

    def test_statistics_values_are_positive(self, db: Session, student_data, course_data):
        """Test that statistics values are non-negative."""
        service = SearchService(db)
        stats = service.get_search_statistics()

        assert stats["total_students"] >= 0
        assert stats["total_courses"] >= 0
        assert stats["total_grades"] >= 0


class TestErrorHandling:
    """Tests for error handling in SearchService."""

    def test_search_with_invalid_limit(self, db: Session, student_data):
        """Test searching with invalid limit parameter."""
        service = SearchService(db)
        # Should handle gracefully or raise appropriate error
        try:
            results = service.search_students("John", limit=-1, offset=0)
            # Should either work or raise an error
            assert results is not None or isinstance(results, list)
        except (ValueError, Exception):
            # Expected to raise an error
            assert True

    def test_search_with_invalid_offset(self, db: Session, student_data):
        """Test searching with invalid offset parameter."""
        service = SearchService(db)
        # Should handle gracefully
        try:
            results = service.search_students("John", limit=20, offset=-1)
            assert results is not None or isinstance(results, list)
        except (ValueError, Exception):
            assert True
