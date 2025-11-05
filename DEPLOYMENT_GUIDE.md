# Student Management System - Deployment Guide for Windows

This guide explains how to deploy the Student Management System
to other Windows computers with minimal effort.

> **Important**
> Production and release deployments now run exclusively inside the Docker
> full-stack container. Native execution is reserved for local development and
> will be blocked when `SMS_ENV=production`.

## Table of Contents

1. [Quick Deployment Methods](#quick-deployment-methods)
2. [Prerequisites](#prerequisites)
3. [Method 1: One-Click Installer](#method-1-one-click-installer-recommended)
4. [Method 2: Offline Deployment Package](#method-2-offline-deployment-package)
5. [Method 3: Manual Installation](#method-3-manual-installation)
6. [Troubleshooting](#troubleshooting)
7. [Network Deployment](#network-deployment)

---

## Quick Deployment Methods

### For Computers with Internet Access

**Easiest**: Use the one-click installer

```powershell
.\INSTALLER.bat
```

### For Computers without Internet (Air-gapped)

1. Create deployment package on a computer with internet
2. Copy package to target computer (USB/network share)
3. Run installer from the package

---

## Prerequisites

The application can run in two modes:

### Docker Mode (Release & Recommended)

- **Usage**: Mandatory for production and release deployments
  (`SMS_ENV=production`).
- **Pros**: Easiest setup, no Python/Node.js needed, consistent environment.
- **Cons**: Requires Docker Desktop (~500MB download).
- **Requirements**:
  - Windows 10/11 (64-bit)
  - Docker Desktop
  - 4 GB RAM
  - 10 GB free disk space

### Native Mode (Development Only)

- **Usage**: Local development and debugging (`SMS_ENV=development`). Blocked
  automatically when `SMS_ENV=production`.
- **Pros**: Hot reload, direct debugging, lighter weight.
- **Cons**: Requires Python and Node.js installation.
- **Requirements**:
  - Windows 10/11 (64-bit)
  - Python 3.11+
  - Node.js 18+
  - 2 GB RAM
  - 5 GB free disk space

### Environment Awareness

- Set `SMS_ENV=production` to signal release/Docker execution. Native helpers and
  the backend will refuse to start outside Docker in this mode.
- Leave `SMS_ENV` unset (or set to `development`) for local development. The
  helper scripts automatically apply these defaults.
- Additional marker: `SMS_EXECUTION_MODE` is set to `docker` or `native` by the
  helper scripts for clarity when debugging.

---

## Method 1: One-Click Installer (Recommended)

### For Online Deployment

**Step 1**: Get the application code

- Clone the repository, or
- Download and extract the ZIP from GitHub, or
- Copy the project folder to the target computer

**Step 2**: Run the installer

- Double-click: `INSTALLER.bat`
- Or in PowerShell: `.\INSTALLER.ps1`

**Step 3**: Follow the prompts
The installer will:

- Check system prerequisites
- Detect if Docker is available
- Offer to guide you through installing missing components
- Set up the application
- Start the system automatically

**Step 4**: Access the application

- Frontend: <http://localhost:8080>
- API Docs: <http://localhost:8000/docs>

### What the Installer Does

1. **System Check**: Verifies Windows version, RAM, disk space
2. **Prerequisites**: Checks for Docker/Python/Node.js
3. **Installation Assistance**:
   - Opens download pages for missing software
   - Provides step-by-step instructions
   - Detects when to restart
4. **Environment Setup**:
   - Docker: Builds the container image
   - Native: Installs Python and Node.js dependencies
5. **Port Verification**: Ensures required ports (8080, 8000, 5173) are available
6. **Application Launch**: Starts the system and opens browser

### Installer Options

```powershell
# Interactive installation (default)
.\INSTALLER.ps1

# Docker-only mode
.\INSTALLER.ps1 -DockerOnly

# Native-only mode (Python + Node.js)
.\INSTALLER.ps1 -NativeOnly

# Install but don't start
.\INSTALLER.ps1 -NoStart

# Show help
.\INSTALLER.ps1 -Help
```

---

## Method 2: Offline Deployment Package

Perfect for air-gapped environments or deploying to multiple computers.

### Creating the Deployment Package

**On a computer with internet access**:

```powershell
# Basic package (application code only)
.\CREATE_DEPLOYMENT_PACKAGE.ps1

# Include Docker image (recommended for offline)
.\CREATE_DEPLOYMENT_PACKAGE.ps1 -IncludeDockerImage

# Create compressed ZIP file
.\CREATE_DEPLOYMENT_PACKAGE.ps1 -IncludeDockerImage -CompressPackage
```

**Package contents**:

- All application source code
- Installation scripts
- Documentation
- Docker image (if included)

**Package size**:

- Without Docker image: ~50 MB
- With Docker image: ~500-800 MB

### Deploying the Package

**Step 1**: Transfer the package

- Copy `deployment-package` folder to target computer, or
- Copy `deployment-package.zip` and extract it

**Step 2**: Load Docker image (if included)

- Double-click: `LOAD_DOCKER_IMAGE.bat`
- Or: `docker load -i docker-image-sms-fullstack.tar`

**Step 3**: Run the installer

- Double-click: `INSTALLER.bat`
- The installer will detect the pre-loaded Docker image

**Step 4**: Start the application

- The installer will start it automatically, or
- Run `.\scripts\deploy\run-docker-release.ps1`

### Deployment Package Options

```powershell
# Custom output location
.\CREATE_DEPLOYMENT_PACKAGE.ps1 -OutputPath "C:\Temp\sms-package"

# Include Docker image
.\CREATE_DEPLOYMENT_PACKAGE.ps1 -IncludeDockerImage

# Compress to ZIP
.\CREATE_DEPLOYMENT_PACKAGE.ps1 -CompressPackage

# Full offline package
.\CREATE_DEPLOYMENT_PACKAGE.ps1 -IncludeDockerImage -CompressPackage `
  -OutputPath ".\sms-offline-installer"
```

---

## Method 3: Manual Installation

If you prefer manual control or the automated installers don't work.

### Docker Mode

**Step 1**: Install Docker Desktop

- Download: <https://www.docker.com/products/docker-desktop/>
- Install and start Docker Desktop
- Switch to Linux containers (right-click tray icon)

**Step 2**: Build the image

```powershell
.\scripts\SETUP.ps1
```

**Step 3**: Start the application

```powershell
.\scripts\deploy\run-docker-release.ps1
```

This helper automatically applies the production Compose overlay so container
resource limits and restart policies stay in effect. To start the stack
manually, run:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> Legacy shortcut: `.\QUICKSTART.bat` remains available for development scenarios,
> but production should always use the full-stack helper above.

### Native Mode

**Step 1**: Install prerequisites

**Python 3.11+**:

- Download: <https://www.python.org/downloads/>
- **Important**: Check "Add Python to PATH" during installation

**Node.js 18+**:

- Download: <https://nodejs.org/>
- Install the LTS version

**Step 2**: Install backend dependencies

```powershell
cd backend
pip install -r requirements.txt
```

**Step 3**: Install frontend dependencies

```powershell
cd frontend
npm install
```

**Step 4**: Start the application

```powershell
# From project root (PowerShell)
.\scripts\dev\run-native.ps1
```

Or start services separately:

**Terminal 1** (Backend):

```powershell
cd backend
pwsh -NoProfile -Command "
  `$env:SMS_ENV='development'
  python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
"
```

**Terminal 2** (Frontend):

```powershell
cd frontend
npm run dev
```

---

## Troubleshooting

### Common Issues

#### "Docker Desktop is not installed"

- **Solution**: Download and install Docker Desktop from the link provided by
  the installer
- **Alternative**: Use native mode with `-NativeOnly` flag

#### "Port 8080 is already in use"

- **Solution 1**: Stop other applications using that port
- **Solution 2**: Run diagnostics: `.\SMS.ps1` → Diagnostics → Check
  Port Conflicts
- **Solution 3**: Change the port (advanced users)

#### "Docker Desktop is installed but not running"

- **Solution**: Start Docker Desktop manually from Start Menu
- Wait 1-2 minutes for engine to start
- Re-run the installer

#### Python/Node.js not found after installation

- **Solution**: Restart PowerShell/Terminal after installing
- Verify installation: `python --version` and `node --version`
- If still not found, manually add to PATH

#### Installation fails with "Access Denied"

- **Solution**: Run PowerShell as Administrator
- Right-click PowerShell → "Run as Administrator"
- Run the installer again

### Diagnostic Tools

**Check system status**:

```powershell
.\SMS.ps1 -Status
```

**Full diagnostics**:

```powershell
.\scripts\internal\DIAGNOSE_STATE.ps1
```

**Check Docker status**:

```powershell
docker version
docker ps
```

**Check Python/Node.js**:

```powershell
python --version
node --version
npm --version
```

### Getting Help

1. **Documentation**: Check `README.md` and files in `docs/` folder
2. **Control Panel**: <http://localhost:8080/control> (when app is running)
3. **Management Interface**: `.\SMS.ps1` - interactive menu with diagnostics
4. **Logs**:
   - Docker: `docker logs sms-fullstack`
   - Native: Check `backend/logs/` directory

---

## Network Deployment

### Deploying to Multiple Computers

#### Option 1: Network Share

**Setup**:

1. Create deployment package on one computer
2. Place package on network share
3. Create deployment script for each computer

**Deploy script** (`deploy.ps1`):

```powershell
# Copy from network share
$source = "\\server\share\sms-deployment-package"
$dest = "C:\SMS"

Copy-Item -Path $source -Destination $dest -Recurse -Force
Set-Location $dest

# Run installer
.\INSTALLER.bat
```

#### Option 2: Remote Installation

**Using PowerShell Remoting**:

```powershell
# Enable remoting on target (run as admin on target)
Enable-PSRemoting -Force

# From source computer
$computers = @("Computer1", "Computer2", "Computer3")
$packagePath = "\\server\share\sms-package"

foreach ($computer in $computers) {
    Invoke-Command -ComputerName $computer -ScriptBlock {
        param($source)

        $dest = "C:\SMS"
        Copy-Item -Path $source -Destination $dest -Recurse -Force
        Set-Location $dest

        # Run installation
        & ".\INSTALLER.ps1" -DockerOnly -NoStart
    } -ArgumentList $packagePath
}
```

#### Option 3: Group Policy Deployment (Domain environments)

1. Create MSI package (advanced) or startup script
2. Deploy via GPO to target computers
3. Application installs on next startup/login

### Centralized Management

After deployment, use the management interface on each computer:

```powershell
.\SMS.ps1
```

Or remotely:

```powershell
Invoke-Command -ComputerName "RemotePC" -ScriptBlock {
    Set-Location "C:\SMS"
    & ".\SMS.ps1" -Quick
}
```

---

## Post-Deployment

### Verify Installation

**Check services are running**:

```powershell
.\SMS.ps1 -Status
```

**Test application access**:

- Open browser to <http://localhost:8080>
- Check API docs at <http://localhost:8000/docs>

### Daily Operations

**Start application**:

```powershell
.\QUICKSTART.bat
```

**Stop application**:

```powershell
.\scripts\STOP.ps1
```

**Manage application**:

```powershell
.\SMS.ps1
```

### Backup and Maintenance

**Create backup**:

```powershell
.\SMS.ps1
# Select: Database → Backup Database
```

**Restore backup**:

```powershell
.\SMS.ps1
# Select: Database → Restore Database
```

### Updating the Application

1. **Backup data first** (see above)
2. Stop the application: `.\scripts\STOP.ps1`
3. Replace files with new version
4. Restart: `.\QUICKSTART.bat`

---

## Security Considerations

### For Production Deployment

1. **Change default ports** if exposed to network
2. **Enable authentication** (configure in `backend/config.py`)
3. **Use HTTPS** with reverse proxy (NGINX/IIS)
4. **Regular backups** of database
5. **Firewall rules** to restrict access
6. **Update regularly** for security patches

### Network Access

**Internal network only** (default):

- Application accessible only from localhost
- Safe for development and single-user scenarios

**Network-wide access**:

- Requires configuration changes
- See `docs/QNAP.md` for deployment examples
- Consider security implications

---

## Uninstallation

### Using the Uninstaller (Recommended)

The project includes automated uninstaller scripts:

```powershell
# Interactive uninstall with prompts
.\UNINSTALL.ps1

# Keep database and logs (remove only app files)
.\UNINSTALL.ps1 -KeepData

# Force uninstall without confirmation
.\UNINSTALL.ps1 -Force

# Backup before uninstalling
.\UNINSTALL.ps1 -BackupFirst
```

The uninstaller will:

- Auto-detect Docker or Native deployment mode
- Stop all running services and containers
- Remove Docker images and volumes (Docker mode)
- Clean up caches and build artifacts
- Optionally preserve or delete database and logs

### Manual Uninstallation

#### Docker Mode (Manual)

```powershell
# Stop and remove container
docker stop sms-fullstack
docker rm sms-fullstack

# Remove image
docker rmi sms-fullstack

# Remove data volume (CAUTION: deletes database)
docker volume rm sms_data
```

#### Native Mode (Manual)

```powershell
# Stop processes
.\SMS.ps1 -Stop

# Remove application directory (include database if desired)
Remove-Item -Path "C:\SMS" -Recurse -Force
```

---

## Support

### Resources

- **README.md**: Main documentation (English)
- **ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md**: User guide (Greek)
- **docs/**: Technical documentation
- **In-app Help**: Utils → Help Documentation

### Troubleshooting Steps

1. Check README.md and this guide
2. Run diagnostics: `.\scripts\internal\DIAGNOSE_STATE.ps1`
3. Check logs (Docker/native)
4. Review error messages carefully
5. Try the alternative mode (Docker ↔ Native)

---

## Quick Reference

| Task | Command |
|------|---------|
| Install (online) | `.\INSTALLER.bat` |
| Install (Docker only) | `.\INSTALLER.ps1 -DockerOnly` |
| Install (Native only) | `.\INSTALLER.ps1 -NativeOnly` |
| Create deployment package | `.\CREATE_DEPLOYMENT_PACKAGE.ps1` |
| Start application | `.\QUICKSTART.bat` |
| Stop application | `.\scripts\STOP.ps1` |
| Manage application | `.\SMS.ps1` |
| Check status | `.\SMS.ps1 -Status` |
| Run diagnostics | `.\scripts\internal\DIAGNOSE_STATE.ps1` |
| Backup database | `.\SMS.ps1` → Database → Backup |
| View logs (Docker) | `docker logs sms-fullstack` |
| Access frontend | <http://localhost:8080> |
| Access API docs | <http://localhost:8000/docs> |

---

**Last Updated**: 2025-10-29
**Version**: 1.1+
