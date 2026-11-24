"""Plan todo 75 stage 5 (the server side): a custom report's sort, its filters, its CSV, the templates.

- The builder saves the sort as {"<field>": "asc"|"desc"}; the generator read only {"field",
  "direction"} (one rule) or a list of {"field", "order"}, so a saved sort never applied.
- A report's filters could only be a dict, one per field; the generator knew some operators by one
  name only (the templates' "gte" and "lt" not in the query), took "between" only as {"from",
  "to"} and "in" only as a list, while the builder types both as text.
- The CSV had no byte-order mark: Excel opened it in the local code page and Greek came out garbled.
- The GPA templates filtered a 0-100 average on a four-point scale (3.5 took nearly everyone).
"""

from __future__ import annotations

import csv
from datetime import date
from pathlib import Path
from typing import cast

import pytest

from backend.models import Course, GeneratedReport, Grade, Report, ReportTemplate, Student
from backend.services.custom_report_generation_service import CustomReportGenerationService
from backend.services.custom_report_service import GPA_TEMPLATE_FILTERS, CustomReportService
from backend.tests.test_custom_reports_router import _create_admin_token, _report_payload


@pytest.fixture
def students(db):
    """Βασίλης Γεωργίου (gpa 90), Άννα Δημητρίου (55), Ανδρέας Αλεξίου (70), in that order."""
    course = Course(course_code="SRT1", course_name="Μηχανική", semester="Χειμερινό 2026", credits=3)
    db.add(course)
    db.commit()
    made = []
    for i, (first, last, grade) in enumerate(
        [("Βασίλης", "Γεωργίου", 90), ("Άννα", "Δημητρίου", 55), ("Ανδρέας", "Αλεξίου", 70)]
    ):
        student = Student(
            first_name=first,
            last_name=last,
            email=f"sort{i}@example.com",
            student_id=f"SRT-{i}",
            enrollment_date=date(2026, 1, 10 + i),
            is_active=True,
        )
        db.add(student)
        db.commit()
        db.add(
            Grade(
                student_id=student.id,
                course_id=course.id,
                assignment_name="Εργασία",
                category="Homework",
                grade=grade,
                max_grade=100,
                date_submitted=date(2026, 1, 15 + i),
            )
        )
        made.append(student)
    db.commit()
    return made


def _rows(
    db, tmp_path: Path, *, report_type="student", columns=("first_name", "last_name"), filters=None, sort_by=None
):
    report = Report(
        user_id=1,
        name="Sort and filters",
        report_type=report_type,
        fields={"columns": list(columns)},
        filters=filters,
        sort_by=sort_by,
        export_format="csv",
        include_charts=False,
    )
    db.add(report)
    db.commit()
    generated = GeneratedReport(
        report_id=report.id, user_id=1, file_name="r.csv", export_format="csv", status="pending"
    )
    db.add(generated)
    db.commit()
    service = CustomReportGenerationService(db)
    service.reports_dir = str(tmp_path)
    service.generate_report(cast(int, report.id), cast(int, generated.id), 1, "csv", include_charts=False)
    db.refresh(generated)
    assert generated.status == "completed", generated.error_message
    raw = Path(generated.file_path).read_bytes()
    with open(generated.file_path, encoding="utf-8-sig", newline="") as handle:
        return raw, list(csv.reader(handle))[1:]


def test_the_builders_saved_sort_applies(db, tmp_path, students):
    _, rows = _rows(db, tmp_path, sort_by={"last_name": "desc"})

    assert [row[1] for row in rows] == ["Δημητρίου", "Γεωργίου", "Αλεξίου"]


def test_several_sort_rules_apply_first_rule_first(db, tmp_path, students):
    _, rows = _rows(
        db,
        tmp_path,
        columns=("first_name", "gpa"),
        sort_by=[{"field": "gpa", "order": "desc"}, {"field": "first_name"}],
    )

    assert [row[0] for row in rows] == ["Βασίλης", "Ανδρέας", "Άννα"]


