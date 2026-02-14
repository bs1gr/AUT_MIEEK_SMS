#!/usr/bin/env python3
"""Migrate report templates/reports from study_year to academic_year.

Updates JSON fields (fields, filters, aggregations, sort_by) in report_templates
and reports tables to use academic_year. Also updates template names/
descriptions referencing Study Year to Class.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import get_settings  # noqa: E402
from backend.models import Report, ReportTemplate  # noqa: E402


def replace_study_year(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        return "academic_year" if value == "study_year" else value
    if isinstance(value, list):
        return [replace_study_year(item) for item in value]
    if isinstance(value, dict):
        updated: dict[str, Any] = {}
        for key, item in value.items():
            new_key = "academic_year" if key == "study_year" else key
            updated[new_key] = replace_study_year(item)
        return updated
    return value


def update_template_text(template: ReportTemplate) -> bool:
    changed = False
    if template.name:
        new_name = (
            template.name.replace("Students by Study Year", "Students by Class")
            .replace("Performance Analytics - By Study Year", "Performance Analytics - By Class")
        )
        if new_name != template.name:
            template.name = new_name
            changed = True
    if template.description:
        new_desc = (
            template.description.replace("study year", "class")
            .replace("Study Year", "Class")
            .replace("year of study", "class")
        )
        if new_desc != template.description:
            template.description = new_desc
            changed = True
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate study_year to academic_year in reports/templates")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without committing")
    parser.add_argument("--verbose", action="store_true", help="Print per-record updates")
    args = parser.parse_args()

    engine = create_engine(get_settings().DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)

    template_updates = 0
    report_updates = 0

    with SessionLocal() as session:
        templates = session.query(ReportTemplate).all()
        for template in templates:
            changed = False
            new_fields = replace_study_year(template.fields)
            new_filters = replace_study_year(template.filters)
            new_aggs = replace_study_year(template.aggregations)
            new_sort = replace_study_year(template.sort_by)

            if new_fields != template.fields:
                template.fields = new_fields
                changed = True
            if new_filters != template.filters:
                template.filters = new_filters
                changed = True
            if new_aggs != template.aggregations:
                template.aggregations = new_aggs
                changed = True
            if new_sort != template.sort_by:
                template.sort_by = new_sort
                changed = True

            changed = update_template_text(template) or changed

            if changed:
                template_updates += 1
                if args.verbose:
                    print(f"Updated template {template.id}: {template.name}")

        reports = session.query(Report).all()
        for report in reports:
            changed = False
            new_fields = replace_study_year(report.fields)
            new_filters = replace_study_year(report.filters)
            new_aggs = replace_study_year(report.aggregations)
            new_sort = replace_study_year(report.sort_by)

            if new_fields != report.fields:
                report.fields = new_fields
                changed = True
            if new_filters != report.filters:
                report.filters = new_filters
                changed = True
            if new_aggs != report.aggregations:
                report.aggregations = new_aggs
                changed = True
            if new_sort != report.sort_by:
                report.sort_by = new_sort
                changed = True

            if changed:
                report_updates += 1
                if args.verbose:
                    print(f"Updated report {report.id}: {report.name}")

        if args.dry_run:
            session.rollback()
        else:
            session.commit()

    print(
        "Migration complete."
        f" Templates updated: {template_updates}."
        f" Reports updated: {report_updates}."
        + (" (dry-run)" if args.dry_run else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
