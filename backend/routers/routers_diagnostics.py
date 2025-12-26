"""
Diagnostics and monitoring endpoints for query profiling and performance tracking.

These endpoints provide visibility into:
- Database query patterns and performance
- N+1 query detection
- System health metrics
"""

from fastapi import APIRouter
from backend.db.query_profiler import profiler
import logging

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])
logger = logging.getLogger(__name__)


@router.get("/queries/summary")
async def get_query_summary():
    """
    Get summary of database query profiling data.

    Returns:
        - total_queries: Total number of queries executed
        - total_time: Cumulative time spent in queries
        - slow_queries: Count of queries exceeding 100ms threshold
        - average_time: Average query execution time
        - table_patterns: Query count per table
        - n_plus_one_patterns: Potential N+1 query patterns detected
    """
    summary = profiler.get_summary()
    return {
        "status": "ok",
        "data": summary,
        "message": f"Profiled {summary['total_queries']} queries in {summary['total_time']:.2f}s",
    }


@router.get("/queries/slow")
async def get_slow_queries(limit: int = 20):
    """
    Get list of slow queries (>100ms).

    Args:
        limit: Maximum number of slow queries to return

    Returns:
        List of slow query statistics
    """
    slow_queries = [
        {"statement": q.statement[:200], "duration": q.duration, "table": q.table_name}
        for q in profiler.queries
        if q.is_slow
    ][:limit]

    return {"status": "ok", "count": len(slow_queries), "data": slow_queries}


@router.get("/queries/patterns")
async def get_query_patterns():
    """
    Get analysis of query patterns per table.

    Returns:
        - table_patterns: Count of queries per table
        - potential_n_plus_one: Tables with excessive query counts
    """
    summary = profiler.get_summary()
    n_plus_one = summary.get("n_plus_one_patterns", [])

    return {
        "status": "ok",
        "table_patterns": summary.get("table_patterns", {}),
        "potential_n_plus_one": [{"table": table, "count": count} for table, count in n_plus_one],
        "warning": "Check N+1 patterns and optimize with select_related/prefetch_related" if n_plus_one else None,
    }


@router.post("/queries/reset")
async def reset_profiler():
    """
    Reset query profiler statistics.

    Use this after code changes to get a clean baseline for testing.
    """
    count_before = len(profiler.queries)
    total_time_before = profiler.total_time

    profiler.reset()

    logger.info(
        "Query profiler reset", extra={"query_count": count_before, "total_time_sec": round(total_time_before, 2)}
    )

    return {
        "status": "ok",
        "message": f"Reset profiler: cleared {count_before} queries, {total_time_before:.2f}s of data",
    }


@router.get("/health/queries")
async def health_check_queries():
    """
    Health check for database query performance.

    Returns:
        - status: healthy/warning/critical
        - slow_query_rate: Percentage of slow queries
        - avg_response_time: Average query time in ms
    """
    if not profiler.queries:
        return {"status": "healthy", "message": "No queries profiled yet"}

    slow_rate = (profiler.slow_query_count / len(profiler.queries)) * 100
    avg_time_ms = (profiler.total_time / len(profiler.queries)) * 1000

    if slow_rate > 20:
        status = "critical"
    elif slow_rate > 10:
        status = "warning"
    else:
        status = "healthy"

    return {
        "status": status,
        "slow_query_rate_percent": round(slow_rate, 2),
        "avg_response_time_ms": round(avg_time_ms, 2),
        "total_queries": len(profiler.queries),
        "total_time_seconds": round(profiler.total_time, 2),
    }
