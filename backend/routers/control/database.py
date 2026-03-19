"""Database management endpoints for Control Panel.

Provides REST API for managing PostgreSQL database instances:
- Instance discovery and health monitoring
- Backup creation, listing, download, and deletion
- Database statistics and table information
- Restore from backup files
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.control_auth import require_control_admin
from backend.services.database_manager import (
    _validate_backup_filename,
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


class TestConnectionRequest(BaseModel):
    """Request model for testing database connection."""

    host: str = Field(..., description="PostgreSQL host")
    port: int = Field(5432, description="PostgreSQL port")
    dbname: str = Field(..., description="Database name")
    user: str = Field(..., description="Username")
    password: str = Field(..., description="Password")
    sslmode: str = Field("prefer", description="SSL mode (disable/prefer/require)")


class TestConnectionResult(BaseModel):
    """Result of database connection test."""

    success: bool
    status: str  # 'healthy' or 'unreachable'
    version: Optional[str] = None
    size_bytes: Optional[int] = None
    size_human: Optional[str] = None
    error: Optional[str] = None


class ImportCredentialsResult(BaseModel):
    """Result of credential import and connection."""

    success: bool
    message: str
    connection_test: Optional[TestConnectionResult] = None
    credentials_saved: bool = False
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
    # CodeQL [python/path-injection]: Safe - validate route input before any
    # filesystem lookup and rely on service-side path containment checks.
    try:
        safe_filename = _validate_backup_filename(filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    path = get_backup_path(safe_filename)
    if path is None:
        raise HTTPException(status_code=404, detail="Backup file not found")

    resolved_name = path.name
    media_type = "application/gzip" if resolved_name.endswith(".gz") else "application/sql"
    return FileResponse(
        path=str(path),
        filename=resolved_name,
        media_type=media_type,
    )


@router.delete("/database/backups/{filename}")
async def delete_database_backup(
    filename: str,
    request: Request,
    _auth=Depends(require_control_admin),
):
    """Delete a backup file."""
    # CodeQL [python/path-injection]: Safe - validate route input before any
    # filesystem lookup and rely on service-side path containment checks.
    try:
        safe_filename = _validate_backup_filename(filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        deleted = delete_backup(safe_filename)
        if not deleted:
            raise HTTPException(status_code=404, detail="Backup file not found")
        return {"success": True, "message": f"Backup '{safe_filename}' deleted"}
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
    # CodeQL [python/path-injection]: Safe - validate route input before any
    # filesystem lookup and rely on service-side path containment checks.
    try:
        safe_filename = _validate_backup_filename(filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        inst = _find_instance(instance_name)
        result = restore_backup(inst, safe_filename)
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


# ---------------------------------------------------------------------------
# Connection testing and credential import endpoints
# ---------------------------------------------------------------------------


@router.post("/database/test-connection", response_model=TestConnectionResult)
async def test_database_connection(
    credentials: TestConnectionRequest,
    request: Request,
    _auth=Depends(require_control_admin),
):
    """Test PostgreSQL connection with provided credentials (not saved).

    This endpoint validates credentials by attempting a connection to the
    specified PostgreSQL server. Credentials are NOT saved to configuration.

    Use this to:
    - Validate credentials before importing
    - Test connectivity to remote databases
    - Troubleshoot connection issues
    """
    instance_config = {
        "name": "test",
        "host": credentials.host,
        "port": credentials.port,
        "dbname": credentials.dbname,
        "user": credentials.user,
        "password": credentials.password,
        "sslmode": credentials.sslmode,
    }

    try:
        result = check_instance_health(instance_config)
        return TestConnectionResult(
            success=(result["status"] == "healthy"),
            status=result["status"],
            version=result.get("version"),
            size_bytes=result.get("size_bytes"),
            size_human=result.get("size_human"),
            error=result.get("error"),
        )
    except Exception as exc:
        logger.error("Connection test failed: %s", exc)
        return TestConnectionResult(
            success=False,
            status="unreachable",
            error=str(exc),
        )


@router.post("/database/import-credentials", response_model=ImportCredentialsResult)
async def import_database_credentials(
    file: UploadFile = File(...),
    auto_connect: bool = Query(True, description="Apply credentials and set as active profile"),
    _auth=Depends(require_control_admin),
):
    """Import database credentials from file and optionally auto-connect.

    Supported file formats:
    - JSON: {"host": "...", "port": 5432, "dbname": "...", "user": "...", "password": "..."}
    - .env format: POSTGRES_HOST=..., POSTGRES_PORT=..., etc.

    Process:
    1. Parse uploaded file
    2. Test connection with provided credentials
    3. If auto_connect=true and connection succeeds:
       - Save credentials to .env file
       - Set SMS_DATABASE_PROFILE=remote
       - Set DATABASE_ENGINE=postgresql

    Returns:
    - Connection test results
    - Whether credentials were saved
    - Any errors encountered
    """
    try:
        # Read file content
        content = await file.read()

        # Parse credentials based on file type
        credentials = None
        filename_lower = (file.filename or "").lower()

        if filename_lower.endswith(".json"):
            # Parse JSON format
            try:
                data = json.loads(content.decode("utf-8"))
                credentials = {
                    "host": data.get("host", data.get("POSTGRES_HOST", "localhost")),
                    "port": int(data.get("port", data.get("POSTGRES_PORT", 5432))),
                    "dbname": data.get("dbname", data.get("POSTGRES_DB", "student_management")),
                    "user": data.get("user", data.get("POSTGRES_USER", "sms_user")),
                    "password": data.get("password", data.get("POSTGRES_PASSWORD", "")),
                    "sslmode": data.get("sslmode", data.get("POSTGRES_SSLMODE", "prefer")),
                }
            except (json.JSONDecodeError, ValueError) as exc:
                return ImportCredentialsResult(
                    success=False,
                    message="Invalid JSON format",
                    error=str(exc),
                )

        elif filename_lower.endswith(".env") or "env" in filename_lower:
            # Parse .env format
            try:
                lines = content.decode("utf-8").splitlines()
                env_vars = {}
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        env_vars[key.strip()] = value.strip().strip('"').strip("'")

                credentials = {
                    "host": env_vars.get("POSTGRES_HOST", "localhost"),
                    "port": int(env_vars.get("POSTGRES_PORT", "5432")),
                    "dbname": env_vars.get("POSTGRES_DB", "student_management"),
                    "user": env_vars.get("POSTGRES_USER", "sms_user"),
                    "password": env_vars.get("POSTGRES_PASSWORD", ""),
                    "sslmode": env_vars.get("POSTGRES_SSLMODE", "prefer"),
                }
            except (ValueError, UnicodeDecodeError) as exc:
                return ImportCredentialsResult(
                    success=False,
                    message="Invalid .env format",
                    error=str(exc),
                )
        else:
            return ImportCredentialsResult(
                success=False,
                message="Unsupported file format. Use .json or .env files.",
                error=f"File type not recognized: {file.filename}",
            )

        # Validate required fields
        if not credentials or not credentials.get("host") or not credentials.get("password"):
            return ImportCredentialsResult(
                success=False,
                message="Missing required credentials (host and password are mandatory)",
                error="Incomplete credential data",
            )

        # Test connection
        test_instance = {
            "name": "import-test",
            **credentials,
        }

        health_result = check_instance_health(test_instance)
        test_result = TestConnectionResult(
            success=(health_result["status"] == "healthy"),
            status=health_result["status"],
            version=health_result.get("version"),
            size_bytes=health_result.get("size_bytes"),
            size_human=health_result.get("size_human"),
            error=health_result.get("error"),
        )

        # If connection failed, return early
        if not test_result.success:
            return ImportCredentialsResult(
                success=False,
                message="Connection test failed",
                connection_test=test_result,
                credentials_saved=False,
            )

        # If auto_connect is enabled and connection succeeded, save credentials
        credentials_saved = False
        if auto_connect:
            try:
                # Locate .env file
                env_path = Path.cwd() / ".env"
                if not env_path.exists():
                    env_path = Path(__file__).resolve().parents[3] / ".env"

                # Read existing .env content
                existing_lines = []
                if env_path.exists():
                    with env_path.open("r", encoding="utf-8") as f:
                        existing_lines = f.readlines()

                # Update or add credential lines
                env_updates = {
                    "SMS_DATABASE_PROFILE": "remote",
                    "DATABASE_ENGINE": "postgresql",
                    "POSTGRES_HOST": credentials["host"],
                    "POSTGRES_PORT": str(credentials["port"]),
                    "POSTGRES_DB": credentials["dbname"],
                    "POSTGRES_USER": credentials["user"],
                    "POSTGRES_PASSWORD": credentials["password"],
                    "POSTGRES_SSLMODE": credentials["sslmode"],
                }

                # Build DATABASE_URL
                from urllib.parse import quote_plus

                db_url = (
                    f"postgresql://{quote_plus(credentials['user'])}:"
                    f"{quote_plus(credentials['password'])}@{credentials['host']}:"
                    f"{credentials['port']}/{quote_plus(credentials['dbname'])}"
                    f"?sslmode={credentials['sslmode']}"
                )
                env_updates["DATABASE_URL"] = db_url

                # Apply updates
                updated_keys = set()
                new_lines = []
                for line in existing_lines:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#") and "=" in stripped:
                        key = stripped.split("=", 1)[0].strip()
                        if key in env_updates:
                            new_lines.append(f"{key}={env_updates[key]}\n")
                            updated_keys.add(key)
                            continue
                    new_lines.append(line)

                # Add missing keys
                for key, value in env_updates.items():
                    if key not in updated_keys:
                        new_lines.append(f"\n# Imported database credentials\n{key}={value}\n")

                # Write back to .env
                with env_path.open("w", encoding="utf-8") as f:
                    f.writelines(new_lines)

                credentials_saved = True
                logger.info("Database credentials imported and saved to .env")

            except Exception as exc:
                logger.error("Failed to save credentials to .env: %s", exc)
                return ImportCredentialsResult(
                    success=False,
                    message="Connection succeeded but failed to save credentials",
                    connection_test=test_result,
                    credentials_saved=False,
                    error=str(exc),
                )

        # Success
        message = "Connection test passed"
        if credentials_saved:
            message += ". Credentials saved to .env (restart required to apply)"

        return ImportCredentialsResult(
            success=True,
            message=message,
            connection_test=test_result,
            credentials_saved=credentials_saved,
        )

    except Exception as exc:
        logger.error("Import credentials failed: %s", exc)
        return ImportCredentialsResult(
            success=False,
            message="Import failed",
            error=str(exc),
        )
