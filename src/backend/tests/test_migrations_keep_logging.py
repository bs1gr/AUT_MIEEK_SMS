"""The server keeps logging after it has run its startup migrations.

`migrations/env.py` called `logging.config.fileConfig(alembic.ini)` whenever Alembic had a config
file, which is how the application runs it at every start. fileConfig() replaces the root
logger's handlers (the application's log file among them) and disables every logger that already
exists. Measured on a real start: 185 of 203 loggers disabled, the root logger left with one
stderr handler at WARNING, and nothing after "[run_migrations] ENTER" ever reached logs/app.log.
No error, traceback or access-log line of a running server was recorded anywhere.

Now alembic.ini's logging section is applied only when nothing has set up logging yet (the
`alembic` command line), and never disables existing loggers. The runners also stop leaving their
migrations.log handler on the root logger, where it would have collected every later record.
"""

import json
import logging
import os
import secrets
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = BACKEND_DIR.parent


@pytest.fixture
def scratch_database(monkeypatch):
    """A SQLite file inside the project (the settings refuse a path outside it)."""
    folder = BACKEND_DIR / "tmp_test_migrations"
    folder.mkdir(exist_ok=True)
    db_file = folder / f"keep_logging_{secrets.token_hex(6)}.db"
    monkeypatch.setenv("SECRET_KEY", secrets.token_urlsafe(48))
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file.as_posix()}")
    yield db_file
    for leftover in folder.glob(f"{db_file.name}*"):
        leftover.unlink(missing_ok=True)


class _Collect(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.DEBUG)
        self.messages: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.messages.append(f"{record.name}: {record.getMessage()}")


@pytest.mark.parametrize("module_name", ["backend.scripts.migrate.runner", "backend.run_migrations"])
def test_running_the_migrations_inside_a_program_leaves_its_logging_alone(module_name, scratch_database):
    import importlib

    runner = importlib.import_module(module_name)
    root = logging.getLogger()
    existing = logging.getLogger("backend.tests.keep_logging.existing_logger")
    existing.setLevel(logging.INFO)
    application_log = _Collect()  # stands in for the application's log file handler
    root.addHandler(application_log)
    handlers_before, level_before = list(root.handlers), root.level
    try:
        assert runner.run_migrations(False) is True
        assert scratch_database.exists()

        # What fileConfig() used to do to a running server.
        assert existing.disabled is False
        assert logging.getLogger(module_name).disabled is False
        assert root.handlers == handlers_before  # nothing replaced, and migrations.log detached again
        assert root.level == level_before

        existing.error("an error after the migrations")
        assert "backend.tests.keep_logging.existing_logger: an error after the migrations" in application_log.messages
        # The migration itself is in the application's log too, instead of only on stderr.
        assert any(m.startswith("alembic.runtime.migration: Running upgrade") for m in application_log.messages)
    finally:
        root.removeHandler(application_log)


PROBE = """
import json, logging, sys
existing = logging.getLogger("some.library.imported.earlier")
from alembic import command
from alembic.config import Config

cfg = Config(sys.argv[1])
cfg.set_main_option("script_location", sys.argv[2])
cfg.set_main_option("sqlalchemy.url", sys.argv[3])
assert not logging.getLogger().handlers  # as on the command line: nothing has set up logging
command.upgrade(cfg, "head")
print(json.dumps({
    "existing_disabled": existing.disabled,
    "root_handlers": [type(h).__name__ for h in logging.getLogger().handlers],
    "alembic_level": logging.getLogger("alembic").level,
}))
"""


def test_the_alembic_command_line_still_gets_its_logging_and_disables_nothing(scratch_database):
    env = {key: value for key, value in os.environ.items() if key not in {"PYTEST_CURRENT_TEST", "PYTEST_RUNNING"}}
    env["PYTHONPATH"] = str(SRC_DIR)
    # Two migrations carry Greek letters in their description, and Alembic logs it. The encoding
    # is pinned on both sides: left alone, the child writes what PYTHONIOENCODING says (UTF-8 on
    # the dev PC) and this process reads in the ANSI code page, where a byte of "Μ" is no
    # character at all. The reader thread then dies and `result.stderr` is None.
    env["PYTHONIOENCODING"] = "utf-8"
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            PROBE,
            str(BACKEND_DIR / "alembic.ini"),
            str(BACKEND_DIR / "migrations"),
            f"sqlite:///{scratch_database.as_posix()}",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
        cwd=str(BACKEND_DIR),
        timeout=300,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    state = json.loads(result.stdout.strip().splitlines()[-1])

    # alembic.ini's [loggers] section was applied: a console handler, alembic at INFO ...
    assert state["root_handlers"] == ["StreamHandler"]
    assert state["alembic_level"] == logging.INFO
    assert "Running upgrade" in result.stderr
    # ... without switching off loggers that libraries created before.
    assert state["existing_disabled"] is False
