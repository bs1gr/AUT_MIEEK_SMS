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
from collections import OrderedDict, defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Optional, Tuple

from sqlalchemy import event
from sqlalchemy.engine import Engine

from backend.request_id_middleware import get_request_id

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

    # For how many requests, the newest, the reads per table are kept (see n_plus_one_requests).
    MAX_TRACKED_REQUESTS = 200

    # More reads of one table than this within one request are reported as a possible N+1.
    N_PLUS_ONE_THRESHOLD = 5

    def __init__(
        self,
        enabled: bool = True,
        slow_threshold: Optional[float] = None,
        max_records: int = MAX_RECORDED_QUERIES,
        max_tracked_requests: int = MAX_TRACKED_REQUESTS,
    ):
        """
        Args:
            enabled: False = register() attaches nothing
            slow_threshold: seconds above which a statement counts as slow; None = follow the
                SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS setting
            max_records: how many of the newest statements are kept
            max_tracked_requests: for how many of the newest requests the reads per table
                are kept
        """
        self.enabled = enabled
        self._slow_threshold = slow_threshold
        self._lock = threading.Lock()
        self.queries: Deque[QueryStats] = deque(maxlen=max(1, int(max_records)))
        self.query_patterns: Dict[str, int] = defaultdict(int)
        # request id -> table -> SELECT statements of that request, the newest requests last
        self._max_tracked_requests = max(1, int(max_tracked_requests))
        self._request_reads: "OrderedDict[str, Dict[str, int]]" = OrderedDict()
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
        # The request this statement belongs to; empty outside a request (startup, the
        # schedulers). The middleware's context reaches the worker threads too.
        request_id = get_request_id()
        is_read = statement.lstrip()[:6].upper() == "SELECT"

        # Statements run on the worker threads while the diagnostics endpoints read on the
        # event loop's thread.
        with self._lock:
            if is_slow:
                self.slow_query_count += 1
            self.query_patterns[table_name] += 1
            self.queries.append(stats)
            self.query_count += 1
            self.total_time += duration
            # "(SELECT" is what the table-name guess gives for a statement that reads from a
            # sub-query: six aggregate queries in one request are not six reads of one table.
            if request_id and is_read and table_name != "unknown" and not table_name.startswith("("):
                reads = self._request_reads.get(request_id)
                if reads is None:
                    reads = self._request_reads[request_id] = {}
                    while len(self._request_reads) > self._max_tracked_requests:
                        self._request_reads.popitem(last=False)
                else:
                    self._request_reads.move_to_end(request_id)
                reads[table_name] = reads.get(table_name, 0) + 1

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

    def n_plus_one_requests(self, threshold: Optional[int] = None) -> List[Dict]:
        """Tables read more often than `threshold` within one request: the "N+1" pattern, one
        query for a list and then one more per row.

        One entry per table, with the highest count among the requests still tracked (the
        newest MAX_TRACKED_REQUESTS) and the id of the request that reached it, which is in
        the log next to its path ("Request started: GET /...").

        Until November 2026 this compared the count of statements per table since the start
        of the server with the limit. After an hour that was every table, and each call wrote
        one warning per table. Nothing is written to the log here.
        """
        limit = self.N_PLUS_ONE_THRESHOLD if threshold is None else threshold
        worst: Dict[str, Tuple[int, str]] = {}
        with self._lock:
            for request_id, reads in self._request_reads.items():
                for table, count in reads.items():
                    if count > limit and count > worst.get(table, (0, ""))[0]:
                        worst[table] = (count, request_id)
        return [
            {"table": table, "count": count, "request_id": request_id}
            for table, (count, request_id) in sorted(worst.items(), key=lambda item: (-item[1][0], item[0]))
        ]

    def detect_n_plus_one(self, threshold: Optional[int] = None) -> List[Tuple[str, int]]:
        """The same as n_plus_one_requests, as (table_name, count) tuples."""
        return [(entry["table"], entry["count"]) for entry in self.n_plus_one_requests(threshold)]

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
        """Get summary statistics"""
        totals = self.totals()
        with self._lock:
            table_patterns = dict(self.query_patterns)
            tracked_requests = len(self._request_reads)
        query_count = totals["total_queries"]
        return {
            "total_queries": query_count,
            "total_time": totals["total_time"],
            "slow_queries": totals["slow_queries"],
            "average_time": totals["total_time"] / query_count if query_count else 0,
            "recorded_queries": totals["recorded_queries"],
            "slow_query_threshold_ms": round(self.slow_query_threshold * 1000),
            "table_patterns": table_patterns,
            "tracked_requests": tracked_requests,
            "n_plus_one_threshold": self.N_PLUS_ONE_THRESHOLD,
            "n_plus_one_patterns": self.detect_n_plus_one(),
        }

    def reset(self) -> None:
        """Reset profiler stats"""
        with self._lock:
            self.queries.clear()
            self.query_patterns.clear()
            self._request_reads.clear()
            self.query_count = 0
            self.total_time = 0.0
            self.slow_query_count = 0

    def __repr__(self) -> str:
        return f"QueryProfiler(queries={self.query_count}, time={self.total_time:.3f}s, slow={self.slow_query_count})"


# Global instance
profiler = QueryProfiler(enabled=True)
