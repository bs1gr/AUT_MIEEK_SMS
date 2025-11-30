from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def initialize_logging(log_dir: str = "logs", log_level: str = "INFO") -> logging.Logger:
    level = getattr(logging, log_level.upper(), logging.INFO)

    # Import RequestIDFilter dynamically to avoid duplicate-import warnings in type checks
    import importlib

    try:
        rim_mod = importlib.import_module("backend.request_id_middleware")
        RequestIDFilter = getattr(rim_mod, "RequestIDFilter")
    except Exception:
        # Fallback: define a minimal filter locally to keep logging robust even if import path changes
        class _FallbackRequestIDFilter(logging.Filter):  # type: ignore[override]
            def filter(self, record: logging.LogRecord) -> bool:  # pragma: no cover - trivial
                if not hasattr(record, "request_id"):
                    record.request_id = "-"
                return True

        RequestIDFilter = _FallbackRequestIDFilter

    # Format with request ID support
    log_format = "%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s"

    # Configure basicConfig
    logging.basicConfig(level=level, format=log_format)

    # Add RequestIDFilter to root logger to ensure all logs have request_id
    root_logger = logging.getLogger()
    for handler in root_logger.handlers:
        handler.addFilter(RequestIDFilter())

    Path(log_dir).mkdir(parents=True, exist_ok=True)
    log_file = Path(log_dir) / "app.log"

    handler = RotatingFileHandler(log_file, maxBytes=2 * 1024 * 1024, backupCount=5, encoding="utf-8")
    handler.setLevel(level)
    formatter = logging.Formatter(log_format)
    handler.setFormatter(formatter)
    handler.addFilter(RequestIDFilter())

    root_logger = logging.getLogger()
    # Avoid duplicate handlers if reloaded
    if not any(
        isinstance(h, RotatingFileHandler) and getattr(h, "baseFilename", None) == str(log_file)
        for h in root_logger.handlers
    ):
        root_logger.addHandler(handler)

    logger = logging.getLogger(__name__)
    logger.info("Logging initialized")
    return logger
