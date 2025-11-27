# Deprecated Commit Preparation Scripts Archive

**Archive Date**: 2025-11-27  
**Reason**: Consolidated into single `COMMIT_READY.ps1` script  
**Status**: ⚠️ DEPRECATED - Use `COMMIT_READY.ps1` instead

---

## What Happened?

Multiple commit preparation scripts were consolidated into **one unified script** (`COMMIT_READY.ps1`) that handles all pre-commit verification needs.

### Archived Scripts

| Script | Lines | Purpose | Replacement |
|--------|-------|---------|-------------|
| **COMMIT_PREP.ps1** | 603 | Comprehensive pre-commit workflow | `COMMIT_READY.ps1` |
| **PRE_COMMIT_CHECK.ps1** | 752 | Native + Docker health checks | `COMMIT_READY.ps1 -Mode full` |
| **PRE_COMMIT_HOOK.ps1** | 122 | Quick validation for git hooks | `COMMIT_READY.ps1 -Mode quick` |
| **SMOKE_TEST_AND_COMMIT_PREP.ps1** | 603 | Smoke tests + commit prep | `COMMIT_READY.ps1` |

---

## Why Consolidate?

### Problems with Multiple Scripts:
1. **Confusion** - Users didn't know which script to use
2. **Duplication** - Same functionality implemented multiple times
3. **Maintenance** - Bug fixes needed in multiple places
4. **Inconsistency** - Different behavior across scripts
5. **Learning Curve** - New developers overwhelmed by options

### Benefits of Single Script:
1. ✅ **One entry point** - Clear and unambiguous
2. ✅ **Mode-based execution** - Flexible for different use cases
3. ✅ **Consistent behavior** - Same checks everywhere
4. ✅ **Easy maintenance** - One place to update
5. ✅ **Better UX** - Simpler command structure

---

## Migration Guide

### Old → New Command Mapping

```powershell
# Quick validation (git pre-commit hook)
OLD: .\PRE_COMMIT_HOOK.ps1
NEW: .\COMMIT_READY.ps1 -Mode quick

# Standard pre-commit workflow
OLD: .\COMMIT_PREP.ps1
NEW: .\COMMIT_READY.ps1

# Comprehensive validation (Native + Docker)
OLD: .\PRE_COMMIT_CHECK.ps1
NEW: .\COMMIT_READY.ps1 -Mode full

# Smoke tests + commit preparation
OLD: .\SMOKE_TEST_AND_COMMIT_PREP.ps1
NEW: .\COMMIT_READY.ps1 -GenerateCommit

# Quick check (skip Docker)
OLD: .\PRE_COMMIT_CHECK.ps1 -Quick
NEW: .\COMMIT_READY.ps1 -Mode quick

# With auto-fix for formatting
NEW: .\COMMIT_READY.ps1 -AutoFix

# Cleanup only
NEW: .\COMMIT_READY.ps1 -Mode cleanup
```

---

## COMMIT_READY.ps1 Features

The new unified script includes **all functionality** from the deprecated scripts:

### Execution Modes

| Mode | Duration | Use Case | Operations |
|------|----------|----------|------------|
| `quick` | 2-3 min | Git pre-commit hook | Linting + fast tests + translation check |
| `standard` | 5-8 min | Standard workflow (default) | Full linting + all tests + cleanup |
| `full` | 15-20 min | Pre-release validation | Everything + Native/Docker health checks |
| `cleanup` | 1-2 min | Maintenance | Only cleanup operations |

### Comprehensive Checks

✅ **Code Quality**
- Backend: Ruff linting (with optional auto-fix)
- Frontend: ESLint (with optional auto-fix)
- Frontend: TypeScript type checking
- Translation integrity validation

✅ **Testing**
- Backend: pytest (full suite or fast tests)
- Frontend: Vitest (all tests including integration)

✅ **Health Checks** (full mode only)
- Native mode deployment verification
- Docker mode deployment verification
- Database connectivity checks

