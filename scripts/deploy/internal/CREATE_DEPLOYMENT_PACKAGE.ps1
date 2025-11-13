<#
.SYNOPSIS
    Create a portable deployment package for offline installation

.DESCRIPTION
    Creates a self-contained package that can be copied to another Windows
    computer for installation without internet access.

    The package includes:
    - All application source code
    - Docker image (if available)
    - Installation scripts
    - Documentation

.PARAMETER OutputPath
    Where to create the deployment package (default: .\deployment-package)

.PARAMETER IncludeDockerImage
    Include the Docker image in the package (requires Docker)

.PARAMETER CompressPackage
    Create a ZIP file of the package

.EXAMPLE
    .\CREATE_DEPLOYMENT_PACKAGE.ps1
    Create a basic deployment package

.EXAMPLE
    .\CREATE_DEPLOYMENT_PACKAGE.ps1 -IncludeDockerImage -CompressPackage
    Create a full package with Docker image and compress it

.NOTES
    The resulting package can be copied to USB drives or shared via network
#>

param(
    [string]$OutputPath = ".\deployment-package",
    [switch]$IncludeDockerImage,
    [switch]$CompressPackage,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Banner {
    param($Text, $Color = 'Cyan')
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor $Color
    Write-Host "  $Text" -ForegroundColor $Color
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor $Color
    Write-Host ""
}

function Write-Step {
    param($Number, $Total, $Description)
    Write-Host ""
    Write-Host "[$Number/$Total] $Description" -ForegroundColor Yellow
}

function Write-Success { param($Text) Write-Host "  ✓ $Text" -ForegroundColor Green }
function Write-Warning2 { param($Text) Write-Host "  ⚠ $Text" -ForegroundColor Yellow }
function Write-Error2 { param($Text) Write-Host "  ✗ $Text" -ForegroundColor Red }
function Write-Info { param($Text) Write-Host "  ℹ $Text" -ForegroundColor Cyan }

function Get-DirectorySize {
    param([string]$Path)

    if (Test-Path $Path) {
        $size = (Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
                 Measure-Object -Property Length -Sum).Sum
        return [math]::Round($size / 1MB, 2)
    }
    return 0
}

function Copy-ProjectFiles {
    param(
        [string]$SourcePath,
        [string]$DestPath
    )

    Write-Info "Copying application files..."

    # Directories to copy
    $includeDirs = @(
        'backend',
        'frontend',
        'docker',
        'scripts',
        'docs',
        'tools',
        'templates'
    )

    # Files to copy
    $includeFiles = @(
        '*.ps1',
        '*.bat',
        '*.md',
        '*.yml',
        '*.yaml',
        '*.ini',
        '*.toml',
        'VERSION',
        'LICENSE'
    )

    # Create destination directory
    if (-not (Test-Path $DestPath)) {
        New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
    }

    # Copy directories
    foreach ($dir in $includeDirs) {
        $sourceDirPath = Join-Path $SourcePath $dir
        if (Test-Path $sourceDirPath) {
            $destDirPath = Join-Path $DestPath $dir
            Write-Host "    Copying $dir..." -ForegroundColor DarkGray

            Copy-Item -Path $sourceDirPath -Destination $destDirPath -Recurse -Force
            Write-Success "Copied $dir"
        }
    }

    # Copy root files
    foreach ($pattern in $includeFiles) {
        $files = Get-ChildItem -Path $SourcePath -Filter $pattern -File
        foreach ($file in $files) {
            Copy-Item -Path $file.FullName -Destination $DestPath -Force
        }
    }

    Write-Success "Application files copied"
}

function Export-DockerImage {
    param(
        [string]$ImageName,
        [string]$OutputPath
    )

    Write-Info "Exporting Docker image..."

    try {
        # Check if Docker is available
        $null = docker version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning2 "Docker is not available, skipping image export"
            return $false
        }

        # Check if image exists
        $imageExists = docker images -q $ImageName 2>$null
        if (-not $imageExists) {
            Write-Warning2 "Docker image '$ImageName' not found"
            Write-Info "Please build the image first with: .\scripts\SETUP.ps1"
            return $false
        }

        # Export image
        $tarFile = Join-Path $OutputPath "docker-image-$ImageName.tar"
        Write-Host "    This may take several minutes..." -ForegroundColor DarkGray

        docker save -o $tarFile $ImageName

        if ($LASTEXITCODE -eq 0 -and (Test-Path $tarFile)) {
            $sizeMB = [math]::Round((Get-Item $tarFile).Length / 1MB, 2)
            Write-Success "Docker image exported ($sizeMB MB)"
            return $true
        } else {
            Write-Error2 "Failed to export Docker image"
            return $false
        }
    } catch {
        Write-Warning2 "Error exporting Docker image: $_"
        return $false
    }
}

