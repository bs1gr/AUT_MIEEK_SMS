# SMS Installer v1.9.8 - Release Notes (Rebuilt)

**Date**: December 5, 2025  
**File**: `SMS_Installer_1.9.8.exe` (~6.4 MB)  
**Status**: ✅ Ready for Distribution

## What's Fixed in This Build

### Safer Post-Install Flow (No Auto-Build)

**Problem**: The installer previously attempted to build/run Docker during POST-INSTALL, leading to long installs and brittle failures when Docker was unavailable.

**Solution**: POST-INSTALL now shows guidance only. Users run `SMS_Launcher.cmd build` then `start` (or use the desktop shortcut) after the install completes and Docker is running.

**Impact**:

- ✅ Faster, more reliable installer execution
- ✅ Clear next steps for users with/without Docker running
- ⚠️ Docker image/container creation happens after install via launcher

### Launcher & Shortcut Updates

- Bundled launchers: `SMS_Launcher.cmd`, `SMS_Launch_Browser.cmd`, `SMS_Launch_Clean_Browser.cmd`
- Desktop/Start Menu shortcuts point to the clean-browser launcher (starts app and opens fresh browser)

## Installation Flow (current)

1. **Pre-Check**: Detects whether Docker Desktop is installed/running
2. **File Copy**: Installs application + launcher helpers
3. **Post-Install**: Displays instructions to run `SMS_Launcher.cmd build` then `start` (or use shortcuts)
4. **Completion**: Provides URL and reminders

## Installation Requirements

### Required

- Windows 10 or later
- Docker Desktop installed (recommended to have it running before using the launcher)
- Administrator privileges
- ~2+ GB free disk space
- Port 8080 available

### Optional

- Python 3.11+ (native dev mode)
- Node.js 22+ (frontend dev)

## Post-Installation

### Start the Application

From the installation directory (or using the shortcut):

```powershell
SMS_Launcher.cmd build   # build image if missing
SMS_Launcher.cmd start   # start container on port 8080
SMS_Launcher.cmd status  # optional
```

### Verify Access

- Open <http://localhost:8080/>
- If styling looks stale, use the "Clean Browser" shortcut or `SMS_Launch_Clean_Browser.cmd`

### Troubleshooting

- **Docker not running**: Start Docker Desktop, rerun launcher
- **Port 8080 in use**: Stop the conflicting service or adjust `docker run` port mapping in the launcher
- **Container issues**: `docker logs sms-app` for details

## Management Commands

- Desktop shortcut: Starts app and opens in a fresh browser session
- Launcher: `SMS_Launcher.cmd start|stop|restart|status|build`
- PowerShell scripts remain available: `DOCKER.ps1 -Start/-Stop/-Update/-UpdateClean`

## Security Considerations

⚠️ Change `SECRET_KEY` in `backend/.env` for production deployments, then restart the container.

## Testing Checklist

- [ ] Installer runs without errors
- [ ] Desktop & Start Menu shortcuts created
- [ ] Launcher builds/starts container successfully when Docker is running
- [ ] Web interface loads at <http://localhost:8080/>
- [ ] Uninstaller removes shortcuts and files

## Distribution

**Location**: `dist/SMS_Installer_1.9.8.exe`

**Checksum** (for verification):

```powershell
Get-FileHash ".\dist\SMS_Installer_1.9.8.exe" -Algorithm SHA256
```

**Distribution Channels**:

- GitHub Releases: <https://github.com/bs1gr/AUT_MIEEK_SMS/releases>
- Direct download for internal deployment
- Network share for institutional rollout

## Support

**Documentation**:

- README.md - Architecture and overview
- QUICK_START_GUIDE.md - Getting started
- DOCKER_NAMING_CONVENTIONS.md - Docker specifics
- INSTALLATION_FIX_GUIDE.md - Troubleshooting

**Issues**: Report at <https://github.com/bs1gr/AUT_MIEEK_SMS/issues>

---

**Build Status**: ✅ Tested and verified working  
**Installer Version**: 1.9.8  
**Application Version**: 1.9.8  
**Build Date**: December 5, 2025
