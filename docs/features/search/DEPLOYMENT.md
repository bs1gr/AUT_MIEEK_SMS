# Advanced Search & Filtering - Deployment Guide

**Feature**: #128 - Advanced Search & Filtering
**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: January 17, 2026

## Overview

This guide provides step-by-step instructions for deploying the Advanced Search & Filtering feature in production and development environments.

## Pre-Deployment Checklist

Before deploying Feature #128, verify:

- [ ] All 422+ tests passing (backend, frontend, E2E, API, integration)
- [ ] Code review completed and approved
- [ ] Performance validation complete (latency benchmarks met)
- [ ] Database backup created
- [ ] Staging environment validated
- [ ] Release notes prepared
- [ ] Documentation reviewed
- [ ] Team notified of deployment

---

## Part 1: Database Migration

### Step 1: Prepare for Migration

```powershell
# Navigate to project root
cd d:\SMS\student-management-system

# Create backup of current database
.\scripts\backup-database.ps1 -OutputPath "backups\pre-search-feature-backup.sql"

# Verify connection to target database
python -m backend.db_utils check-connection
```

### Step 2: Apply Alembic Migration

```bash
# Navigate to backend
cd backend

# Check migration status (show pending migrations)
alembic current              # Shows current version
alembic history              # Shows all applied migrations
alembic heads                # Shows latest available migration

# Apply the search feature migration
alembic upgrade head
```

**Expected Output**:
```
INFO [alembic.runtime.migration] Context impl PostgreSQLImpl.
INFO [alembic.runtime.migration] Will assume transactional DDL.
INFO [alembic.runtime.migration] Running upgrade xxx -> feature128_add_search_indexes ...
INFO [alembic.runtime.migration] Adding indexes on students(name), students(email), courses(name), ...
INFO [alembic.runtime.migration] Done.
```

### Step 3: Verify Migration

```sql
-- Connect to database and verify indexes created

-- Check indexes on students table
SELECT * FROM pg_indexes WHERE tablename = 'students';

-- Check indexes on courses table
SELECT * FROM pg_indexes WHERE tablename = 'courses';

-- Check indexes on grades table
SELECT * FROM pg_indexes WHERE tablename = 'grades';

-- Expected: 14 new indexes for search optimization
```

### Step 4: Rollback if Needed

If issues occur, rollback the migration:

```bash
cd backend

# Rollback 1 migration
alembic downgrade -1

# Or rollback to specific revision
alembic downgrade abc123def456
```

---

## Part 2: Backend Configuration

### Environment Variables

Add these variables to `.env.production` (or equivalent):

```env
# Search API Configuration
SEARCH_MAX_RESULTS=1000              # Maximum results per page
SEARCH_MIN_QUERY_LENGTH=2            # Minimum query length (characters)
SEARCH_TIMEOUT_SECONDS=5             # Search request timeout

# Suggestion Configuration
SEARCH_SUGGESTION_LIMIT=50           # Max autocomplete suggestions
SEARCH_SUGGESTION_CACHE_TTL=3600     # Cache duration (seconds)

# Rate Limiting (Feature #128 endpoints)
RATE_LIMIT_SEARCH_READ=60            # Requests per minute for searches
RATE_LIMIT_SEARCH_SUGGEST=30         # Requests per minute for suggestions
RATE_LIMIT_SEARCH_STATS=10           # Requests per minute for statistics

# Performance
SEARCH_INDEX_BATCH_SIZE=5000         # Batch size for indexing
SEARCH_ENABLE_CACHING=true           # Enable result caching
```

### Backend Startup Verification

```python
# backend/verify_search_deployment.py
"""Verify search feature deployment"""

from backend.services.search_service import SearchService
from backend.models import db

def verify_deployment():
    """Run deployment verification checks"""

    # Check 1: Verify indexes exist
    print("Checking database indexes...")
    from sqlalchemy import inspect
    inspector = inspect(db.engine)

    required_indexes = {
        'students': ['idx_students_name', 'idx_students_email'],
        'courses': ['idx_courses_name', 'idx_courses_code'],
        'grades': ['idx_grades_value', 'idx_grades_student_course'],
    }

    for table, indexes in required_indexes.items():
        existing = [idx['name'] for idx in inspector.get_indexes(table)]
        for idx in indexes:
            if idx not in existing:
                print(f"❌ Missing index: {idx}")
                return False

    print("✅ All indexes present")

    # Check 2: Verify service initialization
    print("Checking SearchService...")
    try:
        service = SearchService(db.session)
        print("✅ SearchService initialized")
    except Exception as e:
        print(f"❌ SearchService failed: {e}")
        return False

    # Check 3: Verify API routes registered
    print("Checking API routes...")
    from backend.main import app
    search_routes = [route.path for route in app.routes if 'search' in route.path]

    expected_routes = [
        '/api/v1/search/students',
        '/api/v1/search/courses',
        '/api/v1/search/grades',
        '/api/v1/search/advanced',
        '/api/v1/search/suggestions',
        '/api/v1/search/statistics',
    ]

    for route in expected_routes:
        if route not in search_routes:
            print(f"❌ Missing route: {route}")
            return False

    print("✅ All routes registered")

    return True

if __name__ == '__main__':
    success = verify_deployment()
    exit(0 if success else 1)
```

