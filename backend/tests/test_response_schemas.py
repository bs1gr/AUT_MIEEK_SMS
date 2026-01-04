"""
Tests for standardized API response schemas.

Tests the response wrapper classes, pagination helpers, and
error formatting utilities.

Part of Phase 1 v1.15.0 - API Response Standardization
"""

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from backend.schemas.response import (
    APIResponse,
    ErrorDetail,
    ResponseMeta,
    PaginatedData,
    success_response,
    error_response,
    paginated_response,
)


class TestResponseMeta:
    """Test ResponseMeta model."""

    def test_create_response_meta(self):
        """Test creating valid ResponseMeta."""
        meta = ResponseMeta(request_id="req_123", timestamp=datetime(2026, 1, 4, 12, 0, 0), version="1.15.0")

        assert meta.request_id == "req_123"
        assert meta.timestamp == datetime(2026, 1, 4, 12, 0, 0)
        assert meta.version == "1.15.0"

    def test_response_meta_required_fields(self):
        """Test that required fields are enforced."""
        with pytest.raises(ValidationError) as exc_info:
            ResponseMeta()

        errors = exc_info.value.errors()
        field_names = {error["loc"][0] for error in errors}
        assert "request_id" in field_names
        assert "timestamp" in field_names

    def test_response_meta_default_version(self):
        """Test default version is set."""
        meta = ResponseMeta(request_id="req_123", timestamp=datetime.now(timezone.utc))

        assert meta.version == "1.15.0"


class TestErrorDetail:
    """Test ErrorDetail model."""

    def test_create_error_detail(self):
        """Test creating valid ErrorDetail."""
        error = ErrorDetail(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details={"email": ["Invalid format"]},
            path="/api/v1/students",
        )

        assert error.code == "VALIDATION_ERROR"
        assert error.message == "Request validation failed"
        assert error.details == {"email": ["Invalid format"]}
        assert error.path == "/api/v1/students"

    def test_error_detail_minimal(self):
        """Test ErrorDetail with only required fields."""
        error = ErrorDetail(code="NOT_FOUND", message="Resource not found")

        assert error.code == "NOT_FOUND"
        assert error.message == "Resource not found"
        assert error.details is None
        assert error.path is None

    def test_error_detail_required_fields(self):
        """Test that code and message are required."""
        with pytest.raises(ValidationError) as exc_info:
            ErrorDetail()

        errors = exc_info.value.errors()
        field_names = {error["loc"][0] for error in errors}
        assert "code" in field_names
        assert "message" in field_names


class TestAPIResponse:
    """Test APIResponse model."""

    def test_create_success_response(self):
        """Test creating a successful APIResponse."""
        meta = ResponseMeta(request_id="req_123", timestamp=datetime.now(timezone.utc), version="1.15.0")

        response = APIResponse(success=True, data={"id": 1, "name": "Test"}, meta=meta)

        assert response.success is True
        assert response.data == {"id": 1, "name": "Test"}
        assert response.error is None
        assert response.meta.request_id == "req_123"

    def test_create_error_response(self):
        """Test creating an error APIResponse."""
        meta = ResponseMeta(request_id="req_456", timestamp=datetime.now(timezone.utc), version="1.15.0")

        error = ErrorDetail(code="NOT_FOUND", message="Resource not found")

        response = APIResponse(success=False, error=error, meta=meta)

        assert response.success is False
        assert response.data is None
        assert response.error.code == "NOT_FOUND"
        assert response.meta.request_id == "req_456"

    def test_api_response_required_fields(self):
        """Test that success and meta are required."""
        with pytest.raises(ValidationError) as exc_info:
            APIResponse()

        errors = exc_info.value.errors()
        field_names = {error["loc"][0] for error in errors}
        assert "success" in field_names
        assert "meta" in field_names

    def test_api_response_with_generic_type(self):
        """Test APIResponse with typed data."""
        meta = ResponseMeta(request_id="req_789", timestamp=datetime.now(timezone.utc))

        response: APIResponse[dict] = APIResponse(success=True, data={"id": 1, "name": "Test"}, meta=meta)

        assert isinstance(response.data, dict)
        assert response.data["id"] == 1


