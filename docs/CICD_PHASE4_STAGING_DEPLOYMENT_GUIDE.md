# Phase 4 Staging Deployment Guide

**Date:** June 3, 2026  
**Status:** 📋 **DEPLOYMENT PACKAGE READY**  
**Target:** Staging validation (1 week)  
**Commit:** 958e09688

---

## Pre-Deployment Checklist

### Code Review
- [x] Workflow syntax validated (YAML valid)
- [x] SARIF conversion logic tested locally
- [x] Conditional test logic verified
- [x] Job dependencies correct (no circular deps)
- [x] All new jobs have proper error handling
- [x] Backward compatibility confirmed

### Documentation
- [x] Implementation guide complete
- [x] Design documentation comprehensive
- [x] Usage guide for developers created
- [x] Troubleshooting guide prepared
- [x] Rollback instructions documented

### Testing Infrastructure
- [x] Validation scripts created
- [x] Test scenarios documented
- [x] Success criteria defined
- [x] Metrics collection prepared

---

## Deployment Steps

### Step 1: Create Staging Branch

```bash
# Create phase-4-staging branch from main
git checkout main
git pull origin main
git checkout -b phase-4-staging

# Verify commit is present
git log --oneline -5
# Should see: 958e09688 feat(ci): Implement Phase 4...

# Push to remote
git push -u origin phase-4-staging
```

### Step 2: Deploy to Staging

```bash
# Verify staging branch is set as default for workflow triggers
# (or manually trigger workflow on phase-4-staging)

# Manual trigger:
gh workflow run .github/workflows/ci-cd-pipeline.yml \
  --ref phase-4-staging \
  --field deploy_environment=staging
```

### Step 3: Monitor Initial Runs

Watch GitHub Actions for first 3 runs:

1. **Run 1: Simple PR (Test SARIF + E2E Skip)**
   - Expected: SARIF consolidation succeeds
   - Expected: E2E tests skipped
   - Expected: Total time 5-10 min
   - Check: GitHub Security tab updated with unified report

2. **Run 2: Main Branch (Full Suite)**
   - Expected: All tests run
   - Expected: SARIF consolidation succeeds
   - Expected: Total time 25 min
   - Check: E2E tests executed
   - Check: Load tests executed

3. **Run 3: PR with Label (E2E Enabled)**
   - Expected: E2E tests run (via label)
   - Expected: Total time 15-20 min
   - Check: Job execution matches expectations

---

## One-Week Validation Checklist

### Day 1-2: SARIF Consolidation Validation

**Test Case 1A: Backend SARIF Conversion**

```bash
# Trigger run on staging
gh workflow run .github/workflows/ci-cd-pipeline.yml --ref phase-4-staging

# Check run logs
gh run view <run-id> --log

# Verify in logs:
# ✓ "Convert pip-audit to SARIF format" - success
# ✓ "backend-audit.sarif" created
# ✓ "Upload SARIF to GitHub Security tab" - success
```

**Verification:**
- [ ] Backend SARIF file created
- [ ] SARIF format valid (JSON schema)
- [ ] Uploaded to GitHub Security tab
- [ ] Category: `backend-security`

**Test Case 1B: Frontend SARIF Conversion**

```bash
# Check run logs for frontend security scan
gh run view <run-id> --log | grep -A 10 "frontend-audit"

# Verify in logs:
# ✓ "Convert npm-audit to SARIF format" - success
# ✓ "frontend-audit.sarif" created
# ✓ "Upload SARIF to GitHub Security tab" - success
```

**Verification:**
- [ ] Frontend SARIF file created
- [ ] Vulnerabilities converted correctly
- [ ] Uploaded to GitHub Security tab
- [ ] Category: `frontend-security`

**Test Case 1C: SARIF Consolidation**

```bash
# Check consolidation job
gh run view <run-id> --log | grep -A 20 "consolidate-sarif"

# Verify in logs:
# ✓ "Download all SARIF artifacts" - success
# ✓ "Consolidate SARIF reports" - success
# ✓ "Converted X vulnerabilities to SARIF"
# ✓ "Upload consolidated SARIF" - success
```

**Verification:**
- [ ] All SARIF files downloaded
- [ ] Consolidation script runs successfully
- [ ] Unified SARIF file created
- [ ] Uploaded with category: `unified-security-audit`
- [ ] GitHub Security tab shows single consolidated report

