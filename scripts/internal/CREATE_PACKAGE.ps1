# Student Management System - Create Deployment Package
# This script creates a clean ZIP file ready for deployment

param(
    [string]$Version = "",
    [string]$OutputDir = "."
)

# Change to project root directory (parent of scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Creating Deployment Package" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Read version from VERSION file if not provided
if ([string]::IsNullOrEmpty($Version)) {
    if (Test-Path "VERSION") {
        $Version = (Get-Content "VERSION" -Raw).Trim()
        Write-Host "Version from VERSION file: v$Version" -ForegroundColor Cyan
    } else {
        $Version = "1.0.0"
        Write-Host "Warning: VERSION file not found, using default: v$Version" -ForegroundColor Yellow
    }
} else {
    Write-Host "Version specified: v$Version" -ForegroundColor Cyan
}

# Build output filename
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputPath = Join-Path $OutputDir "student-management-system-v$Version-$timestamp.zip"

Write-Host "Output: $OutputPath" -ForegroundColor Gray
Write-Host ""

# Files and folders to include
$includeItems = @(
    "backend\*.py",
    "backend\requirements.txt",
    "backend\alembic.ini",
    "backend\config.py",
    "backend\routers\*.py",
    "backend\schemas\*.py",
    "backend\migrations\*.py",
    "backend\migrations\versions\*.py",
    "frontend\src\*",
    "frontend\public\*",
    "frontend\package.json",
    "frontend\package-lock.json",
    "frontend\vite.config.js",
    "frontend\tailwind.config.js",
    "frontend\postcss.config.js",
    "frontend\index.html",
    "INSTALL.bat",
    "RUN.bat",
    "STOP.bat",
    "LAUNCHER.bat",
    "LAUNCHER.ps1",
    "scripts\*.ps1",
    "scripts\*.bat",
    "VERSION",
    "README.md",
    "frontend\README.md",
    "LICENSE",
    "student-management-system.code-workspace"
)

# Folders to exclude
$excludePatterns = @(
    "*\node_modules\*",
    "*\venv\*",
    "*\__pycache__\*",
    "*.pyc",
    "*.db",
    "*\.git\*",
    "*\.vscode\*",
    "*\logs\*",
    "*.log",
    ".*.pid",
    "backups\*"
)

Write-Host "[1/4] Preparing temporary directory..." -ForegroundColor Yellow
$tempDir = Join-Path $env:TEMP "sms-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "[2/4] Copying files..." -ForegroundColor Yellow
$copiedFiles = 0

# Copy essential files
foreach ($pattern in $includeItems) {
    $files = Get-ChildItem -Path $pattern -Recurse -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        # Check if file matches any exclude pattern
        $shouldExclude = $false
        foreach ($excludePattern in $excludePatterns) {
            if ($file.FullName -like $excludePattern) {
                $shouldExclude = $true
                break
            }
        }

        if (-not $shouldExclude) {
            $relativePath = $file.FullName.Substring($PWD.Path.Length + 1)
            $destPath = Join-Path $tempDir $relativePath
            $destDir = Split-Path $destPath -Parent

            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }

            Copy-Item $file.FullName $destPath -Force
            $copiedFiles++
        }
    }
}

Write-Host "  OK Copied $copiedFiles files" -ForegroundColor Green

Write-Host "[3/4] Creating empty directories..." -ForegroundColor Yellow
# Create empty directories that are needed but might not exist
$emptyDirs = @(
    "backend\logs",
    "backups",
    "logs"
)

foreach ($dir in $emptyDirs) {
    $fullPath = Join-Path $tempDir $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        # Create .gitkeep to preserve directory in git
        New-Item -ItemType File -Path (Join-Path $fullPath ".gitkeep") -Force | Out-Null
    }
}

Write-Host "  OK Created placeholder directories" -ForegroundColor Green

Write-Host "[4/4] Creating ZIP archive..." -ForegroundColor Yellow

# Remove existing package if it exists
if (Test-Path $OutputPath) {
    Remove-Item $OutputPath -Force
}

# Create ZIP file
try {
    Compress-Archive -Path "$tempDir\*" -DestinationPath $OutputPath -CompressionLevel Optimal
    $packageSize = [math]::Round((Get-Item $OutputPath).Length / 1MB, 2)
    Write-Host "  OK Package created: $OutputPath ($packageSize MB)" -ForegroundColor Green
} catch {
    Write-Host "  X Failed to create ZIP: $_" -ForegroundColor Red
    exit 1
}

# Cleanup
Write-Host ""
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Deployment Package Created Successfully!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package Details:" -ForegroundColor Yellow
Write-Host "  Version: v$Version"
Write-Host "  Location: $OutputPath"
Write-Host "  Size: $packageSize MB"
Write-Host "  Files: $copiedFiles"
Write-Host "  Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Extract ZIP on target computer"
Write-Host "  2. Run INSTALL.bat"
Write-Host "  3. Run RUN.bat"
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
