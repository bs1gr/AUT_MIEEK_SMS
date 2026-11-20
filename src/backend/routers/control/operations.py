from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import unquote, urlparse

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from backend.config import get_settings
from backend.control_auth import require_control_admin, require_signed_in_control_admin
from backend.errors import ErrorCode, http_error
from backend.services import database_backup
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
def install_frontend_deps(request: Request, _auth=Depends(require_control_admin)):
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

    success, stdout, stderr = run_command(["npm", "install"], timeout=300, allow_active_binaries=True)
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
def install_backend_deps(request: Request, _auth=Depends(require_control_admin)):
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
def docker_build(request: Request, _auth=Depends(require_control_admin)):
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
    success, stdout, stderr = docker_compose(
        ["build", "--no-cache"], cwd=project_root, timeout=600, allow_active_binaries=True
    )
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
def upload_database(request: Request, file: UploadFile = File(...), _auth=Depends(require_signed_in_control_admin)):
    if not file.filename or not file.filename.lower().endswith(".db"):
        raise http_error(
            400,
            ErrorCode.CONTROL_INVALID_FILE_TYPE,
            "Only .db files are allowed",
            request,
            context={"filename": file.filename},
        )
    backups_dir = Path(get_settings().BACKUPS_DIR) / "database"
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
def docker_update_volume(request: Request, _auth=Depends(require_control_admin)):
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
            500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create Docker volume", request
        ) from exc


# Backups suite (list/download/zip/save/delete/restore)


class ZipSaveRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full .zip path)")


class ZipSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup filenames (.db, .sql, or .enc) to include in the ZIP")


class ZipSelectedSaveRequest(ZipSelectedRequest):
    destination: str = Field(description="Destination path (directory or full .zip path)")


class BackupCopyRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full file path) on the host machine")


class DeleteSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup filenames (.db, .sql, or .enc) to delete")


_BACKUP_FILE_SUFFIXES = (".db", ".enc", ".sql", ".sql.gz")


def _is_supported_backup_filename(filename: str) -> bool:
    return filename.endswith(_BACKUP_FILE_SUFFIXES)


def _list_backup_files(backup_dir: Path) -> List[Path]:
    files: List[Path] = []
    for entry in backup_dir.iterdir():
        if entry.is_file() and _is_supported_backup_filename(entry.name):
            files.append(entry)
    return files


@router.post("/operations/database-backup", response_model=OperationResult)
async def create_database_backup(
    request: Request,
    encrypt: bool = Query(True, description="Enable AES-256 encryption for backup"),
    _auth=Depends(require_signed_in_control_admin),
):
    """
    Create a new database backup.

    Supports PostgreSQL (`pg_dump`, or the data-only backup the application restores itself
    when the client tools are missing) and SQLite (consistent file snapshot). The work is in
    `backend.services.database_backup`, which the automatic backup uses as well.

    Args:
        encrypt: Whether to encrypt the backup with AES-256-GCM (default: True)

    Returns:
        OperationResult with backup details including encryption status

    Raises:
        400: If the database cannot be backed up this way (unsupported URL, in-memory SQLite)
        500: If the backup fails
    """
    try:
        # A dump can take a while (pg_dump over the network): not on the event loop.
        result = await run_in_threadpool(database_backup.create_database_backup, encrypt=encrypt)
    except database_backup.DatabaseBackupError as exc:
        code = ErrorCode.BAD_REQUEST if exc.status_code == 400 else ErrorCode.INTERNAL_SERVER_ERROR
        raise http_error(exc.status_code, code, exc.message, request) from exc
    except Exception as exc:
        # The reason goes to the log: the answer does not carry it, and until now nothing
        # did (a backup that failed left "Status: 500" and no cause).
        logger.exception("Database backup failed")
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to create database backup",
            request,
        ) from exc
    return OperationResult(success=True, message=result["message"], details=result["details"])


