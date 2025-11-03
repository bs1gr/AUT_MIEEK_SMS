# ============================================================================
#   Student Management System - Developer Tools & Troubleshooting
#   Docker diagnostics, advanced operations, and development utilities
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Read version
$version = "unknown"
if (Test-Path "VERSION") {
    $version = (Get-Content "VERSION" -Raw).Trim()
}

# Cross-host safe pause helper (avoids RawUI.ReadKey which can hang in VS Code)
function Pause-ForUser {
    param(
        [string]$Message = "Press ENTER to continue..."
    )
    Write-Host ""
    try {
        Read-Host -Prompt $Message | Out-Null
    } catch {
        Start-Sleep -Seconds 1
    }
}

# Helper function to check if Docker is running
function Test-DockerRunning {
    try {
        $null = docker ps 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# Attempt to start Docker Desktop and wait for daemon readiness
function Start-DockerDesktop {
    Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow
    $defaultPath = Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    $altPath = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'
    $ddProc = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $ddProc) {
        $exe = if (Test-Path $defaultPath) { $defaultPath } elseif (Test-Path $altPath) { $altPath } else { $null }
        if ($null -eq $exe) {
            Write-Host "Could not find Docker Desktop executable. Please start it manually." -ForegroundColor Red
            return $false
        }
        Start-Process -FilePath $exe | Out-Null
        Start-Sleep -Seconds 2
    }
    # Wait up to 120s for daemon
    $maxWait = 120; $elapsed = 0
    while ($elapsed -lt $maxWait) {
        try {
            docker version --format '{{.Server.Version}}' 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { return $true }
        } catch {}
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    Write-Host "Docker daemon did not become ready in time." -ForegroundColor Red
    return $false
}

# Ensure Linux engine (not Windows containers mode)
function Ensure-LinuxEngine {
    try {
        $serverOs = docker info --format '{{.OSType}}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $serverOs -and $serverOs.Trim().ToLower() -ne 'linux') {
            Write-Host "Switching Docker Desktop to Linux containers..." -ForegroundColor Yellow
            $cli = Join-Path $Env:ProgramFiles 'Docker\\Docker\\DockerCli.exe'
            if (-not (Test-Path $cli)) { $cli = 'C:\\Program Files\\Docker\\Docker\\DockerCli.exe' }
            if (Test-Path $cli) {
                & $cli -SwitchLinuxEngine
                Start-Sleep -Seconds 5
                $serverOs = docker info --format '{{.OSType}}' 2>$null
                if ($LASTEXITCODE -eq 0 -and $serverOs.Trim().ToLower() -eq 'linux') {
                    Write-Host "Linux engine active." -ForegroundColor Green
                } else {
                    Write-Host "Unable to confirm Linux engine; please switch manually from Docker Desktop." -ForegroundColor Yellow
                }
            } else {
                Write-Host "DockerCli.exe not found; please switch to Linux containers manually." -ForegroundColor Yellow
            }
        }
    } catch {}
}

# Helper function to ensure Docker is running
function Ensure-DockerRunning {
    if (Test-DockerRunning) {
        Ensure-LinuxEngine
        return $true
    }
    Write-Host ""
    Write-Host "Docker is not running. Trying to start Docker Desktop..." -ForegroundColor Yellow
    if (Start-DockerDesktop) {
        Ensure-LinuxEngine
        return $true
    } else {
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
        Pause-ForUser
        return $false
    }
}

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Student Management System - Developer Tools" -ForegroundColor Cyan
    Write-Host "  Version: $version" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  DOCKER OPERATIONS" -ForegroundColor Yellow
    Write-Host "  [1] Build Fullstack Image" -ForegroundColor White
    Write-Host "  [2] View Container Logs" -ForegroundColor White
    Write-Host "  [3] Shell Into Container" -ForegroundColor White
    Write-Host "  [4] Remove All Containers & Images" -ForegroundColor Red
    Write-Host "  [5] Docker Smoke Test" -ForegroundColor White
    Write-Host ""
    Write-Host "  DIAGNOSTICS" -ForegroundColor Yellow
    Write-Host "  [6] Check Docker Status" -ForegroundColor White
    Write-Host "  [7] Debug Port Conflicts" -ForegroundColor White
    Write-Host "  [8] View Database Info" -ForegroundColor White
    Write-Host "  [9] Test API Endpoints" -ForegroundColor White
    Write-Host ""
    Write-Host "  DOCKER COMPOSE (Legacy)" -ForegroundColor Yellow
    Write-Host "  [D] Docker Compose Up (2 containers + NGINX)" -ForegroundColor Green
    Write-Host "  [E] Docker Compose Down" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  DATABASE MANAGEMENT" -ForegroundColor Yellow
    Write-Host "  [B] Backup Database" -ForegroundColor White
    Write-Host "  [T] Restore Database" -ForegroundColor White
    Write-Host "  [W] Open Backups Folder" -ForegroundColor White
    Write-Host "  [M] Migrate Compose → Fullstack Volume" -ForegroundColor White
    Write-Host "  [R] Reset Database (Delete Volume)" -ForegroundColor Red
    Write-Host "  [U] List All Volumes" -ForegroundColor White
    Write-Host "  [X] Remove Old/Unused Volumes" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  MAINTENANCE" -ForegroundColor Yellow
    Write-Host "  [C] Cleanup Docker Resources" -ForegroundColor White
    Write-Host "  [P] Create Deployment Package" -ForegroundColor White
    Write-Host "  [L] List/Manage Backups" -ForegroundColor White
    Write-Host ""
    Write-Host "  NATIVE DEV MODE (Advanced)" -ForegroundColor Yellow
    Write-Host "  [N] Start Native Backend+Frontend" -ForegroundColor White
    Write-Host "  [S] Stop Native Services" -ForegroundColor White
    Write-Host "  [K] Kill All Native Processes" -ForegroundColor Red
    Write-Host ""
    Write-Host "  INFO & HELP" -ForegroundColor Yellow
    Write-Host "  [V] Show Version Info" -ForegroundColor White
    Write-Host "  [O] Open App (http://localhost:8080)" -ForegroundColor White
    Write-Host "  [H] Help Documentation" -ForegroundColor White
    Write-Host ""
    Write-Host "  [0] Exit" -ForegroundColor Gray
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Build-FullstackImage {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "Building Fullstack Image..." -ForegroundColor Blue
    Write-Host ""
    $useNoCache = Read-Host "Use no-cache rebuild? (y/N)"
    if ($useNoCache -match '^(y|yes)$') {
        & ".\scripts\docker\DOCKER_FULLSTACK_UP.ps1" -Rebuild -NoCache
    } else {
        & ".\scripts\docker\DOCKER_FULLSTACK_UP.ps1" -Rebuild
    }
    Write-Host ""
    Pause-ForUser
}

function View-ContainerLogs {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "Container Logs (last 50 lines):" -ForegroundColor Blue
    Write-Host ""
    docker logs --tail 50 sms-fullstack 2>&1
    Write-Host ""
    Pause-ForUser
}

function Shell-IntoContainer {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "Opening shell in container..." -ForegroundColor Blue
    Write-Host "Type 'exit' to return to this menu." -ForegroundColor Gray
    Write-Host ""
    docker exec -it sms-fullstack /bin/sh
    Write-Host ""
    Pause-ForUser
}

function Remove-AllDockerResources {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "WARNING: This will remove all SMS containers and images!" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Type 'YES' to confirm"
    if ($confirm -ne 'YES') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        return
    }

    Write-Host ""
    Write-Host "Removing containers..." -ForegroundColor Yellow
    docker rm -f sms-fullstack sms-backend sms-frontend 2>$null

    Write-Host "Removing images..." -ForegroundColor Yellow
    docker rmi -f sms-fullstack sms-backend sms-frontend 2>$null

    Write-Host "Done." -ForegroundColor Green
    Write-Host ""
    Pause-ForUser
}

