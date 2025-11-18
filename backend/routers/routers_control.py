"""
Control Panel API Router
Provides comprehensive system control, diagnostics, and troubleshooting APIs
Replaces functionality from scattered PowerShell/batch scripts
"""

import os
import sys
import subprocess
import socket
import shutil
import psutil
import logging
import threading
import shlex
from pathlib import Path
from typing import Optional, List, Dict, Any
import json
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException
from fastapi import UploadFile, File
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from importlib import metadata as importlib_metadata  # Python 3.8+

# Rate limiting for new endpoints (honors project guidance)
from backend.import_resolver import import_names
from backend.errors import ErrorCode, http_error
from backend.config import get_settings

_limiter, _RATE_LIMIT_HEAVY, _RATE_LIMIT_READ = import_names(
    "rate_limiting", "limiter", "RATE_LIMIT_HEAVY", "RATE_LIMIT_READ"
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/control/api", tags=["Control Panel"])

# ============================================================================
# Constants
# ============================================================================

# Timeout values (in seconds)
TIMEOUT_PORT_CHECK = 0.5
TIMEOUT_COMMAND_SHORT = 5  # For quick commands like --version
TIMEOUT_COMMAND_MEDIUM = 10  # For medium operations
TIMEOUT_DOCKER_STOP = 120  # 2 minutes for docker stop
TIMEOUT_DOCKER_DOWN = 180  # 3 minutes for docker down
TIMEOUT_NPM_INSTALL = 300  # 5 minutes for npm install
TIMEOUT_PIP_INSTALL = 300  # 5 minutes for pip install
TIMEOUT_DOCKER_BUILD = 600  # 10 minutes for docker build

# Port ranges
BACKEND_PORTS = [8000, 8001, 8002]
FRONTEND_PORTS = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180]
COMMON_DEV_PORTS = [8000, 8080, 5173]

# Monitoring service ports
GRAFANA_PORT = 3000
PROMETHEUS_PORT = 9090
LOKI_PORT = 3100

# ============================================================================
# Pydantic Models
# ============================================================================


class SystemStatus(BaseModel):
    """System status response"""

    backend: bool = Field(description="Backend running status")
    frontend: bool = Field(description="Frontend running status")
    frontend_port: Optional[int] = Field(None, description="Frontend port if running")
    docker: bool = Field(False, description="Docker Desktop running")
    database: bool = Field(False, description="Database accessible")
    python_version: str = Field(description="Python version")
    node_version: Optional[str] = Field(None, description="Node.js version if installed")
    timestamp: str = Field(description="Status check timestamp")
    process_start_time: Optional[str] = Field(None, description="Backend process start time (ISO format)")


class DiagnosticResult(BaseModel):
    """Diagnostic check result"""

    category: str = Field(description="Diagnostic category")
    status: str = Field(description="ok, warning, or error")
    message: str = Field(description="Diagnostic message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")


class PortInfo(BaseModel):
    """Port usage information"""

    port: int
    in_use: bool
    process_name: Optional[str] = None
    process_id: Optional[int] = None


class EnvironmentInfo(BaseModel):
    """Environment information"""

    python_path: str
    python_version: str
    node_path: Optional[str] = None
    node_version: Optional[str] = None
    npm_version: Optional[str] = None
    docker_version: Optional[str] = None
    platform: str
    cwd: str
    venv_active: bool
    # Application info
    app_version: Optional[str] = None
    api_version: Optional[str] = None
    frontend_version: Optional[str] = None
    git_revision: Optional[str] = None
    environment_mode: Optional[str] = None
    python_packages: Optional[Dict[str, str]] = None


class OperationResult(BaseModel):
    """Generic operation result"""

    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# ============================================================================
# Helper Functions
def _in_docker_container() -> bool:
    """
    Detect if running inside a Docker container.

    Uses platform-specific checks to avoid errors on non-Linux systems.
    """
    # Check for .dockerenv file (works on all platforms)
    if os.path.exists("/.dockerenv"):
        return True

    # Check cgroup (Linux only)
    if sys.platform != "win32":
        try:
            with open("/proc/1/cgroup", "rt") as f:
                if "docker" in f.read():
                    return True
        except Exception:
            pass

    return False


# ============================================================================


def _is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    """
    Check if a TCP port is open and accepting connections.

    Args:
        port: Port number to check
        host: Host address to check (default: 127.0.0.1)

    Returns:
        True if port is open, False otherwise
    """
    try:
        with socket.create_connection((host, port), timeout=TIMEOUT_PORT_CHECK):
            return True
    except OSError:
        return False


def _get_process_on_port(port: int) -> Optional[Dict[str, Any]]:
    """Get process information for a port"""
    try:
        for conn in psutil.net_connections(kind="inet"):
            if conn.laddr.port == port and conn.status == "LISTEN":  # type: ignore[attr-defined]
                try:
                    proc = psutil.Process(conn.pid)
                    return {
                        "pid": conn.pid,
                        "name": proc.name(),
                        "exe": proc.exe(),
                        "cmdline": " ".join(proc.cmdline()),
                    }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    return {"pid": conn.pid, "name": "Unknown", "exe": None, "cmdline": None}
    except Exception as e:
        logger.warning(f"Error checking port {port}: {e}")
    return None


def _run_command(cmd: List[str], timeout: int = 30) -> tuple[bool, str, str]:
    """Run a command and return success, stdout, stderr"""
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="replace"
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", f"Command timed out after {timeout}s"
    except Exception as e:
        return False, "", str(e)


def _check_docker_running() -> bool:
    """
    Check if Docker daemon is running and accessible.

    Returns:
        True if Docker is running, False otherwise
    """
    success, _, _ = _run_command(["docker", "info"], timeout=TIMEOUT_COMMAND_SHORT)
    return success


def _docker_compose(cmd: List[str], cwd: Optional[Path] = None, timeout: int = 60) -> tuple[bool, str, str]:
    """
    Run a docker compose command with robust error handling.

    Args:
        cmd: Docker compose command arguments (e.g., ['up', '-d'])
        cwd: Working directory for the command
        timeout: Command timeout in seconds (default: 60)

    Returns:
        Tuple of (success, stdout, stderr)
    """
    args = ["docker", "compose"] + cmd
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(cwd) if cwd else None,
            encoding="utf-8",
            errors="replace",
        )
        success = result.returncode == 0

        # Improved error context for debugging
        if not success and result.stderr:
            logger.warning(f"Docker compose {' '.join(cmd)} failed: {result.stderr[:200]}")

        return success, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        error_msg = f"docker compose {' '.join(cmd)} timed out after {timeout}s"
        logger.error(error_msg)
        return False, "", error_msg
    except FileNotFoundError:
        error_msg = "Docker or docker compose not found in PATH"
        logger.error(error_msg)
        return False, "", error_msg
    except Exception as e:
        logger.error(f"Unexpected error running docker compose: {e}")
        return False, "", str(e)


