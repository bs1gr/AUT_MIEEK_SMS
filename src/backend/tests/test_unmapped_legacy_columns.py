"""The four extended-absence columns are no longer mapped but stay in deployed databases.

Removing a column takes two releases on a shared database: SQLAlchemy selects every mapped
column, so an install that still maps one fails on every query once it is dropped. This release
stops mapping courses.absence_limit_extended_percent and course_enrollments.extended_absence_*;
a later migration drops them. Until then the code must work on a database that still has them,
which a test database built from the models (create_all) does not show. This one runs the real
Alembic migrations to head.
"""

from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from backend.models import Course, CourseEnrollment, Student

LEGACY = {
    "courses": {"absence_limit_extended_percent"},
    "course_enrollments": {"extended_absence_approved", "extended_absence_approved_at", "extended_absence_note"},
}


def test_courses_and_enrollments_work_on_a_database_that_still_has_the_legacy_columns(tmp_path):
    from alembic import command
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[1]
    url = f"sqlite:///{(tmp_path / 'deployed.db').as_posix()}"
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")

    engine = create_engine(url)
    try:
        inspector = inspect(engine)
        for table, columns in LEGACY.items():
            in_db = {c["name"] for c in inspector.get_columns(table)}
            assert columns <= in_db, f"{table} lost {columns - in_db}: the drop migration came too early"
            mapped = {c.name for c in (Course if table == "courses" else CourseEnrollment).__table__.columns}
            assert not columns & mapped, f"{table} still maps {columns & mapped}"

        with sessionmaker(bind=engine)() as session:
            student = Student(first_name="Ada", last_name="L", email="ada@example.com", student_id="S-1")
            course = Course(course_code="LEG-1", course_name="Legacy", semester="S1")
            session.add_all([student, course])
            session.flush()
            session.add(CourseEnrollment(student_id=student.id, course_id=course.id))
            session.commit()

            assert session.query(CourseEnrollment).count() == 1
            assert session.query(Course).one().course_code == "LEG-1"
            # The NOT NULL legacy column got its database default although the ORM never set it
            approved, extended = session.execute(
                text(
                    "SELECT e.extended_absence_approved, c.absence_limit_extended_percent "
                    "FROM course_enrollments e JOIN courses c ON c.id = e.course_id"
                )
            ).one()
            assert not approved
            assert extended == 15
    finally:
        engine.dispose()
