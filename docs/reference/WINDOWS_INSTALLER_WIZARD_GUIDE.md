# Windows Installation Wizard - Complete Guide

## 📦 Overview

The Student Management System now provides **professional Windows installer executables** with GUI wizards for easy deployment. This eliminates the need for users to understand PowerShell, Docker, or command-line operations.

**What's Included:**
- ✅ **GUI Installation Wizard** - Step-by-step visual installation
- ✅ **GUI Uninstaller** - Safe removal with backup options
- ✅ **Executable Distribution** - Standalone .exe files (no script execution issues)
- ✅ **Automatic Prerequisites** - Downloads and installs Docker Desktop
- ✅ **Deep Docker Cleanup** - Advanced cleanup for problematic installations
- ✅ **Data Preservation** - Smart backup and retention options

---

## 🎯 For End Users

### Quick Installation (2 Steps!)

1. **Download the installer package**
   - Get `SMS_Distribution_1.8.7.zip` from GitHub Releases
   - Extract to any location (e.g., Desktop, Downloads)

2. **Run the installer**
   - Right-click `SMS_Installer_1.8.7.exe`
   - Select **"Run as Administrator"**
   - Follow the visual wizard (7 easy steps)

**That's it!** The application will be installed and started automatically.

### Installation Wizard Steps

#### Step 1: Welcome
- Overview of installation process
- Estimated time: 10-15 minutes

#### Step 2: License Agreement
- Review and accept MIT License
- Must accept to proceed

#### Step 3: System Requirements Check
- Automatic verification of:
  - Windows 10/11 (64-bit)
  - PowerShell 5.1+
  - Administrator privileges
  - 10 GB free disk space
  - 4 GB+ RAM
  - Docker Desktop status

#### Step 4: Docker Installation (if needed)
- **If Docker is already installed:** Skipped automatically
- **If Docker is missing:**
  - Option 1: Automatic download and installation
  - Option 2: Manual installation with instructions
  - ⚠️ Requires system restart after Docker installation
  - Run installer again after restart to complete setup

#### Step 5: Configuration
- **Installation Directory:** Default `C:\Program Files\StudentManagementSystem`
- **Application Port:** Default `8080` (customizable)
- **Administrator Account:**
  - Email: `admin@example.com` (customizable)
  - Password: `YourSecurePassword123!` (customizable)
  - ⚠️ Change password immediately after first login!

#### Step 6: Installation Progress
- Real-time log output with color-coded status
- Progress bar tracking
- Steps performed:
  1. Create installation directory
  2. Copy application files
  3. Generate secure environment configuration
  4. Verify Docker is ready
  5. Build Docker image (5-10 minutes)
  6. Start application container
  7. Verify application is responding

#### Step 7: Completion
- Access URL displayed: `http://localhost:8080`
- Default credentials shown
- Option to open browser automatically
- Management instructions provided

### Accessing the Application

**Web Interface:**
```text
http://localhost:8080
```

**Default Administrator Credentials:**
- Email: `admin@example.com`
- Password: `YourSecurePassword123!`

⚠️ **CRITICAL:** Change the default password immediately!

**Management:**
- Run `SMS.ps1` from installation directory for management menu
- Or use Start Menu shortcut: "Student Management System - Management"

---

## 🗑️ Uninstallation

### Safe Uninstall with Backup

1. **Launch Uninstaller**
   - Right-click `SMS_Uninstaller_1.8.6.3.exe`
   - Select **"Run as Administrator"**

2. **Choose Data Options (Step 2)**
   - ✅ **Keep my data (Recommended)**: Preserves database and backups
     - Use this if you plan to reinstall
     - Your data remains in installation directory
   - ❌ **Remove all data**: Complete removal
     - Use this for permanent uninstallation
     - All application data will be deleted

