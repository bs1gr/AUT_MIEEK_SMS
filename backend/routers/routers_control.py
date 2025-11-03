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

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
from importlib import metadata as importlib_metadata  # Python 3.8+

# Rate limiting for new endpoints (honors project guidance)
from backend.import_resolver import import_names

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
async def get_system_status():
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

    return SystemStatus(
        backend=True,  # If this endpoint responds, backend is running
        frontend=frontend_port is not None,
        frontend_port=frontend_port,
        docker=docker_running,
        database=db_ok,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        node_version=node_version,
        timestamp=datetime.now().isoformat(),
    )


@router.get("/diagnostics", response_model=List[DiagnosticResult])
async def run_diagnostics():
    """
    Run comprehensive system diagnostics
    Similar to DEVTOOLS.ps1 and DIAGNOSE_FRONTEND.ps1
    """
    results = []

    # Check Python environment
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    if sys.version_info >= (3, 10):
        results.append(
            DiagnosticResult(
                category="Python",
                status="ok",
                message=f"Python {python_version} installed",
                details={"path": sys.executable, "version": sys.version},
            )
        )
    else:
        results.append(
            DiagnosticResult(
                category="Python",
                status="warning",
                message=f"Python {python_version} - recommend 3.10+",
                details={"path": sys.executable},
            )
        )

    # Check Node.js
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
            DiagnosticResult(category="Node.js", status="error", message="Node.js not found or not in PATH", details={})
        )

    # Check npm
    npm_ok, npm_version = _check_npm_installed()
    if npm_ok:
        results.append(
            DiagnosticResult(
                category="npm", status="ok", message=f"npm {npm_version} installed", details={"version": npm_version}
            )
        )
    else:
        results.append(DiagnosticResult(category="npm", status="error", message="npm not found", details={}))

    # Check Docker
    if _check_docker_running():
        docker_version = _check_docker_version()
        results.append(
            DiagnosticResult(
                category="Docker", status="ok", message="Docker Desktop is running", details={"version": docker_version}
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

    # Check database file
    try:
        from backend.config import settings

        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            size = os.path.getsize(db_path)
            results.append(
                DiagnosticResult(
                    category="Database",
                    status="ok",
                    message=f"Database file exists ({size} bytes)",
                    details={"path": db_path, "size": size},
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
                category="Database", status="error", message=f"Database check failed: {str(e)}", details={}
            )
        )

    # Check frontend dependencies
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

    # Check backend venv
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


@router.post("/operations/install-frontend-deps", response_model=OperationResult)
async def install_frontend_dependencies(background_tasks: BackgroundTasks):
    """
    Install frontend npm dependencies
    Similar to npm install in INSTALL.ps1
    """
    project_root = Path(__file__).parent.parent.parent
    frontend_dir = project_root / "frontend"

    if not (frontend_dir / "package.json").exists():
        raise HTTPException(status_code=404, detail="package.json not found")

    # Check if npm is available
    npm_ok, _ = _check_npm_installed()
    if not npm_ok:
        raise HTTPException(status_code=400, detail="npm not found - please install Node.js")

    try:
        # Run npm install
        success, stdout, stderr = _run_command(
            ["npm", "install"],
            timeout=300,  # 5 minutes
        )

        return OperationResult(
            success=success,
            message="Frontend dependencies installed successfully" if success else "Installation failed",
            details={"stdout": stdout, "stderr": stderr},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Installation error: {str(e)}")


@router.post("/operations/install-backend-deps", response_model=OperationResult)
async def install_backend_dependencies():
    """
    Install backend Python dependencies
    Similar to pip install in INSTALL.ps1
    """
    project_root = Path(__file__).parent.parent.parent
    requirements_file = project_root / "backend" / "requirements.txt"

    if not requirements_file.exists():
        raise HTTPException(status_code=404, detail="requirements.txt not found")

    try:
        # Run pip install
        success, stdout, stderr = _run_command(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
            timeout=300,  # 5 minutes
        )

        return OperationResult(
            success=success,
            message="Backend dependencies installed successfully" if success else "Installation failed",
            details={"stdout": stdout, "stderr": stderr},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Installation error: {str(e)}")


@router.post("/operations/docker-build", response_model=OperationResult)
async def build_docker_image():
    """
    Build Docker fullstack image
    Similar to SETUP.ps1
    """
    if not _check_docker_running():
        raise HTTPException(status_code=400, detail="Docker is not running")

    project_root = Path(__file__).parent.parent.parent
    dockerfile = project_root / "docker" / "Dockerfile.fullstack"

    if not dockerfile.exists():
        raise HTTPException(status_code=404, detail="Dockerfile.fullstack not found")

    try:
        success, stdout, stderr = _run_command(
            ["docker", "build", "-f", str(dockerfile), "-t", "sms-fullstack", str(project_root)],
            timeout=600,  # 10 minutes
        )

        return OperationResult(
            success=success,
            message="Docker image built successfully" if success else "Build failed",
            details={"stdout": stdout, "stderr": stderr},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Build error: {str(e)}")


@router.post("/operations/docker-stop", response_model=OperationResult)
async def docker_stop_all(down: bool = False):
    """
    Stop (or remove) Docker containers for this project using docker compose.

    - If running inside a Docker container, returns a safe message (cannot control host Docker).
    - If Docker isn't running, returns success=False with guidance.
    - When successful, stops containers (and removes them if down=true).
    """
    if _in_docker_container():
        return OperationResult(
            success=False,
            message=("Cannot control Docker from inside a container. Run this operation on the host machine."),
            details={"in_container": True},
        )

    if not _check_docker_running():
        raise HTTPException(status_code=400, detail="Docker is not running")

    project_root = Path(__file__).parent.parent.parent
    ok, out, err = _docker_compose(["stop"], cwd=project_root, timeout=120)
    details: Dict[str, Any] = {"stop_stdout": out[-1000:], "stop_stderr": err[-1000:]}

    if not ok:
        return OperationResult(
            success=False,
            message="Failed to stop Docker containers",
            details=details,
        )

    if down:
        ok2, out2, err2 = _docker_compose(["down"], cwd=project_root, timeout=180)
        details.update(
            {
                "down_stdout": out2[-1000:],
                "down_stderr": err2[-1000:],
            }
        )
        if not ok2:
            return OperationResult(
                success=False,
                message="Containers stopped, but removal (down) failed",
                details=details,
            )

    return OperationResult(
        success=True,
        message=("Docker containers stopped" + (" and removed" if down else "")),
        details=details,
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


@router.post("/operations/docker-prune", response_model=OperationResult)
@limiter.limit(RATE_LIMIT_HEAVY)
async def docker_prune(request: Request, include_volumes: bool = False):
    """
    Prune Docker resources safely on the host:
    - Prunes stopped containers, dangling images, build cache, and unused networks
    - Optionally prunes unused volumes when include_volumes=True

    Restrictions:
    - Must run on the host (not inside the container)
    - Docker Desktop must be running
    """
    if _in_docker_container():
        return OperationResult(
            success=False,
            message=("Cannot prune Docker from inside a container. Run this operation on the host machine."),
            details={"in_container": True},
        )

    if not _check_docker_running():
        raise HTTPException(status_code=400, detail="Docker is not running")

    summary: Dict[str, Any] = {"steps": []}
    errors: list[str] = []

    def _step(label: str, cmd: list[str]):
        ok, out, err = _run_command(cmd, timeout=300)
        summary["steps"].append(
            {
                "label": label,
                "ok": ok,
                "stdout": (out[-1000:] if out else None),
                "stderr": (err[-1000:] if err else None),
            }
        )
        if not ok:
            errors.append(f"{label} failed")

    # Prune stopped containers
    _step("container prune", ["docker", "container", "prune", "-f"])
    # Prune dangling images
    _step("image prune", ["docker", "image", "prune", "-f"])
    # Prune builder cache
    _step("builder prune", ["docker", "builder", "prune", "-f"])
    # Prune unused networks
    _step("network prune", ["docker", "network", "prune", "-f"])

    if include_volumes:
        _step("volume prune", ["docker", "volume", "prune", "-f"])

    return OperationResult(
        success=(len(errors) == 0),
        message=(
            "Docker resources pruned"
            + (" (including volumes)" if include_volumes else "")
            + (" with some errors" if errors else "")
        ),
        details=summary,
    )


@router.get("/logs/backend")
async def get_backend_logs(lines: int = 100):
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading logs: {str(e)}")


@router.post("/operations/cleanup", response_model=OperationResult)
async def cleanup_system():
    """
    Clean up temporary files and caches
    Similar to CLEANUP.ps1
    """
    cleaned = []
    errors = []

    try:
        project_root = Path(__file__).parent.parent.parent

        # Clean Python cache
        for pycache in project_root.rglob("__pycache__"):
            try:
                shutil.rmtree(pycache)
                cleaned.append(str(pycache))
            except Exception as e:
                errors.append(f"Failed to remove {pycache}: {e}")

        # Clean .pyc files
        for pyc in project_root.rglob("*.pyc"):
            try:
                pyc.unlink()
                cleaned.append(str(pyc))
            except Exception as e:
                errors.append(f"Failed to remove {pyc}: {e}")

        return OperationResult(
            success=len(errors) == 0,
            message=f"Cleaned {len(cleaned)} items" + (f" with {len(errors)} errors" if errors else ""),
            details={"cleaned": cleaned[:20], "errors": errors[:10]},  # Limit output size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup error: {str(e)}")


@router.post("/operations/cleanup-obsolete", response_model=OperationResult)
async def cleanup_obsolete_files():
    """
    Remove obsolete markdown/docs and unused files as defined by scripts/CLEANUP_OBSOLETE_FILES.ps1
    Runs natively in Python for cross-environment support.
    """
    project_root = Path(__file__).parent.parent.parent
    if _in_docker_container():
        return OperationResult(
            success=False,
            message=(
                "Cleanup of repository files must be run on the host. "
                "Please run scripts/CLEANUP_OBSOLETE_FILES.ps1 from the project root."
            ),
            details={"in_container": True},
        )

    # Mirror list from scripts/CLEANUP_OBSOLETE_FILES.ps1
    obsolete_markdown = [
        "VERSIONING_GUIDE.md",
        "TEACHING_SCHEDULE_GUIDE.md",
        "RUST_BUILDTOOLS_UPDATE.md",
        "QUICK_REFERENCE.md",
        "PACKAGE_VERSION_FIX.md",
        "ORGANIZATION_SUMMARY.md",
        "NODE_VERSION_UPDATE.md",
        "INSTALL_GUIDE.md",
        "IMPLEMENTATION_REPORT.md",
        "HELP_DOCUMENTATION_COMPLETE.md",
        "FRONTEND_TROUBLESHOOTING.md",
        "DEPLOYMENT_QUICK_START.md",
        "DEPENDENCY_UPDATE_LOG.md",
        "DAILY_PERFORMANCE_GUIDE.md",
        "COMPLETE_UPDATE_SUMMARY.md",
        "CODE_IMPROVEMENTS.md",
    ]

    removed: List[str] = []
    errors: List[str] = []

    for rel in obsolete_markdown:
        path = project_root / rel
        try:
            if path.exists():
                path.unlink()
                removed.append(str(path))
        except Exception as e:
            errors.append(f"Failed to remove {rel}: {e}")

    return OperationResult(
        success=len(errors) == 0,
        message=(f"Removed {len(removed)} obsolete file(s)" + (f" with {len(errors)} error(s)" if errors else "")),
        details={"removed": removed, "errors": errors},
    )


@router.post("/operations/docker-update-volume", response_model=OperationResult)
async def docker_update_volume(migrate: bool = True):
    """
    Create a new versioned Docker volume and generate docker-compose.override.yml to switch backend /data.
    Optionally migrates data from existing 'sms_data' volume to the new one.
    Does not stop/restart containers automatically.
    """
    if _in_docker_container():
        return OperationResult(
            success=False,
            message=("Docker volume update must run on the host. Run scripts/DOCKER_UPDATE_VOLUME.ps1 instead."),
            details={"in_container": True},
        )

    if not _check_docker_running():
        raise HTTPException(status_code=400, detail="Docker is not running")

    project_root = Path(__file__).parent.parent.parent

    base_volume = "sms_data"
    try:
        # Create new unique volume
        new_volume = _create_unique_volume(base_volume)

        # Migrate data if requested and old volume exists
        migration_stdout = ""
        migration_stderr = ""
        if migrate and _docker_volume_exists(base_volume):
            ok, out, err = _run_command(
                [
                    "docker",
                    "run",
                    "--rm",
                    "-v",
                    f"{base_volume}:/from",
                    "-v",
                    f"{new_volume}:/to",
                    "alpine",
                    "sh",
                    "-c",
                    "cd /from && cp -a . /to || true",
                ],
                timeout=600,
            )
            migration_stdout = out
            migration_stderr = err

        # Write/Update docker-compose.override.yml
        override_path = project_root / "docker-compose.override.yml"
        override_contents = (
            "services:\n"
            "  backend:\n"
            "    volumes:\n"
            f"      - {new_volume}:/data\n"
            "volumes:\n"
            f"  {new_volume}:\n"
            "    driver: local\n"
        )
        override_path.write_text(override_contents, encoding="utf-8")

        return OperationResult(
            success=True,
            message="Created new data volume and wrote docker-compose.override.yml. Restart the stack to apply.",
            details={
                "new_volume": new_volume,
                "override_file": str(override_path),
                "migrated": bool(migrate and _docker_volume_exists(base_volume)),
                "migration_stdout": migration_stdout[-500:] if migration_stdout else None,
                "migration_stderr": migration_stderr[-500:] if migration_stderr else None,
                "next_steps": ["docker compose down", "docker compose up -d"],
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docker volume update failed: {e}")
