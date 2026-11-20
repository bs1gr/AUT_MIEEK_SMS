"""migrations.log is written to the project's `logs/` folder, next to the other logs.

Both migration runners (backend.scripts.migrate.runner, which the server uses, and
backend.run_migrations, which the Docker entrypoint and the command-line tools use) looked for
"the first folder, going up, with a `backend` folder in it". In a checkout that is `src`, since
the code moved under `src` in June 2026, so the file went to `src/logs/migrations.log`.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pytest

import backend.run_migrations as entrypoint_runner
from backend.scripts.migrate import runner

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = BACKEND_DIR.parents[1]


def test_in_a_checkout_it_is_the_repository_root(monkeypatch):
    # The test run moves its logs elsewhere (SMS_LOG_DIR, conftest); this is about the default.
    monkeypatch.delenv("SMS_LOG_DIR", raising=False)
    assert (REPOSITORY_ROOT / "VERSION").is_file(), "this test assumes the layout <root>/src/backend"

    assert runner.project_root(BACKEND_DIR) == REPOSITORY_ROOT
    assert runner.migrations_log_dir() == REPOSITORY_ROOT / "logs"
    # Not the folder that merely contains `backend`.
    assert runner.migrations_log_dir() != BACKEND_DIR.parent / "logs"


def test_in_the_docker_image_it_is_app(tmp_path):
    """/app/backend and /app/VERSION, no checkout."""
    backend_dir = tmp_path / "app" / "backend"
    (backend_dir / "scripts" / "migrate").mkdir(parents=True)
    (tmp_path / "app" / "VERSION").write_text("v1.0.0\n", encoding="utf-8")

    assert runner.project_root(backend_dir) == tmp_path / "app"
    assert runner.project_root(backend_dir / "scripts" / "migrate") == tmp_path / "app"


def test_a_version_file_wins_over_a_checkout_further_up(tmp_path):
    """A copy of the project unpacked inside somebody else's repository keeps its own logs."""
    (tmp_path / ".git").mkdir()
    backend_dir = tmp_path / "unpacked" / "src" / "backend"
    backend_dir.mkdir(parents=True)
    (tmp_path / "unpacked" / "VERSION").write_text("v1.0.0\n", encoding="utf-8")

    assert runner.project_root(backend_dir) == tmp_path / "unpacked"


def test_without_a_version_file_a_checkout_is_the_root(tmp_path):
    (tmp_path / ".git").mkdir()
    backend_dir = tmp_path / "src" / "backend"
    backend_dir.mkdir(parents=True)

    assert runner.project_root(backend_dir) == tmp_path


def test_with_neither_it_is_the_folder_that_holds_backend(tmp_path):
    """The rule there was before, kept for a layout without the file and without a checkout."""
    for folder in (tmp_path, *tmp_path.parents):
        if (folder / "VERSION").exists() or (folder / ".git").exists():
            pytest.skip(f"{folder} holds a VERSION file or a checkout")
    backend_dir = tmp_path / "plain" / "backend"
    backend_dir.mkdir(parents=True)

    assert runner.project_root(backend_dir) == tmp_path / "plain"


@pytest.mark.parametrize("module", [runner, entrypoint_runner], ids=["server runner", "entrypoint runner"])
def test_both_runners_write_their_log_into_that_folder(module, monkeypatch, tmp_path):
    """Run with the upgrade replaced: what is checked is where the log of the run goes."""
    logs_dir = tmp_path / "logs"
    seen: list[str] = []
    monkeypatch.setattr(module, "migrations_log_dir", lambda: logs_dir)

    def upgrade(cfg, revision):
        logging.getLogger("alembic.runtime.migration").info("Running upgrade (test) -> %s", revision)
        seen.extend(
            getattr(handler, "baseFilename", "")
            for handler in logging.getLogger().handlers
            if isinstance(handler, logging.FileHandler)
        )

    monkeypatch.setattr(module.command, "upgrade", upgrade)

    assert module.run_migrations(verbose=False) is True

    log_file = logs_dir / "migrations.log"
    assert str(log_file) in seen
    assert "Running upgrade (test) -> head" in log_file.read_text(encoding="utf-8")
    # Attached for the length of the run only.
    assert str(log_file) not in [
        getattr(handler, "baseFilename", "")
        for handler in logging.getLogger().handlers
        if isinstance(handler, logging.FileHandler)
    ]
