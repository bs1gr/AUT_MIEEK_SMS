<#
.SYNOPSIS
    Builds the SMS distribution package and installer.

.DESCRIPTION
    Creates:
    1. SMS_Distribution_{version}.zip - Portable distribution archive
    2. SMS_Installer_{version}.exe - Windows installer (requires Inno Setup)

.PARAMETER ZipOnly
    Only create the ZIP distribution, skip installer build.

.PARAMETER InstallerOnly
    Only build the installer (assumes ZIP exists).

.PARAMETER Clean
    Remove previous build artifacts before building.

.PARAMETER NoZip
    Skip creating the ZIP file.

.EXAMPLE
    .\BUILD_DISTRIBUTION.ps1
    Creates both ZIP and installer.

.EXAMPLE
    .\BUILD_DISTRIBUTION.ps1 -ZipOnly
    Creates only the ZIP distribution.

.EXAMPLE
    .\BUILD_DISTRIBUTION.ps1 -Clean
    Cleans previous builds and creates fresh distribution.
#>

[CmdletBinding()]
param(
    [switch]$ZipOnly,
    [switch]$InstallerOnly,
    [switch]$Clean,
    [switch]$NoZip
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ============================================================================
# Configuration
# ============================================================================

$ProjectRoot = $PSScriptRoot
$Version = (Get-Content "$ProjectRoot\VERSION" -Raw).Trim()
$DistDir = "$ProjectRoot\dist"
$TempDir = "$ProjectRoot\dist\temp_build"
$ZipName = "SMS_Distribution_$Version.zip"
$InstallerName = "SMS_Installer_$Version.exe"

# Inno Setup paths (common installation locations)
$InnoSetupPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

# Files and folders to include in distribution
$IncludeItems = @(
    "backend",
    "frontend", 
    "docker",
    "config",
    "scripts",
    "templates",
    "docs",
    "installer",
    "DOCKER.ps1",
    "NATIVE.ps1",
    "DOCKER_TOGGLE.ps1",
    "DOCKER_TOGGLE.vbs",
    "CREATE_DESKTOP_SHORTCUT.ps1",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "VERSION",
    "DEPLOYMENT_GUIDE.md",
    "DESKTOP_SHORTCUT_QUICK_START.md",
    "package.json"
)

# Patterns to exclude
$ExcludePatterns = @(
    "__pycache__",
    "*.pyc",
    "*.pyo",
    ".pytest_cache",
    "node_modules",
    "dist",
    ".git",
    ".vscode",
    "*.log",
    ".env",
    "*.db",
    "*.db-journal",
    "backups",
    "logs",
    "data",
    ".mypy_cache",
    ".ruff_cache",
    "htmlcov",
    ".coverage",
    "archive",
    "tmp_*",
    "*.bak"
)

# ============================================================================
# Functions
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "=" * 70 -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "=" * 70 -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host "  → $Text" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Text)
    Write-Host "  ⚠ $Text" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Text)
    Write-Host "  ✗ $Text" -ForegroundColor Red
}

