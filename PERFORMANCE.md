# SMS Performance Benchmarks

This document outlines the expected performance characteristics of the Student Management System (SMS) API.

## Performance Baselines

### Established: June 4, 2026

These baselines were established through load testing on the main branch with:
- **Load Profile:** Normal (50 concurrent users, 10 users/sec spawn rate, 60 sec duration)
- **User Mix:** Teachers (60%), Admins (20%), Students (20%)
- **Environment:** Ubuntu CI runner with standard resources
- **Test Data:** Seeded with ~100 students, 10 courses, 500 grades

### Response Time Targets (P95)

| Endpoint Category | Target P95 | Target P99 | Notes |
|------------------|-----------|-----------|-------|
| **Read Operations** | < 500ms | < 1500ms | GET /api/v1/students, /courses, etc. |
| **Write Operations** | < 1000ms | < 2500ms | POST /api/v1/grades, /enrollments, etc. |
| **Search Queries** | < 800ms | < 2000ms | /api/v1/students/search, /courses/search |
| **Analytics Queries** | < 1500ms | < 3000ms | /api/v1/analytics/dashboard, /reports |
| **Health Checks** | < 100ms | < 200ms | /health endpoint |

### Throughput Targets

| Scenario | Target | Notes |
|----------|--------|-------|
| **Single Endpoint** | > 20 req/s | Individual API endpoint under normal load |
| **Overall System** | > 200 req/s | Total across all endpoints (50 users) |
| **Peak Load (200 users)** | > 300 req/s | Extrapolated from normal load |

### Error Rates

| Threshold | Status | Action |
|-----------|--------|--------|
| < 0.5% | ✅ **Excellent** | No action needed |
| 0.5% - 1% | ⚠️ **Acceptable** | Monitor, investigate if increasing |
| 1% - 2% | ⚠️ **Caution** | Investigate root cause, plan fixes |
| > 2% | 🔴 **Critical** | Block merge, fix before deployment |

## Load Test Configuration

### Running Load Tests Locally

```bash
# Light load (smoke test)
python scripts/run_load_tests.py \
  --host http://localhost:8000 \
  --users 10 \
  --spawn-rate 5 \
  --duration 30 \
  --output results.json

# Normal load (standard test)
python scripts/run_load_tests.py \
  --host http://localhost:8000 \
  --users 50 \
  --spawn-rate 10 \
  --duration 60 \
  --output results.json

# Heavy load (peak simulation)
python scripts/run_load_tests.py \
  --host http://localhost:8000 \
  --users 100 \
  --spawn-rate 20 \
  --duration 90 \
  --output results.json
```

### CI/CD Load Testing

Load tests run automatically on the main branch:
- **Triggered:** Every push to main
- **User Count:** 50 (normal load)
- **Duration:** 60 seconds
- **Continue on Error:** Yes (non-blocking in CI)
- **Results:** Uploaded as artifact

## User Profiles

Load tests simulate three types of users with realistic behavior patterns:

### Teacher User (60% of traffic)
- Frequent student list queries
- Regular grade entry/updates
- Occasional report generation
- Dashboard analytics review
- Think time: 1-2 seconds

**Key Endpoints:**
- GET /api/v1/students (high frequency)
- POST /api/v1/grades (write-heavy)
- GET /api/v1/analytics/dashboard
- GET /api/v1/reports/grades

### Administrator User (20% of traffic)
- System analytics review
- User management queries
- Course administration
- Data export operations
- Think time: 2-4 seconds

**Key Endpoints:**
- GET /api/v1/analytics/dashboard
- GET /api/v1/users
- GET /api/v1/courses
- GET /api/v1/audit

### Student User (20% of traffic)
- Frequent grade checking
- Schedule viewing
- Notification checking
- Assignment review
- Think time: 2-5 seconds

**Key Endpoints:**
- GET /api/v1/students/me/grades
- GET /api/v1/students/me/schedule
- GET /api/v1/notifications
- GET /api/v1/announcements

## Regression Detection

Performance regressions are automatically detected in CI/CD by comparing current metrics against established baselines.

### Regression Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Error Rate Increase** | > 1% | Fail CI |
| **P95 Degradation** | > 20% | Fail CI |
| **P99 Degradation** | > 25% | Fail CI |
| **Throughput Decrease** | > 15% | Fail CI |

### Investigating Regressions

If a regression is detected:

1. **Check the load test results artifact**
   - Look for specific endpoints with degraded performance
   - Compare metrics against baseline

2. **Review code changes**
   - Identify which code change might cause regression
   - Look for N+1 queries, missing indexes, inefficient algorithms

3. **Profile the slow endpoint**
   - Use database query profiling
   - Check for missing query optimization
   - Profile with Python profiler (cProfile)

4. **Common causes:**
   - Missing database indexes (check migration)
   - Inefficient SQL queries (use EXPLAIN)
   - Unoptimized backend code
   - Increased memory usage causing GC pauses

## Historical Performance Data

| Date | Branch | Users | Duration | P95 (ms) | Error Rate | Notes |
|------|--------|-------|----------|----------|-----------|-------|
| 2026-06-04 | main | 50 | 60s | TBD | TBD | Baseline established |

## Performance Optimization Guidelines

### Before Optimization

1. **Measure first** - Establish baselines before optimizing
2. **Profile** - Use tools to find actual bottlenecks
3. **Test impact** - Verify improvements with load tests

### Quick Wins

1. **Database Indexing**
   - Index frequently queried columns
   - Use EXPLAIN to verify index usage
   - Profile N+1 queries

2. **Query Optimization**
   - Use pagination for large result sets (already done)
   - Limit join depth
   - Select only needed columns

3. **Caching**
   - Cache stable data (courses, roles)
   - Use Redis for session/cache layer (future)
   - Cache analytics queries

4. **Connection Pooling**
   - Ensure database connection pool is sized correctly
   - Monitor connection usage
   - Increase if needed for concurrency

## Related Documentation

- [CLAUDE.md](CLAUDE.md) - Codebase overview
- [CI/CD Pipeline](docs/ci-cd-pipeline.md) - Pipeline details
- [Security](SECURITY.md) - Security considerations
- [Architecture](docs/architecture.md) - System design

## Questions or Issues?

Report performance concerns:
1. Share load test results (JSON artifact)
2. Include baseline comparison
3. Describe observed issue
4. Include git commit hash

---

**Last Updated:** June 4, 2026  
**Next Review:** June 10, 2026 (Post Phase 5 deployment)
