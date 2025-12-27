# Release Command Reference

Quick lookup for common release scenarios.

## � Pre-Release Setup (Run First!)

### Automatic Preparation

```powershell
# Quick (recommended - 5-10 min)
.\RELEASE_PREPARATION.ps1 -Mode Quick

# Full (with all tests - 20-40 min)
.\RELEASE_PREPARATION.ps1 -Mode Full

# With auto-fix for version issues
.\RELEASE_PREPARATION.ps1 -Mode Quick -AutoFix
```

**What it does**:
✅ Git status & fetch
✅ Version verification
✅ Pre-commit checks (format, lint)
✅ Tests (backend in Full mode)
✅ Installer builder check

**You'll see**: "Ready for Release" message

---

### Manual Preparation (if not using script)

```powershell
# 1. Update from remote
git fetch origin
git pull origin main

# 2. Verify versions match
.\scripts\VERIFY_VERSION.ps1 -AutoFix

# 3. Run pre-commit
.\COMMIT_READY.ps1 -Quick

# 4. Run tests
cd backend && python -m pytest -q

# 5. Check installer
Test-Path ".\INSTALLER_BUILDER.ps1"
```

---
## 📝 Documentation Generation

### Automatic Documentation

```powershell
# Auto-detect version from VERSION file
.\GENERATE_RELEASE_DOCS.ps1

# Or specify version
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0"

# Preview before generating
.\GENERATE_RELEASE_DOCS.ps1 -Preview
```

**What it creates**:
- `docs/releases/RELEASE_NOTES_v1.13.0.md` - Detailed release notes
- `CHANGELOG.md` - Updated with new entry
- `docs/releases/GITHUB_RELEASE_v1.13.0.md` - GitHub description

**Then commit**:
```powershell
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for v1.13.0"
git push origin main
```

---
## �🚀 Standard Release (New Version)

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.13.0 -TagRelease
```

**What happens**:
1. Updates all version files to 1.13.0
2. Formats and lints code (auto-fixes issues)
3. Commits "chore(release): bump version to 1.13.0..."
4. Creates and pushes tag v1.13.0
5. GitHub Actions automatically:
   - Creates GitHub Release
   - Builds installer
   - Uploads to release page

**Expected duration**: ~25 minutes total (20 min installer build)

---

## 🔧 Hotfix Release (Same Version, New Build)

Example: You built v1.12.8, but the installer had an issue. You fixed it and want to rebuild.

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.8 -TagRelease
```

**What happens**:
1. Detects tag v1.12.8 already exists
2. Force-deletes local tag
3. Checks if remote tag exists, force-deletes if needed
4. Creates new tag v1.12.8
5. Force-pushes to origin (overwrites)
6. GitHub Actions automatically:
   - Updates existing GitHub Release
   - Builds new installer
   - Uploads new installer (overwrites old)

**Note**: Don't do this unless you actually fixed something. Git history will show force-push.

---

## 📋 Version Update Only (No Tag)

Just update version files and commit, no release yet.

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.13.0
```

**What happens**:
1. Updates version files
2. Runs COMMIT_READY -Quick
3. Commits and pushes to main
4. ⚠️ Does NOT create a tag

**Use when**: Preparing release but want to test first, or staging multiple commits.

**Then later, create tag**:
```powershell
git tag v1.13.0
git push origin v1.13.0
```

---

## 🐛 Pre-commit Validation Fails? Auto-Recovery Now

```powershell
.\RELEASE_READY.ps1 -ReleaseVersion 1.13.0 -TagRelease
```

If COMMIT_READY -Quick fails:
- ✅ Auto-stages fixes
- ✅ Automatically retries validation
- ✅ Continues if second attempt succeeds
- ❌ Only aborts if both attempts fail

**If still failing**:
```powershell
# See what's wrong
.\COMMIT_READY.ps1 -Quick

# Manually fix (if auto-fix didn't work)
# Then retry
.\RELEASE_READY.ps1 -ReleaseVersion 1.13.0 -TagRelease
```

---

## 🎯 Manual Installer Build (No Release)

Build installer without touching releases or tags.

**Option A**: From PowerShell
```powershell
cd backend
# Ensure backend builds correctly (optional)
cd ..

# Run just the installer script
.\INSTALLER_BUILDER.ps1 -AutoFix
```

**Option B**: From GitHub Actions (Recommended for Windows)
1. Go to: **Actions** tab
2. Click: **Release - Build & Upload Installer with SHA256**
3. Click: **Run workflow** button
4. Input: Leave tag empty (uses latest) or enter specific tag (e.g., v1.12.8)
5. Click: **Run workflow**
6. Monitor the run, see installer details in summary

---

## 📦 Manual Installer Build → Upload to Existing Release

**Scenario**: You have a release but need to rebuild/re-upload installer.

**Option A**: Use GitHub Actions
1. Go to: **Actions** → **Release - Build & Upload Installer with SHA256**
2. Click: **Run workflow**
3. Enter tag: `v1.12.8` (the exact release tag)
4. Monitor build
5. Installer automatically uploads to that release

**Option B**: Manual local build + upload
```powershell
# Build locally
.\INSTALLER_BUILDER.ps1 -AutoFix

# Find the installer
Get-ChildItem -Recurse -Filter "SMS_Installer*.exe" | Select-Object -First 1

# Calculate SHA256
$installer = "path/to/SMS_Installer_v1.12.8.exe"
(Get-FileHash $installer -Algorithm SHA256).Hash

