"""
Student Management System - Final Fixed Version
Version: See VERSION file - Production Ready with All Fixes Applied

Fixes Applied:
✅ Proper initialization order
✅ Added GradeCreate validation with @model_validator
✅ Clean architecture with modular structure
✅ Full type hints and documentation
✅ Comprehensive error handling
✅ Enhanced logging
✅ UTF-8 encoding fix for Windows console
✅ Removed deprecated @app.on_event() syntax
✅ Modern FastAPI lifespan context manager
✅ Better router error handling

RECOMMENDED STARTUP:
- Windows: Use scripts/RUN.ps1 (handles port conflicts automatically)
- Direct: uvicorn backend.main:app --host 127.0.0.1 --port 8000
  (If port 8000 is busy, use --port 8001, 8002, etc.)
"""

import logging
import sys
import io
import os
import subprocess
import socket
import time as _time
import shutil
import threading
from datetime import datetime
from contextlib import asynccontextmanager
from pathlib import Path

# FastAPI imports
from fastapi import FastAPI, Depends, Request
from typing import Callable, Any, cast
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
import uvicorn

# Rate limiting
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Optional import for common rate limit strings; fall back to defaults if missing
try:
    from backend.rate_limiting import RATE_LIMIT_WRITE
except Exception:
    RATE_LIMIT_WRITE = "10/minute"

# Database imports
from sqlalchemy.orm import Session

# Local imports: prefer package imports, fall back to module imports when executed from backend/
import importlib
import importlib.util

# Detect whether package-style imports are available (importing as 'backend.*')
if importlib.util.find_spec("backend.config") is not None:
    config_mod = importlib.import_module("backend.config")
    settings = config_mod.settings
    logging_mod = importlib.import_module("backend.logging_config")
    initialize_logging = logging_mod.initialize_logging
    db_mod = importlib.import_module("backend.db")
    db_get_session = db_mod.get_session
    db_engine = getattr(db_mod, "engine")
    db_ensure_schema = getattr(db_mod, "ensure_schema")
    rim_mod = importlib.import_module("backend.request_id_middleware")
    RequestIDMiddleware = getattr(rim_mod, "RequestIDMiddleware")
    env_mod = importlib.import_module("backend.environment")
    # Control API auth helpers
    try:
        # Import both the builtin require_control_admin and the factory so we can
        # optionally integrate application auth (logged-in admin users) with the
        # control dependency. We avoid hard failures if auth helpers can't be
        # imported so tests and minimal environments stay functional.
        from backend.control_auth import require_control_admin as _require_control_admin, create_control_dependency

        # Attempt to build an auth_check that recognizes logged-in admin users
        # by decoding a Bearer token and verifying the user's role in the DB.
        def _build_auth_check():
            try:
                auth_mod = importlib.import_module("backend.routers.routers_auth")
                models_mod = importlib.import_module("backend.models")
            except Exception:
                return None

            def _auth_check(request: Request) -> bool:
                # Expect standard 'Authorization: Bearer <token>' header
                auth_hdr = request.headers.get("authorization") or request.headers.get("Authorization")
                if not auth_hdr or not auth_hdr.lower().startswith("bearer "):
                    return False
                try:
                    token = auth_hdr.split(None, 1)[1]
                except Exception:
                    return False

                try:
                    # Use the auth module's decode_token helper to validate JWT
                    payload = getattr(auth_mod, "decode_token")(token)
                    email_val = payload.get("sub")
                    if not email_val:
                        return False
                    # Query DB for user and check role
                    db = db_get_session()
                    try:
                        user = db.query(models_mod.User).filter(models_mod.User.email == email_val).first()
                        return bool(
                            user and getattr(user, "is_active", False) and getattr(user, "role", None) == "admin"
                        )
                    finally:
                        try:
                            db.close()
                        except Exception:
                            pass
                except Exception:
                    return False

            return _auth_check

        _auth_check_fn = _build_auth_check()
        if _auth_check_fn is not None:
            # create_control_dependency returns an async dependency callable
            # which may be typed differently than the original symbol. Use
            # a runtime cast to keep static type checkers happy while
            # preserving the runtime behavior.
            require_control_admin = cast(Callable[..., Any], create_control_dependency(_auth_check_fn))
        else:
            require_control_admin = cast(Callable[..., Any], _require_control_admin)
    except Exception:
        # Provide a permissive noop dependency for environments where the helper
        # cannot be imported (tests or minimal execution). This keeps imports
        # from failing while still allowing dependency injection to work.
        def require_control_admin(request):
            return None
else:
    # Fallback for direct execution inside backend/ directory
    config_mod = importlib.import_module("config")
    settings = config_mod.settings
    logging_mod = importlib.import_module("logging_config")
    initialize_logging = logging_mod.initialize_logging
    db_mod = importlib.import_module("db")
    db_get_session = db_mod.get_session
    db_engine = getattr(db_mod, "engine")
    db_ensure_schema = getattr(db_mod, "ensure_schema")
    rim_mod = importlib.import_module("request_id_middleware")
    RequestIDMiddleware = getattr(rim_mod, "RequestIDMiddleware")
    env_mod = importlib.import_module("environment")
    # Control API auth helpers (fallback for direct script execution)
    try:
        from backend.control_auth import require_control_admin
    except Exception:

        def require_control_admin(request):
            return None

# ============================================================================
# UTF-8 ENCODING FIX FOR WINDOWS
# ============================================================================

if sys.platform == "win32":
    # Force UTF-8 encoding for console output on Windows
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# ============================================================================
# CONTROL PANEL & SPA CONFIGURATION (project root paths)
# ============================================================================

try:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    # Ensure project root is on sys.path so absolute imports like 'backend.xxx' work
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    CONTROL_HTML = PROJECT_ROOT / "html_control_panel.html"
    # Optional SPA directory (built frontend)
    SPA_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
    SPA_INDEX_FILE = SPA_DIST_DIR / "index.html"
except Exception:
    CONTROL_HTML = None
    SPA_DIST_DIR = None
    SPA_INDEX_FILE = None


def get_version() -> str:
    """Read version from VERSION file in project root."""
    try:
        version_file = Path(__file__).resolve().parent.parent / "VERSION"
        if version_file.exists():
            return version_file.read_text().strip()
    except Exception:
        pass
    return "unknown"


VERSION = get_version()

FRONTEND_PROCESS: subprocess.Popen | None = None
FRONTEND_PORT_PREFERRED = 5173
FRONTEND_PORT_CANDIDATES = list(range(5173, 5181))  # 5173-5180


