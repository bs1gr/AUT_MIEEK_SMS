"""SQLAlchemy query performance monitoring utilities."""

from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

from sqlalchemy import event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _normalize_statement(statement: str, limit: int = 500) -> str:
    text = (statement or "").strip()
    if len(text) > limit:
        return text[: limit - 3] + "..."
    return text


def _serialize_params(parameters: Any, limit: int = 500) -> str:
    """
    Safely serialize SQL parameters for logging.

    Security: Uses repr() for all values, which escapes special characters
    and prevents SQL injection in logs. Parameters are never executed as SQL,
    only logged for debugging slow queries.
    """
    try:
        if isinstance(parameters, Mapping):
            items = [f"{k}={parameters[k]!r}" for k in parameters]
        elif isinstance(parameters, Iterable) and not isinstance(parameters, (str, bytes)):
            items = [repr(p) for p in parameters]
        else:
            items = [repr(parameters)]
        serialized = ", ".join(items)
    except Exception as exc:  # pragma: no cover - defensive
        serialized = f"<unserializable parameters: {exc}>"
    if len(serialized) > limit:
        return serialized[: limit - 3] + "..."
    return serialized


@dataclass
class QueryRecord:
    """A lightweight container describing a slow SQL query."""

    timestamp: str
    duration_ms: float
    statement: str
    parameters: Optional[str]
    rowcount: Optional[int]


class SlowQueryMonitor:
    """Collect and optionally export slow SQL query diagnostics."""

    def __init__(
        self,
        threshold_ms: int,
        export_path: str | None,
        max_entries: int,
        include_params: bool,
    ) -> None:
        self.threshold_ms = max(0, int(threshold_ms))
        self.export_path = Path(export_path).resolve() if export_path else None
        self.include_params = include_params
        self._lock = threading.Lock()
        self._records: list[QueryRecord] = []
        self._max_entries = max(1, int(max_entries))

    def register(self, engine: Engine) -> None:
        """Attach SQLAlchemy event listeners to capture query timings."""

        if self.threshold_ms == 0:
            logger.debug(
                "Slow query monitoring threshold set to 0ms; all queries will be captured (subject to max entries)."
            )

        @event.listens_for(engine, "before_cursor_execute", retval=False)
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._slow_query_start = time.perf_counter()

        @event.listens_for(engine, "after_cursor_execute", retval=False)
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            start = getattr(context, "_slow_query_start", None)
            if start is None:
                return
            duration_ms = (time.perf_counter() - start) * 1000.0
            if duration_ms >= self.threshold_ms:
                params_repr = _serialize_params(parameters) if self.include_params else None
                self.record(
                    statement=_normalize_statement(statement),
                    duration_ms=duration_ms,
                    parameters=params_repr,
                    rowcount=getattr(cursor, "rowcount", None),
                )

        @event.listens_for(engine, "handle_error")
        def handle_error(context):  # pragma: no cover - best-effort instrumentation
            start = getattr(context, "_slow_query_start", None)
            if start is None:
                return
            duration_ms = (time.perf_counter() - start) * 1000.0
            params_repr = _serialize_params(context.parameters) if self.include_params else None
            self.record(
                statement=_normalize_statement(context.statement or "<unknown>"),
                duration_ms=duration_ms,
                parameters=params_repr,
                rowcount=None,
            )

    def record(
        self,
        statement: str,
        duration_ms: float,
        parameters: Optional[str],
        rowcount: Optional[int],
    ) -> None:
        entry = QueryRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            duration_ms=round(duration_ms, 3),
            statement=statement,
            parameters=parameters,
            rowcount=rowcount,
        )
        logger.warning("Slow query detected (%.3f ms): %s", entry.duration_ms, statement)

        with self._lock:
            self._records.append(entry)
            if len(self._records) > self._max_entries:
                excess = len(self._records) - self._max_entries
                del self._records[0:excess]
            snapshot = [asdict(record) for record in self._records]

        if self.export_path is not None:
            self._export_snapshot(snapshot)

    def _export_snapshot(self, snapshot: list[dict[str, Any]]) -> None:
        if self.export_path is None:
            return

        export_path = self.export_path
        try:
            export_path.parent.mkdir(parents=True, exist_ok=True)
            temp_file = export_path.with_suffix(".tmp")
            with temp_file.open("w", encoding="utf-8") as fh:
                json.dump(snapshot, fh, indent=2)
            temp_file.replace(export_path)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Failed to export slow query snapshot: %s", exc)

    def get_records(self) -> list[dict[str, Any]]:
        with self._lock:
            return [asdict(record) for record in self._records]

    def clear(self) -> None:
        with self._lock:
            self._records.clear()


def setup_sqlalchemy_query_monitoring(engine: Engine, settings: Any) -> SlowQueryMonitor | None:
    """Configure slow query monitoring for the provided engine."""

    enabled = getattr(settings, "SQLALCHEMY_SLOW_QUERY_ENABLED", True)
    if not enabled:
        logger.debug("Slow query monitoring disabled via settings")
        return None

    threshold = getattr(settings, "SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS", 0)
    export_path = getattr(settings, "SQLALCHEMY_SLOW_QUERY_EXPORT_PATH", None)
    max_entries = getattr(settings, "SQLALCHEMY_SLOW_QUERY_MAX_ENTRIES", 100)
    include_params = getattr(settings, "SQLALCHEMY_SLOW_QUERY_INCLUDE_PARAMS", True)

    monitor = SlowQueryMonitor(
        threshold_ms=threshold,
        export_path=export_path,
        max_entries=max_entries,
        include_params=include_params,
    )
    monitor.register(engine)
    engine_info = getattr(engine, "info", None)
    if isinstance(engine_info, dict):
        engine_info["slow_query_monitor"] = monitor
    else:  # pragma: no cover - fallback for exotic engines without info dict
        logger.debug("SQLAlchemy engine lacks info dict; skipping monitor attachment")
    return monitor
