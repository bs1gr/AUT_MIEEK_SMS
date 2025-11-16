# Project TODO

**Last updated**: 2025-01-18 (Post security/performance sprint)
**Review Score**: 7.5/10 (Production-Ready with Improvements Needed)

---

## 🚨 CRITICAL PRIORITY (Security - Week 1-2)

### Security Hardening

- [x] **CRITICAL**: Enforce strong SECRET_KEY validation (don't allow default)
  - File: `backend/config.py:76`
  - Effort: 1 hour
  - Impact: Prevents JWT forgery
  - Status: **DONE** — Enhanced with multi-level enforcement (WARNING mode default, STRICT mode optional)
  - Implementation: Always warns about weak keys, can enable strict enforcement via SECRET_KEY_STRICT_ENFORCEMENT=True
  - Detection: Placeholder values, short keys (<32 chars), suspicious patterns
  - Production safety: CRITICAL alerts for production environments with weak keys
  - Backward compatible: Warnings don't break existing deployments
  - Commit: 1cb8a93

- [x] **HIGH**: Add password strength validation
  - File: `backend/routers/routers_auth.py:160`
  - Requirements: min 8 chars, uppercase, lowercase, digit, special char
  - Effort: 2 hours
  - Status: **DONE** — `_validate_password_strength` covers create/update/reset

- [x] **HIGH**: Implement account lockout after failed login attempts
  - File: `backend/routers/routers_auth.py`
  - Add rate limiting + temporary lockout (5 attempts, 5 min lockout)
  - Effort: 4 hours
  - Status: **DONE** — enforced via `backend/security/login_throttle.py`

- [x] **HIGH**: Add CSRF protection for state-changing operations
  - Install: `fastapi-csrf-protect`
  - Apply to POST/PUT/DELETE endpoints
  - Effort: 4 hours
  - Status: **DONE** — middleware + tests in `backend/security/csrf.py`

---

## 🔥 HIGH PRIORITY (Performance - Week 3-4)

### Performance Optimization

- [x] Fix N+1 query problems in analytics endpoints
  - Use SQLAlchemy eager loading (`joinedload`)
  - Files: `backend/services/analytics_service.py`
  - Effort: 4 hours
  - Impact: 50-100x faster for 100 students
  - Status: **DONE** — eager loading added to all 3 methods (calculate_final_grade, get_student_all_courses_summary, get_student_summary)
  - Implementation: Single query with `joinedload` for grades, daily_performances, attendances relationships
  - Test coverage: 12/12 passing (test_analytics_router.py, test_services_analytics.py)
  - Commit: 66e2716

- [x] Add missing database indexes
  - Add: `idx_grade_date_assigned`, `idx_grade_date_submitted`
  - Add: `idx_attendance_student_course_date` (3-column)
  - File: `backend/models.py`
  - Effort: 2 hours
  - Impact: 30-40% faster queries
  - Status: **DONE** — applied via Alembic migration `20250115_add_grade_indexes`

- [x] Implement response caching middleware
  - Add Redis or in-memory LRU cache
  - Cache GET endpoints for 5 minutes
  - Effort: 4 hours
  - Impact: 70-80% faster for cached endpoints
  - Status: **DONE** — request-aware caching in `backend/middleware/response_cache.py`

- [x] Add React.memo to heavy components
  - File: `frontend/src/features/students/components/StudentsView.tsx`
  - Wrap StudentCard, CourseGradeBreakdown
  - Effort: 3 hours
  - Impact: 60-70% faster rendering with 100+ students
  - Status: **DONE** — `StudentCard` & `CourseGradeBreakdown` wrapped via `memo`

---

## 📊 MEDIUM PRIORITY (Code Quality - Month 1-2)

### Frontend Improvements

- [x] **Enable TypeScript strict mode**
  - File: `frontend/tsconfig.json`
  - Set `strict: true`, `noUnusedLocals: true`
  - Effort: 6 hours (fix resulting errors)
  - Impact: Catch 20-30 potential bugs
  - Status: **DONE** — strict mode enabled and warnings resolved

- [ ] **Extract service layer from routers** (Backend Architecture) 🔄 **67% COMPLETE**
  - ✅ Created `backend/services/` directory with `__init__.py`
  - ✅ CourseService (146 lines) - commit ace2677
  - ✅ GradeService (194 lines) - commit ace2677
  - ✅ AttendanceService (214 lines) - commit ace2677
  - ✅ EnrollmentService (267 lines) - commit c180349
  - ✅ DailyPerformanceService (new) — router refactored
  - ✅ HighlightService (new) — router refactored
  - 🔄 6 of 9 routers refactored (courses, grades, attendance, enrollments, daily-performance, highlights)
  - 🔲 Remaining: imports, exports, analytics (3 routers)
  - Effort: 12 hours total (6.5 hours completed, 5.5 hours remaining)
  - Impact: Testable, reusable logic with comprehensive docstrings
  - Next: ImportsService extraction

- [x] **Refactor complex components**
  - Break `StudentsView.tsx` (605 LOC) into smaller components
  - Extract: `StudentCard`, `CourseGradeBreakdown`, `AttendanceDetails`
  - Target: <200 LOC per component
  - Effort: 8 hours
  - Status: **DONE** — Components extracted, StudentsView reduced to 204 LOC

- [x] **Add route-based code splitting**
  - Use React lazy loading for page components
  - Effort: 4 hours
  - Impact: Smaller bundle size
  - Status: **DONE** — All page components lazy-loaded with React.lazy()
  - Implementation: 10 routes split into separate chunks
  - Bundle analysis: 45 chunks generated, largest vendor chunk 301kB (gzip: 103kB)
  - Page chunks range from 0.52kB to 40kB (gzip), excellent granularity

- [x] Add pre-commit hooks (ruff, prettier)
  - File: `.pre-commit-config.yaml` (new)
  - Auto-fix on commit
  - Effort: 1 hour
  - Status: **DONE** — hooks run ruff + prettier on staged files

- [x] **Strip or guard production `console.log` usage during builds**
  - Status: **DONE** — Terser configured to drop console.log in production
  - ESLint rule added: warns about console.log, allows console.warn/error
  - Verified: console.log removed from all built assets
  - Impact: Cleaner code, reduced bundle size, improved security
  - Commit: 2c815fa

### Backend Improvements

- [x] Introduce soft delete support (`deleted_at` semantics) ✅ COMPLETED
- [x] Enhanced error responses with stable error IDs ✅ COMPLETED

---

## 🧪 TESTING (Month 2)

### Test Coverage Expansion

- [x] Add E2E tests with Playwright
  - Test critical user flows (create student, assign grade, attendance, analytics)
  - File: `frontend/tests/e2e/` directory
  - Effort: 16 hours
  - Priority: HIGH
  - Status: **DONE** — 7 comprehensive test scenarios covering student management, courses, grades, attendance, analytics
  - Implementation: `student-management.spec.ts`, `helpers.ts`, comprehensive README
  - Test count: 7 core workflows with reusable helpers for data generation, auth, API setup
  - Commit: f345a1b

- [ ] Expand frontend unit tests 🔄 **PARTIAL** (35% coverage → 70% target)
  - ✅ gradeUtils tests (27 test cases) - commit 62c8796
  - ✅ Vitest configured with 44 tests passing
  - 🔲 Component tests needed (StudentCard, CourseGradeBreakdown, etc.)
  - 🔲 API client tests (api.js)
  - 🔲 Hook tests (useAuth, useCourses, etc.)
  - Files: `frontend/src/**/__tests__/` and `*.test.ts`
  - Effort: 20 hours total (2 hours completed, 18 hours remaining)
  - Next: Component unit tests with @testing-library/react

- [ ] Add edge case tests
  - Boundary values, concurrent operations, transaction rollbacks
  - File: `backend/tests/test_edge_cases.py` (new)
  - Effort: 6 hours

- [x] Increase automated test coverage to 80%+ ✅ COMPLETED (backend)

---

## 📚 DOCUMENTATION (Month 2-3)

### Documentation Updates

- [x] **Consolidate scattered documentation**
  - Previous: 32+ markdown files scattered in docs/ root
  - Created clear directory structure: `docs/user/`, `docs/deployment/`, `docs/development/`
  - Moved 8 files to appropriate directories
  - Created INDEX.md navigation files for each directory
  - Created STRUCTURE.md organization guide
  - Updated DOCUMENTATION_INDEX.md with role-based navigation
  - Effort: 4 hours
  - Status: **DONE** — Comprehensive reorganization complete
  - Commit: 03e325b

- [ ] Create deployment runbook
  - Production checklist
  - Rollback procedures
  - Monitoring setup
  - Effort: 3 hours
  - Status: **PARTIAL** — docs/deployment/RUNBOOK.md exists, needs expansion

- [ ] Add API documentation examples
  - Flesh out OpenAPI/README examples with request/response samples
  - Authentication guide
  - Error handling examples
  - Effort: 3 hours

- [ ] Add deployment architecture and sequence diagrams for critical workflows

---

## 🚀 DEPLOYMENT & DevOps (Month 3)

### CI/CD & Automation

- [x] **Setup GitHub Actions CI/CD pipeline** ✅ **DONE** (Existing)
  - ✅ Run tests on PR - `.github/workflows/ci.yml` backend/frontend jobs
  - ✅ Build Docker image on tag - `.github/workflows/docker-publish.yml` (manual workflow_dispatch)
  - ✅ Upload coverage reports - `actions/upload-artifact@v4` with `backend-coverage` artifact
  - ✅ Additional: Security audit (pip-audit), SBOM generation (Syft), pre-commit hooks
  - ✅ Additional: Wheelhouse caching, integration smoke tests
  - File: `.github/workflows/ci.yml` (existing, comprehensive)
  - Status: Discovered existing comprehensive CI/CD implementation with 10 workflows
  - No changes needed: CI runs on push/PR to main, Docker builds with manual dispatch on tags

- [x] **Add automated dependency scanning** ✅ **DONE**
  - ✅ Setup `pip-audit` in CI - Already existed in ci.yml backend job
  - ✅ Setup `npm audit` in CI - Added to frontend job (commit 769428b+)
  - Both generate JSON reports and upload as artifacts
  - Security audits run on every push/PR
  - Effort: 15 minutes (mostly verification)

- [x] **Create production Docker Compose template** ✅ **DONE**
  - ✅ Add PostgreSQL service - postgres:16-alpine with health checks
  - ✅ Add health checks - pg_isready for PostgreSQL, existing for backend/frontend
  - ✅ Add resource limits - CPU/memory limits for all services
  - ✅ Add dedicated network (sms_network) for service isolation
  - ✅ Add PostgreSQL volume (postgres_data) for data persistence
  - File: `docker-compose.prod.yml` (existing, enhanced)
  - Additional: Created `.env.production.example` with security checklist
  - Usage: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
  - Effort: 45 minutes

- [ ] Add unit coverage for `.github/scripts/normalize_ruff.py` and related validators
- [ ] Cache npm dependencies in CI to reduce install time
- [ ] Expand load-testing automation (e.g., Locust) and integrate with pipelines
- [ ] Track application/business metrics via Prometheus/OpenTelemetry
- [ ] Capture load-test playbooks and metrics expectations in `docs/`

---

## ✅ COMPLETED

### Backend

- [x] Increase automated test coverage to 80%+ (246 passing tests, 100% success)
- [x] Add dedicated unit tests for import router validation failure modes
- [x] Extend health checks to report memory utilization thresholds
- [x] Implement SQLAlchemy query performance monitoring with slow-query logging
- [x] Enable response compression (FastAPI `GZipMiddleware`)
- [x] Produce Docker production configuration (compose overlay with resource limits)
- [x] Introduce soft delete support (`deleted_at` semantics) for critical models
- [x] Enhanced error responses with stable error IDs and documented enums
- [x] Added targeted grade/attendance indexes via Alembic migration
- [x] Request-aware response caching middleware for hot GET endpoints

### Frontend

- [x] Add React Error Boundary component ✅ EXISTS
- [x] React Query for data fetching ✅ IMPLEMENTED (TanStack Query)
- [x] Zustand for state management ✅ IMPLEMENTED
- [ ] Surface API version headers in the UI (low priority)
- [ ] Evaluate client-side caching for heavy read endpoints (pending backend caching decisions)
- [x] Memoized `StudentCard` & `CourseGradeBreakdown` components
- [x] Enabled TypeScript strict mode (tsconfig + fixes)

### Infrastructure

- [x] API Rate Limiting (slowapi) ✅ IMPLEMENTED
- [x] Alembic Database Migrations ✅ IMPLEMENTED
- [x] Request ID Tracking ✅ IMPLEMENTED
- [x] Comprehensive Health Checks ✅ IMPLEMENTED
- [x] Pre-commit hooks for ruff + prettier (auto-fix formatting)

---

## 🎯 QUICK WINS (High ROI, Low Effort)

Already shipped during the January sprint:

1. ✅ **Enable TypeScript strict mode** (6h → catch 20-30 bugs)
2. ✅ **Add missing database indexes** (2h → +40% performance)
3. ✅ **Implement React.memo** (3h → +60% render performance)
4. ✅ **Add pre-commit hooks** (1h → auto-fix formatting)
5. ✅ **Add response caching** (4h → +70% API performance)

---

## 📈 PROGRESS TRACKING

### Phase 1: Critical Security Fixes (Weeks 1-2) - 23 hours

- [ ] 3/4 tasks completed (password policy, CSRF, lockout ✅ | SECRET_KEY hardening ⏸️)
- Blockers: Awaiting decision on enforcement window for SECRET_KEY rotation
- ETA: Deferred until after production freeze lifts

### Phase 2: Performance Optimizations (Weeks 3-4) - 17 hours

- [ ] 3/4 tasks completed (indexes, caching, React.memo ✅ | N+1 query fix 🚧)
- Blockers: Analytics router refactor (shared dependency with service layer work)
- ETA: 1 week once analytics refactor starts

### Phase 3: Code Quality (Month 2) - 51 hours

- [ ] 2/6 tasks completed (TS strict + pre-commit ✅)
- Blockers: Waiting on design sign-off for StudentsView split + service layer plan
- ETA: 6-7 weeks part-time once dependencies unblocked

### Phase 4: Testing & Docs (Month 3) - 46 hours

- [ ] 0/7 tasks completed
- Blockers: None (can run in parallel)
- ETA: 5-6 weeks part-time

---

## 📝 NOTES

### Recent Changes (v1.5.0)

- ✅ Comprehensive code review completed (2025-01-10)
- ✅ TODO list updated with prioritized findings from review
- ✅ Overall health score: 7.5/10 (Production-Ready with Improvements)
- ✅ Legacy IMPROVEMENT_ROADMAP.md and V2_MODERNIZATION_ROADMAP.md retired; highlights folded into this TODO (see DOCUMENTATION_CLEANUP_2025-01-10.md)

### Deployment Status

- ✅ **Ready for internal/staging** (with SECRET_KEY changed)
- ⚠️ **Production deployment** recommended after Phase 1 + Phase 2 (4-6 weeks)
- 🎯 **Enterprise-grade** after all phases (3-4 months)
- 💤 SECRET_KEY auto-validation intentionally deferred until post-release freeze

### Next Code Review

- [ ] Schedule next comprehensive review after Phase 3 completion (~3 months from now)
- [ ] Track technical debt reduction metrics
- [ ] Update improvement roadmap based on progress

---

**For detailed review findings, see:** Comprehensive Code Review Report (generated 2025-01-10)
**See also**: `DOCUMENTATION_CLEANUP_2025-01-10.md` for archived plan context and `docs/V2_QUICK_REFERENCE.md` for an abridged modernization view
