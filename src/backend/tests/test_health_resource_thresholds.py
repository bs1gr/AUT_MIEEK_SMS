"""Thresholds of the host-resource health checks, independent of the machine running the tests.

test_health.py stubs both probes (``calm_host``) so /health does not depend on this PC's RAM or
disk; these tests cover what that stub skips: the 90 % rule itself. The probes read
``psutil.virtual_memory()`` and ``shutil.disk_usage(".")``, which are faked here.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import Mock

import pytest

import backend.health_checks as hc
from backend.health_checks import HealthChecker, HealthCheckStatus

GB = 1024**3


@pytest.fixture
def checker() -> HealthChecker:
    return HealthChecker(Mock(), Mock())


def _fake_memory(monkeypatch: pytest.MonkeyPatch, percent: float) -> None:
    total = 16 * GB
    available = total * (100 - percent) / 100
    fake = SimpleNamespace(virtual_memory=lambda: SimpleNamespace(percent=percent, total=total, available=available))
    monkeypatch.setattr(hc, "psutil", fake)


def _fake_disk(monkeypatch: pytest.MonkeyPatch, percent: float) -> None:
    total = 500 * GB
    used = total * percent / 100
    monkeypatch.setattr(hc.shutil, "disk_usage", lambda _path: SimpleNamespace(total=total, used=used, free=total - used))


@pytest.mark.parametrize(
    ("percent", "expected"),
    [
        (42.0, HealthCheckStatus.HEALTHY),
        (89.9, HealthCheckStatus.HEALTHY),
        (90.0, HealthCheckStatus.DEGRADED),  # the rule is ">= threshold"
        (97.0, HealthCheckStatus.DEGRADED),
    ],
)
def test_memory_threshold(checker, monkeypatch, percent, expected):
    _fake_memory(monkeypatch, percent)
    result = checker._check_memory_usage()
    assert result["status"] == expected
    assert result["details"]["percent_used"] == pytest.approx(percent)
    assert result["details"]["total_gb"] == pytest.approx(16.0)


def test_memory_threshold_is_configurable(checker, monkeypatch):
    _fake_memory(monkeypatch, 80.0)
    assert checker._check_memory_usage(threshold_percent=75)["status"] == HealthCheckStatus.DEGRADED
    assert checker._check_memory_usage(threshold_percent=85)["status"] == HealthCheckStatus.HEALTHY


def test_memory_without_psutil_is_degraded_not_an_error(checker, monkeypatch):
    monkeypatch.setattr(hc, "psutil", None)
    result = checker._check_memory_usage()
    assert result["status"] == HealthCheckStatus.DEGRADED
    assert "psutil" in result["message"]


@pytest.mark.parametrize(
    ("percent", "expected"),
    [
        (50.0, HealthCheckStatus.HEALTHY),
        (89.9, HealthCheckStatus.HEALTHY),
        (90.0, HealthCheckStatus.DEGRADED),
        (99.0, HealthCheckStatus.DEGRADED),
    ],
)
def test_disk_threshold(checker, monkeypatch, percent, expected):
    _fake_disk(monkeypatch, percent)
    result = checker._check_disk_space()
    assert result["status"] == expected
    assert result["details"]["percent_used"] == pytest.approx(percent)
    assert result["details"]["free_gb"] == pytest.approx(500 * (100 - percent) / 100)


def test_disk_read_failure_is_degraded_not_an_error(checker, monkeypatch):
    def boom(_path):
        raise OSError("device not ready")

    monkeypatch.setattr(hc.shutil, "disk_usage", boom)
    result = checker._check_disk_space()
    assert result["status"] == HealthCheckStatus.DEGRADED
    assert "device not ready" in result["message"]
