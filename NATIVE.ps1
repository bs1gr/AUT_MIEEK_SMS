<#
.SYNOPSIS
    Student Management System - Native Development Mode

.DESCRIPTION
    Native development script for SMS with hot-reload support. Handles:
    - Python environment setup (venv + dependencies)
    - Node.js environment setup (npm install)
    - Backend (FastAPI with uvicorn --reload)
    - Frontend (Vite dev server with HMR)
    - Process management (start/stop/status)
    - Environment validation

.PARAMETER Start
    Start both backend and frontend in development mode

.PARAMETER Stop
    Stop all native development processes

.PARAMETER Status
    Show status of native processes

.PARAMETER Backend
    Start backend only (FastAPI uvicorn)

.PARAMETER Frontend
    Start frontend only (Vite dev server)

.PARAMETER Setup
    Install/update dependencies for both backend and frontend

.PARAMETER Clean
    Clean all development artifacts (node_modules, .venv, caches)

.PARAMETER Help
    Show this help message

.PARAMETER DevEase
    Optional: set DEV_EASE for services started by this script (relaxes local auth/CSRF/secret checks). Use only for development.
    (Deprecated) Historically NATIVE allowed starting services with a DEV_EASE runtime flag.
    DEV_EASE is now reserved for the pre-commit helper `COMMIT_READY.ps1` only and must not be
    used to change runtime behavior. This parameter is kept here for backward compatibility in the
    help text but does not change process environments.

.EXAMPLE
    .\NATIVE.ps1 -Start
    # Start both backend and frontend
    .EXAMPLE
    .\NATIVE.ps1 -Backend
    # Start backend only

.EXAMPLE
    .\NATIVE.ps1 -Backend
    # Start backend only

.EXAMPLE
    .\NATIVE.ps1 -Setup
    # Install/update dependencies

.EXAMPLE
    .\NATIVE.ps1 -Stop
    # Stop all processes

.NOTES
Version: 1.17.1 (Consolidated from SMS.ps1, run-native.ps1)
    For production deployment, use: .\DOCKER.ps1
#>

[CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='High')]
param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Setup,
    [switch]$Clean,
    [switch]$DeepClean,
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Help,
    [switch]$NoReload  # Optional: start backend without --reload (stability workaround)

)

# ============================================================================
# CONFIGURATION
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$FRONTEND_DIR = Join-Path $SCRIPT_DIR "frontend"
$BACKEND_PID_FILE = Join-Path $SCRIPT_DIR ".backend.pid"
$FRONTEND_PID_FILE = Join-Path $SCRIPT_DIR ".frontend.pid"
$BACKEND_PORT = 8000
$FRONTEND_PORT = 8080  # Changed from 5173 due to Windows permission issues
$MIN_PYTHON_VERSION = [version]"3.11"
$MIN_NODE_VERSION = [version]"18.0"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message, [string]$Color = 'Cyan')
    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Color
    Write-Host "║  $($Message.PadRight(58))  ║" -ForegroundColor $Color
    Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Test-Python {
    try {
        $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
        if (-not $pythonCmd) {
            return $false
        }

        $versionOutput = python --version 2>&1
        if ($versionOutput -match 'Python (\d+\.\d+\.\d+)') {
            $version = [version]$matches[1]
            return $version -ge $MIN_PYTHON_VERSION
        }
        return $false
    } catch {
        return $false
    }
}

function Test-Node {
    try {
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if (-not $nodeCmd) {
            return $false
        }

        $versionOutput = node --version 2>&1
        if ($versionOutput -match 'v(\d+\.\d+\.\d+)') {
            $version = [version]$matches[1]
            return $version -ge $MIN_NODE_VERSION
        }
        return $false
    } catch {
        return $false
    }
}

function Test-PortInUse {
    param([int]$Port)
    try {
        $connections = netstat -ano | Select-String ":$Port" | Where-Object { $_ -match 'LISTENING' }
        return ($null -ne $connections -and $connections.Count -gt 0)
    }
    catch {
        return $false
    }
}