def _docker_volume_exists(name: str) -> bool:
    ok, out, _ = _run_command(["docker", "volume", "ls", "--format", "{{.Name}}"])
    if not ok:
        return False
    return name in [line.strip() for line in out.splitlines()]


def _create_unique_volume(base_name: str) -> str:
    """Create a unique docker volume name based on base_name and date, return the name."""
    date_suffix = datetime.now().strftime("%Y%m%d")
    candidate = f"{base_name}_v{date_suffix}"
    idx = 1
    while _docker_volume_exists(candidate):
        idx += 1
        candidate = f"{base_name}_v{date_suffix}_{idx}"
    ok, _, err = _run_command(["docker", "volume", "create", candidate])
    if not ok:
        raise RuntimeError(f"Failed to create volume {candidate}: {err}")
    return candidate


def _check_node_installed() -> tuple[bool, Optional[str]]:
    """Check if Node.js is installed and get version"""
    success, stdout, _ = _run_command(["node", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
    if success:
        return True, stdout.strip()
    return False, None


def _check_npm_installed() -> tuple[bool, Optional[str]]:
    """Check if npm is installed and get version"""
    success, stdout, _ = _run_command(["npm", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
    if success:
        return True, stdout.strip()
    return False, None


def _check_docker_version() -> Optional[str]:
    """Get Docker version"""
    success, stdout, _ = _run_command(["docker", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
    if success:
        return stdout.strip()
    return None


def _get_frontend_port() -> Optional[int]:
    """Detect which port the frontend is running on"""
    for port in range(5173, 5181):
        if _is_port_open(port):
            return port
    return None


def _infer_restart_command() -> Optional[List[str]]:
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


def _spawn_restart_thread(command: List[str], delay_seconds: float = 0.75) -> None:
    """Spawn a background thread to re-exec the current process after a short delay."""
    import time as _time
    
    def _restart_target():
        try:
            logger.info("Restarting backend with command: %s", command)
            _time.sleep(delay_seconds)
            os.execv(command[0], command)
        except Exception as exc:
            logger.error("Backend restart failed; forcing exit: %s", exc, exc_info=True)
            os._exit(0)

    threading.Thread(target=_restart_target, daemon=True).start()


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/status", response_model=SystemStatus)
async def get_system_status(request: Request):
    """
    Get comprehensive system status
    Checks backend, frontend, Docker, database, and environment
    """
    frontend_port = _get_frontend_port()
    docker_running = _check_docker_running()

    # Check database (simple check - see if we can import and connect)
    db_ok = False
    try:
        from backend.db import engine

        with engine.connect():
            db_ok = True
    except Exception:
        pass

    node_installed, node_version = _check_node_installed()

    # Get process start time from app state if available
    process_start_time = None
    try:
        process_start = getattr(request.app.state, "start_time", None)
        if process_start:
            from datetime import datetime, timezone

            process_start_time = datetime.fromtimestamp(process_start, tz=timezone.utc).isoformat()
    except Exception:
        pass

    return SystemStatus(
        backend=True,  # If this endpoint responds, backend is running
        frontend=frontend_port is not None,
        frontend_port=frontend_port,
        docker=docker_running,
        database=db_ok,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        node_version=node_version,
        timestamp=datetime.now().isoformat(),
        process_start_time=process_start_time,
    )


@router.get("/diagnostics", response_model=List[DiagnosticResult])
async def run_diagnostics():
    """
    Run comprehensive system diagnostics
    Docker-aware: Only shows relevant checks based on execution mode
    """
    results = []
    in_docker = _in_docker_container()

    # Check Python environment (always relevant - shows what's running)
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    if sys.version_info >= (3, 10):
        results.append(
            DiagnosticResult(
                category="Python Runtime",
                status="ok",
                message=f"Python {python_version} ({'container' if in_docker else 'host'})",
                details={"path": sys.executable, "version": sys.version, "mode": "docker" if in_docker else "native"},
            )
        )
    else:
        results.append(
            DiagnosticResult(
                category="Python Runtime",
                status="warning",
                message=f"Python {python_version} - recommend 3.10+",
                details={"path": sys.executable},
            )
        )

    # Docker mode: Skip native tooling checks (Node.js, npm, node_modules)
    # These are baked into the Docker images and not relevant for diagnostics
    if not in_docker:
        # Check Node.js (only in native mode)
        node_ok, node_version = _check_node_installed()
        if node_ok and node_version:
            major_version = int(node_version.strip("v").split(".")[0]) if node_version.startswith("v") else 0
            if major_version >= 18:
                results.append(
                    DiagnosticResult(
                        category="Node.js",
                        status="ok",
                        message=f"Node.js {node_version} installed",
                        details={"version": node_version},
                    )
                )
            else:
                results.append(
                    DiagnosticResult(
                        category="Node.js",
                        status="warning",
                        message=f"Node.js {node_version} - recommend 18+",
                        details={"version": node_version},
                    )
                )
        else:
            results.append(
                DiagnosticResult(
                    category="Node.js", status="error", message="Node.js not found or not in PATH", details={}
                )
            )

        # Check npm (only in native mode)
        npm_ok, npm_version = _check_npm_installed()
        if npm_ok:
            results.append(
                DiagnosticResult(
                    category="npm",
                    status="ok",
                    message=f"npm {npm_version} installed",
                    details={"version": npm_version},
                )
            )
        else:
            results.append(DiagnosticResult(category="npm", status="error", message="npm not found", details={}))

        # Check Docker availability (only relevant in native mode for switching to Docker)
        if _check_docker_running():
            docker_version = _check_docker_version()
            results.append(
                DiagnosticResult(
                    category="Docker",
                    status="ok",
                    message="Docker Desktop is running",
                    details={"version": docker_version},
                )
            )
        else:
            results.append(
                DiagnosticResult(
                    category="Docker",
                    status="warning",
                    message="Docker not running (only needed for containerized deployment)",
                    details={},
                )
            )

    # Check database file (always relevant)
    try:
        from backend.config import settings

        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            size = os.path.getsize(db_path)

            # Try to get schema version from database
            schema_version = "Unknown"
            try:
                from sqlalchemy import create_engine, text

                engine = create_engine(settings.DATABASE_URL)
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
                    row = result.fetchone()
                    if row:
                        schema_version = row[0]
            except Exception:
                pass

            results.append(
                DiagnosticResult(
                    category="Database",
                    status="ok",
                    message=f"Database operational ({size // 1024} KB)",
                    details={"path": db_path, "size_bytes": size, "sms_schema_version": schema_version},
                )
            )
        else:
            results.append(
                DiagnosticResult(
                    category="Database",
                    status="warning",
                    message="Database file not found (will be created on first run)",
                    details={"path": db_path},
                )
            )
    except Exception as e:
        results.append(
            DiagnosticResult(category="Database", status="error", message=f"Database check failed: {e!s}", details={})
        )

    # Check frontend dependencies (only in native mode where they matter)
    if not in_docker:
        project_root = Path(__file__).parent.parent.parent
        frontend_dir = project_root / "frontend"
        node_modules = frontend_dir / "node_modules"
        package_json = frontend_dir / "package.json"

        if package_json.exists():
            results.append(
                DiagnosticResult(
                    category="Frontend", status="ok", message="package.json found", details={"path": str(package_json)}
                )
            )

            if node_modules.exists():
                results.append(
                    DiagnosticResult(
                        category="Frontend",
                        status="ok",
                        message="node_modules directory exists",
                        details={"path": str(node_modules)},
                    )
                )
            else:
                results.append(
                    DiagnosticResult(
                        category="Frontend",
                        status="warning",
                        message="node_modules not found - run 'npm install'",
                        details={"path": str(frontend_dir)},
                    )
                )
        else:
            results.append(
                DiagnosticResult(
                    category="Frontend",
                    status="error",
                    message="package.json not found",
                    details={"expected": str(package_json)},
                )
            )

        # Check backend venv (only in native mode)
        venv_dir = project_root / "backend" / "venv"
        if venv_dir.exists():
            results.append(
                DiagnosticResult(
                    category="Backend",
                    status="ok",
                    message="Python virtual environment exists",
                    details={"path": str(venv_dir)},
                )
            )
        else:
            results.append(
                DiagnosticResult(
                    category="Backend",
                    status="warning",
                    message="Virtual environment not found at backend/venv",
                    details={},
                )
            )

    return results


@router.get("/ports", response_model=List[PortInfo])
async def check_ports():
    """
    Check port usage for common application ports
    Similar to DEBUG_PORTS.ps1
    """
    ports_to_check = BACKEND_PORTS + FRONTEND_PORTS
    results = []

    for port in ports_to_check:
        in_use = _is_port_open(port)
        proc_info = _get_process_on_port(port) if in_use else None

        results.append(
            PortInfo(
                port=port,
                in_use=in_use,
                process_name=proc_info.get("name") if proc_info else None,
                process_id=proc_info.get("pid") if proc_info else None,
            )
        )

    return results


@router.get("/environment", response_model=EnvironmentInfo)
async def get_environment_info(include_packages: bool = False):
    """Get detailed environment information"""
    node_ok, node_version = _check_node_installed()
    npm_ok, npm_version = _check_npm_installed()
    docker_version = _check_docker_version()

    # Check if we're in a virtual environment
    venv_active = hasattr(sys, "real_prefix") or (hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix)

    # Find node path
    node_path = None
    if node_ok:
        success, stdout, _ = _run_command(["where" if sys.platform == "win32" else "which", "node"])
        if success:
            node_path = stdout.strip().split("\n")[0]

    # Gather application info
    project_root = Path(__file__).parent.parent.parent

    # App version from VERSION file
    app_version: Optional[str] = None
    try:
        ver_path = project_root / "VERSION"
        if ver_path.exists():
            app_version = ver_path.read_text(encoding="utf-8").strip()
    except Exception:
        app_version = None

    # API version from FastAPI app factory (best effort)
    api_version: Optional[str] = None
    try:
        try:
            from backend.import_resolver import import_names

            (create_app,) = import_names("main", "create_app")
            api_version = getattr(create_app(), "version", None)
        except Exception:
            api_version = None
    except Exception:
        api_version = None

    # Frontend version from package.json
    frontend_version: Optional[str] = None
    try:
        pkg_path = project_root / "frontend" / "package.json"
        if pkg_path.exists():
            data = json.loads(pkg_path.read_text(encoding="utf-8"))
            fv = data.get("version")
            if isinstance(fv, str):
                frontend_version = fv
    except Exception:
        frontend_version = None

    # Git revision/tag (best effort)
    git_revision: Optional[str] = None
    try:
        ok, out, _ = _run_command(["git", "describe", "--tags", "--always", "--dirty"], timeout=TIMEOUT_COMMAND_SHORT)
        if ok:
            git_revision = out.strip()
        else:
            ok2, out2, _ = _run_command(["git", "rev-parse", "--short", "HEAD"], timeout=TIMEOUT_COMMAND_SHORT)
            if ok2:
                git_revision = out2.strip()
    except Exception:
        git_revision = None

    env_mode = "docker" if _in_docker_container() else "native"

    packages: Optional[Dict[str, str]] = None
    if include_packages:
        # Common Python packages used by the application; fetched via importlib.metadata
        pkg_names = [
            "fastapi",
            "starlette",
            "uvicorn",
            "sqlalchemy",
            "pydantic",
            "httpx",
        ]
        pkgs: Dict[str, str] = {}
        for name in pkg_names:
            try:
                ver = importlib_metadata.version(name)
                if ver:
                    pkgs[name] = ver
            except Exception:
                # Package not installed or version not resolvable
                continue
        packages = pkgs if pkgs else None

    return EnvironmentInfo(
        python_path=sys.executable,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        node_path=node_path,
        node_version=node_version,
        npm_version=npm_version,
        docker_version=docker_version,
        platform=sys.platform,
        cwd=os.getcwd(),
        venv_active=venv_active,
        app_version=app_version,
        api_version=api_version,
        frontend_version=frontend_version,
        git_revision=git_revision,
        environment_mode=env_mode,
        python_packages=packages,
    )


@router.post("/operations/exit-all", response_model=OperationResult)
async def exit_all(down: bool = False):
    """
    One-click exit: stop Docker containers (host only) and shut down all services (frontend/node/backend).

    Behavior:
    - If not in a container and Docker is running: docker compose stop (and optional down)
    - Then trigger backend's comprehensive shutdown (frontend+node+backend)

    Returns OperationResult with combined details and schedules backend termination.
    """
    details: Dict[str, Any] = {}

    # Attempt Docker stop on host (best-effort)
    docker_performed = False
    if not _in_docker_container() and _check_docker_running():
        project_root = Path(__file__).parent.parent.parent
        ok_s, out_s, err_s = _docker_compose(["stop"], cwd=project_root, timeout=TIMEOUT_DOCKER_STOP)
        details.update(
            {
                "docker_stop_ok": ok_s,
                "docker_stop_stdout": out_s[-800:],
                "docker_stop_stderr": err_s[-800:],
            }
        )
        docker_performed = True
        if down:
            ok_d, out_d, err_d = _docker_compose(["down"], cwd=project_root, timeout=TIMEOUT_DOCKER_DOWN)
            details.update(
                {
                    "docker_down_ok": ok_d,
                    "docker_down_stdout": out_d[-800:],
                    "docker_down_stderr": err_d[-800:],
                }
            )

    # Trigger backend comprehensive shutdown (stop-all)
    try:
        from backend.import_resolver import import_names

        (control_stop_all,) = import_names("main", "control_stop_all")
        shutdown_info = control_stop_all()
        details["shutdown"] = shutdown_info
    except Exception as e:
        details["shutdown_error"] = str(e)
        return OperationResult(
            success=False,
            message="Failed to initiate backend shutdown",
            details=details,
        )

    msg_parts = []
    if docker_performed:
        msg_parts.append("Docker containers stopped" + (" and removed" if down else ""))
    msg_parts.append("System shutdown initiated")
    return OperationResult(
        success=True,
        message="; ".join(msg_parts),
        details=details,
    )


@router.get("/logs/backend")
async def get_backend_logs(request: Request, lines: int = 100):
    """Get recent backend logs"""
    try:
        project_root = Path(__file__).parent.parent.parent
        log_file = project_root / "backend" / "logs" / "structured.json"

        if not log_file.exists():
            return {"logs": [], "message": "No log file found"}

        # Read last N lines
        with open(log_file, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]

        return {"logs": [line.strip() for line in recent_lines], "total_lines": len(all_lines)}
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_LOGS_ERROR,
            "Failed to read backend logs",
            request,
            context={"error": str(exc)},
        ) from exc


@router.post("/operations/database-backup", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def backup_database(request: Request):
    """
    Create a backup of the SQLite database
    """
    try:
        from backend.config import settings

        project_root = Path(__file__).parent.parent.parent
        db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))

        if not db_path.exists():
            raise http_error(404, ErrorCode.CONTROL_DATABASE_NOT_FOUND, "Database file not found", request)

        # Create backups directory
        backup_dir = project_root / "backups" / "database"
        backup_dir.mkdir(parents=True, exist_ok=True)

        # Create backup with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"student_management_{timestamp}.db"

        # Copy database
        shutil.copy2(db_path, backup_path)

        return OperationResult(
            success=True,
            message="Database backed up successfully",
            details={
                "backup_path": str(backup_path),
                "original_size": os.path.getsize(db_path),
                "backup_size": os.path.getsize(backup_path),
                "timestamp": timestamp,
            },
        )
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Database backup failed",
            request,
            context={"error": str(exc)},
        ) from exc


@router.get("/operations/database-backups", response_model=Dict[str, Any])
@_limiter.limit(_RATE_LIMIT_READ)
async def list_database_backups(request: Request):
    """
    List available database backups
    """
    try:
        project_root = Path(__file__).parent.parent.parent
        backup_dir = project_root / "backups" / "database"

        if not backup_dir.exists():
            return {"backups": [], "message": "No backups directory found"}

        backups = []
        for backup_file in sorted(backup_dir.glob("*.db"), reverse=True):
            stat = backup_file.stat()
            backups.append(
                {
                    "filename": backup_file.name,
                    "path": str(backup_file),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                }
            )

        return {"backups": backups, "total": len(backups)}
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_LIST_FAILED,
            "Failed to list backups",
            request,
            context={"error": str(exc)},
        ) from exc


@router.get("/operations/database-backups/{backup_filename}/download")
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def download_database_backup(request: Request, backup_filename: str):
    """Stream a database backup file for download."""

    try:
        project_root = Path(__file__).parent.parent.parent
        backup_dir = (project_root / "backups" / "database").resolve()

        target_path = (backup_dir / backup_filename).resolve()

        # Prevent directory traversal by ensuring path stays within backup_dir
        if not target_path.is_relative_to(backup_dir):
            raise http_error(
                400,
                ErrorCode.CONTROL_BACKUP_NOT_FOUND,
                "Invalid backup filename",
                request,
                context={"filename": backup_filename},
            )

        if not target_path.exists():
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_NOT_FOUND,
                "Backup file not found",
                request,
                context={"filename": backup_filename},
            )

        return FileResponse(
            target_path,
            media_type="application/octet-stream",
            filename=target_path.name,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Failed to download backup",
            request,
            context={"error": str(exc), "filename": backup_filename},
        ) from exc


@router.get("/operations/database-backups/archive.zip")
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def download_backups_zip(request: Request):
    """Create a zip archive of all database backups and stream it as a download."""
    try:
        import io
        import zipfile

        project_root = Path(__file__).parent.parent.parent
        backup_dir = (project_root / "backups" / "database").resolve()

        if not backup_dir.exists():
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_LIST_FAILED,
                "No backups directory found",
                request,
                context={},
            )

        # Collect .db files
        files = sorted(backup_dir.glob("*.db"), reverse=True)
        if not files:
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_LIST_FAILED,
                "No backup files found",
                request,
                context={},
            )

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for f in files:
                # Write with base filename only
                zf.write(f, arcname=f.name)
        buf.seek(0)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"sms_backups_{timestamp}.zip"

        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(buf, media_type="application/zip", headers=headers)
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Failed to create backups ZIP",
            request,
            context={"error": str(exc)},
        ) from exc


class ZipSaveRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full .zip path)")


@router.post("/operations/database-backups/archive/save-to-path", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def save_backups_zip_to_path(request: Request, payload: ZipSaveRequest):
    """Create a backups ZIP and save it to a specific path on the host."""
    try:
        import io
        import zipfile

        project_root = Path(__file__).parent.parent.parent
        backup_dir = (project_root / "backups" / "database").resolve()
        if not backup_dir.exists():
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_LIST_FAILED,
                "No backups directory found",
                request,
                context={},
            )

        files = sorted(backup_dir.glob("*.db"), reverse=True)
        if not files:
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_LIST_FAILED,
                "No backup files found",
                request,
                context={},
            )

        # Build zip in-memory
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for f in files:
                zf.write(f, arcname=f.name)
        buf.seek(0)

        raw_dest = (payload.destination or "").strip()
        if not raw_dest:
            raise http_error(400, ErrorCode.BAD_REQUEST, "Destination path is required", request)

        dest_candidate = Path(raw_dest)
        if dest_candidate.exists() and dest_candidate.is_dir():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dest_path = dest_candidate / f"sms_backups_{timestamp}.zip"
        elif dest_candidate.suffix.lower() == ".zip":
            dest_path = dest_candidate
        else:
            # Treat as directory path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dest_path = dest_candidate / f"sms_backups_{timestamp}.zip"

        # Ensure parent exists
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as out_f:
            out_f.write(buf.read())

        return OperationResult(
            success=True,
            message="Backups ZIP saved successfully",
            details={"destination": str(dest_path), "size": os.path.getsize(dest_path)},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Failed to save backups ZIP",
            request,
            context={"error": str(exc), "destination": payload.destination},
        ) from exc


class ZipSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup .db filenames to include in the ZIP")


@router.post("/operations/database-backups/archive/selected.zip")
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def download_selected_backups_zip(request: Request, payload: ZipSelectedRequest):
    """Create a zip archive of selected database backups and stream it."""
    try:
        import io
        import zipfile

        project_root = Path(__file__).parent.parent.parent
        backup_dir = (project_root / "backups" / "database").resolve()
        if not backup_dir.exists():
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_LIST_FAILED,
                "No backups directory found",
                request,
                context={},
            )

        # Validate and collect files
        selected: List[Path] = []
        seen = set()
        for name in payload.filenames or []:
            if not isinstance(name, str) or not name.endswith('.db'):
                continue
            if name in seen:
                continue
            seen.add(name)
            p = (backup_dir / name).resolve()
            if (not p.is_relative_to(backup_dir)) or (not p.exists()):
                continue
            selected.append(p)

        if not selected:
            raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No valid backup files selected", request)

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for f in selected:
                zf.write(f, arcname=f.name)
        buf.seek(0)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"sms_backups_selected_{timestamp}.zip"
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(buf, media_type="application/zip", headers=headers)
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Failed to create selected backups ZIP",
            request,
            context={"error": str(exc)},
        ) from exc


class ZipSelectedSaveRequest(ZipSelectedRequest):
    destination: str = Field(description="Destination path (directory or full .zip path)")


