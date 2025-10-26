from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date


class StudentCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    student_id: str = Field(..., min_length=1, max_length=50)
    enrollment_date: Optional[date] = None
    father_name: Optional[str] = Field(None, max_length=100)
    mobile_phone: Optional[str] = Field(None, max_length=30)
    phone: Optional[str] = Field(None, max_length=30)
    health_issue: Optional[str] = None
    note: Optional[str] = None
    study_year: Optional[int] = None

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    student_id: Optional[str] = Field(None, min_length=1, max_length=50)
    enrollment_date: Optional[date] = None
    is_active: Optional[bool] = None
    father_name: Optional[str] = Field(None, max_length=100)
    mobile_phone: Optional[str] = Field(None, max_length=30)
    phone: Optional[str] = Field(None, max_length=30)
    health_issue: Optional[str] = None
    note: Optional[str] = None
    study_year: Optional[int] = None


class StudentResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    student_id: str
    enrollment_date: date | None
    is_active: bool
    father_name: str | None
    mobile_phone: str | None
    phone: str | None
    health_issue: str | None
    note: str | None
    study_year: int | None

    class Config:
        from_attributes = True
