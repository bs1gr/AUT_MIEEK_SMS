"""Add notification and notification_preference tables for real-time notifications

Revision ID: aabbccdd2025
Revises: d377f961aa1f
Create Date: 2026-01-05 15:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "aabbccdd2025"
down_revision: Union[str, None] = "d377f961aa1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("notification_type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_user_notifications", "notifications", ["user_id", "created_at"], unique=False)
    op.create_index("idx_unread_notifications", "notifications", ["user_id", "is_read"], unique=False)
    op.create_index(op.f("ix_notifications_is_read"), "notifications", ["is_read"], unique=False)
    op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)

    # Create notification_preferences table
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        # In-app notifications
        sa.Column("in_app_enabled", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("in_app_grade_updates", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("in_app_attendance", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("in_app_course_updates", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("in_app_system_messages", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        # Email notifications
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("email_grade_updates", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("email_attendance", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("email_course_updates", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("email_system_messages", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        # SMS notifications
        sa.Column("sms_enabled", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("sms_phone", sa.String(length=20), nullable=True),
        sa.Column("sms_grade_updates", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("sms_attendance", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        # Quiet hours
        sa.Column("quiet_hours_enabled", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("quiet_hours_start", sa.String(length=5), nullable=True),
        sa.Column("quiet_hours_end", sa.String(length=5), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_notification_preferences_user_id"), "notification_preferences", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_notification_preferences_user_id"), table_name="notification_preferences")
    op.drop_table("notification_preferences")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_is_read"), table_name="notifications")
    op.drop_index("idx_unread_notifications", table_name="notifications")
    op.drop_index("idx_user_notifications", table_name="notifications")
    op.drop_table("notifications")
