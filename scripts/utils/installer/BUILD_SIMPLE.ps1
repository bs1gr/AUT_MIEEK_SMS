<#
.SYNOPSIS
    ⚠️  DEPRECATED - Simple executable builder for SMS Installer Wizards

.DESCRIPTION
    ⚠️  DEPRECATED: Use the canonical Inno Setup build system instead (installer/SMS_Installer.iss).
    This PS2EXE-based builder is kept for historical reference.
    
    Legacy description: Creates Windows executables from PowerShell GUI installer scripts using PS2EXE
#>

Write-Host ""
Write-Host "⚠️  This script is deprecated. Use the official Inno Setup build system:" -ForegroundColor Yellow
Write-Host "  → installer/SMS_Installer.iss (canonical)" -ForegroundColor Yellow
Write-Host "  → Run: .\INSTALLER_BUILDER.ps1 (root level)" -ForegroundColor Yellow
Write-Host ""

param(
    [string]$OutputPath = ".\dist"
)

$ErrorActionPreference = 'Stop'

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SMS Installer Builder (Simple)" -ForegroundColor Cyan
Write-Host "  Version: $(Get-Content ..\..\VERSION -Raw | ForEach-Object { $_.Trim() })" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check and install PS2EXE
Write-Host "Checking for PS2EXE module..." -ForegroundColor Yellow
if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Write-Host "Installing PS2EXE from PowerShell Gallery..." -ForegroundColor Yellow
    Install-Module -Name ps2exe -Force -Scope CurrentUser -AllowClobber
    Write-Host "✓ PS2EXE installed" -ForegroundColor Green
}

Import-Module ps2exe -Force

# Create output directory
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null

# Get version
$version = (Get-Content ..\..\VERSION -Raw).Trim()

# Build Installer
Write-Host "`nBuilding Installer executable..." -ForegroundColor Yellow
$installerExe = Join-Path $OutputPath "SMS_Installer_$version.exe"

try {
    Invoke-ps2exe `
        -inputFile ".\SMS_INSTALLER_WIZARD.ps1" `
        -outputFile $installerExe `
        -title "SMS Installer" `
        -description "Student Management System Installer Wizard" `
        -company "AUT MIEEK" `
        -product "Student Management System" `
        -version $version `
        -copyright "(c) 2025 AUT MIEEK" `
        -requireAdmin `
        -noConsole `
        -noOutput `
        -noError `
        -STA `
        -longPaths
    
    if (Test-Path $installerExe) {
        Write-Host "✓ Installer created: $installerExe" -ForegroundColor Green
        Write-Host "  Size: $([math]::Round((Get-Item $installerExe).Length / 1MB, 2)) MB" -ForegroundColor Gray
    } else {
        throw "Installer file not created"
    }
} catch {
    Write-Host "✗ Failed to build installer: $_" -ForegroundColor Red
    exit 1
}

# Build Uninstaller
Write-Host "`nBuilding Uninstaller executable..." -ForegroundColor Yellow
$uninstallerExe = Join-Path $OutputPath "SMS_Uninstaller_$version.exe"

try {
    Invoke-ps2exe `
        -inputFile ".\SMS_UNINSTALLER_WIZARD.ps1" `
        -outputFile $uninstallerExe `
        -title "SMS Uninstaller" `
        -description "Student Management System Uninstaller Wizard" `
        -company "AUT MIEEK" `
        -product "Student Management System" `
        -version $version `
        -copyright "(c) 2025 AUT MIEEK" `
        -requireAdmin `
        -noConsole `
        -noOutput `
        -noError `
        -STA `
        -longPaths
    
    if (Test-Path $uninstallerExe) {
        Write-Host "✓ Uninstaller created: $uninstallerExe" -ForegroundColor Green
        Write-Host "  Size: $([math]::Round((Get-Item $uninstallerExe).Length / 1MB, 2)) MB" -ForegroundColor Gray
    } else {
        throw "Uninstaller file not created"
    }
} catch {
    Write-Host "✗ Failed to build uninstaller: $_" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Executables created in: $OutputPath" -ForegroundColor White
Write-Host "  • SMS_Installer_$version.exe" -ForegroundColor White
Write-Host "  • SMS_Uninstaller_$version.exe" -ForegroundColor White
Write-Host ""
Write-Host "To distribute:" -ForegroundColor Yellow
Write-Host "  1. Copy both executables to target PC" -ForegroundColor Gray
Write-Host "  2. Right-click SMS_Installer_$version.exe" -ForegroundColor Gray
Write-Host "  3. Select 'Run as Administrator'" -ForegroundColor Gray
Write-Host ""