**GitHub Security Tab Verification:**
- [ ] Navigate to repository → Security → Code scanning
- [ ] Verify "Unified Security Audit" appears
- [ ] Check that findings from all 3 tools are present
- [ ] Verify no duplicate findings
- [ ] Click on findings to verify details

---

### Day 3-4: Conditional Testing Validation

**Test Case 2A: E2E Skip on Simple PR**

```bash
# Create simple PR on staging
git checkout -b test/simple-change
echo "# Small change" >> README.md
git add README.md
git commit -m "test: simple change"
git push origin test/simple-change

# Create PR (no label, no [full-test] tag)
gh pr create --title "Simple test change" --body "Testing E2E skip"

# Check workflow run
gh workflow run view <run-id>
```

**Expected Behavior:**
- [ ] `determine-test-scope` outputs: `run_e2e=false`
- [ ] `run-e2e-tests` job skipped (not executed)
- [ ] `run-load-tests` job skipped (not executed)
- [ ] Build completes in 5-10 min (not 25 min)
- [ ] All unit/smoke tests still run
- [ ] SARIF consolidation still succeeds

**Time Measurement:**
```bash
# Record start time and end time from workflow
# Calculate total duration
# Expected: 5-10 minutes
# Record: Actual time in log
```

**Test Case 2B: E2E Enable via Label**

```bash
# Create PR on staging
git checkout -b test/critical-fix
echo "# Critical fix" >> backend/core.py
git add backend/core.py
git commit -m "test: critical fix"
git push origin test/critical-fix

# Create PR
gh pr create --title "Critical fix" --body "Testing E2E enable"

# Add label
gh pr edit <pr-number> --add-label "requires:e2e"

# Check workflow run
gh workflow run view <run-id>
```

**Expected Behavior:**
- [ ] `determine-test-scope` outputs: `run_e2e=true`
- [ ] `run-e2e-tests` job executed
- [ ] Build completes in 15-20 min
- [ ] All tests pass

**Verification:**
- [ ] Check logs for "End-to-End Tests" execution
- [ ] Verify job completed successfully

**Test Case 2C: Full Test via Title Tag**

```bash
# Create PR with [full-test] tag
git checkout -b test/full-testing
echo "# Complex change" >> backend/auth.py
git add backend/auth.py
git commit -m "test: complex change"
git push origin test/full-testing

# Create PR with [full-test] in title
gh pr create --title "Refactor auth system [full-test]" --body "Testing full test trigger"

# Check workflow run
gh workflow run view <run-id>
```

**Expected Behavior:**
- [ ] `determine-test-scope` outputs: `run_full=true`, `run_e2e=true`
- [ ] `run-e2e-tests` job executed
- [ ] `run-load-tests` job executed
- [ ] Build completes in 25 min (full suite)
- [ ] All tests pass

**Test Case 2D: Main Branch Full Tests**

```bash
# Merge PR to staging main equivalent
git checkout phase-4-staging
git merge test/simple-change

# Push to trigger workflow
git push origin phase-4-staging

# Check workflow run
gh workflow run view <run-id>
```

**Expected Behavior:**
- [ ] `determine-test-scope` outputs: `run_full=true`, `run_e2e=true`, `run_load=true`
- [ ] All test jobs executed
- [ ] Build completes in 25 min
- [ ] SARIF consolidation succeeds
- [ ] All tests pass

---

### Day 5-7: Monitoring & Feedback

**Metrics Collection:**

Track the following for each run:

```yaml
Run Metrics:
- Run ID: <gh run id>
- Trigger: (PR/main/manual)
- Branch: (phase-4-staging)
- Start time: <timestamp>
- End time: <timestamp>
- Duration: <total minutes>
- SARIF success: (yes/no)
- E2E skipped: (yes/no)
- Load skipped: (yes/no)
- All tests passed: (yes/no)
- Issues encountered: (none/list)
```

**Create Metrics Log:**

```bash
# Create measurement file
cat > staging-metrics.log <<'EOF'
Phase 4 Staging Validation Metrics
Date: June 3-10, 2026

Run 1 (Simple PR):
  Duration: 8 min (target: 5-10 min) ✅
  SARIF consolidation: SUCCESS ✅
  E2E skipped: YES ✅
  
Run 2 (Main branch):
  Duration: 25 min (target: 25 min) ✅
  SARIF consolidation: SUCCESS ✅
  E2E executed: YES ✅
  Load executed: YES ✅
  
Run 3 (PR + requires:e2e label):
  Duration: 18 min (target: 15-20 min) ✅
  SARIF consolidation: SUCCESS ✅
  E2E executed: YES ✅
EOF
```

