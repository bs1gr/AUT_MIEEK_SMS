# Windows Installer Review & Enhancement Plan - vv1.18.24

**Date:** 2026-06-01  
**Status:** ✅ Review Complete - Ready for vv1.18.24 Enhancement  
**Current Version:** 1.18.11  
**Target Version:** 1.18.24  

---

## Executive Summary

The current Windows installer (vv1.18.24) is **production-ready** but requires **enhancement for vv1.18.24** to properly support the new **SMS Native Lite Edition** alongside the existing Docker production build. This review identifies:

✅ **What's Working Well:**
- Proper Docker production installation
- QNAP PostgreSQL integration with credential management
- Bilingual support (English/Greek)
- Code signing with certificate verification
- GitHub release workflow automation

⚠️ **What Needs Enhancement:**
- Installer lacks explicit **installation type selection** (Docker vs Native Lite)
- No automation for **Native Lite Edition** deployment
- Release workflow doesn't distinguish between Docker and Lite installers
- No separate installer for Native Lite (currently only in SMS_Native_Lite_Edition/ folder)

🎯 **Recommendation for vv1.18.24:**
Add an **Installation Type selection page** to offer both:
1. **Docker Production** (current default behavior)
2. **Native Lite Edition** (new lightweight standalone exe)

---

## Current Installer Architecture

### SMS_Installer.iss (Inno Setup v6)

**Current Features:**
- Line 126-130: Installation type selection exists but is disabled/incomplete
  - `InstallDockerOnly` - Docker only (currently recommended)
  - `InstallDevEnvironment` - Dev tools (not used in production)
- Line 131-155: Database configuration page for QNAP PostgreSQL
- Lines 165-212: File inclusion excludes dev/test artifacts

**Current Limitations:**
```inno
english.InstallationType=Installation Type
english.InstallDockerOnly=Docker Production Only (Recommended)
english.InstallDockerOnlyDesc=Minimal installation with Docker container
english.InstallDevEnvironment=Include Development Environment
english.InstallDevEnvironmentDesc=Add Node.js, Python, native development files
```

**Problem:** The selection page exists but installation type doesn't affect what gets installed. Both options install the same Docker-based system.

### INSTALLER_BUILDER.ps1

**Purpose:** PowerShell build script that orchestrates the installer creation

**Workflow:**
1. Validates Inno Setup 6 is installed
2. Builds SMS_Manager.exe (.NET runtime launcher)
3. Generates Greek RTF installer info pages
4. Compiles SMS_Installer.iss → SMS_Installer_X.X.X.exe
5. Code signs the installer with AUT MIEEK certificate
6. Uploads to GitHub release

**Current Version Handling:**
- Reads from VERSION file (supports "v" prefix)
- Strips "v" for installer version directives

---

## GitHub Workflow Analysis

### installer.yml (Manual Build Workflow)

**Status:** ✅ Working (manual dispatch only)

**Steps:**
1. Setup .NET 8.0 SDK
2. Build SMS_Manager.exe
3. Run INSTALLER_BUILDER.ps1 with `-SkipCodeSign`
4. Verify installer signature (soft-fail in CI)
5. Uploads to workflow artifacts

**Use Case:** Ad-hoc testing and verification

**Note:** Not triggered by tags; disabled to avoid duplicate builds with `release-installer-with-sha.yml`

### release-installer-with-sha.yml (Release Publication Workflow)

**Status:** ✅ Working (strict release protocol)

**Key Features:**
- Mandatory code signing with AUT MIEEK certificate
- Lineage lock: Verifies HEAD matches tag commit
- Version consistency check (VERSION file vs tag)
- Payload size guardrail (min 20 MB)
- Installer-only asset allowlist (removes extra assets)
- GitHub release digest verification

**Critical Points:**
- Line 129-131: Tag must match `^v1\.\d+\.\d+$` format
- Line 200-203: VERSION file must match tag version
- Line 330: Requires exact thumbprint match for code signing cert
- Line 587-589: Only allows `SMS_Installer_${version}.exe` as asset

