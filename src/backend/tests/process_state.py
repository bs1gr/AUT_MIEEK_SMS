"""Undo what one test leaks into the pytest process that every later test shares.

CI runs the whole backend suite in a single process, so process-wide state that a test changes and
does not restore decides how the tests after it behave. Two leaks have already broken tests that
sort later in the alphabet:

- logging.config.fileConfig() disables every logger that exists at that moment. Alembic's
  migrations/env.py calls it whenever the config has a file name, so after such a test the log
  capture of a later one (test_performance_monitor) saw nothing.
- migrations/env.py also setdefault()s SMS_PROJECT_ROOT and PYTHONPATH, which changes how a later
  test's settings resolve paths.

The autouse fixture in conftest.py wraps every test in `restored_process_state`. Add to it when
another leak of this kind turns up; it deliberately covers only what has been seen to leak, so it
does not fight pytest's own per-phase log handlers on the root logger.
"""

import logging
import os
from contextlib import contextmanager

TRACKED_ENVIRONMENT = ("SMS_PROJECT_ROOT", "PYTHONPATH")


@contextmanager
def restored_process_state():
    manager = logging.root.manager
    # list(): a background thread creating its first logger must not break the iteration.
    disabled_before = {
        name: logger.disabled for name, logger in list(manager.loggerDict.items()) if isinstance(logger, logging.Logger)
    }
    disable_level_before = manager.disable
    environment_before = {name: os.environ.get(name) for name in TRACKED_ENVIRONMENT}
    try:
        yield
    finally:
        # A logger that did not exist yet starts out enabled, so that is what it goes back to.
        for name, logger in list(manager.loggerDict.items()):
            if isinstance(logger, logging.Logger):
                should_be_disabled = disabled_before.get(name, False)
                if logger.disabled != should_be_disabled:
                    logger.disabled = should_be_disabled
        if manager.disable != disable_level_before:
            logging.disable(disable_level_before)
        for name, value in environment_before.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value