@router.post("/operations/database-backups/archive/selected/save-to-path", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def save_selected_backups_zip_to_path(request: Request, payload: ZipSelectedSaveRequest):
    """Create a ZIP from selected backups and save to the specified destination path."""
    try:
        import io
        import zipfile

        project_root = Path(__file__).parent.parent.parent
        backup_dir = (project_root / "backups" / "database").resolve()
        if not backup_dir.exists():
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_LIST_FAILED,
                "No backups directory found",
                request,
                context={},
            )

        # Validate selected files
        selected: List[Path] = []
        seen = set()
        for name in payload.filenames or []:
            if not isinstance(name, str) or not name.endswith('.db'):
                continue
            if name in seen:
                continue
            seen.add(name)
            p = (backup_dir / name).resolve()
            if (not p.is_relative_to(backup_dir)) or (not p.exists()):
                continue
            selected.append(p)
        if not selected:
            raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No valid backup files selected", request)

        # Build ZIP in memory
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for f in selected:
                zf.write(f, arcname=f.name)
        buf.seek(0)

        raw_dest = (payload.destination or "").strip()
        if not raw_dest:
            raise http_error(400, ErrorCode.BAD_REQUEST, "Destination path is required", request)

        dest_candidate = Path(raw_dest)
        if dest_candidate.exists() and dest_candidate.is_dir():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dest_path = dest_candidate / f"sms_backups_selected_{timestamp}.zip"
        elif dest_candidate.suffix.lower() == ".zip":
            dest_path = dest_candidate
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dest_path = dest_candidate / f"sms_backups_selected_{timestamp}.zip"

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as out_f:
            out_f.write(buf.read())

        return OperationResult(
            success=True,
            message="Selected backups ZIP saved successfully",
            details={"destination": str(dest_path), "size": os.path.getsize(dest_path)},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Failed to save selected backups ZIP",
            request,
            context={"error": str(exc), "destination": getattr(payload, 'destination', None)},
        ) from exc


class BackupCopyRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full file path) on the host machine")


class DeleteSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup .db filenames to delete")


@router.post("/operations/database-backups/delete-selected", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def delete_selected_backups(request: Request, payload: DeleteSelectedRequest):
    """Delete selected database backup files from the backups directory.

    Validates filenames against the backups directory and only deletes files that exist
    and are within the allowed path. Returns counts and lists of deleted and not-found files.
    """
    try:
        project_root = Path(__file__).parent.parent.parent
        backup_dir = (project_root / "backups" / "database").resolve()

        if not backup_dir.exists():
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_LIST_FAILED,
                "No backups directory found",
                request,
                context={},
            )

        deleted: List[str] = []
        not_found: List[str] = []
        seen = set()
        for name in payload.filenames or []:
            if not isinstance(name, str) or not name.endswith('.db'):
                continue
            if name in seen:
                continue
            seen.add(name)
            target = (backup_dir / name).resolve()
            # Ensure within backup_dir and exists
            if (backup_dir not in target.parents) or (not target.exists()):
                not_found.append(name)
                continue
            try:
                target.unlink()
                deleted.append(name)
            except Exception:
                # If deletion fails, report as not_found/failed
                not_found.append(name)

        if not deleted and not_found and len(not_found) == len(seen):
            # Nothing could be deleted
            return OperationResult(
                success=False,
                message="No valid backup files deleted",
                details={"deleted_count": 0, "deleted_files": deleted, "not_found": not_found},
            )

        return OperationResult(
            success=True,
            message=f"Deleted {len(deleted)} backup(s)",
            details={"deleted_count": len(deleted), "deleted_files": deleted, "not_found": not_found},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Failed to delete selected backups",
            request,
            context={"error": str(exc)},
        ) from exc


