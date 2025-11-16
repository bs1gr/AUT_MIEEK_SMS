# Load Test Playbook

**Status**: Draft
**Last Updated**: 2025-11-16
**Applies To**: v1.6.3+

Guidelines for executing and interpreting backend load tests.

---

## 1. Objectives

| Goal | Metric | Target |
|------|--------|--------|
| Baseline latency | p95 GET /students | < 250ms (uncached) |
| Cached latency | p95 GET /courses (cached) | < 80ms |
| Throughput | Sustained requests | 200 req/min (single-node) |
| Error rate | 5xx responses | < 0.5% |
| DB efficiency | Queries per analytics request | ≤ 5 |

---

## 2. Tooling

Recommended: **Locust** or **k6**.

Example (k6 script skeleton):

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.005'],
  },
};

export default function () {
  const res = http.get('http://localhost:8000/api/v1/students');
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}
```

---

## 3. Scenario Matrix

| Scenario | Description | Endpoints |
|----------|-------------|-----------|
| Read-heavy | Many concurrent student/course fetches | /students, /courses |
| Analytics burst | Summary endpoints under load | /analytics/* |
| Mixed workload | Interleaved reads + writes | /grades (POST) + reads |
| Cache efficiency | Repeated GET same resource | Any cached GET |

---

## 4. Execution Steps

1. Start system (fullstack Docker preferred).
2. Warm cache with representative GET requests.
3. Run staged test (e.g., k6 script above).
4. Capture:
   - k6 summary
   - Backend logs (slow-query entries)
   - CPU/RAM (Task Manager / docker stats)
5. Repeat without warming cache to compare cold vs hot paths.

---

## 5. Metrics Collection

| Source | Method |
|--------|--------|
| k6 output | Automatic summary (latency percentiles, errors) |
| Slow queries | Backend logs (threshold configured) |
| Cache stats | (Future) expose endpoint or debug log |
| DB connections | SQLite (single connection) |

---

## 6. Interpreting Results

| Symptom | Possible Cause | Action |
|---------|----------------|--------|
| High p95 uncached but low cached | Expensive queries | Confirm N+1 fixed; add indexes |
| High error rate (429) | Rate limit thresholds too low | Adjust limiter config |
| Slow analytics endpoints | Missing eager loading | Add joinedload / optimize aggregation |
| Memory growth | Cache sizing too large | Reduce maxsize / TTL |

---

## 7. Regression Policy (Summary)

A test is considered a regression if:

- p95 latency increases >15% over previous baseline
- Query count per analytics request exceeds 5
- Error rate (5xx) exceeds 0.5%
- Cache hit rate (future metric) drops below 60%

Action: Investigate commit diff, revert or optimize before release tagging.

---

## 8. Roadmap

- Add dedicated `/metrics` endpoint (Prometheus format)
- Track cache hit/miss counters
- Automate weekly baseline capture via CI workflow

---
**Reference**: See `docs/DOCUMENTATION_INDEX.md` and `PERFORMANCE_OPTIMIZATIONS_2025-01-10.md`.
