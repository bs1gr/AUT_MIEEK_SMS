"""The GPA report templates on the percent scale (data only)

Revision ID: e5c1a7d9b3f2
Revises: d8b3f1a6c2e9
Create Date: 2026-11-24 19:00:00.000000

Plan todo 75 stage 5. The student "gpa" of a custom report is the mean of the grades in percent, 0
to 100, but three system templates filtered it on a four-point scale: "Honor Roll - High
Achievers" and "Top Performers - GPA Analytics" took 3.5 or more (nearly every graded student),
"At-Risk Students - Low Grades" under 2.0 (nobody; its description says under 60). The templates
are imported once and never again, so the copies already stored keep the old values unless this
changes them: 85 or more (the strength level of Analytics), under 60, and a sort by GPA. A copy
that someone has changed since is left as it is. Reports already made from these templates are
the users' own and are not touched.

Nothing to undo: the old values were wrong (the downgrade leaves the data as it is).
"""

import json

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "e5c1a7d9b3f2"
down_revision = "d8b3f1a6c2e9"
branch_labels = None
depends_on = None

# Frozen here (a migration does not read the application's code).
OLD_FILTERS = {
    "Honor Roll - High Achievers": [{"field": "gpa", "operator": "gte", "value": 3.5}],
    "At-Risk Students - Low Grades": [{"field": "gpa", "operator": "lt", "value": 2.0}],
    "Top Performers - GPA Analytics": [{"field": "gpa", "operator": "gte", "value": 3.5}],
}
NEW_FILTERS = {
    "Honor Roll - High Achievers": [{"field": "gpa", "operator": "gte", "value": 85}],
    "At-Risk Students - Low Grades": [{"field": "gpa", "operator": "lt", "value": 60}],
    "Top Performers - GPA Analytics": [{"field": "gpa", "operator": "gte", "value": 85}],
}
NEW_SORT = {
    "Honor Roll - High Achievers": [{"field": "gpa", "order": "desc"}],
    "At-Risk Students - Low Grades": [{"field": "gpa", "order": "asc"}],
    "Top Performers - GPA Analytics": [{"field": "gpa", "order": "desc"}],
}


def upgrade() -> None:
    bind = op.get_bind()
    if "report_templates" not in sa.inspect(bind).get_table_names():
        return
    templates = sa.table(
        "report_templates",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("is_system", sa.Boolean),
        sa.column("filters", sa.JSON),
        sa.column("sort_by", sa.JSON),
    )
    rows = bind.execute(
        sa.select(templates.c.id, templates.c.name, templates.c.filters).where(
            templates.c.name.in_(list(OLD_FILTERS)), templates.c.is_system.is_(True)
        )
    ).fetchall()
    for row in rows:
        filters = json.loads(row.filters) if isinstance(row.filters, str) else row.filters
        if filters == OLD_FILTERS[row.name]:
            bind.execute(
                templates.update()
                .where(templates.c.id == row.id)
                .values(filters=NEW_FILTERS[row.name], sort_by=NEW_SORT[row.name])
            )


def downgrade() -> None:
    pass
