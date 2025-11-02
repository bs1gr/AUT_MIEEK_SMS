#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Check Docker volume schema version and suggest migration if needed

.DESCRIPTION
    Compares the Alembic schema version between:
    - Native database (data/student_management.db)
    - Docker volume database (sms_data)

    If versions don't match, suggests running volume migration.

.EXAMPLE
    .\scripts\CHECK_VOLUME_VERSION.ps1

.EXAMPLE
    .\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate
    Automatically migrate if version mismatch detected
#>

param(
    [switch]$AutoMigrate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$projectRoot = Split-Path $scriptDir -Parent
Set-Location $projectRoot

# Colors for output
function Write-Success { param($Text) Write-Host "✓ $Text" -ForegroundColor Green }
function Write-Warning2 { param($Text) Write-Host "⚠ $Text" -ForegroundColor Yellow }
function Write-Error2 { param($Text) Write-Host "✗ $Text" -ForegroundColor Red }
function Write-Info { param($Text) Write-Host "ℹ $Text" -ForegroundColor Blue }

function Get-AlembicVersion {
    param([string]$DbPath)

    if (-not (Test-Path $DbPath)) {
        return $null
    }

    try {
        # Query alembic_version table using Python
        $pythonCode = @"
import sqlite3
import sys
try:
    conn = sqlite3.connect(sys.argv[1])
    cursor = conn.cursor()
    cursor.execute("SELECT version_num FROM alembic_version")
    result = cursor.fetchone()
    conn.close()
    if result:
        print(result[0])
    else:
        print("no_version")
except Exception as e:
    print(f"error: {e}", file=sys.stderr)
    sys.exit(1)
"@

        $tempFile = [System.IO.Path]::GetTempFileName() + ".py"
        $pythonCode | Set-Content -Path $tempFile -Encoding UTF8

        $result = python $tempFile $DbPath 2>&1
        Remove-Item $tempFile -ErrorAction SilentlyContinue

        if ($LASTEXITCODE -eq 0) {
            return $result.Trim()
        }
        return $null
    } catch {
        return $null
    }
}

function Get-DockerVolumeVersion {
    param([string]$VolumeName)

    try {
        # Check if volume exists
        $volumeExists = docker volume inspect $VolumeName 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $null
        }

        # Extract database from volume and check version
        $tempDir = [System.IO.Path]::GetTempPath()
        $tempDb = Join-Path $tempDir "temp_sms_docker.db"

        # Copy DB from volume
        docker run --rm -v "${VolumeName}:/data" -v "${tempDir}:/temp" alpine sh -c "cp /data/student_management.db /temp/temp_sms_docker.db" 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tempDb)) {
            return $null
        }

        $version = Get-AlembicVersion -DbPath $tempDb
        Remove-Item $tempDb -ErrorAction SilentlyContinue

        return $version
    } catch {
        return $null
    }
}

Write-Host "`n╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DATABASE VERSION CHECK                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    $null = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning2 "Docker is not running. Skipping Docker volume check."
        exit 0
    }
} catch {
    Write-Warning2 "Docker is not available. Skipping Docker volume check."
    exit 0
}

# Check native database
Write-Info "Checking native database..."
$nativeDb = Join-Path $projectRoot "data\student_management.db"
if (Test-Path $nativeDb) {
    $nativeVersion = Get-AlembicVersion -DbPath $nativeDb
    if ($nativeVersion) {
        Write-Success "Native DB schema version: $nativeVersion"
    } else {
        Write-Warning2 "Native DB has no version info (not migrated yet?)"
        $nativeVersion = "unknown"
    }
} else {
    Write-Info "Native database not found (will be created on first run)"
    $nativeVersion = $null
}

# Check Docker volume
Write-Info "Checking Docker volume..."
$dockerVolume = "sms_data"
$dockerVersion = Get-DockerVolumeVersion -VolumeName $dockerVolume

if ($dockerVersion) {
    Write-Success "Docker volume schema version: $dockerVersion"
} elseif ($dockerVersion -eq $null) {
    Write-Info "Docker volume not found or empty"
} else {
    Write-Warning2 "Docker volume exists but schema version unknown"
}

Write-Host ""

# Compare versions
if ($nativeVersion -and $dockerVersion) {
    if ($nativeVersion -eq $dockerVersion) {
        Write-Success "✓ Versions match! Native and Docker are in sync."
        Write-Host ""
        exit 0
    } else {
        Write-Warning2 "⚠ VERSION MISMATCH DETECTED!"
        Write-Host ""
        Write-Host "  Native database:  $nativeVersion" -ForegroundColor Yellow
        Write-Host "  Docker volume:    $dockerVersion" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "This means:" -ForegroundColor Cyan
        Write-Host "  • Your native and Docker databases have different schemas" -ForegroundColor White
        Write-Host "  • Using Docker mode may cause errors" -ForegroundColor White
        Write-Host "  • You should migrate the Docker volume to match native" -ForegroundColor White
        Write-Host ""

        if ($AutoMigrate) {
            Write-Info "Auto-migrate enabled. Creating new versioned volume..."
            Write-Host ""

            # Call the volume update via backend API (if running) or PowerShell script
            $updateScript = Join-Path $projectRoot "scripts\DOCKER_UPDATE_VOLUME.ps1"
            if (Test-Path $updateScript) {
                & $updateScript
                Write-Host ""
                Write-Success "Migration complete! Restart Docker to apply changes:"
                Write-Host "  docker compose down && docker compose up -d" -ForegroundColor Cyan
            } else {
                Write-Warning2 "Update script not found. Please use Control Panel to migrate volume."
            }
        } else {
            Write-Host "Recommended actions:" -ForegroundColor Cyan
            Write-Host "  1. Use Control Panel → Docker Operations → 'Update Docker Data Volume'" -ForegroundColor White
            Write-Host "  2. Choose 'Migrate data' to copy from current volume" -ForegroundColor White
            Write-Host "  3. Restart: docker compose down && docker compose up -d" -ForegroundColor White
            Write-Host ""
            Write-Host "Or run this script with -AutoMigrate flag" -ForegroundColor Gray
        }
        Write-Host ""
        exit 1
    }
} else {
    Write-Info "Cannot compare versions (one or both databases not found)"
    Write-Host ""
    exit 0
}