function Try-Install-NodeDeps {
    param([string]$ProjectDir)

    Push-Location $ProjectDir
    try {
        $packageLock = Join-Path $ProjectDir 'package-lock.json'
        if (Test-Path $packageLock) {
            Write-Info "package-lock.json detected → using 'npm ci' for reproducible installs"
            npm ci --no-audit --silent
        } else {
            npm install --silent
        }

        if ($LASTEXITCODE -eq 0) {
            return 0
        }

        # If npm failed, attempt a cleanup of known problematic native binaries and retry once
        Write-Warning "Initial npm install failed. Attempting cleanup of node_modules and retrying..."
        $esbuildPath = Join-Path $ProjectDir 'node_modules\@esbuild'
        if (Test-Path $esbuildPath) {
            try {
                Remove-Item -Path $esbuildPath -Recurse -Force -ErrorAction SilentlyContinue
                Write-Info "Removed: @esbuild native binaries for retry"
            } catch {
                Write-Warning "Could not remove @esbuild folder: $_"
            }
        }

        # Try full removal of node_modules as a last resort
        $nodeModules = Join-Path $ProjectDir 'node_modules'
        if (Test-Path $nodeModules) {
            try {
                Remove-Item -Path $nodeModules -Recurse -Force -ErrorAction SilentlyContinue
                Write-Info "Removed: node_modules for clean retry"
            } catch {
                Write-Warning "Failed to remove node_modules during retry: $_"
            }
        }

        # Retry install using npm install (safer fallback)
        npm install --silent
        return $LASTEXITCODE
    } finally {
        Pop-Location
    }
}

function Get-ProcessFromPidFile {
    param([string]$PidFile)

    if (-not (Test-Path $PidFile)) {
        return $null
    }

    try {
        $pid = [int](Get-Content $PidFile -Raw).Trim()
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        return $process
    } catch {
        return $null
    }
}

function Stop-ProcessFromPidFile {
    param(
        [string]$PidFile,
        [string]$Name
    )

    if (-not (Test-Path $PidFile)) {
        Write-Info "$($Name): Not running (no PID file)"
        return $true
    }

    try {
        $ProcessId = [int](Get-Content $PidFile -Raw).Trim()
        $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

        if (-not $process) {
            Write-Info "$($Name): Process not found (PID $ProcessId), cleaning up"
            Remove-Item $PidFile -Force
            return $true
        }

        Write-Info "$($Name): Stopping process (PID $ProcessId)..."
        try {
            Stop-Process -Id $ProcessId -ErrorAction Stop
        } catch {
            Write-Warning "$($Name): Forcing termination..."
            Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        }

        try {
            Wait-Process -Id $ProcessId -Timeout 10 -ErrorAction SilentlyContinue
        } catch {}

        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        Write-Success "$Name stopped"
        return $true
    } catch {
        Write-Error-Message "$($Name): Failed to stop - $_"
        return $false
    }
}

# ============================================================================
# COMMAND HANDLERS
# ============================================================================

function Show-Help {
    Write-Header "SMS Native Development - Help"
    Write-Host @"
USAGE:
  .\NATIVE.ps1 [COMMAND]

COMMANDS:
  -Start          Start both backend and frontend (default)
  -Stop           Stop all native processes
  -Status         Show status of running processes
  -Backend        Start backend only (FastAPI on port $BACKEND_PORT)
  -Frontend       Start frontend only (Vite on port $FRONTEND_PORT)
  -Setup          Install/update dependencies
  -Clean          Clean development artifacts (node_modules, .venv, caches)
  -DeepClean      Remove ALL artifacts (requires confirmation)
        -DryRun/WhatIf  When used with -DeepClean, list items that would be removed without deleting
    -Force          Skip confirmation prompts and proceed with deletions
  -Help           Show this help message

EXAMPLES:
  .\NATIVE.ps1 -Start        # Start full dev environment
  .\NATIVE.ps1 -Backend      # Start backend only
  .\NATIVE.ps1 -Frontend     # Start frontend only
  .\NATIVE.ps1 -Setup        # Install dependencies
  .\NATIVE.ps1 -Stop         # Stop all processes
  .\NATIVE.ps1 -Clean        # Clean caches and artifacts
  .\NATIVE.ps1 -DeepClean    # Nuclear cleanup (removes node_modules, .venv, etc.)
        .\NATIVE.ps1 -DeepClean -DryRun  # Show what would be deleted without removing anything
        .\NATIVE.ps1 -DeepClean -Force   # Run deep clean without interactive prompt

REQUIREMENTS:
  • Python $MIN_PYTHON_VERSION or higher
  • Node.js $MIN_NODE_VERSION or higher
  • Internet connection (for first-time setup)

DEVELOPMENT FEATURES:
  • Backend: Hot reload with uvicorn --reload
  • Frontend: HMR (Hot Module Replacement) with Vite
  • API: http://localhost:$BACKEND_PORT
  • Web: http://localhost:$FRONTEND_PORT

PORTS:
  Backend:  $BACKEND_PORT
  Frontend: $FRONTEND_PORT

For production deployment, use: .\DOCKER.ps1

"@
}

