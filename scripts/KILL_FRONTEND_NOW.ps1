# Emergency frontend killer - use when backend is down

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== Emergency Frontend Shutdown ===" -ForegroundColor Red
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