@router.post("/operations/database-backups/{backup_filename}/save-to-path", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def save_database_backup_to_path(request: Request, backup_filename: str, payload: BackupCopyRequest):
    """Copy a database backup to a specified destination path on the host.

    - If destination is a directory, the file will be copied into it retaining its filename.
    - If destination looks like a file path (has an extension), the file will be copied exactly to that path.
    """
    try:
        project_root = Path(__file__).parent.parent.parent
        backup_dir = (project_root / "backups" / "database").resolve()
        source_path = (backup_dir / backup_filename).resolve()

        # Validate source path
        if not source_path.is_relative_to(backup_dir):
            raise http_error(
                400,
                ErrorCode.CONTROL_BACKUP_NOT_FOUND,
                "Invalid backup filename",
                request,
                context={"filename": backup_filename},
            )
        if not source_path.exists():
            raise http_error(
                404,
                ErrorCode.CONTROL_BACKUP_NOT_FOUND,
                "Backup file not found",
                request,
                context={"filename": backup_filename},
            )

        # Determine destination path
        raw_dest = payload.destination.strip()
        if not raw_dest:
            raise http_error(
                400,
                ErrorCode.BAD_REQUEST,
                "Destination path is required",
                request,
                context={},
            )

        dest_candidate = Path(raw_dest)
        # If destination is an existing directory or has no suffix, treat as directory
        if dest_candidate.exists() and dest_candidate.is_dir():
            dest_path = dest_candidate / source_path.name
        elif dest_candidate.suffix and len(dest_candidate.suffix) > 0:
            # Has a file extension; treat as file path
            dest_path = dest_candidate
        else:
            # Non-existing path without extension -> directory
            dest_path = dest_candidate / source_path.name

        # Create parent directory if needed
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        shutil.copy2(source_path, dest_path)

        return OperationResult(
            success=True,
            message="Backup copied successfully",
            details={
                "source": str(source_path),
                "destination": str(dest_path),
                "size": os.path.getsize(dest_path),
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_BACKUP_FAILED,
            "Failed to copy backup to destination",
            request,
            context={"error": str(exc), "filename": backup_filename, "destination": payload.destination},
        ) from exc


@router.post("/operations/database-restore", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def restore_database(request: Request, backup_filename: str):
    """
    Restore database from a backup
    ⚠️ WARNING: This will overwrite the current database!
    """
    try:
        from backend.config import settings

        project_root = Path(__file__).parent.parent.parent
        backup_dir = project_root / "backups" / "database"
        backup_path = backup_dir / backup_filename

        if not backup_path.exists():
            raise http_error(404, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Backup file not found", request)

        db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))

        # Create a safety backup of current database before restoring
        safety_backup = None
        if db_path.exists():
            safety_backup = db_path.with_suffix(
                f".before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                + db_path.suffix
            )
            shutil.copy2(db_path, safety_backup)

        # Dispose active DB connections before touching the file to avoid SQLite I/O errors
        try:
            from backend import db as db_module

            db_module.engine.dispose()
        except Exception:
            # Engine disposal is best effort; continue with restore even if it fails
            pass

        # Remove WAL/SHM sidecar files so the restored database starts cleanly
        wal_path = db_path.with_suffix(db_path.suffix + "-wal")
        shm_path = db_path.with_suffix(db_path.suffix + "-shm")
        wal_path.unlink(missing_ok=True)
        shm_path.unlink(missing_ok=True)

        # Restore backup
        shutil.copy2(backup_path, db_path)

        # Re-initialize runtime schema helpers (best-effort)
        try:
            from backend import db as db_module

            db_module.ensure_schema(db_module.engine)
        except Exception:
            pass

        return OperationResult(
            success=True,
            message="Database restored successfully. Restart may be required.",
            details={
                "restored_from": str(backup_path),
                "database_path": str(db_path),
                "safety_backup": str(safety_backup) if safety_backup else None,
            },
        )
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.CONTROL_RESTORE_FAILED,
            "Database restore failed",
            request,
            context={"error": str(exc)},
        ) from exc


@router.get("/troubleshoot", response_model=List[DiagnosticResult])
async def run_troubleshooter():
    """
    Run comprehensive troubleshooter with automatic fix suggestions
    Goes beyond diagnostics to provide actionable solutions
    """
    results = []

    # Check 1: Port conflicts
    common_ports = COMMON_DEV_PORTS
    for port in common_ports:
        if _is_port_open(port):
            proc_info = _get_process_on_port(port)
            if proc_info:
                results.append(
                    DiagnosticResult(
                        category="Port Conflict",
                        status="warning",
                        message=f"Port {port} is in use by {proc_info.get('name', 'unknown')}",
                        details={
                            "port": port,
                            "process": proc_info,
                            "solution": "Stop the process or change application port",
                        },
                    )
                )

    # Check 2: Missing dependencies
    project_root = Path(__file__).parent.parent.parent

    # Frontend dependencies
    node_modules = project_root / "frontend" / "node_modules"
    if not node_modules.exists():
        results.append(
            DiagnosticResult(
                category="Missing Dependencies",
                status="error",
                message="Frontend dependencies not installed",
                details={
                    "solution": "Run: cd frontend && npm install",
                    "api_endpoint": "/control/api/operations/install-frontend-deps",
                },
            )
        )

    # Backend dependencies
    try:
        # If optional backend packages are missing, we catch ImportError below
        pass
    except ImportError as e:
        results.append(
            DiagnosticResult(
                category="Missing Dependencies",
                status="error",
                message=f"Backend dependencies not installed: {e}",
                details={
                    "solution": "Run: pip install -r backend/requirements.txt",
                    "api_endpoint": "/control/api/operations/install-backend-deps",
                },
            )
        )

    # Check 3: Database issues
    try:
        from backend.config import settings
        from backend.db import engine

        db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))

        if not db_path.exists():
            results.append(
                DiagnosticResult(
                    category="Database",
                    status="warning",
                    message="Database file not found - will be created on first run",
                    details={"solution": "Start the application to initialize database"},
                )
            )
        else:
            # Try to connect
            try:
                with engine.connect():
                    pass
                results.append(
                    DiagnosticResult(
                        category="Database",
                        status="ok",
                        message="Database connection successful",
                        details={},
                    )
                )
            except Exception as e:
                results.append(
                    DiagnosticResult(
                        category="Database",
                        status="error",
                        message=f"Database connection failed: {e}",
                        details={"solution": "Check database file permissions or restore from backup"},
                    )
                )
    except Exception as e:
        results.append(
            DiagnosticResult(
                category="Database",
                status="error",
                message=f"Database check failed: {e}",
                details={},
            )
        )

    # Check 4: Docker issues
    if not _check_docker_running():
        results.append(
            DiagnosticResult(
                category="Docker",
                status="warning",
                message="Docker Desktop is not running (only needed for containerized deployment)",
                details={"solution": "Start Docker Desktop if you want to run in Docker mode"},
            )
        )

    # Check 5: Environment configuration
    env_file = project_root / "backend" / ".env"
    if not env_file.exists():
        results.append(
            DiagnosticResult(
                category="Configuration",
                status="warning",
                message="Backend .env file not found",
                details={"solution": "Copy backend/.env.example to backend/.env"},
            )
        )

    frontend_env = project_root / "frontend" / ".env"
    if not frontend_env.exists():
        results.append(
            DiagnosticResult(
                category="Configuration",
                status="warning",
                message="Frontend .env file not found",
                details={"solution": "Copy frontend/.env.example to frontend/.env"},
            )
        )

    # If no issues found
    if not results:
        results.append(
            DiagnosticResult(
                category="System Health",
                status="ok",
                message="No issues detected - system appears healthy",
                details={},
            )
        )

    return results


# ============================================================================
# Operations Endpoints
# ============================================================================


@router.post("/operations/install-frontend-deps", response_model=OperationResult)
async def install_frontend_deps(request: Request):
    """
    Install frontend dependencies using npm
    Checks for package.json and npm availability
    """
    project_root = Path(__file__).parent.parent.parent
    frontend_dir = project_root / "frontend"
    package_json = frontend_dir / "package.json"

    # Check if package.json exists
    if not package_json.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_PACKAGE_JSON_MISSING,
            "package.json not found",
            request,
            context={"path": str(package_json)},
        )

    # Check if npm is installed
    npm_ok, npm_version = _check_npm_installed()
    if not npm_ok:
        raise http_error(
            400,
            ErrorCode.CONTROL_NPM_NOT_FOUND,
            "npm not found. Please install Node.js and npm (https://nodejs.org/)",
            request,
            context={"command": "npm --version"},
        )

    # Run npm install
    try:
        success, stdout, stderr = _run_command(
            ["npm", "install"],
            timeout=TIMEOUT_NPM_INSTALL,
        )

        if success:
            return OperationResult(
                success=True,
                message="Frontend dependencies installed successfully",
                details={
                    "npm_version": npm_version,
                    "directory": str(frontend_dir),
                    "stdout": stdout[-500:] if len(stdout) > 500 else stdout,
                },
            )
        else:
            return OperationResult(
                success=False,
                message="npm install failed",
                details={
                    "stdout": stdout[-500:] if len(stdout) > 500 else stdout,
                    "stderr": stderr[-500:] if len(stderr) > 500 else stderr,
                },
            )
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to install frontend dependencies",
            request,
            context={"error": str(exc)},
        ) from exc


