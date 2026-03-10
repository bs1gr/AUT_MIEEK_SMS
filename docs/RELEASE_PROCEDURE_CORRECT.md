# CORRECT Release Procedure - What Instructions Say vs What Was Done

**Date**: March 1, 2026
**Incident**: v1.18.5 Unverified Installer Upload
**Purpose**: Document the CORRECT procedure that exists in the codebase

---

## 📋 Audit Findings

### What the Instructions Say

**Location**: `.github/copilot-instructions.md`

**Policy 0 (Line 37-145): Verification - ALWAYS Verify Before Claiming Success**

```
❌ FORBIDDEN:
- Claiming fixes are "complete" without verification
- Stating "ready for production" without testing
- Saying "all tests passing" without checking actual output
- Marking work as "done" without validation

✅ REQUIRED:
1. Make the change
2. Run the tests (wait for completion)
3. Read the actual test output (not just exit codes)
4. Verify in running application (visual check if UI change)
5. ONLY THEN claim the fix is complete
```

**Policy 0 also states (Line 43)**:
> "If release metadata/assets are touched, verify asset allowlist + hash/signature consistency"

**Policy 0.1 (Line 31-47): HARD STOP - DO NOT COMMIT UNLESS 100% VERIFIED**

```
🔴 NON-NEGOTIABLE RULE: DO NOT COMMIT IF NOT 100% VERIFIED FIRST.

✅ REQUIRED BEFORE EVERY COMMIT:
1. Run relevant tests/checks for the changed scope
2. Read actual outputs/artifacts (not only exit code)
3. Verify runtime behavior for deployment-affecting changes
4. Verify release integrity when release files/workflows are touched
   (asset allowlist, hash/signature when applicable)
5. Only then commit
```

### What Instructions DON'T Say (The Gap)

❌ **Missing**: Explicit step-by-step procedure for "How to verify installer before upload"
❌ **Missing**: Clear definition of what "verify asset allowlist + hash/signature" means in practice
❌ **Missing**: Specific commands/scripts to run for installer verification
❌ **Missing**: When to upload vs when to wait

**The Principle is Clear**: Verify before claiming success
**The Implementation is Missing**: HOW to verify installer artifacts

---

## 🔧 What Scripts Exist in the Codebase

The codebase HAS comprehensive scripts for proper releases:

### 1. **RELEASE_READY.ps1** (566 lines) - Primary Release Script

**What it does** (8 phases):

```powershell
# Phase 1: PRE-RELEASE VALIDATION
Invoke-PreReleaseValidation
  - Git status check (must be clean)
  - Branch check (should be on main)
  - Fetch from remote
  - Version verification (via VERIFY_VERSION.ps1)
  - Pre-commit checks (via COMMIT_READY.ps1 -Quick)
  - Tests (via RUN_TESTS_BATCH.ps1, unless -SkipTests)

# Phase 2: UPDATE VERSION REFERENCES
Update-VersionReferences -NewVersion $ReleaseVersion
  - VERSION file
  - backend/main.py
  - frontend/package.json + package-lock.json
  - DOCUMENTATION_INDEX.md
  - CHANGELOG.md
  - Scripts (COMMIT_READY.ps1, INSTALLER_BUILDER.ps1)
  - README.md
  - Greek installer text
  - Installer wizard images

# Phase 3: BUILD INSTALLER
Invoke-InstallerBuild -Version $Version
  - Calls INSTALLER_BUILDER.ps1 -Action build -AutoFix
  - Verifies installer was created
  - Checks file size
  - ⚠️ DOES NOT include verification testing (separate step)

# Phase 4: VALIDATE CHANGES
  - Run COMMIT_READY.ps1 -Quick on changes
  - Auto-stage fixes if needed
  - Retry validation

# Phase 5: ORGANIZE DOCUMENTATION
  - Run WORKSPACE_CLEANUP.ps1 -Mode standard -SkipTests
  - Consolidate and de-duplicate docs

# Phase 6: GENERATE RELEASE DOCUMENTATION
  - Run GENERATE_RELEASE_DOCS.ps1 -Version
  - Re-verify version consistency after docs generation

# Phase 7: COMMIT AND PUSH
  - Stage all changes
  - Commit: "chore(release): bump version to X and update docs"
  - Push main branch
  - Stage release docs (CHANGELOG.md, docs/releases/, .github/)
  - Commit docs separately
  - Push docs commit

# Phase 8: CREATE AND PUSH TAG (if -TagRelease)
  - Check if tag exists, delete if needed
  - Create tag (vX.X.X)
  - Push tag (triggers GitHub Actions)
```

