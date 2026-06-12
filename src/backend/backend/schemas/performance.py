from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DailyPerformanceCreate(BaseModel):
    student_id: int
    course_id: int
    date: date
    category: str
    score: float
    max_score: float = 10.0
    notes: Optional[str] = None


class DailyPerformanceResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    date: date
    category: str
    score: float
    max_score: float
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)
