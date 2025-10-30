"""
Request ID Middleware
Generates unique IDs for each request to enable request tracing through logs.
"""

import uuid
import logging
from contextvars import ContextVar
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

# Context variable to store request ID for the current request
request_id_context: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """Get the current request ID from context."""
    return request_id_context.get()


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds a unique request ID to each incoming request.

    The request ID can be:
    1. Provided by the client via X-Request-ID header
    2. Auto-generated as a UUID if not provided

    The request ID is:
    - Stored in request.state.request_id
    - Added to the response headers as X-Request-ID
    - Available in logs via contextvars
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if client provided a request ID, otherwise generate one
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())

        # Store in request state for access in route handlers
        request.state.request_id = request_id

        # Store in context variable for access in logging
        request_id_context.set(request_id)

        # Log the incoming request with request ID
        logger.info(f"Request started: {request.method} {request.url.path}", extra={"request_id": request_id})

        # Process the request
        try:
            response = await call_next(request)

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            # Log the response
            logger.info(
                f"Request completed: {request.method} {request.url.path} - Status: {response.status_code}",
                extra={"request_id": request_id},
            )

            return response

        except Exception as e:
            # Log errors with request ID
            logger.error(
                f"Request failed: {request.method} {request.url.path} - Error: {str(e)}",
                extra={"request_id": request_id},
                exc_info=True,
            )
            raise
        finally:
            # Clear the context variable
            request_id_context.set("")


class RequestIDFilter(logging.Filter):
    """
    Logging filter that adds request_id to log records.
    If request_id is not in the extra dict, it will be fetched from context.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # If request_id not already set in record, get from context
        if not hasattr(record, "request_id"):
            record.request_id = get_request_id() or "-"
        return True