function Test-Prerequisites {
    Write-Header "Checking Prerequisites"

    $allPassed = $true

    # Check Python
    Write-Host "Python: " -NoNewline
    if (Test-Python) {
        $pythonVersion = python --version 2>&1
        Write-Host "$pythonVersion " -NoNewline -ForegroundColor Green
        Write-Success ""
    } else {
        Write-Error-Message "Python $MIN_PYTHON_VERSION or higher required"
        Write-Info "Download from: https://www.python.org/downloads/"
        $allPassed = $false
    }

    # Check Node.js
    Write-Host "Node.js: " -NoNewline
    if (Test-Node) {
        $nodeVersion = node --version 2>&1
        Write-Host "$nodeVersion " -NoNewline -ForegroundColor Green
        Write-Success ""
    } else {
        Write-Error-Message "Node.js $MIN_NODE_VERSION or higher required"
        Write-Info "Download from: https://nodejs.org/"
        $allPassed = $false
    }

    # Check npm
    Write-Host "npm: " -NoNewline
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCmd) {
        $npmVersion = npm --version 2>&1
        Write-Host "$npmVersion " -NoNewline -ForegroundColor Green
        Write-Success ""
    } else {
        Write-Error-Message "npm not found (should come with Node.js)"
        $allPassed = $false
    }

    return $allPassed
}

function Setup-Environment {
    Write-Header "Setting Up Development Environment"

    if (-not (Test-Prerequisites)) {
        Write-Error-Message "Prerequisites check failed"
        return 1
    }

    # Backend setup
    Write-Host "`n=== Backend Setup ===" -ForegroundColor Yellow
    Push-Location $BACKEND_DIR
    try {
        # Check if venv exists
        $venvPath = Join-Path $BACKEND_DIR ".venv"
        if (-not (Test-Path $venvPath)) {
            Write-Info "Creating Python virtual environment..."
            python -m venv .venv
            if ($LASTEXITCODE -ne 0) {
                Write-Error-Message "Failed to create virtual environment"
                return 1
            }
            Write-Success "Virtual environment created"
        } else {
            Write-Info "Virtual environment exists"
        }

        # Activate venv and install dependencies
        Write-Info "Installing Python dependencies..."
        $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"

        if (-not (Test-Path $activateScript)) {
            Write-Error-Message "Virtual environment activation script not found"
            return 1
        }

        & $activateScript
        python -m pip install --upgrade pip --quiet
        pip install -r requirements.txt --quiet

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Failed to install Python dependencies"
            return 1
        }

        Write-Success "Python dependencies installed"

        # Check .env
        $backendEnv = Join-Path $BACKEND_DIR ".env"
        if (-not (Test-Path $backendEnv)) {
            $backendEnvExample = Join-Path $BACKEND_DIR ".env.example"
            if (Test-Path $backendEnvExample) {
                Copy-Item $backendEnvExample $backendEnv
                Write-Success ".env file created from example"
            } else {
                Write-Warning ".env.example not found, you may need to create .env manually"
            }
        }

    } finally {
        Pop-Location
    }

    # Frontend setup
    Write-Host "`n=== Frontend Setup ===" -ForegroundColor Yellow
    Push-Location $FRONTEND_DIR
    try {
        Write-Info "Installing Node.js dependencies..."

        # Install node deps with retry logic (handles locked native binaries like esbuild)
        $installCode = Try-Install-NodeDeps -ProjectDir $FRONTEND_DIR
        if ($installCode -ne 0) {
            Write-Error-Message "Failed to install Node.js dependencies (exit code: $installCode)"
            return 1
        }

        Write-Success "Node.js dependencies installed"

        # Check .env
        $frontendEnv = Join-Path $FRONTEND_DIR ".env"
        if (-not (Test-Path $frontendEnv)) {
            $frontendEnvExample = Join-Path $FRONTEND_DIR ".env.example"
            if (Test-Path $frontendEnvExample) {
                Copy-Item $frontendEnvExample $frontendEnv
                Write-Success ".env file created from example"
            } else {
                Write-Info "No .env.example found, using defaults"
            }
        }

    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Success "Development environment setup complete!"
    Write-Host ""
    Write-Info "Next: .\NATIVE.ps1 -Start"

    return 0
}

