# Automated Deprecation Checks - Quick Reference

**Created**: February 13, 2026
**Purpose**: Prevent accumulation of deprecated files through automated enforcement

---

## 🤖 Automation Components

### 1. Local Pre-Commit Hook

**Location**: `.git/hooks/pre-commit-deprecation-check`
**Installed by**: `scripts/setup_git_hooks.ps1`

**What it checks**:
- ✅ Prevents committing deprecated scripts to root directory
- ✅ Blocks re-addition of archived scripts (`RELEASE_PREPARATION.ps1`, etc.)
- ✅ Detects deprecated/obsolete/legacy file patterns

**Bypass** (emergency only):
```powershell
git commit --no-verify -m "emergency fix"  # Skip all hooks
```

### 2. Deprecation Audit Script

**Location**: `scripts/utils/audit_deprecated_markers.ps1`
**Usage**:
```powershell
# Quick check (30 seconds)
.\scripts\utils\audit_deprecated_markers.ps1 -Mode Quick

# Standard check (2-3 min)
.\scripts\utils\audit_deprecated_markers.ps1 -Mode Standard

# Full audit (5 min)
.\scripts\utils\audit_deprecated_markers.ps1 -Mode Full
```

**Checks performed**:
1. Root directory has no deprecated scripts
2. Archive structure documented (`archive/README.md`)
3. Deprecated markers properly documented in code
4. `.gitignore` protection for archived files
5. Deprecation policy exists (`docs/development/DEPRECATION_POLICY.md`)

### 3. GitHub Actions Workflow

**Location**: `.github/workflows/deprecation-audit.yml`
**Triggers**:
- Every pull request to `main` or `develop`
- Monthly on 1st at 3:00 AM UTC
- Manual dispatch with mode selection

**What happens on failure**:
- PR gets a comment explaining violation
- Workflow fails (blocks merge if protection rules enabled)
- Audit artifacts uploaded for review

---

## 📋 Audit Modes Explained

| Mode | Duration | What's Checked | Use When |
|------|----------|----------------|----------|
| **Quick** | 30s | File-level only (root scripts, archive structure) | Daily development |
| **Standard** | 2-3 min | Files + content markers (undocumented deprecations) | Pre-commit, CI/CD |
| **Full** | 5 min | Comprehensive scan with detailed analysis | Monthly audit |

---

## ✅ Compliance Checklist

Before committing changes:

- [ ] No deprecated scripts in root directory
- [ ] All archived scripts have migration guides
- [ ] Deprecation markers include "since version X" or "use Y instead"
- [ ] `.gitignore` updated if archiving entire script category
- [ ] `docs/development/DEPRECATION_POLICY.md` consulted for process

---

## 🚨 Common Violations & Fixes

### Violation: Deprecated script in root
```
❌ ERROR: Attempting to commit deprecated file(s) to root directory:
MYOLD_SCRIPT.ps1
```

**Fix**:
```powershell
# Move to archive
$archiveDir = "archive/cleanup-$(Get-Date -Format 'MMM-yyyy')/legacy-scripts"
New-Item -ItemType Directory -Path $archiveDir -Force
Move-Item "MYOLD_SCRIPT.ps1" -Destination "$archiveDir/" -Force

# Update .gitignore
Add-Content -Path ".gitignore" -Value "/MYOLD_SCRIPT.ps1"

# Stage changes
git add $archiveDir
git add .gitignore
git add . # Stage deletion from root
```

### Violation: Re-adding archived script
```
❌ ERROR: Attempting to re-add archived script: RELEASE_PREPARATION.ps1
```

**Fix**: Don't re-add! Use the replacement instead.
- See migration guide: `docs/development/release-workflow/RELEASE_PREPARATION_DEPRECATED.md`
- New workflow: Use `RELEASE_READY.ps1` instead

### Warning: Undocumented deprecation marker
```
⚠️  Undocumented deprecation marker: backend/old_service.py:45
```

**Fix**: Add proper documentation:
```python
# Before (bad):
# DEPRECATED
def old_function():
    pass

# After (good):
def old_function():
    """
    .. deprecated:: 1.17.8
        Use :func:`new_function` instead.
        This will be removed in version 2.0.0.
    """
    import warnings
    warnings.warn("old_function is deprecated", DeprecationWarning)
    pass
```

---

## 📊 Audit Report Interpretation

### 100% Compliant
```
✅ PASS - No policy violations detected
Deprecation policy compliance: 100%
```
**Action**: None required. Proceed with commit.

### Warnings Only
```
⚠️ PASS (with warnings) - Review warnings above
Violations: 0
Warnings:   3
```
**Action**: Review warnings, fix if possible, but not blocking.

### Violations Found
```
❌ FAIL - Fix violations before committing
Violations: 2
Warnings:   1
```
**Action**: **MUST FIX** before committing. Review violation details and apply recommended fixes.

---

## 🔧 Maintenance

### Re-install Git Hooks

If hooks get corrupted or need updating:
```powershell
.\scripts\setup_git_hooks.ps1
```

### Test Audit Without Committing

Run audit at any time:
```powershell
.\scripts\utils\audit_deprecated_markers.ps1 -Mode Standard
```

### CI/CD Audit History

View past audit runs:
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/deprecation-audit.yml
2. Check artifacts for detailed reports

---

## 📚 Related Documentation

- **Deprecation Policy**: `docs/development/DEPRECATION_POLICY.md`
- **Archive Guide**: `archive/README.md`
- **Git Workflow**: `docs/development/GIT_WORKFLOW.md`
- **Migration Guides**: `docs/development/release-workflow/RELEASE_PREPARATION_DEPRECATED.md`

---

## ❓ FAQ

**Q: Can I skip the pre-commit hook?**
A: Only in emergencies using `git commit --no-verify`. But you must fix violations before PR merge.

**Q: What if the audit finds false positives?**
A: Add acceptable patterns to the audit script's whitelist (`$acceptable` variable in Check 3).

**Q: How often should I run the full audit?**
A: Monthly full audit is automatic. Run manually if adding many new files.

**Q: What happens if I accidentally commit a deprecated file?**
A: GitHub Actions will catch it on PR. Create a follow-up commit to archive it properly.

**Q: Can I disable the monthly audit?**
A: Not recommended. If needed, edit `.github/workflows/deprecation-audit.yml` to remove schedule trigger.

---

**Last Updated**: February 13, 2026
**Maintainer**: Development Team
**Status**: ✅ Active Enforcement
