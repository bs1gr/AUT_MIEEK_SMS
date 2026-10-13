"""The four extended-absence columns: unmapped in v1.18.56, dropped by f2b6d8a1c3e5.

Removing a column takes two releases on a shared database: SQLAlchemy selects every mapped
column, so an install that still maps one fails on every query once it is dropped. v1.18.56
stopped mapping courses.absence_limit_extended_percent and course_enrollments.extended_absence_*;
once every device ran it (owner, 2026-10-13), migration f2b6d8a1c3e5 drops them.

These tests run the real Alembic chain on SQLite (batch mode rebuilds the tables) and check that
the drop keeps every course and enrollment, and that downgrade brings the columns back.
"""

from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from backend.models import Course, CourseEnrollment, Student

LEGACY = {
    "courses": {"absence_limit_extended_percent"},
    "course_enrollments": {"extended_absence_approved", "extended_absence_approved_at", "extended_absence_note"},
}


def _alembic(url: str):
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def _columns(engine, table: str) -> set[str]:
    return {c["name"] for c in inspect(engine).get_columns(table)}


def test_models_no_longer_map_the_legacy_columns():
    assert not LEGACY["courses"] & {c.name for c in Course.__table__.columns}
    assert not LEGACY["course_enrollments"] & {c.name for c in CourseEnrollment.__table__.columns}


def test_drop_keeps_courses_and_enrollments_and_downgrade_restores_the_columns(tmp_path):
    from alembic import command

    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = _alembic(url)
    command.upgrade(cfg, "e7a1c9d4f2b8")  # what v1.18.56 runs on: columns present, unmapped

    engine = create_engine(url)
    try:
        assert LEGACY["courses"] <= _columns(engine, "courses")
        with sessionmaker(bind=engine)() as session:
            student = Student(first_name="Ada", last_name="L", email="ada@example.com", student_id="S-1")
            course = Course(course_code="LEG-1", course_name="Legacy", semester="S1")
            session.add_all([student, course])
            session.flush()
            session.add(CourseEnrollment(student_id=student.id, course_id=course.id))
            session.commit()

        command.upgrade(cfg, "head")
        for table, columns in LEGACY.items():
            assert not columns & _columns(engine, table), f"{table} still has {columns & _columns(engine, table)}"
        with sessionmaker(bind=engine)() as session:
            assert session.query(Course).one().course_code == "LEG-1"
            assert session.query(CourseEnrollment).count() == 1

        command.downgrade(cfg, "e7a1c9d4f2b8")
        for table, columns in LEGACY.items():
            assert columns <= _columns(engine, table)
        with engine.connect() as conn:
            approved, extended = conn.execute(
                text(
                    "SELECT e.extended_absence_approved, c.absence_limit_extended_percent "
                    "FROM course_enrollments e JOIN courses c ON c.id = e.course_id"
                )
            ).one()
        assert not approved and extended == 15  # old defaults on rows that existed before
    finally:
        engine.dispose()
