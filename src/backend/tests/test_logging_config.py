from __future__ import annotations

import importlib
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from backend import logging_config


def test_initialize_logging_fallback_import(tmp_path, monkeypatch):
    """Ensure fallback path when request_id middleware import fails still attaches handler."""
    real_import_module = importlib.import_module

    def fake_import_module(name, package=None):
        if name == "backend.request_id_middleware":
            raise ImportError("boom")
        return real_import_module(name, package)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    log_dir = tmp_path / "logs_fallback"
    logger = logging_config.initialize_logging(str(log_dir), log_level="INFO")
    assert logger is not None
    expected_log_file = Path(log_dir) / "app.log"
    root_logger = logging.getLogger()
    file_handlers = [
        h
        for h in root_logger.handlers
        if isinstance(h, RotatingFileHandler) and getattr(h, "baseFilename", None) == str(expected_log_file)
    ]
    assert file_handlers, "RotatingFileHandler for expected log file was not attached"
    for h in file_handlers:
        root_logger.removeHandler(h)
        try:
            h.close()
        except Exception:
            pass


def test_initialize_logging_adds_rotating_file_handler(tmp_path):
    root_logger = logging.getLogger()
    original_handlers = list(root_logger.handlers)
    for handler in original_handlers:
        root_logger.removeHandler(handler)
        handler.close()

    log_dir = tmp_path / "logs"
    logger = logging_config.initialize_logging(str(log_dir), log_level="DEBUG")
    assert logger.name == "backend.logging_config"

    rotating_handlers = [h for h in root_logger.handlers if isinstance(h, RotatingFileHandler)]
    assert len(rotating_handlers) == 1
    file_handler = rotating_handlers[0]
    assert Path(file_handler.baseFilename).parent == log_dir

    # Second call should not add duplicate handlers
    logging_config.initialize_logging(str(log_dir), log_level="DEBUG")
    rotating_handlers_after = [h for h in root_logger.handlers if isinstance(h, RotatingFileHandler)]
    assert len(rotating_handlers_after) == 1

    for handler in rotating_handlers_after:
        root_logger.removeHandler(handler)
        handler.close()
    for handler in original_handlers:
        root_logger.addHandler(handler)
