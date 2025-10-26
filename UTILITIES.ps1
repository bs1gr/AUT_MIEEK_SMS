# ============================================================================
#   Student Management System - Utilities & Troubleshooting
#   Diagnostic tools, cleanup, installation, and system checks
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
    Write-Host "  Student Management System - Utilities & Troubleshooting" -ForegroundColor Cyan
    Write-Host "  Version: $version" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  OPERATIONS" -ForegroundColor Yellow
    Write-Host "  [1] Install/Update Dependencies" -ForegroundColor White
    Write-Host "  [2] Stop All Services" -ForegroundColor White
    Write-Host "  [3] Emergency Shutdown (Kill All)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  DIAGNOSTICS" -ForegroundColor Yellow
    Write-Host "  [4] System Health Check" -ForegroundColor White
    Write-Host "  [5] Debug Port Conflicts" -ForegroundColor White
    Write-Host "  [6] Diagnose Frontend Issues" -ForegroundColor White
    Write-Host "  [7] Docker Smoke Test" -ForegroundColor White
    Write-Host ""
    Write-Host "  DOCKER" -ForegroundColor Yellow
    Write-Host "  [D] Docker Up (compose)" -ForegroundColor Green
    Write-Host "  [E] Docker Down (compose)" -ForegroundColor Yellow
    Write-Host "  [F] Fullstack Up (single container)" -ForegroundColor Green
    Write-Host "  [G] Fullstack Down (single container)" -ForegroundColor Yellow
    Write-Host "  [O] Open App (http://localhost:8080)" -ForegroundColor White
    Write-Host ""
    Write-Host "  MAINTENANCE" -ForegroundColor Yellow
    Write-Host "  [8] Create Deployment Package" -ForegroundColor White
    Write-Host "  [9] Cleanup Obsolete Files" -ForegroundColor White
    Write-Host ""
    Write-Host "  INFO" -ForegroundColor Yellow
    Write-Host "  [V] Show Version Info" -ForegroundColor White
    Write-Host "  [B] Open Application in Browser" -ForegroundColor White
    Write-Host "  [H] Help Documentation" -ForegroundColor White
    Write-Host ""
    Write-Host "  [0] Exit" -ForegroundColor Gray
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Install-Dependencies {
    Write-Host ""
    Write-Host "Installing Dependencies..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\INSTALL.ps1"
}

function Stop-Application {
    Write-Host ""
    Write-Host "Stopping Student Management System..." -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\STOP.ps1"
}

function Stop-Emergency {
    Write-Host ""
    Write-Host "Emergency Shutdown..." -ForegroundColor Red
    Write-Host ""
    & ".\scripts\KILL_FRONTEND_NOW.ps1"
}

function Test-SystemHealth {
    Write-Host ""
    Write-Host "Checking System Health..." -ForegroundColor Blue
    Write-Host ""
    
    # Check Python
    Write-Host "Python:" -ForegroundColor Yellow
    try {
        $pythonVersion = python --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $pythonVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Not installed" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Not installed" -ForegroundColor Red
    }
    
    # Check Node.js
    Write-Host "Node.js:" -ForegroundColor Yellow
    try {
        $nodeVersion = node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Not installed" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Not installed" -ForegroundColor Red
    }
    
    # Check npm
    Write-Host "npm:" -ForegroundColor Yellow
    try {
        $npmVersion = npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ v$npmVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Not installed" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Not installed" -ForegroundColor Red
    }
    
    # Check Docker
    Write-Host "Docker:" -ForegroundColor Yellow
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $dockerVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Not available" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ Not available" -ForegroundColor Yellow
    }
    
    # Check backend venv
    Write-Host "Backend Virtual Environment:" -ForegroundColor Yellow
    if (Test-Path ".\backend\venv") {
        Write-Host "  ✓ Exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Not created (run Install Dependencies)" -ForegroundColor Yellow
    }
    
    # Check frontend node_modules
    Write-Host "Frontend Dependencies:" -ForegroundColor Yellow
    if (Test-Path ".\frontend\node_modules") {
        Write-Host "  ✓ Installed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Not installed (run Install Dependencies)" -ForegroundColor Yellow
    }
    
    # Check database
    Write-Host "Database:" -ForegroundColor Yellow
    if (Test-Path ".\student_management.db") {
        $dbSize = [math]::Round((Get-Item ".\student_management.db").Length / 1KB, 2)
        Write-Host "  ✓ Exists ($dbSize KB)" -ForegroundColor Green
    } else {
        Write-Host "  ? Not created (will be created on first run)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Debug-Ports {
    Write-Host ""
    Write-Host "Debugging Port Conflicts..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\DEBUG_PORTS.ps1"
}

