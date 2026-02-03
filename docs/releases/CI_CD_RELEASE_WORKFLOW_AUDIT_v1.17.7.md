# CI/CD Release Workflow Audit - v1.17.7

**Date**: February 3, 2026
**Audit Focus**: GitHub release v1.17.7 publication failure analysis
**Status**: ⚠️ CRITICAL ISSUES IDENTIFIED
**Recommendation**: Unified workflow required

---

## Executive Summary

The GitHub release v1.17.7 was created but **published incomplete**:
- ❌ No assets attached (installer, Docker images, documentation)
- ❌ Minimal release body ("Release v1.17.7" instead of comprehensive notes)
- ❌ CI/CD automation workflows not triggered
- ❌ Release notes prepared in wrong location

**Root Cause**: Manual `gh CLI` command bypassed entire CI/CD pipeline automation.

**Action Required**: 
1. Fix path misalignment in `.github/workflows/release-on-tag.yml`
2. Copy release notes to `.github/` directory (CI/CD expects this location)
3. Delete incomplete manual release
4. Re-trigger via git tag push (uses `release-on-tag.yml` automation)
5. Establish unified release workflow document

---

## Critical Issues Found

### 🔴 ISSUE #1: Release Notes Path Mismatch

**Severity**: CRITICAL - Blocks release body population

**Symptom**:
- GitHub release body shows: `Release v1.17.7` (fallback text)
- Expected body: 276+ lines of comprehensive release notes
- Actual file: `docs/releases/RELEASE_NOTES_v1.17.7.md` (✅ exists, 276 lines)

**Root Cause**:
Location in `.github/workflows/release-on-tag.yml` line ~47:
```bash
NOTES_FILE=".github/RELEASE_NOTES_${TAG}.md"
```

Workflow looks for: `.github/RELEASE_NOTES_v1.17.7.md`
Actual file location: `docs/releases/RELEASE_NOTES_v1.17.7.md`

**Impact**:
- Release body is 1 line instead of 276 lines
- Users see minimal information on GitHub release page
- Professional documentation not visible to downstream users

**Solution Options**:

**Option A (Recommended - Copy to .github/):**
```powershell
# Move release notes to location CI/CD expects
Copy-Item "docs/releases/RELEASE_NOTES_v1.17.7.md" ".github/RELEASE_NOTES_v1.17.7.md"
git add ".github/RELEASE_NOTES_v1.17.7.md"
git commit -m "docs(release): sync v1.17.7 release notes to .github/ for CI/CD"
```

**Option B (Update CI/CD workflow):**
Modify `.github/workflows/release-on-tag.yml` line 47:
```bash
# Change from:
NOTES_FILE=".github/RELEASE_NOTES_${TAG}.md"

# To:
NOTES_FILE="docs/releases/RELEASE_NOTES_${TAG}.md"
```

**Recommendation**: **Option A** - Maintains CI/CD predictability (expects `.github/` directory for release artifacts)

---

### 🔴 ISSUE #2: Manual Release Bypassed CI/CD Automation

**Severity**: CRITICAL - Installer and Docker assets not generated

**Symptom**:
```bash
# What happened:
gh release create v1.17.7 --title "Release v1.17.7" --notes "Release v1.17.7"

# Result:
- Release created instantly (2026-02-03T10:46:52Z)
- No workflows triggered
- No installer built
- No Docker images published
- Assets array: [] (empty)
```

**Root Cause**:
Manual `gh CLI` command creates release directly without:
- Pushing a git tag (would trigger `release-on-tag.yml` workflow)
- Triggering workflow automation
- Waiting for CI/CD pipeline execution

