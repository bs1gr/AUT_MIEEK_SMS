# Deployment Checklist

Use this checklist to ensure successful deployment to other Windows computers.

## Pre-Deployment Preparation

### Source Computer (where you have the working application)

- [ ] Application is working correctly on your computer
- [ ] All tests pass
- [ ] Database has sample data (optional, for demo purposes)
- [ ] You have reviewed the deployment documentation

### Choose Deployment Method

- [ ] **Online Deployment**: Target computer has internet access
  - Simplest method
  - Run `INSTALLER.bat` on target computer
  
- [ ] **Offline Deployment**: Target computer is air-gapped or has no internet
  - Create deployment package first
  - Transfer via USB or network share

## Creating Offline Deployment Package (if needed)

On your source computer with internet:

- [ ] Run `CREATE_DEPLOYMENT_PACKAGE.bat`
- [ ] Choose option 3 (full package with Docker image)
- [ ] Wait for package creation (may take 5-10 minutes)
- [ ] Verify package created in `./deployment-package` folder
- [ ] Test the package size (should be 500-800 MB with Docker image)
- [ ] Copy package to USB drive or network share

## Target Computer Requirements

### Hardware

- [ ] Windows 10 or Windows 11 (64-bit)
- [ ] At least 4 GB RAM (8 GB recommended)
- [ ] At least 10 GB free disk space
- [ ] Network connection (for online deployment)

### Software

Check what's already installed:

- [ ] Docker Desktop (recommended) - check by running `docker --version`
- [ ] Python 3.11+ (alternative) - check by running `python --version`
- [ ] Node.js 18+ (alternative) - check by running `node --version`

**Note**: Installer will guide you through installing missing components

### Ports

Required ports should be available:

- [ ] Port 8080 (frontend)
- [ ] Port 8000 (backend API)
- [ ] Port 5173 (development server, if using native mode)

**Note**: Installer checks ports automatically

## Installation on Target Computer

### Online Installation

- [ ] Copy the entire application folder to target computer
  - Or clone from GitHub
  - Or extract from ZIP file
  
- [ ] Open PowerShell in the application folder
  - Right-click folder → "Open in Terminal" or "Open PowerShell here"
  
- [ ] Run the installer
  - Double-click `INSTALLER.bat`
  - Or run: `.\INSTALLER.ps1`
  
- [ ] Follow the interactive prompts
  - Installer checks prerequisites
  - Guides through missing installations
  - Sets up environment
  - Starts application

### Offline Installation

- [ ] Extract `deployment-package.zip` on target computer
  - Recommended location: `C:\SMS`
  
- [ ] Open PowerShell in the extracted folder
  
- [ ] Load Docker image (if package includes it)
  - Double-click `LOAD_DOCKER_IMAGE.bat`
  - Or run: `docker load -i docker-image-sms-fullstack.tar`
  
- [ ] Run the installer
  - Double-click `INSTALLER.bat`
  - Installer detects pre-loaded image
  
- [ ] Application starts automatically

## Post-Installation Verification

### Check Installation

- [ ] No error messages during installation
- [ ] Installer shows "Installation Complete" message
- [ ] Application started automatically

### Test Application Access

- [ ] Open browser to http://localhost:8080
- [ ] Frontend loads without errors
- [ ] Can navigate between pages
- [ ] API documentation accessible at http://localhost:8000/docs

### Test Basic Functionality

- [ ] Can create a test student
- [ ] Can create a test course
- [ ] Can view dashboard/analytics
- [ ] Language switcher works (English/Greek)

### Check Application Status

Run in PowerShell:

```powershell
.\SMS.ps1 -Status
```

Verify:
- [ ] Application mode shown (Docker or Native)
- [ ] Services are running
- [ ] No error messages

## Troubleshooting (if needed)

If installation fails:

- [ ] Check error messages carefully
- [ ] Run diagnostics: `.\scripts\internal\DIAGNOSE_STATE.ps1`
- [ ] Check logs:
  - Docker: `docker logs sms-fullstack`
  - Native: Check `backend/logs/` folder
