from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
import logging

from backend.schemas.response import error_response


logger = logging.getLogger(__name__)


def register_error_handlers(app):
    """
    Register standardized error handlers for the application.

    All errors are now returned in the standardized APIResponse format
    for consistent error handling across the API.

    Part of Phase 1 v1.15.0 - API Response Standardization
    """

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTP exceptions with standardized response format."""
        # Get request ID from middleware
        request_id = getattr(request.state, "request_id", "unknown")

        # Ensure detail is JSON-serializable
        detail = exc.detail
        try:
            import json

            json.dumps(detail)
        except Exception:
            detail = str(detail)

        # Extract message: if detail is a dict with "message" key, use it; otherwise use string representation
        if isinstance(detail, dict):
            message = detail.get("message", "HTTP Exception")
            if not isinstance(message, str):
                message = str(message)
        else:
            message = str(detail) if detail else "HTTP Exception"

        # Create standardized error response
        response = error_response(
            code=f"HTTP_{exc.status_code}",
            message=message,
            request_id=request_id,
            details=detail if isinstance(detail, dict) else None,
            path=str(request.url.path) if hasattr(request, "url") else None,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=response.model_dump(mode="json"),
            headers=getattr(exc, "headers", None) or {},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle validation errors with standardized response format."""
        # Get request ID from middleware
        request_id = getattr(request.state, "request_id", "unknown")

        # Sanitize error details
        raw_errs = exc.errors() if hasattr(exc, "errors") else []

        def _sanitize_error(e):
            e = dict(e)
            ctx = e.get("ctx")
            if isinstance(ctx, dict):
                ctx = dict(ctx)
                for key, val in ctx.items():
                    # Convert non-serializable objects to strings
                    if isinstance(val, BaseException):
                        ctx[key] = str(val)
                    elif callable(val) or not isinstance(val, (str, int, float, bool, list, dict, type(None))):
                        ctx[key] = str(val)
                e["ctx"] = ctx
            return e

        errs = [_sanitize_error(e) for e in raw_errs]

        # Create standardized error response
        response = error_response(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            request_id=request_id,
            details={"errors": errs},
            path=str(request.url.path) if hasattr(request, "url") else None,
        )

        return JSONResponse(status_code=422, content=response.model_dump(mode="json"))

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """Handle unhandled exceptions with standardized response format."""
        # Get request ID from middleware
        request_id = getattr(request.state, "request_id", "unknown")

        logger.exception("Unhandled application error", exc_info=exc)

        # Create standardized error response
        response = error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred",
            request_id=request_id,
            path=str(request.url.path) if hasattr(request, "url") else None,
        )

        return JSONResponse(status_code=HTTP_500_INTERNAL_SERVER_ERROR, content=response.model_dump(mode="json"))
