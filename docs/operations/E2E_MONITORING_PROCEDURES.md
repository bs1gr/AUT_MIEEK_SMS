# E2E Test CI Monitoring - Procedures Guide

**Date**: January 7, 2026
**Purpose**: Step-by-step procedures for monitoring E2E tests in GitHub Actions CI
**Audience**: QA Engineers, DevOps, Release Managers

---

## 📋 Weekly Monitoring Checklist

**Frequency**: Every Friday (or after significant code changes)
**Time Required**: 15-20 minutes
**Owner**: QA Lead

### Pre-Check: Last 7 Days of Runs

```text
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/e2e-tests.yml

2. Review runs for the past 7 days:
   ✅ All passed?      → No action needed
   ⚠️  Some failed?    → Review failures (see "Failure Investigation" below)
   ❌ Multiple failed? → Escalate immediately

3. Look for patterns:
   - Same test failing repeatedly? → Consistent issue (document)
   - Different tests each time? → Flaky tests (investigate)
   - Failures after specific change? → Regression (revert and re-test)

```text
### Check: Baseline Compliance

```text
Expected Baseline ($11.18.3):
- Critical tests: 19 passing (100%)
- Overall tests: 19/24 passing (79%)
- Flakiness: 0% (no inconsistent failures)

Current Status:
- [ ] Critical ≥95% (≥18/19)?
- [ ] Overall ≥75% (≥18/24)?
- [ ] No new flaky tests?
- [ ] Duration <15 minutes?

If any NO: Investigate (see below)

```text
### Check: Performance Trend

```text
1. Compare to previous week:
   - Duration: Faster ↑ | Same → | Slower ↓
   - Pass rate: Better ↑ | Same → | Worse ↓

2. If duration increased >20%:
   - Check CI caching status
   - Review for new heavy tests
   - Profile test execution time

3. If pass rate decreased <95%:
   - Run failure investigation (see below)

```text
---

## 🔍 Failure Investigation Procedure

**When to Trigger**: Any test failure or ≥1 test failing

### Step 1: Identify the Failure

```bash
# Go to failed workflow run

https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/e2e-tests.yml

# Click the failed run

# Expand "e2e" job
# Find "Run E2E tests" step

# Look for failure output:

# Example:

# ❌ [Student] → should create a new student successfully
#    Timeout waiting for selector: #student-form-name

```text
### Step 2: Classify the Failure

**Is it consistent?** (Fails in same place every time)

```bash
# Re-run workflow 3 times

# Click "Re-run all jobs" button (top of run page)

# After 3 runs, if all fail in same place:

# Classification: CONSISTENT (reproducible issue)
# → Skip to Step 4: Fix the Issue

```text
**Is it flaky?** (Fails differently or intermittently)

```bash
# Run 5 times total

# If failures pattern:

# Run 1: Test A fails
# Run 2: Test B fails

# Run 3: All pass
# Run 4: Test A fails again

# Classification: FLAKY (intermittent issue)

# → Skip to Step 5: Investigate Flakiness

```text
### Step 3: Review Test Artifacts

```text
1. On workflow page, scroll to "Artifacts" section

2. Download: e2e-test-results
   - Contains: playwright-report/, test-results/, screenshots/, videos/

3. Extract and open:
   - Firefox > open playwright-report/index.html
   - Review failed test visually
   - Check screenshot of failure
   - Watch video of failure
   - Review trace file (for network/console)

4. Document findings:
   [ ] Screenshot shows what happened
   [ ] Video confirms test behavior
   [ ] Error message in test-results/ JSONs
   [ ] Any relevant console errors or network failures

```text
### Step 4: Fix Consistent Issues

**Backend Issues** (500 errors, timeouts):

```bash
# Reproduce locally

cd backend
python -m uvicorn backend.main:app --reload

# In another terminal, run failing test

cd frontend
PWDEBUG=1 npm run e2e -- --grep "test-name" --headed

# Debug with Playwright Inspector

# Check: API response, data in database, backend logs

# Once fixed:

# 1. Commit fix to feature branch
# 2. Push to trigger CI

# 3. Verify test passes 3 consecutive times
# 4. Create GitHub issue documenting fix

```text
**Frontend Issues** (selector failures, logic errors):

```bash
# Reproduce locally (same as above)

# Debug in browser DevTools:
# 1. Playwright Inspector shows failed selector

# 2. Copy selector to browser console to test
# 3. Adjust selector or add explicit waits

# 4. Update test file

# Once fixed:

# 1. Run locally 5x to ensure stable
# 2. Push to CI

# 3. Verify passes 3 consecutive times

```text
### Step 5: Investigate Flakiness

