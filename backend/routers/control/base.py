from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

from .common import (
    BACKEND_PORTS,
    COMMON_DEV_PORTS,
    FRONTEND_PORTS,
    check_docker_running,
    check_docker_version,
    check_node_installed,
    check_npm_installed,
    get_process_on_port,
    in_docker_container,
    is_port_open,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Lightweight in-memory cache to keep control endpoints responsive
_CONTROL_CACHE: Dict[str, tuple[float, Any]] = {}
_CONTROL_CACHE_LOCK = Lock()


def _cache_get(key: str, ttl_seconds: float) -> Optional[Any]:
    now = time.monotonic()
    with _CONTROL_CACHE_LOCK:
        entry = _CONTROL_CACHE.get(key)
    if not entry:
        return None
    ts, value = entry
    if now - ts > ttl_seconds:
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    with _CONTROL_CACHE_LOCK:
        _CONTROL_CACHE[key] = (time.monotonic(), value)


class SystemStatus(BaseModel):
    backend: bool
    frontend: bool
    frontend_port: Optional[int] = None
    docker: bool = False
    database: bool = False
    python_version: str
    node_version: Optional[str] = None
    timestamp: str
    process_start_time: Optional[str] = None


class DiagnosticResult(BaseModel):
    category: str
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None


class PortInfo(BaseModel):
    port: int
    in_use: bool
    process_name: Optional[str] = None
    process_id: Optional[int] = None


class EnvironmentInfo(BaseModel):
    python_path: str
    python_version: str
    node_path: Optional[str] = None
    node_version: Optional[str] = None
    npm_version: Optional[str] = None
    docker_version: Optional[str] = None
    platform: str = sys.platform
    cwd: str = os.getcwd()
    venv_active: bool = False
    app_version: Optional[str] = None
    api_version: Optional[str] = None
    frontend_version: Optional[str] = None
    git_revision: Optional[str] = None
    environment_mode: Optional[str] = None
    python_packages: Optional[Dict[str, str]] = None


@router.get("/status", response_model=SystemStatus)
async def get_system_status(request: Request, response: Response):
    from .common import get_frontend_port

    cached = _cache_get("status", ttl_seconds=5)
    if cached:
        return cached

    async def check_db() -> bool:
        try:
            from backend.db import engine

            with engine.connect():
                return True
        except Exception:
            return False

    frontend_port, docker_running, db_ok, node_info = await asyncio.gather(
        asyncio.to_thread(get_frontend_port),
        asyncio.to_thread(check_docker_running),
        check_db(),
        asyncio.to_thread(check_node_installed),
    )

    node_installed, node_version = node_info

    process_start_time = None
    try:
        process_start = getattr(request.app.state, "start_time", None)
        if process_start:
            process_start_time = datetime.fromtimestamp(process_start, tz=timezone.utc).isoformat()
    except Exception:
        pass

    status = SystemStatus(
        backend=True,
        frontend=frontend_port is not None,
        frontend_port=frontend_port,
        docker=docker_running,
        database=db_ok,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        node_version=node_version,
        timestamp=datetime.now().isoformat(),
        process_start_time=process_start_time,
    )
    response.headers["Cache-Control"] = "private, max-age=5"
    _cache_set("status", status)
    return status


@router.get("/diagnostics", response_model=List[DiagnosticResult])
async def run_diagnostics(response: Response):
    cached = _cache_get("diagnostics", ttl_seconds=30)
    if cached:
        return cached

    results: List[DiagnosticResult] = []
    in_docker = in_docker_container()

    # Python
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}"
    if sys.version_info >= (3, 10):
        results.append(
            DiagnosticResult(
                category="Python Runtime",
                status="ok",
                message=f"Python {py_ver} ({'container' if in_docker else 'host'})",
                details={"path": sys.executable, "version": sys.version, "mode": "docker" if in_docker else "native"},
            )
        )
    else:
        results.append(
            DiagnosticResult(
                category="Python Runtime",
                status="warning",
                message=f"Python {py_ver} - recommend 3.10+",
                details={"path": sys.executable},
            )
        )

    # Native-only checks
    if not in_docker:
        node_ok, node_version = check_node_installed()
        if node_ok and node_version:
            major = int(node_version.strip("v").split(".")[0]) if node_version.startswith("v") else 0
            if major >= 18:
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

        npm_ok, npm_version = check_npm_installed()
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

        if check_docker_running():
            docker_version = check_docker_version()
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

    # Database
    try:
        from backend.config import settings

        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            size = os.path.getsize(db_path)
            schema_version = "Unknown"
            try:
                from sqlalchemy import create_engine, text

                engine = create_engine(settings.DATABASE_URL)
                with engine.connect() as conn:
                    row = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
                    if row:
                        schema_version = row[0]
            except Exception as exc:
                logger.warning("Failed to retrieve alembic version", extra={"error": str(exc)})
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

    # Frontend deps (native only)
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

    response.headers["Cache-Control"] = "private, max-age=30"
    _cache_set("diagnostics", results)
    return results


