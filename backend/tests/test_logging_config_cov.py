import logging
import importlib
from pathlib import Path


def test_initialize_logging_fallback_import(tmp_path, monkeypatch):
    # Simulate failure to import backend.request_id_middleware so fallback path is exercised
    real_import_module = importlib.import_module

    def fake_import_module(name, package=None):
        if name == "backend.request_id_middleware":
            raise ImportError("boom")
        return real_import_module(name, package)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    # Import here to ensure we patch importlib before function call
    from backend.logging_config import initialize_logging

    log_dir = tmp_path / "logs"
    logger = initialize_logging(str(log_dir), log_level="INFO")

    # Assert logger is returned and file handler was created under the provided directory
    assert logger is not None

    expected_log_file = Path(log_dir) / "app.log"
    root_logger = logging.getLogger()
    file_handlers = [
        h for h in root_logger.handlers
        if isinstance(h, logging.handlers.RotatingFileHandler)
        and getattr(h, "baseFilename", None) == str(expected_log_file)
    ]
    assert file_handlers, "RotatingFileHandler for expected log file was not attached"

    # Cleanup: remove our handler to avoid side-effects across tests on Windows file locks
    for h in file_handlers:
        root_logger.removeHandler(h)
        try:
            h.close()
        except Exception:
            pass
