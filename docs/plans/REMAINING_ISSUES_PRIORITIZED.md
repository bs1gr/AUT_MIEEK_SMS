# Remaining Issues - Prioritized Action Plan

> ⚠️ **SUPERSEDED**: This document has been consolidated into [UNIFIED_WORK_PLAN.md](UNIFIED_WORK_PLAN.md)
> **Use the unified plan** for current priorities and timeline. This file is kept for historical reference.

**Created**: January 6, 2026
**Status**: ⚠️ Archived - See UNIFIED_WORK_PLAN.md
**Context**: All Phase 1 improvements complete, prioritizing next actions

---

## 📊 Executive Summary

With Phase 1 complete (all 8 improvements delivered), we now focus on consolidation, monitoring, and Phase 2 preparation.

**Current State**:
- ✅ 1.15.0 released (January 5, 2026)
- ✅ 316/316 backend tests passing
- ✅ 1189/1189 frontend tests passing
- ✅ 30+ E2E tests implemented
- ✅ All Phase 1 features delivered

**Immediate Priorities**:
1. **E2E Test Monitoring** (CI stability)
2. **Coverage Reporting** (quality metrics)
3. **Phase 2 Kickoff** (RBAC implementation)

---

## 🔴 CRITICAL Priority (Week 1)

### Issue #1: E2E Test CI Monitoring
**Status**: ⚠️ Tests improved locally, need CI validation
**Impact**: HIGH - Blocks CI pipeline confidence
**Effort**: 2-4 hours
**Owner**: DevOps/QA

**Problem**:
- E2E tests improved locally with authentication fixes
- Not yet validated in GitHub Actions CI environment
- May have timing/environment differences

**Action Items**:
1. ✅ **Already Done**: Authentication fix (loginViaAPI now sets user object)
2. ✅ **Already Done**: Test robustness improvements (waitForResponse, fallback selectors)
3. ⏳ **TODO**: Monitor CI execution for 5+ runs
4. ⏳ **TODO**: Adjust timeouts if CI is slower than local
5. ⏳ **TODO**: Document final working CI configuration

**Success Criteria**:
- [ ] E2E tests pass in CI with 95%+ success rate over 10 runs
- [ ] No timeout issues in GitHub Actions
- [ ] Screenshots/videos captured on failure
- [ ] Test results posted to PR comments

**Files Involved**:
- `.github/workflows/e2e-tests.yml`
- `frontend/tests/e2e/*.spec.ts`

**Timeline**: Complete by January 10, 2026

---

### Issue #2: GitHub Release Creation
**Status**: 🆕 Draft prepared, needs publication
**Impact**: HIGH - Official release communication
**Effort**: 15 minutes
**Owner**: Project Lead

**Action Items**:
1. ✅ **Already Done**: Release notes created (`docs/releases/RELEASE_NOTES_v1.15.2.md`)
2. ✅ **Already Done**: GitHub release draft prepared (`docs/releases/GITHUB_RELEASE_v1.15.2.md`)
3. ⏳ **TODO**: Create GitHub Release at https://github.com/bs1gr/AUT_MIEEK_SMS/releases/new
4. ⏳ **TODO**: Tag as 1.15.0 (targeting main branch)
5. ⏳ **TODO**: Mark as "Latest release"

**Success Criteria**:
- [ ] GitHub Release published and visible
- [ ] Tag 1.15.0 created
- [ ] Release notes formatted correctly
- [ ] Marked as latest release

**Timeline**: Complete by January 7, 2026

---

## 🟠 HIGH Priority (Week 1-2)

### Issue #3: Coverage Reporting Setup
**Status**: 🆕 Not implemented
**Impact**: MEDIUM - Quality visibility
**Effort**: 1-2 hours
**Owner**: DevOps

**Problem**:
- Tests run locally and in CI
- No coverage metrics tracked or reported
- Can't measure test quality improvement

**Action Items**:
1. Add pytest-cov to backend tests (GitHub Actions)
2. Add Vitest coverage to frontend tests (GitHub Actions)
3. Integrate with Codecov or Coveralls
4. Set minimum thresholds (75% backend, 70% frontend)
5. Add coverage badge to README.md

**Implementation**:

**Backend** (`.github/workflows/backend-tests.yml`):
```yaml
- name: Run Tests with Coverage
  run: |
    cd backend
    pytest --cov=backend --cov-report=xml --cov-report=term-missing

- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/coverage.xml
    flags: backend
    fail_ci_if_error: true
```

