# Pre-Commit Automation Guide

**Version:** 2.0.0  
**Updated:** 2025-11-27  
**Purpose:** Unified pre-commit verification automation for SMS v1.9.3+

> **Migration Notice (v1.9.3)**: Multiple commit preparation scripts (`COMMIT_PREP.ps1`, `PRE_COMMIT_CHECK.ps1`, `PRE_COMMIT_HOOK.ps1`, `SMOKE_TEST_AND_COMMIT_PREP.ps1`) have been consolidated into a single unified script `COMMIT_READY.ps1`. See `archive/deprecated_commit_scripts_2025-11-27/README.md` for migration details.

---

## Overview

`COMMIT_READY.ps1` is a comprehensive automation script that consolidates all testing, verification, and cleanup steps required before committing code changes. It ensures production readiness with flexible execution modes.

**Key Benefits:**

- ✅ **Unified**: Single script replaces 4 deprecated scripts
- ✅ **Mode-Based**: Quick (2-3 min), Standard (5-8 min), Full (15-20 min), Cleanup (1-2 min)
- ✅ **Auto-Fix**: Automatically fixes formatting and import issues
- ✅ **Comprehensive**: Tests all deployment modes + cleanup
- ✅ **Detailed**: Comprehensive pass/fail reporting
- ✅ **Reliable**: Catches issues before commit

---

## Quick Start

### Basic Usage

```powershell
# Standard workflow (recommended for most commits)
.\COMMIT_READY.ps1

# Quick validation (use as git pre-commit hook)
.\COMMIT_READY.ps1 -Mode quick

# Full verification (Native + Docker health checks)
.\COMMIT_READY.ps1 -Mode full

# Cleanup workspace only
.\COMMIT_READY.ps1 -Mode cleanup

# With auto-fix for formatting issues
.\COMMIT_READY.ps1 -AutoFix
```

### DEV_EASE and pre-commit hooks

DEV_EASE is intentionally limited to pre-commit helper usage (COMMIT_READY.ps1) and must not be used
to change application runtime behavior or be enabled in CI. It exists to allow developers to intentionally
skip expensive checks or enable AutoFix during local pre-commit runs. To use DEV_EASE locally, set
the environment variable before running COMMIT_READY, e.g.:

```powershell
$env:DEV_EASE = 'true'
.\COMMIT_READY.ps1 -Mode quick -AutoFix
```

This repository provides a sample pre-commit hook at `.githooks/commit-ready-precommit.sample` and
cross-platform installers under `scripts/install-git-hooks.ps1` and `scripts/install-git-hooks.sh` to
make it easy for contributors to enable the consolidated pre-commit checks automatically at commit time.

### Execution Modes

| Mode | Duration | Use Case | Operations |
|------|----------|----------|------------|
| `quick` | 2-3 min | Git pre-commit hook | Linting + fast tests + translation check |
| `standard` | 5-8 min | Standard workflow (default) | Full linting + all tests + cleanup |
| `full` | 15-20 min | Pre-release validation | Everything + Native/Docker health checks |
| `cleanup` | 1-2 min | Maintenance | Only cleanup operations |

---

## Test Phases

### Phase 1: Code Quality & Linting

**Backend (Ruff):**

- Linting with `ruff check --config ../config/ruff.toml`
- Optional auto-fix with `-AutoFix` flag
- Configured rules: syntax errors, undefined names, unused imports

**Frontend (ESLint):**

- Linting with `npm run lint`
- Optional auto-fix with `-AutoFix` flag
- Rules: syntax, i18next, React best practices

**TypeScript Type Checking:**

- Run `npx tsc --noEmit` in frontend directory
- Fails on any production code type errors

**Translation Integrity:**

- Validates EN/EL translation key parity
- Checks for missing translations
- Detects placeholder mismatches
- Test file: `frontend/src/i18n/__tests__/translations.test.ts`

**Skip with:** `-SkipLint` flag

---

### Phase 2: Test Suite Execution

**Backend Tests (pytest):**

- Quick mode: Fast tests only (`-m "not slow"`)
- Standard/Full mode: All tests (unit + integration)
- Test discovery: `backend/tests/`
- Exit on failure

**Frontend Tests (Vitest):**

- Quick mode: Basic test run
- Standard/Full mode: Complete test suite
- Coverage: components, contexts, stores, utilities, API
- Exit on failure

**Skip with:** `-SkipTests` flag

---

### Phase 3: Deployment Health Checks

**Only in Full Mode (`-Mode full`)**

**Native Mode:**

- Start via `NATIVE.ps1 -Start`
- Backend health check on port 8000
- Frontend accessibility on port 5173
- Clean stop after verification

**Docker Mode:**

- Start via `DOCKER.ps1 -Start`
- Container health check on port 8080
- Database connectivity verification
- Frontend accessibility check
- Clean stop after verification

---

### Phase 4: Automated Cleanup

**Python Cache:**

- `__pycache__` directories
- `*.pyc`, `*.pyo` files
- `.pytest_cache` directories

**Node.js Cache:**

- `node_modules/.cache`

**Build Artifacts:**

- `frontend/dist`
- `frontend/build`

**Temporary Files:**

- `*.tmp`, `*.temp`, `*.bak`, `*.backup`, `*.old`

**Skip with:** `-SkipCleanup` flag

---

### Phase 5: Documentation & Git Status

**Documentation Check:**

- Verifies key documentation files exist
- Lists files: README.md, CHANGELOG.md, TODO.md, DOCUMENTATION_INDEX.md

**Git Status:**

- Shows modified, added, deleted, untracked files
- Summary of changes
- Displayed for user review

---

### Phase 6: Commit Message Generation

