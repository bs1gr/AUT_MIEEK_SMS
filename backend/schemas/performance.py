from __future__ import annotations

from pydantic import BaseModel
from typing import Optional
from datetime import date


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

    class Config:
        from_attributes = True
