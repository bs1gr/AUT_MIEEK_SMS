# Load Testing Process & Checklist

**Purpose:** Ensure every major release meets performance targets and is free of regressions by running and documenting load tests.

---

## 🚦 When to Run Load Tests

- Before every major or minor release
- After significant backend or database changes
- After infrastructure or scaling changes

---

## 🛠️ Tools

- **Locust** (primary, Python-based)
- **Gatling** (optional, JVM-based)
- **Prometheus/Grafana** for monitoring

---

## 📋 Checklist

- [ ] Update load test scenarios to reflect new features/endpoints
- [ ] Run Locust/Gatling tests against staging or pre-production
- [ ] Record key metrics: response times, throughput, error rates, resource usage
- [ ] Compare results to previous baselines (see `docs/operations/LOAD_TEST_RESULTS.md`)
- [ ] Investigate and resolve any regressions or bottlenecks
- [ ] Document results and attach to release notes

---

## 📝 Example Metrics to Capture

- 95th/99th percentile response time per endpoint
- Max concurrent users supported
- Error rate under load
- DB/query performance
- CPU/memory usage

---

## 📂 Where to Document

- `docs/operations/LOAD_TEST_RESULTS.md` (append each run)
- Release notes (summary of results and any actions taken)

---

_Last updated: 2025-12-18_
