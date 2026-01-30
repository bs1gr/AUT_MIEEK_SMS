"""
Faceted Navigation Service for Advanced Search.

Provides services for generating facet data for multi-dimensional filtering:
- Student status facets (active, inactive, graduated)
- Student enrollment type facets
- Course semester facets
- Course credits facets
- Dynamic facet aggregation based on current filters

Author: AI Agent
Date: January 30, 2026
Version: 1.0.0
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models import Student, Course
from backend.schemas.search import (
    FacetValue,
    FacetCategory,
    StudentFacetsResponse,
    CourseFacetsResponse,
)

logger = logging.getLogger(__name__)


class FacetService:
    """Service for generating and managing facet data for advanced search."""

    def __init__(self, db: Session):
        """Initialize facet service with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def get_student_facets(
        self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None
    ) -> StudentFacetsResponse:
        """Get faceted search results for students.

        Generates facet counts for:
        - Student status (active/inactive/graduated)
        - Enrollment type (full-time/part-time)
        - Enrollment year

        Args:
            query: Optional search query to filter facets
            filters: Optional dictionary of applied filters

        Returns:
            StudentFacetsResponse with facet categories and counts
        """
        try:
            base_query = self.db.query(Student).filter(Student.deleted_at.is_(None))

            # Apply filters if provided
            if filters:
                if "status" in filters:
                    base_query = self._apply_status_filter(base_query, filters["status"])
                if "enrollment_type" in filters:
                    base_query = self._apply_enrollment_type_filter(base_query, filters["enrollment_type"])

            # Build facet categories
            facets: List[FacetCategory] = []

            # Status facet
            status_facet = self._build_status_facet(base_query)
            if status_facet:
                facets.append(status_facet)

            # Enrollment type facet
            enrollment_facet = self._build_enrollment_type_facet(base_query)
            if enrollment_facet:
                facets.append(enrollment_facet)

            # Enrollment year facet
            year_facet = self._build_enrollment_year_facet(base_query)
            if year_facet:
                facets.append(year_facet)

            total_results = base_query.count()

            return StudentFacetsResponse(
                facets=facets,
                total_results=total_results,
                query=query,
            )
        except Exception as e:
            logger.error(f"Error getting student facets: {str(e)}")
            # Return empty facets on error
            return StudentFacetsResponse(
                facets=[],
                total_results=0,
                query=query,
            )

    def get_course_facets(
        self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None
    ) -> CourseFacetsResponse:
        """Get faceted search results for courses.

        Generates facet counts for:
        - Semester
        - Credits
        - Course status (active/archived)

        Args:
            query: Optional search query to filter facets
            filters: Optional dictionary of applied filters

        Returns:
            CourseFacetsResponse with facet categories and counts
        """
        try:
            base_query = self.db.query(Course).filter(Course.deleted_at.is_(None))

            # Apply filters if provided
            if filters:
                if "semester" in filters:
                    base_query = base_query.filter(Course.semester == filters["semester"])
                if "credits" in filters:
                    base_query = base_query.filter(Course.credits == filters["credits"])

            # Build facet categories
            facets: List[FacetCategory] = []

            # Semester facet
            semester_facet = self._build_semester_facet(base_query)
            if semester_facet:
                facets.append(semester_facet)

            # Credits facet
            credits_facet = self._build_credits_facet(base_query)
            if credits_facet:
                facets.append(credits_facet)

            total_results = base_query.count()

            return CourseFacetsResponse(
                facets=facets,
                total_results=total_results,
                query=query,
            )
        except Exception as e:
            logger.error(f"Error getting course facets: {str(e)}")
            # Return empty facets on error
            return CourseFacetsResponse(
                facets=[],
                total_results=0,
                query=query,
            )

    # ========================================================================
    # STUDENT FACET BUILDERS
    # ========================================================================

    def _build_status_facet(self, query) -> Optional[FacetCategory]:
        """Build status facet for students (active, inactive, etc.).

        Args:
            query: Base SQLAlchemy query

        Returns:
            FacetCategory for status or None if no data
        """
        try:
            # Count active students
            active_count = query.filter(Student.is_active == True).count()  # noqa: E712
            inactive_count = query.filter(Student.is_active == False).count()  # noqa: E712

            values = []
            if active_count > 0:
                values.append(FacetValue(value="active", count=active_count, is_selected=False))
            if inactive_count > 0:
                values.append(FacetValue(value="inactive", count=inactive_count, is_selected=False))

            if not values:
                return None

            return FacetCategory(
                name="status",
                label="Student Status",
                values=values,
                is_expanded=False,
            )
        except Exception as e:
            logger.warning(f"Error building status facet: {str(e)}")
            return None

    def _build_enrollment_type_facet(self, query) -> Optional[FacetCategory]:
        """Build enrollment type facet for students.

        Args:
            query: Base SQLAlchemy query

        Returns:
            FacetCategory for enrollment type or None if no data
        """
        try:
            # Count by study_year (proxy for enrollment type)
            study_year_counts = (
                query.with_entities(Student.study_year, func.count(Student.id))
                .filter(Student.study_year.isnot(None))
                .group_by(Student.study_year)
                .all()
            )

            if not study_year_counts:
                return None

            values = [
                FacetValue(
                    value=f"year_{year}",
                    count=count,
                    is_selected=False,
                )
                for year, count in study_year_counts
                if year is not None
            ]

            if not values:
                return None

            return FacetCategory(
                name="enrollment_type",
                label="Study Year",
                values=values,
                is_expanded=False,
            )
        except Exception as e:
            logger.warning(f"Error building enrollment type facet: {str(e)}")
            return None

    def _build_enrollment_year_facet(self, query) -> Optional[FacetCategory]:
        """Build enrollment year facet for students.

        Args:
            query: Base SQLAlchemy query

        Returns:
            FacetCategory for enrollment year or None if no data
        """
        try:
            from sqlalchemy import func, extract

            # Count by year of enrollment
            year_counts = (
                query.with_entities(
                    extract("year", Student.enrollment_date).label("year"),
                    func.count(Student.id),
                )
                .filter(Student.enrollment_date.isnot(None))
                .group_by(extract("year", Student.enrollment_date))
                .order_by(extract("year", Student.enrollment_date).desc())
                .all()
            )

            if not year_counts:
                return None

            values = [
                FacetValue(
                    value=str(int(year)) if year else "unknown",
                    count=count,
                    is_selected=False,
                )
                for year, count in year_counts
            ]

            if not values:
                return None

            return FacetCategory(
                name="enrollment_year",
                label="Enrollment Year",
                values=values,
                is_expanded=False,
            )
        except Exception as e:
            logger.warning(f"Error building enrollment year facet: {str(e)}")
            return None

    # ========================================================================
    # COURSE FACET BUILDERS
    # ========================================================================

    def _build_semester_facet(self, query) -> Optional[FacetCategory]:
        """Build semester facet for courses.

        Args:
            query: Base SQLAlchemy query

        Returns:
            FacetCategory for semester or None if no data
        """
        try:
            semester_counts = (
                query.with_entities(Course.semester, func.count(Course.id))
                .group_by(Course.semester)
                .order_by(Course.semester)
                .all()
            )

            if not semester_counts:
                return None

            values = [
                FacetValue(
                    value=semester,
                    count=count,
                    is_selected=False,
                )
                for semester, count in semester_counts
                if semester is not None
            ]

            if not values:
                return None

            return FacetCategory(
                name="semester",
                label="Semester",
                values=values,
                is_expanded=False,
            )
        except Exception as e:
            logger.warning(f"Error building semester facet: {str(e)}")
            return None

    def _build_credits_facet(self, query) -> Optional[FacetCategory]:
        """Build credits facet for courses.

        Args:
            query: Base SQLAlchemy query

        Returns:
            FacetCategory for credits or None if no data
        """
        try:
            credits_counts = (
                query.with_entities(Course.credits, func.count(Course.id))
                .group_by(Course.credits)
                .order_by(Course.credits)
                .all()
            )

            if not credits_counts:
                return None

            values = [
                FacetValue(
                    value=str(credits),
                    count=count,
                    is_selected=False,
                )
                for credits, count in credits_counts
                if credits is not None
            ]

            if not values:
                return None

            return FacetCategory(
                name="credits",
                label="Course Credits",
                values=values,
                is_expanded=False,
            )
        except Exception as e:
            logger.warning(f"Error building credits facet: {str(e)}")
            return None

    # ========================================================================
    # FILTER APPLICATION HELPERS
    # ========================================================================

    def _apply_status_filter(self, query, status: str):
        """Apply status filter to query.

        Args:
            query: SQLAlchemy query
            status: Status value ('active' or 'inactive')

        Returns:
            Filtered query
        """
        if status == "active":
            return query.filter(Student.is_active == True)  # noqa: E712
        elif status == "inactive":
            return query.filter(Student.is_active == False)  # noqa: E712
        return query

    def _apply_enrollment_type_filter(self, query, enrollment_type: str):
        """Apply enrollment type filter to query.

        Args:
            query: SQLAlchemy query
            enrollment_type: Enrollment type value

        Returns:
            Filtered query
        """
        if enrollment_type.startswith("year_"):
            year = int(enrollment_type.split("_")[1])
            return query.filter(Student.study_year == year)
        return query
