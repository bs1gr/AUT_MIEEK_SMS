"""SQL functions that SQLite lacks, or has for the letters A to Z only.

``lower()``: SQLite's own changes the letters A to Z, and its ``LIKE`` ignores case for those
letters only. Every case-insensitive comparison in the application is written as
``lower(column) LIKE lower(text)`` (SQLAlchemy writes ``ilike`` that way for SQLite too), so on
SQLite a Greek name was found only when neither the typed text nor the matching part of the
stored name had a capital letter: "Γιάννης" was not found by "γιάννης", nor by "Γιάννης" (the
search lowers what was typed, and SQLite did not lower what was stored). PostgreSQL lowers by
the database's locale and was never affected.

``translate()``: PostgreSQL has it, SQLite does not. The search uses it to compare Greek text
without its accents and with one form of sigma (``backend.services.search_service``).

Importing this module is enough: from then on every SQLite connection that SQLAlchemy opens
in this process has both, whichever engine opens it. ``backend.models`` imports it, so
anything that uses the models has them. A function is registered per connection, which is why
this listens for each new one; on a connection to another database it does nothing.
"""

from __future__ import annotations

import sqlite3
from functools import lru_cache
from typing import Any, Optional

from sqlalchemy import event
from sqlalchemy.engine import Engine


def unicode_lower(value: Any) -> Any:
    """``lower()`` as PostgreSQL does it: every letter that has a lower case, not only A to Z."""
    if value is None or isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return value.lower()
    return str(value).lower()


@lru_cache(maxsize=32)
def _translation(source: str, target: str) -> dict[int, Optional[str]]:
    table: dict[int, Optional[str]] = {}
    for index, character in enumerate(source):
        # As in PostgreSQL: the first mention of a character counts, and a character with
        # nothing at its place in `target` is removed.
        table.setdefault(ord(character), target[index] if index < len(target) else None)
    return table


def sql_translate(value: Any, source: Any, target: Any) -> Any:
    """PostgreSQL's ``translate(text, from, to)``: each character of ``from`` found in the text
    becomes the character at the same place in ``to``."""
    if value is None or source is None or target is None:
        return None
    return str(value).translate(_translation(str(source), str(target)))


@event.listens_for(Engine, "connect")
def _register_on_sqlite_connections(dbapi_connection, _connection_record) -> None:
    if isinstance(dbapi_connection, sqlite3.Connection):
        dbapi_connection.create_function("lower", 1, unicode_lower, deterministic=True)
        dbapi_connection.create_function("translate", 3, sql_translate, deterministic=True)
