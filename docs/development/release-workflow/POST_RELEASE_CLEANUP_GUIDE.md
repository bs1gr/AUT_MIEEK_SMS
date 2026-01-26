# Post-Release Cleanup Guide

## Overview

After completing a release, use **post-release mode** to organize artifacts and residual files.

## When to Use

Run this **after** a release completes:

```powershell
# Release completed

.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.13.0"

# GitHub Actions finished (~20 min later)

# Installer built and uploaded to release

# NOW run post-release cleanup

.\WORKSPACE_CLEANUP.ps1 -Mode post-release

```text
## What It Cleans

### 1. Release Notes in Root

```text
RELEASE_NOTES_$11.14.0.md → docs/releases/

```text
If GENERATE_RELEASE_DOCS.ps1 created files in root instead of docs/releases/, they'll be moved.

### 2. GitHub Release Descriptions

```text
GITHUB_RELEASE_$11.14.0.md → docs/releases/

```text
### 3. Installer Executables

```text
StudentManagementSystem_1.13.0_Setup.exe → dist/
SMS_Installer_1.13.0.exe → dist/

```text
Any installer executables in root are moved to `dist/` directory.

### 4. Temporary Release Files

```text
release_commit_msg.txt
release_notes_temp.md
github_release_draft.md

```text
Removes any temporary files created during release process.

### 5. Build Artifacts

Same as standard mode:
- tmp_artifacts/
- tmp_test_migrations/
- artifacts_run_*/

## Complete Post-Release Workflow

```powershell
# 1. Verify release completed successfully

# Check: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest

# 2. Preview cleanup

.\WORKSPACE_CLEANUP.ps1 -Mode post-release -DryRun

# 3. Execute cleanup

.\WORKSPACE_CLEANUP.ps1 -Mode post-release

# 4. Review changes

git status

# 5. Commit

git add -A
git commit -m "chore: post-release cleanup for $11.14.0"
git push origin main

```text
## What Stays in Root

- ✅ CHANGELOG.md (updated with release info)
- ✅ VERSION (current version)
- ✅ README.md
- ✅ All release scripts (RELEASE_*.ps1, GENERATE_RELEASE_DOCS.ps1)
- ✅ Release guides (QUICK_RELEASE_GUIDE.md, etc.)

## Directory Structure After Post-Release Cleanup

```text
student-management-system/
├── docs/
│   └── releases/
│       ├── RELEASE_NOTES_$11.14.0.md     ← Moved here
│       ├── GITHUB_RELEASE_$11.14.0.md    ← Moved here
│       └── (previous release notes...)
├── dist/
│   └── StudentManagementSystem_1.13.0_Setup.exe  ← Moved here
├── CHANGELOG.md                          ← Updated, stays in root
├── VERSION                               ← Updated to 1.13.0
├── QUICK_RELEASE_GUIDE.md               ← Stays in root
└── (other essential files...)

```text
## Integration with Release Process

### Full Release Cycle

```powershell
# STEP 1: Pre-Release

.\WORKSPACE_CLEANUP.ps1 -Mode deep        # Clean before release
.\RELEASE_PREPARATION.ps1 -Mode Quick     # Validate ready

# STEP 2: Release

.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.13.0"

# STEP 3: Wait for GitHub Actions

# Monitor build progress (~20 minutes)

# STEP 4: Post-Release

.\WORKSPACE_CLEANUP.ps1 -Mode post-release  # Organize artifacts
git add -A && git commit -m "chore: post-release cleanup"
git push origin main

```text
## Comparison with Other Modes

| Mode | When to Use | What It Cleans | Time |
|------|-------------|----------------|------|
| **quick** | Daily commits | Temp files only | 2 min |
| **standard** | Before releases | Temp + organize docs | 5 min |
| **deep** | Major releases | + Python caches | 10 min |
| **post-release** | After release completes | Release artifacts | 3 min |

## Benefits

1. **Organized releases** - All release docs in one place
2. **Clean root** - No release artifacts cluttering workspace
3. **Proper archival** - Release notes properly stored
4. **Consistent structure** - Every release follows same pattern

## Example Output

```text
╔═══════════════════════════════════════════════════════╗
║  PHASE 3.5: Post-Release Cleanup
╚═══════════════════════════════════════════════════════╝

--- Release Artifacts in Root ---
✓ Moved: Release notes: RELEASE_NOTES_$11.14.0.md
✓ Moved: GitHub release: GITHUB_RELEASE_$11.14.0.md

--- Installer Artifacts ---
✓ Moved: Installer: StudentManagementSystem_1.13.0_Setup.exe

--- Temporary Release Files ---
  ○ Not found: release_commit_msg.txt
  ○ Not found: release_notes_temp.md

╔═══════════════════════════════════════════════════════╗
║  PHASE 4: Build Artifacts & Caches
╚═══════════════════════════════════════════════════════╝

--- Temporary Directories ---
✓ Removed: Temp directory: tmp_artifacts (1.2 MB)

╔═══════════════════════════════════════════════════════╗
║  CLEANUP SUMMARY
╚═══════════════════════════════════════════════════════╝

Mode: post-release
Items removed: 1
Items moved: 3
Space freed: 1.2 MB

✓ Workspace cleanup complete!

```text
---

**Status**: Ready to use
**Version**: 1.1
**Part of**: Complete release workflow
