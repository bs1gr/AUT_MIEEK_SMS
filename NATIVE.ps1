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
Version: 1.18.3 (Consolidated from SMS.ps1, run-native.ps1)
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
$BACKEND_FALLBACK_PORT = 8001
$FRONTEND_PORT = 5173  # Use standard Vite port (do not override - vite.config.ts sets this)
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

function Test-HealthEndpointReachable {
    param(
        [int]$Port,
        [int]$TimeoutSec = 3
    )

    try {
        $uri = "http://127.0.0.1:$Port/health"
        $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec $TimeoutSec -ErrorAction Stop
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    }
    catch {
        return $false
    }
}

function Invoke-FallbackPortDiagnostic {
    param(
        [string]$Phase = "startup",
        [switch]$HardFail
    )

    $fallbackReachable = Test-HealthEndpointReachable -Port $BACKEND_FALLBACK_PORT -TimeoutSec 3
    if (-not $fallbackReachable) {
        return $false
    }

    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  🚨 CRITICAL NATIVE DIAGNOSTIC: PORT 8001 IS REACHABLE 🚨    ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host "⚠️  Phase: $Phase" -ForegroundColor Yellow
    Write-Host "⚠️  Detected reachable endpoint: http://127.0.0.1:$BACKEND_FALLBACK_PORT/health" -ForegroundColor Yellow
    Write-Host "⚠️  This can cause split-runtime behavior and stale report generation paths." -ForegroundColor Yellow
    Write-Host "⚠️  Recommended immediate action: .\NATIVE.ps1 -Stop, then ensure port 8001 is not reachable." -ForegroundColor Yellow

    try {
        $listeners = Get-NetTCPConnection -LocalPort $BACKEND_FALLBACK_PORT -State Listen -ErrorAction SilentlyContinue
        if ($listeners) {
            $pids = @($listeners | Where-Object { $_.OwningProcess -gt 0 } | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique)
            if ($pids.Count -gt 0) {
                Write-Host "⚠️  Listener PID candidates on port ${BACKEND_FALLBACK_PORT}: $($pids -join ', ')" -ForegroundColor Yellow
            }
        }
    }
    catch {
        Write-Warning "Could not enumerate listener PIDs on port $BACKEND_FALLBACK_PORT"
    }

    if ($HardFail -and $env:SMS_NATIVE_ALLOW_8001_REACHABLE -ne '1') {
        Write-Error-Message "Startup blocked: fallback port $BACKEND_FALLBACK_PORT is reachable."
        Write-Info "Set SMS_NATIVE_ALLOW_8001_REACHABLE=1 only if you intentionally accept split-runtime risk."
        return $true
    }

    return $false
}