def test_the_older_sort_shape_still_applies(db, tmp_path, students):
    _, rows = _rows(db, tmp_path, sort_by={"field": "last_name", "direction": "asc"})

    assert [row[1] for row in rows] == ["Αλεξίου", "Γεωργίου", "Δημητρίου"]


def test_several_filters_on_one_field(db, tmp_path, students):
    filters = [
        {"field": "gpa", "operator": "greater_than_or_equal", "value": "60"},
        {"field": "gpa", "operator": "less_than", "value": "80"},
    ]

    _, rows = _rows(db, tmp_path, filters=filters)

    assert [row[0] for row in rows] == ["Ανδρέας"]


@pytest.mark.parametrize(
    "operator, value, expected",
    [
        ("gte", 70, ["Βασίλης", "Ανδρέας"]),  # the templates' short names, also in the query
        ("lt", 60, ["Άννα"]),
        ("between", "60, 95", ["Βασίλης", "Ανδρέας"]),  # typed in the builder as text
        ("between", {"from": 50, "to": 60}, ["Άννα"]),
        ("in", "Άννα, Ανδρέας", ["Άννα", "Ανδρέας"]),
    ],
)
def test_the_operators_by_any_name_and_as_typed(db, tmp_path, students, operator, value, expected):
    field = "first_name" if operator == "in" else "gpa"

    _, rows = _rows(db, tmp_path, filters=[{"field": field, "operator": operator, "value": value}])

    assert sorted(row[0] for row in rows) == sorted(expected)


def test_filters_on_a_grade_report_column_typed_as_text(db, tmp_path, students):
    # The query takes "90" for a number and the dates as dates; "contains" on a number is left
    # to the rows' check (PostgreSQL has no ILIKE on a number), and nothing fails.
    _, by_grade = _rows(
        db,
        tmp_path,
        report_type="grade",
        columns=("grade",),
        filters=[{"field": "grade", "operator": "gte", "value": "70"}],
    )
    _, by_date = _rows(
        db,
        tmp_path,
        report_type="grade",
        columns=("grade",),
        filters=[{"field": "date_submitted", "operator": "between", "value": "2026-01-16,2026-01-17"}],
    )
    _, contains = _rows(
        db,
        tmp_path,
        report_type="grade",
        columns=("grade",),
        filters=[{"field": "grade", "operator": "contains", "value": "5"}],
    )

    assert sorted(float(row[0]) for row in by_grade) == [70.0, 90.0]
    assert sorted(float(row[0]) for row in by_date) == [55.0, 70.0]
    assert [float(row[0]) for row in contains] == [55.0]


def test_an_empty_value_against_a_number_is_no_match_not_an_error(db, tmp_path, students):
    _, rows = _rows(
        db, tmp_path, columns=("first_name", "phone"), filters=[{"field": "phone", "operator": "gt", "value": 5}]
    )

    assert rows == []


def test_the_csv_has_a_byte_order_mark_for_excel(db, tmp_path, students):
    raw, rows = _rows(db, tmp_path)

    assert raw.startswith(b"\xef\xbb\xbf")
    assert "Βασίλης" in [row[0] for row in rows]


def test_the_gpa_templates_use_the_percent_scale(db):
    CustomReportService(db).import_default_templates()

    templates = {t.name: t for t in db.query(ReportTemplate).filter(ReportTemplate.name.in_(GPA_TEMPLATE_FILTERS))}
    assert {name: t.filters for name, t in templates.items()} == {
        "Honor Roll - High Achievers": [{"field": "gpa", "operator": "gte", "value": 85}],
        "At-Risk Students - Low Grades": [{"field": "gpa", "operator": "lt", "value": 60}],
        "Top Performers - GPA Analytics": [{"field": "gpa", "operator": "gte", "value": 85}],
    }
    assert templates["Top Performers - GPA Analytics"].sort_by == [{"field": "gpa", "order": "desc"}]


