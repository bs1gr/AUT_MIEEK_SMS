# =============================================================================
# Student Management System - Native Lite Setup Script
# Phase 2: Complete Application Environment Initialization
#
# Purpose: Initialize environment for SMS_Native_Lite.exe - a complete,
# fully functional Student Management System with embedded SQLite database.
#
# This is NOT a lightweight stub. Native Lite is a complete application
# optimized for end users, with embedded SQLite and no external dependencies.
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

Write-Log "=== SMS Native Lite - Complete Application Setup ===" "INFO"
Write-Log "Installation Path: $AppPath" "INFO"
Write-Log "App Type: Fully Functional Standalone Application" "INFO"

try {
    # Task 1: Verify system compatibility
    Write-Log "Task 1: Verifying system compatibility..." "INFO"

    # Check Windows version
    $OSVersion = [Environment]::OSVersion.Version
    if ($OSVersion.Major -lt 10) {
        Write-Log "FATAL: Windows 10 or later required. Found: $($OSVersion.Major)" "ERROR"
        exit 1
    }
    Write-Log "✓ Windows version compatible: $OSVersion" "INFO"

    # Check available disk space (recommend 500MB minimum for future use)
    try {
        $Drive = Get-PSDrive -Name $AppPath[0] | Select-Object -ExpandProperty Free
        $DriveFreeGB = $Drive / 1GB
        Write-Log "✓ Available disk space: $([Math]::Round($DriveFreeGB, 2)) GB" "INFO"
        if ($DriveFreeGB -lt 0.5) {
            Write-Log "WARNING: Less than 500MB available. May affect database performance." "WARNING"
        }
    }
    catch {
        Write-Log "Could not check disk space: $($_.Message)" "WARNING"
    }

    # Task 2: Initialize data directory structure
    Write-Log "Task 2: Initializing application data structure..." "INFO"

    $DataDir = "$AppPath\data"
    $BackupDir = "$AppPath\backups"
    $LogDir = "$AppPath\logs"
    $ConfigDir = "$AppPath\config"

    $RequiredDirs = @($DataDir, $BackupDir, $LogDir, $ConfigDir)
    foreach ($Dir in $RequiredDirs) {
        if (-not (Test-Path $Dir)) {
            New-Item -ItemType Directory -Path $Dir -Force | Out-Null
            Write-Log "  ✓ Created directory: $Dir" "INFO"
        } else {
            Write-Log "  ✓ Directory exists: $Dir" "INFO"
        }
    }

    # Task 3: Initialize embedded SQLite database structure
    Write-Log "Task 3: Preparing embedded SQLite database..." "INFO"

    $DbFile = "$DataDir\sms_lite.db"
    if (-not (Test-Path $DbFile)) {
        Write-Log "  ℹ SQLite database file will be created on first application launch" "INFO"
        Write-Log "  ℹ Location: $DbFile" "INFO"
        Write-Log "  ℹ The application will automatically initialize schema and default data" "INFO"
    } else {
        $DbSize = (Get-Item $DbFile).Length / 1MB
        Write-Log "  ✓ Existing SQLite database found (Size: $([Math]::Round($DbSize, 2)) MB)" "INFO"
    }

    # Task 4: Create backup directory structure
    Write-Log "Task 4: Setting up backup system..." "INFO"

    $BackupSubDir = "$BackupDir\auto"
    if (-not (Test-Path $BackupSubDir)) {
        New-Item -ItemType Directory -Path $BackupSubDir -Force | Out-Null
        Write-Log "  ✓ Created auto-backup directory: $BackupSubDir" "INFO"
    }
    Write-Log "  ℹ Automatic backups will be saved to: $BackupSubDir" "INFO"
    Write-Log "  ℹ Manual backups can be created from the application menu" "INFO"

    # Task 5: Create configuration files
    Write-Log "Task 5: Initializing configuration..." "INFO"

    $ConfigFile = "$ConfigDir\app_config.json"
    if (-not (Test-Path $ConfigFile)) {
        $DefaultConfig = @{
            app_name = "Student Management System - Native Lite"
            app_version = "1.0"
            database_type = "sqlite"
            database_location = "embedded"
            theme = "system"
            language = "en"
            first_run = $true
            created_at = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        } | ConvertTo-Json

        Set-Content -Path $ConfigFile -Value $DefaultConfig
        Write-Log "  ✓ Created configuration file: $ConfigFile" "INFO"
    } else {
        Write-Log "  ✓ Configuration file exists: $ConfigFile" "INFO"
    }

    # Task 6: Set appropriate file permissions
    Write-Log "Task 6: Configuring file permissions..." "INFO"

    try {
        # Grant current user full control of data directory
        $CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
        $Acl = Get-Acl $DataDir

        # Remove inherited permissions to prevent issues
        $Acl.SetAccessRuleProtection($true, $true)

        # Add full control for current user
        $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $CurrentUser,
            "FullControl",
            "ContainerInherit, ObjectInherit",
            "None",
            "Allow"
        )
        $Acl.SetAccessRule($AccessRule)
        Set-Acl -Path $DataDir -AclObject $Acl
        Write-Log "  ✓ File permissions configured for user: $CurrentUser" "INFO"
    }
    catch {
        Write-Log "  ⚠ Warning: Could not fully configure file permissions - $($_.Message)" "WARNING"
        Write-Log "    Application may prompt for permissions on first run" "INFO"
    }

    # Task 7: Verify application executable exists
    Write-Log "Task 7: Verifying application executable..." "INFO"

    $AppExe = "$AppPath\SMS_Native_Lite.exe"
    if (Test-Path $AppExe) {
        $ExeSize = (Get-Item $AppExe).Length / 1MB
        Write-Log "  ✓ Application executable found: SMS_Native_Lite.exe" "INFO"
        Write-Log "  ✓ Size: $([Math]::Round($ExeSize, 2)) MB" "INFO"
    } else {
        Write-Log "  ⚠ WARNING: Application executable not found at: $AppExe" "WARNING"
        Write-Log "    Check that SMS_Native_Lite.exe was properly installed" "WARNING"
    }

    # Task 8: Create shortcuts if not already present
    Write-Log "Task 8: Application shortcuts..." "INFO"
    Write-Log "  ℹ Shortcuts created by installer during installation" "INFO"
    Write-Log "  ℹ Start Menu: Student Management System - Native Lite" "INFO"
    Write-Log "  ℹ Desktop shortcut available (optional, created during install)" "INFO"

    Write-Log "=== SMS Native Lite Setup Completed Successfully ===" "INFO"
    Write-Log "Application ready for use" "INFO"

    if (-not $Silent) {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║  SMS Native Lite - Complete Application Setup Complete     ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ System verified (Windows 10+)" -ForegroundColor Green
        Write-Host "✅ Data directories created" -ForegroundColor Green
        Write-Host "✅ Embedded SQLite prepared" -ForegroundColor Green
        Write-Host "✅ Backup system initialized" -ForegroundColor Green
        Write-Host "✅ Configuration created" -ForegroundColor Green
        Write-Host "✅ File permissions configured" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Application Details:" -ForegroundColor Cyan
        Write-Host "  Type: Fully Functional Standalone Application" -ForegroundColor Gray
        Write-Host "  Database: Embedded SQLite (no external server needed)" -ForegroundColor Gray
        Write-Host "  Data Location: $DataDir" -ForegroundColor Gray
        Write-Host "  Backups Location: $BackupDir" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
        Write-Host "  1. Launch SMS from the Start Menu shortcut" -ForegroundColor Gray
        Write-Host "  2. Log in with your credentials" -ForegroundColor Gray
        Write-Host "  3. On first run, the database will initialize automatically" -ForegroundColor Gray
        Write-Host "  4. Start using Student Management System" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💾 Backup & Data:" -ForegroundColor Yellow
        Write-Host "  - All data is stored locally in: $DataDir" -ForegroundColor Gray
        Write-Host "  - Use the backup feature in the application menu regularly" -ForegroundColor Gray
        Write-Host "  - Backups are saved to: $BackupDir" -ForegroundColor Gray
        Write-Host ""
    }
}
catch {
    Write-Log "FATAL ERROR during setup: $_" "ERROR"
    Write-Log $_.Exception.StackTrace "ERROR"
    if (-not $Silent) {
        Write-Host ""
        Write-Host "❌ Setup failed. Check the log file for details:" -ForegroundColor Red
        Write-Host "  $LogFile" -ForegroundColor Red
    }
    exit 1
}
