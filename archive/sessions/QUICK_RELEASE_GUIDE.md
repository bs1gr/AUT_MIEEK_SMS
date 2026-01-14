# Quick Release Guide - v1.12.8+

## Complete Release Process (3 Steps)

### Step 1: Prepare Your Codebase (15-40 min)

```powershell
# Quick preparation (recommended)
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Or full preparation with all tests
.\RELEASE_PREPARATION.ps1 -Mode Full

# Or manual step-by-step
git fetch origin && git pull origin main
.\scripts\VERIFY_VERSION.ps1 -AutoFix
.\COMMIT_READY.ps1 -Quick
cd backend && python -m pytest -q
```

**What this does**:
- ✅ Verifies clean git state
- ✅ Updates from remote
- ✅ Checks version consistency
- ✅ Runs code formatting & linting (auto-fixes)
- ✅ Runs tests
- ✅ Verifies installer builder works

**Expected Result**: "Ready for Release" message

---

### Step 2: Generate Documentation (2-5 min)

```powershell
# Generate release notes and update CHANGELOG
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.12.9"

# Commit and push documentation
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for v1.12.9"
git push origin main
```

**What this does**:
- ✅ Analyzes commits since last tag
- ✅ Generates release notes
- ✅ Updates CHANGELOG.md
- ✅ Creates GitHub release description

**Expected Result**: Documentation committed to main

---

### Step 3: Execute Release (1 minute)

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.9 -TagRelease
```

That's it. The workflows handle everything else.

---

### Step 4: Monitor & Verify (20 min)

Monitor GitHub Actions and add release description.

## What Happens Automatically

After you run Step 3 above:

1. ✅ **Local Machine**
   - Version files updated
   - Code formatted & linted (with auto-fix)
   - Changes committed
   - Tag created and pushed

2. ✅ **GitHub Actions - release-on-tag.yml**
   - GitHub Release created (or updated if re-releasing)
   - Installer build workflow automatically triggered

3. ✅ **GitHub Actions - release-installer-with-sha.yml**
   - Installer built (Windows, code-signed if available)
   - SHA256 hash calculated
   - Uploaded to GitHub Release as asset
   - Summary with integrity verification info

## For Hotfixes (Re-release Same Version)

```powershell
# Make your fix
git add .
git commit -m "fix: description"
git push origin main

# Re-release with same version number
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.8 -TagRelease

# This will:
# - Force-delete and recreate the tag
# - Trigger fresh installer build
# - Upload new installer to existing release
```

## Manual Installer Build (if needed)

**GitHub UI:**
1. Go to Actions
2. Click "Release - Build & Upload Installer with SHA256"
3. Click "Run workflow"
4. Leave "tag" empty to use latest release, or enter specific tag

**PowerShell:**
```powershell
gh workflow run "release-installer-with-sha.yml" -f tag=v1.12.8
```

## Verify Release Success

**GitHub Release Page:**
- Check assets section has `SMS_Installer_v1.12.x.exe`
- Note the SHA256 from release notes

**Verify Installer:**
```powershell
(Get-FileHash 'SMS_Installer_v1.12.8.exe' -Algorithm SHA256).Hash
# Should match the SHA256 in release notes
```

## Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| "Pre-commit validation failed" | Run again (has auto-retry now) |
| Installer not in release | Check installer workflow logs, manually trigger if needed |
| Version mismatch errors | Run `.\COMMIT_READY.ps1 -Quick` before `RELEASE_READY.ps1` |
| Tag already exists | Use `RELEASE_READY.ps1 -TagRelease` (now force-recreates) |

## Key Files

- [Full Documentation](./WORKFLOW_TRIGGERING_IMPROVEMENTS.md)
- [RELEASE_READY.ps1](./RELEASE_READY.ps1) - Main release script
- [.github/workflows/release-on-tag.yml](.github/workflows/release-on-tag.yml) - Release creation
- [.github/workflows/release-installer-with-sha.yml](.github/workflows/release-installer-with-sha.yml) - Installer build
