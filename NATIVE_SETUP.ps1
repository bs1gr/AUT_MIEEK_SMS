# =============================================================================
# Student Management System - Native Production Setup Script
# Phase 2: Native Production Installation Type Post-Install Configuration
# =============================================================================

param(
    [string]$AppPath = $PSScriptRoot,
    [switch]$Silent = $false
)

$ErrorActionPreference = "Stop"
$LogFile = "$AppPath\logs\native_setup.log"

# Ensure logs directory exists
if (-not (Test-Path "$AppPath\logs")) {
    New-Item -ItemType Directory -Path "$AppPath\logs" -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
    if (-not $Silent) {
        Write-Host $LogMessage
    }
}

Write-Log "=== SMS Native Production Setup Started ===" "INFO"
Write-Log "Installation Path: $AppPath" "INFO"

try {
    # Phase 2 Setup Tasks
    Write-Log "Phase 2: Native Production Setup" "INFO"

    # Task 1: Check Python installation
    Write-Log "Checking Python 3.10+ installation..." "INFO"
    $PythonExe = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $PythonExe) {
        Write-Log "Python not found in PATH" "WARNING"
        Write-Log "Please install Python 3.10+ from https://www.python.org/" "INFO"
    } else {
        $PythonVersion = & python --version 2>&1
        Write-Log "Python found: $PythonVersion" "INFO"
    }

    # Task 2: Check Node.js installation
    Write-Log "Checking Node.js 18+ installation..." "INFO"
    $NodeExe = Get-Command node -ErrorAction SilentlyContinue
    if ($null -eq $NodeExe) {
        Write-Log "Node.js not found in PATH" "WARNING"
        Write-Log "Please install Node.js 18+ from https://nodejs.org/" "INFO"
    } else {
        $NodeVersion = & node --version
        Write-Log "Node.js found: $NodeVersion" "INFO"
    }

    # Task 3: Prepare backend environment
    Write-Log "Preparing backend environment..." "INFO"
    if (Test-Path "$AppPath\backend") {
        Write-Log "Backend directory found at: $AppPath\backend" "INFO"

        # Check for .env file
        if (-not (Test-Path "$AppPath\backend\.env")) {
            Write-Log "Creating .env file from template..." "INFO"
            if (Test-Path "$AppPath\backend\.env.example") {
                Copy-Item "$AppPath\backend\.env.example" "$AppPath\backend\.env"
                Write-Log ".env file created" "INFO"
            }
        }
    } else {
        Write-Log "Backend directory not found" "WARNING"
    }

    # Task 4: Prepare frontend environment
    Write-Log "Preparing frontend environment..." "INFO"
    if (Test-Path "$AppPath\frontend") {
        Write-Log "Frontend directory found at: $AppPath\frontend" "INFO"

        # Check for .env file
        if (-not (Test-Path "$AppPath\frontend\.env")) {
            Write-Log "Creating .env file from template..." "INFO"
            if (Test-Path "$AppPath\frontend\.env.example") {
                Copy-Item "$AppPath\frontend\.env.example" "$AppPath\frontend\.env"
                Write-Log ".env file created" "INFO"
            }
        }
    } else {
        Write-Log "Frontend directory not found" "WARNING"
    }

    # Task 5: Create data and backups directories
    Write-Log "Ensuring required directories exist..." "INFO"
    $RequiredDirs = @(
        "$AppPath\data",
        "$AppPath\backups",
        "$AppPath\logs"
    )
    foreach ($Dir in $RequiredDirs) {
        if (-not (Test-Path $Dir)) {
            New-Item -ItemType Directory -Path $Dir -Force | Out-Null
            Write-Log "Created directory: $Dir" "INFO"
        }
    }

    # Task 6: Create Windows service entry (optional, requires admin)
    Write-Log "Windows service configuration (optional)" "INFO"
    Write-Log "To register as Windows service, manually run:" "INFO"
    Write-Log "  New-Service -Name SMS_Native -BinaryPathName '$AppPath\SMS_Native_Prod.exe'" "INFO"

    Write-Log "=== SMS Native Production Setup Completed ===" "INFO"

    if (-not $Silent) {
        Write-Host ""
        Write-Host "Native Production setup completed!"
        Write-Host "Next steps:"
        Write-Host "1. Ensure Python 3.10+ is installed"
        Write-Host "2. Ensure Node.js 18+ is installed"
        Write-Host "3. Configure database credentials in $AppPath\backend\.env"
        Write-Host "4. Run the application from the Start menu"
    }
}
catch {
    Write-Log "Error during setup: $_" "ERROR"
    Write-Log $_.Exception.StackTrace "ERROR"
    exit 1
}