function Test-DockerSmoke {
    Write-Host ""
    Write-Host "Docker Smoke Test..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\docker\DOCKER_SMOKE.ps1"
    Write-Host ""
    Pause-ForUser
}

function Check-DockerStatus {
    if (-not (Ensure-DockerRunning)) { return }
    Write-Host ""
    Write-Host "Docker Status:" -ForegroundColor Blue
    Write-Host ""

    Write-Host "Docker Version:" -ForegroundColor Yellow
    docker version --format "  Client: {{.Client.Version}}`n  Server: {{.Server.Version}}"

    Write-Host ""
    Write-Host "Running Containers:" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    Write-Host ""
    Write-Host "Images:" -ForegroundColor Yellow
    docker images --filter "reference=sms-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

    Write-Host ""
    Write-Host "Volumes:" -ForegroundColor Yellow
    docker volume ls --filter "name=sms" --format "table {{.Name}}\t{{.Driver}}"

    Write-Host ""
    Pause-ForUser
}

function Debug-Ports {
    Write-Host ""
    Write-Host "Checking Port Usage..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\DEBUG_PORTS.ps1"
    Write-Host ""
    Pause-ForUser
}

function View-DatabaseInfo {
    if (-not (Ensure-DockerRunning)) { return }
    Write-Host ""
    Write-Host "Database Information:" -ForegroundColor Blue
    Write-Host ""

    Write-Host "Volume Location:" -ForegroundColor Yellow
    docker volume inspect sms_data --format "  {{.Mountpoint}}" 2>$null

    Write-Host ""
    Write-Host "Database File (in container):" -ForegroundColor Yellow
    docker exec sms-fullstack ls -lh /data/student_management.db 2>$null

    Write-Host ""
    Pause-ForUser
}

