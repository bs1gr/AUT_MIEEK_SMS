# ============================================================================
#   Student Management System - PowerShell Startup Script
#   MIEEK - AUT Automotive Engineering
# ============================================================================

# Parameters: Allow control-only mode (start backend, open HTML, exit script)
param(
    [switch]$ControlOnly
)

# Set window title
$host.UI.RawUI.WindowTitle = "SMS - Starting..."

# Change to project root directory (parent of scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# ============================================================================
# Find Python
# ============================================================================

$pythonExe = $null

# Check if venv exists
if (Test-Path "backend\venv\Scripts\python.exe") {
    $pythonExe = "backend\venv\Scripts\python.exe"
}
# Check system Python
elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonExe = "python"
}
# Check py launcher
elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonExe = "py"
}
# Check common installation paths
elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe") {
    $pythonExe = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
}
elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe") {
    $pythonExe = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
}
elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe") {
    $pythonExe = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
}

if (-not $pythonExe) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  ERROR: Python not found!" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Python 3.8+ from https://www.python.org" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Find Node.js and npm
# ============================================================================

$npmCmd = $null

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Test npm commands
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmCmd = "npm"
}
elseif (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
    $npmCmd = "npm.cmd"
}
else {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  ERROR: npm not found!" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Node.js might be corrupted." -ForegroundColor Yellow
    Write-Host "  Please reinstall Node.js from https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Check if servers are already running
# ============================================================================

$backendRunning = $false
$frontendRunning = $false
$backendPort = 8000

try {
    $connection = Test-NetConnection -ComputerName localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue
    $backendRunning = $connection
} catch {
    $backendRunning = $false
}

try {
    $connection = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue
    $frontendRunning = $connection
} catch {
    $frontendRunning = $false
}

if ($backendRunning -and $frontendRunning) {
    Write-Host "Servers already running. Opening browser..." -ForegroundColor Green
    if ($ControlOnly) {
        # Single-window UX: open frontend directly at the Power/Control tab
        Start-Process "http://localhost:5173/#power"
        exit 0
    }
    Start-Process "http://localhost:5173"
    exit 0
}

# If ControlOnly mode, only ensure backend is running; skip frontend; open /control and exit
if ($ControlOnly) {
    if ($backendRunning) {
        Write-Host "Backend already running. Opening Frontend (Power tab)..." -ForegroundColor Green
        if ($frontendRunning) {
            Start-Process "http://localhost:5173/#power"
        } else {
            # Try to start frontend via control API and then open it
            try {
                Invoke-WebRequest -Uri "http://localhost:$backendPort/control/api/start" -Method POST -TimeoutSec 4 -ErrorAction Stop | Out-Null
            } catch {}

            # Wait briefly for frontend to bind
            $tries = 0
            $maxTries = 10
            do {
                Start-Sleep -Milliseconds 500
                try { $frontendRunning = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue } catch { $frontendRunning = $false }
                $tries++
            } while (-not $frontendRunning -and $tries -lt $maxTries)

            if ($frontendRunning) {
                Start-Process "http://localhost:5173/#power"
            } else {
                # Fallback: open backend control panel
                Start-Process "http://localhost:$backendPort/control"
            }
        }
        exit 0
    }
    # Else: start backend, then open frontend (handled below)
}

# ============================================================================
# Start servers
# ============================================================================

Write-Host "Starting Student Management System..." -ForegroundColor Cyan

# Start Backend
if (-not $backendRunning) {
    # If preferred port is in use (race conditions possible), find a free alternative
    for ($p = $backendPort; $p -le ($backendPort + 10); $p++) {
        try {
            $free = -not (Test-NetConnection -ComputerName localhost -Port $p -InformationLevel Quiet -WarningAction SilentlyContinue)
        } catch { $free = $true }
        if ($free) { 
            $backendPort = $p
            # Small delay to ensure port is truly released (Windows socket TIME_WAIT)
            Start-Sleep -Milliseconds 100
            break 
        }
    }
    Write-Host "Checking backend dependencies..." -ForegroundColor Cyan

    # Check if requirements.txt exists and validate all dependencies
    if (Test-Path "backend\requirements.txt") {
        $needsInstall = $false

        # Quick check for critical imports
        & $pythonExe -c "import uvicorn, psutil" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            $needsInstall = $true
        }

        if ($needsInstall) {
            Write-Host "Installing/updating backend dependencies..." -ForegroundColor Yellow

            $currentDir = Get-Location
            Set-Location backend

            # Resolve full path to Python executable
            $pythonFullPath = $pythonExe
            if (-not [System.IO.Path]::IsPathRooted($pythonExe)) {
                $pythonFullPath = Join-Path $projectRoot $pythonExe
            }
            if (Test-Path $pythonFullPath) {
                $pythonFullPath = (Resolve-Path $pythonFullPath).Path
            }

            # Upgrade pip first
            Write-Host "  Upgrading pip..." -ForegroundColor Gray
            & "$pythonFullPath" -m pip install --upgrade pip --quiet --disable-pip-version-check 2>&1 | Out-Null

            # Install/upgrade all requirements
            Write-Host "  Installing requirements..." -ForegroundColor Gray
            & "$pythonFullPath" -m pip install -r requirements.txt --upgrade --quiet --disable-pip-version-check

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Dependencies installed successfully!" -ForegroundColor Green
            } else {
                Write-Host "  Warning: Some dependencies may have failed to install" -ForegroundColor Yellow
            }

            Set-Location $currentDir
        } else {
            Write-Host "  All dependencies are installed!" -ForegroundColor Green
        }
    }

    Write-Host "Starting backend server..." -ForegroundColor Green

    # Get absolute paths
    $pythonPath = if (Test-Path $pythonExe) {
        (Resolve-Path $pythonExe).Path
    } else {
        (Get-Command $pythonExe -ErrorAction SilentlyContinue).Source
    }

    if (-not $pythonPath) { $pythonPath = $pythonExe }

    # Try to start backend and verify port binding; on failure, retry with next port
    $backendProc = $null
    $started = $false
    for ($attempt = 0; $attempt -lt 10 -and -not $started; $attempt++) {
        # Start backend server - run from project root, not backend directory
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $pythonPath
        $psi.Arguments = "-m uvicorn backend.main:app --host 127.0.0.1 --port $backendPort"
        $psi.WorkingDirectory = $projectRoot
        $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
        $psi.CreateNoWindow = $false
        $backendProc = [System.Diagnostics.Process]::Start($psi)

        # Wait for backend startup with progressive checking
        Start-Sleep -Milliseconds 2000
        try {
            $listening = Test-NetConnection -ComputerName localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue
        } catch { $listening = $false }

        if ($listening) {
            $started = $true
            break
        }

        # Check if process crashed immediately (port conflict)
        if ($backendProc.HasExited) {
            Write-Host "  Backend process exited (likely port conflict), trying port $($backendPort + 1)..." -ForegroundColor Yellow
            $backendPort++
            Start-Sleep -Milliseconds 500
            continue
        }

        # Not listening; kill process and try next port
        if ($backendProc -and -not $backendProc.HasExited) {
            try { $backendProc.Kill() } catch { }
            Start-Sleep -Milliseconds 250
        }
        $backendPort++
    }

    if ($started) {
        # Save backend PID to file for shutdown
        $backendProc.Id | Out-File -FilePath "$projectRoot\.backend.pid" -Encoding UTF8
        Write-Host "Backend started with PID: $($backendProc.Id) on port $backendPort" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: Failed to start backend after multiple attempts." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start Frontend
if (-not $frontendRunning) {
    if ($ControlOnly) {
        Write-Host "Control-only mode: Skipping frontend startup." -ForegroundColor Yellow
    } else {
    Write-Host "Checking frontend dependencies..." -ForegroundColor Cyan

    # Check if node_modules exists or if package.json is newer
    $needsInstall = $false

    if (-not (Test-Path "frontend\node_modules")) {
        $needsInstall = $true
        Write-Host "  node_modules not found" -ForegroundColor Gray
    } elseif (Test-Path "frontend\package.json") {
        $packageJson = Get-Item "frontend\package.json"
        $nodeModules = Get-Item "frontend\node_modules"
        if ($packageJson.LastWriteTime -gt $nodeModules.LastWriteTime) {
            $needsInstall = $true
            Write-Host "  package.json is newer than node_modules" -ForegroundColor Gray
        }
    }

    if ($needsInstall) {
        Write-Host "Installing/updating frontend dependencies..." -ForegroundColor Yellow
        Set-Location frontend
        & $npmCmd install --silent

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Frontend dependencies installed successfully!" -ForegroundColor Green
        } else {
            Write-Host "  Warning: Some frontend dependencies may have failed to install" -ForegroundColor Yellow
        }

        Set-Location ..
    } else {
        Write-Host "  All frontend dependencies are installed!" -ForegroundColor Green
    }

    Write-Host "Starting frontend server..." -ForegroundColor Green

    # Get absolute path to frontend directory (in project root)
    $frontendPath = Join-Path $projectRoot "frontend"

    # Verify frontend directory exists
    if (-not (Test-Path $frontendPath)) {
        Write-Host ""
        Write-Host "  ERROR: Frontend directory not found at: $frontendPath" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Verify package.json exists
    if (-not (Test-Path "$frontendPath\package.json")) {
        Write-Host ""
        Write-Host "  ERROR: package.json not found in frontend directory!" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Start frontend server using cmd.exe (npm needs to run through cmd)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    # Pass backend URL to Vite via environment variable so frontend targets the correct port
    $psi.EnvironmentVariables["VITE_API_URL"] = "http://localhost:$backendPort/api/v1"
    $psi.Arguments = "/c cd /d `"$frontendPath`" && $npmCmd run dev"
    $psi.WorkingDirectory = $frontendPath
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
    $psi.CreateNoWindow = $false
    
    try {
        $frontendProc = [System.Diagnostics.Process]::Start($psi)
        
        # Wait a moment to see if process starts
        Start-Sleep -Milliseconds 500
        
        if ($frontendProc.HasExited) {
            Write-Host ""
            Write-Host "  ERROR: Frontend process exited immediately!" -ForegroundColor Red
            Write-Host "  Exit Code: $($frontendProc.ExitCode)" -ForegroundColor Red
            Write-Host ""
            Write-Host "  Please check:" -ForegroundColor Yellow
            Write-Host "  1. Node.js is properly installed" -ForegroundColor Yellow
            Write-Host "  2. Run 'npm install' in the frontend directory" -ForegroundColor Yellow
            Write-Host "  3. Check frontend\package.json has 'dev' script" -ForegroundColor Yellow
            Write-Host ""
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        # Save frontend PID to file for shutdown
        $frontendProc.Id | Out-File -FilePath "$projectRoot\.frontend.pid" -Encoding UTF8
        Write-Host "Frontend started with PID: $($frontendProc.Id)" -ForegroundColor Gray
    }
    catch {
        Write-Host ""
        Write-Host "  ERROR: Failed to start frontend server!" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Troubleshooting steps:" -ForegroundColor Yellow
        Write-Host "  1. Open PowerShell/CMD in frontend folder" -ForegroundColor Yellow
        Write-Host "  2. Run: npm install" -ForegroundColor Yellow
        Write-Host "  3. Run: npm run dev" -ForegroundColor Yellow
        Write-Host "  4. Check for any error messages" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    }
}

# Control-only mode: Open frontend Power tab and exit script immediately (fallback to backend control)
if ($ControlOnly) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  Backend Started in Control-Only Mode!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Backend:        http://localhost:$backendPort" -ForegroundColor Cyan
    Write-Host "  Control Panel (fallback):  http://localhost:$backendPort/control" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Opening Frontend (Power tab) in your browser..." -ForegroundColor Yellow
    Write-Host "  This script will exit. Use the in-app Power tab to manage services." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Tip: Frontend will be started automatically; use the Control Panel to manage it." -ForegroundColor Gray
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    
    # Auto-start the frontend via the control API (idempotent)
    try {
        # Small delay to ensure backend is ready to serve control endpoints
        Start-Sleep -Milliseconds 400
        Invoke-WebRequest -Uri "http://localhost:$backendPort/control/api/start" -Method POST -TimeoutSec 4 -ErrorAction Stop | Out-Null
        Write-Host "  Frontend auto-start requested via Control API" -ForegroundColor Gray
    } catch {
        Write-Host "  Warning: Failed to auto-start frontend (you can start it from the Control Panel)" -ForegroundColor Yellow
    }

    # Try to wait briefly for frontend to become available, then open it
    $tries = 0
    $maxTries = 12 # ~6 seconds
    do {
        Start-Sleep -Milliseconds 500
        try { $frontendRunning = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue } catch { $frontendRunning = $false }
        $tries++
    } while (-not $frontendRunning -and $tries -lt $maxTries)

    if ($frontendRunning) {
        Start-Process "http://localhost:5173/#power"
    } else {
        Write-Host "  Frontend not ready yet, opening backend Control Panel as fallback..." -ForegroundColor Yellow
        Start-Process "http://localhost:$backendPort/control"
    }

    # Exit immediately to keep this mode lightweight
    exit 0
}

# Wait for servers to start
Write-Host "Waiting for servers to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Open browser
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Student Management System Started!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Servers are running in minimized windows." -ForegroundColor Yellow
Write-Host "  Use the Exit button in the app to stop servers." -ForegroundColor Yellow
if ($frontendRunning -and $backendPort -ne 8000) {
    Write-Host "" 
    Write-Host "  WARNING: Frontend was already running and may still target http://localhost:8000" -ForegroundColor Yellow
    Write-Host "  If API calls fail, restart the frontend so it uses VITE_API_URL=http://localhost:$backendPort/api/v1" -ForegroundColor Yellow
}
Write-Host ""

exit 0