function Create-DeploymentReadme {
    param([string]$PackagePath)

    $readmeContent = @"
# Student Management System - Deployment Package

This package contains everything needed to install the Student Management System
on a Windows computer.

## Package Contents

- **Application Source Code**: All backend and frontend code
- **Installation Scripts**: Automated setup and startup scripts
- **Documentation**: Complete user and technical documentation
- **Docker Image** (if included): Pre-built Docker container

## Installation Instructions

### Option 1: One-Click Installation (Recommended)

1. **Copy this entire folder** to the target computer
2. **Double-click**: `INSTALLER.bat`
3. **Follow the prompts** - the installer will:
   - Check system prerequisites
   - Guide you through installing any missing components
   - Set up the application
   - Start the system automatically

### Option 2: Docker Mode (if Docker image is included)

1. **Install Docker Desktop** (if not already installed):
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop

2. **Load the Docker image**:
   ```powershell
   docker load -i docker-image-sms-fullstack.tar
   ```

3. **Run the setup**:
   ```powershell
   .\scripts\SETUP.ps1 -SkipBuild
   ```

4. **Start the application**:
   ```powershell
    pwsh -NoProfile -File .\RUN.ps1
   ```

### Option 3: Native Mode (Python + Node.js)

1. **Install prerequisites**:
   - Python 3.11+: https://www.python.org/downloads/
     ⚠ Make sure to check "Add Python to PATH"
   - Node.js 18+: https://nodejs.org/

2. **Run the installer**:
   ```powershell
   .\INSTALLER.ps1 -NativeOnly
   ```

## System Requirements

**Recommended (Docker Mode):**
- Windows 10/11 (64-bit)
- Docker Desktop
- 4 GB RAM
- 10 GB free disk space

**Alternative (Native Mode):**
- Windows 10/11 (64-bit)
- Python 3.11+
- Node.js 18+
- 2 GB RAM
- 5 GB free disk space

## Quick Start

After installation:

1. **Start**: `pwsh -NoProfile -File .\RUN.ps1`
2. **Access**: http://localhost:8080
3. **Stop**: `.\scripts\STOP.ps1`

## Accessing the Application

- **Frontend**: http://localhost:8080
- **API Documentation**: http://localhost:8000/docs
- **Control Panel**: http://localhost:8080/control

## Management

Use the management interface for all operations:

```powershell
.\SMS.ps1
```

Features:
- Start/Stop/Restart application
- System diagnostics
- Database backup and restore
- View logs
- Maintenance operations

## Troubleshooting

If you encounter issues:

1. **Check the documentation**:
   - English: `README.md`
   - Greek: `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md`

2. **Run diagnostics**:
   ```powershell
   .\scripts\internal\DIAGNOSE_STATE.ps1
   ```

3. **Check port availability**:
   - Required ports: 8080, 8000, 5173
   - Use `.\SMS.ps1` → Diagnostics

4. **View logs**:
   - Docker: `docker logs sms-fullstack`
   - Native: Check `backend\logs\` directory

## Support

For additional help:
- Check the documentation in the `docs\` folder
- Review `README.md` for detailed information
- Use the in-app Help section (Utils → Help)

## Version Information

Package created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Application version: $(if (Test-Path "VERSION") { Get-Content "VERSION" } else { "unknown" })

---

© 2024-2025 Student Management System
"@

    $readmePath = Join-Path $PackagePath "DEPLOYMENT_README.md"
    $readmeContent | Out-File -FilePath $readmePath -Encoding UTF8
    Write-Success "Created deployment README"
}

function Create-LoadDockerImageScript {
    param([string]$PackagePath)

    $scriptContent = @'
<#
.SYNOPSIS
    Load the included Docker image

.DESCRIPTION
    Loads the pre-built Docker image from this package into Docker Desktop
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Loading Docker Image" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
try {
    $null = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Docker is not running!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        Read-Host "Press ENTER to exit"
        exit 1
    }
} catch {
    Write-Host "✗ Docker is not available!" -ForegroundColor Red
    Read-Host "Press ENTER to exit"
    exit 1
}

# Find the Docker image tar file
$tarFile = Get-ChildItem -Path $PSScriptRoot -Filter "docker-image-*.tar" | Select-Object -First 1

if (-not $tarFile) {
    Write-Host "✗ Docker image file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "This package may not include a Docker image." -ForegroundColor Yellow
    Write-Host "Use the installer or build the image manually." -ForegroundColor Yellow
    Read-Host "Press ENTER to exit"
    exit 1
}

Write-Host "Found: $($tarFile.Name)" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($tarFile.Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Loading image into Docker..." -ForegroundColor Yellow
Write-Host "(This may take several minutes)" -ForegroundColor Gray
Write-Host ""

docker load -i $tarFile.FullName

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Docker image loaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: pwsh -NoProfile -File .\RUN.ps1" -ForegroundColor White
    Write-Host "  2. Access: http://localhost:8080" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "✗ Failed to load Docker image!" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press ENTER to exit"
'@

    $scriptPath = Join-Path $PackagePath "LOAD_DOCKER_IMAGE.ps1"
    $scriptContent | Out-File -FilePath $scriptPath -Encoding UTF8
    Write-Success "Created Docker image loader script"

    # Also create a batch wrapper
    $batContent = @'
@echo off
echo.
echo Loading Docker Image...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0LOAD_DOCKER_IMAGE.ps1"
pause
'@

    $batPath = Join-Path $PackagePath "LOAD_DOCKER_IMAGE.bat"
    $batContent | Out-File -FilePath $batPath -Encoding ASCII
}

# ============================================================================
# MAIN WORKFLOW
# ============================================================================

function Start-PackageCreation {
    Clear-Host

    Write-Banner "CREATE DEPLOYMENT PACKAGE" -Color Green

    Write-Host "  This tool creates a portable package for offline installation" -ForegroundColor Cyan
    Write-Host ""

    $startTime = Get-Date

    # Resolve paths
    $sourcePath = $PSScriptRoot
    $destPath = Join-Path $sourcePath $OutputPath

    # Clean up existing package
    if (Test-Path $destPath) {
        Write-Warning2 "Output directory already exists: $destPath"
        $response = Read-Host "  Delete and recreate? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Remove-Item -Path $destPath -Recurse -Force
            Write-Success "Removed existing package"
        } else {
            Write-Error2 "Package creation cancelled"
            return
        }
    }

    # Step 1: Copy application files
    Write-Step 1 4 "Copying application files"
    Copy-ProjectFiles -SourcePath $sourcePath -DestPath $destPath

    $appSize = Get-DirectorySize -Path $destPath
    Write-Info "Application size: $appSize MB"

    # Step 2: Export Docker image (if requested)
    if ($IncludeDockerImage) {
        Write-Step 2 4 "Exporting Docker image"
        $imageExported = Export-DockerImage -ImageName "sms-fullstack" -OutputPath $destPath

        if ($imageExported) {
            Create-LoadDockerImageScript -PackagePath $destPath
        }
    } else {
        Write-Step 2 4 "Skipping Docker image export"
        Write-Info "Use -IncludeDockerImage to include the Docker image"
    }

    # Step 3: Create documentation
    Write-Step 3 4 "Creating deployment documentation"
    Create-DeploymentReadme -PackagePath $destPath

    # Step 4: Compress (if requested)
    if ($CompressPackage) {
        Write-Step 4 4 "Compressing package"

        $zipPath = "$destPath.zip"
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }

        Write-Info "Creating ZIP archive..."
        Write-Host "    (This may take several minutes)" -ForegroundColor DarkGray

        Compress-Archive -Path $destPath -DestinationPath $zipPath -CompressionLevel Optimal

        if (Test-Path $zipPath) {
            $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
            Write-Success "Package compressed: $zipSize MB"
        }
    } else {
        Write-Step 4 4 "Skipping compression"
        Write-Info "Use -CompressPackage to create a ZIP file"
    }

    # Summary
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds

    Write-Banner "PACKAGE CREATED SUCCESSFULLY" -Color Green

    Write-Host "  Package location:" -ForegroundColor Cyan
    Write-Host "    $destPath" -ForegroundColor White
    Write-Host ""

    if ($CompressPackage -and (Test-Path "$destPath.zip")) {
        Write-Host "  ZIP archive:" -ForegroundColor Cyan
        Write-Host "    $destPath.zip" -ForegroundColor White
        Write-Host ""
    }

    $totalSize = Get-DirectorySize -Path $destPath
    Write-Host "  Package size: $totalSize MB" -ForegroundColor Cyan
    Write-Host "  Build time: $([math]::Round($duration, 2)) seconds" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "  Deployment instructions:" -ForegroundColor Yellow
    Write-Host "    1. Copy the package to target computer" -ForegroundColor Gray
    Write-Host "    2. Run INSTALLER.bat" -ForegroundColor Gray
    Write-Host "    3. Follow the prompts" -ForegroundColor Gray
    Write-Host ""

    Write-Host "  For detailed instructions, see:" -ForegroundColor Yellow
    Write-Host "    DEPLOYMENT_README.md (in the package)" -ForegroundColor Gray
    Write-Host ""
}

# ============================================================================
# ENTRY POINT
# ============================================================================

if ($Help) {
    Get-Help $PSCommandPath -Detailed
    exit 0
}

try {
    Start-PackageCreation
} catch {
    Write-Host ""
    Write-Error2 "Package creation failed:"
    Write-Host "  $_" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press ENTER to exit"
    exit 1
}
