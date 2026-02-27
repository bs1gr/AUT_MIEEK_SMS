from __future__ import annotations

import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from backend.config import get_settings
from backend.control_auth import require_control_admin
from backend.errors import ErrorCode, http_error
from backend.services.backup_service_encrypted import BackupServiceEncrypted

from .common import (
    check_docker_running,
    check_npm_installed,
    create_unique_volume,
    docker_compose,
    run_command,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class OperationResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


@router.post("/operations/install-frontend-deps", response_model=OperationResult)
async def install_frontend_deps(request: Request, _auth=Depends(require_control_admin)):
    # Resolve project root (repository root)
    project_root = Path(__file__).resolve().parents[3]
    frontend_dir = project_root / "frontend"
    package_json = frontend_dir / "package.json"

    if not package_json.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_PACKAGE_JSON_MISSING,
            "package.json not found",
            request,
            context={"path": str(package_json)},
        )

    # Backward-compat: allow tests to monkeypatch legacy symbol in routers_control
    npm_ok: bool
    npm_version: Optional[str]
    try:
        import importlib

        ctrl = importlib.import_module("backend.routers.routers_control")
        if hasattr(ctrl, "_check_npm_installed"):
            npm_ok, npm_version = getattr(ctrl, "_check_npm_installed")()
        else:
            npm_ok, npm_version = check_npm_installed()
    except Exception:
        npm_ok, npm_version = check_npm_installed()
    if not npm_ok:
        raise http_error(
            400,
            ErrorCode.CONTROL_NPM_NOT_FOUND,
            "npm not found. Please install Node.js and npm (https://nodejs.org/)",
            request,
            context={"command": "npm --version"},
        )

    success, stdout, stderr = run_command(["npm", "install"], timeout=300)
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
    return OperationResult(
        success=False,
        message="npm install failed",
        details={
            "stdout": stdout[-500:] if len(stdout) > 500 else stdout,
            "stderr": stderr[-500:] if len(stderr) > 500 else stderr,
        },
    )


@router.post("/operations/install-backend-deps", response_model=OperationResult)
async def install_backend_deps(request: Request, _auth=Depends(require_control_admin)):
    project_root = Path(__file__).resolve().parents[3]
    backend_dir = project_root / "backend"
    requirements_file = backend_dir / "requirements.txt"

    if not requirements_file.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_REQUIREMENTS_MISSING,
            "requirements.txt not found",
            request,
            context={"path": str(requirements_file)},
        )

    ok, stdout, _ = run_command(["pip", "--version"], timeout=5)
    if not ok:
        raise http_error(
            400, ErrorCode.CONTROL_PIP_NOT_FOUND, "pip not found", request, context={"command": "pip --version"}
        )
    pip_version = stdout.strip()

    success, stdout, stderr = run_command(["pip", "install", "-r", str(requirements_file)], timeout=300)
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
    return OperationResult(
        success=False,
        message="pip install failed",
        details={
            "stdout": stdout[-500:] if len(stdout) > 500 else stdout,
            "stderr": stderr[-500:] if len(stderr) > 500 else stderr,
        },
    )


@router.post("/operations/docker-build", response_model=OperationResult)
async def docker_build(request: Request, _auth=Depends(require_control_admin)):
    # Backward-compat: allow tests to monkeypatch legacy symbol in routers_control
    try:
        import importlib

        ctrl = importlib.import_module("backend.routers.routers_control")
        check_docker = getattr(ctrl, "_check_docker_running", check_docker_running)
    except Exception:
        check_docker = check_docker_running

    if not check_docker():
        raise http_error(
            400,
            ErrorCode.CONTROL_DOCKER_NOT_RUNNING,
            "Docker is not running. Please start Docker Desktop.",
            request,
            context={"command": "docker info"},
        )

    project_root = Path(__file__).resolve().parents[3]
    success, stdout, stderr = docker_compose(["build", "--no-cache"], cwd=project_root, timeout=600)
    if success:
        return OperationResult(
            success=True,
            message="Docker images built successfully",
            details={"stdout": stdout[-1000:] if len(stdout) > 1000 else stdout},
        )
    return OperationResult(
        success=False,
        message="Docker build failed",
        details={
            "stdout": stdout[-1000:] if len(stdout) > 1000 else stdout,
            "stderr": stderr[-1000:] if len(stderr) > 1000 else stderr,
        },
    )


