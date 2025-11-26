# Windows Installer Executables - Release Checklist

## 📋 Pre-Release Checklist

### Code Preparation

- [ ] **Version Bump**
  ```powershell
  # Update VERSION file
  Set-Content .\VERSION "1.8.7"
  
  # Update in scripts
  # - tools\installer\SMS_INSTALLER_WIZARD.ps1 (line ~30)
  # - tools\installer\SMS_UNINSTALLER_WIZARD.ps1 (line ~30)
  # - tools\installer\BUILD_INSTALLER_EXECUTABLE.ps1 (line ~35)
  ```

- [ ] **Test PowerShell Scripts**
  ```powershell
  # Test installer wizard (GUI)
  cd tools\installer
  .\SMS_INSTALLER_WIZARD.ps1
  
  # Test uninstaller wizard (GUI)
  .\SMS_UNINSTALLER_WIZARD.ps1
  
  # Test on fresh VM (critical!)
  # - Windows 10 22H2
  # - Windows 11 23H2
  # - No Docker Desktop installed
  ```

- [ ] **Verify Prerequisites**
  - PowerShell 5.1+ works
  - Administrator checks work
  - Docker installation detection works
  - System requirements validation accurate

- [ ] **Update Documentation**
  - [ ] `docs/WINDOWS_INSTALLER_WIZARD_GUIDE.md`
  - [ ] `README.md` (Quick Start section)
  - [ ] `CHANGELOG.md` (add release notes)
  - [ ] `docs/user/QUICK_START_GUIDE.md`

- [ ] **Commit Changes**
  ```powershell
  git add .
  git commit -m "feat: Windows GUI installer wizard with executable distribution"
  git push origin main
  ```

---

## 🏗️ Build Executables

### Method 1: PS2EXE (Default - Free)

```powershell
cd d:\SMS\student-management-system\tools\installer

# Build installer and uninstaller executables (recommended)
.\BUILD_SIMPLE.ps1

# Alternative: Advanced build with multiple packaging options
# .\BUILD_INSTALLER_EXECUTABLE.ps1

# Output: .\dist\
# - SMS_Installer_1.8.6.3.exe
# - SMS_Uninstaller_1.8.6.3.exe
# - SMS_Distribution_Package_v1.8.6.3\ (folder)
# - SMS_Distribution_Package_v1.8.6.3.zip
```

**Expected Output:**
```text
ℹ️  Checking for PS2EXE module...
✓ PS2EXE module already installed
ℹ️  Building installer executable with PS2EXE...
✓ Installer executable created: d:\SMS\student-management-system\tools\installer\dist\SMS_Installer_1.8.6.3.exe
ℹ️  Building uninstaller executable...
✓ Uninstaller executable created: d:\SMS\student-management-system\tools\installer\dist\SMS_Uninstaller_1.8.6.3.exe
ℹ️  Creating distribution package...
✓ Distribution README created
ℹ️  Creating ZIP archive...
✓ Distribution package created: d:\SMS\student-management-system\tools\installer\dist\SMS_Distribution_1.8.6.3.zip

========================================
  Build Completed Successfully!
========================================

Installer: d:\SMS\student-management-system\tools\installer\dist\SMS_Installer_1.8.6.3.exe
Package: d:\SMS\student-management-system\tools\installer\dist\SMS_Distribution_1.8.6.3.zip
```

### Method 2: Inno Setup (Professional)

**Prerequisites:**
```powershell
# Download and install Inno Setup 6
# https://jrsoftware.org/isdl.php
```

**Build:**
```powershell
cd tools\installer
.\BUILD_INSTALLER_EXECUTABLE.ps1 -Method InnoSetup

# Output: .\dist\SMS_Setup_1.8.6.3.exe (MSI-style installer)
```

### Build Verification

- [ ] **Check File Sizes**
  - `SMS_Installer_1.8.6.3.exe`: ~2-3 MB (PS2EXE) or ~5-10 MB (Inno Setup)
  - `SMS_Uninstaller_1.8.6.3.exe`: ~2-3 MB
  - `SMS_Distribution_1.8.6.3.zip`: ~50-100 MB (without Docker image)

- [ ] **Verify Executables**
  ```powershell
  # Check authenticode signature (if signed)
  Get-AuthenticodeSignature .\dist\SMS_Installer_1.8.6.3.exe
  
  # Check file properties
  (Get-Item .\dist\SMS_Installer_1.8.6.3.exe).VersionInfo
  ```

- [ ] **Test on Clean VM**
  - Copy `SMS_Distribution_1.8.6.3.zip` to clean VM
  - Extract and run `SMS_Installer_1.8.6.3.exe`
  - Verify all wizard steps work
  - Verify application starts successfully

