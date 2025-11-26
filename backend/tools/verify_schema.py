import sys

# Ensure project root on path
from pathlib import Path

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.db import engine, ensure_schema

# Apply schema guard
ensure_schema(engine)

# Print verification
with engine.connect() as conn:
    res = conn.execute(text("PRAGMA table_info('courses')"))
    cols = [row[1] for row in res]
    print("courses columns:", cols)
    print("absence_penalty present:", "absence_penalty" in cols)