@router.post("/operations/database-upload", response_model=OperationResult)
async def upload_database(request: Request, file: UploadFile = File(...), _auth=Depends(require_control_admin)):
    if not file.filename or not file.filename.lower().endswith(".db"):
        raise http_error(
            400,
            ErrorCode.CONTROL_INVALID_FILE_TYPE,
            "Only .db files are allowed",
            request,
            context={"filename": file.filename},
        )
    backups_dir = Path(__file__).resolve().parents[3] / "backups" / "database"
    backups_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_filename = f"uploaded_{timestamp}_{file.filename}"
    dest_path = backups_dir / dest_filename
    with dest_path.open("wb") as out_file:
        import shutil as _sh

        _sh.copyfileobj(file.file, out_file)
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
    return OperationResult(success=True, message="Database uploaded successfully", details={"filename": dest_filename})


@router.post("/operations/docker-update-volume", response_model=OperationResult)
async def docker_update_volume(request: Request, _auth=Depends(require_control_admin)):
    # Backward-compat: allow tests to monkeypatch legacy symbol in routers_control
    try:
        import importlib

        ctrl = importlib.import_module("backend.routers.routers_control")
        check_docker = getattr(ctrl, "_check_docker_running", check_docker_running)
    except Exception:
        check_docker = check_docker_running

    if not check_docker():
        raise http_error(
            400,
            ErrorCode.CONTROL_DOCKER_NOT_RUNNING,
            "Docker is not running. Please start Docker Desktop.",
            request,
            context={"command": "docker info"},
        )
    try:
        new_volume = create_unique_volume("sms_data")
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
            500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create Docker volume", request, context={"error": str(exc)}
        ) from exc


# Backups suite (list/download/zip/save/delete/restore)


class ZipSaveRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full .zip path)")


class ZipSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup filenames (.db or .enc) to include in the ZIP")


class ZipSelectedSaveRequest(ZipSelectedRequest):
    destination: str = Field(description="Destination path (directory or full .zip path)")


class BackupCopyRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full file path) on the host machine")


class DeleteSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup filenames (.db or .enc) to delete")