function Start-Backend {
    Write-Header "Starting Backend (FastAPI)"

    # Check if already running
    $process = Get-ProcessFromPidFile -PidFile $BACKEND_PID_FILE
    if ($process) {
        Write-Success "Backend is already running (PID $($process.Id))"
        Write-Info "Port: $BACKEND_PORT"
        return 0
    }

    # Check port
    if (Test-PortInUse -Port $BACKEND_PORT) {
        Write-Error-Message "Port $BACKEND_PORT is already in use"
        Write-Info "Stop the process using the port or change BACKEND_PORT in this script"
        return 1
    }

    # Check venv
    $venvPath = Join-Path $BACKEND_DIR ".venv"
    if (-not (Test-Path $venvPath)) {
        Write-Error-Message "Virtual environment not found"
        Write-Info "Run: .\NATIVE.ps1 -Setup"
        return 1
    }

    if ($NoReload) {
        Write-Info "Starting uvicorn WITHOUT hot-reload (NoReload switch enabled)..."
    } else {
        Write-Info "Starting uvicorn with hot-reload..."
    }

    Push-Location $BACKEND_DIR
    try {

        # Start process in new window
        $pythonExe = Join-Path $venvPath "Scripts\python.exe"
        $uvicornScript = Join-Path $venvPath "Scripts\uvicorn.exe"

        $module = 'backend.main:app'
        if ($PWD -eq $BACKEND_DIR) { $module = 'main:app' }
        $args = @($module, "--host", "127.0.0.1", "--port", $BACKEND_PORT)
        if (-not $NoReload) {
            $args = @($module, "--reload", "--host", "127.0.0.1", "--port", $BACKEND_PORT)
        }
        $processInfo = Start-Process -FilePath $uvicornScript -ArgumentList $args -WorkingDirectory $SCRIPT_DIR -WindowStyle Normal -PassThru

        # Save PID
        Set-Content -Path $BACKEND_PID_FILE -Value $processInfo.Id

        Start-Sleep -Seconds 2

        # Verify process is still running
        if (-not (Get-Process -Id $processInfo.Id -ErrorAction SilentlyContinue)) {
            Write-Error-Message "Backend process exited immediately"
            Remove-Item $BACKEND_PID_FILE -Force -ErrorAction SilentlyContinue
            return 1
        }

        Write-Success "Backend started (PID $($processInfo.Id))"
        Write-Info "API: http://localhost:$BACKEND_PORT"
        Write-Info "Docs: http://localhost:$BACKEND_PORT/docs"
        if ($NoReload) {
            Write-Info "Hot-reload disabled (stable mode). Use CTRL+C in window to stop or .\NATIVE.ps1 -Stop"
        } else {
            Write-Info "Hot-reload enabled"
        }

        return 0
    }
    catch {
        Write-Error-Message "Failed to start backend: $_"
        Remove-Item $BACKEND_PID_FILE -Force -ErrorAction SilentlyContinue
        return 1
    }
    finally {
        Pop-Location
    }
}

