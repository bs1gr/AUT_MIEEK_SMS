# SMS Installer - v1.18.3

This directory contains the Inno Setup installer configuration and code signing certificates for the Student Management System.

## Recent Changes (v1.18.3)

**Major Updates:**

- ✅ **RBAC Improvements**: Legacy admin fallback scoped to imports permissions only (stricter security)
- ✅ **Database Standardization**: PostgreSQL-only deployment with persistence hardening
- ✅ **Course Auto-Activation**: Scheduled job (3:00 AM UTC daily) + UI indicators (green/amber/blue badges)
- ✅ **Installer Runtime**: Fixed runtime crash scenarios with corrected release lineage
- ✅ **Release Integrity**: Mandatory signing + payload gates + digest verification

**Recent Features (v1.18.0-1.18.3):**

- Course auto-activation based on semester dates with real-time UI indicators
- PDF extraction pipeline for MIEEK course data import
- Enhanced course template management with evaluation rules validation
- Encrypted backup support + maintenance fixes
- Enrollment status filtering (active courses only)
- Dashboard analytics limited to active enrollments

**Technical Improvements:**

- 2579+ tests passing (742 backend + 1813 frontend + 34 auto-activation)
- PostgreSQL-only wiring enforced for data persistence
- Docker volume persistence hardening with auto-migration
- SMS_Manager.exe bundled native runtime for shortcuts
- Release asset sanitization (installer-only artifacts)

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
dist\SMS_Installer_1.18.3.exe
```

**Installer Size**: 119,232,344 bytes (~119 MB)
- Includes SMS_Manager.exe (28.51 MB self-contained .NET 5.0 runtime)
- Full backend and frontend source code
- Docker configuration files
- Code signing certificate

## Important Notes for v1.18.3

### PostgreSQL-Only Deployment

Version 1.18.3 enforces PostgreSQL as the only database engine. SQLite is deprecated for fresh installations.

**Database Configuration:**
- PostgreSQL container managed automatically by Docker Compose
- Default connection: `postgresql://sms_user:***@sms-postgres:5432/sms`
- SQLite→PostgreSQL migration helper available for upgrades

### Uninstaller Behavior

The uninstaller is renamed to include version: `Uninstall_SMS_1.18.3.exe`

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
   - Backs up data to `backups/pre_upgrade_1.18.3/`
   - Stops Docker container
   - Updates files in place
   - Migrates SQLite to PostgreSQL if needed
   - Restores `.env` configuration
4. First launch rebuilds Docker image with latest code

### Testing Checklist

- [ ] Fresh install on clean system
- [ ] Upgrade from v1.18.2 with data preservation
- [ ] Upgrade from v1.17.x with SQLite→PostgreSQL migration
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
   - Install v1.18.2 (or v1.17.x baseline)
   - Run new v1.18.3 installer and choose **Update/Overwrite**
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
