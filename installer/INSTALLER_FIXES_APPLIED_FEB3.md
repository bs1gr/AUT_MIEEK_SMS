# SMS Installer - Critical Fixes Applied (Feb 3, 2026)

**Status**: ✅ FIXES IMPLEMENTED AND READY FOR TESTING
**Date**: February 3, 2026
**Version**: v1.17.7 installer update
**Priority**: 🔴 CRITICAL - Production deployment issue resolution

---

## Problem Summary

The SMS Windows installer had a critical issue causing **parallel installations** instead of safe in-place upgrades:

### Issues Fixed

| Issue | Symptom | Root Cause | Fix |
|-------|---------|-----------|-----|
| **Parallel Installations** | Multiple copies in different folders | Weak directory detection, user could select different path | Force single directory + robust detection |
| **Data Loss Risk** | Backups unreliable during upgrade | Backup only with optional task | Always backup before upgrade |
| **Docker Conflicts** | Multiple containers, port conflicts | No version tracking | Add metadata file + improve detection |
| **Uninstall Issues** | Broke other instances | No multi-instance support | Safer cleanup logic |

---

## Changes Implemented

### 1. **Force Single Installation Directory** ✅
**File**: `installer/SMS_Installer.iss`

```inno
; CHANGE: Hide directory page - user cannot select different path
DisableDirPage=yes
DefaultDirName={autopf}\SMS

; RESULT: All installations forced to {autopf}\SMS
; No more parallel installations possible
```

**Impact**:
- User cannot accidentally choose different directory
- `{app}` always resolves to same location
- Upgrade always happens in-place
- No version-specific subdirectories

### 2. **Robust Installation Detection** ✅
**File**: `installer/SMS_Installer.iss`

**New Function**: `DetectExistingInstallation()`

Checks **three sources** in order:
1. **HKLM Registry** - preferred if available
2. **HKCU Registry** - fallback for user installs
3. **File system** - catches corrupted registry installs

Returns:
- Installation path (PreviousInstallPath)
- Version number (PreviousVersion)
- Success flag (AppExists)

**Impact**:
- Catches installations with corrupted registry
- Detects partial/failed upgrades
- Always finds existing installation, if any
- Can recover from most error states

### 3. **Automatic Data Backup on Upgrade** ✅
**File**: `installer/SMS_Installer.iss`

**Enhanced Function**: `PrepareToInstall()`

**Backup Strategy**:
```
Pre-upgrade backup created at:
{app}\backups\pre_upgrade_YYYY-MM-DD_HHMMSS\
  ├── data\*                  (database, artifacts)
  └── config\
      ├── backend.env
      ├── frontend.env
      ├── .env
      └── lang.txt
```

**What's Backed Up**:
- ✅ `{app}\data\*` - User database and all artifacts
- ✅ `backend\.env` - Backend configuration
- ✅ `frontend\.env` - Frontend configuration  
- ✅ Root `.env` - Docker environment
- ✅ `config\lang.txt` - Language preference

**Impact**:
- ZERO data loss risk during upgrade
- User can always rollback manually
- Timestamped backups allow multiple rollback points
- Clear audit trail of what was backed up

### 4. **Installation Metadata Tracking** ✅
**File**: `installer/SMS_Installer.iss`

**New File Created**: `{app}\install_metadata.txt`

```ini
INSTALLATION_VERSION=1.17.7
INSTALLATION_DATE=2026-02-03 12:45:30
UPGRADE_FROM=1.17.6
INSTALLATION_PATH=C:\Program Files\SMS
```

**Purpose**:
- Track installation history
- Detect version mismatches
- Link installation to Docker resources
- Enable recovery procedures

**Impact**:
- Can verify installation integrity
- Detect downgrade attempts (prevent)
- Support can diagnose issues easier
- Foundation for multi-instance support

### 5. **Improved Docker Container Handling** ✅
**File**: `installer/SMS_Installer.iss`

**Enhanced Function**: `PrepareToInstall()`

```bash
# On upgrade:
1. Stop container: docker stop sms-app
2. Keep volume: Docker preserves sms-app_sms-data
3. Rebuild image: Docker image updated with new code
4. Container restarted with same volume
5. Data fully preserved from previous version
```

**Impact**:
- No data loss when container recreated
- Database fully preserved across upgrades
- Configuration files restored after upgrade
- Clean container restart possible

### 6. **Simpler Upgrade Dialog** ✅
**File**: `installer/SMS_Installer.iss`

