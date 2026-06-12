"""Import business logic service for bulk imports and file processing."""

import logging
import os
from typing import Optional

from sqlalchemy.orm import Session

from backend.import_resolver import import_names

logger = logging.getLogger(__name__)


class ImportService:
    """Service for managing bulk imports of courses and students."""

    @staticmethod
    def reactivate_if_soft_deleted(record, *, entity: str, identifier: str) -> bool:
        """
        Clear the soft-delete flag when importing archived records.

        Args:
            record: Database record to check and potentially reactivate
            entity: Entity type name for logging (e.g., "student", "course")
            identifier: Entity identifier for logging

        Returns:
            True if record was reactivated, False otherwise
        """
        if record is not None and getattr(record, "deleted_at", None) is not None:
            record.deleted_at = None
            logger.info("Reactivated archived %s during import: %s", entity, identifier)
            return True
        return False

    @staticmethod
    def diagnose_environment(courses_dir: str, students_dir: str) -> dict:
        """
        Return diagnostics about import directories and files found.

        Args:
            courses_dir: Path to courses templates directory
            students_dir: Path to students templates directory

        Returns:
            Dictionary containing directory status and file listings
        """
        courses_exists = os.path.isdir(courses_dir)
        students_exists = os.path.isdir(students_dir)
        courses_files = []
        students_files = []

        if courses_exists:
            courses_files = [f for f in os.listdir(courses_dir) if f.lower().endswith(".json")]
        if students_exists:
            students_files = [f for f in os.listdir(students_dir) if f.lower().endswith(".json")]

        return {
            "courses_dir": courses_dir,
            "students_dir": students_dir,
            "courses_dir_exists": courses_exists,
            "students_dir_exists": students_exists,
            "course_json_files": courses_files,
            "student_json_files": students_files,
        }

    @staticmethod
    def create_or_update_course(
        db: Session,
        course_data: dict,
        *,
        translate_rules_fn=None,
    ) -> tuple[bool, Optional[str]]:
        """
        Create or update a course from normalized data.

        Args:
            db: Database session
            course_data: Normalized course dictionary
            translate_rules_fn: Optional function to translate evaluation rules

        Returns:
            Tuple of (created: bool, error: Optional[str])
        """
        (Course,) = import_names("models", "Course")

        def _calculate_periods_per_week(schedule) -> int:
            if not schedule:
                return 0
            total = 0
            values: list = []
            if isinstance(schedule, dict):
                values = list(schedule.values())
            elif isinstance(schedule, list):
                values = schedule
            else:
                return 0
            for item in values:
                if not isinstance(item, dict):
                    continue
                raw = item.get("periods")
                if raw is None:
                    raw = item.get("period_count")
                if raw is None:
                    raw = item.get("count")
                try:
                    total += int(raw) if raw is not None else 0
                except (TypeError, ValueError):
                    continue
            return total

        periods_value = course_data.get("periods_per_week")
        if periods_value is not None:
            try:
                course_data["periods_per_week"] = int(float(periods_value))
            except (TypeError, ValueError):
                course_data.pop("periods_per_week", None)
                periods_value = None
        if course_data.get("hours_per_week") in (None, "") and periods_value is not None:
            course_data["hours_per_week"] = periods_value

        if periods_value is None and course_data.get("teaching_schedule") is not None:
            course_data["periods_per_week"] = _calculate_periods_per_week(course_data.get("teaching_schedule"))

        code = course_data.get("course_code")
        if not code:
            return False, "Missing course_code"

        db_course = db.query(Course).filter(Course.course_code == code).first()

        if db_course:
            ImportService.reactivate_if_soft_deleted(db_course, entity="course", identifier=str(code))

            # Update fields
            for field in [
                "course_name",
                "semester",
                "credits",
                "description",
                "hours_per_week",
                "periods_per_week",
                "teaching_schedule",
            ]:
                if field in course_data:
                    setattr(db_course, field, course_data[field])

            # Handle evaluation_rules carefully - don't clear existing rules with empty list
            if "evaluation_rules" in course_data:
                new_rules = course_data["evaluation_rules"]
                existing_rules = getattr(db_course, "evaluation_rules", None)

                if isinstance(new_rules, list) and len(new_rules) == 0 and existing_rules:
                    # Skip clearing; keep existing rules
                    pass
                else:
                    setattr(db_course, "evaluation_rules", new_rules)

            return False, None  # Updated, not created
        else:
            # Create new course
            allowed_fields = [
                "course_code",
                "course_name",
                "semester",
                "credits",
                "description",
                "evaluation_rules",
                "hours_per_week",
                "periods_per_week",
                "teaching_schedule",
            ]
            filtered_data = {k: v for k, v in course_data.items() if k in allowed_fields}
            db_course = Course(**filtered_data)
            db.add(db_course)
            return True, None  # Created

    @staticmethod
    def create_or_update_student(
        db: Session,
        student_data: dict,
    ) -> tuple[bool, Optional[str]]:
        """
        Create or update a student from normalized data.

        Args:
            db: Database session
            student_data: Normalized student dictionary

        Returns:
            Tuple of (created: bool, error: Optional[str])
        """
        (Student,) = import_names("models", "Student")

        sid = student_data.get("student_id")
        email = student_data.get("email")

        if not sid or not email:
            return False, "Missing student_id or email"

        if not student_data.get("first_name") or not student_data.get("last_name"):
            return False, "first_name and last_name are required"

        # Whitelist allowed fields
        allowed = [
            "first_name",
            "last_name",
            "email",
            "student_id",
            "enrollment_date",
            "is_active",
            "father_name",
            "mobile_phone",
            "phone",
            "health_issue",
            "note",
            "study_year",
        ]
        cleaned = {k: v for k, v in student_data.items() if k in allowed}

        db_student = db.query(Student).filter((Student.student_id == sid) | (Student.email == email)).first()

        if db_student:
            ImportService.reactivate_if_soft_deleted(
                db_student,
                entity="student",
                identifier=str(sid or email),
            )

            # Update all cleaned fields
            for field, val in cleaned.items():
                setattr(db_student, field, val)

            return False, None  # Updated, not created
        else:
            db_student = Student(**cleaned)
            db.add(db_student)
            return True, None  # Created
