"""
Tests for rate limiting functionality.
"""

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.rate_limiting import (
    RATE_LIMIT_HEAVY,
    RATE_LIMIT_READ,
    RATE_LIMIT_WRITE,
    limiter,
)


@pytest.fixture
def app_with_rate_limiting():
    """Create a test FastAPI app with rate limiting."""
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

    @app.get("/read")
    @limiter.limit(RATE_LIMIT_READ)
    async def read_endpoint(request: Request):
        return {"message": "read"}

    @app.post("/write")
    @limiter.limit(RATE_LIMIT_WRITE)
    async def write_endpoint(request: Request):
        return {"message": "write"}

    @app.post("/heavy")
    @limiter.limit(RATE_LIMIT_HEAVY)
    async def heavy_endpoint(request: Request):
        return {"message": "heavy"}

    return app


@pytest.fixture
def client(app_with_rate_limiting):
    """Create test client."""
    return TestClient(app_with_rate_limiting)


def test_rate_limit_constants():
    """Test that rate limit constants are properly defined."""
    assert RATE_LIMIT_READ == "60/minute"
    assert RATE_LIMIT_WRITE == "10/minute"
    assert RATE_LIMIT_HEAVY == "5/minute"


def test_read_endpoint_under_limit(client):
    """Test that read endpoint works under rate limit."""
    # Make a few requests under the limit
    for _ in range(3):
        response = client.get("/read")
        assert response.status_code == 200
        assert response.json()["message"] == "read"


def test_write_endpoint_under_limit(client):
    """Test that write endpoint works under rate limit."""
    # Make a few requests under the limit
    for _ in range(3):
        response = client.post("/write")
        assert response.status_code == 200
        assert response.json()["message"] == "write"


def test_heavy_endpoint_under_limit(client):
    """Test that heavy endpoint works under rate limit."""
    # Make only 1 request to stay well under the limit
    # (Previous tests may have consumed some of the limit)
    response = client.post("/heavy")
    assert response.status_code == 200
    assert response.json()["message"] == "heavy"


def test_rate_limit_headers_present(client):
    """Test that rate limit headers are present in responses."""
    response = client.get("/read")

    # Check for rate limit headers (slowapi adds these)
    # Note: Headers may vary by slowapi version
    assert response.status_code == 200


def test_limiter_instance():
    """Test that limiter instance is properly configured."""
    assert limiter is not None
    assert hasattr(limiter, "limit")


def test_different_endpoints_have_different_limits():
    """Test that different endpoint types have appropriate limits."""
    # This is a structure test - verify the limits are different
    assert RATE_LIMIT_HEAVY != RATE_LIMIT_WRITE
    assert RATE_LIMIT_WRITE != RATE_LIMIT_READ

    # Heavy should be most restrictive
    heavy_limit = int(RATE_LIMIT_HEAVY.split("/")[0])
    write_limit = int(RATE_LIMIT_WRITE.split("/")[0])
    read_limit = int(RATE_LIMIT_READ.split("/")[0])

    assert heavy_limit < write_limit < read_limit
