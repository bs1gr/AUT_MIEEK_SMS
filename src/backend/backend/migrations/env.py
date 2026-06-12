import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Set environment variables to ensure config.py resolves paths correctly
os.environ.setdefault("SMS_PROJECT_ROOT", PROJECT_ROOT)
os.environ.setdefault("PYTHONPATH", PROJECT_ROOT)

from backend.config import settings
from backend.models import Base


# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target metadata for autogenerate
target_metadata = Base.metadata


def _resolve_database_url() -> str:
    """Resolve DB URL with explicit runtime override priority.

    Priority:
    1) alembic config main option (set by programmatic runner)
    2) DATABASE_URL environment variable
    3) backend.settings fallback
    """
    configured = config.get_main_option("sqlalchemy.url")
    if configured and configured.strip() and not configured.startswith("driver://"):
        return configured

    env_url = os.environ.get("DATABASE_URL", "").strip()
    if env_url:
        return env_url

    return settings.DATABASE_URL


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Use runtime override URL when provided by programmatic migration runner.
    url = _resolve_database_url()
    config.set_main_option("sqlalchemy.url", url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Use runtime override URL when provided by programmatic migration runner.
    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = _resolve_database_url()
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
