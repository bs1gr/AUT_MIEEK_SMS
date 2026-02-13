# RELEASE_PREPARATION.ps1 - DEPRECATION NOTICE

**Status**: ⛔ **DEPRECATED** as of February 13, 2026
**Archive Location**: `archive/cleanup-feb2026/legacy-scripts/RELEASE_PREPARATION.ps1`
**Replacement**: `RELEASE_READY.ps1`

---

## Why Was It Deprecated?

`RELEASE_PREPARATION.ps1` was consolidated into the unified `RELEASE_READY.ps1` script to:
- Reduce script proliferation
- Simplify release workflow (single command instead of multiple)
- Eliminate duplicate validation logic
- Improve maintainability

All functionality from `RELEASE_PREPARATION.ps1` has been integrated into `RELEASE_READY.ps1`.

---

## Migration Guide

### Old Workflow (Deprecated)

```powershell
# Step 1: Validate
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix

# Step 2: If validation passes, create release
.\RELEASE_READY.ps1 -ReleaseVersion "X.Y.Z"
```

### New Workflow (Current)

```powershell
# Single command - validation included
.\RELEASE_READY.ps1 -ReleaseVersion "X.Y.Z" -AutoFix
```

---

## Command Equivalents

| Old Command | New Equivalent | Notes |
|-------------|----------------|-------|
| `.\RELEASE_PREPARATION.ps1 -Mode Quick` | `.\RELEASE_READY.ps1 -ReleaseVersion "X.Y.Z"` | Validation is automatic |
| `.\RELEASE_PREPARATION.ps1 -Mode Full` | `.\RELEASE_READY.ps1 -ReleaseVersion "X.Y.Z"` | Full testing included by default |
| `.\RELEASE_PREPARATION.ps1 -Mode Tests` | `.\RUN_TESTS_BATCH.ps1` | Use dedicated test runner |
| `.\RELEASE_PREPARATION.ps1 -AutoFix` | `.\RELEASE_READY.ps1 -AutoFix` | Same parameter name |
| `.\RELEASE_PREPARATION.ps1 -SkipTests` | `.\RELEASE_READY.ps1 -SkipTests` | Same parameter name |

---

## What Changed?

### Features Moved to RELEASE_READY.ps1

All validation features from `RELEASE_PREPARATION.ps1` are now in `RELEASE_READY.ps1`:

1. ✅ **Git Status Checks** - Ensures clean working directory
2. ✅ **Version Verification** - Validates version consistency across all files
3. ✅ **Pre-commit Checks** - Format, lint, organize imports
4. ✅ **Test Suites** - Backend + frontend test execution
5. ✅ **Installer Builder** - Validates installer build (optional via `-SkipInstaller`)
6. ✅ **Auto-fix** - Automatically fix version inconsistencies
7. ✅ **Skip Options** - `-SkipTests`, `-SkipValidation`, `-SkipInstaller`

### New Features in RELEASE_READY.ps1

Additionally, `RELEASE_READY.ps1` provides:

- Automated git tagging
- GitHub Actions workflow triggering
- Release notes integration
- Commit and push automation

---

## RELEASE_WITH_DOCS.ps1 Impact

`RELEASE_WITH_DOCS.ps1` has been updated (v1.1) to remove the separate preparation phase:

**Old Flow** (4 phases):
1. Preparation (`RELEASE_PREPARATION.ps1`)
2. Documentation Generation
3. Commit Documentation
4. Release Ready (`RELEASE_READY.ps1`)

**New Flow** (3 phases):
1. ~~Preparation~~ (removed - now part of phase 2)
2. Documentation Generation
3. Release (`RELEASE_READY.ps1` with built-in validation)

---

## If You Encounter Old Documentation

If you find documentation still referencing `RELEASE_PREPARATION.ps1`:

1. **Check the date** - Documentation before Feb 13, 2026 may reference the old script
2. **Use this migration guide** - Replace old commands with equivalent `RELEASE_READY.ps1` commands
3. **Report it** - Consider updating the documentation to reference this deprecation notice

---

## Questions?

- **Where is the archived script?** → `archive/cleanup-feb2026/legacy-scripts/RELEASE_PREPARATION.ps1`
- **Can I still use it?** → No, it's been removed from the root directory
- **What if I have a custom fork?** → Merge the validation logic into your `RELEASE_READY.ps1`
- **Where are the tests?** → All tests validated by `RELEASE_READY.ps1` or `RUN_TESTS_BATCH.ps1`

---

**Last Updated**: February 13, 2026
**Supersedes**: All documentation referencing `RELEASE_PREPARATION.ps1`
**Authority**: Workspace cleanup initiative February 2026
