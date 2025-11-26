from __future__ import annotations

import logging
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from .common import (
    FRONTEND_PORT_CANDIDATES,
    FRONTEND_PORT_PREFERRED,
    find_pids_on_port,
    is_port_open,
    resolve_npm_command,
    safe_run,
)

router = APIRouter()
logger = logging.getLogger(__name__)

try:
    from backend.control_auth import require_control_admin as _require_control_admin
    require_control_admin = _require_control_admin  # type: ignore[assignment]
except Exception:
    def require_control_admin(request: Request):  # type: ignore
        return None


PROJECT_ROOT = Path(__file__).resolve().parents[3]

FRONTEND_PROCESS: subprocess.Popen | None = None


def _resolve_npm_via_legacy() -> Optional[str]:
    """Use backend.main's _resolve_npm_command if available for test compatibility."""
    try:
        from importlib import import_module
        _main = import_module("backend.main")
        return getattr(_main, "_resolve_npm_command", resolve_npm_command)()
    except Exception:
        return resolve_npm_command()


def _is_port_open_via_legacy(port: int) -> bool:
    """Use backend.main's _is_port_open if available for test compatibility."""
    try:
        from importlib import import_module
        _main = import_module("backend.main")
        fn = getattr(_main, "_is_port_open", None)
        if callable(fn):
            return bool(fn("127.0.0.1", port, timeout=0.5))
    except Exception:
        pass
    return is_port_open(port)