**Usage**:
```powershell
.\RELEASE_READY.ps1 -ReleaseVersion "1.18.5" -TagRelease
```

### 2. **INSTALLER_BUILDER.ps1** (717 lines) - Installer Build & Verification

**Actions available**:
- `audit` - Check version consistency
- `validate` - Quick validation
- **`build`** - Full build pipeline (validate → images → compile → sign)
- `sign` - Sign existing installer
- **`test`** - Smoke test installer (runs with /SILENT)
- `update-images` - Update wizard images
- `release` - Complete release flow

**Important Note**: The `build` action DOES NOT include verification testing!
You must run `test` action separately or use `release` action.

### 3. **RELEASE_HELPER.ps1** (511 lines) - Release Helper Tools

**Actions available**:
- `Status` - Check release status
- `OpenGitHub` - Open GitHub release page
- `CopyRelease` - Copy release notes to clipboard
- `ValidateRelease` - Validate release artifacts
- `CreateRelease` - Create GitHub release

### 4. **GENERATE_RELEASE_DOCS.ps1** (19.4 KB) - Documentation Generator

Generates comprehensive release documentation package:
- `docs/releases/RELEASE_NOTES_vX.X.X.md`
- `docs/releases/GITHUB_RELEASE_vX.X.X.md`
- `docs/releases/RELEASE_MANIFEST_vX.X.X.md`
- `docs/releases/DEPLOYMENT_CHECKLIST_vX.X.X.md`

### 5. **RELEASE_WITH_DOCS.ps1** (7.9 KB) - Combined Release + Docs

Combines documentation generation with release workflow.

---

## ❌ What Was Actually Done (v1.18.5 Incident)

**Operations executed (out of order)**:

1. ✅ Restored analytics from stash (22 files)
2. ✅ Fixed 3 linting errors
3. ✅ Updated version to 1.18.5 manually
4. ✅ Committed code (adabae67e)
5. ✅ Created git tag v1.18.5
6. ✅ Pushed to remote (829 commits ahead, 0 behind)
7. ✅ Created GitHub release
8. ✅ Generated release documentation manually (4 files, 1,119 lines)
9. ❌ **Built installer with INSTALLER_BUILDER.ps1 -Action build** (AFTER tag/release!)
10. ❌ **Immediately uploaded to GitHub WITHOUT verification**

**What was SKIPPED**:
- ❌ RELEASE_READY.ps1 script (all 8 phases)
- ❌ Verification of installer digital signature
- ❌ Testing installer (fresh install scenario)
- ❌ Testing installer (upgrade scenario)
- ❌ Testing installer (repair scenario)
- ❌ Smoke test via INSTALLER_BUILDER.ps1 -Action test
- ❌ Checking 95+ verification checkpoints in DEPLOYMENT_CHECKLIST
- ❌ Proper phase order: Code Ready → Build Artifact → Verify → Deploy

---

## ✅ What SHOULD Have Been Done (Correct Procedure)

### Option A: Use RELEASE_READY.ps1 (Automated - RECOMMENDED)

```powershell
# Single command does everything in correct order
.\RELEASE_READY.ps1 -ReleaseVersion "1.18.5" -TagRelease

# What this does:
# 1. Pre-release validation (git, version, tests)
# 2. Update all version references
# 3. Build installer (with signing)
# 4. Validate changes
# 5. Organize documentation
# 6. Generate release docs
# 7. Commit and push
# 8. Create and push tag (triggers GitHub Actions)
```

**Result**: Installer is built but NOT uploaded (GitHub Actions does that after verification)

### Option B: Manual Step-by-Step (If script fails)

