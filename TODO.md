# Project TODO

**Last updated**: 2025-12-02 (v1.9.4 Post-Release Cleanup)
**Review Score**: 9.8/10 (Excellent - Production Ready with Enhanced Quality Gates)
**Current Version**: 1.9.4

---

## ✅ Completed (v1.9.x Series Achievements)

| Area | Highlights |
|------|-----------|
| Security | SECRET_KEY hardening; password strength validator; login throttling & lockout; CSRF middleware; AUTH_MODE compliance; **RFC 7807 error handling**; **Security headers middleware**; **Code signing certificate** (AUT MIEEK) |
| Performance | Eager loading (analytics); targeted DB indexes; response caching layer; React memoization; 85% reduction in API calls via autosave debouncing; **SQLAlchemy session optimization** |
| Architecture | Service layer (9 services); component refactors; TypeScript strict mode; code splitting; **pre-commit hooks**; **Consolidated scripts** (DOCKER.ps1, NATIVE.ps1) |
| Installer | **Bilingual installer** (EN/EL); **Code signing** with self-signed certificate; **VBS toggle** with pwsh.exe and -Silent flag; **First-time Docker install** working; **Desktop shortcut** creation |
| Testing & Quality | **Translation integrity tests**; **exception handler regression tests**; **enhanced CI/CD** with frontend quality gates; **DEV_EASE pre-commit policy** |
| UX Enhancement | Universal autosave pattern; automatic data persistence; visual save indicators; eliminated manual save buttons |
| Documentation | Port references standardized to 8080; legacy script refs updated to DOCKER.ps1/NATIVE.ps1; installer docs aligned; **comprehensive Git workflow guide** |
| **Legacy Cleanup** | All pre-v1.9.1 artifacts archived; CHANGELOG modernized; TODO refreshed for v1.9.x; **obsolete temp files removed**; **CI debug tools cleaned** |

All high-impact objectives delivered; quality gates prevent regressions.

## 🔄 v1.9.4 Release (Completed)

### DEV_EASE Pre-Commit Policy & Hardening

- ✅ DEV_EASE restricted to local pre-commit use only (no runtime/CI impact)
- ✅ COMMIT_READY.ps1 enforces opt-in for SkipTests/SkipCleanup/AutoFix
- ✅ Sample pre-commit hook added (`.githooks/commit-ready-precommit.sample`)
- ✅ Cross-platform hook installers (PowerShell + POSIX)
- ✅ VS Code workspace test tasks and launch configs
- ✅ Documentation updates across repository
- ✅ Full smoke test validation passed

### Repository Cleanup (Completed)

- ✅ Removed all temporary output files (*.txt logs in root)
- ✅ Removed temporary test directories (tmp_cleanup_smoke, tmp_test_migrations)
- ✅ Removed obsolete planning docs (CONSOLIDATION_COMPLETE.md, MASTER_CONSOLIDATION_PLAN.md, etc.)
- ✅ Removed obsolete CI debug tools (tools/ci/)
- ✅ Removed COMMIT_READY.norun.ps1 test variant

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

