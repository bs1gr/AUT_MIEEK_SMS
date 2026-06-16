# CRITICAL FIX: Installer 400 Bad Request Error Resolution

**Date**: February 3, 2026
**Version**: v1.17.7
**Status**: ✅ FIXED (commit e196120cc)
**Severity**: CRITICAL - Prevented all upgrades from working

---

## 🚨 Problem Summary

**User Reported Issues:**
1. ❌ Old .env file (timestamp 16/12/2025) persisted after upgrade
2. ❌ 400 Bad Request error on login after upgrade
3. ❌ Old uninstaller files remained (unins000.dat)
4. ❌ Old Docker images not removed (sms-fullstack:1.12.3)
5. ❌ Greek characters showing as unknown in PowerShell 7

**Impact**: Installer upgrades were completely broken - users could not login after upgrading.

---

## 🔍 Root Cause Analysis

### The Backwards .env Restoration Bug

The installer had **backwards logic** for handling .env files during upgrades:

**WRONG BEHAVIOR (Before Fix):**
```pascal
1. PrepareToInstall() - Backup OLD .env files (dated 16/12/2025)
2. Installation - Install FRESH .env files (with new credentials)
3. CurStepChanged(ssPostInstall) - Delete FRESH .env files
4. CurStepChanged(ssPostInstall) - Restore OLD .env files from backup
5. Result: User gets OLD credentials → 400 Bad Request error
```

**ROOT CAUSE**: The installer was designed to preserve user settings, but .env files contain system credentials (SECRET_KEY, DB paths, etc.) that **must** be fresh. Restoring old credentials from 16/12/2025 caused the backend to reject all requests.

**WHY IT HAPPENED**: The .env backup/restoration logic was written assuming .env files contained user preferences (like lang.txt). But .env files actually contain **installation-specific credentials** that change with each version.

---

## ✅ The Fix

### What Was Changed

**File**: `installer/SMS_Installer.iss`
**Commit**: e196120cc
**Lines Modified**: CurStepChanged(ssPostInstall) section

**BEFORE (BROKEN):**
```pascal
// Delete new .env files
DeleteFile(ExpandConstant('{app}\backend\.env'));
DeleteFile(ExpandConstant('{app}\frontend\.env'));
DeleteFile(ExpandConstant('{app}\.env'));

// Restore old .env files from backup (WRONG!)
if FileExists(UpgradeBackupPath + '\config\backend.env') then
begin
  FileCopy(UpgradeBackupPath + '\config\backend.env',
           ExpandConstant('{app}\backend\.env'), False);
end;
// ... (57 lines of .env restoration logic)
```

**AFTER (FIXED):**
```pascal
// CRITICAL FIX: DO NOT restore .env files from old backup!
// The new installation includes fresh .env files with correct configuration.
// Restoring old .env files causes 400 Bad Request errors due to stale credentials.

Log('[SKIPPED] .env restoration - using fresh .env files from new installation');
Log('  Reason: Old .env files contain stale credentials that cause login failures');
Log('  Action: New .env files from v1.17.7 installation will be used');

// Only restore user data (not configuration files)
// .env files come fresh from new installation
```

**WHAT CHANGED:**
- ✅ Removed 57 lines of .env deletion and restoration logic
- ✅ Added 7 lines of logging explaining why .env restoration is skipped
- ✅ Fresh .env files from new installation are now preserved
- ✅ User language preference (lang.txt) is still restored

---

## 📋 Testing Instructions

### For Testers

**Before Testing:**
1. Download the **NEW** installer: `SMS_Installer_1.17.7.exe` (built Feb 3, 2026, 23:15)
2. Verify installer file size: **8.01 MB** (if different size, you have old installer)
3. Check file modified timestamp: **02/03/2026 23:15:43** (must match)

**Testing Steps:**

**Step 1: Verify Installer Version**
```powershell
# Check installer properties
Get-Item ".\SMS_Installer_1.17.7.exe" | Select-Object Name, Length, LastWriteTime

# Expected output:
# Name                      Length  LastWriteTime
# ----                      ------  -------------
# SMS_Installer_1.17.7.exe  8396288 02/03/2026 23:15:43
```

**Step 2: Run Installer**
1. Double-click `SMS_Installer_1.17.7.exe`
2. Follow installation wizard (English or Greek)
3. Wait for installation to complete
4. **DO NOT** manually edit any .env files after installation

**Step 3: Verify Fresh .env Files**
```powershell
# Check .env file timestamps - should be TODAY's date
Get-ChildItem "C:\Program Files\SMS\" -Filter "*.env" -Recurse |
  Select-Object FullName, LastWriteTime

# Expected: All .env files dated 02/03/2026 or later
# ❌ FAIL if any .env file shows 16/12/2025
```

**Step 4: Test Login**
1. Open browser to: `http://localhost:8080`
2. Login with credentials:
   - Email: admin@admin.com
   - Password: admin
3. **Expected**: Login succeeds without 400 error
4. **Verify**: Dashboard loads properly

**Step 5: Check Old Files Removed**
```powershell
# Check for old uninstaller files
Get-ChildItem "C:\Program Files\SMS\" -Filter "unins*.dat"

# Expected: NO unins000.dat files (or file is locked but harmless)

# Check Docker images
docker images | Select-String "sms-fullstack"

# Expected: Only 1.17.7 image, NO 1.12.3 or 1.17.6
```

---

## 🔧 Additional Fixes Included

### 1. Docker Image Cleanup (Commit d19e13e78)

**What**: Added `CleanOldDockerImages()` procedure
**Why**: Prevents conflicts between multiple image versions
**Result**: Old images (1.12.3, 1.17.6) automatically removed