3. **Backup Creation (Step 2)**
   - ✅ **Create backup on Desktop (Recommended)**: Enabled by default
     - Creates `SMS_Backup_YYYYMMDD_HHMMSS` folder on Desktop
     - Contains:
       - Database (SQLite file)
       - Previous backups
       - Configuration files (.env)
   - Use this as extra safety measure before uninstall

4. **Docker Cleanup Options (Step 3)**
   - **Standard Cleanup (Recommended):**
     - Removes SMS containers and images only
     - Keeps Docker volumes (if "Keep data" selected)
     - Preserves Docker cache for future installations
     - **Use when:** Normal uninstallation
   
   - **Deep Docker Cleanup (Advanced):**
     - Removes ALL Docker cache from old SMS installations
     - Stops all SMS containers (current and previous versions)
     - Removes all SMS images (all versions/tags)
     - Prunes Docker builder cache
     - Cleans unused networks
     - Optionally removes Docker volumes (if "Remove data" selected)
     - **Use when:**
       - You had multiple previous SMS installations
       - Docker cache is causing conflicts
       - You want to start completely fresh
       - You're troubleshooting Docker issues

5. **Uninstallation Progress (Step 4)**
   - Real-time log with progress bar
   - Steps performed:
     1. Create backup (if requested)
     2. Stop Docker containers
     3. Remove containers
     4. Docker cleanup (standard or deep)
     5. Remove application files (preserving data if requested)

6. **Completion (Step 5)**
   - Summary of preserved data locations
   - Backup location on Desktop (if created)
   - Data location in installation directory (if kept)

### Uninstallation Scenarios

#### Scenario 1: Reinstalling Later (Recommended)
**Settings:**
- ✅ Keep my data: YES
- ✅ Create backup on Desktop: YES
- Cleanup: Standard

**Result:**
- Application files removed
- Data and backups preserved in `C:\Program Files\StudentManagementSystem\data`
- Extra backup on Desktop: `Desktop\SMS_Backup_YYYYMMDD_HHMMSS`
- Docker volumes preserved
- Can reinstall without losing data

#### Scenario 2: Permanent Removal
**Settings:**
- ❌ Keep my data: NO
- ✅ Create backup on Desktop: YES (recommended for safety)
- Cleanup: Standard or Deep

**Result:**
- All application files removed
- All data deleted
- Backup on Desktop only
- Docker volumes removed
- Clean system

#### Scenario 3: Troubleshooting Docker Issues
**Settings:**
- ✅ Keep my data: YES (preserve database)
- ✅ Create backup on Desktop: YES
- Cleanup: **Deep Docker Cleanup**

**Result:**
- Application files removed
- Data preserved
- ALL Docker cache removed (nuclear option)
- Fresh Docker state for reinstallation
- Use when standard uninstall doesn't resolve Docker problems

---

## 🔧 For System Administrators

### Deployment Options

#### Option 1: Executable Distribution (Easiest)
**Use case:** Deploying to non-technical users

1. Build executable installer:
   ```powershell
   cd tools\installer
   .\BUILD_SIMPLE.ps1
   ```

2. Distribute `SMS_Distribution_Package_v1.8.6.3.zip` to users

3. Users extract and run `SMS_Installer_1.8.6.3.exe` as Administrator

**Advantages:**
- No PowerShell execution policy issues
- Professional GUI interface
- Self-contained executable
- Windows SmartScreen-friendly (can be code-signed)

#### Option 2: PowerShell Scripts (Flexibility)
**Use case:** IT departments with GPO/SCCM deployment

1. Distribute source code to target machines

2. Run installation script:
   ```powershell
   cd d:\SMS\student-management-system
   .\INSTALL.ps1
   ```

**Advantages:**
- Scriptable/automatable
- Can customize installation parameters
- Easier debugging (source code visible)

#### Option 3: Inno Setup MSI Installer
**Use case:** Enterprise deployment with MSI requirements

1. Build MSI installer:
   ```powershell
   cd tools\installer
   .\BUILD_INSTALLER_EXECUTABLE.ps1 -Method InnoSetup
   ```

