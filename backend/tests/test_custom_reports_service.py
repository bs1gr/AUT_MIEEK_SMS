from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.models import GeneratedReport, Report, ReportTemplate, User
from backend.schemas.custom_reports import (
    CustomReportCreate,
    CustomReportUpdate,
    GeneratedReportCreate,
    GeneratedReportUpdate,
    ReportTemplateCreate,
    ReportTemplateUpdate,
)
from backend.security.password_hash import get_password_hash
from backend.services.custom_report_service import CustomReportService


def _create_user(db, email: str = "reporter@example.com") -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("Password123!"),
        role="admin",
        is_active=True,
        full_name="Report User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _template_payload(name: str = "Template A") -> ReportTemplateCreate:
    return ReportTemplateCreate(
        name=name,
        description="Template description",
        category="academic",
        report_type="student",
        fields={"columns": ["first_name", "last_name"]},
        filters={"status": "active"},
        aggregations=None,
        sort_by={"field": "last_name", "direction": "asc"},
        default_export_format="pdf",
        default_include_charts=True,
        is_system=False,
    )


def _report_payload(name: str = "Report A") -> CustomReportCreate:
    return CustomReportCreate(
        name=name,
        description="Report description",
        report_type="student",
        template_id=None,
        fields={"columns": ["first_name", "last_name", "email"]},
        filters={"status": "active"},
        aggregations={"count": "students"},
        sort_by={"field": "last_name", "direction": "asc"},
        export_format="pdf",
        include_charts=True,
        schedule_enabled=False,
        schedule_frequency=None,
        schedule_cron=None,
        email_recipients=None,
        email_enabled=False,
    )


def test_template_crud(db):
    service = CustomReportService(db)

    created = service.create_template(_template_payload())
    assert created.id > 0
    assert created.name == "Template A"

    listed = service.list_templates(category="academic", report_type="student", is_active=True)
    assert len(listed) == 1
    assert listed[0].id == created.id

    fetched = service.get_template(created.id)
    assert fetched is not None
    assert fetched.name == "Template A"

    updated = service.update_template(created.id, ReportTemplateUpdate(name="Template B", is_active=False))
    assert updated is not None
    assert updated.name == "Template B"
    assert updated.is_active is False

    assert service.delete_template(created.id, hard_delete=False) is True
    db.refresh(created)
    assert created.is_active is False

    hard_template = service.create_template(_template_payload(name="Template Hard"))
    assert service.delete_template(hard_template.id, hard_delete=True) is True
    assert db.query(ReportTemplate).filter(ReportTemplate.id == hard_template.id).first() is None


def test_report_crud_and_soft_delete(db):
    user = _create_user(db)
    service = CustomReportService(db)

    report = service.create_report(user.id, _report_payload())
    assert report.id > 0
    assert report.user_id == user.id

    listed = service.list_reports(user.id)
    assert len(listed) == 1

    updated = service.update_report(report.id, user.id, CustomReportUpdate(name="Report Updated"))
    assert updated is not None
    assert updated.name == "Report Updated"

    assert service.delete_report(report.id, user.id, hard_delete=False) is True
    db.refresh(report)
    assert report.deleted_at is not None

    visible_reports = service.list_reports(user.id)
    assert visible_reports == []
    all_reports = service.list_reports(user.id, include_deleted=True)
    assert len(all_reports) == 1

    fresh_report = service.create_report(user.id, _report_payload(name="Report Hard"))
    assert service.delete_report(fresh_report.id, user.id, hard_delete=True) is True
    assert db.query(Report).filter(Report.id == fresh_report.id).first() is None


def test_generated_report_and_stats(db):
    user = _create_user(db, email="stats@example.com")
    service = CustomReportService(db)

    report = service.create_report(user.id, _report_payload())

    create_data = GeneratedReportCreate(
        report_id=report.id,
        user_id=user.id,
        file_name="report_1.pdf",
        export_format="pdf",
        file_path="/tmp/report_1.pdf",
        file_size_bytes=1024,
        status="pending",
        record_count=10,
    )
    generated = service.create_generated_report(report.id, user.id, create_data)
    assert generated.id > 0
    assert generated.status == "pending"

    listed = service.list_generated_reports(report.id, user.id)
    assert len(listed) == 1

    update_data = GeneratedReportUpdate(
        status="completed",
        generation_duration_seconds=3.5,
        email_sent=True,
        email_sent_at=datetime.now(timezone.utc),
    )
    updated = service.update_generated_report(report.id, generated.id, user.id, update_data)
    assert updated is not None
    assert updated.status == "completed"

    stats = service.get_report_statistics(user.id)
    assert stats["total_reports"] == 1
    assert stats["total_generated_reports"] == 1
    assert stats["generated_reports_last_30_days"] == 1
    assert stats["reports_by_type"].get("student") == 1

    # Create an older generated report to verify last 30 days filter
    older = GeneratedReport(
        report_id=report.id,
        user_id=user.id,
        file_name="report_old.pdf",
        export_format="pdf",
        status="completed",
        generated_at=datetime.now(timezone.utc) - timedelta(days=45),
    )
    db.add(older)
    db.commit()

    stats_after = service.get_report_statistics(user.id)
    assert stats_after["total_generated_reports"] == 2
    assert stats_after["generated_reports_last_30_days"] == 1