@router.post("/operations/database-backup", response_model=OperationResult)
async def create_database_backup(
    request: Request,
    encrypt: bool = Query(True, description="Enable AES-256 encryption for backup"),
    _auth=Depends(require_control_admin),
):
    """
    Create a new database backup.

    Supports PostgreSQL (`pg_dump`) and SQLite (consistent file snapshot).

    Args:
        encrypt: Whether to encrypt the backup with AES-256-GCM (default: True)

    Returns:
        OperationResult with backup details including encryption status

    Raises:
        400: If database URL is unsupported
        500: If pg_dump fails or PostgreSQL client tools not installed
    """
    try:
        settings = get_settings()
        db_url = settings.DATABASE_URL

        # Create backups directory
        project_root = Path(__file__).resolve().parents[3]
        backup_dir = project_root / "backups" / "database"
        backup_dir.mkdir(parents=True, exist_ok=True)

        # Generate timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # ============================================================================
        # POSTGRESQL BACKUP
        # ============================================================================
        if db_url.startswith("postgresql"):
            parsed = urlparse(db_url)

            # Extract connection details
            pg_host = parsed.hostname or "localhost"
            pg_port = parsed.port or 5432
            pg_user = parsed.username
            pg_password = parsed.password
            pg_database = parsed.path.lstrip("/")

            backup_filename = f"backup_{timestamp}.sql"
            backup_path = backup_dir / backup_filename

            # Build pg_dump command
            pg_dump_cmd = [
                "pg_dump",
                "-h",
                pg_host,
                "-p",
                str(pg_port),
                "-U",
                pg_user,
                "-d",
                pg_database,
                "-F",
                "c",  # Custom format (compressed)
                "-f",
                str(backup_path),
            ]

            # Set password via environment variable
            env = os.environ.copy()
            if pg_password:
                env["PGPASSWORD"] = pg_password

            try:
                result = subprocess.run(
                    pg_dump_cmd,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 minutes timeout
                )

                if result.returncode != 0:
                    raise Exception(f"pg_dump failed: {result.stderr}")

                file_size = backup_path.stat().st_size

                if encrypt:
                    # Encrypt the SQL dump
                    backup_service = BackupServiceEncrypted(backup_dir=backup_dir, enable_encryption=True)
                    backup_name = f"backup_{timestamp}"

                    backup_info = backup_service.create_encrypted_backup(
                        source_path=backup_path,
                        backup_name=backup_name,
                        metadata={
                            "database_type": "postgresql",
                            "database_host": pg_host,
                            "database_name": pg_database,
                            "backup_method": "pg_dump",
                            "encryption_enabled": True,
                        },
                    )

                    # Remove unencrypted dump (best effort; do not fail backup on transient lock)
                    try:
                        backup_path.unlink()
                    except PermissionError:
                        logger.warning("Could not remove temporary PostgreSQL dump due to file lock: %s", backup_path)

                    return OperationResult(
                        success=True,
                        message="Encrypted PostgreSQL backup created successfully",
                        details={
                            "filename": f"{backup_name}.enc",
                            "path": backup_info["backup_path"],
                            "original_size": backup_info["original_size"],
                            "encrypted_size": backup_info["encrypted_size"],
                            "encryption": "AES-256-GCM",
                            "timestamp": timestamp,
                            "compression_ratio": backup_info["compression_ratio"],
                            "database_type": "postgresql",
                        },
                    )
                else:
                    return OperationResult(
                        success=True,
                        message="PostgreSQL backup created successfully",
                        details={
                            "filename": backup_filename,
                            "path": str(backup_path),
                            "size": file_size,
                            "timestamp": timestamp,
                            "encryption": None,
                            "database_type": "postgresql",
                        },
                    )

            except subprocess.TimeoutExpired:
                raise http_error(
                    500,
                    ErrorCode.INTERNAL_SERVER_ERROR,
                    "PostgreSQL backup timed out after 5 minutes",
                    request,
                )
            except FileNotFoundError:
                raise http_error(
                    500,
                    ErrorCode.INTERNAL_SERVER_ERROR,
                    "pg_dump not found. Please install PostgreSQL client tools.",
                    request,
                )

        # Handle SQLite backups
        elif db_url.startswith("sqlite"):
            import sqlite3

            parsed = urlparse(db_url)
            if db_url.endswith(":memory:") or parsed.path in (":memory:", "/:memory:"):
                raise http_error(
                    400,
                    ErrorCode.BAD_REQUEST,
                    "Cannot create file backup from in-memory SQLite database",
                    request,
                )

            db_path_str = parsed.path or ""
            # sqlite:///C:/... may parse as /C:/... on Windows
            if len(db_path_str) >= 3 and db_path_str[0] == "/" and db_path_str[2] == ":":
                db_path_str = db_path_str[1:]

            db_path = Path(db_path_str)
            if not db_path.is_absolute():
                db_path = (project_root / db_path).resolve()

            if not db_path.exists():
                raise http_error(
                    400,
                    ErrorCode.BAD_REQUEST,
                    f"SQLite database file not found: {db_path}",
                    request,
                )

            backup_filename = f"backup_{timestamp}.db"
            backup_path = backup_dir / backup_filename

            # Use SQLite online backup API for a consistent snapshot (WAL-safe)
            with sqlite3.connect(str(db_path)) as source_conn, sqlite3.connect(str(backup_path)) as target_conn:
                source_conn.backup(target_conn)

            file_size = backup_path.stat().st_size

            if encrypt:
                backup_service = BackupServiceEncrypted(backup_dir=backup_dir, enable_encryption=True)
                backup_name = f"backup_{timestamp}"

                backup_info = backup_service.create_encrypted_backup(
                    source_path=backup_path,
                    backup_name=backup_name,
                    metadata={
                        "database_type": "sqlite",
                        "database_path": str(db_path),
                        "backup_method": "sqlite_backup_api",
                        "encryption_enabled": True,
                    },
                )

                # Best effort cleanup on Windows where file handles can linger briefly
                try:
                    backup_path.unlink(missing_ok=True)
                except PermissionError:
                    logger.warning("Could not remove temporary SQLite dump due to file lock: %s", backup_path)

                return OperationResult(
                    success=True,
                    message="Encrypted SQLite backup created successfully",
                    details={
                        "filename": f"{backup_name}.enc",
                        "path": backup_info["backup_path"],
                        "original_size": backup_info["original_size"],
                        "encrypted_size": backup_info["encrypted_size"],
                        "encryption": "AES-256-GCM",
                        "timestamp": timestamp,
                        "compression_ratio": backup_info["compression_ratio"],
                        "database_type": "sqlite",
                    },
                )

            return OperationResult(
                success=True,
                message="SQLite backup created successfully",
                details={
                    "filename": backup_filename,
                    "path": str(backup_path),
                    "size": file_size,
                    "timestamp": timestamp,
                    "encryption": None,
                    "database_type": "sqlite",
                },
            )
        else:
            raise http_error(
                400,
                ErrorCode.BAD_REQUEST,
                f"Unsupported database type: {db_url.split(':')[0]}. Supported types: postgresql, sqlite.",
                request,
            )

    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to create database backup",
            request,
            context={"error": str(exc)},
        ) from exc