2. Deploy via Group Policy or SCCM

**Advantages:**
- Native Windows Installer format
- Silent installation support
- Uninstall from Control Panel
- Better for managed environments

### Silent Installation

**PowerShell Script Method:**
```powershell
# Not yet implemented in GUI wizard
# Use INSTALL.ps1 directly for automated deployment
.\INSTALL.ps1 -SkipDockerInstall
```

**MSI Method (Inno Setup):**
```cmd
SMS_Setup_1.8.6.3.exe /SILENT /SUPPRESSMSGBOXES /NORESTART
```

### Network Deployment

#### File Share Deployment
1. Copy installer package to network share:
   ```
   \\server\software\SMS_Distribution_1.8.6.3\
   ```

2. Users/IT run from share:
   ```powershell
   \\server\software\SMS_Distribution_1.8.6.3\SMS_Installer_1.8.6.3.exe
   ```

#### SCCM/Intune Deployment
**Package Configuration:**
- **Type:** Application
- **Installer:** `SMS_Setup_1.8.6.3.exe` (Inno Setup MSI)
- **Install Command:** `SMS_Setup_1.8.6.3.exe /SILENT /NORESTART`
- **Detection Method:** File exists: `C:\Program Files\StudentManagementSystem\VERSION`
- **Requirements:** Windows 10/11, 10 GB disk space

### Customization

#### Custom Installation Path
**PowerShell:**
```powershell
.\INSTALL.ps1 -InstallPath "D:\Applications\SMS"
```

**GUI Wizard:**
- Step 5: Browse to custom location

#### Custom Port
**PowerShell:**
Edit `.env` before installation:
```env
APP_PORT=9090
```

**GUI Wizard:**
- Step 5: Change port number

#### Custom Admin Credentials
**PowerShell:**
Edit `.env` before installation:
```env
DEFAULT_ADMIN_EMAIL=sysadmin@school.edu
DEFAULT_ADMIN_PASSWORD=MySecurePassword123!
```

**GUI Wizard:**
- Step 5: Configure administrator account

---

## 🏗️ For Developers

### Building the Installer

#### Prerequisites
- Windows 10/11 with PowerShell 5.1+
- Administrator privileges
- Internet connection (for PS2EXE download)

#### Build Process

**Step 1: Navigate to installer directory**
```powershell
cd d:\SMS\student-management-system\tools\installer
```

**Step 2: Build executable installer**
```powershell
# Simple build method (recommended - PS2EXE, free)
.\BUILD_SIMPLE.ps1

# Alternative: Advanced build with multiple packaging options
.\BUILD_INSTALLER_EXECUTABLE.ps1
```

**Step 3: Test installer**
```powershell
# Test on clean VM (recommended)
# - Windows 10/11 fresh install
# - No Docker Desktop installed
# - Run installer as Administrator
# - Verify all steps complete successfully
```

**Step 4: Distribute**
```powershell
# Output files in .\dist\
# - SMS_Installer_1.8.6.3.exe (installer executable)
# - SMS_Uninstaller_1.8.6.3.exe (uninstaller executable)
# - SMS_Distribution_Package_v1.8.6.3.zip (complete package with docs)
```

### Packaging Methods Comparison

| Method | Type | License | Size | Features |
|--------|------|---------|------|----------|
| **PS2EXE** | EXE | Free | ~2 MB | PowerShell→EXE, GUI support, Admin flag |
| **Inno Setup** | EXE/MSI | Free | ~5 MB | Professional installer, silent mode, uninstall |
| **Advanced Installer** | MSI | Commercial | ~10 MB | Enterprise features, MST files, prerequisites |

**Recommendation:** Use **PS2EXE** for quick distribution, **Inno Setup** for professional releases.

### Code Signing (Optional but Recommended)

**Why code sign?**
- Removes Windows SmartScreen warnings
- Builds user trust
- Identifies publisher authenticity