**Expected Workflow Chain** (missing):
```
1. git push tag v1.17.7
   ↓
2. release-on-tag.yml triggered
   - Creates release with comprehensive body
   - Outputs release_id, tag
   ↓
3. trigger-installer-build job
   - Dispatches release-installer-with-sha.yml workflow
   ↓
4. release-installer-with-sha.yml (Windows runner)
   - Installs Inno Setup 6
   - Builds installer (.exe file)
   - Computes SHA256 hash
   - Uploads asset to release
   ↓
5. trigger-ci-cd-pipeline job
   - Dispatches ci-cd-pipeline.yml workflow
   - Runs full test suite
   - Optional: publishes Docker images
   ↓
6. Complete release with:
   - Comprehensive body (276+ lines)
   - Installer attachment (SMS_Setup_v1.17.7.exe)
   - SHA256 hash documentation
   - Docker images published
```

**Impact**:
- Users cannot download installer from GitHub release
- Docker images not published to registry
- Release documentation minimal and unprofessional
- No asset validation (SHA256 hashes)

---

### 🟠 ISSUE #3: Release Installer Workflow Not Executed

**Severity**: HIGH - Installer asset missing

**Workflow File**: `.github/workflows/release-installer-with-sha.yml` (329 lines)

**Capabilities Present**:
```yaml
✅ Windows runner (windows-latest)
✅ Python 3.11 setup
✅ Inno Setup 6 installation
✅ Version verification (VERIFY_VERSION.ps1)
✅ Code signing capability (optional, via secrets)
✅ Installer build (INSTALLER_BUILDER.ps1)
✅ SHA256 hash computation
✅ Asset upload to release
✅ Release notes attachment
```

**Why Not Executed**:
1. Workflow trigger: `on: release: [published, created, edited]`
   - Requires release event to fire
   - Manual `gh CLI` command does NOT fire release event in GitHub Actions
   
2. Alternative trigger: `workflow_dispatch`
   - Requires manual input (tag)
   - Was not used

3. Dependency: Expects `release-on-tag.yml` to have dispatched it
   - `release-on-tag.yml` job `trigger-installer-build` would dispatch `release-installer-with-sha.yml`
   - Since `release-on-tag.yml` never ran, no dispatch occurred

**Expected Output** (missing):
- `SMS_Setup_v1.17.7.exe` (Windows installer)
- SHA256 hash: `a1b2c3d4e5f6...` (for integrity verification)
- File size and metadata
- Attached to GitHub release as asset

---

### 🟠 ISSUE #4: Docker Publishing Workflow Not Executed

**Severity**: HIGH - Docker images not published

**Workflow File**: `.github/workflows/docker-publish.yml`

**Expected Behavior**:
- Triggered by: `release-on-tag.yml` job `trigger-ci-cd-pipeline`
- Or: Manual push of Docker image build workflow
- Action: Builds Docker images and publishes to container registry

**Why Not Executed**:
- Same root cause as ISSUE #3
- `release-on-tag.yml` never ran, so no dispatch occurred
- No Docker images built or published

**Impact**:
- Users cannot pull Docker image for v1.17.7
- Previous version remains as "latest" in registry
- Production deployments cannot use new release

---

### 🟡 ISSUE #5: Incomplete Workflow Dependency Chain

**Severity**: MEDIUM - Process clarity issue

**Current Workflow Structure**:
```
release-on-tag.yml (157 lines)
├─ create-release job
│  ├─ Checkout
│  ├─ Get tag name
│  ├─ Prepare release body (BROKEN: wrong path)
│  └─ Create release (or update if exists)
│
├─ trigger-installer-build job (depends: create-release)
│  └─ Dispatches release-installer-with-sha.yml
│
└─ trigger-ci-cd-pipeline job (depends: create-release)
   └─ Dispatches ci-cd-pipeline.yml
```

**Issues**:
1. No error handling if release creation fails
2. No validation that asset uploads succeeded
3. No notification mechanism if workflow fails
4. No rollback mechanism if assets are bad
5. Multiple independent jobs (installer and CI/CD) run in parallel
   - No guarantee of successful completion before release marked as "complete"

**Missing**:
- Verification that all assets attached successfully
- Health check that downloaded assets are valid
- Rollback procedure if assets fail validation

---

## Workflow Configuration Review

