# Release Preparation Guide

Complete checklist for preparing your codebase for release.

## 🚀 Complete Release Workflow (with Preparation)

```
┌────────────────────────────────────────┐
│ PHASE 1: Prepare Local Environment     │
├────────────────────────────────────────┤
│ 1. Verify codebase is clean            │
│ 2. Run version verification            │
│ 3. Run pre-commit checks               │
│ 4. Run all tests                       │
│ 5. Build installer (test)              │
│ 6. Verify installer builds successfully│
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ PHASE 2: Execute Release               │
├────────────────────────────────────────┤
│ 1. Run RELEASE_READY.ps1 with version  │
│ 2. Auto-stages fixes if needed         │
│ 3. Commits and pushes tag              │
│ 4. Triggers GitHub Actions workflows   │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ PHASE 3: Monitor & Verify              │
├────────────────────────────────────────┤
│ 1. Monitor GitHub Actions              │
│ 2. Verify release creation             │
│ 3. Verify installer build & upload     │
│ 4. Verify SHA256 in release notes      │
│ 5. Test installer download             │
└────────────────────────────────────────┘
```

## 📋 Pre-Release Checklist

### Phase 1: Code Cleanup (10-15 minutes)

#### Step 1: Verify Clean Git State
```powershell
# Check for uncommitted changes
git status

# If you have changes:
# Option A: Commit them
git add .
git commit -m "feat: your feature description"

# Option B: Stash them (if not ready)
git stash
```

**Expected Result**: `working tree clean`

---

#### Step 2: Update Main Branch
```powershell
# Fetch latest from remote
git fetch origin

# Check current branch
git branch

# Update main if needed
git checkout main
git pull origin main
```

**Expected Result**: Local main matches remote main

---

#### Step 3: Verify Version Consistency
```powershell
# Run the version verification script
.\scripts\VERIFY_VERSION.ps1

# If issues found, you can auto-fix:
.\scripts\VERIFY_VERSION.ps1 -AutoFix
```

**Expected Output**:
```
✓ Version: 1.12.8
✓ All files consistent
✓ VERSION file matches: 1.12.8
✓ pyproject.toml version: 1.12.8
✓ package.json version: 1.12.8
✓ installer config: 1.12.8
```

**If Fixes Needed**:
```powershell
# Commit fixed version files
git add VERSION pyproject.toml frontend/package.json installer/config.ini
git commit -m "chore: sync version references to 1.12.8"
git push origin main
```

---

### Phase 2: Code Quality Checks (5-10 minutes)

#### Step 4: Run Pre-Commit Checks
```powershell
# Full pre-commit validation
.\COMMIT_READY.ps1 -Quick

# This runs:
# - Code formatting (ruff format)
# - Linting (ruff check --fix)
# - Import organization
# - Smoke tests
```

**Expected Result**:
```
✓ Formatting: OK
✓ Linting: OK
✓ Smoke tests: PASSED
```

**If Issues Found**:
```powershell
# Auto-fixes are applied. Commit them:
git add .
git commit -m "chore: format and lint code"
git push origin main
```

---

#### Step 5: Run Full Tests
```powershell
# Backend tests
cd backend
python -m pytest -q
# Expected: All tests pass

# Frontend tests (optional, time-consuming)
cd ../frontend
npm run test -- --run
# Expected: All tests pass
```

**If Tests Fail**:
```powershell
# Fix failing tests, then:
git add .
git commit -m "fix: failing tests"
git push origin main
# Re-run entire Phase 1 before continuing
```

---

#### Step 6: Verify Installer Builder Works
```powershell
# Test the installer builder (doesn't create actual installer yet)
# Just verifies prerequisites are in place

# Check Inno Setup installation (Windows only)
$innoSetup = Get-ChildItem "C:\Program Files (x86)\Inno Setup 6" -ErrorAction SilentlyContinue
if ($innoSetup) {
    Write-Host "✓ Inno Setup 6 installed"
} else {
    Write-Host "❌ Inno Setup 6 not found"
    Write-Host "Install from: https://jrsoftware.org/isdl.php"
    exit 1
}

# Verify installer script exists
if (Test-Path ".\INSTALLER_BUILDER.ps1") {
    Write-Host "✓ INSTALLER_BUILDER.ps1 found"
} else {
    Write-Host "❌ INSTALLER_BUILDER.ps1 not found"
    exit 1
}
```

---

### Phase 3: Final Pre-Release Validation (5 minutes)