class TestPaginatedData:
    """Test PaginatedData model."""

    def test_create_paginated_data(self):
        """Test creating valid PaginatedData."""
        items = [{"id": 1}, {"id": 2}, {"id": 3}]

        paginated = PaginatedData(
            items=items, total=100, page=2, page_size=20, total_pages=5, has_next=True, has_previous=True
        )

        assert len(paginated.items) == 3
        assert paginated.total == 100
        assert paginated.page == 2
        assert paginated.page_size == 20
        assert paginated.total_pages == 5
        assert paginated.has_next is True
        assert paginated.has_previous is True

    def test_paginated_data_first_page(self):
        """Test pagination for first page."""
        paginated = PaginatedData(
            items=[1, 2, 3], total=100, page=1, page_size=20, total_pages=5, has_next=True, has_previous=False
        )

        assert paginated.page == 1
        assert paginated.has_previous is False
        assert paginated.has_next is True

    def test_paginated_data_last_page(self):
        """Test pagination for last page."""
        paginated = PaginatedData(
            items=[1, 2, 3], total=100, page=5, page_size=20, total_pages=5, has_next=False, has_previous=True
        )

        assert paginated.page == 5
        assert paginated.has_next is False
        assert paginated.has_previous is True

    def test_paginated_data_validation(self):
        """Test validation constraints."""
        # Page must be >= 1
        with pytest.raises(ValidationError):
            PaginatedData(
                items=[],
                total=100,
                page=0,  # Invalid
                page_size=20,
                total_pages=5,
                has_next=False,
                has_previous=False,
            )

        # Total must be >= 0
        with pytest.raises(ValidationError):
            PaginatedData(
                items=[],
                total=-1,  # Invalid
                page=1,
                page_size=20,
                total_pages=0,
                has_next=False,
                has_previous=False,
            )


class TestHelperFunctions:
    """Test helper functions for creating responses."""

    def test_success_response_helper(self):
        """Test success_response helper."""
        response = success_response(data={"id": 1, "name": "Test"}, request_id="req_abc", version="1.15.0")

        assert response.success is True
        assert response.data == {"id": 1, "name": "Test"}
        assert response.error is None
        assert response.meta.request_id == "req_abc"
        assert response.meta.version == "1.15.0"

    def test_error_response_helper(self):
        """Test error_response helper."""
        response = error_response(
            code="NOT_FOUND",
            message="Student not found",
            request_id="req_def",
            details={"id": 999},
            path="/api/v1/students/999",
            version="1.15.0",
        )

        assert response.success is False
        assert response.data is None
        assert response.error.code == "NOT_FOUND"
        assert response.error.message == "Student not found"
        assert response.error.details == {"id": 999}
        assert response.error.path == "/api/v1/students/999"
        assert response.meta.request_id == "req_def"

    def test_paginated_response_helper(self):
        """Test paginated_response helper."""
        items = [{"id": 1}, {"id": 2}, {"id": 3}]

        response = paginated_response(
            items=items,
            total=100,
            skip=20,  # Page 2
            limit=20,
            request_id="req_ghi",
        )

        assert response.success is True
        assert len(response.data.items) == 3
        assert response.data.total == 100
        assert response.data.page == 2  # (20 // 20) + 1
        assert response.data.page_size == 20
        assert response.data.total_pages == 5  # ceil(100 / 20)
        assert response.data.has_next is True  # 20 + 20 < 100
        assert response.data.has_previous is True  # 20 > 0

    def test_paginated_response_first_page(self):
        """Test pagination calculation for first page."""
        response = paginated_response(items=[1, 2, 3], total=50, skip=0, limit=10, request_id="req_jkl")

        assert response.data.page == 1
        assert response.data.total_pages == 5
        assert response.data.has_previous is False
        assert response.data.has_next is True

    def test_paginated_response_last_page(self):
        """Test pagination calculation for last page."""
        response = paginated_response(
            items=[1, 2],
            total=42,
            skip=40,  # Last page
            limit=10,
            request_id="req_mno",
        )

        assert response.data.page == 5  # (40 // 10) + 1
        assert response.data.total_pages == 5  # ceil(42 / 10)
        assert response.data.has_previous is True
        assert response.data.has_next is False  # 40 + 10 >= 42

    def test_paginated_response_empty_results(self):
        """Test pagination with no results."""
        response = paginated_response(items=[], total=0, skip=0, limit=20, request_id="req_pqr")

        assert response.data.items == []
        assert response.data.total == 0
        assert response.data.page == 1
        assert response.data.total_pages == 1  # At least 1 page
        assert response.data.has_previous is False
        assert response.data.has_next is False
