# GitHub Actions Runner Docker Access Fix

**Problem**: GitHub Actions self-hosted runner (running as NetworkService) cannot access Docker Desktop's named pipe.

**Solution**: Reconfigure runner to run as interactive user account.

**Status**: ✅ Automation scripts ready for deployment

**Last Updated**: February 12, 2026

---

## 📋 Overview

### The Issue

Docker Desktop on Windows uses a **named pipe** for Docker daemon communication:
```
\\.\pipe\dockerDesktopLinuxEngine
```

This pipe has **explicit ACL permissions** that:
- ✅ Allow logged-in user accounts (who installed Docker)
- ❌ **Deny** service accounts like NetworkService
- ❌ Don't respect docker-users group membership for named pipes

### Why This Happened

The GitHub Actions runner was initially configured as a Windows service running under:
- **Account**: `NT AUTHORITY\NetworkService`
- **Permissions**: Limited service account (standard security practice)
- **Docker Access**: ❌ Cannot access Docker Desktop named pipe

### The Solution

Reconfigure the runner to operate under the **logged-in user account** instead of NetworkService:
- **Account**: `DOMAIN\Username` (your interactive account)
- **Permissions**: Full user privileges (same as you have when logged in)
- **Docker Access**: ✅ Full Docker Desktop access (inherits your permissions)

---

## 🚀 Quick Start (Automated)

### Prerequisites

1. **REC Host Access**: RDP or physical access to 172.16.0.17
2. **Administrator Rights**: Must run PowerShell as Administrator
3. **Docker Desktop Running**: Ensure Docker Desktop is active
4. **Scripts Available**: Copy automation scripts to REC host

### Step 1: Transfer Scripts to REC Host

On your **development machine** (where this repo is):

```powershell
# Option A: Copy via RDP shared clipboard
# 1. Copy the scripts folder
# 2. Paste on REC host desktop

# Option B: Copy via network share (if available)
Copy-Item -Path "D:\SMS\student-management-system\scripts\RECONFIGURE_RUNNER_USER_MODE.ps1" `
          -Destination "\\172.16.0.17\C$\Temp\" -Force

Copy-Item -Path "D:\SMS\student-management-system\scripts\VERIFY_RUNNER_DOCKER_ACCESS.ps1" `
          -Destination "\\172.16.0.17\C$\Temp\" -Force
```

### Step 2: Run Reconfiguration on REC Host

On **REC host** (172.16.0.17), open **PowerShell as Administrator**:

```powershell
# Navigate to scripts location
cd C:\Temp  # Or wherever you copied the scripts

# Preview what will happen (DRY RUN)
.\RECONFIGURE_RUNNER_USER_MODE.ps1 -DryRun

# Execute reconfiguration (with confirmations)
.\RECONFIGURE_RUNNER_USER_MODE.ps1

# OR: Execute without prompts (fully automated)
.\RECONFIGURE_RUNNER_USER_MODE.ps1 -Force
```

### Step 3: Verify Docker Access

Still on **REC host**:

```powershell
# Run verification script
.\VERIFY_RUNNER_DOCKER_ACCESS.ps1

# Expected output: "ALL CHECKS PASSED"
```

### Step 4: Test with Pipeline Run

Back on your **development machine**:

```powershell
# Trigger a new pipeline run
git commit --allow-empty -m "test: verify Docker access fix"
git push origin main

# Monitor the deployment
gh run watch
```

**Expected Result**: Deploy to Staging job should now **succeed** ✅

---

## 🔧 What the Automation Does

### Script 1: `RECONFIGURE_RUNNER_USER_MODE.ps1`

**Purpose**: Safely reconfigure runner from service account to user mode.

**Actions Performed**:
1. ✅ Verifies Administrator privileges
2. ✅ Validates runner installation path
3. ✅ Backs up current configuration
4. ✅ Stops runner service (if running)
5. ✅ Uninstalls service
6. ✅ Reconfigures for interactive user mode
7. ✅ Reinstalls service under user account
8. ✅ Starts service
9. ✅ Verifies Docker access

**Safety Features**:
- Interactive confirmations (unless `-Force` used)
- Configuration backup before changes
- Error handling with rollback capability
- Status validation at each step

### Script 2: `VERIFY_RUNNER_DOCKER_ACCESS.ps1`

**Purpose**: Comprehensive verification that Docker access works.

**Checks Performed**:
1. Docker command in PATH
2. Docker version retrieval
3. Docker daemon connectivity (the critical test)
4. Docker info retrieval
5. Container listing operations
6. Docker Compose availability
7. Runner service status

