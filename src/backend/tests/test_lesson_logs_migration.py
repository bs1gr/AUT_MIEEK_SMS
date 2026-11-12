"""Migration c8e1f4a7d2b9 adds the lesson_logs table and nothing else.

It must be safe on a database that already has the table (SMS Lite falls back to creating tables
from the models when migrations cannot run), and it must give the table the unique
course + date + period key that the upsert and its retry rely on.
"""

from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

PREVIOUS_HEAD = "f2b6d8a1c3e5"


def _alembic(url: str):
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


@pytest.fixture
def deployed(tmp_path):
    """A scratch SQLite database upgraded to the revision before the lesson log table."""
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, PREVIOUS_HEAD)
    engine = create_engine(url)
    try:
        yield cfg, engine
    finally:
        engine.dispose()


def test_upgrade_adds_only_the_lesson_logs_table(deployed):
    from alembic import command

    cfg, engine = deployed
    before = set(inspect(engine).get_table_names())
    assert "lesson_logs" not in before

    command.upgrade(cfg, "head")

    inspector = inspect(engine)
    assert set(inspector.get_table_names()) - before == {"lesson_logs"}
    columns = {column["name"]: column for column in inspector.get_columns("lesson_logs")}
    assert set(columns) == {
        "id",
        "course_id",
        "date",
        "period_number",
        "material_covered",
        "teacher_notes",
        "created_at",
        "updated_at",
    }
    assert columns["period_number"]["nullable"] is False
    assert columns["material_covered"]["nullable"] is True
    assert columns["teacher_notes"]["nullable"] is True
    unique = [index["column_names"] for index in inspector.get_indexes("lesson_logs") if index["unique"]]
    assert unique == [["course_id", "date", "period_number"]]


def test_one_log_per_course_date_and_period(deployed):
    from alembic import command

    cfg, engine = deployed
    command.upgrade(cfg, "head")

    insert = text("INSERT INTO lesson_logs (course_id, date, period_number) VALUES (:course, :day, :period)")
    with engine.begin() as conn:
        conn.execute(insert, {"course": 1, "day": "2026-11-12", "period": 1})
        conn.execute(insert, {"course": 1, "day": "2026-11-12", "period": 2})
        conn.execute(insert, {"course": 2, "day": "2026-11-12", "period": 1})
        conn.execute(insert, {"course": 1, "day": "2026-11-13", "period": 1})

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(insert, {"course": 1, "day": "2026-11-12", "period": 1})

    with engine.connect() as conn:
        defaults = conn.execute(
            text(
                "INSERT INTO lesson_logs (course_id, date) VALUES (3, '2026-11-12') RETURNING period_number, created_at"
            )
        ).one()
    assert defaults[0] == 1
    assert defaults[1] is not None


def test_upgrade_is_a_no_op_when_the_table_already_exists(deployed):
    from alembic import command

    cfg, engine = deployed
    command.upgrade(cfg, "head")
    command.stamp(cfg, PREVIOUS_HEAD)  # as if the table had been created by the models instead

    command.upgrade(cfg, "head")  # must not fail with "table already exists"

    assert "lesson_logs" in inspect(engine).get_table_names()


def test_downgrade_removes_the_table(deployed):
    from alembic import command

    cfg, engine = deployed
    command.upgrade(cfg, "head")

    command.downgrade(cfg, PREVIOUS_HEAD)

    assert "lesson_logs" not in inspect(engine).get_table_names()
