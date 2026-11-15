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
