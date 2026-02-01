from datetime import date
from pathlib import Path

from backend.models import GeneratedReport, Report, Student
from backend.services.custom_report_generation_service import CustomReportGenerationService


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