---

## 🧪 Testing Checklist

### Test Environment Matrix

| OS | Docker Status | Expected Result |
|----|---------------|-----------------|
| Windows 10 22H2 | Not installed | Auto-install Docker, restart prompt |
| Windows 10 22H2 | Installed, not running | Prompt to start Docker |
| Windows 10 22H2 | Installed, running | Direct installation |
| Windows 11 23H2 | Not installed | Auto-install Docker, restart prompt |
| Windows 11 23H2 | Installed, running | Direct installation |

### Installer Tests

- [ ] **Launch Installer**
  - Double-click `SMS_Installer_1.8.6.3.exe`
  - Verify GUI wizard appears
  - Verify no PowerShell window visible

- [ ] **Welcome Page**
  - Version number correct (1.8.6.3)
  - App name displayed correctly
  - "Next" button enabled

- [ ] **License Page**
  - License text loads (MIT License)
  - "I accept" checkbox works
  - "Next" disabled until checked

- [ ] **Prerequisites Page**
  - "Check System Requirements" button works
  - All checks run (Windows, PowerShell, Admin, Disk, Memory, Docker)
  - Results display correctly (✓ or ✗)
  - "Next" enabled only if checks pass

- [ ] **Docker Installation Page**
  - Shows only if Docker missing
  - "Download & Install Docker Desktop" button works
  - Downloads ~500 MB from docker.com
  - Installation prompts for restart
  - After restart, installer can be re-run successfully

- [ ] **Configuration Page**
  - Installation path default: `C:\Program Files\StudentManagementSystem`
  - Browse button works
  - Port default: 8080
  - Port validation (1024-65535)
  - Admin email default: `admin@example.com`
  - Admin password default: `YourSecurePassword123!`
  - "Show password" checkbox works

- [ ] **Installation Page**
  - "Install" button starts installation
  - Progress bar updates
  - Real-time log output visible
  - Logs color-coded (green = success, red = error)
  - Steps complete in order:
    1. Create directory
    2. Copy files
    3. Configure environment
    4. Verify Docker
    5. Build image (~5-10 min)
    6. Start container
    7. Verify application
  - "Next" enabled after completion

- [ ] **Completion Page**
  - Success message shown
  - Access URL: `http://localhost:8080`
  - Default credentials displayed
  - "Open application in browser" checkbox checked by default
  - "Finish" opens browser to application
  - Application loads successfully
  - Admin login works with default credentials

### Uninstaller Tests

- [ ] **Launch Uninstaller**
  - Double-click `SMS_Uninstaller_1.8.6.3.exe`
  - Verify GUI wizard appears

- [ ] **Welcome Page**
  - Warning about data loss clear
  - "Next" button enabled

- [ ] **Options Page**
  - "Keep my data" radio selected by default
  - "Create backup on Desktop" checkbox checked by default
  - Backup path shown: `Desktop\SMS_Backup_YYYYMMDD_HHMMSS`

- [ ] **Docker Cleanup Page**
  - "Standard Cleanup" radio selected by default
  - "Deep Docker Cleanup" option available
  - Descriptions clear

- [ ] **Uninstallation Page**
  - "Uninstall" button prompts for confirmation
  - Progress bar updates
  - Real-time log output
  - Steps complete:
    1. Create backup (if requested)
    2. Stop containers
    3. Remove containers
    4. Docker cleanup
    5. Remove application files
  - "Next" enabled after completion

- [ ] **Completion Page**
  - Success message shown
  - Data location displayed (if kept)
  - Backup location displayed (if created)
  - "Finish" closes wizard

### Post-Uninstall Verification

