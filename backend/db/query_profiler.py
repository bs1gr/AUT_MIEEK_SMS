"""
Database Query Profiler for identifying N+1 queries and performance issues.

Usage:
    from backend.db.query_profiler import profiler
    profiler.register(engine)  # Call in lifespan

    # Access query stats
    print(f"Total queries: {len(profiler.queries)}")
    print(f"Total time: {profiler.total_time:.3f}s")
    print(f"Slow queries: {profiler.slow_queries}")
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
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

    SLOW_QUERY_THRESHOLD = 0.1  # 100ms

    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.queries: List[QueryStats] = []
        self.query_patterns: Dict[str, int] = defaultdict(int)
        self.total_time: float = 0.0
        self.slow_query_count: int = 0

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
        is_slow = duration > self.SLOW_QUERY_THRESHOLD

        if is_slow:
            self.slow_query_count += 1
            logger.warning(
                f"Slow query ({duration:.3f}s): {statement[:100]}...",
                extra={"query_time": duration, "query_sample": statement[:200], "slow": True},
            )

        # Extract table name
        table_name = self._extract_table_name(statement)
        self.query_patterns[table_name] += 1

        # Record query
        stats = QueryStats(statement=statement, duration=duration, is_slow=is_slow, table_name=table_name)
        self.queries.append(stats)
        self.total_time += duration

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
        n_plus_one_patterns: List[Tuple[str, int]] = [
            (table, count) for table, count in self.query_patterns.items() if count > threshold
        ]

        for table, count in n_plus_one_patterns:
            logger.warning(
                f"Possible N+1 detected: table '{table}' queried {count} times",
                extra={"n_plus_one": True, "table": table, "count": count},
            )

        return n_plus_one_patterns

    def get_summary(self) -> Dict:
        """Get summary statistics"""
        return {
            "total_queries": len(self.queries),
            "total_time": self.total_time,
            "slow_queries": self.slow_query_count,
            "average_time": self.total_time / len(self.queries) if self.queries else 0,
            "table_patterns": dict(self.query_patterns),
            "n_plus_one_patterns": self.detect_n_plus_one(),
        }

    def reset(self) -> None:
        """Reset profiler stats"""
        self.queries.clear()
        self.query_patterns.clear()
        self.total_time = 0.0
        self.slow_query_count = 0

    def __repr__(self) -> str:
        return (
            f"QueryProfiler("
            f"queries={len(self.queries)}, "
            f"time={self.total_time:.3f}s, "
            f"slow={self.slow_query_count})"
        )


# Global instance
profiler = QueryProfiler(enabled=True)