@router.get("/operations/database-backups")
async def list_database_backups(request: Request, _auth=Depends(require_control_admin)):
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = project_root / "backups" / "database"
    if not backup_dir.exists():
        return {"backups": [], "message": "No backups directory found"}
    backups = []
    backup_files = list(backup_dir.glob("*.db")) + list(backup_dir.glob("*.enc"))
    for backup_file in sorted(backup_files, key=lambda f: f.stat().st_mtime, reverse=True):
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


@router.get("/operations/database-backups/{backup_filename:path}/download")
async def download_database_backup(request: Request, backup_filename: str, _auth=Depends(require_control_admin)):
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    target_path = (backup_dir / backup_filename).resolve()
    if not target_path.is_relative_to(backup_dir):
        raise http_error(
            400,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Invalid backup filename",
            request,
            context={"filename": backup_filename},
        )
    if not target_path.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Backup file not found",
            request,
            context={"filename": backup_filename},
        )
    return FileResponse(target_path, media_type="application/octet-stream", filename=target_path.name)


@router.get("/operations/database-backups/archive.zip")
async def download_backups_zip(request: Request, _auth=Depends(require_control_admin)):
    import io
    import zipfile

    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    files = sorted(list(backup_dir.glob("*.db")) + list(backup_dir.glob("*.enc")), reverse=True)
    if not files:
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backup files found", request, context={})
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            zf.write(f, arcname=f.name)
    buf.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"sms_backups_{timestamp}.zip"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(buf, media_type="application/zip", headers=headers)


@router.post("/operations/database-backups/archive/save-to-path", response_model=OperationResult)
async def save_backups_zip_to_path(request: Request, payload: ZipSaveRequest, _auth=Depends(require_control_admin)):
    import io
    import zipfile

    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    files = sorted(list(backup_dir.glob("*.db")) + list(backup_dir.glob("*.enc")), reverse=True)
    if not files:
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backup files found", request, context={})
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            zf.write(f, arcname=f.name)
    buf.seek(0)
    raw_dest = (payload.destination or "").strip()
    if not raw_dest:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Destination path is required", request)
    # Reject absolute paths or traversal attempts before resolving
    raw_dest_path = Path(raw_dest)
    if raw_dest_path.is_absolute() or ".." in raw_dest_path.parts:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request)
    # Sanitize: prevent path traversal and restrict to allowed base directory
    allowed_base = (Path(__file__).resolve().parents[3] / "backups" / "exports").resolve()
    dest_candidate = (allowed_base / raw_dest).resolve()
    # Stricter path check: ensure resolved path is relative to allowed_base
    try:
        dest_candidate.relative_to(allowed_base)
    except ValueError:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request)
    if dest_candidate.exists() and dest_candidate.is_dir():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_{timestamp}.zip"
    elif dest_candidate.suffix.lower() == ".zip":
        dest_path = dest_candidate
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_{timestamp}.zip"
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, "wb") as out_f:
        out_f.write(buf.read())
    return OperationResult(
        success=True,
        message="Backups ZIP saved successfully",
        details={"destination": str(dest_path), "size": os.path.getsize(dest_path)},
    )