**Frontend** (`.github/workflows/frontend-tests.yml`):
```yaml
- name: Run Tests with Coverage
  run: |
    cd frontend
    npm run test:coverage

- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./frontend/coverage/coverage-final.json
    flags: frontend
```

**Success Criteria**:
- [ ] Coverage collected in every CI run
- [ ] Coverage reported to Codecov/Coveralls
- [ ] Coverage badge in README
- [ ] Minimum thresholds enforced

**Timeline**: Complete by January 13, 2026

---

### Issue #4: Phase 2 GitHub Issues Creation
**Status**: 🆕 Plan ready, issues not created
**Impact**: MEDIUM - Team coordination
**Effort**: 1 hour
**Owner**: Project Lead

**Problem**:
- Phase 2 plan consolidated and documented
- No GitHub issues for tracking
- Team needs trackable work items

**Action Items**:
1. Create GitHub issues for Phase 2 work (#68-#80 estimated)
2. Label with `phase-2`, `enhancement`, priority labels
3. Assign to milestones (1.15.0)
4. Link to Phase 2 plan document

**Issues to Create**:

**RBAC Implementation** (6 issues):
- #68: Design permission matrix and documentation
- #69: Database schema changes (permissions, roles_permissions)
- #70: Backend permission check utilities
- #71: Refactor endpoints to use permissions
- #72: Permission management API endpoints
- #73: Frontend permission management UI (optional)

**CI/CD Improvements** (4 issues):
- #74: E2E test CI monitoring and optimization
- #75: Coverage reporting integration
- #76: CI cache optimization (Docker, NPM, pip)
- #77: Load testing CI integration

**Documentation** (2 issues):
- #78: Admin guides for permission management
- #79: Testing documentation consolidation

**Release** (1 issue):
- #80: 1.16.0 Release preparation

**Success Criteria**:
- [ ] 12+ GitHub issues created
- [ ] All issues labeled and assigned to milestone
- [ ] Issues linked to Phase 2 plan
- [ ] Ready for sprint planning

**Timeline**: Complete by January 8, 2026

---

## 🟡 MEDIUM Priority (Week 2-3)

### Issue #5: E2E Testing Documentation
**Status**: ⚠️ Partially complete
**Impact**: MEDIUM - Developer onboarding
**Effort**: 1 hour
**Owner**: QA/Documentation

**Current State**:
- ✅ E2E_TESTING_GUIDE.md exists (comprehensive)
- ✅ Authentication fix documented
- ⚠️ Missing: Common troubleshooting scenarios

**Action Items**:
1. Add "Common Issues" section to E2E_TESTING_GUIDE.md
2. Document CI-specific differences (timeouts, environment)
3. Add debugging tips (browser DevTools, Playwright Inspector)
4. Create quick reference for running tests locally

**Success Criteria**:
- [ ] Complete troubleshooting section added
- [ ] CI-specific guidance documented
- [ ] Debugging workflows included
- [ ] Quick reference created

**Timeline**: Complete by January 15, 2026

---

### Issue #6: Load Testing Integration
**Status**: 🆕 Not implemented
**Impact**: MEDIUM - Performance regression detection
**Effort**: 2-3 hours
**Owner**: Backend Developer

**Problem**:
- No automated load testing
- Can't detect performance regressions
- No baseline for comparison

**Action Items**:
1. Set up Locust or k6 for load testing
2. Create test scenarios (student list, grade calc, attendance)
3. Establish performance baselines (from 1.15.0 optimizations)
4. Integrate into GitHub Actions (weekly or on-demand)
5. Set up regression alerts

**Test Scenarios**:
- Student list: 100 concurrent users, 1000 students
- Grade calculation: 50 concurrent users, 500 grades
- Attendance marking: 30 concurrent users, 200 records
- Login flow: 100 concurrent users

**Performance Baselines** (p95):
- Student list: <100ms
- Grade calculation: <200ms
- Attendance: <80ms
- Login: <500ms

**Success Criteria**:
- [ ] Load tests running locally
- [ ] Integrated into CI (weekly)
- [ ] Baselines documented
- [ ] Regression alerts configured

**Timeline**: Complete by January 20, 2026

---

## 🔵 LOW Priority (Week 3-4)

### Issue #7: GitHub Actions Caching Optimization
**Status**: ⚠️ Basic caching exists
**Impact**: LOW - CI execution time
**Effort**: 2 hours
**Owner**: DevOps

**Problem**:
- CI execution takes ~15 minutes
- Not using optimal caching strategies
- Could be reduced to ~10 minutes

**Action Items**:
1. Optimize Docker layer caching (type=gha)
2. Improve NPM package caching
3. Add pip dependency caching
4. Cache Playwright browsers

**Expected Improvement**: 30% faster CI (15 min → 10 min)

**Success Criteria**:
- [ ] Docker cache hit rate >80%
- [ ] NPM cache hit rate >90%
- [ ] CI execution time reduced by 30%
- [ ] No cache invalidation issues

**Timeline**: Complete by January 22, 2026

---

### Issue #8: Installer Validation Testing
**Status**: ✅ Mostly complete (from 1.15.0)
**Impact**: LOW - Already working
**Effort**: 1 hour
**Owner**: QA

**Current State**:
- ✅ Shortcut persistence fixed
- ✅ Uninstaller naming fixed (unins{version}.exe)
- ✅ Docker integration improved
- ✅ VBS → BAT conversion complete

**Action Items**:
1. Test installer on clean Windows 10 environment
2. Test installer on clean Windows 11 environment
3. Verify all shortcuts work correctly
4. Test uninstaller functionality
5. Document validation results

**Success Criteria**:
- [ ] Tested on 2+ Windows environments
- [ ] No issues found
- [ ] Validation report created

**Timeline**: Complete by January 24, 2026

---

## 📋 Issue Summary by Priority

| Priority | Issue | Impact | Effort | Timeline |
|----------|-------|--------|--------|----------|
| 🔴 CRITICAL | #1 E2E Test CI Monitoring | HIGH | 2-4h | Jan 10 |
| 🔴 CRITICAL | #2 GitHub Release Creation | HIGH | 15m | Jan 7 |
| 🟠 HIGH | #3 Coverage Reporting Setup | MEDIUM | 1-2h | Jan 13 |
| 🟠 HIGH | #4 Phase 2 Issues Creation | MEDIUM | 1h | Jan 8 |
| 🟡 MEDIUM | #5 E2E Documentation | MEDIUM | 1h | Jan 15 |
| 🟡 MEDIUM | #6 Load Testing Integration | MEDIUM | 2-3h | Jan 20 |
| 🔵 LOW | #7 CI Caching Optimization | LOW | 2h | Jan 22 |
| 🔵 LOW | #8 Installer Validation | LOW | 1h | Jan 24 |

**Total Effort**: ~12 hours over 3 weeks

---

## 🎯 Recommended Work Order

### Week 1 (Jan 6-12)
1. **Day 1**: Create GitHub Release (#2) - 15 minutes
2. **Day 1**: Create Phase 2 GitHub Issues (#4) - 1 hour
3. **Day 2-3**: Monitor E2E tests in CI (#1) - 2-4 hours
4. **Day 4-5**: Set up coverage reporting (#3) - 1-2 hours

### Week 2 (Jan 13-19)
1. **Day 1-2**: Complete E2E documentation (#5) - 1 hour
2. **Day 3-5**: Load testing integration (#6) - 2-3 hours

### Week 3 (Jan 20-26)
1. **Day 1-2**: CI caching optimization (#7) - 2 hours
2. **Day 3**: Installer validation (#8) - 1 hour
3. **Day 4-5**: Phase 2 Sprint 1 kickoff

---

## 🚀 Next Actions (Immediate)

**For Project Lead**:
1. Create GitHub Release for 1.15.0 (15 minutes)
2. Create Phase 2 GitHub Issues (1 hour)
3. Schedule Phase 2 kickoff meeting

**For DevOps**:
1. Monitor E2E tests in CI for next 5 runs
2. Set up coverage reporting (Codecov integration)
3. Document CI configuration

**For QA**:
1. Review E2E test results in CI
2. Complete E2E testing documentation
3. Plan load testing scenarios

**For Backend Team**:
1. Review Phase 2 RBAC plan
2. Start permission matrix design
3. Prepare for Sprint 1 kickoff

---

## 📊 Success Metrics

### Week 1 Completion
- [ ] GitHub Release published
- [ ] Phase 2 issues created (12+ issues)
- [ ] E2E tests passing in CI (95%+ success)
- [ ] Coverage reporting enabled

### Week 2 Completion
- [ ] E2E documentation complete
- [ ] Load testing running locally
- [ ] Phase 2 Sprint 1 planned

### Week 3 Completion
- [ ] CI optimized (30% faster)
- [ ] Installer validated on 2+ environments
- [ ] Ready for Phase 2 Sprint 1

---

**Last Updated**: January 6, 2026
**Next Review**: After Week 1 completion (January 12, 2026)
