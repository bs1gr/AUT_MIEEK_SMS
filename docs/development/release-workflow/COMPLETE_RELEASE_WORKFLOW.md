# Complete Release Workflow - Prerequisites & Execution Guide

## Overview

The complete release process now includes comprehensive prerequisite checking to ensure code quality before releasing.

## 🚀 Three-Phase Release Process

```
PHASE 1: PREPARE      PHASE 1.5: DOCS       PHASE 2: RELEASE      PHASE 3: MONITOR
(15-40 min)           (2-5 min)             (1 min)               (20 min)
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Prerequisites │     │ Generate Docs │     │ Execute       │     │ GitHub Actions│
├───────────────┤     ├───────────────┤     ├───────────────┤     ├───────────────┤
│ ✓ Git status  │     │ ✓ Analyze     │     │ RELEASE_READY │     │ ✓ Release     │
│ ✓ Version     │ ──→ │   commits     │ ──→ │ -ReleaseVer   │ ──→ │ ✓ Installer   │
│ ✓ Pre-commit  │     │ ✓ CHANGELOG   │     │ -TagRelease   │     │ ✓ SHA256      │
│ ✓ Tests       │     │ ✓ Notes       │     │               │     │ ✓ Complete    │
│ ✓ Installer   │     │ ✓ Commit docs │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
         ↓                     ↓                     ↓
   READY FOR DOCS        DOCS COMMITTED        TAG PUSHED
```

---

## Phase 1: Prepare Your Codebase (15-40 minutes)

### Quick Start
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

### What It Does

The `RELEASE_PREPARATION.ps1` script performs 8 critical checks:

1. **Git Status Check** (2 min)
   - Verifies working tree is clean
   - Confirms you're on main branch
   - Checks against remote

2. **Remote Update** (1 min)
   - Fetches latest from GitHub
   - Ensures you have all changes

3. **Version Verification** (2 min)
   - Via: `.\scripts\VERIFY_VERSION.ps1 -AutoFix`
   - Checks all version files match:
     - VERSION
     - pyproject.toml
     - frontend/package.json
     - installer/config.ini
   - Auto-fixes mismatches if enabled

4. **Pre-Commit Checks** (3 min)
   - Via: `.\COMMIT_READY.ps1 -Quick`
   - Code formatting (ruff format)
   - Linting (ruff check --fix)
   - Import organization
   - Smoke tests
   - Auto-fixes issues

5. **Backend Tests** (5-10 min, Full mode only)
   - Via: `python -m pytest -q`
   - Runs all backend tests
   - Verifies no regressions

6. **Frontend Checks** (optional)
   - Frontend readiness verification
   - Not run by default (time-consuming)

7. **Installer Builder Verification** (1 min)
   - Verifies INSTALLER_BUILDER.ps1 exists
   - Checks prerequisites are available

8. **Final Checks** (1 min)
   - Displays current version
   - Shows branch status
   - Final validation

### Running Preparation

**Quick Mode (Recommended)**:
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick
# Time: 5-10 minutes
# Includes: Git, version, pre-commit, installer checks (no tests)
```

**Full Mode (Thorough)**:
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Full
# Time: 20-40 minutes
# Includes: All above + backend tests + frontend checks
```

**With Auto-Fix**:
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
# Auto-fixes version inconsistencies and formatting issues
```

### Expected Output

```
╔════════════════════════════════════════╗
║   Release Preparation - SMS            ║
╚════════════════════════════════════════╝

Mode: Quick

[1/8] Checking git status...
✓ Working tree clean

[2/8] Updating from remote...
✓ Fetched latest from remote

[3/8] Verifying version consistency...
✓ Version consistency verified

[4/8] Running pre-commit checks...
✓ Pre-commit checks passed

[5/8] Running backend tests...
ℹ️  Skipped in Quick mode (use -Mode Full for tests)

[6/8] Checking frontend...
ℹ️  Skipped in Quick mode (use -Mode Full for tests)

[7/8] Verifying installer builder...
✓ Installer builder script found

[8/8] Final preparation checks...
ℹ️  Current version: 1.12.8
✓ All final checks complete

╔════════════════════════════════════════╗
║   ✓ Ready for Release                  ║
╚════════════════════════════════════════╝

Next steps:
1. Run release:
   .\RELEASE_READY.ps1 -ReleaseVersion 1.12.9 -TagRelease

