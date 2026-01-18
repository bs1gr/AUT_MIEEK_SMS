import logging
import os

from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend.config import settings
from backend.middleware.response_standardization import ResponseStandardizationMiddleware
from backend.middleware.timing import TimingMiddleware
from backend.request_id_middleware import RequestIDMiddleware
from backend.security import install_csrf_protection


def register_middlewares(app):
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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS_LIST,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security headers middleware with cache control
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()"

        # Cache control for different content types
        path = request.url.path
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

    # GZip compression
    if getattr(settings, "ENABLE_GZIP", True):
        app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)
    # CSRF protection
    in_pytest = bool(os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("PYTEST_RUNNING"))
    if not in_pytest:
        install_csrf_protection(app)
