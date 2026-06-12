from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, Request

from backend.errors import ErrorCode, http_error

router = APIRouter()


@router.get("/logs/backend")
async def get_backend_logs(request: Request, lines: int = 100):
    try:
        project_root = Path(__file__).resolve().parents[3]
        backend_root = project_root / "backend"

        env_log = os.environ.get("LOG_FILE", "logs/app.log").strip() or "logs/app.log"
        env_log_path = Path(env_log)
        if not env_log_path.is_absolute():
            env_log_path = backend_root / env_log_path

        candidate_paths = [
            env_log_path,
            backend_root / "logs" / "structured.json",
            backend_root / "logs" / "app.log",
            backend_root / "logs" / "sms.log",
        ]

        log_file = next((path for path in candidate_paths if path.exists()), None)
        if not log_file:
            return {"logs": [], "message": "No log file found"}
        with open(log_file, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]
        return {"logs": [line.strip() for line in recent_lines], "total_lines": len(all_lines)}
    except Exception as exc:
        raise http_error(
            500, ErrorCode.CONTROL_LOGS_ERROR, "Failed to read backend logs", request, context={"error": str(exc)}
        ) from exc
