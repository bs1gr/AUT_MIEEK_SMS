"""The process-state restore that keeps one test's leaks from reaching the tests after it."""

import logging
import os

from backend.tests.process_state import restored_process_state


def test_a_logger_that_was_disabled_inside_is_enabled_again():
    canary = logging.getLogger("backend.tests.process_state.canary")
    assert not canary.disabled

    with restored_process_state():
        canary.disabled = True  # what logging.config.fileConfig() does to every existing logger

    assert not canary.disabled


def test_a_logger_that_was_already_disabled_stays_disabled():
    canary = logging.getLogger("backend.tests.process_state.already_off")
    canary.disabled = True
    try:
        with restored_process_state():
            canary.disabled = False
        assert canary.disabled
    finally:
        canary.disabled = False


def test_a_global_logging_disable_is_lifted():
    before = logging.root.manager.disable

    with restored_process_state():
        logging.disable(logging.CRITICAL)
        assert logging.root.manager.disable == logging.CRITICAL

    assert logging.root.manager.disable == before


def test_a_logger_created_and_disabled_inside_is_enabled_again():
    # A module imported for the first time during a test creates its loggers there, and an Alembic
    # run later in the same test would disable them just the same.
    with restored_process_state():
        logger = logging.getLogger("backend.tests.process_state.created_inside")
        logger.disabled = True

    assert not logger.disabled


def test_environment_variables_set_inside_are_removed_again(monkeypatch):
    monkeypatch.delenv("SMS_PROJECT_ROOT", raising=False)
    monkeypatch.setenv("PYTHONPATH", "original")

    with restored_process_state():
        os.environ["SMS_PROJECT_ROOT"] = "/somewhere"  # what migrations/env.py setdefault()s
        os.environ["PYTHONPATH"] = "changed"

    assert "SMS_PROJECT_ROOT" not in os.environ
    assert os.environ["PYTHONPATH"] == "original"


def test_it_also_restores_when_the_body_raises(monkeypatch):
    monkeypatch.delenv("SMS_PROJECT_ROOT", raising=False)

    try:
        with restored_process_state():
            os.environ["SMS_PROJECT_ROOT"] = "/somewhere"
            raise RuntimeError("boom")
    except RuntimeError:
        pass

    assert "SMS_PROJECT_ROOT" not in os.environ


def test_the_fixture_is_applied_to_every_test(request):
    assert "restore_process_state" in request.fixturenames
