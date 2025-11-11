```powershell
# OPERATOR-ONLY: DESTRUCTIVE. This script performs host-level process termination (taskkill).
#           Do NOT call from automation or CI. Use only on operator-managed hosts.
# Emergency frontend killer - use when backend is down
# WARNING: This script performs host-level process termination using taskkill.
# It is intended for interactive, operator use only. By default the script will
# NOT run unless you explicitly pass the -Confirm parameter to acknowledge
# that you understand the destructive nature of this operation.

param(
    [switch]$Confirm
)

if (-not $Confirm) {
    Write-Host "This script will terminate host processes (taskkill)." -ForegroundColor Red
    Write-Host "To proceed, re-run with the -Confirm flag: .\KILL_FRONTEND_NOW.ps1 -Confirm" -ForegroundColor Yellow
    exit 1
}

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== Emergency Frontend Shutdown (CONFIRMED) ===" -ForegroundColor Red
Write-Host ""

$killed = 0

# Kill Node.js processes on ports 5173-5180
Write-Host "Checking frontend ports..." -ForegroundColor Yellow
for ($port = 5173; $port -le 5180; $port++) {
    $netstat = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
    if ($netstat) {
        foreach ($line in $netstat) {
            if ($line -match "\s+(\d+)$") {
                $processId = $Matches[1]
                Write-Host "  Killing PID $processId on port $port..." -ForegroundColor Yellow
                taskkill /F /T /PID $processId 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "    OK Success" -ForegroundColor Green
                    $killed++
                } else {
                    Write-Host "    X Failed" -ForegroundColor Red
                }
            }
        }
    }
}

# Kill all Node.js processes (nuclear option)
Write-Host ""
Write-Host "Checking for remaining Node.js processes..." -ForegroundColor Yellow
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "  Found $($nodeProcs.Count) Node.js process(es), killing all..." -ForegroundColor Yellow
    taskkill /F /IM node.exe /T 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK All Node.js processes terminated" -ForegroundColor Green
        $killed += $nodeProcs.Count
    }
}

Write-Host ""
if ($killed -gt 0) {
    Write-Host "=== Successfully killed $killed process(es) ===" -ForegroundColor Green
} else {
    Write-Host "=== No frontend processes found ===" -ForegroundColor Yellow
}
Write-Host ""

Read-Host "Press Enter to exit"

``` 
