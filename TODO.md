# Project TODO

**Last updated**: 2025-11-26 (v1.9.3 Release Preparation)
**Review Score**: 9.8/10 (Excellent - Production Ready with Enhanced Quality Gates)
**Current Version**: 1.9.3

---

## ✅ Completed (v1.9.x Series Achievements)

| Area | Highlights |
|------|-----------|
| Security | SECRET_KEY hardening; password strength validator; login throttling & lockout; CSRF middleware; AUTH_MODE compliance; **RFC 7807 error handling**; **Security headers middleware**; **Code signing certificate** (AUT MIEEK) |
| Performance | Eager loading (analytics); targeted DB indexes; response caching layer; React memoization; 85% reduction in API calls via autosave debouncing; **SQLAlchemy session optimization** |
| Architecture | Service layer (9 services); component refactors; TypeScript strict mode; code splitting; **pre-commit hooks**; **Consolidated scripts** (DOCKER.ps1, NATIVE.ps1) |
| Installer | **Bilingual installer** (EN/EL); **Code signing** with self-signed certificate; **VBS toggle** with pwsh.exe and -Silent flag; **First-time Docker install** working; **Desktop shortcut** creation |
| Testing & Quality | **Translation integrity tests**; **exception handler regression tests**; **enhanced CI/CD** with frontend quality gates |
| UX Enhancement | Universal autosave pattern; automatic data persistence; visual save indicators; eliminated manual save buttons |
| Documentation | Port references standardized to 8080; legacy script refs updated to DOCKER.ps1/NATIVE.ps1; installer docs aligned |
| **Legacy Cleanup** | All pre-v1.9.1 artifacts archived; CHANGELOG modernized; TODO refreshed for v1.9.x |

All high-impact objectives delivered; quality gates prevent regressions.

## 🔄 v1.9.3 Release (In Progress)

### Legacy Archival & Cleanup

- ✅ Archived pre-v1.9.1 release notes to `archive/pre-v1.9.1/`
- ✅ Archived deprecated scripts and session documentation
- ✅ Created CHANGELOG_ARCHIVE.md with historical summary
- ✅ Refactored CHANGELOG.md for v1.9.x only
- ✅ Updated TODO.md with current priorities
- ⬜ Update VERSION file to 1.9.3
- ⬜ Create v1.9.3 release notes

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

## 🎯 High-Level Priorities (Next Iteration)

| Priority | Task | Effort | Outcome |
|----------|------|--------|---------|
| 1 | Component + hook tests | Medium | Improved UI robustness |
| 2 | Deployment runbook expansion | Low | Faster incident response |
| 3 | API examples & diagrams | Medium | Easier onboarding & audits |
| 4 | CI npm caching | Low | Shorter pipeline times |
| 5 | Metrics & load tests | High | Capacity planning & SLA validation |

## 📝 Notes

- Legacy phase tracking removed (obsolete after v1.9.x consolidation)
- Pre-v1.9.1 documentation archived to `archive/pre-v1.9.1/`
- Completed work retained only as summary; document focuses on actionable backlog

