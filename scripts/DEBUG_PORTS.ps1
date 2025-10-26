# Debug script to show what's running on ports

Write-Host ""
Write-Host "=== Port Analysis ===" -ForegroundColor Cyan
Write-Host ""

# Check Backend (port 8000)
Write-Host "Backend (port 8000):" -ForegroundColor Yellow
$backend = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
if ($backend) {
    foreach ($line in $backend) {
        if ($line -match "\s+(\d+)$") {
            $processId = $Matches[1]
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            Write-Host "  PID: $processId - Process: $($proc.ProcessName) - Command: $($proc.Path)" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  Not running" -ForegroundColor Gray
}

Write-Host ""

# Check Frontend (ports 5173-5180)
Write-Host "Frontend (ports 5173-5180):" -ForegroundColor Yellow
$found = $false
for ($port = 5173; $port -le 5180; $port++) {
    $frontend = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
    if ($frontend) {
        foreach ($line in $frontend) {
            if ($line -match "\s+(\d+)$") {
                $processId = $Matches[1]
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                Write-Host "  Port $port - PID: $processId - Process: $($proc.ProcessName)" -ForegroundColor Green
                $found = $true
            }
        }
    }
}
if (-not $found) {
    Write-Host "  Not running" -ForegroundColor Gray
}

Write-Host ""

# Check all Node.js processes
Write-Host "All Node.js processes:" -ForegroundColor Yellow
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    foreach ($proc in $nodeProcs) {
        $cmdline = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        Write-Host "  PID: $($proc.Id) - Command: $cmdline" -ForegroundColor Green
    }
} else {
    Write-Host "  None found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""
