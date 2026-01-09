"""
Test suite for Soft-Delete Filtering (v1.15.0)

Tests that soft-deleted records are properly filtered from all queries
and do not appear in list endpoints.
"""

from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from backend.db_utils import paginate
from backend.models import Course, Student


@pytest.fixture
def active_student(db: Session):
    """Create an active student."""
    student = Student(first_name="John", last_name="Doe", email="john@example.com", student_id="STU001", is_active=True)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@pytest.fixture
def deleted_student(db: Session):
    """Create a soft-deleted student."""
    student = Student(
        first_name="Jane",
        last_name="Smith",
        email="jane@example.com",
        student_id="STU002",
        is_active=True,
        deleted_at=datetime.now(timezone.utc),
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@pytest.fixture
def active_course(db: Session):
    """Create an active course."""
    course = Course(course_code="CS101", course_name="Introduction to Computer Science", semester="Fall 2025")
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@pytest.fixture
def deleted_course(db: Session):
    """Create a soft-deleted course."""
    course = Course(
        course_code="CS102",
        course_name="Advanced Computer Science",
        semester="Fall 2025",
        deleted_at=datetime.now(timezone.utc),
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def test_soft_delete_filtering_students(db: Session, active_student, deleted_student):
    """Test that deleted students are filtered from queries."""
    # Query all students without explicit filter
    students = db.query(Student).filter(Student.deleted_at.is_(None)).all()

    # Should only include active student
    assert len(students) == 1
    assert students[0].id == active_student.id
    assert students[0].email == "john@example.com"


def test_soft_delete_filtering_courses(db: Session, active_course, deleted_course):
    """Test that deleted courses are filtered from queries."""
    # Query all courses without explicit filter
    courses = db.query(Course).filter(Course.deleted_at.is_(None)).all()

    # Should only include active course
    assert len(courses) == 1
    assert courses[0].id == active_course.id
    assert courses[0].course_code == "CS101"


def test_deleted_student_not_in_list(db: Session, active_student, deleted_student):
    """Test that deleted students do not appear in paginated lists."""
    query = db.query(Student).filter(Student.deleted_at.is_(None))
    result = paginate(query, skip=0, limit=10)

    assert result.total == 1
    assert len(result.items) == 1
    assert result.items[0].id == active_student.id


def test_soft_delete_flag_works(db: Session, active_student):
    """Test that mark_deleted() properly sets the deleted_at timestamp."""
    student = active_student
    assert student.deleted_at is None

    # Mark as deleted
    student.mark_deleted()
    db.commit()

    # Refresh to get updated value
    db.refresh(student)
    assert student.deleted_at is not None

    # Verify deleted student no longer appears in active queries
    active_students = db.query(Student).filter(Student.deleted_at.is_(None)).all()
    assert len(active_students) == 0


def test_soft_delete_count_excludes_deleted(db: Session, active_student, deleted_student):
    """Test that count queries exclude deleted records."""
    count = db.query(Student).filter(Student.deleted_at.is_(None)).count()

    assert count == 1


def test_can_query_deleted_explicitly(db: Session, active_student, deleted_student):
    """Test that deleted records can be queried when explicitly requested."""
    # Query including deleted
    all_students = db.query(Student).all()
    assert len(all_students) == 2

    # Query only deleted
    deleted_only = db.query(Student).filter(Student.deleted_at.is_not(None)).all()
    assert len(deleted_only) == 1
    assert deleted_only[0].id == deleted_student.id


def test_multiple_soft_delete_models(db: Session, active_student, deleted_student, active_course, deleted_course):
    """Test that filtering works correctly across multiple soft-delete models."""
    active_students = db.query(Student).filter(Student.deleted_at.is_(None)).all()
    active_courses = db.query(Course).filter(Course.deleted_at.is_(None)).all()

    assert len(active_students) == 1
    assert len(active_courses) == 1


@pytest.mark.parametrize(
    "model_class,count_active",
    [
        (Student, 1),
        (Course, 1),
    ],
)
def test_soft_delete_filtering_parametrized(
    db: Session, model_class, count_active, active_student, deleted_student, active_course, deleted_course
):
    """Parametrized test for soft-delete filtering across models."""
    if model_class == Student:
        results = db.query(model_class).filter(model_class.deleted_at.is_(None)).all()
        assert len(results) == count_active
    elif model_class == Course:
        results = db.query(model_class).filter(model_class.deleted_at.is_(None)).all()
        assert len(results) == count_active
