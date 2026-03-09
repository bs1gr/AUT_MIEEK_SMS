# SMS Installer - v1.18.10

This directory contains the Inno Setup installer configuration and code signing certificates for the Student Management System.

## Recent Changes (v1.18.10)

**Major Updates:**

- ✅ **Upgrade Profile-Drift Prevention**: Installer now preserves existing PostgreSQL configuration during upgrades (prevents silent switch to local SQLite)
- ✅ **Secure Profile Defaults**: Fresh installs stay local-first while remote PostgreSQL remains explicit opt-in
- ✅ **Control Panel Auto-Updater**: Threaded download with SHA256 verification and installer launch
- ✅ **Database Management Panel**: Backup, diagnostics, and user admin consolidated in Control Panel
- ✅ **Offline Support**: Centralized network status hook, offline banner, and reconnect sync queues
- ✅ **Remote Database Credential Upload**: Validate & Connect / Test Only UI for remote PostgreSQL
- ✅ **SQL Backup Support**: Encrypted and unencrypted backup modes
- ✅ **Analytics Dashboard**: Comprehensive multi-chart visualization, predictive analytics, custom report builder

**Recent Features (v1.18.4-1.18.10):**

- Control Panel with auto-updater, database management, and release channel support
- Offline queues for attendance, grades, and student updates on reconnect
- Analytics revival (dashboard, predictive analytics, custom report builder, export)
- Windows subprocess crash fix (`docker.exe 0xc0000142`)
- Notification integration for update-available events
- Environment repair helper for profile-drift incidents

**Technical Improvements:**

- All backend and frontend tests passing
- PostgreSQL-only wiring enforced for data persistence
- Docker volume persistence hardening with auto-migration
- SMS_Manager.exe bundled native runtime for shortcuts
- Release asset sanitization (installer-only artifacts)
- ESLint warnings reduced, analytics types fully typed

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

**Upgrade Intelligence:**

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
dist\SMS_Installer_1.18.10.exe
```

**Installer Size**: ~25-30 MB (compressed)
- Includes SMS_Manager.exe (28.51 MB self-contained .NET 5.0 runtime)
- Full backend and frontend source code
- Docker configuration files
- Code signing certificate

## Important Notes for v1.18.10

### Database Profile Behavior

Version 1.18.10 keeps **secure local SQLite** as the default profile for fresh installs while preserving existing PostgreSQL configurations during upgrades.

**Upgrade Profile-Drift Prevention:**
- Installer now detects existing PostgreSQL configuration in `.env` and preserves it
- Prevents silent switch to local SQLite during unattended upgrades
- Recovery helper available: `scripts/ops/REPAIR_LAPTOP_ENV_PROFILE.ps1`

**Database Configuration:**
- `SMS_DATABASE_PROFILE=local` uses SQLite for secure local-first installs
- `SMS_DATABASE_PROFILE=remote` uses PostgreSQL with explicit `POSTGRES_*` credentials
- Existing PostgreSQL installs are preserved and auto-inferred during upgrades

### Uninstaller Behavior

The uninstaller is renamed to include version: `Uninstall_SMS_1.18.10.exe`

**During Uninstall:**

1. Stops Docker container (`docker stop sms-app`)
2. Removes container (`docker rm sms-app`)
3. Asks user: "Delete all user data?"
   - **YES:** Removes `data/`, `backups/`, `logs/`, `.env` files
   - **NO:** Keeps data for future reinstallation
4. Cleans up application files
5. Removes empty directories

**Preserved on "NO":**

- Database: PostgreSQL data in Docker volume `sms_postgres_data`
- Backups: `{app}\backups\*.sql` (or `.db.backup` for legacy SQLite)
- Logs: `{app}\logs\*.log`
- Config: `{app}\backend\.env`, `{app}\frontend\.env`

### Upgrade Path Testing

When upgrading from previous versions:

1. Installer detects existing installation
2. Shows version comparison dialog
3. If "Update" chosen:
   - Backs up data to `backups/pre_upgrade_1.18.9/`
   - Backs up data to `backups/pre_upgrade_1.18.10/`
   - Stops Docker container
   - Updates files in place
   - Migrates SQLite to PostgreSQL if needed
   - Restores `.env` configuration
4. First launch rebuilds Docker image with latest code

### Testing Checklist

- [ ] Fresh install on clean system
- [ ] Upgrade from v1.18.8 with data preservation
- [ ] Upgrade from v1.18.x with PostgreSQL data preserved
- [ ] Uninstall with data preservation
- [ ] Course auto-activation scheduler verification (daily 3:00 AM UTC)

### Validation Checklist (Windows 10 & 11)

Use this checklist when validating the installer on clean environments:

1) **Fresh Install** (Win10 + Win11)
   - Run installer as Admin
   - Verify certificate prompt shows "AUT MIEEK"
   - Confirm app installs to default path and launches

2) **Shortcuts**
   - Desktop shortcut created and launches app
   - Start Menu entry present and launches app

3) **Upgrade Scenario**
   - Install v1.18.8 (or v1.18.x baseline)
   - Run new v1.18.10 installer and choose **Update/Overwrite**
   - Verify data preserved (`data/`, `backups/`, `logs/`, `.env`)
   - Verify SQLite→PostgreSQL migration if upgrading from v1.17.x
   - App launches successfully after upgrade

4) **Uninstall**
   - Run uninstaller
   - Choose **Keep data** → confirm files remain
   - Choose **Delete data** → confirm app dir + data removed

5) **Post-Checks**
   - Health check passes after install (`http://localhost:8000/health/live`)
   - Docker container starts/stops cleanly (if using Docker mode)
   - No leftover services/processes after uninstall

6) **Document Results**
   - Record OS version (Win10/Win11 build)
   - Note any warnings/prompts
   - Attach installer logs (if any) and screenshots of dialogs
- [ ] Uninstall with complete removal
- [ ] Docker container builds successfully (no symlink loops)
- [ ] Desktop shortcut launches correctly
- [ ] Bilingual UI (EN/EL) works correctly
