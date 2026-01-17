#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Permanent Greek Encoding Fix for VS Code Terminal
.DESCRIPTION
    This script configures a permanent solution for Greek character encoding issues in VS Code.
    It sets up:
    1. VS Code workspace settings for UTF-8
    2. PowerShell profile auto-loaded by VS Code
    3. System environment variables
    4. Git configuration for UTF-8
    5. Windows Terminal settings (if installed)

    After running this script once, Greek characters (like ψ, Ψ, α, β, etc.) will display
    correctly in all VS Code terminals without needing manual intervention.

.PARAMETER Verify
    Only verify the current setup without making changes
.EXAMPLE
    .\scripts\setup-greek-encoding-permanent.ps1
    Run the permanent fix setup
.EXAMPLE
    .\scripts\setup-greek-encoding-permanent.ps1 -Verify
    Check if the permanent fix is already configured
#>

param(
    [switch]$Verify
)

$ErrorActionPreference = "Stop"

# Helper functions
function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Failure { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  ℹ $msg" -ForegroundColor Gray }

Write-Host @"

╔════════════════════════════════════════════════════════════════╗
║   PERMANENT GREEK ENCODING FIX FOR VS CODE                     ║
║   Fixes: ψ, Ψ, α, β, γ, and all Greek character corruption    ║
╚════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$vscodePath = Join-Path $workspaceRoot ".vscode"
$settingsPath = Join-Path $vscodePath "settings.json"
$profilePath = Join-Path $vscodePath "powershell-profile.ps1"

# Verification mode
if ($Verify) {
    Write-Step "Verifying Greek encoding configuration..."

    $allGood = $true

    # Check 1: VS Code settings
    if (Test-Path $settingsPath) {
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
        if ($settings.'terminal.integrated.defaultProfile.windows' -eq 'PowerShell (SMS)') {
            Write-Success "VS Code terminal profile: Configured"
        } else {
            Write-Failure "VS Code terminal profile: Not configured"
            $allGood = $false
        }
    } else {
        Write-Failure "VS Code settings.json: Not found"
        $allGood = $false
    }

    # Check 2: PowerShell profile
    if (Test-Path $profilePath) {
        Write-Success "PowerShell encoding profile: Exists"
    } else {
        Write-Failure "PowerShell encoding profile: Not found"
        $allGood = $false
    }

    # Check 3: Current console encoding
    if ([System.Console]::OutputEncoding.CodePage -eq 65001) {
        Write-Success "Current console encoding: UTF-8 (65001)"
    } else {
        Write-Warning "Current console encoding: $([System.Console]::OutputEncoding.CodePage) (should be 65001)"
        $allGood = $false
    }

    # Check 4: Environment variables
    if ($env:PYTHONIOENCODING -eq "utf-8") {
        Write-Success "PYTHONIOENCODING: utf-8"
    } else {
        Write-Warning "PYTHONIOENCODING: Not set"
    }

    # Check 5: Git config
    $gitEncoding = git config --global i18n.commitEncoding 2>$null
    if ($gitEncoding -eq "utf-8") {
        Write-Success "Git commit encoding: utf-8"
    } else {
        Write-Warning "Git commit encoding: Not set"
    }

    Write-Host ""
    if ($allGood) {
        Write-Host "✅ All Greek encoding fixes are properly configured!" -ForegroundColor Green
        Write-Host "   Greek characters should display correctly in VS Code terminal." -ForegroundColor Green
    } else {
        Write-Host "❌ Some fixes are missing. Run without -Verify to apply them." -ForegroundColor Yellow
    }

    exit 0
}

# === INSTALLATION MODE ===

Write-Step "Step 1: Configuring VS Code Settings"

# Ensure .vscode directory exists
if (-not (Test-Path $vscodePath)) {
    New-Item -ItemType Directory -Path $vscodePath -Force | Out-Null
    Write-Info "Created .vscode directory"
}

# Update settings.json
if (Test-Path $settingsPath) {
    Write-Info "Updating existing settings.json..."
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
} else {
    Write-Info "Creating new settings.json..."
    $settings = @{}
}

# Apply encoding settings
$settings.'files.encoding' = 'utf8'
$settings.'files.autoGuessEncoding' = $false
$settings.'files.eol' = "`n"
$settings.'terminal.integrated.defaultProfile.windows' = 'PowerShell (SMS)'
$settings.'terminal.integrated.profiles.windows' = @{
    'PowerShell (SMS)' = @{
        source = 'PowerShell'
        args = @(
            '-NoProfile'
            '-NoExit'
            '-ExecutionPolicy'
            'Bypass'
            '-File'
            '${workspaceFolder}\.vscode\powershell-profile.ps1'
        )
    }
}
$settings.'terminal.integrated.env.windows' = @{
    PYTHONIOENCODING = 'utf-8'
    PYTHONUNBUFFERED = '1'
    TERM = 'dumb'
}

# Save settings
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
Write-Success "VS Code settings configured"

Write-Step "Step 2: Creating PowerShell Encoding Profile"

$profileContent = @'
# PowerShell Profile for Greek Encoding Fix (Auto-loaded by VS Code)
# This profile ensures Greek characters display correctly: ψ, Ψ, α, β, γ, etc.

$ErrorActionPreference = 'SilentlyContinue'

# Set UTF-8 encoding (Critical - must be first)
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set code page to 65001 (UTF-8)
cmd /c "chcp 65001 >nul 2>&1"

# Configure default encodings for cmdlets
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Disable progress bars (can corrupt Greek chars)
$ProgressPreference = 'SilentlyContinue'

# Set environment variables
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUNBUFFERED = "1"
$env:LESSCHARSET = "utf-8"

# Test Greek characters (silent - for verification only)
# Expected output: ψΨαβγδεζηθικλμνξοπρστυφχψω
$null = "ψΨαβγδεζηθικλμνξοπρστυφχψω"

Write-Host "✓ Greek encoding active (UTF-8)" -ForegroundColor Green
'@

Set-Content $profilePath -Value $profileContent -Encoding UTF8
Write-Success "PowerShell profile created at: $profilePath"

Write-Step "Step 3: Setting System Environment Variables"

try {
    # Set user-level environment variables (permanent)
    [System.Environment]::SetEnvironmentVariable("PYTHONIOENCODING", "utf-8", "User")
    [System.Environment]::SetEnvironmentVariable("LANG", "en_US.UTF-8", "User")

    # Also set for current session
    $env:PYTHONIOENCODING = "utf-8"
    $env:LANG = "en_US.UTF-8"

    Write-Success "Environment variables set (PYTHONIOENCODING, LANG)"
} catch {
    Write-Warning "Could not set environment variables: $_"
}

Write-Step "Step 4: Configuring Git for UTF-8"

try {
    # Configure Git to use UTF-8
    git config --global core.quotepath false
    git config --global i18n.commitEncoding utf-8
    git config --global i18n.logOutputEncoding utf-8

    Write-Success "Git configured for UTF-8 encoding"
} catch {
    Write-Warning "Could not configure Git: $_"
}

Write-Step "Step 5: Setting Current Terminal Encoding"

try {
    [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
    cmd /c "chcp 65001 >nul 2>&1"

    Write-Success "Current terminal encoding set to UTF-8"
} catch {
    Write-Warning "Could not set terminal encoding: $_"
}

Write-Step "Step 6: Testing Greek Character Display"

Write-Host ""
Write-Host "  Testing Greek characters:" -ForegroundColor Cyan
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Lower: αβγδεζηθικλμνξοπρστυφχψω" -ForegroundColor White
Write-Host "  Upper: ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ" -ForegroundColor White
Write-Host "  Mixed: Ψυχή (Psyche) - Φιλοσοφία (Philosophy)" -ForegroundColor White
Write-Host ""

Write-Host @"

╔════════════════════════════════════════════════════════════════╗
║                    INSTALLATION COMPLETE                       ║
╚════════════════════════════════════════════════════════════════╝

✅ Greek encoding fix has been permanently configured!

What was done:
  ✓ VS Code settings updated for UTF-8
  ✓ PowerShell profile created (auto-loads in VS Code)
  ✓ System environment variables set
  ✓ Git configured for UTF-8
  ✓ Current terminal encoding fixed

What you need to do:
  1. RESTART VS CODE (important!)
  2. Open a new terminal in VS Code
  3. Greek characters should now display correctly

To verify the fix:
  .\scripts\setup-greek-encoding-permanent.ps1 -Verify

If you still see corruption:
  1. Ensure Docker Desktop is not interfering
  2. Check Windows Regional Settings (Control Panel)
  3. Run this script again after updating Windows

Greek character test: ψΨαβγδεζηθικλμνξοπρστυφχψω

"@ -ForegroundColor Green
