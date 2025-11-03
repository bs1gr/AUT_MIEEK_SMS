"""
Tests for request ID tracking middleware.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.request_id_middleware import RequestIDMiddleware, get_request_id, RequestIDFilter
import logging


@pytest.fixture
def app_with_middleware():
    """Create a test FastAPI app with request ID middleware."""
    app = FastAPI()
    # `add_middleware` typing in starlette/fastapi stubs can be strict; tests are fine
    # at runtime so narrow the static-checker complaint here.
    app.add_middleware(RequestIDMiddleware)  # type: ignore[call-arg,arg-type]

    @app.get("/test")
    async def test_endpoint():
        return {"message": "test", "request_id": get_request_id()}

    return app


@pytest.fixture
def client(app_with_middleware):
    """Create test client."""
    return TestClient(app_with_middleware)


def test_request_id_generation(client):
    """Test that request IDs are automatically generated."""
    response = client.get("/test")

    assert response.status_code == 200
    assert "X-Request-ID" in response.headers

    request_id = response.headers["X-Request-ID"]

    # Verify it's a valid UUID format (8-4-4-4-12)
    parts = request_id.split("-")
    assert len(parts) == 5
    assert len(parts[0]) == 8
    assert len(parts[1]) == 4
    assert len(parts[2]) == 4
    assert len(parts[3]) == 4
    assert len(parts[4]) == 12


def test_custom_request_id_preserved(client):
    """Test that custom request IDs from client are preserved."""
    custom_id = "test-custom-request-id-12345"
    response = client.get("/test", headers={"X-Request-ID": custom_id})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom_id
    assert response.json()["request_id"] == custom_id


def test_unique_request_ids(client):
    """Test that different requests get different IDs."""
    response1 = client.get("/test")
    response2 = client.get("/test")

    id1 = response1.headers["X-Request-ID"]
    id2 = response2.headers["X-Request-ID"]

    assert id1 != id2


def test_request_id_in_response_body(client):
    """Test that request ID is accessible in route handlers."""
    response = client.get("/test")

    header_id = response.headers["X-Request-ID"]
    body_id = response.json()["request_id"]

    assert header_id == body_id


def test_request_id_filter():
    """Test that RequestIDFilter adds request_id to log records."""
    filter = RequestIDFilter()

    # Create a mock log record
    record = logging.LogRecord(
        name="test", level=logging.INFO, pathname="", lineno=0, msg="test message", args=(), exc_info=None
    )

    # Filter should add request_id attribute
    result = filter.filter(record)

    assert result is True
    # Use getattr to avoid mypy complaining about LogRecord lacking the attribute
    assert getattr(record, "request_id", None) == "-"


def test_request_id_filter_with_existing_id():
    """Test that RequestIDFilter preserves existing request_id."""
    filter = RequestIDFilter()

    # Create a log record with existing request_id
    record = logging.LogRecord(
        name="test", level=logging.INFO, pathname="", lineno=0, msg="test message", args=(), exc_info=None
    )
    # Set attribute using setattr to avoid static type errors in tests
    setattr(record, "request_id", "existing-id-123")

    result = filter.filter(record)

    assert result is True
    assert getattr(record, "request_id", None) == "existing-id-123"


def test_multiple_concurrent_requests(client):
    """Test that concurrent requests maintain separate request IDs."""
    import concurrent.futures

    def make_request():
        response = client.get("/test")
        return response.headers["X-Request-ID"]

    # Make 10 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_request) for _ in range(10)]
        request_ids = [f.result() for f in futures]

    # All IDs should be unique
    assert len(set(request_ids)) == 10