function Show-FallbackGuardRecovery {
    param([string]$Stage = "startup")

    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║   STARTUP BLOCKED: FALLBACK PORT SAFETY GUARD (8001)       ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host "⚠️  Stage: $Stage" -ForegroundColor Yellow
    Write-Host "⚠️  Reason: port $BACKEND_FALLBACK_PORT is reachable and can cause split-runtime behavior." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recovery steps:" -ForegroundColor Cyan
    Write-Host "  1) Run: .\NATIVE.ps1 -Stop" -ForegroundColor White
    Write-Host "  2) Ensure no listener remains on port $BACKEND_FALLBACK_PORT" -ForegroundColor White
    Write-Host "  3) Retry: .\NATIVE.ps1 -Start" -ForegroundColor White
    Write-Host ""
    Write-Host "Override (only if intentional):" -ForegroundColor Cyan
    Write-Host "  Set SMS_NATIVE_ALLOW_8001_REACHABLE=1 and rerun startup." -ForegroundColor White
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

        # Passive mode on Windows: avoid executing node.exe for routine checks
        # to prevent popup crashes on unstable local installations.
        if ($IsWindows -and $env:SMS_NATIVE_ALLOW_ACTIVE_BINARY_PROBES -ne '1') {
            return $true
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

    function Get-ListeningPids {
        param([int]$TargetPort)

        $pids = @()

        try {
            $listeners = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
            if ($listeners) {
                $pids += ($listeners | Where-Object { $_.OwningProcess -gt 0 } | Select-Object -ExpandProperty OwningProcess)
            }
        }
        catch {
            # Fall through to netstat fallback
        }

        # Fallback for environments where Get-NetTCPConnection intermittently misses listeners
        if (-not $pids -or $pids.Count -eq 0) {
            try {
                $lines = netstat -ano | Select-String ":$TargetPort" | Where-Object { $_ -match 'LISTENING' }
                foreach ($line in $lines) {
                    $text = ($line.ToString() -replace '^\s+', '')
                    $parts = $text -split '\s+'
                    if ($parts.Length -lt 5) {
                        continue
                    }

                    $pidText = $parts[-1]
                    $parsedPid = 0
                    if ([int]::TryParse($pidText, [ref]$parsedPid) -and $parsedPid -gt 0) {
                        $pids += $parsedPid
                    }
                }
            }
            catch {
                # ignore fallback failures
            }
        }

        return @($pids | Sort-Object -Unique)
    }

    try {
        $listeningPids = Get-ListeningPids -TargetPort $Port
        return ($null -ne $listeningPids -and $listeningPids.Count -gt 0)
    }
    catch {
        return $false
    }
}

function Test-Npm {
    try {
        $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
        if (-not $npmCmd) {
            return $false
        }

        # Passive mode on Windows: detect command presence without executing npm.
        if ($IsWindows -and $env:SMS_NATIVE_ALLOW_ACTIVE_BINARY_PROBES -ne '1') {
            return $true
        }

        $versionOutput = npm --version 2>&1
        return -not [string]::IsNullOrWhiteSpace("$versionOutput")
    } catch {
        return $false
    }
}

function Stop-BackendUvicornBySignature {
    <#
    .SYNOPSIS
    Stop stale backend uvicorn processes by command-line signature
    .DESCRIPTION
    Some Windows environments can leave listeners bound to port 8000 where PID
    lookups intermittently fail. This helper targets python processes whose
    command line matches the backend uvicorn entrypoint and force-terminates
    them (including child processes) to prevent stale code paths.
    #>
    param([switch]$Quiet)

    $killedCount = 0

    try {
        $candidates = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -ieq 'python.exe' -and
            $_.CommandLine -and
            $_.CommandLine -match 'uvicorn\s+backend\.main:app'
        }

        foreach ($candidate in $candidates) {
            $targetPid = [int]$candidate.ProcessId
            if ($targetPid -le 0) {
                continue
            }

            try {
                cmd /c "taskkill /PID $targetPid /F /T" 2>$null | Out-Null
                $killedCount++
                if (-not $Quiet) {
                    Write-Info "Stopped stale backend uvicorn process (PID $targetPid)"
                }
            }
            catch {
                if (-not $Quiet) {
                    Write-Warning "Failed to stop stale backend uvicorn process (PID $targetPid)"
                }
            }
        }
    }
    catch {
        if (-not $Quiet) {
            Write-Warning "Could not enumerate backend uvicorn processes by signature: $_"
        }
    }

    if ($killedCount -gt 0) {
        Start-Sleep -Milliseconds 500
    }

    return $killedCount
}

function Enable-NativeProcessGuards {
    <#
    .SYNOPSIS
    Apply Windows native-runtime guards for child processes
    .DESCRIPTION
    Masks Docker CLI from PATH by default in native mode to prevent disruptive
    docker.exe popup crashes when local Docker Desktop binaries are broken.
    Opt-out by setting SMS_NATIVE_BLOCK_DOCKER_CLI=0 before running NATIVE.ps1.
    #>

    if (-not $IsWindows) {
        return
    }

    if ($env:SMS_NATIVE_BLOCK_DOCKER_CLI -eq '0') {
        return
    }

    try {
        $originalPath = $env:Path
        $segments = $originalPath -split ';'
        $filtered = @()
        foreach ($segment in $segments) {
            if ([string]::IsNullOrWhiteSpace($segment)) {
                continue
            }

            if ($segment -match '(?i)\\Docker(\\|$)' -or $segment -match '(?i)Docker Desktop') {
                continue
            }

            $filtered += $segment
        }

        $env:Path = ($filtered -join ';')
        $env:SMS_CONTROL_ALLOW_ACTIVE_BINARY_PROBES = '0'
        $env:SMS_NATIVE_ALLOW_ACTIVE_BINARY_PROBES = '0'
        $env:SMS_NATIVE_BLOCK_DOCKER_CLI = '1'

        Write-Info 'Native guard active: Docker CLI masked for child processes (set SMS_NATIVE_BLOCK_DOCKER_CLI=0 to opt out)'
    }
    catch {
        Write-Warning "Failed to apply native Docker CLI guard: $_"
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

        # Kill entire process tree (parent + children) to ensure clean shutdown
        try {
            # Get all child processes recursively
            $childProcesses = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId }

            # Kill children first
            foreach ($child in $childProcesses) {
                try {
                    Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
                } catch {
                    # Ignore errors for child processes that already exited
                }
            }

            # Kill the main process
            Stop-Process -Id $ProcessId -Force -ErrorAction Stop

            # Close the console window if it still exists
            try {
                $mainWindow = (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue).MainWindowHandle
                if ($mainWindow -and $mainWindow -ne 0) {
                    # Send WM_CLOSE message to close the window gracefully
                    Add-Type @"
                        using System;
                        using System.Runtime.InteropServices;
                        public class Win32 {
                            [DllImport("user32.dll")]
                            public static extern bool PostMessage(IntPtr hWnd, uint Msg, int wParam, int lParam);
                            public const uint WM_CLOSE = 0x0010;
                        }
"@
                    [Win32]::PostMessage($mainWindow, 0x0010, 0, 0) | Out-Null
                }
            } catch {
                # Window already closed or doesn't exist - ignore
            }
        } catch {
            # If force kill fails, try one more time
            try {
                Stop-Process -Id $ProcessId -Force -ErrorAction Stop
            } catch {
                # Process might have already exited
            }
        }

        # Wait for process to exit
        try {
            Wait-Process -Id $ProcessId -Timeout 5 -ErrorAction SilentlyContinue
        } catch {}

        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        Write-Success "$Name stopped"
        return $true
    } catch {
        Write-Error-Message "$($Name): Failed to stop - $_"
        return $false
    }
}

