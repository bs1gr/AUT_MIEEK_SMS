# Installer Testing Guide - v1.17.7

**Created**: February 3, 2026
**Installer Version**: 1.17.7
**Installer File**: `SMS_Installer_1.17.7.exe` (8.4 MB)
**Status**: Ready for Testing

---

## 📋 Overview

This guide provides step-by-step testing procedures for the v1.17.7 installer, which includes critical fixes for:
- Parallel installation prevention (enforces in-place upgrades)
- Robust existing installation detection
- Automatic data backup before changes
- Installation metadata tracking
- Improved Docker resource handling
- Version-aware uninstaller rename (EXE/DAT/MSG stay in sync for Control Panel uninstall)
- Docker Manager shortcut auto-elevates reliably and its "View Logs" option now prints logs/fallback without PowerShell parser errors

---

## ✅ Testing Scenarios

### Scenario 1: Fresh Install (No Existing Version)

**Purpose**: Verify clean installation on system with no prior SMS installation

**Steps**:
1. Ensure no SMS installation exists:
   - Check `C:\Program Files\SMS\` (should not exist)
   - Check registry: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}`
   - Check registry: `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}`

2. Run installer: `SMS_Installer_1.17.7.exe`

3. Verify installation:
   - [ ] Welcome screen displays in selected language (EN/EL)
   - [ ] License agreement displays correctly
   - [ ] Installation completes without errors
   - [ ] Desktop shortcuts created
   - [ ] Start menu entries created
   - [ ] Installation directory: `C:\Program Files\SMS\`

4. Verify metadata:
   - [ ] Check `C:\Program Files\SMS\install_metadata.txt` exists
   - [ ] Metadata contains version 1.17.7
   - [ ] Metadata contains installation date/time
   - [ ] Metadata shows "InstallationType: Fresh"

5. Verify Docker setup:
   - [ ] Docker Desktop installed (if selected during install)
   - [ ] Docker containers created
   - [ ] Application accessible at http://localhost:8080

**Expected Result**: ✅ Clean installation with all components working

---

### Scenario 2: Upgrade Same Version (v1.17.7 → v1.17.7 Repair)

**Purpose**: Verify repair/reinstall functionality

**Prerequisites**: Scenario 1 completed (v1.17.7 already installed)

**Steps**:
1. Run installer again: `SMS_Installer_1.17.7.exe`

2. Verify behavior:
   - [ ] Installer detects existing v1.17.7
   - [ ] Dialog offers: "Repair", "Modify", or "Remove"
   - [ ] Select "Repair"

3. Verify backup:
   - [ ] Check `C:\Program Files\SMS\backups\` for new backup
   - [ ] Backup filename includes date/time
   - [ ] Backup contains database and .env files

4. Verify repair:
   - [ ] Repair completes without errors
   - [ ] All files refreshed/restored
   - [ ] Docker containers preserved
   - [ ] Data preserved (no data loss)

5. Verify metadata update:
   - [ ] `install_metadata.txt` updated with repair action
   - [ ] Metadata shows "LastAction: Repair"
   - [ ] Metadata shows new timestamp

**Expected Result**: ✅ Repair successful with data preserved

---

### Scenario 3: Upgrade from v1.17.6 → v1.17.7

**Purpose**: Verify in-place upgrade functionality

**Prerequisites**: v1.17.6 installed (or mock older version)

**Steps**:
1. Verify v1.17.6 is installed:
   - Check `C:\Program Files\SMS\VERSION` shows 1.17.6
   - Check registry version

2. Run installer: `SMS_Installer_1.17.7.exe`

3. Verify detection:
   - [ ] Installer detects existing v1.17.6
   - [ ] Displays upgrade message: "Upgrading from v1.17.6 to v1.17.7"
   - [ ] **NO option to change installation directory** (enforced in-place upgrade)

4. Verify automatic backup:
   - [ ] Backup created automatically (no user prompt)
   - [ ] Backup location: `C:\Program Files\SMS\backups\backup_1.17.6_YYYYMMDD_HHMMSS.zip`
   - [ ] Backup contains all critical files

5. Verify upgrade:
   - [ ] Upgrade completes without errors
   - [ ] Version updated: `C:\Program Files\SMS\VERSION` shows 1.17.7
   - [ ] All data preserved
   - [ ] Docker containers upgraded
   - [ ] Application functional after upgrade

6. Verify metadata:
   - [ ] `install_metadata.txt` updated
   - [ ] Shows "PreviousVersion: 1.17.6"
   - [ ] Shows "CurrentVersion: 1.17.7"
   - [ ] Shows "LastAction: Upgrade"
   - [ ] Installation directory unchanged

**Expected Result**: ✅ Seamless in-place upgrade with zero data loss

---

### Scenario 4: Docker Running During Upgrade

**Purpose**: Verify upgrade handles running Docker containers gracefully

**Prerequisites**: v1.17.6 installed with Docker containers running

**Steps**:
1. Start Docker containers:
   ```bash
   cd C:\Program Files\SMS
   docker-compose up -d
   ```

2. Verify containers running:
   ```bash
   docker ps
   ```

3. Run installer: `SMS_Installer_1.17.7.exe`

4. Verify behavior:
   - [ ] Installer detects running Docker containers
   - [ ] Displays warning: "Docker containers are running. They will be stopped during upgrade."
   - [ ] Option to: "Stop now and continue" or "Cancel and stop manually"

5. Verify Docker handling:
   - [ ] Containers stopped gracefully
   - [ ] Volumes preserved
   - [ ] Networks preserved
   - [ ] Images updated (if needed)

6. Verify post-upgrade:
   - [ ] Containers restart automatically
   - [ ] Data intact in database
   - [ ] Application accessible

**Expected Result**: ✅ Graceful Docker handling with data preservation

---

### Scenario 5: Docker Stopped During Upgrade

**Purpose**: Verify upgrade with Docker stopped (normal upgrade scenario)

**Prerequisites**: v1.17.6 installed with Docker stopped

**Steps**:
1. Stop Docker containers:
   ```bash
   cd C:\Program Files\SMS
   docker-compose down
   ```

2. Run installer: `SMS_Installer_1.17.7.exe`

3. Verify behavior:
   - [ ] No Docker warnings displayed
   - [ ] Upgrade proceeds normally
   - [ ] Backup created automatically

4. Verify Docker state:
   - [ ] Volumes preserved
   - [ ] Networks preserved
   - [ ] Compose files updated

5. Verify post-upgrade:
   - [ ] Can start containers: `docker-compose up -d`
   - [ ] All services start correctly
   - [ ] Data intact

**Expected Result**: ✅ Standard upgrade with Docker stopped

---

### Scenario 6: Uninstall with Data Preservation

**Purpose**: Verify uninstall offers data preservation option

**Prerequisites**: v1.17.7 installed

**Steps**:
1. Run uninstaller:
   - Option A: Control Panel → "Uninstall a program" → Select SMS → Uninstall
   - Option B: `C:\Program Files\SMS\unins1.17.7.exe`
   - Before uninstalling, confirm `unins1.17.7.exe`, `unins1.17.7.dat`, and `unins1.17.7.msg` all exist in `C:\Program Files\SMS\`. If any file is missing, note it in the tracker before proceeding.

2. Verify uninstall dialog:
   - [ ] Dialog asks: "Do you want to preserve user data?"
   - [ ] Options: "Yes (keep data)" or "No (complete removal)"

3. Test Option 1: Preserve Data
   - Select "Yes (keep data)"
   - [ ] Application files removed
   - [ ] Database preserved: `C:\Program Files\SMS\backups\` or `C:\Users\{user}\AppData\Local\SMS\`
   - [ ] Docker volumes preserved
   - [ ] Registry entry for uninstall removed

4. Test Option 2: Complete Removal
   - Reinstall, then uninstall again
   - Select "No (complete removal)"
   - [ ] All application files removed
   - [ ] All Docker volumes removed
   - [ ] All Docker containers removed
   - [ ] All registry entries removed
   - [ ] No data remains

**Expected Result**: ✅ User can choose data preservation or complete removal

---

### Scenario 7: Backup Integrity Check

**Purpose**: Verify backups are valid and restorable

**Prerequisites**: Scenario 3 completed (backup created during upgrade)

**Steps**:
1. Locate latest backup:
   ```bash
   Get-ChildItem "C:\Program Files\SMS\backups\" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
   ```

2. Verify backup contents:
   - [ ] Extract backup ZIP
   - [ ] Verify database file exists: `sms.db` or `postgres_dump.sql`
   - [ ] Verify .env file exists and is valid
   - [ ] Verify config files exist

3. Test restore:
   - [ ] Stop application
   - [ ] Restore database from backup
   - [ ] Restart application
   - [ ] Verify all data restored correctly
   - [ ] Verify application functional

**Expected Result**: ✅ Backup is valid and restorable

---

### Scenario 8: Metadata File Creation Verification

**Purpose**: Verify installation metadata tracking works correctly

**Prerequisites**: Any installation scenario completed

**Steps**:
1. Check metadata file exists:
   ```powershell
   Test-Path "C:\Program Files\SMS\install_metadata.txt"
   ```

2. Verify metadata contents:
   ```powershell
   Get-Content "C:\Program Files\SMS\install_metadata.txt"
   ```

3. Expected fields:
   - [ ] InstallDate: `YYYY-MM-DD HH:MM:SS`
   - [ ] CurrentVersion: `1.17.7`
   - [ ] PreviousVersion: (if upgrade) or `none` (if fresh)
   - [ ] InstallationType: `Fresh`, `Upgrade`, or `Repair`
   - [ ] InstallationDirectory: `C:\Program Files\SMS\`
   - [ ] LastAction: `Install`, `Upgrade`, or `Repair`
   - [ ] LastActionDate: `YYYY-MM-DD HH:MM:SS`

4. Verify metadata updates on actions:
   - [ ] Repair updates LastAction and LastActionDate
   - [ ] Upgrade updates PreviousVersion and CurrentVersion
   - [ ] Multiple actions create history log

**Expected Result**: ✅ Metadata accurately tracks installation history

---

## 🧪 Automated Testing

### Quick Validation Script

```powershell
# Run this script to perform automated validation checks

