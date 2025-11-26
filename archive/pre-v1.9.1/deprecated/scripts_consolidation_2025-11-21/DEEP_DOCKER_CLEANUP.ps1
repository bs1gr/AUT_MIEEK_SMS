#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deep Docker cleanup for Student Management System
    
.DESCRIPTION
    Removes ALL Docker cache from old container installations including:
    - All stopped containers
    - All dangling and unused images
    - All build cache (complete)
    - All unused networks
    - Optionally: ALL volumes (WARNING: destroys data!)
    
.PARAMETER IncludeVolumes
    Also remove all volumes (WARNING: This will delete your database!)
    
.PARAMETER Force
    Skip confirmation prompts
    
.EXAMPLE
    .\DEEP_DOCKER_CLEANUP.ps1
    Safe cleanup - removes cache but preserves data volumes
    
.EXAMPLE
    .\DEEP_DOCKER_CLEANUP.ps1 -IncludeVolumes -Force
    Nuclear option - removes EVERYTHING including database
#>

param(
    [switch]$IncludeVolumes,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
Set-Location $scriptDir

# Color output functions
function Write-Success { param($Text) Write-Host "✓ $Text" -ForegroundColor Green }
function Write-Warning2 { param($Text) Write-Host "⚠ $Text" -ForegroundColor Yellow }
function Write-Error2 { param($Text) Write-Host "✗ $Text" -ForegroundColor Red }
function Write-Info { param($Text) Write-Host "ℹ $Text" -ForegroundColor Cyan }
function Write-Header {
    param($Text)
    Write-Host "`n╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host ("  {0,-66}" -f $Text) -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Test-DockerAvailable {
    try {
        $null = docker ps 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Get-DockerDiskUsage {
    try {
        $output = docker system df --format "table {{.Type}}\t{{.Total}}\t{{.Active}}\t{{.Size}}\t{{.Reclaimable}}" 2>$null
        if ($output) {
            Write-Host ""
            Write-Info "Current Docker disk usage:"
            $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
        }
    }
    catch {
        Write-Warning2 "Could not retrieve Docker disk usage"
    }
}

Write-Header "DEEP DOCKER CLEANUP for Student Management System"

# Check Docker availability
if (-not (Test-DockerAvailable)) {
    Write-Error2 "Docker is not available or not running"
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# Show current usage
Get-DockerDiskUsage

# Warning if including volumes
if ($IncludeVolumes -and -not $Force) {
    Write-Host ""
    Write-Warning2 "⚠️  WARNING: You are about to delete ALL Docker volumes!"
    Write-Host "   This will permanently delete your database and all data!" -ForegroundColor Red
    Write-Host ""
    $confirmation = Read-Host "Type 'DELETE ALL DATA' to confirm"
    if ($confirmation -ne 'DELETE ALL DATA') {
        Write-Info "Cleanup cancelled"
        exit 0
    }
}

$cleaned = @()
$errors = @()

# Stop all running containers first
Write-Header "Step 1: Stopping all SMS containers"
try {
    Write-Info "Stopping SMS containers..."
    $containers = docker ps -q --filter "name=sms" 2>$null
    if ($containers) {
        docker stop $containers 2>$null | Out-Null
        Write-Success "Stopped running SMS containers"
        $cleaned += "Stopped containers"
    }
    else {
        Write-Info "No running SMS containers found"
    }
}
catch {
    $errors += "Failed to stop containers: $($_.Exception.Message)"
    Write-Warning2 "Could not stop some containers"
}

# Remove all stopped containers
Write-Header "Step 2: Removing ALL stopped containers"
try {
    Write-Info "Pruning stopped containers..."
    $result = docker container prune -f 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Removed all stopped containers"
        $cleaned += "Stopped containers"
    }
}
catch {
    $errors += "Container prune failed: $($_.Exception.Message)"
    Write-Warning2 "Container prune had issues"
}

# Remove ALL images (dangling and unused)
Write-Header "Step 3: Removing ALL unused images"
try {
    Write-Info "Pruning all unused images (not just dangling)..."
    $result = docker image prune -a -f 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Removed all unused images"
        $cleaned += "Unused images"
    }
}
catch {
    $errors += "Image prune failed: $($_.Exception.Message)"
    Write-Warning2 "Image prune had issues"
}

# Remove old SMS images specifically
Write-Header "Step 4: Removing old SMS images"
try {
    Write-Info "Finding old sms-fullstack images..."
    $versionFile = Join-Path $scriptDir 'VERSION'
    $currentVersion = if (Test-Path $versionFile) { 
        (Get-Content $versionFile -Raw).Trim() 
    } else { 
        'unknown' 
    }
    
    $currentTag = "sms-fullstack:$currentVersion"
    $allSmsImages = docker images --format '{{.Repository}}:{{.Tag}}' | Where-Object { $_ -like 'sms-fullstack:*' }
    
    $removedCount = 0
    foreach ($image in $allSmsImages) {
        if ($image -ne $currentTag) {
            Write-Info "Removing old image: $image"
            try {
                docker rmi -f $image 2>$null | Out-Null
                $removedCount++
            }
            catch {
                Write-Warning2 "Could not remove $image (may be in use)"
            }
        }
    }
    
    if ($removedCount -gt 0) {
        Write-Success "Removed $removedCount old SMS image(s)"
        $cleaned += "Old SMS images ($removedCount)"
    }
    else {
        Write-Info "No old SMS images to remove"
    }
}
catch {
    $errors += "SMS image cleanup failed: $($_.Exception.Message)"
    Write-Warning2 "SMS image cleanup had issues"
}

# Complete builder cache cleanup
Write-Header "Step 5: Removing ALL build cache"
try {
    Write-Info "Pruning ALL builder cache (no filters)..."
    docker builder prune -a -f 2>$null | Out-Null
    Write-Success "Removed all build cache"
    $cleaned += "All build cache"
}
catch {
    $errors += "Builder cache prune failed: $($_.Exception.Message)"
    Write-Warning2 "Builder cache prune had issues"
}

# Remove unused networks
Write-Header "Step 6: Removing unused networks"
try {
    Write-Info "Pruning unused networks..."
    docker network prune -f 2>$null | Out-Null
    Write-Success "Removed unused networks"
    $cleaned += "Unused networks"
}
catch {
    $errors += "Network prune failed: $($_.Exception.Message)"
    Write-Warning2 "Network prune had issues"
}

# Remove volumes if requested
if ($IncludeVolumes) {
    Write-Header "Step 7: Removing ALL volumes (INCLUDING DATA!)"
    try {
        Write-Warning2 "Deleting all Docker volumes..."
        docker volume prune -a -f 2>$null | Out-Null
        Write-Success "Removed all volumes"
        $cleaned += "All volumes (including data!)"
    }
    catch {
        $errors += "Volume prune failed: $($_.Exception.Message)"
        Write-Warning2 "Volume prune had issues"
    }
}
else {
    Write-Header "Step 7: Preserving data volumes"
    Write-Info "Volumes preserved (use -IncludeVolumes to remove)"
}

# System-wide prune as final step
Write-Header "Step 8: System-wide cleanup"
try {
    Write-Info "Running docker system prune..."
    if ($IncludeVolumes) {
        docker system prune -a -f --volumes 2>$null | Out-Null
    }
    else {
        docker system prune -a -f 2>$null | Out-Null
    }
    Write-Success "System-wide prune completed"
    $cleaned += "System-wide prune"
}
catch {
    $errors += "System prune failed: $($_.Exception.Message)"
    Write-Warning2 "System prune had issues"
}

# Final summary
Write-Header "Cleanup Summary"

if ($cleaned.Count -gt 0) {
    Write-Success "Successfully cleaned:"
    foreach ($item in $cleaned) {
        Write-Host "  ✓ $item" -ForegroundColor Green
    }
}
else {
    Write-Info "Nothing was cleaned (everything was already clean)"
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Warning2 "Errors encountered:"
    foreach ($err in $errors) {
        Write-Host "  ✗ $err" -ForegroundColor Yellow
    }
}

# Show final disk usage
Get-DockerDiskUsage

Write-Host ""
Write-Success "Deep Docker cleanup completed!"
Write-Host ""

if ($IncludeVolumes) {
    Write-Warning2 "Database was deleted! Run .\SMART_SETUP.ps1 to reinitialize."
}
else {
    Write-Info "To also remove data volumes (database), run:"
    Write-Host "  .\DEEP_DOCKER_CLEANUP.ps1 -IncludeVolumes" -ForegroundColor Gray
}

Write-Host ""