@router.post("/operations/database-backups/archive/selected.zip")
async def download_selected_backups_zip(
    request: Request, payload: ZipSelectedRequest, _auth=Depends(require_control_admin)
):
    import io
    import zipfile

    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    selected: List[Path] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not name.endswith((".db", ".enc")):
            continue
        if name in seen:
            continue
        seen.add(name)
        p = (backup_dir / name).resolve()
        if (not p.is_relative_to(backup_dir)) or (not p.exists()):
            continue
        selected.append(p)
    if not selected:
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No valid backup files selected", request)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in selected:
            zf.write(f, arcname=f.name)
    buf.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"sms_backups_selected_{timestamp}.zip"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(buf, media_type="application/zip", headers=headers)


@router.post("/operations/database-backups/archive/selected/save-to-path", response_model=OperationResult)
async def save_selected_backups_zip_to_path(
    request: Request, payload: ZipSelectedSaveRequest, _auth=Depends(require_control_admin)
):
    import io
    import zipfile

    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    selected: List[Path] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not name.endswith((".db", ".enc")):
            continue
        if name in seen:
            continue
        seen.add(name)
        p = (backup_dir / name).resolve()
        if (not p.is_relative_to(backup_dir)) or (not p.exists()):
            continue
        selected.append(p)
    if not selected:
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No valid backup files selected", request)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in selected:
            zf.write(f, arcname=f.name)
    buf.seek(0)
    raw_dest = (payload.destination or "").strip()
    if not raw_dest:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Destination path is required", request)
    raw_dest_path = Path(raw_dest)
    if raw_dest_path.is_absolute() or ".." in raw_dest_path.parts:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request)
    # Sanitize: prevent path traversal and restrict to allowed base directory
    allowed_base = (Path(__file__).resolve().parents[3] / "backups" / "exports").resolve()
    dest_candidate = (allowed_base / raw_dest).resolve()
    # Stricter path check: ensure resolved path is relative to allowed_base
    try:
        dest_candidate.relative_to(allowed_base)
    except ValueError:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request)
    if dest_candidate.exists() and dest_candidate.is_dir():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_selected_{timestamp}.zip"
    elif dest_candidate.suffix.lower() == ".zip":
        dest_path = dest_candidate
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_selected_{timestamp}.zip"
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, "wb") as out_f:
        out_f.write(buf.read())
    return OperationResult(
        success=True,
        message="Selected backups ZIP saved successfully",
        details={"destination": str(dest_path), "size": os.path.getsize(dest_path)},
    )


@router.post("/operations/database-backups/delete-selected", response_model=OperationResult)
async def delete_selected_backups(
    request: Request, payload: DeleteSelectedRequest, _auth=Depends(require_control_admin)
):
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    deleted: List[str] = []
    not_found: List[str] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not name.endswith((".db", ".enc")):
            continue
        if name in seen:
            continue
        seen.add(name)
        target = (backup_dir / name).resolve()
        if (backup_dir not in target.parents) or (not target.exists()):
            not_found.append(name)
            continue
        try:
            target.unlink()
            deleted.append(name)
        except Exception:
            not_found.append(name)
    if not deleted and not_found and len(not_found) == len(seen):
        return OperationResult(
            success=False,
            message="No valid backup files deleted",
            details={"deleted_count": 0, "deleted_files": deleted, "not_found": not_found},
        )
    return OperationResult(
        success=True,
        message=f"Deleted {len(deleted)} backup(s)",
        details={"deleted_count": len(deleted), "deleted_files": deleted, "not_found": not_found},
    )