# Check installer exists
$installerPath = ".\dist\SMS_Installer_1.17.7.exe"
if (-not (Test-Path $installerPath)) {
    Write-Error "Installer not found: $installerPath"
    exit 1
}

# Verify installer properties
$installer = Get-Item $installerPath
Write-Host "Installer: $($installer.Name)"
Write-Host "Size: $([math]::Round($installer.Length / 1MB, 2)) MB"
Write-Host "Created: $($installer.CreationTime)"
Write-Host "Modified: $($installer.LastWriteTime)"

# Check digital signature (optional)
$signature = Get-AuthenticodeSignature $installerPath
Write-Host "Signature Status: $($signature.Status)"

# Verify version in installer
Write-Host "`nVersion Check:"
$version = Get-Content ".\VERSION"
Write-Host "Expected Version: $version"

# Check wizard images exist
$wizardImages = @("wizard_image.bmp", "wizard_small.bmp")
foreach ($image in $wizardImages) {
    $imagePath = ".\installer\$image"
    if (Test-Path $imagePath) {
        Write-Host "✓ $image exists"
    } else {
        Write-Error "✗ $image missing"
    }
}

Write-Host "`n✅ Automated validation complete"
```

---

## 📊 Test Results Template

**Test Date**: _____________
**Tester**: _____________
**OS**: _____________

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Fresh Install | ⬜ Pass ⬜ Fail | |
| 2. Repair (v1.17.7 → v1.17.7) | ⬜ Pass ⬜ Fail | |
| 3. Upgrade (v1.17.6 → v1.17.7) | ⬜ Pass ⬜ Fail | |
| 4. Docker Running | ⬜ Pass ⬜ Fail | |
| 5. Docker Stopped | ⬜ Pass ⬜ Fail | |
| 6. Uninstall (Preserve Data) | ⬜ Pass ⬜ Fail | |
| 7. Uninstall (Complete) | ⬜ Pass ⬜ Fail | |
| 8. Backup Integrity | ⬜ Pass ⬜ Fail | |
| 9. Metadata Tracking | ⬜ Pass ⬜ Fail | |

**Overall Result**: ⬜ All Pass ⬜ Some Failures

**Critical Issues**:
- _____________
- _____________

**Recommendations**:
- _____________
- _____________

---

## 🚨 Known Issues & Workarounds

### Code Signing Failed
**Issue**: Installer builds successfully but code signing fails
**Impact**: Installer is unsigned (shows "Unknown Publisher" warning)
**Workaround**: Users must click "Yes" on UAC prompt
**Fix**: Ensure certificate is installed and accessible to SIGN_INSTALLER.ps1

### Greek Text Encoding
**Issue**: Greek characters may display incorrectly if encoding is wrong
**Status**: Auto-fixed during build (Windows-1253 encoding applied)
**Verification**: Check Greek language installer screens

### Docker Desktop Required
**Issue**: Installer requires Docker Desktop on Windows
**Workaround**: Users can skip Docker installation and use native mode
**Note**: Production deployment requires Docker

### Recent Fixes (Feb 5, 2026)
- **Uninstaller companion files**: Installer now renames `.dat` and `.msg` along with the EXE, so Control Panel uninstalls no longer fail with "file not found" errors.
- **Docker Manager View Logs**: Shortcut leverages PowerShell 7 and `$LASTEXITCODE` to display logs or a friendly "container not running" message—no more parser exceptions.

---

## 📝 Post-Testing Actions

After completing all scenarios:

1. **Document Results**
   - Fill out test results template above
   - Note any issues or unexpected behavior
   - Take screenshots of critical steps

2. **Update Work Plan**
   - Mark testing scenarios as complete in `docs/plans/UNIFIED_WORK_PLAN.md`
   - Update status: "Testing Required" → "Testing Complete"

3. **Report Issues**
   - Create GitHub issues for any bugs found
   - Label as `installer` and `bug`
   - Include test scenario number and reproduction steps

4. **Prepare for Release**
   - If all tests pass, update work plan: "Ready for Release"
   - If code signing works, mark installer as "Signed and Ready"
   - Update deployment documentation with testing results

---

## 🔗 Related Documentation

- [Installer Fixes Applied (Feb 3)](./INSTALLER_FIXES_APPLIED_FEB3.md)
- [Installer Upgrade Fix Analysis](./INSTALLER_UPGRADE_FIX_ANALYSIS.md)
- [Unified Work Plan](../docs/plans/UNIFIED_WORK_PLAN.md)
- [Installer Builder Script](../INSTALLER_BUILDER.ps1)

---

**Status**: Ready for Testing
**Next Action**: Execute test scenarios and document results