2. Monitor GitHub Actions:
   https://github.com/bs1gr/AUT_MIEEK_SMS/actions

3. Verify release:
   https://github.com/bs1gr/AUT_MIEEK_SMS/releases
```

### If Preparation Fails

Each failure is descriptive and actionable:

```
❌ Pre-commit checks failed
   → Check the error messages above
   → Issues are usually formatting or linting
   → Run: .\COMMIT_READY.ps1 -Quick (manually)
   → Then re-run preparation
```

### Handling Auto-Fix

If you enable `--AutoFix`:
1. Version inconsistencies are auto-corrected
2. Code formatting is applied
3. Imports are organized
4. Issues are committed automatically

Example:
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
# Auto-fixes issues and continues
# Much faster recovery from common problems
```

---

## Phase 2: Execute Release (1 minute)

### One-Command Release

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.9 -TagRelease
```

### What Happens

1. **Local Operations** (1 min):
   - Updates version files to 1.12.9
   - Runs final COMMIT_READY -Quick check
   - Commits changes: "chore(release): bump version to 1.12.9..."
   - Pushes to main branch
   - Creates and pushes tag v1.12.9

2. **GitHub Actions Triggered**:
   - release-on-tag.yml runs
   - Creates GitHub Release (published)
   - Automatically dispatches installer workflow

### Expected Output

```
Release 1.12.9 is ready and pushed!
✓ Version files updated
✓ Code validated
✓ Changes committed
✓ Tag created and pushed

→ GitHub Actions will now:
  1. Create GitHub Release v1.12.9
  2. Build installer
  3. Upload installer to release
```

### Variants

**For Hotfix (Same Version)**:
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.8 -TagRelease
# Force-recreates tag and triggers fresh build
```

**For Version-Only Update (No Tag)**:
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.9
# Updates version, commits, pushes
# Does NOT create tag (do that manually later)
```

---

## Phase 3: Monitor & Verify (20 minutes)

### Watch GitHub Actions

1. Go to: GitHub → Actions tab
2. Look for two workflows:
   - **Create GitHub Release on tag** (1-2 min)
   - **Release - Build & Upload Installer with SHA256** (15-20 min)

### Workflow Steps

**release-on-tag.yml**:
```
✓ create-release: Creates GitHub Release
✓ trigger-installer-build: Dispatches installer workflow
```

**release-installer-with-sha.yml**:
```
✓ resolve-tag: Determines version
✓ build-installer: Builds the installer
✓ upload-asset: Uploads to release
✓ create-summary: Generates SHA256 info
```

### Verify Result

**Check Release Page**:
1. GitHub → Releases tab
2. Find v1.12.9
3. Should contain:
   - Release notes
   - SMS_Installer_v1.12.9.exe (in Assets)
   - SHA256 hash (in notes)

**Download & Verify**:
```powershell
# Download installer
gh release download v1.12.9 --pattern "*.exe"

# Verify SHA256
(Get-FileHash SMS_Installer_v1.12.9.exe -Algorithm SHA256).Hash
# Should match hash in release notes
```

---

## Complete Example Walkthrough

### Scenario: Release v1.13.0

**Step 1: Prepare** (10 min)
```powershell
C:\SMS\student-management-system> .\RELEASE_PREPARATION.ps1 -Mode Quick

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
ℹ️  Current version: 1.12.9
✓ All final checks complete

╔════════════════════════════════════════╗
║   ✓ Ready for Release                  ║
╚════════════════════════════════════════╝
```

**Step 2: Release** (1 min)
```powershell
C:\SMS\student-management-system> .\RELEASE_READY.ps1 -ReleaseVersion 1.13.0 -TagRelease

Updating version files...
✓ VERSION: 1.13.0
✓ pyproject.toml: 1.13.0
✓ package.json: 1.13.0

Running COMMIT_READY.ps1 -Quick...
✓ Format: OK
✓ Lint: OK
✓ Smoke tests: OK

Committing changes...
✓ Committed: chore(release): bump version to 1.13.0

Pushing main branch...
✓ Pushed to origin

Creating tag v1.13.0...
✓ Tag created and pushed

Release 1.13.0 is ready and pushed!
→ GitHub Actions workflows are now running
```

**Step 3: Monitor** (20 min)
```
GitHub Actions:
1. Create GitHub Release on tag - RUNNING
   └─ create-release ✓ Complete
   └─ trigger-installer-build ✓ Complete

