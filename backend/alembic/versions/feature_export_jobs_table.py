"""Create export_jobs and import_export_history tables.

Revision ID: feature_export_jobs_table
Revises: feature128_add_search_indexes
Create Date: 2026-01-31 16:00:00.000000

This migration creates the export_jobs and import_export_history tables
to support async export functionality (Phase 4, Issue #149).

Tables created:
- export_jobs: Track bulk export operations (students/courses/grades)
- import_export_history: Audit trail for all import/export operations
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = "feature_export_jobs_table"
down_revision = "feature128_add_search_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create export_jobs and import_export_history tables."""

    # Create export_jobs table
    op.create_table(
        "export_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("export_type", sa.String(50), nullable=False),
        sa.Column("file_format", sa.String(10), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("total_records", sa.Integer(), server_default="0"),
        sa.Column("filters", sa.JSON(), nullable=True),
        sa.Column("scheduled", sa.Boolean(), server_default="0"),
        sa.Column("schedule_frequency", sa.String(50), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for export_jobs
    op.create_index("ix_export_job_status", "export_jobs", ["status"])
    op.create_index("ix_export_job_created_at", "export_jobs", ["created_at"])
    op.create_index("ix_export_job_export_type", "export_jobs", ["export_type"])

    # Create import_export_history table
    op.create_table(
        "import_export_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("operation_type", sa.String(50), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("job_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for import_export_history
    op.create_index("ix_import_export_history_operation_type", "import_export_history", ["operation_type"])
    op.create_index("ix_import_export_history_resource_type", "import_export_history", ["resource_type"])
    op.create_index("ix_import_export_history_timestamp", "import_export_history", ["timestamp"])


def downgrade() -> None:
    """Drop export_jobs and import_export_history tables."""

    # Drop import_export_history table
    op.drop_table("import_export_history")

    # Drop export_jobs table
    op.drop_table("export_jobs")
