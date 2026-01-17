# PowerShell Profile for Student Management System (v3 - Jan 17, 2026)
# This file configures PowerShell for proper UTF-8 encoding and clean output
# Fixes: ψ character corruption in terminal (Issue: Terminal encoding)
# Version 3: Optimized for faster loading and better terminal API compatibility

# Fail-safe: never terminate the shell because of profile errors
$ErrorActionPreference = 'SilentlyContinue'
trap {
    continue
}

# Disable all progress bars immediately (prevents terminal hangs)
$ProgressPreference = 'SilentlyContinue'
$VerbosePreference = 'SilentlyContinue'
$DebugPreference = 'SilentlyContinue'
$InformationPreference = 'SilentlyContinue'

Write-Host "Initializing..." -ForegroundColor Gray

# === CRITICAL FIX: Console Encoding (Must be first) ===
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set default encoding for cmdlets
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# === Set Code Page to UTF-8 (65001) ===
cmd /c "chcp 65001 >nul 2>&1"

# === Environment Variables ===
$env:GIT_TERMINAL_PROMPT = "0"
$env:TERM = "dumb"
$env:LESSCHARSET = "utf-8"
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUNBUFFERED = "1"

# === PSReadLine (minimal config) ===
if (Get-Module -ListAvailable -Name PSReadLine) {
    Set-PSReadLineKeyHandler -Key Ctrl+l -Function ClearScreen -ErrorAction SilentlyContinue
    Set-PSReadLineKeyHandler -Key Ctrl+v -Function Paste -ErrorAction SilentlyContinue
}

# === Simple Prompt ===
function global:prompt { "PS > " }

Write-Host "✓ UTF-8 Encoding Ready" -ForegroundColor Green