function Test-Frontend {
    Write-Host ""
    Write-Host "Diagnosing Frontend Issues..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\DIAGNOSE_FRONTEND.ps1"
}

function Test-DockerSmoke {
    Write-Host ""
    Write-Host "Running Docker smoke test..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\DOCKER_SMOKE.ps1"
}

function New-DeploymentPackage {
    Write-Host ""
    Write-Host "Creating Deployment Package..." -ForegroundColor Magenta
    Write-Host ""
    & ".\scripts\CREATE_PACKAGE.ps1"
}

function Docker-Up {
    Write-Host "" 
    Write-Host "Docker compose up (build+run)..." -ForegroundColor Green
    Write-Host "" 
    & ".\scripts\DOCKER_UP.ps1"
}

function Docker-Down {
    Write-Host "" 
    Write-Host "Docker compose down (stop+remove)..." -ForegroundColor Yellow
    Write-Host "" 
    & ".\scripts\DOCKER_DOWN.ps1"
}

function Docker-FullstackUp {
    Write-Host "" 
    Write-Host "Fullstack (single container) up..." -ForegroundColor Green
    Write-Host "" 
    $rebuild = Read-Host "Rebuild image first? (y/N)"
    if ($rebuild -match '^(?i)y(es)?$') {
        & ".\scripts\DOCKER_FULLSTACK_UP.ps1" -Rebuild
    } else {
        & ".\scripts\DOCKER_FULLSTACK_UP.ps1"
    }
}

function Docker-FullstackDown {
    Write-Host "" 
    Write-Host "Fullstack (single container) down..." -ForegroundColor Yellow
    Write-Host "" 
    $rim = Read-Host "Also remove image? (y/N)"
    if ($rim -match '^(?i)y(es)?$') {
        & ".\scripts\DOCKER_FULLSTACK_DOWN.ps1" -RemoveImage
    } else {
        & ".\scripts\DOCKER_FULLSTACK_DOWN.ps1"
    }
}

function Open-DockerApp {
    Write-Host "" 
    Write-Host "Opening app (http://localhost:8080)..." -ForegroundColor White
    Write-Host "" 
    Start-Process "http://localhost:8080"
}

function Start-Cleanup {
    Write-Host ""
    Write-Host "Cleaning Up Obsolete Files..." -ForegroundColor Magenta
    Write-Host ""
    & ".\scripts\CLEANUP.ps1"
}

function Open-Browser {
    Write-Host ""
    Write-Host "Opening application in browser..." -ForegroundColor White
    Write-Host ""
    
    $urls = @(
        @{Name="Frontend (native)"; URL="http://localhost:5173"},
        @{Name="Backend API Docs"; URL="http://localhost:8000/docs"},
        @{Name="Backend ReDoc"; URL="http://localhost:8000/redoc"},
        @{Name="Control Panel"; URL="http://localhost:8000/control"},
        @{Name="Docker App"; URL="http://localhost:8080"}
    )
    
    Write-Host "Select URL to open:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $urls.Count; $i++) {
        Write-Host "  [$($i+1)] $($urls[$i].Name) - $($urls[$i].URL)" -ForegroundColor White
    }
    Write-Host ""
    
    $choice = Read-Host "Enter number (or press Enter for Frontend)"
    
    if ([string]::IsNullOrWhiteSpace($choice)) {
        $choice = "1"
    }
    
    $index = [int]$choice - 1
    if ($index -ge 0 -and $index -lt $urls.Count) {
        Start-Process $urls[$index].URL
        Write-Host "  ✓ Opening $($urls[$index].Name)..." -ForegroundColor Green
    } else {
        Write-Host "  ✗ Invalid selection" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
}

