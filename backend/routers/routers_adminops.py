"""
Admin Operations Router
Provides backup, clear, and seed (insert) operations for the database.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import os
import shutil
from datetime import datetime
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/adminops", tags=["AdminOps"], responses={404: {"description": "Not found"}})

_THIS_FILE = Path(__file__).resolve()
_BACKEND_DIR = _THIS_FILE.parents[1]
_PROJECT_ROOT = _THIS_FILE.parents[2]

BACKUPS_DIR = str((_PROJECT_ROOT / "backups").resolve())
COURSES_DIR = str((_PROJECT_ROOT / "templates" / "courses").resolve())
STUDENTS_DIR = str((_PROJECT_ROOT / "templates" / "students").resolve())

from backend.db import get_session as get_db
from backend.db import engine as db_engine
from backend.rate_limiting import limiter, RATE_LIMIT_HEAVY
from .routers_auth import optional_require_role
from backend.import_resolver import import_names


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
def backup_database(request: Request, current_user=Depends(optional_require_role("admin"))):
    try:
        db_file = _get_db_file()
        if not os.path.isfile(db_file):
            raise HTTPException(status_code=404, detail=f"Database file not found: {db_file}")
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        target = os.path.join(BACKUPS_DIR, f"backup_{ts}.db")
        shutil.copyfile(db_file, target)
        logger.info(f"Database backup created: {target} (source: {db_file})")
        return {"backup_file": target, "source": db_file}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Backup failed")


@router.post("/restore")
@limiter.limit(RATE_LIMIT_HEAVY)
def restore_database(
    request: Request, file: UploadFile = File(...), current_user=Depends(optional_require_role("admin"))
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
    except Exception as e:
        logger.error(f"Restore failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Restore failed")


@router.post("/clear")
@limiter.limit(RATE_LIMIT_HEAVY)
def clear_database(
    request: Request,
    payload: ClearPayload,
    db: Session = Depends(get_db),
    current_user=Depends(optional_require_role("admin")),
):
    if not payload.confirm:
        raise HTTPException(status_code=400, detail="Confirmation required to clear database")
    try:
        Attendance, DailyPerformance, Grade, Highlight, CourseEnrollment, Course, Student = import_names(
            "models",
            "Attendance",
            "DailyPerformance",
            "Grade",
            "Highlight",
            "CourseEnrollment",
            "Course",
            "Student",
        )

        # Delete child tables first
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
        return {"status": "cleared", "scope": payload.scope}
    except Exception as e:
        db.rollback()
        logger.error(f"Clear failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Clear failed")