@router.post("/operations/database-backups/{backup_filename:path}/save-to-path", response_model=OperationResult)
async def save_database_backup_to_path(
    request: Request, backup_filename: str, payload: BackupCopyRequest, _auth=Depends(require_control_admin)
):
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    # Reject any path traversal attempts outright and require a simple backup filename
    bf_path = Path(backup_filename)
    if (
        not backup_filename
        or bf_path.is_absolute()
        or ".." in bf_path.parts
        or bf_path.name != backup_filename
        or os.sep in backup_filename
        or (os.altsep is not None and os.altsep in backup_filename)
        or not backup_filename.endswith((".db", ".enc"))
    ):
        raise http_error(
            400,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Invalid backup filename",
            request,
            context={"filename": backup_filename},
        )
    source_path = (backup_dir / backup_filename).resolve()
    try:
        source_path.relative_to(backup_dir)
    except ValueError:
        raise http_error(
            400,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Invalid backup filename",
            request,
            context={"filename": backup_filename},
        )
    if not source_path.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Backup file not found",
            request,
            context={"filename": backup_filename},
        )
    raw_dest = payload.destination.strip()
    if not raw_dest:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Destination path is required", request, context={})
    dest_path_candidate = Path(raw_dest)
    # Only allow simple filenames (no directories, no absolute paths)
    if dest_path_candidate.is_absolute() or ".." in dest_path_candidate.parts or dest_path_candidate.name != raw_dest:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request, context={})

    allowed_base = (Path(__file__).resolve().parents[3] / "backups" / "exports").resolve()
    allowed_base.mkdir(parents=True, exist_ok=True)
    dest_path = (allowed_base / dest_path_candidate.name).resolve()
    try:
        dest_path.relative_to(allowed_base)
    except ValueError:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request, context={})
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    import shutil as _sh

    _sh.copy2(source_path, dest_path)
    return OperationResult(
        success=True,
        message="Backup copied successfully",
        details={"source": str(source_path), "destination": str(dest_path), "size": os.path.getsize(dest_path)},
    )


