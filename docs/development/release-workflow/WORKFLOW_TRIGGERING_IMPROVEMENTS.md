# Workflow Triggering Mechanism - Improvements & Fixes

## Problem Summary

The $11.18.3 release was blocked due to multiple issues in the release workflow chain:

1. **Pre-commit Auto-fixes Blocking Release**: `COMMIT_READY.ps1 -Quick` would auto-fix issues but then fail, causing `RELEASE_READY.ps1` to abort before pushing the tag
2. **Tag Event Not Triggering Release Event**: GitHub only fires `release` events for NEW tags. Re-pushing existing tags (even after deletion) doesn't reliably trigger the event
3. **Manual Dispatch Issues**: The workflow required a tag input parameter, which might not exist yet or could be at draft status
4. **No Automatic Installer Build**: When a release was created, the installer workflow wasn't automatically triggered
5. **Unclear Prerequisites**: Users didn't know what checks to run before releasing

## Prerequisites for Release

Before running RELEASE_READY.ps1, you MUST prepare your codebase:

### Automated Preparation (Recommended)

```powershell
# Quick mode (5-10 minutes)

.\RELEASE_PREPARATION.ps1 -Mode Quick
# Runs: git checks, version verification, pre-commit, installer check

# Full mode (20-40 minutes, includes all tests)

.\RELEASE_PREPARATION.ps1 -Mode Full
# Runs: all above + backend tests + frontend checks

```text
### What RELEASE_PREPARATION.ps1 Validates

1. **Git Status**
   - Clean working tree
   - On main branch (warning if not)
   - Remote is up to date

2. **Version Consistency** (via VERIFY_VERSION.ps1)
   - All version files match
   - VERSION file is consistent
   - pyproject.toml matches
   - package.json matches
   - Installer config matches

3. **Code Quality** (via COMMIT_READY.ps1)
   - Code formatting (ruff format)
   - Linting (ruff check --fix)
   - Import organization
   - Smoke tests

4. **Tests** (Optional, in Full mode)
   - Backend tests (pytest)
   - Frontend checks

5. **Installer Builder**
   - Script exists and is executable
   - Prerequisites are available

### Manual Prerequisites (if not using RELEASE_PREPARATION.ps1)

```powershell
# 1. Update from remote

git fetch origin
git pull origin main

# 2. Verify version consistency

.\scripts\VERIFY_VERSION.ps1 -AutoFix
# Expected: All version files match

# 3. Run pre-commit checks

.\COMMIT_READY.ps1 -Quick
# Expected: All checks pass (auto-fixes applied)

# 4. Run backend tests

cd backend
python -m pytest -q
# Expected: All tests pass

# 5. Verify installer builder

Test-Path ".\INSTALLER_BUILDER.ps1"
# Expected: Returns $true

```text
### Failure Recovery During Preparation

If any step fails:

1. **Version Issues**: Auto-fixed by VERIFY_VERSION.ps1 -AutoFix
2. **Pre-commit Issues**: Auto-fixed by COMMIT_READY.ps1 -Quick
3. **Test Failures**: Fix the code, then re-run tests
4. **Installer Issues**: Check prerequisites (Inno Setup, etc.)

---

## Solutions Implemented

### 1. Fixed RELEASE_READY.ps1 (v2.1)

**Problem**: Pre-commit validation failures would abort the entire release process.

**Solution**:
- Added retry logic: auto-stages fixes and retries validation
- Only abort if BOTH attempts fail
- Better error messages and progress reporting
- Force-recreates tags to handle existing tag scenarios
- Uses `--force` on tag push to handle re-releases

```powershell
# Now handles pre-commit fixes gracefully

.\RELEASE_READY.ps1 -ReleaseVersion 1.12.8
# If validation fails, it auto-stages fixes and retries

# Only fails if the second attempt also fails

```text
### 2. Enhanced release-on-tag.yml Workflow

**Improvements**:
- **Automatic Installer Trigger**: After creating/updating a release, automatically dispatches the `release-installer-with-sha.yml` workflow
- **Better Output Tracking**: Returns `tag`, `release_created`, and `release_id` outputs for downstream jobs
- **Robust Release Creation**: Handles both new and existing releases with update capability

