from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from backend.errors import ErrorCode, http_error
from backend.config import get_settings
from .common import (
    docker_compose,
    check_docker_running,
    create_unique_volume,
    check_npm_installed,
    run_command,
)

router = APIRouter()


class OperationResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


@router.post("/operations/install-frontend-deps", response_model=OperationResult)
async def install_frontend_deps(request: Request):
    # Resolve project root (repository root)
    project_root = Path(__file__).resolve().parents[3]
    frontend_dir = project_root / "frontend"
    package_json = frontend_dir / "package.json"

    if not package_json.exists():
        raise http_error(404, ErrorCode.CONTROL_PACKAGE_JSON_MISSING, "package.json not found", request, context={"path": str(package_json)})

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
        raise http_error(400, ErrorCode.CONTROL_NPM_NOT_FOUND, "npm not found. Please install Node.js and npm (https://nodejs.org/)", request, context={"command": "npm --version"})

    success, stdout, stderr = run_command(["npm", "install"], timeout=300)
    if success:
        return OperationResult(success=True, message="Frontend dependencies installed successfully", details={"npm_version": npm_version, "directory": str(frontend_dir), "stdout": stdout[-500:] if len(stdout) > 500 else stdout})
    return OperationResult(success=False, message="npm install failed", details={"stdout": stdout[-500:] if len(stdout) > 500 else stdout, "stderr": stderr[-500:] if len(stderr) > 500 else stderr})


@router.post("/operations/install-backend-deps", response_model=OperationResult)
async def install_backend_deps(request: Request):
    project_root = Path(__file__).resolve().parents[3]
    backend_dir = project_root / "backend"
    requirements_file = backend_dir / "requirements.txt"

    if not requirements_file.exists():
        raise http_error(404, ErrorCode.CONTROL_REQUIREMENTS_MISSING, "requirements.txt not found", request, context={"path": str(requirements_file)})

    ok, stdout, _ = run_command(["pip", "--version"], timeout=5)
    if not ok:
        raise http_error(400, ErrorCode.CONTROL_PIP_NOT_FOUND, "pip not found", request, context={"command": "pip --version"})
    pip_version = stdout.strip()

    success, stdout, stderr = run_command(["pip", "install", "-r", str(requirements_file)], timeout=300)
    if success:
        return OperationResult(success=True, message="Backend dependencies installed successfully", details={"pip_version": pip_version, "requirements_file": str(requirements_file), "stdout": stdout[-500:] if len(stdout) > 500 else stdout})
    return OperationResult(success=False, message="pip install failed", details={"stdout": stdout[-500:] if len(stdout) > 500 else stdout, "stderr": stderr[-500:] if len(stderr) > 500 else stderr})


@router.post("/operations/docker-build", response_model=OperationResult)
async def docker_build(request: Request):
    # Backward-compat: allow tests to monkeypatch legacy symbol in routers_control
    try:
        import importlib
        ctrl = importlib.import_module("backend.routers.routers_control")
        check_docker = getattr(ctrl, "_check_docker_running", check_docker_running)
    except Exception:
        check_docker = check_docker_running

    if not check_docker():
        raise http_error(400, ErrorCode.CONTROL_DOCKER_NOT_RUNNING, "Docker is not running. Please start Docker Desktop.", request, context={"command": "docker info"})

    project_root = Path(__file__).resolve().parents[3]
    success, stdout, stderr = docker_compose(["build", "--no-cache"], cwd=project_root, timeout=600)
    if success:
        return OperationResult(success=True, message="Docker images built successfully", details={"stdout": stdout[-1000:] if len(stdout) > 1000 else stdout})
    return OperationResult(success=False, message="Docker build failed", details={"stdout": stdout[-1000:] if len(stdout) > 1000 else stdout, "stderr": stderr[-1000:] if len(stderr) > 1000 else stderr})


@router.post("/operations/database-upload", response_model=OperationResult)
async def upload_database(request: Request, file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".db"):
        raise http_error(400, ErrorCode.CONTROL_INVALID_FILE_TYPE, "Only .db files are allowed", request, context={"filename": file.filename})
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
        raise http_error(400, ErrorCode.CONTROL_INVALID_FILE_TYPE, "Uploaded file is not a valid SQLite database", request, context={"filename": file.filename})
    return OperationResult(success=True, message="Database uploaded successfully", details={"filename": dest_filename})


