# PowerShell Profile for Student Management System (v2 - Jan 13, 2026)
# This file configures PowerShell for proper UTF-8 encoding and clean output
# Fixes: ψ character corruption in terminal (Issue: Terminal encoding)

# Fail-safe: never terminate the shell because of profile errors
$ErrorActionPreference = 'Continue'
trap {
    Write-Host "⚠ Profile error (continuing): $_" -ForegroundColor Yellow
    continue
}

Write-Host "Initializing PowerShell profile (encoding fix v2)..." -ForegroundColor Gray

# === CRITICAL FIX: Console Encoding (Must be first) ===
# Set UTF-8 encoding for all output BEFORE any other operations
try {
    [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8

    # Set default encoding for cmdlets
    $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
    $PSDefaultParameterValues['*:Encoding'] = 'utf8'
    $PSDefaultParameterValues['ConvertTo-Json:Encoding'] = 'utf8'

    Write-Host "✓ UTF-8 Console Encoding: Set" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: Could not set UTF-8 encoding: $_" -ForegroundColor Yellow
}

# === Set Code Page to UTF-8 (65001) ===
# This is critical for preventing corruption
try {
    cmd /c "chcp 65001 >nul 2>&1"
    Write-Host "✓ Code Page 65001 (UTF-8): Set" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: Could not set code page" -ForegroundColor Yellow
}

# === Prevent Verbose Output & Progress Corruption ===
# These can cause ψ characters to appear in output
$ProgressPreference = 'SilentlyContinue'      # Critical: Disable progress bars
$VerbosePreference = 'SilentlyContinue'       # Disable verbose output
$DebugPreference = 'SilentlyContinue'         # Disable debug output
$WarningPreference = 'Continue'               # Keep warnings but controlled
$InformationPreference = 'SilentlyContinue'   # Disable info messages

Write-Host "✓ Output Preferences: Cleaned" -ForegroundColor Green

# === Environment Variables for Clean Terminal ===
$env:GIT_TERMINAL_PROMPT = "0"                # Prevent Git prompts
$env:TERM = "dumb"                            # Disable fancy terminal features
$env:LESSCHARSET = "utf-8"                    # Set pager charset
$env:PYTHONIOENCODING = "utf-8"               # Python UTF-8 output
$env:PYTHONUNBUFFERED = "1"                   # Unbuffered Python output

# === Terminal State Reset ===
# Only do this if needed (can slow down startup)
try {
    # Reset any corrupted color state without blocking
    [System.Console]::ResetColor()
    Write-Host "✓ Console Color: Reset" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: Could not reset color" -ForegroundColor Yellow
}

# === PSReadLine Configuration ===
if (Get-Module -ListAvailable -Name PSReadLine) {
    # Bind Ctrl+L to clear screen cleanly
    Set-PSReadLineKeyHandler -Key Ctrl+l -Function ClearScreen

    # Bind Ctrl+V for plain text paste (prevents encoding issues)
    Set-PSReadLineKeyHandler -Key Ctrl+v -Function Paste

    Write-Host "✓ PSReadLine: Configured" -ForegroundColor Green
}

# === Plain Text Output Rendering ===
# Prevents fancy Unicode that can cause corruption
if ($PSStyle -and $PSStyle.PSObject.Properties.Name -contains 'OutputRendering') {
    $PSStyle.OutputRendering = 'PlainText'
    Write-Host "✓ Output Rendering: Plain Text" -ForegroundColor Green
}

# === VS Code Shell Integration (guarded) ===
if ($env:TERM_PROGRAM -eq "vscode") {
    $codeCmd = Get-Command code -ErrorAction SilentlyContinue
    if ($codeCmd) {
        try {
            . "$(code --locate-shell-integration-path pwsh)" 2>$null
            Write-Host "✓ VS Code Shell Integration: Loaded" -ForegroundColor Green
        } catch {
            Write-Host "ℹ VS Code Shell Integration skipped (not available)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "ℹ VS Code Shell Integration skipped (code not found)" -ForegroundColor DarkGray
    }
}

# === Aliases ===
if (-not (Get-Command cls -ErrorAction SilentlyContinue)) {
    Set-Alias cls Clear-Host
}

# === Simple, Clean Prompt ===
# Simple prompt to avoid hidden characters that can cause ψ corruption
function global:prompt {
    "PS > "
}

# === Startup Complete ===
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PowerShell Profile Loaded (Terminal Encoding Fix v2)      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Status: UTF-8 Encoding Enabled" -ForegroundColor Green
Write-Host "  Code Page: 65001 (UTF-8)" -ForegroundColor Green
Write-Host "  Location: .vscode/powershell-profile.ps1" -ForegroundColor Gray
Write-Host ""
