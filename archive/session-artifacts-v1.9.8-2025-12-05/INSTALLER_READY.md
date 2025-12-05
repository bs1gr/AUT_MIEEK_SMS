# Quick Reference: SMS Installer v1.9.8

## ✅ Status: READY FOR DISTRIBUTION

**Installer File**: `dist/SMS_Installer_1.9.8.exe` (~6.7 MB)

### What Was Fixed

- Inno Setup `MsgBox()` calls corrected (valid constants + parameters)
- Simplified POST-INSTALL: no automatic Docker build/start
- Added clear guidance to use `SMS_Launcher.cmd` (or shortcuts) after install
- Bundled launch helpers: `SMS_Launcher.cmd`, `SMS_Launch_Browser.cmd`, `SMS_Launch_Clean_Browser.cmd`

### Installation Flow (current)

1. **Pre-Installation**: Checks Docker Desktop presence/running state
2. **Installation**: Copies application, launcher scripts, shortcuts, assets
3. **Post-Installation**: Shows instructions to run `SMS_Launcher.cmd build` then `start` (or use Start Menu/Desktop shortcut) once Docker is running

### Docker Behavior

- **Docker Installed & Running**: User runs launcher to build/start when ready
- **Docker Installed, Not Running**: Installer advises to start Docker Desktop first
- **Docker Missing**: Installer instructs to install Docker Desktop

### Key Features

- Bilingual (English/Greek) support
- Upgrade/fresh install detection
- Data preservation on upgrade
- Desktop shortcut creation (opens Clean Browser launcher)
- Version-stamped uninstaller

### After Installation

From the installation directory (or shortcut):

```powershell
SMS_Launcher.cmd build   # builds image if needed
SMS_Launcher.cmd start   # starts container (port 8080)
SMS_Launcher.cmd status  # optional: check status
```

Or double-click the desktop shortcut to start + open in a fresh browser.

### Troubleshooting

If installation fails:

1. Ensure Docker Desktop is installed and running
2. Check disk space (~1–2 GB)
3. Run installer as Administrator
4. Review logs in installation directory
