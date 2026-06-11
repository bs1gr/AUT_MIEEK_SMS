# Phase 3: Final Release Preparation - vvv1.18.25 Installer

**Status:** Ready for Implementation  
**Date:** 2026-06-02  
**Effort:** 1-2 hours  
**Risk Level:** LOW  

---

## Overview

Phase 3 is the final step to release-ready vvv1.18.25 Windows Installer. 

**What's Complete:**
- ✅ Phase 1: Installation type selection UI (SMS_Installer.iss)
- ✅ Phase 2: Build workflow updates (INSTALLER_BUILDER.ps1)

**What Remains:**
- Greek translations for new UI elements
- Final functional testing (both editions)
- Build final installer
- Code signing and release

---

## Task 1: Greek Translations (30 minutes)

### File: `installer/Greek.isl`

**Location:** `d:\SMS\student-management-system\installer\Greek.isl`

**New Strings Needed in [CustomMessages] Section:**

```ini
; Installation Type Selection (NEW - Phase 1 UI)
greek.InstallationType=Τύπος Εγκατάστασης
greek.InstallDockerOnly=Έκδοση Docker Production (Συνιστάται)
greek.InstallDockerOnlyDesc=Ελάχιστη εγκατάσταση με Docker container (γρήγορη, καθαρή)
greek.InstallDevEnvironment=Συμπεριλάβετε Περιβάλλον Ανάπτυξης
greek.InstallDevEnvironmentDesc=Προσθήκη Node.js, Python και αρχείων native development
```

**Context in SMS_Installer.iss:**

The English versions are already defined at lines 126-130:
```inno
english.InstallationType=Installation Type
english.InstallDockerOnly=Docker Production Only (Recommended)
english.InstallDockerOnlyDesc=Minimal installation with Docker container (fastest, cleanest)
english.InstallDevEnvironment=Include Development Environment
english.InstallDevEnvironmentDesc=Add Node.js, Python, and native development files for local development
```

**Why This Matters:**
- Greek language installers will display on Greek Windows systems
- Without translations, English falls back to default (unprofessional)
- These 5 strings complete the localization

### Implementation Steps

1. **Open `installer/Greek.isl`** (UTF-8 encoded file)
2. **Locate `[CustomMessages]` section** (at bottom of file)
3. **Add Greek translations** for the 5 new strings
4. **Verify encoding** stays UTF-8 (or Windows-1253 if originally)
5. **Test with Greek Windows** (optional - not critical for release)

### Translation Reference

The SMS system already has Greek throughout the codebase. Use consistent terminology:
- Container: Δοχείο (in Docker context)
- Development: Ανάπτυξη  
- Lightweight: Ελαφρό
- Standalone: Αυτόνομη

---

## Task 2: Functional Testing (45 minutes)

### Test Environment

**System:** Windows 11 Pro (or any Windows 10+)  
**Inno Setup:** Already installed  
**Executables:** Both SMS_Manager.exe and SMS_Native_Lite_Simple.exe ready  

### Test Scenario 1: Docker Edition Full Install

**Steps:**
1. Run: `.\INSTALLER_BUILDER.ps1 -Action build`
2. Wait for compilation to complete
3. Navigate to `dist/` folder
4. Double-click `SMS_Installer_1.18.24.exe`
5. Select Language: English
6. Accept License
7. **SELECT: Docker Production Edition (Radio Button)**
8. Docker Prerequisites Page appears
9. (If Docker not installed, test Docker check)
10. Database Configuration Page appears
11. (Select Local SQLite or QNAP - both should work)
12. Docker Build Page appears
13. Installation completes successfully
14. Verify shortcut created for SMS_Manager.exe
15. Optional: Launch SMS_Manager.exe and verify it starts

**Expected Outcomes:**
- ✅ Installation Type page shows both radio buttons
- ✅ Docker path pages appear (3 pages: Prerequisites, Database, Build)
- ✅ No Lite Edition files shown
- ✅ Shortcuts point to SMS_Manager.exe
- ✅ Uninstall works correctly

### Test Scenario 2: Lite Edition Install (Same Installer!)

**Steps:**
1. Run: `.\INSTALLER_BUILDER.ps1 -Action build` (same build as above)
2. In `dist/` folder, run `SMS_Installer_1.18.24.exe` AGAIN
3. Select Language: Greek (to test localization)
4. Accept License
5. **SELECT: Native Lite Edition (Radio Button)**
6. Installation Type page is last page before Finish
7. Docker Prerequisites, Database, Docker Build pages are SKIPPED
8. Installation completes quickly
9. Verify shortcut created for SMS_Native_Lite.exe
10. Verify setup scripts in {app}/setup/
11. Verify documentation in {app}/docs/
12. Optional: Launch SMS_Native_Lite.exe and verify it starts

