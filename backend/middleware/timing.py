"""
Timing Middleware for measuring request processing time.
"""

import time
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that measures the total time taken to process a request
    and adds it to the response headers.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and measure execution time.

        Args:
            request: The incoming HTTP request.
            call_next: The next middleware or endpoint handler.

        Returns:
            Response with X-Process-Time header added.
        """
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