function Find-InnoSetup {
    foreach ($path in $InnoSetupPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    return $null
}

function Remove-ExcludedItems {
    param([string]$Path)
    
    foreach ($pattern in $ExcludePatterns) {
        Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like $pattern } |
            ForEach-Object {
                Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
    }
}

function Copy-WithExclusions {
    param(
        [string]$Source,
        [string]$Destination
    )
    
    $item = Get-Item $Source
    
    # Check if excluded
    foreach ($pattern in $ExcludePatterns) {
        if ($item.Name -like $pattern) {
            return
        }
    }
    
    if ($item.PSIsContainer) {
        # Create directory
        $destPath = Join-Path $Destination $item.Name
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        
        # Copy contents
        Get-ChildItem $Source -Force | ForEach-Object {
            Copy-WithExclusions -Source $_.FullName -Destination $destPath
        }
    } else {
        # Copy file
        Copy-Item $Source -Destination $Destination -Force
    }
}

# ============================================================================
# Main Build Process
# ============================================================================

Write-Header "SMS Distribution Builder v$Version"

# Clean previous builds if requested
if ($Clean) {
    Write-Step "Cleaning previous build artifacts..."
    if (Test-Path $DistDir) {
        Remove-Item $DistDir -Recurse -Force
    }
}

# Create dist directory
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

# ============================================================================
# Build ZIP Distribution
# ============================================================================

if (-not $InstallerOnly -and -not $NoZip) {
    Write-Header "Building ZIP Distribution"
    
    # Clean temp directory
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    
    # Create SMS subdirectory
    $SmsDir = "$TempDir\SMS"
    New-Item -ItemType Directory -Path $SmsDir -Force | Out-Null
    
    Write-Step "Copying files..."
    foreach ($item in $IncludeItems) {
        $sourcePath = Join-Path $ProjectRoot $item
        if (Test-Path $sourcePath) {
            Write-Host "    Copying $item..." -ForegroundColor Gray
            Copy-WithExclusions -Source $sourcePath -Destination $SmsDir
        } else {
            Write-Warning "Skipping missing item: $item"
        }
    }
    
    Write-Step "Removing excluded patterns..."
    Remove-ExcludedItems -Path $SmsDir
    
    # Create data directory placeholder
    $dataDir = "$SmsDir\data"
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    "This directory stores the SQLite database." | Out-File "$dataDir\.gitkeep" -Encoding UTF8
    
    # Create logs directory placeholder
    $logsDir = "$SmsDir\logs"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    "This directory stores application logs." | Out-File "$logsDir\.gitkeep" -Encoding UTF8
    
    Write-Step "Creating ZIP archive..."
    $zipPath = Join-Path $DistDir $ZipName
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    Compress-Archive -Path "$SmsDir\*" -DestinationPath $zipPath -CompressionLevel Optimal
    
    # Clean up temp directory
    Remove-Item $TempDir -Recurse -Force
    
    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "  ✓ Created: $ZipName ($zipSize MB)" -ForegroundColor Green
}

# ============================================================================
# Build Installer
# ============================================================================

if (-not $ZipOnly) {
    Write-Header "Building Windows Installer"
    
    $InnoSetup = Find-InnoSetup
    
    if (-not $InnoSetup) {
        Write-Warning "Inno Setup 6 not found!"
        Write-Host ""
        Write-Host "  To build the installer, please install Inno Setup 6:" -ForegroundColor Yellow
        Write-Host "  https://jrsoftware.org/isdl.php" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  After installation, run this script again." -ForegroundColor Yellow
        
        if (-not $NoZip -and -not $InstallerOnly) {
            Write-Host ""
            Write-Host "  ZIP distribution was created successfully." -ForegroundColor Green
        }
    } else {
        Write-Step "Found Inno Setup: $InnoSetup"
        
        # Check for required wizard images
        $wizardImage = "$ProjectRoot\installer\wizard_image.bmp"
        $wizardSmall = "$ProjectRoot\installer\wizard_small.bmp"
        
        if (-not (Test-Path $wizardImage) -or -not (Test-Path $wizardSmall)) {
            Write-Step "Creating default wizard images..."
            
            # Create simple placeholder images using PowerShell
            # These are minimal valid BMP files
            & "$ProjectRoot\installer\create_wizard_images.ps1" -ErrorAction SilentlyContinue
            
            if (-not (Test-Path $wizardImage)) {
                Write-Warning "Wizard images not found. Using Inno Setup defaults."
            }
        }
        
        Write-Step "Compiling installer..."
        $issFile = "$ProjectRoot\installer\SMS_Installer.iss"
        
        # Run Inno Setup compiler
        $process = Start-Process -FilePath $InnoSetup -ArgumentList "`"$issFile`"" -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            $installerPath = Join-Path $DistDir $InstallerName
            if (Test-Path $installerPath) {
                $installerSize = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
                Write-Host ""
                Write-Host "  ✓ Created: $InstallerName ($installerSize MB)" -ForegroundColor Green
                
                # Sign the installer if certificate exists
                $certPath = "$ProjectRoot\installer\AUT_MIEEK_CodeSign.pfx"
                if (Test-Path $certPath) {
                    Write-Step "Signing installer..."
                    & "$ProjectRoot\installer\SIGN_INSTALLER.ps1" -InstallerPath $installerPath
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "  ✓ Installer signed successfully" -ForegroundColor Green
                    } else {
                        Write-Warning "Installer signing failed - continuing without signature"
                    }
                } else {
                    Write-Warning "Code signing certificate not found - installer will be unsigned"
                }
            }
        } else {
            Write-Error "Installer compilation failed (exit code: $($process.ExitCode))"
            Write-Host "  Check the Inno Setup log for details." -ForegroundColor Yellow
        }
    }
}

# ============================================================================
# Summary
# ============================================================================

Write-Header "Build Complete"

Write-Host ""
Write-Host "  Output directory: $DistDir" -ForegroundColor Cyan
Write-Host ""

$outputs = Get-ChildItem $DistDir -File 2>$null
if ($outputs) {
    Write-Host "  Created files:" -ForegroundColor Green
    foreach ($file in $outputs) {
        $size = [math]::Round($file.Length / 1MB, 2)
        Write-Host "    • $($file.Name) ($size MB)" -ForegroundColor White
    }
} else {
    Write-Host "  No distribution files created." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    1. Test the installer on a clean Windows machine" -ForegroundColor White
Write-Host "    2. Upload to GitHub Releases: gh release upload v$Version dist\*" -ForegroundColor White
Write-Host ""
