"""Add SavedSearch table for Phase 4

Revision ID: a02276d026d0
Revises: 6f83bf257dc0
Create Date: 2026-01-22 10:06:37.109957

This migration adds the SavedSearch table to support Phase 4 feature:
Advanced Search & Filtering. Includes full-text search, advanced filters,
and saved search functionality for students, courses, and grades.

Indexes created:
- user_id: For quick user lookup
- search_type: For filtering by search type
- is_favorite: For quick favorite queries
- name: For search by saved search name
- created_at: For sorting by creation time
- deleted_at: For soft delete filtering
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a02276d026d0"
down_revision: Union[str, None] = "6f83bf257dc0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create SavedSearch table and indexes."""
    # Create the saved_searches table
    op.create_table(
        "saved_searches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("search_type", sa.String(length=50), nullable=False),
        sa.Column("query", sa.String(length=500), nullable=True),
        sa.Column("filters", sa.JSON(), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for performance optimization
    op.create_index("ix_saved_searches_user_id", "saved_searches", ["user_id"], unique=False)
    op.create_index("ix_saved_searches_search_type", "saved_searches", ["search_type"], unique=False)
    op.create_index("ix_saved_searches_is_favorite", "saved_searches", ["is_favorite"], unique=False)
    op.create_index("ix_saved_searches_name", "saved_searches", ["name"], unique=False)
    op.create_index("ix_saved_searches_created_at", "saved_searches", ["created_at"], unique=False)
    op.create_index("ix_saved_searches_deleted_at", "saved_searches", ["deleted_at"], unique=False)


def downgrade() -> None:
    """Drop SavedSearch table and indexes."""
    # Drop indexes
    op.drop_index("ix_saved_searches_deleted_at", table_name="saved_searches")
    op.drop_index("ix_saved_searches_created_at", table_name="saved_searches")
    op.drop_index("ix_saved_searches_name", table_name="saved_searches")
    op.drop_index("ix_saved_searches_is_favorite", table_name="saved_searches")
    op.drop_index("ix_saved_searches_search_type", table_name="saved_searches")
    op.drop_index("ix_saved_searches_user_id", table_name="saved_searches")

    # Drop table
    op.drop_table("saved_searches")
