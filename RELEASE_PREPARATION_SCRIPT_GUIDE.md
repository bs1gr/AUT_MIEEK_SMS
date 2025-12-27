# RELEASE_PREPARATION.ps1 - Script Documentation

## Overview

`RELEASE_PREPARATION.ps1` is an automated script that validates your codebase for release by running all necessary prerequisite checks.

## Quick Usage

```powershell
# Quick preparation (recommended)
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Full preparation with all tests
.\RELEASE_PREPARATION.ps1 -Mode Full

# With auto-fix for common issues
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
```

## Parameters

### -Mode
Preparation mode - controls which checks run.

**Options**:
- `Quick` (default) - Fast checks, no tests (5-10 min)
- `Full` - All checks including tests (20-40 min)
- `Tests` - Only run test suites (10-20 min)

```powershell
# Quick mode - standard for most releases
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Full mode - thorough check
.\RELEASE_PREPARATION.ps1 -Mode Full

# Tests only - for final validation
.\RELEASE_PREPARATION.ps1 -Mode Tests
```

### -SkipTests
Skip running any tests. Useful if you're confident in code quality.

```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick -SkipTests
```

### -SkipFrontend
Skip frontend tests specifically (saves ~15 minutes).

```powershell
.\RELEASE_PREPARATION.ps1 -Mode Full -SkipFrontend
# Runs all checks except frontend tests
```

### -AutoFix
Automatically fix version inconsistencies and formatting issues.

```powershell
# Auto-fixes version issues and code formatting
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
```

### -Help
Show detailed help information.

```powershell
.\RELEASE_PREPARATION.ps1 -Help
```

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Ready for release |
| 1 | Preparation failed | Check error messages |
| 2 | User cancelled | No action taken |

## Output Format

The script provides color-coded output for easy interpretation:

```
✓ Success (Green)      - Check passed
❌ Error (Red)         - Check failed, abort
⚠️  Warning (Yellow)   - Non-critical issue
ℹ️  Info (Cyan)        - Informational message
⊘ Skipped (Gray)      - Check was skipped
```

## What Each Check Does

### 1. Git Status Check
```
[1/8] Checking git status...

Verifies:
✓ Working tree is clean (no uncommitted changes)
✓ You're on the 'main' branch
✓ Remote is up to date

Result: ✓ Working tree clean
```

**If fails**: Commit or stash changes before releasing.

---

### 2. Remote Update
```
[2/8] Updating from remote...

Verifies:
✓ Fetches latest from GitHub (git fetch origin)
✓ Ensures you have all remote changes

Result: ✓ Fetched latest from remote
```

**If fails**: Check your internet connection and GitHub access.

---

### 3. Version Verification
```
[3/8] Verifying version consistency...

Verifies (via VERIFY_VERSION.ps1):
✓ VERSION file
✓ pyproject.toml
✓ frontend/package.json
✓ installer/config.ini

Result: ✓ Version consistency verified
```

**If fails with -AutoFix**: Auto-corrects mismatches.
**If fails without -AutoFix**: Run `.\scripts\VERIFY_VERSION.ps1 -AutoFix` manually.

---

### 4. Pre-Commit Checks
```
[4/8] Running pre-commit checks...

Verifies (via COMMIT_READY.ps1 -Quick):
✓ Code formatting (ruff format)
✓ Linting (ruff check --fix)
✓ Import organization
✓ Smoke tests

Result: ✓ Pre-commit checks passed
```

**If fails**: Usually auto-fixed. Run again.
**If still fails**: Run `.\COMMIT_READY.ps1 -Quick` manually to see details.

---

### 5. Backend Tests
```
[5/8] Running backend tests...

Verifies (via pytest):
✓ All backend tests pass
✓ No regressions introduced

Result: ✓ Backend tests passed
```

**Skipped in**: Quick mode
**Includes in**: Full mode, Tests mode

**If fails**: Check test output, fix failing code, try again.

---

### 6. Frontend Checks
```
[6/8] Checking frontend...

Verifies:
✓ Frontend directory exists
✓ Frontend is ready for release

Result: ℹ️  Frontend tests not run (too time-consuming)
       Run manually if needed: npm run test -- --run
```