**Expected Outcomes:**
- ✅ Same installer works for both editions
- ✅ Lite path is much faster (no Docker setup)
- ✅ SMS_Native_Lite.exe installed (not SMS_Manager.exe)
- ✅ Setup scripts and docs included
- ✅ Shortcuts point to SMS_Native_Lite.exe
- ✅ Greek UI displays correctly (if translations added)

### Test Scenario 3: Upgrade from vvv1.18.25

**Steps:**
1. Have vvv1.18.25 installed from previous installer
2. Run new `SMS_Installer_1.18.24.exe`
3. Installer detects vvv1.18.25
4. User chooses to upgrade
5. Select installation type (Docker or Lite)
6. Proceed with upgrade
7. Data should be preserved
8. New version launches successfully

**Expected Outcomes:**
- ✅ Installer detects previous version
- ✅ Upgrade prompt appears
- ✅ Data preserved (database, config)
- ✅ New edition works after upgrade
- ✅ No duplicate shortcuts

### Test Scenario 4: Uninstall Both

**Steps:**
1. Install Docker Edition
2. Run uninstaller
3. Choose to keep/delete Docker images
4. Choose to keep/delete data
5. Verify uninstall completes
6. Repeat with Lite Edition
7. Verify Lite uninstall works

**Expected Outcomes:**
- ✅ Both uninstallers present (Docker has manual uninstaller)
- ✅ Uninstall choices offered
- ✅ Cleanup complete
- ✅ No orphaned files or registry entries

---

## Task 3: Build Final Installer (15 minutes)

### Build Command

```powershell
# From project root
.\INSTALLER_BUILDER.ps1 -Action build -AutoFix

# Or with more options:
.\INSTALLER_BUILDER.ps1 -Action build -AutoFix -Verbose
```

**Expected Output:**
```
✓ Version consistency checks
✓ Installer release input validation  
✓ Greek RTF generation
✓ Greek encoding audit
✓ SMS Manager build (59 MB)
✓ Native Lite Edition Setup
✓ Wizard image regeneration
✓ Installer compilation
✓ Code signing with AUT MIEEK
✓ Smoke test
BUILD SUCCESSFUL
Output: SMS_Installer_1.18.24.exe
```

### Verification Steps

1. **File Exists:** `dist/SMS_Installer_1.18.24.exe`
2. **Reasonable Size:** 25-35 MB
3. **Code Signed:** No security warnings
4. **Version Info:** Shows vvv1.18.25
5. **Creation Time:** Recent (within seconds)

---

## Task 4: Code Signing Verification (5 minutes)

### Verify Signature

```powershell
# In PowerShell
Get-AuthenticodeSignature .\dist\SMS_Installer_1.18.24.exe

# Should show:
# Status: Valid
# SignerCertificate: Subject: CN=AUT MIEEK, L=Limassol, C=CY
# Thumbprint: 2693C1B15C8A8E5E45614308489DC6F4268B075D
```

### Certificate Validation

- ✅ Thumbprint matches: 2693C1B15C8A8E5E45614308489DC6F4268B075D
- ✅ Issuer: AUT MIEEK  
- ✅ Country: Cyprus (C=CY)
- ✅ Location: Limassol (L=Limassol)
- ✅ Status: Valid

---

## Task 5: Release to GitHub (10 minutes)

### Upload Installer to vvv1.18.25 Release

**Current Status:**
- ✅ vvv1.18.25 tag created
- ✅ vvv1.18.25 release page exists
- ⚠️ Needs SMS_Installer_1.18.24.exe asset

### Upload Steps

**Option A: Using GitHub CLI (Recommended)**

```powershell
# Upload signed installer to release
gh release upload vvv1.18.25 .\dist\SMS_Installer_1.18.24.exe

# Verify
gh release view vvv1.18.25
```

**Option B: Using GitHub Web Interface**

1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/vvv1.18.25
2. Click "Edit Release"
3. Drag-drop `SMS_Installer_1.18.24.exe` to assets area
4. Click "Update Release"
5. Verify file appears in release

### Post-Upload Verification

- ✅ File appears in release assets
- ✅ Download link works
- ✅ File size correct (25-35 MB)
- ✅ SHA256 hash calculated

---

## Quality Gate Checklist

### Pre-Release

