- BACKLOG_PRIORITIES.md
- BACKLOG_PRIORITIES.md
# Workspace Cleanup & Organization Guide

## Overview

`WORKSPACE_CLEANUP.ps1` is a comprehensive script that organizes the Student Management System workspace by:

1. **Removing temporary files** - Test outputs, session docs, build artifacts
2. **Archiving old reports** - Audit reports, security fixes moved to `docs/archive/`
3. **Organizing documentation** - Moves docs to proper directories
4. **Cleaning caches** - Python/Node caches, build outputs
5. **Updating .gitignore** - Adds patterns for new file types
6. **Validating workspace** - Ensures critical files are present

## Quick Start

```powershell
# Preview what will be cleaned (recommended first step)

.\WORKSPACE_CLEANUP.ps1 -DryRun

# Quick cleanup (temp files only)

.\WORKSPACE_CLEANUP.ps1 -Mode quick

# Standard cleanup (default - temp files + organize docs)

.\WORKSPACE_CLEANUP.ps1

# Deep cleanup (includes caches)

.\WORKSPACE_CLEANUP.ps1 -Mode deep

```text
## Cleanup Modes

### Quick Mode (~2 minutes)

- Removes temporary test output files (*.txt in root)
- Removes obsolete scripts
- Removes session/temporary documentation
- **Does NOT** move docs or clean caches

### Standard Mode (~5 minutes) - DEFAULT

- Everything in Quick mode
- Archives audit reports to `docs/archive/reports-2025-12/`
- Organizes documentation into proper directories:
  - Release docs → `docs/releases/`
  - Workflow docs → `docs/development/`
  - Process guides → `docs/processes/`
  - Implementation plans → `docs/plans/`
- Cleans temporary directories

### Deep Mode (~10 minutes)

- Everything in Standard mode
- Cleans all Python caches (`.pytest_cache`, `.mypy_cache`, `.ruff_cache`)
- Removes `__pycache__` directories
- Cleans frontend build output (`frontend/dist`)

## What Gets Removed

### Test Output Files (Always)

```text
admin_bootstrap_test_output.txt (x10)
backend_test_output.txt
students_router_test_output.txt
test_students_router_verbose.log

```text
### Deprecated Scripts (Always)

```text
SMS.ps1 → Replaced by DOCKER.ps1 and NATIVE.ps1
DOCKER_TOGGLE.bat → Old batch file
COMMIT_READY_WRAPPER.ps1 → Not needed
FINALIZE_WORKFLOWS.ps1 → One-time script
SECURITY_FIX_2025-12-27.ps1 → One-time fix
docker_seed_e2e.py → Old seed script
e2e-local.ps1 → Old e2e script
~~fix_greek_encoding_permanent.py~~ → **RESTORED** (active build utility, incorrectly removed)

```text
### Temporary Documentation (Always)

```text
tmp_pr_summary.md
tmp_pr_update.md
SESSION_COMPLETION_SUMMARY.md
README_SESSION_COMPLETE.md
DOCUMENTATION_INDEX_SESSION.md
SOLUTION_SUMMARY.md

```text
### Temporary Directories (Standard+)

```text
tmp_artifacts/
tmp_test_migrations/
artifacts_run_*/

```text
### Python Caches (Deep mode only)

```text
.pytest_cache/
.mypy_cache/
.ruff_cache/
backend/.pytest_cache/
backend/.mypy_cache/
backend/.ruff_cache/
**/__pycache__/

```text
### Frontend Build (Deep mode only)

```text
frontend/dist/

```text
### Release Artifacts (Post-release mode)

```text
RELEASE_NOTES_v*.md → docs/releases/
GITHUB_RELEASE_v*.md → docs/releases/
StudentManagementSystem_*.exe → dist/
release_commit_msg.txt
release_notes_temp.md
github_release_draft.md

```text
## What Gets Moved (Standard mode)

### Audit Reports → `docs/archive/reports-2025-12/`

