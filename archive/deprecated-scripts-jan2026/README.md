# Deprecated Scripts Archive - January 2026

**Archived**: January 25, 2026
**Reason**: Workspace cleanup - obsolete scripts and one-off utilities

This directory contains scripts that were archived during the January 2026 workspace cleanup. These files served their purpose and are no longer needed in the active codebase.

## Categories of Archived Files

### 1. Git/Commit One-Off Fixes (Completed)
These scripts were created to fix specific issues and are no longer needed:

- `commit_profile_fix.ps1` - PowerShell profile improvements (completed)
- `commit_terminal_encoding_fix.ps1` - Terminal encoding fixes (completed)
- `commit_validation_changes.ps1` - Validation changes (completed)
- `execute_commits.ps1` - One-off commit execution utility
- `fix_git_state.ps1` - Git state fix (completed)
- `push_changes.ps1` - Simple push wrapper (use git directly)
- `quick_commit.ps1` - Quick commit wrapper (use git directly)

### 2. Terminal Encoding Fixes (Issue Resolved)
Terminal encoding issues were resolved; these diagnostic/fix scripts are no longer needed:

- `diagnose_terminal_encoding.ps1`
- `terminal_encoding_fix.ps1`
- `verify_terminal_fix.ps1`

### 3. Superseded by COMMIT_READY.ps1 and RUN_TESTS_BATCH.ps1
Functionality consolidated into main scripts:

- `run_batch_tests_simple.ps1` → Use `RUN_TESTS_BATCH.ps1`
- `wait_for_tests.ps1` → Functionality in `RUN_TESTS_BATCH.ps1`
- `test_commit_ready.ps1` → Use `COMMIT_READY.ps1 -Quick`

### 4. Superseded by CI/CD Pipeline
Functionality moved to GitHub Actions:

- `check_ci_status.ps1` → Use GitHub Actions web UI or `gh` CLI
- `check_test_results.ps1` → Test results in CI artifacts
- `rebuild-production.ps1` → Use `DOCKER.ps1 -UpdateClean`

### 5. Explicitly Deprecated Scripts
Scripts marked as deprecated in their headers:

- `scripts/dev/internal/CLEANUP_OBSOLETE_FILES.ps1` → Use `CLEANUP_COMPREHENSIVE.ps1`
- `scripts/deploy/internal/CREATE_PACKAGE.ps1` → Use `CREATE_DEPLOYMENT_PACKAGE.ps1`

### 6. One-Off Test/Diagnostic Files

- `create_admin_user.py` → Use `backend/scripts` admin utilities
- `seed_test_data.py` → One-off utility
- `test_login.py` → One-off diagnostic
- `test_runner_check.py` → Diagnostic completed
- `test_output.txt` → Old test output
- `test.txt` → Old test file
- `test_websocket_client.html` → One-off WebSocket test

### 7. Misplaced Frontend Files
Files that should have been in frontend/ directory:

- `CourseRow.tsx`
- `helpers.ts`
- `VirtualStudentList.tsx`

### 8. Obsolete Batch Wrappers

- `clean_git.bat` → Use PowerShell scripts directly

### 9. Old Log Files

- `commit_ready_*.log` - Old commit validation logs
- `phase6_*.log` - Old load test logs

## Current Active Scripts (Reference)

### Root Directory
- `COMMIT_READY.ps1` - Pre-commit validation (ACTIVE)
- `DOCKER.ps1` - Docker deployment operations (ACTIVE)
- `NATIVE.ps1` - Native development mode (ACTIVE)
- `RUN_TESTS_BATCH.ps1` - Backend test runner (ACTIVE)
- `RUN_E2E_TESTS.ps1` - E2E test runner (ACTIVE)
- `WORKSPACE_CLEANUP.ps1` - Workspace cleanup utility (ACTIVE)
- `WORKSPACE_RECOVERY.ps1` - Workspace recovery (ACTIVE)
- `INSTALLER_BUILDER.ps1` - Windows installer builder (ACTIVE)
- `GENERATE_RELEASE_DOCS.ps1` - Release documentation generator (ACTIVE)
- `RELEASE_*.ps1` - Release automation scripts (ACTIVE)

### Scripts Directory
See `scripts/README.md` for complete documentation of active scripts.

## Restoration

If you need to restore any of these files:

```powershell
# Restore a specific file
Copy-Item "archive/deprecated-scripts-jan2026/script_name.ps1" .

# View file contents
Get-Content "archive/deprecated-scripts-jan2026/script_name.ps1"
```

## Permanent Deletion

These files can be permanently deleted after:
1. Confirmation that no functionality is broken (1-2 weeks)
2. Verification that git history preserves them
3. Team approval for permanent removal

**Do not delete before**: February 10, 2026

---

**Archived by**: AI Agent (Workspace Cleanup)
**Documentation**: This README serves as the inventory of archived files
