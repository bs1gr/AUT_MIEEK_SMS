"""Schemas for lesson logs: the material covered and the teacher's notes for one teaching period."""

from datetime import date as date_type
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

# A lesson's material or a teacher's private notes are a few paragraphs, not a document. The cap
# only stops a runaway client from filling the database; it is far above what anyone types.
MAX_LESSON_LOG_TEXT = 20000


class LessonLogUpsert(BaseModel):
    """Body of the autosave call, keyed by course, date and teaching period.

    A text field that is left out of the request is left unchanged, so each textarea can be
    saved on its own without overwriting the other. Sending an empty string (or null) clears it.
    """

    course_id: int = Field(..., ge=1)
    date: date_type
    period_number: int = Field(default=1, ge=1)
    material_covered: Optional[str] = Field(default=None, max_length=MAX_LESSON_LOG_TEXT)
    teacher_notes: Optional[str] = Field(default=None, max_length=MAX_LESSON_LOG_TEXT)


class LessonLogResponse(BaseModel):
    id: int
    course_id: int
    date: date_type
    period_number: int
    material_covered: Optional[str] = None
    teacher_notes: Optional[str] = None
    # Name of the account that last changed the text; None for entries saved before this was
    # recorded, or saved while authentication is off.
    updated_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
