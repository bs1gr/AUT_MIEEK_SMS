"""Database management endpoints for Control Panel.

Provides REST API for managing PostgreSQL database instances:
- Instance discovery and health monitoring
- Backup creation, listing, download, and deletion
- Database statistics and table information
- Restore from backup files
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.control_auth import require_control_admin
from backend.services.database_manager import (
    _find_instance,
    check_instance_health,
    create_backup,
    delete_backup,
    get_backup_path,
    get_configured_instances,
    get_instance_stats,
    list_backups,
    restore_backup,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class InstanceInfo(BaseModel):
    name: str
    label: str = ""
    host: str
    port: int = 5432
    dbname: str
    is_primary: bool = False
    status: str = "unknown"
    version: Optional[str] = None
    started_at: Optional[str] = None
    size_bytes: Optional[int] = None
    size_human: Optional[str] = None
    error: Optional[str] = None


class BackupInfo(BaseModel):
    filename: str
    size_bytes: int
    size_human: str
    created_at: str
    instance: str = "unknown"
    method: str = "unknown"
    compressed: bool = True


class BackupResult(BaseModel):
    success: bool
    filename: Optional[str] = None
    size_bytes: Optional[int] = None
    size_human: Optional[str] = None
    method: Optional[str] = None
    compressed: Optional[bool] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None


class RestoreResult(BaseModel):
    success: bool
    method: Optional[str] = None
    statements_executed: Optional[int] = None
    errors: Optional[List[str]] = None
    error: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None


class DatabaseStats(BaseModel):
    name: str
    table_count: Optional[int] = None
    tables: Optional[List[Dict[str, Any]]] = None
    active_connections: Optional[int] = None
    size_bytes: Optional[int] = None
    size_human: Optional[str] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Instance endpoints
# ---------------------------------------------------------------------------

@router.get("/database/instances", response_model=List[InstanceInfo])
async def list_instances(
    request: Request,
    _auth=Depends(require_control_admin),
):
    """List all configured database instances with health status."""
    instances = get_configured_instances()
    results = []
    for inst in instances:
        health = check_instance_health(inst)
        results.append(InstanceInfo(**health))
    return results


@router.get("/database/instances/{name}/status", response_model=InstanceInfo)
async def get_instance_status(
    name: str,
    request: Request,
    _auth=Depends(require_control_admin),
):
    """Check health of a specific database instance."""
    try:
        inst = _find_instance(name)
        health = check_instance_health(inst)
        return InstanceInfo(**health)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/database/instances/{name}/stats", response_model=DatabaseStats)
async def get_database_stats(
    name: str,
    request: Request,
    _auth=Depends(require_control_admin),
):
    """Get detailed statistics for a database instance."""
    try:
        inst = _find_instance(name)
        stats = get_instance_stats(inst)
        return DatabaseStats(**stats)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Backup endpoints
# ---------------------------------------------------------------------------

@router.post("/database/instances/{name}/backup", response_model=BackupResult)
async def create_instance_backup(
    name: str,
    request: Request,
    compress: bool = Query(True, description="Compress backup with gzip"),
    _auth=Depends(require_control_admin),
):
    """Create a backup of a database instance."""
    try:
        inst = _find_instance(name)
        result = create_backup(inst, compress=compress)
        return BackupResult(**result)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error("Backup creation failed: %s", exc)
        return BackupResult(success=False, error=str(exc))


@router.get("/database/backups", response_model=List[BackupInfo])
async def list_database_backups(
    request: Request,
    instance: Optional[str] = Query(None, description="Filter by instance name"),
    _auth=Depends(require_control_admin),
):
    """List all available database backups."""
    return [BackupInfo(**b) for b in list_backups(instance)]


@router.get("/database/backups/{filename}/download")
async def download_backup(
    filename: str,
    request: Request,
    _auth=Depends(require_control_admin),
):
    """Download a backup file."""
    path = get_backup_path(filename)
    if path is None:
        raise HTTPException(status_code=404, detail="Backup file not found")

    media_type = "application/gzip" if filename.endswith(".gz") else "application/sql"
    return FileResponse(
        path=str(path),
        filename=filename,
        media_type=media_type,
    )


@router.delete("/database/backups/{filename}")
async def delete_database_backup(
    filename: str,
    request: Request,
    _auth=Depends(require_control_admin),
):
    """Delete a backup file."""
    try:
        deleted = delete_backup(filename)
        if not deleted:
            raise HTTPException(status_code=404, detail="Backup file not found")
        return {"success": True, "message": f"Backup '{filename}' deleted"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/database/backups/{filename}/restore")
async def restore_database_backup(
    filename: str,
    request: Request,
    instance_name: str = Query(..., description="Target instance name"),
    _auth=Depends(require_control_admin),
):
    """Restore a backup to a database instance."""
    try:
        inst = _find_instance(instance_name)
        result = restore_backup(inst, filename)
        return RestoreResult(**result)
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Restore failed: %s", exc)
        return RestoreResult(success=False, error=str(exc))
