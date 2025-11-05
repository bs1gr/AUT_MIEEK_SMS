from __future__ import annotations

import pytest

from backend import environment


@pytest.fixture(autouse=True)
def clear_runtime_cache(monkeypatch):
    environment.get_runtime_context.cache_clear()
    yield
    environment.get_runtime_context.cache_clear()


def test_pytest_detection_overrides_other_signals(monkeypatch):
    monkeypatch.setattr(environment, "_is_pytest", lambda: True)
    monkeypatch.setattr(environment, "_is_docker", lambda: False)
    monkeypatch.setattr(environment, "_is_ci", lambda: False)
    ctx = environment.get_runtime_context()
    assert ctx.environment is environment.RuntimeEnvironment.TEST
    assert ctx.source == "pytest"


def test_env_variable_controls_runtime_when_not_pytest(monkeypatch):
    monkeypatch.setattr(environment, "_is_pytest", lambda: False)
    monkeypatch.setattr(environment, "_is_docker", lambda: False)
    monkeypatch.setattr(environment, "_is_ci", lambda: False)
    monkeypatch.setenv("SMS_ENV", "development")

    ctx = environment.get_runtime_context()
    assert ctx.environment is environment.RuntimeEnvironment.DEVELOPMENT
    assert ctx.source == "env:SMS_ENV"


def test_require_production_constraints_demands_docker(monkeypatch):
    monkeypatch.setattr(environment, "_is_pytest", lambda: False)
    monkeypatch.setattr(environment, "_is_ci", lambda: False)
    monkeypatch.setattr(environment, "_is_docker", lambda: False)
    monkeypatch.setenv("SMS_ENV", "production")

    with pytest.raises(RuntimeError):
        environment.require_production_constraints()


def test_ci_without_env_defaults_to_test(monkeypatch):
    monkeypatch.setattr(environment, "_is_pytest", lambda: False)
    monkeypatch.setattr(environment, "_is_docker", lambda: False)
    monkeypatch.setattr(environment, "_is_ci", lambda: True)

    ctx = environment.get_runtime_context()
    assert ctx.environment is environment.RuntimeEnvironment.TEST
    assert ctx.source == "ci-default"


def test_normalize_env_value_variants():
    normalize = environment._normalize_env_value
    assert normalize(" prod ") is environment.RuntimeEnvironment.PRODUCTION
    assert normalize("local") is environment.RuntimeEnvironment.DEVELOPMENT
    assert normalize("testing") is environment.RuntimeEnvironment.TEST
    assert normalize("unknown") is None
