"""
Request ID Middleware for tracking requests across the system.

This middleware generates a unique identifier for each incoming request,
making it easier to trace requests through logs, metrics, and error messages.

Part of Phase 1 v1.15.0 - API Response Standardization
"""

import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds a unique request ID to each incoming request.

    The request ID is:
    - Generated as a UUID4 string with 'req_' prefix
    - Stored in request.state.request_id for use by endpoints
    - Added to response headers as X-Request-ID
    - Used in standardized API responses via ResponseMeta

    Example:
        ```python
        from fastapi import FastAPI, Request
        from backend.middleware.request_id import RequestIDMiddleware

        app = FastAPI()
        app.add_middleware(RequestIDMiddleware)

        @app.get("/items")
        async def get_items(request: Request):
            # Access the request ID
            request_id = request.state.request_id
            # Use in logging, responses, etc.
        ```
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and add unique request ID.

        Args:
            request: The incoming HTTP request
            call_next: The next middleware or endpoint handler

        Returns:
            Response with X-Request-ID header added
        """
        # Check if request ID already exists (from load balancer, etc.)
        request_id = request.headers.get("X-Request-ID")

        # Generate new ID if not provided
        if not request_id:
            request_id = f"req_{uuid.uuid4().hex[:16]}"

        # Store in request state for use by endpoints and logging
        request.state.request_id = request_id

        # Process the request
        response = await call_next(request)

        # Add request ID to response headers for client tracking
        response.headers["X-Request-ID"] = request_id

        return response