**Note**: Not run by default (takes too long).
**Run manually**: `cd frontend && npm run test -- --run`

---

### 7. Installer Builder Verification
```
[7/8] Verifying installer builder...

Verifies:
✓ INSTALLER_BUILDER.ps1 exists
✓ Script is executable
✓ Prerequisites available

Result: ✓ Installer builder script found
```

**If fails**: Install Inno Setup 6 or check prerequisites.

---

### 8. Final Checks
```
[8/8] Final preparation checks...

Displays:
ℹ️  Current version: 1.12.8

Verifies:
✓ VERSION file exists
✓ Branch status

Result: ✓ All final checks complete
```

---

## Common Workflows

### Workflow 1: Quick Release (Standard)
```powershell
# 5-10 minutes, skips tests
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Expected: "Ready for Release" message
# Then run: .\RELEASE_READY.ps1 -ReleaseVersion x.y.z -TagRelease
```

---

### Workflow 2: Thorough Release
```powershell
# 20-40 minutes, includes all tests
.\RELEASE_PREPARATION.ps1 -Mode Full

# Expected: "Ready for Release" message
# Then run: .\RELEASE_READY.ps1 -ReleaseVersion x.y.z -TagRelease
```

---

### Workflow 3: Quick with Auto-Fix
```powershell
# 5-10 minutes with auto-corrections
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix

# Expected: "Ready for Release" message
# Auto-fixed issues are already committed
# Then run: .\RELEASE_READY.ps1 -ReleaseVersion x.y.z -TagRelease
```

---

### Workflow 4: Test-Only Validation
```powershell
# Just run tests (10-20 minutes)
.\RELEASE_PREPARATION.ps1 -Mode Tests

# Expected: All tests pass
# Useful for final validation before release
```

---

### Workflow 5: Skip Frontend Tests
```powershell
# Full checks but skip frontend tests (~25 min instead of 40)
.\RELEASE_PREPARATION.ps1 -Mode Full -SkipFrontend

# Expected: "Ready for Release" message
# (Except frontend tests which you can run manually if needed)
```

---

## Handling Failures

### Case 1: Version Mismatch
```
❌ Version consistency check failed
   VERSION: 1.12.9
   pyproject.toml: 1.12.8

Solution:
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
# Auto-fixes version files to match

If that doesn't work:
.\scripts\VERIFY_VERSION.ps1 -AutoFix
git add .
git commit -m "chore: sync version references"
git push origin main
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

---

### Case 2: Pre-Commit Fails
```
❌ Pre-commit checks failed
   Formatting issues found in backend/models.py

Solution:
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
# Auto-fixes formatting issues

If that doesn't work:
.\COMMIT_READY.ps1 -Quick
# Shows detailed errors
# Fix manually, then try preparation again
```

---

### Case 3: Tests Fail
```
❌ Backend tests failed
   FAILED backend/tests/test_api.py::test_login

Solution:
# Check the test output above
# Fix the failing code
cd backend
python -m pytest tests/test_api.py::test_login -v
# Debug the specific test

# Once fixed:
git add .
git commit -m "fix: test failure in test_login"
git push origin main
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

---

### Case 4: Git Not Clean
```
❌ Uncommitted changes found:
   M backend/models.py
   ?? new_file.py

Solution:
git status  # See all changes
git add .   # Stage changes
git commit -m "feat: your feature description"
git push origin main
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

---

### Case 5: Not on Main Branch
```
⚠️  You are on branch 'feature/xyz', not 'main'

Solution:
git checkout main
git pull origin main
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

---

## Advanced Options

### Run Help
```powershell
.\RELEASE_PREPARATION.ps1 -Help
# Shows full parameter documentation
```

### Skip All Tests
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick -SkipTests
# Runs: git, version, pre-commit, installer checks only
```

### Only Check Frontend
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Full -SkipTests
# Would check frontend if implemented
# Currently: checks structure, skips npm tests
```

---

## Performance Tips

