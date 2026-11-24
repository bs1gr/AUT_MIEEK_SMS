"""Failed courses in the semester archive: the reason, a count per run, one passed record per course

Revision ID: d8b3f1a6c2e9
Revises: c7d4e2a9f1b6
Create Date: 2026-11-24 18:00:00.000000

Plan todo 87 (the owner, 2026-11-24): "if the student fail, should retake the course from the
beginning, nothing remains from that course. He/She has to repeat fresh". The semester archive run
records a failed course in the student's history (passed false, with the reason) and clears that
enrolment's records, as it already did for a passed one, so the student is enrolled again with a
clean record.

- student_course_performance.fail_reason, nullable: empty for every record already stored (all of
  them passed).
- semester_archive_exports.enrollments_failed, with the server default 0, so an installation still
  on an older version keeps inserting its runs.
- idx_student_course_performance_unique covers the passed records only. A course code exists once,
  so the course taken again is the same course row, perhaps under the same semester label: a failed
  attempt must not stop it from being recorded as passed. Every record stored so far is passed, so
  nothing that was unique stops being unique.

An older version keeps working on a database that has these: it never writes a failed record.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "d8b3f1a6c2e9"
down_revision = "c7d4e2a9f1b6"
branch_labels = None
depends_on = None

PERFORMANCE = "student_course_performance"
EXPORTS = "semester_archive_exports"
UNIQUE_INDEX = "idx_student_course_performance_unique"
UNIQUE_COLUMNS = ["student_id", "course_code", "semester"]


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return index_name in [ix["name"] for ix in inspector.get_indexes(table_name)]


def upgrade() -> None:
    if not _has_column(PERFORMANCE, "fail_reason"):
        op.add_column(PERFORMANCE, sa.Column("fail_reason", sa.String(length=40), nullable=True))
    if not _has_column(EXPORTS, "enrollments_failed"):
        op.add_column(EXPORTS, sa.Column("enrollments_failed", sa.Integer(), nullable=False, server_default="0"))
    if _has_index(PERFORMANCE, UNIQUE_INDEX):
        op.drop_index(UNIQUE_INDEX, table_name=PERFORMANCE)
    op.create_index(
        UNIQUE_INDEX,
        PERFORMANCE,
        UNIQUE_COLUMNS,
        unique=True,
        sqlite_where=sa.text("passed"),
        postgresql_where=sa.text("passed"),
    )


def downgrade() -> None:
    # The index stays passed-only. The whole-table one cannot be made while a failed attempt and
    # the passed record of the course taken again share a key, which is what this revision is for,
    # and an older version never relies on it (it looks for a record before writing one). The
    # failed records stay: the semester archive's backups hold what they replaced, and nothing is
    # deleted on the way back.
    if _has_column(EXPORTS, "enrollments_failed"):
        with op.batch_alter_table(EXPORTS) as batch:
            batch.drop_column("enrollments_failed")
    if _has_column(PERFORMANCE, "fail_reason"):
        with op.batch_alter_table(PERFORMANCE) as batch:
            batch.drop_column("fail_reason")