**Flow**:

```text
Tag push/dispatch
    ↓
create-release job (creates/updates GitHub release)
    ↓
trigger-installer-build job (automatically starts installer build)
    ↓
Installer workflow runs with resolved tag

```text
### 3. Improved release-installer-with-sha.yml Workflow

**Key Improvements**:

#### a) **Smart Tag Resolution** (`resolve_tag` step)

Handles multiple triggering scenarios:

| Scenario | Trigger | Tag Source | Example |
|----------|---------|-----------|---------|
| **Release Event** | GitHub release created/published | Event data | `github.event.release.tag_name` |
| **Manual with Tag** | Manual dispatch with input | User input | `github.event.inputs.tag` |
| **Manual No Tag** | Manual dispatch, empty input | Fetches latest | `gh release view --json tagName` |
| **From release-on-tag** | Workflow dispatch from other job | Passed inputs | `workflow_dispatch` with tag |

#### b) **Graceful Error Handling**

- Version verification runs with warnings (not hard errors)
- Installer upload failures don't block the entire workflow
- Detailed debug output for troubleshooting

#### c) **Better Release Interaction**

- Works with draft releases
- Handles releases created but not yet published
- Retries asset uploads
- Provides clear status messages

### 4. Workflow Dispatch Enhancements

**Old behavior**:

```yaml
workflow_dispatch:
  inputs:
    tag:
      required: true  # ❌ Forces user to input tag

```text
**New behavior**:

```yaml
workflow_dispatch:
  inputs:
    tag:
      required: false  # ✅ Optional - fetches latest if empty

```text
## Usage Examples

### Scenario 1: Normal Release Process

```powershell
# 1. Prepare release locally

.\RELEASE_READY.ps1 -ReleaseVersion 1.12.9 -TagRelease

# Actions:

# ✓ Updates version files
# ✓ Runs COMMIT_READY.ps1 -Quick (with retry)

# ✓ Commits changes
# ✓ Pushes main branch

# ✓ Creates and pushes tag $11.18.3
# ✓ GitHub Actions: release-on-tag workflow triggers

# ✓ GitHub Actions: Creates GitHub Release
# ✓ GitHub Actions: Automatically triggers installer build

# ✓ GitHub Actions: Uploads installer to release

```text
### Scenario 2: Re-release Existing Version (e.g., after installer fix)

```powershell
# 1. After fixing something (e.g., installer issue)

.\RELEASE_READY.ps1 -ReleaseVersion 1.12.8 -TagRelease

# Actions:

# ✓ Force-deletes existing local tag $11.18.3
# ✓ Fetches and force-deletes remote tag (if exists)

# ✓ Creates new tag $11.18.3
# ✓ Force-pushes to origin

# ✓ GitHub Actions: release-on-tag workflow triggers
# ✓ GitHub Actions: Updates existing GitHub Release

# ✓ GitHub Actions: Triggers installer build with new installer

```text
### Scenario 3: Manual Installer Build

**Option A**: With specific tag

```text
GitHub Actions → Release – Build & Upload Installer with SHA256
Inputs:
  tag: $11.18.3

```text
**Option B**: Auto-detect latest release (empty input)

```text
GitHub Actions → Release – Build & Upload Installer with SHA256
Inputs:
  tag: (leave empty)

```text
The workflow will automatically fetch the latest release.

### Scenario 4: Dispatcher-Triggered Release (from another workflow)

```yaml
# In another workflow job:

- name: Trigger Release

  uses: actions/github-script@v6
  with:
    script: |
      await github.rest.actions.createWorkflowDispatch({
        owner: context.repo.owner,
        repo: context.repo.repo,
        workflow_id: 'release-on-tag.yml',
        ref: 'main',
        inputs: {
          tag: '$11.18.3'
        }
      });

```text
## Workflow Outputs

### release-on-tag.yml outputs

```yaml
outputs:
  tag: $11.18.3              # The release tag
  release_created: true     # Whether release was newly created (vs updated)

```text
### release-installer-with-sha.yml outputs

