from __future__ import annotations

import logging
import os
import sys
from typing import Any, Iterable, Protocol, Sequence, cast

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from backend.config import settings

logger = logging.getLogger(__name__)

_STATE_CHANGING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _normalize_path(value: str) -> str:
    normalized = (value or "").strip() or "/"
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    if len(normalized) > 1:
        normalized = normalized.rstrip("/")
    return normalized or "/"


def _split_exempt_paths(entries: Iterable[str]) -> tuple[set[str], tuple[str, ...]]:
    exact: set[str] = set()
    prefixes: list[str] = []
    for entry in entries:
        raw_value = (entry or "").strip()
        if not raw_value:
            continue
        is_prefix = raw_value.endswith("*")
        candidate = raw_value[:-1] if is_prefix else raw_value
        normalized = _normalize_path(candidate)
        if is_prefix and normalized != "/":
            prefixes.append(normalized)
        else:
            exact.add(normalized)
    return exact, tuple(prefixes)


def _resolve_cookie_secure() -> bool:
    if settings.CSRF_COOKIE_SECURE is not None:
        return bool(settings.CSRF_COOKIE_SECURE)
    same_site = (settings.CSRF_COOKIE_SAMESITE or "lax").lower()
    if same_site == "none":
        return True
    return bool(getattr(settings, "COOKIE_SECURE", False))


def _build_config_items() -> list[tuple[str, Any]]:
    token_location = (settings.CSRF_TOKEN_LOCATION or "header").strip().lower()
    token_key = settings.CSRF_TOKEN_KEY or "csrf-token"
    config_items: list[tuple[str, Any]] = [
        ("secret_key", settings.SECRET_KEY),
        ("header_name", settings.CSRF_HEADER_NAME),
        ("header_type", settings.CSRF_HEADER_TYPE),
        ("token_location", token_location),
        ("token_key", token_key),
        ("cookie_key", settings.CSRF_COOKIE_NAME),
        ("cookie_path", settings.CSRF_COOKIE_PATH or "/"),
        ("cookie_domain", settings.CSRF_COOKIE_DOMAIN),
        ("cookie_samesite", (settings.CSRF_COOKIE_SAMESITE or "lax").lower()),
        ("cookie_secure", _resolve_cookie_secure()),
        ("httponly", bool(settings.CSRF_COOKIE_HTTPONLY)),
        ("max_age", int(settings.CSRF_COOKIE_MAX_AGE)),
        ("methods", set(_STATE_CHANGING_METHODS)),
    ]
    return config_items


@CsrfProtect.load_config  # type: ignore[misc]
def _load_csrf_config() -> Sequence[tuple[str, Any]]:
    return _build_config_items()


_csrf_instance: CsrfProtect | None = None
_EXACT_EXEMPT_PATHS, _PREFIX_EXEMPT_PATHS = _split_exempt_paths(
    settings.CSRF_EXEMPT_PATHS_LIST
)


def _in_test_context() -> bool:
    if os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("PYTEST_RUNNING"):
        return True
    return any("pytest" in (arg or "").lower() for arg in sys.argv)


class CSRFMiddleware(BaseHTTPMiddleware):
    """Validate CSRF tokens for state-changing requests."""

    def __init__(
        self,
        app: ASGIApp,
        csrf: CsrfProtect,
        exempt_exact: Iterable[str] | None = None,
        exempt_prefixes: Iterable[str] | None = None,
        enforce_in_tests: bool = False,
    ) -> None:
        super().__init__(app)
        self._csrf = csrf
        self._exempt_exact = {_normalize_path(p) for p in (exempt_exact or ())}
        self._exempt_prefixes = tuple(
            _normalize_path(p) for p in (exempt_prefixes or ())
        )
        self._enforce_in_tests = enforce_in_tests

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if self._should_enforce(request):
            try:
                await self._csrf.validate_csrf(request)
            except CsrfProtectError as exc:
                logger.warning(
                    "CSRF validation failed for %s: %s", request.url.path, exc.message
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": exc.message, "error": "csrf_validation_failed"},
                )
            except Exception as exc:  # pragma: no cover - defensive guard
                logger.warning(
                    "Unexpected CSRF validation error for %s: %s", request.url.path, exc
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Invalid CSRF token",
                        "error": "csrf_validation_failed",
                    },
                )
        response = await call_next(request)
        return response

    def _should_enforce(self, request: Request) -> bool:
        method = (request.method or "").upper()
        if method not in _STATE_CHANGING_METHODS:
            return False
        if getattr(request.state, "csrf_exempt", False):
            return False
        if self._is_exempt_path(request.url.path):
            return False
        if not self._enforce_in_tests and _in_test_context():
            return False
        return True

    def _is_exempt_path(self, path: str) -> bool:
        normalized = _normalize_path(path)
        if normalized in self._exempt_exact:
            return True
        for prefix in self._exempt_prefixes:
            if prefix == "/":
                return True
            if normalized == prefix or normalized.startswith(prefix + "/"):
                return True
        return False


