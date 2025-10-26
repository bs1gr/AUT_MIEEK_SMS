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
    Write-Host "  MAINTENANCE" -ForegroundColor Yellow
    Write-Host "  [C] Cleanup Docker Resources" -ForegroundColor White
    Write-Host "  [P] Create Deployment Package" -ForegroundColor White
    Write-Host "  [R] Reset Database (Delete Volume)" -ForegroundColor Red
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
    Write-Host ""
    Write-Host "Building Fullstack Image..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\DOCKER_FULLSTACK_UP.ps1" -Rebuild
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function View-ContainerLogs {
    Write-Host ""
    Write-Host "Container Logs (last 50 lines):" -ForegroundColor Blue
    Write-Host ""
    docker logs --tail 50 sms-fullstack 2>&1
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Shell-IntoContainer {
    Write-Host ""
    Write-Host "Opening shell in container..." -ForegroundColor Blue
    Write-Host "Type 'exit' to return to this menu." -ForegroundColor Gray
    Write-Host ""
    docker exec -it sms-fullstack /bin/sh
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Remove-AllDockerResources {
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
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Test-DockerSmoke {
    Write-Host ""
    Write-Host "Docker Smoke Test..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\DOCKER_SMOKE.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Check-DockerStatus {
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
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Debug-Ports {
    Write-Host ""
    Write-Host "Checking Port Usage..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\DEBUG_PORTS.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function View-DatabaseInfo {
    Write-Host ""
    Write-Host "Database Information:" -ForegroundColor Blue
    Write-Host ""
    
    Write-Host "Volume Location:" -ForegroundColor Yellow
    docker volume inspect sms_data --format "  {{.Mountpoint}}" 2>$null
    
    Write-Host ""
    Write-Host "Database File (in container):" -ForegroundColor Yellow
    docker exec sms-fullstack ls -lh /data/student_management.db 2>$null
    
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
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
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Start-DockerCompose {
    Write-Host ""
    Write-Host "Starting Docker Compose..." -ForegroundColor Green
    Write-Host ""
    & ".\scripts\DOCKER_UP.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Stop-DockerCompose {
    Write-Host ""
    Write-Host "Stopping Docker Compose..." -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\DOCKER_DOWN.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Cleanup-DockerResources {
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
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Create-Package {
    Write-Host ""
    Write-Host "Creating Deployment Package..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\CREATE_PACKAGE.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
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
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Start-Native {
    Write-Host ""
    Write-Host "Starting Native Mode (Backend + Frontend)..." -ForegroundColor Green
    Write-Host ""
    & ".\scripts\RUN.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Stop-Native {
    Write-Host ""
    Write-Host "Stopping Native Services..." -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\STOP.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Kill-Native {
    Write-Host ""
    Write-Host "Emergency Kill All Native Processes..." -ForegroundColor Red
    Write-Host ""
    & ".\scripts\KILL_FRONTEND_NOW.ps1"
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
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
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
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
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
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
        "N" { Start-Native }
        "S" { Stop-Native }
        "K" { Kill-Native }
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
