"""derive course is_active from enrollments

A course is now active exactly while it has at least one student with an
active enrollment (see backend.services.course_activation). This migration:

- recomputes courses.is_active for every existing course from its enrollments
  (replacing the old semester-name date guess), and
- makes new rows default to inactive (server default FALSE).

Revision ID: b97c31e9c95f
Revises: a3f7c9e2b5d1
Create Date: 2026-09-24 16:37:31.701884

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b97c31e9c95f"
down_revision: Union[str, None] = "a3f7c9e2b5d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_RECOMPUTE = sa.text(
    """
    UPDATE courses SET is_active = EXISTS (
        SELECT 1 FROM course_enrollments e
        WHERE e.course_id = courses.id
          AND e.deleted_at IS NULL
          AND e.status = 'active'
    )
    """
)


def upgrade() -> None:
    with op.batch_alter_table("courses") as batch_op:
        batch_op.alter_column("is_active", existing_type=sa.Boolean(), server_default=sa.false())
    op.execute(_RECOMPUTE)


def downgrade() -> None:
    # Only the default is restored: the previous per-course values came from a
    # date heuristic and are not recoverable (they are re-derived from dates by
    # the old scheduler after a downgrade).
    with op.batch_alter_table("courses") as batch_op:
        batch_op.alter_column("is_active", existing_type=sa.Boolean(), server_default=sa.true())