### `.github/workflows/release-on-tag.yml` - Main Release Creation

**Status**: ⚠️ PARTIALLY CONFIGURED

**Working Elements**:
- ✅ Tag detection (lines 20-41)
- ✅ Release creation logic (lines 66-103)
- ✅ Installer workflow dispatch (lines 106-129)
- ✅ CI/CD pipeline dispatch (lines 132-157)

**Broken Elements**:
- ❌ Release notes path mismatch (line 47)

**Trigger Conditions**:
- ✅ Trigger 1: `on: push: tags: 'v*'` (automatic on tag push)
- ✅ Trigger 2: `workflow_dispatch` with manual tag input

**Workflow Output**:
- `tag` - Release tag name
- `release_created` - Boolean indicating if release was newly created

---

### `.github/workflows/release-installer-with-sha.yml` - Installer Build & Upload

**Status**: ⚠️ CONFIGURED BUT NOT TRIGGERED

**Capabilities**:
- ✅ Windows runner with Inno Setup 6
- ✅ Version verification via VERIFY_VERSION.ps1
- ✅ Code signing support (optional)
- ✅ SHA256 hash computation
- ✅ Asset upload to release
- ✅ Release notes attachment

**Missing Elements**:
- ❌ No error handling for missing Inno Setup
- ❌ No retry logic for network failures
- ❌ No validation of built installer

**Trigger Conditions**:
- Trigger 1: `on: release: [published, created, edited]`
- Trigger 2: `workflow_dispatch` with optional tag

**Current Status**: Ready to execute but awaiting release event or manual dispatch

---

### `.github/workflows/docker-publish.yml` - Docker Publishing

**Status**: ⚠️ CONFIGURED BUT DEPENDENCY CHAIN INCOMPLETE

**Expected Behavior**: Build and publish Docker images to container registry

**Dependency Chain**: Not fully defined in audit - need to verify trigger conditions

---

## Local Preparation vs. CI/CD Execution Gap

### What Was Done Locally (✅ Complete)
```
✅ docs/releases/RELEASE_NOTES_v1.17.7.md (276 lines) - CREATED
✅ docs/releases/GITHUB_RELEASE_v1.17.7.md - CREATED
✅ docs/plans/UNIFIED_WORK_PLAN.md - UPDATED
✅ Git commits - PUSHED to origin/main (8 commits)
✅ Version consistency - VERIFIED (1.17.6 → 1.17.7)
✅ Test suite - PASSED (2574+ tests, 100%)
```

### What Should Have Been Done via CI/CD (❌ Missing)
```
❌ Release notes at .github/RELEASE_NOTES_v1.17.7.md - NOT COPIED
❌ GitHub release body - NOT POPULATED (shows fallback text)
❌ Installer (.exe) - NOT BUILT
❌ SHA256 hash - NOT COMPUTED
❌ Assets uploaded - NOT COMPLETED
❌ Docker images - NOT PUBLISHED
❌ Release verification - NOT EXECUTED
```

### Manual Override Impact
```
Action Taken:
  gh release create v1.17.7 --title "Release v1.17.7" --notes "Release v1.17.7"

Consequences:
  ❌ Bypassed entire CI/CD automation chain
  ❌ No workflows triggered in GitHub Actions
  ❌ No assets generated or attached
  ❌ Release marked as "published" but incomplete
  ❌ Cannot re-run automation without deleting and re-creating release
```

---

## Proposed Unified Release Workflow

### Phase 1: LOCAL PREPARATION (Developer/Agent)

**Prerequisites**:
- [ ] All changes committed to `develop` or feature branch
- [ ] COMMIT_READY.ps1 -Full passes (all tests, lint, format)
- [ ] Version bumped in VERSION file (e.g., 1.17.6 → 1.17.7)
- [ ] CHANGELOG.md updated with release notes
- [ ] All commits pushed to origin/main