```pascal
procedure CleanOldDockerImages();
begin
  Log('Cleaning old Docker images...');
  Exec('cmd', '/c docker rmi sms-fullstack:1.12.3 2>nul', '', SW_HIDE, ...);
  Exec('cmd', '/c docker rmi sms-fullstack:1.17.6 2>nul', '', SW_HIDE, ...);
end;
```

### 2. Uninstaller File Cleanup (Commit d02296106)

**What**: Added `CleanOldUninstallers()` procedure with error logging
**Why**: Old uninstaller files remained visible in installation directory
**Result**: Attempts to delete old uninstaller files, logs warnings if locked

```pascal
procedure CleanOldUninstallers(BasePath: String);
var
  Patterns: array of String;
begin
  Patterns[0] := 'unins000.exe';
  Patterns[1] := 'unins000.dat';
  Patterns[2] := 'unins1.12.3.exe';
  // ... (8 patterns total)

  for i := 0 to GetArrayLength(Patterns) - 1 do
  begin
    if DeleteFile(FilePath) then
      Log('  [OK] Deleted: ' + FilePath)
    else
      Log('  [WARN] Could not delete (locked): ' + FilePath);
  end;
end;
```

### 3. Emergency Cleanup Script (Commit ad5dcae86)

**What**: Created `EMERGENCY_FIX_400_ERROR.ps1` (now archived at `archive/deprecated-scripts/EMERGENCY_FIX_400_ERROR.ps1`)
**Why**: Provided a manual cleanup path during the `v1.17.7` incident window
**Result**: Retained only as historical traceability; current recovery should use the supported uninstall/reinstall flow

**Historical usage**:
```powershell
.\archive\deprecated-scripts\EMERGENCY_FIX_400_ERROR.ps1
```

---

## 📊 Verification Checklist

### After Installation

- [ ] .env file timestamp is TODAY's date (not 16/12/2025)
- [ ] Login works at http://localhost:8080 (no 400 error)
- [ ] Dashboard loads properly
- [ ] Docker shows only 1.17.7 image (no 1.12.3)
- [ ] Old uninstaller files removed or locked (cosmetic issue)
- [ ] PowerShell encoding issues (cosmetic - doesn't affect functionality)

### Known Cosmetic Issues (Non-Blocking)

1. **PowerShell 7 Greek Character Encoding**
   - **Symptom**: Greek characters show as unknown in PowerShell prompts
   - **Impact**: Visual only - does not affect installer functionality
   - **Workaround**: Run installer from File Explorer, not PowerShell

2. **Locked unins000.dat File**
   - **Symptom**: File may remain after upgrade
   - **Impact**: Cosmetic only - will be overwritten by next installer run
   - **Workaround**: Delete manually if desired, or ignore

---

## 🚨 Emergency Recovery

### If Upgrade Still Fails

**Option 1: Current supported recovery path**
```powershell
# Use the canonical manual uninstaller / cleanup flow
.\UNINSTALL_SMS_MANUALLY.ps1

# Then reinstall using the current supported installer
# (replace with the current version you are deploying)
```

**Option 2: Manual Cleanup**
```powershell
# Stop Docker
docker stop sms-app
docker rm sms-app

# Delete old files
Remove-Item "C:\Program Files\SMS\.env" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Program Files\SMS\backend\.env" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Program Files\SMS\frontend\.env" -Force -ErrorAction SilentlyContinue

# Remove old Docker images
docker rmi sms-fullstack:1.12.3 -f
docker rmi sms-fullstack:1.17.6 -f

# Reinstall
.\SMS_Installer_1.17.7.exe
```

**Option 3: Fresh Install**
```powershell
# Uninstall completely
Start-Process "C:\Program Files\SMS\unins1.17.7.exe" -Wait

# Reinstall fresh
.\SMS_Installer_1.17.7.exe
```

---

## 📝 Git Commits (Chronological)

| Commit | Date | Description |
|--------|------|-------------|
| d19e13e78 | Feb 3 | Initial cleanup procedures (uninstallers, Docker images) |
| 2b23098e7 | Feb 3 | Documentation for testing checklist |
| ad5dcae86 | Feb 3 | Emergency cleanup script and documentation |
| d02296106 | Feb 3 | Enhanced error handling with [OK]/[WARN] logging |
| 7cf4dc5eb | Feb 3 | Documentation for locked files handling |
| **e196120cc** | **Feb 3** | **CRITICAL FIX: Remove .env restoration (THIS FIX)** |

---

## 🎯 Expected Results After Fix

### Before Fix
- ❌ .env file dated 16/12/2025 (old credentials)
- ❌ 400 Bad Request on login
- ❌ Old uninstaller files visible
- ❌ Old Docker images present

### After Fix
- ✅ .env file dated 02/03/2026 or later (fresh credentials)
- ✅ Login works normally
- ✅ Old uninstaller files removed or harmless
- ✅ Only 1.17.7 Docker image present

---

## 📞 Support

**If issues persist after fix:**
1. Check installer file size (must be 8.01 MB from Feb 3, 2026)
2. Check .env file timestamps (must be today's date)
3. Use `UNINSTALL_SMS_MANUALLY.ps1` or follow the current installer recovery workflow
4. Check installer logs at: `C:\Users\<user>\AppData\Local\Temp\Setup Log YYYY-MM-DD #000.txt`

**Related Documentation:**
- `installer/INSTALLER_LOCKED_FILES_FIX.md` - File locking documentation
- `archive/deprecated-scripts/EMERGENCY_FIX_400_ERROR.ps1` - Archived emergency cleanup script (historical only)
- `installer/INSTALLER_UPGRADE_FIX_ANALYSIS.md` - Original analysis

---

**Historical note**: This document records the `v1.17.7` incident fix. Use current installer and uninstall/recovery scripts for active versions.