function Start-Frontend {
    Write-Header "Starting Frontend (Vite)"

    # Check if already running
    $process = Get-ProcessFromPidFile -PidFile $FRONTEND_PID_FILE
    if ($process) {
        Write-Success "Frontend is already running (PID $($process.Id))"
        Write-Info "Port: $FRONTEND_PORT"
        return 0
    }

    # Check port
    if (Test-PortInUse -Port $FRONTEND_PORT) {
        Write-Error-Message "Port $FRONTEND_PORT is already in use"
        Write-Info "Stop the process using the port or change FRONTEND_PORT in this script"
        return 1
    }

    # Check node_modules
    $nodeModules = Join-Path $FRONTEND_DIR "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Warning "node_modules not found — attempting to install frontend dependencies before starting"

        # Attempt to install automatically (non-interactive). Prefer npm ci when lockfile exists.
        Push-Location $FRONTEND_DIR
        try {
            $packageLock = Join-Path $FRONTEND_DIR 'package-lock.json'
            $installCode = Try-Install-NodeDeps -ProjectDir $FRONTEND_DIR
            if ($installCode -ne 0) {
                Write-Error-Message "Automatic npm install failed. Run: .\NATIVE.ps1 -Setup"
                return 1
            }

            Write-Success "Frontend dependencies installed"
        } finally {
            Pop-Location
        }
    }

    # Validate essential packages that Vite plugins expect (catch missing peer deps)
    $babelCorePath = Join-Path $FRONTEND_DIR 'node_modules\@babel\core'
    if (-not (Test-Path $babelCorePath)) {
        Write-Warning "@babel/core not found in node_modules — attempting to install @babel/core as devDependency"
        Push-Location $FRONTEND_DIR
        try {
            npm install --no-audit --save-dev @babel/core --silent
            if ($LASTEXITCODE -ne 0) {
                Write-Error-Message "Failed to install @babel/core. Please run: npm install in $FRONTEND_DIR"
                return 1
            }
            Write-Success "@babel/core installed"
        } finally {
            Pop-Location
        }
    }

    Write-Info "Starting Vite dev server with HMR..."

    Push-Location $FRONTEND_DIR
    try {

        # Start process in new window
        # Use a PowerShell process to run the npm dev script so the process stays alive
        # (Start-Process npm may spawn child processes and exit immediately).
        # Bind to 0.0.0.0 (all interfaces) to ensure both IPv4 and IPv6 work
        $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
        if ($pwsh) {
            $processInfo = Start-Process -FilePath "pwsh" `
                -ArgumentList "-NoExit", "-Command", "cd '$FRONTEND_DIR'; npm run dev -- --host 127.0.0.1 --port $FRONTEND_PORT" `
                -WindowStyle Normal `
                -PassThru
        } else {
            # Fall back to starting npm directly
            $processInfo = Start-Process -FilePath "npm" `
                -ArgumentList "run", "dev", "--", "--host", "127.0.0.1", "--port", "$FRONTEND_PORT" `
                -WindowStyle Normal `
                -PassThru
        }

        # Save PID
        Set-Content -Path $FRONTEND_PID_FILE -Value $processInfo.Id

        Start-Sleep -Seconds 3

        # Verify process is still running
        if (-not (Get-Process -Id $processInfo.Id -ErrorAction SilentlyContinue)) {
            Write-Error-Message "Frontend process exited immediately"
            Remove-Item $FRONTEND_PID_FILE -Force -ErrorAction SilentlyContinue
            return 1
        }

        Write-Success "Frontend started (PID $($processInfo.Id))"
        Write-Info "Web: http://localhost:$FRONTEND_PORT"
        Write-Info "HMR enabled"

        return 0
    }
        catch {
        Write-Error-Message "Failed to start frontend: $_"
        Remove-Item $FRONTEND_PID_FILE -Force -ErrorAction SilentlyContinue
        return 1
    }
    finally {
        Pop-Location
    }
}

function Stop-All {
    Write-Header "Stopping Native Development Processes"

    $backendStopped = Stop-ProcessFromPidFile -PidFile $BACKEND_PID_FILE -Name "Backend"
    $frontendStopped = Stop-ProcessFromPidFile -PidFile $FRONTEND_PID_FILE -Name "Frontend"

    if ($backendStopped -and $frontendStopped) {
        Write-Host ""
        Write-Success "All processes stopped"
        return 0
    } else {
        Write-Host ""
        Write-Warning "Some processes failed to stop"
        return 1
    }
}

