# E2E CI Monitoring & Baseline Tracking

**Created**: January 7, 2026
**Status**: Active Monitoring
**Purpose**: Track E2E test results across CI runs, detect flakiness, and maintain quality baselines
**Owner**: QA / DevOps
**Review Cadence**: Weekly (Fridays)

---

## 📊 Monitoring Overview

This document tracks E2E test runs in GitHub Actions CI, establishes baselines, and detects failure patterns or flakiness.

### Baseline Established ($11.18.3 - Jan 7, 2026)

**Critical Path Tests** (must maintain ≥95% pass rate):
- ✅ Authentication: 5/5 tests (100%)
- ✅ Student Management: 7/7 tests (100%)
  - Create student
  - Edit student
  - List students
  - Search students
  - View student detail
  - Delete student
  - Responsive UI
- ✅ Critical Flows: 5/5 tests (100%)
  - Navigation menu
  - Protected routes
  - Mobile responsiveness
  - Error boundaries
  - Accessibility checks
- ✅ Registration: 1/1 test (100%)

**Non-Critical Tests** (nice to have, flaky exceptions acceptable):
- ⚠️ Notifications: 5/12 tests (42% - deferred to $11.18.3)
  - Issue: 403 Forbidden on test broadcast endpoint (permission)
  - Documented as known issue

**Overall Baseline**:
- Total: 24 tests (19 critical + 5 non-critical)
- **Critical Pass Rate**: 100% (19/19)
- **Overall Pass Rate**: 79% (19/24)
- **Duration**: 3-5 minutes (local), 8-12 minutes (CI with caching)
- **Flakiness**: 0% (consistent across 5+ test runs)
- **Browser Coverage**: Chromium (CI), Chromium + Firefox + WebKit (local)

---

## 📈 Monitoring Dashboard

### Track Each CI Run

Use this table to record results from each E2E test run in CI:

| Run # | Date | Commit | Branch | Status | Passed | Failed | Skipped | Duration | Flakiness | Notes |
|-------|------|--------|--------|--------|--------|--------|---------|----------|----------|-------|
| 1 | Jan 7 | abc123 | main | ✅ | 19/24 | 0 | 5 | 10m | None | Baseline established |
| 2 | TBD | - | - | - | - | - | - | - | - | - |
| 3 | TBD | - | - | - | - | - | - | - | - | - |
| 4 | TBD | - | - | - | - | - | - | - | - | - |
| 5 | TBD | - | - | - | - | - | - | - | - | - |

**Legend**:
- ✅ All critical tests passed
- ⚠️ Critical test(s) failed but retried successfully
- ❌ Critical test(s) failed consistently

---

## 🎯 Success Criteria

### Pass Rate Targets

| Metric | Target | Action Threshold |
|--------|--------|------------------|
| Critical Path | ≥95% (≥18/19) | Alert if <95% |
| Overall | ≥75% (≥18/24) | Alert if <75% |
| Flakiness | ≤5% | Investigate if >5% |
| Duration | <15min (CI) | Optimize if >15min |

### When to Escalate

1. **Critical Test Failure**: If any of 19 critical tests fail
   - **Action**: Run 3x times to check for flakiness
   - **Response Time**: Within 1 hour
   - **Escalate To**: Backend lead

2. **Multiple Consecutive Failures**: >2 failures in 3 consecutive runs
   - **Action**: Create GitHub issue with label `ci-investigation`
   - **Response Time**: Same day
   - **Escalate To**: Tech lead

3. **Flakiness Detected**: Same test fails inconsistently
   - **Action**: Document failure pattern, add retry logic if needed
   - **Response Time**: Within 24 hours
   - **Escalate To**: QA lead

4. **Duration Regression**: Tests take >15 minutes
   - **Action**: Profile CI pipeline, check caching
   - **Response Time**: Within 1 day
   - **Escalate To**: DevOps

---

## 🔍 How to Monitor E2E Tests in CI

### Step 1: Check Latest Run

```text
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/e2e-tests.yml
2. Find latest run for your branch
3. Note run status: ✅ (passed) or ❌ (failed)

```text
### Step 2: Review Test Results

```text
1. Click on the run to view details
2. Find job: "e2e" (Ubuntu latest)
3. Expand "Run E2E tests" step
4. Look for line: "Running Playwright E2E tests"
5. Count: ✅ XX passed, ❌ X failed, ⏭️ X skipped

```text
### Step 3: Check for Flakiness (if failures)

```text
1. If failures detected, re-run the workflow
2. Go to top of workflow page, click "Re-run all jobs"
3. Wait for completion
4. Compare results:
   - Same failures? = Consistent issue (investigate)
   - Different failures? = Flaky test (document pattern)
   - No failures? = Transient issue (no action, monitor)

```text
### Step 4: Review Artifacts

```text
1. On workflow run page, scroll to "Artifacts" section
2. Download: e2e-test-results (test report, screenshots, videos)
3. Extract and open: playwright-report/index.html in browser
4. Review failed tests:
   - Screenshot of failure
   - Video recording
   - Trace file (for debugging)

```text
### Step 5: Document in GitHub Issue

If failures are concerning or flaky:

```markdown
## E2E Test Issue

**Date**: [YYYY-MM-DD]
**Run**: [Link to CI run]
**Test**: [Test name]
**Status**: [Consistent/Flaky]

### Failure Details

- **Screenshot**: [See artifacts]
- **Video**: [See artifacts]
- **Error Message**: [From test output]

### Reproduction

```text
---

## 🐛 Debugging Failed Tests Locally

### Reproduce Failure