function Test-APIEndpoints {
    Write-Host ""
    Write-Host "Testing API Endpoints..." -ForegroundColor Blue
    Write-Host ""

    $endpoints = @(
        @{Name="Root"; URL="http://localhost:8080/"},
        @{Name="Health"; URL="http://localhost:8080/health"},
        @{Name="API Info"; URL="http://localhost:8080/api"},
        @{Name="Docs"; URL="http://localhost:8080/docs"}
    )

    foreach ($ep in $endpoints) {
        Write-Host "$($ep.Name): " -NoNewline -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri $ep.URL -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            Write-Host "✓ $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "✗ Failed" -ForegroundColor Red
        }
    }

    Write-Host ""
    Pause-ForUser
}

function Start-DockerCompose {
    if (-not (Ensure-DockerRunning)) { return }
    Write-Host ""
    Write-Host "Starting Docker Compose..." -ForegroundColor Green
    Write-Host ""
    & ".\scripts\docker\DOCKER_UP.ps1"
    Write-Host ""
    Pause-ForUser
}

function Stop-DockerCompose {
    if (-not (Ensure-DockerRunning)) { return }
    Write-Host ""
    Write-Host "Stopping Docker Compose..." -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\docker\DOCKER_DOWN.ps1"
    Write-Host ""
    Pause-ForUser
}

function Cleanup-DockerResources {
    if (-not (Ensure-DockerRunning)) { return }
    Write-Host ""
    Write-Host "Cleaning up Docker resources..." -ForegroundColor Yellow
    Write-Host ""

    Write-Host "Pruning unused containers..." -ForegroundColor Gray
    docker container prune -f

    Write-Host "Pruning unused images..." -ForegroundColor Gray
    docker image prune -f

    Write-Host "Pruning unused networks..." -ForegroundColor Gray
    docker network prune -f

    Write-Host ""
    Write-Host "Done." -ForegroundColor Green
    Write-Host ""
    Pause-ForUser
}

function Create-Package {
    Write-Host ""
    Write-Host "Creating Deployment Package..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\CREATE_PACKAGE.ps1"
    Write-Host ""
    Pause-ForUser
}

function Reset-Database {
    Write-Host ""
    Write-Host "WARNING: This will delete all database data!" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Type 'DELETE' to confirm"
    if ($confirm -ne 'DELETE') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        return
    }

    Write-Host ""
    Write-Host "Stopping container..." -ForegroundColor Yellow
    docker stop sms-fullstack 2>$null

    Write-Host "Removing volume..." -ForegroundColor Yellow
    docker volume rm sms_data 2>$null

    Write-Host "Recreating volume..." -ForegroundColor Green
    docker volume create sms_data

    Write-Host "Done. Restart the app to initialize a fresh database." -ForegroundColor Green
    Write-Host ""
    Pause-ForUser
}

