import logging
import os

from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from backend.config import settings
from backend.middleware.response_standardization import ResponseStandardizationMiddleware
from backend.middleware.timing import TimingMiddleware
from backend.request_id_middleware import RequestIDMiddleware
from backend.security import install_csrf_protection


def register_middlewares(app):
    # TrustedHostMiddleware - must come BEFORE other middleware to properly handle forwarded headers
    # This allows the backend to understand it's behind a reverse proxy and use X-Forwarded-* headers
    if settings.SMS_EXECUTION_MODE.lower() == "docker":
        # In Docker, allow traffic from nginx reverse proxy
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "backend", "*"])

    # Request ID tracking middleware
    try:
        app.add_middleware(RequestIDMiddleware)
    except Exception as e:
        logging.warning(f"RequestIDMiddleware registration failed: {e}")

    # Timing middleware to measure request processing time
    try:
        app.add_middleware(TimingMiddleware)
    except Exception as e:
        logging.warning(f"TimingMiddleware registration failed: {e}")

    # Standardize JSON responses into APIResponse envelope (success/data/error/meta)
    try:
        app.add_middleware(ResponseStandardizationMiddleware)
    except Exception as e:
        logging.warning(f"ResponseStandardizationMiddleware registration failed: {e}")
    # CORS middleware
    # capacitor://localhost is the WebView origin for Capacitor Android apps.
    # It must be present in all modes so the Android APK can reach any backend.
    cors_origins = settings.CORS_ORIGINS_LIST
    if "capacitor://localhost" not in cors_origins:
        cors_origins = cors_origins + ["capacitor://localhost"]
    cors_kwargs = {
        "allow_origins": cors_origins,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
    # In native development, ensure localhost origins are always allowed.
    # This guards against missing/overridden CORS_ORIGINS in local .env files.
    if settings.SMS_EXECUTION_MODE.lower() == "native" or settings.SMS_ENV.lower() in {"development", "dev"}:
        cors_kwargs["allow_origin_regex"] = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"
    # In Docker, allow localhost:8080 (frontend container origin)
    elif settings.SMS_EXECUTION_MODE.lower() == "docker":
        cors_kwargs["allow_origin_regex"] = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"

    app.add_middleware(CORSMiddleware, **cors_kwargs)

    # Security headers middleware with cache control
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        try:
            path = getattr(request, "scope", {}).get("path") or getattr(getattr(request, "url", None), "path", "")
        except Exception:
            path = ""
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' ws: wss:; "
            "font-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none';"
        )
        if getattr(settings, "COOKIE_SECURE", False):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Cache control for different content types
        if path.startswith("/assets/"):
            # Static assets with hashes in filenames - cache for 1 year
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path in ("/", "/index.html"):
            # HTML files - always revalidate to detect updates
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        elif path.startswith(
            (
                "/api/",
                "/docs",
                "/redoc",
                "/openapi.json",
                "/control",
                "/health",
                "/metrics",
            )
        ):
            # API endpoints - don't cache
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

        return response

    # Reject paths that contain characters invalid on Windows filesystems (e.g. ":").
    # StaticFiles.lookup_path() passes the raw URL path to os.stat(), which throws
    # WinError 123 for paths like "/assets/app.js:1:42)" (stack-trace coordinates
    # appended by browsers/DevTools).  Returning 404 here prevents the unhandled
    # OSError from reaching uvicorn and polluting the logs.
    @app.middleware("http")
    async def reject_invalid_path_chars(request, call_next):
        from starlette.responses import Response as StarletteResponse
        path = request.url.path
        # Colons are valid in the first two characters for Windows drive letters
        # (e.g. "C:"), but they never appear there in HTTP paths.  Any ":" in the
        # path after the leading "/" means the URL is malformed or a stack-trace
        # fragment — return 404 immediately before StaticFiles sees it.
        if ":" in path:
            return StarletteResponse(status_code=404)
        return await call_next(request)

    # GZip compression
    if getattr(settings, "ENABLE_GZIP", True):
        app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)
    # CSRF protection
    in_pytest = bool(os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("PYTEST_RUNNING"))
    if not in_pytest:
        install_csrf_protection(app)