@router.post("/operations/docker-update-volume", response_model=OperationResult)
async def docker_update_volume(request: Request):
    # Backward-compat: allow tests to monkeypatch legacy symbol in routers_control
    try:
        import importlib
        ctrl = importlib.import_module("backend.routers.routers_control")
        check_docker = getattr(ctrl, "_check_docker_running", check_docker_running)
    except Exception:
        check_docker = check_docker_running

    if not check_docker():
        raise http_error(400, ErrorCode.CONTROL_DOCKER_NOT_RUNNING, "Docker is not running. Please start Docker Desktop.", request, context={"command": "docker info"})
    try:
        new_volume = create_unique_volume("sms_data")
        return OperationResult(success=True, message=f"New Docker volume created: {new_volume}", details={"volume_name": new_volume, "note": "Update docker-compose.yml to use the new volume and restart containers"})
    except Exception as exc:
        raise http_error(500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create Docker volume", request, context={"error": str(exc)}) from exc


# Backups suite (list/download/zip/save/delete/restore)

class ZipSaveRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full .zip path)")


class ZipSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup .db filenames to include in the ZIP")


class ZipSelectedSaveRequest(ZipSelectedRequest):
    destination: str = Field(description="Destination path (directory or full .zip path)")


class BackupCopyRequest(BaseModel):
    destination: str = Field(description="Destination path (directory or full file path) on the host machine")


class DeleteSelectedRequest(BaseModel):
    filenames: List[str] = Field(description="List of backup .db filenames to delete")


