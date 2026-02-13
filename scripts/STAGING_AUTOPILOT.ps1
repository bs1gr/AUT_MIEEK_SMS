<#
.SYNOPSIS
    One-shot staging automation preflight for the self-hosted runner.

.DESCRIPTION
    Ensures the staging runner can access Docker Desktop and the repository
    without permission issues. This script is safe to re-run and is designed
    to be called from the CI deploy job or manually on the staging host.

    What it does (idempotent):
    - Normalizes Git safe directory for the repo
    - Ensures Docker CLI is on PATH and Docker Desktop is running
    - Verifies docker-users group membership for the runner service account
    - Optionally reconfigures runner to user mode if it is still NetworkService
    - Restarts runner service (if present)
    - Verifies Docker access (docker ps/info/compose)

.PARAMETER RunnerPath
    Path to the GitHub Actions runner installation directory.

.PARAMETER RepoPath
    Path to the repository root to mark as a safe git directory.

.PARAMETER Force
    Skip confirmation prompts when reconfiguring the runner.

.PARAMETER VerifyOnly
    Only run checks; skip any fixes or reconfiguration.
#>

[CmdletBinding()]
param(
    [string]$RunnerPath = "D:\actions-runner",
    [string]$RepoPath,
    [string]$RunnerUser,
    [switch]$Force,
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Message)
    Write-Host "";
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

function Get-RunnerService {
    return Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
}

function Get-RunnerServiceAccount {
    param([string]$ServiceName)
    return (Get-CimInstance Win32_Service -Filter "Name='$ServiceName'").StartName
}

function Get-LocalAccountName {
    param([string]$AccountName)

    if (-not $AccountName) {
        return $null
    }

    if ($AccountName -match "\\") {
        return ($AccountName -split "\\")[-1]
    }

    return $AccountName
}

function Normalize-AccountName {
    param([string]$AccountName)

    if (-not $AccountName) {
        return $null
    }

    if ($AccountName.StartsWith(".\\")) {
        return "$env:COMPUTERNAME\$($AccountName.Substring(2))"
    }

    return $AccountName
}

function Get-DockerUsersMemberName {
    param([string]$AccountName)

    if (-not $AccountName) {
        return $null
    }

    if ($AccountName -match "^MicrosoftAccount\\") {
        return $AccountName
    }

    if ($AccountName.StartsWith(".\\")) {
        return $AccountName.Substring(2)
    }

    return $AccountName
}

function Get-RunnerAccountInfo {
    param([string]$AccountName)

    $shortName = Get-LocalAccountName -AccountName $AccountName
    $isSystemAccount = $AccountName -match "NetworkService|LocalSystem|LocalService"

    $localUser = $null
    $localGroup = $null

    if ($shortName) {
        $localUser = Get-LocalUser -Name $shortName -ErrorAction SilentlyContinue
        if (-not $localUser) {
            $localGroup = Get-LocalGroup -Name $shortName -ErrorAction SilentlyContinue
        }
    }

    return [pscustomobject]@{
        Name = $AccountName
        ShortName = $shortName
        IsSystemAccount = $isSystemAccount
        IsLocalUser = ($null -ne $localUser)
        IsLocalGroup = ($null -ne $localGroup)
    }
}

function Ensure-GitSafeDirectory {
    param([string]$Path)
    if (-not $Path) {
        return
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Warning "Git not found on PATH; skipping safe.directory configuration"
        return
    }
    try {
        $resolved = (Resolve-Path -Path $Path).Path
        git config --global --add safe.directory $resolved | Out-Null
        Write-Success "Git safe directory set: $resolved"
    } catch {
        Write-Warning "Failed to set git safe directory: $_"
    }
}

function Ensure-DockerPath {
    $dockerBinCandidates = @(
        "C:\Program Files\Docker\Docker\resources\bin",
        "C:\Program Files\Docker\Docker\resources"
    )

    foreach ($path in $dockerBinCandidates) {
        if ((Test-Path -LiteralPath $path) -and ($env:Path -notlike "*$path*")) {
            $env:Path = "$path;$env:Path"
            if ($env:GITHUB_PATH) {
                Add-Content -Path $env:GITHUB_PATH -Value $path
            }
        }
    }
}

function Ensure-DockerRunning {
    param(
        [int]$MaxAttempts = 12,
        [int]$DelaySeconds = 3
    )

    Ensure-DockerPath

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "Docker command not found in PATH"
        return $false
    }

    try {
        Start-Service -Name "com.docker.service" -ErrorAction SilentlyContinue | Out-Null
    } catch {
        # Service may not exist in all environments
    }

    $desktopCandidates = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "C:\Program Files\Docker\Docker\Docker.exe"
    )

    foreach ($candidate in $desktopCandidates) {
        if (Test-Path $candidate) {
            Start-Process -FilePath $candidate -ErrorAction SilentlyContinue | Out-Null
            break
        }
    }

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        docker ps > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker is available and running"
            return $true
        }
        Write-Host "  Waiting for Docker to start ($attempt/$MaxAttempts)..." -ForegroundColor Gray
        Start-Sleep -Seconds $DelaySeconds
    }

    Write-ErrorMsg "Docker failed to start after $MaxAttempts attempts"
    return $false
}

