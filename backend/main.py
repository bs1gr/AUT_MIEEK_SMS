"""
Student Management System - Production Ready
Version: 1.9.2 (See VERSION file)

Key Features:
✅ Modern FastAPI with lifespan context manager
✅ Comprehensive validation and error handling
✅ Container-aware monitoring detection
✅ Full type hints and documentation
✅ Enhanced logging with structured output
✅ UTF-8 encoding support for Windows console
✅ Clean modular architecture
✅ Docker and native deployment modes

RECOMMENDED STARTUP:
- Windows: Use RUN.ps1 (one-click deployment with port conflict handling)
- Direct: uvicorn backend.main:app --host 127.0.0.1 --port 8000
  (If port 8000 is busy, use --port 8001, 8002, etc.)
"""

import io
import logging
import os
import shlex
import shutil
import socket
import subprocess
import sys
import threading
import time as _time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable, cast

import uvicorn

# FastAPI imports
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Rate limiting
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

# Optional import for common rate limit strings; fall back to defaults if missing
try:
    from backend.rate_limiting import RATE_LIMIT_WRITE
except Exception:
    RATE_LIMIT_WRITE = "10/minute"

# Database imports
# Local imports: prefer package imports, fall back to module imports when executed from backend/
import importlib
import importlib.util

from sqlalchemy.orm import Session

try:
    from backend.admin_bootstrap import ensure_default_admin_account
except Exception:
    try:
        from admin_bootstrap import ensure_default_admin_account
    except Exception:

        def ensure_default_admin_account(*args, **kwargs):  # type: ignore[unused-arg]
            return None

db_session_factory = None

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
    db_session_factory = getattr(db_mod, "SessionLocal", None)
    rim_mod = importlib.import_module("backend.request_id_middleware")
    RequestIDMiddleware = getattr(rim_mod, "RequestIDMiddleware")
    try:
        response_cache_mod = importlib.import_module("backend.middleware.response_cache")
        ResponseCacheMiddleware = getattr(response_cache_mod, "ResponseCacheMiddleware")
    except Exception:
        ResponseCacheMiddleware = None
    env_mod = importlib.import_module("backend.environment")
    # Control API auth helpers
    try:
        # Import both the builtin require_control_admin and the factory so we can
        # optionally integrate application auth (logged-in admin users) with the
        # control dependency. We avoid hard failures if auth helpers can't be
        # imported so tests and minimal environments stay functional.
        from backend.control_auth import create_control_dependency
        from backend.control_auth import require_control_admin as _require_control_admin
        from backend.routers.control.frontend_dev import control_stop_all

        # Attempt to build an auth_check that recognizes logged-in admin users
        # by decoding a Bearer token and verifying the user's role in the DB.
        def _build_auth_check():
            try:
                auth_mod = importlib.import_module("backend.routers.routers_auth")
                models_mod = importlib.import_module("backend.models")
            except Exception:
                return None

            session_maker = getattr(db_mod, "SessionLocal", None)
            if session_maker is None:
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

                session = None
                try:
                    # Use the auth module's decode_token helper to validate JWT
                    payload = getattr(auth_mod, "decode_token")(token)
                    email_val = payload.get("sub")
                    if not email_val:
                        return False

                    # Create an explicit session so we don't rely on FastAPI's dependency system here.
                    session = session_maker()
                    user = (
                        session.query(models_mod.User)
                        .filter(models_mod.User.email == email_val)
                        .first()
                    )
                    return bool(
                        user and getattr(user, "is_active", False) and getattr(user, "role", None) == "admin"
                    )
                except Exception:
                    return False
                finally:
                    if session is not None:
                        try:
                            session.close()
                        except Exception:
                            pass

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
    db_session_factory = getattr(db_mod, "SessionLocal", None)
    rim_mod = importlib.import_module("request_id_middleware")
    RequestIDMiddleware = getattr(rim_mod, "RequestIDMiddleware")
    try:
        response_cache_mod = importlib.import_module("middleware.response_cache")
        ResponseCacheMiddleware = getattr(response_cache_mod, "ResponseCacheMiddleware")
    except Exception:
        ResponseCacheMiddleware = None
    env_mod = importlib.import_module("environment")
    # Control API auth helpers (fallback for direct script execution)
    try:
        from backend.control_auth import (
            require_control_admin as _fallback_require_control_admin,
        )

        require_control_admin = cast(Callable[..., Any], _fallback_require_control_admin)
    except Exception:

        def require_control_admin(request):
            return None