def test_an_imported_copy_is_repaired_and_an_edited_one_left(db):
    def system(name, filters):
        db.add(
            ReportTemplate(
                name=name, category="analytics", report_type="student", fields=["gpa"], filters=filters, is_system=True
            )
        )

    system("Top Performers - GPA Analytics", [{"field": "gpa", "operator": "gte", "value": 3.5}])
    system("Honor Roll - High Achievers", [{"field": "gpa", "operator": "gte", "value": 92}])  # edited since
    db.commit()

    CustomReportService(db).import_default_templates()

    stored = {t.name: t.filters for t in db.query(ReportTemplate).filter(ReportTemplate.name.in_(GPA_TEMPLATE_FILTERS))}
    assert stored["Top Performers - GPA Analytics"] == [{"field": "gpa", "operator": "gte", "value": 85}]
    assert stored["Honor Roll - High Achievers"] == [{"field": "gpa", "operator": "gte", "value": 92}]


def test_the_migration_repairs_the_stored_copies_only_when_untouched(tmp_path):
    import json

    from alembic import command
    from sqlalchemy import create_engine, text

    from backend.tests.test_unmapped_legacy_columns import _alembic

    url = f"sqlite:///{(tmp_path / 'templates.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, "d8b3f1a6c2e9")
    engine = create_engine(url)
    insert = text(
        "INSERT INTO report_templates (name, category, report_type, fields, filters, is_system, is_active, "
        "default_export_format, default_include_charts) VALUES (:name, 'analytics', 'student', '[\"gpa\"]', "
        ":filters, :system, 1, 'pdf', 1)"
    )
    try:
        with engine.begin() as conn:
            for name, filters, system in [
                ("Top Performers - GPA Analytics", [{"field": "gpa", "operator": "gte", "value": 3.5}], 1),
                ("At-Risk Students - Low Grades", [{"field": "gpa", "operator": "lt", "value": 2.0}], 1),
                ("Honor Roll - High Achievers", [{"field": "gpa", "operator": "gte", "value": 92}], 1),  # edited
            ]:
                conn.execute(insert, {"name": name, "filters": json.dumps(filters), "system": system})

        command.upgrade(cfg, "e5c1a7d9b3f2")

        with engine.connect() as conn:
            stored = {
                name: (json.loads(filters), json.loads(sort_by) if sort_by else None)
                for name, filters, sort_by in conn.execute(text("SELECT name, filters, sort_by FROM report_templates"))
            }
        assert stored["Top Performers - GPA Analytics"] == (
            [{"field": "gpa", "operator": "gte", "value": 85}],
            [{"field": "gpa", "order": "desc"}],
        )
        assert stored["At-Risk Students - Low Grades"][0] == [{"field": "gpa", "operator": "lt", "value": 60}]
        assert stored["Honor Roll - High Achievers"] == ([{"field": "gpa", "operator": "gte", "value": 92}], None)
        command.downgrade(cfg, "d8b3f1a6c2e9")
        command.upgrade(cfg, "head")
    finally:
        engine.dispose()


def test_a_report_takes_lists_of_filters_and_sort_rules_through_the_api(client, db):
    headers = {"Authorization": f"Bearer {_create_admin_token(client, db)}"}
    payload = {
        **_report_payload(),
        "filters": [
            {"field": "gpa", "operator": "gte", "value": 60},
            {"field": "gpa", "operator": "lt", "value": 80},
        ],
        "sort_by": [{"field": "gpa", "order": "desc"}, {"field": "last_name", "order": "asc"}],
    }

    created = client.post("/api/v1/custom-reports", json=payload, headers=headers)

    assert created.status_code == 200, created.text
    data = created.json()["data"]
    assert len(data["filters"]) == 2 and data["sort_by"][0] == {"field": "gpa", "order": "desc"}
    updated = client.put(f"/api/v1/custom-reports/{data['id']}", json={"sort_by": [{"field": "gpa"}]}, headers=headers)
    assert updated.status_code == 200, updated.text
