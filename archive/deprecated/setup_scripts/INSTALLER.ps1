<#
.SYNOPSIS
    Student Management System - One-Click Windows Installer

.DESCRIPTION
    Automated installer for Windows that:
    - Checks system prerequisites
    - Offers to install missing dependencies
    - Sets up the application
    - Starts the system automatically

.PARAMETER SkipPrereqCheck
    Skip prerequisite checking (use if you know everything is installed)

.PARAMETER DockerOnly
    Only check for Docker (skip Python/Node.js check)

.PARAMETER NativeOnly
    Only check for Python/Node.js (skip Docker check)

.PARAMETER NoStart
    Install but don't start the application

.EXAMPLE
    .\INSTALLER.ps1
    Run the full installation with interactive prompts

.EXAMPLE
    .\INSTALLER.ps1 -DockerOnly -NoStart
    Install for Docker mode only, don't start automatically

.NOTES
    This script can be run on a fresh Windows machine.
    It will guide you through the entire setup process.
#>

param(
    [switch]$SkipPrereqCheck,
    [switch]$DockerOnly,
    [switch]$NativeOnly,
    [switch]$NoStart,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# CONFIGURATION
# ============================================================================

$Script:AppName = "Student Management System"
$Script:MinPythonVersion = [version]"3.11.0"
$Script:MinNodeVersion = [version]"18.0.0"
$Script:RequiredPorts = @(8080, 8000, 5173)

# Download URLs for prerequisites
$Script:DownloadUrls = @{
    Docker = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    Python = "https://www.python.org/downloads/"
    NodeJS = "https://nodejs.org/en/download/"
    Git    = "https://git-scm.com/download/win"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Banner {
    param($Text, $Color = 'Cyan')
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor $Color
    Write-Host "  $Text" -ForegroundColor $Color
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor $Color
    Write-Host ""
}

function Write-Step {
    param($Number, $Total, $Description)
    Write-Host ""
    Write-Host "[$Number/$Total] $Description" -ForegroundColor Yellow
    Write-Host ("─" * 70) -ForegroundColor DarkGray
}

function Write-Success {
    param($Text)
    Write-Host "  ✓ $Text" -ForegroundColor Green
}

function Write-Warning2 {
    param($Text)
    Write-Host "  ⚠ $Text" -ForegroundColor Yellow
}

function Write-Error2 {
    param($Text)
    Write-Host "  ✗ $Text" -ForegroundColor Red
}

function Write-Info {
    param($Text)
    Write-Host "  ℹ $Text" -ForegroundColor Cyan
}

function Confirm-Action {
    param(
        [string]$Prompt,
        [switch]$DefaultYes
    )

    $defaultChoice = if ($DefaultYes) { "Y" } else { "N" }
    $choices = if ($DefaultYes) { "Y/n" } else { "y/N" }

    do {
        $response = Read-Host "$Prompt [$choices]"
        if ([string]::IsNullOrWhiteSpace($response)) {
            $response = $defaultChoice
        }
        $response = $response.Trim().ToUpper()
    } while ($response -notin @('Y', 'N', 'YES', 'NO'))

    return $response -in @('Y', 'YES')
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-AsAdministrator {
    if (-not (Test-Administrator)) {
        Write-Warning2 "Administrator privileges required for installation."
        Write-Info "Restarting script as Administrator..."

        $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        if ($SkipPrereqCheck) { $arguments += " -SkipPrereqCheck" }
        if ($DockerOnly) { $arguments += " -DockerOnly" }
        if ($NativeOnly) { $arguments += " -NativeOnly" }
        if ($NoStart) { $arguments += " -NoStart" }

        Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments
        exit
    }
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

function Test-PortAvailable {
    param([int]$Port)

    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

function Test-DockerInstalled {
    try {
        $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
        return $null -ne $dockerPath
    } catch {
        return $false
    }
}

function Test-DockerRunning {
    if (-not (Test-DockerInstalled)) {
        return $false
    }

    try {
        $null = docker version --format '{{.Server.Version}}' 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Test-PythonInstalled {
    try {
        $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
        if ($null -eq $pythonCmd) {
            return $false
        }

        $versionOutput = python --version 2>&1
        if ($versionOutput -match "Python (\d+\.\d+\.\d+)") {
            $installedVersion = [version]$matches[1]
            return $installedVersion -ge $Script:MinPythonVersion
        }
        return $false
    } catch {
        return $false
    }
}

function Test-NodeInstalled {
    try {
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if ($null -eq $nodeCmd) {
            return $false
        }

        $versionOutput = node --version 2>&1
        if ($versionOutput -match "v(\d+\.\d+\.\d+)") {
            $installedVersion = [version]$matches[1]
            return $installedVersion -ge $Script:MinNodeVersion
        }
        return $false
    } catch {
        return $false
    }
}

function Test-GitInstalled {
    try {
        $gitCmd = Get-Command git -ErrorAction SilentlyContinue
        return $null -ne $gitCmd
    } catch {
        return $false
    }
}

function Get-SystemInfo {
    $info = @{
        OS = [System.Environment]::OSVersion.VersionString
        PowerShell = $PSVersionTable.PSVersion.ToString()
        RAM = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
        DiskFree = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
        Docker = Test-DockerInstalled
        DockerRunning = Test-DockerRunning
        Python = Test-PythonInstalled
        Node = Test-NodeInstalled
        Git = Test-GitInstalled
    }
    return $info
}

function Show-PrerequisiteReport {
    param($SystemInfo, $Mode)

    Write-Host ""
    Write-Host "  System Information:" -ForegroundColor Cyan
    Write-Host "  ──────────────────" -ForegroundColor DarkGray
    Write-Host "    OS:         $($SystemInfo.OS)" -ForegroundColor Gray
    Write-Host "    PowerShell: $($SystemInfo.PowerShell)" -ForegroundColor Gray
    Write-Host "    RAM:        $($SystemInfo.RAM) GB" -ForegroundColor Gray
    Write-Host "    Disk Space: $($SystemInfo.DiskFree) GB free on C:" -ForegroundColor Gray
    Write-Host ""

    Write-Host "  Prerequisites Check:" -ForegroundColor Cyan
    Write-Host "  ───────────────────" -ForegroundColor DarkGray

    # Check based on mode
    if ($Mode -eq 'Docker' -or $Mode -eq 'Auto') {
        if ($SystemInfo.Docker) {
            Write-Success "Docker Desktop is installed"
            if ($SystemInfo.DockerRunning) {
                Write-Success "Docker Desktop is running"
            } else {
                Write-Warning2 "Docker Desktop is not running"
            }
        } else {
            Write-Error2 "Docker Desktop is not installed"
        }
    }

    if ($Mode -eq 'Native' -or $Mode -eq 'Auto') {
        if ($SystemInfo.Python) {
            Write-Success "Python 3.11+ is installed"
        } else {
            Write-Error2 "Python 3.11+ is not installed"
        }

        if ($SystemInfo.Node) {
            Write-Success "Node.js 18+ is installed"
        } else {
            Write-Error2 "Node.js 18+ is not installed"
        }
    }

    if ($SystemInfo.Git) {
        Write-Success "Git is installed"
    } else {
        Write-Warning2 "Git is not installed (optional but recommended)"
    }

    Write-Host ""
}

# ============================================================================
# INSTALLATION HELPERS
# ============================================================================

function Install-Docker {
    Write-Info "Docker Desktop installation requires manual download and installation."
    Write-Host ""
    Write-Host "  Please follow these steps:" -ForegroundColor Yellow
    Write-Host "    1. Visit: $($Script:DownloadUrls.Docker)" -ForegroundColor Cyan
    Write-Host "    2. Download Docker Desktop Installer" -ForegroundColor Cyan
    Write-Host "    3. Run the installer and follow the prompts" -ForegroundColor Cyan
    Write-Host "    4. Restart your computer if prompted" -ForegroundColor Cyan
    Write-Host "    5. Start Docker Desktop" -ForegroundColor Cyan
    Write-Host "    6. Re-run this installer" -ForegroundColor Cyan
    Write-Host ""

    if (Confirm-Action "Open Docker Desktop download page in browser?" -DefaultYes) {
        Start-Process $Script:DownloadUrls.Docker
    }

    return $false
}

function Install-Python {
    Write-Info "Python installation requires manual download and installation."
    Write-Host ""
    Write-Host "  Please follow these steps:" -ForegroundColor Yellow
    Write-Host "    1. Visit: $($Script:DownloadUrls.Python)" -ForegroundColor Cyan
    Write-Host "    2. Download Python 3.11 or later (Windows installer)" -ForegroundColor Cyan
    Write-Host "    3. Run the installer" -ForegroundColor Cyan
    Write-Host "    4. IMPORTANT: Check 'Add Python to PATH' during installation" -ForegroundColor Red
    Write-Host "    5. Complete the installation" -ForegroundColor Cyan
    Write-Host "    6. Restart PowerShell/Terminal" -ForegroundColor Cyan
    Write-Host "    7. Re-run this installer" -ForegroundColor Cyan
    Write-Host ""

    if (Confirm-Action "Open Python download page in browser?" -DefaultYes) {
        Start-Process $Script:DownloadUrls.Python
    }

    return $false
}

function Install-NodeJS {
    Write-Info "Node.js installation requires manual download and installation."
    Write-Host ""
    Write-Host "  Please follow these steps:" -ForegroundColor Yellow
    Write-Host "    1. Visit: $($Script:DownloadUrls.NodeJS)" -ForegroundColor Cyan
    Write-Host "    2. Download Node.js 18 LTS or later (Windows installer)" -ForegroundColor Cyan
    Write-Host "    3. Run the installer and follow the prompts" -ForegroundColor Cyan
    Write-Host "    4. Complete the installation" -ForegroundColor Cyan
    Write-Host "    5. Restart PowerShell/Terminal" -ForegroundColor Cyan
    Write-Host "    6. Re-run this installer" -ForegroundColor Cyan
    Write-Host ""

    if (Confirm-Action "Open Node.js download page in browser?" -DefaultYes) {
        Start-Process $Script:DownloadUrls.NodeJS
    }

    return $false
}

function Start-DockerDesktop {
    Write-Info "Looking for Docker Desktop..."

    $dockerPaths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )

    $dockerExe = $dockerPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($dockerExe) {
        Write-Info "Starting Docker Desktop..."
        Start-Process $dockerExe

        Write-Info "Waiting for Docker Engine to start (this may take 1-2 minutes)..."
        $maxWait = 120
        $waited = 0

        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds 5
            $waited += 5

            if (Test-DockerRunning) {
                Write-Success "Docker Desktop is now running!"
                return $true
            }

            if ($waited % 15 -eq 0) {
                Write-Host "    Still waiting... ($waited seconds)" -ForegroundColor DarkGray
            }
        }

        Write-Warning2 "Docker Desktop did not start within $maxWait seconds."
        Write-Info "Please ensure Docker Desktop is fully started and try again."
        return $false
    } else {
        Write-Error2 "Could not find Docker Desktop executable."
        return $false
    }
}

# ============================================================================
# INSTALLATION WORKFLOW
# ============================================================================

function Initialize-Environment {
    param($Mode)

    Write-Step 3 5 "Setting up application environment"

    # Ensure we're in the correct directory
    if (-not (Test-Path ".\RUN.ps1")) {
        Write-Error2 "Cannot find RUN.ps1 in current directory!"
        Write-Info "Please run this installer from the project root directory."
        return $false
    }

    if ($Mode -eq 'Docker') {
        Write-Info "Building Docker image (this may take several minutes)..."

        if (Test-Path ".\SMART_SETUP.ps1") {
            & ".\SMART_SETUP.ps1" -SkipStart

            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker setup completed successfully!"
                return $true
            } else {
                Write-Error2 "Docker setup failed!"
                return $false
            }
        } elseif (Test-Path ".\scripts\SETUP.ps1") {
            & ".\scripts\SETUP.ps1"

            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker setup completed successfully!"
                return $true
            } else {
                Write-Error2 "Docker setup failed!"
                return $false
            }
        } elseif (Test-Path ".\RUN.ps1") {
            & ".\RUN.ps1" -Stop
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker stack prepared successfully!"
                return $true
            }
            Write-Error2 "RUN.ps1 reported an error while preparing the stack"
            return $false
        } else {
            Write-Error2 "Setup script not found!"
            return $false
        }

    } elseif ($Mode -eq 'Native') {
        Write-Info "Installing backend dependencies..."

        Push-Location backend
        try {
            $pipCheck = python -m pip list --outdated --format=json --disable-pip-version-check 2>$null | ConvertFrom-Json | Where-Object { $_.name -eq 'pip' }
            if ($pipCheck) {
                Write-Info "Upgrading pip..."
                python -m pip install --upgrade pip --quiet 2>&1 | Out-Null
            }
            pip install -r requirements.txt

            if ($LASTEXITCODE -ne 0) {
                throw "Backend dependency installation failed"
            }
            Write-Success "Backend dependencies installed"
        } catch {
            Write-Error2 "Failed to install backend dependencies: $_"
            return $false
        } finally {
            Pop-Location
        }

        Write-Info "Installing frontend dependencies..."

        Push-Location frontend
        try {
            npm install

            if ($LASTEXITCODE -ne 0) {
                throw "Frontend dependency installation failed"
            }
            Write-Success "Frontend dependencies installed"
        } catch {
            Write-Error2 "Failed to install frontend dependencies: $_"
            return $false
        } finally {
            Pop-Location
        }

        return $true
    }

    return $false
}

function Start-Application {
    param($Mode)

    Write-Step 5 5 "Starting the application"

    if (Test-Path ".\RUN.ps1") {
        Write-Info "Launching Student Management System..."
        Write-Host ""

        & ".\RUN.ps1"

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Success "Application started successfully!"
            Write-Host ""
            Write-Host "  Access the application at:" -ForegroundColor Cyan
            Write-Host "    → Frontend:   http://localhost:8080" -ForegroundColor Green
            Write-Host "    → API Docs:   http://localhost:8000/docs" -ForegroundColor Green
            Write-Host "    → Control:    http://localhost:8080/control" -ForegroundColor Green
            Write-Host ""

            if (Confirm-Action "Open application in browser?" -DefaultYes) {
                Start-Process "http://localhost:8080"
            }

            return $true
        } else {
            Write-Error2 "Application failed to start!"
            Write-Info "Check the error messages above for details."
            return $false
        }
    } else {
        Write-Error2 "RUN.ps1 not found!"
        return $false
    }
}

# ============================================================================
# MAIN INSTALLATION FLOW
# ============================================================================

function Start-Installation {
    Clear-Host

    Write-Banner "STUDENT MANAGEMENT SYSTEM - ONE-CLICK INSTALLER" -Color Green

    Write-Host "  This installer will:" -ForegroundColor Cyan
    Write-Host "    • Check your system for prerequisites" -ForegroundColor Gray
    Write-Host "    • Guide you through installing missing components" -ForegroundColor Gray
    Write-Host "    • Set up the Student Management System" -ForegroundColor Gray
    Write-Host "    • Start the application automatically" -ForegroundColor Gray
    Write-Host ""

    if (-not (Confirm-Action "Continue with installation?" -DefaultYes)) {
        Write-Warning2 "Installation cancelled by user."
        return
    }

    # Step 1: System Check
    Write-Step 1 5 "Checking system prerequisites"

    $systemInfo = Get-SystemInfo

    # Determine installation mode
    $mode = 'Auto'
    if ($DockerOnly) {
        $mode = 'Docker'
        Write-Info "Installation mode: Docker only"
    } elseif ($NativeOnly) {
        $mode = 'Native'
        Write-Info "Installation mode: Native (Python + Node.js)"
    } else {
        Write-Info "Installation mode: Auto-detect (prefers Docker)"
    }

    Show-PrerequisiteReport -SystemInfo $systemInfo -Mode $mode

    # Step 2: Install missing prerequisites
    Write-Step 2 5 "Installing missing prerequisites"

    $needsRestart = $false

    if ($mode -in @('Docker', 'Auto')) {
        if (-not $systemInfo.Docker) {
            Write-Warning2 "Docker Desktop is required but not installed."
            if (Confirm-Action "Would you like to install Docker Desktop?" -DefaultYes) {
                Install-Docker
                $needsRestart = $true
            } elseif ($mode -eq 'Docker') {
                Write-Error2 "Cannot proceed without Docker in Docker-only mode."
                return
            } else {
                Write-Info "Falling back to native mode..."
                $mode = 'Native'
            }
        } elseif (-not $systemInfo.DockerRunning) {
            Write-Warning2 "Docker Desktop is installed but not running."
            if (Confirm-Action "Would you like to start Docker Desktop?" -DefaultYes) {
                if (-not (Start-DockerDesktop)) {
                    if ($mode -eq 'Docker') {
                        Write-Error2 "Cannot proceed without Docker running."
                        return
                    } else {
                        Write-Info "Falling back to native mode..."
                        $mode = 'Native'
                    }
                }
            } elseif ($mode -eq 'Docker') {
                Write-Error2 "Cannot proceed without Docker running."
                return
            } else {
                Write-Info "Falling back to native mode..."
                $mode = 'Native'
            }
        } else {
            Write-Success "Docker is ready!"
        }
    }

    if ($mode -in @('Native', 'Auto')) {
        if (-not $systemInfo.Python) {
            Write-Warning2 "Python 3.11+ is required but not installed."
            if (Confirm-Action "Would you like to install Python?" -DefaultYes) {
                Install-Python
                $needsRestart = $true
            } else {
                Write-Error2 "Cannot proceed without Python in native mode."
                return
            }
        }

        if (-not $systemInfo.Node) {
            Write-Warning2 "Node.js 18+ is required but not installed."
            if (Confirm-Action "Would you like to install Node.js?" -DefaultYes) {
                Install-NodeJS
                $needsRestart = $true
            } else {
                Write-Error2 "Cannot proceed without Node.js in native mode."
                return
            }
        }

        if ($systemInfo.Python -and $systemInfo.Node) {
            Write-Success "Python and Node.js are ready!"
        }
    }

    if ($needsRestart) {
        Write-Host ""
        Write-Warning2 "Installation requires restart!"
        Write-Host ""
        Write-Host "  Please:" -ForegroundColor Yellow
        Write-Host "    1. Complete the installations" -ForegroundColor Cyan
        Write-Host "    2. Restart your computer (if prompted)" -ForegroundColor Cyan
        Write-Host "    3. Re-run this installer: .\INSTALLER.ps1" -ForegroundColor Cyan
        Write-Host ""
        Read-Host "Press ENTER to exit"
        return
    }

    # Finalize mode selection
    if ($mode -eq 'Auto') {
        if ($systemInfo.DockerRunning) {
            $mode = 'Docker'
            Write-Success "Using Docker mode (recommended)"
        } else {
            $mode = 'Native'
            Write-Success "Using Native mode (Python + Node.js)"
        }
    }

    # Step 3: Environment setup
    if (-not (Initialize-Environment -Mode $mode)) {
        Write-Error2 "Environment setup failed!"
        Write-Host ""
        Read-Host "Press ENTER to exit"
        return
    }

    # Step 4: Port check
    Write-Step 4 5 "Checking port availability"

    $portsOk = $true
    foreach ($port in $Script:RequiredPorts) {
        if (Test-PortAvailable -Port $port) {
            Write-Success "Port $port is available"
        } else {
            Write-Warning2 "Port $port is in use"
            $portsOk = $false
        }
    }

    if (-not $portsOk) {
        Write-Warning2 "Some required ports are in use."
        Write-Info "The application may fail to start or use alternative ports."
        Write-Host ""
        if (-not (Confirm-Action "Continue anyway?" -DefaultYes)) {
            return
        }
    }

    # Step 5: Start application
    if (-not $NoStart) {
        Start-Application -Mode $mode
    } else {
        Write-Success "Installation completed successfully!"
        Write-Host ""
        Write-Host "  To start the application, run:" -ForegroundColor Cyan
    Write-Host "    .\RUN.ps1" -ForegroundColor Green
        Write-Host ""
    }

    # Final summary
    Write-Banner "INSTALLATION COMPLETE" -Color Green

    Write-Host "  Useful commands:" -ForegroundColor Cyan
    Write-Host "    Start:     .\RUN.ps1" -ForegroundColor Gray
    Write-Host "    Stop:      .\scripts\STOP.ps1" -ForegroundColor Gray
    Write-Host "    Manage:    .\SMS.ps1" -ForegroundColor Gray
    Write-Host "    Help:      See README.md" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Documentation:" -ForegroundColor Cyan
    Write-Host "    English:   README.md" -ForegroundColor Gray
    Write-Host "    Greek:     ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md" -ForegroundColor Gray
    Write-Host ""

    Read-Host "Press ENTER to exit"
}

# ============================================================================
# ENTRY POINT
# ============================================================================

if ($Help) {
    Get-Help $PSCommandPath -Detailed
    exit 0
}

try {
    Start-Installation
} catch {
    Write-Host ""
    Write-Error2 "Installation failed with error:"
    Write-Host "  $_" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    Write-Host ""
    Read-Host "Press ENTER to exit"
    exit 1
}
