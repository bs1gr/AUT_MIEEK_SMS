# PowerShell Profile for Student Management System
# This file configures PowerShell for proper UTF-8 encoding and clean output

# Set UTF-8 encoding for all output
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Set default encoding for Out-File and other cmdlets
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Set code page to UTF-8 (65001)
chcp 65001 > $null

# Disable progress bars for cleaner output (prevents ψ characters)
$ProgressPreference = 'SilentlyContinue'

# Suppress verbose output from git
$env:GIT_TERMINAL_PROMPT = "0"

# Set Git to use UTF-8
$env:LESSCHARSET = "utf-8"

# Clean output format
$PSStyle.OutputRendering = 'PlainText'

Write-Host "PowerShell profile loaded - UTF-8 encoding configured" -ForegroundColor Green
