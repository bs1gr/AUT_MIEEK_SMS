"""
Admin Operations Router
Provides backup, clear, and seed (insert) operations for the database.
"""

import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import engine as db_engine
from backend.db import get_session as get_db
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names
from backend.rate_limiting import RATE_LIMIT_HEAVY, limiter
from backend.security.permissions import optional_require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/adminops", tags=["AdminOps"], responses={404: {"description": "Not found"}})

_THIS_FILE = Path(__file__).resolve()
_BACKEND_DIR = _THIS_FILE.parents[1]
_PROJECT_ROOT = _THIS_FILE.parents[2]

BACKUPS_DIR = str((_PROJECT_ROOT / "backups").resolve())
COURSES_DIR = str((_PROJECT_ROOT / "templates" / "courses").resolve())
STUDENTS_DIR = str((_PROJECT_ROOT / "templates" / "students").resolve())


class ClearPayload(BaseModel):
    confirm: bool = False
    scope: Optional[str] = "all"  # 'all' | 'data_only'


def _get_db_file() -> str:
    try:
        db_path = getattr(getattr(db_engine, "url", None), "database", None)
        if db_path:
            return str(Path(db_path).resolve())
    except Exception:
        pass
    # Fallback to backend-local sqlite file name
    return str((_BACKEND_DIR / "student_management.db").resolve())


@router.post("/backup")
@limiter.limit(RATE_LIMIT_HEAVY)
def backup_database(
    request: Request,
    current_user=Depends(optional_require_permission("adminops:backup")),
):
    try:
        db_file = _get_db_file()
        if not os.path.isfile(db_file):
            raise http_error(
                404,
                ErrorCode.ADMINOPS_DB_NOT_FOUND,
                "Database file not found",
                request,
                context={"path": db_file},
            )
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        target = os.path.join(BACKUPS_DIR, f"backup_{ts}.db")

        # Use SQLite backup API to handle WAL mode correctly
        # (file copy in WAL mode only copies schema-only snapshot without data)
        import sqlite3

        try:
            source_db = sqlite3.connect(db_file)
            target_db = sqlite3.connect(target)
            with target_db:
                source_db.backup(target_db)
            source_db.close()
            target_db.close()
            logger.info("Database backup created: %s (source: %s)", target, db_file)
        except Exception as backup_error:
            logger.warning("SQLite backup API failed, using fallback copy", extra={"error": str(backup_error)})
            # Fallback: simple file copy (may be incomplete in WAL mode but better than nothing)
            shutil.copyfile(db_file, target)
            logger.info("Database backup created (fallback): %s (source: %s)", target, db_file)

        return {"backup_file": target, "source": db_file}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Backup failed: %s", exc, exc_info=True)
        raise http_error(500, ErrorCode.ADMINOPS_BACKUP_FAILED, "Backup failed", request)


@router.post("/restore")
@limiter.limit(RATE_LIMIT_HEAVY)
def restore_database(
    request: Request,
    file: UploadFile = File(...),
    current_user=Depends(optional_require_permission("adminops:restore")),
):
    """
    Restore the SQLite database from an uploaded .db file.
    Steps:
    - Save uploaded file to a temporary path under backups directory
    - Dispose current engine connections to release file lock
    - Backup current DB to a timestamped file
    - Replace DB_FILE with uploaded file
    """
    try:
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        # Save upload to temp
        temp_target = os.path.join(BACKUPS_DIR, f"uploaded_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
        with open(temp_target, "wb") as out:
            chunk = file.file.read(1024 * 1024)
            while chunk:
                out.write(chunk)
                chunk = file.file.read(1024 * 1024)

        # Best-effort: dispose current connections to release SQLite locks
        try:
            db_engine.dispose()
        except Exception:
            pass

        # Backup current DB
        db_file = _get_db_file()
        if os.path.isfile(db_file):
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_before = os.path.join(BACKUPS_DIR, f"auto_before_restore_{ts}.db")
            shutil.copyfile(db_file, backup_before)

        # Replace database file
        shutil.copyfile(temp_target, db_file)
        logger.info(f"Database restored from {temp_target} -> {db_file}")
        return {"status": "restored", "source": temp_target, "target": db_file}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Restore failed: %s", exc, exc_info=True)
        raise http_error(500, ErrorCode.ADMINOPS_RESTORE_FAILED, "Restore failed", request)


@router.post("/clear")
@limiter.limit(RATE_LIMIT_HEAVY)
def clear_database(
    request: Request,
    payload: ClearPayload,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_permission("adminops:clear")),
):
    if not payload.confirm:
        raise http_error(
            400,
            ErrorCode.ADMINOPS_CONFIRM_REQUIRED,
            "Confirmation required to clear database",
            request,
        )
    try:
        (
            Attendance,
            DailyPerformance,
            Grade,
            Highlight,
            CourseEnrollment,
            Course,
            Student,
        ) = import_names(
            "models",
            "Attendance",
            "DailyPerformance",
            "Grade",
            "Highlight",
            "CourseEnrollment",
            "Course",
            "Student",
        )

        # Delete child tables first (maintains referential integrity)
        db.query(Attendance).delete(synchronize_session=False)
        db.query(DailyPerformance).delete(synchronize_session=False)
        db.query(Grade).delete(synchronize_session=False)
        db.query(Highlight).delete(synchronize_session=False)
        db.query(CourseEnrollment).delete(synchronize_session=False)
        # Depending on scope, optionally keep courses/students
        if payload.scope == "all":
            db.query(Course).delete(synchronize_session=False)
            db.query(Student).delete(synchronize_session=False)
        db.commit()
        logger.info(f"Database cleared successfully with scope: {payload.scope}")
        return {"status": "cleared", "scope": payload.scope}
    except Exception as exc:
        db.rollback()
        logger.error("Clear failed: %s", exc, exc_info=True)
        # Re-raise HTTPException without wrapping
        if isinstance(exc, HTTPException):
            raise
        raise http_error(500, ErrorCode.ADMINOPS_CLEAR_FAILED, "Clear failed", request)