The workflow provides these in the step summary:
- Tag: $11.18.3
- Version: 1.12.8
- Installer: SMS_Installer_$11.18.3.exe
- Size: 156.2 MB
- SHA256: abc123def...

## Troubleshooting

### Issue: Release workflow doesn't trigger

**Cause**: Tag push event not detected
**Solution**:
1. Check that tag format is `v*` (e.g., `$11.18.3`)
2. Verify tag was actually pushed: `git ls-remote --tags origin $11.18.3`
3. Manually trigger: GitHub Actions → release-on-tag.yml → Run workflow

### Issue: Installer workflow doesn't start

**Cause**: Either release event not fired or release in draft status
**Solution**:
1. Ensure release is published (not draft)
2. Check `trigger-installer-build` job in `release-on-tag` workflow
3. Manually trigger installer workflow: GitHub Actions → Release – Build & Upload Installer with SHA256

### Issue: Pre-commit fails in RELEASE_READY.ps1

**Old behavior**: Entire release aborts
**New behavior**: Auto-fixes and retries

If still failing after retry:

```powershell
# Run manually to see the issue

.\COMMIT_READY.ps1 -Quick
# Or format/lint

ruff format backend frontend
ruff check --fix backend frontend

```text
### Issue: Installer can't find version files

**Cause**: Version inconsistency across files
**Solution**:

```powershell
# Check version consistency

.\scripts\VERIFY_VERSION.ps1

# Fix all version references

.\COMMIT_READY.ps1 -Cleanup
git add .
git commit -m "fix: sync version references"
.\RELEASE_READY.ps1 -ReleaseVersion 1.12.9 -TagRelease

```text
## Implementation Details

### Tag Resolution Logic

The `resolve_tag` step in installer workflow:

```powershell
1. If release event → Use github.event.release.tag_name
2. Else if manual dispatch with input → Use github.event.inputs.tag
3. Else fetch latest release automatically
4. Validate tag format and existence

```text
### Job Dependencies

```text
release-on-tag workflow:
  create-release (main job)
    ↓ outputs tag
  trigger-installer-build (depends on create-release)
    ↓ dispatches installer workflow

release-installer-with-sha workflow:
  resolve_tag (independent, flexible)
    ↓
  import_cert
    ↓
  build_installer
    ↓
  upload_to_release

```text
### Backwards Compatibility

- Old release events still work (e.g., manual release creation via UI)
- Existing tags can be re-released without breaking
- Manual workflow dispatch works with or without tag input

## Best Practices

1. **Always use RELEASE_READY.ps1 for releases**
   ```powershell
   .\RELEASE_READY.ps1 -ReleaseVersion x.y.z -TagRelease
   ```

2. **Let workflows handle the rest**
   - Don't manually create releases
   - Don't manually upload installers
   - Monitor GitHub Actions for progress

3. **For hotfixes on existing versions**
   ```powershell
   # Fix code
   .\RELEASE_READY.ps1 -ReleaseVersion x.y.z -TagRelease
   # This will force-recreate the tag and trigger new workflows
   ```

4. **Verify installer integrity**
   ```powershell
   # From workflow output or release page
   (Get-FileHash 'SMS_Installer_$11.18.3.exe' -Algorithm SHA256).Hash
   # Should match: abc123def...
   ```

## Monitoring

**Watch the workflow progress**:
1. Push changes/tag locally
2. Go to GitHub Actions
3. Click on the running workflow
4. Monitor both `release-on-tag` and `release-installer-with-sha` jobs
5. Check step summaries for installer details

**Logs to check**:
- `release-on-tag` → `create-release` → "Create release (or update if exists)" step
- `release-on-tag` → `trigger-installer-build` → "Trigger Release Installer Workflow" step
- `release-installer-with-sha` → `resolve_tag` → Tag resolution logic

## Future Improvements

Potential enhancements:
- [ ] Slack/Discord notifications on release completion
- [ ] Automated changelog generation from commits
- [ ] Publish to additional platforms (Chocolatey, Windows Package Manager)
- [ ] Automated version bump before release
- [ ] Release notes auto-generation from PRs and issues