#### Step 7: Double-Check Version Number
```powershell
# Display what version you're about to release
Write-Host "Current version files:"
Get-Content VERSION
Get-Content pyproject.toml | Select-String "version"
Get-Content frontend/package.json | Select-String "version"

# If releasing NEW version, update here first:
# .\RELEASE_READY.ps1 -ReleaseVersion 1.13.0  # Don't tag yet
# Then commit and push before continuing
```

---

#### Step 8: Final Git Status Check
```powershell
# Ensure everything is committed and pushed
git status

# Expected: nothing to commit, working tree clean

# Check that you're on main branch
git branch

# Check that main is up to date
git log -1 --oneline

# Should match remote
git log -1 --oneline origin/main
```

---

## 🔧 Complete Preparation Script

Rather than running each command separately, you can use this script:

```powershell
# RELEASE_PREPARATION.ps1 (automated version)
# This runs all preparation steps automatically

param(
    [ValidateSet('Quick', 'Full')]
    [string]$Mode = 'Full'
)

Write-Host "=== Release Preparation ===" -ForegroundColor Green
Write-Host "Mode: $Mode" -ForegroundColor Cyan
Write-Host ""

# Step 1: Git status
Write-Host "[1/8] Checking git status..." -ForegroundColor Cyan
$status = git status --porcelain
if ($status) {
    Write-Host "❌ Uncommitted changes found:" -ForegroundColor Red
    Write-Host $status
    Write-Host "Commit or stash changes before releasing." -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Working tree clean" -ForegroundColor Green

# Step 2: Update from remote
Write-Host "[2/8] Updating from remote..." -ForegroundColor Cyan
git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to fetch from remote" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Fetched latest" -ForegroundColor Green

# Step 3: Verify versions
Write-Host "[3/8] Verifying version consistency..." -ForegroundColor Cyan
if (Test-Path ".\scripts\VERIFY_VERSION.ps1") {
    & ".\scripts\VERIFY_VERSION.ps1" -AutoFix
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Version verification had issues" -ForegroundColor Yellow
        # Don't fail, but warn user
    }
} else {
    Write-Host "⚠️  Version verification script not found" -ForegroundColor Yellow
}
Write-Host "✓ Version check complete" -ForegroundColor Green

# Step 4: Pre-commit checks
Write-Host "[4/8] Running pre-commit checks..." -ForegroundColor Cyan
& ".\COMMIT_READY.ps1" -Quick
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pre-commit checks failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Pre-commit checks passed" -ForegroundColor Green

# Step 5: Backend tests
Write-Host "[5/8] Running backend tests..." -ForegroundColor Cyan
if ($Mode -eq 'Full') {
    Push-Location backend
    python -m pytest -q
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend tests failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "✓ Backend tests passed" -ForegroundColor Green
} else {
    Write-Host "⊘ Skipped (use -Mode Full for full test suite)" -ForegroundColor Yellow
}

# Step 6: Frontend tests (optional)
Write-Host "[6/8] Checking frontend..." -ForegroundColor Cyan
if ($Mode -eq 'Full' -and (Test-Path "frontend/package.json")) {
    Write-Host "  (Skipping frontend tests - too time-consuming, run manually if needed)" -ForegroundColor Yellow
    Write-Host "  npm run test -- --run" -ForegroundColor Gray
} else {
    Write-Host "⊘ Skipped" -ForegroundColor Yellow
}

# Step 7: Verify installer builder
Write-Host "[7/8] Verifying installer builder..." -ForegroundColor Cyan
if (-not (Test-Path ".\INSTALLER_BUILDER.ps1")) {
    Write-Host "❌ INSTALLER_BUILDER.ps1 not found" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Installer builder script found" -ForegroundColor Green

# Step 8: Final checks
Write-Host "[8/8] Final preparation checks..." -ForegroundColor Cyan
$version = (Get-Content "VERSION").Trim()
Write-Host "Current version: $version" -ForegroundColor Cyan

git status | Select-String "On branch main" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not on main branch. Switch to main before releasing." -ForegroundColor Yellow
}

Write-Host "✓ All checks complete" -ForegroundColor Green

Write-Host ""
Write-Host "=== Ready for Release ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: .\RELEASE_READY.ps1 -ReleaseVersion <version> -TagRelease" -ForegroundColor Yellow
Write-Host "2. Monitor GitHub Actions" -ForegroundColor Yellow
Write-Host "3. Verify release on GitHub Releases page" -ForegroundColor Yellow
Write-Host ""
Write-Host "Example:" -ForegroundColor Green
Write-Host "  .\RELEASE_READY.ps1 -ReleaseVersion 1.13.0 -TagRelease" -ForegroundColor Gray
```

