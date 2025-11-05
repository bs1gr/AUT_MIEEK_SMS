"""Runtime environment detection helpers.

This module centralizes how the application decides whether it is executing in
production (release), development, or test mode. The detection logic relies on
explicit environment variables when available and falls back to heuristics such
as CI flags or Docker specific markers. The goal is to ensure production builds
run strictly inside Docker while keeping local development ergonomic.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Optional, Tuple
import sys

_CONTAINER_ENV_FLAGS = (
    "SMS_DOCKERIZED",
    "RUNNING_IN_CONTAINER",
    "RUNNING_IN_DOCKER",
    "IN_DOCKER",
    "IS_DOCKER",
    "DOCKER",
    "CONTAINER",
)

_CI_ENV_FLAGS = (
    "CI",
    "GITHUB_ACTIONS",
    "GITLAB_CI",
    "BUILDKITE",
    "BITBUCKET_COMMIT",
    "TF_BUILD",
    "TEAMCITY_VERSION",
)

_PYTEST_ENV_FLAGS = (
    "PYTEST_CURRENT_TEST",
    "PYTEST_RUNNING",
)

_ENV_VAR_CANDIDATES = (
    "SMS_ENV",
    "SMS_RUNTIME_ENV",
    "APP_ENV",
    "ENVIRONMENT",
    "ENV",
)


class RuntimeEnvironment(str, Enum):
    """Logical runtime environments supported by the system."""

    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


@dataclass(frozen=True)
class RuntimeContext:
    """Snapshot of environment detection results."""

    environment: RuntimeEnvironment
    is_docker: bool
    is_ci: bool
    source: str

    @property
    def is_production(self) -> bool:
        return self.environment is RuntimeEnvironment.PRODUCTION

    @property
    def is_development(self) -> bool:
        return self.environment is RuntimeEnvironment.DEVELOPMENT

    @property
    def is_test(self) -> bool:
        return self.environment is RuntimeEnvironment.TEST

    def assert_valid(self) -> None:
        """Enforce release constraints.

        Production builds must execute inside Docker. If the environment claims
        to be production but Docker heuristics disagree, raise an error early so
        the operator can correct the setup.
        """

        if self.is_production and not self.is_docker:
            raise RuntimeError(
                "SMS production runtime detected without Docker. Production deployments must "
                "run via the full-stack Docker workflow. Set SMS_ENV=development (or unset) "
                "for native development, or start the Docker stack instead."
            )

    def summary(self) -> str:
        """Return a human readable summary of the detected context."""

        return (
            f"environment={self.environment.value} (source={self.source}), " f"docker={self.is_docker}, ci={self.is_ci}"
        )


def _truthy(value: Optional[str]) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _is_docker() -> bool:
    if Path("/.dockerenv").exists():
        return True
    if Path("/run/.containerenv").exists():
        return True
    for flag in _CONTAINER_ENV_FLAGS:
        if _truthy(os.environ.get(flag)):
            return True
    return False


def _is_ci() -> bool:
    for flag in _CI_ENV_FLAGS:
        if _truthy(os.environ.get(flag)):
            return True
    return False


def _is_pytest() -> bool:
    # Check explicit TESTING flag (used in CI Docker runs)
    if _truthy(os.environ.get("TESTING")):
        return True
    # Check standard pytest env vars
    if any(os.environ.get(flag) for flag in _PYTEST_ENV_FLAGS):
        return True
    # Check if pytest is in argv (fallback)
    argv = " ".join(sys.argv).lower()
    return "pytest" in argv


def _normalize_env_value(raw: str) -> Optional[RuntimeEnvironment]:
    value = raw.strip().lower()
    if not value:
        return None
    if value in {"prod", "production", "release", "docker", "fullstack"}:
        return RuntimeEnvironment.PRODUCTION
    if value in {"test", "testing", "ci"}:
        return RuntimeEnvironment.TEST
    if value in {"dev", "development", "local"}:
        return RuntimeEnvironment.DEVELOPMENT
    return None


def _read_declared_environment() -> Tuple[Optional[RuntimeEnvironment], Optional[str]]:
    for candidate in _ENV_VAR_CANDIDATES:
        value = os.environ.get(candidate)
        if not value:
            continue
        normalized = _normalize_env_value(value)
        if normalized is not None:
            return normalized, candidate
    return None, None


@lru_cache(maxsize=1)
def get_runtime_context() -> RuntimeContext:
    """Detect the current runtime context and cache the result."""

    is_docker = _is_docker()
    is_ci = _is_ci()

    # Pytest always maps to the test runtime regardless of other indicators.
    if _is_pytest():
        return RuntimeContext(
            environment=RuntimeEnvironment.TEST,
            is_docker=is_docker,
            is_ci=is_ci,
            source="pytest",
        )

    declared, source = _read_declared_environment()
    if declared is not None:
        return RuntimeContext(
            environment=declared,
            is_docker=is_docker,
            is_ci=is_ci,
            source=f"env:{source}",
        )

    if is_docker:
        return RuntimeContext(
            environment=RuntimeEnvironment.PRODUCTION,
            is_docker=True,
            is_ci=is_ci,
            source="docker-detection",
        )

    if is_ci:
        return RuntimeContext(
            environment=RuntimeEnvironment.TEST,
            is_docker=False,
            is_ci=True,
            source="ci-default",
        )

    return RuntimeContext(
        environment=RuntimeEnvironment.DEVELOPMENT,
        is_docker=False,
        is_ci=is_ci,
        source="default",
    )


def require_production_constraints() -> RuntimeContext:
    """Helper that returns the runtime context after enforcing constraints."""

    context = get_runtime_context()
    context.assert_valid()
    return context