```bash
# Flaky tests need special handling

# Step 5a: Increase Test Timeout

# File: frontend/playwright.config.ts
timeout: 60000,  # Increase to 90000 if timing out

# Step 5b: Add Explicit Waits

# File: frontend/tests/helpers.ts
# Add: await page.waitForLoadState('networkidle')

#      await page.waitForSelector(selector, { timeout: 30000 })

# Step 5c: Reduce Parallelism

# File: frontend/playwright.config.ts
workers: 1,  # Reduce from 4 to 1 if race conditions

# Step 5d: Run Trace on Failure

# File: frontend/playwright.config.ts
trace: 'on-first-retry',  # Captures trace for first failure

# After changes:

# 1. Run locally 10x
# 2. If ≥95% pass rate: merge

# 3. Monitor in CI for 2 more weeks
# 4. Document pattern in E2E_CI_MONITORING.md

```text
---

## 🚀 Automated Failure Detection

### CI Workflow Integration

The E2E workflow automatically:

1. **Runs Tests**: Executes 24 tests (19 critical + 5 non-critical)
2. **Collects Metrics**: Extracts pass/fail counts, duration
3. **Saves Results**: Stores in `artifacts/e2e-test-results`
4. **Reports Status**: Posts to PR with pass/fail summary
5. **Archives Artifacts**: Stores for 30 days (screenshots, videos, traces)

### Manual Metrics Analysis

```bash
# Analyze test trends from last 5 runs

python scripts/e2e_metrics_collector.py \
  frontend/playwright-report/report.json \
  ${{ github.run_id }} \
  main \
  ${{ github.sha }} \
  600

# Output: Pass rates, trends, alerts for <95% critical

```text
---

## ⚠️ Alert Triggers

### Red Alert: Immediate Escalation

**Trigger**: ❌ Critical test failing consistently

```text
Actions:
1. Immediately comment on PR: "E2E tests failing - urgent review"
2. Slack notification to QA lead and Backend lead
3. Block PR merge
4. Start failure investigation (Step 4 above)
5. Expected fix time: <1 hour

```text
**Trigger**: ❌ Multiple consecutive runs (≥2/3) with failures

```text
Actions:
1. Create GitHub issue: "[URGENT] E2E Test Regression"
2. Add label: ci-investigation, bug, regression
3. Assign to QA lead
4. Block main branch commits
5. Expected investigation time: <2 hours

```text
### Orange Alert: Review Required

**Trigger**: ⚠️ Flaky test (inconsistent failures)

```text
Actions:
1. Create GitHub issue: "[Flaky] E2E Test: [test-name]"
2. Add label: flaky-test, needs-investigation
3. Document failure pattern
4. Assign to QA lead
5. Plan fix for next sprint
6. Expected fix time: <1 week

```text
**Trigger**: ⚠️ CI duration increased >20%

```text
Actions:
1. Review recent changes to test files
2. Check caching effectiveness
3. Consider test optimization
4. Document baseline adjustment if needed
5. Expected investigation: <1 day

```text
### Green: Monitoring

**Status**: ✅ All baseline criteria met

```text
Actions:
1. Continue regular monitoring
2. Document baseline metrics
3. Review weekly
4. No escalation needed

```text
---

## 📊 Metrics Dashboard

### Where to View Metrics

**Option 1: GitHub Actions**

```text
https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/e2e-tests.yml
→ Click latest run → Scroll to "Test Results" section

```text
**Option 2: Artifacts**

```text
https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/e2e-tests.yml
→ Click latest run → "Artifacts" section
→ Download e2e-test-results
→ Open artifacts/run_summary.json

```text
**Option 3: Local Analysis**

```bash
# Extract and analyze historical metrics

cd artifacts/e2e-metrics
cat history.jsonl | tail -5 | jq '.[] | {timestamp, critical_pass_rate, overall_pass_rate}'

```text
### Reading the Metrics

```json
{
  "timestamp": "2026-01-07T15:30:00Z",
  "run_id": "123456789",
  "branch": "main",
  "commit": "abc123def456",
  "passed": 19,
  "failed": 0,
  "skipped": 5,
  "total": 24,
  "duration_seconds": 600,
  "critical_pass_rate": 100.0,
  "overall_pass_rate": 79.2,
  "status": "passed"
}

```text
**Interpretation**:
- `critical_pass_rate`: Must be ≥95% (target: 100%)
- `overall_pass_rate`: Can be 75-100% (target: ≥75%)
- `duration_seconds`: Should be <900s (15 min)
- `status`: "passed" if no failures, "failed" if any failed

---

## 📞 Escalation Path

