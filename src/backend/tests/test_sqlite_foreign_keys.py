"""SQLite enforces foreign keys only where the data already satisfies them.

The engine opens a new SQLite connection for every use, and the pragma that used to switch
enforcement on ran on one connection only, so a deleted parent left its children behind. The
rule now: look first (`PRAGMA foreign_key_check`); with no row lacking its parent, every new
connection enforces; with some, nothing changes and the log names the tables.
"""

import logging
import sqlite3

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import NullPool

from backend.db.sqlite_foreign_keys import enable_foreign_keys_where_clean, foreign_key_violations


def _make_database(path, *, orphan: bool) -> None:
    con = sqlite3.connect(path)
    con.executescript(
        """
        CREATE TABLE parents (id INTEGER PRIMARY KEY);
        CREATE TABLE children (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parents(id));
        INSERT INTO parents (id) VALUES (1);
        INSERT INTO children (id, parent_id) VALUES (10, 1);
        """
    )
    if orphan:
        con.execute("INSERT INTO children (id, parent_id) VALUES (11, 99)")
    con.commit()
    con.close()


def _engine(path):
    # The same pool as the application's SQLite engine: a new connection for every use.
    return create_engine(f"sqlite:///{path}", poolclass=NullPool)


def _insert_orphan(engine) -> None:
    with engine.begin() as conn:
        conn.exec_driver_sql("INSERT INTO children (id, parent_id) VALUES (12, 77)")


def test_without_the_switch_a_row_without_a_parent_is_accepted(tmp_path):
    """The behaviour this module exists to change: the pragma does not reach new connections."""
    path = tmp_path / "plain.db"
    _make_database(path, orphan=False)
    engine = _engine(path)
    _insert_orphan(engine)
    assert foreign_key_violations(engine)[("children", "parents")] == 1


def test_clean_database_is_enforced_on_every_new_connection(tmp_path):
    path = tmp_path / "clean.db"
    _make_database(path, orphan=False)
    engine = _engine(path)

    assert enable_foreign_keys_where_clean(engine) is True

    with pytest.raises(IntegrityError):
        _insert_orphan(engine)
    with engine.connect() as conn:
        assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
        assert conn.exec_driver_sql("SELECT count(*) FROM children").scalar() == 1


def test_deleting_a_parent_that_still_has_children_is_refused(tmp_path):
    """What PR 419 had to work around by hand for accounts: now the database says no."""
    path = tmp_path / "delete.db"
    _make_database(path, orphan=False)
    engine = _engine(path)
    enable_foreign_keys_where_clean(engine)

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.exec_driver_sql("DELETE FROM parents WHERE id = 1")
    with engine.begin() as conn:
        conn.exec_driver_sql("DELETE FROM children WHERE parent_id = 1")
        conn.exec_driver_sql("DELETE FROM parents WHERE id = 1")


def test_database_with_an_orphan_row_is_left_as_it_was_and_the_log_names_it(tmp_path, caplog):
    path = tmp_path / "orphan.db"
    _make_database(path, orphan=True)
    engine = _engine(path)

    with caplog.at_level(logging.WARNING, logger="backend.db.sqlite_foreign_keys"):
        assert enable_foreign_keys_where_clean(engine) is False

    assert "NOT enforced" in caplog.text
    assert "children -> parents: 1" in caplog.text
    # Nothing was switched on: a later change to the orphan, or a new one, is not refused.
    _insert_orphan(engine)
    with engine.connect() as conn:
        assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar() == 0


def test_a_second_call_does_not_stack_listeners(tmp_path):
    path = tmp_path / "twice.db"
    _make_database(path, orphan=False)
    engine = _engine(path)

    assert enable_foreign_keys_where_clean(engine) is True
    assert enable_foreign_keys_where_clean(engine) is True
    with engine.connect() as conn:
        assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1


def test_another_database_engine_is_not_touched():
    class _Dialect:
        name = "postgresql"

    class _Engine:
        dialect = _Dialect()

    assert enable_foreign_keys_where_clean(_Engine()) is False
    assert not foreign_key_violations(_Engine())


def test_a_failing_check_never_raises(tmp_path, caplog):
    engine = create_engine(f"sqlite:///{tmp_path / 'missing_dir' / 'x.db'}", poolclass=NullPool)
    with caplog.at_level(logging.WARNING, logger="backend.db.sqlite_foreign_keys"):
        assert enable_foreign_keys_where_clean(engine) is False
    assert "check failed" in caplog.text
