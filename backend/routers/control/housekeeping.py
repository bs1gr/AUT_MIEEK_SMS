from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.control_auth import control_api_enabled
from backend.errors import ErrorCode, http_error

from .common import (
    check_docker_running,
    docker_compose,
    in_docker_container,
    infer_restart_command,
    spawn_restart_thread,
)

router = APIRouter()


class OperationResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class RestartDiagnostics(BaseModel):
    restart_supported: bool
    message: str
    environment: str
    execution_mode: str
    control_api_enabled: bool
    requires_admin_token: bool
    timestamp: str
    hints: List[str] = Field(default_factory=list)


def _build_restart_diagnostics(_: Optional[Request] = None) -> RestartDiagnostics:
    environment = "docker" if in_docker_container() else "native"
    execution_mode = os.environ.get("SMS_EXECUTION_MODE", "native").strip().lower() or "native"
    control_api_enabled_flag = control_api_enabled()
    requires_admin_token = bool(os.environ.get("ADMIN_SHUTDOWN_TOKEN"))

    restart_supported = control_api_enabled_flag and environment != "docker" and execution_mode != "docker"
    hints: List[str] = []

    if not control_api_enabled_flag:
        message = "Control API disabled. Set ENABLE_CONTROL_API=1 in backend/.env and restart the backend service."
        hints.append("Edit backend/.env (or your process manager) to set ENABLE_CONTROL_API=1, then restart the backend.")
    elif environment == "docker" or execution_mode == "docker":
        message = "In-container restart is disabled. Run SMS.ps1 -Restart or SMART_SETUP.ps1 from the host."
        hints.append("Use host-level scripts such as SMS.ps1 -Restart or restart the Docker stack from the host shell.")
    else:
        message = "Restart endpoint ready."

    return RestartDiagnostics(
        restart_supported=restart_supported,
        message=message,
        environment=environment,
        execution_mode=execution_mode,
        control_api_enabled=control_api_enabled_flag,
        requires_admin_token=requires_admin_token,
        timestamp=datetime.now().isoformat(),
        hints=hints,
    )


@router.post("/operations/exit-all", response_model=OperationResult)
async def exit_all(down: bool = False):
    details: Dict[str, Any] = {}
    docker_performed = False
    if not in_docker_container() and check_docker_running():
        project_root = Path(__file__).resolve().parents[3]
        ok_s, out_s, err_s = docker_compose(["stop"], cwd=project_root, timeout=120)
        details.update({"docker_stop_ok": ok_s, "docker_stop_stdout": out_s[-800:], "docker_stop_stderr": err_s[-800:]})
        docker_performed = True
        if down:
            ok_d, out_d, err_d = docker_compose(["down"], cwd=project_root, timeout=180)
            details.update({"docker_down_ok": ok_d, "docker_down_stdout": out_d[-800:], "docker_down_stderr": err_d[-800:]})
    try:
        from backend.import_resolver import import_names
        (control_stop_all,) = import_names("main", "control_stop_all")
        shutdown_info = control_stop_all()
        details["shutdown"] = shutdown_info
    except Exception as e:
        details["shutdown_error"] = str(e)
        return OperationResult(success=False, message="Failed to initiate backend shutdown", details=details)
    msg_parts = []
    if docker_performed:
        msg_parts.append("Docker containers stopped" + (" and removed" if down else ""))
    msg_parts.append("System shutdown initiated")
    return OperationResult(success=True, message="; ".join(msg_parts), details=details)


@router.get("/restart", response_model=RestartDiagnostics)
async def restart_diagnostics(request: Request):
    return _build_restart_diagnostics(request)


@router.post("/restart", response_model=OperationResult)
async def restart_backend(request: Request):
    diagnostics = _build_restart_diagnostics(request)
    if not diagnostics.restart_supported:
        status_code = 404 if not diagnostics.control_api_enabled else 400
        return JSONResponse(status_code=status_code, content=diagnostics.model_dump())
    # Backward-compat: use legacy helpers in backend.main if present for tests
    try:
        from importlib import import_module
        _main = import_module("backend.main")
        command = getattr(_main, "_infer_restart_command", infer_restart_command)()
        spawn_fn = getattr(_main, "_spawn_restart_thread", spawn_restart_thread)
    except Exception:
        command = infer_restart_command()
        spawn_fn = spawn_restart_thread
    if not command:
        raise http_error(500, ErrorCode.INTERNAL_SERVER_ERROR, "Unable to infer restart command for current process.", request)
    spawn_fn(command)
    return OperationResult(success=True, message="Backend restart scheduled", details={"command": " ".join(command), "timestamp": datetime.now().isoformat()})
