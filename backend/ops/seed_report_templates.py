"""Seed script for report templates.

This script creates pre-built report templates for common use cases:
- Student roster reports
- Grade reports
- Attendance reports
- Course enrollment reports

Run directly: python -m backend.ops.seed_report_templates
Or from main app: seed_report_templates(db) in lifespan/startup
"""

import logging
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from backend.models import ReportTemplate

logger = logging.getLogger(__name__)


def get_template_definitions() -> List[Dict[str, Any]]:
    """Define all system report templates.

    Returns:
        List of template definition dictionaries
    """
    return [
        # =====================================================================
        # STUDENT REPORTS
        # =====================================================================
        {
            "name": "Student Roster - Complete",
            "description": "Complete student roster with all profile information including contact details, enrollment dates, and academic status.",
            "category": "students",
            "report_type": "student",
            "fields": [
                "student_id",
                "first_name",
                "last_name",
                "email",
                "mobile_phone",
                "enrollment_date",
                "study_year",
                "is_active",
            ],
            "filters": [],
            "aggregations": None,
            "sort_by": [{"field": "last_name", "order": "asc"}],
            "default_export_format": "excel",
            "default_include_charts": False,
        },
        {
            "name": "Active Students - Basic Info",
            "description": "Quick reference list of active students with basic contact information.",
            "category": "students",
            "report_type": "student",
            "fields": ["student_id", "first_name", "last_name", "email", "mobile_phone"],
            "filters": [{"field": "is_active", "operator": "equals", "value": True}],
            "aggregations": None,
            "sort_by": [{"field": "last_name", "order": "asc"}],
            "default_export_format": "pdf",
            "default_include_charts": False,
        },
        {
            "name": "Students by Study Year",
            "description": "Student distribution organized by study year with enrollment statistics.",
            "category": "students",
            "report_type": "student",
            "fields": ["study_year", "student_id", "first_name", "last_name", "enrollment_date"],
            "filters": [{"field": "is_active", "operator": "equals", "value": True}],
            "aggregations": [{"field": "student_id", "function": "count", "group_by": "study_year"}],
            "sort_by": [{"field": "study_year", "order": "asc"}, {"field": "last_name", "order": "asc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        {
            "name": "New Enrollments - Current Semester",
            "description": "Recently enrolled students within the last 90 days.",
            "category": "students",
            "report_type": "student",
            "fields": ["enrollment_date", "student_id", "first_name", "last_name", "email", "study_year"],
            "filters": [
                {"field": "is_active", "operator": "equals", "value": True},
                {"field": "enrollment_date", "operator": "greater_than", "value": "90_days_ago"},
            ],
            "aggregations": None,
            "sort_by": [{"field": "enrollment_date", "order": "desc"}],
            "default_export_format": "pdf",
            "default_include_charts": False,
        },
        # =====================================================================
        # COURSE REPORTS
        # =====================================================================
        {
            "name": "Course Catalog - All Courses",
            "description": "Complete course catalog with descriptions, credit hours, and schedules.",
            "category": "courses",
            "report_type": "course",
            "fields": ["course_code", "course_name", "description", "credits", "semester", "is_active"],
            "filters": [],
            "aggregations": None,
            "sort_by": [{"field": "course_code", "order": "asc"}],
            "default_export_format": "pdf",
            "default_include_charts": False,
        },
        {
            "name": "Active Courses by Semester",
            "description": "Currently active courses organized by semester.",
            "category": "courses",
            "report_type": "course",
            "fields": ["semester", "course_code", "course_name", "credits", "description"],
            "filters": [{"field": "is_active", "operator": "equals", "value": True}],
            "aggregations": [{"field": "course_code", "function": "count", "group_by": "semester"}],
            "sort_by": [{"field": "semester", "order": "asc"}, {"field": "course_code", "order": "asc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        # =====================================================================
        # GRADE REPORTS
        # =====================================================================
        {
            "name": "Grade Distribution - All Courses",
            "description": "Statistical analysis of grade distribution across all courses.",
            "category": "grades",
            "report_type": "grade",
            "fields": ["course_code", "grade", "date_assigned"],
            "filters": [],
            "aggregations": [
                {"field": "grade", "function": "avg", "group_by": "course_code"},
                {"field": "grade", "function": "count", "group_by": "course_code"},
            ],
            "sort_by": [{"field": "course_code", "order": "asc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        {
            "name": "Student Transcript - Complete",
            "description": "Complete academic transcript showing all grades by course and semester.",
            "category": "grades",
            "report_type": "grade",
            "fields": ["student_id", "course_code", "grade", "date_assigned", "notes"],
            "filters": [],
            "aggregations": [{"field": "grade", "function": "avg", "group_by": "student_id"}],
            "sort_by": [{"field": "date_assigned", "order": "desc"}],
            "default_export_format": "pdf",
            "default_include_charts": False,
        },
        {
            "name": "Honor Roll - High Achievers",
            "description": "Students with grade averages of 85 or higher.",
            "category": "grades",
            "report_type": "grade",
            "fields": ["student_id", "first_name", "last_name", "grade"],
            "filters": [{"field": "grade", "operator": "greater_than_or_equal", "value": 85}],
            "aggregations": [{"field": "grade", "function": "avg", "group_by": "student_id"}],
            "sort_by": [{"field": "grade", "order": "desc"}],
            "default_export_format": "pdf",
            "default_include_charts": True,
        },
        {
            "name": "At-Risk Students - Low Grades",
            "description": "Students with grades below 60 requiring academic intervention.",
            "category": "grades",
            "report_type": "grade",
            "fields": ["student_id", "first_name", "last_name", "course_code", "grade", "date_assigned"],
            "filters": [{"field": "grade", "operator": "less_than", "value": 60}],
            "aggregations": None,
            "sort_by": [{"field": "grade", "order": "asc"}],
            "default_export_format": "excel",
            "default_include_charts": False,
        },
        # =====================================================================
        # ATTENDANCE REPORTS
        # =====================================================================
        {
            "name": "Attendance Summary - All Students",
            "description": "Comprehensive attendance statistics for all students.",
            "category": "attendance",
            "report_type": "attendance",
            "fields": ["student_id", "first_name", "last_name", "course_code", "status", "date"],
            "filters": [],
            "aggregations": [
                {"field": "status", "function": "count", "group_by": "student_id"},
            ],
            "sort_by": [{"field": "date", "order": "desc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        {
            "name": "Perfect Attendance",
            "description": "Students with 100% attendance record.",
            "category": "attendance",
            "report_type": "attendance",
            "fields": ["student_id", "first_name", "last_name", "course_code"],
            "filters": [{"field": "status", "operator": "equals", "value": "present"}],
            "aggregations": [{"field": "status", "function": "count", "group_by": "student_id"}],
            "sort_by": [{"field": "last_name", "order": "asc"}],
            "default_export_format": "pdf",
            "default_include_charts": False,
        },
        {
            "name": "Chronic Absenteeism",
            "description": "Students with multiple absences requiring attention.",
            "category": "attendance",
            "report_type": "attendance",
            "fields": ["student_id", "first_name", "last_name", "course_code", "date"],
            "filters": [{"field": "status", "operator": "equals", "value": "absent"}],
            "aggregations": [{"field": "status", "function": "count", "group_by": "student_id"}],
            "sort_by": [{"field": "student_id", "order": "asc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        # =====================================================================
        # ANALYTICS REPORTS
        # =====================================================================
        {
            "name": "Student Performance - Detailed Analytics",
            "description": "Detailed student performance metrics with GPA, attendance, credits, and pass/fail summary.",
            "category": "analytics",
            "report_type": "student",
            "fields": [
                "student_id",
                "first_name",
                "last_name",
                "gpa",
                "average_grade",
                "attendance_rate",
                "total_courses",
                "passed_courses",
                "failed_courses",
                "total_credits",
                "study_year",
                "class_division",
            ],
            "filters": [],
            "aggregations": None,
            "sort_by": [{"field": "gpa", "order": "desc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        {
            "name": "Course Performance - Analytics",
            "description": "Course-level analytics including enrollment, averages, attendance, and workload.",
            "category": "analytics",
            "report_type": "course",
            "fields": [
                "course_code",
                "course_name",
                "semester",
                "credits",
                "hours_per_week",
                "enrollment_count",
                "average_grade",
                "attendance_rate",
                "absence_penalty",
                "is_active",
            ],
            "filters": [],
            "aggregations": None,
            "sort_by": [{"field": "average_grade", "order": "desc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        {
            "name": "Attendance Analytics - By Course",
            "description": "Attendance records grouped by course with student presence details.",
            "category": "analytics",
            "report_type": "attendance",
            "fields": [
                "course_code",
                "course_name",
                "date",
                "status",
                "student_id",
                "student_name",
                "period_number",
            ],
            "filters": [],
            "aggregations": None,
            "sort_by": [{"field": "date", "order": "desc"}],
            "default_export_format": "pdf",
            "default_include_charts": False,
        },
        {
            "name": "Grade Analytics - Weighted Overview",
            "description": "Assignment-level grade analytics with weights, percentages, and letter grades.",
            "category": "analytics",
            "report_type": "grade",
            "fields": [
                "student_id",
                "student_name",
                "course_code",
                "course_name",
                "assignment_name",
                "category",
                "grade",
                "max_grade",
                "percentage",
                "weight",
                "letter_grade",
                "date_assigned",
            ],
            "filters": [],
            "aggregations": None,
            "sort_by": [{"field": "date_assigned", "order": "desc"}],
            "default_export_format": "excel",
            "default_include_charts": True,
        },
        {
            "name": "Student Engagement - Attendance & Grades",
            "description": "Engagement snapshot combining attendance, grade averages, and workload metrics.",
            "category": "analytics",
            "report_type": "student",
            "fields": [
                "student_id",
                "first_name",
                "last_name",
                "attendance_rate",
                "average_grade",
                "total_classes",
                "total_assignments",
                "total_courses",
                "enrollment_status",
            ],
            "filters": [],
            "aggregations": None,
            "sort_by": [{"field": "attendance_rate", "order": "desc"}],
            "default_export_format": "pdf",
            "default_include_charts": False,
        },
    ]


def seed_report_templates(db: Session, force: bool = False) -> int:
    """Seed report templates into the database.

    Args:
        db: Database session
        force: If True, delete existing templates before seeding

    Returns:
        Number of templates created
    """
    if force:
        logger.info("Force flag set - deleting existing templates...")
        db.query(ReportTemplate).delete()
        db.commit()
        logger.info("Existing templates deleted")

    templates = get_template_definitions()
    created_count = 0

    for template_data in templates:
        # Check if template already exists
        existing = db.query(ReportTemplate).filter(ReportTemplate.name == template_data["name"]).first()

        if existing:
            logger.debug(f"Template '{template_data['name']}' already exists, skipping")
            continue

        # Create new template
        template = ReportTemplate(
            name=template_data["name"],
            description=template_data["description"],
            category=template_data["category"],
            report_type=template_data["report_type"],
            fields=template_data["fields"],
            filters=template_data["filters"],
            aggregations=template_data["aggregations"],
            sort_by=template_data["sort_by"],
            default_export_format=template_data["default_export_format"],
            default_include_charts=template_data["default_include_charts"],
            is_system=True,
            is_active=True,
        )

        db.add(template)
        created_count += 1
        logger.info(f"Created template: {template_data['name']}")

    db.commit()
    logger.info(f"Seeded {created_count} new report templates (skipped {len(templates) - created_count} existing)")
    return created_count


def main():
    """CLI entry point for seeding templates."""
    import sys
    import os
    from pathlib import Path

    # Add backend to path
    backend_dir = Path(__file__).parent.parent
    sys.path.insert(0, str(backend_dir.parent))

    # Change to backend directory so database path is relative to backend/
    os.chdir(backend_dir)

    from backend.config import settings
    from backend.models import get_session, init_db

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    engine = init_db(settings.DATABASE_URL)
    db = get_session(engine)

    try:
        count = seed_report_templates(db, force="--force" in sys.argv)
        logger.info(f"✅ Successfully seeded {count} report templates")
    except Exception as e:
        logger.error(f"❌ Failed to seed templates: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
