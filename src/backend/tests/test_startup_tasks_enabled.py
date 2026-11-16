"""A server started from a virtualenv that merely has pytest installed still runs its startup tasks.

`lifespan.py` used to skip migrations, RBAC seeding and the admin bootstrap whenever pytest could
be *imported* (`find_spec("pytest")`). The development virtualenv has pytest, so a backend started
from it came up on an unmigrated database with no admin account, and said nothing. The decision
is now "pytest is running", made in `backend.environment`.

The interesting case cannot be produced inside this process (pytest is running here), so it is
asked of a fresh interpreter: the same one, where pytest is importable but has not been imported.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

from backend import environment

SRC_DIR = Path(__file__).resolve().parents[2]

PROBE = """
import importlib.util, json, sys
from backend import environment
print(json.dumps({
    "pytest_importable": importlib.util.find_spec("pytest") is not None,
    "pytest_imported": "pytest" in sys.modules,
    "running_under_pytest": environment.running_under_pytest(),
    "startup_tasks_enabled": environment.startup_tasks_enabled(),
}))
"""


def _probe(**extra_env: str) -> dict:
    env = {
        key: value
        for key, value in os.environ.items()
        if key not in {"PYTEST_CURRENT_TEST", "PYTEST_RUNNING", "DISABLE_STARTUP_TASKS"}
    }
    env["PYTHONPATH"] = str(SRC_DIR)
    env.update(extra_env)
    result = subprocess.run(
        [sys.executable, "-c", PROBE],
        capture_output=True,
        text=True,
        env=env,
        cwd=str(SRC_DIR),
        timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_a_server_next_to_an_installed_pytest_runs_its_startup_tasks():
    state = _probe()

    # The precondition that makes this the case that used to go wrong.
    assert state["pytest_importable"] is True
    assert state["pytest_imported"] is False

    assert state["running_under_pytest"] is False
    assert state["startup_tasks_enabled"] is True


def test_disable_startup_tasks_still_switches_them_off():
    assert _probe(DISABLE_STARTUP_TASKS="1")["startup_tasks_enabled"] is False
    assert _probe(DISABLE_STARTUP_TASKS="true")["startup_tasks_enabled"] is False


def test_a_process_started_by_a_test_counts_as_a_test_run():
    state = _probe(PYTEST_CURRENT_TEST="tests/test_x.py::test_y (call)")

    assert state["running_under_pytest"] is True
    assert state["startup_tasks_enabled"] is False


def test_inside_pytest_the_startup_tasks_are_off(monkeypatch):
    # Without the variable the session fixture sets, pytest itself must still be recognised:
    # a test that builds the app must never migrate or bootstrap the configured database.
    monkeypatch.delenv("DISABLE_STARTUP_TASKS", raising=False)
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.delenv("PYTEST_RUNNING", raising=False)

    assert environment.running_under_pytest() is True
    assert environment.startup_tasks_enabled() is False


def test_the_lifespan_asks_that_one_question():
    # The lifespan must not grow a second, different idea of "is this a test run".
    import backend.lifespan as lifespan_module

    assert lifespan_module.startup_tasks_enabled is environment.startup_tasks_enabled
    assert not hasattr(lifespan_module, "find_spec")


# --- what else a real server does at startup, and a test run must not --------------------
#
# The background schedulers open sessions of their own on the *configured* database, and the
# saved SMTP settings are the operator's real mail relay. Both used to run at every start,
# test runs included: on a developer's PC, where the configured database is a real one, every
# test that started the app read that database's scheduled reports and queued its report,
# cleanup and purge jobs in the test process.


class _RecordingScheduler:
    def __init__(self, calls: list):
        self._calls = calls

    def __getattr__(self, name):
        def method(*args, **kwargs):
            self._calls.append((name, args, kwargs))

        return method


def _run_lifespan(monkeypatch, *, tasks_enabled: bool) -> dict:
    import asyncio

    import backend.lifespan as lifespan_module
    from backend.tests.db_setup import TestingSessionLocal

    calls: list = []
    smtp_loads: list = []
    configured_db_sessions: list = []

    def configured_database(*_args, **_kwargs):
        configured_db_sessions.append(1)
        raise AssertionError("a session was opened on the configured database")

    monkeypatch.setattr(lifespan_module, "startup_tasks_enabled", lambda: tasks_enabled)
    monkeypatch.setattr(lifespan_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(lifespan_module.profiler, "register", lambda _engine: None)
    monkeypatch.setattr(lifespan_module, "run_migrations", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(lifespan_module, "ensure_defaults_startup", lambda _session_factory: False)
    monkeypatch.setattr(lifespan_module.settings, "DEFAULT_ADMIN_EMAIL", None, raising=False)
    monkeypatch.setattr("backend.services.smtp_override.load_and_apply", lambda: smtp_loads.append(1) or True)
    monkeypatch.setattr(
        "backend.services.maintenance_scheduler.get_maintenance_scheduler", lambda: _RecordingScheduler(calls)
    )
    # The real schedulers' own doors to the configured database: nothing may go through them.
    monkeypatch.setattr("backend.services.maintenance_scheduler.SessionLocal", configured_database)
    monkeypatch.setattr("backend.services.report_scheduler.SessionLocal", configured_database)

    class App:
        class state:
            pass

    started: list = []

    async def run():
        async with lifespan_module.get_lifespan()(App()):
            started.extend(name for name, _args, _kwargs in calls)

    asyncio.run(run())
    return {
        "at_startup": started,
        "all_calls": [name for name, _args, _kwargs in calls],
        "cleanup_schedule": [kwargs for name, _args, kwargs in calls if name == "schedule_cleanup_task"],
        "smtp_loads": len(smtp_loads),
        "configured_db_sessions": len(configured_db_sessions),
    }


def test_a_start_without_startup_tasks_starts_no_scheduler_and_loads_no_mail_settings(monkeypatch):
    # A test run, or DISABLE_STARTUP_TASKS.
    seen = _run_lifespan(monkeypatch, tasks_enabled=False)

    assert seen["at_startup"] == []
    assert seen["smtp_loads"] == 0
    assert seen["configured_db_sessions"] == 0
    # Stopping what was never started is harmless, and is all that happens at shutdown.
    assert set(seen["all_calls"]) <= {
        "stop_export_scheduler",
        "stop_report_scheduler",
        "stop_course_activation_scheduler",
    }


def test_a_real_start_loads_the_mail_settings_and_starts_the_schedulers(monkeypatch):
    seen = _run_lifespan(monkeypatch, tasks_enabled=True)

    assert seen["smtp_loads"] == 1
    assert seen["at_startup"] == [
        "start_export_scheduler",
        "start_report_scheduler",
        "start_course_activation_scheduler",
        "schedule_cleanup_task",
        "schedule_automatic_backup",
        "schedule_monitor_heartbeat",
    ]
    assert seen["cleanup_schedule"] == [{"frequency": "daily"}]


def test_starting_the_app_inside_a_test_leaves_the_configured_database_alone(monkeypatch):
    """The real application, started the way the `client` fixture starts it."""
    from fastapi.testclient import TestClient

    from backend.main import app

    opened: list = []
    scheduled: list = []
    smtp_loads: list = []

    def configured_database(*_args, **_kwargs):
        opened.append(1)
        raise AssertionError("a session was opened on the configured database")

    monkeypatch.setattr("backend.services.maintenance_scheduler.SessionLocal", configured_database)
    monkeypatch.setattr("backend.services.report_scheduler.SessionLocal", configured_database)
    monkeypatch.setattr("backend.services.smtp_override.load_and_apply", lambda: smtp_loads.append(1) or True)
    monkeypatch.setattr(
        "backend.services.maintenance_scheduler.MaintenanceScheduler.schedule_cleanup_task",
        lambda self, frequency="daily": scheduled.append(frequency),
    )

    with TestClient(app) as client:
        assert client.get("/health/live").status_code in (200, 404)

    assert opened == []
    assert scheduled == []
    assert smtp_loads == []
