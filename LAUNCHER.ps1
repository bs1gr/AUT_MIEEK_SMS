# ============================================================================
#   Student Management System - Utility Launcher
#   Centralized menu for all system utilities
# ============================================================================

# Read version
$version = "unknown"
if (Test-Path "VERSION") {
    $version = (Get-Content "VERSION" -Raw).Trim()
}

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Student Management System - Utility Launcher" -ForegroundColor Cyan
    Write-Host "  Version: $version" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1] Start Application (Backend + Frontend)" -ForegroundColor Green
    Write-Host "  [C] Start Control Panel Only (Lightweight)" -ForegroundColor Green
    Write-Host "  [2] Stop Application (All Services)" -ForegroundColor Yellow
    Write-Host "  [3] Emergency Shutdown (Kill All Processes)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  [4] Install Dependencies" -ForegroundColor Blue
    Write-Host "  [5] Check System Health" -ForegroundColor Blue
    Write-Host "  [6] Debug Port Conflicts" -ForegroundColor Blue
    Write-Host "  [7] Diagnose Frontend Issues" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  [8] Create Deployment Package" -ForegroundColor Magenta
    Write-Host "  [9] Cleanup Obsolete Files" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  [V] Show Version Info" -ForegroundColor White
    Write-Host "  [B] Open Application in Browser" -ForegroundColor White
    Write-Host "  [0] Exit" -ForegroundColor Gray
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Start-Application {
    Write-Host ""
    Write-Host "Starting Student Management System..." -ForegroundColor Green
    Write-Host ""
    & ".\scripts\RUN.ps1"
}

function Start-ControlPanelOnly {
    Write-Host ""
    Write-Host "Starting Control Panel (lightweight mode)..." -ForegroundColor Cyan
    Write-Host ""
    & ".\scripts\RUN.ps1" -ControlOnly
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

function Install-Dependencies {
    Write-Host ""
    Write-Host "Installing Dependencies..." -ForegroundColor Blue
    Write-Host ""
    & ".\scripts\INSTALL.ps1"
}

function Test-SystemHealth {
    Write-Host ""
    Write-Host "Checking System Health..." -ForegroundColor Blue
    Write-Host ""
    
    # Check Python
    Write-Host "Python:" -ForegroundColor Yellow
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "  X Not installed" -ForegroundColor Red
    }
    
    # Check Node.js
    Write-Host "Node.js:" -ForegroundColor Yellow
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  X Not installed" -ForegroundColor Red
    }
    
    # Check npm
    Write-Host "npm:" -ForegroundColor Yellow
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host "  X Not installed" -ForegroundColor Red
    }
    
    # Check backend venv
    Write-Host "Backend Virtual Environment:" -ForegroundColor Yellow
    if (Test-Path ".\backend\venv") {
        Write-Host "  OK Exists" -ForegroundColor Green
    } else {
        Write-Host "  X Not created (run Install Dependencies)" -ForegroundColor Yellow
    }
    
    # Check frontend node_modules
    Write-Host "Frontend Dependencies:" -ForegroundColor Yellow
    if (Test-Path ".\frontend\node_modules") {
        Write-Host "  OK Installed" -ForegroundColor Green
    } else {
        Write-Host "  X Not installed (run Install Dependencies)" -ForegroundColor Yellow
    }
    
    # Check database
    Write-Host "Database:" -ForegroundColor Yellow
    if (Test-Path ".\student_management.db") {
        $dbSize = [math]::Round((Get-Item ".\student_management.db").Length / 1KB, 2)
        Write-Host "  OK Exists ($dbSize KB)" -ForegroundColor Green
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

function New-DeploymentPackage {
    Write-Host ""
    Write-Host "Creating Deployment Package..." -ForegroundColor Magenta
    Write-Host ""
    & ".\scripts\CREATE_PACKAGE.ps1"
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
        @{Name="Frontend"; URL="http://localhost:5173"},
        @{Name="Backend API Docs"; URL="http://localhost:8000/docs"},
        @{Name="Backend ReDoc"; URL="http://localhost:8000/redoc"}
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
        Write-Host "  OK Opening $($urls[$index].Name)..." -ForegroundColor Green
    } else {
        Write-Host "  X Invalid selection" -ForegroundColor Red
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
        Write-Host "  - Python: $pythonVersion" -ForegroundColor White
    } catch {
        Write-Host "  - Python: Not installed" -ForegroundColor Red
    }
    
    # Node.js version
    try {
        $nodeVersion = node --version 2>&1
        Write-Host "  - Node.js: $nodeVersion" -ForegroundColor White
    } catch {
        Write-Host "  - Node.js: Not installed" -ForegroundColor Red
    }
    
    # npm version
    try {
        $npmVersion = npm --version 2>&1
        Write-Host "  - npm: v$npmVersion" -ForegroundColor White
    } catch {
        Write-Host "  - npm: Not installed" -ForegroundColor Red
    }
    
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

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Select an option"
    
    switch ($choice) {
        '1' { Start-Application; Read-Host "Press Enter to continue" }
        'C' { Start-ControlPanelOnly; Read-Host "Press Enter to continue" }
        'c' { Start-ControlPanelOnly; Read-Host "Press Enter to continue" }
        '2' { Stop-Application; Read-Host "Press Enter to continue" }
        '3' { Stop-Emergency; Read-Host "Press Enter to continue" }
        '4' { Install-Dependencies; Read-Host "Press Enter to continue" }
        '5' { Test-SystemHealth }
        '6' { Debug-Ports }
        '7' { Test-Frontend }
        '8' { New-DeploymentPackage; Read-Host "Press Enter to continue" }
        '9' { Start-Cleanup }
        'V' { Show-VersionInfo; Read-Host "Press Enter to continue" }
        'v' { Show-VersionInfo; Read-Host "Press Enter to continue" }
        'B' { Open-Browser }
        'b' { Open-Browser }
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
