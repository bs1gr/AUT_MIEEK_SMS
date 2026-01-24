#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Terminal Encoding Permanent Fix - Repairs PowerShell corruption
.DESCRIPTION
    Applies comprehensive fixes for terminal encoding corruption:
    1. Sets UTF-8 encoding for console I/O
    2. Fixes VS Code terminal settings
    3. Clears corrupted PSReadLine history
    4. Ensures all scripts use correct encoding
    5. Sets environment variables for Python/Git
.PARAMETER ApplyAll
    Apply all fixes without prompting
#>

param(
    [switch]$ApplyAll
)

$ErrorActionPreference = "Stop"
$ConfirmPreference = "Continue"

Write-Host "`n========== TERMINAL ENCODING FIX ==========" -ForegroundColor Cyan
Write-Host "This script will apply permanent fixes for encoding corruption`n" -ForegroundColor Yellow

# Helper functions
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }

# FIX 1: Set console encoding to UTF-8
Write-Info "Fix 1: Setting console encoding to UTF-8..."
try {
    [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
    Write-Success "Console encoding set to UTF-8"
} catch {
    Write-Error "Failed to set console encoding: $_"
}

# FIX 2: Set environment variables for UTF-8
Write-Info "Fix 2: Setting environment variables..."
try {
    [System.Environment]::SetEnvironmentVariable("PYTHONIOENCODING", "utf-8", "User")
    [System.Environment]::SetEnvironmentVariable("LANG", "en_US.UTF-8", "User")
    $env:PYTHONIOENCODING = "utf-8"
    $env:LANG = "en_US.UTF-8"
    Write-Success "Environment variables set (PYTHONIOENCODING=utf-8, LANG=en_US.UTF-8)"
} catch {
    Write-Error "Failed to set environment variables: $_"
}

# FIX 3: Clear corrupted PSReadLine history
Write-Info "Fix 3: Cleaning PSReadLine history..."
try {
    $historyPath = (Get-PSReadlineOption).HistorySavePath
    if (Test-Path $historyPath) {
        # Backup first
        $backupPath = "$historyPath.backup"
        Copy-Item $historyPath $backupPath -Force
        Write-Info "  Backed up to: $backupPath"

        # Clear the history
        Clear-History -ErrorAction SilentlyContinue

        # Remove corrupted history file
        Remove-Item $historyPath -Force -ErrorAction SilentlyContinue

        Write-Success "PSReadLine history cleared"
    }
} catch {
    Write-Warning "Could not clear history: $_"
}

# FIX 4: Fix all PowerShell scripts encoding
Write-Info "Fix 4: Ensuring all scripts use UTF-8 encoding..."
try {
    $scriptFiles = Get-ChildItem -Path (Get-Location) -Filter "*.ps1" -File
    $fixedCount = 0

    foreach ($file in $scriptFiles) {
        $content = Get-Content $file.FullName -Raw

        # Read as raw bytes to detect BOM
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $isBOM = $bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF

        # Rewrite with UTF-8 (no BOM)
        $utf8 = New-Object System.Text.UTF8Encoding $false  # $false = no BOM
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8)
        $fixedCount++
    }

    Write-Success "Fixed $fixedCount PowerShell scripts to UTF-8 (no BOM)"
} catch {
    Write-Error "Failed to fix script encoding: $_"
}

# FIX 5: Configure VS Code settings
Write-Info "Fix 5: Configuring VS Code terminal settings..."
try {
    $vsCodeSettingsPath = "$env:APPDATA\Code\User\settings.json"

    if (Test-Path $vsCodeSettingsPath) {
        $settings = Get-Content $vsCodeSettingsPath -Raw | ConvertFrom-Json

        # Add/update terminal encoding settings
        $settings 'terminal.integrated.encoding' = "utf8"
        $settings.'terminal.integrated.env.windows' = @{}
        $settings.'terminal.integrated.env.windows'.'PYTHONIOENCODING' = "utf-8"
        $settings.'terminal.integrated.env.windows'.'LANG' = "en_US.UTF-8"

        # Write back (proper JSON)
        $settings | ConvertTo-Json -Depth 10 | Set-Content $vsCodeSettingsPath -Encoding UTF8
        Write-Success "VS Code settings updated"
    } else {
        Write-Warning "VS Code settings file not found - skipping"
    }
} catch {
    Write-Error "Failed to update VS Code settings: $_"
}

# FIX 6: Create PowerShell profile if missing
Write-Info "Fix 6: Ensuring PowerShell profile exists..."
try {
    $profilePath = $profile
    $profileDir = Split-Path $profilePath

    if (-not (Test-Path $profileDir)) {
        New-Item -Type Directory $profileDir -Force | Out-Null
    }

    $profileContent = @'
# PowerShell Profile - SMS Project
# Set UTF-8 encoding
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Set environment variables
$env:PYTHONIOENCODING = "utf-8"
$env:LANG = "en_US.UTF-8"

# Import PSReadLine for better editing
if (Get-Module -Name PSReadLine -ListAvailable) {
    Import-Module PSReadLine
    Set-PSReadLineOption -EditMode Windows
    Set-PSReadLineKeyHandler -Key Tab -Function Complete
}

Write-Host "PowerShell profile loaded - UTF-8 encoding active" -ForegroundColor Green
'@

    Set-Content $profilePath -Value $profileContent -Encoding UTF8
    Write-Success "PowerShell profile created/updated"
} catch {
    Write-Error "Failed to create profile: $_"
}

# FIX 7: Fix Git encoding
Write-Info "Fix 7: Configuring Git encoding..."
try {
    git config --global core.quotepath off
    git config --global core.safecrlf false
    git config --global i18n.logOutputEncoding utf-8
    git config --global i18n.commitEncoding utf-8
    Write-Success "Git encoding settings configured"
} catch {
    Write-Warning "Git not available or configuration failed: $_"
}

# FIX 8: Verify Python encoding
Write-Info "Fix 8: Verifying Python encoding..."
try {
    $pythonCheck = python -c "import sys; print('Python encoding OK' if sys.stdout.encoding.upper() == 'UTF-8' else 'UTF-8 NOT SET')"
    Write-Host "  $pythonCheck"
} catch {
    Write-Warning "Could not check Python encoding"
}

# FINAL: Restart recommendation
Write-Host "`n========== FIXES APPLIED ==========" -ForegroundColor Cyan
Write-Host "`n⚠️  IMPORTANT: Close and restart VS Code for changes to take effect!`n" -ForegroundColor Yellow
Write-Host "To verify fixes worked:" -ForegroundColor Cyan
Write-Host "  1. Close VS Code completely" -ForegroundColor White
Write-Host "  2. Close this PowerShell window" -ForegroundColor White
Write-Host "  3. Reopen VS Code" -ForegroundColor White
Write-Host "  4. Run: .\RUN_TESTS_BATCH.ps1 -BatchSize 3" -ForegroundColor White
Write-Host "  5. Verify no encoding corruption appears`n" -ForegroundColor White

Write-Host "If issues persist:" -ForegroundColor Yellow
Write-Host "  - Delete corrupted PSReadLine history backup: $(Get-PSReadlineOption).HistorySavePath.backup"
Write-Host "  - Restart your computer to reset Windows terminal state"
Write-Host "  - Check Windows Regional Settings (Settings > Time & Language > Language > Administrative)"
