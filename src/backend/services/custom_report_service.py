"""
Custom Report Service for Phase 6 Reporting Enhancements.

Handles CRUD operations for report templates, custom reports, and
tracking generated report instances.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, cast
import logging
import os

from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.models import GeneratedReport, Report, ReportTemplate
from backend.schemas.custom_reports import (
    CustomReportCreate,
    CustomReportUpdate,
    GeneratedReportCreate,
    ReportTemplateCreate,
    ReportTemplateUpdate,
)
from backend.services.report_scheduler import ReportScheduler, get_report_scheduler

logger = logging.getLogger(__name__)

# The student "gpa" of a custom report is the mean of the grades in percent, 0 to 100. These system
# templates filtered it on a four-point scale, so "3.5 or more" took nearly every graded student
# and "under 2.0" nobody (plan todo 75 stage 5). Now on the percent scale: the excellent at 85 (the
# strength level of Analytics), the at-risk under 60, as the template's description says.
GPA_TEMPLATE_FILTERS: Dict[str, List[Dict[str, Any]]] = {
    "Honor Roll - High Achievers": [{"field": "gpa", "operator": "gte", "value": 85}],
    "At-Risk Students - Low Grades": [{"field": "gpa", "operator": "lt", "value": 60}],
    "Top Performers - GPA Analytics": [{"field": "gpa", "operator": "gte", "value": 85}],
}
# What they held before, for repairing a stored copy: only an untouched one is changed.
GPA_TEMPLATE_OLD_FILTERS: Dict[str, List[Dict[str, Any]]] = {
    "Honor Roll - High Achievers": [{"field": "gpa", "operator": "gte", "value": 3.5}],
    "At-Risk Students - Low Grades": [{"field": "gpa", "operator": "lt", "value": 2.0}],
    "Top Performers - GPA Analytics": [{"field": "gpa", "operator": "gte", "value": 3.5}],
}


class CustomReportService:
    """Service for managing report templates, reports, and generated reports."""

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================================
    # TEMPLATE OPERATIONS
    # ==========================================================================

    def create_template(self, create_data: ReportTemplateCreate) -> ReportTemplate:
        template = ReportTemplate(
            name=create_data.name,
            description=create_data.description,
            category=create_data.category,
            report_type=create_data.report_type,
            fields=create_data.fields,
            filters=create_data.filters,
            aggregations=create_data.aggregations,
            sort_by=create_data.sort_by,
            default_export_format=create_data.default_export_format,
            default_include_charts=create_data.default_include_charts,
            is_system=create_data.is_system,
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def list_templates(
        self,
        category: Optional[str] = None,
        report_type: Optional[str] = None,
        is_active: Optional[bool] = True,
        limit: int = 200,
    ) -> List[ReportTemplate]:
        query = self.db.query(ReportTemplate)
        if category:
            query = query.filter(ReportTemplate.category == category)
        if report_type:
            query = query.filter(ReportTemplate.report_type == report_type)
        if is_active is not None:
            query = query.filter(ReportTemplate.is_active == is_active)
        return query.order_by(desc(ReportTemplate.updated_at)).limit(limit).all()

    def get_template(self, template_id: int) -> Optional[ReportTemplate]:
        return self.db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()

    def update_template(self, template_id: int, update_data: ReportTemplateUpdate) -> Optional[ReportTemplate]:
        template = self.get_template(template_id)
        if not template:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(template, key, value)

        self.db.commit()
        self.db.refresh(template)
        return template

    def delete_template(self, template_id: int, hard_delete: bool = False) -> bool:
        template = self.get_template(template_id)
        if not template:
            return False

        if hard_delete:
            self.db.delete(template)
        else:
            template.is_active = False  # type: ignore[assignment]

        self.db.commit()
        return True

    # ==========================================================================
    # REPORT OPERATIONS
    # ==========================================================================

    def create_report(self, user_id: int, create_data: CustomReportCreate) -> Report:
        report = Report(
            user_id=user_id,
            name=create_data.name,
            description=create_data.description,
            report_type=create_data.report_type,
            template_id=create_data.template_id,
            fields=create_data.fields,
            filters=create_data.filters,
            aggregations=create_data.aggregations,
            sort_by=create_data.sort_by,
            export_format=create_data.export_format,
            include_charts=create_data.include_charts,
            schedule_enabled=create_data.schedule_enabled,
            schedule_frequency=create_data.schedule_frequency,
            schedule_cron=create_data.schedule_cron,
            email_recipients=create_data.email_recipients,
            email_enabled=create_data.email_enabled,
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        if report.schedule_enabled:
            scheduler = get_report_scheduler()
            next_run = scheduler.schedule_report(report)
            if next_run:
                report.next_run_at = next_run  # type: ignore[assignment]
            else:
                report.next_run_at = ReportScheduler.compute_next_run_at(  # type: ignore[assignment]
                    cast(Optional[str], report.schedule_frequency),
                    cast(Optional[str], report.schedule_cron),
                )
            self.db.commit()
        return report

    def get_report(self, report_id: int, user_id: int) -> Optional[Report]:
        return (
            self.db.query(Report)
            .filter(
                Report.id == report_id,
                Report.user_id == user_id,
                Report.deleted_at.is_(None),
            )
            .first()
        )

    def list_reports(
        self,
        user_id: int,
        report_type: Optional[str] = None,
        include_deleted: bool = False,
        limit: int = 200,
    ) -> List[Report]:
        query = self.db.query(Report).filter(Report.user_id == user_id)
        if not include_deleted:
            query = query.filter(Report.deleted_at.is_(None))
        if report_type:
            query = query.filter(Report.report_type == report_type)
        return query.order_by(desc(Report.updated_at)).limit(limit).all()

    def update_report(self, report_id: int, user_id: int, update_data: CustomReportUpdate) -> Optional[Report]:
        report = self.get_report(report_id, user_id)
        if not report:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(report, key, value)

        self.db.commit()
        self.db.refresh(report)
        scheduler = get_report_scheduler()
        if report.schedule_enabled:
            next_run = scheduler.schedule_report(report)
            if next_run:
                report.next_run_at = next_run  # type: ignore[assignment]
            else:
                report.next_run_at = ReportScheduler.compute_next_run_at(  # type: ignore[assignment]
                    cast(Optional[str], report.schedule_frequency),
                    cast(Optional[str], report.schedule_cron),
                    cast(Optional[datetime], report.last_run_at),
                )
            self.db.commit()
        else:
            report.next_run_at = None  # type: ignore[assignment]
            scheduler.cancel_report(cast(int, report.id))
            self.db.commit()
        return report

    def delete_report(self, report_id: int, user_id: int, hard_delete: bool = False) -> bool:
        report = self.get_report(report_id, user_id)
        if not report:
            return False

        if hard_delete:
            self.db.delete(report)
        else:
            report.mark_deleted()

        self.db.commit()
        return True

    # ==========================================================================
    # GENERATED REPORT OPERATIONS
    # ==========================================================================

    def create_generated_report(
        self, report_id: int, user_id: int, create_data: GeneratedReportCreate
    ) -> GeneratedReport:
        generated = GeneratedReport(
            report_id=report_id,
            user_id=user_id,
            file_path=create_data.file_path,
            file_name=create_data.file_name,
            file_size_bytes=create_data.file_size_bytes,
            export_format=create_data.export_format,
            status=create_data.status,
            record_count=create_data.record_count,
        )
        self.db.add(generated)
        self.db.commit()
        self.db.refresh(generated)
        return generated

    def list_generated_reports(
        self,
        report_id: int,
        user_id: int,
        limit: int = 100,
        include_superseded: bool = False,
    ) -> List[GeneratedReport]:
        query = self.db.query(GeneratedReport).filter(
            GeneratedReport.report_id == report_id,
            GeneratedReport.user_id == user_id,
        )
        if not include_superseded:
            query = query.filter(GeneratedReport.status != "superseded")

        return query.order_by(desc(GeneratedReport.generated_at)).limit(limit).all()

    def get_generated_report(self, report_id: int, report_instance_id: int, user_id: int) -> Optional[GeneratedReport]:
        return (
            self.db.query(GeneratedReport)
            .filter(
                GeneratedReport.id == report_instance_id,
                GeneratedReport.report_id == report_id,
                GeneratedReport.user_id == user_id,
            )
            .first()
        )

    def delete_generated_report(self, report_id: int, report_instance_id: int, user_id: int) -> bool:
        """Delete a generated report record."""
        report_instance = self.get_generated_report(report_id, report_instance_id, user_id)
        if not report_instance:
            return False

        # Delete file from disk if it exists
        if report_instance.file_path and os.path.exists(report_instance.file_path):
            try:
                os.remove(report_instance.file_path)
            except Exception as e:
                # Log error but continue with database deletion
                import logging

                logging.error(f"Failed to delete file {report_instance.file_path}: {str(e)}")

        # Delete database record
        self.db.delete(report_instance)
        self.db.commit()
        return True

    # ==========================================================================
    # STATISTICS
    # ==========================================================================

    def import_default_templates(self) -> int:
        """
        Import pre-built default templates into the database.
        Adds missing templates and skips existing ones.
        Returns the count of templates imported.
        """
        default_templates = [
            ReportTemplate(
                name="Student Roster - Complete",
                description="Comprehensive student roster with contact details",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "email", "phone", "enrollment_status"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Active Students - Basic Info",
                description="List of currently enrolled students with basic information",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "email"],
                filters=[{"field": "enrollment_status", "operator": "equals", "value": "active"}],
                aggregations=None,
            ),
            ReportTemplate(
                name="Students by Study Year",
                description="Students grouped by academic year",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "year_of_study"],
                filters=[],
                aggregations={"group_by": "year_of_study"},
            ),
            ReportTemplate(
                name="New Enrollments - Current Semester",
                description="Students enrolled in current semester",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "enrollment_date"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Course Catalog - All Courses",
                description="Complete list of all available courses",
                category="standard",
                report_type="course",
                is_system=True,
                fields=["id", "name", "code", "credits", "semester"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Active Courses by Semester",
                description="Courses offered in current semester",
                category="standard",
                report_type="course",
                is_system=True,
                fields=["id", "name", "code", "credits", "semester"],
                filters=[{"field": "is_active", "operator": "equals", "value": True}],
                aggregations=None,
            ),
            ReportTemplate(
                name="Grade Distribution - All Courses",
                description="Grade statistics across all courses",
                category="standard",
                report_type="grade",
                is_system=True,
                fields=["student_id", "course_id", "grade"],
                filters=[],
                aggregations={"group_by": "course_id"},
            ),
            ReportTemplate(
                name="Student Transcript - Complete",
                description="Complete grade transcript for individual student",
                category="standard",
                report_type="grade",
                is_system=True,
                fields=["student_id", "course_id", "grade", "date_submitted"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Honor Roll - High Achievers",
                description="Students with excellent grades",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "gpa"],
                # The "gpa" of a report is the mean of the grades in percent, 0 to 100 (plan todo
                # 75 stage 5): 3.5 and 2.0, on a four-point scale, took nearly every student.
                filters=GPA_TEMPLATE_FILTERS["Honor Roll - High Achievers"],
                aggregations=None,
                sort_by=[{"field": "gpa", "order": "desc"}],
            ),
            ReportTemplate(
                name="At-Risk Students - Low Grades",
                description="Students with grades below 60 requiring academic intervention",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "gpa"],
                filters=GPA_TEMPLATE_FILTERS["At-Risk Students - Low Grades"],
                aggregations=None,
                sort_by=[{"field": "gpa", "order": "asc"}],
            ),
            ReportTemplate(
                name="Attendance Summary - All Students",
                description="Comprehensive attendance statistics for all students",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["student_id", "first_name", "last_name", "attendance_rate"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Full Attendance",
                description="Students with 100% attendance record",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["student_id", "first_name", "last_name", "attendance_rate"],
                filters=[{"field": "attendance_rate", "operator": "equals", "value": 100}],
                aggregations=None,
            ),
            ReportTemplate(
                name="Partial Attendance",
                description="Students with multiple absences requiring attention",
                category="standard",
                report_type="student",
                is_system=True,
                fields=["student_id", "first_name", "last_name", "attendance_rate"],
                filters=[{"field": "attendance_rate", "operator": "lt", "value": 80}],
                aggregations=None,
            ),
            # CSV Export Templates
            ReportTemplate(
                name="Student Roster - CSV Export",
                description="Complete student roster in CSV format for data import/export",
                category="export",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "email", "phone", "enrollment_status", "year_of_study"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Course Grades - CSV Export",
                description="All grades by course in CSV format",
                category="export",
                report_type="grade",
                is_system=True,
                fields=["student_id", "student_name", "course_id", "course_name", "grade", "date_submitted"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Attendance Records - CSV Export",
                description="Complete attendance records in CSV format",
                category="export",
                report_type="student",
                is_system=True,
                fields=["student_id", "first_name", "last_name", "attendance_rate", "total_classes", "attended"],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Course Enrollment - CSV Export",
                description="Course enrollment details in CSV format",
                category="export",
                report_type="course",
                is_system=True,
                fields=["id", "name", "code", "credits", "semester", "enrollment_count"],
                filters=[],
                aggregations=None,
            ),
            # Detailed Analytics Templates
            ReportTemplate(
                name="System Overview - Detailed Analytics",
                description="Comprehensive system statistics including students, courses, enrollment and performance",
                category="analytics",
                report_type="student",
                is_system=True,
                fields=["student_id", "first_name", "last_name", "gpa", "attendance_rate", "enrollment_status"],
                filters=[],
                aggregations={"group_by": "enrollment_status"},
            ),
            ReportTemplate(
                name="Performance Analytics - By Study Year",
                description="Student performance broken down by year of study with GPA and attendance metrics",
                category="analytics",
                report_type="student",
                is_system=True,
                fields=["id", "first_name", "last_name", "year_of_study", "gpa", "failed_courses"],
                filters=[],
                aggregations={"group_by": "year_of_study"},
            ),
            ReportTemplate(
                name="Top Performers - GPA Analytics",
                description="Top performing students by GPA with course and attendance details",
                category="analytics",
                report_type="student",
                is_system=True,
                fields=["student_id", "first_name", "last_name", "gpa", "attendance_rate", "passed_courses"],
                filters=GPA_TEMPLATE_FILTERS["Top Performers - GPA Analytics"],
                aggregations=None,
                sort_by=[{"field": "gpa", "order": "desc"}],
            ),
            ReportTemplate(
                name="Student Performance Breakdown - Grades",
                description="Detailed grade records per student with categories, weights, and dates for audit/export",
                category="analytics",
                report_type="grade",
                is_system=True,
                fields=[
                    "student_name",
                    "student_id",
                    "course_name",
                    "course_code",
                    "assignment_name",
                    "category",
                    "grade",
                    "max_grade",
                    "weight",
                    "date_assigned",
                    "date_submitted",
                ],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Student Performance Audit - Attendance",
                description="Attendance records per student and course for auditing participation impact",
                category="analytics",
                report_type="attendance",
                is_system=True,
                fields=[
                    "student_name",
                    "student_id",
                    "course_name",
                    "course_code",
                    "date",
                    "status",
                    "period_number",
                    "notes",
                ],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Student Performance Audit - Daily Performance",
                description="Daily performance records per student and course for auditing participation scores",
                category="analytics",
                report_type="daily_performance",
                is_system=True,
                fields=[
                    "student_name",
                    "student_id",
                    "course_name",
                    "course_code",
                    "date",
                    "category",
                    "score",
                    "max_score",
                    "percentage",
                    "notes",
                ],
                filters=[],
                aggregations=None,
            ),
            ReportTemplate(
                name="Enrollment Analytics - By Semester",
                description="Semester-based enrollment trends and course distribution",
                category="analytics",
                report_type="course",
                is_system=True,
                fields=["id", "name", "code", "semester", "credits", "enrollment_count"],
                filters=[],
                aggregations={"group_by": "semester"},
            ),
            ReportTemplate(
                name="Grade Distribution Analytics",
                description="Statistical analysis of grade distribution across courses and students",
                category="analytics",
                report_type="grade",
                is_system=True,
                fields=["course_id", "course_name", "grade", "student_id"],
                filters=[],
                aggregations={"group_by": "course_id"},
            ),
        ]

        # Add templates to database, checking for duplicates
        imported_count = 0
        logger.info(f"Starting import of {len(default_templates)} default templates...")
        for template in default_templates:
            # Check if template with this name already exists
            existing = (
                self.db.query(ReportTemplate)
                .filter(ReportTemplate.name == template.name, ReportTemplate.is_system.is_(True))
                .first()
            )

            if existing:
                # A copy imported with the four-point filter, untouched since: given the new one.
                if (
                    template.name in GPA_TEMPLATE_OLD_FILTERS
                    and existing.filters == GPA_TEMPLATE_OLD_FILTERS[template.name]
                ):
                    existing.filters = template.filters
                    existing.sort_by = template.sort_by
                    logger.info("Template '%s': its GPA filter is now on the percent scale.", template.name)
                logger.debug(f"Template '{template.name}' already exists. Skipping.")
            else:
                self.db.add(template)
                imported_count += 1
                logger.debug(
                    f"Adding template: '{template.name}' (category: {template.category}, type: {template.report_type})"
                )

        self.db.commit()
        logger.info(
            f"Successfully imported {imported_count}/{len(default_templates)} templates. {len(default_templates) - imported_count} already existed."
        )
        return imported_count
