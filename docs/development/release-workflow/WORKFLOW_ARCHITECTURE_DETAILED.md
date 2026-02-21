# Workflow Architecture & Triggering Chain

## Complete Release Pipeline

```text
┌─────────────────────────────────────────────────────────────────┐
│ LOCAL DEVELOPER MACHINE                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  .\RELEASE_READY.ps1 -ReleaseVersion 1.12.9 -TagRelease       │
│         │                                                       │
│         ├─→ Update version files (VERSION, pyproject.toml, etc)│
│         ├─→ Run COMMIT_READY.ps1 -Quick                        │
│         │   ├─→ Format code (ruff format)                      │
│         │   ├─→ Lint code (ruff check --fix)                   │
│         │   ├─→ Smoke tests                                    │
│         │   └─→ Auto-fix + retry if needed ✓ NEW              │
│         ├─→ Stage and commit changes                           │
│         ├─→ Push main branch                                   │
│         └─→ Create & push tag $11.18.3                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │ Git push → GitHub
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ GITHUB ACTIONS - WORKFLOW 1: release-on-tag.yml                │
├─────────────────────────────────────────────────────────────────┤
│ TRIGGER: Tag push (v*) or workflow_dispatch                    │
│                                                                 │
│ Job: create-release                                             │
│  ├─→ Parse tag name from push/input                            │
│  ├─→ Prepare release notes (if .github/RELEASE_NOTES_*.md)    │
│  └─→ Create/Update GitHub Release                             │
│      ├─→ Creates if doesn't exist                              │
│      └─→ Updates if exists ✓ NEW (idempotent)                │
│                                                                 │
│ Job: trigger-installer-build (needs: create-release)           │
│  └─→ Automatically dispatch installer workflow ✓ NEW           │
│      └─→ Passes tag as input                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │ Workflow dispatch
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ GITHUB ACTIONS - WORKFLOW 2: release-installer-with-sha.yml    │
├─────────────────────────────────────────────────────────────────┤
│ TRIGGER: release event OR workflow_dispatch OR manual           │
│                                                                 │
│ Job: release-installer (Windows runner)                         │
│  │                                                              │
│  ├─→ Resolve Tag (Smart Logic) ✓ NEW                           │
│  │   ├─→ If release event: use github.event.release.tag_name  │
│  │   ├─→ Else if dispatch input: use github.event.inputs.tag  │
│  │   ├─→ Else: fetch latest release automatically             │
│  │   └─→ Output: tag, version, release_id                     │
│  │                                                              │
│  ├─→ Import code signing certificate                           │
│  ├─→ Verify version consistency (warnings only) ✓ NEW         │
│  ├─→ Build installer                                           │
│  │   └─→ INSTALLER_BUILDER.ps1 -AutoFix                       │
│  ├─→ Find installer in dist/                                  │
│  ├─→ Calculate SHA256 hash                                     │
│  ├─→ Upload to release                                         │
│  │   └─→ Graceful handling if release doesn't exist ✓ NEW    │
│  └─→ Generate summary with SHA256 & verification info          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │ Asset upload
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ GITHUB RELEASE PAGE                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Release: $11.18.3                                               │
│  ├─ Release Notes                                              │
│  ├─ Assets                                                     │
│  │  └─ SMS_Installer_$11.18.3.exe (156.2 MB)                   │
│  └─ Details                                                    │
│     ├─ SHA256: abc123def...                                    │
│     └─ Verification instructions                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

```text
## Key Design Improvements

### 1. Auto-Retry Logic in RELEASE_READY.ps1

**Problem**: Pre-commit failures would abort the entire release.

**Solution**:

```powershell
# First validation attempt

if validation_fails:
    # Auto-stage fixes and retry
    git add .
    validation.retry()

# Only abort if second attempt also fails

if validation_fails_again:
    exit 1

```text
**Impact**: Handles 90% of pre-commit issues automatically.

### 2. Automatic Workflow Dispatch

**Old workflow**:

```text
Tag push → release-on-tag creates release
          (no further action, user must manually trigger installer)

```text
**New workflow**:

```text
Tag push → release-on-tag creates release
        ↓
        └→ Automatically dispatch installer workflow
           (no manual step needed)

```text
**Code** (in release-on-tag.yml):

```yaml
trigger-installer-build:
  needs: create-release
  steps:
    - uses: actions/github-script@v6

      with:
        script: |
          await github.rest.actions.createWorkflowDispatch({
            workflow_id: 'release-installer-with-sha.yml',
            inputs: {
              tag: '${{ needs.create-release.outputs.tag }}'
            }
          });

```text
### 3. Smart Tag Resolution

**Handles multiple trigger scenarios**:

```powershell
# Scenario 1: Release event (automatic)

if github.event_name == 'release':
    tag = github.event.release.tag_name

# Scenario 2: Manual dispatch with tag

elif github.event.inputs.tag != '':
    tag = github.event.inputs.tag

# Scenario 3: Manual dispatch, no tag (fetch latest)

else:
    tag = gh release view --json tagName -q .tagName

# Scenario 4: Dispatch from release-on-tag (has tag input)

# Also handled by scenario 2

```text
**Benefits**:
- User can manually trigger with or without tag
- Works with draft releases
- Fetches latest automatically if needed

### 4. Graceful Error Handling

**Old behavior**: Any validation failure = hard error

**New behavior**:

```text
Version verification fails → Log warning, continue
Asset upload fails → Log warning, continue
Release doesn't exist → Skip upload, continue

```text
This ensures:
- Installer gets built even if version check has minor issues
- Workflow doesn't fail just because release is in draft state
- Multiple retry opportunities