# Upload to release (requires gh CLI)
gh release upload v1.12.8 $installer --clobber --repo your-owner/your-repo
```

---

## 🔄 Re-release Latest Changes

You pushed code, now want to release it.

```powershell
# Check current version
$content = Get-Content "VERSION" -Raw
Write-Host "Current version: $content"

# Bump version
.\RELEASE_READY.ps1 -ReleaseVersion 1.13.1 -TagRelease
```

Or use the version from VERSION file:
```powershell
$version = (Get-Content "VERSION").Trim()
.\RELEASE_READY.ps1 -ReleaseVersion $version -TagRelease
```

---

## ⚠️ Emergency: Force-Redo v1.12.8 Release

Something went wrong, need fresh build with same version number.

```powershell
# Local cleanup
git tag -d v1.12.8  # Delete local tag

# Remote cleanup (requires push access)
git push origin :refs/tags/v1.12.8  # Delete remote tag

# Or from GitHub, navigate to:
# Releases → v1.12.8 → Click "..." → Delete release

# Fresh release
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.8 -TagRelease
```

**Note**: This is a force-push scenario. Use only when necessary.

---

## 📊 Monitor Release Progress

**Real-time monitoring**:
1. GitHub → **Actions** tab
2. Look for two workflows running:
   - **Create GitHub Release on tag** (1-2 minutes)
   - **Release - Build & Upload Installer with SHA256** (15-20 minutes)
3. Click workflow to see detailed logs

**Check result**:
1. GitHub → **Releases** tab
2. Find the latest release
3. Check "Assets" section:
   - Should have `SMS_Installer_v1.x.x.exe`
   - Should have release notes with SHA256

---

## 🔍 Verify Installer After Release

After release completes:

```powershell
# Download installer from release page or:
# gh release download v1.12.8 --pattern "*.exe"

# Calculate hash
$installer = "SMS_Installer_v1.12.8.exe"
$actualHash = (Get-FileHash $installer -Algorithm SHA256).Hash
Write-Host "Actual:   $actualHash"

# From release page notes, copy the expected hash
# Expected: abc123def456...

# Compare
if ($actualHash -eq "abc123def456...") {
    Write-Host "✅ Hash matches! Installer is valid."
} else {
    Write-Host "❌ Hash mismatch! Installer may be corrupted."
}
```

---

## 🎓 Learning: How Workflows Trigger

After you push a tag, GitHub automatically:

1. Detects tag push (`v*` pattern)
2. Runs `release-on-tag.yml` workflow
3. That workflow creates a GitHub Release
4. Then it automatically dispatches `release-installer-with-sha.yml`
5. Installer workflow receives tag as input
6. Builds and uploads to the release

**You don't need to do anything after step 1** (push tag). Everything else is automatic.

---

## 🚨 Troubleshooting Quick Guide

| Problem | Solution |
|---------|----------|
| Pre-commit fails with formatting errors | Run again (has auto-retry now) or manually run `COMMIT_READY.ps1 -Quick` |
| Can't create tag: already exists | Use `RELEASE_READY.ps1 -TagRelease` (now handles this) |
| Installer not in release assets | Check installer workflow logs in Actions, manually trigger if needed |
| Release event didn't trigger | Check tag format (`v*`), use manual dispatch as backup |
| SHA256 doesn't match | Rebuild using GitHub Actions, don't use cached local build |
| Need to redo a release | Delete tag locally/remotely, then `RELEASE_READY.ps1 -ReleaseVersion x.y.z -TagRelease` |

---

## 📝 Example Workflow: Complete Release

```powershell
# 1. Check what needs updating
git status
git diff

# 2. Make any final changes
# (update docs, fix last bugs, etc.)
git add .
git commit -m "docs: update README for v1.13.0"
git push origin main

# 3. Start release process
.\RELEASE_READY.ps1 -ReleaseVersion 1.13.0 -TagRelease
# This outputs: "Release 1.13.0 is ready and pushed!"

# 4. Monitor in GitHub (automatic)
# - Open GitHub Actions tab
# - Watch "Create GitHub Release on tag" start
# - Then "Release - Build & Upload Installer" starts
# - Takes ~20 minutes total

# 5. Verify completion
# - Go to Releases tab
# - Find v1.13.0
# - See SMS_Installer_v1.13.0.exe in Assets
# - See SHA256 in release notes

# 6. Announce
# Twitter/Discord: "v1.13.0 released! Download installer from GitHub releases."
# Include SHA256 for verification
```

---

## 💡 Pro Tips

1. **Always use `RELEASE_READY.ps1`** - Don't manually create tags
2. **Let workflows finish** - Don't manually build installer when workflows are running
3. **Monitor first release** - Watch workflows to understand the process
4. **Verify SHA256** - Always check installer integrity on release
5. **Tag format matters** - Must be `v*` (e.g., `v1.12.8`, `v2.0.0`)
6. **Commit before release** - All changes should be in git before running release script
7. **One release at a time** - Don't trigger multiple releases simultaneously

---

## 🆘 Getting Help

- **Workflow issues**: Check GitHub Actions logs
- **Build issues**: Check installer workflow step logs
- **Version issues**: Run `.\scripts\VERIFY_VERSION.ps1`
- **Pre-commit issues**: Run `.\COMMIT_READY.ps1 -Quick` locally
- **General help**: See `QUICK_RELEASE_GUIDE.md` or `WORKFLOW_TRIGGERING_IMPROVEMENTS.md`
