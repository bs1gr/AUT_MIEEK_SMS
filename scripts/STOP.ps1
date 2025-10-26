# Student Management System - Stop Script

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Stopping Student Management System..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root directory
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Try API shutdown first (attempt common backend ports)
$apiStopped = $false
foreach ($p in 8000..8010) {
    try {
        Invoke-WebRequest -Uri "http://localhost:$p/control/api/stop-all" -Method POST -TimeoutSec 2 -ErrorAction Stop | Out-Null
        Write-Host "API shutdown initiated on port $p..." -ForegroundColor Green
        $apiStopped = $true
        break
    } catch {
        # continue trying other ports
    }
}
if (-not $apiStopped) {
    Write-Host "API not available on ports 8000-8010, using force stop..." -ForegroundColor Yellow
}

# Kill backend (ports 8000-8010)
Write-Host "Stopping backend (ports 8000-8010)..." -ForegroundColor Yellow
for ($p = 8000; $p -le 8010; $p++) {
    $netstatOut = netstat -ano | Select-String ":$p.*LISTENING"
    foreach ($line in $netstatOut) {
        if ($line -match "\s+(\d+)$") {
            $processId = $Matches[1]
            Write-Host "  Killing PID $processId on port $p" -ForegroundColor Gray
            taskkill /F /T /PID $processId 2>&1 | Out-Null
        }
    }
}

# Kill frontend (ports 5173-5180)
Write-Host "Stopping frontend (ports 5173-5180)..." -ForegroundColor Yellow
for ($p = 5173; $p -le 5180; $p++) {
    $netstatOut = netstat -ano | Select-String ":$p.*LISTENING"
    foreach ($line in $netstatOut) {
        if ($line -match "\s+(\d+)$") {
            $processId = $Matches[1]
            Write-Host "  Killing PID $processId on port $p" -ForegroundColor Gray
            taskkill /F /T /PID $processId 2>&1 | Out-Null
        }
    }
}

# Clean up PID files
Remove-Item ".backend.pid" -Force -ErrorAction SilentlyContinue
Remove-Item ".frontend.pid" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Servers stopped!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $env:NO_PAUSE) {
    Read-Host "Press Enter to exit"
}