**Tasks**:
```powershell
# Task 1: Create release documentation
docs/releases/RELEASE_NOTES_v1.17.7.md (276 lines, comprehensive)
docs/releases/GITHUB_RELEASE_v1.17.7.md (template for body)

# Task 2: Copy release notes to CI/CD location (NEW - REQUIRED)
Copy-Item "docs/releases/RELEASE_NOTES_v1.17.7.md" ".github/RELEASE_NOTES_v1.17.7.md"

# Task 3: Commit both files
git add docs/releases/RELEASE_NOTES_v1.17.7.md
git add .github/RELEASE_NOTES_v1.17.7.md
git commit -m "docs(release): prepare v1.17.7 release documentation"
git push origin main

# Task 4: Create and push git tag (TRIGGERS CI/CD)
git tag -a v1.17.7 -m "Release v1.17.7"
git push origin v1.17.7
```

**Verification**:
- [ ] Both release notes files exist
- [ ] Files committed to origin/main
- [ ] Tag created locally
- [ ] Tag pushed to origin

---

### Phase 2: CI/CD AUTOMATION (GitHub Actions)

**Triggered By**: `git push origin v1.17.7`

**Job 1: `release-on-tag.yml` → `create-release`**
```
Inputs: Tag name (v1.17.7) from git push
Steps:
  1. Checkout repository
  2. Extract tag name
  3. Read release notes from .github/RELEASE_NOTES_v1.17.7.md ✅ (fixed path)
  4. Create GitHub release with comprehensive body
  5. Output release_id and tag for downstream jobs
Output: 
  - release_id
  - tag
  - release_created (boolean)
Duration: ~30 seconds
```

**Job 2: `release-on-tag.yml` → `trigger-installer-build`**
```
Dependency: Waits for create-release job
Inputs: Release tag from create-release output
Action:
  - Dispatches release-installer-with-sha.yml workflow
  - Passes tag as input
Duration: ~10 seconds
```

**Job 3: `release-installer-with-sha.yml` (Windows runner)**
```
Trigger: Dispatched by trigger-installer-build job
Environment: windows-latest
Steps:
  1. Checkout code
  2. Setup Python 3.11
  3. Install Inno Setup 6 via Chocolatey
  4. Resolve release ID for v1.17.7
  5. Verify version consistency
  6. Import code signing certificate (if available)
  7. Run INSTALLER_BUILDER.ps1
  8. Compute SHA256 hash of .exe
  9. Upload installer asset to release (via gh CLI)
  10. Attach release notes to installer
Output:
  - SMS_Setup_v1.17.7.exe attached to release
  - SHA256 hash: abc123def456...
  - File size: 234.5 MB
Duration: ~5-10 minutes
```

**Job 4: `release-on-tag.yml` → `trigger-ci-cd-pipeline`**
```
Dependency: Waits for create-release job
Condition: Only if release_created == 'true'
Inputs: Release tag from create-release output
Action:
  - Dispatches ci-cd-pipeline.yml workflow
  - Passes deploy_environment: 'production'
Duration: ~10 seconds
```

**Job 5: Optional `docker-publish.yml`**
```
Trigger: Manual or via ci-cd-pipeline.yml dispatch
Environment: docker (or ubuntu-latest with Docker)
Steps:
  1. Build Docker image with v1.17.7 tag
  2. Tag as 'latest' if production release
  3. Push to container registry (GitHub Container Registry or DockerHub)
Output:
  - Docker image: ghcr.io/bs1gr/sms:v1.17.7
  - Docker image: ghcr.io/bs1gr/sms:latest (if applicable)
Duration: ~3-5 minutes
```

**Complete Automation Duration**: ~6-15 minutes (all jobs in parallel where possible)

---

### Phase 3: VERIFICATION (Automated by CI/CD)

**Automated Checks**:
```
1. Release body populated (276+ lines) ✅
2. Installer asset attached ✅
3. SHA256 hash computed and documented ✅
4. File size and metadata captured ✅
5. Docker image published ✅
6. All tests passed in ci-cd-pipeline.yml ✅
7. No build failures logged ✅
```

