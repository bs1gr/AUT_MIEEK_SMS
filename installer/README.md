# SMS Installer

This directory contains the Inno Setup installer configuration and code signing certificates for the Student Management System.

## Organization

**MIEEK (Mediterranean Institute of Environmental Economics and Knowledge)**
- Official Website: https://www.mieek.ac.cy/index.php/el/
- Location: Limassol, Cyprus
- GitHub Repository: https://github.com/bs1gr/AUT_MIEEK_SMS

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

- Bilingual: English and Greek
- Detects existing installations and offers upgrade
- Creates desktop shortcut for Docker toggle
- Automatic Docker container build on first run
- Preserves user data during upgrades/uninstall

## Output

The built installer will be placed in:
```
dist\SMS_Installer_X.X.X.exe
```
