"""add students fulltext index (PostgreSQL)

Revision ID: a1b2c3d4e5f6
Revises: d377f961aa1f
Create Date: 2025-12-03
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"  # pragma: allowlist secret
down_revision = "d377f961aa1f"  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name if bind is not None else None
    if dialect == "postgresql":
        # Create GIN index on expression to_tsvector over first_name + last_name
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_students_fulltext
            ON students USING gin (to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'')));
            """
        )
    else:
        # No-op for non-PostgreSQL; SQLite FTS can be added separately if/when needed
        pass


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name if bind is not None else None
    if dialect == "postgresql":
        op.execute("DROP INDEX IF EXISTS idx_students_fulltext;")
    else:
        pass
    # pragma: allowlist secret