function Backup-Database {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "Backing up database from volume 'sms_data'..." -ForegroundColor Blue
    Write-Host ""

    $backupsDir = Join-Path $PSScriptRoot 'backups'
    if (-not (Test-Path $backupsDir)) {
        New-Item -ItemType Directory -Path $backupsDir | Out-Null
        Write-Host "✓ Created backups folder: $backupsDir" -ForegroundColor Green
    }

    $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
    $destFile = "student_management_$ts.db"
    $destPath = Join-Path $backupsDir $destFile

    Write-Host "Creating backup: $destFile" -ForegroundColor Yellow

    # Use Alpine to copy the file from the volume to the mounted backup folder
    # Convert Windows path to Unix format for Docker
    $backupsDirUnix = $backupsDir.Replace('\', '/').Replace(':', '').ToLower()
    if (-not $backupsDirUnix.StartsWith('/')) {
        $backupsDirUnix = '/' + $backupsDirUnix
    }
    $cmd = "cp /data/student_management.db /backup/$destFile"
    docker run --rm -v sms_data:/data -v "${backupsDirUnix}:/backup" alpine sh -c $cmd
    if ($LASTEXITCODE -eq 0) {
        # Verify backup exists and show size
        if (Test-Path $destPath) {
            $size = (Get-Item $destPath).Length
            $sizeKB = [math]::Round($size / 1KB, 2)
            Write-Host "✓ Backup saved successfully" -ForegroundColor Green
            Write-Host "  Location: $destPath" -ForegroundColor Gray
            Write-Host "  Size: $sizeKB KB" -ForegroundColor Gray
        } else {
            Write-Host "⚠ Backup command succeeded but file not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Backup failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }

    Write-Host ""
    Pause-ForUser
}

function Restore-Database {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "Restore database from backup (./backups)..." -ForegroundColor Blue
    Write-Host ""

    $backupsDir = Join-Path $PSScriptRoot 'backups'
    if (-not (Test-Path $backupsDir)) {
        Write-Host "No backups folder found at $backupsDir" -ForegroundColor Red
        Start-Sleep -Seconds 2
        return
    }

    $files = @(Get-ChildItem -File -Path $backupsDir -Filter '*.db' | Sort-Object LastWriteTime -Descending)
    if ($files.Count -eq 0) {
        Write-Host "No .db backup files found in $backupsDir" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        return
    }

    Write-Host "Available backups:" -ForegroundColor Yellow
    for ($i=0; $i -lt $files.Count; $i++) {
        $sizeKB = [math]::Round($files[$i].Length / 1KB, 2)
        Write-Host ("  [{0}] {1}  ({2}, {3} KB)" -f $i, $files[$i].Name, $files[$i].LastWriteTime, $sizeKB)
    }
    Write-Host ""
    $sel = Read-Host "Enter number to restore (blank to cancel)"
    if ([string]::IsNullOrWhiteSpace($sel)) {
        Write-Host "Cancelled." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        return
    }
    if ($sel -notmatch '^[0-9]+$' -or [int]$sel -ge $files.Count) {
        Write-Host "Invalid selection" -ForegroundColor Red
        Start-Sleep -Seconds 2
        return
    }
    $chosen = $files[[int]$sel]

    Write-Host ""
    Write-Host "WARNING: This will overwrite the current database!" -ForegroundColor Red
    $confirm = Read-Host "Type 'RESTORE' to confirm"
    if ($confirm -ne 'RESTORE') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        return
    }

    Write-Host ""
    Write-Host "Stopping running container (if any)..." -ForegroundColor Yellow
    docker stop sms-fullstack 2>$null | Out-Null

    Write-Host "Restoring: $($chosen.Name) -> sms_data:/data/student_management.db" -ForegroundColor Yellow
    # Convert Windows path to Unix format for Docker
    $backupsDirUnix = $backupsDir.Replace('\', '/').Replace(':', '').ToLower()
    if (-not $backupsDirUnix.StartsWith('/')) {
        $backupsDirUnix = '/' + $backupsDirUnix
    }
    $cmd = "cp /backup/$($chosen.Name) /data/student_management.db"
    docker run --rm -v sms_data:/data -v "${backupsDirUnix}:/backup" alpine sh -c $cmd
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Restore complete" -ForegroundColor Green

        # Verify restored file
        Write-Host "Verifying restored database..." -ForegroundColor Yellow
        $verifyCmd = "ls -lh /data/student_management.db"
        $output = docker run --rm -v sms_data:/data alpine sh -c $verifyCmd 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database file verified in volume" -ForegroundColor Green
            Write-Host "  $output" -ForegroundColor Gray
        } else {
            Write-Host "⚠ Could not verify restored file" -ForegroundColor Yellow
        }

        Write-Host ""
        Write-Host "Restart the app to use the restored database." -ForegroundColor Cyan
    } else {
        Write-Host "✗ Restore failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }

    Write-Host ""
    Pause-ForUser
}

function Migrate-ComposeToFullstack {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "Migrate data: compose volume -> fullstack volume" -ForegroundColor Blue
    Write-Host "Source:   student-management-system_sms_data" -ForegroundColor Yellow
    Write-Host "Target:   sms_data" -ForegroundColor Yellow
    Write-Host ""

    $srcVol = 'student-management-system_sms_data'
    $dstVol = 'sms_data'

    # Check source volume exists
    $vols = docker volume ls --format '{{.Name}}'
    if (-not ($vols -split "`n" | Where-Object { $_ -eq $srcVol })) {
        Write-Host "Source volume '$srcVol' not found. Nothing to migrate." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        return
    }

    Write-Host "Stopping running container (if any)..." -ForegroundColor Yellow
    docker stop sms-fullstack 2>$null | Out-Null

    Write-Host "Copying data (preserving structure)..." -ForegroundColor Yellow
    $cmd = "cp -a /from/. /to/"
    docker run --rm -v $($srcVol):/from -v $($dstVol):/to alpine sh -c $cmd
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration complete" -ForegroundColor Green

        # Verify migrated data
        Write-Host "Verifying migrated database..." -ForegroundColor Yellow
        $verifyCmd = "ls -lh /data/student_management.db"
        $output = docker run --rm -v $($dstVol):/data alpine sh -c $verifyCmd 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database file verified in target volume" -ForegroundColor Green
            Write-Host "  $output" -ForegroundColor Gray
        }

        Write-Host ""
        Write-Host "Tip: You can remove the old volume if not needed:" -ForegroundColor Gray
        Write-Host "  docker volume rm $srcVol" -ForegroundColor Gray
    } else {
        Write-Host "✗ Migration failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }

    Write-Host ""
    Pause-ForUser
}

function Show-BackupManager {
    Write-Host ""
    $backupsDir = Join-Path $PSScriptRoot 'backups'

    if (-not (Test-Path $backupsDir)) {
        Write-Host "Backups folder does not exist yet." -ForegroundColor Yellow
        Write-Host "Create a backup first (option B)." -ForegroundColor Gray
        Write-Host ""
        Pause-ForUser
        return
    }

    $files = @(Get-ChildItem -File -Path $backupsDir -Filter '*.db' | Sort-Object LastWriteTime -Descending)

    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                    BACKUP MANAGER" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Location: $backupsDir" -ForegroundColor Gray
    Write-Host ""

    if ($files.Count -eq 0) {
        Write-Host "No backup files found." -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "Available Backups:" -ForegroundColor Yellow
        Write-Host ""
        $totalSize = 0
        for ($i = 0; $i -lt $files.Count; $i++) {
            $sizeKB = [math]::Round($files[$i].Length / 1KB, 2)
            $totalSize += $files[$i].Length
            $age = (Get-Date) - $files[$i].LastWriteTime
            $ageStr = if ($age.Days -gt 0) { "$($age.Days)d ago" }
                      elseif ($age.Hours -gt 0) { "$($age.Hours)h ago" }
                      else { "$($age.Minutes)m ago" }

            Write-Host ("  [{0,2}] {1}" -f $i, $files[$i].Name) -ForegroundColor White
            Write-Host ("       Size: {0} KB  |  Created: {1} ({2})" -f $sizeKB, $files[$i].LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"), $ageStr) -ForegroundColor Gray
        }
        $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
        Write-Host ""
        Write-Host "Total: $($files.Count) backups, $totalSizeMB MB" -ForegroundColor Cyan
    }

    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  [O] Open folder in Explorer" -ForegroundColor White
    Write-Host "  [D] Delete old backups (keep latest 5)" -ForegroundColor White
    Write-Host "  [X] Delete ALL backups" -ForegroundColor Red
    Write-Host "  [Enter] Return to main menu" -ForegroundColor Gray
    Write-Host ""
    $choice = Read-Host "Select option"

    switch ($choice.ToUpper()) {
        "O" {
            Start-Process "explorer.exe" -ArgumentList $backupsDir
            Write-Host "Opened folder in Explorer" -ForegroundColor Green
            Start-Sleep -Seconds 1
        }
        "D" {
            if ($files.Count -le 5) {
                Write-Host "Only $($files.Count) backups exist. Nothing to delete." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                $toDelete = $files | Select-Object -Skip 5
                Write-Host ""
                Write-Host "Will delete $($toDelete.Count) old backups:" -ForegroundColor Yellow
                $toDelete | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
                Write-Host ""
                $confirm = Read-Host "Type 'DELETE' to confirm"
                if ($confirm -eq 'DELETE') {
                    $toDelete | ForEach-Object { Remove-Item $_.FullName -Force }
                    Write-Host "✓ Deleted $($toDelete.Count) old backups" -ForegroundColor Green
                    Start-Sleep -Seconds 1
                } else {
                    Write-Host "Cancelled." -ForegroundColor Yellow
                    Start-Sleep -Seconds 1
                }
            }
        }
        "X" {
            Write-Host ""
            Write-Host "WARNING: This will delete ALL $($files.Count) backups!" -ForegroundColor Red
            Write-Host ""
            $confirm = Read-Host "Type 'DELETE ALL' to confirm"
            if ($confirm -eq 'DELETE ALL') {
                $files | ForEach-Object { Remove-Item $_.FullName -Force }
                Write-Host "✓ Deleted all backups" -ForegroundColor Green
                Start-Sleep -Seconds 1
            } else {
                Write-Host "Cancelled." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
        default {
            # Return to menu
        }
    }
}

function Open-BackupsFolder {
    Write-Host ""
    $backupsDir = Join-Path $PSScriptRoot 'backups'

    if (-not (Test-Path $backupsDir)) {
        Write-Host "Creating backups folder..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $backupsDir | Out-Null
    }

    Write-Host "Opening backups folder in Explorer..." -ForegroundColor Blue
    Start-Process "explorer.exe" -ArgumentList $backupsDir
    Start-Sleep -Seconds 1
}

function List-AllVolumes {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                    DOCKER VOLUMES" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "All Volumes:" -ForegroundColor Yellow
    docker volume ls --format "table {{.Driver}}\t{{.Name}}"

    Write-Host ""
    Write-Host "Volume Details:" -ForegroundColor Yellow
    Write-Host ""

    $volumes = docker volume ls --format "{{.Name}}"
    foreach ($vol in $volumes -split "`n") {
        if ([string]::IsNullOrWhiteSpace($vol)) { continue }
        Write-Host "Volume: $vol" -ForegroundColor Cyan

        $inspect = docker volume inspect $vol --format "  Mountpoint: {{.Mountpoint}}`n  Created: {{.CreatedAt}}" 2>$null
        Write-Host $inspect -ForegroundColor Gray

        # Check if volume is in use
        $containers = docker ps -a --filter "volume=$vol" --format "{{.Names}}" 2>$null
        if ($containers) {
            Write-Host "  Used by: $containers" -ForegroundColor Green
        } else {
            Write-Host "  Status: Not currently in use (dangling)" -ForegroundColor Yellow
        }
        Write-Host ""
    }

    Write-Host "Disk Usage Summary:" -ForegroundColor Yellow
    docker system df -v | Select-String "VOLUME NAME" -Context 0,20

    Write-Host ""
    Pause-ForUser
}

function Remove-OldVolumes {
    if (-not (Ensure-DockerRunning)) { return }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "              REMOVE OLD/UNUSED VOLUMES" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    # List all volumes
    Write-Host "Current Volumes:" -ForegroundColor Yellow
    $volumes = docker volume ls --format "{{.Name}}"
    $volumeList = @()
    $index = 0

    foreach ($vol in $volumes -split "`n") {
        if ([string]::IsNullOrWhiteSpace($vol)) { continue }

        # Check if volume is in use
        $containers = docker ps -a --filter "volume=$vol" --format "{{.Names}}" 2>$null
        $status = if ($containers) { "IN USE by $containers" } else { "UNUSED" }
        $statusColor = if ($containers) { "Green" } else { "Yellow" }

        Write-Host ("  [{0}] {1} - " -f $index, $vol) -NoNewline
        Write-Host $status -ForegroundColor $statusColor

        $volumeList += @{Index=$index; Name=$vol; InUse=($null -ne $containers); Containers=$containers}
        $index++
    }

    if ($volumeList.Count -eq 0) {
        Write-Host "No volumes found." -ForegroundColor Green
        Start-Sleep -Seconds 2
        return
    }

    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  [Number] Remove specific volume by number" -ForegroundColor White
    Write-Host "  [A] Remove ALL unused volumes (prune)" -ForegroundColor Yellow
    Write-Host "  [Enter] Cancel and return to menu" -ForegroundColor Gray
    Write-Host ""

    $choice = Read-Host "Select option"

    if ([string]::IsNullOrWhiteSpace($choice)) {
        Write-Host "Cancelled." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        return
    }

    if ($choice.ToUpper() -eq 'A') {
        Write-Host ""
        Write-Host "WARNING: This will remove ALL unused volumes!" -ForegroundColor Red
        Write-Host "Active volume 'sms_data' will be removed if no container is using it." -ForegroundColor Red
        Write-Host ""

        # Show what will be removed
        $dangling = docker volume ls --filter 'dangling=true' --format "{{.Name}}"
        if ($dangling) {
            Write-Host "Volumes that will be removed:" -ForegroundColor Yellow
            foreach ($vol in $dangling -split "`n") {
                if ([string]::IsNullOrWhiteSpace($vol)) { continue }
                Write-Host "  - $vol" -ForegroundColor Red
            }
        } else {
            Write-Host "No unused volumes found." -ForegroundColor Green
            Start-Sleep -Seconds 2
            return
        }

        Write-Host ""
        $confirm = Read-Host "Type 'PRUNE' to confirm removal of all unused volumes"
        if ($confirm -ne 'PRUNE') {
            Write-Host "Cancelled." -ForegroundColor Yellow
            Start-Sleep -Seconds 1
            return
        }

        Write-Host ""
        Write-Host "Removing unused volumes..." -ForegroundColor Yellow
        docker volume prune -f
        Write-Host "✓ Cleanup complete" -ForegroundColor Green

    } elseif ($choice -match '^[0-9]+$') {
        $idx = [int]$choice
        if ($idx -ge $volumeList.Count) {
            Write-Host "Invalid selection." -ForegroundColor Red
            Start-Sleep -Seconds 2
            return
        }

        $selected = $volumeList[$idx]
        $volName = $selected.Name

        Write-Host ""
        if ($selected.InUse) {
            Write-Host "WARNING: Volume '$volName' is IN USE by: $($selected.Containers)" -ForegroundColor Red
            Write-Host "You must stop/remove the container first, or the volume removal will fail." -ForegroundColor Yellow
        } else {
            Write-Host "Removing unused volume: $volName" -ForegroundColor Yellow
        }

        Write-Host ""
        $confirm = Read-Host "Type the volume name to confirm removal"
        if ($confirm -ne $volName) {
            Write-Host "Cancelled (name did not match)." -ForegroundColor Yellow
            Start-Sleep -Seconds 1
            return
        }

        Write-Host ""
        Write-Host "Removing volume: $volName..." -ForegroundColor Yellow
        docker volume rm $volName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Volume removed successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to remove volume (may be in use)" -ForegroundColor Red
        }
    } else {
        Write-Host "Invalid option." -ForegroundColor Red
        Start-Sleep -Seconds 1
    }

    Write-Host ""
    Pause-ForUser
}

function Start-Native {
    Write-Host ""
    Write-Host "Starting Native Mode (Backend + Frontend)..." -ForegroundColor Green
    Write-Host ""
    & ".\scripts\RUN.ps1"
    Write-Host ""
    Pause-ForUser
}

function Stop-Native {
    Write-Host ""
    Write-Host "Stopping Native Services..." -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\STOP.ps1"
    Write-Host ""
    Pause-ForUser
}

function Stop-NativeForced {
    Write-Host ""
    Write-Host "Emergency Kill All Native Processes..." -ForegroundColor Red
    Write-Host ""
    & ".\scripts\KILL_FRONTEND_NOW.ps1"
    Write-Host ""
    Pause-ForUser
}

function Show-Version {
    Write-Host ""
    Write-Host "Version Information:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Application Version: $version" -ForegroundColor White

    Write-Host ""
    Write-Host "Docker:" -ForegroundColor Yellow
    docker version --format "  Client: {{.Client.Version}}`n  Server: {{.Server.Version}}" 2>$null

    Write-Host ""
    Write-Host "Fullstack Image:" -ForegroundColor Yellow
    $imgDate = docker images sms-fullstack --format "{{.CreatedSince}}" 2>$null
    if ($imgDate) {
        Write-Host "  Built: $imgDate" -ForegroundColor White
    } else {
        Write-Host "  Not built yet" -ForegroundColor Red
    }

    Write-Host ""
    Pause-ForUser
}

function Open-Application {
    Write-Host ""
    Write-Host "Opening application in browser..." -ForegroundColor Blue
    Start-Process "http://localhost:8080"
    Start-Sleep -Seconds 1
}

function Show-Help {
    Write-Host ""
    Write-Host "Help Documentation:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Basic Workflow:" -ForegroundColor Yellow
    Write-Host "  1. Run SETUP.bat (first time only)" -ForegroundColor White
    Write-Host "  2. Run QUICKSTART.bat to start the app" -ForegroundColor White
    Write-Host "  3. Access at http://localhost:8080" -ForegroundColor White
    Write-Host "  4. Run STOP.bat to stop the app" -ForegroundColor White
    Write-Host ""
    Write-Host "Documentation:" -ForegroundColor Yellow
    Write-Host "  README.md          - Main documentation" -ForegroundColor White
    Write-Host "  DOCKER.md          - Docker guide" -ForegroundColor White
    Write-Host "  CONTROL_PANEL_GUIDE.md - Control panel usage" -ForegroundColor White
    Write-Host ""
    Write-Host "For more help, see the README.md file." -ForegroundColor Gray
    Write-Host ""
    Pause-ForUser
}

# ============================================================================
# Main Loop
# ============================================================================

Push-Location $PSScriptRoot

while ($true) {
    Show-Menu
    $choice = Read-Host "Select an option"

    switch ($choice.ToUpper()) {
        "1" { Build-FullstackImage }
        "2" { View-ContainerLogs }
        "3" { Shell-IntoContainer }
        "4" { Remove-AllDockerResources }
        "5" { Test-DockerSmoke }
        "6" { Check-DockerStatus }
        "7" { Debug-Ports }
        "8" { View-DatabaseInfo }
        "9" { Test-APIEndpoints }
        "D" { Start-DockerCompose }
        "E" { Stop-DockerCompose }
        "C" { Cleanup-DockerResources }
        "P" { Create-Package }
        "R" { Reset-Database }
        "B" { Backup-Database }
        "T" { Restore-Database }
        "W" { Open-BackupsFolder }
        "M" { Migrate-ComposeToFullstack }
        "L" { Show-BackupManager }
        "U" { List-AllVolumes }
        "X" { Remove-OldVolumes }
        "N" { Start-Native }
        "S" { Stop-Native }
        "K" { Stop-NativeForced }
        "V" { Show-Version }
        "O" { Open-Application }
        "H" { Show-Help }
        "0" {
            Write-Host ""
            Write-Host "Goodbye!" -ForegroundColor Cyan
            Pop-Location
            exit 0
        }
        default {
            Write-Host ""
            Write-Host "Invalid option. Please try again." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