```text
CODEQL_FIXES_2025-12-27.md
COMPLETE_SECURITY_ALERT_ANALYSIS_2025-12-27.md
SECURITY_AUDIT_COMPLETION_REPORT_2025-12-27.md
SECURITY_AUDIT_REPORT_2025-12-27.md
SECURITY_HARDENING_COMPLETE_2025-12-27.md
SECURITY_FIXES_SUMMARY.md
BACKUP_VERIFICATION_INVESTIGATION_2025-12-18.md
BACKUP_VERIFICATION_REPORT_2025-12-18.md
PROJECT_STATUS_REPORT_2025-12-18.md
CODE_CHANGES_SUMMARY.md
DOCUMENTATION_UPDATE_SUMMARY_$11.14.0.md
FINAL_VALIDATION_REPORT.md
TEST_VALIDATION_REPORT.md
WORK_COMPLETION_CHECKLIST.md
TRIVY_CONFIGURATION_FIX.md

```text
### Release Guides → **KEPT IN ROOT** (actively referenced)

```text
QUICK_RELEASE_GUIDE.md           ← Referenced by other docs
RELEASE_COMMAND_REFERENCE.md     ← Quick reference
RELEASE_DOCUMENTATION_GUIDE.md   ← GENERATE_RELEASE_DOCS.ps1 guide
RELEASE_PREPARATION_CHECKLIST.md ← Pre-release checklist
RELEASE_PREPARATION_SCRIPT_GUIDE.md ← RELEASE_PREPARATION.ps1 guide

```text
### Release Workflow Docs → `docs/development/release-workflow/`

```text
COMPLETE_RELEASE_WORKFLOW.md       ← Detailed workflow
WORKFLOW_ARCHITECTURE_DETAILED.md  ← Technical details
WORKFLOW_DOCUMENTATION_INDEX.md    ← Navigation
WORKFLOW_TRIGGERING_IMPROVEMENTS.md ← Improvements
WORKFLOW_VERIFICATION_CHECKLIST.md ← Verification
FILES_SUMMARY.md                   ← File inventory
START_HERE.md                      ← Start guide

```text
### Workflow Documentation → `docs/development/`

```text
WORKFLOW_CONSOLIDATION_INDEX.md
WORKFLOW_CONSOLIDATION_REPORT.md
WORKFLOW_CONSOLIDATION_SUMMARY.md
WORKFLOW_IMPLEMENTATION_SUMMARY.md

```text
### Process Guides → `docs/processes/`

```text
RELEASE_AUTOMATION_GUIDE.md
BACKUP_VERIFICATION_AUTOMATION.md
AUTOMATED_SCANNING_SETUP.md
SECRET_SCANNING_SETUP.md
SECURITY_AUDIT_SCHEDULE.md
BENCHMARKING_PROCESS.md
LOAD_TESTING_PROCESS.md
METRICS_EXPORT_GUIDE.md

```text
### Implementation Plans → `docs/plans/`

```text
RBAC_PHASE2.4_PLAN.md
INSTALLER_IMPROVEMENTS_$11.14.0+.md

```text
## What Stays in Root

**Essential Files** (Never moved):

```text
README.md
LICENSE
VERSION
CHANGELOG.md
pyproject.toml
package.json
CODE_OF_CONDUCT.md
CONTRIBUTING.md
docs/plans/UNIFIED_WORK_PLAN.md
TODO_PRIORITIES.md
LLM_AGENT_INSTRUCTIONS.md
SECURITY_AUDIT_SUMMARY.md (important reference)

```text
**Scripts** (Never moved):

```text
DOCKER.ps1
NATIVE.ps1
COMMIT_READY.ps1
RELEASE_PREPARATION.ps1
RELEASE_READY.ps1
RELEASE_WITH_DOCS.ps1
GENERATE_RELEASE_DOCS.ps1
INSTALLER_BUILDER.ps1

```text
## Parameters

### -Mode

Cleanup intensity level.