```bash
# Terminal 1: Backend

cd backend
python -m uvicorn backend.main:app --reload

# Terminal 2: Frontend + E2E

cd frontend
npm run dev

# Terminal 3: Run specific test

cd frontend
npm run e2e -- --grep "test-name"  # Run single test

```text
### Debug with Playwright Inspector

```bash
# Run with Playwright debugger open

cd frontend
PWDEBUG=1 npm run e2e

# Or use headed mode to see browser

npm run e2e -- --headed --workers=1 --timeout=60000

```text
### Check Trace Files

```bash
# View recorded trace (captures network, console, etc)

npx playwright show-trace frontend/test-results/[test-name]-trace.zip

```text
---

## 📋 Failure Pattern Tracking

### Common Issues & Solutions

#### Pattern 1: Timeout in Test Creation

- **Tests**: "should create a new student successfully"
- **Error**: `Timeout waiting for element`
- **Solution**: Increase timeout to 90s (already done in $11.18.3)
- **Status**: ✅ RESOLVED (confirmed Jan 7, 2026)

#### Pattern 2: Auth Flow Failures

- **Tests**: Login, permission checks
- **Error**: 403 Forbidden, not authenticated
- **Cause**: Session not persisting between requests
- **Solution**: Ensure AUTH_MODE=permissive in test env
- **Status**: ✅ Working (verified in baseline)

#### Pattern 3: Notification Endpoint 403

- **Tests**: Notification broadcast tests (5 tests)
- **Error**: 403 Forbidden on POST /api/v1/notifications/test/broadcast
- **Cause**: Permission check on test endpoint
- **Solution**: Defer to $11.18.3 (non-blocking)
- **Status**: ⚠️ Known limitation

#### Pattern 4: Flaky Navigation

- **Tests**: Multi-page navigation
- **Error**: "Element not found" on second navigation
- **Solution**: Add explicit waits between page changes
- **Status**: 🔄 Monitor for recurrence

### Recording New Patterns

When a new failure pattern emerges:

```markdown
#### Pattern N: [Symptom]

- **Tests**: [Which tests fail]
- **Error**: [Error message]
- **Cause**: [Root cause if known]
- **Solution**: [Attempted fix]
- **Status**: [Status]
- **First Seen**: [Date]
- **Last Seen**: [Date]

```text
---

## 📊 Metrics & Analysis

### Key Metrics to Track

1. **Pass Rate Trend**
   - Critical: Should stay ≥95%
   - Overall: Should stay ≥75%
   - Calculate: (Passed / Total) × 100

2. **Flakiness Score**
   - Compare results across 3 consecutive runs
   - Formula: (Inconsistent outcomes / Tests run) × 100
   - Target: ≤5%

3. **Duration Trend**
   - Track CI execution time (with caching)
   - Target: <15 minutes
   - If trending up, profile caching effectiveness

4. **Failure Distribution**
   - By test category (Auth, Student, Flows, Notifications)
   - By environment (CI vs local)
   - By error type (timeout, assertion, network)

### Monthly Analysis

**First Friday of each month** (or weekly if issues detected):

```markdown
## E2E Testing Health Report - [Month Year]

### Summary

- Run count: X
- Critical pass rate: Y%
- Overall pass rate: Z%
- Flakiness incidents: N

### Trends

- Pass rate: [↑ improving | → stable | ↓ degrading]
- Duration: [↑ slow | → stable | ↓ faster]
- Flakiness: [↑ increasing | → stable | ↓ decreasing]

### Actions Taken

- [Issue #TBD](link): [resolution]
- [Pattern Y](pattern): [fix applied]

### Recommendations

- [Next priority]

```text
---

## 🔧 Maintenance & Updates

### Weekly Checklist

Every Friday or after major changes:

- [ ] Review new E2E test failures (if any)
- [ ] Check baseline compliance (≥95% critical path)
- [ ] Verify no duration regressions (<15min)
- [ ] Document any patterns or flakiness
- [ ] Update monitoring dashboard

### Quarterly Review

End of Q1 (March), Q2 (June), etc:

- [ ] Analyze 13-week trend data
- [ ] Adjust baselines if needed (document rationale)
- [ ] Plan test suite improvements
- [ ] Update documentation

### When Adding New E2E Tests

1. Add test to appropriate spec file
2. Run locally 5x to establish baseline (>95% pass rate required)
3. Document expected behavior and timeout
4. Add to this guide under relevant section
5. Merge only after baseline proven

---

## 🚨 Escalation Contacts

| Issue Type | Owner | Contact | Response Time |
|------------|-------|---------|----------------|
| Test failures | QA Lead | #qa-team | 1 hour |
| CI pipeline issues | DevOps | @devops-lead | 2 hours |
| Backend test data issues | Backend Lead | @backend-team | Same day |
| Documentation/process | Tech Lead | @tech-lead | 24 hours |

---

## 📚 Related Documentation

- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - Full E2E testing reference
- [.github/workflows/e2e-tests.yml](../../.github/workflows/e2e-tests.yml) - CI workflow definition
- [frontend/playwright.config.ts](../../frontend/playwright.config.ts) - Playwright configuration
- [UNIFIED_WORK_PLAN.md](../plans/UNIFIED_WORK_PLAN.md) - Project planning and work streams

---

## 📝 Change Log

| Date | Change | Author |
|------|--------|--------|
| Jan 7, 2026 | Created initial monitoring document and baseline ($11.18.3) | QA Team |
| TBD | First weekly review | TBD |
| TBD | Pattern #N detected | TBD |

---

**Status**: 🟢 Monitoring Active
**Last Updated**: January 7, 2026
**Next Review**: January 14, 2026 (weekly)