Run verification:

```bash
cd backend
python verify_search_deployment.py
```

---

## Part 3: Frontend Configuration

### Build for Production

```bash
# Navigate to frontend
cd frontend

# Install dependencies (if not already done)
npm install

# Build optimized bundle
npm run build

# Output: dist/ directory with optimized files
```

### Environment Variables

Add to frontend `.env.production`:

```env
# API Configuration
VITE_API_URL=https://api.example.com/api/v1  # Backend API URL
VITE_API_TIMEOUT=5000                         # Request timeout (ms)

# Search Configuration
VITE_SEARCH_DEBOUNCE=300                      # Debounce delay (ms)
VITE_SEARCH_PAGE_SIZE=20                      # Results per page
VITE_SEARCH_MAX_SAVED=10                      # Max saved searches
```

### Frontend Verification

```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Verify bundle size
npm run build

# Check for performance warnings
ls -lh dist/assets/
```

---

## Part 4: Docker Deployment

### Update Docker Configuration

If deploying in Docker, update compose file:

```yaml
# docker-compose.prod.yml
services:
  backend:
    environment:
      - SEARCH_MAX_RESULTS=1000
      - SEARCH_SUGGESTION_LIMIT=50
      - RATE_LIMIT_SEARCH_READ=60
      - RATE_LIMIT_SEARCH_SUGGEST=30
      - RATE_LIMIT_SEARCH_STATS=10
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    environment:
      - VITE_API_URL=http://backend:8000/api/v1
      - VITE_SEARCH_DEBOUNCE=300
      - VITE_SEARCH_PAGE_SIZE=20
    ports:
      - "3000:5173"
```

### Build and Deploy

```bash
# Build Docker images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify services running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

---

## Part 5: Performance Tuning

### Database Query Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM students
WHERE deleted_at IS NULL
  AND (name ILIKE '%Alice%' OR email ILIKE '%alice%');

-- Expected: Sequential scan with 14 indexes available
-- Actual: Index scan using idx_students_name or idx_students_email
```

### Index Maintenance

```sql
-- Analyze table statistics (helps query planner)
ANALYZE students;
ANALYZE courses;
ANALYZE grades;

-- Rebuild indexes if needed (maintenance)
REINDEX TABLE students;
REINDEX TABLE courses;
REINDEX TABLE grades;

-- Monitor index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Frontend Optimization

```typescript
// Code splitting for search components
const SearchBar = lazy(() => import('@/components/SearchBar'));
const SearchResults = lazy(() => import('@/components/SearchResults'));
const AdvancedFilters = lazy(() => import('@/components/AdvancedFilters'));
const SavedSearches = lazy(() => import('@/components/SavedSearches'));

// Suspense boundaries for loading states
<Suspense fallback={<div>Loading...</div>}>
  <SearchBar />
</Suspense>
```

---

## Part 6: Monitoring & Observability

### Health Checks

```bash
# Test search endpoint directly
curl -X POST http://localhost:8000/api/v1/search/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Alice", "page": 1, "page_size": 10}'

# Test suggestions endpoint
curl http://localhost:8000/api/v1/search/suggestions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity": "student", "query": "Ali"}'

# Test statistics endpoint
curl http://localhost:8000/api/v1/search/statistics \
  -H "Authorization: Bearer $TOKEN"
```

### Monitoring Setup

```yaml
# prometheus.yml (add search metrics)
scrape_configs:
  - job_name: 'sms-search'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Search API latency (p95) | <500ms | >1000ms |
| Suggestion API latency (p95) | <200ms | >500ms |
| Database index scan % | >90% | <70% |
| Cache hit rate | >80% | <50% |
| API error rate | <1% | >5% |
| Database connection pool | <80% | >90% |

---

## Part 7: Rollback Procedures

### Quick Rollback (If Critical Issues)

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Rollback database migration
cd backend
alembic downgrade -1

# Restore from backup
psql -U postgres -d sms < backups/pre-search-feature-backup.sql

# Redeploy previous version
docker-compose -f docker-compose.prod.yml up -d
```

### Data Recovery

```sql
-- If search feature caused data issues
-- Restore soft-deleted records
UPDATE students SET deleted_at = NULL WHERE id IN (SELECT id FROM students_backup);

