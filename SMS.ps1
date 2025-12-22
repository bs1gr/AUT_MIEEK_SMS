<#
.SYNOPSIS
    SMS (Student Management System) - Universal entry point for all management scripts

.DESCRIPTION
    Provides a unified interface for Docker, native, commit readiness, installer building,
    and system verification operations. Centralizes help and simplifies script discovery.

.PARAMETER Docker
    Docker deployment operations

.PARAMETER Native
    Native development operations

.PARAMETER CommitReady
    Pre-commit quality checks

.PARAMETER Installer
    Installer building operations

.PARAMETER Version
    Version management operations

.PARAMETER Verify
    System verification operations

.PARAMETER Install
    Installation mode (with Docker, Native, Installer)

.PARAMETER Start
    Start mode (with Docker, Native)

.PARAMETER Stop
    Stop mode (with Docker, Native)

.PARAMETER Setup
    Setup mode (with Native)

.PARAMETER Update
    Update mode (with Docker, Version)

.PARAMETER Help
    Show help for all commands

.EXAMPLE
    .\SMS.ps1 -Help
    Shows all available commands

.EXAMPLE
    .\SMS.ps1 -Docker -Install
    First-time Docker setup

.EXAMPLE
    .\SMS.ps1 -Native -Start
    Start native development environment

.EXAMPLE
    .\SMS.ps1 -CommitReady -Quick
    Quick pre-commit validation

#>