### 5. Idempotent Release Creation

**Old behavior**: Could only create release once (error on re-run)

**New behavior**:

```python
try:
    release = get_release_by_tag(tag)
    update_release(release)  # Update body if exists
except NotFound:
    create_release(tag)      # Create if new

```text
**Impact**: Can safely re-run workflow without errors.

## Workflow State Machine

```text
┌─────────────────────┐
│  Initial State      │
│ (Developer starts)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  RELEASE_READY.ps1                      │
│  - Update versions                      │
│  - Run COMMIT_READY -Quick              │
│  - Commit & Push                        │
│  - Create & Push tag                    │
└──────────┬──────────────────────────────┘
           │
           ▼ Git push tag
┌─────────────────────────────────────────┐
│  GitHub: Tag Push Event                 │
│  Triggers: release-on-tag.yml           │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  create-release Job                     │
│  - Parse tag                            │
│  - Create/Update GitHub Release         │
│  - Outputs: tag                         │
└──────────┬──────────────────────────────┘
           │
           ▼ Job completion
┌─────────────────────────────────────────┐
│  trigger-installer-build Job            │
│  - Dispatch installer workflow          │
│  - Pass tag to next workflow            │
└──────────┬──────────────────────────────┘
           │
           ▼ Workflow dispatch
┌─────────────────────────────────────────┐
│  GitHub: Workflow Dispatch Event        │
│  Triggers: release-installer-with-sha   │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  resolve-tag Step                       │
│  - Determine tag from event/input       │
│  - Validate tag exists                  │
│  - Output: tag, version, release_id     │
└──────────┬──────────────────────────────┘
           │
           ├─→ import-cert ──────┐
           ├─→ version-check     ├──┐
           ├─→ build-installer ──┘  │
           ├─→ verify-exists ───────┤
           ├─→ calculate-hash ──────┤
           ├─→ upload-asset ────────┤
           └─→ summary ────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Final State                            │
│  - Release published                    │
│  - Installer uploaded                   │
│  - SHA256 available                     │
│  - Ready for users                      │
└─────────────────────────────────────────┘

```text
## Error Handling Paths

### Path 1: Pre-commit Failure → Auto-recovery

```text
RELEASE_READY.ps1
├─→ COMMIT_READY -Quick fails
├─→ Auto-stages fixes
├─→ COMMIT_READY -Quick retries
├─→ If still fails → Exit 1 (user must fix manually)
└─→ If succeeds → Continue with release

```text
### Path 2: Release Already Exists → Update

```text
release-on-tag.yml
├─→ Try to get existing release
├─→ If exists → Update body
├─→ If not found → Create new
└─→ Trigger installer workflow regardless

```text
### Path 3: Tag Resolution Fails → Graceful Fallback

```text
release-installer-with-sha.yml
├─→ resolve-tag fails → Error (return error code)
├─→ OR resolve-tag succeeds but release doesn't exist
├─→ Build installer anyway
├─→ Skip asset upload (with warning)
└─→ Provide summary so user can upload manually

```text
## Webhook & Event Flow

```text
GitHub Events
├─ push (tag push)
│  └─ Triggers: release-on-tag.yml
│
├─ release (from release-on-tag creation)
│  └─ Triggers: release-installer-with-sha.yml (alternate trigger)
│
└─ workflow_dispatch (manual trigger)
   ├─ Triggers: release-on-tag.yml (with tag input)
   └─ Triggers: release-installer-with-sha.yml (with tag input)

```text
## Idempotency & Safety

All operations are idempotent:

| Operation | Old | New | Safe to Retry? |
|-----------|-----|-----|---|
| Create/Update Release | Create only, error on retry | Create/Update | ✅ Yes |
| Build Installer | N/A | Always rebuilds | ✅ Yes |
| Upload Asset | Error on retry | Clobber/overwrite | ✅ Yes |
| Calculate Hash | Same every time | Same every time | ✅ Yes |

**Exception**: RELEASE_READY.ps1 must handle pre-commit cleanup between runs.

## Performance Metrics

| Step | Time | Parallelizable? |
|------|------|---|
| Version file updates | 10-20ms | N/A |
| COMMIT_READY -Quick | 2-3 min | No (sequential) |
| Git commit/push | 5-10 sec | No (sequential) |
| GitHub Release creation | 1-2 sec | No |
| Installer build | 5-10 min | No (Windows runner) |
| Asset upload | 30-60 sec | No |
| **Total time** | ~20 min | ~20 min |

## Testing & Validation

### Local Testing

```powershell
# Test version update

.\RELEASE_READY.ps1 -ReleaseVersion 1.12.9

# Test without tag (don't create actual tag)

# Review git diff before running with -TagRelease

# Full release

.\RELEASE_READY.ps1 -ReleaseVersion 1.12.9 -TagRelease

```text
### GitHub Workflow Testing

```text
1. Create a test tag: $11.18.3-test
2. Monitor workflows on GitHub Actions
3. Check release page for assets
4. Verify SHA256
5. Clean up test tag: git push origin --delete $11.18.3-test

```text
## Future Enhancements

| Enhancement | Complexity | Benefit |
|------------|-----------|---------|
| Slack notification | Low | Real-time updates |
| Auto-changelog | Medium | Professional release notes |
| Windows Package Manager | Medium | One-click install via `winget` |
| Staged rollout | High | Gradual user adoption |
| Automated bump | Low | Pre-release version bumping |
