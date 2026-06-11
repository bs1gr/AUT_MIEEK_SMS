# Phase 2: Build Workflow Updates - vvv1.18.25 Installer

**Status:** Ready for Implementation  
**Date:** 2026-06-02  
**Effort:** 0.5 hours (30 minutes)  
**Risk Level:** LOW  

---

## Overview

Phase 1 successfully implemented installation type selection in the Inno Setup script. Phase 2 updates the build workflows to ensure both executables (SMS_Manager.exe for Docker and SMS_Native_Lite_Simple.exe for Lite) are available during installer compilation.

---

## Critical Issue

**Current Problem:**
The installer script expects SMS_Native_Lite_Simple.exe to be in `dist/` directory before Inno Setup compilation, but `INSTALLER_BUILDER.ps1` doesn't copy it there.

**Impact:**
- Inno Setup will fail with file not found error when trying to include Lite edition files
- Installer build will fail silently or with cryptic error message
- Lite edition option will be non-functional

---

## Solution: Update INSTALLER_BUILDER.ps1

### File Location
```
d:\SMS\student-management-system\INSTALLER_BUILDER.ps1
```

### Required Changes

#### 1. Verify SMS_Native_Lite_Simple.exe Exists

**Add after line ~30 (after initial setup/validation):**

```powershell
# Verify Native Lite Edition executable exists
$LiteExePath = Join-Path $ProjectRoot "dist\SMS_Native_Lite_Simple.exe"
if (-not (Test-Path $LiteExePath)) {
    Write-Error "ERROR: SMS_Native_Lite_Simple.exe not found at: $LiteExePath"
    Write-Error "Build Native Lite Edition first: python -m PyInstaller lite_simple_entrypoint.spec"
    exit 1
}
Write-Host "✅ SMS_Native_Lite_Simple.exe found ($((Get-Item $LiteExePath).Length / 1MB)MB)"
```

#### 2. Copy Lite Executable to Installer dist/

**Add before line ~80 (before Inno Setup compilation):**

```powershell
# Copy Lite Edition executable to installer dist directory for inclusion
$LiteExePath = Join-Path $ProjectRoot "dist\SMS_Native_Lite_Simple.exe"
$InstallerDistDir = Join-Path $InstallerDir "dist"
$LiteDestPath = Join-Path $InstallerDistDir "SMS_Native_Lite_Simple.exe"

if (Test-Path $LiteExePath) {
    Write-Host "Copying SMS_Native_Lite_Simple.exe to installer dist..."
    if (-not (Test-Path $InstallerDistDir)) {
        New-Item -ItemType Directory -Path $InstallerDistDir -Force | Out-Null
    }
    Copy-Item -Path $LiteExePath -Destination $LiteDestPath -Force
    Write-Host "✅ Lite Edition executable ready for Inno Setup"
} else {
    Write-Warning "SMS_Native_Lite_Simple.exe not found; Lite Edition will not be included in installer"
}
```

#### 3. Update Inno Setup Invocation Comment

**Update the comment before Inno Setup call:**

```powershell
# Compile installer with Inno Setup
# SMS_Manager.exe (Docker) and SMS_Native_Lite_Simple.exe (Lite) are both available
# Inno Setup includes them conditionally based on user's installation type selection
```

---

## Expected Build Output

After Phase 2 implementation, the installer build should:

