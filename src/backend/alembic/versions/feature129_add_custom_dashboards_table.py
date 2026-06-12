"""Create custom_dashboards table for user dashboard configurations.

Revision ID: feature129_add_custom_dashboards_table
Revises: feature_export_jobs_table
Create Date: 2026-06-09 12:00:00.000000

This migration creates the custom_dashboards table to support personalized
dashboard configurations (Phase A, Feature 3).

Table created:
- custom_dashboards: User-specific dashboard configurations with selected charts
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = "feature129_add_custom_dashboards_table"
down_revision = "feature_export_jobs_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create custom_dashboards table."""

    # Create custom_dashboards table
    op.create_table(
        "custom_dashboards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("configuration", sa.JSON(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_custom_dashboards_user_name"),
    )

    # Create indexes for custom_dashboards
    op.create_index("ix_custom_dashboards_user_id", "custom_dashboards", ["user_id"])
    op.create_index("ix_custom_dashboards_is_default", "custom_dashboards", ["is_default"])
    op.create_index("ix_custom_dashboards_created_at", "custom_dashboards", ["created_at"])


def downgrade() -> None:
    """Drop custom_dashboards table."""

    # Drop custom_dashboards table
    op.drop_table("custom_dashboards")
