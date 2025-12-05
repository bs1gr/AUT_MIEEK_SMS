# SMS Installer Fix Summary

## Issue

The Inno Setup installer (`SMS_Installer.iss`) had invalid `MsgBox()` constants/parameters and tried to auto-build/start Docker during POST-INSTALL, making compilation fragile and installs slow.

## Root Causes

1. Invalid constants (`mbWarning`, `mbError`) and missing button parameters in `MsgBox()`
2. Overly heavy POST-INSTALL logic (build + start) coupled to Docker availability

## Changes Made

1. **MsgBox Syntax Fixed**
   - All calls now use `MsgBox('message', mbInformation, MB_OK)`
2. **POST-INSTALL Simplified**
   - No automatic Docker build/start inside the installer
   - Installer now provides guidance to run `SMS_Launcher.cmd build` then `start` (or use shortcuts) after installation
3. **Launch Helpers Bundled**
   - `SMS_Launcher.cmd`, `SMS_Launch_Browser.cmd`, `SMS_Launch_Clean_Browser.cmd` copied to install dir for reliable start/stop + cache-busting launch

## Current Behavior

- Installer completes quickly and informs the user how to start the app once Docker is running
- Desktop/Start Menu shortcut points to the clean-browser launcher

## Testing Recommendations

1. **Docker installed & running**: Run `SMS_Launcher.cmd build` then `start`; verify <http://localhost:8080>
2. **Docker installed but stopped**: Start Docker Desktop, rerun launcher
3. **Docker missing**: Installer message should direct user to install Docker

## File Locations

- Installer Script: `installer/SMS_Installer.iss`
- Launchers: `SMS_Launcher.cmd`, `SMS_Launch_Browser.cmd`, `SMS_Launch_Clean_Browser.cmd`
- Built Installer (if generated locally): `dist/SMS_Installer_1.9.8.exe`
