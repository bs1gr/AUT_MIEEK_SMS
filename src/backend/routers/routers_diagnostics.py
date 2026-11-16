"""
Diagnostics and monitoring endpoints for query profiling and performance tracking.

These endpoints provide visibility into:
- Database query patterns and performance
- N+1 query detection
- System health metrics
"""

import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.db import get_session
from backend.db.query_profiler import profiler
from backend.rbac import require_permission

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])
logger = logging.getLogger(__name__)

# Every handler here takes `request` and `db` although none reads them: require_permission
# finds both among the handler's own arguments. Without `request` it answered 500 "Request not
# available" on every server with authentication on, which until November 2026 these five did;
# with `db` it checks the permission in the request's own session, like every other router.


@router.get("/queries/summary")
@require_permission("diagnostics:view")
async def get_query_summary(request: Request, db: Session = Depends(get_session)):
    """
    Get summary of database query profiling data.

    Returns:
        - total_queries: Total number of queries executed (since the start or the last reset)
        - total_time: Cumulative time spent in queries
        - slow_queries: Count of queries over the slow-query limit
          (SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS, 300 ms unless set)
        - average_time: Average query execution time
        - recorded_queries: How many of the newest queries are kept in detail
        - slow_query_threshold_ms: The limit in use
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
@require_permission("diagnostics:view")
async def get_slow_queries(request: Request, limit: int = 20, db: Session = Depends(get_session)):
    """
    Get list of slow queries (over SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS) among the newest
    queries the profiler keeps.

    Args:
        limit: Maximum number of slow queries to return

    Returns:
        List of slow query statistics
    """
    slow_queries = [
        {"statement": q.statement[:200], "duration": q.duration, "table": q.table_name}
        for q in profiler.recent_queries()
        if q.is_slow
    ][:limit]

    return {"status": "ok", "count": len(slow_queries), "data": slow_queries}


@router.get("/queries/patterns")
@require_permission("diagnostics:view")
async def get_query_patterns(request: Request, db: Session = Depends(get_session)):
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
@require_permission("diagnostics:manage")
async def reset_profiler(request: Request, db: Session = Depends(get_session)):
    """
    Reset query profiler statistics.

    Use this after code changes to get a clean baseline for testing.
    """
    count_before = profiler.query_count
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
@require_permission("diagnostics:view")
async def health_check_queries(request: Request, db: Session = Depends(get_session)):
    """
    Health check for database query performance.

    Returns:
        - status: healthy/warning/critical
        - slow_query_rate: Percentage of slow queries
        - avg_response_time: Average query time in ms
    """
    # The totals, not the kept records: the profiler keeps only its newest records, so their
    # number stops growing while the count of slow queries does not.
    totals = profiler.totals()
    total_queries = totals["total_queries"]
    if not total_queries:
        return {"status": "healthy", "message": "No queries profiled yet"}

    slow_rate = (totals["slow_queries"] / total_queries) * 100
    avg_time_ms = (totals["total_time"] / total_queries) * 1000

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
        "total_queries": total_queries,
        "total_time_seconds": round(totals["total_time"], 2),
    }
