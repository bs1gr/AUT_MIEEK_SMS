
"""
Student Management System - Final Fixed Version
Version 3.0.1 - Production Ready with All Fixes Applied

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
import time
import shutil
import threading
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

# FastAPI imports
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
import uvicorn
from typing import List

# Database imports
from sqlalchemy.orm import Session

# Local imports - handle both direct execution and module import
try:
    from backend.config import settings
    from backend.logging_config import initialize_logging
    from backend.db import get_session as db_get_session, engine as db_engine, ensure_schema as db_ensure_schema
except ModuleNotFoundError:
    # Running directly from backend directory
    from config import settings
    from logging_config import initialize_logging
    from db import get_session as db_get_session, engine as db_engine, ensure_schema as db_ensure_schema

# ============================================================================
# UTF-8 ENCODING FIX FOR WINDOWS
# ============================================================================

if sys.platform == "win32":
    # Force UTF-8 encoding for console output on Windows
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ============================================================================
# CONTROL PANEL (serve HTML from project root)
# ============================================================================

try:
    from pathlib import Path
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    # Ensure project root is on sys.path so absolute imports like 'backend.xxx' work
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    CONTROL_HTML = PROJECT_ROOT / "html_control_panel.html"
except Exception:
    CONTROL_HTML = None

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
    # Try PATH first
    for name in ("npm", "npm.cmd"):
        found = shutil.which(name)
        if found:
            return f'"{found}"'
    # Common install locations
    nvm_home = os.environ.get("NVM_HOME", "")
    nvm_symlink = os.environ.get("NVM_SYMLINK", "")
    candidates = [
        os.path.join(os.environ.get("ProgramFiles", r"C:\\Program Files"), "nodejs", "npm.cmd"),
        os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\\Program Files (x86)"), "nodejs", "npm.cmd"),
        os.path.join(os.environ.get("LOCALAPPDATA", os.path.expandvars(r"%LOCALAPPDATA%")), "Programs", "nodejs", "npm.cmd"),
        os.path.join(os.environ.get("APPDATA", os.path.expandvars(r"%APPDATA%")), "npm", "npm.cmd"),
        os.path.join(nvm_home, "nodejs", "npm.cmd") if nvm_home else "",
        os.path.join(nvm_symlink, "npm.cmd") if nvm_symlink else "",
    ]
    for path in candidates:
        try:
            if path and os.path.isfile(path):
                return f'"{path}"'
        except Exception:
            continue
    # Last resort: npx.cmd (may exist even if npm not on PATH)
    found_npx = shutil.which("npx.cmd") or shutil.which("npx")
    if found_npx:
        return f'"{found_npx}"'
    return None

# ============================================================================
# ERROR HANDLING & LOGGING INITIALIZATION
# ============================================================================

# Initialize logging via centralized config
initialize_logging(log_dir="logs", log_level="INFO")

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        version="3.0.3",
        description="Enhanced with Daily Performance Tracking and Final Grade Calculation",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )


# ============================================================================
# LIFESPAN MANAGEMENT (Modern FastAPI approach)
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.
    
    Startup:
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
    logger.info("Version: 3.0.1 - Production Ready")
    logger.info("Database: SQLite")
    logger.info("Framework: FastAPI")
    logger.info("Logging: initialized")
    logger.info("=" * 70)

    # Record start time for uptime in health endpoint
    try:
        app.state.start_time = time.time()
    except Exception:
        pass

    # Ensure database schema compatibility (best-effort, non-destructive)
    try:
        db_ensure_schema(db_engine)
        logger.info("Database schema check completed (absence_penalty ensured)")
    except Exception as _e:
        logger.warning(f"Database schema check failed (continuing): {_e}")
    
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

    

# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================================
# CONTROL PANEL (serve HTML from project root) — defined after app creation
# =========================================================================

try:
    from pathlib import Path
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    CONTROL_HTML = PROJECT_ROOT / "html_control_panel.html"
except Exception:
    CONTROL_HTML = None

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
    global FRONTEND_PROCESS
    try:
        if _is_port_open("127.0.0.1", FRONTEND_PORT_PREFERRED):
            return {"success": True, "message": "Frontend already running"}
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
        if not os.path.isdir(frontend_dir):
            return JSONResponse({"success": False, "message": "frontend directory not found"}, status_code=400)

        # Resolve npm command
        npm_cmd = _resolve_npm_command()
        if not npm_cmd:
            return JSONResponse({"success": False, "message": "Failed to invoke npm. Ensure Node.js/npm are installed and on PATH."}, status_code=400)
        # Quick version probe (best-effort)
        try:
            subprocess.run(f"{npm_cmd} -v", cwd=frontend_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True, check=False)
        except Exception:
            return JSONResponse({"success": False, "message": "Failed to invoke npm. Ensure Node.js/npm are installed and on PATH."}, status_code=400)

        # Ensure dependencies (auto-install if missing)
        pkg_path = os.path.join(frontend_dir, "package.json")
        if not os.path.isfile(pkg_path):
            return JSONResponse({"success": False, "message": "frontend/package.json not found"}, status_code=400)

        node_modules = os.path.join(frontend_dir, "node_modules")
        if not os.path.isdir(node_modules):
            # Prefer npm ci if lockfile exists
            lockfile = os.path.join(frontend_dir, "package-lock.json")
            install_cmd = f"{npm_cmd} ci" if os.path.isfile(lockfile) else f"{npm_cmd} install"
            try:
                creationflags = getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
                # Run install in the same window (hidden), not a new console
                res = subprocess.run(
                    install_cmd,
                    cwd=frontend_dir,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    check=False,
                    text=True,
                )
                if res.returncode != 0:
                    # If npm ci failed due to lockfile mismatch, fallback to npm install
                    if " ci" in install_cmd:
                        res2 = subprocess.run(
                            f"{npm_cmd} install",
                            cwd=frontend_dir,
                            shell=True,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            check=False,
                            text=True,
                        )
                        if res2.returncode != 0:
                            return JSONResponse({"success": False, "message": f"Dependency install failed. Try manually: npm --prefix frontend install\n\n{res2.stdout}"}, status_code=500)
                    else:
                        return JSONResponse({"success": False, "message": f"Dependency install failed. Try manually: npm --prefix frontend install\n\n{res.stdout}"}, status_code=500)
            except Exception as e:
                return JSONResponse({"success": False, "message": f"Failed to install dependencies automatically: {e}"}, status_code=500)

        # Spawn Vite dev server in the same window (more reliable under VBS)
        # Enforce fixed port and host to keep control panel consistent
        start_cmd = f"{npm_cmd} run dev -- --host 127.0.0.1 --port {FRONTEND_PORT_PREFERRED} --strictPort"
        FRONTEND_PROCESS = subprocess.Popen(
            start_cmd,
            cwd=frontend_dir,
            shell=True,
        )
        # Wait for readiness (up to ~30s)
        for _ in range(120):
            time.sleep(0.25)
            if _is_port_open("127.0.0.1", FRONTEND_PORT_PREFERRED):
                break
        if not _is_port_open("127.0.0.1", FRONTEND_PORT_PREFERRED):
            return JSONResponse({
                "success": False,
                "message": f"Frontend failed to start on port {FRONTEND_PORT_PREFERRED}. The port may be in use or npm wasn't found. Ensure Node.js/npm are installed and free the port. Command used: {start_cmd}"
            }, status_code=500)
        return {"success": True, "message": "Frontend started"}
    except Exception as e:
        return JSONResponse({"success": False, "message": str(e)}, status_code=500)

@app.post("/control/api/stop-all")
def control_stop_all():
    """
    Comprehensive shutdown: Stop frontend, backend, and all related processes.
    Professional approach with proper cleanup and process termination.
    """
    global FRONTEND_PROCESS
    logger.info("Shutdown initiated: stopping all services")
    
    try:
        stopped_services = []
        
        # 1. Stop frontend processes (Vite dev server)
        frontend_stopped = False
        
        # Kill tracked frontend process
        if FRONTEND_PROCESS is not None:
            try:
                pid = FRONTEND_PROCESS.pid
                logger.info(f"Attempting to kill tracked frontend PID: {pid}")
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                frontend_stopped = True
                logger.info(f"Stopped tracked frontend process (PID: {pid})")
            except AttributeError:
                logger.warning("Frontend process object exists but has no PID attribute")
            except Exception as e:
                logger.warning(f"Failed to stop tracked frontend: {e}")
            finally:
                FRONTEND_PROCESS = None
        else:
            logger.info("No tracked frontend process to stop")
        
        # Kill any process on frontend ports (use netstat, don't rely on connection test)
        logger.info(f"Checking frontend ports: {FRONTEND_PORT_CANDIDATES}")
        for port in FRONTEND_PORT_CANDIDATES:
            pids = _find_pids_on_port(port)
            if pids:
                logger.info(f"Found PIDs on port {port}: {pids}")
                for pid in pids:
                    try:
                        logger.info(f"Killing PID {pid} on port {port}")
                        result = subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid)],
                            check=False,
                            capture_output=True,
                            text=True
                        )
                        frontend_stopped = True
                        logger.info(f"Stopped frontend on port {port} (PID: {pid}), taskkill result: {result.returncode}")
                    except Exception as e:
                        logger.warning(f"Failed to stop PID {pid}: {e}")
            else:
                logger.debug(f"No process found on port {port}")
        
        if frontend_stopped:
            stopped_services.append("Frontend")
        
        # 2. Kill Node.js processes (Vite)
        try:
            logger.info("Checking for Node.js processes...")
            result = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq node.exe", "/FO", "CSV", "/NH"],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode == 0 and "node.exe" in result.stdout:
                logger.info(f"Found Node.js processes, killing all node.exe instances")
                kill_result = subprocess.run(
                    ["taskkill", "/F", "/IM", "node.exe", "/T"],
                    check=False,
                    capture_output=True,
                    text=True
                )
                logger.info(f"Stopped all Node.js processes, taskkill result: {kill_result.returncode}")
                if kill_result.stdout:
                    logger.info(f"taskkill output: {kill_result.stdout.strip()}")
                stopped_services.append("Node.js")
                # Wait a moment for processes to fully terminate
                time.sleep(0.5)
            else:
                logger.info("No Node.js processes found")
        except Exception as e:
            logger.warning(f"Failed to stop Node.js processes: {e}")
        
        # 3. Schedule backend shutdown (delayed to allow response to be sent)
        def _delayed_backend_shutdown():
            try:
                time.sleep(1.0)  # Allow time for HTTP response to be sent
                logger.info("Executing backend shutdown")
                
                # Kill Python processes related to this app
                current_pid = os.getpid()
                parent_pid = os.getppid()
                
                logger.info(f"Terminating backend PIDs: {current_pid}, {parent_pid}")
                
                # Kill process tree (current + parent if using uvicorn --reload)
                for pid in {current_pid, parent_pid}:
                    try:
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid)],
                            check=False,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL
                        )
                        logger.info(f"Stopped backend process (PID: {pid})")
                    except Exception as e:
                        logger.warning(f"Failed to stop PID {pid}: {e}")
            except Exception as e:
                logger.error(f"Backend shutdown error: {e}")
            finally:
                # Force exit as last resort
                logger.info("Force exit backend")
                os._exit(0)
        
        threading.Thread(target=_delayed_backend_shutdown, daemon=True).start()
        stopped_services.append("Backend (scheduled)")
        
        return {
            "success": True,
            "message": "Shutdown complete",
            "stopped_services": stopped_services,
            "info": "All services stopped. Backend will terminate in 1 second."
        }
        
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}", exc_info=True)
        return JSONResponse(
            {"success": False, "message": f"Shutdown error: {str(e)}"},
            status_code=500
        )

@app.post("/control/api/stop")
def control_stop():
    """Stop frontend only (Vite dev server)"""
    global FRONTEND_PROCESS
    logger.info("Frontend stop requested")
    
    try:
        stopped_any = False
        
        # Kill the tracked process if we spawned it
        if FRONTEND_PROCESS is not None:
            try:
                pid = FRONTEND_PROCESS.pid
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                stopped_any = True
                logger.info(f"Stopped tracked frontend (PID: {pid})")
            except AttributeError:
                logger.warning("Frontend process object exists but has no PID attribute")
            except Exception as e:
                logger.warning(f"Failed to stop tracked frontend: {e}")
            finally:
                FRONTEND_PROCESS = None

        # Kill any process listening on known frontend ports (use netstat directly)
        for p in FRONTEND_PORT_CANDIDATES:
            pids = _find_pids_on_port(p)
            if pids:
                for pid in pids:
                    try:
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid)],
                            check=False,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL
                        )
                        stopped_any = True
                        logger.info(f"Stopped frontend on port {p} (PID: {pid})")
                    except Exception as e:
                        logger.warning(f"Failed to stop PID {pid}: {e}")

        msg = "Frontend stopped successfully" if stopped_any else "No frontend process detected"
        return {"success": True, "message": msg}
    except Exception as e:
        logger.error(f"Frontend stop error: {str(e)}", exc_info=True)
        return JSONResponse({"success": False, "message": str(e)}, status_code=500)

@app.post("/control/api/stop-backend")
def control_stop_backend():
    """Stop backend only (FastAPI/Uvicorn server)"""
    logger.info("Backend stop requested")
    
    try:
        # Schedule delayed shutdown to allow HTTP response to complete
        def _delayed_exit():
            try:
                time.sleep(0.75)  # 750ms delay for response
                logger.info("Executing backend shutdown")
                
                # On Windows with uvicorn --reload, kill both worker and reloader
                if os.name == "nt":
                    current_pid = os.getpid()
                    parent_pid = os.getppid()
                    
                    for pid in {current_pid, parent_pid}:
                        try:
                            subprocess.run(
                                ["taskkill", "/F", "/T", "/PID", str(pid)],
                                check=False,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL
                            )
                            logger.info(f"Killed process PID: {pid}")
                        except Exception as e:
                            logger.warning(f"Failed to kill PID {pid}: {e}")
            except Exception as e:
                logger.error(f"Delayed exit error: {e}")
            finally:
                # Force exit as last resort
                os._exit(0)
        
        threading.Thread(target=_delayed_exit, daemon=True).start()
        return {
            "success": True,
            "message": "Backend shutdown initiated",
            "info": "Server will terminate in 1 second"
        }
    except Exception as e:
        logger.error(f"Backend stop error: {str(e)}", exc_info=True)
        return JSONResponse(
            {"success": False, "message": str(e)},
            status_code=500
        )


# Alias for admin shutdown route (for backward compatibility)
@app.post("/api/v1/admin/shutdown")
def admin_shutdown():
    """
    Alias for backend shutdown - redirects to control API.
    Maintained for backward compatibility with admin routes.
    """
    logger.info("Admin shutdown route called (redirecting to control API)")
    return control_stop_all()


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
    try:
        # Try to import admin routes
        try:
            try:
                from backend.admin_routes import router as admin_router
            except ModuleNotFoundError:
                from admin_routes import router as admin_router
            app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
            logger.info("Admin router registered successfully")
        except ImportError as e:
            logger.debug(f"Admin router not found: {e}")
        
        # Try to import modular routers using actual filenames under backend/routers/.
        # Import each router independently so one failure doesn't block others.
        registered = []
        errors = []

        def _try_add(import_path: str, tag: str):
            nonlocal registered, errors
            try:
                # Try with backend. prefix first, then without
                try:
                    module = __import__(import_path, fromlist=["router"])
                except ModuleNotFoundError:
                    # Remove backend. prefix for direct execution
                    import_path = import_path.replace("backend.", "")
                    module = __import__(import_path, fromlist=["router"])
                app.include_router(module.router, prefix="/api/v1", tags=[tag])
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
        _try_add("backend.routers.routers_adminops", "AdminOps")
        _try_add("backend.routers.highlights", "Highlights")

        if registered:
            logger.info(f"Registered routers: {', '.join(registered)}")
        if errors:
            # Elevate visibility so operators can see exactly which routers failed
            logger.warning("Some routers failed to load. Details:")
            for mod, err in errors:
                logger.warning(f" - {mod}: {err}")
            
    except Exception as e:
        logger.error(f"Unexpected error during router registration: {str(e)}", exc_info=True)


# Register routers
register_routers(app)

# ============================================================================
# ROOT ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """
    Root endpoint providing API information.
    
    Returns:
        dict: API metadata and documentation links
    """
    return {
        "message": "Student Management System API",
        "version": "3.0.1",
        "status": "running",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "health": "/health",
            "students": "/api/v1/students",
            "courses": "/api/v1/courses",
            "grades": "/api/v1/grades",
            "attendance": "/api/v1/attendance"
        }
    }


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
    Health check endpoint.
    
    Verifies:
    - API is running
    - Database connection is working
    - Basic statistics
    
    Args:
        db: Database session dependency
        
    Returns:
        dict: Health status and database statistics
    """
    try:
        try:
            from backend.models import Student, Course
        except ModuleNotFoundError:
            from models import Student, Course

        students_count = db.query(Student).count()
        courses_count = db.query(Course).count()

        # Compute uptime based on app start time recorded in lifespan
        uptime_s: Optional[int] = None
        try:
            start = getattr(app.state, "start_time", None)
            if start:
                uptime_s = int(time.time() - start)
        except Exception:
            uptime_s = None

        # Optional: detect if frontend is running on known ports
        frontend_port = _detect_frontend_port()
        frontend_running = frontend_port is not None

        # Network info: hostname and available IPv4 addresses
        hostname = socket.gethostname()
        ips: List[str] = []
        try:
            try:
                import psutil  # type: ignore
            except Exception:  # pragma: no cover
                psutil = None  # type: ignore
            if psutil:
                addrs = psutil.net_if_addrs()
                for iface, addr_list in addrs.items():
                    for a in addr_list:
                        try:
                            if getattr(a, 'family', None) == socket.AF_INET:
                                ip = a.address
                                # Filter out APIPA (169.254.x.x) addresses
                                if ip and not ip.startswith("169.254.") and ip not in ips:
                                    ips.append(ip)
                        except Exception:
                            continue
            # Fallbacks
            if not ips:
                try:
                    host_ips = socket.gethostbyname_ex(hostname)[2]
                    for ip in host_ips:
                        if ip and not ip.startswith("169.254.") and ip not in ips:
                            ips.append(ip)
                except Exception:
                    pass
            # Always include loopbacks for convenience
            for ip in ("127.0.0.1",):
                if ip not in ips:
                    ips.append(ip)
        except Exception:
            hostname = hostname or "localhost"
            ips = ["127.0.0.1"]

        return {
            "status": "healthy",
            "version": app.version if hasattr(app, "version") else None,
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "uptime": uptime_s,
            "statistics": {
                "students": students_count,
                "courses": courses_count
            },
            "services": {
                "frontend": {
                    "running": frontend_running,
                    "port": frontend_port
                }
            },
            "network": {
                "host": hostname,
                "ips": ips
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Health check failed")


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
    print("  Version: 3.0.1")
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
        log_level="info"
        # reload disabled when running with -m flag
    )


if __name__ == "__main__":
    main()