@router.get("/operations/database-backups")
def list_database_backups(request: Request, _auth=Depends(require_signed_in_control_admin)):
    backup_dir = Path(get_settings().BACKUPS_DIR) / "database"
    # What the automatic backup is set to and when it last ran, for the same page.
    automatic = database_backup.automatic_backup_status(backup_dir)
    # is_dir, not exists: when the folder cannot be used (a file stands in its place, or the
    # path is broken) the backups fail, and this page is where the administrator comes to see
    # why. It answered 500 then.
    if not backup_dir.is_dir():
        return {"backups": [], "message": "No backups directory found", "automatic": automatic}
    backups = []
    backup_files = _list_backup_files(backup_dir)
    for backup_file in sorted(backup_files, key=lambda f: f.stat().st_mtime, reverse=True):
        stat = backup_file.stat()
        backups.append(
            {
                "filename": backup_file.name,
                "path": str(backup_file),
                "size": stat.st_size,
                # With the UTC offset: a bare time was read by the browser as its own local
                # time, so a backup made on a server running on UTC showed hours early.
                "created": database_backup.file_time_iso(backup_file),
            }
        )
    return {"backups": backups, "total": len(backups), "automatic": automatic}


@router.get("/operations/database-backups/{backup_filename:path}/download")
def download_database_backup(request: Request, backup_filename: str, _auth=Depends(require_signed_in_control_admin)):
    backup_dir = (Path(get_settings().BACKUPS_DIR) / "database").resolve()
    # codeql[py/path-injection] validated against the allowed base directory in this function
    target_path = (backup_dir / backup_filename).resolve()
    if not target_path.is_relative_to(backup_dir):
        raise http_error(
            400,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Invalid backup filename",
            request,
            context={"filename": backup_filename},
        )
    # codeql[py/path-injection] validated against the allowed base directory in this function
    if not target_path.exists():
        raise http_error(
            404,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Backup file not found",
            request,
            context={"filename": backup_filename},
        )
    # codeql[py/path-injection] validated against the allowed base directory in this function
    return FileResponse(target_path, media_type="application/octet-stream", filename=target_path.name)