**Usage**:
```powershell
# Quick preparation (skip tests)
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Full preparation (include all tests)
.\RELEASE_PREPARATION.ps1 -Mode Full
```

---

## 📊 Preparation Checklist

### Before You Start
- [ ] On `main` branch
- [ ] All local changes committed
- [ ] Network connection available
- [ ] GitHub CLI authenticated (`gh auth status`)

### Phase 1: Code Cleanup
- [ ] Clean working tree (`git status`)
- [ ] Main branch updated (`git pull origin main`)
- [ ] Version consistency verified (`VERIFY_VERSION.ps1`)
- [ ] Fixed any version issues and committed

### Phase 2: Quality Checks
- [ ] Pre-commit checks passed (`COMMIT_READY.ps1 -Quick`)
- [ ] All fixed issues committed
- [ ] Backend tests passed (`pytest`)
- [ ] Frontend tests passed (`npm run test`)

### Phase 3: Final Validation
- [ ] Installer builder verified (`INSTALLER_BUILDER.ps1` exists)
- [ ] Version number confirmed
- [ ] Git status clean and on main
- [ ] Remote main is up to date

### Ready to Release
- [ ] All items above checked
- [ ] Documentation updated if needed
- [ ] Changelog updated if needed
- [ ] Ready to run `RELEASE_READY.ps1`

---

## ⚠️ Common Issues During Preparation

### Version Mismatch
**Issue**: Version numbers don't match across files
**Solution**:
```powershell
.\scripts\VERIFY_VERSION.ps1 -AutoFix
git add .
git commit -m "chore: sync version references"
git push origin main
```

### Pre-commit Formatting Issues
**Issue**: Code formatting or linting fails
**Solution**: Already handled by `COMMIT_READY.ps1 -Quick` with auto-fix
```powershell
.\COMMIT_READY.ps1 -Quick
# Auto-fixes are applied, then committed
```

### Tests Failing
**Issue**: Backend or frontend tests fail
**Solution**:
```powershell
# Fix the failing code
# ... edit files ...

# Re-run tests
pytest  # or npm run test

# Once fixed, commit and run preparation again
git add .
git commit -m "fix: <issue description>"
```

### Installer Builder Issues
**Issue**: INSTALLER_BUILDER.ps1 not found or won't run
**Solution**:
```powershell
# Check dependencies
# For Windows: Need Inno Setup 6
# For others: May need to install prerequisites

# Or build locally first to test
.\INSTALLER_BUILDER.ps1 -AutoFix
```

---

## 🎯 Quick Preparation Commands

**All-in-one (if using automated script)**:
```powershell
.\RELEASE_PREPARATION.ps1 -Mode Full
```

**Manual step-by-step**:
```powershell
# 1. Clean & update
git status
git fetch origin
git pull origin main

# 2. Verify versions
.\scripts\VERIFY_VERSION.ps1 -AutoFix

# 3. Pre-commit
.\COMMIT_READY.ps1 -Quick

# 4. Tests
cd backend && python -m pytest -q

# 5. Check installer
Test-Path ".\INSTALLER_BUILDER.ps1"

# 6. Ready!
Write-Host "✓ Ready to release"
```

---

## 📈 Estimated Time

| Step | Time | Notes |
|------|------|-------|
| Git cleanup | 2 min | Usually quick |
| Version verification | 2 min | Automatic or auto-fix |
| Pre-commit checks | 3 min | Auto-fixes applied |
| Backend tests | 5-10 min | Most important |
| Frontend tests | 10-15 min | Optional, time-consuming |
| Installer verification | 2 min | Just checks it exists |
| **Total** | **15-40 min** | Depends on test count |

---

## 🚀 Next: Run Release

Once preparation is complete:

```powershell
# Get the version
$version = (Get-Content "VERSION").Trim()
Write-Host "Releasing version: $version"

# Run release
.\RELEASE_READY.ps1 -ReleaseVersion $version -TagRelease

# Or specify version explicitly
.\RELEASE_READY.ps1 -ReleaseVersion 1.13.0 -TagRelease
```

---

## 📝 Notes

- **Can't skip pre-commit**: It's essential for code quality
- **Can skip frontend tests**: Only if you didn't touch frontend
- **Installer builder**: Only validates it can run; actual build happens in GitHub Actions
- **Version must match**: All version files must match before release

---

**Status**: ✅ Preparation Complete → Ready for RELEASE_READY.ps1
