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
