"""Migration e7a1c9d4f2b8 marks existing registrations as pending and nothing else.

Before it, an inactive account could be either a self-registration awaiting approval or an
account an administrator deactivated; the panel treated both as pending. The backfill uses the
"registration" notifications that self-registration sends to the admins.
"""

import json
from pathlib import Path

from sqlalchemy import create_engine, text


def _alembic(url: str):
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def test_backfill_marks_only_inactive_users_with_a_registration_notification(tmp_path):
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, "d5e9f3a2b7c4")

    engine = create_engine(url)
    try:
        with engine.begin() as conn:
            for uid, email, active in [(1, "admin@example.com", False), (2, "owner@example.com", True),
                                       (3, "applicant@example.com", False), (4, "approved@example.com", True)]:
                conn.execute(
                    text("INSERT INTO users (id, email, role, hashed_password, is_active, password_change_required, "
                         "created_at) VALUES (:id, :email, 'teacher', 'x', :active, 0, CURRENT_TIMESTAMP)"),
                    {"id": uid, "email": email, "active": active},
                )
            # registration notifications for 3 (still waiting) and 4 (already approved)
            for uid in (3, 4):
                conn.execute(
                    text("INSERT INTO notifications (user_id, notification_type, title, message, data, is_read, "
                         "created_at) VALUES (2, 'registration', 't', 'm', :data, 0, CURRENT_TIMESTAMP)"),
                    {"data": json.dumps({"user_id": uid, "email": "x"})},
                )

        command.upgrade(cfg, "head")

        with engine.connect() as conn:
            pending = dict(conn.execute(text("SELECT email, registration_pending FROM users")).all())
        assert pending == {
            "admin@example.com": 0,  # deactivated by an admin, no registration
            "owner@example.com": 0,
            "applicant@example.com": 1,  # registered, still waiting
            "approved@example.com": 0,  # registered, already approved
        }
    finally:
        engine.dispose()
