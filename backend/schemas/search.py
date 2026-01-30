"""
Search and filtering schemas for Student Management System.

Defines Pydantic models for:
- Student/Course/Grade search results
- Advanced filter criteria
- Saved search queries and CRUD operations

Author: AI Agent
Date: January 22, 2026
Version: 1.0.0
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


# ============================================================================
# SEARCH RESULT SCHEMAS
# ============================================================================


class StudentSearchResultSchema(BaseModel):
    """Student search result schema."""

    id: int = Field(..., description="Student ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email address")
    student_id: str = Field(..., description="Student enrollment number")
    enrollment_date: Optional[str] = Field(None, description="Enrollment date")
    is_active: bool = Field(True, description="Is student active")
    type: str = Field("student", description="Result type")

    model_config = ConfigDict(from_attributes=True)


class CourseSearchResultSchema(BaseModel):
    """Course search result schema."""

    id: int = Field(..., description="Course ID")
    course_name: str = Field(..., description="Course name")
    course_code: str = Field(..., description="Course code")
    credits: int = Field(..., description="Course credits")
    academic_year: int = Field(..., description="Academic year")
    semester: int = Field(..., description="Semester")
    type: str = Field("course", description="Result type")

    model_config = ConfigDict(from_attributes=True)


class GradeSearchResultSchema(BaseModel):
    """Grade search result schema."""

    id: int = Field(..., description="Grade ID")
    student_id: int = Field(..., description="Student ID")
    student_name: str = Field(..., description="Student name")
    course_id: int = Field(..., description="Course ID")
    course_name: str = Field(..., description="Course name")
    grade_value: Optional[float] = Field(None, description="Grade value")
    grading_scale: Optional[str] = Field(None, description="Grading scale (A-F)")
    date_graded: Optional[str] = Field(None, description="Date graded")
    type: str = Field("grade", description="Result type")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SEARCH REQUEST SCHEMAS
# ============================================================================


class StudentSearchRequestSchema(BaseModel):
    """Student search request schema."""

    query: str = Field(..., min_length=1, max_length=255, description="Search query")
    limit: int = Field(20, ge=1, le=100, description="Results limit")
    offset: int = Field(0, ge=0, description="Pagination offset")


class CourseSearchRequestSchema(BaseModel):
    """Course search request schema."""

    query: str = Field(..., min_length=1, max_length=255, description="Search query")
    limit: int = Field(20, ge=1, le=100, description="Results limit")
    offset: int = Field(0, ge=0, description="Pagination offset")


class GradeSearchRequestSchema(BaseModel):
    """Grade search request schema."""

    query: Optional[str] = Field(None, max_length=255, description="Search query")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Advanced filters")
    limit: int = Field(20, ge=1, le=100, description="Results limit")
    offset: int = Field(0, ge=0, description="Pagination offset")


# ============================================================================
# ADVANCED FILTER SCHEMAS
# ============================================================================


class FilterCriteriaSchema(BaseModel):
    """Individual filter criterion."""

    field: str = Field(..., description="Field to filter on")
    operator: str = Field(..., description="Filter operator (eq, ne, gt, lt, contains, in, between)")
    value: Any = Field(..., description="Filter value")


class AdvancedFilterRequestSchema(BaseModel):
    """Advanced filter request schema."""

    search_type: str = Field(..., description="Search type: 'students', 'courses', or 'grades'")
    filters: List[FilterCriteriaSchema] = Field(default_factory=list, description="Filter criteria")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: str = Field("asc", description="Sort order: 'asc' or 'desc'")
    limit: int = Field(20, ge=1, le=100, description="Results limit")
    offset: int = Field(0, ge=0, description="Pagination offset")


class ApplyFilterRequestSchema(BaseModel):
    """Apply filter request schema."""

    filters: Dict[str, Any] = Field(..., description="Filters to apply")
    search_type: str = Field(..., description="Search type: 'students', 'courses', or 'grades'")


# ============================================================================
# SAVED SEARCH SCHEMAS
# ============================================================================


class SavedSearchCreateSchema(BaseModel):
    """Saved search create schema."""

    name: str = Field(..., min_length=1, max_length=200, description="Search name")
    description: Optional[str] = Field(None, max_length=500, description="Search description")
    search_type: str = Field(..., description="Search type: 'students', 'courses', or 'grades'")
    query: Optional[str] = Field(None, max_length=500, description="Full-text search query")
    filters: Optional[Dict[str, Any]] = Field(None, description="Advanced filter criteria")
    is_favorite: bool = Field(False, description="Mark as favorite")


class SavedSearchUpdateSchema(BaseModel):
    """Saved search update schema."""

    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Search name")
    description: Optional[str] = Field(None, max_length=500, description="Search description")
    query: Optional[str] = Field(None, max_length=500, description="Full-text search query")
    filters: Optional[Dict[str, Any]] = Field(None, description="Advanced filter criteria")
    is_favorite: Optional[bool] = Field(None, description="Mark as favorite")


class SavedSearchResponseSchema(BaseModel):
    """Saved search response schema."""

    id: int = Field(..., description="Saved search ID")
    user_id: int = Field(..., description="User ID")
    name: str = Field(..., description="Search name")
    description: Optional[str] = Field(None, description="Search description")
    search_type: str = Field(..., description="Search type")
    query: Optional[str] = Field(None, description="Full-text search query")
    filters: Optional[Dict[str, Any]] = Field(None, description="Advanced filter criteria")
    is_favorite: bool = Field(False, description="Is favorite")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class SavedSearchListResponseSchema(BaseModel):
    """Saved search list response schema."""

    id: int = Field(..., description="Saved search ID")
    name: str = Field(..., description="Search name")
    description: Optional[str] = Field(None, description="Search description")
    search_type: str = Field(..., description="Search type")
    is_favorite: bool = Field(False, description="Is favorite")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SEARCH SUGGESTION SCHEMAS
# ============================================================================


class SearchSuggestionSchema(BaseModel):
    """Search suggestion schema."""

    text: str = Field(..., description="Suggestion text")
    type: str = Field(..., description="Suggestion type (student, course, etc)")
    id: int = Field(..., description="Related entity ID")


class SearchSuggestionsResponseSchema(BaseModel):
    """Search suggestions response."""

    suggestions: List[SearchSuggestionSchema] = Field(default_factory=list, description="List of suggestions")


# ============================================================================
# COMPOSITE SEARCH SCHEMAS
# ============================================================================


class UnifiedSearchRequestSchema(BaseModel):
    """Unified search across all entity types."""

    query: str = Field(..., min_length=1, max_length=255, description="Search query")
    entity_types: List[str] = Field(
        default_factory=list, description="Entity types to search ('students', 'courses', 'grades')"
    )
    limit: int = Field(20, ge=1, le=100, description="Results limit per type")
    offset: int = Field(0, ge=0, description="Pagination offset")


class UnifiedSearchResultSchema(BaseModel):
    """Unified search result containing multiple entity types."""

    students: List[StudentSearchResultSchema] = Field(default_factory=list, description="Student results")
    courses: List[CourseSearchResultSchema] = Field(default_factory=list, description="Course results")
    grades: List[GradeSearchResultSchema] = Field(default_factory=list, description="Grade results")
    total_results: int = Field(0, description="Total result count across all types")


# ============================================================================
# FULL-TEXT SEARCH SCHEMAS (Phase 4 Advanced Search Feature)
# ============================================================================


class SearchSort(str):
    """Supported sort fields for full-text search results."""

    RELEVANCE = "relevance"
    NAME = "name"
    EMAIL = "email"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"


class SortDirection(str):
    """Sort direction options."""

    ASC = "asc"
    DESC = "desc"


class SearchFilterRequest(BaseModel):
    """Search filter specification for advanced queries."""

    status: Optional[str] = Field(None, description="Filter by student status (active, inactive, suspended)")
    enrollment_type: Optional[str] = Field(None, description="Filter by enrollment type (full-time, part-time)")
    created_after: Optional[str] = Field(None, description="Filter students created after date (YYYY-MM-DD)")
    created_before: Optional[str] = Field(None, description="Filter students created before date (YYYY-MM-DD)")
    updated_after: Optional[str] = Field(None, description="Filter students updated after date (YYYY-MM-DD)")
    updated_before: Optional[str] = Field(None, description="Filter students updated before date (YYYY-MM-DD)")


class SearchSortRequest(BaseModel):
    """Sort specification for full-text search results."""

    field: str = Field(SearchSort.RELEVANCE, description="Field to sort by")
    direction: str = Field(SortDirection.DESC, description="Sort direction (asc or desc)")


class FullTextSearchRequest(BaseModel):
    """Request model for basic full-text search."""

    model_config = ConfigDict(from_attributes=True)

    query: str = Field(..., min_length=1, max_length=256, description="Search query string")
    limit: int = Field(20, ge=1, le=100, description="Maximum results per page")
    offset: int = Field(0, ge=0, description="Number of results to skip")


class AdvancedSearchRequest(FullTextSearchRequest):
    """Request model for advanced search with filters and sorting."""

    model_config = ConfigDict(from_attributes=True)

    filters: Optional[SearchFilterRequest] = Field(None, description="Search filters")
    sort: Optional[SearchSortRequest] = Field(None, description="Sort specification")


class StudentFullTextSearchResult(BaseModel):
    """Individual student result from full-text search."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Student ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email address")
    status: str = Field(..., description="Student status")
    relevance_score: Optional[float] = Field(None, ge=0, le=1, description="Search relevance score (0-1)")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class FullTextSearchResponse(BaseModel):
    """Response model for full-text search results."""

    model_config = ConfigDict(from_attributes=True)

    results: List[StudentFullTextSearchResult] = Field(..., description="Search results")
    total: int = Field(..., ge=0, description="Total matching results")
    limit: int = Field(..., ge=1, description="Results per page")
    offset: int = Field(..., ge=0, description="Results offset")
    has_more: bool = Field(..., description="Whether more results are available")