**Output**: Pass/fail summary with actionable guidance.

---

## 📖 Manual Execution (If Automation Fails)

If automated scripts encounter issues, here's the manual process:

### Step 1: Stop & Uninstall Service

```powershell
cd D:\actions-runner  # Or your runner path

.\svc.ps1 stop
.\svc.ps1 uninstall
```

### Step 2: Reinstall as User

```powershell
# This will prompt for credentials during install
.\svc.ps1 install

# When prompted, use:
# - Username: Your Windows username (e.g., Administrator or your domain account)
# - Password: Your Windows password
```

### Step 3: Start Service

```powershell
.\svc.ps1 start
```

### Step 4: Verify

```powershell
# Check service status
Get-Service -Name "actions.runner.*"

# Test Docker access
docker ps
```

---

## 🔍 Troubleshooting

### Issue: "Script requires Administrator privileges"

**Solution**: Right-click PowerShell → "Run as Administrator"

### Issue: "Runner path not found"

**Solution**: Update the `-RunnerPath` parameter:
```powershell
.\RECONFIGURE_RUNNER_USER_MODE.ps1 -RunnerPath "C:\custom-path\actions-runner"
```

### Issue: Service install prompts for credentials

**Expected Behavior**: This is normal. Enter your Windows credentials:
- The account must have "Log on as a service" rights
- Use the same account you're currently logged in as

### Issue: Docker test still fails after reconfiguration

**Possible Causes**:
1. Docker Desktop not running
2. User account doesn't have Docker Desktop access
3. Service hasn't fully started yet

**Solutions**:
```powershell
# 1. Verify Docker Desktop is running
docker version

# 2. Check service status
Get-Service -Name "actions.runner.*" | Select-Object Name, Status, StartType

# 3. Restart service
cd D:\actions-runner
.\svc.ps1 restart

# 4. Run verification again
.\VERIFY_RUNNER_DOCKER_ACCESS.ps1
```

### Issue: Runner shows as running but workflows don't pick it up

**Solution**: Wait 30-60 seconds for GitHub to reconnect, then:
```powershell
# Check runner connection on GitHub
# Visit: https://github.com/bs1gr/AUT_MIEEK_SMS/settings/actions/runners

# If offline, restart runner
cd D:\actions-runner
.\svc.ps1 restart
```

---

## 📊 Expected Results

### Before Reconfiguration

```
Service Account: NT AUTHORITY\NetworkService
Docker Access:   ❌ DENIED
Error:           permission denied while trying to connect to Docker API
Deploy Job:      ❌ FAILS
```

### After Reconfiguration

```
Service Account: DOMAIN\Username
Docker Access:   ✅ ALLOWED
Error:           (none)
Deploy Job:      ✅ SUCCEEDS
```

---

## 🔐 Security Considerations

### Service Account vs User Account

| Aspect | Service Account | User Account |
|--------|----------------|--------------|
| Permissions | Minimal (principle of least privilege) | Full user rights |
| Docker Access | ❌ Blocked by named pipe ACL | ✅ Allowed |
| Security Posture | ✅ More secure | ⚠️ Less secure |
| Best For | Production | Staging/Development |

### Recommendation for This Environment

**Use User Account** because:
- ✅ This is a **staging environment** (not production)
- ✅ Security overhead is acceptable for staging
- ✅ Development/testing requires Docker access
- ✅ Simpler maintenance (no ACL permissions to manage)

**Alternative for Production**:
- Consider Docker Swarm with TCP socket
- Or use Windows Container mode (not Docker Desktop)
- Or dedicated CI/CD agents with proper security hardening

---

## 📝 Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-12 | Initial automation scripts created | AI Agent |
| 2026-02-12 | Identified NetworkService permission issue | AI Agent |
| 2026-02-12 | Documented solution with automated scripts | AI Agent |

---

## 🆘 Support

If you encounter issues:

1. **Run verification**: `.\VERIFY_RUNNER_DOCKER_ACCESS.ps1`
2. **Check logs**: Review script output for errors
3. **Manual fallback**: Use manual steps documented above
4. **Escalate**: Contact repository maintainer with:
   - Verification script output
   - Error messages
   - Service status: `Get-Service -Name "actions.runner.*" | Format-List`

---

## 📚 Related Documentation

- [GitHub Actions Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/)
- [Windows Service Accounts](https://docs.microsoft.com/en-us/windows/security/identity-protection/access-control/service-accounts)

---

**Status**: ✅ Ready for deployment
**Next Action**: Execute `RECONFIGURE_RUNNER_USER_MODE.ps1` on REC host
