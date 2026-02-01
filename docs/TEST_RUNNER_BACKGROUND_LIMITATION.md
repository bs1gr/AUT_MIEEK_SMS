# Test Runner Background Execution Limitation

**Date**: February 1, 2026
**Issue**: RUN_TESTS_BATCH.ps1 doesn't capture pytest output when run via `run_in_terminal` with `isBackground: true`

## Problem Description

When RUN_TESTS_BATCH.ps1 is executed as a background process using AI agent tools with `isBackground: true`, pytest output is not properly captured to the log file. The script creates the log file and writes headers, but pytest test results never appear.

## Symptoms

1. Log file is created (e.g., `backend_batch_run_20260201_132558.txt`)
2. File contains only initial headers and "Running tests..." message
3. File size remains small (~1020 bytes)
4. Python processes appear to be running but produce no output
5. Script appears to hang or complete without logging test results

## Root Cause

The `run_in_terminal` tool with `isBackground: true` doesn't properly handle stream redirection for pytest's output. When pytest runs (`python -m pytest $testFiles`), its stdout/stderr streams don't get captured by PowerShell's output redirection (`$output = ... 2>&1`).

## Workaround

**DO NOT** run RUN_TESTS_BATCH.ps1 with `isBackground: true` via `run_in_terminal`.

Instead, use one of these methods:

### Method 1: Foreground Execution (Recommended)
```powershell
.\RUN_TESTS_BATCH.ps1 -BatchSize 5
```
- Blocks terminal until complete
- All output captured to log file
- Can monitor progress in real-time

### Method 2: Native PowerShell Background Job
```powershell
Start-Job -ScriptBlock { Set-Location "D:\SMS\student-management-system"; .\RUN_TESTS_BATCH.ps1 -BatchSize 5 }
```
- Runs in true PowerShell background
- Check status with `Get-Job`
- Retrieve results with `Receive-Job`

### Method 3: VS Code Task
Use the predefined task "Run backend tests (batch runner)" from tasks.json:
- Opens dedicated terminal
- Full output visibility
- Can monitor or continue working

## Verification

After running tests, verify output was captured:
```powershell
.\MONITOR_BATCH_TESTS.ps1 -Latest
```

If file size is < 2KB and only shows headers, tests didn't run properly.

## Fixed Issues

- ✅ Removed duplicate `Write-Host` call after `Write-Log` (line 261 deleted)
- ✅ Added comprehensive logging to RUN_TESTS_BATCH.ps1
- ✅ Created MONITOR_BATCH_TESTS.ps1 helper script

## Related Files

- `RUN_TESTS_BATCH.ps1` - Batch test runner (fixed Feb 1, 2026)
- `MONITOR_BATCH_TESTS.ps1` - Results viewer
- `test-results/backend_batch_run_*.txt` - Log files
- `docs/TEST_LOGGING_IMPROVEMENT_FEB1_2026.md` - Original logging enhancement

## Policy Compliance

Per **Policy 1** in `docs/AGENT_POLICY_ENFORCEMENT.md`:
- ✅ ALWAYS use `.\RUN_TESTS_BATCH.ps1` for backend tests
- ❌ NEVER use `cd backend && pytest -q` (crashes VS Code)
- ✅ Run in foreground or use native PowerShell jobs
- ❌ Don't use `run_in_terminal` with `isBackground: true`