**Before**: Complex 3-option dialog with confusing language
**After**: Simple 2-option confirmation

```
Version X.X.X is already installed at:
C:\Program Files\SMS

Your data will be preserved.

[YES] Upgrade to version Y.Y.Y
[NO] Cancel installation
```

**Impact**:
- User clearly understands upgrade intent
- Data preservation is explicit
- No confusing "fresh install" option
- Clear cancel path

---

## Testing Checklist

### Upgrade Scenarios ✅

- [ ] **Fresh Install** (no previous version)
  - Installer detects no existing installation
  - All files installed to `C:\Program Files\SMS`
  - Docker container created, data initialized
  - Metadata file created

- [ ] **Upgrade Same Version** (v1.17.7 → v1.17.7)
  - Installer detects v1.17.7 installed
  - Shows "reinstall/repair" option
  - Backup created: `backups\pre_upgrade_YYYY-MM-DD_HHMMSS\`
  - Files updated, Docker restarted
  - Data fully preserved

- [ ] **Upgrade Previous Version** (v1.17.6 → v1.17.7)
  - Installer detects v1.17.6 installed
  - Shows upgrade option
  - Backup created with v1.17.6 version
  - v1.17.7 installed to **same directory**
  - Database migrated automatically
  - All env files restored

- [ ] **Upgrade Skip Version** (v1.17.5 → v1.17.7)
  - Installer detects v1.17.5 installed
  - Upgrade proceeds to v1.17.7
  - Backup includes v1.17.5 data
  - v1.17.7 migration handles schema changes
  - User can rollback to v1.17.5 if needed

### Docker Scenarios ✅

- [ ] **Upgrade with Docker Running**
  - Docker container running (sms-app)
  - Installer stops container safely
  - Docker image rebuilt (new code)
  - Container restarted with same volume
  - Data fully preserved

- [ ] **Upgrade with Docker Stopped**
  - Docker not running
  - Installer skips stop (idempotent)
  - Installation proceeds normally
  - Container auto-starts on next use

- [ ] **Volume Preservation**
  - Check `docker volume ls`
  - Volume `sms-app_sms-data` persists after upgrade
  - Data directory not recreated
  - Database files unchanged

### Data Preservation ✅

- [ ] **SQLite Database**
  - `{app}\data\student_management.db` preserved
  - All tables and records intact
  - Foreign keys still valid
  - Verify: SELECT COUNT(*) FROM students;

- [ ] **Backup Created**
  - `{app}\backups\pre_upgrade_*\` exists
  - Contains `data\` subdirectory
  - Contains `config\` subdirectory
  - All files readable (not corrupted)

- [ ] **Environment Files**
  - `.env` file preserved (not overwritten)
  - `backend\.env` preserved
  - `frontend\.env` preserved
  - Configuration settings retained

- [ ] **Configuration**
  - Language preference (`config\lang.txt`) preserved
  - Docker settings unchanged
  - Port mappings same as before (8080)

### Uninstall Scenario ✅

- [ ] **Uninstall After Upgrade**
  - Uninstall starts
  - Asks: "Delete all user data?" with YES/NO
  - Default NO (keep data)
  - If NO: `{app}\data` directory preserved
  - Can reinstall and recover all data
  - If YES: All data deleted after warning

---

## Migration Guide for Existing Users

### For Users with v1.17.6

1. **Download new installer** (SMS_Installer_1.17.7.exe)
2. **Run installer** (Administrator required)
3. **Choose YES** when asked to upgrade
4. **Wait for process** (~5-10 minutes for Docker rebuild)
5. **Verify success**:
   - Application starts normally
   - All data visible (students, grades, etc.)
   - Docker container running (check `docker ps`)

### For Users with Multiple Installations

⚠️ **If you have multiple SMS folders**:

1. **Verify which is active**:
   ```powershell
   Get-ChildItem "C:\Program Files\" | Where-Object Name -like "*SMS*"
   ```

2. **Run new installer**:
   - It will detect existing installation
   - Upgrade to that location
   - Other orphaned folders can be manually deleted later

3. **Clean up after upgrade**:
   ```powershell
   # Remove old installations if needed
   Remove-Item "C:\Program Files\SMS-1.17.6" -Recurse -Force
   ```

### If Upgrade Fails

**Rollback from backup**:

```powershell
# Find most recent backup
Get-ChildItem "C:\Program Files\SMS\backups" | Sort -Descending | Select -First 1

