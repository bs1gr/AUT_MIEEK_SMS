
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
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import uvicorn
from typing import List

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

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
# CONTROL PANEL & SPA CONFIGURATION (project root paths)
# ============================================================================

try:
    from pathlib import Path
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
# RATE LIMITING CONFIGURATION
# ============================================================================

# Import centralized rate limiter
try:
    from backend.rate_limiting import limiter
except ModuleNotFoundError:
    from rate_limiting import limiter

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
    logger.info("Version: 3.0.3 - Production Ready")
    logger.info("Database: SQLite")
    logger.info("Framework: FastAPI")
    logger.info("Logging: initialized")
    logger.info("=" * 70)

    # Record start time for uptime in health endpoint
    try:
        app.state.start_time = time.time()
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
        logger.error(f"Migration runner error: {str(e)}")
        logger.warning("Continuing without migration check...")

    # Legacy schema compatibility check (kept for backward compatibility during transition)
    try:
        db_ensure_schema(db_engine)
        logger.info("Legacy schema check completed")
    except Exception as _e:
        logger.warning(f"Legacy schema check failed (continuing): {_e}")
    
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

# Attach rate limiter to app state
app.state.limiter = limiter

# Register rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
            return {
                "success": True,
                "message": "Frontend already running",
                "port": FRONTEND_PORT_PREFERRED
            }
        
        # 2. Validate frontend directory structure
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
        if not os.path.isdir(frontend_dir):
            logger.error("Frontend directory not found")
            return JSONResponse(
                {
                    "success": False,
                    "message": "Frontend directory not found",
                    "path": str(frontend_dir)
                },
                status_code=400
            )

        # 3. Resolve and validate npm command
        npm_cmd = _resolve_npm_command()
        if not npm_cmd:
            logger.error("npm command not found - Node.js may not be installed")
            return JSONResponse(
                {
                    "success": False,
                    "message": "npm not found. Please install Node.js (https://nodejs.org/)"
                },
                status_code=400
            )
        
        # Validate npm is executable
        try:
            version_check = subprocess.run(
                f"{npm_cmd} -v",
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=True,
                check=False,
                timeout=5,
                text=True
            )
            if version_check.returncode != 0:
                raise subprocess.CalledProcessError(version_check.returncode, npm_cmd)
            logger.info(f"npm version: {version_check.stdout.strip()}")
        except Exception as e:
            logger.error(f"npm validation failed: {e}")
            return JSONResponse(
                {
                    "success": False,
                    "message": "npm validation failed. Ensure Node.js/npm are properly installed."
                },
                status_code=400
            )

        # 4. Validate package.json and ensure dependencies
        pkg_path = os.path.join(frontend_dir, "package.json")
        if not os.path.isfile(pkg_path):
            logger.error("package.json not found in frontend directory")
            return JSONResponse(
                {
                    "success": False,
                    "message": "package.json not found",
                    "path": pkg_path
                },
                status_code=400
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
                install_result = subprocess.run(
                    install_cmd,
                    cwd=frontend_dir,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    check=False,
                    text=True,
                    timeout=300  # 5 minute timeout for npm install
                )
                
                if install_result.returncode != 0:
                    # If npm ci failed, try npm install as fallback
                    if "ci" in install_cmd:
                        logger.warning("npm ci failed - falling back to npm install")
                        fallback_result = subprocess.run(
                            f"{npm_cmd} install",
                            cwd=frontend_dir,
                            shell=True,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            check=False,
                            text=True,
                            timeout=300
                        )
                        if fallback_result.returncode != 0:
                            logger.error(f"npm install failed: {fallback_result.stdout}")
                            return JSONResponse(
                                {
                                    "success": False,
                                    "message": "Dependency installation failed. Try manually: npm install",
                                    "details": fallback_result.stdout
                                },
                                status_code=500
                            )
                    else:
                        logger.error(f"npm install failed: {install_result.stdout}")
                        return JSONResponse(
                            {
                                "success": False,
                                "message": "Dependency installation failed",
                                "details": install_result.stdout
                            },
                            status_code=500
                        )
                
                logger.info("Dependencies installed successfully")
                
            except subprocess.TimeoutExpired:
                logger.error("npm install timed out after 5 minutes")
                return JSONResponse(
                    {
                        "success": False,
                        "message": "Dependency installation timed out. Try manually: npm install"
                    },
                    status_code=500
                )
            except Exception as e:
                logger.error(f"Failed to install dependencies: {e}")
                return JSONResponse(
                    {
                        "success": False,
                        "message": f"Failed to install dependencies: {str(e)}"
                    },
                    status_code=500
                )

        # 5. Start Vite dev server
        logger.info(f"Starting Vite dev server on port {FRONTEND_PORT_PREFERRED}...")
        start_cmd = f"{npm_cmd} run dev -- --host 127.0.0.1 --port {FRONTEND_PORT_PREFERRED} --strictPort"
        
        try:
            FRONTEND_PROCESS = subprocess.Popen(
                start_cmd,
                cwd=frontend_dir,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            logger.info(f"Vite process started with PID: {FRONTEND_PROCESS.pid}")
        except Exception as e:
            logger.error(f"Failed to start Vite process: {e}")
            return JSONResponse(
                {
                    "success": False,
                    "message": f"Failed to start frontend process: {str(e)}"
                },
                status_code=500
            )
        
        # 6. Wait for server readiness (up to 30 seconds)
        logger.info("Waiting for frontend server to be ready...")
        max_attempts = 120  # 30 seconds (120 * 0.25s)
        for attempt in range(max_attempts):
            time.sleep(0.25)
            
            # Check if process is still running
            if FRONTEND_PROCESS.poll() is not None:
                logger.error("Frontend process terminated unexpectedly")
                return JSONResponse(
                    {
                        "success": False,
                        "message": "Frontend process terminated unexpectedly",
                        "command": start_cmd
                    },
                    status_code=500
                )
            
            # Check if server is responding
            if _is_port_open("127.0.0.1", FRONTEND_PORT_PREFERRED):
                logger.info(f"Frontend server ready on port {FRONTEND_PORT_PREFERRED}")
                return {
                    "success": True,
                    "message": "Frontend started successfully",
                    "port": FRONTEND_PORT_PREFERRED,
                    "url": f"http://localhost:{FRONTEND_PORT_PREFERRED}",
                    "pid": FRONTEND_PROCESS.pid
                }
        
        # Timeout - server didn't start
        logger.error(f"Frontend server failed to start within 30 seconds")
        
        # Kill the process since it's not responding
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(FRONTEND_PROCESS.pid)],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except Exception:
            pass
        
        return JSONResponse(
            {
                "success": False,
                "message": f"Frontend failed to start on port {FRONTEND_PORT_PREFERRED} within 30 seconds",
                "hint": "Port may be in use. Check with: netstat -ano | findstr :{FRONTEND_PORT_PREFERRED}",
                "command": start_cmd
            },
            status_code=500
        )
        
    except Exception as e:
        logger.error(f"Unexpected error starting frontend: {e}", exc_info=True)
        return JSONResponse(
            {
                "success": False,
                "message": f"Unexpected error: {str(e)}"
            },
            status_code=500
        )

@app.post("/control/api/stop-all")
def control_stop_all():
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
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=5
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
                errors.append(f"Tracked frontend: {str(e)}")
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
                            timeout=5
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
                        errors.append(f"PID {pid}: {str(e)}")
        
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
                timeout=5
            )
            
            if check_result.returncode == 0 and "node.exe" in check_result.stdout:
                logger.info("Node.js processes detected - terminating all node.exe instances")
                
                kill_result = subprocess.run(
                    ["taskkill", "/F", "/IM", "node.exe", "/T"],
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if kill_result.returncode == 0:
                    stopped_services.append("Node.js")
                    logger.info("✓ All Node.js processes terminated")
                    
                    # Brief wait for process cleanup
                    time.sleep(0.5)
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
            errors.append(f"Node.js: {str(e)}")
        
        # ═══ PHASE 3: Schedule Backend Shutdown ═══
        logger.info("Phase 3: Scheduling backend shutdown...")
        
        def _delayed_backend_shutdown():
            """Delayed shutdown to allow HTTP response to complete"""
            try:
                time.sleep(1.0)  # 1 second delay for response transmission
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
                            timeout=3
                        )
                        logger.info(f"✓ Terminated PID {pid}")
                    except Exception as e:
                        logger.warning(f"Failed to kill PID {pid}: {e}")
                        
            except Exception as e:
                logger.error(f"Backend shutdown error: {e}", exc_info=True)
            finally:
                # Force exit as final fallback
                logger.info("=== Force Exit ===")
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
            "timestamp": datetime.now().isoformat()
        }
        
        if errors:
            response_data["warnings"] = errors
            logger.warning(f"Shutdown completed with {len(errors)} warning(s)")
        
        return response_data
        
    except Exception as e:
        logger.error(f"Critical shutdown error: {str(e)}", exc_info=True)
        return JSONResponse(
            {
                "success": False,
                "message": f"Shutdown error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            },
            status_code=500
        )

@app.post("/control/api/stop")
def control_stop():
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
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=5
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
                errors.append(f"Tracked process: {str(e)}")
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
                            timeout=5
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
                        errors.append(f"Port {port} PID {pid}: {str(e)}")

        # Build response
        if stopped_any:
            message = f"Frontend stopped successfully ({len(stopped_pids)} process(es), {ports_cleared} port(s) cleared)"
            logger.info(f"✓ {message}")
        else:
            message = "No frontend processes detected"
            logger.info(message)
        
        response_data = {
            "success": True,
            "message": message,
            "stopped_pids": stopped_pids,
            "ports_cleared": ports_cleared,
            "timestamp": datetime.now().isoformat()
        }
        
        if errors:
            response_data["warnings"] = errors
            logger.warning(f"Stopped with {len(errors)} warning(s)")
        
        return response_data
        
    except Exception as e:
        logger.error(f"Frontend stop error: {str(e)}", exc_info=True)
        return JSONResponse(
            {
                "success": False,
                "message": f"Frontend stop error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            },
            status_code=500
        )

@app.post("/control/api/stop-backend")
def control_stop_backend():
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
    
    try:
        current_pid = os.getpid()
        parent_pid = os.getppid()
        
        logger.info(f"Backend PIDs - Current: {current_pid}, Parent: {parent_pid}")
        
        def _delayed_exit():
            """Delayed shutdown thread to allow HTTP response transmission"""
            try:
                time.sleep(0.75)  # 750ms delay allows response to be sent
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
                                timeout=3
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
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Backend stop error: {str(e)}", exc_info=True)
        return JSONResponse(
            {
                "success": False,
                "message": f"Backend stop error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            },
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
            
    except Exception as e:
        logger.error(f"Unexpected error during router registration: {str(e)}", exc_info=True)


# Register routers
register_routers(app)

# ============================================================================
# ROOT ENDPOINTS
# ============================================================================

def _api_metadata() -> dict:
    return {
        "message": "Student Management System API",
        "version": "3.0.3",
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

        # Detect environment (Docker vs Native)
        def detect_environment():
            """Detect if running in Docker container"""
            # Check for /.dockerenv file
            if os.path.exists('/.dockerenv'):
                return "docker"
            # Check cgroup for docker/containerd
            try:
                with open('/proc/1/cgroup', 'r') as f:
                    if 'docker' in f.read() or 'containerd' in f.read():
                        return "docker"
            except:
                pass
            # Check for DOCKER_CONTAINER env var (can be set in Dockerfile)
            if os.getenv('DOCKER_CONTAINER') == 'true':
                return "docker"
            return "native"
        
        environment_mode = detect_environment()

        return {
            "status": "healthy",
            "version": app.version if hasattr(app, "version") else None,
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "uptime": uptime_s,
            "environment": environment_mode,
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
    print("  Version: 3.0.3")
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
