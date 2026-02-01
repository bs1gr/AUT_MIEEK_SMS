"""Add report tables for Phase 6 reporting system

Revision ID: 8f9594fc435d
Revises: aaca6b9fdf8c
Create Date: 2026-02-01 02:19:34.571519

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f9594fc435d'
down_revision: Union[str, None] = 'aaca6b9fdf8c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in set(inspector.get_table_names())


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return any(idx.get("name") == index_name for idx in inspector.get_indexes(table_name))


def _ensure_index(inspector: sa.Inspector, index_name: str, table_name: str, columns: list[str], unique: bool) -> None:
    if not _index_exists(inspector, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "report_templates"):
        op.create_table(
            "report_templates",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("category", sa.String(length=50), nullable=False),
            sa.Column("report_type", sa.String(length=50), nullable=False),
            sa.Column("fields", sa.JSON(), nullable=False),
            sa.Column("filters", sa.JSON(), nullable=True),
            sa.Column("aggregations", sa.JSON(), nullable=True),
            sa.Column("sort_by", sa.JSON(), nullable=True),
            sa.Column("default_export_format", sa.String(length=20), nullable=True),
            sa.Column("default_include_charts", sa.Boolean(), nullable=True),
            sa.Column("is_system", sa.Boolean(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    _ensure_index(inspector, op.f("ix_report_templates_id"), "report_templates", ["id"], unique=False)
    _ensure_index(inspector, op.f("ix_report_templates_name"), "report_templates", ["name"], unique=True)
    _ensure_index(inspector, "ix_report_templates_category", "report_templates", ["category"], unique=False)
    _ensure_index(inspector, "ix_report_templates_report_type", "report_templates", ["report_type"], unique=False)
    _ensure_index(inspector, "ix_report_templates_is_active", "report_templates", ["is_active"], unique=False)

    if not _table_exists(inspector, "reports"):
        op.create_table(
            "reports",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("report_type", sa.String(length=50), nullable=False),
            sa.Column("template_id", sa.Integer(), nullable=True),
            sa.Column("fields", sa.JSON(), nullable=False),
            sa.Column("filters", sa.JSON(), nullable=True),
            sa.Column("aggregations", sa.JSON(), nullable=True),
            sa.Column("sort_by", sa.JSON(), nullable=True),
            sa.Column("export_format", sa.String(length=20), nullable=True),
            sa.Column("include_charts", sa.Boolean(), nullable=True),
            sa.Column("schedule_enabled", sa.Boolean(), nullable=True),
            sa.Column("schedule_frequency", sa.String(length=20), nullable=True),
            sa.Column("schedule_cron", sa.String(length=100), nullable=True),
            sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("email_recipients", sa.JSON(), nullable=True),
            sa.Column("email_enabled", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["template_id"], ["report_templates.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    _ensure_index(inspector, op.f("ix_reports_id"), "reports", ["id"], unique=False)
    _ensure_index(inspector, op.f("ix_reports_name"), "reports", ["name"], unique=False)
    _ensure_index(inspector, op.f("ix_reports_report_type"), "reports", ["report_type"], unique=False)
    _ensure_index(inspector, op.f("ix_reports_schedule_enabled"), "reports", ["schedule_enabled"], unique=False)
    _ensure_index(inspector, op.f("ix_reports_created_at"), "reports", ["created_at"], unique=False)
    _ensure_index(inspector, op.f("ix_reports_deleted_at"), "reports", ["deleted_at"], unique=False)
    _ensure_index(inspector, "ix_reports_next_run_at", "reports", ["next_run_at"], unique=False)
    _ensure_index(inspector, "ix_reports_user_id", "reports", ["user_id"], unique=False)

    if not _table_exists(inspector, "generated_reports"):
        op.create_table(
            "generated_reports",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("report_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("file_path", sa.String(length=500), nullable=True),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=True),
            sa.Column("export_format", sa.String(length=20), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("record_count", sa.Integer(), nullable=True),
            sa.Column("generation_duration_seconds", sa.Float(), nullable=True),
            sa.Column("email_sent", sa.Boolean(), nullable=True),
            sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("email_error", sa.Text(), nullable=True),
            sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    _ensure_index(inspector, op.f("ix_generated_reports_id"), "generated_reports", ["id"], unique=False)
    _ensure_index(inspector, "ix_generated_reports_report_id", "generated_reports", ["report_id"], unique=False)
    _ensure_index(inspector, "ix_generated_reports_user_id", "generated_reports", ["user_id"], unique=False)
    _ensure_index(inspector, "ix_generated_reports_status", "generated_reports", ["status"], unique=False)
    _ensure_index(inspector, "ix_generated_reports_generated_at", "generated_reports", ["generated_at"], unique=False)
    _ensure_index(inspector, op.f("ix_generated_reports_expires_at"), "generated_reports", ["expires_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _table_exists(inspector, "generated_reports"):
        op.drop_index(op.f("ix_generated_reports_expires_at"), table_name="generated_reports")
        op.drop_index("ix_generated_reports_generated_at", table_name="generated_reports")
        op.drop_index("ix_generated_reports_status", table_name="generated_reports")
        op.drop_index("ix_generated_reports_user_id", table_name="generated_reports")
        op.drop_index("ix_generated_reports_report_id", table_name="generated_reports")
        op.drop_index(op.f("ix_generated_reports_id"), table_name="generated_reports")
        op.drop_table("generated_reports")

    if _table_exists(inspector, "reports"):
        op.drop_index("ix_reports_user_id", table_name="reports")
        op.drop_index("ix_reports_next_run_at", table_name="reports")
        op.drop_index(op.f("ix_reports_deleted_at"), table_name="reports")
        op.drop_index(op.f("ix_reports_created_at"), table_name="reports")
        op.drop_index(op.f("ix_reports_schedule_enabled"), table_name="reports")
        op.drop_index(op.f("ix_reports_report_type"), table_name="reports")
        op.drop_index(op.f("ix_reports_name"), table_name="reports")
        op.drop_index(op.f("ix_reports_id"), table_name="reports")
        op.drop_table("reports")

    if _table_exists(inspector, "report_templates"):
        op.drop_index("ix_report_templates_is_active", table_name="report_templates")
        op.drop_index("ix_report_templates_report_type", table_name="report_templates")
        op.drop_index("ix_report_templates_category", table_name="report_templates")
        op.drop_index(op.f("ix_report_templates_name"), table_name="report_templates")
        op.drop_index(op.f("ix_report_templates_id"), table_name="report_templates")
        op.drop_table("report_templates")