param(
    [switch]$Docker,
    [switch]$Native,
    [switch]$CommitReady,
    [switch]$Installer,
    [switch]$Version,
    [switch]$Verify,
    [switch]$Install,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Setup,
    [switch]$Update,
    [switch]$UpdateClean,
    [switch]$WithMonitoring,
    [switch]$Prune,
    [switch]$DeepClean,
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Status,
    [switch]$Quick,
    [switch]$Standard,
    [switch]$Full,
    [switch]$Cleanup,
    [switch]$Build,
    [switch]$Workspace,
    [switch]$Version_Update,
    [switch]$Help,
    [string]$VersionNumber
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent $PSCommandPath

# Color helpers
$Colors = @{
    Info    = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error   = "Red"
}

function Write-Info { Write-Host $args -ForegroundColor $Colors.Info }
function Write-Success { Write-Host $args -ForegroundColor $Colors.Success }
function Write-Warning { Write-Host $args -ForegroundColor $Colors.Warning }
function Write-Error { Write-Host $args -ForegroundColor $Colors.Error }

function Show-Help {
    Write-Info @"

╔═══════════════════════════════════════════════════════════════════════════════╗
║                     SMS - Universal Entry Point                              ║
║                  Student Management System Management                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  .\SMS.ps1 [OPTIONS] [SUBCOMMANDS]

╔═══════════════════════════════════════════════════════════════════════════════╗
║                        DEPLOYMENT MODES                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

DOCKER OPERATIONS:
  .\SMS.ps1 -Docker -Install              # First-time Docker setup
  .\SMS.ps1 -Docker -Start                # Start Docker deployment
  .\SMS.ps1 -Docker -Stop                 # Stop Docker container
  .\SMS.ps1 -Docker -Update               # Update Docker with backup
  .\SMS.ps1 -Docker -UpdateClean          # Clean Docker update
  .\SMS.ps1 -Docker -WithMonitoring       # Start with Grafana/Prometheus
  .\SMS.ps1 -Docker -Status               # Check Docker status
  .\SMS.ps1 -Docker -Prune                # Safe Docker cleanup
  .\SMS.ps1 -Docker -DeepClean            # Nuclear Docker cleanup

NATIVE DEVELOPMENT:
  .\SMS.ps1 -Native -Setup                # Install dependencies
  .\SMS.ps1 -Native -Start                # Start backend + frontend
  .\SMS.ps1 -Native -Backend              # Backend only (hot-reload)
  .\SMS.ps1 -Native -Frontend             # Frontend only (HMR)
  .\SMS.ps1 -Native -Stop                 # Stop all processes
  .\SMS.ps1 -Native -Status               # Check process status

╔═══════════════════════════════════════════════════════════════════════════════╗
║                       DEVELOPMENT TOOLS                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

PRE-COMMIT VALIDATION:
  .\SMS.ps1 -CommitReady -Quick           # Quick checks (2-3 min)
  .\SMS.ps1 -CommitReady -Standard        # Standard checks (5-8 min)
  .\SMS.ps1 -CommitReady -Full            # Full checks (15-20 min)
  .\SMS.ps1 -CommitReady -Cleanup         # Format + imports only

INSTALLER BUILDING:
  .\SMS.ps1 -Installer -Build             # Build installer executable

VERSION MANAGEMENT:
  .\SMS.ps1 -Version -Version_Update "1.11.0"  # Update version

SYSTEM VERIFICATION:
  .\SMS.ps1 -Verify -Workspace            # Verify workspace integrity
  .\SMS.ps1 -Verify -Version              # Check version information

╔═══════════════════════════════════════════════════════════════════════════════╗
║                         QUICK EXAMPLES                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

First Time Setup:
  .\SMS.ps1 -Docker -Install              # Docker-based development
  .\SMS.ps1 -Native -Setup                # Native development

Daily Development:
  .\SMS.ps1 -Native -Start                # Start dev environment
  .\SMS.ps1 -CommitReady -Quick           # Pre-commit validation
  .\SMS.ps1 -Native -Stop                 # Stop dev environment

Production Deployment:
  .\SMS.ps1 -Docker -Update               # Update Docker with backup
  .\SMS.ps1 -Docker -Status               # Verify deployment

╔═══════════════════════════════════════════════════════════════════════════════╗
║                         DIRECT SCRIPT USAGE                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

You can also call scripts directly (this wrapper is optional):
  .\DOCKER.ps1 -Start
  .\NATIVE.ps1 -Start
  .\COMMIT_READY.ps1 -Quick
  .\INSTALLER_BUILDER.ps1

See individual script help for more options.

"@
}

function Invoke-Docker {
    $scriptPath = Join-Path $RootPath "DOCKER.ps1"

    $args = @()
    if ($Install) { $args += "-Install" }
    if ($Start) { $args += "-Start" }
    if ($Stop) { $args += "-Stop" }
    if ($Update) { $args += "-Update" }
    if ($UpdateClean) { $args += "-UpdateClean" }
    if ($WithMonitoring) { $args += "-WithMonitoring" }
    if ($Status) { $args += "-Status" }
    if ($Prune) { $args += "-Prune" }
    if ($DeepClean) { $args += "-DeepClean" }

    if ($args.Count -eq 0) {
        Write-Warning "No Docker operation specified. Use -Help for options."
        return
    }

    Write-Info "Running: DOCKER.ps1 $($args -join ' ')"
    & $scriptPath @args
}

function Invoke-Native {
    $scriptPath = Join-Path $RootPath "NATIVE.ps1"

    $args = @()
    if ($Setup) { $args += "-Setup" }
    if ($Start) { $args += "-Start" }
    if ($Stop) { $args += "-Stop" }
    if ($Backend) { $args += "-Backend" }
    if ($Frontend) { $args += "-Frontend" }
    if ($Status) { $args += "-Status" }

    if ($args.Count -eq 0) {
        Write-Warning "No Native operation specified. Use -Help for options."
        return
    }

    Write-Info "Running: NATIVE.ps1 $($args -join ' ')"
    & $scriptPath @args
}

function Invoke-CommitReady {
    $scriptPath = Join-Path $RootPath "COMMIT_READY.ps1"

    $args = @()
    if ($Quick) { $args += "-Quick" }
    if ($Standard) { $args += "-Standard" }
    if ($Full) { $args += "-Full" }
    if ($Cleanup) { $args += "-Cleanup" }

    if ($args.Count -eq 0) {
        Write-Warning "No validation level specified. Use -Help for options."
        return
    }

    Write-Info "Running: COMMIT_READY.ps1 $($args -join ' ')"
    & $scriptPath @args
}

function Invoke-Installer {
    $scriptPath = Join-Path $RootPath "INSTALLER_BUILDER.ps1"

    if (-not $Build) {
        Write-Warning "No Installer operation specified. Use -Build to build installer."
        return
    }

    Write-Info "Running: INSTALLER_BUILDER.ps1"
    & $scriptPath
}

function Invoke-Version {
    $versionScript = Join-Path $RootPath "scripts" "VERIFY_VERSION.ps1"

    if ($Version_Update -and $VersionNumber) {
        Write-Info "Updating version to $VersionNumber"
        & $versionScript -UpdateVersion $VersionNumber
    }
    else {
        Write-Warning "Version operation requires -Version_Update with version number"
    }
}

function Invoke-Verify {
    if ($Workspace) {
        $scriptPath = Join-Path $RootPath "scripts" "VERIFY_WORKSPACE.ps1"
        Write-Info "Running: VERIFY_WORKSPACE.ps1"
        & $scriptPath
    }
    elseif ($Version) {
        $scriptPath = Join-Path $RootPath "scripts" "VERIFY_VERSION.ps1"
        Write-Info "Running: VERIFY_VERSION.ps1"
        & $scriptPath
    }
    else {
        Write-Warning "No verification option specified. Use -Help for options."
    }
}

# Main logic
try {
    if ($Help -or ($Docker -eq $false -and $Native -eq $false -and $CommitReady -eq $false `
        -and $Installer -eq $false -and $Version -eq $false -and $Verify -eq $false)) {
        Show-Help
    }
    elseif ($Docker) {
        Invoke-Docker
    }
    elseif ($Native) {
        Invoke-Native
    }
    elseif ($CommitReady) {
        Invoke-CommitReady
    }
    elseif ($Installer) {
        Invoke-Installer
    }
    elseif ($Version) {
        Invoke-Version
    }
    elseif ($Verify) {
        Invoke-Verify
    }
    else {
        Show-Help
    }

    Write-Success "`nOperation completed successfully!"
}
catch {
    Write-Error "Error: $_"
    exit 1
}
