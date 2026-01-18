"""Tests for the TimingMiddleware."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.middleware.timing import TimingMiddleware


@pytest.fixture
def app_with_middleware():
    """Create a test FastAPI app with timing middleware."""
    app = FastAPI()
    app.add_middleware(TimingMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"message": "test"}

    return app


@pytest.fixture
def client(app_with_middleware):
    """Create test client."""
    return TestClient(app_with_middleware)


def test_timing_header_present(client):
    """Test that X-Process-Time header is added to the response."""
    response = client.get("/test")
    assert response.status_code == 200
    assert "X-Process-Time" in response.headers
    try:
        # Ensure the value is a float
        float(response.headers["X-Process-Time"])
    except ValueError:
        pytest.fail("X-Process-Time header is not a float")