- [ ] **Data Preservation (if "Keep data" selected)**
  - `C:\Program Files\StudentManagementSystem\data\` exists
  - `C:\Program Files\StudentManagementSystem\backups\` exists
  - Desktop backup folder exists
  - Database file intact

- [ ] **Complete Removal (if "Remove all data" selected)**
  - `C:\Program Files\StudentManagementSystem\` removed
  - Desktop backup folder exists (if backup created)
  - Docker volume removed (if selected)

- [ ] **Docker Cleanup Verification**
  - Standard: SMS containers/images removed only
  - Deep: All SMS Docker resources removed (images, cache, networks)

### Reinstallation Tests

- [ ] **Reinstall After Uninstall (Keep Data)**
  - Run installer again
  - Installation completes successfully
  - Application starts
  - Previous data preserved (students, courses, etc.)
  - Admin login works with PREVIOUS password (not default)

- [ ] **Reinstall After Full Removal**
  - Run installer again
  - Installation completes successfully
  - Application starts with fresh database
  - Admin login works with DEFAULT password

---

## 📦 Distribution Package Verification

### Package Contents

Extract `SMS_Distribution_1.8.6.3.zip` and verify:

```text
SMS_Distribution_1.8.6.3/
├── SMS_Installer_1.8.6.3.exe      ✓ ~2-3 MB
├── SMS_Uninstaller_1.8.6.3.exe    ✓ ~2-3 MB
├── README.txt                      ✓ Distribution instructions
├── README.md                       ✓ Full README
├── LICENSE                         ✓ MIT License
├── CHANGELOG.md                    ✓ Version history
└── INSTALLATION_GUIDE.md           ✓ Detailed guide
```

### README.txt Verification

- [ ] Quick installation instructions
- [ ] System requirements
- [ ] Default credentials
- [ ] Access URL
- [ ] Support links

---

## 🔒 Code Signing (Optional but Recommended)

### Why Sign?

- ✅ Removes Windows SmartScreen warnings
- ✅ Builds user trust
- ✅ Verifies publisher authenticity

### Signing Process

**Option 1: Commercial Certificate**

```powershell
# Purchase code signing certificate from:
# - DigiCert: https://www.digicert.com/code-signing/
# - Sectigo: https://www.sectigo.com/ssl-certificates-tls/code-signing
# Cost: ~$100-500/year

# Import certificate to Windows Certificate Store
# (PFX file with password)

# Sign executables
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object {$_.Subject -like "*YourCompany*"}

Set-AuthenticodeSignature -FilePath ".\dist\SMS_Installer_1.8.6.3.exe" `
    -Certificate $cert `
    -TimestampServer "http://timestamp.digicert.com"

Set-AuthenticodeSignature -FilePath ".\dist\SMS_Uninstaller_1.8.6.3.exe" `
    -Certificate $cert `
    -TimestampServer "http://timestamp.digicert.com"

# Verify signature
Get-AuthenticodeSignature ".\dist\SMS_Installer_1.8.6.3.exe"
# Status: Valid
# SignerCertificate: CN=YourCompany
```

**Option 2: Self-Signed Certificate (Testing Only)**

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
    -Subject "CN=SMS Development" `
    -CertStoreLocation Cert:\CurrentUser\My `
    -NotAfter (Get-Date).AddYears(5)

# Sign executable
Set-AuthenticodeSignature -FilePath ".\dist\SMS_Installer_1.8.6.3.exe" `
    -Certificate $cert

# Note: Self-signed certificates still trigger SmartScreen
# Only useful for internal testing/distribution
```

### Post-Signing Verification

- [ ] `Get-AuthenticodeSignature` shows "Valid"
- [ ] Signer certificate matches your organization
- [ ] Timestamp present (ensures signature valid after cert expires)
- [ ] Test on Windows 10/11: No SmartScreen warning

---

## 📤 GitHub Release

### Create Release Tag

```powershell
# Tag the release
git tag -a v1.8.6.3 -m "Release v1.8.6.3 - Windows GUI Installer"
git push origin v1.8.6.3
```

### Create GitHub Release

1. **Go to GitHub Repository**
   - https://github.com/bs1gr/AUT_MIEEK_SMS/releases

2. **Click "Draft a new release"**

3. **Fill Release Information**
   - **Tag:** `v1.8.6.3`
   - **Release Title:** `v1.8.6.3 - Windows GUI Installer with Deep Docker Cleanup`
   - **Description:** (See template below)

4. **Upload Assets**
   - `SMS_Distribution_1.8.6.3.zip` (primary distribution)
   - `SMS_Installer_1.8.6.3.exe` (direct installer)
   - `SMS_Uninstaller_1.8.6.3.exe` (direct uninstaller)
   - `SMS_Setup_1.8.6.3.exe` (if using Inno Setup)

5. **Publish Release**

### Release Description Template

```markdown
# Student Management System v1.8.6.3

## 🎉 What's New

### Windows GUI Installation Wizard

**Professional installer with visual wizard interface!**

- ✅ **One-click installation** - No PowerShell knowledge required
- ✅ **Automatic Docker setup** - Downloads and installs Docker Desktop
- ✅ **GUI Uninstaller** - Safe removal with backup options
- ✅ **Deep Docker cleanup** - Advanced troubleshooting for Docker cache issues
- ✅ **Real-time progress** - Visual feedback during installation
- ✅ **Error handling** - Comprehensive validation and rollback

### Installation Methods

#### Option 1: GUI Installer (Easiest - NEW!)

1. Download `SMS_Distribution_1.8.6.3.zip`
2. Extract and run `SMS_Installer_1.8.6.3.exe` as Administrator
3. Follow the visual wizard (~10-15 minutes)