try:
    from backend.security import install_csrf_protection  # type: ignore[assignment]
except Exception:
    try:
        from security import install_csrf_protection  # type: ignore[assignment]
    except Exception:

        def install_csrf_protection(app):  # type: ignore[dead-code]
            logging.getLogger(__name__).warning("CSRF security helpers unavailable; skipping installation")

if db_session_factory is None:
    raise RuntimeError("Database session factory unavailable; ensure backend.db exposes SessionLocal")

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
    # Optional SPA directory (built frontend)
    SPA_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
    SPA_INDEX_FILE = SPA_DIST_DIR / "index.html"
except Exception:
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


def _allow_taskkill() -> bool:
    """Return True when destructive taskkill operations are allowed by env.

    Use the environment variable CONTROL_API_ALLOW_TASKKILL=1 to enable
    performing system-level taskkill operations from control endpoints.
    Default is disabled to avoid accidental process termination when the
    app runs in development, CI, or test environments.
    """
    return os.environ.get("CONTROL_API_ALLOW_TASKKILL", "0") == "1"


def _safe_run(cmd_args, timeout=5):
    """Run subprocess.run with safety guard for taskkill-like operations.

    If _allow_taskkill() is False and the command looks like a taskkill
    or other destructive action, the call will be skipped and a
    dummy success-like object returned. This prevents tests or CI from
    accidentally killing host processes.
    """
    # Basic check: skip known Windows destructive invocations
    if not _allow_taskkill():
        # If the command is a taskkill or node kill, do not execute it.
        try:
            if isinstance(cmd_args, (list, tuple)) and cmd_args:
                cmd0 = str(cmd_args[0]).lower()
                if (
                    "taskkill" in cmd0
                    or "taskkill.exe" in cmd0
                    or (
                        "/im" in " ".join(map(str, cmd_args)).lower()
                        and "node.exe" in " ".join(map(str, cmd_args)).lower()
                    )
                ):
                    logger.info("CONTROL_API_ALLOW_TASKKILL not set: skipping destructive command: %s", cmd_args)
                    return SimpleNamespace(returncode=0, stdout="", stderr="")
        except Exception:
            # Fall through to safe execution
            pass

    # Default: run command as normal
    try:
        return subprocess.run(cmd_args, check=False, capture_output=True, text=True, timeout=timeout)
    except Exception as e:
        logger.warning(f"Safe run failed for {cmd_args}: {e}")
        return SimpleNamespace(returncode=1, stdout="", stderr=str(e))


def _infer_restart_command() -> list[str] | None:
    """Best-effort reconstruction of the launch command for process restart."""
    env_cmd = os.environ.get("SMS_RESTART_COMMAND", "").strip()
    if env_cmd:
        try:
            parsed = shlex.split(env_cmd)
            if parsed:
                return parsed
        except ValueError as exc:
            logger.warning("Invalid SMS_RESTART_COMMAND '%s': %s", env_cmd, exc)

    argv = sys.argv[:] if sys.argv else []
    if not argv:
        logger.warning("Cannot infer restart command: sys.argv empty")
        return None

    entry = argv[0] or "uvicorn"
    args = argv[1:]
    entry_path = Path(entry)
    lowered = entry_path.suffix.lower()

    # Direct executable (python.exe / uvicorn.exe / etc)
    if lowered in {".exe", ".bat", ".cmd"}:
        resolved = entry
        if not entry_path.is_absolute():
            which = shutil.which(entry)
            if which:
                resolved = which
        return [resolved, *args]

    # Python script invocation (python backend/app.py)
    if lowered in {".py", ".pyw"} or entry_path.exists():
        run_target = entry_path
        if not run_target.is_absolute():
            run_target = (Path.cwd() / run_target).resolve()
        return [sys.executable, str(run_target), *args]

    # Default to module invocation (python -m <module> ...)
    module_name = entry
    return [sys.executable, "-m", module_name, *args]


def _command_has_reload_flag(cmd: list[str]) -> bool:
    try:
        return any(arg == "--reload" or arg.startswith("--reload=") for arg in cmd)
    except Exception:
        return False