def get_csrf_protect() -> CsrfProtect:
    global _csrf_instance
    if _csrf_instance is None:
        _csrf_instance = CsrfProtect()
    return _csrf_instance


def issue_csrf_cookie(response: Response, *, include_header: bool = False) -> str:
    csrf = get_csrf_protect()
    token, signed_token = csrf.generate_csrf_tokens()
    csrf.set_csrf_cookie(signed_token, response)
    if include_header:
        response.headers[settings.CSRF_HEADER_NAME] = token
    return token


def clear_csrf_cookie(response: Response) -> None:
    csrf = get_csrf_protect()
    try:
        csrf.unset_csrf_cookie(response)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning("Failed to clear CSRF cookie: %s", exc)


def mark_request_csrf_exempt(request: Request) -> None:
    request.state.csrf_exempt = True  # type: ignore[attr-defined]


def request_needs_csrf(request: Request) -> bool:
    if not getattr(settings, "CSRF_ENABLED", False):
        return False
    method = (request.method or "").upper()
    if method not in _STATE_CHANGING_METHODS:
        return False
    if getattr(request.state, "csrf_exempt", False):
        return False
    normalized = _normalize_path(request.url.path)
    if normalized in _EXACT_EXEMPT_PATHS:
        return False
    for prefix in _PREFIX_EXEMPT_PATHS:
        if prefix == "/" or normalized == prefix or normalized.startswith(prefix + "/"):
            return False
    if not settings.CSRF_ENFORCE_IN_TESTS and _in_test_context():
        return False
    return True


def install_csrf_protection(app: FastAPI) -> None:
    if getattr(app.state, "csrf_installed", False):
        logger.debug("CSRF protection already installed; skipping")
        return
    if not getattr(settings, "CSRF_ENABLED", False):
        logger.info("CSRF protection disabled via settings; skipping installation")
        app.state.csrf_installed = False
        return

    csrf = get_csrf_protect()

    @app.exception_handler(CsrfProtectError)
    async def _csrf_exception_handler(request: Request, exc: CsrfProtectError):
        logger.warning(
            "CSRF validation failed for %s: %s", request.url.path, exc.message
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "error": "csrf_validation_failed"},
        )

    app_with_middleware = cast(_SupportsAddMiddleware, app)
    app_with_middleware.add_middleware(
        CSRFMiddleware,
        csrf=csrf,
        exempt_exact=_EXACT_EXEMPT_PATHS,
        exempt_prefixes=_PREFIX_EXEMPT_PATHS,
        enforce_in_tests=getattr(settings, "CSRF_ENFORCE_IN_TESTS", False),
    )

    app.state.csrf_installed = True
    app.state.csrf_cookie_name = settings.CSRF_COOKIE_NAME
    app.state.csrf_header_name = settings.CSRF_HEADER_NAME
    logger.info(
        "CSRF middleware registered (cookie=%s, header=%s, exempt=%s entries)",
        settings.CSRF_COOKIE_NAME,
        settings.CSRF_HEADER_NAME,
        len(_EXACT_EXEMPT_PATHS) + len(_PREFIX_EXEMPT_PATHS),
    )


__all__ = [
    "CSRFMiddleware",
    "get_csrf_protect",
    "install_csrf_protection",
    "issue_csrf_cookie",
    "clear_csrf_cookie",
    "mark_request_csrf_exempt",
    "request_needs_csrf",
]


class _SupportsAddMiddleware(Protocol):
    def add_middleware(
        self, middleware_class: type[BaseHTTPMiddleware], **options: Any
    ) -> None: ...