2. Release - Build & Upload Installer with SHA256 - RUNNING
   └─ resolve-tag ✓ Complete
   └─ build-installer ⏳ In Progress (5 min remaining)
   └─ upload-asset ⏳ Waiting
   └─ create-summary ⏳ Waiting
```

**Step 4: Verify** (< 1 min)
```
GitHub Release Page:
✓ v1.13.0 published
✓ Release notes visible
✓ SMS_Installer_v1.13.0.exe uploaded (156 MB)
✓ SHA256: abc123def456...

PowerShell Verification:
(Get-FileHash SMS_Installer_v1.13.0.exe -Algorithm SHA256).Hash
Result: abc123def456...
✓ Matches! Release is valid.
```

---

## Prerequisites Summary

Before running RELEASE_READY.ps1, RELEASE_PREPARATION.ps1 ensures:

| Check | Script | What It Does |
|-------|--------|--------------|
| **Git Status** | git status | Clean tree, on main |
| **Version Sync** | VERIFY_VERSION.ps1 | All version files match |
| **Code Quality** | COMMIT_READY.ps1 | Format, lint, organize |
| **Tests** | pytest + npm test | No regressions |
| **Installer Ready** | INSTALLER_BUILDER.ps1 | Can build installer |

---

## Failure Scenarios & Recovery

### Scenario 1: Pre-Commit Fails
```
❌ Pre-commit checks failed

Recovery:
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
# Auto-fixes issues and retries
```

### Scenario 2: Version Mismatch
```
❌ Version consistency check failed

Recovery:
.\scripts\VERIFY_VERSION.ps1 -AutoFix
git add .
git commit -m "chore: sync version references"
git push origin main
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

### Scenario 3: Test Fails
```
❌ Backend tests failed: test_api.py::test_login FAILED

Recovery:
# Fix the code
cd backend
python -m pytest -q -x  # Stop on first failure
# Fix the issue, then:
.\RELEASE_PREPARATION.ps1 -Mode Quick
```

### Scenario 4: Already Released
```
Release 1.12.8 already exists

Recovery:
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.8 -TagRelease
# Forces tag recreation and fresh build
```

---

## Time Breakdown

| Phase | Mode | Time | Notes |
|-------|------|------|-------|
| **Prepare** | Quick | 5-10 min | No tests, fastest |
| **Prepare** | Full | 20-40 min | All checks + tests |
| **Release** | Any | 1 min | Just execute script |
| **Monitor** | Any | 20 min | Watch GitHub Actions |
| **Total** | Quick | 26 min | Typical scenario |
| **Total** | Full | 40-60 min | Most thorough |

---

## Best Practices

1. **Always run preparation first**
   ```powershell
   .\RELEASE_PREPARATION.ps1 -Mode Quick
   # Takes 5-10 min, saves you from problems
   ```

2. **Use Quick mode for normal releases**
   ```powershell
   .\RELEASE_PREPARATION.ps1 -Mode Quick
   # Tests take too long, pre-commit catches issues
   ```

3. **Use Full mode for major releases**
   ```powershell
   .\RELEASE_PREPARATION.ps1 -Mode Full
   # More thorough, ensures everything works
   ```

4. **Commit before releasing**
   ```powershell
   git status  # Must be clean
   # No uncommitted changes
   ```

5. **Use -AutoFix for common issues**
   ```powershell
   .\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
   # Fixes formatting, linting, versions automatically
   ```

---

## Documentation Reference

- **Quick Start**: [QUICK_RELEASE_GUIDE.md](./QUICK_RELEASE_GUIDE.md)
- **Detailed Prep**: [RELEASE_PREPARATION_CHECKLIST.md](./RELEASE_PREPARATION_CHECKLIST.md)
- **Commands**: [RELEASE_COMMAND_REFERENCE.md](./RELEASE_COMMAND_REFERENCE.md)
- **Troubleshooting**: [WORKFLOW_TRIGGERING_IMPROVEMENTS.md](./WORKFLOW_TRIGGERING_IMPROVEMENTS.md)
- **Architecture**: [WORKFLOW_ARCHITECTURE_DETAILED.md](./WORKFLOW_ARCHITECTURE_DETAILED.md)

---

**Status**: ✅ Complete with comprehensive prerequisites
**Readiness**: ✅ Production ready
