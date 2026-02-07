from datetime import date
from pathlib import Path

from backend.config import settings
from backend.models import GeneratedReport, Report, Student
from backend.services.custom_report_generation_service import CustomReportGenerationService
from backend.services.email_notification_service import EmailNotificationService


def _create_student(db):
    student = Student(
        first_name="Jane",
        last_name="Doe",
        email="jane.doe@example.com",
        student_id="S-100",
        enrollment_date=date(2024, 9, 1),
        is_active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def _create_report(db, user_id: int) -> Report:
    report = Report(
        user_id=user_id,
        name="Student Report",
        description="Test report",
        report_type="student",
        fields={"columns": ["first_name", "last_name", "email", "student_id"]},
        export_format="csv",
        include_charts=False,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def _create_generated_report(db, report_id: int, user_id: int) -> GeneratedReport:
    generated = GeneratedReport(
        report_id=report_id,
        user_id=user_id,
        file_name="report_test.csv",
        export_format="csv",
        status="pending",
    )
    db.add(generated)
    db.commit()
    db.refresh(generated)
    return generated


def test_generate_report_csv_creates_file(db, tmp_path: Path):
    user_id = 1
    _create_student(db)
    report = _create_report(db, user_id)
    generated = _create_generated_report(db, report.id, user_id)

    service = CustomReportGenerationService(db)
    service.reports_dir = str(tmp_path)

    service.generate_report(report.id, generated.id, user_id, "csv", include_charts=False)

    db.refresh(generated)
    assert generated.status == "completed"
    assert generated.file_path
    assert generated.file_size_bytes is not None
    assert Path(generated.file_path).exists()

    content = Path(generated.file_path).read_text(encoding="utf-8")
    assert "First Name" in content
    assert "Jane" in content


def test_send_report_email_with_attachment(db, tmp_path: Path, monkeypatch):
    user_id = 1
    _create_student(db)
    report = _create_report(db, user_id)
    report.email_recipients = ["report@example.com"]
    report.email_enabled = True
    db.commit()

    generated = _create_generated_report(db, report.id, user_id)
    attachment_path = tmp_path / "report.csv"
    attachment_path.write_text("header\nvalue\n", encoding="utf-8")
    generated.file_path = str(attachment_path)
    generated.record_count = 2
    db.commit()

    captured: dict[str, object] = {}

    def fake_send_report_ready(
        recipients,
        report_name,
        export_format,
        record_count,
        generated_at,
        attachment_paths=None,
        attachment_note=None,
    ):
        captured["recipients"] = list(recipients)
        captured["attachment_paths"] = attachment_paths
        captured["attachment_note"] = attachment_note
        return 1, []

    monkeypatch.setattr(EmailNotificationService, "is_enabled", lambda: True)
    monkeypatch.setattr(EmailNotificationService, "send_report_ready", fake_send_report_ready)

    service = CustomReportGenerationService(db)
    service._send_report_email(report, generated, "csv")

    db.refresh(generated)
    assert generated.email_sent is True
    assert generated.email_error is None
    assert generated.email_sent_at is not None
    assert captured["recipients"] == ["report@example.com"]
    assert captured["attachment_paths"] == [str(attachment_path)]
    assert captured["attachment_note"] is None


def test_send_report_email_oversized_attachment(db, tmp_path: Path, monkeypatch):
    user_id = 1
    _create_student(db)
    report = _create_report(db, user_id)
    report.email_recipients = ["report@example.com"]
    report.email_enabled = True
    db.commit()

    generated = _create_generated_report(db, report.id, user_id)
    attachment_path = tmp_path / "report.csv"
    attachment_path.write_bytes(b"a" * (2 * 1024 * 1024))
    generated.file_path = str(attachment_path)
    generated.record_count = 2
    db.commit()

    captured: dict[str, object] = {}

    def fake_send_report_ready(
        recipients,
        report_name,
        export_format,
        record_count,
        generated_at,
        attachment_paths=None,
        attachment_note=None,
    ):
        captured["recipients"] = list(recipients)
        captured["attachment_paths"] = attachment_paths
        captured["attachment_note"] = attachment_note
        return 1, []

    monkeypatch.setattr(EmailNotificationService, "is_enabled", lambda: True)
    monkeypatch.setattr(EmailNotificationService, "send_report_ready", fake_send_report_ready)
    monkeypatch.setattr(settings, "SMTP_ATTACHMENT_MAX_MB", 1, raising=False)

    service = CustomReportGenerationService(db)
    service._send_report_email(report, generated, "csv")

    db.refresh(generated)
    assert generated.email_sent is True
    assert generated.email_error is None
    assert generated.email_sent_at is not None
    assert captured["recipients"] == ["report@example.com"]
    assert captured["attachment_paths"] in (None, [])
    assert isinstance(captured["attachment_note"], str)
