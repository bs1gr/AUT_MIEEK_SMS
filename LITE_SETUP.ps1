# =============================================================================
# Student Management System - Native Lite Setup Script
# Phase 2: Native Lite Installation Type Post-Install Configuration
# =============================================================================

param(
    [string]$AppPath = $PSScriptRoot,
    [switch]$Silent = $false
)

$ErrorActionPreference = "Stop"
$LogFile = "$AppPath\logs\lite_setup.log"

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

Write-Log "=== SMS Native Lite Setup Started ===" "INFO"
Write-Log "Installation Path: $AppPath" "INFO"

try {
    # Phase 2 Setup Tasks for Lite Version
    Write-Log "Phase 2: Native Lite Setup" "INFO"

    # Task 1: Verify system compatibility
    Write-Log "Verifying system compatibility..." "INFO"

    # Check Windows version
    $OSVersion = [Environment]::OSVersion.Version
    if ($OSVersion.Major -lt 10) {
        Write-Log "Windows 10 or later required. Found: $($OSVersion.Major)" "ERROR"
        exit 1
    }
    Write-Log "Windows version compatible: $OSVersion" "INFO"

    # Task 2: Create embedded database directory
    Write-Log "Preparing embedded SQLite database..." "INFO"
    $DataDir = "$AppPath\data"
    if (-not (Test-Path $DataDir)) {
        New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
        Write-Log "Created data directory: $DataDir" "INFO"
    }

    # Initialize SQLite database if it doesn't exist
    $DbFile = "$DataDir\sms_lite.db"
    if (-not (Test-Path $DbFile)) {
        Write-Log "SQLite database will be created on first launch" "INFO"
    } else {
        Write-Log "Existing SQLite database found: $DbFile" "INFO"
    }

    # Task 3: Create required directories
    Write-Log "Creating required directories..." "INFO"
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

    # Task 4: Create configuration file if not exists
    Write-Log "Preparing configuration..." "INFO"
    $ConfigDir = "$AppPath\config"
    if (-not (Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
        Write-Log "Created config directory: $ConfigDir" "INFO"
    }

    # Task 5: Set appropriate file permissions
    Write-Log "Setting file permissions..." "INFO"
    try {
        # Grant current user full control of data directory
        $Acl = Get-Acl $DataDir
        $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            [System.Security.Principal.WindowsIdentity]::GetCurrent().User,
            "FullControl",
            "ContainerInherit, ObjectInherit",
            "None",
            "Allow"
        )
        $Acl.SetAccessRule($AccessRule)
        Set-Acl -Path $DataDir -AclObject $Acl
        Write-Log "File permissions configured" "INFO"
    }
    catch {
        Write-Log "Warning: Could not set file permissions - $($_.Message)" "WARNING"
    }

    Write-Log "=== SMS Native Lite Setup Completed ===" "INFO"

    if (-not $Silent) {
        Write-Host ""
        Write-Host "Native Lite setup completed!"
        Write-Host "Features:"
        Write-Host "  - Embedded SQLite database (no external database required)"
        Write-Host "  - Lightweight and fast"
        Write-Host "  - Data stored locally at: $DataDir"
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "1. Run SMS from the Start menu"
        Write-Host "2. Database will be initialized on first launch"
        Write-Host "3. Backups can be created from the application menu"
    }
}
catch {
    Write-Log "Error during setup: $_" "ERROR"
    Write-Log $_.Exception.StackTrace "ERROR"
    exit 1
}
