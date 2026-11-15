"""Migration a7d4e9c2b5f8: one live row per attendance period and per daily rating.

It runs against databases that already hold repeats (the live one had three ratings stored three
times each), so it has to clean up before it can create the unique indexes, and it must not
destroy anything while doing so: surplus rows are soft-deleted. It must also be safe to run on a
database that already has the indexes, and agree with what the models declare.
"""

from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

PREVIOUS_HEAD = "f6c3d8b1a2e4"
REVISION = "a7d4e9c2b5f8"
ATTENDANCE_INDEX = "uq_attendance_live_slot"
RATING_INDEX = "uq_daily_performance_live_slot"
DAY = "2026-11-10"


def _alembic(url: str):
    from alembic.config import Config

    # No alembic.ini on purpose: with a config file name, migrations/env.py calls
    # logging.config.fileConfig(), which disables every existing logger for the tests that follow
    # (see test_lesson_logs_migration).
    backend_dir = Path(__file__).resolve().parents[1]
    cfg = Config()
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


@pytest.fixture
def deployed(tmp_path):
    """A scratch SQLite database at the revision before this one."""
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, PREVIOUS_HEAD)
    engine = create_engine(url)
    try:
        yield cfg, engine
    finally:
        engine.dispose()


ADD_ATTENDANCE = text(
    "INSERT INTO attendances (id, student_id, course_id, date, status, period_number, deleted_at) "
    "VALUES (:id, :student, :course, :day, :status, :period, :deleted)"
)
ADD_RATING = text(
    "INSERT INTO daily_performances (id, student_id, course_id, date, category, score, max_score, deleted_at) "
    "VALUES (:id, :student, :course, :day, :category, :score, 10, :deleted)"
)


def _attendance(conn, row_id, student, period, status="Absent", deleted=None, course=1, day=DAY):
    conn.execute(
        ADD_ATTENDANCE,
        {
            "id": row_id,
            "student": student,
            "course": course,
            "day": day,
            "status": status,
            "period": period,
            "deleted": deleted,
        },
    )


def _rating(conn, row_id, student, category, score, deleted=None, course=1, day=DAY):
    conn.execute(
        ADD_RATING,
        {
            "id": row_id,
            "student": student,
            "course": course,
            "day": day,
            "category": category,
            "score": score,
            "deleted": deleted,
        },
    )


def _live(engine, table: str) -> dict:
    with engine.connect() as conn:
        rows = conn.execute(text(f"SELECT id, deleted_at FROM {table} ORDER BY id")).all()
    return {row_id: deleted_at is None for row_id, deleted_at in rows}


def _indexes(engine, table: str) -> dict:
    return {index["name"]: index for index in inspect(engine).get_indexes(table)}


def test_surplus_rows_are_soft_deleted_and_the_right_one_of_each_slot_stays(deployed):
    from alembic import command

    cfg, engine = deployed
    with engine.begin() as conn:
        # Student 1, period 1: stored three times. The lowest id is the row the application
        # reads and updates, so that one stays.
        _attendance(conn, 1, student=1, period=1)
        _attendance(conn, 2, student=1, period=1)
        _attendance(conn, 3, student=1, period=1, status="Present")
        # Not repeats: another period, another student, another day, another course.
        _attendance(conn, 4, student=1, period=2)
        _attendance(conn, 5, student=2, period=1)
        _attendance(conn, 6, student=1, period=1, day="2026-11-11")
        _attendance(conn, 7, student=1, period=1, course=2)
        # No period means the first one: together with id 9 that is one slot stored twice.
        _attendance(conn, 8, student=3, period=None)
        _attendance(conn, 9, student=3, period=1)
        # A row that was deleted before is not a repeat of the live one, and stays deleted.
        _attendance(conn, 10, student=4, period=1, deleted="2026-10-01 08:00:00")
        _attendance(conn, 11, student=4, period=1)

        # A rating stored three times: the newest is the one the Attendance page shows.
        _rating(conn, 1, student=1, category="Homework", score=5)
        _rating(conn, 2, student=1, category="Homework", score=5)
        _rating(conn, 3, student=1, category="Homework", score=7)
        _rating(conn, 4, student=1, category="Behaviour", score=6)
        _rating(conn, 5, student=2, category="Homework", score=4)

    command.upgrade(cfg, REVISION)

    attendance = _live(engine, "attendances")
    assert len(attendance) == 11  # nothing was removed
    assert {row_id for row_id, live in attendance.items() if live} == {1, 4, 5, 6, 7, 8, 11}
    assert {row_id for row_id, live in attendance.items() if not live} == {2, 3, 9, 10}

    ratings = _live(engine, "daily_performances")
    assert len(ratings) == 5
    assert {row_id for row_id, live in ratings.items() if live} == {3, 4, 5}

    with engine.connect() as conn:
        assert conn.execute(text("SELECT period_number FROM attendances WHERE id = 8")).scalar() == 1
        assert conn.execute(text("SELECT count(*) FROM attendances WHERE period_number IS NULL")).scalar() == 0
        # The row deleted before the migration keeps its own timestamp.
        assert str(conn.execute(text("SELECT deleted_at FROM attendances WHERE id = 10")).scalar()).startswith(
            "2026-10-01"
        )


