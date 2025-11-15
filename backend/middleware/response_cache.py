"""Response caching middleware built on the in-memory TimedLRUCache."""

from __future__ import annotations

import hashlib
from typing import Iterable

from fastapi import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from backend.cache import TimedLRUCache


class ResponseCacheMiddleware(BaseHTTPMiddleware):
    """Simple middleware that caches safe GET responses in memory."""

    def __init__(
        self,
        app: ASGIApp,
        ttl_seconds: int,
        maxsize: int,
        include_headers: Iterable[str] | None = None,
        excluded_paths: Iterable[str] | None = None,
        include_prefixes: Iterable[str] | None = None,
        require_opt_in: bool = False,
        opt_in_header: str | None = None,
    ) -> None:
        super().__init__(app)
        self.cache = TimedLRUCache(maxsize=maxsize, ttl_seconds=ttl_seconds)
        self.include_headers = tuple(h.lower() for h in (include_headers or ("accept-language", "accept")))
        default_excludes = ("/control", "/health", "/health/live", "/health/ready")
        self.excluded_paths = {
            self._normalize_path_value(path)
            for path in (excluded_paths or default_excludes)
        }
        self.include_prefixes = tuple(
            self._normalize_path_value(prefix)
            for prefix in (include_prefixes or tuple())
        )
        self.require_opt_in = require_opt_in
        self.opt_in_header = (opt_in_header or "").lower().strip()

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if not self._should_cache_request(request):
            return await call_next(request)

        cache_key = self._make_cache_key(request)
        cached_payload = self.cache.get(cache_key)
        if cached_payload is not None:
            return Response(
                content=cached_payload["body"],
                status_code=cached_payload["status_code"],
                media_type=cached_payload["media_type"],
                headers=dict(cached_payload["headers"]),
            )

        response = await call_next(request)
        if not self._is_cacheable_response(response):
            return response

        body_bytes = bytearray()
        body_iterator = getattr(response, "body_iterator", None)
        if body_iterator is not None:
            async for chunk in body_iterator:  # type: ignore[union-attr]
                body_bytes.extend(chunk)
        else:
            body_bytes.extend(response.body or b"")

        headers = dict(response.headers)
        headers.pop("content-length", None)
        headers.pop("set-cookie", None)

        payload = {
            "body": bytes(body_bytes),
            "status_code": response.status_code,
            "media_type": response.media_type,
            "headers": headers,
        }
        self.cache.set(cache_key, payload)

        return Response(
            content=payload["body"],
            status_code=payload["status_code"],
            media_type=payload["media_type"],
            headers=payload["headers"],
        )

    def _should_cache_request(self, request: Request) -> bool:
        if request.method != "GET":
            return False
        if request.headers.get("Authorization") or request.headers.get("authorization"):
            return False
        if request.headers.get("Cache-Control", "").lower() in {"no-store", "no-cache"}:
            return False
        path = request.url.path.rstrip("/") or "/"
        if path in self.excluded_paths:
            return False
        if self.include_prefixes and not any(path.startswith(prefix) for prefix in self.include_prefixes):
            return False
        if self.require_opt_in and not self._has_opt_in(request):
            return False
        if request.query_params.get("__nocache") == "1":
            return False
        return True

    @staticmethod
    def _is_cacheable_response(response: Response) -> bool:
        if response.status_code != 200:
            return False
        cache_control = response.headers.get("Cache-Control", "").lower()
        if any(flag in cache_control for flag in ("no-store", "private", "authorization")):
            return False
        if response.background is not None:
            return False
        return True

    def _make_cache_key(self, request: Request) -> str:
        header_bits = []
        for header in self.include_headers:
            header_bits.append(f"{header}:{request.headers.get(header, '')}")
        raw_key = "|".join([request.method, str(request.url), *header_bits])
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def _has_opt_in(self, request: Request) -> bool:
        if request.query_params.get("__cache") == "1":
            return True
        if self.opt_in_header:
            header_value = request.headers.get(self.opt_in_header)
            if header_value and header_value.lower() not in {"0", "false", "off", "no"}:
                return True
        return False

    @staticmethod
    def _normalize_path_value(value: str) -> str:
        normalized = (value or "").strip() or "/"
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        if len(normalized) > 1:
            normalized = normalized.rstrip("/")
        return normalized or "/"