function Ensure-RunnerServiceScript {
    param([string]$RunnerPath)

    $svcScript = Join-Path $RunnerPath "svc.ps1"
    if (Test-Path $svcScript) {
        return $true
    }

    $runnerZip = Get-ChildItem -Path $RunnerPath -Filter "actions-runner-win-x64-*.zip" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $runnerZip) {
        Write-ErrorMsg "Runner service script missing and runner zip not found in $RunnerPath"
        return $false
    }

    $tempDir = Join-Path $RunnerPath "_runner_extract_tmp"
    try {
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }

        Expand-Archive -Path $runnerZip.FullName -DestinationPath $tempDir -Force
        $extractedSvc = Join-Path $tempDir "svc.ps1"

        if (-not (Test-Path $extractedSvc)) {
            Write-ErrorMsg "svc.ps1 not found inside runner zip: $($runnerZip.Name)"
            return $false
        }

        Copy-Item -Path $extractedSvc -Destination $svcScript -Force
        Write-Success "Restored svc.ps1 from runner zip: $($runnerZip.Name)"
        return $true
    } catch {
        Write-ErrorMsg "Failed to restore svc.ps1: $_"
        return $false
    } finally {
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Ensure-DockerUsersGroup {
    param([string]$AccountName)

    if (-not $AccountName) {
        return $false
    }

    try {
        $dockerUsersGroup = Get-LocalGroup -Name "docker-users" -ErrorAction Stop
    } catch {
        Write-ErrorMsg "docker-users group not found; Docker Desktop may be misconfigured"
        return $false
    }

    $normalizedAccount = Get-DockerUsersMemberName -AccountName $AccountName
    $members = Get-LocalGroupMember -Group "docker-users" -ErrorAction SilentlyContinue
    $alreadyMember = $members | Where-Object { $_.Name -ieq $AccountName -or $_.Name -ieq $normalizedAccount }

    if ($alreadyMember) {
        Write-Success "docker-users membership confirmed for $AccountName"
        return $true
    }

    Write-Step "Adding $normalizedAccount to docker-users group"
    try {
        Add-LocalGroupMember -Group "docker-users" -Member $normalizedAccount -ErrorAction Stop
        Write-Success "Added $normalizedAccount to docker-users group"
        return $true
    } catch {
        Write-ErrorMsg "Failed to add $normalizedAccount to docker-users group: $_"
        return $false
    }
}

function Reconfigure-RunnerIfNeeded {
    param(
        [string]$RunnerPath,
        [string]$DesiredRunnerUser
    )

    $service = Get-RunnerService
    if (-not $service) {
        Write-Warning "Runner service not found; skipping reconfiguration"
        return $true
    }

    $serviceAccount = Get-RunnerServiceAccount -ServiceName $service.Name
    $accountInfo = Get-RunnerAccountInfo -AccountName $serviceAccount
    Write-Host "Runner Service: $($service.Name)" -ForegroundColor Gray
    Write-Host "Service Account: $serviceAccount" -ForegroundColor Gray

    $normalizedServiceAccount = Normalize-AccountName -AccountName $serviceAccount
    $normalizedDesiredAccount = Normalize-AccountName -AccountName $DesiredRunnerUser
    $desiredMismatch = $normalizedDesiredAccount -and ($normalizedServiceAccount -ne $normalizedDesiredAccount)

    $needsReconfig = $accountInfo.IsSystemAccount -or -not $accountInfo.IsLocalUser -or $desiredMismatch
    if (-not $needsReconfig) {
        Write-Success "Runner service already runs as a user account"
        return $true
    }

    if ($desiredMismatch) {
        Write-Warning "Runner service account differs from requested user; reconfiguration required"
    } elseif (-not $accountInfo.IsLocalUser) {
        if ($accountInfo.IsLocalGroup) {
            Write-Warning "Runner service account is a local group ($($accountInfo.ShortName)); reconfiguration required"
        } else {
            Write-Warning "Runner service account not found as a local user; reconfiguration required"
        }
    }

    if ($VerifyOnly) {
        Write-Warning "Runner service uses a system account; reconfiguration required"
        return $false
    }

    if (-not (Test-AdminPrivileges)) {
        Write-ErrorMsg "Administrator privileges required to reconfigure runner service"
        return $false
    }

    if (-not (Ensure-RunnerServiceScript -RunnerPath $RunnerPath)) {
        Write-Warning "Runner service script missing; continuing with fallback reconfiguration"
    }

    $reconfigScript = Join-Path $PSScriptRoot "RECONFIGURE_RUNNER_USER_MODE.ps1"
    if (-not (Test-Path $reconfigScript)) {
        Write-ErrorMsg "Reconfiguration script not found: $reconfigScript"
        return $false
    }

    Write-Step "Reconfiguring runner to user mode"
    $reconfigArgs = @{
        RunnerPath = $RunnerPath
    }

    if ($DesiredRunnerUser) {
        $reconfigArgs.RunnerUser = $DesiredRunnerUser
    }

    if ($Force) {
        $reconfigArgs.Force = $true
    }

    & $reconfigScript @reconfigArgs

    return $LASTEXITCODE -eq 0
}

function Restart-RunnerService {
    $service = Get-RunnerService
    if (-not $service) {
        Write-Warning "Runner service not found; skipping restart"
        return $true
    }

    if ($VerifyOnly) {
        Write-Host "Skipping runner service restart (VerifyOnly)" -ForegroundColor Gray
        return $true
    }

    Write-Step "Restarting runner service"
    try {
        Restart-Service -Name $service.Name -Force -ErrorAction Stop
        Start-Sleep -Seconds 3
        $status = (Get-Service -Name $service.Name).Status
        if ($status -eq "Running") {
            Write-Success "Runner service restarted"
            return $true
        }
        Write-Warning "Runner service status: $status"
        return $false
    } catch {
        Write-ErrorMsg "Failed to restart runner service: $_"
        return $false
    }
}

function Verify-DockerAccess {
    $checks = @()

    $dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
    $checks += [pscustomobject]@{ Name = "Docker command"; Pass = ($null -ne $dockerAvailable) }

    docker ps > $null 2>&1
    $checks += [pscustomobject]@{ Name = "Docker daemon"; Pass = ($LASTEXITCODE -eq 0) }

    docker info > $null 2>&1
    $checks += [pscustomobject]@{ Name = "Docker info"; Pass = ($LASTEXITCODE -eq 0) }

    docker compose version > $null 2>&1
    $checks += [pscustomobject]@{ Name = "Docker compose"; Pass = ($LASTEXITCODE -eq 0) }

    $failed = $checks | Where-Object { -not $_.Pass }
    if ($failed) {
        Write-ErrorMsg "Docker access verification failed: $($failed.Name -join ', ')"
        return $false
    }

    Write-Success "Docker access verified"
    return $true
}

Write-Header "Staging Automation Preflight"

if (-not $RepoPath) {
    $RepoPath = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
}

Write-Step "Git safe directory"
Ensure-GitSafeDirectory -Path $RepoPath

Write-Step "Runner reconfiguration check"
$reconfigOk = Reconfigure-RunnerIfNeeded -RunnerPath $RunnerPath -DesiredRunnerUser $RunnerUser

Write-Step "docker-users group membership"
$runnerService = Get-RunnerService
if ($runnerService) {
    $serviceAccount = Get-RunnerServiceAccount -ServiceName $runnerService.Name
    $accountInfo = Get-RunnerAccountInfo -AccountName $serviceAccount
    $membershipAccount = if ($RunnerUser) { $RunnerUser } else { $serviceAccount }
    if ($membershipAccount -and -not $accountInfo.IsSystemAccount) {
        if (-not $VerifyOnly) {
            if (-not (Test-AdminPrivileges)) {
                Write-ErrorMsg "Administrator privileges required to modify docker-users membership"
                $reconfigOk = $false
            } else {
                $membershipOk = Ensure-DockerUsersGroup -AccountName $membershipAccount
                if (-not $membershipOk) {
                    $reconfigOk = $false
                }
            }
        } else {
            Write-Host "Skipping docker-users membership changes (VerifyOnly)" -ForegroundColor Gray
        }
    } else {
        if ($accountInfo.IsSystemAccount) {
            Write-Warning "Runner service account is system-level; docker-users membership not applicable"
        } elseif ($serviceAccount) {
            Write-Warning "Runner service account is not a local user; docker-users membership skipped"
        } else {
            Write-Warning "Runner service account not detected; docker-users membership skipped"
        }
    }
} else {
    Write-Warning "Runner service not found; docker-users membership check skipped"
}

Write-Step "Docker Desktop availability"
$dockerOk = Ensure-DockerRunning

Write-Step "Runner service restart"
$restartOk = Restart-RunnerService

Write-Step "Docker access verification"
$verifyOk = Verify-DockerAccess

if ($reconfigOk -and $dockerOk -and $restartOk -and $verifyOk) {
    Write-Success "Staging preflight completed successfully"
    exit 0
}

Write-ErrorMsg "Staging preflight failed. Review the messages above."
exit 1
