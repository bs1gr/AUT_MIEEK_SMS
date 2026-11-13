"""
Data-subject requests for a student (GDPR Articles 15 and 17): administrators only.

- ``GET  /data-subject/students/{id}/export``: everything the system holds about one student, as
  a JSON file the institution can hand over to answer an access request.
- ``DELETE /data-subject/students/{id}``: permanent erasure of the student and every record that
  hangs on them. Unlike the normal delete (which only hides the student), nothing is left.

Both look at soft-deleted rows too: a record that is merely hidden is still personal data.
Whether a request must be granted is the institution's decision (it may be obliged to keep
academic records); these endpoints only carry it out. Backups and semester archives made earlier
are outside the database and are not touched.
"""

import json
import logging
import re
from datetime import date, datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.errors import internal_server_error
from backend.models import (
    Attendance,
    AuditLog,
    Course,
    CourseEnrollment,
    DailyPerformance,
    Grade,
    Highlight,
    Student,
    StudentCoursePerformance,
    StudentPrivateNote,
)
from backend.rate_limiting import RATE_LIMIT_HEAVY, RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.security.current_user import may_see_health_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data-subject", tags=["Data subject requests"])

# Tables with one row per student and course (or per student); all carry student_id.
_STUDENT_TABLES = (
    ("enrollments", CourseEnrollment),
    ("grades", Grade),
    ("attendance", Attendance),
    ("daily_performance", DailyPerformance),
    ("highlights", Highlight),
    ("course_performance", StudentCoursePerformance),
)


def _administrators_only(allowed: bool) -> None:
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Data-subject requests are limited to administrators"
        )


def _find_student(db: Session, student_id: int):
    """The student, including one that was soft-deleted (it is still personal data)."""
    student = (
        db.query(Student).execution_options(include_deleted=True).filter(Student.id == student_id).first()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


def _plain(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    try:
        return float(value)  # Decimal
    except (TypeError, ValueError):
        return str(value)


def _row(obj: Any, skip: tuple[str, ...] = ()) -> Dict[str, Any]:
    """Every stored column of a row, so a column added later is exported without touching this."""
    return {
        column.name: _plain(getattr(obj, column.name))
        for column in obj.__table__.columns
        if column.name not in skip
    }


@router.get("/students/{student_id}/export")
@limiter.limit(RATE_LIMIT_HEAVY)
@require_permission("students:view")
async def export_student_data(
    request: Request,
    student_id: int,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(may_see_health_data),
):
    """Everything held about one student, as a JSON download (answers an access request)."""
    _administrators_only(is_admin)
    try:
        student = _find_student(db, student_id)
        courses = {
            course.id: {"course_code": course.course_code, "course_name": course.course_name, "semester": course.semester}
            for course in db.query(Course).execution_options(include_deleted=True).all()
        }

        def rows_of(model) -> List[Dict[str, Any]]:
            found = db.query(model).execution_options(include_deleted=True).filter(model.student_id == student.id).all()
            result = []
            for item in found:
                data = _row(item, skip=("student_id",))
                course_id = data.get("course_id")
                if course_id in courses:
                    data["course"] = courses[course_id]
                result.append(data)
            return result

        package: Dict[str, Any] = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "subject": "student",
                "note": (
                    "All records held about this student in the system's database, including records "
                    "that are hidden (soft-deleted). Staff members' private working notes and earlier "
                    "backups are not part of this file."
                ),
            },
            "student": _row(student),
        }
        for name, model in _STUDENT_TABLES:
            package[name] = rows_of(model)

        logger.info("Personal-data export generated for student %s", student.id)
        content = json.dumps(package, indent=2, ensure_ascii=False, default=str).encode("utf-8")
        safe_id = re.sub(r"[^A-Za-z0-9]+", "_", str(student.student_id or student.id)).strip("_") or str(student.id)
        filename = f"personal_data_{safe_id}_{datetime.now().strftime('%Y%m%d')}.json"
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error exporting a student's personal data")
        raise internal_server_error(request=request)


@router.delete("/students/{student_id}")
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("students:delete")
async def erase_student(
    request: Request,
    student_id: int,
    confirm: str = Query(..., description="The student's registry number (student_id), typed to confirm"),
    db: Session = Depends(get_db),
    is_admin: bool = Depends(may_see_health_data),
):
    """Permanently erase a student and every record about them. This cannot be undone."""
    _administrators_only(is_admin)
    student = _find_student(db, student_id)
    if confirm.strip() != str(student.student_id or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The confirmation does not match the student's registry number",
        )
    try:
        removed: Dict[str, int] = {}
        for name, model in (*_STUDENT_TABLES, ("staff_notes", StudentPrivateNote)):
            removed[name] = (
                db.query(model)
                .execution_options(include_deleted=True)
                .filter(model.student_id == student.id)
                .delete(synchronize_session=False)
            )
        # The audit trail keeps that something happened to this record, not the person's details.
        removed["audit_entries_scrubbed"] = (
            db.query(AuditLog)
            .filter(AuditLog.resource == "student", AuditLog.resource_id == str(student.id))
            .update({AuditLog.old_values: None, AuditLog.new_values: None}, synchronize_session=False)
        )
        db.query(Student).execution_options(include_deleted=True).filter(Student.id == student.id).delete(
            synchronize_session=False
        )
        db.commit()
        logger.warning("Student %s permanently erased on request: %s", student_id, removed)
        return {"erased": True, "student_id": student_id, "removed": removed}
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Error erasing a student")
        raise internal_server_error(request=request)
