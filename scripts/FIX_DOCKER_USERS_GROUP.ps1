<#
.SYNOPSIS
    Add user to docker-users group and verify Docker access for runner service.

.DESCRIPTION
    This script adds the current user to the docker-users group, which is required
    for Docker Desktop named pipe access even when the runner runs as a user account.
    
    Windows services run in Session 0 (isolated) and need explicit group membership
    to access Docker Desktop, even when configured to run as a specific user.

.EXAMPLE
    Run on REC host as Administrator:
    .\FIX_DOCKER_USERS_GROUP.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Test-AdminPrivileges {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Docker Users Group Fix - Runner Service Access" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check admin privileges
if (-not (Test-AdminPrivileges)) {
    Write-Host "❌ ERROR: This script requires Administrator privileges" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Get current user
$currentUser = $env:USERNAME
$currentDomain = $env:USERDOMAIN
$fullUser = "$currentDomain\$currentUser"

Write-Host "Current User: $fullUser" -ForegroundColor Cyan
Write-Host ""

# Check if docker-users group exists
Write-Host "▶ Checking docker-users group..." -ForegroundColor Yellow
try {
    $dockerUsersGroup = Get-LocalGroup -Name "docker-users" -ErrorAction Stop
    Write-Host "✓ docker-users group found" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: docker-users group not found" -ForegroundColor Red
    Write-Host "Docker Desktop may not be installed properly." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check current membership
Write-Host "▶ Checking current group membership..." -ForegroundColor Yellow
$currentMembers = Get-LocalGroupMember -Group "docker-users" -ErrorAction SilentlyContinue
$isMember = $currentMembers | Where-Object { $_.Name -like "*$currentUser" }

if ($isMember) {
    Write-Host "✓ $currentUser is already in docker-users group" -ForegroundColor Green
} else {
    Write-Host "⚠ $currentUser is NOT in docker-users group" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Adding $currentUser to docker-users group..." -ForegroundColor Yellow
    
    try {
        Add-LocalGroupMember -Group "docker-users" -Member $currentUser -ErrorAction Stop
        Write-Host "✓ Successfully added to docker-users group" -ForegroundColor Green
    } catch {
        Write-Host "❌ ERROR: Failed to add user to group: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Display current members
Write-Host "Current docker-users members:" -ForegroundColor Cyan
Get-LocalGroupMember -Group "docker-users" | ForEach-Object {
    Write-Host "  • $($_.Name)" -ForegroundColor White
}

Write-Host ""

# Find runner service
Write-Host "▶ Finding GitHub Actions runner service..." -ForegroundColor Yellow
$runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue

if (-not $runnerService) {
    Write-Host "⚠ No runner service found" -ForegroundColor Yellow
    Write-Host "Service may not be installed or uses different naming." -ForegroundColor Gray
} else {
    Write-Host "✓ Found service: $($runnerService.Name)" -ForegroundColor Green
    Write-Host "  Status: $($runnerService.Status)" -ForegroundColor Gray
    
    # Get service account
    $serviceAccount = (Get-CimInstance Win32_Service -Filter "Name='$($runnerService.Name)'").StartName
    Write-Host "  Account: $serviceAccount" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "▶ Restarting runner service to pick up group changes..." -ForegroundColor Yellow
    
    try {
        Restart-Service -Name $runnerService.Name -Force -ErrorAction Stop
        Start-Sleep -Seconds 3
        
        $newStatus = (Get-Service -Name $runnerService.Name).Status
        if ($newStatus -eq 'Running') {
            Write-Host "✓ Service restarted successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠ Service status: $newStatus" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ ERROR: Failed to restart service: $_" -ForegroundColor Red
        Write-Host "You may need to restart manually." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Docker Access Test" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing Docker access in YOUR session (should work):" -ForegroundColor White
try {
    $dockerVersion = docker version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker version command succeeded" -ForegroundColor Green
    } else {
        Write-Host "⚠ Docker version command failed (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
    }
    
    docker ps > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker ps command succeeded" -ForegroundColor Green
        Write-Host "✓ YOU have full Docker access" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker ps command failed" -ForegroundColor Red
        Write-Host "Even your interactive session lacks Docker access" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Docker test failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "Next Steps" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "1. ✓ User added to docker-users group" -ForegroundColor Green
Write-Host "2. ✓ Runner service restarted" -ForegroundColor Green
Write-Host "3. ⏳ Trigger new pipeline run to test" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Docker Desktop Settings" -ForegroundColor Yellow
Write-Host ""
Write-Host "If the pipeline still fails, check Docker Desktop settings:" -ForegroundColor White
Write-Host "  1. Open Docker Desktop" -ForegroundColor Gray
Write-Host "  2. Settings → Resources → WSL Integration" -ForegroundColor Gray
Write-Host "  3. Enable 'Expose daemon on tcp://localhost:2375 without TLS'" -ForegroundColor Gray
Write-Host "     (Alternative if named pipe access still fails)" -ForegroundColor Gray
Write-Host ""
Write-Host "Or check:" -ForegroundColor White
Write-Host "  Settings → Advanced → 'Use Windows containers'" -ForegroundColor Gray
Write-Host "  (Should be unchecked for Linux containers)" -ForegroundColor Gray
Write-Host ""