@router.post("/start")
async def control_start():
    global FRONTEND_PROCESS
    try:
        if _is_port_open_via_legacy(FRONTEND_PORT_PREFERRED):
            return {"success": True, "message": "Frontend already running", "port": FRONTEND_PORT_PREFERRED}
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
        if not os.path.isdir(frontend_dir):
            return JSONResponse({"success": False, "message": "Frontend directory not found", "path": str(frontend_dir)}, status_code=400)
        npm_cmd = _resolve_npm_via_legacy()
        if not npm_cmd:
            return JSONResponse({"success": False, "message": "npm not found. Please install Node.js and npm (https://nodejs.org/)"}, status_code=400)
        try:
            version_check = subprocess.run([npm_cmd, "-v"], cwd=frontend_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=False, check=False, timeout=5, text=True)
            if version_check.returncode != 0:
                raise subprocess.CalledProcessError(version_check.returncode, [npm_cmd, "-v"])
        except Exception:
            return JSONResponse({"success": False, "message": "npm not found or not executable. Ensure Node.js and npm are installed."}, status_code=400)
        pkg_path = os.path.join(frontend_dir, "package.json")
        if not os.path.isfile(pkg_path):
            return JSONResponse({"success": False, "message": "package.json not found", "path": pkg_path}, status_code=400)
        node_modules = os.path.join(frontend_dir, "node_modules")
        if not os.path.isdir(node_modules):
            lockfile = os.path.join(frontend_dir, "package-lock.json")
            install_args = [npm_cmd, "ci"] if os.path.isfile(lockfile) else [npm_cmd, "install"]
            install_result = subprocess.run(install_args, cwd=frontend_dir, shell=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False, text=True, timeout=300)
            if install_result.returncode != 0 and install_args[1] == "ci":
                fallback_result = subprocess.run([npm_cmd, "install"], cwd=frontend_dir, shell=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False, text=True, timeout=300)
                if fallback_result.returncode != 0:
                    return JSONResponse({"success": False, "message": "Failed to install frontend dependencies", "details": fallback_result.stdout}, status_code=500)
            elif install_result.returncode != 0:
                return JSONResponse({"success": False, "message": "Failed to install frontend dependencies", "details": install_result.stdout}, status_code=500)
        start_args = [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", str(FRONTEND_PORT_PREFERRED), "--strictPort"]
        try:
            creationflags = 0
            if sys.platform == "win32":
                try:
                    creationflags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
                except Exception:
                    creationflags = 0
            close_fds = sys.platform != "win32"
            logs_dir = PROJECT_ROOT / "logs"
            logs_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            frontend_log_path = logs_dir / f"frontend-{timestamp}.log"
            frontend_log_file = open(frontend_log_path, "a", encoding="utf-8")
            FRONTEND_PROCESS = subprocess.Popen(start_args, cwd=frontend_dir, shell=False, stdout=frontend_log_file, stderr=frontend_log_file, text=True, creationflags=creationflags, close_fds=close_fds)
        except Exception:
            return JSONResponse({"success": False, "message": "Failed to start frontend process"}, status_code=500)
        import time as _time
        for _ in range(120):
            _time.sleep(0.25)
            if FRONTEND_PROCESS.poll() is not None:
                return JSONResponse({"success": False, "message": "Frontend process terminated unexpectedly"}, status_code=500)
            if _is_port_open_via_legacy(FRONTEND_PORT_PREFERRED):
                return {"success": True, "message": "Frontend started successfully", "port": FRONTEND_PORT_PREFERRED, "url": f"http://localhost:{FRONTEND_PORT_PREFERRED}", "pid": FRONTEND_PROCESS.pid}
        try:
            safe_run(["taskkill", "/F", "/T", "/PID", str(FRONTEND_PROCESS.pid)], timeout=3)
        except Exception:
            pass
        return JSONResponse({"success": False, "message": f"Frontend failed to start on port {FRONTEND_PORT_PREFERRED} within 30 seconds", "hint": f"Port may be in use. Check with: netstat -ano | findstr :{FRONTEND_PORT_PREFERRED}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"success": False, "message": f"Unexpected error: {e!s}"}, status_code=500)


@router.post("/stop-all")
async def control_stop_all(request: Request, _auth=Depends(require_control_admin)):
    global FRONTEND_PROCESS
    logger.info("=== System Shutdown Initiated ===")
    try:
        stopped_services = []
        errors = []
        if FRONTEND_PROCESS is not None:
            pid = None
            try:
                pid = FRONTEND_PROCESS.pid
                res = safe_run(["taskkill", "/F", "/T", "/PID", str(pid)], timeout=5)
                if getattr(res, "returncode", None) == 0:
                    stopped_services.append(f"Frontend (tracked PID {pid} stopped)")
                else:
                    errors.append(f"Failed to stop tracked frontend PID {pid}")
            except Exception as e:
                errors.append(f"Tracked frontend: {e!s}")
            finally:
                FRONTEND_PROCESS = None
        ports_reported = 0
        port_processes: Dict[int, list[int]] = {}
        for port in FRONTEND_PORT_CANDIDATES:
            pids = find_pids_on_port(port)
            if pids:
                port_processes[port] = pids
                ports_reported += len(pids)
        if port_processes:
            stopped_services.append(f"Frontend (processes detected on ports: {list(port_processes.keys())})")
            errors.append("Processes detected on frontend ports. Prefer using scripts/maintenance/stop_frontend_safe.ps1 to request a frontend stop; operators may run scripts/operator/KILL_FRONTEND_NOW.ps1 -Confirm for emergency host-level termination.")
        def _delayed_backend_shutdown():
            import time as _time
            try:
                _time.sleep(1.0)
            finally:
                import os as _os
                _os._exit(0)
        import threading as _threading
        _threading.Thread(target=_delayed_backend_shutdown, daemon=True).start()
        stopped_services.append("Backend (shutdown scheduled)")
        response_data = {"success": True, "message": "System shutdown complete", "stopped_services": stopped_services, "info": "Backend will terminate in 1 second", "timestamp": datetime.now().isoformat()}
        if errors:
            response_data["warnings"] = errors
        return response_data
    except Exception as e:
        return JSONResponse({"success": False, "message": f"Shutdown error: {e!s}", "timestamp": datetime.now().isoformat()}, status_code=500)


@router.post("/stop")
async def control_stop(request: Request, _auth=Depends(require_control_admin)):
    global FRONTEND_PROCESS
    try:
        stopped_any = False
        stopped_pids: list[int] = []
        errors: list[str] = []
        if FRONTEND_PROCESS is not None:
            pid = None
            try:
                pid = FRONTEND_PROCESS.pid
                res = safe_run(["taskkill", "/F", "/T", "/PID", str(pid)], timeout=5)
                if getattr(res, "returncode", None) == 0:
                    stopped_any = True
                    stopped_pids.append(pid)
                else:
                    errors.append(f"PID {pid}: taskkill failed")
            except Exception as e:
                errors.append(f"Tracked process: {e!s}")
            finally:
                FRONTEND_PROCESS = None
        ports_cleared = 0
        for port in FRONTEND_PORT_CANDIDATES:
            pids = find_pids_on_port(port)
            if pids:
                for pid in pids:
                    try:
                        res = safe_run(["taskkill", "/F", "/T", "/PID", str(pid)], timeout=5)
                        if getattr(res, "returncode", None) == 0:
                            stopped_any = True
                            stopped_pids.append(pid)
                            ports_cleared += 1
                        else:
                            errors.append(f"Port {port} PID {pid}: taskkill failed")
                    except Exception as e:
                        errors.append(f"Port {port} PID {pid}: {e!s}")
        message = (f"Frontend stopped successfully ({len(stopped_pids)} process(es), {ports_cleared} port(s) cleared)" if stopped_any else "No frontend processes detected")
        response_data: Dict[str, Any] = {"success": True, "message": message, "stopped_pids": stopped_pids, "ports_cleared": ports_cleared, "timestamp": datetime.now().isoformat()}
        if errors:
            response_data["warnings"] = errors
        return response_data
    except Exception as e:
        return JSONResponse({"success": False, "message": f"Frontend stop error: {e!s}", "timestamp": datetime.now().isoformat()}, status_code=500)


@router.post("/stop-backend")
async def control_stop_backend(request: Request, _auth=Depends(require_control_admin)):
    try:
        current_pid = os.getpid()
        parent_pid = os.getppid()
        def _delayed_exit():
            import time as _time
            try:
                _time.sleep(0.75)
                if os.name == "nt":
                    for pid in {current_pid, parent_pid}:
                        try:
                            safe_run(["taskkill", "/F", "/T", "/PID", str(pid)], timeout=3)
                        except Exception:
                            pass
                else:
                    import signal
                    try:
                        os.kill(current_pid, signal.SIGTERM)
                    except Exception:
                        pass
            finally:
                os._exit(0)
        import threading as _threading
        _threading.Thread(target=_delayed_exit, daemon=True).start()
        return {"success": True, "message": "Backend shutdown initiated", "info": "Server will terminate in 750ms", "pids": {"current": current_pid, "parent": parent_pid}, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return JSONResponse({"success": False, "message": f"Backend stop error: {e!s}", "timestamp": datetime.now().isoformat()}, status_code=500)