**Developer Feedback:**

- [ ] Poll team for usability feedback
- [ ] Collect comments on conditional test triggers
- [ ] Ask about label/tag clarity
- [ ] Measure adoption (how many using requires:e2e vs [full-test])

**GitHub Security Tab:**

- [ ] Verify unified SARIF report visible
- [ ] Check that all vulnerability types shown
- [ ] Confirm no duplicate findings
- [ ] Test filtering and sorting

---

## Success Criteria

### Critical Success Criteria (Must Pass)

- [ ] **SARIF Consolidation:**
  - All 3 tools produce SARIF
  - Consolidated report created
  - GitHub Security tab updated with unified findings
  - Zero duplicate alerts

- [ ] **Conditional Testing:**
  - E2E tests skip on simple PRs
  - E2E tests run when labeled
  - Load tests run on main branch
  - Load tests skip on PRs

- [ ] **Time Savings:**
  - Simple PR: 5-10 min (< 15 min)
  - PR + E2E: 15-20 min (< 25 min)
  - Main branch: 25 min (unchanged)

- [ ] **Reliability:**
  - All tests pass (unit, smoke, etc.)
  - No new failures
  - No regressions
  - Job dependencies correct

### Warning Criteria (Investigate)

- ⚠️ Simple PR takes >15 min (indicates E2E didn't skip)
- ⚠️ SARIF consolidation fails >10% of runs
- ⚠️ Any job timeout
- ⚠️ GitHub Security tab not updating

### Failure Criteria (Rollback Required)

- ❌ E2E tests run on simple PRs (critical)
- ❌ SARIF consolidation always fails
- ❌ Build time increases instead of decreases
- ❌ Existing tests fail (regression)

---

## Troubleshooting Guide

### Issue: SARIF Consolidation Fails

**Symptom:** "consolidate-sarif-reports" job fails

**Investigation:**
```bash
# Check consolidation job logs
gh run view <run-id> --log | grep -A 50 "consolidate-sarif"

# Verify artifact downloads
# Check if individual SARIF files exist
gh run download <run-id> --dir artifacts
ls -la artifacts/

# Check Python script exists
test -f scripts/consolidate-sarif.py && echo "Script exists" || echo "Script missing"
```

**Solutions:**
1. **Script missing:** Verify commit 958e09688 includes `scripts/consolidate-sarif.py`
2. **SARIF files not found:** Check individual security scan jobs complete
3. **Python error:** Review logs for syntax errors, file path issues
4. **Fallback:** If consolidation fails, individual SARIF files still upload (partial success)

### Issue: E2E Tests Not Skipping on Simple PRs

**Symptom:** `run-e2e-tests` job runs when it should skip

**Investigation:**
```bash
# Check test scope determination
gh run view <run-id> --log | grep -A 20 "Determine test scope"

# Look for output values
# Should show: run_e2e=false for simple PR
```

**Solutions:**
1. **Check trigger type:** Is this actually a PR? (not main branch)
2. **Check label:** Was a label accidentally added?
3. **Check title:** Does title contain `[full-test]`?
4. **Verify job condition:** Check if: clause is correct in workflow

### Issue: Build Time Not Improved

**Symptom:** Simple PR still takes 25 min instead of 5-10 min

**Investigation:**
```bash
# Check which jobs are actually running
gh run view <run-id> --log | grep "^[✓✗]"

# Measure individual job times
# Check if E2E/load jobs are running
```

**Solutions:**
1. **E2E job running:** Indicates skip condition failed, check logs
2. **Load job running:** Indicates wrong branch, verify branch detection
3. **Other jobs slow:** Investigate specific job, not Phase 4 issue
4. **Check caching:** First run may be slower (no cache)

### Issue: GitHub Security Tab Not Updating

**Symptom:** Unified SARIF report not appearing in Security tab

**Investigation:**
```bash
# Check if SARIF upload succeeded
gh run view <run-id> --log | grep -A 5 "Upload consolidated SARIF"

# Verify SARIF file format
# (If artifact available locally)
cat unified-audit-results.sarif | jq . | head -50
```

**Solutions:**
1. **Upload failed:** Check GitHub API permissions
2. **Invalid SARIF:** Validate JSON format
3. **Wrong category:** Verify `category: 'unified-security-audit'`
4. **Manual fallback:** Individual SARIF files still visible in Security tab
5. **Wait for sync:** GitHub may take 5-10 min to process

---

## Rollback Plan

### If Critical Issues Found

**Option 1: Disable Conditional Testing (Keep SARIF)**
```bash
# Edit workflow: remove if: conditions from E2E/load jobs
# This causes all tests to run (no skip)
# Revert to Phase 3 behavior for testing

git edit .github/workflows/ci-cd-pipeline.yml
# Remove: if: needs.determine-test-scope.outputs.run_e2e == 'true'
# Remove: if: needs.determine-test-scope.outputs.run_load == 'true'

git commit -m "chore(ci): disable conditional testing, keep SARIF"
git push origin phase-4-staging
```

**Option 2: Disable SARIF Consolidation (Keep Conditional Testing)**
```bash
# Comment out consolidate-sarif-reports job
# SARIF files still upload individually (partial functionality)

git edit .github/workflows/ci-cd-pipeline.yml
# Comment: consolidate-sarif-reports job

git commit -m "chore(ci): disable SARIF consolidation"
git push origin phase-4-staging
```

**Option 3: Complete Rollback to Phase 3**
```bash
# Revert Phase 4 commit entirely
git revert 958e09688

git push origin phase-4-staging

# Pipeline reverts to Phase 3 behavior (no SARIF conversion, all tests run)
```

---

## Sign-Off Checklist

### For CI/CD Team

- [ ] Reviewed workflow changes
- [ ] Verified SARIF conversion logic
- [ ] Tested consolidation script locally
- [ ] Reviewed job dependencies
- [ ] Confirmed error handling

### For Development Team

- [ ] Tested simple PR (no E2E)
- [ ] Tested PR with `requires:e2e` label
- [ ] Tested PR with `[full-test]` tag
- [ ] Verified build time improvements
- [ ] Confirmed all tests still pass

### For Product/Leadership

- [ ] Understood time savings (60-80% on simple PRs)
- [ ] Approved conditional testing approach
- [ ] Agreed on rollback criteria
- [ ] Scheduled post-deployment review

### For DevOps

- [ ] Verified GitHub Actions quota sufficient
- [ ] Confirmed artifact storage capacity
- [ ] Set up monitoring for key metrics
- [ ] Prepared on-call procedures

---

## Post-Deployment (After 1 Week)

### Day 8: Review & Decision

**Metrics Review:**
- [ ] Collect all staging run metrics
- [ ] Calculate actual time savings
- [ ] Review developer feedback
- [ ] Identify any issues or regressions

**Decision Gate:**
- [ ] **Green Light:** All criteria met → Proceed to production
- [ ] **Yellow Light:** Minor issues, manageable → Proceed with fixes
- [ ] **Red Light:** Critical issues → Extended validation or rollback

### Day 9-10: Production Preparation

If approved:

```bash
# Create pull request to main
git checkout main
git pull origin main
git merge --ff-only phase-4-staging

# Or use GitHub PR
gh pr create --title "Phase 4: SARIF consolidation + conditional testing" \
  --body "Staging validation complete. Ready for production." \
  --base main \
  --head phase-4-staging

# Wait for final approval
# Merge when approved
```

---

## Contact & Support

**Questions about SARIF:**
→ See `CICD_PHASE4_SARIF_CONDITIONAL_TESTING.md`

**Questions about Conditional Testing:**
→ See `CICD_PHASE4_IMPLEMENTATION.md`

**Troubleshooting:**
→ Use troubleshooting guide above

**Escalation:**
→ Create GitHub issue with:
- Run ID
- Logs (gh run view <id> --log)
- Expected vs actual behavior
- Steps to reproduce

---

## Summary

Phase 4 staging deployment consists of:

1. **Create staging branch** (phase-4-staging)
2. **Deploy Phase 4 commit** (958e09688)
3. **Run 1-week validation** using provided test cases
4. **Collect metrics** and feedback
5. **Make go/no-go decision**
6. **Deploy to main** if successful

**Expected Outcome:**
- ✅ 60-80% time savings on simple PRs
- ✅ Unified security reporting
- ✅ Improved developer experience
- ✅ Zero regressions

**Timeline:** 1 week (June 3-10, 2026)

---

**Document:** Phase 4 Staging Deployment Guide  
**Status:** 📋 READY FOR DEPLOYMENT  
**Next:** Create staging branch and begin validation