@router.post("/operations/database-backup", response_model=OperationResult)
async def create_database_backup(request: Request):
    """Create a new database backup (SQLite only)."""
    try:
        settings = get_settings()
        db_url = settings.DATABASE_URL
        
        # Only support sqlite URLs for file backup
        if not db_url.startswith("sqlite"):
            raise http_error(400, ErrorCode.BAD_REQUEST, "Backup supported only for SQLite database", request)
        
        # Extract filesystem path (sqlite:///path or sqlite:////abs/path)
        path_part = db_url.split("sqlite:///", 1)[-1] if "sqlite:///" in db_url else db_url.split("sqlite:", 1)[-1]
        db_path = Path(path_part.lstrip("/") if os.name == "nt" else path_part)
        
        if not db_path.exists():
            raise http_error(404, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Database file not found", request, context={"db_path": str(db_path)})
        
        # Create backups directory if it doesn't exist
        project_root = Path(__file__).resolve().parents[3]
        backup_dir = project_root / "backups" / "database"
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"student_management.backup_{timestamp}.db"
        backup_path = backup_dir / backup_filename
        
        # Copy database file
        import shutil
        shutil.copy2(db_path, backup_path)
        
        # Get file size for response
        file_size = backup_path.stat().st_size
        
        return OperationResult(
            success=True,
            message="Database backup created successfully",
            details={
                "filename": backup_filename,
                "path": str(backup_path),
                "size": file_size,
                "timestamp": timestamp
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise http_error(500, ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create database backup", request, context={"error": str(exc)}) from exc


@router.get("/operations/database-backups")
async def list_database_backups(request: Request):
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = project_root / "backups" / "database"
    if not backup_dir.exists():
        return {"backups": [], "message": "No backups directory found"}
    backups = []
    for backup_file in sorted(backup_dir.glob("*.db"), reverse=True):
        stat = backup_file.stat()
        backups.append({"filename": backup_file.name, "path": str(backup_file), "size": stat.st_size, "created": datetime.fromtimestamp(stat.st_mtime).isoformat()})
    return {"backups": backups, "total": len(backups)}


@router.get("/operations/database-backups/{backup_filename}/download")
async def download_database_backup(request: Request, backup_filename: str):
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    target_path = (backup_dir / backup_filename).resolve()
    if not target_path.is_relative_to(backup_dir):
        raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request, context={"filename": backup_filename})
    if not target_path.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Backup file not found", request, context={"filename": backup_filename})
    return FileResponse(target_path, media_type="application/octet-stream", filename=target_path.name)


@router.get("/operations/database-backups/archive.zip")
async def download_backups_zip(request: Request):
    import io
    import zipfile
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    files = sorted(backup_dir.glob("*.db"), reverse=True)
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
async def save_backups_zip_to_path(request: Request, payload: ZipSaveRequest):
    import io
    import zipfile
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    files = sorted(backup_dir.glob("*.db"), reverse=True)
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
    dest_candidate = Path(raw_dest)
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
    return OperationResult(success=True, message="Backups ZIP saved successfully", details={"destination": str(dest_path), "size": os.path.getsize(dest_path)})


@router.post("/operations/database-backups/archive/selected.zip")
async def download_selected_backups_zip(request: Request, payload: ZipSelectedRequest):
    import io
    import zipfile
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    selected: List[Path] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not name.endswith('.db'):
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
async def save_selected_backups_zip_to_path(request: Request, payload: ZipSelectedSaveRequest):
    import io
    import zipfile
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    selected: List[Path] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not name.endswith('.db'):
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
    dest_candidate = Path(raw_dest)
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
    return OperationResult(success=True, message="Selected backups ZIP saved successfully", details={"destination": str(dest_path), "size": os.path.getsize(dest_path)})


@router.post("/operations/database-backups/delete-selected", response_model=OperationResult)
async def delete_selected_backups(request: Request, payload: DeleteSelectedRequest):
    project_root = Path(__file__).resolve().parents[3]
    backup_dir = (project_root / "backups" / "database").resolve()
    if not backup_dir.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_LIST_FAILED, "No backups directory found", request, context={})
    deleted: List[str] = []
    not_found: List[str] = []
    seen = set()
    for name in payload.filenames or []:
        if not isinstance(name, str) or not name.endswith('.db'):
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
        return OperationResult(success=False, message="No valid backup files deleted", details={"deleted_count": 0, "deleted_files": deleted, "not_found": not_found})
    return OperationResult(success=True, message=f"Deleted {len(deleted)} backup(s)", details={"deleted_count": len(deleted), "deleted_files": deleted, "not_found": not_found})


@router.post("/operations/database-backups/{backup_filename}/save-to-path", response_model=OperationResult)
async def save_database_backup_to_path(request: Request, backup_filename: str, payload: BackupCopyRequest):
    project_root = Path(__file__).parent.parent.parent
    backup_dir = (project_root / "backups" / "database").resolve()
    source_path = (backup_dir / backup_filename).resolve()
    if not source_path.is_relative_to(backup_dir):
        raise http_error(400, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Invalid backup filename", request, context={"filename": backup_filename})
    if not source_path.exists():
        raise http_error(404, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Backup file not found", request, context={"filename": backup_filename})
    raw_dest = payload.destination.strip()
    if not raw_dest:
        raise http_error(400, ErrorCode.BAD_REQUEST, "Destination path is required", request, context={})
    dest_candidate = Path(raw_dest)
    if dest_candidate.exists() and dest_candidate.is_dir():
        dest_path = dest_candidate / source_path.name
    elif dest_candidate.suffix and len(dest_candidate.suffix) > 0:
        dest_path = dest_candidate
    else:
        dest_path = dest_candidate / source_path.name
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    import shutil as _sh
    _sh.copy2(source_path, dest_path)
    return OperationResult(success=True, message="Backup copied successfully", details={"source": str(source_path), "destination": str(dest_path), "size": os.path.getsize(dest_path)})


@router.post("/operations/database-restore", response_model=OperationResult)
async def restore_database(request: Request, backup_filename: str):
    try:
        from backend.config import settings
        project_root = Path(__file__).resolve().parents[3]
        backup_dir = project_root / "backups" / "database"
        backup_path = backup_dir / backup_filename
        if not backup_path.exists():
            raise http_error(404, ErrorCode.CONTROL_BACKUP_NOT_FOUND, "Backup file not found", request)
        db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
        safety_backup = None
        if db_path.exists():
            safety_backup = db_path.with_suffix(f".before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}{db_path.suffix}")
            import shutil as _sh
            _sh.copy2(db_path, safety_backup)
        try:
            from backend import db as db_module
            db_module.engine.dispose()
        except Exception:
            pass
        wal_path = db_path.with_suffix(db_path.suffix + "-wal")
        shm_path = db_path.with_suffix(db_path.suffix + "-shm")
        wal_path.unlink(missing_ok=True)
        shm_path.unlink(missing_ok=True)
        import shutil as _sh
        _sh.copy2(backup_path, db_path)
        try:
            from backend import db as db_module
            db_module.ensure_schema(db_module.engine)
        except Exception:
            pass
        return OperationResult(success=True, message="Database restored successfully. Restart may be required.", details={"restored_from": str(backup_path), "database_path": str(db_path), "safety_backup": str(safety_backup) if safety_backup else None})
    except Exception as exc:
        raise http_error(500, ErrorCode.CONTROL_RESTORE_FAILED, "Database restore failed", request, context={"error": str(exc)}) from exc