@router.post("/operations/install-backend-deps", response_model=OperationResult)
async def install_backend_deps(request: Request):
    """
    Install backend dependencies using pip
    Checks for requirements.txt and pip availability
    """
    project_root = Path(__file__).parent.parent.parent
    backend_dir = project_root / "backend"
    requirements_file = backend_dir / "requirements.txt"

    # Check if requirements.txt exists
    if not requirements_file.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_REQUIREMENTS_MISSING,
            "requirements.txt not found",
            request,
            context={"path": str(requirements_file)},
        )

    # Check if pip is available (should be, since we're running Python)
    try:
        success, stdout, stderr = _run_command(["pip", "--version"], timeout=TIMEOUT_COMMAND_SHORT)
        if not success:
            raise http_error(
                400,
                ErrorCode.CONTROL_PIP_NOT_FOUND,
                "pip not found",
                request,
                context={"command": "pip --version"},
            )
        pip_version = stdout.strip()
    except Exception as exc:
        raise http_error(
            400,
            ErrorCode.CONTROL_PIP_NOT_FOUND,
            "pip not found",
            request,
            context={"error": str(exc)},
        ) from exc

    # Run pip install
    try:
        success, stdout, stderr = _run_command(
            ["pip", "install", "-r", str(requirements_file)],
            timeout=TIMEOUT_PIP_INSTALL,
        )

        if success:
            return OperationResult(
                success=True,
                message="Backend dependencies installed successfully",
                details={
                    "pip_version": pip_version,
                    "requirements_file": str(requirements_file),
                    "stdout": stdout[-500:] if len(stdout) > 500 else stdout,
                },
            )
        else:
            return OperationResult(
                success=False,
                message="pip install failed",
                details={
                    "stdout": stdout[-500:] if len(stdout) > 500 else stdout,
                    "stderr": stderr[-500:] if len(stderr) > 500 else stderr,
                },
            )
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to install backend dependencies",
            request,
            context={"error": str(exc)},
        ) from exc


@router.post("/operations/docker-build", response_model=OperationResult)
async def docker_build(request: Request):
    """
    Build Docker images using docker compose
    Checks if Docker is running first
    """
    # Check if Docker is running
    if not _check_docker_running():
        raise http_error(
            400,
            ErrorCode.CONTROL_DOCKER_NOT_RUNNING,
            "Docker is not running. Please start Docker Desktop.",
            request,
            context={"command": "docker info"},
        )

    project_root = Path(__file__).parent.parent.parent

    try:
        # Run docker compose build
        success, stdout, stderr = _docker_compose(
            ["build", "--no-cache"],
            cwd=project_root,
            timeout=TIMEOUT_DOCKER_BUILD,
        )

        if success:
            return OperationResult(
                success=True,
                message="Docker images built successfully",
                details={
                    "stdout": stdout[-1000:] if len(stdout) > 1000 else stdout,
                },
            )
        else:
            return OperationResult(
                success=False,
                message="Docker build failed",
                details={
                    "stdout": stdout[-1000:] if len(stdout) > 1000 else stdout,
                    "stderr": stderr[-1000:] if len(stderr) > 1000 else stderr,
                },
            )
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to build Docker images",
            request,
            context={"error": str(exc)},
        ) from exc


@router.post("/operations/database-upload", response_model=OperationResult)
async def upload_database(request: Request, file: UploadFile = File(...)):
    """
    Upload a new SQLite .db file and save it to backups/database/.
    Returns the saved filename for use with restore endpoint.
    """
    from pathlib import Path
    import shutil

    # Validate file extension
    if not file.filename or not file.filename.lower().endswith(".db"):
        raise http_error(
            400,
            ErrorCode.CONTROL_INVALID_FILE_TYPE,
            "Only .db files are allowed",
            request,
            context={"filename": file.filename},
        )
    # Save to backups/database with unique name
    backups_dir = Path(__file__).parent.parent.parent / "backups" / "database"
    backups_dir.mkdir(parents=True, exist_ok=True)
    # Use timestamp to avoid collisions
    import datetime

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_filename = f"uploaded_{timestamp}_{file.filename}"
    dest_path = backups_dir / dest_filename
    with dest_path.open("wb") as out_file:
        shutil.copyfileobj(file.file, out_file)
    # Optionally, validate it's a SQLite file (magic header)
    with dest_path.open("rb") as check_file:
        header = check_file.read(16)
    if not header.startswith(b"SQLite format 3"):
        dest_path.unlink(missing_ok=True)
        raise http_error(
            400,
            ErrorCode.CONTROL_INVALID_FILE_TYPE,
            "Uploaded file is not a valid SQLite database",
            request,
            context={"filename": file.filename},
        )
    return OperationResult(
        success=True,
        message="Database uploaded successfully",
        details={"filename": dest_filename},
    )


@router.post("/operations/docker-update-volume", response_model=OperationResult)
async def docker_update_volume(request: Request):
    """
    Update Docker volume with latest database schema
    Checks if Docker is running first
    """
    # Check if Docker is running
    if not _check_docker_running():
        raise http_error(
            400,
            ErrorCode.CONTROL_DOCKER_NOT_RUNNING,
            "Docker is not running. Please start Docker Desktop.",
            request,
            context={"command": "docker info"},
        )

    try:
        # Create a new volume with timestamp
        new_volume = _create_unique_volume("sms_data")

        return OperationResult(
            success=True,
            message=f"New Docker volume created: {new_volume}",
            details={
                "volume_name": new_volume,
                "note": "Update docker-compose.yml to use the new volume and restart containers",
            },
        )
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to create Docker volume",
            request,
            context={"error": str(exc)},
        ) from exc


@router.post("/restart", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def restart_backend(request: Request):
    """
    Trigger an in-process backend restart (native mode only).
    
    In Docker mode, returns an error message directing users to restart
    containers from the host system using SMS.ps1 or SMART_SETUP.ps1.
    
    In native mode, schedules a delayed restart of the backend process.
    """
    logger.info("Backend restart requested via control API")
    
    # Audit logging
    try:
        client_ip = getattr(request.client, "host", "unknown")
        token = request.headers.get("x-admin-token") or request.headers.get("X-ADMIN-TOKEN")
        logger.info(
            "restart_backend invoked by %s token_present=%s",
            client_ip,
            bool(token),
        )
    except Exception:
        logger.debug("Failed to log audit metadata for restart request")
    
    # Check execution mode
    if os.environ.get("SMS_EXECUTION_MODE", "native").lower() == "docker":
        raise http_error(
            400,
            ErrorCode.CONTROL_OPERATION_FAILED,
            "In-container restart is disabled. Run SMS.ps1 -Restart or SMART_SETUP.ps1 from the host.",
            request,
        )
    
    # Infer restart command
    command = _infer_restart_command()
    if not command:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Unable to infer restart command for current process.",
            request,
        )
    
    # Spawn restart thread
    _spawn_restart_thread(command)
    
    return OperationResult(
        success=True,
        message="Backend restart scheduled",
        details={
            "command": " ".join(command),
            "timestamp": datetime.now().isoformat(),
        },
    )