@router.get("/ports", response_model=List[PortInfo])
async def check_ports(response: Response):
    cached = _cache_get("ports", ttl_seconds=10)
    if cached:
        return cached

    ports_to_check = BACKEND_PORTS + FRONTEND_PORTS

    async def check_one(port: int) -> PortInfo:
        in_use = await asyncio.to_thread(is_port_open, port)
        proc_info = await asyncio.to_thread(get_process_on_port, port) if in_use else None
        return PortInfo(
            port=port,
            in_use=in_use,
            process_name=proc_info.get("name") if proc_info else None,
            process_id=proc_info.get("pid") if proc_info else None,
        )

    results = list(await asyncio.gather(*(check_one(port) for port in ports_to_check)))
    response.headers["Cache-Control"] = "private, max-age=10"
    _cache_set("ports", results)
    return results


@router.get("/environment", response_model=EnvironmentInfo)
async def get_environment_info(response: Response, include_packages: bool = False):
    cache_key = "environment:packages" if include_packages else "environment"
    cached = _cache_get(cache_key, ttl_seconds=60 if include_packages else 20)
    if cached:
        return cached

    node_info, npm_info, docker_version = await asyncio.gather(
        asyncio.to_thread(check_node_installed),
        asyncio.to_thread(check_npm_installed),
        asyncio.to_thread(check_docker_version),
    )
    docker_version = docker_version or os.environ.get("HOST_DOCKER_VERSION")
    node_ok, node_version = node_info
    npm_ok, npm_version = npm_info

    venv_active = hasattr(sys, "real_prefix") or (hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix)

    node_path = None
    if node_ok:
        from .common import run_command

        success, stdout, _ = await asyncio.to_thread(
            run_command, ["where" if sys.platform == "win32" else "which", "node"]
        )
        if success:
            node_path = stdout.strip().split("\n")[0]

    project_root = Path(__file__).resolve().parents[3]

    app_version: Optional[str] = None
    try:
        ver_path = project_root / "VERSION"
        if ver_path.exists():
            app_version = ver_path.read_text(encoding="utf-8").strip()
    except Exception:
        app_version = None

    api_version: Optional[str] = None
    try:
        (create_app,) = __import__("backend.import_resolver").import_resolver.import_names("main", "create_app")  # type: ignore[attr-defined]
        api_version = getattr(create_app(), "version", None)
    except Exception:
        api_version = None

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
    if not frontend_version:
        frontend_version = os.environ.get("FRONTEND_VERSION")

    git_revision: Optional[str] = None
    try:
        from .common import run_command

        ok, out, _ = await asyncio.to_thread(run_command, ["git", "describe", "--tags", "--always", "--dirty"], 5)
        if ok:
            git_revision = out.strip()
        else:
            ok2, out2, _ = await asyncio.to_thread(run_command, ["git", "rev-parse", "--short", "HEAD"], 5)
            if ok2:
                git_revision = out2.strip()
    except Exception:
        git_revision = None

    env_mode = "docker" if in_docker_container() else "native"

    packages: Optional[Dict[str, str]] = None
    if include_packages:
        from importlib import metadata as importlib_metadata

        pkg_names = ["fastapi", "starlette", "uvicorn", "sqlalchemy", "pydantic", "httpx"]
        pkgs: Dict[str, str] = {}
        for name in pkg_names:
            try:
                ver = importlib_metadata.version(name)
                if ver:
                    pkgs[name] = ver
            except Exception:
                continue
        packages = pkgs or None

    info = EnvironmentInfo(
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
    response.headers["Cache-Control"] = "private, max-age=60" if include_packages else "private, max-age=20"
    _cache_set(cache_key, info)
    return info


@router.get("/troubleshoot", response_model=List[DiagnosticResult])
async def run_troubleshooter():
    results: List[DiagnosticResult] = []

    for port in COMMON_DEV_PORTS:
        if is_port_open(port):
            proc_info = get_process_on_port(port)
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

    project_root = Path(__file__).resolve().parents[3]

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

    # Database checks
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
            try:
                with engine.connect():
                    pass
                results.append(
                    DiagnosticResult(
                        category="Database", status="ok", message="Database connection successful", details={}
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
            DiagnosticResult(category="Database", status="error", message=f"Database check failed: {e}", details={})
        )

    if not check_docker_running():
        results.append(
            DiagnosticResult(
                category="Docker",
                status="warning",
                message="Docker Desktop is not running (only needed for containerized deployment)",
                details={"solution": "Start Docker Desktop if you want to run in Docker mode"},
            )
        )

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

    if not results:
        results.append(
            DiagnosticResult(
                category="System Health", status="ok", message="No issues detected - system appears healthy", details={}
            )
        )
    return results