- [ ] Verify ports are available
- [ ] Ensure Docker Desktop is running (Docker mode)
- [ ] Verify Python/Node.js in PATH (Native mode)
- [ ] Restart computer if you installed Docker/Python/Node.js
- [ ] Check DEPLOYMENT_GUIDE.md for detailed troubleshooting

## Daily Operations Checklist

After successful installation, users should know:

### Starting the Application

- [ ] Taught user to run `QUICKSTART.bat`
- [ ] Or use management interface: `SMS.ps1`
- [ ] Verified they can access URLs (bookmarked)

### Stopping the Application

- [ ] Taught user to run `.\scripts\STOP.ps1`
- [ ] Or use management interface: `SMS.ps1` → Stop

### Basic Maintenance

- [ ] Showed user how to backup database
  - Run `SMS.ps1` → Database → Backup
  
- [ ] Showed user how to view logs
  - Docker: `docker logs sms-fullstack`
  - Native: Check `backend/logs/` folder
  
- [ ] Showed user how to restart if needed
  - Run `SMS.ps1` → Restart

## Documentation Handoff

Ensure user has access to:

- [ ] **QUICK_DEPLOYMENT.md** - Quick reference
- [ ] **DEPLOYMENT_GUIDE.md** - Complete deployment guide
- [ ] **README.md** - Application documentation
- [ ] **ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md** - Greek user manual (if needed)
- [ ] In-app help: Utils → Help Documentation

## Support Information

Provide user with:

- [ ] Your contact information (for support)
- [ ] Link to GitHub repository (for updates)
- [ ] Location of documentation files
- [ ] Common commands reference:

```
Start:     .\QUICKSTART.bat
Stop:      .\scripts\STOP.ps1
Manage:    .\SMS.ps1
Status:    .\SMS.ps1 -Status
Diagnose:  .\scripts\internal\DIAGNOSE_STATE.ps1
```

## Multiple Computer Deployment

If deploying to multiple computers:

### Preparation

- [ ] Create one deployment package
- [ ] Test on one computer first
- [ ] Document any computer-specific settings
- [ ] Create deployment script for automation (optional)

### Per Computer

- [ ] Transfer package
- [ ] Run installer
- [ ] Verify installation
- [ ] Document computer name/location
- [ ] Provide user training

### Centralized Tracking

Keep a record:

- [ ] Computer name/location
- [ ] Installation date
- [ ] Installed version
- [ ] Installation mode (Docker/Native)
- [ ] User contact information
- [ ] Any issues encountered
- [ ] Resolution notes

## Final Checks

Before considering deployment complete:

- [ ] Application installed successfully
- [ ] All tests passed
- [ ] User can access application
- [ ] User knows how to start/stop
- [ ] User knows where to find help
- [ ] Documentation provided
- [ ] Support contact shared
- [ ] Backup procedure explained

## Quick Reference

### Essential Commands

```powershell
# Installation
.\INSTALLER.bat                              # Full installation

# Daily use
.\QUICKSTART.bat                             # Start application
.\scripts\STOP.ps1                           # Stop application
.\SMS.ps1                                    # Management menu

# Diagnostics
.\SMS.ps1 -Status                            # Check status
.\scripts\internal\DIAGNOSE_STATE.ps1        # Full diagnostics

# Maintenance
.\SMS.ps1                                    # Then choose Backup/Restore
```

### Access URLs

- Frontend: http://localhost:8080
- API Docs: http://localhost:8000/docs
- Control Panel: http://localhost:8080/control

---

## Notes

Use this space to document deployment-specific information:

**Computer Name**: ________________________________

**Installation Date**: ________________________________

**Installed Version**: ________________________________

**Installation Mode**: ☐ Docker  ☐ Native

**User Name**: ________________________________

**User Contact**: ________________________________

**Special Notes**:

_______________________________________________

_______________________________________________

_______________________________________________

---

**Deployment Completed By**: ________________________________

**Date**: ________________________________

**Signature**: ________________________________