@router.get("/operations/database-backups/archive.zip")
def download_backups_zip(request: Request, _auth=Depends(require_signed_in_control_admin)):
    import io
    import zipfile

    backup_dir = (Path(get_settings().BACKUPS_DIR) / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    files = sorted(_list_backup_files(backup_dir), reverse=True)
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
def save_backups_zip_to_path(request: Request, payload: ZipSaveRequest, _auth=Depends(require_signed_in_control_admin)):
    import io
    import zipfile

    backup_dir = (Path(get_settings().BACKUPS_DIR) / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    files = sorted(_list_backup_files(backup_dir), reverse=True)
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
    allowed_base = (Path(get_settings().BACKUPS_DIR) / "exports").resolve()
    # codeql[py/path-injection] validated against the allowed base directory in this function
    dest_candidate = (allowed_base / raw_dest).resolve()
    # Stricter path check: ensure resolved path is relative to allowed_base
    try:
        dest_candidate.relative_to(allowed_base)
    except ValueError:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request)
    # codeql[py/path-injection] validated against the allowed base directory in this function
    if dest_candidate.exists() and dest_candidate.is_dir():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_{timestamp}.zip"
    elif dest_candidate.suffix.lower() == ".zip":
        dest_path = dest_candidate
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_{timestamp}.zip"
    # codeql[py/path-injection] validated against the allowed base directory in this function
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    # codeql[py/path-injection] validated against the allowed base directory in this function
    with open(dest_path, "wb") as out_f:
        out_f.write(buf.read())
    return OperationResult(
        success=True,
        message="Backups ZIP saved successfully",
        # codeql[py/path-injection] validated against the allowed base directory in this function
        details={"destination": str(dest_path), "size": os.path.getsize(dest_path)},
    )


@router.post("/operations/database-backups/archive/selected.zip")
def download_selected_backups_zip(
    request: Request, payload: ZipSelectedRequest, _auth=Depends(require_signed_in_control_admin)
):
    import io
    import zipfile

    backup_dir = (Path(get_settings().BACKUPS_DIR) / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    selected: List[Path] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not _is_supported_backup_filename(name):
            continue
        if name in seen:
            continue
        seen.add(name)
        # codeql[py/path-injection] validated against the allowed base directory in this function
        p = (backup_dir / name).resolve()
        # codeql[py/path-injection] validated against the allowed base directory in this function
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
def save_selected_backups_zip_to_path(
    request: Request, payload: ZipSelectedSaveRequest, _auth=Depends(require_signed_in_control_admin)
):
    import io
    import zipfile

    backup_dir = (Path(get_settings().BACKUPS_DIR) / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    selected: List[Path] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not _is_supported_backup_filename(name):
            continue
        if name in seen:
            continue
        seen.add(name)
        # codeql[py/path-injection] validated against the allowed base directory in this function
        p = (backup_dir / name).resolve()
        # codeql[py/path-injection] validated against the allowed base directory in this function
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
    allowed_base = (Path(get_settings().BACKUPS_DIR) / "exports").resolve()
    # codeql[py/path-injection] validated against the allowed base directory in this function
    dest_candidate = (allowed_base / raw_dest).resolve()
    # Stricter path check: ensure resolved path is relative to allowed_base
    try:
        dest_candidate.relative_to(allowed_base)
    except ValueError:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request)
    # codeql[py/path-injection] validated against the allowed base directory in this function
    if dest_candidate.exists() and dest_candidate.is_dir():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_selected_{timestamp}.zip"
    elif dest_candidate.suffix.lower() == ".zip":
        dest_path = dest_candidate
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_path = dest_candidate / f"sms_backups_selected_{timestamp}.zip"
    # codeql[py/path-injection] validated against the allowed base directory in this function
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    # codeql[py/path-injection] validated against the allowed base directory in this function
    with open(dest_path, "wb") as out_f:
        out_f.write(buf.read())
    return OperationResult(
        success=True,
        message="Selected backups ZIP saved successfully",
        # codeql[py/path-injection] validated against the allowed base directory in this function
        details={"destination": str(dest_path), "size": os.path.getsize(dest_path)},
    )


@router.post("/operations/database-backups/delete-selected", response_model=OperationResult)
def delete_selected_backups(
    request: Request, payload: DeleteSelectedRequest, _auth=Depends(require_signed_in_control_admin)
):
    backup_dir = (Path(get_settings().BACKUPS_DIR) / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    deleted: List[str] = []
    not_found: List[str] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not _is_supported_backup_filename(name):
            continue
        if name in seen:
            continue
        seen.add(name)
        # codeql[py/path-injection] validated against the allowed base directory in this function
        target = (backup_dir / name).resolve()
        # codeql[py/path-injection] validated against the allowed base directory in this function
        if (backup_dir not in target.parents) or (not target.exists()):
            not_found.append(name)
            continue
        try:
            # codeql[py/path-injection] validated against the allowed base directory in this function
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
def save_database_backup_to_path(
    request: Request, backup_filename: str, payload: BackupCopyRequest, _auth=Depends(require_signed_in_control_admin)
):
    backup_dir = (Path(get_settings().BACKUPS_DIR) / "database").resolve()
    # Reject any path traversal attempts outright and require a simple backup filename
    bf_path = Path(backup_filename)
    if (
        not backup_filename
        or bf_path.is_absolute()
        or ".." in bf_path.parts
        or bf_path.name != backup_filename
        or os.sep in backup_filename
        or (os.altsep is not None and os.altsep in backup_filename)
        or not _is_supported_backup_filename(backup_filename)
    ):
        raise http_error(
            400,
            ErrorCode.CONTROL_BACKUP_NOT_FOUND,
            "Invalid backup filename",
            request,
            context={"filename": backup_filename},
        )
    # codeql[py/path-injection] validated against the allowed base directory in this function
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
    # codeql[py/path-injection] validated against the allowed base directory in this function
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

    allowed_base = (Path(get_settings().BACKUPS_DIR) / "exports").resolve()
    allowed_base.mkdir(parents=True, exist_ok=True)
    # codeql[py/path-injection] validated against the allowed base directory in this function
    dest_path = (allowed_base / dest_path_candidate.name).resolve()
    try:
        dest_path.relative_to(allowed_base)
    except ValueError:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Invalid destination path", request, context={})
    # codeql[py/path-injection] validated against the allowed base directory in this function
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    import shutil as _sh

    # codeql[py/path-injection] validated against the allowed base directory in this function
    _sh.copy2(source_path, dest_path)
    return OperationResult(
        success=True,
        message="Backup copied successfully",
        # codeql[py/path-injection] validated against the allowed base directory in this function
        details={"source": str(source_path), "destination": str(dest_path), "size": os.path.getsize(dest_path)},
    )


def _postgres_instance_from_url(database_url: str) -> Dict[str, Any]:
    """Build a database_manager instance dict from a PostgreSQL DATABASE_URL."""
    parsed = urlparse(database_url)
    query = dict(item.split("=", 1) for item in (parsed.query or "").split("&") if "=" in item)
    return {
        "name": "primary",
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "user": unquote(parsed.username) if parsed.username else "",
        "password": unquote(parsed.password) if parsed.password else "",
        "dbname": (parsed.path or "").lstrip("/"),
        "sslmode": query.get("sslmode", "prefer"),
    }


def _restore_postgres_backup(request: Request, backup_path: Path, backup_filename: str) -> OperationResult:
    """Restore a PostgreSQL backup through the same engine the Database panel uses.

    Kept separate from the SQLite path: this endpoint accepted SQLite files only, so every
    PostgreSQL backup /operations/database-backup produced was unrestorable in the app.
    """
    import gzip

    from backend.config import settings
    from backend.services.database_manager import restore_sql_content

    database_url = (settings.DATABASE_URL or "").strip()
    if not database_url.lower().startswith("postgresql"):
        raise http_error(
            400,
            ErrorCode.CONTROL_INVALID_FILE_TYPE,
            "This backup is not a SQLite database, and this deployment does not use PostgreSQL, "
            "so there is nothing it can be restored into. Nothing was changed.",
            request,
            context={"filename": backup_filename},
        )

    backup_root = os.path.realpath(Path(settings.BACKUPS_DIR) / "database")
    safe_path = os.path.realpath(backup_path)
    if not safe_path.startswith(backup_root + os.sep):
        raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request)

    try:
        if safe_path.endswith(".gz"):
            with gzip.open(safe_path, "rt", encoding="utf-8") as handle:
                content = handle.read()
        else:
            with open(safe_path, encoding="utf-8") as handle:
                content = handle.read()
    except (OSError, UnicodeDecodeError) as exc:
        raise http_error(
            400,
            ErrorCode.CONTROL_INVALID_FILE_TYPE,
            "Backup file is neither a SQLite database nor a readable PostgreSQL backup. "
            "Nothing was changed.",
            request,
            context={"filename": backup_filename, "error": str(exc)},
        )

    try:
        result = restore_sql_content(_postgres_instance_from_url(database_url), content)
    except ValueError as exc:
        # An unrestorable file - the old CSV data exports - refused before anything ran.
        raise http_error(
            400,
            ErrorCode.CONTROL_INVALID_FILE_TYPE,
            str(exc),
            request,
            context={"filename": backup_filename},
        )

    if not result.get("success"):
        raise http_error(
            500,
            ErrorCode.CONTROL_RESTORE_FAILED,
            result.get("error", "PostgreSQL restore failed. Nothing was changed."),
            request,
            context={"filename": backup_filename},
        )

    if result.get("method") == "psql":
        # psql does not count rows; "0 rows across 0 tables" was what a failed one said too.
        message = "PostgreSQL backup (a pg_dump script) applied with psql, in one transaction."
    else:
        message = (
            f"PostgreSQL backup restored: {result.get('rows', 0)} rows across {result.get('tables', 0)} tables."
        )

    return OperationResult(
        success=True,
        message=message,
        details={
            "filename": backup_filename,
            "database_type": "postgresql",
            "restore_method": result.get("method"),
            "tables": result.get("tables"),
            "rows": result.get("rows"),
            "alembic_version": result.get("alembic_version"),
        },
    )


@router.post("/operations/database-restore", response_model=OperationResult)
def restore_database(request: Request, backup_filename: str, _auth=Depends(require_signed_in_control_admin)):
    import logging
    import shutil as _sh

    logger = logging.getLogger(__name__)
    try:
        from backend.config import settings
        from backend.scripts.migrate_sqlite_to_postgres import main as migrate_sqlite_to_postgres

        backup_dir = (Path(settings.BACKUPS_DIR) / "database").resolve()
        # Reject traversal before resolving
        if (
            Path(backup_filename).name != backup_filename
            or Path(backup_filename).is_absolute()
            or ".." in Path(backup_filename).parts
        ):
            raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request)
        # Sanitize: prevent path traversal and restrict to allowed base directory
        # codeql[py/path-injection] validated against the allowed base directory in this function
        backup_path = (backup_dir / backup_filename).resolve()
        # Stricter path check: ensure resolved path is relative to backup_dir
        try:
            backup_path.relative_to(backup_dir)
        except ValueError:
            raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request)
        from backend.logging_config import safe_log_context

        logger.info("Restore request received", extra=safe_log_context(backup_filename=backup_filename))
        # codeql[py/path-injection] validated against the allowed base directory in this function
        if not backup_path.exists():
            raise http_error(404, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Backup file not found", request)

        # Handle encrypted backups (.enc files)
        decrypted_temp_path = None
        actual_backup_path = backup_path

        if backup_filename.endswith(".enc"):
            logger.info(
                "Encrypted backup detected - decrypting before restore", extra={"backup_filename": backup_filename}
            )
            try:
                backup_service = BackupServiceEncrypted(backup_dir=backup_dir, enable_encryption=True)

                # Decrypt to temporary file in backup directory
                backup_name = backup_filename.replace(".enc", "")
                decrypted_temp_path = (
                    backup_dir / f"uploaded_{datetime.now().strftime('%Y%m%d_%H%M%S')}_decrypted_backup.db"
                )

                restore_info = backup_service.restore_encrypted_backup(
                    backup_name=backup_name,  # Pass without .enc (service adds it)
                    output_path=decrypted_temp_path,
                    allowed_base_dir=backup_dir,
                )

                # The encrypted backup service reconstructs the destination from
                # the trusted base directory, so use the returned safe path for
                # the remaining validation, migration, and cleanup steps.
                actual_backup_path = Path(restore_info["restored_to"])
                decrypted_temp_path = actual_backup_path
                logger.info(
                    "Decryption successful",
                    extra={"decrypted_path": str(decrypted_temp_path), "size": restore_info["restored_size"]},
                )

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
                    context={"backup_filename": backup_filename},
                )

        def _cleanup_decrypted() -> None:
            if decrypted_temp_path and decrypted_temp_path.exists():
                try:
                    decrypted_temp_path.unlink()
                except Exception:
                    pass

        safe_backup_path = os.path.realpath(actual_backup_path)
        if not safe_backup_path.startswith(os.path.realpath(backup_dir) + os.sep):
            raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request)
        with open(safe_backup_path, "rb") as check_file:
            header = check_file.read(16)

        # A PostgreSQL backup made by /operations/database-backup is restored through the same
        # engine the Database panel uses. This endpoint used to accept SQLite files only, so no
        # PostgreSQL backup it produced could be restored anywhere in the app.
        if not header.startswith(b"SQLite format 3"):
            pg_result = _restore_postgres_backup(request, actual_backup_path, backup_filename)
            _cleanup_decrypted()
            return pg_result

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
                    # A restore replaces the database: say so explicitly (the tool refuses a
                    # non-empty destination otherwise).
                    "--truncate",
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
            logger.info(
                "Attempting restore with copyfile", extra={"source": str(actual_backup_path), "dest": str(db_path)}
            )
            # codeql[py/path-injection] validated against the allowed base directory in this function
            _sh.copyfile(actual_backup_path, db_path)
            logger.info("Restore completed with copyfile")
        except (PermissionError, OSError) as e:
            logger.warning("copyfile failed, trying copy", extra={"error": str(e)})
            # codeql[py/path-injection] validated against the allowed base directory in this function
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

            # The restored accounts are what their role rows say. A backup from an older
            # version can hold administrator and teacher accounts without their row: give
            # them it now, and not only at the next start.
            from backend.routers.routers_rbac import ensure_defaults_startup

            ensure_defaults_startup(restore_session_factory)
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
            raise http_error(
                500,
                ErrorCode.CONTROL_RESTORE_FAILED,
                "Failed to reinitialize database engine after restore",
                request,
            ) from e

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
        if "decrypted_temp_path" in locals() and decrypted_temp_path and decrypted_temp_path.exists():
            try:
                decrypted_temp_path.unlink()
                logger.info("Cleaned up decrypted temp file after HTTPException")
            except Exception:
                pass
        raise
    except Exception as exc:
        # Clean up decrypted temp file if we created one
        if "decrypted_temp_path" in locals() and decrypted_temp_path and decrypted_temp_path.exists():
            try:
                decrypted_temp_path.unlink()
                logger.info("Cleaned up decrypted temp file after exception")
            except Exception:
                pass
        logger.error("Restore failed", extra={"error": str(exc)}, exc_info=True)
        raise http_error(
            500, ErrorCode.CONTROL_RESTORE_FAILED, "Database restore failed", request
        ) from exc