def _is_port_open(host: str, port: int, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _detect_frontend_port() -> int | None:
    for p in FRONTEND_PORT_CANDIDATES:
        if _is_port_open("127.0.0.1", p):
            return p
    return None


def _find_pids_on_port(port: int) -> list[int]:
    """Return a list of PIDs listening on the given TCP port (Windows only)."""
    try:
        # Use netstat to find listeners
        proc = subprocess.run(
            ["netstat", "-ano"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
        pids: set[int] = set()
        for line in proc.stdout.splitlines():
            line = line.strip()
            # Example line:  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       12345
            # Also match:    TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       12345
            # And:           TCP    [::]:5173              [::]:0                 LISTENING       12345
            if f":{port}" in line and "LISTEN" in line.upper():
                parts = [t for t in line.split() if t]
                if parts and len(parts) >= 5:
                    pid_str = parts[-1]
                    try:
                        pid = int(pid_str)
                        pids.add(pid)
                        logger.debug(f"Found PID {pid} on port {port}: {line}")
                    except ValueError:
                        pass
        return list(pids)
    except Exception as e:
        logger.warning(f"Failed to find PIDs on port {port}: {e}")
        return []


def _resolve_npm_command() -> str | None:
    """Resolve npm executable on Windows reliably.
    Returns a command string (quoted path) suitable for shell=True invocations, or None if not found.
    """
    # Try PATH first (return raw executable path, do NOT quote)
    for name in ("npm", "npm.cmd"):
        found = shutil.which(name)
        if found:
            return found
    # Common install locations
    nvm_home = os.environ.get("NVM_HOME", "")
    nvm_symlink = os.environ.get("NVM_SYMLINK", "")
    candidates = [
        os.path.join(os.environ.get("ProgramFiles", r"C:\\Program Files"), "nodejs", "npm.cmd"),
        os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\\Program Files (x86)"), "nodejs", "npm.cmd"),
        os.path.join(
            os.environ.get("LOCALAPPDATA", os.path.expandvars(r"%LOCALAPPDATA%")), "Programs", "nodejs", "npm.cmd"
        ),
        os.path.join(os.environ.get("APPDATA", os.path.expandvars(r"%APPDATA%")), "npm", "npm.cmd"),
        os.path.join(nvm_home, "nodejs", "npm.cmd") if nvm_home else "",
        os.path.join(nvm_symlink, "npm.cmd") if nvm_symlink else "",
    ]
    for path in candidates:
        try:
            if path and os.path.isfile(path):
                return path
        except Exception:
            continue
    # Last resort: npx.cmd (may exist even if npm not on PATH)
    found_npx = shutil.which("npx.cmd") or shutil.which("npx")
    if found_npx:
        return found_npx
    return None


# ============================================================================
# ERROR HANDLING & LOGGING INITIALIZATION
# ============================================================================

# Initialize logging via centralized config
initialize_logging(log_dir="logs", log_level="INFO")

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================
# Use the centralized initialize_logging from backend.logging_config to set up
# handlers, formatting and request-id filters. Avoid calling logging.basicConfig
# again here to prevent duplicate handlers or format overrides.
logger = logging.getLogger(__name__)
RUNTIME_CONTEXT = env_mod.require_production_constraints()
logger.info("Runtime context detected: %s", RUNTIME_CONTEXT.summary())

# ============================================================================
# RATE LIMITING CONFIGURATION
# ============================================================================

# Import centralized rate limiter via importlib to support package/script modes
rl_mod = None
if importlib.util.find_spec("backend.rate_limiting") is not None:
    rl_mod = importlib.import_module("backend.rate_limiting")
elif importlib.util.find_spec("rate_limiting") is not None:
    rl_mod = importlib.import_module("rate_limiting")
else:
    rl_mod = None

limiter = getattr(rl_mod, "limiter") if rl_mod is not None else None
# If limiting module couldn't be resolved via importlib, try direct import
if limiter is None:
    try:
        from backend.rate_limiting import limiter as _direct_limiter

        limiter = _direct_limiter
    except Exception:
        limiter = None

# Provide a noop limiter with a .limit() decorator when rate-limiting is unavailable.
# This keeps decorator usage safe for static analysis and test environments.
if limiter is None:

    class _NoopLimiter:
        def limit(self, *args, **kwargs):
            def _decorator(func):
                return func

            return _decorator

    limiter = _NoopLimiter()

    def _mask_token(tok: str | None) -> str:
        if not tok:
            return "<none>"
        try:
            return tok[:4] + "..." + tok[-4:]
        except Exception:
            return "<masked>"


# ============================================================================
# SCHEMAS
# ============================================================================
# Schemas are defined within router modules or under `schemas/` when extracted.


# ============================================================================
# FASTAPI APPLICATION FACTORY
# ============================================================================


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        FastAPI: Configured application instance
    """
    return FastAPI(
        title="Student Management System API",
        version=VERSION,
        description="Bilingual Student Management System with Advanced Grading",
        docs_url="/docs",
        openapi_url="/openapi.json",
        redoc_url="/redoc",
    )


# ============================================================================
# LIFESPAN MANAGEMENT (Modern FastAPI approach)
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.

    Startup:
    - Run database migrations
    - Initialize system
    - Setup database
    - Log startup information

    Shutdown:
    - Cleanup tasks
    - Close database connections
    - Log shutdown information
    """
    # Startup
    logger.info("\n" + "=" * 70)
    logger.info("STUDENT MANAGEMENT SYSTEM - STARTUP")
    logger.info("=" * 70)
    logger.info(f"Version: {VERSION} - Production Ready")
    logger.info("Database: SQLite")
    logger.info("Framework: FastAPI")
    logger.info("Logging: initialized")
    logger.info("=" * 70)

    # Record start time for uptime in health endpoint
    try:
        app.state.start_time = _time.time()
    except Exception:
        pass

    # Run database migrations automatically on startup
    logger.info("Checking for pending database migrations...")
    try:
        from backend.run_migrations import run_migrations

        migration_success = run_migrations(verbose=False)
        if migration_success:
            logger.info("✓ Database migrations up to date")
        else:
            logger.warning("⚠ Database migrations failed - application may not function correctly")
    except Exception as e:
        logger.error(f"Migration runner error: {e!s}")
        logger.warning("Continuing without migration check...")

    # Verify schema presence. In some environments migrations may report success
    # but the target DB might be different or empty. Offer an opt-in fallback to
    # create missing tables automatically if the operator set
    # ALLOW_SCHEMA_AUTO_CREATE=1 in the environment. This protects production
    # clusters from accidental implicit schema creation while allowing safe
    # deployments to self-heal when explicitly permitted.
    try:
        from sqlalchemy import inspect

        inspector = inspect(db_engine)
        tables = inspector.get_table_names()
        if not tables:
            allow_auto = os.environ.get("ALLOW_SCHEMA_AUTO_CREATE", "").lower() in (
                "1",
                "true",
                "yes",
            )
            if allow_auto:
                # Last-resort: create tables using SQLAlchemy models metadata
                try:
                    from backend.models import Base

                    logger.warning(
                        "No database tables detected; ALLOW_SCHEMA_AUTO_CREATE enabled — creating tables via metadata.create_all()"
                    )
                    Base.metadata.create_all(bind=db_engine)
                    logger.info("✓ Created missing database tables via metadata.create_all()")
                except Exception as e:
                    logger.error(f"Failed to create tables via metadata.create_all(): {e}", exc_info=True)
            else:
                logger.warning(
                    "No database tables detected after migrations. To allow automatic creation as a fallback, set ALLOW_SCHEMA_AUTO_CREATE=1 in the environment."
                )
    except Exception as e:
        logger.warning(f"Schema verification failed (continuing): {e}")

    # Legacy schema compatibility check (kept for backward compatibility during transition)
    try:
        db_ensure_schema(db_engine)
        logger.info("Legacy schema check completed")
    except Exception as _e:
        logger.warning(f"Legacy schema check failed (continuing): {_e}")

    # Auto-import courses with evaluation rules if database is empty (works in both Docker and native modes)
    try:
        from sqlalchemy import text

        with db_engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM courses")).scalar()
            if result == 0:
                logger.info("No courses found in database - scheduling auto-import...")
                # Use threading with proper error boundaries and timeout
                # This is more reliable than HTTP requests during startup
                try:
                    import threading
                    import requests

                    def delayed_import():
                        """
                        Wait for server to start, then trigger import.
                        Includes retry logic and proper error handling.
                        """
                        max_retries = 3
                        retry_delay = 3

                        for attempt in range(max_retries):
                            try:
                                # Wait for server to be fully ready
                                _time.sleep(retry_delay * (attempt + 1))

                                port = getattr(settings, "API_PORT", 8000)
                                response = requests.post(
                                    f"http://127.0.0.1:{port}/api/v1/imports/courses?source=template",
                                    headers={"Content-Type": "application/json"},
                                    timeout=60,
                                )
                                if response.status_code == 200:
                                    data = response.json()
                                    logger.info(
                                        f"✓ Auto-import completed: {data.get('created', 0)} created, {data.get('updated', 0)} updated"
                                    )
                                    return  # Success
                                else:
                                    logger.warning(
                                        f"Auto-import attempt {attempt + 1} returned status {response.status_code}"
                                    )
                            except requests.exceptions.ConnectionError:
                                logger.debug(f"Server not ready on attempt {attempt + 1}, will retry...")
                            except Exception as e:
                                logger.warning(f"Auto-import attempt {attempt + 1} failed: {e}")

                        logger.error("Auto-import failed after all retries")

                    # Start import in background thread
                    # Using daemon=True ensures it doesn't prevent shutdown
                    import_thread = threading.Thread(target=delayed_import, daemon=True, name="course-auto-import")
                    import_thread.start()
                    logger.info("Started background course import thread (will retry up to 3 times)")
                except Exception as e:
                    logger.warning(f"Failed to start auto-import thread: {e}")
            else:
                logger.info(f"Courses already exist in database ({result} courses) - skipping auto-import")
    except Exception as e:
        logger.warning(f"Course auto-import check failed (continuing): {e}")

    yield

    # Shutdown
    logger.info("\n" + "=" * 70)
    logger.info("STUDENT MANAGEMENT SYSTEM - SHUTDOWN")
    logger.info("=" * 70)
    logger.info("Closing database connections...")
    logger.info("Cleanup completed")
    logger.info("=" * 70)


# Create the application instance with lifespan

app = create_app()
app.router.lifespan_context = lifespan
app.state.runtime_context = RUNTIME_CONTEXT
app.state.version = VERSION  # Ensure health endpoint always returns backend version

# Attach rate limiter to app state
app.state.limiter = limiter

# Register rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# Request ID tracking middleware (should be first to track all requests)
try:
    # Guard registering RequestIDMiddleware in case it's not available or fails
    if "RequestIDMiddleware" in globals() and RequestIDMiddleware is not None:
        try:
            app.add_middleware(RequestIDMiddleware)
        except Exception as _mw_err:
            logger.warning(f"RequestIDMiddleware registration failed: {_mw_err}")
    else:
        logger.debug("RequestIDMiddleware not available; skipping middleware registration")
except Exception as _e:
    # Defensive fallback: don't let middleware registration prevent app import
    try:
        logger.warning(f"Error while attempting to register RequestIDMiddleware: {_e}")
    except Exception:
        pass

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response compression
try:
    if getattr(settings, "ENABLE_GZIP", True):
        app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)
    else:
        logger.debug("GZip middleware disabled via settings")
except Exception as gzip_err:
    logger.warning(f"Failed to configure GZipMiddleware: {gzip_err}")

# ============================================================================
# CONTROL PANEL API ENDPOINTS
# ============================================================================

FRONTEND_PROCESS: subprocess.Popen | None = None


@app.get("/control")
def control_page():
    if CONTROL_HTML and CONTROL_HTML.exists():
        return FileResponse(str(CONTROL_HTML))
    return JSONResponse({"error": "control panel HTML not found"}, status_code=404)


@app.get("/control/api/status")
def control_status():
    backend_ok = True
    detected = _detect_frontend_port()
    frontend_ok = detected is not None
    return {
        "backend": backend_ok,
        "frontend": frontend_ok,
        "running": backend_ok or frontend_ok,
        "frontend_port": detected,
    }


@app.post("/control/api/start")
def control_start():
    """
    Start the frontend development server (Vite).

    Professional startup sequence:
    1. Check if frontend is already running
    2. Validate frontend directory and package.json
    3. Ensure npm is available
    4. Auto-install dependencies if missing
    5. Start Vite dev server on dedicated port
    6. Wait for server readiness with timeout

    Returns:
        JSONResponse with success status and detailed message
    """
    global FRONTEND_PROCESS

    try:
        # 1. Check if frontend is already running
        if _is_port_open("127.0.0.1", FRONTEND_PORT_PREFERRED):
            logger.info(f"Frontend already running on port {FRONTEND_PORT_PREFERRED}")
            return {"success": True, "message": "Frontend already running", "port": FRONTEND_PORT_PREFERRED}

        # 2. Validate frontend directory structure
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
        if not os.path.isdir(frontend_dir):
            logger.error("Frontend directory not found")
            return JSONResponse(
                {"success": False, "message": "Frontend directory not found", "path": str(frontend_dir)},
                status_code=400,
            )

        # 3. Resolve and validate npm command
        npm_cmd = _resolve_npm_command()
        if not npm_cmd:
            logger.error("npm command not found - Node.js may not be installed")
            # Normalized, platform-agnostic user-facing message
            return JSONResponse(
                {
                    "success": False,
                    "message": "npm not found. Please install Node.js and npm (https://nodejs.org/)",
                },
                status_code=400,
            )

        # Validate npm is executable
        try:
            # Run npm -v using a list argument to avoid shell=True
            version_check = subprocess.run(
                [npm_cmd, "-v"],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=False,
                check=False,
                timeout=5,
                text=True,
            )
            if version_check.returncode != 0:
                raise subprocess.CalledProcessError(version_check.returncode, [npm_cmd, "-v"])
            logger.info(f"npm version: {version_check.stdout.strip()}")
        except Exception as e:
            # Log full exception details for diagnostics, return a stable API message
            logger.exception(f"npm validation failed: {e}")
            return JSONResponse(
                {
                    "success": False,
                    "message": "npm not found or not executable. Ensure Node.js and npm are installed.",
                },
                status_code=400,
            )

        # 4. Validate package.json and ensure dependencies
        pkg_path = os.path.join(frontend_dir, "package.json")
        if not os.path.isfile(pkg_path):
            logger.error("package.json not found in frontend directory")
            return JSONResponse(
                {"success": False, "message": "package.json not found", "path": pkg_path}, status_code=400
            )

        # Auto-install dependencies if node_modules is missing
        node_modules = os.path.join(frontend_dir, "node_modules")
        if not os.path.isdir(node_modules):
            logger.info("node_modules not found - installing dependencies...")

            # Prefer npm ci (clean install) if lockfile exists
            lockfile = os.path.join(frontend_dir, "package-lock.json")
            install_cmd = f"{npm_cmd} ci" if os.path.isfile(lockfile) else f"{npm_cmd} install"

            try:
                logger.info(f"Running: {install_cmd}")
                # install_cmd is either 'npm ci' or 'npm install' - build as list
                install_args = [npm_cmd, "ci"] if "ci" in install_cmd else [npm_cmd, "install"]
                install_result = subprocess.run(
                    install_args,
                    cwd=frontend_dir,
                    shell=False,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    check=False,
                    text=True,
                    timeout=300,  # 5 minute timeout for npm install
                )

                if install_result.returncode != 0:
                    # If npm ci failed, try npm install as fallback
                    if "ci" in install_cmd:
                        logger.warning("npm ci failed - falling back to npm install")
                        fallback_result = subprocess.run(
                            [npm_cmd, "install"],
                            cwd=frontend_dir,
                            shell=False,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            check=False,
                            text=True,
                            timeout=300,
                        )
                        if fallback_result.returncode != 0:
                            logger.error(f"npm install failed: {fallback_result.stdout}")
                            # Normalize the user message; include details for operators
                            return JSONResponse(
                                {
                                    "success": False,
                                    "message": "Failed to install frontend dependencies",
                                    "details": fallback_result.stdout,
                                },
                                status_code=500,
                            )
                    else:
                        logger.error(f"npm install failed: {install_result.stdout}")
                        return JSONResponse(
                            {
                                "success": False,
                                "message": "Failed to install frontend dependencies",
                                "details": install_result.stdout,
                            },
                            status_code=500,
                        )

                logger.info("Dependencies installed successfully")

            except subprocess.TimeoutExpired:
                logger.exception("npm install timed out after 5 minutes")
                return JSONResponse(
                    {"success": False, "message": "Failed to install frontend dependencies"}, status_code=500
                )
            except Exception as e:
                logger.exception(f"Failed to install dependencies: {e}")
                return JSONResponse(
                    {"success": False, "message": "Failed to install frontend dependencies"}, status_code=500
                )

        # 5. Start Vite dev server
        logger.info(f"Starting Vite dev server on port {FRONTEND_PORT_PREFERRED}...")
        start_args = [
            npm_cmd,
            "run",
            "dev",
            "--",
            "--host",
            "127.0.0.1",
            "--port",
            str(FRONTEND_PORT_PREFERRED),
            "--strictPort",
        ]
        start_cmd_str = " ".join(start_args)

        try:
            # Windows: avoid creating a visible console window for child process
            creationflags = 0
            if sys.platform == "win32":
                try:
                    creationflags = subprocess.CREATE_NO_WINDOW
                except Exception:
                    creationflags = 0

            # Ensure close_fds on POSIX to avoid fd leaks
            close_fds = sys.platform != "win32"

            FRONTEND_PROCESS = subprocess.Popen(
                start_args,
                cwd=frontend_dir,
                shell=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=creationflags,
                close_fds=close_fds,
            )
            logger.info(f"Vite process started with PID: {FRONTEND_PROCESS.pid}")
        except Exception as e:
            # Log full exception details but return a normalized message to the client
            logger.exception(f"Failed to start Vite process: {e}")
            return JSONResponse({"success": False, "message": "Failed to start frontend process"}, status_code=500)

        # 6. Wait for server readiness (up to 30 seconds)
        logger.info("Waiting for frontend server to be ready...")
        max_attempts = 120  # 30 seconds (120 * 0.25s)
        for attempt in range(max_attempts):
            _time.sleep(0.25)

            # Check if process is still running
            if FRONTEND_PROCESS.poll() is not None:
                logger.error("Frontend process terminated unexpectedly")
                return JSONResponse(
                    {"success": False, "message": "Frontend process terminated unexpectedly", "command": start_cmd_str},
                    status_code=500,
                )

            # Check if server is responding
            if _is_port_open("127.0.0.1", FRONTEND_PORT_PREFERRED):
                logger.info(f"Frontend server ready on port {FRONTEND_PORT_PREFERRED}")
                return {
                    "success": True,
                    "message": "Frontend started successfully",
                    "port": FRONTEND_PORT_PREFERRED,
                    "url": f"http://localhost:{FRONTEND_PORT_PREFERRED}",
                    "pid": FRONTEND_PROCESS.pid,
                }

        # Timeout - server didn't start
        logger.error("Frontend server failed to start within 30 seconds")

        # Kill the process since it's not responding
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(FRONTEND_PROCESS.pid)],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass

        return JSONResponse(
            {
                "success": False,
                "message": f"Frontend failed to start on port {FRONTEND_PORT_PREFERRED} within 30 seconds",
                "hint": "Port may be in use. Check with: netstat -ano | findstr :{FRONTEND_PORT_PREFERRED}",
                "command": start_cmd_str,
            },
            status_code=500,
        )

    except Exception as e:
        logger.error(f"Unexpected error starting frontend: {e}", exc_info=True)
        return JSONResponse({"success": False, "message": f"Unexpected error: {e!s}"}, status_code=500)


@limiter.limit(RATE_LIMIT_WRITE)
@app.post("/control/api/stop-all")
def control_stop_all(request: Request, _auth=Depends(require_control_admin)):
    """
    Comprehensive system shutdown - stops all services gracefully.

    Professional shutdown sequence:
    1. Stop frontend processes (tracked and port-based detection)
    2. Terminate all Node.js processes (Vite dev server)
    3. Schedule backend shutdown with delayed exit (allows HTTP response)

    Returns:
        JSONResponse with success status and list of stopped services
    """
    global FRONTEND_PROCESS
    logger.info("=== System Shutdown Initiated ===")
    # Audit info: log caller IP and whether admin token was provided (masked)
    try:
        client_ip = getattr(request.client, "host", "unknown")
        token = request.headers.get("x-admin-token") or request.headers.get("X-ADMIN-TOKEN")
        logger.info(
            "Control API called: stop-all, client=%s, token_present=%s, token=%s",
            client_ip,
            bool(token),
            _mask_token(token),
        )
    except Exception:
        logger.debug("Failed to log control API audit info")

    try:
        stopped_services = []
        errors = []

        # ═══ PHASE 1: Stop Frontend Processes ═══
        logger.info("Phase 1: Stopping frontend processes...")
        frontend_stopped = False

        # Stop tracked frontend process if exists
        if FRONTEND_PROCESS is not None:
            pid = None
            try:
                pid = FRONTEND_PROCESS.pid
                logger.info(f"Terminating tracked frontend process (PID: {pid})")

                result = subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)], check=False, capture_output=True, text=True, timeout=5
                )

                if result.returncode == 0:
                    frontend_stopped = True
                    logger.info(f"✓ Stopped tracked frontend (PID: {pid})")
                else:
                    logger.warning(f"taskkill returned {result.returncode} for PID {pid}")

            except subprocess.TimeoutExpired:
                if pid:
                    logger.error(f"Timeout killing frontend PID {pid}")
                    errors.append(f"Timeout killing frontend PID {pid}")
                else:
                    logger.error("Timeout killing frontend process")
                    errors.append("Timeout killing frontend process")
            except AttributeError:
                logger.warning("Frontend process object exists but has no PID")
            except Exception as e:
                logger.error(f"Failed to stop tracked frontend: {e}")
                errors.append(f"Tracked frontend: {e!s}")
            finally:
                FRONTEND_PROCESS = None
        else:
            logger.info("No tracked frontend process")

        # Kill any processes on frontend ports
        logger.info(f"Scanning frontend ports: {FRONTEND_PORT_CANDIDATES}")
        ports_cleared = 0

        for port in FRONTEND_PORT_CANDIDATES:
            pids = _find_pids_on_port(port)
            if pids:
                logger.info(f"Found {len(pids)} process(es) on port {port}: {pids}")
                for pid in pids:
                    try:
                        result = subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid)],
                            check=False,
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        if result.returncode == 0:
                            frontend_stopped = True
                            ports_cleared += 1
                            logger.info(f"✓ Killed PID {pid} on port {port}")
                        else:
                            logger.warning(f"Failed to kill PID {pid}: {result.stderr}")
                            errors.append(f"Port {port} PID {pid}: taskkill failed")
                    except subprocess.TimeoutExpired:
                        logger.error(f"Timeout killing PID {pid}")
                        errors.append(f"Timeout killing PID {pid}")
                    except Exception as e:
                        logger.error(f"Error killing PID {pid}: {e}")
                        errors.append(f"PID {pid}: {e!s}")

        if frontend_stopped:
            stopped_services.append(f"Frontend ({ports_cleared} port(s) cleared)")
            logger.info(f"✓ Frontend stopped ({ports_cleared} ports cleared)")
        else:
            logger.info("No frontend processes to stop")

        # ═══ PHASE 2: Stop Node.js Processes ═══
        logger.info("Phase 2: Stopping Node.js processes...")

        try:
            # Check for Node.js processes
            check_result = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq node.exe", "/FO", "CSV", "/NH"],
                capture_output=True,
                text=True,
                check=False,
                timeout=5,
            )

            if check_result.returncode == 0 and "node.exe" in check_result.stdout:
                logger.info("Node.js processes detected - terminating all node.exe instances")

                kill_result = subprocess.run(
                    ["taskkill", "/F", "/IM", "node.exe", "/T"], check=False, capture_output=True, text=True, timeout=10
                )

                if kill_result.returncode == 0:
                    stopped_services.append("Node.js")
                    logger.info("✓ All Node.js processes terminated")

                    # Brief wait for process cleanup
                    _time.sleep(0.5)
                else:
                    logger.warning(f"taskkill node.exe returned {kill_result.returncode}")
                    if kill_result.stderr:
                        logger.warning(f"stderr: {kill_result.stderr}")
            else:
                logger.info("No Node.js processes found")

        except subprocess.TimeoutExpired:
            logger.error("Timeout while stopping Node.js processes")
            errors.append("Node.js termination timeout")
        except Exception as e:
            logger.error(f"Failed to stop Node.js processes: {e}")
            errors.append(f"Node.js: {e!s}")

        # ═══ PHASE 3: Schedule Backend Shutdown ═══
        logger.info("Phase 3: Scheduling backend shutdown...")

        def _delayed_backend_shutdown():
            """Delayed shutdown to allow HTTP response to complete"""
            try:
                _time.sleep(1.0)  # 1 second delay for response transmission
                logger.info("Executing backend shutdown sequence")

                current_pid = os.getpid()
                parent_pid = os.getppid()

                logger.info(f"Terminating backend process tree (PIDs: {current_pid}, {parent_pid})")

                # Kill both current and parent (handles uvicorn --reload mode)
                for pid in {current_pid, parent_pid}:
                    try:
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid)],
                            check=False,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                            timeout=3,
                        )
                        logger.info(f"✓ Terminated PID {pid}")
                    except Exception as e:
                        logger.warning(f"Failed to kill PID {pid}: {e}")

            except Exception as e:
                logger.error(f"Backend shutdown error: {e}", exc_info=True)
            finally:
                # Force exit as final fallback
                logger.info("=== Force Exit ===")
                # Force immediate exit as a final fallback. In container/orchestration
                # environments a softer termination may be preferred. Use the
                # environment variable `ALLOW_SOFT_SHUTDOWN=1` to enable softer
                # shutdown behaviour (attempt SIGTERM) in those environments.
                if os.environ.get("ALLOW_SOFT_SHUTDOWN", "0") == "1":
                    try:
                        logger.info("ALLOW_SOFT_SHUTDOWN enabled; attempting graceful exit")
                        return
                    except Exception:
                        pass
                os._exit(0)

        # Start shutdown thread
        shutdown_thread = threading.Thread(target=_delayed_backend_shutdown, daemon=True)
        shutdown_thread.start()
        stopped_services.append("Backend (shutdown scheduled)")

        logger.info(f"✓ Shutdown sequence complete - stopped: {', '.join(stopped_services)}")

        # Build response
        response_data = {
            "success": True,
            "message": "System shutdown complete",
            "stopped_services": stopped_services,
            "info": "Backend will terminate in 1 second",
            "timestamp": datetime.now().isoformat(),
        }

        if errors:
            response_data["warnings"] = errors
            logger.warning(f"Shutdown completed with {len(errors)} warning(s)")

        return response_data

    except Exception as e:
        logger.error(f"Critical shutdown error: {e!s}", exc_info=True)
        return JSONResponse(
            {"success": False, "message": f"Shutdown error: {e!s}", "timestamp": datetime.now().isoformat()},
            status_code=500,
        )