function Stop-ProcessByPort {
    param(
        [int]$Port,
        [string]$Name
    )

    try {
        $targetPids = @()

        try {
            $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if ($listeners) {
                $targetPids += ($listeners | Where-Object { $_.OwningProcess -gt 0 } | Select-Object -ExpandProperty OwningProcess)
            }
        }
        catch {
            # Fall through to netstat fallback
        }

        if (-not $targetPids -or $targetPids.Count -eq 0) {
            try {
                $lines = netstat -ano | Select-String ":$Port" | Where-Object { $_ -match 'LISTENING' }
                foreach ($line in $lines) {
                    $text = ($line.ToString() -replace '^\s+', '')
                    $parts = $text -split '\s+'
                    if ($parts.Length -lt 5) {
                        continue
                    }

                    $pidText = $parts[-1]
                    $parsedPid = 0
                    if ([int]::TryParse($pidText, [ref]$parsedPid) -and $parsedPid -gt 0) {
                        $targetPids += $parsedPid
                    }
                }
            }
            catch {
                # Ignore fallback errors
            }
        }

        $targetPids = @($targetPids | Sort-Object -Unique)

        if (-not $targetPids -or $targetPids.Count -eq 0) {
            return $true
        }

        $allStopped = $true

        foreach ($targetPid in $targetPids) {
            $process = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if (-not $process) {
                Write-Warning "$($Name): Port $Port is in use by PID $targetPid, but process is unresolved. Attempting taskkill fallback..."
                cmd /c "taskkill /PID $targetPid /F /T" 2>$null | Out-Null
                Start-Sleep -Milliseconds 300
                continue
            }

            Write-Info "$($Name): Stopping process on port $Port (PID $targetPid)..."

            # Kill entire process tree (parent + children) to ensure clean shutdown
            try {
                # Get all child processes recursively
                $childProcesses = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $targetPid }

                # Kill children first
                foreach ($child in $childProcesses) {
                    try {
                        Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
                    } catch {
                        # Ignore errors for child processes that already exited
                    }
                }

                # Kill the main process
                Stop-Process -Id $targetPid -Force -ErrorAction Stop

                # Close the console window if it still exists
                try {
                    $mainWindow = (Get-Process -Id $targetPid -ErrorAction SilentlyContinue).MainWindowHandle
                    if ($mainWindow -and $mainWindow -ne 0) {
                        # Win32 type already defined in Stop-ProcessFromPidFile, so just use it
                        try {
                            [Win32]::PostMessage($mainWindow, 0x0010, 0, 0) | Out-Null
                        } catch {
                            # Type not defined yet - ignore, will be defined on first call to Stop-ProcessFromPidFile
                        }
                    }
                } catch {
                    # Window already closed or doesn't exist - ignore
                }
            }
            catch {
                # If force kill fails, try one more time
                try {
                    Stop-Process -Id $targetPid -Force -ErrorAction Stop
                } catch {
                    # Process might have already exited
                }
            }

            try {
                Wait-Process -Id $targetPid -Timeout 5 -ErrorAction SilentlyContinue
            }
            catch {
                # ignore wait errors
            }

            # Verify this PID is no longer active
            try {
                $stillAlive = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                if ($stillAlive) {
                    $allStopped = $false
                }
            } catch {
                # Process no longer present (expected)
            }
        }

        Start-Sleep -Milliseconds 300
        if (Test-PortInUse -Port $Port) {
            Write-Warning "$($Name): Port $Port still busy after initial stop attempt; running aggressive listener cleanup..."

            $released = $false
            for ($attempt = 1; $attempt -le 6; $attempt++) {
                $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
                if (-not $listeners) {
                    $released = $true
                    break
                }

                $activePids = @($listeners | Where-Object { $_.OwningProcess -gt 0 } | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique)
                if (-not $activePids -or $activePids.Count -eq 0) {
                    Start-Sleep -Milliseconds 250
                    continue
                }

                foreach ($activePid in $activePids) {
                    try {
                        cmd /c "taskkill /PID $activePid /F /T" 2>$null | Out-Null
                    }
                    catch {
                        # best effort; retry loop handles churn
                    }
                }

                Start-Sleep -Milliseconds 400
            }

            if (-not $released -and (Test-PortInUse -Port $Port)) {
                Write-Warning "$($Name): Port $Port remains in use after aggressive cleanup"
                return $false
            }
        }

        if ($allStopped) {
            Write-Success "$Name stopped (port $Port)"
        } else {
            Write-Warning "${Name}: some listener processes required fallback handling, but port was released"
        }
        return $true
    } catch {
        Write-Warning "$($Name): Failed to stop process on port $Port - $_"
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
        $nodeVersion = $null
        if (-not ($IsWindows -and $env:SMS_NATIVE_ALLOW_ACTIVE_BINARY_PROBES -ne '1')) {
            $nodeVersion = node --version 2>&1
        }

        if ($nodeVersion) {
            Write-Host "$nodeVersion " -NoNewline -ForegroundColor Green
        } else {
            Write-Host "detected (passive) " -NoNewline -ForegroundColor Green
        }
        Write-Success ""
    } else {
        Write-Error-Message "Node.js $MIN_NODE_VERSION or higher required"
        Write-Info "Download from: https://nodejs.org/"
        $allPassed = $false
    }

    # Check npm
    Write-Host "npm: " -NoNewline
    if (Test-Npm) {
        $npmVersion = $null
        if (-not ($IsWindows -and $env:SMS_NATIVE_ALLOW_ACTIVE_BINARY_PROBES -ne '1')) {
            $npmVersion = npm --version 2>&1
        }

        if ($npmVersion) {
            Write-Host "$npmVersion " -NoNewline -ForegroundColor Green
        } else {
            Write-Host "detected (passive) " -NoNewline -ForegroundColor Green
        }
        Write-Success ""
    } else {
        Write-Error-Message "npm not found (should come with Node.js)"
        $allPassed = $false
    }

    return $allPassed
}

