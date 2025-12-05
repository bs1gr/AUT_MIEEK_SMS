"""
FastAPI application factory module.
Creates and configures the FastAPI application instance.
"""

import os
import logging
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session

from backend.lifespan import get_lifespan
from backend.middleware_config import register_middlewares
from backend.error_handlers import register_error_handlers
from backend.router_registry import register_routers
from backend.logging_config import initialize_logging
from backend.db import get_session, engine
from backend.tracing import setup_tracing

logger = logging.getLogger(__name__)


def get_version() -> str:
    """Read version from VERSION file in project root."""
    try:
        version_file = Path(__file__).resolve().parent.parent / "VERSION"
        if version_file.exists():
            return version_file.read_text().strip()
    except Exception:
        pass
    return "unknown"


def _is_true(val: str | None) -> bool:
    if not val:
        return False
    return val.strip().lower() in {"1", "true", "yes", "on"}


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        FastAPI: Configured application instance with all middleware,
                 error handlers, routers, and endpoints registered.
    """
    # Initialize logging first
    initialize_logging(log_dir="logs", log_level="INFO")
    
    VERSION = get_version()
    
    # Create FastAPI app with lifespan
    app = FastAPI(
        title="Student Management System API",
        version=VERSION,
        description="Bilingual Student Management System with Advanced Grading",
        docs_url="/docs",
        openapi_url="/openapi.json",
        redoc_url="/redoc",
        lifespan=get_lifespan()
    )
    
    # Register core components
    register_middlewares(app)
    register_error_handlers(app)
    register_routers(app)
    # Optional tracing
    try:
        setup_tracing(app)
    except Exception:
        logger.debug("Tracing setup skipped or failed")
    
    # Set app state
    app.state.version = VERSION
    from backend.environment import require_production_constraints
    app.state.runtime_context = require_production_constraints()

    from backend.rate_limiting import limiter
    app.state.limiter = limiter
    
    # Register health check endpoints
    _register_health_endpoints(app)
    
    # Register frontend logging endpoints
    _register_frontend_logging_endpoints(app)
    
    # Register root endpoints and SPA serving
    _register_root_endpoints(app, VERSION)
    
    # Register metrics endpoint if enabled
    _register_metrics_endpoint(app)
    
    logger.info(f"FastAPI application created successfully (version={VERSION})")
    
    return app


def _register_health_endpoints(app: FastAPI):
    """Register health check endpoints."""
    
    @app.get("/health")
    async def health_check(db: Session = Depends(get_session)):
        """Comprehensive health check endpoint."""
        from backend.import_resolver import import_names
        (HealthChecker,) = import_names("health_checks", "HealthChecker")
        
        checker = HealthChecker(app.state, engine)
        result = checker.check_health(db)
        
        # Backward-compatible shape
        try:
            checks = result.get("checks", {})
            system = result.get("system", {})
            db_status = checks.get("database", {}).get("status", "unknown")
            database_str = "connected" if db_status == "healthy" else "disconnected"
            
            legacy_overlay = {
                "database": database_str,
                "services": {k: v.get("status", "unknown") for k, v in checks.items()},
                "network": {
                    "hostname": system.get("hostname"),
                    "ips": system.get("ips", []),
                },
            }
            
            result.update(legacy_overlay)
            return result
        except Exception:
            return result
    
    @app.get("/health/ready")
    async def readiness_check(db: Session = Depends(get_session)):
        """Readiness probe endpoint for Kubernetes/orchestration."""
        from backend.import_resolver import import_names
        (HealthChecker,) = import_names("health_checks", "HealthChecker")
        
        checker = HealthChecker(app.state, engine)
        return checker.check_readiness(db)
    
    @app.get("/health/live")
    async def liveness_check():
        """Liveness probe endpoint for Kubernetes/orchestration."""
        from backend.import_resolver import import_names
        (HealthChecker,) = import_names("health_checks", "HealthChecker")
        
        checker = HealthChecker(app.state, engine)
        return checker.check_liveness()


def _register_frontend_logging_endpoints(app: FastAPI):
    """Register frontend error logging endpoints."""
    
    @app.post("/api/logs/frontend-error")
    async def log_frontend_error(request: Request):
        """Receive and log frontend errors for centralized monitoring."""
        try:
            error_data = await request.json()
            
            logger.error(
                f"Frontend Error: {error_data.get('message', 'Unknown')}",
                extra={
                    "request_id": getattr(request.state, "request_id", "-"),
                    "frontend_error": True,
                    "url": error_data.get("url"),
                    "user_agent": error_data.get("userAgent"),
                    "error_type": error_data.get("type"),
                    "stack": error_data.get("stack", "")[:500],
                    "component_stack": error_data.get("componentStack", "")[:500],
                },
            )
            
            return {"status": "logged", "timestamp": datetime.now().isoformat()}
        except Exception as e:
            logger.warning(f"Failed to log frontend error: {e}")
            return {"status": "failed", "error": str(e)}
    
    @app.post("/api/logs/frontend-warning")
    async def log_frontend_warning(request: Request):
        """Receive and log frontend warnings."""
        try:
            warning_data = await request.json()
            
            logger.warning(
                f"Frontend Warning: {warning_data.get('message', 'Unknown')}",
                extra={
                    "request_id": getattr(request.state, "request_id", "-"),
                    "frontend_warning": True,
                    "url": warning_data.get("url"),
                    "user_agent": warning_data.get("userAgent"),
                },
            )
            
            return {"status": "logged", "timestamp": datetime.now().isoformat()}
        except Exception as e:
            logger.warning(f"Failed to log frontend warning: {e}")
            return {"status": "failed", "error": str(e)}


def _register_root_endpoints(app: FastAPI, version: str):
    """Register root endpoints and SPA serving."""
    
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    SPA_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
    SPA_INDEX_FILE = SPA_DIST_DIR / "index.html"
    # Default to serving the built SPA when a dist folder exists unless explicitly disabled.
    SERVE_FRONTEND = _is_true(os.environ.get("SERVE_FRONTEND"))
    if SPA_INDEX_FILE.exists() and os.environ.get("SERVE_FRONTEND") is None:
        SERVE_FRONTEND = True
    
    def _api_metadata() -> dict:
        return {
            "message": "Student Management System API",
            "version": version,
            "status": "running",
            "documentation": {"swagger": "/docs", "redoc": "/redoc", "openapi": "/openapi.json"},
            "endpoints": {
                "health": "/health",
                "students": "/api/v1/students",
                "courses": "/api/v1/courses",
                "grades": "/api/v1/grades",
                "attendance": "/api/v1/attendance",
            },
        }
    
    @app.get("/")
    async def root():
        """Root endpoint - serves SPA or API metadata."""
        try:
            if SERVE_FRONTEND and SPA_INDEX_FILE and SPA_INDEX_FILE.exists():
                with open(SPA_INDEX_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                from fastapi.responses import HTMLResponse
                response = HTMLResponse(content=content)
                # Prevent caching of index.html to ensure fresh content on reload
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
                return response
        except Exception:
            pass
        return _api_metadata()
    
    @app.get("/api")
    async def api_info():
        """Informational API metadata (JSON)."""
        return _api_metadata()
    
    @app.get("/favicon.ico")
    async def favicon():
        """Serve favicon for browser requests."""
        svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#4F46E5"/>
  <text x="50" y="70" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">S</text>
</svg>"""
        from fastapi.responses import Response
        return Response(content=svg_content, media_type="image/svg+xml")
    
    # SPA serving setup
    if SERVE_FRONTEND and SPA_DIST_DIR and SPA_INDEX_FILE and SPA_INDEX_FILE.exists():
        try:
            # Serve static assets
            app.mount("/assets", StaticFiles(directory=str(SPA_DIST_DIR / "assets")), name="assets")
            
            # Serve root-level static files
            @app.get("/logo.png")
            async def serve_logo():
                logo_path = SPA_DIST_DIR / "logo.png"
                if logo_path.exists():
                    return FileResponse(str(logo_path), media_type="image/png")
                raise HTTPException(status_code=404, detail="Logo not found")
            
            @app.get("/login-bg.png")
            async def serve_login_bg():
                bg_path = SPA_DIST_DIR / "login-bg.png"
                if bg_path.exists():
                    return FileResponse(str(bg_path), media_type="image/png")
                raise HTTPException(status_code=404, detail="Background image not found")
            
            @app.get("/favicon.svg")
            async def serve_favicon_svg():
                favicon_path = SPA_DIST_DIR / "favicon.svg"
                if favicon_path.exists():
                    return FileResponse(str(favicon_path), media_type="image/svg+xml")
                raise HTTPException(status_code=404, detail="Favicon SVG not found")
            
            @app.get("/manifest.json")
            async def serve_manifest():
                """Serve PWA manifest with correct MIME type."""
                manifest_path = SPA_DIST_DIR / "manifest.json"
                if manifest_path.exists():
                    return FileResponse(str(manifest_path), media_type="application/json")
                raise HTTPException(status_code=404, detail="Manifest not found")
            
            @app.get("/registerSW.js")
            async def serve_register_sw():
                """Serve service worker registration script with correct MIME type."""
                # Check if file exists in dist
                sw_file = SPA_DIST_DIR / "registerSW.js"
                if sw_file.exists():
                    return FileResponse(str(sw_file), media_type="application/javascript")
                # Generate a minimal service worker registration if file doesn't exist
                sw_code = """
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: '/' })
    .then(reg => console.log('Service Worker registered'))
    .catch(err => console.log('Service Worker registration failed:', err));
}
"""
                from fastapi.responses import Response
                return Response(content=sw_code, media_type="application/javascript")
            
            @app.get("/apple-touch-icon.png")
            async def serve_apple_touch_icon():
                """Serve Apple touch icon."""
                icon_path = SPA_DIST_DIR / "apple-touch-icon.png"
                if icon_path.exists():
                    return FileResponse(str(icon_path), media_type="image/png")
                raise HTTPException(status_code=404, detail="Apple touch icon not found")
            
            @app.get("/sw.js")
            async def serve_service_worker():
                """Serve Service Worker script with correct MIME type."""
                sw_path = SPA_DIST_DIR / "sw.js"
                if sw_path.exists():
                    return FileResponse(str(sw_path), media_type="application/javascript")
                raise HTTPException(status_code=404, detail="Service Worker not found")
            
            # SPA fallback handler
            EXCLUDE_PREFIXES = (
                "api/", "docs", "redoc", "openapi.json", "control", "health", "metrics",
                "favicon.ico", "favicon.svg", "assets/", "logo.png", "login-bg.png",
                "manifest.json", "registerSW.js", "apple-touch-icon.png", "sw.js",
            )
            
            @app.exception_handler(StarletteHTTPException)
            async def spa_404_handler(request: Request, exc: StarletteHTTPException):
                if exc.status_code == 404:
                    p = request.url.path.lstrip("/")
                    for pref in EXCLUDE_PREFIXES:
                        if p.startswith(pref):
                            return JSONResponse({"detail": "Not Found"}, status_code=404)
                    if SPA_INDEX_FILE and SPA_INDEX_FILE.exists():
                        return FileResponse(str(SPA_INDEX_FILE))
                return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
            
            logger.info("SERVE_FRONTEND enabled: Serving SPA from 'frontend/dist' with 404 fallback.")
        except Exception as e:
            logger.warning(f"Failed to enable SERVE_FRONTEND SPA serving: {e}")


def _register_metrics_endpoint(app: FastAPI):
    """Register Prometheus metrics endpoint if enabled."""
    if os.environ.get("ENABLE_METRICS", "1").strip().lower() in {"1", "true", "yes"}:
        try:
            from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
            from starlette.responses import Response as MetricsResponse
            
            @app.get("/metrics", include_in_schema=False)
            async def metrics_endpoint():
                """Prometheus metrics endpoint"""
                return MetricsResponse(
                    content=generate_latest(),
                    media_type=CONTENT_TYPE_LATEST,
                )
            
            logger.info("✅ /metrics endpoint registered")
        except Exception as e:
            logger.warning(f"Failed to register /metrics endpoint: {e}")