class AdvancedSearchResponse(FullTextSearchResponse):
    """Response model for advanced search with filter details."""

    model_config = ConfigDict(from_attributes=True)

    query_time_ms: Optional[float] = Field(None, description="Query execution time in milliseconds")
    filters_applied: Optional[Dict[str, Any]] = Field(None, description="Description of applied filters")


class SearchFacets(BaseModel):
    """Faceted search results for advanced search discovery."""

    model_config = ConfigDict(from_attributes=True)

    status: Optional[Dict[str, int]] = Field(None, description="Status distribution")
    enrollment_type: Optional[Dict[str, int]] = Field(None, description="Enrollment type distribution")
    months: Optional[Dict[str, int]] = Field(None, description="Creation date distribution by month")
    total_results: int = Field(..., ge=0, description="Total search results")


class SearchFacetsResponse(BaseModel):
    """Response model for faceted search discovery."""

    model_config = ConfigDict(from_attributes=True)

    facets: SearchFacets = Field(..., description="Faceted results")
    query: str = Field(..., description="Original search query")


# ============================================================================
# FACETED NAVIGATION SCHEMAS (Phase 4 Step 7)
# ============================================================================


class FacetValue(BaseModel):
    """Individual facet value with count."""

    value: str = Field(..., description="Facet value")
    count: int = Field(..., ge=0, description="Number of results with this value")
    is_selected: bool = Field(False, description="Whether this facet is currently selected")


class FacetCategory(BaseModel):
    """Facet category with multiple values."""

    name: str = Field(..., description="Facet category name (e.g., 'status', 'enrollment_type')")
    label: str = Field(..., description="Display label for facet (e.g., 'Student Status')")
    values: List[FacetValue] = Field(..., description="Facet values with counts")
    is_expanded: bool = Field(False, description="Whether facet is expanded in UI")


class StudentFacetsResponse(BaseModel):
    """Faceted search response for students."""

    facets: List[FacetCategory] = Field(..., description="Available facets for students")
    total_results: int = Field(..., ge=0, description="Total results matching current filters")
    query: Optional[str] = Field(None, description="Current search query")


class CourseFacetsResponse(BaseModel):
    """Faceted search response for courses."""

    facets: List[FacetCategory] = Field(..., description="Available facets for courses")
    total_results: int = Field(..., ge=0, description="Total results matching current filters")
    query: Optional[str] = Field(None, description="Current search query")
