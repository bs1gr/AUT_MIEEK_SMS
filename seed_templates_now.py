"""Quick script to seed templates using FastAPI's database."""

import sys

sys.path.insert(0, ".")

from backend.dependencies import get_db
from backend.ops.seed_report_templates import seed_report_templates


def main():
    db = next(get_db())
    try:
        count = seed_report_templates(db, force=False)
        print(f"✅ Successfully seeded {count} report templates")
    finally:
        db.close()


if __name__ == "__main__":
    main()
