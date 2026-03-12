# Pre-Commit Hook Recursion Fix

> **Historical debugging record:** This document describes a Feb 13, 2026
> incident in a legacy custom-hook chain. The current supported install path is
> the `.githooks` sample hook via `scripts/install-git-hooks.ps1` /
> `scripts/install-git-hooks.sh`.

**Date**: February 13, 2026
**Issue**: Pre-commit hook infinite recursion loop
**Status**: ✅ FIXED
**Severity**: HIGH (blocked normal commit workflow)

---

## Problem Description

### Symptoms
- Running `git commit` (without `--no-verify`) caused infinite recursion
- Version validation ran 18+ times before failing with exit code 1
- Each validation passed successfully but continued looping
- Workaround required: `git commit --no-verify` to bypass hooks

### Root Cause
The `pre-commit-legacy` hook file contained a self-recursive call on line 24:

```bash
# 3) Chain legacy hook if present
LEGACY_HOOK="$HOOKS_DIR/pre-commit-legacy"
if [ -f "$LEGACY_HOOK" ]; then
    bash "$LEGACY_HOOK" "$@"  # ❌ Calls itself infinitely
    exit $?
fi
```

### Hook Chain (Before Fix)
```
pre-commit
├─ validate_version_format.ps1 ✅
├─ pre-commit-deprecation-check ✅ *(historical custom-hook path)*
└─ pre-commit-legacy
   ├─ ENFORCE_COMMIT_READY_GUARD.ps1 ✅
   ├─ validate_version_format.ps1 ✅
   └─ pre-commit-legacy (SELF-CALL) ❌ → INFINITE LOOP
      └─ ... (repeats 18+ times)
```

---

## Solution Applied

### Fix Implementation
**File**: `.git/hooks/pre-commit-legacy`
**Action**: Removed lines 23-26 (self-recursive call)

**Before** (lines 19-27):
```bash
    fi
fi

# 3) Chain legacy hook if present
LEGACY_HOOK="$HOOKS_DIR/pre-commit-legacy"
if [ -f "$LEGACY_HOOK" ]; then
    bash "$LEGACY_HOOK" "$@"
    exit $?
fi

exit 0
```

**After** (lines 19-21):
```bash
    fi
fi

exit 0
```

### Hook Chain (After Fix)
```
pre-commit
├─ validate_version_format.ps1 ✅ (runs once)
├─ pre-commit-deprecation-check ✅ (runs once, historical custom-hook path)
└─ pre-commit-legacy ✅ (runs once, then exits cleanly)
   ├─ ENFORCE_COMMIT_READY_GUARD.ps1 ✅
   └─ validate_version_format.ps1 ✅ (acceptable second validation)
```

---

## Verification

### Test Procedure
1. Created test file: `echo "test" > test_hook_file.txt`
2. Staged file: `git add test_hook_file.txt`
3. Committed **without** `--no-verify`: `git commit -m "test: verify hook"`
4. **Result**: ✅ Commit succeeded on first try (no recursion)

### Test Output
```
🔒 Running Pre-Commit Validation...
Validating version format...
Source: D:\SMS\student-management-system\VERSION
Current: 1.17.8

✅ Version format compliance: PASS
🔍 Checking for deprecated scripts in root...
✅ Deprecation policy check passed
🔄 Running legacy pre-commit hooks...
✅ Validation checkpoint is VALID (never expires)
Validating version format...
Source: D:\SMS\student-management-system\VERSION
Current: 1.17.8

✅ Version format compliance: PASS
[main e7380b2d4] test: verify pre-commit hook works without recursion
 1 file changed, 1 insertion(+)
 create mode 100644 test_hook_file.txt
```

**Analysis**:
- Version validation ran **2 times** (acceptable: main hook + legacy validation)
- Deprecation check ran **1 time** ✅
- COMMIT_READY guard ran **1 time** ✅
- No infinite loop detected ✅
- Commit completed successfully ✅

---

## Impact

### Before Fix
- ❌ All commits required `--no-verify` flag (bypassed all safety checks)
- ❌ Version format enforcement disabled
- ❌ Deprecation policy checks skipped
- ❌ COMMIT_READY validation bypassed
- ⚠️ HIGH RISK: No automated quality gates

### After Fix
- ✅ Normal `git commit` workflow restored
- ✅ All 3 pre-commit checks enforce properly
- ✅ No performance degradation (2-3 second hook runtime)
- ✅ Clean hook chain with no recursion
- ✅ All policy enforcement layers active

---

## Related Files

**Hook Files**:
- `.git/hooks/pre-commit` - Main hook orchestrator
- `.git/hooks/pre-commit-legacy` - COMMIT_READY + version validation (FIXED)
- `.git/hooks/pre-commit-deprecation-check` - Deprecation policy enforcer *(historical hook-chain component)*

**Setup Script**:
- `scripts/setup_git_hooks.ps1` - Hook installer and chain manager *(now archived)*

**Validation Scripts**:
- `scripts/validate_version_format.ps1` - Version format enforcer (Policy 2)
- `scripts/ENFORCE_COMMIT_READY_GUARD.ps1` - Pre-commit validation guard (Policy 5)
- `scripts/utils/audit_deprecated_markers.ps1` - Deprecation audit tool

---

## Lessons Learned

1. **Test hook chains thoroughly** before deployment
   - Recursion bugs hard to debug once deployed
   - Test with actual commits (not just dry-runs)

2. **Hook naming conventions matter**
   - `pre-commit-legacy` should NOT chain to itself
   - Clear naming prevents confusion (legacy vs legacy.bak)

3. **Document hook chain architecture**
   - Easy to introduce infinite loops in complex chains
   - Maintain diagram of call hierarchy

4. **Keep hooks simple**
   - Each hook should have single responsibility
   - Avoid complex chaining unless necessary

---

## Prevention

### Future Hook Development Checklist
- [ ] Draw hook call chain diagram before implementation
- [ ] Test with real commits (not `--no-verify`)
- [ ] Verify each hook exits cleanly without chaining to itself
- [ ] Document expected runtime (should be <5 seconds)
- [ ] Test on clean repository clone

### Monitoring
- GitHub Actions workflows test hooks indirectly (they run validation scripts)
- Monthly deprecation audit validates hook integration
- Developer feedback if commits start hanging (report immediately)

---

## References

**Related Documentation**:
- [AGENT_POLICY_ENFORCEMENT.md](../AGENT_POLICY_ENFORCEMENT.md) - Policy 5 (Pre-commit validation)
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Pre-commit automation guide
- [AUTOMATED_DEPRECATION_CHECKS.md](AUTOMATED_DEPRECATION_CHECKS.md) - Deprecation enforcement

**Related Issues**:
- Hook recursion discovered: February 13, 2026 (during automation deployment)
- Workaround documented: Same day (use `--no-verify`)
- Permanent fix applied: Same day (removed self-recursive call)

**Related Commits**:
- 3df8c25bb - feat(automation): add automated deprecation policy enforcement (initial deployment)
- 06dedf9c4 - style(automation): clean up trailing whitespace (formatter cleanup)
- (Hook fix not committed - lives in .git/hooks/)

---

**Status**: ✅ Issue resolved, normal workflow restored
**Next Steps**: Monitor for any other hook chain issues in production use