def _trigger_reload_ping(delay_seconds: float = 0.3) -> None:
    reload_target = Path(__file__).resolve()

    def _ping():
        try:
            logger.info("Triggering uvicorn reload via touch on %s", reload_target)
            _time.sleep(delay_seconds)
            os.utime(reload_target, None)
        except Exception as exc:
            logger.error("Failed to trigger reload ping: %s", exc, exc_info=True)

    threading.Thread(target=_ping, daemon=True).start()


def _resolve_exec_command(cmd: list[str]) -> list[str]:
    """Ensure the executable path (element 0) is absolute if possible."""

    if not cmd:
        raise ValueError("Empty restart command")

    exec_path = cmd[0]
    if os.path.isabs(exec_path) and os.path.exists(exec_path):
        return cmd

    resolved = shutil.which(exec_path)
    if resolved:
        return [resolved, *cmd[1:]]
    return cmd


def _spawn_restart_thread(command: list[str], delay_seconds: float = 0.75) -> None:
    """Spawn a background thread to re-exec (or relaunch) the current process after a short delay."""

    resolved_command = _resolve_exec_command(command)

    if _command_has_reload_flag(resolved_command):
        logger.info("Detected uvicorn reload mode; triggering reload ping instead of execv")
        _trigger_reload_ping(max(0.2, delay_seconds / 2))
        return

    def _restart_target():
        try:
            logger.info("Restarting backend with command: %s", resolved_command)
            _time.sleep(delay_seconds)
            os.execv(resolved_command[0], resolved_command)
        except Exception as exc:
            logger.error("Backend restart via execv failed: %s", exc, exc_info=True)
            try:
                proc = subprocess.Popen(resolved_command, close_fds=os.name != "nt")
                logger.info(
                    "Spawned fallback backend process (pid=%s). Exiting current process to complete restart.",
                    getattr(proc, "pid", "<unknown>"),
                )
            except Exception as spawn_exc:
                logger.critical("Fallback backend restart spawn failed: %s", spawn_exc, exc_info=True)
            finally:
                os._exit(0)

    threading.Thread(target=_restart_target, daemon=True).start()


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
# Runtime context retrieval with graceful fallback: if production constraints fail (e.g. production
# env variable set without Docker), downgrade to development context so the server still starts.
try:
    RUNTIME_CONTEXT = env_mod.require_production_constraints()
except Exception as _runtime_err:
    logger.warning(
        "Runtime constraints enforcement failed (%s) – falling back to development context", _runtime_err
    )
    try:
        from backend.environment import (  # type: ignore
            RuntimeContext,
            RuntimeEnvironment,
        )
    except Exception:
        from environment import RuntimeContext, RuntimeEnvironment  # type: ignore
    RUNTIME_CONTEXT = RuntimeContext(
        environment=RuntimeEnvironment.DEVELOPMENT,
        is_docker=False,
        is_ci=False,
        source="fallback",
    )
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