### Fastest Preparation
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick
# ~5-10 minutes
# Best for frequent releases
```

### Skip Unnecessary Checks
```powershell
# If you only changed frontend:
.\RELEASE_PREPARATION.ps1 -Mode Quick -SkipTests
# Skip backend tests (but still check formatting)

# If you only changed backend:
.\RELEASE_PREPARATION.ps1 -Mode Tests
# Just run backend tests
```

### Parallel Checks (if possible)
```powershell
# Run this in one terminal:
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Run frontend tests separately in another:
cd frontend
npm run test -- --run
```

---

## Integration with Release Process

```
1. Run preparation
   .\RELEASE_PREPARATION.ps1 -Mode Quick

   ↓ (if success)

2. Run release
   .\RELEASE_READY.ps1 -ReleaseVersion x.y.z -TagRelease

   ↓ (automatically)

3. GitHub Actions builds & uploads installer

   ↓ (20 minutes)

4. Release published with installer
```

---

## Troubleshooting

### Script Won't Run
```powershell
# PowerShell execution policy issue
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

### Python Not Found
```powershell
# Make sure Python is installed and in PATH
python --version

# If not:
# Download from https://www.python.org/downloads/
# Or use: choco install python
```

### pytest Not Found
```powershell
# Install pytest in backend environment
cd backend
pip install pytest

.\RELEASE_PREPARATION.ps1 -Mode Quick
```

### npm Not Found
```powershell
# Install Node.js from https://nodejs.org/
# Or: choco install nodejs

.\RELEASE_PREPARATION.ps1 -Mode Quick
```

---

## Requirements

### System
- PowerShell 7.0+ (Core Edition)
- Windows 10/11 or Linux/macOS with PowerShell

### Software
- Git 2.40+
- Python 3.11+ (with pytest)
- Node.js 18+ (with npm, for frontend)
- Inno Setup 6 (for installer building)

### Access
- GitHub account with push access
- Local repository cloned and updated

---

## Examples

**Example 1: Quick Release**
```powershell
C:\SMS> .\RELEASE_PREPARATION.ps1 -Mode Quick
[1/8] Checking git status...
✓ Working tree clean
[2/8] Updating from remote...
✓ Fetched latest from remote
[3/8] Verifying version consistency...
✓ Version consistency verified
[4/8] Running pre-commit checks...
✓ Pre-commit checks passed
[5/8] Running backend tests...
ℹ️  Skipped in Quick mode
[6/8] Checking frontend...
ℹ️  Skipped in Quick mode
[7/8] Verifying installer builder...
✓ Installer builder script found
[8/8] Final preparation checks...
✓ All final checks complete

╔════════════════════════════════════════╗
║   ✓ Ready for Release                  ║
╚════════════════════════════════════════╝
```

**Example 2: Full Release with AutoFix**
```powershell
C:\SMS> .\RELEASE_PREPARATION.ps1 -Mode Full -AutoFix
[1/8] Checking git status...
✓ Working tree clean
[2/8] Updating from remote...
✓ Fetched latest from remote
[3/8] Verifying version consistency...
⚠️  Version verification had issues (auto-fix attempted)
✓ Fixed: pyproject.toml version
[4/8] Running pre-commit checks...
✓ Pre-commit checks passed
[5/8] Running backend tests...
✓ Backend tests passed
[6/8] Checking frontend...
ℹ️  Frontend tests not run by default
[7/8] Verifying installer builder...
✓ Installer builder script found
[8/8] Final preparation checks...
✓ All final checks complete

╔════════════════════════════════════════╗
║   ✓ Ready for Release                  ║
╚════════════════════════════════════════╝
```

---

## Support

If you encounter issues:

1. **Check Script Output**: Messages are descriptive
2. **Run Manually**: Run failing check manually (e.g., `.\COMMIT_READY.ps1 -Quick`)
3. **Check Prerequisites**: Ensure all software is installed
4. **Review Logs**: GitHub Actions logs if workflow fails

---

**Status**: ✅ Complete and documented
**Version**: 1.0
**Maintained**: Yes
