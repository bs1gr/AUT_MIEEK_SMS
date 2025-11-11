<#
.SYNOPSIS
  Safely request the control API to stop the frontend dev server.

DESCRIPTION
  This helper script calls the control API endpoint /control/api/stop using an
  optional admin token. It is safer than running taskkill locally and meant for
  operator use when CONTROL_API_ALLOW_TASKKILL is not set.

USAGE
  .\stop_frontend_safe.ps1 -ControlUrl 'http://localhost:8000' -AdminToken 'secret'

#>

param(
    [string]$ControlUrl = "http://127.0.0.1:8000",
    [string]$AdminToken = "",
    [int]$TimeoutSeconds = 10
)

if ($AdminToken -ne "") {
    $headers = @{ 'X-ADMIN-TOKEN' = $AdminToken }
} else {
    $headers = @{}
}

Write-Host "Requesting frontend stop via $ControlUrl/control/api/stop"
try {
    $resp = Invoke-RestMethod -Uri "$ControlUrl/control/api/stop" -Method Post -Headers $headers -TimeoutSec $TimeoutSeconds
    Write-Host "Response:`n" ($resp | ConvertTo-Json -Depth 4)
} catch {
  Write-Host "Failed to call control API: $_"
  Write-Host "If control API is not enabled, prefer using the operator emergency script instead of running taskkill locally:" -ForegroundColor Yellow
  Write-Host "  .\scripts\internal\KILL_FRONTEND_NOW.ps1 -Confirm" -ForegroundColor Cyan
  Write-Host "If you absolutely must run a host-level kill manually, do so only from an operator host and after confirming the PID and impact." -ForegroundColor Red
}
