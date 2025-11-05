"""Tests for SQLAlchemy slow query monitoring utilities."""

from __future__ import annotations

from types import SimpleNamespace
import json
import logging

from sqlalchemy import create_engine, text

from backend.performance_monitor import setup_sqlalchemy_query_monitoring


def _settings(**overrides):
    defaults = {
        "SQLALCHEMY_SLOW_QUERY_ENABLED": True,
        "SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS": 0,
        "SQLALCHEMY_SLOW_QUERY_MAX_ENTRIES": 5,
        "SQLALCHEMY_SLOW_QUERY_EXPORT_PATH": None,
        "SQLALCHEMY_SLOW_QUERY_INCLUDE_PARAMS": True,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def test_monitor_collects_slow_queries(caplog):
    engine = create_engine("sqlite:///:memory:")
    settings = _settings()

    caplog.set_level(logging.WARNING, logger="backend.performance_monitor")

    monitor = setup_sqlalchemy_query_monitoring(engine, settings)
    assert monitor is not None

    with engine.connect() as conn:
        conn.execute(text("SELECT 42"))

    records = monitor.get_records()
    assert records, "Slow query records should be captured when threshold is 0"
    assert records[-1]["statement"].startswith("SELECT")
    assert "Slow query detected" in caplog.text


def test_monitor_exports_snapshot(tmp_path):
    export_path = tmp_path / "slow-queries.json"
    engine = create_engine("sqlite:///:memory:")
    settings = _settings(SQLALCHEMY_SLOW_QUERY_EXPORT_PATH=str(export_path))

    monitor = setup_sqlalchemy_query_monitoring(engine, settings)
    assert monitor is not None

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    assert export_path.exists(), "Expected slow query JSON export to be written"
    data = json.loads(export_path.read_text(encoding="utf-8"))
    assert isinstance(data, list)
    assert data, "Exported snapshot should contain at least one record"


def test_monitor_respects_disable_flag():
    engine = create_engine("sqlite:///:memory:")
    settings = _settings(SQLALCHEMY_SLOW_QUERY_ENABLED=False)

    monitor = setup_sqlalchemy_query_monitoring(engine, settings)
    assert monitor is None

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