**How to sign:**

1. **Obtain code signing certificate**
   - Commercial CA (DigiCert, Sectigo, etc.)
   - Or use self-signed for testing

2. **Sign the executable**
   ```powershell
   # With commercial certificate
   $cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert
   Set-AuthenticodeSignature -FilePath ".\dist\SMS_Installer_1.8.6.3.exe" -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
   
   # Verify signature
   Get-AuthenticodeSignature ".\dist\SMS_Installer_1.8.6.3.exe"
   ```

3. **Distribute signed installer**
   - Users will see publisher name
   - No SmartScreen warning

### Modifying the Wizard

**Installer Wizard:** `tools\installer\SMS_INSTALLER_WIZARD.ps1`
**Uninstaller Wizard:** `tools\installer\SMS_UNINSTALLER_WIZARD.ps1`

**Architecture:**
- Windows Forms GUI (built-in, no dependencies)
- Page-based wizard navigation
- Progress tracking
- Real-time log output
- Error handling with rollback

**Adding a New Wizard Page:**

```powershell
# 1. Create page function
function New-MyCustomPage {
    $panel = New-WizardPanel -Name "MyCustomPage"
    
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "My Custom Page"
    $lblTitle.Location = New-Object System.Drawing.Point(20, 20)
    $lblTitle.Size = New-Object System.Drawing.Size(600, 30)
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    
    # Add controls...
    
    $panel.Controls.Add($lblTitle)
    return $panel
}

# 2. Add to wizard pages array
$Script:WizardPages = @(
    (New-WelcomePage),
    (New-LicensePage),
    (New-MyCustomPage),  # <-- Add here
    (New-PrerequisitesPage),
    # ... rest of pages
)

# 3. Handle navigation
function Move-ToNextStep {
    $currentPageName = $Script:WizardPages[$Script:CurrentPageIndex].Name
    
    switch ($currentPageName) {
        "MyCustomPage" {
            # Custom validation or processing
            if ($someCondition) {
                # Move to next page
            } else {
                # Show error, stay on page
                return
            }
        }
    }
    # ... rest of navigation logic
}
```

**Customizing Colors:**
```powershell
$Script:Colors = @{
    Primary      = [System.Drawing.Color]::FromArgb(0, 120, 212)  # Blue
    Error        = [System.Drawing.Color]::FromArgb(196, 43, 28)  # Red
    Success      = [System.Drawing.Color]::FromArgb(16, 124, 16)  # Green
    Warning      = [System.Drawing.Color]::FromArgb(255, 185, 0)  # Orange
    # Modify as needed...
}
```

---

## 🐛 Troubleshooting

### Installation Issues

#### "Administrator privileges required"
**Problem:** Installer won't start
**Solution:** Right-click installer → "Run as Administrator"

#### "Docker Desktop download failed"
**Problem:** Network error during Docker download
**Solution:**
1. Download Docker Desktop manually: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
2. Install Docker Desktop
3. Restart computer
4. Run installer again

#### "Port 8080 already in use"
**Problem:** Another application using port 8080
**Solution:**
- Option 1: Change port in Step 5 of wizard (e.g., use 8090)
- Option 2: Stop conflicting application:
  ```powershell
  # Find process using port 8080
  netstat -ano | findstr :8080
  # Kill process (replace PID)
  taskkill /PID <PID> /F
  ```

#### "Docker build failed"
**Problem:** Error during Docker image build
**Solution:**
1. Check Docker Desktop is running
2. Try deep Docker cleanup:
   ```powershell
   cd d:\SMS\student-management-system
   .\DEEP_DOCKER_CLEANUP.ps1
   ```
3. Run installer again

#### "Installation directory not empty"
**Problem:** Previous installation exists
**Solution:**
1. Run uninstaller first
2. Or manually remove directory:
   ```powershell
   Remove-Item "C:\Program Files\StudentManagementSystem" -Recurse -Force
   ```
