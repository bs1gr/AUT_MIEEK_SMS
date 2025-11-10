# Project TODO

**Last updated**: 2025-01-10 (Based on Comprehensive Code Review v1.5.0)
**Review Score**: 7.5/10 (Production-Ready with Improvements Needed)

---

## 🚨 CRITICAL PRIORITY (Security - Week 1-2)

### Security Hardening
- [ ] **CRITICAL**: Enforce strong SECRET_KEY validation (don't allow default)
  - File: `backend/config.py:76`
  - Effort: 1 hour
  - Impact: Prevents JWT forgery

- [ ] **HIGH**: Add password strength validation
  - File: `backend/routers/routers_auth.py:160`
  - Requirements: min 8 chars, uppercase, lowercase, digit, special char
  - Effort: 2 hours

- [ ] **HIGH**: Implement account lockout after failed login attempts
  - File: `backend/routers/routers_auth.py`
  - Add rate limiting + temporary lockout (5 attempts, 5 min lockout)
  - Effort: 4 hours

- [ ] **HIGH**: Add CSRF protection for state-changing operations
  - Install: `fastapi-csrf-protect`
  - Apply to POST/PUT/DELETE endpoints
  - Effort: 4 hours

---

## 🔥 HIGH PRIORITY (Performance - Week 3-4)

### Performance Optimization
- [ ] Fix N+1 query problems in analytics endpoints
  - Use SQLAlchemy eager loading (`joinedload`)
  - Files: `backend/routers/routers_analytics.py`
  - Effort: 4 hours
  - Impact: 50-100x faster for 100 students

- [ ] Add missing database indexes
  - Add: `idx_grade_date_assigned`, `idx_grade_date_submitted`
  - Add: `idx_attendance_student_course_date` (3-column)
  - File: `backend/models.py`
  - Effort: 2 hours
  - Impact: 30-40% faster queries

- [ ] Implement response caching middleware
  - Add Redis or in-memory LRU cache
  - Cache GET endpoints for 5 minutes
  - Effort: 4 hours
  - Impact: 70-80% faster for cached endpoints

- [ ] Add React.memo to heavy components
  - File: `frontend/src/features/students/components/StudentsView.tsx`
  - Wrap StudentCard, CourseGradeBreakdown
  - Effort: 3 hours
  - Impact: 60-70% faster rendering with 100+ students

---

## 📊 MEDIUM PRIORITY (Code Quality - Month 1-2)

### Frontend Improvements
- [ ] **Enable TypeScript strict mode**
  - File: `frontend/tsconfig.json`
  - Set `strict: true`, `noUnusedLocals: true`
  - Effort: 6 hours (fix resulting errors)
  - Impact: Catch 20-30 potential bugs

- [ ] **Extract service layer from routers** (Backend Architecture)
  - Create `backend/services/` directory
  - Move business logic from routers to services
  - Files: All `backend/routers/*.py`
  - Effort: 12 hours
  - Impact: Testable, reusable logic

- [ ] **Refactor complex components**
  - Break `StudentsView.tsx` (605 LOC) into smaller components
  - Extract: `StudentCard`, `CourseGradeBreakdown`, `AttendanceDetails`
  - Target: <200 LOC per component
  - Effort: 8 hours

- [ ] Add route-based code splitting
  - Use React lazy loading for page components
  - Effort: 4 hours
  - Impact: Smaller bundle size

- [ ] Add pre-commit hooks (ruff, prettier)
  - File: `.pre-commit-config.yaml` (new)
  - Auto-fix on commit
  - Effort: 1 hour

- [ ] Strip or guard production `console.log` usage during builds

### Backend Improvements
- [x] Introduce soft delete support (`deleted_at` semantics) ✅ COMPLETED
- [x] Enhanced error responses with stable error IDs ✅ COMPLETED

---

## 🧪 TESTING (Month 2)

### Test Coverage Expansion
- [ ] Add E2E tests with Playwright
  - Test critical user flows (create student, assign grade, etc.)
  - File: `tests/e2e/` (new directory)
  - Effort: 16 hours
  - Priority: HIGH

- [ ] Expand frontend unit tests
  - Current: ~25% coverage
  - Target: 70% coverage
  - Files: `frontend/src/**/__tests__/` (new)
  - Effort: 20 hours

- [ ] Add edge case tests
  - Boundary values, concurrent operations, transaction rollbacks
  - File: `backend/tests/test_edge_cases.py` (new)
  - Effort: 6 hours

- [x] Increase automated test coverage to 80%+ ✅ COMPLETED (backend)

---

## 📚 DOCUMENTATION (Month 2-3)

### Documentation Updates
- [ ] Consolidate scattered documentation
  - Current: 15+ markdown files
  - Create clear directory structure: `docs/user/`, `docs/deployment/`, `docs/development/`
  - Effort: 4 hours

- [ ] Create deployment runbook
  - Production checklist
  - Rollback procedures
  - Monitoring setup
  - Effort: 3 hours

- [ ] Add API documentation examples
  - Flesh out OpenAPI/README examples with request/response samples
  - Authentication guide
  - Error handling examples
  - Effort: 3 hours

- [ ] Add deployment architecture and sequence diagrams for critical workflows

---

## 🚀 DEPLOYMENT & DevOps (Month 3)

### CI/CD & Automation
- [ ] **Setup GitHub Actions CI/CD pipeline**
  - Run tests on PR
  - Build Docker image on tag
  - Upload coverage reports
  - File: `.github/workflows/ci.yml` (new)
  - Effort: 6 hours

- [ ] Add automated dependency scanning
  - Setup `pip-audit` in CI
  - Setup `npm audit` in CI
  - Effort: 2 hours

- [ ] Create production Docker Compose template
  - Add PostgreSQL service
  - Add health checks
  - Add resource limits
  - File: `docker-compose.prod.yml` (new)
  - Effort: 2 hours

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

### Frontend
- [x] Add React Error Boundary component ✅ EXISTS
- [x] React Query for data fetching ✅ IMPLEMENTED (TanStack Query)
- [x] Zustand for state management ✅ IMPLEMENTED
- [ ] Surface API version headers in the UI (low priority)
- [ ] Evaluate client-side caching for heavy read endpoints (pending backend caching decisions)

### Infrastructure
- [x] API Rate Limiting (slowapi) ✅ IMPLEMENTED
- [x] Alembic Database Migrations ✅ IMPLEMENTED
- [x] Request ID Tracking ✅ IMPLEMENTED
- [x] Comprehensive Health Checks ✅ IMPLEMENTED

---

## 🎯 QUICK WINS (High ROI, Low Effort)

Do these first for immediate impact:

1. ✅ **Enable TypeScript strict mode** (6h → catch 20-30 bugs)
2. ✅ **Add missing database indexes** (2h → +40% performance)
3. ✅ **Implement React.memo** (3h → +60% render performance)
4. ✅ **Add pre-commit hooks** (1h → auto-fix formatting)
5. ✅ **Add response caching** (4h → +70% API performance)

---

## 📈 PROGRESS TRACKING

### Phase 1: Critical Security Fixes (Weeks 1-2) - 23 hours
- [ ] 0/4 tasks completed
- Blockers: None
- ETA: 2-3 weeks part-time

### Phase 2: Performance Optimizations (Weeks 3-4) - 17 hours
- [ ] 0/4 tasks completed
- Blockers: Phase 1 completion
- ETA: 2-3 weeks part-time

### Phase 3: Code Quality (Month 2) - 51 hours
- [ ] 0/5 tasks completed
- Blockers: Phase 2 completion
- ETA: 6-7 weeks part-time

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
- ✅ Merged findings from IMPROVEMENT_ROADMAP.md and V2_MODERNIZATION_ROADMAP.md

### Deployment Status
- ✅ **Ready for internal/staging** (with SECRET_KEY changed)
- ⚠️ **Production deployment** recommended after Phase 1 + Phase 2 (4-6 weeks)
- 🎯 **Enterprise-grade** after all phases (3-4 months)

### Next Code Review
- [ ] Schedule next comprehensive review after Phase 3 completion (~3 months from now)
- [ ] Track technical debt reduction metrics
- [ ] Update improvement roadmap based on progress

---

**For detailed review findings, see:** Comprehensive Code Review Report (generated 2025-01-10)
**See also**: `docs/IMPROVEMENT_ROADMAP.md` for older completed milestones
