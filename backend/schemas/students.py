import re
from datetime import date
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


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

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def _none_if_empty(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @classmethod
    def _pre_normalize(cls, values: dict) -> dict:
        # Coerce empty strings to None for optional fields commonly sent as ""
        if not isinstance(values, dict):
            return values
        optional_keys = [
            "father_name",
            "mobile_phone",
            "phone",
            "health_issue",
            "note",
            "enrollment_date",
            "study_year",
        ]
        for k in optional_keys:
            if k in values:
                values[k] = cls._none_if_empty(values[k])
        return values

    @model_validator(mode="before")
    @classmethod
    def _normalize_before(cls, obj):
        # Ensure empty strings are converted to None before type parsing
        if isinstance(obj, dict):
            return cls._pre_normalize(dict(obj))
        return obj

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, v: str) -> str:
        # Allow alphanumerics plus '-' and '_' and must start with alphanumeric
        vv = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9\-_]{0,49}", vv):
            raise ValueError("Student ID must be alphanumeric and may include '-' or '_' (max 50 chars)")
        return vv

    @field_validator("mobile_phone", "phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        vv = v.strip()
        # Basic international format: optional + and 7-15 digits
        if not re.fullmatch(r"\+?\d{7,15}", vv):
            raise ValueError("Phone must be digits with optional leading + (7-15 digits)")
        return vv

    @field_validator("study_year")
    @classmethod
    def validate_study_year(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if not (1 <= v <= 4):
            raise ValueError("study_year must be between 1 and 4")
        return v

    @field_validator("enrollment_date")
    @classmethod
    def validate_enrollment_date(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        # Compare using local calendar date to avoid false "future" rejections across timezones
        if v > date.today():
            raise ValueError("enrollment_date cannot be in the future")
        return v


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

    @classmethod
    def _none_if_empty(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @classmethod
    def _pre_normalize(cls, values: dict) -> dict:
        if not isinstance(values, dict):
            return values
        optional_keys = [
            "first_name",
            "last_name",
            "email",
            "student_id",
            "father_name",
            "mobile_phone",
            "phone",
            "health_issue",
            "note",
            "enrollment_date",
            "study_year",
        ]
        for k in optional_keys:
            if k in values:
                values[k] = cls._none_if_empty(values[k])
        return values

    @model_validator(mode="before")
    @classmethod
    def _normalize_before(cls, obj):
        if isinstance(obj, dict):
            return cls._pre_normalize(dict(obj))
        return obj

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        vv = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9\-_]{0,49}", vv):
            raise ValueError("Student ID must be alphanumeric and may include '-' or '_' (max 50 chars)")
        return vv

    @field_validator("mobile_phone", "phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        vv = v.strip()
        if not re.fullmatch(r"\+?\d{7,15}", vv):
            raise ValueError("Phone must be digits with optional leading + (7-15 digits)")
        return vv

    @field_validator("study_year")
    @classmethod
    def validate_study_year(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if not (1 <= v <= 4):
            raise ValueError("study_year must be between 1 and 4")
        return v

    @field_validator("enrollment_date")
    @classmethod
    def validate_enrollment_date(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        if v > date.today():
            raise ValueError("enrollment_date cannot be in the future")
        return v


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

    model_config = ConfigDict(from_attributes=True)
