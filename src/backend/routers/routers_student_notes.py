"""
A staff member's own working notes about students, one per student and account.

They used to be stored in the browser (localStorage), where they stayed on whichever device was
used, unencrypted and outside every backup. Here each account reads and writes only its own
notes: there is no way to ask for somebody else's.
"""

import logging
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db import get_session as get_db
from backend.db.utils import get_by_id_or_404
from backend.errors import internal_server_error
from backend.models import Student, StudentPrivateNote
from backend.rate_limiting import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from backend.rbac import require_permission
from backend.security.current_user import optional_signed_in_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/student-notes", tags=["Student notes"])

MAX_NOTE_LENGTH = 20000


class StudentNotesResponse(BaseModel):
    """The caller's notes, keyed by the student's database id. Students without a note are absent."""

    notes: Dict[int, str]


class StudentNoteUpdate(BaseModel):
    text: Optional[str] = Field(default=None, max_length=MAX_NOTE_LENGTH)


class StudentNoteResponse(BaseModel):
    student_id: int
    text: str


def _owner_id(user) -> int:
    """The account the notes belong to; 0 on an install that runs without authentication."""
    user_id = getattr(user, "id", None)
    return user_id if isinstance(user_id, int) else 0


@router.get("/", response_model=StudentNotesResponse)
@limiter.limit(RATE_LIMIT_READ)
@require_permission("students:view")
async def list_my_notes(
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(optional_signed_in_user),
):
    """Every note the signed-in account has written, in one call (the Students page loads it once)."""
    try:
        rows = (
            db.query(StudentPrivateNote.student_id, StudentPrivateNote.text)
            .join(Student, Student.id == StudentPrivateNote.student_id)
            .filter(StudentPrivateNote.user_id == _owner_id(user), Student.deleted_at.is_(None))
            .all()
        )
        return {"notes": {student_id: text for student_id, text in rows}}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error listing student notes")
        raise internal_server_error(request=request)


@router.put("/{student_id}", response_model=StudentNoteResponse)
@limiter.limit(RATE_LIMIT_WRITE)
@require_permission("students:view")
async def save_my_note(
    request: Request,
    student_id: int,
    payload: StudentNoteUpdate,
    db: Session = Depends(get_db),
    user=Depends(optional_signed_in_user),
):
    """Save the caller's note about one student. Blank text removes the note."""
    try:
        get_by_id_or_404(db, Student, student_id, request=request)
        owner = _owner_id(user)
        text = payload.text if payload.text and payload.text.strip() else ""

        for attempt in (1, 2):
            row = (
                db.query(StudentPrivateNote)
                .filter(StudentPrivateNote.student_id == student_id, StudentPrivateNote.user_id == owner)
                .first()
            )
            try:
                if not text:
                    if row is not None:
                        db.delete(row)
                elif row is None:
                    db.add(StudentPrivateNote(student_id=student_id, user_id=owner, text=text))
                else:
                    row.text = text
                db.commit()
                break
            except IntegrityError:
                # Two tabs created the same note at once; the second try finds the row and updates it.
                db.rollback()
                if attempt == 2:
                    raise
        return {"student_id": student_id, "text": text}
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Error saving a student note")
        raise internal_server_error(request=request)