-- Verify data integrity
SELECT COUNT(*) as student_count FROM students WHERE deleted_at IS NULL;
SELECT COUNT(*) as course_count FROM courses WHERE deleted_at IS NULL;
SELECT COUNT(*) as grade_count FROM grades WHERE deleted_at IS NULL;
```

---

## Part 8: Post-Deployment Verification

### Test Search Functionality

Run comprehensive test suite:

```bash
# Backend tests
cd backend
pytest tests/test_search_*.py -v

# Frontend tests
cd frontend
npm run test -- --run

# E2E tests
npm run e2e

# Load test
k6 run load-testing/search.js
```

### Verify User Experience

1. **Students Search**: Can regular users search and filter students?
2. **Courses Search**: Can users search courses by name/code?
3. **Grades Search**: Can users search their grades by range?
4. **Suggestions**: Do autocomplete suggestions work?
5. **Saved Searches**: Can users save and recall searches?
6. **Performance**: Are searches responding in <500ms?
7. **Pagination**: Can users navigate between pages?
8. **Filters**: Do advanced filters work correctly?

### Monitor Error Logs

```bash
# Check backend logs
docker logs <container-id> | grep -i error

# Check frontend errors
# Open browser dev tools and check console for errors

# Check application logs
tail -f logs/application.log | grep -i search
```

---

## Deployment Checklist

### Pre-Deployment (Day Before)

- [ ] All tests passing locally
- [ ] Code review completed
- [ ] Database backup created
- [ ] Staging deployment successful
- [ ] Performance benchmarks met
- [ ] Documentation finalized
- [ ] Team aware of deployment time

### Deployment Day

- [ ] Communication sent to stakeholders
- [ ] Maintenance window scheduled
- [ ] Monitor deployed (Prometheus/Grafana ready)
- [ ] Rollback plan reviewed with team
- [ ] Database backup verified
- [ ] API keys/secrets configured
- [ ] Environment variables set
- [ ] Alembic migration ready

### During Deployment

- [ ] Backend migration applied (15 min)
- [ ] Frontend build completed (10 min)
- [ ] Docker images built and pushed (20 min)
- [ ] Services started (5 min)
- [ ] Health checks passing (5 min)
- [ ] API endpoints responding (5 min)
- [ ] Smoke tests passing (10 min)

### Post-Deployment (1 Hour)

- [ ] All endpoints responding
- [ ] No error spikes in logs
- [ ] Search latency <500ms
- [ ] Suggestion latency <200ms
- [ ] Database indexes used correctly
- [ ] Cache hit rate >80%
- [ ] User reports functional

### Post-Deployment (24 Hours)

- [ ] Continuous monitoring active
- [ ] No critical issues reported
- [ ] Performance metrics stable
- [ ] User adoption tracking started
- [ ] Documentation updated
- [ ] Release notes published

---

## Troubleshooting

### Issue: "Index Not Found" Error

**Symptoms**: Search queries fail with index errors

**Solution**:
```bash
cd backend
alembic upgrade head
# Verify indexes
python -c "from backend.models import db; inspect(db.engine).get_indexes('students')"
```

### Issue: Search Timeout

**Symptoms**: Search requests timeout after 5 seconds

**Solution**:
1. Check database performance: `EXPLAIN ANALYZE SELECT ...`
2. Increase timeout: `SEARCH_TIMEOUT_SECONDS=10`
3. Add more indexes: Check `alembic/versions/feature128_add_search_indexes.py`

### Issue: Memory Leak in Suggestions Cache

**Symptoms**: Memory usage increases over time

**Solution**:
```python
# Clear cache periodically
cache = {}  # Reset cache

# Or add cache expiration
from datetime import datetime, timedelta
if datetime.now() - cache_time > timedelta(hours=1):
    cache = {}
```

### Issue: Database Locks During Migration

**Symptoms**: Migration hangs or database is locked

**Solution**:
```bash
# Check active queries
SELECT * FROM pg_stat_activity;

# Kill long-running queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > '5 min';

# Retry migration
alembic upgrade head
```

---

## Performance Baselines

After deployment, verify these baseline metrics:

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Search 100K results | 150-300ms | <500ms |
| Get suggestions (50) | 50-100ms | <200ms |
| Advanced filter | 200-400ms | <800ms |
| Full page load | 1-2s | <5s |
| Database index scan | >95% | >80% |

---

## Support & Escalation

**For deployment issues**:
1. Check logs: `docker logs <container>`
2. Verify environment variables are set
3. Check database connectivity
4. Review performance metrics

**For performance issues**:
1. Analyze slow queries: `EXPLAIN ANALYZE SELECT ...`
2. Check index usage
3. Monitor cache hit rate
4. Review application logs

**Emergency Rollback**:
- Contact DevOps team
- Execute rollback procedure (Part 7)
- Restore from backup
- Notify stakeholders

---

## Changelog

### Version 1.0.0 (January 17, 2026)
- Initial production deployment guide
- Database migration procedures
- Configuration management
- Performance tuning
- Monitoring setup
- Rollback procedures
- Troubleshooting guide
