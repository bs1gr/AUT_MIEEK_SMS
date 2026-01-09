"""
Response standardization middleware

Wraps successful JSON responses into the unified APIResponse envelope
(success/data/error/meta) when they are not already in that format.

- Preserves existing APIResponse payloads (success + meta keys)
- Skips non-JSON responses (file downloads, streams, etc.)
- Injects request_id into meta for traceability
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Awaitable, Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from backend.config import settings
from backend.schemas.response import APIResponse, ResponseMeta

logger = logging.getLogger(__name__)


class ResponseStandardizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)

        # Only wrap JSON responses; leave everything else untouched
        if not isinstance(response, JSONResponse):
            return response

        try:
            raw_body = response.body
            if isinstance(raw_body, bytes):
                payload = json.loads(raw_body.decode(response.charset or "utf-8")) if raw_body else None
            else:
                payload = None
        except Exception:
            # If we cannot safely parse, return as-is
            return response

        # If already standardized, just ensure the request ID header is present and return
        if isinstance(payload, dict) and "success" in payload and "meta" in payload:
            request_id = getattr(request.state, "request_id", None)
            if request_id:
                response.headers.setdefault("X-Request-ID", request_id)
            return response

        request_id = getattr(request.state, "request_id", None) or response.headers.get("X-Request-ID", "unknown")
        version_field = ResponseMeta.model_fields.get("version")
        api_version = settings.APP_VERSION or (version_field.default if version_field else "1.15.0")
        if api_version is None:
            api_version = "1.15.0"
        meta = ResponseMeta(request_id=request_id, timestamp=datetime.now(timezone.utc), version=str(api_version))
        wrapped = APIResponse(success=True, data=payload, error=None, meta=meta)

        # Preserve original headers (including caching and request ID) while replacing the body
        headers = dict(response.headers)
        headers.setdefault("X-Request-ID", request_id)

        try:
            return JSONResponse(
                status_code=response.status_code, content=wrapped.model_dump(mode="json"), headers=headers
            )
        except Exception:
            logger.exception("Failed to standardize response; returning original body")
            return response