function Test-VenvHealth {
    <#
    .SYNOPSIS
    Test if virtual environment is healthy
    .DESCRIPTION
    Checks for corrupt venv (missing python.exe, pyvenv.cfg, etc.)
    #>
    param([string]$VenvPath)

    if (-not (Test-Path $VenvPath)) {
        return $false
    }

    # Check critical venv files
    $pythonExe = Join-Path $VenvPath "Scripts\python.exe"
    $pyvenvCfg = Join-Path $VenvPath "pyvenv.cfg"
    $activateScript = Join-Path $VenvPath "Scripts\Activate.ps1"

    if (-not (Test-Path $pythonExe)) {
        Write-Warning "Missing python.exe in venv"
        return $false
    }

    if (-not (Test-Path $pyvenvCfg)) {
        Write-Warning "Missing pyvenv.cfg in venv"
        return $false
    }

    if (-not (Test-Path $activateScript)) {
        Write-Warning "Missing Activate.ps1 in venv"
        return $false
    }

    return $true
}

function Remove-VenvForced {
    <#
    .SYNOPSIS
    Forcefully remove virtual environment even if corrupted/locked
    .DESCRIPTION
    Uses multiple strategies to remove locked files (handles locked pyd, so, dll)
    #>
    param([string]$VenvPath)

    if (-not (Test-Path $VenvPath)) {
        return 0
    }

    Write-Info "Force-removing virtual environment at: $VenvPath"

    # Strategy 1: Direct removal (works for most cases)
    try {
        Remove-Item -Path $VenvPath -Recurse -Force -ErrorAction Stop
        Write-Success "Virtual environment removed"
        return 0
    }
    catch {
        Write-Warning "Direct removal failed: $_"
    }

    # Strategy 2: Use attrib to remove read-only flags, then remove
    Write-Info "Attempting with attrib -r flag..."
    try {
        cmd /c attrib -r "$VenvPath\*" /s /d 2>&1 | Out-Null
        Remove-Item -Path $VenvPath -Recurse -Force -ErrorAction Stop
        Write-Success "Virtual environment removed (via attrib)"
        return 0
    }
    catch {
        Write-Warning "Attrib removal failed: $_"
    }

    # Strategy 3: Remove subdirectories one by one (handles locked files better)
    Write-Info "Attempting granular removal..."
    try {
        Get-ChildItem -Path $VenvPath -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
            catch {
                # Silent - some files might still be locked
            }
        }

        # Remove remaining files
        Get-ChildItem -Path $VenvPath -File -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
            }
            catch {
                # Silent - some files might still be locked
            }
        }

        # Remove root directory
        Remove-Item -Path $VenvPath -Recurse -Force -ErrorAction SilentlyContinue

        # Verify it's gone
        if (-not (Test-Path $VenvPath)) {
            Write-Success "Virtual environment removed (via granular removal)"
            return 0
        }
        else {
            Write-Warning "Some files remain in venv directory (likely still locked)"
            Write-Info "Venv may need manual cleanup - consider restart if persistent"
            return 1
        }
    }
    catch {
        Write-Warning "Granular removal failed: $_"
        return 1
    }
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
        # Check if venv exists and is healthy
        $venvPath = Join-Path $BACKEND_DIR ".venv"
        $venvHealthy = Test-VenvHealth -VenvPath $venvPath

        if (Test-Path $venvPath) {
            if ($venvHealthy) {
                Write-Info "Virtual environment exists and is healthy"
            } else {
                Write-Warning "Virtual environment is corrupted"
                Write-Info "Removing corrupted venv..."
                $removeResult = Remove-VenvForced -VenvPath $venvPath
                if ($removeResult -ne 0) {
                    Write-Warning "Could not fully remove corrupted venv"
                    Write-Warning "Please restart your terminal or computer if venv creation fails"
                }
                # Mark for recreation
                $venvHealthy = $false
            }
        } else {
            $venvHealthy = $false
        }

        # Create or recreate venv
        if (-not $venvHealthy) {
            Write-Info "Creating Python virtual environment..."
            python -m venv .venv
            if ($LASTEXITCODE -ne 0) {
                Write-Error-Message "Failed to create virtual environment"
                Write-Info "Venv creation failed. This may indicate:"
                Write-Info "  • Python executable is locked (try restarting terminal)"
                Write-Info "  • Disk space issues"
                Write-Info "  • Permission problems"
                return 1
            }
            Write-Success "Virtual environment created"
        }

        # Verify activation script exists before trying to use it
        $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
        if (-not (Test-Path $activateScript)) {
            Write-Error-Message "Virtual environment activation script not found"
            Write-Info "This indicates incomplete venv creation"
            return 1
        }

        # Activate venv and install dependencies
        Write-Info "Installing Python dependencies..."
        & $activateScript

        python -m pip install --upgrade pip --quiet
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Failed to upgrade pip"
            return 1
        }

        pip install -r requirements.txt --quiet
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Failed to install Python dependencies"
            Write-Info "Check requirements.txt for syntax errors or invalid packages"
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

    if (Invoke-FallbackPortDiagnostic -Phase "pre-backend-start" -HardFail) {
        return 1
    }

    # Check if already running
    $process = Get-ProcessFromPidFile -PidFile $BACKEND_PID_FILE
    if ($process) {
        Write-Success "Backend is already running (PID $($process.Id))"
        Write-Info "Port: $BACKEND_PORT"
        return 0
    }

    # Proactively clear stale uvicorn workers that can survive PID-file cleanup
    # and keep serving old code paths on port 8000.
    $staleKilled = Stop-BackendUvicornBySignature -Quiet
    if ($staleKilled -gt 0) {
        Write-Info "Cleared $staleKilled stale backend worker(s) by signature before startup"
    }

    $targetBackendPort = $BACKEND_PORT

    # Check port
    if (Test-PortInUse -Port $targetBackendPort) {
        Write-Warning "Port $targetBackendPort is in use. Attempting automatic cleanup..."
        $recovered = Stop-ProcessByPort -Port $targetBackendPort -Name "Backend"
        Start-Sleep -Milliseconds 500
        if ((-not $recovered) -or (Test-PortInUse -Port $targetBackendPort)) {
            Write-Error-Message "Port $BACKEND_PORT remains busy"
            Write-Info "Native mode now enforces a single canonical backend port (8000) to avoid split runtime behavior"
            Write-Info "Run .\NATIVE.ps1 -Stop and retry, or free port 8000 manually"
            return 1
        }

        Write-Success "Recovered port $targetBackendPort"
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

        # Always use backend.main:app since WorkingDirectory is $SCRIPT_DIR (project root)
        $module = 'backend.main:app'
        $args = @($module, "--host", "127.0.0.1", "--port", $targetBackendPort)
        if (-not $NoReload) {
            $args = @($module, "--reload", "--host", "127.0.0.1", "--port", $targetBackendPort)
        }

        # Set PYTHONPATH and SMS environment variables for the backend process
        $env:PYTHONPATH = $SCRIPT_DIR
        $env:SMS_PROJECT_ROOT = $SCRIPT_DIR
        $env:SMS_EXECUTION_MODE = "native"
        $env:SMS_ENFORCE_BACKEND_ENV_DB = "1"

        # Ensure Node.js directory is present in PATH for backend diagnostics
        # (nvm4w setups can be missing from child process PATH in some shells).
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCommand -and $nodeCommand.Source) {
            $nodeDir = Split-Path -Parent $nodeCommand.Source
            if ($nodeDir -and -not (($env:Path -split ';') -contains $nodeDir)) {
                $env:Path = "$nodeDir;$env:Path"
            }
        }

        # Apply child-process safety guards for native mode on Windows.
        Enable-NativeProcessGuards

        # Force DATABASE_URL from backend/.env in native mode to avoid accidental
        # process/session overrides that can point to the wrong SQLite file.
        $backendEnvPath = Join-Path $BACKEND_DIR ".env"
        if (Test-Path $backendEnvPath) {
            try {
                $dbLine = Get-Content $backendEnvPath -ErrorAction Stop |
                    Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } |
                    Select-Object -First 1

                if ($dbLine) {
                    $dbValue = ($dbLine -split '=', 2)[1].Trim()
                    if ($dbValue.StartsWith('"') -and $dbValue.EndsWith('"')) {
                        $dbValue = $dbValue.Trim('"')
                    } elseif ($dbValue.StartsWith("'") -and $dbValue.EndsWith("'")) {
                        $dbValue = $dbValue.Trim("'")
                    }

                    if (-not [string]::IsNullOrWhiteSpace($dbValue)) {
                        $env:DATABASE_URL = $dbValue
                        Write-Info "Using DATABASE_URL from backend/.env for native backend"
                    }
                }
            }
            catch {
                Write-Warning "Could not read DATABASE_URL from backend/.env; using process environment"
            }
        }

        # Force UTF-8 process I/O on Windows consoles (prevents emoji/unicode logging crashes)
        $env:PYTHONUTF8 = "1"
        $env:PYTHONIOENCODING = "utf-8"

        # Use python -m uvicorn directly instead of venv wrapper script to ensure proper module path resolution
        # This allows relative imports like "from .app_factory import create_app" in main.py to work correctly
        $pythonExe = Join-Path $venvPath "Scripts\python.exe"
        $uvicornArgs = @("-u", "-m", "uvicorn") + $args
        $processInfo = Start-Process -FilePath $pythonExe -ArgumentList $uvicornArgs -WorkingDirectory $SCRIPT_DIR -WindowStyle Normal -PassThru

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
        Write-Info "API: http://localhost:$targetBackendPort"
        Write-Info "Docs: http://localhost:$targetBackendPort/docs"
        if ($NoReload) {
            Write-Info "Hot-reload disabled (stable mode). Use CTRL+C in window to stop or .\NATIVE.ps1 -Stop"
        } else {
            Write-Info "Hot-reload enabled"
        }

        if (Invoke-FallbackPortDiagnostic -Phase "post-backend-start" -HardFail) {
            Write-Info "Stopping backend due to fallback-port hard-fail guard..."
            Stop-ProcessFromPidFile -PidFile $BACKEND_PID_FILE -Name "Backend" | Out-Null
            return 1
        }

        # Persist active backend port for frontend/API targeting in this workspace
        Set-Content -Path (Join-Path $SCRIPT_DIR ".backend.port") -Value "$targetBackendPort"

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

    if (Invoke-FallbackPortDiagnostic -Phase "pre-frontend-start" -HardFail) {
        return 1
    }

    # Check if already running
    $process = Get-ProcessFromPidFile -PidFile $FRONTEND_PID_FILE
    if ($process) {
        Write-Success "Frontend is already running (PID $($process.Id))"
        Write-Info "Port: $FRONTEND_PORT"
        return 0
    }

    # Check port
    if (Test-PortInUse -Port $FRONTEND_PORT) {
        Write-Warning "Port $FRONTEND_PORT is in use. Attempting automatic cleanup..."
        $recovered = Stop-ProcessByPort -Port $FRONTEND_PORT -Name "Frontend"
        Start-Sleep -Milliseconds 500
        if ((-not $recovered) -or (Test-PortInUse -Port $FRONTEND_PORT)) {
            Write-Error-Message "Port $FRONTEND_PORT is already in use"
            Write-Info "Run .\NATIVE.ps1 -Stop and retry, or free the port manually"
            return 1
        }
        Write-Success "Recovered port $FRONTEND_PORT"
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
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCommand -and $nodeCommand.Source) {
            $nodeDir = Split-Path -Parent $nodeCommand.Source
            if ($nodeDir -and -not (($env:Path -split ';') -contains $nodeDir)) {
                $env:Path = "$nodeDir;$env:Path"
            }
        }

        # Apply child-process safety guards for native mode on Windows.
        Enable-NativeProcessGuards

        $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
        $npmExecutable = if ($npmCmd -and $npmCmd.Source) { $npmCmd.Source } else { "npm" }

        # Resolve backend API target dynamically (single canonical backend port)
        $activeBackendPort = $BACKEND_PORT
        $backendPortFromFile = $false
        $backendPortFile = Join-Path $SCRIPT_DIR ".backend.port"
        if (Test-Path $backendPortFile) {
            try {
                $parsedPort = [int](Get-Content $backendPortFile -Raw).Trim()
                if ($parsedPort -gt 0) {
                    $activeBackendPort = $parsedPort
                    $backendPortFromFile = $true
                }
            }
            catch {
                # ignore parse errors and fall back to defaults below
            }
        }

        if ($backendPortFromFile) {
            # Give backend a brief moment to bind on the persisted port before any fallback.
            for ($wait = 1; $wait -le 8; $wait++) {
                if (Test-PortInUse -Port $activeBackendPort) {
                    break
                }
                Start-Sleep -Milliseconds 250
            }
        }

        if (-not (Test-PortInUse -Port $activeBackendPort)) {
            if (Test-PortInUse -Port $BACKEND_PORT) {
                $activeBackendPort = $BACKEND_PORT
            }
        }

        # Always keep frontend API base relative to avoid stale absolute targets
        # (e.g., lingering fallback listeners on 8001). Route selection is handled
        # by Vite proxy target below.
        $env:VITE_API_URL = "/api/v1"
        $env:VITE_DEV_PROXY_TARGET = "http://127.0.0.1:$activeBackendPort"
        Write-Info "Frontend API base: $($env:VITE_API_URL)"
        Write-Info "Frontend dev proxy target: $($env:VITE_DEV_PROXY_TARGET)"

        if ($pwsh) {
            $processInfo = Start-Process -FilePath "pwsh" `
                -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "cd '$FRONTEND_DIR'; & '$npmExecutable' run dev -- --host 127.0.0.1" `
                -WindowStyle Normal `
                -PassThru
        } else {
            # Fall back to starting npm directly
            $processInfo = Start-Process -FilePath $npmExecutable `
                -ArgumentList "run", "dev", "--", "--host", "127.0.0.1" `
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

        if (Invoke-FallbackPortDiagnostic -Phase "post-frontend-start" -HardFail) {
            Write-Info "Stopping frontend due to fallback-port hard-fail guard..."
            Stop-ProcessFromPidFile -PidFile $FRONTEND_PID_FILE -Name "Frontend" | Out-Null
            return 1
        }

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

    $signatureKilled = Stop-BackendUvicornBySignature -Quiet
    if ($signatureKilled -gt 0) {
        Write-Info "Stopped $signatureKilled additional backend worker(s) by signature"
    }

    if (Test-PortInUse -Port $BACKEND_PORT) {
        $backendStopped = (Stop-ProcessByPort -Port $BACKEND_PORT -Name "Backend") -and $backendStopped
    }

    if (Test-PortInUse -Port $BACKEND_FALLBACK_PORT) {
        $backendStopped = (Stop-ProcessByPort -Port $BACKEND_FALLBACK_PORT -Name "Backend (fallback)") -and $backendStopped
    }

    if (Test-PortInUse -Port $FRONTEND_PORT) {
        $frontendStopped = (Stop-ProcessByPort -Port $FRONTEND_PORT -Name "Frontend") -and $frontendStopped
    }

    # Clean up any stray Python processes from the venv (uvicorn or other backend tasks)
    try {
        $venvPython = Join-Path $SCRIPT_DIR ".venv\Scripts\python.exe"
        if (Test-Path $venvPython) {
            $strayProcs = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
                $_.Path -eq $venvPython -or $_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*$BACKEND_DIR*"
            }
            if ($strayProcs) {
                Write-Info "Cleaning up stray Python processes from backend..."
                foreach ($proc in $strayProcs) {
                    try {
                        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                        Write-Info "Stopped stray Python process (PID $($proc.Id))"
                    } catch {
                        # Ignore errors, process may have already exited
                    }
                }
            }
        }
    } catch {
        # Ignore cleanup errors, they're not critical
    }

    if ($backendStopped -and $frontendStopped) {
        Remove-Item (Join-Path $SCRIPT_DIR ".backend.port") -Force -ErrorAction SilentlyContinue
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

    function Get-ListeningProcessInfo {
        param([int]$Port)

        try {
            $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($listener) {
                $processIdFromPort = [int]$listener.OwningProcess
                if ($processIdFromPort -gt 0) {
                    $process = Get-Process -Id $processIdFromPort -ErrorAction SilentlyContinue
                    if ($process) {
                        return $process
                    }
                }
            }
        }
        catch {
            # Fall through to netstat fallback
        }

        # Fallback for environments where Get-NetTCPConnection can intermittently miss listeners
        try {
            $lines = netstat -ano | Select-String ":$Port" | Where-Object { $_ -match 'LISTENING' }
            foreach ($line in $lines) {
                $text = ($line.ToString() -replace '^\s+', '')
                $parts = $text -split '\s+'
                if ($parts.Length -lt 5) {
                    continue
                }

                $pidText = $parts[-1]
                $pid = 0
                if (-not [int]::TryParse($pidText, [ref]$pid)) {
                    continue
                }

                if ($pid -le 0) {
                    continue
                }

                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    return $process
                }
            }
        }
        catch {
            # Ignore and return null below
        }

        return $null
    }

    # Backend status
    Write-Host "Backend: " -NoNewline
    $backendProcess = Get-ProcessFromPidFile -PidFile $BACKEND_PID_FILE
    if (-not $backendProcess) {
        $backendProcess = Get-ListeningProcessInfo -Port $BACKEND_PORT
        if ($backendProcess) {
            Set-Content -Path $BACKEND_PID_FILE -Value $backendProcess.Id -ErrorAction SilentlyContinue
        }
    }
    if ($backendProcess) {
        Write-Host "Running ✅ " -ForegroundColor Green -NoNewline
        Write-Host "(PID $($backendProcess.Id))" -ForegroundColor Gray
        Write-Host "  API:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
        Write-Host "  Docs: http://localhost:$BACKEND_PORT/docs" -ForegroundColor Cyan
    } else {
        if (Test-PortInUse -Port $BACKEND_PORT) {
            Write-Host "Port occupied ⚠️  " -ForegroundColor Yellow -NoNewline
            Write-Host "(owner unresolved)" -ForegroundColor Gray
        } else {
            Write-Host "Not running ❌" -ForegroundColor Red
        }
    }

    # Frontend status
    Write-Host "`nFrontend: " -NoNewline
    $frontendProcess = Get-ProcessFromPidFile -PidFile $FRONTEND_PID_FILE
    if (-not $frontendProcess) {
        $frontendProcess = Get-ListeningProcessInfo -Port $FRONTEND_PORT
        if ($frontendProcess) {
            Set-Content -Path $FRONTEND_PID_FILE -Value $frontendProcess.Id -ErrorAction SilentlyContinue
        }
    }
    if ($frontendProcess) {
        Write-Host "Running ✅ " -ForegroundColor Green -NoNewline
        Write-Host "(PID $($frontendProcess.Id))" -ForegroundColor Gray
        Write-Host "  Web: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
    } else {
        if (Test-PortInUse -Port $FRONTEND_PORT) {
            Write-Host "Port occupied ⚠️  " -ForegroundColor Yellow -NoNewline
            Write-Host "(owner unresolved)" -ForegroundColor Gray
        } else {
            Write-Host "Not running ❌" -ForegroundColor Red
        }
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
        # Use robust removal for .venv (might be corrupted/locked)
        if (Test-Path ".venv") {
            $result = Remove-VenvForced -VenvPath (Join-Path $BACKEND_DIR ".venv")
            if ($result -eq 0) {
                Write-Success "Removed: .venv"
            } else {
                Write-Warning "Failed to fully remove .venv (may have locked files)"
            }
        }

        # Remove other backend artifacts
        $items = @("__pycache__", ".pytest_cache", "*.pyc", ".ruff_cache", ".mypy_cache")
        foreach ($item in $items) {
            if (Test-Path $item) {
                try {
                    Remove-Item $item -Recurse -Force -ErrorAction Stop
                    Write-Success "Removed: $item"
                }
                catch {
                    Write-Warning "Failed to remove: $item - $_"
                }
            }
        }

        # Remove nested __pycache__
        Get-ChildItem -Recurse -Filter "__pycache__" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction Stop
            }
            catch {
                # Silent
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
                try {
                    Remove-Item $item -Recurse -Force -ErrorAction Stop
                    Write-Success "Removed: $item"
                }
                catch {
                    Write-Warning "Failed to remove: $item - $_"
                }
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
        if (Test-HealthEndpointReachable -Port $BACKEND_FALLBACK_PORT -TimeoutSec 2) {
            Show-FallbackGuardRecovery -Stage "backend-start"
        }
        Write-Error-Message "Failed to start backend"
        exit $backendCode
    }

    Write-Host ""

    # Start frontend
    $frontendCode = Start-Frontend
    if ($frontendCode -ne 0) {
        if (Test-HealthEndpointReachable -Port $BACKEND_FALLBACK_PORT -TimeoutSec 2) {
            Show-FallbackGuardRecovery -Stage "frontend-start"
        }
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