**Manual Verification** (Optional):
```powershell
# Verify release on GitHub
gh release view v1.17.7 --json body,assets,isDraft,isPrerelease

# Expected output:
# - Assets count: 1 (installer .exe)
# - Body: 276+ lines (comprehensive release notes)
# - isDraft: false (published)
# - isPrerelease: false (stable release)

# Download and verify installer
gh release download v1.17.7 --pattern "*.exe"
certUtil -hashfile SMS_Setup_v1.17.7.exe SHA256
# Compare output with documented hash
```

---

## Unified Workflow Summary Table

| Phase | Who | What | Tools | Time | Status |
|-------|-----|------|-------|------|--------|
| **1. Prep** | Developer | Create docs, commit, push tag | PowerShell, git, gh CLI | 5 min | Manual |
| **2a. Release** | GitHub Actions | Create release with body | release-on-tag.yml | 30 sec | Automated |
| **2b. Installer** | GitHub Actions | Build .exe, upload asset | release-installer-with-sha.yml | 5-10 min | Automated |
| **2c. Docker** | GitHub Actions | Build & publish images | docker-publish.yml | 3-5 min | Automated |
| **2d. CI/CD** | GitHub Actions | Run full test suite | ci-cd-pipeline.yml | 3-5 min | Automated |
| **3. Verify** | Automated | Validate all assets | GitHub API | - | Automated |

---

## Action Plan to Fix v1.17.7 Release

### Immediate Actions (Do These Now)

**Step 1: Fix Release Notes Path**
```powershell
# Copy comprehensive release notes to location CI/CD expects
Copy-Item `
  "docs/releases/RELEASE_NOTES_v1.17.7.md" `
  ".github/RELEASE_NOTES_v1.17.7.md"

git add ".github/RELEASE_NOTES_v1.17.7.md"
git commit -m "docs(release): sync v1.17.7 release notes to .github/ for CI/CD"
git push origin main
```

**Step 2: Delete Incomplete Manual Release**
```powershell
gh release delete v1.17.7 --yes
```

**Step 3: Re-trigger CI/CD via Git Tag**
```powershell
# Create annotated tag (triggers release-on-tag.yml)
git tag -a v1.17.7 -m "Release v1.17.7 - Maintenance and internationalization improvements"

# Push tag to origin (TRIGGERS CI/CD AUTOMATION)
git push origin v1.17.7
```

**Step 4: Monitor CI/CD Execution**
```powershell
# Watch GitHub Actions workflow execution
# Open: https://github.com/bs1gr/AUT_MIEEK_SMS/actions

# Or use gh CLI:
gh run list --workflow=release-on-tag.yml --limit=1
gh run watch <run-id>
```

**Step 5: Verify Complete Release**
```powershell
# After ~10-15 minutes, verify:
gh release view v1.17.7 --json body,assets,isDraft,isPrerelease

# Should show:
# - Assets: 1+ (installer, documentation)
# - Body: 276+ lines (comprehensive)
# - isDraft: false
# - isPrerelease: false
```

---

## Files Requiring Changes

### 1. `.github/workflows/release-on-tag.yml`