**📖 Guide:** [docs/WINDOWS_INSTALLER_WIZARD_GUIDE.md](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/WINDOWS_INSTALLER_WIZARD_GUIDE.md)

#### Option 2: PowerShell Script

```powershell
.\DOCKER.ps1 -Install  # First-time automated installation
.\DOCKER.ps1 -Start    # Start application
```

**📖 Guide:** [DEPLOY_ON_NEW_PC.md](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/DEPLOY_ON_NEW_PC.md)

### Deep Docker Cleanup

Use the consolidated Docker script for cleanup operations:

```powershell
.\DOCKER.ps1 -Prune      # Safe cleanup (keeps data)
.\DOCKER.ps1 -DeepClean  # Nuclear option (removes data)
```

**📖 Guide:** [DOCKER_CLEANUP_GUIDE.md](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/DOCKER_CLEANUP_GUIDE.md)

## 📦 Downloads

| File | Size | Description |
|------|------|-------------|
| [SMS_Distribution_1.8.6.3.zip](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/download/v1.8.6.3/SMS_Distribution_1.8.6.3.zip) | ~50 MB | **Complete package** (installer + uninstaller + docs) |
| [SMS_Installer_1.8.6.3.exe](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/download/v1.8.6.3/SMS_Installer_1.8.6.3.exe) | ~2 MB | GUI installer only |
| [SMS_Uninstaller_1.8.6.3.exe](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/download/v1.8.6.3/SMS_Uninstaller_1.8.6.3.exe) | ~2 MB | GUI uninstaller only |

## 🎯 System Requirements

- Windows 10/11 (64-bit)
- Docker Desktop 20.10.0+ (installer can download automatically)
- 4 GB RAM (8 GB recommended)
- 10 GB free disk space
- Internet connection (first-time setup)

## 🔐 Default Credentials

After installation:
- **URL:** http://localhost:8080
- **Email:** admin@example.com
- **Password:** YourSecurePassword123!

⚠️ **Change password immediately after first login!**

## 🐛 Bug Fixes

- Fixed Docker cache issues from old installations
- Improved error handling in prerequisites check
- Enhanced backup preservation logic
- Resolved port conflict detection

## 📚 Documentation

- [Windows Installer Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/WINDOWS_INSTALLER_WIZARD_GUIDE.md)
- [Docker Cleanup Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/DOCKER_CLEANUP_GUIDE.md)
- [Quick Start Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/QUICK_START_GUIDE.md)
- [Full README](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/README.md)

## 🆘 Support

- **Issues:** https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- **Discussions:** https://github.com/bs1gr/AUT_MIEEK_SMS/discussions
- **Documentation:** https://github.com/bs1gr/AUT_MIEEK_SMS/tree/main/docs

## 📜 Changelog

See [CHANGELOG.md](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md) for full version history.

---

**Full Changelog:** [v1.8.6.2...v1.8.6.3](https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.8.6.2...v1.8.6.3)
```

---

## ✅ Final Checks

### Before Publishing

- [ ] All tests passed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers consistent everywhere
- [ ] Executables signed (if applicable)
- [ ] Distribution ZIP created
- [ ] GitHub release drafted

### After Publishing

- [ ] Test download links work
- [ ] GitHub release page looks correct
- [ ] Social media announcement (if applicable)
- [ ] Update project website/wiki
- [ ] Close related GitHub issues
- [ ] Monitor for bug reports

### Announce Release

**Channels:**
- GitHub Discussions (Announcements category)
- Project README.md (update "Latest Release" badge)
- Documentation site (if any)
- Social media (Twitter, LinkedIn, etc.)
- Email to known users (if applicable)

**Announcement Template:**
```text
🎉 Student Management System v1.8.6.3 Released!

NEW: Windows GUI Installer - Professional installation wizard with visual progress tracking!

✅ One-click installation
✅ Automatic Docker setup
✅ GUI Uninstaller with backup options
✅ Deep Docker cleanup for troubleshooting

Download: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.6.3

Full guide: https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/WINDOWS_INSTALLER_WIZARD_GUIDE.md
```

---

## 🔄 Post-Release Monitoring

### Week 1

- [ ] Monitor GitHub Issues for installation problems
- [ ] Check Discussions for questions
- [ ] Gather user feedback
- [ ] Document common issues
- [ ] Prepare hotfix if critical bugs found

### Week 2-4

- [ ] Analyze installation success rate
- [ ] Collect feature requests
- [ ] Plan next release
- [ ] Update documentation based on feedback

---

**Last Updated:** 2025-01-XX | **Checklist Version:** 1.0.0