✅ **Automated Cleanup**
- Python cache (`__pycache__`, `.pyc`, `.pytest_cache`)
- Node.js cache (`node_modules/.cache`)
- Build artifacts (`dist`, `build`)
- Temporary files (`.tmp`, `.bak`, `.old`)

✅ **Documentation**
- Key documentation file verification
- Git status reporting
- Commit message generation

### Command Examples

```powershell
# Standard workflow (recommended for most commits)
.\COMMIT_READY.ps1

# Quick validation (use as git pre-commit hook)
.\COMMIT_READY.ps1 -Mode quick

# Full validation (before releases)
.\COMMIT_READY.ps1 -Mode full

# Auto-fix formatting issues
.\COMMIT_READY.ps1 -AutoFix

# Skip specific checks
.\COMMIT_READY.ps1 -SkipTests
.\COMMIT_READY.ps1 -SkipLint
.\COMMIT_READY.ps1 -SkipCleanup

# Generate commit message
.\COMMIT_READY.ps1 -GenerateCommit

# Cleanup workspace only
.\COMMIT_READY.ps1 -Mode cleanup
```

---

## Functionality Comparison

### Old Scripts Coverage

| Functionality | COMMIT_PREP | PRE_COMMIT_CHECK | PRE_COMMIT_HOOK | SMOKE_TEST | COMMIT_READY |
|---------------|:-----------:|:----------------:|:---------------:|:----------:|:------------:|
| Backend Linting | ✅ | ❌ | ❌ | ✅ | ✅ |
| Frontend Linting | ✅ | ✅ | ✅ | ✅ | ✅ |
| TypeScript Check | ✅ | ✅ | ❌ | ✅ | ✅ |
| Translation Check | ❌ | ❌ | ✅ | ✅ | ✅ |
| Backend Tests | ✅ | ❌ | ✅ | ✅ | ✅ |
| Frontend Tests | ✅ | ❌ | ❌ | ✅ | ✅ |
| Native Health | ❌ | ✅ | ❌ | ❌ | ✅ |
| Docker Health | ❌ | ✅ | ❌ | ❌ | ✅ |
| Auto Cleanup | ✅ | ✅ | ❌ | ✅ | ✅ |
| Auto-Fix | ❌ | ❌ | ❌ | ❌ | ✅ |
| Commit Message Gen | ✅ | ❌ | ❌ | ✅ | ✅ |
| Mode Selection | ✅ | ✅ | ❌ | ❌ | ✅ |

**Result**: `COMMIT_READY.ps1` provides **100% feature coverage** plus additional improvements.

---

## Git Pre-Commit Hook Setup

To use `COMMIT_READY.ps1` as a git pre-commit hook:

### Option 1: Manual Hook (Recommended)
Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
pwsh -File "$(git rev-parse --show-toplevel)/COMMIT_READY.ps1" -Mode quick
exit $?
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Option 2: Git Config
```powershell
git config core.hooksPath .githooks
# Then create .githooks/pre-commit with the script above
```

---

## Removed Scripts (Manual Cleanup Utilities)

These scripts remain in `scripts/dev/internal/` but are **less needed** now:

- `CLEANUP_COMPREHENSIVE.ps1` - Use `COMMIT_READY.ps1 -Mode cleanup` instead
- `CLEANUP_OBSOLETE_FILES.ps1` - Manual cleanup utility (keep for special cases)
- `CLEANUP_DOCS.ps1` - Manual cleanup utility (keep for special cases)

**Recommendation**: Keep these for manual cleanup but use `COMMIT_READY.ps1` for automated workflows.

---

## Timeline

- **Before 2025-11-27**: Multiple fragmented scripts
- **2025-11-27**: Consolidated into `COMMIT_READY.ps1`
- **After 2025-11-27**: Single unified workflow

---

## Support

If you need to reference the old scripts for any reason, they are preserved in this archive directory.

For questions or issues with the new `COMMIT_READY.ps1` script, please:
1. Check the help: `Get-Help .\COMMIT_READY.ps1 -Full`
2. Review this migration guide
3. Check the script comments and documentation

---

**Archive maintained for historical reference only.**  
**Use `COMMIT_READY.ps1` for all pre-commit verification needs.**
