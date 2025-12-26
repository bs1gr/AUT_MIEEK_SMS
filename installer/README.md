# SMS Installer - v1.10.0

This directory contains the Inno Setup installer configuration and code signing certificates for the Student Management System.

## Recent Changes (v1.10.0)

**New Features:**

- ✅ Excellence Highlights: Auto-recognition for A/A+ grades (⭐ 4-5 stars)
- ✅ Enhanced test coverage: Backend integration + UI tests
- ✅ Translation fixes: 8 missing grading categories + attendance collision resolved
- ✅ Version management: Enhanced script tracks all 12 version references

**Technical Improvements:**

- Updated wizard images to v1.10.0 with Modern v2.0 design
- All version references synchronized across codebase
- Comprehensive audit and verification completed
- 1411 tests passing (378 backend + 1033 frontend)

**What's Excluded from Installer:**

- `frontend/node_modules/` - Built during Docker image creation
- `frontend/dist/` - Built during Docker image creation
- `backend/__pycache__/` - Python bytecode (regenerated)
- `.env` files - Created/preserved per installation

## Application Purpose

This installer is for a **Student Management System** built for teachers at:

**ΜΙΕΕΚ - Μεταλυκειακά Ινστιτούτα Επαγγελματικής Εκπαίδευσης και Κατάρτισης**

- Official Website: <https://www.mieek.ac.cy/index.php/el/>
- Location: Limassol, Cyprus

**Developer:** Independent teacher at ΜΙΕΕΚ

- GitHub Repository: <https://github.com/bs1gr/AUT_MIEEK_SMS>

## Files

| File | Description |
|------|-------------|
| `SMS_Installer.iss` | Inno Setup installer script |
| `Greek.isl` | Greek language translations |
| `AUT_MIEEK_CodeSign.cer` | Public certificate (distribute to users) |
| `AUT_MIEEK_CodeSign.pfx` | Private key (⚠️ KEEP SECURE - not in git) |
| `SIGN_INSTALLER.ps1` | Script to sign installer executables |
| `INSTALL_CERTIFICATE.ps1` | Script to trust the certificate (run as Admin) |
| `CREATE_CERTIFICATE.ps1` | Generate new code signing certificate |
| `run_docker_install.cmd` | Helper for Docker installation |
| `placeholder.txt` | Placeholder for data directory |

## Building the Installer

1. **Build the installer:**

   ```powershell
   & "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "installer\SMS_Installer.iss"
   ```

2. **Sign the installer:**

   ```powershell
   .\installer\SIGN_INSTALLER.ps1
   ```

   Or manually:

   ```powershell
   signtool sign /f "installer\AUT_MIEEK_CodeSign.pfx" /p "SMSCodeSign2025!" /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /d "Student Management System" "dist\SMS_Installer_X.X.X.exe"
   ```

## Code Signing Certificate

The installer is signed with a self-signed certificate for "AUT MIEEK".

### For End Users

To trust the installer and avoid "Unknown publisher" warnings, run as Administrator:

```powershell
.\installer\INSTALL_CERTIFICATE.ps1
```

Or manually:

```powershell
certutil -addstore Root "installer\AUT_MIEEK_CodeSign.cer"
certutil -addstore TrustedPublisher "installer\AUT_MIEEK_CodeSign.cer"
```

### Certificate Details

- **Subject:** CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY
- **Valid Until:** November 2028
- **Thumbprint:** (Updated after regeneration)

### Security Notes

- ⚠️ The `.pfx` file contains the private key and should NEVER be committed to git
- ⚠️ Keep the password (`SMSCodeSign2025!`) secure
- The `.cer` file is the public certificate and is safe to distribute

## Installer Features

**Core Features:**

- ✅ Bilingual: English and Greek (ISO-compliant translations)
- ✅ Detects existing installations and offers upgrade vs fresh install
- ✅ Creates desktop shortcut: Student Management System
- ✅ Automatic Docker container build on first run
- ✅ Preserves user data during upgrades/uninstall (optional)

**Upgrade Intelligence (v1.9.7+):**

- Detects previous version and offers:
  - **Update/Overwrite:** Keep data, install over existing
  - **Fresh Install:** Remove previous installation completely
  - **Cancel:** Abort installation
- Automatic backup before upgrade to `backups/pre_upgrade_{version}/`
- Stops Docker containers gracefully before file updates
- Restores `.env` files from backup after upgrade

**Data Preservation:**

- Database (`data/` folder)
- Backups (`backups/` folder)
- Logs (`logs/` folder)
- Configuration files (`.env` files)
- User can choose to keep or delete on uninstall

**Dependency Handling:**

- Frontend dependencies: Installed during Docker build (`npm ci`)
- Backend dependencies: Installed during Docker build (`pip install`)
- No `node_modules` or `__pycache__` in installer package
- Clean separation: installer only contains source code

## Output

The built installer will be placed in:

```
dist\SMS_Installer_1.9.7.exe
```

## Important Notes for v1.9.7

### Circular Dependency Fix

Version 1.9.7 fixed a critical bug where `frontend/package.json` contained:

```json
"sms-monorepo": "file:.."
```

This caused infinite symlink recursion (17x depth) in `node_modules/`. **The dependency has been removed.**

### Uninstaller Behavior

The uninstaller is renamed to include version: `Uninstall_SMS_1.9.7.exe`

**During Uninstall:**

1. Stops Docker container (`docker stop sms-app`)
2. Removes container (`docker rm sms-app`)
3. Asks user: "Delete all user data?"
   - **YES:** Removes `data/`, `backups/`, `logs/`, `.env` files
   - **NO:** Keeps data for future reinstallation
4. Cleans up application files
5. Removes empty directories

**Preserved on "NO":**

- Database: `{app}\data\student_management.db`
- Backups: `{app}\backups\*.db.backup`
- Logs: `{app}\logs\*.log`
- Config: `{app}\backend\.env`, `{app}\frontend\.env`

### Upgrade Path Testing

When upgrading from previous versions:

1. Installer detects existing installation
2. Shows version comparison dialog
3. If "Update" chosen:
   - Backs up data to `backups/pre_upgrade_1.9.7/`
   - Stops Docker container
   - Updates files in place
   - Restores `.env` configuration
4. First launch rebuilds Docker image with fixed `package.json`

### Testing Checklist

- [ ] Fresh install on clean system
- [ ] Upgrade from v1.9.6 with data preservation
- [ ] Upgrade from v1.9.6 with fresh install
- [ ] Uninstall with data preservation
- [ ] Uninstall with complete removal
- [ ] Docker container builds successfully (no symlink loops)
- [ ] Desktop shortcut launches correctly
- [ ] Bilingual UI (EN/EL) works correctly