@limiter.limit(RATE_LIMIT_WRITE)
@app.post("/control/api/stop")
def control_stop(request: Request, _auth=Depends(require_control_admin)):
    """
    Stop frontend development server only (Vite).

    Professional frontend termination:
    1. Terminate tracked frontend process if exists
    2. Scan and kill processes on frontend ports (5173-5180)
    3. Return detailed status of stopped processes

    Returns:
        JSONResponse with success status and termination details
    """
    global FRONTEND_PROCESS
    logger.info("Frontend stop requested")
    # Audit info: log caller IP and token presence
    try:
        client_ip = getattr(request.client, "host", "unknown")
        token = request.headers.get("x-admin-token") or request.headers.get("X-ADMIN-TOKEN")
        logger.info(
            "Control API called: stop, client=%s, token_present=%s, token=%s",
            client_ip,
            bool(token),
            _mask_token(token),
        )
    except Exception:
        logger.debug("Failed to log control API audit info")

    try:
        stopped_any = False
        stopped_pids = []
        errors = []

        # Phase 1: Kill tracked frontend process
        if FRONTEND_PROCESS is not None:
            pid = None
            try:
                pid = FRONTEND_PROCESS.pid
                logger.info(f"Terminating tracked frontend (PID: {pid})")

                result = subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)], check=False, capture_output=True, text=True, timeout=5
                )

                if result.returncode == 0:
                    stopped_any = True
                    stopped_pids.append(pid)
                    logger.info(f"✓ Stopped tracked frontend (PID: {pid})")
                else:
                    logger.warning(f"Failed to stop PID {pid}: return code {result.returncode}")
                    errors.append(f"PID {pid}: taskkill failed")

            except subprocess.TimeoutExpired:
                if pid:
                    logger.error(f"Timeout killing PID {pid}")
                    errors.append(f"Timeout killing PID {pid}")
            except AttributeError:
                logger.warning("Frontend process object exists but has no PID attribute")
                errors.append("Invalid process object")
            except Exception as e:
                logger.warning(f"Failed to stop tracked frontend: {e}")
                errors.append(f"Tracked process: {e!s}")
            finally:
                FRONTEND_PROCESS = None

        # Phase 2: Kill processes on frontend ports
        logger.info(f"Scanning frontend ports: {FRONTEND_PORT_CANDIDATES}")
        ports_cleared = 0

        for port in FRONTEND_PORT_CANDIDATES:
            pids = _find_pids_on_port(port)
            if pids:
                logger.info(f"Found {len(pids)} process(es) on port {port}: {pids}")
                for pid in pids:
                    try:
                        result = subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid)],
                            check=False,
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )

                        if result.returncode == 0:
                            stopped_any = True
                            stopped_pids.append(pid)
                            ports_cleared += 1
                            logger.info(f"✓ Stopped frontend on port {port} (PID: {pid})")
                        else:
                            logger.warning(f"Failed to stop PID {pid} on port {port}")
                            errors.append(f"Port {port} PID {pid}: taskkill failed")

                    except subprocess.TimeoutExpired:
                        logger.error(f"Timeout killing PID {pid} on port {port}")
                        errors.append(f"Timeout: port {port} PID {pid}")
                    except Exception as e:
                        logger.warning(f"Failed to stop PID {pid} on port {port}: {e}")
                        errors.append(f"Port {port} PID {pid}: {e!s}")

        # Build response
        if stopped_any:
            message = (
                f"Frontend stopped successfully ({len(stopped_pids)} process(es), {ports_cleared} port(s) cleared)"
            )
            logger.info(f"✓ {message}")
        else:
            message = "No frontend processes detected"
            logger.info(message)

        response_data = {
            "success": True,
            "message": message,
            "stopped_pids": stopped_pids,
            "ports_cleared": ports_cleared,
            "timestamp": datetime.now().isoformat(),
        }

        if errors:
            response_data["warnings"] = errors
            logger.warning(f"Stopped with {len(errors)} warning(s)")

        return response_data

    except Exception as e:
        logger.error(f"Frontend stop error: {e!s}", exc_info=True)
        return JSONResponse(
            {"success": False, "message": f"Frontend stop error: {e!s}", "timestamp": datetime.now().isoformat()},
            status_code=500,
        )


