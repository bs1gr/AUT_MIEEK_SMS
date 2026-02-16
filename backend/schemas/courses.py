from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CourseCreate(BaseModel):
    course_code: str = Field(..., min_length=1, max_length=20)
    course_name: str = Field(..., min_length=1, max_length=200)
    semester: str = Field(..., min_length=1, max_length=50)
    credits: int = Field(default=3, ge=1, le=12)
    description: Optional[str] = None
    evaluation_rules: Optional[List[Any]] = None
    absence_penalty: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)
    hours_per_week: Optional[float] = Field(default=3.0, ge=0.5, le=40.0)
    periods_per_week: Optional[int] = Field(default=0, ge=0, le=60)
    teaching_schedule: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def _none_if_empty(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @classmethod
    def _pre_normalize(cls, values: dict) -> dict:
        # Coerce empty strings to None for optional fields often posted as ""
        if not isinstance(values, dict):
            return values
        optional_keys = [
            "description",
            "evaluation_rules",
            "absence_penalty",
            "hours_per_week",
            "periods_per_week",
            "teaching_schedule",
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

    @field_validator("course_code")
    @classmethod
    def validate_course_code(cls, v: str) -> str:
        """Ensure course code is uppercase and alphanumeric"""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Course code must be alphanumeric (hyphens and underscores allowed)")
        return v.upper().strip()

    model_config = ConfigDict(from_attributes=True)


class CourseUpdate(BaseModel):
    course_code: Optional[str] = Field(None, min_length=1, max_length=20)
    course_name: Optional[str] = Field(None, min_length=1, max_length=200)
    semester: Optional[str] = Field(None, min_length=1, max_length=50)
    credits: Optional[int] = Field(None, ge=1, le=12)
    description: Optional[str] = None
    evaluation_rules: Optional[List[Any]] = None
    absence_penalty: Optional[float] = Field(None, ge=0.0, le=100.0)
    hours_per_week: Optional[float] = Field(None, ge=0.0, le=40.0)
    periods_per_week: Optional[int] = Field(None, ge=0, le=60)
    teaching_schedule: Optional[List[Dict[str, Any]]] = None

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
            "course_code",
            "course_name",
            "semester",
            "description",
            "evaluation_rules",
            "absence_penalty",
            "hours_per_week",
            "periods_per_week",
            "teaching_schedule",
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


class CourseResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    semester: str
    credits: int
    description: Optional[str]
    evaluation_rules: Optional[List[Any]]
    absence_penalty: Optional[float]
    hours_per_week: Optional[float]
    periods_per_week: Optional[int]
    teaching_schedule: Optional[List[Dict[str, Any]]]

    model_config = ConfigDict(from_attributes=True)