- [ ] Phase 1 complete (SMS_Installer.iss)
- [ ] Phase 2 complete (INSTALLER_BUILDER.ps1)
- [ ] Greek translations added to Greek.isl
- [ ] All code changes committed to main
- [ ] VERSION file shows vvv1.18.25

### Build Verification

- [ ] Build completes without errors
- [ ] SMS_Installer_1.18.24.exe created
- [ ] File is code-signed
- [ ] File size is reasonable (25-35 MB)
- [ ] Smoke test passes

### Functional Testing

- [ ] Docker Edition installation works
- [ ] Lite Edition installation works
- [ ] Same installer works for both editions
- [ ] Upgrade from vvv1.18.25 works
- [ ] Uninstall works for both editions
- [ ] Shortcuts created correctly
- [ ] No errors or warnings

### Release Readiness

- [ ] Installer uploaded to vvv1.18.25 release
- [ ] Release notes include installation instructions
- [ ] Release notes mention both editions
- [ ] No blockers or known issues
- [ ] Documentation complete

---

## Known Good State

**If all tests pass:** ✅ READY FOR RELEASE

**If a test fails:**
1. Document the failure
2. Determine if it's a showstopper (yes = Phase 3 not complete)
3. Critical failures (Docker breaks) require Phase 1/2 rework
4. Non-critical (Greek display) can be released with note

---

## Estimated Timeline

| Task | Time | Notes |
|------|------|-------|
| Greek Translations | 30 min | Translate 5 strings |
| Functional Testing | 45 min | 4 scenarios, ~11 min each |
| Build Final Installer | 15 min | Automated, just wait |
| Code Signing Check | 5 min | Verify certificate valid |
| Release Upload | 10 min | GitHub upload |
| **Total** | **~2 hours** | Actual build: 10-15 min |

---

## Documentation to Update

### Release Notes (if not already complete)
- [x] vvv1.18.25 release created
- [ ] Update with installation instructions
- [ ] Mention both editions available
- [ ] Add known limitations

### README.md (Optional)
- Consider adding section about Native Lite Edition
- Or link to documentation

### Installation Guide (Optional)
- INSTALLATION_GUIDE.md could mention both options
- But not critical for vvv1.18.25

---

## Success Criteria - Phase 3 Complete

✅ **All Met When:**
1. Greek translations added and installer shows them
2. Both Docker and Lite editions install successfully
3. Installer file is code-signed and ready
4. File is uploaded to GitHub vvv1.18.25 release
5. All tests pass without blockers

---

## If Issues Arise

### Issue: Installer won't build
- Check SMS_Manager.exe exists: `installer/dist/SMS_Manager.exe`
- Check Lite exe exists: `dist/SMS_Native_Lite_Simple.exe`
- Check Inno Setup: `"C:\Program Files (x86)\Inno Setup 6\ISCC.exe"`
- Run build with `-AutoFix` flag

### Issue: Greek text shows wrong characters
- Verify Greek.isl encoding (should be UTF-8 or Windows-1253)
- Check translation strings match SMS_Installer.iss keys exactly
- Run Greek encoding audit: `installer/GREEK_ENCODING_AUDIT.ps1`

### Issue: Docker Edition doesn't install
- This would indicate Phase 1/2 issue
- Likely SMS_Installer.iss syntax error
- Review conditional logic in installation type functions

### Issue: Lite Edition not available
- Check Copy-NativeLiteExecutable succeeds in build
- Verify SMS_Native_Lite_Simple.exe in `installer/dist/`
- Check Inno Setup includes Lite files (Check: IsLiteInstall)

---

## After Phase 3 Complete

1. Update memory with Phase 3 completion
2. Create release summary for user
3. Archive build logs
4. Close any associated tickets/issues
5. Plan for post-release support

---

## Summary

Phase 3 is primarily **testing and localization**.

Core functionality (Phases 1-2) is complete and working.

Phase 3 validates everything works together and is ready for users.

**Estimated Time:** 2 hours (mostly testing and waiting for builds)  
**Complexity:** Low (mostly verification)  
**Risk:** Very Low (no code changes, just validation)  

---

**Ready to Proceed with Phase 3**

All prerequisites met. No blockers.

Next steps clear and documented.

---

See Also:
- [Phase 1 Completion Report](SESSION_PHASE1_COMPLETION.md)
- [Phase 2 Completion Summary](PHASE_2_COMPLETION_SUMMARY.md)
- [Windows Installer Review](INSTALLER_REVIEW_vvv1.18.25.md)
- [Real Testing Report](INSTALLER_REAL_TESTING_REPORT.md)