# ========== MONITORING STACK CONTROL ==========

@router.get("/monitoring/environment", response_model=Dict[str, Any])
async def get_monitoring_environment(request: Request):
    """
    Get execution environment information for monitoring control.
    Returns whether running in container and if monitoring control is available.
    """
    in_container = _in_docker_container()
    docker_running = _check_docker_running()
    
    return {
        "in_container": in_container,
        "docker_available": docker_running,
        "can_control_monitoring": not in_container and docker_running,
        "monitoring_control_message": (
            "Use RUN.ps1 -WithMonitoring from host" if in_container
            else "Monitoring can be controlled from this interface" if docker_running
            else "Docker is not available"
        )
    }


@router.get("/monitoring/status", response_model=Dict[str, Any])
async def get_monitoring_status(request: Request):
    """
    Get status of monitoring stack (Grafana, Prometheus, Loki).
    Returns whether each service is running and accessible.
    """
    logger.info("Monitoring status check requested")
    
    in_container = _in_docker_container()
    
    # Check if Docker is available
    if not _check_docker_running():
        return {
            "available": False,
            "in_container": in_container,
            "can_control": False,
            "message": "Docker is not running",
            "services": {}
        }
    
    # Check monitoring compose file
    monitoring_compose = Path("docker-compose.monitoring.yml")
    if not monitoring_compose.exists():
        return {
            "available": False,
            "in_container": in_container,
            "can_control": not in_container,
            "message": "Monitoring compose file not found",
            "services": {}
        }
    
    # Check if monitoring containers are running
    success, stdout, stderr = _docker_compose(["ps", "--services", "--filter", "status=running"], timeout=TIMEOUT_COMMAND_MEDIUM)

    # Get monitoring URLs from configuration
    settings = get_settings()

    services_status = {
        "grafana": {
            "running": False,
            "url": settings.GRAFANA_URL,
            "port": GRAFANA_PORT
        },
        "prometheus": {
            "running": False,
            "url": settings.PROMETHEUS_URL,
            "port": PROMETHEUS_PORT
        },
        "loki": {
            "running": False,
            "url": settings.LOKI_URL,
            "port": LOKI_PORT
        }
    }
    
    if success:
        running_services = stdout.strip().split("\n") if stdout.strip() else []
        for service in running_services:
            if service in services_status:
                services_status[service]["running"] = True
    
    any_running = any(s["running"] for s in services_status.values())
    
    return {
        "available": True,
        "in_container": in_container,
        "can_control": not in_container,
        "running": any_running,
        "services": services_status,
        "compose_file": str(monitoring_compose.absolute())
    }


@router.post("/monitoring/start", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def start_monitoring_stack(request: Request):
    """
    Start the monitoring stack (Grafana, Prometheus, Loki).
    Can only be executed from Docker host, not from within container.
    """
    logger.info(
        "Monitoring stack start requested",
        extra={
            "action": "monitoring_start_requested",
            "request_id": getattr(request.state, "request_id", None),
            "client_host": request.client.host if request.client else None,
        },
    )
    
    # Check execution mode
    if _in_docker_container():
        raise http_error(
            400,
            ErrorCode.CONTROL_OPERATION_FAILED,
            "Cannot start monitoring from inside container. Use RUN.ps1 -WithMonitoring from host.",
            request,
        )
    
    # Check Docker
    if not _check_docker_running():
        raise http_error(
            503,
            ErrorCode.CONTROL_DEPENDENCY_ERROR,
            "Docker is not running",
            request,
        )
    
    # Check compose file
    monitoring_compose = Path("docker-compose.monitoring.yml")
    if not monitoring_compose.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_FILE_NOT_FOUND,
            "Monitoring compose file not found",
            request,
        )
    
    # Start monitoring stack
    try:
        success, stdout, stderr = _docker_compose(
            ["-f", "docker-compose.monitoring.yml", "up", "-d"],
            timeout=120
        )
        
        if not success:
            raise http_error(
                500,
                ErrorCode.CONTROL_OPERATION_FAILED,
                f"Failed to start monitoring stack: {stderr}",
                request,
            )
        
        # Get monitoring URLs from configuration
        settings = get_settings()

        logger.info(
            "Monitoring stack started",
            extra={
                "action": "monitoring_start_success",
                "services": ["grafana", "prometheus", "loki"],
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return OperationResult(
            success=True,
            message="Monitoring stack started successfully",
            details={
                "services": ["grafana", "prometheus", "loki"],
                "grafana_url": settings.GRAFANA_URL,
                "prometheus_url": settings.PROMETHEUS_URL,
                "output": stdout
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Monitoring stack start failed unexpectedly",
            extra={
                "action": "monitoring_start_error",
                "error": str(exc),
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            f"Unexpected error starting monitoring: {str(exc)}",
            request,
        ) from exc


@router.post("/monitoring/stop", response_model=OperationResult)
@_limiter.limit(_RATE_LIMIT_HEAVY)
async def stop_monitoring_stack(request: Request):
    """
    Stop the monitoring stack (Grafana, Prometheus, Loki).
    Can only be executed from Docker host, not from within container.
    """
    logger.info(
        "Monitoring stack stop requested",
        extra={
            "action": "monitoring_stop_requested",
            "request_id": getattr(request.state, "request_id", None),
            "client_host": request.client.host if request.client else None,
        },
    )
    
    # Check execution mode
    if _in_docker_container():
        raise http_error(
            400,
            ErrorCode.CONTROL_OPERATION_FAILED,
            "Cannot stop monitoring from inside container. Use SMS.ps1 -Stop from host.",
            request,
        )
    
    # Check Docker
    if not _check_docker_running():
        return OperationResult(
            success=True,
            message="Docker not running, monitoring stack already stopped",
            details={}
        )
    
    # Stop monitoring stack
    try:
        success, stdout, stderr = _docker_compose(
            ["-f", "docker-compose.monitoring.yml", "down"],
            timeout=60
        )
        
        if not success and "no configuration file provided" not in stderr.lower():
            raise http_error(
                500,
                ErrorCode.CONTROL_OPERATION_FAILED,
                f"Failed to stop monitoring stack: {stderr}",
                request,
            )
        
        logger.info(
            "Monitoring stack stopped",
            extra={
                "action": "monitoring_stop_success",
                "services": ["grafana", "prometheus", "loki"],
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return OperationResult(
            success=True,
            message="Monitoring stack stopped successfully",
            details={
                "output": stdout
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Monitoring stack stop failed unexpectedly",
            extra={
                "action": "monitoring_stop_error",
                "error": str(exc),
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            f"Unexpected error stopping monitoring: {str(exc)}",
            request,
        ) from exc
