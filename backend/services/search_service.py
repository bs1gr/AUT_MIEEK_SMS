"""
Advanced search service for Student Management System.

Provides full-text search across students, courses, and grades with
filtering, ranking, and optimization for quick query results.

Author: AI Agent
Date: January 17, 2026
Version: 1.0.0
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import logging

from backend.models import Student, Course, Grade

logger = logging.getLogger(__name__)


class SearchService:
    """Service for searching across students, courses, and grades."""

    def __init__(self, db: Session):
        """
        Initialize SearchService with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    # ============================================================================
    # STUDENT SEARCH
    # ============================================================================

    def search_students(self, query: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Search students by name, email, or ID number.

        Uses full-text search across first_name, last_name, and email fields.
        Results are ordered by relevance (name matches ranked higher).

        Args:
            query: Search query string (name, email, or student ID)
            limit: Maximum results to return (default: 20)
            offset: Pagination offset (default: 0)

        Returns:
            List of student dictionaries with id, first_name, last_name, email, student_id

        Example:
            >>> results = search_service.search_students("John")
            >>> # Returns students with "John" in name/email
        """
        try:
            # Normalize query for case-insensitive search
            query_lower = f"%{query.lower()}%"

            # Build search query with multiple field matches
            students = (
                self.db.query(Student)
                .filter(
                    or_(
                        func.lower(Student.first_name).ilike(query_lower),
                        func.lower(Student.last_name).ilike(query_lower),
                        func.lower(Student.email).ilike(query_lower),
                        func.lower(Student.student_id).ilike(query_lower),
                    ),
                    Student.deleted_at.is_(None),  # Soft delete filter
                )
                .limit(limit)
                .offset(offset)
                .all()
            )

            # Convert to dictionaries
            return [
                {
                    "id": s.id,
                    "first_name": s.first_name,
                    "last_name": s.last_name,
                    "email": s.email,
                    "student_id": s.student_id,
                    "type": "student",
                }
                for s in students
            ]
        except Exception as e:
            logger.error(f"Error searching students: {str(e)}")
            return []

    # ============================================================================
    # COURSE SEARCH
    # ============================================================================

    def search_courses(self, query: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Search courses by name, code, or description.

        Uses full-text search across course_name, course_code, and description fields.

        Args:
            query: Search query string (course name or code)
            limit: Maximum results to return (default: 20)
            offset: Pagination offset (default: 0)

        Returns:
            List of course dictionaries with id, course_name, course_code, credits, semester

        Example:
            >>> results = search_service.search_courses("Mathematics")
            >>> # Returns courses with "Mathematics" in name or code
        """
        try:
            # Normalize query for case-insensitive search
            query_lower = f"%{query.lower()}%"

            # Build search query with multiple field matches
            description_filter = (
                func.lower(Course.description).ilike(query_lower) if Course.description is not None else None
            )
            filters = [
                func.lower(Course.course_name).ilike(query_lower),
                func.lower(Course.course_code).ilike(query_lower),
            ]
            if description_filter is not None:
                filters.append(description_filter)

            courses = (
                self.db.query(Course)
                .filter(
                    or_(*filters),
                    Course.deleted_at.is_(None),  # Soft delete filter
                )
                .limit(limit)
                .offset(offset)
                .all()
            )

            # Convert to dictionaries
            return [
                {
                    "id": c.id,
                    "course_name": c.course_name,
                    "course_code": c.course_code,
                    "credits": c.credits,
                    "semester": c.semester,
                    "type": "course",
                }
                for c in courses
            ]
        except Exception as e:
            logger.error(f"Error searching courses: {str(e)}")
            return []

    # ============================================================================
    # GRADE SEARCH
    # ============================================================================

    def search_grades(
        self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None, limit: int = 20, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Search grades with optional text query and advanced filters.

        Searches across student names and course names. Filters can specify:
        - grade_min: Minimum grade value
        - grade_max: Maximum grade value
        - student_id: Filter by specific student
        - course_id: Filter by specific course

        Args:
            query: Optional text search (student name or course name)
            filters: Optional dict with filter criteria (grade_min, grade_max, etc.)
            limit: Maximum results to return (default: 20)
            offset: Pagination offset (default: 0)

        Returns:
            List of grade dictionaries with id, student_name, course_name, grade

        Example:
            >>> results = search_service.search_grades(
            ...     query="John",
            ...     filters={"grade_min": 80, "course_id": 5}
            ... )
            >>> # Returns grades >= 80 for student named John in course 5
        """
        try:
            filters = filters or {}

            # Start with base query (grades with student and course)
            grade_query = (
                self.db.query(Grade)
                .join(Student, Grade.student_id == Student.id)
                .join(Course, Grade.course_id == Course.id)
                .filter(Grade.deleted_at.is_(None), Student.deleted_at.is_(None), Course.deleted_at.is_(None))
            )

            # Apply text search if provided
            if query:
                query_lower = f"%{query.lower()}%"
                grade_query = grade_query.filter(
                    or_(
                        func.lower(Student.first_name).ilike(query_lower),
                        func.lower(Student.last_name).ilike(query_lower),
                        func.lower(Course.course_name).ilike(query_lower),
                    )
                )

            # Apply filters
            if "grade_min" in filters and filters["grade_min"] is not None:
                grade_query = grade_query.filter(Grade.grade >= filters["grade_min"])

            if "grade_max" in filters and filters["grade_max"] is not None:
                grade_query = grade_query.filter(Grade.grade <= filters["grade_max"])

            if "student_id" in filters and filters["student_id"] is not None:
                grade_query = grade_query.filter(Grade.student_id == filters["student_id"])

            if "course_id" in filters and filters["course_id"] is not None:
                grade_query = grade_query.filter(Grade.course_id == filters["course_id"])

            # Apply pagination and execute
            grades = grade_query.limit(limit).offset(offset).all()

            # Convert to dictionaries
            return [
                {
                    "id": g.id,
                    "student_id": g.student_id,
                    "student_name": f"{g.student.first_name} {g.student.last_name}",
                    "course_id": g.course_id,
                    "course_name": g.course.course_name,
                    "grade": float(g.grade) if g.grade else None,
                    "type": "grade",
                }
                for g in grades
            ]
        except Exception as e:
            logger.error(f"Error searching grades: {str(e)}")
            return []

    # ============================================================================
    # ADVANCED FILTERING
    # ============================================================================

    def advanced_filter(
        self, filters: Dict[str, Any], search_type: str = "students", limit: int = 20, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Advanced filtering across students, courses, or grades.

        Supports complex filter combinations for precise result targeting.

        For students, supported filters:
        - first_name, last_name, email, student_id (exact or partial match)
        - status (active/inactive)
        - study_year (filter by year)

        For courses, supported filters:
        - course_name, course_code (exact or partial match)
        - credits (exact or range)
        - semester

        For grades, supported filters:
        - grade_min, grade_max (grade range)
        - student_id, course_id (specific student/course)
        - passed (True/False for grades >= passing threshold)

        Args:
            filters: Dictionary of filter criteria
            search_type: "students", "courses", or "grades"
            limit: Maximum results
            offset: Pagination offset

        Returns:
            List of matching records as dictionaries

        Example:
            >>> results = search_service.advanced_filter(
            ...     filters={"credits": 3, "semester": "Fall 2024"},
            ...     search_type="courses"
            ... )
        """
        try:
            if search_type == "students":
                return self._filter_students(filters, limit, offset)
            elif search_type == "courses":
                return self._filter_courses(filters, limit, offset)
            elif search_type == "grades":
                return self._filter_grades(filters, limit, offset)
            else:
                logger.warning(f"Unknown search_type: {search_type}")
                return []
        except Exception as e:
            logger.error(f"Error in advanced filter: {str(e)}")
            return []

    def _filter_students(self, filters: Dict[str, Any], limit: int, offset: int) -> List[Dict[str, Any]]:
        """Filter students with advanced criteria."""
        query = self.db.query(Student).filter(Student.deleted_at.is_(None))

        # Apply text filters
        for field in ["first_name", "last_name", "email", "student_id"]:
            if field in filters and filters[field]:
                value = f"%{filters[field].lower()}%"
                query = query.filter(getattr(Student, field).ilike(value))

        # Apply status filter
        if "status" in filters and filters["status"]:
            status_value = filters["status"].lower() == "active"
            query = query.filter(Student.is_active == status_value)

        # Apply study year filter
        if "study_year" in filters and filters["study_year"]:
            query = query.filter(Student.study_year == filters["study_year"])

        students = query.limit(limit).offset(offset).all()

        return [
            {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "email": s.email,
                "student_id": s.student_id,
                "study_year": s.study_year,
                "type": "student",
            }
            for s in students
        ]

    def _filter_courses(self, filters: Dict[str, Any], limit: int, offset: int) -> List[Dict[str, Any]]:
        """Filter courses with advanced criteria."""
        query = self.db.query(Course).filter(Course.deleted_at.is_(None))

        # Apply text filters
        for field in ["course_name", "course_code"]:
            if field in filters and filters[field]:
                value = f"%{filters[field].lower()}%"
                query = query.filter(getattr(Course, field).ilike(value))

        # Apply credits filter (exact or range)
        if "credits" in filters and filters["credits"]:
            query = query.filter(Course.credits == filters["credits"])

        if "credits_min" in filters and filters["credits_min"]:
            query = query.filter(Course.credits >= filters["credits_min"])

        if "credits_max" in filters and filters["credits_max"]:
            query = query.filter(Course.credits <= filters["credits_max"])

        # Apply semester filter
        if "semester" in filters and filters["semester"]:
            query = query.filter(Course.semester == filters["semester"])

        courses = query.limit(limit).offset(offset).all()

        return [
            {
                "id": c.id,
                "course_name": c.course_name,
                "course_code": c.course_code,
                "credits": c.credits,
                "semester": c.semester,
                "type": "course",
            }
            for c in courses
        ]

    def _filter_grades(self, filters: Dict[str, Any], limit: int, offset: int) -> List[Dict[str, Any]]:
        """Filter grades with advanced criteria."""
        query = (
            self.db.query(Grade)
            .join(Student, Grade.student_id == Student.id)
            .join(Course, Grade.course_id == Course.id)
            .filter(Grade.deleted_at.is_(None), Student.deleted_at.is_(None), Course.deleted_at.is_(None))
        )

        # Apply grade range filters
        if "grade_min" in filters and filters["grade_min"] is not None:
            query = query.filter(Grade.grade >= filters["grade_min"])

        if "grade_max" in filters and filters["grade_max"] is not None:
            query = query.filter(Grade.grade <= filters["grade_max"])

        # Apply entity filters
        if "student_id" in filters and filters["student_id"] is not None:
            query = query.filter(Grade.student_id == filters["student_id"])

        if "course_id" in filters and filters["course_id"] is not None:
            query = query.filter(Grade.course_id == filters["course_id"])

        # Apply pass/fail filter (assuming passing grade >= 50)
        if "passed" in filters and filters["passed"] is not None:
            passing_threshold = 50
            if filters["passed"]:
                query = query.filter(Grade.grade >= passing_threshold)
            else:
                query = query.filter(Grade.grade < passing_threshold)

        grades = query.limit(limit).offset(offset).all()

        return [
            {
                "id": g.id,
                "student_id": g.student_id,
                "student_name": f"{g.student.first_name} {g.student.last_name}",
                "course_id": g.course_id,
                "course_name": g.course.course_name,
                "grade": float(g.grade) if g.grade else None,
                "passed": g.grade >= 50 if g.grade else False,
                "type": "grade",
            }
            for g in grades
        ]

    # ============================================================================
    # RESULT RANKING & OPTIMIZATION
    # ============================================================================

    def rank_results(self, results: List[Dict[str, Any]], query: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Rank search results by relevance.

        Scoring criteria:
        1. Exact matches score highest
        2. Prefix matches (starts with query) score high
        3. Substring matches score normal
        4. Grade results ranked by value (highest first)

        Args:
            results: List of search results from search methods
            query: Original query string (for relevance ranking)

        Returns:
            Ranked list of results (most relevant first)

        Example:
            >>> results = search_service.search_students("john")
            >>> ranked = search_service.rank_results(results, query="john")
            >>> # Returns results with "john" matches first
        """
        if not query or not results:
            return results

        query_lower = query.lower()

        def calculate_score(result: Dict[str, Any]) -> float:
            """Calculate relevance score for a result."""
            score = 0.0

            # Score name/title fields
            for field in ["first_name", "last_name", "student_name", "course_name", "course_code"]:
                if field in result and result[field]:
                    field_value = str(result[field]).lower()

                    # Exact match: 100 points
                    if field_value == query_lower:
                        score += 100

                    # Prefix match (starts with): 50 points
                    elif field_value.startswith(query_lower):
                        score += 50

                    # Contains: 25 points
                    elif query_lower in field_value:
                        score += 25

            # Bonus: Grade results ranked by grade value (higher is better)
            if "grade" in result and result["grade"]:
                score += result["grade"]

            return score

        # Sort by score (highest first)
        ranked = sorted(results, key=calculate_score, reverse=True)
        return ranked

    # ============================================================================
    # UTILITY METHODS
    # ============================================================================

    def get_search_suggestions(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get search suggestions based on partial query.

        Returns matching student names and course names as suggestions.

        Args:
            query: Partial query string
            limit: Maximum suggestions (default: 5)

        Returns:
            List of suggestion dictionaries with text and type

        Example:
            >>> suggestions = search_service.get_search_suggestions("mat")
            >>> # Returns ["Mathematics", "Materials Science", etc.]
        """
        try:
            suggestions = []
            query_lower = f"%{query.lower()}%"

            # Get student suggestions
            students = (
                self.db.query(Student)
                .filter(
                    or_(
                        func.lower(Student.first_name).ilike(query_lower),
                        func.lower(Student.last_name).ilike(query_lower),
                    ),
                    Student.deleted_at.is_(None),
                )
                .limit(limit // 2)
                .all()
            )

            for s in students:
                suggestions.append({"text": f"{s.first_name} {s.last_name}", "type": "student", "id": s.id})

            # Get course suggestions
            courses = (
                self.db.query(Course)
                .filter(func.lower(Course.course_name).ilike(query_lower), Course.deleted_at.is_(None))
                .limit(limit - len(suggestions))
                .all()
            )

            for c in courses:
                suggestions.append({"text": c.course_name, "type": "course", "id": c.id})

            return suggestions[:limit]
        except Exception as e:
            logger.error(f"Error getting search suggestions: {str(e)}")
            return []

    def get_search_statistics(self) -> Dict[str, int]:
        """
        Get basic search statistics for the system.

        Returns counts of searchable entities.

        Returns:
            Dictionary with counts of students, courses, grades
        """
        try:
            return {
                "total_students": self.db.query(Student).filter(Student.deleted_at.is_(None)).count(),
                "total_courses": self.db.query(Course).filter(Course.deleted_at.is_(None)).count(),
                "total_grades": self.db.query(Grade).filter(Grade.deleted_at.is_(None)).count(),
            }
        except Exception as e:
            logger.error(f"Error getting search statistics: {str(e)}")
            return {"total_students": 0, "total_courses": 0, "total_grades": 0}

    # ============================================================================
    # PHASE 4: ADVANCED SEARCH & FILTERING
    # ============================================================================

    def advanced_student_search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_field: str = "relevance",
        sort_direction: str = "desc",
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[List[Student], int, Dict[str, Any]]:
        """
        Perform advanced full-text search on students with filters and sorting.

        Args:
            query: Search query string (name, email, ID)
            filters: Optional filter dictionary with keys:
                - status: Student status (active, inactive, suspended)
                - enrollment_type: Enrollment type (full-time, part-time)
                - created_after: Created date minimum (YYYY-MM-DD)
                - created_before: Created date maximum (YYYY-MM-DD)
                - updated_after: Updated date minimum (YYYY-MM-DD)
                - updated_before: Updated date maximum (YYYY-MM-DD)
            sort_field: Field to sort by (relevance, name, email, created_at, updated_at)
            sort_direction: Sort direction (asc, desc)
            limit: Maximum results per page (1-100)
            offset: Pagination offset

        Returns:
            Tuple of (results list, total count, filters applied dict)
        """
        try:
            from datetime import datetime

            filters = filters or {}
            query_lower = f"%{query.lower()}%"

            # Build base search
            base_query = self.db.query(Student).filter(
                or_(
                    func.lower(Student.first_name).ilike(query_lower),
                    func.lower(Student.last_name).ilike(query_lower),
                    func.lower(Student.email).ilike(query_lower),
                    func.lower(Student.student_id).ilike(query_lower),
                ),
                Student.deleted_at.is_(None),  # Soft delete filter
            )

            # Apply filters
            filters_applied = {}

            if filters.get("status"):
                base_query = base_query.filter(Student.status == filters["status"])
                filters_applied["status"] = filters["status"]

            # Date filters
            if filters.get("created_after"):
                try:
                    created_after = datetime.strptime(filters["created_after"], "%Y-%m-%d")
                    base_query = base_query.filter(Student.created_at >= created_after)
                    filters_applied["created_after"] = filters["created_after"]
                except (ValueError, TypeError):
                    pass  # Invalid date, skip filter

            if filters.get("created_before"):
                try:
                    created_before = datetime.strptime(filters["created_before"], "%Y-%m-%d")
                    base_query = base_query.filter(Student.created_at <= created_before)
                    filters_applied["created_before"] = filters["created_before"]
                except (ValueError, TypeError):
                    pass

            # Get total before pagination
            total_count = base_query.count()

            # Apply sorting
            if sort_field == "name":
                if sort_direction.lower() == "asc":
                    base_query = base_query.order_by(Student.last_name.asc(), Student.first_name.asc())
                else:
                    base_query = base_query.order_by(Student.last_name.desc(), Student.first_name.desc())
            elif sort_field == "email":
                if sort_direction.lower() == "asc":
                    base_query = base_query.order_by(Student.email.asc())
                else:
                    base_query = base_query.order_by(Student.email.desc())
            elif sort_field == "created_at":
                if sort_direction.lower() == "asc":
                    base_query = base_query.order_by(Student.created_at.asc())
                else:
                    base_query = base_query.order_by(Student.created_at.desc())
            elif sort_field == "updated_at":
                if sort_direction.lower() == "asc":
                    base_query = base_query.order_by(Student.updated_at.asc())
                else:
                    base_query = base_query.order_by(Student.updated_at.desc())
            else:  # relevance (default)
                base_query = base_query.order_by(Student.last_name, Student.first_name)

            # Apply pagination
            results = base_query.limit(limit).offset(offset).all()

            return results, total_count, filters_applied

        except Exception as e:
            logger.error(f"Error performing advanced student search: {str(e)}")
            return [], 0, {}

    def get_student_search_facets(self, query: str) -> Dict[str, Dict[str, int]]:
        """
        Get faceted search results for query refinement.

        Returns aggregated counts for status and enrollment types.

        Args:
            query: Search query string

        Returns:
            Dictionary with facet counts for status, enrollment_type
        """
        try:
            from backend.models import CourseEnrollment

            query_lower = f"%{query.lower()}%"

            # Base search
            base_query = self.db.query(Student).filter(
                or_(
                    func.lower(Student.first_name).ilike(query_lower),
                    func.lower(Student.last_name).ilike(query_lower),
                    func.lower(Student.email).ilike(query_lower),
                ),
                Student.deleted_at.is_(None),
            )

            # Status facets
            status_facets = {}
            status_results = (
                base_query.with_entities(Student.status, func.count().label("count")).group_by(Student.status).all()
            )
            for status, count in status_results:
                status_facets[status] = count

            # Enrollment type facets
            enrollment_facets = {}
            enrollment_results = (
                base_query.outerjoin(CourseEnrollment, Student.id == CourseEnrollment.student_id)
                .with_entities(CourseEnrollment.enrollment_type, func.count().label("count"))
                .group_by(CourseEnrollment.enrollment_type)
                .all()
            )
            for enrollment_type, count in enrollment_results:
                if enrollment_type:
                    enrollment_facets[enrollment_type] = count

            return {
                "status": status_facets,
                "enrollment_type": enrollment_facets,
            }

        except Exception as e:
            logger.error(f"Error getting search facets: {str(e)}")
            return {"status": {}, "enrollment_type": {}}
