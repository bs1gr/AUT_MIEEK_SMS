#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Upgrade pip in the backend virtual environment to version 25.3

.DESCRIPTION
    This script upgrades pip to the latest recommended version (25.3) in the
    backend virtual environment. Run this if you see outdated pip warnings.

.EXAMPLE
    .\scripts\dev\upgrade-pip.ps1

.NOTES
    Version: 1.0.0
    Target pip version: 25.3
#>

param(
    [string]$Version = "25.3"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$backendDir = Join-Path $projectRoot "backend"
$venvDir = Join-Path $backendDir ".venv"

# Colors
function Write-Success { param($Text) Write-Host "✓ $Text" -ForegroundColor Green }
function Write-Info { param($Text) Write-Host "ℹ $Text" -ForegroundColor Cyan }
function Write-Error2 { param($Text) Write-Host "✗ $Text" -ForegroundColor Red }

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Upgrade pip in Backend Virtual Environment                ║" -ForegroundColor Cyan
Write-Host "║     Target Version: $Version                                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if venv exists
if (-not (Test-Path $venvDir)) {
    Write-Error2 "Virtual environment not found at: $venvDir"
    Write-Info "Run SMART_SETUP.ps1 first to create the virtual environment"
    exit 1
}

# Determine Python path
$venvPython = if ($IsWindows -or $env:OS -match 'Windows') {
    Join-Path $venvDir 'Scripts/python.exe'
} else {
    Join-Path $venvDir 'bin/python'
}

if (-not (Test-Path $venvPython)) {
    Write-Error2 "Python executable not found in venv: $venvPython"
    exit 1
}

Write-Info "Using Python: $venvPython"

# Get current pip version
try {
    $currentVersion = & $venvPython -m pip --version 2>&1 | Select-String -Pattern 'pip ([0-9.]+)' | ForEach-Object { $_.Matches.Groups[1].Value }
    Write-Info "Current pip version: $currentVersion"
} catch {
    Write-Error2 "Failed to detect current pip version"
    exit 1
}

# Check if already at target version
if ($currentVersion -eq $Version) {
    Write-Success "pip is already at version $Version"
    exit 0
}

# Upgrade pip
Write-Info "Upgrading pip from $currentVersion to $Version..."

try {
    & $venvPython -m pip install --disable-pip-version-check --upgrade "pip==$Version" 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Successfully upgraded pip to version $Version"

        # Verify
        $newVersion = & $venvPython -m pip --version 2>&1 | Select-String -Pattern 'pip ([0-9.]+)' | ForEach-Object { $_.Matches.Groups[1].Value }
        Write-Info "Verified pip version: $newVersion"
    } else {
        Write-Error2 "Failed to install pip $Version"
        Write-Info "Trying to upgrade to latest version instead..."

        & $venvPython -m pip install --disable-pip-version-check --upgrade pip 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            $latestVersion = & $venvPython -m pip --version 2>&1 | Select-String -Pattern 'pip ([0-9.]+)' | ForEach-Object { $_.Matches.Groups[1].Value }
            Write-Success "Upgraded pip to latest version: $latestVersion"
        } else {
            Write-Error2 "Failed to upgrade pip"
            exit 1
        }
    }
} catch {
    Write-Error2 "Error during pip upgrade: $_"
    exit 1
}

Write-Host ""
Write-Success "pip upgrade complete!"
Write-Host ""