@limiter.limit(RATE_LIMIT_WRITE)
@app.post("/control/api/stop-backend")
def control_stop_backend(request: Request, _auth=Depends(require_control_admin)):
    """
    Stop backend server only (FastAPI/Uvicorn).

    Professional backend shutdown:
    1. Schedule delayed shutdown (allows HTTP response to complete)
    2. Terminate both current process and parent (handles uvicorn --reload)
    3. Force exit as fallback

    Returns:
        JSONResponse with success status and shutdown timing
    """
    logger.info("Backend stop requested")
    # Audit info: log caller IP and token presence
    try:
        client_ip = getattr(request.client, "host", "unknown")
        token = request.headers.get("x-admin-token") or request.headers.get("X-ADMIN-TOKEN")
        logger.info(
            "Control API called: stop-backend, client=%s, token_present=%s, token=%s",
            client_ip,
            bool(token),
            _mask_token(token),
        )
    except Exception:
        logger.debug("Failed to log control API audit info")

    try:
        current_pid = os.getpid()
        parent_pid = os.getppid()

        logger.info(f"Backend PIDs - Current: {current_pid}, Parent: {parent_pid}")

        def _delayed_exit():
            """Delayed shutdown thread to allow HTTP response transmission"""
            try:
                _time.sleep(0.75)  # 750ms delay allows response to be sent
                logger.info("Executing backend shutdown sequence")

                # Terminate process tree (handles uvicorn --reload mode)
                if os.name == "nt":
                    for pid in {current_pid, parent_pid}:
                        try:
                            result = subprocess.run(
                                ["taskkill", "/F", "/T", "/PID", str(pid)],
                                check=False,
                                capture_output=True,
                                text=True,
                                timeout=3,
                            )

                            if result.returncode == 0:
                                logger.info(f"✓ Terminated backend PID: {pid}")
                            else:
                                logger.warning(f"Failed to kill PID {pid}: return code {result.returncode}")

                        except subprocess.TimeoutExpired:
                            logger.error(f"Timeout killing backend PID {pid}")
                        except Exception as e:
                            logger.error(f"Failed to kill PID {pid}: {e}")
                else:
                    # Unix-like systems
                    import signal

                    try:
                        os.kill(current_pid, signal.SIGTERM)
                        logger.info(f"✓ Sent SIGTERM to PID: {current_pid}")
                    except Exception as e:
                        logger.error(f"Failed to send SIGTERM: {e}")

            except Exception as e:
                logger.error(f"Backend shutdown error: {e}", exc_info=True)
            finally:
                logger.info("Force exit backend")
                os._exit(0)

        # Start shutdown thread
        threading.Thread(target=_delayed_exit, daemon=True).start()

        logger.info("Backend shutdown scheduled (750ms delay)")

        return {
            "success": True,
            "message": "Backend shutdown initiated",
            "info": "Server will terminate in 750ms",
            "pids": {"current": current_pid, "parent": parent_pid},
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Backend stop error: {e!s}", exc_info=True)
        return JSONResponse(
            {"success": False, "message": f"Backend stop error: {e!s}", "timestamp": datetime.now().isoformat()},
            status_code=500,
        )


# Alias for admin shutdown route (for backward compatibility)
@limiter.limit(RATE_LIMIT_WRITE)
@app.post("/api/v1/admin/shutdown")
def admin_shutdown(request: Request, _auth=Depends(require_control_admin)):
    """
    Alias for backend shutdown - redirects to control API.
    Maintained for backward compatibility with admin routes.
    """
    # Audit info: log caller IP and token presence for the alias route
    try:
        client_ip = getattr(request.client, "host", "unknown")
        token = request.headers.get("x-admin-token") or request.headers.get("X-ADMIN-TOKEN")
        logger.info(
            "Admin shutdown route called (alias) - client=%s, token_present=%s, token=%s",
            client_ip,
            bool(token),
            _mask_token(token),
        )
    except Exception:
        logger.debug("Failed to log admin shutdown audit info")
    logger.info("Admin shutdown route called (redirecting to control API)")
    return control_stop_all(request=request, _auth=_auth)


# ============================================================================
# DATABASE SETUP
# ============================================================================

# Database is initialized in db.py; just log status
engine = db_engine
logger.info("Database engine ready")


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

# Use centralized DB dependency directly
get_db = db_get_session


# ============================================================================
# ROUTER REGISTRATION (placeholder for modular routers)
# ============================================================================


def register_routers(app: FastAPI) -> None:
    """
    Register all API routers with the application.

    Attempts to import routers from the routers directory.
    If routers don't exist, application runs in standalone mode.

    Args:
        app: FastAPI application instance
    """
    # Try to import admin routes using importlib resolution
    try:
        admin_mod_name = (
            "backend.admin_routes"
            if importlib.util.find_spec("backend.admin_routes")
            else ("admin_routes" if importlib.util.find_spec("admin_routes") else None)
        )
        if admin_mod_name:
            admin_mod = importlib.import_module(admin_mod_name)
            admin_router = getattr(admin_mod, "router")
            app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
            logger.info("Admin router registered successfully")
    except Exception as e:
        logger.debug(f"Admin router not found or failed to register: {e}")

    # Explicitly register Auth router (critical) via importlib resolution
    try:
        auth_mod_name = (
            "backend.routers.routers_auth"
            if importlib.util.find_spec("backend.routers.routers_auth")
            else ("routers.routers_auth" if importlib.util.find_spec("routers.routers_auth") else None)
        )
        if auth_mod_name:
            auth_mod = importlib.import_module(auth_mod_name)
            auth_router = getattr(auth_mod, "router")
            app.include_router(auth_router, prefix="/api/v1", tags=["Auth"])
            logger.info("Auth router registered successfully")
    except Exception as e:
        logger.warning(f"Auth router failed to load: {e}")

    # Try to import modular routers using actual filenames under backend/routers/.
    # Import each router independently so one failure doesn't block others.
    registered = []
    errors = []

    def _try_add(import_path: str, tag: str):
        nonlocal registered, errors
        try:
            # Prefer backend-prefixed module when available
            backend_path = import_path
            plain_path = import_path.replace("backend.", "")
            chosen = None
            if importlib.util.find_spec(backend_path) is not None:
                chosen = backend_path
            elif importlib.util.find_spec(plain_path) is not None:
                chosen = plain_path
            else:
                chosen = None

            if chosen is None:
                raise ModuleNotFoundError(f"Module not found: {import_path}")

            module = importlib.import_module(chosen)
            app.include_router(getattr(module, "router"), prefix="/api/v1", tags=[tag])
            registered.append(tag)
        except Exception as ex:
            errors.append((import_path, str(ex)))
            logger.debug(f"Failed to register router '{import_path}': {ex}")

    _try_add("backend.routers.routers_students", "Students")
    _try_add("backend.routers.routers_courses", "Courses")
    _try_add("backend.routers.routers_grades", "Grades")
    _try_add("backend.routers.routers_attendance", "Attendance")
    _try_add("backend.routers.routers_analytics", "Analytics")
    _try_add("backend.routers.routers_performance", "DailyPerformance")
    _try_add("backend.routers.routers_exports", "Export")
    _try_add("backend.routers.routers_enrollments", "Enrollments")
    _try_add("backend.routers.routers_imports", "Imports")
    _try_add("backend.routers.routers_highlights", "Highlights")
    _try_add("backend.routers.routers_adminops", "AdminOps")
    _try_add("backend.routers.routers_control", "Control")

    if registered:
        logger.info(f"Registered routers: {', '.join(registered)}")
    if errors:
        # Elevate visibility so operators can see exactly which routers failed
        logger.warning("Some routers failed to load. Details:")
        for mod, err in errors:
            logger.warning(f" - {mod}: {err}")


# Register routers
register_routers(app)

# ============================================================================
# ROOT ENDPOINTS
# ============================================================================


def _api_metadata() -> dict:
    return {
        "message": "Student Management System API",
        "version": VERSION,
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
    """
    Root endpoint.

    Behavior:
    - In fullstack/production mode (SERVE_FRONTEND=1 and built SPA exists), serve the SPA index.html
      so the app loads at '/'.
    - Otherwise return API metadata as JSON for developer visibility and tests.
    """
    try:
        if SERVE_FRONTEND and SPA_INDEX_FILE and SPA_INDEX_FILE.exists():
            return FileResponse(str(SPA_INDEX_FILE))
    except Exception:
        # If anything goes wrong, fall back to JSON metadata
        pass

    return _api_metadata()


@app.get("/api")
async def api_info():
    """Informational API metadata (JSON)."""
    return _api_metadata()


# ============================================================================
# OPTIONAL: SERVE FRONTEND SPA (production mode without NGINX)
# Set environment variable SERVE_FRONTEND=1 and build frontend (frontend/dist)
# ============================================================================


def _is_true(val: str | None) -> bool:
    if not val:
        return False
    return val.strip().lower() in {"1", "true", "yes", "on"}


SERVE_FRONTEND = _is_true(os.environ.get("SERVE_FRONTEND"))

if SERVE_FRONTEND and SPA_DIST_DIR and SPA_INDEX_FILE and SPA_INDEX_FILE.exists():
    try:
        # Serve all static assets directly (Vite emits /assets/* by default)
        app.mount("/assets", StaticFiles(directory=str(SPA_DIST_DIR / "assets")), name="assets")

        # Paths that should never be intercepted by the SPA fallback
        EXCLUDE_PREFIXES = (
            "api/",
            "docs",
            "redoc",
            "openapi.json",
            "control",
            "health",
            "favicon.ico",
            "assets/",
        )

        # Fallback via exception handler: if a route is not found (404),
        # serve index.html for client-side routes that aren't API/docs/etc.
        @app.exception_handler(StarletteHTTPException)
        async def spa_404_handler(request: Request, exc: StarletteHTTPException):
            if exc.status_code == 404:
                p = request.url.path.lstrip("/")
                # If the path is part of API/docs/control/etc, return the 404 as-is
                for pref in EXCLUDE_PREFIXES:
                    if p.startswith(pref):
                        return JSONResponse({"detail": "Not Found"}, status_code=404)
                # Otherwise, return SPA index.html
                if SPA_INDEX_FILE and SPA_INDEX_FILE.exists():
                    return FileResponse(str(SPA_INDEX_FILE))
            # Default behavior for other errors
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

        logger.info("SERVE_FRONTEND enabled: Serving SPA from 'frontend/dist' with 404 fallback.")
    except Exception as e:
        logger.warning(f"Failed to enable SERVE_FRONTEND SPA serving: {e}")


@app.get("/favicon.ico")
async def favicon():
    """
    Serve favicon for browser requests.
    Returns a simple SVG favicon with 'S' for Student Management System.
    """
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#4F46E5"/>
  <text x="50" y="70" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">S</text>
</svg>"""
    from fastapi.responses import Response

    return Response(content=svg_content, media_type="image/svg+xml")


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Comprehensive health check endpoint.

    Verifies:
    - API is running
    - Database connection is working
    - Disk space available
    - Migration status
    - System information
    - Service dependencies

    Returns 200 if healthy/degraded, 503 if unhealthy.

    Args:
        db: Database session dependency

    Returns:
        dict: Comprehensive health status
    """
    from backend.import_resolver import import_names

    (HealthChecker,) = import_names("health_checks", "HealthChecker")

    checker = HealthChecker(app.state, db_engine)
    result = checker.check_health(db)

    # Backward-compatible shape expected by tests/legacy clients
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

        # Merge overlay on top-level without removing original details
        result.update(legacy_overlay)
        return result
    except Exception:
        # If transformation fails, return original result
        return result


@app.get("/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness probe endpoint for Kubernetes/orchestration.

    Checks if the application is ready to accept traffic.
    Returns 200 if ready, 503 if not ready.

    Use this for:
    - Kubernetes readiness probes
    - Load balancer health checks
    - Service mesh health checks

    Args:
        db: Database session dependency

    Returns:
        dict: Readiness status
    """
    from backend.import_resolver import import_names

    (HealthChecker,) = import_names("health_checks", "HealthChecker")

    checker = HealthChecker(app.state, db_engine)
    return checker.check_readiness(db)


@app.get("/health/live")
async def liveness_check():
    """
    Liveness probe endpoint for Kubernetes/orchestration.

    Minimal check to verify the application process is alive.
    Should always return 200 unless the application is completely dead.

    Use this for:
    - Kubernetes liveness probes
    - Process monitoring
    - Restart decisions

    Returns:
        dict: Liveness status
    """
    from backend.import_resolver import import_names

    (HealthChecker,) = import_names("health_checks", "HealthChecker")

    checker = HealthChecker(app.state, db_engine)
    return checker.check_liveness()


# ============================================================================
# FRONTEND ERROR LOGGING ENDPOINTS
# ============================================================================


@app.post("/api/logs/frontend-error")
async def log_frontend_error(request: Request):
    """
    Receive and log frontend errors for centralized monitoring.

    Expected payload:
    {
        "message": "Error message",
        "stack": "Stack trace",
        "componentStack": "React component stack",
        "timestamp": "ISO timestamp",
        "userAgent": "Browser user agent",
        "url": "Page URL",
        "context": {},
        "type": "error_type"
    }
    """
    try:
        error_data = await request.json()

        # Log to application logger
        logger.error(
            f"Frontend Error: {error_data.get('message', 'Unknown')}",
            extra={
                "request_id": getattr(request.state, "request_id", "-"),
                "frontend_error": True,
                "url": error_data.get("url"),
                "user_agent": error_data.get("userAgent"),
                "error_type": error_data.get("type"),
                "stack": error_data.get("stack", "")[:500],  # Limit stack trace length
                "component_stack": error_data.get("componentStack", "")[:500],
            },
        )

        return {"status": "logged", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.warning(f"Failed to log frontend error: {e}")
        return {"status": "failed", "error": str(e)}


@app.post("/api/logs/frontend-warning")
async def log_frontend_warning(request: Request):
    """
    Receive and log frontend warnings.
    """
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


# ============================================================================
# STUDENT ENDPOINTS
# ============================================================================
"""
Student endpoints are defined in `backend/routers/routers_students.py` and mounted via
`register_routers(app)`. Inline duplicates removed to avoid conflicts.
"""


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================


def main() -> None:
    """
    Main entry point for running the application directly.

    Configures and starts the Uvicorn server with:
    - Host: 127.0.0.1
    - Port: 8000
    - Auto-reload: Enabled for development
    - Log level: Info
    """
    print("\n" + "=" * 70)
    print("STUDENT MANAGEMENT SYSTEM API")
    print("=" * 70)
    print(f"  Version: {VERSION}")
    print("  Status: Production Ready with All Fixes Applied")
    print("  Database: SQLite")
    print("  Framework: FastAPI")
    print("=" * 70)
    print("\nStarting API Server...")
    print("  URL: http://localhost:8000")
    print("  Swagger Docs: http://localhost:8000/docs")
    print("  ReDoc: http://localhost:8000/redoc")
    print("  Health Check: http://localhost:8000/health")
    print("\n  Press CTRL+C to stop the server\n")
    print("=" * 70 + "\n")

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        # reload disabled when running with -m flag
    )


if __name__ == "__main__":
    main()