STARTUP_DEBUG = os.environ.get("STARTUP_DEBUG", "0").strip().lower() in {"1", "true", "yes", "debug"}

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
    if STARTUP_DEBUG:
        logger.info("[LIFESPAN DEBUG] *** LIFESPAN STARTUP STARTING ***")
        logger.info("\n" + "=" * 70)
        logger.info("STUDENT MANAGEMENT SYSTEM - STARTUP")
        logger.info("=" * 70)
        logger.info(f"Version: {VERSION} - Production Ready")
        logger.info("Database: SQLite")
        logger.info("Framework: FastAPI")
        logger.info("Logging: initialized")
        logger.info("=" * 70)
    else:
        logger.info(
            "Startup SMS v%s (context=%s, debug=%s) – migrations deferred, admin bootstrap scheduled if configured",
            VERSION,
            getattr(RUNTIME_CONTEXT, "summary", lambda: "n/a")(),
            STARTUP_DEBUG,
        )

    # Record start time for uptime in health endpoint
    try:
        app.state.start_time = _time.time()
    except Exception:
        pass

    # Allow tests and special environments to disable heavy startup tasks
    disable_startup = os.environ.get("DISABLE_STARTUP_TASKS", "0").strip().lower() in {"1", "true", "yes"}

    try:
        # Schedule database migrations in background thread to avoid blocking / interfering with lifespan
        if not disable_startup:
            try:
                from backend.run_migrations import run_migrations
                def _migrate_bg():
                    try:
                        if STARTUP_DEBUG:
                            logger.info("[MIGRATIONS BG] Starting background migration check...")
                        ok = run_migrations(False)
                        if STARTUP_DEBUG:
                            if ok:
                                logger.info("[MIGRATIONS BG] Migrations up to date")
                            else:
                                logger.warning("[MIGRATIONS BG] Migration process reported failure")
                    except Exception as bg_err:
                        logger.exception("[MIGRATIONS BG] Migration thread error", exc_info=bg_err)
                threading.Thread(target=_migrate_bg, daemon=True, name="migrations-bg").start()
            except Exception as e:
                logger.exception("Deferred migration scheduling failed", exc_info=e)
            # Default admin bootstrap (non-blocking, safe failures)
            try:
                if getattr(settings, "DEFAULT_ADMIN_EMAIL", None) and getattr(settings, "DEFAULT_ADMIN_PASSWORD", None):
                    # Use direct session instead of dependency system inside lifespan
                    if db_session_factory is not None:
                        session = db_session_factory()
                        try:
                            # Adjusted to match keyword-only signature: ensure_default_admin_account(
                            #   *, settings, session_factory, logger=None)
                            ensure_default_admin_account(
                                settings=settings,
                                session_factory=db_session_factory,
                                logger=logger,
                            )
                            if STARTUP_DEBUG:
                                logger.info("[ADMIN BOOTSTRAP] Default admin ensure executed")
                        finally:
                            try:
                                session.close()
                            except Exception:
                                pass
                    else:
                        if STARTUP_DEBUG:
                            logger.warning("[ADMIN BOOTSTRAP] Session factory unavailable; skipping admin ensure")
                else:
                    if STARTUP_DEBUG:
                        logger.info("[ADMIN BOOTSTRAP] Skipped (no DEFAULT_ADMIN_EMAIL/PASSWORD configured)")
            except Exception as admin_boot_err:
                logger.warning(f"[ADMIN BOOTSTRAP] Error during ensure: {admin_boot_err}")
        else:
            if STARTUP_DEBUG:
                logger.info("DISABLE_STARTUP_TASKS set: not scheduling migrations thread")

        # Future phased tasks placeholder (admin bootstrap, auto-import, metrics warmup)
        # We keep this minimal for stability while gathering diagnostics.
        if STARTUP_DEBUG:
            logger.info("[LIFESPAN DEBUG] Minimal startup path reached - yielding application ready state (migrations deferred)")
        yield  # Application now ready; migrations continue in background if scheduled
    except Exception as lifespan_start_err:
        # Comprehensive diagnostics for any unexpected startup failure
        logger.critical(
            "[LIFESPAN CRITICAL] Unhandled exception during startup: %s", lifespan_start_err, exc_info=True
        )
        raise
    finally:
        # Shutdown phase (minimal)
        try:
            if STARTUP_DEBUG:
                logger.info("[LIFESPAN DEBUG] Minimal shutdown path executing")
        except Exception:
            pass


# Create the application instance with lifespan


app = create_app()
app.router.lifespan_context = lifespan
app.state.runtime_context = RUNTIME_CONTEXT
app.state.version = VERSION  # Ensure health endpoint always returns backend version
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# --------------------------------------------------------------------------
# Global RFC 7807-style error handling
# --------------------------------------------------------------------------
from fastapi.exceptions import RequestValidationError  # type: ignore
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR


