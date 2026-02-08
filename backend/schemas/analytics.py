from typing import List

from pydantic import BaseModel, ConfigDict

from backend.schemas.courses import CourseResponse
from backend.schemas.students import StudentResponse


class AnalyticsAggregate(BaseModel):
    label: str
    count: int
    average: float

    model_config = ConfigDict(from_attributes=True)


class AnalyticsLookupsResponse(BaseModel):
    students: List[StudentResponse]
    courses: List[CourseResponse]
    class_averages: List[AnalyticsAggregate] = []
    course_averages: List[AnalyticsAggregate] = []
    division_averages: List[AnalyticsAggregate] = []

    model_config = ConfigDict(from_attributes=True)
