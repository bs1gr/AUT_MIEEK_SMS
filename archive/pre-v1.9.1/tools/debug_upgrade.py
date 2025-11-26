from alembic import command
from alembic.config import Config
import traceback

import os

cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
# Set sqlalchemy.url explicitly to match run_migrations behavior
cfg.set_main_option("sqlalchemy.url", "sqlite:///D:/SMS/student-management-system/data/student_management.db")
# Ensure alembic uses the repository's absolute migrations folder
cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "migrations"))

try:
    command.upgrade(cfg, "head")
except Exception:
    traceback.print_exc()
    raise