**Current Line 47** (ISSUE #1):
```bash
NOTES_FILE=".github/RELEASE_NOTES_${TAG}.md"
```

**Options**:

**Option A: Keep as-is, add file to .github/**
- Copy RELEASE_NOTES_v1.17.7.md to .github/ directory
- Maintain CI/CD workflow predictability
- ✅ Recommended

**Option B: Update workflow to look in docs/releases/**
```bash
NOTES_FILE="docs/releases/RELEASE_NOTES_${TAG}.md"
```
- Single source of truth in docs/releases/
- Requires workflow update
- ⚠️ Not recommended for immediate fix

### 2. `.github/RELEASE_NOTES_v1.17.7.md` 

**Status**: NEEDS TO BE CREATED

**Source**: Copy from `docs/releases/RELEASE_NOTES_v1.17.7.md`

**Command**:
```powershell
Copy-Item `
  "docs/releases/RELEASE_NOTES_v1.17.7.md" `
  ".github/RELEASE_NOTES_v1.17.7.md"
```

### 3. `.github/workflows/release-installer-with-sha.yml`

**Status**: ✅ Ready to use (no changes needed immediately)

**Considerations**:
- Update to use Windows runner with proper Inno Setup path (already handles)
- Add error handling for missing certificate
- Already configured correctly

### 4. Future: Establish Standard Release Notes Location

**Recommendation for v1.17.8+**:
Create workflow to auto-sync docs/releases/ to .github/ during release:

```yaml
# Add to release-on-tag.yml:
- name: Sync release notes to .github/
  run: |
    TAG=${{ steps.get_tag.outputs.tag_name }}
    cp docs/releases/RELEASE_NOTES_${TAG}.md .github/RELEASE_NOTES_${TAG}.md
```

---

## Success Criteria

**Release v1.17.7 Will Be Complete When**:

✅ GitHub release body contains 276+ lines of release notes
✅ Installer asset (SMS_Setup_v1.17.7.exe) attached to release
✅ SHA256 hash documented and visible
✅ Release marked as "published" (not draft)
✅ Docker images published to registry
✅ All 2574+ tests shown as passing in CI/CD
✅ No failed jobs in GitHub Actions workflow run

**Verification Commands**:
```powershell
# Show release details
gh release view v1.17.7 --json body,assets,isDraft,isPrerelease,createdAt,publishedAt

# Expected:
# body: [276+ line release notes content]
# assets: [{SMS_Setup_v1.17.7.exe}, ...]
# isDraft: false
# isPrerelease: false
```

---

## Lessons Learned & Prevention for v1.17.8+

### What Went Wrong
1. ❌ Manual gh CLI used instead of git tag push
2. ❌ Release notes created in docs/releases but CI/CD expects .github/
3. ❌ No synchronization between local preparation and CI/CD automation
4. ❌ No verification step to ensure all assets generated

### What to Do Next Time

**Before Pushing Release**:
1. ✅ Create release notes at BOTH locations:
   - `docs/releases/RELEASE_NOTES_v1.17.8.md` (single source of truth)
   - `.github/RELEASE_NOTES_v1.17.8.md` (CI/CD input)

2. ✅ Never use manual `gh release create` command
   - Always use `git tag` + `git push origin <tag>`
   - Triggers `release-on-tag.yml` workflow automatically

3. ✅ Monitor CI/CD workflow execution
   - Don't assume release is complete without verification
   - Wait for all jobs to finish (10-15 minutes)
   - Verify all assets attached

4. ✅ Establish process documentation
   - Create release checklist
   - Document in project README
   - Train all contributors

---

## References

**Workflow Files**:
- `.github/workflows/release-on-tag.yml` (157 lines) - Main release creation
- `.github/workflows/release-installer-with-sha.yml` (329 lines) - Installer build
- `.github/workflows/docker-publish.yml` - Docker publishing
- `.github/workflows/ci-cd-pipeline.yml` - Full test suite

**Release Documentation**:
- `docs/releases/RELEASE_NOTES_v1.17.7.md` (276 lines) - Comprehensive notes
- `docs/releases/GITHUB_RELEASE_v1.17.7.md` - GitHub template
- `docs/plans/UNIFIED_WORK_PLAN.md` - Project status

**CI/CD Configuration**:
- `.github/workflows/` - 31 workflow files
- `INSTALLER_BUILDER.ps1` - Local installer build
- `COMMIT_READY.ps1` - Pre-commit validation
- `VERIFY_VERSION.ps1` - Version consistency check

---

**Next Steps**: Execute action plan steps 1-5 above to complete v1.17.7 release properly.

**Created By**: AI Agent (Audit Execution)
**Audit Date**: February 3, 2026
**Recommendation**: Implement unified workflow immediately
