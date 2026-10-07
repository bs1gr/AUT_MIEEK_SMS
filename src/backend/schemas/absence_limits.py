from typing import Literal, Optional

from pydantic import BaseModel


class AbsenceLimitStatus(BaseModel):
    """ΜΙΕΕΚ absence status of one student in one course (see services.absence_limit_service)."""

    student_id: int
    course_id: int
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    semester_weeks: int
    periods_per_week: float
    scheduled_periods: float
    absences: int
    unexcused_absences: int
    excused_absences: int
    absence_percent: float
    limit_percent: float
    allowed_absences: Optional[int] = None
    remaining_absences: Optional[int] = None
    participation_limit_percent: float
    participation_allowed_absences: Optional[int] = None
    participation_forfeited: bool
    status: Literal["ok", "warning", "insufficient", "unknown"]
    attendance_insufficient: bool