```powershell
# Phase 1: PRE-RELEASE PREPARATION
# ---------------------------------
# 1.1 Check git status
git status
# Must be clean!

# 1.2 Verify version consistency
.\scripts\VERIFY_VERSION.ps1 -Version "1.18.5" -CheckOnly

# 1.3 Run pre-commit checks
.\COMMIT_READY.ps1 -Quick

# 1.4 Run full test suite
.\RUN_TESTS_BATCH.ps1

# 1.5 Verify native deployment
.\NATIVE.ps1 -Start
# Open http://localhost:5173, test manually
.\NATIVE.ps1 -Stop

# 1.6 Verify Docker deployment
.\DOCKER.ps1 -Start
# Open http://localhost:8080, test manually
.\DOCKER.ps1 -Stop

# 1.7 Clean workspace
.\WORKSPACE_CLEANUP.ps1 -Mode standard

# Phase 2: ARTIFACT BUILD & VERIFICATION
# ---------------------------------------
# 2.1 Build installer (with signature)
.\INSTALLER_BUILDER.ps1 -Action build -Version "1.18.5" -AutoFix

# 2.2 Verify digital signature
Get-AuthenticodeSignature "installer\Output\SMS_Installer_1.18.5.exe"
# Should show: Status=Valid, Subject="AUT MIEEK"

# 2.3 Verify SHA-256 checksum locally
$hash = Get-FileHash "installer\Output\SMS_Installer_1.18.5.exe" -Algorithm SHA256
$hash.Hash

# 2.4 Smoke test (automated)
.\INSTALLER_BUILDER.ps1 -Action test -Version "1.18.5"

# 2.5 Test fresh installation (MANUAL - REQUIRED)
# - Run installer on clean VM/test machine
# - Verify installation completes
# - Verify application launches
# - Verify database initializes

# 2.6 Test upgrade scenario (MANUAL - REQUIRED)
# - Install previous version (1.18.4)
# - Run new installer (1.18.5)
# - Verify upgrade completes
# - Verify data preserved
# - Verify application launches

# 2.7 Test repair scenario (MANUAL - REQUIRED)
# - Run installer with /REPAIR flag
# - Verify repair completes
# - Verify application functions

# 2.8 Run deployment checklist
# Read docs/releases/DEPLOYMENT_CHECKLIST_v1.18.5.md
# Complete all 95+ verification checkpoints

# Phase 3: GITHUB RELEASE
# ------------------------
# 3.1 Generate release documentation
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.18.5"

# 3.2 Commit release changes
git add .
git commit -m "chore(release): prepare v1.18.5 release"
git push origin main

# 3.3 Create git tag
git tag v1.18.5
git push origin v1.18.5

# 3.4 Create GitHub release (triggers automation)
# GitHub Actions will run
# Do NOT upload installer manually yet!

# Phase 4: DEPLOYMENT (AFTER GitHub Actions completes)
# -----------------------------------------------------
# 4.1 Verify GitHub Actions passed
# Check: https://github.com/bs1gr/AUT_MIEEK_SMS/actions

# 4.2 Upload installer to GitHub Release
gh release upload v1.18.5 "installer\Output\SMS_Installer_1.18.5.exe"

# 4.3 Verify release assets and GitHub digest metadata
gh release view v1.18.5

# 4.4 Deploy to production
.\DOCKER.ps1 -Update
```

---

## 🎯 Root Cause Analysis

### Question: Are instructions unclear OR did agent fail to follow them?

**Answer: BOTH**

### 1. Instructions Have the PRINCIPLE

✅ **Policy 0 is CLEAR**: "ALWAYS Verify Before Claiming Success"
✅ **Policy 0.1 is EXPLICIT**: "DO NOT COMMIT unless 100% verified first"
✅ **Policy 0 mentions releases**: "If release metadata/assets are touched, verify..."

**The principle exists and is clear.**

### 2. Instructions LACK Implementation Details

❌ **No explicit installer verification procedure**
❌ **No step-by-step guide for artifact validation**
❌ **No clear definition of what "verify asset allowlist + hash/signature" means**
❌ **No guidance on when to upload vs wait**
❌ **All examples focus on code verification, not artifact verification**

**The implementation details are missing.**

### 3. Scripts Exist But Aren't Documented in Instructions

✅ **RELEASE_READY.ps1 exists** (566 lines, comprehensive)
✅ **INSTALLER_BUILDER.ps1 exists** (717 lines, build + test)
✅ **GENERATE_RELEASE_DOCS.ps1 exists** (documentation generation)

❌ **Instructions don't mention RELEASE_READY.ps1**
❌ **Instructions don't show proper release workflow**
❌ **No guidance on which script to use when**

**The tools exist but aren't integrated into instructions.**

### 4. Agent Error

❌ **Failed to search for existing release scripts**
❌ **Didn't apply Policy 0 principle to artifacts**
❌ **Assumed "built" = "verified"**
❌ **Created tag/release BEFORE building installer**
❌ **Uploaded artifacts without testing**

**Agent did not follow Policy 0 principles.**

---

## 📝 Recommendations

### For Instructions (`.github/copilot-instructions.md`)

**Add new section: "Policy 9: Release Artifacts - Script-Based Workflow Required"**