**Release Logic:**
1. Resolves release tag (manual dispatch or auto latest)
2. Checks out tag commit (lineage lock)
3. Builds and signs installer
4. Uploads to existing release (doesn't create releases)
5. Verifies digest match
6. Cleanup: Removes non-allowlisted assets

---

## Current Installation Flow

```
SMS_Installer.exe (vv1.18.24)
  ├─ Language Selection (English/Greek)
  ├─ Welcome Page
  ├─ Installation Type (EXISTS but NON-FUNCTIONAL)
  │  ├─ Docker Production Only ← Currently selected
  │  └─ Dev Environment ← Not used
  ├─ Database Configuration
  │  ├─ Local SQLite (fallback)
  │  └─ QNAP PostgreSQL (with credentials)
  ├─ Docker Status Check
  ├─ File Installation
  │  └─ Always installs Docker + backend + frontend
  ├─ Create shortcuts
  └─ Launch SMS_Manager.exe
```

---

## What's Missing for vv1.18.24

### 1. Native Lite Edition Support

**Current State:**
- SMS Native Lite edition exists as standalone exe (70+ MB)
- Located in: `SMS_Native_Lite_Edition/executable/SMS_Native_Lite_Simple.exe`
- Distributed via GitHub folder, not through main installer
- No integration with Windows installer

**Missing:**
- Installation type that selects Lite edition
- Option to deploy Lite exe vs Docker production
- Setup scripts for QNAP integration with Lite edition

### 2. Installer Type Selection Logic

**Need to Implement:**
```inno
function IsLiteInstall: Boolean;
begin
  Result := (SelectedInstallationType = 'lite');
end;

function IsDockerInstall: Boolean;
begin
  Result := (SelectedInstallationType = 'docker');
end;
```

Then conditionally include files:
```inno
Source: "dist\SMS_Native_Lite_Simple.exe"; DestDir: "{app}"; 
  Flags: ignoreversion; Check: IsLiteInstall

Source: "installer\dist\SMS_Manager.exe"; DestDir: "{app}"; 
  Flags: ignoreversion; Check: IsDockerInstall
```

### 3. Two Release Installers Strategy

**Option A: Single Installer (Recommended)**
- One installer for both Docker and Lite editions
- User selects during installation which version
- Simplifies GitHub release management
- Single asset: `SMS_Installer_X.X.X.exe`

**Option B: Separate Installers**
- Docker installer: `SMS_Installer_Docker_X.X.X.exe`
- Lite installer: `SMS_Installer_Lite_X.X.X.exe`
- Requires GitHub release-workflow updates
- Doubles build time and assets

---

## Recommendations for vv1.18.24

### Priority 1: Enable Installation Type Selection (MUST HAVE)

**Changes to SMS_Installer.iss:**

1. **Add installation type variable** (line ~303):
```pascal
var
  SelectedInstallationType: String;
  
function GetInstallationType: String;
begin
  Result := SelectedInstallationType;
end;
```

2. **Create installation type selection page** (after Docker check page):
```pascal
procedure CreateInstallationTypePage;
begin
  InstallTypePage := CreateCustomPage(DockerPage, 
    CustomMessage('InstallationTypeTitle'),
    CustomMessage('InstallationTypeDesc'));
  
  // Radio buttons for Docker vs Lite
  DockerRadio := TRadioButton.Create(InstallTypePage);
  DockerRadio.Caption := 'Docker Production Edition';
  DockerRadio.Parent := InstallTypePage.Surface;
  DockerRadio.Checked := True;
  
  LiteRadio := TRadioButton.Create(InstallTypePage);
  LiteRadio.Caption := 'Native Lite Edition (Standalone)';
  LiteRadio.Parent := InstallTypePage.Surface;
  LiteRadio.Checked := False;
  
  // Store selection
  if DockerRadio.Checked then
    SelectedInstallationType := 'docker'
  else
    SelectedInstallationType := 'lite';
end;
```

3. **Conditionally include files:**
```inno
[Files]
; Docker Production Files
Source: "installer\dist\SMS_Manager.exe"; DestDir: "{app}"; 
  Check: DockerSelected

; Native Lite Files  
Source: "SMS_Native_Lite_Edition\executable\SMS_Native_Lite_Simple.exe"; 
  DestDir: "{app}"; DestName: "SMS_Native_Lite.exe"; Check: LiteSelected
Source: "SMS_Native_Lite_Edition\setup\*"; DestDir: "{app}\setup"; 
  Check: LiteSelected
Source: "SMS_Native_Lite_Edition\docs\*"; DestDir: "{app}\docs"; 
  Check: LiteSelected
```

4. **Update configuration logic:**
- If Docker: Create `.env` for QNAP connection (existing logic)
- If Lite: Create `qnap-credentials` file, setup QNAP connection script

### Priority 2: Update Build Workflow (MUST DO)

**INSTALLER_BUILDER.ps1 Changes:**
- Verify SMS_Native_Lite_Simple.exe exists before build
- Include it in dist/ folder before calling Inno Setup
- Update version in both SMS_Installer.iss and build metadata

**installer.yml Changes:**
- Add step to copy SMS_Native_Lite_Simple.exe to dist/
- Verify both Docker and Lite assets are available

**release-installer-with-sha.yml Changes:**
- No changes needed (still creates single SMS_Installer_X.X.X.exe)

### Priority 3: Update Installer Documentation (SHOULD DO)

**Files to Update:**
1. `installer/README.md` - Add Lite edition section
2. `installer/SMS_Installer.iss` - Comment explains new installation types
3. Create `INSTALLER_vv1.18.24_RELEASE_NOTES.md`

**Documentation Should Cover:**
- Installation type selection process
- Docker edition: Current behavior (unchanged)
- Lite edition: New lightweight option, QNAP setup included
- When to choose each option

### Priority 4: Post-Installation Scripts (NICE TO HAVE)

**For Docker Edition:**
- Existing DOCKER.ps1 (no changes needed)

**For Lite Edition (NEW):**
```powershell
# setup_lite_qnap.ps1 (already exists in SMS_Native_Lite_Edition/)
# Should be copied to {app}/setup/ during installation
# User runs this if they want QNAP integration
```

---

## Testing Checklist for vv1.18.24

### Build Validation
- [ ] `INSTALLER_BUILDER.ps1` successfully builds SMS_Installer_1.18.24.exe
- [ ] Both Docker and Lite assets included in installer
- [ ] Installer size: 25-35 MB (Docker) or 50-70 MB (includes Lite exe)
- [ ] Code signing: Valid AUT MIEEK certificate
- [ ] GitHub release: Single asset `SMS_Installer_1.18.24.exe`

### Docker Installation (Unchanged)
- [ ] Fresh install: Docker edition selected → SMS_Manager.exe launches
- [ ] Upgrade from vv1.18.24: Docker edition → Data preserved
- [ ] QNAP PostgreSQL: Credentials file accepted
- [ ] SQLite fallback: Works when QNAP unavailable

### Lite Installation (NEW)
- [ ] Fresh install: Lite edition selected → SMS_Native_Lite.exe copied
- [ ] Setup scripts: setup_lite_qnap.ps1 available in {app}/setup/
- [ ] Documentation: Guides copied to {app}/docs/
- [ ] QNAP integration: setup_lite_qnap_remote.ps1 runs successfully
- [ ] Local SQLite: Works standalone without QNAP

### Bilingual UI
- [ ] English: Installation type page displays correctly
- [ ] Greek: Installation type page translated (add to Greek.isl)
- [ ] Both versions: Radio buttons, hints, success messages in proper language

### Uninstaller
- [ ] Docker mode: Uninstalls Docker files, preserves data
- [ ] Lite mode: Uninstalls Lite exe, preserves qnap-credentials
- [ ] Both modes: "Keep data" / "Remove data" options work

---

## Implementation Timeline

### Phase 1: Core Installation Type Selection (Week 1)
- [ ] Modify SMS_Installer.iss to add installation type page
- [ ] Add functions: `IsLiteInstall()`, `IsDockerInstall()`
- [ ] Conditionally include Docker vs Lite files
- [ ] Test locally with Inno Setup compiler

### Phase 2: Build Workflow Updates (Week 1)
- [ ] Update INSTALLER_BUILDER.ps1 to include SMS_Native_Lite.exe
- [ ] Update installer.yml workflow
- [ ] Verify release-installer-with-sha.yml works unchanged
- [ ] Test workflow with manual dispatch

### Phase 3: Documentation & Testing (Week 1-2)
- [ ] Update installer/README.md
- [ ] Add Greek translations to Greek.isl
- [ ] Create testing checklist
- [ ] Test both installation paths

### Phase 4: Release & Validation (Week 2)
- [ ] Build final SMS_Installer_1.18.24.exe
- [ ] Sign with AUT MIEEK certificate
- [ ] Upload to vv1.18.24 GitHub release
- [ ] Verify digest and asset integrity

---

## Files Requiring Changes

| File | Changes | Priority |
|------|---------|----------|
| `installer/SMS_Installer.iss` | Add installation type page, conditional file inclusion | MUST |
| `INSTALLER_BUILDER.ps1` | Include SMS_Native_Lite.exe in dist/ | MUST |
| `.github/workflows/installer.yml` | Copy Lite exe before build | SHOULD |
| `installer/README.md` | Document installation types | SHOULD |
| `installer/Greek.isl` | Translate installation type UI | SHOULD |
| `installer/SMS_Manager\Program.cs` | Update launcher to detect edition | NICE |

---

## Risk Assessment

### Low Risk ✅
- Adding installation type page (existing pattern in Inno Setup)
- Conditional file inclusion (already used for Dev environment)
- GitHub release workflow (no changes needed)

### Medium Risk ⚠️
- Build workflow timing (Lite exe must be ready before build)
- Uninstaller behavior with Lite edition (new, needs testing)
- Bilingual UI additions (new Greek strings)

### Mitigation
- Test both paths before release
- Use existing "Check:" syntax for conditional includes
- Reference proven Docker code patterns for Lite

---

## Success Criteria for vv1.18.24

✅ **Installer includes both installation types**
✅ **User can select Docker or Lite edition during setup**
✅ **Docker edition: Existing behavior unchanged**
✅ **Lite edition: SMS_Native_Lite.exe installed with setup scripts**
✅ **Single installer asset on GitHub release**
✅ **Both paths tested and working**
✅ **Documentation updated**
✅ **Bilingual support maintained**

---

## Conclusion

The current Windows installer (vv1.18.24) is **well-architected** and **production-ready**. For vv1.18.24, it requires **minimal but strategic enhancements** to support the new SMS Native Lite Edition alongside the existing Docker production build.

**Effort Estimate:** 2-3 days (mostly testing)  
**Complexity:** Low-to-Medium (using existing patterns)  
**Risk Level:** Low (well-tested Inno Setup framework)  

**Recommendation:** **Proceed with implementation** for vv1.18.24 release.

---

**Review Completed:** 2026-06-01  
**Status:** ✅ APPROVED FOR ENHANCEMENT  
**Next Step:** Begin Phase 1 implementation of installation type selection