@router.post("/operations/database-restore", response_model=OperationResult)
async def restore_database(request: Request, backup_filename: str, _auth=Depends(require_control_admin)):
    import logging
    import shutil as _sh

    logger = logging.getLogger(__name__)
    try:
        from backend.config import settings
        from backend.scripts.migrate_sqlite_to_postgres import main as migrate_sqlite_to_postgres

        project_root = Path(__file__).resolve().parents[3]
        backup_dir = (project_root / "backups" / "database").resolve()
        # Reject traversal before resolving
        if (
            Path(backup_filename).name != backup_filename
            or Path(backup_filename).is_absolute()
            or ".." in Path(backup_filename).parts
        ):
            raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request)
        # Sanitize: prevent path traversal and restrict to allowed base directory
        backup_path = (backup_dir / backup_filename).resolve()
        # Stricter path check: ensure resolved path is relative to backup_dir
        try:
            backup_path.relative_to(backup_dir)
        except ValueError:
            raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request)
        from backend.logging_config import safe_log_context

        logger.info("Restore request received", extra=safe_log_context(backup_filename=backup_filename))
        if not backup_path.exists():
            raise http_error(404, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Backup file not found", request)

        # Handle encrypted backups (.enc files)
        decrypted_temp_path = None
        actual_backup_path = backup_path

        if backup_filename.endswith(".enc"):
            logger.info("Encrypted backup detected - decrypting before restore", extra={"backup_filename": backup_filename})
            try:
                backup_service = BackupServiceEncrypted(backup_dir=backup_dir, enable_encryption=True)

                # Decrypt to temporary file in backup directory
                backup_name = backup_filename.replace(".enc", "")
                decrypted_temp_path = backup_dir / f"uploaded_{datetime.now().strftime('%Y%m%d_%H%M%S')}_decrypted_backup.db"

                restore_info = backup_service.restore_encrypted_backup(
                    backup_name=backup_name,  # Pass without .enc (service adds it)
                    output_path=decrypted_temp_path,
                    allowed_base_dir=backup_dir
                )

                actual_backup_path = decrypted_temp_path
                logger.info("Decryption successful", extra={"decrypted_path": str(decrypted_temp_path), "size": restore_info["restored_size"]})

            except Exception as e:
                logger.error(f"Failed to decrypt backup: {e}", exc_info=True)
                if decrypted_temp_path and decrypted_temp_path.exists():
                    try:
                        decrypted_temp_path.unlink()
                    except Exception:
                        pass
                raise http_error(
                    500,
                    ErrorCode.CONTROL_RESTORE_FAILED,
                    f"Failed to decrypt backup: {str(e)}",
                    request,
                    context={"backup_filename": backup_filename}
                )

        # Verify it's a valid SQLite database
        with actual_backup_path.open("rb") as check_file:
            header = check_file.read(16)
        if not header.startswith(b"SQLite format 3"):
            # Clean up temp file if we created one
            if decrypted_temp_path and decrypted_temp_path.exists():
                try:
                    decrypted_temp_path.unlink()
                except Exception:
                    pass
            raise http_error(
                400,
                ErrorCode.CONTROL_INVALID_FILE_TYPE,
                "Backup file is not a valid SQLite database",
                request,
                context={"filename": backup_filename},
            )

        db_url = (settings.DATABASE_URL or "").strip().lower()
        if db_url.startswith("postgresql"):
            logger.info(
                "PostgreSQL deployment detected - starting automatic SQLite migration",
                extra={"backup_path": str(actual_backup_path)},
            )
            migration_rc = migrate_sqlite_to_postgres(
                [
                    "--sqlite-path",
                    str(actual_backup_path),
                    "--postgres-url",
                    settings.DATABASE_URL,
                    "--batch-size",
                    "1000",
                ]
            )

            # Clean up decrypted temp file if we created one
            if decrypted_temp_path and decrypted_temp_path.exists():
                try:
                    decrypted_temp_path.unlink()
                    logger.info("Cleaned up decrypted temp file", extra={"temp_path": str(decrypted_temp_path)})
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file: {e}")

            if migration_rc != 0:
                raise http_error(
                    500,
                    ErrorCode.CONTROL_RESTORE_FAILED,
                    "SQLite to PostgreSQL migration failed during restore",
                    request,
                    context={"exit_code": migration_rc, "backup_filename": backup_filename},
                )

            return OperationResult(
                success=True,
                message="SQLite backup restored and migrated to PostgreSQL successfully. Restart may be required.",
                details={
                    "restored_from": str(actual_backup_path),
                    "database_url": settings.DATABASE_URL,
                    "migration_mode": "sqlite_to_postgresql",
                },
            )

        db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
        logger.info("Database path resolved", extra={"db_path": str(db_path)})
        safety_backup = None
        if db_path.exists():
            safety_backup = db_path.with_suffix(
                f".before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}{db_path.suffix}"
            )
            logger.info("Creating safety backup", extra={"safety_backup": str(safety_backup)})
            try:
                _sh.copyfile(db_path, safety_backup)
                logger.info("Safety backup created with copyfile")
            except PermissionError as e:
                logger.warning("copyfile failed, trying copy", extra={"error": str(e)})
                _sh.copy(db_path, safety_backup)
                logger.info("Safety backup created with copy")
        try:
            from backend import db as db_module

            db_module.engine.dispose()
            logger.info("Engine disposed")
        except Exception as e:
            logger.warning("Engine dispose failed", extra={"error": str(e)})
        wal_path = db_path.with_suffix(db_path.suffix + "-wal")
        shm_path = db_path.with_suffix(db_path.suffix + "-shm")
        wal_path.unlink(missing_ok=True)
        shm_path.unlink(missing_ok=True)
        logger.info("WAL/SHM files removed")
        try:
            logger.info("Attempting restore with copyfile", extra={"source": str(actual_backup_path), "dest": str(db_path)})
            _sh.copyfile(actual_backup_path, db_path)
            logger.info("Restore completed with copyfile")
        except (PermissionError, OSError) as e:
            logger.warning("copyfile failed, trying copy", extra={"error": str(e)})
            _sh.copy(actual_backup_path, db_path)
            logger.info("Restore completed with copy")
        # Don't attempt chmod - may fail on Docker volumes with root-owned files
        try:
            from backend import db as db_module

            db_module.ensure_schema(db_module.engine)
            logger.info("Schema ensured")
        except Exception as e:
            logger.warning("Schema ensure failed", extra={"error": str(e)})

        # Ensure default admin account exists after restore
        try:
            from backend.scripts.admin.bootstrap import ensure_default_admin_account
            from sqlalchemy.orm import sessionmaker as sa_sessionmaker
            from sqlalchemy import create_engine as sa_create_engine

            # Create a fresh session with the restored database
            restore_engine = sa_create_engine(settings.DATABASE_URL, echo=False)
            RestoreSessionLocal = sa_sessionmaker(autocommit=False, autoflush=False, bind=restore_engine)

            def restore_session_factory():
                return RestoreSessionLocal()

            ensure_default_admin_account(settings=settings, session_factory=restore_session_factory, close_session=True)
            logger.info("Admin account ensured after restore")
        except Exception as e:
            logger.warning(f"Failed to ensure admin account after restore: {e}", exc_info=True)

        # CRITICAL: Reinitialize the application engine so it can connect to the restored database
        # Without this, the disposed engine leaves the app unable to serve requests
        try:
            from backend import db as db_module
            from backend import models

            # Close the temporary restore_engine to avoid resource leak
            try:
                restore_engine.dispose()
            except Exception:
                pass

            # Reinitialize db_module.engine using models.init_db() which properly configures
            # SQLite with NullPool, WAL mode, and other critical settings
            db_module.engine = models.init_db(settings.DATABASE_URL)
            db_module.SessionLocal.configure(bind=db_module.engine)
            logger.info("Database engine reinitialized for restored database")
        except Exception as e:
            logger.error(f"Failed to reinitialize database engine after restore: {e}", exc_info=True)
            raise http_error(500, ErrorCode.CONTROL_RESTORE_FAILED, "Failed to reinitialize database engine after restore", request, context={"error": str(e)}) from e

        # Clean up decrypted temp file if we created one
        if decrypted_temp_path and decrypted_temp_path.exists():
            try:
                decrypted_temp_path.unlink()
                logger.info("Cleaned up decrypted temp file", extra={"temp_path": str(decrypted_temp_path)})
            except Exception as e:
                logger.warning(f"Failed to clean up temp file: {e}")

        logger.info("Restore completed successfully")
        return OperationResult(
            success=True,
            message="Database restored successfully. Restart may be required.",
            details={
                "restored_from": backup_filename,  # Return original filename, not temp path
                "database_path": str(db_path),
                "safety_backup": str(safety_backup) if safety_backup else None,
                "was_encrypted": backup_filename.endswith(".enc"),
            },
        )
    except HTTPException:
        # Clean up decrypted temp file if we created one
        if 'decrypted_temp_path' in locals() and decrypted_temp_path and decrypted_temp_path.exists():
            try:
                decrypted_temp_path.unlink()
                logger.info("Cleaned up decrypted temp file after HTTPException")
            except Exception:
                pass
        raise
    except Exception as exc:
        # Clean up decrypted temp file if we created one
        if 'decrypted_temp_path' in locals() and decrypted_temp_path and decrypted_temp_path.exists():
            try:
                decrypted_temp_path.unlink()
                logger.info("Cleaned up decrypted temp file after exception")
            except Exception:
                pass
        logger.error("Restore failed", extra={"error": str(exc)}, exc_info=True)
        raise http_error(
            500, ErrorCode.CONTROL_RESTORE_FAILED, "Database restore failed", request, context={"error": str(exc)}
        ) from exc