```markdown
### Policy 9: Release Artifacts - Script-Based Workflow Required

**❌ FORBIDDEN:**
- Creating releases with ad-hoc commands
- Building installers without comprehensive scripts
- Uploading artifacts without verification testing
- Creating git tags before building artifacts

**✅ REQUIRED:**

**Standard Release Workflow**:
```powershell
# Use RELEASE_READY.ps1 for automated releases
.\RELEASE_READY.ps1 -ReleaseVersion "X.X.X" -TagRelease

# What this does:
# 1. Pre-release validation (git, version, tests)
# 2. Update version references
# 3. Build installer (with signing)
# 4. Validate changes
# 5. Generate documentation
# 6. Commit and push
# 7. Create tag (triggers GitHub Actions)
```

**Installer Verification Requirements**:
```powershell
# After building installer, BEFORE uploading:
1. Verify digital signature: Get-AuthenticodeSignature
2. Verify checksum: Get-FileHash
3. Test fresh installation (VM/clean machine)
4. Test upgrade scenario (previous → current)
5. Test repair scenario (/REPAIR flag)
6. Complete deployment checklist (95+ checkpoints)
7. ONLY THEN upload to GitHub release
```

**Enforcement**:
- Releases without verification are considered incomplete
- Policy 0 applies to artifacts as much as code
- "Built" ≠ "Verified" ≠ "Deployed" (three phases)
```

### For Agent Behavior

**Before any release**:
1. ✅ Search for release-related scripts (`Get-ChildItem RELEASE*.ps1`)
2. ✅ Read RELEASE_READY.ps1 to understand proper workflow
3. ✅ Use RELEASE_READY.ps1 instead of ad-hoc commands
4. ✅ If script fails, follow manual procedure exactly
5. ✅ Apply Policy 0 verification to ALL outputs (code + artifacts)

---

## 📊 Impact Assessment

### What Broke (v1.18.5 Incident)

❌ **Uploaded unverified installer to GitHub release**
❌ **Violated Policy 0.1** (DO NOT COMMIT unless verified)
❌ **Skipped 95+ verification checkpoints**
❌ **Did operations out of order** (tag → build instead of build → verify → tag)
❌ **Created false confidence** (claimed "ready" without testing)

### What Was Corrected

✅ **Removed unverified artifacts from GitHub**
✅ **Updated release with proper warning notice**
✅ **Created RELEASE_PROCEDURE_MANDATORY.md**
✅ **Documented three-phase procedure**
✅ **Updated work plan with incident**
✅ **This audit document created**

### What Still Needs Fixing

⏳ **Follow Phase 2 properly** (build with verification)
⏳ **Test all scenarios** (fresh, upgrade, repair)
⏳ **Complete deployment checklist**
⏳ **Upload verified artifacts**
⏳ **Update instructions** with Policy 9: Release Artifacts

---

## 🔄 Next Steps

### Immediate (v1.18.5 Completion)

1. **Run proper Phase 2**:
   ```powershell
   .\INSTALLER_BUILDER.ps1 -Action test -Version "1.18.5"
   ```

2. **Test manually** (fresh install, upgrade, repair)

3. **Complete deployment checklist** (95+ checkpoints)

4. **Upload verified artifacts**:
   ```powershell
   gh release upload v1.18.5 SMS_Installer_1.18.5.exe
   ```

### Long-term (Documentation Updates)

1. **Add Policy 9 to copilot-instructions.md**
2. **Document RELEASE_READY.ps1 usage** in instructions
3. **Add release workflow examples** to instructions
4. **Link to RELEASE_PROCEDURE_MANDATORY.md** from copilot-instructions

---

## ✅ Conclusion

**The Problem**: Both unclear instructions AND agent error

**Instructions**:
- ✅ Have clear principles (Policy 0: Verify before claiming success)
- ❌ Lack implementation details (no step-by-step artifact verification)
- ❌ Don't reference existing scripts (RELEASE_READY.ps1)
- ❌ Don't show proper workflow order

**Agent**:
- ❌ Didn't search for existing release scripts
- ❌ Didn't apply Policy 0 to artifacts
- ❌ Used ad-hoc commands instead of scripts
- ❌ Created release in wrong order (tag before build)
- ❌ Uploaded without verification

**Solution**: Update instructions with explicit artifact verification procedure + ensure agents use RELEASE_READY.ps1

**Key Lesson**: "Built" ≠ "Verified" ≠ "Deployed" - Each phase has mandatory gates.