function Show-Status {
    Write-Header "Native Development Status"

    # Backend status
    Write-Host "Backend: " -NoNewline
    $backendProcess = Get-ProcessFromPidFile -PidFile $BACKEND_PID_FILE
    if ($backendProcess) {
        Write-Host "Running ✅ " -ForegroundColor Green -NoNewline
        Write-Host "(PID $($backendProcess.Id))" -ForegroundColor Gray
        Write-Host "  API:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
        Write-Host "  Docs: http://localhost:$BACKEND_PORT/docs" -ForegroundColor Cyan
    } else {
        Write-Host "Not running ❌" -ForegroundColor Red
    }

    # Frontend status
    Write-Host "`nFrontend: " -NoNewline
    $frontendProcess = Get-ProcessFromPidFile -PidFile $FRONTEND_PID_FILE
    if ($frontendProcess) {
        Write-Host "Running ✅ " -ForegroundColor Green -NoNewline
        Write-Host "(PID $($frontendProcess.Id))" -ForegroundColor Gray
        Write-Host "  Web: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
    } else {
        Write-Host "Not running ❌" -ForegroundColor Red
    }

    Write-Host ""

    if (-not $backendProcess -and -not $frontendProcess) {
        Write-Info "To start: .\NATIVE.ps1 -Start"
    }

    return 0
}

