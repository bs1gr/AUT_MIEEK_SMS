```powershell
# OPERATOR-ONLY: DESTRUCTIVE. Developer copy of emergency frontend killer for local testing only.
# See scripts/operator/KILL_FRONTEND_NOW.ps1 for the canonical operator script.
param(
    [switch]$Confirm
)

if (-not $Confirm) {
    Write-Host "This script will terminate host processes (taskkill)." -ForegroundColor Red
    Write-Host "To proceed, re-run with the -Confirm flag: .\KILL_FRONTEND_NOW.dev.ps1 -Confirm" -ForegroundColor Yellow
    exit 1
}

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "Running developer emergency killer (DEVELOPMENT ONLY)"
Write-Host "This is a safe dev copy; adjust as needed for local debugging."

``` 
