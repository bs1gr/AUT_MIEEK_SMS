"""
Business Metrics Schemas for Student Management System

Pydantic models for business metrics and analytics data.

Part of Phase 1 v1.15.0 - Improvement #5 (Business Metrics Dashboard)
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudentMetrics(BaseModel):
    """
    Student population and enrollment metrics.

    Attributes:
        total: Total number of students (active + inactive)
        active: Number of active students
        inactive: Number of inactive (soft-deleted) students
        new_this_semester: Students enrolled in current semester
        by_semester: Breakdown of students per semester
    """

    total: int = Field(..., ge=0, description="Total students")
    active: int = Field(..., ge=0, description="Active students")
    inactive: int = Field(..., ge=0, description="Inactive students")
    new_this_semester: int = Field(..., ge=0, description="New enrollments this semester")
    by_semester: dict[str, int] = Field(default_factory=dict, description="Student count by semester")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total": 150,
                "active": 142,
                "inactive": 8,
                "new_this_semester": 25,
                "by_semester": {"Fall 2025": 75, "Spring 2026": 67},
            }
        }
    )


class CourseMetrics(BaseModel):
    """
    Course enrollment and completion metrics.

    Attributes:
        total_courses: Total number of courses
        active_courses: Courses with enrollments
        total_enrollments: Total student enrollments across all courses
        avg_enrollment: Average students per course
        completion_rate: Percentage of courses with grades submitted
    """

    total_courses: int = Field(..., ge=0, description="Total courses")
    active_courses: int = Field(..., ge=0, description="Courses with enrollments")
    total_enrollments: int = Field(..., ge=0, description="Total enrollments")
    avg_enrollment: float = Field(..., ge=0, description="Average students per course")
    completion_rate: float = Field(..., ge=0, le=100, description="Percentage of graded courses")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_courses": 12,
                "active_courses": 10,
                "total_enrollments": 450,
                "avg_enrollment": 37.5,
                "completion_rate": 83.3,
            }
        }
    )


class GradeMetrics(BaseModel):
    """
    Grade distribution and performance metrics.

    Attributes:
        total_grades: Total number of grades recorded
        average_grade: Mean grade across all students
        median_grade: Median grade
        grade_distribution: Count of grades in each range
        gpa_distribution: Count of students in each GPA bracket
        failing_count: Number of failing grades
    """

    total_grades: int = Field(..., ge=0, description="Total grades recorded")
    average_grade: float = Field(..., ge=0, le=100, description="Mean grade")
    median_grade: float = Field(..., ge=0, le=100, description="Median grade")
    grade_distribution: dict[str, int] = Field(
        default_factory=dict,
        description="Grade counts by range (A: 90-100, B: 80-89, etc.)",
    )
    gpa_distribution: dict[str, int] = Field(default_factory=dict, description="Student counts by GPA bracket")
    failing_count: int = Field(..., ge=0, description="Number of failing grades")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_grades": 1250,
                "average_grade": 76.5,
                "median_grade": 78.0,
                "grade_distribution": {
                    "A (90-100)": 250,
                    "B (80-89)": 400,
                    "C (70-79)": 350,
                    "D (60-69)": 150,
                    "F (0-59)": 100,
                },
                "gpa_distribution": {
                    "4.0": 15,
                    "3.5-3.9": 45,
                    "3.0-3.4": 60,
                    "2.5-2.9": 20,
                    "<2.5": 10,
                },
                "failing_count": 100,
            }
        }
    )


class AttendanceMetrics(BaseModel):
    """
    Attendance tracking and compliance metrics.

    Attributes:
        total_records: Total attendance records
        present_count: Number of present records
        absent_count: Number of absent records
        attendance_rate: Percentage of attendance
        by_course: Attendance rate breakdown by course
        by_date: Attendance trends over time
    """

    total_records: int = Field(..., ge=0, description="Total attendance records")
    present_count: int = Field(..., ge=0, description="Present records")
    absent_count: int = Field(..., ge=0, description="Absent records")
    attendance_rate: float = Field(..., ge=0, le=100, description="Overall attendance %")
    by_course: dict[str, float] = Field(default_factory=dict, description="Attendance % by course")
    by_date: dict[str, float] = Field(default_factory=dict, description="Attendance trends by date")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_records": 5000,
                "present_count": 4650,
                "absent_count": 350,
                "attendance_rate": 93.0,
                "by_course": {"CS101": 95.5, "MATH201": 88.2, "ENG102": 92.7},
                "by_date": {
                    "2026-01-01": 94.5,
                    "2026-01-02": 91.2,
                    "2026-01-03": 93.8,
                },
            }
        }
    )


class DashboardMetrics(BaseModel):
    """
    Executive dashboard with comprehensive system metrics.

    Combines student, course, grade, and attendance metrics
    into a single view for administrative oversight.

    Attributes:
        timestamp: When metrics were calculated
        students: Student population metrics
        courses: Course enrollment metrics
        grades: Grade distribution metrics
        attendance: Attendance compliance metrics
    """

    timestamp: datetime = Field(..., description="Metrics calculation timestamp")
    students: StudentMetrics = Field(..., description="Student metrics")
    courses: CourseMetrics = Field(..., description="Course metrics")
    grades: GradeMetrics = Field(..., description="Grade metrics")
    attendance: AttendanceMetrics = Field(..., description="Attendance metrics")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "timestamp": "2026-01-04T12:00:00Z",
                "students": {
                    "total": 150,
                    "active": 142,
                    "inactive": 8,
                    "new_this_semester": 25,
                    "by_semester": {},
                },
                "courses": {
                    "total_courses": 12,
                    "active_courses": 10,
                    "total_enrollments": 450,
                    "avg_enrollment": 37.5,
                    "completion_rate": 83.3,
                },
                "grades": {
                    "total_grades": 1250,
                    "average_grade": 76.5,
                    "median_grade": 78.0,
                    "grade_distribution": {},
                    "gpa_distribution": {},
                    "failing_count": 100,
                },
                "attendance": {
                    "total_records": 5000,
                    "present_count": 4650,
                    "absent_count": 350,
                    "attendance_rate": 93.0,
                    "by_course": {},
                    "by_date": {},
                },
            }
        }
    )
