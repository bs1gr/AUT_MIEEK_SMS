"""Search-related Pydantic models for advanced search functionality.

This module provides request/response models for full-text search,
advanced filtering, sorting, and pagination of student data.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class SearchSort(str, Enum):
    """Supported sort fields for search results."""

    RELEVANCE = "relevance"
    NAME = "name"
    EMAIL = "email"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"


class SortDirection(str, Enum):
    """Sort direction options."""

    ASC = "asc"
    DESC = "desc"


class SearchFilterBase(BaseModel):
    """Base search filter model."""

    status: Optional[str] = Field(None, description="Filter by student status (active, inactive, suspended)")
    enrollment_type: Optional[str] = Field(None, description="Filter by enrollment type (full-time, part-time)")
    created_after: Optional[str] = Field(None, description="Filter students created after date (YYYY-MM-DD)")
    created_before: Optional[str] = Field(None, description="Filter students created before date (YYYY-MM-DD)")
    updated_after: Optional[str] = Field(None, description="Filter students updated after date (YYYY-MM-DD)")
    updated_before: Optional[str] = Field(None, description="Filter students updated before date (YYYY-MM-DD)")


class SearchSortRequest(BaseModel):
    """Sort specification for search results."""

    field: SearchSort = Field(SearchSort.RELEVANCE, description="Field to sort by")
    direction: SortDirection = Field(SortDirection.DESC, description="Sort direction (asc or desc)")


class BasicSearchRequest(BaseModel):
    """Request model for basic full-text search."""

    model_config = ConfigDict(from_attributes=True)

    query: str = Field(..., min_length=1, max_length=256, description="Search query string")
    limit: int = Field(20, ge=1, le=100, description="Maximum results per page")
    offset: int = Field(0, ge=0, description="Number of results to skip")


class AdvancedSearchRequest(BasicSearchRequest):
    """Request model for advanced search with filters and sorting."""

    model_config = ConfigDict(from_attributes=True)

    filters: Optional[SearchFilterBase] = Field(None, description="Search filters")
    sort: Optional[SearchSortRequest] = Field(None, description="Sort specification")


class StudentSearchResult(BaseModel):
    """Individual student result from search."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Student ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email address")
    status: str = Field(..., description="Student status")
    relevance_score: Optional[float] = Field(None, ge=0, le=1, description="Search relevance score (0-1)")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class SearchResultMeta(BaseModel):
    """Metadata about applied search filters."""

    query_time_ms: Optional[float] = Field(None, description="Query execution time in milliseconds")
    filters_applied: Optional[Dict[str, Any]] = Field(None, description="Description of applied filters")
    index_used: Optional[str] = Field(None, description="Database index used for query")


class BasicSearchResponse(BaseModel):
    """Response model for basic search results."""

    model_config = ConfigDict(from_attributes=True)

    results: List[StudentSearchResult] = Field(..., description="Search results")
    total: int = Field(..., ge=0, description="Total matching results")
    limit: int = Field(..., ge=1, description="Results per page")
    offset: int = Field(..., ge=0, description="Results offset")
    has_more: bool = Field(..., description="Whether more results are available")


class AdvancedSearchResponse(BasicSearchResponse):
    """Response model for advanced search with filter details."""

    model_config = ConfigDict(from_attributes=True)

    search_meta: Optional[SearchResultMeta] = Field(None, description="Search execution metadata")


class FacetCount(BaseModel):
    """Facet count for search results."""

    value: str = Field(..., description="Facet value")
    count: int = Field(..., ge=0, description="Number of results with this facet value")


class SearchFacets(BaseModel):
    """Faceted search results."""

    model_config = ConfigDict(from_attributes=True)

    status: Optional[Dict[str, int]] = Field(None, description="Status distribution")
    enrollment_type: Optional[Dict[str, int]] = Field(None, description="Enrollment type distribution")
    months: Optional[Dict[str, int]] = Field(None, description="Creation date distribution by month")
    total_results: int = Field(..., ge=0, description="Total search results")


class SearchFacetsResponse(BaseModel):
    """Response model for faceted search."""

    model_config = ConfigDict(from_attributes=True)

    facets: SearchFacets = Field(..., description="Faceted results")
    query: str = Field(..., description="Original search query")