```powershell
.\WORKSPACE_CLEANUP.ps1 -Mode quick    # Fast
.\WORKSPACE_CLEANUP.ps1 -Mode standard # Default
.\WORKSPACE_CLEANUP.ps1 -Mode deep     # Thorough

```text
### -DryRun

Preview changes without executing.

```powershell
.\WORKSPACE_CLEANUP.ps1 -DryRun
# Shows what would be removed/moved

# No actual changes made

```text
### -SkipDocs

Skip documentation organization (only clean temp files).

```powershell
.\WORKSPACE_CLEANUP.ps1 -SkipDocs
# Removes temp files, skips moving docs

```text
### -SkipTests

Skip post-cleanup validation.

```powershell
.\WORKSPACE_CLEANUP.ps1 -SkipTests
# Faster, but doesn't verify critical files

```text
## Common Workflows

### Workflow 1: Safe Cleanup (Recommended)

```powershell
# 1. Preview changes

.\WORKSPACE_CLEANUP.ps1 -DryRun

# 2. Review output carefully

# 3. Execute if satisfied

.\WORKSPACE_CLEANUP.ps1

# 4. Check git status

git status

# 5. Verify tests still pass

.\COMMIT_READY.ps1 -Mode quick

# 6. Commit changes

git add -A
git commit -m "chore: workspace cleanup and organization"

```text
### Workflow 2: Quick Cleanup Only

```powershell
# Just remove temp files, don't reorganize

.\WORKSPACE_CLEANUP.ps1 -Mode quick
git add -A
git commit -m "chore: remove temporary test outputs"

```text
### Workflow 3: Deep Clean Before Release

```powershell
# Full cleanup including caches

.\WORKSPACE_CLEANUP.ps1 -Mode deep

# Verify everything works

.\COMMIT_READY.ps1 -Mode full

# Commit

git add -A
git commit -m "chore: deep workspace cleanup"

```text
### Workflow 4: Documentation Reorganization Only

```powershell
# Skip cleanup, just organize docs

# (Note: Standard mode always includes some cleanup)
.\WORKSPACE_CLEANUP.ps1 -Mode standard
# Then manually review doc moves

```text
### Workflow 5: Post-Release Cleanup

```powershell
# After releasing $11.14.0, organize release artifacts

.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.13.0"

# Wait for release to complete, then cleanup

.\WORKSPACE_CLEANUP.ps1 -Mode post-release

# Review and commit

git status
git add -A
git commit -m "chore: post-release cleanup for $11.14.0"

```text
## Output Example

```text
╔═══════════════════════════════════════════════════════╗
║  PHASE 1: Temporary Test Outputs
╚═══════════════════════════════════════════════════════╝

--- Test Output Files in Root ---
✓ Removed: Test output: admin_bootstrap_test_output.txt (245 KB)
✓ Removed: Test output: admin_bootstrap_test_output2.txt (198 KB)
...

╔═══════════════════════════════════════════════════════╗
║  PHASE 2: Obsolete & Deprecated Files
╚═══════════════════════════════════════════════════════╝

--- Deprecated Scripts ---
✓ Removed: Deprecated script: SMS.ps1 (15.3 KB)
✓ Removed: Deprecated script: DOCKER_TOGGLE.bat (1.2 KB)
...

╔═══════════════════════════════════════════════════════╗
║  PHASE 3: Organize Documentation
╚═══════════════════════════════════════════════════════╝

--- Release Documentation ---
✓ Moved: Release doc: COMPLETE_RELEASE_WORKFLOW.md
✓ Moved: Release doc: QUICK_RELEASE_GUIDE.md
...

╔═══════════════════════════════════════════════════════╗
║  CLEANUP SUMMARY
╚═══════════════════════════════════════════════════════╝

Mode: standard
Items removed: 35
Items moved: 28
Space freed: 2.4 MB

✓ Workspace cleanup complete!

Next steps:
  1. Review changes: git status
  2. Run tests: .\COMMIT_READY.ps1 -Mode quick
  3. Commit: git add -A && git commit -m 'chore: workspace cleanup and organization'

```text
## Validation

