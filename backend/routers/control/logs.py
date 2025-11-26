from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request

from backend.errors import ErrorCode, http_error

router = APIRouter()


@router.get("/logs/backend")
async def get_backend_logs(request: Request, lines: int = 100):
    try:
        project_root = Path(__file__).resolve().parents[3]
        log_file = project_root / "backend" / "logs" / "structured.json"
        if not log_file.exists():
            return {"logs": [], "message": "No log file found"}
        with open(log_file, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]
        return {"logs": [line.strip() for line in recent_lines], "total_lines": len(all_lines)}
    except Exception as exc:
        raise http_error(500, ErrorCode.CONTROL_LOGS_ERROR, "Failed to read backend logs", request, context={"error": str(exc)}) from exc