def _problem_details(status_code: int, title: str, detail: object | None, request: Request, type_uri: str | None = None, errors: list | None = None) -> dict:
    return {
        "type": type_uri or "about:blank",
        "title": title,
        "status": status_code,
        # Preserve detail as provided (string, dict, list) for backward compatibility
        "detail": detail,
        "instance": str(getattr(request, "url", "")),
        "errors": errors,
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Preserve headers (e.g., WWW-Authenticate) where provided
    det = exc.detail
    try:
        # Attempt to coerce non-JSON-serializable details to string
        import json
        json.dumps(det)
    except Exception:
        det = str(det)

    body = _problem_details(
        status_code=exc.status_code,
        title="HTTP Exception",
        detail=det,
        request=request,
        type_uri=f"https://httpstatuses.com/{exc.status_code}",
    )
    return JSONResponse(status_code=exc.status_code, content=body, headers=getattr(exc, "headers", None) or {})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    raw_errs = exc.errors() if hasattr(exc, "errors") else None

    # Sanitize errors to ensure JSON-serializable payload (convert exceptions to strings)
    def _sanitize_error(e: dict) -> dict:
        e = dict(e)
        ctx = e.get("ctx")
        if isinstance(ctx, dict):
            err_obj = ctx.get("error")
            if isinstance(err_obj, BaseException):
                ctx = dict(ctx)
                ctx["error"] = str(err_obj)
                e["ctx"] = ctx
        return e

    errs = [_sanitize_error(e) for e in (raw_errs or [])]

    body = _problem_details(
        status_code=422,
        title="Validation Error",
        detail=errs,
        request=request,
        type_uri="https://example.net/problems/validation-error",
        errors=errs,
    )
    return JSONResponse(status_code=422, content=body)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log full stack trace once; response stays generic to avoid leaking internals
    logger.exception("Unhandled application error", exc_info=exc)
    body = _problem_details(
        status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        title="Internal Server Error",
        detail="An unexpected error occurred.",
        request=request,
        type_uri="https://example.net/problems/internal-server-error",
    )
    return JSONResponse(status_code=HTTP_500_INTERNAL_SERVER_ERROR, content=body)

# ============================================================================
# PROMETHEUS METRICS SETUP (Optional - enabled via environment variable)
# ============================================================================

# Setup Prometheus metrics if enabled
try:
    enable_metrics = os.environ.get("ENABLE_METRICS", "1").strip().lower() in {"1", "true", "yes"}
    if enable_metrics:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
        from starlette.responses import Response as MetricsResponse

        from backend.middleware.prometheus_metrics import setup_metrics

        # Setup metrics instrumentation (adds middleware and /metrics endpoint)
        setup_metrics(app, version=VERSION)

        logger.info("✅ Prometheus metrics enabled at /metrics endpoint")
    else:
        logger.info("Prometheus metrics disabled (set ENABLE_METRICS=1 to enable)")
except ImportError as e:
    logger.warning(f"Prometheus metrics not available (missing dependencies): {e}")
    logger.info("Install prometheus-client and prometheus-fastapi-instrumentator to enable metrics")
except Exception as e:
    logger.warning(f"Failed to setup Prometheus metrics: {e}")
    logger.info("Application will continue without metrics")

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

# Security headers middleware (simple, safe defaults)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    try:
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Lock down powerful features by default; adjust as needed per feature additions
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        )
    except Exception:
        # Never let header injection break a response
        pass
    return response

# Response compression
try:
    if getattr(settings, "ENABLE_GZIP", True):
        app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)
    else:
        logger.debug("GZip middleware disabled via settings")
except Exception as gzip_err:
    logger.warning(f"Failed to configure GZipMiddleware: {gzip_err}")

