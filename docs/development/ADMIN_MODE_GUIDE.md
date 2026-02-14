# Admin Mode Development Guide

**Status**: Active
**Updated**: February 14, 2026
**Applies To**: VS Code running as Administrator (for self-hosted runners)

---

## Overview

Running VS Code as Administrator is sometimes necessary (e.g., for self-hosted GitHub Actions runners), but it can cause permission conflicts and script hangs.

## Common Issues in Admin Mode

### 1. Git Process Hangs
**Symptom**: Git commands hang indefinitely
**Cause**: Credential manager context mismatch (admin vs user)
**Solution**: Use SSH keys instead of HTTPS authentication

```powershell
# Check for hung git processes
Get-Process git* -ErrorAction SilentlyContinue | 
  Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-5) }
```

### 2. Node/NPM Lock Files
**Symptom**: "EACCES: permission denied" errors
**Cause**: Admin-owned files in node_modules
**Solution**: Clean and reinstall with consistent permissions

```powershell
# Clean admin-owned node_modules
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
```

### 3. Python Cache Conflicts
**Symptom**: Test failures with "Permission denied" on __pycache__
**Cause**: Mixed admin/user ownership in .pytest_cache
**Solution**: Clear Python cache before running tests

```powershell
# Clear Python caches
.\CLEAR_PYCACHE.ps1
```

### 4. Script Timeouts
**Symptom**: Scripts hang for hours (e.g., VERIFY_AND_RECORD_STATE.ps1)
**Cause**: Child processes waiting for user-context operations
**Solution**: Use timeout-protected versions (now built-in as of Feb 14, 2026)

---

## Safe Workflows for Admin Mode

### ✅ DO: Use Timeout-Protected Scripts

```powershell
# These scripts now have built-in timeout protection:
.\scripts\VERIFY_AND_RECORD_STATE.ps1  # 5-minute timeout on COMMIT_READY
.\COMMIT_READY.ps1 -Quick               # Use -Quick mode to minimize hang risk
```

### ✅ DO: Clean Up Hung Processes Regularly

```powershell
# Find processes running > 30 minutes
Get-Process pwsh, git, node, python -ErrorAction SilentlyContinue | 
  Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-30) } |
  Select-Object Id, ProcessName, StartTime

# Kill specific hung process
Stop-Process -Id <PID> -Force
```

### ✅ DO: Run Tests in Separate Admin Terminal

```powershell
# Instead of VS Code task, run in dedicated terminal:
Start-Process pwsh -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File .\RUN_TESTS_BATCH.ps1"
```

### ❌ DON'T: Use Background Tasks for Long Operations

```powershell
# ❌ AVOID: Background task in admin VS Code
# (hangs are hard to detect and kill)

# ✅ BETTER: Foreground with timeout monitoring
$job = Start-Job { .\RUN_TESTS_BATCH.ps1 }
Wait-Job -Job $job -Timeout 600  # 10-minute timeout
```

### ❌ DON'T: Mix Admin and Non-Admin Runs

```powershell
# ❌ AVOID: Running same workspace in both modes
# (creates permission conflicts on shared files)

# ✅ BETTER: Stick to one mode per workspace session
```

---

## Emergency Cleanup Commands

### Kill All Hung Processes

```powershell
# Nuclear option: Kill all long-running development processes
Get-Process pwsh, git, node, python -ErrorAction SilentlyContinue | 
  Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-20) } |
  Stop-Process -Force -ErrorAction SilentlyContinue
```

### Remove All Lock Files

```powershell
# Git locks
Remove-Item .git\*.lock -Force -ErrorAction SilentlyContinue

# NPM locks
Remove-Item node_modules\.package-lock.json -Force -ErrorAction SilentlyContinue

# Python locks
Get-ChildItem -Recurse -Filter "*.pyc.lock" | Remove-Item -Force
```

### Reset File Permissions

```powershell
# Reset ownership to current user (run in admin PowerShell)
$path = Get-Location
takeown /F "$path" /R /D Y
icacls "$path" /reset /T /C /Q
```

---

## Timeout-Protected Scripts (Built-In)

As of February 14, 2026, these scripts have timeout protection:

| Script | Timeout | What It Protects |
|--------|---------|------------------|
| `VERIFY_AND_RECORD_STATE.ps1` | 5 min | COMMIT_READY -Quick call |

### Planned Improvements

- [ ] Add timeout to `COMMIT_READY.ps1` test runs
- [ ] Add timeout to `RUN_TESTS_BATCH.ps1` individual batches
- [ ] Add admin mode detection to all major scripts
- [ ] Create `CLEANUP_HUNG_PROCESSES.ps1` helper

---

## Self-Hosted Runner Specific

### GitHub Actions Runner Service

If you're running GitHub Actions runner as a service:

```powershell
# Check runner service status
Get-Service actions.runner.*

# View runner logs (in admin PowerShell)
Get-Content "C:\actions-runner\_diag\*.log" -Tail 50

# Restart runner service
Restart-Service actions.runner.*
```

### Runner Permissions

The runner needs admin rights for:
- Docker container management
- Windows service control
- System-level testing

But VS Code doesn't need admin rights for:
- Code editing
- Git operations
- Most development tasks

**Recommendation**: 
- Run **runner service** as admin
- Run **VS Code** as normal user when possible
- Use admin terminals for specific operations only

---

## Quick Reference

```powershell
# Check if running as admin
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Host "Admin: $isAdmin"

# Find hung processes (> 30 min)
Get-Process pwsh, git, node -ErrorAction SilentlyContinue |
  Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-30) } |
  Format-Table Id, ProcessName, StartTime, @{N='Runtime';E={(New-TimeSpan -Start $_.StartTime).ToString('hh\:mm\:ss')}}

# Safe cleanup
.\CLEAR_PYCACHE.ps1
Remove-Item node_modules\.package-lock.json -Force -ErrorAction SilentlyContinue
git status  # Verify no corruption
```

---

## See Also

- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Git best practices
- [DEVELOPER_GUIDE_COMPLETE.md](DEVELOPER_GUIDE_COMPLETE.md) - Development setup
- [AGENT_POLICY_ENFORCEMENT.md](../AGENT_POLICY_ENFORCEMENT.md) - Script execution policies
