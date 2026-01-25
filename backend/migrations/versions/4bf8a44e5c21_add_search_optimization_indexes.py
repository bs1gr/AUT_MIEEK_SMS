"""Add search optimization indexes for Phase 4 full-text search

Revision ID: 4bf8a44e5c21
Revises: a02276d026d0
Create Date: 2026-01-25 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4bf8a44e5c21'
down_revision: Union[str, None] = 'a02276d026d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create indexes for full-text search optimization."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("student"):
        # If the student table does not exist (e.g., empty test DB), skip index creation.
        return

    # Single-column indexes for filtering
    op.create_index('ix_student_status', 'student', ['status'], unique=False)
    op.create_index('ix_student_created_at', 'student', ['created_at'], unique=False)
    op.create_index('ix_student_updated_at', 'student', ['updated_at'], unique=False)

    if inspector.has_table("enrollment"):
        op.create_index('ix_enrollment_enrollment_type', 'enrollment', ['enrollment_type'], unique=False)

    # Composite index for complex search queries
    op.create_index(
        'ix_student_search_composite',
        'student',
        ['status', 'created_at', 'id'],
        unique=False
    )


def downgrade() -> None:
    """Drop search optimization indexes."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("student"):
        op.drop_index('ix_student_search_composite', table_name='student')
        op.drop_index('ix_student_updated_at', table_name='student')
        op.drop_index('ix_student_created_at', table_name='student')
        op.drop_index('ix_student_status', table_name='student')

    if inspector.has_table("enrollment"):
        op.drop_index('ix_enrollment_enrollment_type', table_name='enrollment')