# Response caching (served from in-memory TimedLRU cache)
def _parse_csv_list(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        iterable = value
    else:
        iterable = str(value).split(",")
    return [str(part).strip() for part in iterable if str(part).strip()]


try:
    if getattr(settings, "ENABLE_RESPONSE_CACHE", False):
        if "ResponseCacheMiddleware" in globals() and ResponseCacheMiddleware is not None:
            include_headers = _parse_csv_list(getattr(settings, "RESPONSE_CACHE_INCLUDE_HEADERS", None))
            if not include_headers:
                include_headers = ["accept-language", "accept"]

            excluded_paths = []
            for path in _parse_csv_list(getattr(settings, "RESPONSE_CACHE_EXCLUDED_PATHS", None)):
                normalized = path if path.startswith("/") else f"/{path}"
                normalized = normalized.rstrip("/") or "/"
                excluded_paths.append(normalized)
            if not excluded_paths:
                excluded_paths = ["/control", "/health", "/health/live", "/health/ready"]

            include_prefixes = []
            for prefix in _parse_csv_list(getattr(settings, "RESPONSE_CACHE_INCLUDE_PREFIXES", None)):
                normalized_prefix = prefix if prefix.startswith("/") else f"/{prefix}"
                normalized_prefix = normalized_prefix.rstrip("/") or "/"
                include_prefixes.append(normalized_prefix)

            app.add_middleware(
                ResponseCacheMiddleware,
                ttl_seconds=getattr(settings, "RESPONSE_CACHE_TTL_SECONDS", 120),
                maxsize=getattr(settings, "RESPONSE_CACHE_MAXSIZE", 512),
                include_headers=include_headers,
                excluded_paths=excluded_paths,
                include_prefixes=include_prefixes,
                require_opt_in=getattr(settings, "RESPONSE_CACHE_REQUIRE_OPT_IN", False),
                opt_in_header=getattr(settings, "RESPONSE_CACHE_OPT_IN_HEADER", "x-cache-allow"),
            )
            logger.info(
                "Response cache enabled (ttl=%ss, maxsize=%s, headers=%s, prefixes=%s, opt_in=%s)",
                getattr(settings, "RESPONSE_CACHE_TTL_SECONDS", 120),
                getattr(settings, "RESPONSE_CACHE_MAXSIZE", 512),
                include_headers,
                include_prefixes or "<any>",
                getattr(settings, "RESPONSE_CACHE_REQUIRE_OPT_IN", False),
            )
        else:
            logger.debug("ResponseCacheMiddleware not available; skipping registration")
    else:
        logger.debug("Response cache disabled via settings")
except Exception as cache_err:
    logger.warning(f"Failed to configure ResponseCacheMiddleware: {cache_err}")

# CSRF protection middleware (configurable)
try:
    # During pytest-based unit tests, most test clients do not bootstrap a CSRF token
    # for state-changing requests. Those tests validate business logic rather than
    # CSRF itself. A dedicated CSRF test suite constructs its own FastAPI app and
    # explicitly calls install_csrf_protection(). To keep that contract intact and
    # avoid 403s across unrelated tests, skip global CSRF installation when running
    # under pytest. The standalone CSRF tests still enable and enforce CSRF on their
    # ephemeral app instance.
    in_pytest = bool(
        os.environ.get("PYTEST_CURRENT_TEST")
        or os.environ.get("PYTEST_RUNNING")
        or any("pytest" in (arg or "").lower() for arg in sys.argv)
    )
    if not in_pytest:
        install_csrf_protection(app)
    else:
        logger.info("CSRF protection skipped for global app under pytest; CSRF tests install it explicitly")
except Exception as csrf_err:
    logger.warning("Failed to install CSRF protection: %s", csrf_err)

# ============================================================================
# CONTROL PANEL API ENDPOINTS
# Moved to modular routers under backend.routers.control.* and aggregated via
# backend.routers.routers_control. This reduces the size of main.py and avoids
# duplicate route registrations.
# ============================================================================


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
    _try_add("backend.routers.routers_sessions", "Sessions")

    # Control router is mounted without the global /api/v1 prefix to keep
    # canonical paths at /control/api/* (unify prefixes and avoid double
    # nesting /api/v1/control/api). Include separately so other routers still
    # live under /api/v1.
    try:
        control_mod = importlib.import_module("backend.routers.routers_control")
        app.include_router(getattr(control_mod, "router"), tags=["Control"])  # no extra prefix
        registered.append("Control")
    except Exception as e:
        errors.append(("backend.routers.routers_control", str(e)))

    if registered:
        logger.info(f"Registered routers: {', '.join(registered)}")
    if errors:
        # Elevate visibility so operators can see exactly which routers failed
        logger.warning("Some routers failed to load. Details:")
        for mod, err in errors:
            logger.warning(f" - {mod}: {err}")


# Register routers
register_routers(app)

# Add /metrics endpoint after routers (instrumentator.expose() doesn't work reliably)
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

        logger.info(f"✅ /metrics endpoint registered (total routes: {len([r for r in app.routes if hasattr(r, 'path')])})")
    except Exception as e:
        logger.warning(f"Failed to register /metrics endpoint: {e}")

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


# NOTE: The legacy /power backend route serving an HTML monitoring dashboard
# has been removed in v1.8.3. The React SPA now owns the /power route (System
# Health + Control Panel). When SERVE_FRONTEND is enabled, the SPA 404 fallback
# will correctly serve index.html for /power.


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

        # Serve root-level static files (logo, background images, etc.)
        # Use a separate route for specific files to avoid conflicts
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

        # Paths that should never be intercepted by the SPA fallback
        EXCLUDE_PREFIXES = (
            "api/",
            "docs",
            "redoc",
            "openapi.json",
            "control",
            "health",
            "metrics",  # Prometheus metrics endpoint
            "favicon.ico",
            "favicon.svg",
            "assets/",
            "logo.png",
            "login-bg.png",
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
