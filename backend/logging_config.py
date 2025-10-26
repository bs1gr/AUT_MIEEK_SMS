from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def initialize_logging(log_dir: str = "logs", log_level: str = "INFO") -> logging.Logger:
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(level=level, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    Path(log_dir).mkdir(parents=True, exist_ok=True)
    log_file = Path(log_dir) / "app.log"

    handler = RotatingFileHandler(log_file, maxBytes=2 * 1024 * 1024, backupCount=5, encoding="utf-8")
    handler.setLevel(level)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    # Avoid duplicate handlers if reloaded
    if not any(isinstance(h, RotatingFileHandler) and getattr(h, 'baseFilename', None) == str(log_file) for h in root_logger.handlers):
        root_logger.addHandler(handler)

    logger = logging.getLogger(__name__)
    logger.info("Logging initialized")
    return logger
