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
from pathlib import Path
from typing import Optional, List, Dict, Any
import json
from datetime import datetime

from fastapi import APIRouter, Request
from fastapi import UploadFile, File
from pydantic import BaseModel, Field
from importlib import metadata as importlib_metadata  # Python 3.8+

# Rate limiting for new endpoints (honors project guidance)
from backend.import_resolver import import_names
from backend.errors import ErrorCode, http_error

limiter, RATE_LIMIT_HEAVY = import_names("rate_limiting", "limiter", "RATE_LIMIT_HEAVY")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/control/api", tags=["Control Panel"])

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
    # Heuristic: check for /.dockerenv or cgroup mentioning 'docker'
    if os.path.exists("/.dockerenv"):
        return True
    try:
        with open("/proc/1/cgroup", "rt") as f:
            if "docker" in f.read():
                return True
    except Exception:
        pass
    return False


# ============================================================================


def _is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a port is open"""
    try:
        with socket.create_connection((host, port), timeout=0.5):
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
    """Check if Docker Desktop is running"""
    success, _, _ = _run_command(["docker", "info"], timeout=5)
    return success


def _docker_compose(cmd: List[str], cwd: Optional[Path] = None, timeout: int = 60) -> tuple[bool, str, str]:
    """Run a docker compose command with robust handling.
    Returns (ok, stdout, stderr)."""
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
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", f"docker compose {' '.join(cmd)} timed out after {timeout}s"
    except Exception as e:
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
    success, stdout, _ = _run_command(["node", "--version"], timeout=5)
    if success:
        return True, stdout.strip()
    return False, None


def _check_npm_installed() -> tuple[bool, Optional[str]]:
    """Check if npm is installed and get version"""
    success, stdout, _ = _run_command(["npm", "--version"], timeout=5)
    if success:
        return True, stdout.strip()
    return False, None


def _check_docker_version() -> Optional[str]:
    """Get Docker version"""
    success, stdout, _ = _run_command(["docker", "--version"], timeout=5)
    if success:
        return stdout.strip()
    return None


def _get_frontend_port() -> Optional[int]:
    """Detect which port the frontend is running on"""
    for port in range(5173, 5181):
        if _is_port_open(port):
            return port
    return None


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
            DiagnosticResult(
                category="Database", status="error", message=f"Database check failed: {e!s}", details={}
            )
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
    ports_to_check = [8000, 8001, 8002, 5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180]
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
        ok, out, _ = _run_command(["git", "describe", "--tags", "--always", "--dirty"], timeout=3)
        if ok:
            git_revision = out.strip()
        else:
            ok2, out2, _ = _run_command(["git", "rev-parse", "--short", "HEAD"], timeout=3)
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
        ok_s, out_s, err_s = _docker_compose(["stop"], cwd=project_root, timeout=120)
        details.update(
            {
                "docker_stop_ok": ok_s,
                "docker_stop_stdout": out_s[-800:],
                "docker_stop_stderr": err_s[-800:],
            }
        )
        docker_performed = True
        if down:
            ok_d, out_d, err_d = _docker_compose(["down"], cwd=project_root, timeout=180)
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


@router.post("/operations/database-restore", response_model=OperationResult)
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
            safety_backup = db_path.with_suffix(f".before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
            shutil.copy2(db_path, safety_backup)

        # Restore backup
        shutil.copy2(backup_path, db_path)

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
    common_ports = [8000, 8080, 5173]
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
        import fastapi
        import sqlalchemy
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
            timeout=300,  # 5 minutes for npm install
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
        success, stdout, stderr = _run_command(["pip", "--version"], timeout=5)
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
            timeout=300,  # 5 minutes for pip install
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
            timeout=600,  # 10 minutes for docker build
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
