"""One-shot migration runner that talks directly to Alembic without importing the application.
This avoids starting the FastAPI app or importing modules that trigger server startup.
"""

import logging
import os
import sys

from alembic import command
from alembic.config import Config


def main() -> int:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    logger = logging.getLogger("migrate_job")

    # Determine alembic.ini location relative to repository
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_ini = os.path.join(repo_root, "alembic.ini")
    migrations_dir = os.path.join(repo_root, "migrations")

    if not os.path.exists(alembic_ini):
        logger.error("alembic.ini not found at %s", alembic_ini)
        return 3

    cfg = Config(alembic_ini)

    # Ensure script_location points to the project's migrations directory
    # (alembic.ini may contain a relative script_location)
    cfg.set_main_option("script_location", migrations_dir)

    # Accept DATABASE_URL from environment, otherwise use the alembic config url
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        cfg.set_main_option("sqlalchemy.url", database_url)
        logger.info("Using DATABASE_URL from environment")
    else:
        logger.info("No DATABASE_URL env var set; using alembic.ini sqlalchemy.url")

    try:
        logger.info("Running alembic upgrade head")
        command.upgrade(cfg, "head")
        logger.info("Migrations applied successfully")
        return 0
    except Exception:
        logger.exception("Migration failed")
        return 2


if __name__ == "__main__":
    sys.exit(main())
