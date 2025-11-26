# Project TODO

**Last updated**: 2025-11-26 (Installer & Code Signing Implementation)
**Review Score**: 9.8/10 (Excellent - Production Ready with Enhanced Quality Gates)
**Recent Achievement**: Windows installer fully functional with Greek localization, code signing, VBS toggle fixes, and first-time Docker installation working correctly.

---

## ✅ Completed (Security, Performance, Architecture, UX)

| Area | Highlights |
|------|-----------|
| Security | SECRET_KEY hardening; password strength validator; login throttling & lockout; CSRF middleware; AUTH_MODE compliance; **RFC 7807 error handling** with JSON-serializable responses; **Security headers middleware**; **Code signing certificate** (AUT MIEEK) |
| Performance | Eager loading (analytics); targeted DB indexes; response caching layer; React memoization; 85% reduction in API calls via autosave debouncing; **SQLAlchemy session optimization** |
| Architecture | Service layer (9 services); component refactors; TypeScript strict mode; code splitting; **pre-commit hooks**; **Consolidated scripts** (DOCKER.ps1, NATIVE.ps1) |
| Installer | **Bilingual installer** (EN/EL); **Code signing** with self-signed certificate; **VBS toggle** with pwsh.exe and -Silent flag; **First-time Docker install** working; **Desktop shortcut** creation |
| Testing & Quality | **Translation integrity tests**; **exception handler regression tests**; **enhanced CI/CD** with frontend quality gates |
| UX Enhancement | Universal autosave pattern; automatic data persistence; visual save indicators; eliminated manual save buttons |

All high-impact objectives delivered; quality gates prevent regressions.

## 🔄 Recent Fixes (Nov 26 2025)

### Installer & Code Signing (Latest)

**Installer Improvements:**
- ✅ Greek localization: Fixed Windows-1253 encoding for Greek.isl, added `english.`/`greek.` prefixes for CustomMessages.
- ✅ Placeholder substitution: Changed FmtMessage to StringChangeEx for %1/%2 substitution in upgrade dialogs.
- ✅ Removed redundant prompts: Eliminated duplicate "keep data" prompt during upgrade.
- ✅ VBS Toggle fixes:
  - Changed `powershell.exe` to `pwsh.exe` (PowerShell 7+ compatibility).
  - Added `-Silent` flag to prevent Read-Host blocking.
  - Added `-Start` step after install to create and launch container.
  - Proper UTF-16 LE encoding for Greek Unicode display.
- ✅ Code signing: Self-signed certificate for AUT MIEEK, installer shows verified publisher.
- ✅ Signing automation: `SIGN_INSTALLER.ps1` script, `BUILD_DISTRIBUTION.ps1` auto-signs.
- ✅ Certificate trust: `INSTALL_CERTIFICATE.ps1` for end-user trust installation.

**Files Created/Modified:**
- `installer/SIGN_INSTALLER.ps1` - Sign installer builds
- `installer/INSTALL_CERTIFICATE.ps1` - Install certificate as trusted
- `installer/README.md` - Installer documentation
- `installer/AUT_MIEEK_CodeSign.cer` - Public certificate
- `.gitignore` - Added *.pfx exclusion
- `BUILD_DISTRIBUTION.ps1` - Auto-signs after build

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

## 📈 Roadmap v1.8.9

Focus areas for the next patch release (incremental, fast follow to consolidation):

| Pillar | Item | Rationale | Target Outcome |
|--------|------|-----------|----------------|
| Testing | Component + hook coverage (StudentCard, CourseGradeBreakdown, AttendanceDetails, useAuth, useGrades) | Reduce regression risk & increase confidence in UI refactors | ≥30 new frontend tests, >70% component coverage |
| Deployment | Runbook expansion (rollback, incident response steps, backup restore verification matrix) | Faster operator recovery & clearer SLA definitions | Published `RUNBOOK.md` with RTO/RPO targets |
| Observability | Prometheus/OpenTelemetry instrumentation for key endpoints + baseline latency report | Capacity planning ahead of expected data growth | Metrics endpoint enriched + initial performance snapshot |
| Performance | Lightweight load test suite (Locust) scripted into CI optional stage | Detect throughput regressions early | Baseline: 50 concurrent users, <300ms p95 for read ops |
| CI Efficiency | npm caching + release automation workflow (gh release create on tag push) | Shorter pipelines & consistent release packaging | 20–30% reduction in build time + auto generated draft release |
| Security | SECRET_KEY strict enforcement rollout doc & optional key rotation script | Harden deployments adopting strict mode | Guide + rotation script under `tools/security/` |

Milestone close criteria: All table outcomes met or documented with deferral justification in CHANGELOG.

## 📝 Notes

- Legacy phase tracking removed (obsolete after consolidation).
- Completed work retained only as summary; document focuses on actionable backlog.
  - Effort: 2 hours