def test_after_the_upgrade_a_slot_holds_one_live_row_and_a_deleted_row_frees_it(deployed):
    from alembic import command

    cfg, engine = deployed
    command.upgrade(cfg, REVISION)

    with engine.begin() as conn:
        _attendance(conn, 1, student=1, period=1)
        _attendance(conn, 2, student=1, period=2)
        _rating(conn, 1, student=1, category="Homework", score=5)
        _rating(conn, 2, student=1, category="Behaviour", score=5)

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            _attendance(conn, 3, student=1, period=1, status="Present")
    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            _rating(conn, 3, student=1, category="Homework", score=9)

    with engine.begin() as conn:
        conn.execute(text("UPDATE attendances SET deleted_at = '2026-11-12 09:00:00' WHERE id = 1"))
        conn.execute(text("UPDATE daily_performances SET deleted_at = '2026-11-12 09:00:00' WHERE id = 1"))
        _attendance(conn, 3, student=1, period=1, status="Present")
        _rating(conn, 3, student=1, category="Homework", score=9)

    assert _live(engine, "attendances") == {1: False, 2: True, 3: True}
    assert _live(engine, "daily_performances") == {1: False, 2: True, 3: True}


def test_the_migration_and_the_models_declare_the_same_indexes(deployed, tmp_path):
    from alembic import command

    from backend.models import Base

    cfg, migrated = deployed
    command.upgrade(cfg, REVISION)
    from_models = create_engine(f"sqlite:///{(tmp_path / 'from_models.db').as_posix()}")
    try:
        Base.metadata.create_all(from_models)
        for table, name, columns in (
            ("attendances", ATTENDANCE_INDEX, ["student_id", "course_id", "date", "period_number"]),
            ("daily_performances", RATING_INDEX, ["student_id", "course_id", "date", "category"]),
        ):
            by_migration = _indexes(migrated, table)[name]
            by_models = _indexes(from_models, table)[name]
            for index in (by_migration, by_models):
                assert index["column_names"] == columns
                assert bool(index["unique"]) is True
                # Partial: only live rows. Without this a deleted row would keep its slot.
                assert "deleted_at IS NULL" in str(index["dialect_options"]["sqlite_where"])
    finally:
        from_models.dispose()


def test_the_upgrade_can_run_on_a_database_that_already_has_the_indexes(deployed):
    from alembic import command

    cfg, engine = deployed
    command.upgrade(cfg, REVISION)
    with engine.begin() as conn:
        _attendance(conn, 1, student=1, period=1)
    command.stamp(cfg, PREVIOUS_HEAD)  # as if the tables and indexes had come from the models

    command.upgrade(cfg, REVISION)  # must not fail with "index already exists"

    assert {ATTENDANCE_INDEX} <= set(_indexes(engine, "attendances"))
    assert {RATING_INDEX} <= set(_indexes(engine, "daily_performances"))
    assert _live(engine, "attendances") == {1: True}


def test_the_downgrade_drops_the_two_indexes_and_keeps_every_row(deployed):
    from alembic import command

    cfg, engine = deployed
    with engine.begin() as conn:
        _attendance(conn, 1, student=1, period=1)
        _attendance(conn, 2, student=1, period=1)
    before = set(_indexes(engine, "attendances"))
    command.upgrade(cfg, REVISION)

    command.downgrade(cfg, PREVIOUS_HEAD)

    assert set(_indexes(engine, "attendances")) == before
    assert RATING_INDEX not in _indexes(engine, "daily_performances")
    assert _live(engine, "attendances") == {1: True, 2: False}  # the cleanup is not undone
    with engine.begin() as conn:
        _attendance(conn, 3, student=1, period=1)  # nothing enforces the slot any more