**Optional** (with `-GenerateCommit` flag)

- Generates comprehensive commit message
- Includes test results summary
- Lists all changes
- Provides next steps guidance
- Saved to `commit_msg.txt`

---

## Command-Line Options

### Flags

| Flag | Description | Example |
|------|-------------|---------|
| `-Mode` | Execution mode (quick/standard/full/cleanup) | `.\COMMIT_READY.ps1 -Mode quick` |
| `-SkipTests` | Skip all test execution | `.\COMMIT_READY.ps1 -SkipTests` |
| `-SkipCleanup` | Skip cleanup operations | `.\COMMIT_READY.ps1 -SkipCleanup` |
| `-SkipLint` | Skip linting checks | `.\COMMIT_READY.ps1 -SkipLint` |
| `-GenerateCommit` | Generate commit message | `.\COMMIT_READY.ps1 -GenerateCommit` |
| `-AutoFix` | Auto-fix formatting issues | `.\COMMIT_READY.ps1 -AutoFix` |

### Usage Examples

```powershell
# Standard pre-commit workflow
.\COMMIT_READY.ps1

# Quick git pre-commit hook
.\COMMIT_READY.ps1 -Mode quick

# Full validation before release
.\COMMIT_READY.ps1 -Mode full

# Fix formatting automatically
.\COMMIT_READY.ps1 -AutoFix

# Generate commit message
.\COMMIT_READY.ps1 -GenerateCommit

# Skip tests (not recommended)
.\COMMIT_READY.ps1 -SkipTests

# Cleanup only
.\COMMIT_READY.ps1 -Mode cleanup
```

---

## Git Pre-Commit Hook Integration

### Manual Hook Setup

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
pwsh -File "$(git rev-parse --show-toplevel)/COMMIT_READY.ps1" -Mode quick
exit $?
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
```

### Git Config Method

```powershell
git config core.hooksPath .githooks
# Then create .githooks/pre-commit with the script above
```

---

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | All checks passed | Proceed with commit |
| `1` | One or more checks failed | Fix issues and re-run |

**Usage in Scripts:**

```powershell
.\COMMIT_READY.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Pre-commit checks failed"
    exit 1
}
```

---

## Troubleshooting

### Common Issues

#### Python not found

- Install Python 3.11+
- Verify with `python --version`
- Run `.\NATIVE.ps1 -Setup` to create virtual environment

#### Node.js not found

- Install Node.js 18+
- Verify with `node --version`
- Run `cd frontend && npm install`

#### Docker not available

- Start Docker Desktop
- Or use `-Mode quick` to skip Docker tests
- Verify with `docker ps`

#### Backend tests failed

- Check `backend/logs/app.log` for errors
- Ensure virtual environment is activated
- Run `cd backend && pytest -v` for detailed output

#### Frontend tests failed

- Check `node_modules` exists
- Run `cd frontend && npm run test` for detailed output
- Clear cache with `rm -rf node_modules/.cache`

#### TypeScript compilation errors

- Review error output
- Fix type errors in production code
- Test files are excluded from checks

#### Translation integrity issues

- Check console output for missing keys
- Update both EN and EL translations
- Verify structure matches in `frontend/src/locales/`

---

## Migration from Deprecated Scripts

### Old → New Command Mapping

```powershell
# PRE_COMMIT_HOOK.ps1 → Quick mode
.\COMMIT_READY.ps1 -Mode quick

# COMMIT_PREP.ps1 → Standard mode (default)
.\COMMIT_READY.ps1

# PRE_COMMIT_CHECK.ps1 → Full mode
.\COMMIT_READY.ps1 -Mode full

# SMOKE_TEST_AND_COMMIT_PREP.ps1 → With commit generation
.\COMMIT_READY.ps1 -GenerateCommit

# PRE_COMMIT_CHECK.ps1 -Quick → Quick mode
.\COMMIT_READY.ps1 -Mode quick
```

See `archive/deprecated_commit_scripts_2025-11-27/README.md` for detailed migration guide.

---

## Performance Tips

**Fastest Workflow:**

```powershell
.\COMMIT_READY.ps1 -Mode quick
```

**Skip Specific Checks:**

```powershell
# Skip linting (if already done)
.\COMMIT_READY.ps1 -SkipLint

# Skip tests (during rapid iteration)
.\COMMIT_READY.ps1 -SkipTests

# Skip cleanup (if workspace is already clean)
.\COMMIT_READY.ps1 -SkipCleanup
```

**Docker Image Caching:**

- First run: ~15-20 min (with build)
- Cached run: ~5-8 min (no build needed)
- Use `DOCKER.ps1 -UpdateClean` if caching issues occur

---

## Related Documentation

- **Git Workflow:** `docs/development/GIT_WORKFLOW.md`
- **Migration Guide:** `archive/deprecated_commit_scripts_2025-11-27/README.md`
- **Consolidation Summary:** `archive/deprecated_commit_scripts_2025-11-27/CONSOLIDATION_SUMMARY_2025-11-27.md`
- **Native Development:** `NATIVE.ps1 --Help`
- **Docker Deployment:** `DOCKER.ps1 --Help`
- **Architecture:** `docs/ARCHITECTURE.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-11-27 | Rewrote for COMMIT_READY.ps1 consolidation |
|       |            | - Updated all commands and examples |
|       |            | - Added migration guide references |
|       |            | - Documented new modes and auto-fix |
| 1.0.0 | 2025-11-25 | Initial release (deprecated) |
|       |            | - Documented PRE_COMMIT_CHECK.ps1 |

---

**Last Updated:** 2025-11-27  
**Version:** 2.0.0  
**Script:** COMMIT_READY.ps1