function Clean-Environment {
    Write-Header "Cleaning Development Environment"

    Write-Warning "This will remove:"
    Write-Host "  • Backend: .venv, __pycache__, .pytest_cache" -ForegroundColor Yellow
    Write-Host "  • Frontend: node_modules, dist" -ForegroundColor Yellow
    Write-Host "  • Logs and caches" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Info "Cleanup cancelled"
        return 0
    }

    # Stop processes first
    Stop-All | Out-Null

    Write-Host ""
    Write-Info "Cleaning backend..."
    Push-Location $BACKEND_DIR
    try {
        $items = @(".venv", "__pycache__", ".pytest_cache", "*.pyc")
        foreach ($item in $items) {
            if (Test-Path $item) {
                Remove-Item $item -Recurse -Force -ErrorAction SilentlyContinue
                Write-Success "Removed: $item"
            }
        }
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Info "Cleaning frontend..."
    Push-Location $FRONTEND_DIR
    try {
        $items = @("node_modules", "dist", ".vite")
        foreach ($item in $items) {
            if (Test-Path $item) {
                Remove-Item $item -Recurse -Force -ErrorAction SilentlyContinue
                Write-Success "Removed: $item"
            }
        }
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Success "Cleanup complete!"
    Write-Info "Run .\NATIVE.ps1 -Setup to reinstall dependencies"

    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if ($Help) {
    Show-Help
    exit 0
}

if ($Setup) {
    $code = Setup-Environment
    exit $code
}

if ($Clean) {
    $code = Clean-Environment
    exit $code
}

if ($Status) {
    $code = Show-Status
    exit $code
}

if ($Stop) {
    $code = Stop-All
    exit $code
}

if ($Backend) {
    # Check if dependencies are installed
    $venvPath = Join-Path $BACKEND_DIR ".venv"
    if (-not (Test-Path $venvPath)) {
        Write-Warning "Backend dependencies not installed"
        Write-Info "Running setup first..."
        $setupCode = Setup-Environment
        if ($setupCode -ne 0) {
            exit $setupCode
        }
    }

    $code = Start-Backend
    exit $code
}

if ($Frontend) {
    # Check if dependencies are installed
    $nodeModules = Join-Path $FRONTEND_DIR "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Warning "Frontend dependencies not installed"
        Write-Info "Running setup first..."
        $setupCode = Setup-Environment
        if ($setupCode -ne 0) {
            exit $setupCode
        }
    }

    $code = Start-Frontend
    exit $code
}

# Default: Start both
if ($Start -or (-not $Stop -and -not $Status -and -not $Backend -and -not $Frontend -and -not $Setup -and -not $Clean -and -not $DeepClean)) {
    # Check if dependencies are installed
    $venvPath = Join-Path $BACKEND_DIR ".venv"
    $nodeModules = Join-Path $FRONTEND_DIR "node_modules"

    if (-not (Test-Path $venvPath) -or -not (Test-Path $nodeModules)) {
        Write-Warning "Dependencies not fully installed"
        Write-Info "Running setup first..."
        Write-Host ""
        $setupCode = Setup-Environment
        if ($setupCode -ne 0) {
            exit $setupCode
        }
        Write-Host ""
    }

    # Start backend
    $backendCode = Start-Backend
    if ($backendCode -ne 0) {
        Write-Error-Message "Failed to start backend"
        exit $backendCode
    }

    Write-Host ""

    # Start frontend
    $frontendCode = Start-Frontend
    if ($frontendCode -ne 0) {
        Write-Error-Message "Failed to start frontend"
        Write-Info "Stopping backend..."
        Stop-ProcessFromPidFile -PidFile $BACKEND_PID_FILE -Name "Backend" | Out-Null
        exit $frontendCode
    }

    # Show access info
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║          🎉 Native Development Mode Running! 🎉              ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Backend:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
    Write-Host "  Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
    Write-Host "  API Docs: http://localhost:$BACKEND_PORT/docs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Features:" -ForegroundColor Yellow
    Write-Host "    • Backend hot-reload (uvicorn --reload)" -ForegroundColor White
    Write-Host "    • Frontend HMR (Vite dev server)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Quick Commands:" -ForegroundColor Yellow
    Write-Host "    .\NATIVE.ps1 -Stop    → Stop all processes" -ForegroundColor White
    Write-Host "    .\NATIVE.ps1 -Status  → Check status" -ForegroundColor White
    Write-Host ""

    exit 0
}

# ============================================================================
# DEEP CLEAN
# ============================================================================

if ($DeepClean) {
    Write-Header "Deep Clean - Removing ALL Development Artifacts"

    Write-Warning "This will remove:"
    Write-Host "  • Python virtual environments (.venv, .venv_*)" -ForegroundColor Yellow
    Write-Host "  • Node.js dependencies (node_modules)" -ForegroundColor Yellow
    Write-Host "  • Build artifacts (dist/, build/, .next/)" -ForegroundColor Yellow
    Write-Host "  • Python caches (.mypy_cache, .ruff_cache, __pycache__)" -ForegroundColor Yellow
    Write-Host "  • pytest artifacts (tmp_test_migrations/, .pytest_cache)" -ForegroundColor Yellow
    Write-Host "  • Log files (*.log)" -ForegroundColor Yellow
    Write-Host "  • PID files (.backend.pid, .frontend.pid)" -ForegroundColor Yellow
    Write-Host "  • Temp directories (temp_export_*)" -ForegroundColor Yellow
    Write-Host ""
    Write-Warning "Your data/ and backups/ directories will be PRESERVED"
    Write-Host ""

    # If this is a dry-run, list matching items and exit without deleting
    # Support both our -DryRun switch and PowerShell's built-in -WhatIf common parameter
    if ($DryRun -or $PSBoundParameters.ContainsKey('WhatIf')) {
        Write-Info "Dry run: listing items that would be removed (no deletions will be performed)"

        # Build a local list of patterns to preview (keeps dry-run independent of later variables)
        $previewItems = @(
            ".venv", ".venv_*", ".venv_backend_tests", ".venv_audit",
            "frontend/node_modules", "node_modules", "frontend/dist", "dist",
            "build", ".next", "rewrite-preview-local",
            ".mypy_cache", ".ruff_cache", ".pytest_cache",
            "backend/__pycache__", "backend/.pytest_cache",
            "tmp_test_migrations", "backend/tmp_test_migrations",
            "*.log", "backend/*.log", "frontend/*.log",
            "backend_dev_*.log", "frontend_dev_*.log",
            ".backend.pid", ".frontend.pid", "temp_export_*"
        )

        foreach ($pattern in $previewItems) {
            $fullPattern = Join-Path $SCRIPT_DIR $pattern
            if ($pattern -like "*`*") {
                $parent = Split-Path $fullPattern -Parent
                $leaf = Split-Path $fullPattern -Leaf
                if (Test-Path $parent) {
                    Get-ChildItem -Path $parent -Filter $leaf -ErrorAction SilentlyContinue | ForEach-Object {
                        if ($_ -is [System.IO.FileSystemInfo]) { Write-Host $_.FullName } else { Write-Host ([string]$_) }
                    }
                }
            }
            else {
                if (Test-Path $fullPattern) {
                    Get-ChildItem -Path $fullPattern -ErrorAction SilentlyContinue | ForEach-Object {
                        if ($_ -is [System.IO.FileSystemInfo]) { Write-Host $_.FullName } else { Write-Host ([string]$_) }
                    }
                }
            }
        }

        # Show nested __pycache__ directories
        Get-ChildItem -Path $BACKEND_DIR -Recurse -Filter "__pycache__" -Directory -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.FullName }

        Write-Info "Dry run complete. No files were deleted."
        exit 0
    }

    # Use PowerShell's ShouldProcess/Confirm semantics unless forced
    if (-not $Force) {
        if (-not $PSCmdlet.ShouldProcess("Development artifacts", "Remove all listed patterns")) {
            Write-Info "Deep clean cancelled"
            exit 0
        }
    } else {
        Write-Info "Force flag provided: skipping interactive confirmation."
    }

    # Stop processes first
    Write-Info "Stopping all native processes..."
    Stop-ProcessFromPidFile -PidFile $BACKEND_PID_FILE -Name "Backend" | Out-Null
    Stop-ProcessFromPidFile -PidFile $FRONTEND_PID_FILE -Name "Frontend" | Out-Null

    $itemsToRemove = @(
        ".venv", ".venv_*", ".venv_backend_tests", ".venv_audit",
        "frontend/node_modules", "node_modules", "frontend/dist", "dist",
        "build", ".next", "rewrite-preview-local",
        ".mypy_cache", ".ruff_cache", ".pytest_cache",
        "backend/__pycache__", "backend/.pytest_cache",
        "tmp_test_migrations", "backend/tmp_test_migrations",
        "*.log", "backend/*.log", "frontend/*.log",
        "backend_dev_*.log", "frontend_dev_*.log",
        ".backend.pid", ".frontend.pid", "temp_export_*"
    )

    $removedCount = 0

    foreach ($pattern in $itemsToRemove) {
        $fullPattern = Join-Path $SCRIPT_DIR $pattern

        if ($pattern -like "*`*") {
            # Wildcard pattern
            $parent = Split-Path $fullPattern -Parent
            $leaf = Split-Path $fullPattern -Leaf

            if (Test-Path $parent) {
                Get-ChildItem -Path $parent -Filter $leaf -ErrorAction SilentlyContinue | ForEach-Object {
                    $item = $_
                    try {
                        # Determine path to remove and a user-friendly display name
                        if ($item -is [System.IO.FileSystemInfo]) {
                            $itemPath = $item.FullName
                            $displayName = $item.Name
                        } else {
                            # Fallback: item might be a string path
                            $itemPath = [string]$item
                            $displayName = Split-Path -Path $itemPath -Leaf
                        }

                        if (Test-Path $itemPath) {
                            Remove-Item -Path $itemPath -Recurse -Force -ErrorAction Stop
                            Write-Success "Removed: $displayName"
                            $removedCount++
                        } else {
                            Write-Warning "Path not found (skipped): $displayName"
                        }
                    }
                    catch {
                        Write-Warning "Failed to remove: $displayName"
                    }
                }
            }
        }
        else {
            # Direct path
            if (Test-Path $fullPattern) {
                try {
                    Remove-Item -Path $fullPattern -Recurse -Force -ErrorAction Stop
                    Write-Success "Removed: $pattern"
                    $removedCount++
                }
                catch {
                    Write-Warning "Failed to remove: $pattern"
                }
            }
        }
    }

    # Remove nested __pycache__ directories
    Get-ChildItem -Path $BACKEND_DIR -Recurse -Filter "__pycache__" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction Stop
            Write-Success "Removed: $($_.FullName -replace [regex]::Escape($BACKEND_DIR), 'backend')"
            $removedCount++
        }
        catch {
            Write-Warning "Failed to remove: $($_.FullName)"
        }
    }

    Write-Host ""
    Write-Header "Deep Clean Complete"
    Write-Success "Removed $removedCount item(s)"
    Write-Host ""
    Write-Info "To reinstall dependencies, run: .\NATIVE.ps1 -Setup"

    exit 0
}

# If no command specified, show help
Show-Help
exit 0
