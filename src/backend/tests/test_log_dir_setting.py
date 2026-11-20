"""SMS_LOG_DIR moves every log file the server writes by default, and a test run uses it.

Before it, each test run wrote into the checkout: logs/migrations.log (900 KB in a clone),
src/backend/logs/app.log (rotating, a few MB) and an empty src/logs/frontend-*.log for every
test of the Control API's start.
"""

from __future__ import annotations

from pathlib import Path

from backend import logging_config
from backend.scripts.migrate import runner

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


def test_unset_means_no_override(monkeypatch):
    monkeypatch.delenv(logging_config.LOG_DIR_ENV, raising=False)
    assert logging_config.log_dir_override() is None


def test_set_it_moves_the_migrations_log(monkeypatch, tmp_path):
    monkeypatch.setenv(logging_config.LOG_DIR_ENV, str(tmp_path / "elsewhere"))
    assert runner.migrations_log_dir() == tmp_path / "elsewhere"


def test_the_control_panel_reads_app_log_from_there(client, control_admin_headers, monkeypatch, tmp_path):
    monkeypatch.setenv(logging_config.LOG_DIR_ENV, str(tmp_path))
    (tmp_path / "app.log").write_text("first line\nthe line to find\n", encoding="utf-8")

    answer = client.get("/control/api/logs/backend?lines=1", headers=control_admin_headers)

    assert answer.status_code == 200, answer.text
    assert answer.json()["logs"] == ["the line to find"]


def test_the_test_run_keeps_its_logs_out_of_the_checkout():
    moved = logging_config.log_dir_override()
    assert moved is not None, "conftest sets SMS_LOG_DIR for the whole run"
    assert REPOSITORY_ROOT not in moved.resolve().parents