3. Run installer again

### Uninstallation Issues

#### "Cannot remove directory - file in use"
**Problem:** Application or Docker still running
**Solution:**
1. Stop all SMS processes:
   ```powershell
   docker stop sms-fullstack
   docker rm sms-fullstack
   ```
2. Close any open SMS-related PowerShell windows
3. Run uninstaller again

#### "Docker volume removal failed"
**Problem:** Volume still in use or doesn't exist
**Solution:**
```powershell
# List SMS volumes
docker volume ls | findstr sms

# Force remove
docker volume rm sms_data --force

# If still fails, restart Docker Desktop
Restart-Service -Name "com.docker.service"
```

#### "Backup creation failed - insufficient disk space"
**Problem:** Not enough space on Desktop
**Solution:**
- Free up Desktop space (at least 500 MB)
- Or skip backup creation (not recommended)
- Or manually backup before uninstalling:
  ```powershell
  Copy-Item "C:\Program Files\StudentManagementSystem\data" -Destination "D:\Backups\SMS_Data" -Recurse
  ```

### Deep Docker Cleanup Issues

#### "Old containers won't stop"
**Problem:** Zombie containers from previous installations
**Solution:**
```powershell
# Nuclear option - restart Docker Desktop
Restart-Service -Name "com.docker.service"

# Then run deep cleanup
.\DEEP_DOCKER_CLEANUP.ps1

# If still fails, restart computer
```

#### "Builder cache prune fails"
**Problem:** Docker BuildKit issues
**Solution:**
```powershell
# Reset Docker to factory defaults
# Docker Desktop → Settings → Troubleshoot → Reset to factory defaults
# ⚠️ This removes ALL Docker data (not just SMS)

# Then run installer again
```

---

## 📋 Version History

### Version 1.0.0 (2025-01-XX)
**Initial Release:**
- ✅ GUI Installation Wizard with 7-step process
- ✅ GUI Uninstaller with data preservation options
- ✅ PS2EXE executable packaging (default)
- ✅ Inno Setup MSI installer support
- ✅ Deep Docker cleanup integration
- ✅ Automatic Docker Desktop installation
- ✅ Backup creation before uninstallation
- ✅ Real-time installation logs with progress tracking
- ✅ Comprehensive error handling and rollback

---

## 📚 Additional Resources

**Documentation:**
- Installation Guide: `INSTALLATION_GUIDE.md`
- Docker Cleanup Guide: `DOCKER_CLEANUP_GUIDE.md`
- Quick Start: `QUICK_START_GUIDE.md`
- Greek User Manual: `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md`

**Scripts:**
- Daily use: `RUN.ps1`
- Management: `SMS.ps1`
- Manual install: `INSTALL.ps1`
- Deep cleanup: `DEEP_DOCKER_CLEANUP.ps1`

**Support:**
- GitHub Issues: https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- GitHub Discussions: https://github.com/bs1gr/AUT_MIEEK_SMS/discussions

---

## 🤝 Contributing

To improve the installer:

1. Fork the repository
2. Modify `tools/installer/SMS_INSTALLER_WIZARD.ps1` or `SMS_UNINSTALLER_WIZARD.ps1`
3. Test thoroughly on clean Windows 10/11 VM
4. Submit pull request with description

**Testing Checklist:**
- [ ] Fresh Windows 10 installation
- [ ] Fresh Windows 11 installation
- [ ] No Docker Desktop installed scenario
- [ ] Docker Desktop already installed scenario
- [ ] Non-default installation path
- [ ] Non-default port
- [ ] Uninstall with "Keep data"
- [ ] Uninstall with "Remove all data"
- [ ] Uninstall with "Deep Docker cleanup"
- [ ] Reinstall after uninstall (data preserved)

---

**Last Updated:** 2025-01-XX | **Version:** 1.8.6.3 | **License:** MIT