1. ✅ Find SMS_Manager.exe in `installer\dist\`
2. ✅ Find SMS_Native_Lite_Simple.exe in `dist\` and copy to `installer\dist\`
3. ✅ Compile SMS_Installer.iss with both executables available
4. ✅ Create SMS_Installer_1.18.24.exe with conditional file inclusion

**Size estimate:** 25-35 MB (installer is small; executables are included based on selection)

---

## Testing Checklist

### Pre-Build Verification
- [ ] SMS_Manager.exe exists at `installer\dist\SMS_Manager.exe` (59 MB)
- [ ] SMS_Native_Lite_Simple.exe exists at `dist\SMS_Native_Lite_Simple.exe` (68 MB)
- [ ] Inno Setup 6 is installed

### Build Execution
- [ ] Run `.\INSTALLER_BUILDER.ps1` from project root
- [ ] Build completes without errors
- [ ] Both validation checks pass (Docker Manager found, Lite Edition found)
- [ ] Inno Setup compilation succeeds

### Installer Validation
- [ ] SMS_Installer_1.18.24.exe created in `dist/`
- [ ] File is code-signed (AUT MIEEK certificate)
- [ ] Size is reasonable (25-35 MB, smaller is better)

### Functional Testing
1. **Docker Edition Installation:**
   - [ ] Run installer
   - [ ] Select "Docker Production Edition"
   - [ ] Docker Prerequisites page appears
   - [ ] Database Configuration page appears
   - [ ] Docker Build page appears
   - [ ] SMS_Manager.exe installed to {app}
   - [ ] Start menu shortcut created for SMS_Manager.exe

2. **Lite Edition Installation:**
   - [ ] Run installer
   - [ ] Select "Native Lite Edition"
   - [ ] Docker Prerequisites page SKIPPED
   - [ ] Database Configuration page SKIPPED
   - [ ] Docker Build page SKIPPED
   - [ ] SMS_Native_Lite.exe installed to {app}
   - [ ] Setup scripts installed to {app}\setup\
   - [ ] Documentation installed to {app}\docs\
   - [ ] Start menu shortcut created for SMS_Native_Lite.exe

---

## Files to Review

| File | Section | Notes |
|------|---------|-------|
| `INSTALLER_BUILDER.ps1` | Top validation | Add Lite exe verification |
| `INSTALLER_BUILDER.ps1` | Pre-compilation | Add Lite exe copy logic |
| `installer/SMS_Installer.iss` | Already updated | Phase 1 complete |
| `.github/workflows/installer.yml` | Build step | Already works, no changes needed |
| `.github/workflows/release-installer-with-sha.yml` | Release | No changes needed |

---

## Success Criteria

✅ **Build completes successfully**
- Both Docker and Lite executables verified and available
- Inno Setup compiles without errors
- Installer file created with correct version number

✅ **Installer is functional for both editions**
- Docker selection installs SMS_Manager.exe with all Docker files
- Lite selection installs SMS_Native_Lite.exe with setup/docs files
- Correct shortcuts created for each edition

✅ **Code signature is valid**
- Installer is signed with AUT MIEEK certificate
- Certificate verification passes
- No security warnings on execution

---

## Next Steps

1. **Implement Phase 2:** Update INSTALLER_BUILDER.ps1
2. **Test locally:** Run installer for both edition types
3. **Build final installer:** For vvv1.18.25 release
4. **Phase 3:** Greek translations and documentation updates

---

## Rollback Plan

If Phase 2 implementation causes issues:

1. Revert the INSTALLER_BUILDER.ps1 changes
2. The SMS_Installer.iss already has graceful fallback (Check: conditions)
3. Docker edition will still work (primary use case)
4. Lite edition simply won't be included (non-functional, but no build error)

---

## Notes

- Phase 1 implementation is **complete and tested** - SMS_Installer.iss has all necessary logic
- Phase 2 is **mechanical** - just ensuring files are copied to right location
- Both executables are **production-ready** and **properly built**
- No code changes needed, only file handling

---

**Estimated Total Time:** 30 minutes for implementation + 30 minutes for testing = 1 hour  
**Ready to Proceed:** YES ✅

---

See Also:
- [Phase 1 Implementation Report](INSTALLER_REAL_TESTING_REPORT.md)
- [Windows Installer Review](INSTALLER_REVIEW_vvv1.18.25.md)
- [Installer Script Reference](installer/SMS_Installer.iss)


