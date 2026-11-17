"""
Advanced search service for Student Management System.

Provides full-text search across students, courses, and grades with
filtering, ranking, and optimization for quick query results.

Author: AI Agent
Date: January 17, 2026
Version: 1.0.0
"""

from typing import Any, Callable, Dict, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import case, extract, func, or_
import logging

from backend.models import Student, Course, Grade

logger = logging.getLogger(__name__)


def _escape_like(text: str) -> str:
    """`%` and `_` typed by the user are text to look for, not wildcards."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# What a search compares: text in lower case, Greek vowels without their accent, and one form
# of sigma. So "Παπαδόπουλος", "παπαδοπουλος" and "ΠΑΠΑΔΟΠΟΥΛΟΣ" are the same name, whichever
# of them was typed and whichever is stored. The sigma is not a nicety: PostgreSQL lowers the
# last letter of "ΠΑΠΑΔΟΠΟΥΛΟΣ" to "σ" and Python lowers it to "ς", so a surname stored in
# capitals was not found when it was typed in full.
_FOLD_FROM = "άέήίόύώϊϋΐΰς"
_FOLD_TO = "αεηιουωιυιυσ"
_FOLD_TABLE = str.maketrans(_FOLD_FROM, _FOLD_TO)


def fold_text(text: str) -> str:
    """`text` as a search compares it (see above)."""
    return text.lower().translate(_FOLD_TABLE)


def folded(column):
    """`column` as a search compares it: `fold_text` in SQL. SQLite gets its `lower()` for
    all letters and its `translate()` from `backend.sqlite_unicode`."""
    return func.translate(func.lower(column), _FOLD_FROM, _FOLD_TO)


def contains_text(column, text: str):
    """`column` contains `text`, whatever the case, the accents and the sigma of either."""
    return folded(column).like(f"%{_escape_like(fold_text(text))}%", escape="\\")


def starts_with_text(column, text: str):
    """`column` starts with `text`, whatever the case, the accents and the sigma of either."""
    return folded(column).like(f"{_escape_like(fold_text(text))}%", escape="\\")


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
        - date_from/date_to or date_assigned_from/date_assigned_to: Grade date range (YYYY-MM-DD)

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
                        func.lower(Grade.assignment_name).ilike(query_lower),
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

            date_from_value = filters.get("date_assigned_from", filters.get("date_from"))
            if date_from_value:
                try:
                    date_from = datetime.strptime(str(date_from_value), "%Y-%m-%d").date()
                    grade_query = grade_query.filter(
                        func.coalesce(Grade.date_assigned, Grade.date_submitted) >= date_from
                    )
                except (ValueError, TypeError):
                    pass

            date_to_value = filters.get("date_assigned_to", filters.get("date_to"))
            if date_to_value:
                try:
                    date_to = datetime.strptime(str(date_to_value), "%Y-%m-%d").date()
                    grade_query = grade_query.filter(
                        func.coalesce(Grade.date_assigned, Grade.date_submitted) <= date_to
                    )
                except (ValueError, TypeError):
                    pass

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
                    "assignment_name": g.assignment_name,
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

    # What each kind of record can be ordered by. "relevance" puts a record whose name starts
    # with the typed text before one that only contains it, and that before one found by
    # another field (an e-mail address, a student number).
    SORT_FIELDS: Dict[str, tuple] = {
        "students": ("relevance", "name", "email"),
        "courses": ("relevance", "name"),
        "grades": ("relevance", "name", "date"),
    }

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
            List of matching records as dictionaries; an empty list when the search fails.
            `advanced_search_page` is the same search with the total, an order, and its errors.

        Example:
            >>> results = search_service.advanced_filter(
            ...     filters={"credits": 3, "semester": "Fall 2024"},
            ...     search_type="courses"
            ... )
        """
        try:
            results, _total = self.advanced_search_page(search_type, filters, limit=limit, offset=offset)
            return results
        except Exception as e:
            logger.error(f"Error in advanced filter: {str(e)}")
            return []

    def advanced_search_page(
        self,
        search_type: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_field: str = "relevance",
        sort_direction: str = "desc",
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        One page of a search, in a stated order, with the number of records that match.

        Args:
            search_type: "students", "courses" or "grades"
            filters: filter criteria; `_query_text` holds the typed text. A value may be a list:
                a record matches when it has any of the values.
            sort_field: one of `SORT_FIELDS[search_type]`
            sort_direction: "asc" or "desc". For "relevance", "desc" is the best match first.
            limit: page size
            offset: records to skip

        Returns:
            (the page as dictionaries, the number of matching records)

        Raises:
            ValueError: unknown search type, sort field, sort direction or filter value.
        """
        if search_type not in self.SORT_FIELDS:
            raise ValueError(f"Unknown search type: {search_type}")
        if sort_field not in self.SORT_FIELDS[search_type]:
            raise ValueError(f"Cannot sort {search_type} by: {sort_field}")
        direction = str(sort_direction).lower()
        if direction not in ("asc", "desc"):
            raise ValueError(f"Unknown sort direction: {sort_direction}")
        descending = direction == "desc"

        filters = dict(filters or {})
        raw_text = filters.pop("_query_text", None)
        query_text = str(raw_text).strip() if raw_text else ""

        to_row: Callable[[Any], Dict[str, Any]]
        if search_type == "students":
            query = self._student_query(filters, query_text)
            order = self._student_order(query_text, sort_field, descending)
            to_row = self._student_row
        elif search_type == "courses":
            query = self._course_query(filters, query_text)
            order = self._course_order(query_text, sort_field, descending)
            to_row = self._course_row
        else:
            query = self._grade_query(filters, query_text)
            order = self._grade_order(query_text, sort_field, descending)
            to_row = self._grade_row

        total = query.order_by(None).count()
        records = query.order_by(*order).limit(limit).offset(offset).all()
        return [to_row(record) for record in records], total

    # -- helpers for the three searches -------------------------------------------------------

    _contains = staticmethod(contains_text)
    _starts_with = staticmethod(starts_with_text)

    @staticmethod
    def _values(raw: Any) -> List[Any]:
        """A filter value as a list: one value, or several (any of them matches)."""
        if raw is None or raw == "":
            return []
        if isinstance(raw, (list, tuple, set)):
            return [value for value in raw if value is not None and value != ""]
        return [raw]

    @staticmethod
    def _integers(values: List[Any], name: str) -> List[int]:
        try:
            return [int(value) for value in values]
        except (TypeError, ValueError):
            raise ValueError(f"Filter '{name}' needs whole numbers")

    @classmethod
    def _relevance_rank(cls, query_text: str, name_columns: list):
        """0: a name starts with the text; 1: a name contains it; 2: found by another field."""
        return case(
            (or_(*[cls._starts_with(column, query_text) for column in name_columns]), 0),
            (or_(*[cls._contains(column, query_text) for column in name_columns]), 1),
            else_=2,
        )

    @staticmethod
    def _in_direction(expression, descending: bool):
        return expression.desc() if descending else expression.asc()

    # -- students -----------------------------------------------------------------------------

    def _student_query(self, filters: Dict[str, Any], query_text: str):
        query = self.db.query(Student).filter(Student.deleted_at.is_(None))

        if query_text:
            query = query.filter(
                or_(
                    self._contains(Student.first_name, query_text),
                    self._contains(Student.last_name, query_text),
                    self._contains(Student.email, query_text),
                    self._contains(Student.student_id, query_text),
                )
            )

        for field in ["first_name", "last_name", "email", "student_id"]:
            if filters.get(field):
                query = query.filter(self._contains(getattr(Student, field), str(filters[field])))

        statuses = {str(value).lower() for value in self._values(filters.get("status"))}
        unknown = statuses - {"active", "inactive"}
        if unknown:
            raise ValueError(f"Unknown student status: {', '.join(sorted(unknown))}")
        if len(statuses) == 1:
            query = query.filter(Student.is_active == ("active" in statuses))

        # The "study year" filter of the Search page sends `enrollment_type: year_2`.
        study_years = self._integers(self._values(filters.get("study_year")), "study_year")
        for value in self._values(filters.get("enrollment_type")):
            text = str(value)
            study_years += self._integers([text[5:] if text.startswith("year_") else text], "enrollment_type")
        if study_years:
            query = query.filter(Student.study_year.in_(study_years))

        enrollment_years = self._integers(self._values(filters.get("enrollment_year")), "enrollment_year")
        if enrollment_years:
            query = query.filter(extract("year", Student.enrollment_date).in_(enrollment_years))

        return query

    def _student_order(self, query_text: str, sort_field: str, descending: bool) -> list:
        # By name means by the name as the list shows it: first name, then last name.
        by_name = [folded(Student.first_name), folded(Student.last_name)]
        if sort_field == "name":
            return [self._in_direction(column, descending) for column in by_name] + [Student.id]
        if sort_field == "email":
            return [self._in_direction(func.lower(Student.email), descending), Student.id]
        if query_text:
            rank = self._relevance_rank(query_text, [Student.first_name, Student.last_name])
            return [self._in_direction(rank, not descending), *by_name, Student.id]
        return [*by_name, Student.id]

    @staticmethod
    def _student_row(s: Student) -> Dict[str, Any]:
        return {
            "id": s.id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.email,
            "student_id": s.student_id,
            "study_year": s.study_year,
            "type": "student",
        }

    # -- courses ------------------------------------------------------------------------------

    def _course_query(self, filters: Dict[str, Any], query_text: str):
        query = self.db.query(Course).filter(Course.deleted_at.is_(None))

        if query_text:
            query = query.filter(
                or_(
                    self._contains(Course.course_name, query_text),
                    self._contains(Course.course_code, query_text),
                )
            )

        for field in ["course_name", "course_code"]:
            if filters.get(field):
                query = query.filter(self._contains(getattr(Course, field), str(filters[field])))

        credits = self._integers(self._values(filters.get("credits")), "credits")
        if credits:
            query = query.filter(Course.credits.in_(credits))

        if filters.get("credits_min"):
            query = query.filter(Course.credits >= filters["credits_min"])

        if filters.get("credits_max"):
            query = query.filter(Course.credits <= filters["credits_max"])

        semesters = [str(value) for value in self._values(filters.get("semester"))]
        if semesters:
            query = query.filter(Course.semester.in_(semesters))

        return query

    def _course_order(self, query_text: str, sort_field: str, descending: bool) -> list:
        by_name = folded(Course.course_name)
        if sort_field == "name":
            return [self._in_direction(by_name, descending), Course.id]
        if query_text:
            rank = self._relevance_rank(query_text, [Course.course_name, Course.course_code])
            return [self._in_direction(rank, not descending), by_name, Course.id]
        return [by_name, Course.id]

    @staticmethod
    def _course_row(c: Course) -> Dict[str, Any]:
        return {
            "id": c.id,
            "course_name": c.course_name,
            "course_code": c.course_code,
            "credits": c.credits,
            "semester": c.semester,
            "type": "course",
        }

    # -- grades -------------------------------------------------------------------------------

    def _grade_query(self, filters: Dict[str, Any], query_text: str):
        query = (
            self.db.query(Grade)
            .join(Student, Grade.student_id == Student.id)
            .join(Course, Grade.course_id == Course.id)
            .filter(Grade.deleted_at.is_(None), Student.deleted_at.is_(None), Course.deleted_at.is_(None))
        )

        if query_text:
            query = query.filter(
                or_(
                    self._contains(Student.first_name, query_text),
                    self._contains(Student.last_name, query_text),
                    self._contains(Course.course_name, query_text),
                    self._contains(Grade.assignment_name, query_text),
                )
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

        date_from_value = filters.get("date_assigned_from", filters.get("date_from"))
        if date_from_value:
            try:
                date_from = datetime.strptime(str(date_from_value), "%Y-%m-%d").date()
                query = query.filter(self._grade_date() >= date_from)
            except (ValueError, TypeError):
                pass

        date_to_value = filters.get("date_assigned_to", filters.get("date_to"))
        if date_to_value:
            try:
                date_to = datetime.strptime(str(date_to_value), "%Y-%m-%d").date()
                query = query.filter(self._grade_date() <= date_to)
            except (ValueError, TypeError):
                pass

        return query

    @staticmethod
    def _grade_date():
        return func.coalesce(Grade.date_assigned, Grade.date_submitted)

    def _grade_order(self, query_text: str, sort_field: str, descending: bool) -> list:
        by_name = [folded(Grade.assignment_name), folded(Student.first_name), folded(Student.last_name)]
        if sort_field == "name":
            return [self._in_direction(column, descending) for column in by_name] + [Grade.id]
        if sort_field == "date":
            # A grade without a date comes last, whichever way the dates run.
            return [self._grade_date().is_(None), self._in_direction(self._grade_date(), descending), Grade.id]
        if query_text:
            rank = self._relevance_rank(query_text, [Grade.assignment_name, Student.first_name, Student.last_name])
            return [self._in_direction(rank, not descending), *by_name, Grade.id]
        return [*by_name, Grade.id]

    @classmethod
    def _grade_row(cls, g: Grade) -> Dict[str, Any]:
        graded_on = g.date_assigned or g.date_submitted
        return {
            "id": g.id,
            "student_id": g.student_id,
            "student_name": f"{g.student.first_name} {g.student.last_name}",
            "course_id": g.course_id,
            "course_name": g.course.course_name,
            "assignment_name": g.assignment_name,
            "grade": float(g.grade) if g.grade else None,
            "max_grade": float(g.max_grade) if g.max_grade else None,
            "date": graded_on.isoformat() if graded_on else None,
            "passed": g.grade >= 50 if g.grade else False,
            "type": "grade",
        }

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
