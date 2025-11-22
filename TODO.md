# Project TODO

**Last updated**: 2025-11-22 (Auth fix + Documentation cleanup)
**Review Score**: 9/10 (Excellent - Production Ready)
**Recent Achievement**: Admin endpoints AUTH_MODE compliance fixed; Windows installer wizard shipped; documentation consolidated.

---

## ✅ Completed (Security, Performance, Architecture)

| Area | Highlights |
|------|-----------|
| Security | SECRET_KEY hardening; password strength validator; login throttling & lockout; CSRF middleware |
| Performance | Eager loading (analytics); targeted DB indexes; response caching layer; React memoization |
| Architecture | Service layer (9 services); component refactors; TypeScript strict mode; code splitting; pre-commit hooks |

All high-impact objectives delivered; no immediate follow-up required.

## 🔄 Recent Fixes (Nov 22 2025)

- Admin endpoints migrated to `optional_require_role()` (AUTH_MODE respected for emergency access).
- Session documentation archived & indexed.
- CHANGELOG and Copilot instructions synchronized.

## 🧪 Testing Backlog

- [ ] Frontend component tests (StudentCard, CourseGradeBreakdown, AttendanceDetails)
- [ ] Frontend API client tests (`frontend/src/api/api.js` – interceptors & error paths)
- [ ] React hook tests (`useAuth`, `useCourses`, `useGrades`, `useAttendance`, etc.)
- [ ] Backend edge cases (`backend/tests/test_edge_cases.py` – concurrency, rollbacks, boundary values)

Backend coverage goal (≥80%) achieved; focus now on frontend depth & resilience.

## 📚 Documentation Backlog

- [ ] Expand deployment runbook (`docs/deployment/RUNBOOK.md`) – rollback, incident response, RTO/RPO checklist.
- [ ] Add API request/response examples (auth flow, error envelope, pagination) in dedicated guide.
- [ ] Produce architecture & sequence diagrams (startup lifecycle, backup flow, auth refresh rotation).

## 🚀 DevOps / CI Backlog

- [ ] Unit tests for `.github/scripts/normalize_ruff.py` & validators.
- [ ] npm dependency caching in CI (actions/setup-node) to speed builds.
- [ ] Introduce load-testing suite (Locust/Gatling) & baseline performance doc.
- [ ] Export application metrics (Prometheus/OpenTelemetry instrumentation).

## 🎯 High-Level Priorities (Next Iteration Plan)

| Priority | Task | Effort | Outcome |
|----------|------|--------|---------|
| 1 | Component + hook tests | Medium | Improved UI robustness |
| 2 | Deployment runbook expansion | Low | Faster incident response |
| 3 | API examples & diagrams | Medium | Easier onboarding & audits |
| 4 | CI npm caching | Low | Shorter pipeline times |
| 5 | Metrics & load tests | High | Capacity planning & SLA validation |

## 📝 Notes

- Legacy phase tracking removed (obsolete after consolidation).
- Completed work retained only as summary; document focuses on actionable backlog.
  - Effort: 2 hours
