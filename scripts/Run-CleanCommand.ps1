#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run PowerShell commands with proper UTF-8 encoding and clean output

.DESCRIPTION
    This script ensures all PowerShell commands run with UTF-8 encoding enabled
    and suppresses progress bars that cause ψ character issues.

.PARAMETER Command
    The PowerShell command to execute

.PARAMETER NoEcho
    Suppress command echo (only show output)

.EXAMPLE
    .\scripts\Run-CleanCommand.ps1 -Command "Get-ChildItem"

.EXAMPLE
    .\scripts\Run-CleanCommand.ps1 -Command "python scripts/audit_router_permissions.py" -NoEcho
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Command,

    [Parameter(Mandatory = $false)]
    [switch]$NoEcho
)

# Set UTF-8 encoding
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
chcp 65001 > $null

# Disable progress bars
$ProgressPreference = 'SilentlyContinue'

# Suppress verbose git output
$env:GIT_TERMINAL_PROMPT = "0"

# Echo command if requested
if (-not $NoEcho) {
    Write-Host "Running: $Command" -ForegroundColor Cyan
    Write-Host ("-" * 80) -ForegroundColor Gray
}

# Execute command
try {
    Invoke-Expression $Command
    $exitCode = $LASTEXITCODE
} catch {
    Write-Error "Command failed: $_"
    exit 1
}

# Return exit code
exit $exitCode
