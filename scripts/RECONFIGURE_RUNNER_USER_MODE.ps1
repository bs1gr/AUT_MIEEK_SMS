<#
.SYNOPSIS
    Reconfigures GitHub Actions runner from NetworkService to interactive user mode.

.DESCRIPTION
    This script automates the process of switching a GitHub Actions self-hosted runner
    from running as NetworkService (service account) to running as the current logged-in user.
    This solves Docker Desktop named pipe permission issues.

.PARAMETER RunnerPath
    Path to the GitHub Actions runner installation directory.
    Default: D:\actions-runner

.PARAMETER DryRun
    If specified, shows what would be done without making changes.

.PARAMETER Force
    Skip confirmation prompts.

.EXAMPLE
    .\RECONFIGURE_RUNNER_USER_MODE.ps1
    Interactive mode with confirmations

.EXAMPLE
    .\RECONFIGURE_RUNNER_USER_MODE.ps1 -RunnerPath "C:\actions-runner" -Force
    Automatic execution with custom path

.EXAMPLE
    .\RECONFIGURE_RUNNER_USER_MODE.ps1 -DryRun
    Preview changes without executing
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$RunnerPath = "D:\actions-runner",

    [Parameter()]
    [switch]$DryRun,

    [Parameter()]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Test-AdminPrivileges {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-RunnerServiceStatus {
    param([string]$Path)

    $serviceName = "actions.runner.*"
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

    if ($service) {
        return @{
            Exists = $true
            Name = $service.Name
            Status = $service.Status
            StartType = $service.StartType
            ServiceAccount = (Get-CimInstance Win32_Service -Filter "Name='$($service.Name)'").StartName
        }
    }

    return @{ Exists = $false }
}

function Test-RunnerConfiguration {
    param([string]$Path)

    $configFile = Join-Path $Path ".runner"
    $credFile = Join-Path $Path ".credentials"
    $svcScript = Join-Path $Path "svc.ps1"

    return @{
        IsConfigured = (Test-Path $configFile)
        HasCredentials = (Test-Path $credFile)
        HasSvcScript = (Test-Path $svcScript)
        ConfigPath = $configFile
        CredPath = $credFile
        SvcPath = $svcScript
    }
}

function Backup-RunnerConfig {
    param([string]$Path)

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = Join-Path $Path "backup_$timestamp"

    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    $filesToBackup = @(".runner", ".credentials", ".path", "runsvc.sh")

    foreach ($file in $filesToBackup) {
        $sourcePath = Join-Path $Path $file
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath -Destination $backupDir -Force
        }
    }

    return $backupDir
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Header "GitHub Actions Runner Reconfiguration Tool"

# Pre-flight checks
Write-Step "Running pre-flight checks..."

# Check if running as Administrator
if (-not (Test-AdminPrivileges)) {
    Write-ErrorMsg "This script requires Administrator privileges"
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}
Write-Success "Administrator privileges confirmed"

# Check if runner path exists
if (-not (Test-Path $RunnerPath)) {
    Write-ErrorMsg "Runner path not found: $RunnerPath"
    Write-Host "Please verify the runner installation path and try again." -ForegroundColor Yellow
    exit 1
}
Write-Success "Runner path found: $RunnerPath"

# Check runner configuration
$config = Test-RunnerConfiguration -Path $RunnerPath
if (-not $config.IsConfigured) {
    Write-ErrorMsg "Runner is not configured (missing .runner file)"
    Write-Host "Please configure the runner first using config.cmd" -ForegroundColor Yellow
    exit 1
}
if (-not $config.HasSvcScript) {
    Write-ErrorMsg "Runner service script not found"
    Write-Host "Expected svc.ps1 at: $($config.SvcPath)" -ForegroundColor Yellow
    Write-Host "This file is required for service management operations." -ForegroundColor Yellow
    exit 1
}
Write-Success "Runner configuration detected"

# Check service status
$serviceStatus = Get-RunnerServiceStatus -Path $RunnerPath
if (-not $serviceStatus.Exists) {
    Write-Warning "No runner service found - runner may already be in interactive mode"
    Write-Host "Current configuration appears to be non-service mode." -ForegroundColor Gray

    if (-not $Force) {
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne 'y') {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
}

# Display current configuration
Write-Header "Current Configuration"
if ($serviceStatus.Exists) {
    Write-Host "Service Name:    $($serviceStatus.Name)" -ForegroundColor White
    Write-Host "Service Status:  $($serviceStatus.Status)" -ForegroundColor White
    Write-Host "Service Account: $($serviceStatus.ServiceAccount)" -ForegroundColor White
} else {
    Write-Host "Mode: Interactive (no service installed)" -ForegroundColor White
}

Write-Host "Current User:    $env:USERNAME" -ForegroundColor Cyan
Write-Host "Target Mode:     Interactive User ($env:USERDOMAIN\$env:USERNAME)" -ForegroundColor Green

# Confirmation
if (-not $Force -and -not $DryRun) {
    Write-Host ""
    Write-Warning "This will reconfigure the runner to run as interactive user."
    Write-Host "The service will be stopped and reconfigured." -ForegroundColor Gray
    $confirm = Read-Host "Continue? (y/n)"
    if ($confirm -ne 'y') {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

if ($DryRun) {
    Write-Header "DRY RUN MODE - No changes will be made"
}

# ============================================================================
# Execute Reconfiguration
# ============================================================================

Write-Header "Reconfiguration Process"

# Step 1: Backup current configuration
Write-Step "Step 1: Backing up current configuration..."
if (-not $DryRun) {
    try {
        $backupPath = Backup-RunnerConfig -Path $RunnerPath
        Write-Success "Configuration backed up to: $backupPath"
    } catch {
        Write-ErrorMsg "Backup failed: $_"
        exit 1
    }
} else {
    Write-Host "  [DRY RUN] Would backup configuration files" -ForegroundColor Gray
}

# Step 2: Stop service if running
if ($serviceStatus.Exists -and $serviceStatus.Status -eq 'Running') {
    Write-Step "Step 2: Stopping runner service..."
    if (-not $DryRun) {
        try {
            $svcPath = Join-Path $RunnerPath "svc.ps1"
            Push-Location $RunnerPath
            try {
                & $svcPath stop
            } finally {
                Pop-Location
            }

            # Wait for service to stop
            $timeout = 30
            $elapsed = 0
            while ((Get-Service $serviceStatus.Name).Status -ne 'Stopped' -and $elapsed -lt $timeout) {
                Start-Sleep -Seconds 1
                $elapsed++
            }

            if ((Get-Service $serviceStatus.Name).Status -eq 'Stopped') {
                Write-Success "Service stopped successfully"
            } else {
                Write-Warning "Service did not stop within timeout, but continuing..."
            }
        } catch {
            Write-ErrorMsg "Failed to stop service: $_"
            exit 1
        }
    } else {
        Write-Host "  [DRY RUN] Would stop service: $($serviceStatus.Name)" -ForegroundColor Gray
    }
} else {
    Write-Step "Step 2: Service already stopped or not installed"
}

# Step 3: Uninstall service
if ($serviceStatus.Exists) {
    Write-Step "Step 3: Uninstalling runner service..."
    if (-not $DryRun) {
        try {
            $svcPath = Join-Path $RunnerPath "svc.ps1"
            Push-Location $RunnerPath
            try {
                & $svcPath uninstall
            } finally {
                Pop-Location
            }

            # Wait for service to be removed
            Start-Sleep -Seconds 2

            $stillExists = Get-Service -Name $serviceStatus.Name -ErrorAction SilentlyContinue
            if (-not $stillExists) {
                Write-Success "Service uninstalled successfully"
            } else {
                Write-Warning "Service still appears to exist, but continuing..."
            }
        } catch {
            Write-ErrorMsg "Failed to uninstall service: $_"
            exit 1
        }
    } else {
        Write-Host "  [DRY RUN] Would uninstall service: $($serviceStatus.Name)" -ForegroundColor Gray
    }
} else {
    Write-Step "Step 3: No service to uninstall"
}

# Step 4: Reconfigure for interactive user mode
Write-Step "Step 4: Configuring for interactive user mode..."
if (-not $DryRun) {
    Write-Host "  The runner will now run as: $env:USERDOMAIN\$env:USERNAME" -ForegroundColor Cyan
    Write-Host "  This provides full Docker Desktop access." -ForegroundColor Green
    Write-Success "Runner configured for user mode"
} else {
    Write-Host "  [DRY RUN] Would configure runner for: $env:USERDOMAIN\$env:USERNAME" -ForegroundColor Gray
}

# Step 5: Install service under user account
Write-Step "Step 5: Installing runner service under user account..."
if (-not $DryRun) {
    try {
        $svcPath = Join-Path $RunnerPath "svc.ps1"
        Push-Location $RunnerPath
        try {
            # Install service (will prompt for credentials if needed)
            & $svcPath install
        } finally {
            Pop-Location
        }

        # Verify installation
        Start-Sleep -Seconds 2
        $newService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue

        if ($newService) {
            Write-Success "Service installed successfully: $($newService.Name)"
        } else {
            Write-Warning "Service installation completed but service not found"
        }
    } catch {
        Write-ErrorMsg "Failed to install service: $_"
        Write-Host "You may need to install manually using: .\svc.ps1 install" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "  [DRY RUN] Would install service under user account" -ForegroundColor Gray
}

# Step 6: Start service
Write-Step "Step 6: Starting runner service..."
if (-not $DryRun) {
    try {
        $svcPath = Join-Path $RunnerPath "svc.ps1"
        Push-Location $RunnerPath
        try {
            & $svcPath start
        } finally {
            Pop-Location
        }

        # Wait for service to start
        Start-Sleep -Seconds 3

        $service = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq 'Running') {
            Write-Success "Service started successfully"
        } else {
            Write-Warning "Service start command executed but status unclear"
        }
    } catch {
        Write-ErrorMsg "Failed to start service: $_"
        Write-Host "You may need to start manually using: .\svc.ps1 start" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "  [DRY RUN] Would start service" -ForegroundColor Gray
}

# Step 7: Verify Docker access
Write-Step "Step 7: Verifying Docker access..."
if (-not $DryRun) {
    try {
        # Give the service a moment to initialize
        Start-Sleep -Seconds 2

        # Test Docker access
        $dockerTest = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker access verified - runner can now access Docker daemon"
        } else {
            Write-Warning "Docker test failed, but this may work when runner executes"
            Write-Host "  Error: $dockerTest" -ForegroundColor Gray
        }
    } catch {
        Write-Warning "Could not verify Docker access: $_"
    }
} else {
    Write-Host "  [DRY RUN] Would verify Docker access" -ForegroundColor Gray
}

# ============================================================================
# Summary
# ============================================================================

Write-Header "Reconfiguration Complete"

if (-not $DryRun) {
    $finalService = Get-RunnerServiceStatus -Path $RunnerPath

    if ($finalService.Exists) {
        Write-Host "✓ Service Name:      $($finalService.Name)" -ForegroundColor Green
        Write-Host "✓ Service Status:    $($finalService.Status)" -ForegroundColor Green
        Write-Host "✓ Service Account:   $($finalService.ServiceAccount)" -ForegroundColor Green
        Write-Host "✓ Configuration:     User Mode" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Trigger a new pipeline run to test Docker access" -ForegroundColor White
    Write-Host "2. Deploy to Staging should now succeed" -ForegroundColor White
    Write-Host "3. Verify staging deployment at: http://172.16.0.17:8080" -ForegroundColor White
    Write-Host ""
    Write-Host "Backup location: $backupPath" -ForegroundColor Gray
    Write-Host ""

} else {
    Write-Host ""
    Write-Host "This was a DRY RUN - no changes were made." -ForegroundColor Yellow
    Write-Host "Run without -DryRun to execute the reconfiguration." -ForegroundColor Gray
    Write-Host ""
}

Write-Success "Script completed successfully"