### Escalation Decision Tree

```text
Is critical test failing?
├─ YES → Critical failure (RED ALERT)
│        Contact: QA Lead (@qa-team) + Backend Lead (@backend-team)
│        Response time: <1 hour
│        Action: Immediate investigation & fix
│
└─ NO → Is flakiness detected?
         ├─ YES → Flaky test (ORANGE ALERT)
         │        Contact: QA Lead (@qa-team)
         │        Response time: <24 hours
         │        Action: Investigate & plan fix
         │
         └─ NO → All checks passed (GREEN)
                  Action: Continue monitoring
                  Next check: Friday EOD

```text
### Contact Information

| Role | Channel | Response Time | Availability |
|------|---------|----------------|--------------|
| QA Lead | Slack #qa-team | 1 hour | 09:00-17:00 |
| Backend Lead | Slack #backend-dev | 1 hour | 09:00-17:00 |
| DevOps | Slack #devops | 2 hours | 09:00-17:00 |
| On-Call (after-hours) | GitHub issue @oncall | On-demand | 24/7 |

---

## 📋 Example: End-to-End Monitoring Session

### Scenario: Test Fails on Friday Morning

**09:00 - Failure Detected**

```text
1. Receive GitHub notification: "E2E tests failed"
2. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/e2e-tests.yml
3. Latest run shows: ❌ Failed
   - Test: "should create a new student successfully"
   - Error: "Timeout waiting for selector"

```text
**09:05 - Classify Failure**

```text
1. Re-run workflow 3 times
2. All 3 runs fail on same test
3. Classification: CONSISTENT (reproducible)

```text
**09:20 - Review Artifacts**

```text
1. Download e2e-test-results from failed run
2. Open playwright-report/index.html
3. Review screenshot: Form not loading
4. Check video: Backend returned 500 error

```text
**09:30 - Reproduce Locally**

```text
1. Start backend: cd backend && python -m uvicorn backend.main:app --reload
2. Start E2E with debugger: PWDEBUG=1 npm run e2e -- --grep "should create" --headed
3. Inspect: Backend throwing exception in logs

```text
**09:45 - Fix Issue**

```text
1. Check backend logs: Database constraint error
2. Fix: Add migration for missing column
3. Run migration: alembic upgrade head
4. Re-run local test: ✅ Passes
5. Run 5 times: ✅ All pass

```text
**10:00 - Commit & CI Validation**

```text
1. Commit: "Fix: Add missing database column for student form"
2. Push to feature branch
3. CI runs automatically
4. Check E2E test result: ✅ Passed
5. Re-run CI 2 more times: ✅ All pass

```text
**10:30 - Document & Close**

```text
1. Create GitHub issue: "[RESOLVED] E2E Test Failure - Jan 7"
2. Document: Root cause, fix, test results
3. Merge PR
4. Update baseline in E2E_CI_MONITORING.md
5. Report in Slack: "E2E tests restored, issue resolved"

```text
---

## 🔧 Troubleshooting Common Monitoring Issues

### Problem: Can't Find Test Artifacts

```text
Solution:
1. Check if run completed (look for checkmark icon)
2. Scroll down to "Artifacts" section
3. If not visible: Run may have failed before artifact upload
4. Review logs for upload errors
5. Check retention policy (30 days default)

```text
### Problem: Metrics Not Being Collected

```text
Solution:
1. Check if metrics script runs:
   grep -A 5 "e2e_metrics_collector" .github/workflows/e2e-tests.yml
2. If missing, add step to workflow (see workflow enhancement section)
3. Run manually: python scripts/e2e_metrics_collector.py <report.json>
4. Verify artifacts/e2e-metrics/ directory exists

```text
### Problem: False Alerts (Tests Pass But Show Failed)

```text
Solution:
1. Check CI workflow continue-on-error flag
2. Verify test result extraction logic
3. Run manual metrics check:
   python scripts/e2e_metrics_collector.py frontend/playwright-report/report.json
4. Compare extracted metrics with actual test counts
5. Adjust extraction regex if needed

```text
---

## 📚 Related Documentation

- [E2E_CI_MONITORING.md](./E2E_CI_MONITORING.md) - Dashboard and baseline tracking
- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - Complete test reference
- [.github/workflows/e2e-tests.yml](../../.github/workflows/e2e-tests.yml) - CI workflow
- [scripts/e2e_metrics_collector.py](../../scripts/e2e_metrics_collector.py) - Metrics collection script

---

**Status**: 🟢 Active Monitoring
**Last Updated**: January 7, 2026
**Next Review**: January 14, 2026 (weekly)
**Owner**: QA Team
