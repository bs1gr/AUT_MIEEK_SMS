"""
Database Query Profiler for identifying N+1 queries and performance issues.

Usage:
    from backend.db.query_profiler import profiler
    profiler.register(engine)  # Call in lifespan

    # Access query stats
    print(f"Total queries: {profiler.query_count}")
    print(f"Total time: {profiler.total_time:.3f}s")
    print(f"Slow queries: {profiler.slow_query_count}")

What counts as slow is one setting for the whole server, SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS
(300 ms unless set). The warning in the log comes from backend.performance_monitor, which
uses the same setting; this profiler only counts. Before that it warned on its own at a fixed
100 ms, which on a server far from its database (the cloud host, 65 ms per round trip) was
every health check: 132 of the 133 warnings in 50 minutes, none of them about a slow statement.
"""

import logging
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Optional, Tuple

from sqlalchemy import event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


@dataclass
class QueryStats:
    """Statistics for a single query"""

    statement: str
    duration: float
    is_slow: bool
    table_name: Optional[str] = None
    count: int = 1

    def __repr__(self) -> str:
        slow_marker = "🐢" if self.is_slow else ""
        return f"{slow_marker} {self.table_name or 'unknown'}: {self.duration:.3f}s"


class QueryProfiler:
    """Profile SQLAlchemy queries for performance analysis"""

    # Seconds. Used only when the setting cannot be read; a server takes the limit from
    # SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS (see slow_query_threshold below).
    SLOW_QUERY_THRESHOLD = 0.3

    # How many statements are kept, the newest. The totals below count every statement since
    # the start (or the last reset); only the records themselves are limited. Without a limit
    # the list grew by one record per statement for as long as the server ran.
    MAX_RECORDED_QUERIES = 2000

    def __init__(
        self,
        enabled: bool = True,
        slow_threshold: Optional[float] = None,
        max_records: int = MAX_RECORDED_QUERIES,
    ):
        """
        Args:
            enabled: False = register() attaches nothing
            slow_threshold: seconds above which a statement counts as slow; None = follow the
                SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS setting
            max_records: how many of the newest statements are kept
        """
        self.enabled = enabled
        self._slow_threshold = slow_threshold
        self._lock = threading.Lock()
        self.queries: Deque[QueryStats] = deque(maxlen=max(1, int(max_records)))
        self.query_patterns: Dict[str, int] = defaultdict(int)
        self.query_count: int = 0
        self.total_time: float = 0.0
        self.slow_query_count: int = 0

    @property
    def slow_query_threshold(self) -> float:
        """Seconds above which a statement counts as slow."""
        if self._slow_threshold is not None:
            return self._slow_threshold
        try:
            from backend.config import settings

            return max(0.0, float(settings.SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS)) / 1000.0
        except Exception:
            return self.SLOW_QUERY_THRESHOLD

    def register(self, engine: Engine) -> None:
        """Register profiler with SQLAlchemy engine"""
        if not self.enabled:
            return

        @event.listens_for(engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault("query_start_time", []).append(time.time())

        @event.listens_for(engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if "query_start_time" not in conn.info or not conn.info["query_start_time"]:
                return

            start_time = conn.info["query_start_time"].pop(-1)
            duration = time.time() - start_time

            self._record_query(statement, duration)

    def _record_query(self, statement: str, duration: float) -> None:
        """Record query statistics"""
        is_slow = duration > self.slow_query_threshold

        if is_slow:
            # Not a warning: backend.performance_monitor writes that one, at the same limit.
            logger.debug(
                "Slow query (%.3fs): %s...",
                duration,
                statement[:100],
                extra={"query_time": duration, "query_sample": statement[:200], "slow": True},
            )

        table_name = self._extract_table_name(statement)
        stats = QueryStats(statement=statement, duration=duration, is_slow=is_slow, table_name=table_name)

        # Statements run on the worker threads while the diagnostics endpoints read on the
        # event loop's thread.
        with self._lock:
            if is_slow:
                self.slow_query_count += 1
            self.query_patterns[table_name] += 1
            self.queries.append(stats)
            self.query_count += 1
            self.total_time += duration

    def recent_queries(self) -> List[QueryStats]:
        """The kept records, oldest first, as a list of their own (safe to iterate)."""
        with self._lock:
            return list(self.queries)

    @staticmethod
    def _extract_table_name(statement: str) -> str:
        """Extract table name from SQL statement"""
        try:
            if "FROM" in statement:
                parts = statement.split("FROM")[1].split()[0]
                return parts.strip('"`')
            elif "INSERT INTO" in statement:
                parts = statement.split("INSERT INTO")[1].split()[0]
                return parts.strip('"`')
            elif "UPDATE" in statement:
                parts = statement.split("UPDATE")[1].split()[0]
                return parts.strip('"`')
        except (IndexError, AttributeError):
            pass
        return "unknown"

    def detect_n_plus_one(self, threshold: int = 5) -> List[Tuple[str, int]]:
        """Detect potential N+1 query patterns

        Returns:
            List of (table_name, count) tuples for tables with excessive queries
        """
        with self._lock:
            patterns = dict(self.query_patterns)
        n_plus_one_patterns: List[Tuple[str, int]] = [
            (table, count) for table, count in patterns.items() if count > threshold
        ]

        for table, count in n_plus_one_patterns:
            logger.warning(
                f"Possible N+1 detected: table '{table}' queried {count} times",
                extra={"n_plus_one": True, "table": table, "count": count},
            )

        return n_plus_one_patterns

    def totals(self) -> Dict:
        """The counters alone: every statement since the start or the last reset."""
        with self._lock:
            return {
                "total_queries": self.query_count,
                "total_time": self.total_time,
                "slow_queries": self.slow_query_count,
                "recorded_queries": len(self.queries),
            }

    def get_summary(self) -> Dict:
        """Get summary statistics (also logs the tables that look like N+1 patterns)"""
        totals = self.totals()
        with self._lock:
            table_patterns = dict(self.query_patterns)
        query_count = totals["total_queries"]
        return {
            "total_queries": query_count,
            "total_time": totals["total_time"],
            "slow_queries": totals["slow_queries"],
            "average_time": totals["total_time"] / query_count if query_count else 0,
            "recorded_queries": totals["recorded_queries"],
            "slow_query_threshold_ms": round(self.slow_query_threshold * 1000),
            "table_patterns": table_patterns,
            "n_plus_one_patterns": self.detect_n_plus_one(),
        }

    def reset(self) -> None:
        """Reset profiler stats"""
        with self._lock:
            self.queries.clear()
            self.query_patterns.clear()
            self.query_count = 0
            self.total_time = 0.0
            self.slow_query_count = 0

    def __repr__(self) -> str:
        return f"QueryProfiler(queries={self.query_count}, time={self.total_time:.3f}s, slow={self.slow_query_count})"


# Global instance
profiler = QueryProfiler(enabled=True)