function Show-VersionInfo {
    Clear-Host
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Student Management System - Version Information" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Read version
    if (Test-Path "VERSION") {
        $appVersion = (Get-Content "VERSION" -Raw).Trim()
        Write-Host "  Application Version: v$appVersion" -ForegroundColor Green
    } else {
        Write-Host "  Application Version: Unknown" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "  System Information:" -ForegroundColor Yellow
    
    # Python version
    try {
        $pythonVersion = python --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  - Python: $pythonVersion" -ForegroundColor White
        }
    } catch { }
    
    # Node.js version
    try {
        $nodeVersion = node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  - Node.js: $nodeVersion" -ForegroundColor White
        }
    } catch { }
    
    # npm version
    try {
        $npmVersion = npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  - npm: v$npmVersion" -ForegroundColor White
        }
    } catch { }
    
    # Docker version
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  - Docker: $dockerVersion" -ForegroundColor White
        }
    } catch { }
    
    Write-Host ""
    Write-Host "  Backend Dependencies:" -ForegroundColor Yellow
    if (Test-Path "backend\requirements.txt") {
        $requirements = Get-Content "backend\requirements.txt" | Where-Object { $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*$' }
        $requirements | Select-Object -First 5 | ForEach-Object {
            Write-Host "  - $_" -ForegroundColor Gray
        }
        if ($requirements.Count -gt 5) {
            Write-Host "  ... and $($requirements.Count - 5) more" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "  Frontend Dependencies:" -ForegroundColor Yellow
    if (Test-Path "frontend\package.json") {
        $packageJson = Get-Content "frontend\package.json" -Raw | ConvertFrom-Json
        Write-Host "  - React: $($packageJson.dependencies.react)" -ForegroundColor Gray
        Write-Host "  - Vite: $($packageJson.devDependencies.vite)" -ForegroundColor Gray
        Write-Host "  - Tailwind CSS: $($packageJson.devDependencies.tailwindcss)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "  Last Updated:" -ForegroundColor Yellow
    if (Test-Path "CHANGELOG.md") {
        $changelogFirstLine = Get-Content "CHANGELOG.md" | Where-Object { $_ -match '##\s*\[' } | Select-Object -First 1
        Write-Host "  $changelogFirstLine" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Write-Host ""
    Write-Host "For detailed help, see:" -ForegroundColor Cyan
    Write-Host "  - README.md" -ForegroundColor White
    Write-Host "  - HELP_DOCUMENTATION_COMPLETE.md" -ForegroundColor White
    Write-Host "  - DOCKER.md (for Docker deployment)" -ForegroundColor White
    Write-Host ""
    Write-Host "Quick start:" -ForegroundColor Cyan
    Write-Host "  .\QUICKSTART.ps1           # Start native mode" -ForegroundColor White
    Write-Host "  .\QUICKSTART.ps1 -Mode docker      # Start via Docker" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to continue"
}

# Main loop
Push-Location $PSScriptRoot
try {
    do {
        Show-Menu
        $choice = Read-Host "Select an option"
        
        switch ($choice) {
            '1' { Install-Dependencies; Read-Host "Press Enter to continue" }
            '2' { Stop-Application; Read-Host "Press Enter to continue" }
            '3' { Stop-Emergency; Read-Host "Press Enter to continue" }
            '4' { Test-SystemHealth }
            '5' { Debug-Ports; Read-Host "Press Enter to continue" }
            '6' { Test-Frontend; Read-Host "Press Enter to continue" }
            '7' { Test-DockerSmoke; Read-Host "Press Enter to continue" }
            'D' { Docker-Up; Read-Host "Press Enter to continue" }
            'd' { Docker-Up; Read-Host "Press Enter to continue" }
            'E' { Docker-Down; Read-Host "Press Enter to continue" }
            'e' { Docker-Down; Read-Host "Press Enter to continue" }
            'F' { Docker-FullstackUp; Read-Host "Press Enter to continue" }
            'f' { Docker-FullstackUp; Read-Host "Press Enter to continue" }
            'G' { Docker-FullstackDown; Read-Host "Press Enter to continue" }
            'g' { Docker-FullstackDown; Read-Host "Press Enter to continue" }
            'O' { Open-DockerApp; Read-Host "Press Enter to continue" }
            'o' { Open-DockerApp; Read-Host "Press Enter to continue" }
            '8' { New-DeploymentPackage; Read-Host "Press Enter to continue" }
            '9' { Start-Cleanup; Read-Host "Press Enter to continue" }
            'V' { Show-VersionInfo; Read-Host "Press Enter to continue" }
            'v' { Show-VersionInfo; Read-Host "Press Enter to continue" }
            'B' { Open-Browser }
            'b' { Open-Browser }
            'H' { Show-Help }
            'h' { Show-Help }
            '0' { 
                Write-Host ""
                Write-Host "Goodbye!" -ForegroundColor Cyan
                Write-Host ""
                exit 
            }
            default {
                Write-Host ""
                Write-Host "Invalid option. Please try again." -ForegroundColor Red
                Start-Sleep -Seconds 2
            }
        }
    } while ($true)
} finally {
    Pop-Location
}