After cleanup, the script verifies these critical files exist:

```text
README.md
VERSION
CHANGELOG.md
LICENSE
pyproject.toml
DOCKER.ps1
NATIVE.ps1
COMMIT_READY.ps1
RELEASE_PREPARATION.ps1
RELEASE_READY.ps1
GENERATE_RELEASE_DOCS.ps1
RELEASE_WITH_DOCS.ps1

```text
If any are missing, an error is shown.

## Integration with Release Process

**Pre-Release Checklist:**

```powershell
# 1. Clean workspace

.\WORKSPACE_CLEANUP.ps1 -Mode deep -DryRun  # Preview
.\WORKSPACE_CLEANUP.ps1 -Mode deep          # Execute

# 2. Run validation

.\COMMIT_READY.ps1 -Mode full

# 3. Commit cleanup

git add -A
git commit -m "chore: pre-release workspace cleanup"
git push origin main

# 4. Proceed with release

.\RELEASE_WITH_DOCS.ps1 -ReleaseVersion "1.13.0"

```text
**Note**: Release guides stay in root for easy access:
- QUICK_RELEASE_GUIDE.md (referenced by documentation)
- RELEASE_COMMAND_REFERENCE.md (quick reference)
- RELEASE_DOCUMENTATION_GUIDE.md (doc generation guide)
- RELEASE_PREPARATION_CHECKLIST.md (pre-release checklist)
- RELEASE_PREPARATION_SCRIPT_GUIDE.md (script guide)

## .gitignore Updates

The script automatically adds these patterns to `.gitignore`:

```gitignore
# Test output files

admin_bootstrap_test_output*.txt
backend_test_output.txt
students_router_test_output.txt
test_*.log

# Temporary markdown files

tmp_*.md
SESSION_*.md
README_SESSION*.md

# Archive directories

docs/archive/

```text
## Safety Features

1. **DryRun mode** - Preview before executing
2. **Error tracking** - Continues on errors, reports at end
3. **Size reporting** - Shows space freed
4. **Validation** - Checks critical files after cleanup
5. **Selective exclusions** - Never touches critical files/dirs

## Troubleshooting

### Issue: Files still present after cleanup

**Possible causes**:
- File in use (close editors/terminals)
- Permissions issue (run as admin)
- Path too long (move repo closer to drive root)

**Solution**:

```powershell
# Check what's blocking

Get-Process | Where-Object {$_.Path -like "*student-management-system*"}

# Retry with error details

.\WORKSPACE_CLEANUP.ps1 -Mode standard -Verbose

```text
### Issue: Critical file accidentally removed

**Recovery**:

```powershell
# Restore from git

git checkout HEAD -- <filename>

# Or restore from last commit

git reset --hard HEAD

```text
### Issue: Docs moved to wrong location

**Fix**:

```powershell
# Preview first

.\WORKSPACE_CLEANUP.ps1 -DryRun

# Or manually move

Move-Item docs/releases/WRONG.md . -Force

```text
## Best Practices

1. **Always preview first**: Use `-DryRun` to see changes
2. **Check git status**: Review before committing
3. **Run tests after**: Ensure nothing broke
4. **Commit separately**: Don't mix cleanup with feature changes
5. **Deep clean before releases**: Use `-Mode deep` for releases
6. **Quick clean regularly**: Use `-Mode quick` weekly

## See Also

- [COMMIT_READY.ps1](COMMIT_READY.ps1) - Pre-commit validation
- [RELEASE_PREPARATION.ps1](RELEASE_PREPARATION.ps1) - Pre-release checks
- [scripts/workflows/cleanup_pre_release.ps1](scripts/workflows/cleanup_pre_release.ps1) - Original cleanup script

---

**Status**: ✅ Production ready
**Version**: 1.0
**Last Updated**: 2025-12-27
