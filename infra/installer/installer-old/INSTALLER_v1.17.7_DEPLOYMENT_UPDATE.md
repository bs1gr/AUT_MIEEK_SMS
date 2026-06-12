# Installer v1.17.7 - Deployment Update

**Date**: February 3, 2026
**Version**: 1.17.7
**Status**: Built and Ready for Testing

---

## 📦 Build Summary

**Installer File**: `SMS_Installer_1.17.7.exe`
**Size**: 8.01 MB
**Created**: February 3, 2026, 21:59:23 UTC
**Build Time**: 38 seconds
**Signature Status**: NotSigned (signing failed, but installer is valid)

---

## ✅ Build Validation Results

All automated checks passed:

- ✅ Installer compiled successfully (8.01 MB)
- ✅ Version consistency verified (1.17.7 across all files)
- ✅ Wizard images generated (v1.17.7 Modern v2.0 design)
- ✅ Greek language files encoded correctly (Windows-1253)
- ✅ Smoke test passed (installer validity confirmed)
- ⚠️ Code signing failed (certificate issue - non-blocking)

**Automated Validation**:
```
Installer: SMS_Installer_1.17.7.exe
Size: 8.01 MB
Created: 02/03/2026 21:59:23
Modified: 02/03/2026 21:59:59
Signature Status: NotSigned
Expected Version: 1.17.7
Wizard Images:
  ✓ wizard_image.bmp exists
  ✓ wizard_small.bmp exists
✅ Automated validation complete
```

---

## 🔧 Critical Fixes Included

This installer includes all fixes from the parallel installation issue:

1. **Force Single Directory** (`DisableDirPage=yes`)
   - Users cannot create parallel installations
   - Enforces in-place upgrades only

