# Installer Artifacts - v1.9.4 and Earlier

**Archive Date:** December 4, 2025  
**Purpose:** Preserve outdated installer documentation and executables

## Contents

### Installer Executables

- `SMS_Installer_1.9.3.exe` - Old installer executable (superseded by v1.9.7)

### Documentation

- `FINAL_AUDIT_REPORT.md` - Final audit report for v1.9.4 installer
- `GREEK_LOCALIZATION_v1.9.4.md` - Greek localization improvements (v1.9.4)
- `INSTALLER_AUDIT_REPORT.md` - Installer audit report (v1.9.4)

## Why Archived?

These artifacts are from v1.9.3/v1.9.4 development cycles and are no longer current:

1. **Old Executable**: v1.9.3 installer superseded by v1.9.7
2. **Outdated Documentation**: Audit reports specific to older versions
3. **Historical Greek Localization**: Incremental improvements now in main codebase

## Current Installer

For current installer information, see:

- `installer/SMS_Installer.iss` - Current Inno Setup script (v1.9.7)
- `installer/INSTALLER_UPDATE_v1.9.7.md` - Latest installer changes
- `installer/README.md` - Current installer documentation

## Build New Installer

```powershell
# Sign and build current version
.\installer\SIGN_INSTALLER.ps1
```

Current installer uses:

- Version: 1.9.7
- Code signing: AUT_MIEEK_CodeSign.pfx
- Bilingual support: EN/EL
- Docker installation: Integrated via run_docker_install.cmd

---

**Note:** These files preserved for audit trail and historical reference only.