# Restore from backup
Copy-Item "C:\Program Files\SMS\backups\pre_upgrade_2026-02-03_123456\data\*" `
          "C:\Program Files\SMS\data\" -Recurse -Force
```

---

## Build & Release Steps

### 1. **Build Updated Installer**
```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "installer\SMS_Installer.iss"
# Output: dist\SMS_Installer_1.17.7.exe
```

### 2. **Sign Installer**
```powershell
.\installer\SIGN_INSTALLER.ps1
# Or manually: signtool sign /f cert.pfx /p password ...
```

### 3. **Test Before Release**
- [ ] Run through all test scenarios above
- [ ] Verify no data loss
- [ ] Check Docker container health
- [ ] Test uninstall + keep data

### 4. **Create Release Notes**
Document in `CHANGELOG.md`:
```markdown
### v1.17.7 Installer Fixes

**Critical Issues Fixed**:
- ✅ Prevent parallel installations (force single directory)
- ✅ Automatic data backup before upgrade (always)
- ✅ Robust installation detection (catch corrupted registry)
- ✅ Metadata tracking (installation history)

**User-Facing Improvements**:
- Simpler upgrade dialog (less confusing)
- Clear data preservation guarantees
- Better rollback options
- Improved Docker handling
```

### 5. **Deploy to Users**
- Publish to GitHub Releases
- Link in README.md
- Announce in documentation
- Provide migration guide (above)

---

## Technical Details

### Registry Entries

**Created/Updated During Installation**:

```registry
HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\{B5A1E2F3-C4D5-6789-ABCD-EF0123456789}_is1
  DisplayName: Student Management System
  DisplayVersion: 1.17.7
  InstallLocation: C:\Program Files\SMS
  UninstallString: "C:\Program Files\SMS\unins1.17.7.exe"
  URLInfoAbout: https://github.com/bs1gr/AUT_MIEEK_SMS
```

### Docker Resources

**Managed by Installation**:

```bash
# Container
Name: sms-app
Image: sms:latest (rebuilt on upgrade)
Ports: 8080:8080
Restart: always

# Volume
Name: sms-app_sms-data
Mount: C:\Program Files\SMS\data:/app/data
```

### Files Created

**Installation Metadata**:
```
{app}\install_metadata.txt
```

**Backup Structure**:
```
{app}\backups\
├── pre_upgrade_2026-02-03_120000\
│   ├── data\
│   │   └── student_management.db
│   └── config\
│       ├── backend.env
│       ├── frontend.env
│       ├── .env
│       └── lang.txt
├── pre_upgrade_2026-02-03_120500\
│   └── ... (if multiple upgrades)
```

---

## Logs & Debugging

### Installation Log

**Location**: `{TEMP}\InnoSetup*.log` (while installer running)

**Key Log Lines**:
```
InitializeSetup: Existing installation found at: C:\Program Files\SMS
InitializeSetup: Existing version: 1.17.6, New version: 1.17.7
PrepareToInstall: IsUpgrade = True
PrepareToInstall: Backing up existing data...
Backup completed at: C:\Program Files\SMS\backups\pre_upgrade_2026-02-03_hhmmss
Creating installation metadata...
```

### Docker Logs

**During Installation**:
```powershell
docker logs sms-app
# Should show migration running, then app startup
```

---

## Rollout Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| **Build** | 30 min | Rebuild installer, sign certificate |
| **Test** | 1 hour | Run through all scenarios |
| **Release** | 15 min | Publish to GitHub, update docs |
| **Monitor** | 24 hours | Watch for user reports |
| **Cleanup** | 1 week | Users delete old installations |

---

## Success Metrics

✅ **After Deployment**:
- Zero reports of parallel installations
- Zero data loss during upgrades
- Users can reliably upgrade versions
- Uninstall doesn't affect other instances
- Docker container persists data correctly
- Users can rollback if needed

---

## Related Files

- `installer/SMS_Installer.iss` - Main installer script (updated)
- `installer/INSTALLER_UPGRADE_FIX_ANALYSIS.md` - Detailed analysis
- `CHANGELOG.md` - Release notes
- `.github/workflows/build-installer.yml` - CI/CD (if needed)
- `docs/deployment/WINDOWS_INSTALLER_GUIDE.md` - User guide (update needed)

---

**Next Steps**:
1. Build new installer: v1.17.7
2. Test all scenarios in checklist
3. Sign and release
4. Update documentation
5. Publish release notes

**Timeline**: Ready for production release after testing

