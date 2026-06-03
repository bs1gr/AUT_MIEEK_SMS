# Phase 4 - PR Label Detection Fix

**Issue:** `requires:e2e` label not detected on test PRs targeting phase-4-staging  
**Impact:** Label-based conditional testing doesn't work  
**Fix Time:** ~1-2 hours

---

## Root Cause

The "Determine Test Scope" job uses:

```bash
if echo "" | grep -q "requires:e2e"; then
  RUN_E2E="true"
```

It's checking `${{ github.event.pull_request.labels }}` which is **empty for PRs targeting non-default branches**.

GitHub Actions only populates `pull_request.labels` for PRs targeting the repository's default branch (main). For PRs targeting other branches (like phase-4-staging), this context variable is empty.

---

## Solution: Use GitHub API

Instead of relying on the context variable, use the GitHub API to fetch PR labels directly.

### Current Code (Lines 250-276 in ci-cd-pipeline.yml)

```bash
# Check for "requires:e2e" label on PR
if echo "" | grep -q "requires:e2e"; then
  RUN_E2E="true"
  echo "🟡 PR label 'requires:e2e' detected: Enabling E2E tests"
fi

# Check for "[full-test]" in PR title
if echo "" | grep -q "\[full-test\]"; then
  RUN_FULL="true"
  RUN_E2E="true"
  echo "🟡 PR title contains '[full-test]': Enabling all advanced tests"
fi
```

### Fixed Code (New Implementation)

```bash
# Check for "requires:e2e" label on PR using GitHub API
if [ "${{ github.event_name }}" == "pull_request" ]; then
  LABELS=$(gh pr view ${{ github.event.pull_request.number }} --json labels --jq '.labels[].name' 2>/dev/null || true)
  if echo "$LABELS" | grep -q "requires:e2e"; then
    RUN_E2E="true"
    echo "🟡 PR label 'requires:e2e' detected: Enabling E2E tests"
  fi
fi

# Check for "[full-test]" in PR title
if echo "${{ github.event.pull_request.title }}" | grep -q "\[full-test\]"; then
  RUN_FULL="true"
  RUN_E2E="true"
  echo "🟡 PR title contains '[full-test]': Enabling all advanced tests"
fi
```

### Key Changes

1. **Use GitHub API**: `gh pr view <number> --json labels --jq '.labels[].name'`
2. **Check for pull_request event**: Only when `github.event_name == "pull_request"`
3. **Handle errors gracefully**: Use `|| true` to prevent workflow failure if API call fails
4. **Use direct context for title**: `${{ github.event.pull_request.title }}` instead of empty variable

---

## Why This Works

✅ GitHub API (`gh`) has access to the PR data regardless of target branch  
✅ Works for PRs on any branch (main, phase-4-staging, feature branches)  
✅ Backwards compatible with existing [full-test] tag logic  
✅ GITHUB_TOKEN already available (no additional auth needed)  
✅ Graceful fallback if API fails

---

## Implementation Steps

1. **Edit the file**
   ```bash
   nano .github/workflows/ci-cd-pipeline.yml
   # Or use your preferred editor
   ```

2. **Find section** (lines 250-276)
   ```bash
   # Check for "requires:e2e" label on PR
   ```

3. **Replace code** with the fixed version above

4. **Test locally** (optional)
   ```bash
   # Simulate the check
   LABELS=$(gh pr view 194 --json labels --jq '.labels[].name')
   echo "$LABELS" | grep -q "requires:e2e" && echo "Found!" || echo "Not found"
   ```

5. **Commit change**
   ```bash
   git add .github/workflows/ci-cd-pipeline.yml
   git commit -m "fix(ci): Use GitHub API for PR label detection on all branches"
   git push origin main
   git push origin phase-4-staging
   ```

6. **Test with PR #194**
   - Push another commit to test/api-enhancement
   - Trigger new workflow run
   - Verify E2E tests execute

---

## Verification Checklist

After applying fix:

- [ ] Code edited correctly
- [ ] No syntax errors
- [ ] Committed and pushed to both branches
- [ ] Test PR #194 retriggers workflow
- [ ] "Determine test scope" job shows: `run_e2e=true`
- [ ] E2E tests execute (not skipped)
- [ ] Build completes successfully

---

## Rollback Plan

If fix causes issues:

```bash
# Revert to previous version
git revert <commit-hash>
git push origin main
git push origin phase-4-staging
```

---

## Expected Outcome

After fix:
- ✅ PR #194 with `requires:e2e` label will trigger E2E tests
- ✅ All 3 test scenarios will work correctly
- ✅ Conditional testing fully functional
- ✅ Can proceed with real validation

---

**Fix Priority:** HIGH - Blocks phase 4 validation  
**Fix Effort:** 15 minutes (apply + test)  
**Timeline Impact:** Can resume validation immediately after fix

