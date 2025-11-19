from __future__ import annotations

from datetime import datetime
import os
from pathlib import Path
from typing import Any, Dict, Optional, List

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.errors import ErrorCode, http_error
from .common import (
    in_docker_container,
    docker_compose,
    check_docker_running,
    infer_restart_command,
    spawn_restart_thread,
)

router = APIRouter()


class OperationResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


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


@router.post("/restart", response_model=OperationResult)
async def restart_backend(request: Request):
    if in_docker_container() or (os.environ.get("SMS_EXECUTION_MODE", "native").lower() == "docker"):
        # Tests expect a top-level message key in the error response for this specific case
        return JSONResponse(status_code=400, content={
            "message": "In-container restart is disabled. Run SMS.ps1 -Restart or SMART_SETUP.ps1 from the host."
        })
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