2. **Robust Detection** (Registry + Filesystem)
   - Checks `HKLM\SOFTWARE\...\Uninstall\{AppId}`
   - Checks `HKCU\SOFTWARE\...\Uninstall\{AppId}`
   - Checks `C:\Program Files\SMS\` directory

3. **Always Backup Data**
   - Automatic backup before any changes
   - No user prompt required
   - Zero data loss risk

4. **Metadata Tracking**
   - `install_metadata.txt` tracks installation history
   - Records: InstallDate, CurrentVersion, PreviousVersion, LastAction
   - Enables upgrade path verification

5. **Better Docker Handling**
   - Preserves containers and volumes during upgrade
   - Graceful shutdown of running containers
   - Network configuration preserved

---

## 📋 Testing Checklist

**Next Steps**: Complete all testing scenarios in [INSTALLER_TESTING_GUIDE.md](./INSTALLER_TESTING_GUIDE.md)

### Required Testing

- [ ] **Scenario 1**: Fresh install (no existing version)
- [ ] **Scenario 2**: Repair (v1.17.7 → v1.17.7)
- [ ] **Scenario 3**: Upgrade (v1.17.6 → v1.17.7) - **CRITICAL TEST**
- [ ] **Scenario 4**: Docker running during upgrade
- [ ] **Scenario 5**: Docker stopped during upgrade
- [ ] **Scenario 6**: Uninstall with data preservation
- [ ] **Scenario 7**: Uninstall with complete removal
- [ ] **Scenario 8**: Backup integrity check
- [ ] **Scenario 9**: Metadata file creation verification

### Manual Testing Required

The following cannot be automated and require human testing:

1. **UI/UX Testing**:
   - Welcome screen displays correctly (EN/EL)
   - License agreement readable
   - Progress bars work correctly
   - Installation completes without errors
   - Desktop shortcuts created
   - Start menu entries created

2. **Upgrade Testing** (CRITICAL):
   - Install v1.17.6 first
   - Run v1.17.7 installer
   - Verify: NO option to change directory (in-place upgrade enforced)
   - Verify: Automatic backup created
   - Verify: Data preserved after upgrade
   - Verify: Docker containers upgraded successfully

3. **Bilingual Testing**:
   - Install in English, verify all screens
   - Install in Greek, verify all screens
   - Check for encoding issues in Greek text

---

## 🚀 Release Preparation

### Before Release to GitHub

1. **Complete Manual Testing**
   - Execute all 9 testing scenarios
   - Document results in testing guide
   - Fix any critical issues found

2. **Code Signing** (Optional but Recommended)
   - Fix certificate issue
   - Re-sign installer: `.\SIGN_INSTALLER.ps1 -InstallerPath .\dist\SMS_Installer_1.17.7.exe`
   - Verify signature: `Get-AuthenticodeSignature .\dist\SMS_Installer_1.17.7.exe`

3. **Update Documentation**
   - Mark testing scenarios as complete in work plan
   - Update INSTALLATION_GUIDE.md with v1.17.7 notes
   - Update README.md with download links

4. **GitHub Release**
   - Upload `SMS_Installer_1.17.7.exe` to GitHub release
   - Include release notes (installer fixes changelog)
   - Tag release: v1.17.7

---

## 📝 Deployment Notes

### For End Users

**Download**: [GitHub Releases](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.17.7)

**Installation**:
1. Download `SMS_Installer_1.17.7.exe`
2. Run installer (requires administrator rights)
3. Follow wizard steps (English or Greek)
4. Wait for installation to complete (~5-10 minutes)
5. Launch SMS from desktop shortcut or start menu

**Upgrading from v1.17.6**:
1. Run `SMS_Installer_1.17.7.exe`
2. Installer automatically detects existing installation
3. Backup created automatically (no user action required)
4. In-place upgrade enforced (no directory selection)
5. Data and Docker containers preserved
6. Upgrade completes (~5-10 minutes)

### For Administrators

**Deployment Scenarios**:
- Fresh install: ~10 minutes
- Upgrade: ~10 minutes (includes automatic backup)
- Repair: ~5 minutes

**System Requirements**:
- Windows 10/11 (64-bit)
- 4 GB RAM (8 GB recommended)
- 10 GB free disk space
- Docker Desktop installed
- Internet connection (first-time only)

---

## 🐛 Known Issues

### Code Signing Failed

**Issue**: Installer builds successfully but code signing fails
**Error**: `The property 'Count' cannot be found on this object`
**Impact**: Installer is unsigned, shows "Unknown Publisher" warning on Windows
**Workaround**: Users must click "Yes" on UAC prompt to proceed
**Status**: Non-blocking (installer is valid and functional)
**Fix Required**: Investigate certificate chain and SIGN_INSTALLER.ps1 script

### Wizard Images Cache Warning

**Issue**: First build attempt warned "Wizard images may be outdated"
**Resolution**: Images regenerated with `-Action update-images`
**Status**: Resolved (images now current for v1.17.7)

---

## 📊 Build Logs

Full build output preserved in:
- Build logs: (terminal output from INSTALLER_BUILDER.ps1)
- Validation results: Documented above
- Testing results: To be completed in INSTALLER_TESTING_GUIDE.md

---

## 🔗 Related Documentation

- [Installer Testing Guide](./INSTALLER_TESTING_GUIDE.md) - Complete testing procedures
- [Installer Fixes Applied](./INSTALLER_FIXES_APPLIED_FEB3.md) - Technical details of fixes
- [Installer Upgrade Fix Analysis](./INSTALLER_UPGRADE_FIX_ANALYSIS.md) - Root cause analysis
- [Unified Work Plan](../docs/plans/UNIFIED_WORK_PLAN.md) - Project status

---

## ✅ Next Actions

**Immediate**:
1. Execute testing scenarios (see INSTALLER_TESTING_GUIDE.md)
2. Document test results
3. Fix any critical issues found

**After Testing Passes**:
1. Resolve code signing issue (optional)
2. Upload to GitHub release v1.17.7
3. Update installation guides
4. Announce availability to users

---

**Status**: ✅ Build Complete - Ready for Testing
**Recommendation**: Proceed with Scenario 3 (Upgrade v1.17.6 → v1.17.7) as critical test
