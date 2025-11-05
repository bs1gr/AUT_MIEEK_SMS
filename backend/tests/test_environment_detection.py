from __future__ import annotations

import sys
from typing import Iterable

import pytest

from backend import environment


def _clear_pytest_flags(monkeypatch: pytest.MonkeyPatch) -> None:
    """Remove pytest-specific environment markers for deterministic detection."""

    for flag in ("PYTEST_CURRENT_TEST", "PYTEST_RUNNING"):
        monkeypatch.delenv(flag, raising=False)
    monkeypatch.setattr(sys, "argv", ["python"], raising=False)


def _clear_docker_flags(monkeypatch: pytest.MonkeyPatch, flags: Iterable[str]) -> None:
    for flag in flags:
        monkeypatch.delenv(flag, raising=False)


@pytest.fixture(autouse=True)
def _reset_environment_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    environment.get_runtime_context.cache_clear()
    monkeypatch.setattr(environment, "_is_pytest", lambda: False, raising=False)
    _clear_pytest_flags(monkeypatch)
    _clear_docker_flags(
        monkeypatch,
        (
            "SMS_DOCKERIZED",
            "RUNNING_IN_CONTAINER",
            "RUNNING_IN_DOCKER",
            "IN_DOCKER",
            "IS_DOCKER",
            "DOCKER",
            "CONTAINER",
        ),
    )
    monkeypatch.delenv("SMS_ENV", raising=False)
    monkeypatch.delenv("SMS_RUNTIME_ENV", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.delenv("SMS_EXECUTION_MODE", raising=False)


def test_default_environment_is_development(monkeypatch: pytest.MonkeyPatch) -> None:
    ctx = environment.get_runtime_context()
    assert ctx.environment is environment.RuntimeEnvironment.DEVELOPMENT
    ctx.assert_valid()


def test_production_without_docker_is_blocked(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SMS_ENV", "production")
    ctx = environment.get_runtime_context()
    assert ctx.environment is environment.RuntimeEnvironment.PRODUCTION
    with pytest.raises(RuntimeError):
        ctx.assert_valid()


def test_production_inside_docker_allowed(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("SMS_ENV", "production")
    monkeypatch.setattr(environment, "_is_docker", lambda: True, raising=False)

    ctx = environment.get_runtime_context()
    assert ctx.environment is environment.RuntimeEnvironment.PRODUCTION
    # Should not raise because we simulated a docker container context.
    ctx.assert_valid()
