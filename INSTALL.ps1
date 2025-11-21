<#
.SYNOPSIS
    Student Management System - Complete Installation Script

.DESCRIPTION
    Automated installation script for deploying SMS on a new PC.
    Handles Docker setup, environment configuration, and first-run initialization.
    Must be run with Administrator privileges for Docker installation.

.PARAMETER SkipDockerInstall
    Skip Docker Desktop installation (assumes Docker is already installed)

.PARAMETER SkipEnvSetup
    Skip environment file setup (assumes .env files are configured)

.PARAMETER DevMode
    Install for development mode (multi-container setup)

.PARAMETER Help
    Show help information

.EXAMPLE
    .\INSTALL.ps1
    # Full installation with all checks

.EXAMPLE
    .\INSTALL.ps1 -SkipDockerInstall
    # Install but skip Docker installation check

.NOTES
    Version: 1.0.0
    Requires: Windows 10/11, PowerShell 5.1+
    Tested on: Windows 10 Pro, Windows 11 Pro
#>

param(
    [switch]$SkipDockerInstall,
    [switch]$SkipEnvSetup,
    [switch]$DevMode,
    [switch]$Help
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$VERSION_FILE = Join-Path $SCRIPT_DIR "VERSION"
$ROOT_ENV_EXAMPLE = Join-Path $SCRIPT_DIR ".env.example"
$ROOT_ENV = Join-Path $SCRIPT_DIR ".env"
$BACKEND_ENV_EXAMPLE = Join-Path $SCRIPT_DIR "backend\.env.example"
$BACKEND_ENV = Join-Path $SCRIPT_DIR "backend\.env"
$DOCKER_COMPOSE_FILE = Join-Path $SCRIPT_DIR "docker-compose.yml"
$DOCKERFILE_FULLSTACK = Join-Path $SCRIPT_DIR "docker\Dockerfile.fullstack"

# Minimum requirements
$MIN_DOCKER_VERSION = [version]"20.10.0"
$MIN_POWERSHELL_VERSION = [version]"5.1"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $($Message.PadRight(58))  ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Step {
    param(
        [int]$Number,
        [string]$Message
    )
    Write-Host "`n[$Number/7] " -NoNewline -ForegroundColor Yellow
    Write-Host $Message -ForegroundColor White
    Write-Host ("─" * 60) -ForegroundColor DarkGray
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-DockerInstalled {
    try {
        $null = docker --version 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Test-DockerRunning {
    try {
        $null = docker ps 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Get-DockerVersion {
    try {
        $versionOutput = docker --version 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }

        if ($versionOutput -match 'Docker version (\d+\.\d+\.\d+)') {
            return [version]$matches[1]
        }
        return $null
    } catch {
        return $null
    }
}

function Test-GitInstalled {
    try {
        $null = git --version 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Install-DockerDesktop {
    Write-Header "Docker Desktop Installation"

    Write-Info "Docker Desktop is required to run the SMS application."
    Write-Info "Downloading Docker Desktop installer..."

    $dockerInstallerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $installerPath = Join-Path $env:TEMP "DockerDesktopInstaller.exe"

    try {
        # Download installer
        Write-Info "Downloading from: $dockerInstallerUrl"
        Invoke-WebRequest -Uri $dockerInstallerUrl -OutFile $installerPath -UseBasicParsing

        Write-Success "Download completed"
        Write-Info "Starting Docker Desktop installation..."
        Write-Warning-Message "This may take several minutes. Please wait..."

        # Run installer
        $process = Start-Process -FilePath $installerPath -ArgumentList "install --quiet" -Wait -PassThru

        if ($process.ExitCode -ne 0) {
            Write-Error-Message "Docker Desktop installation failed with exit code: $($process.ExitCode)"
            Write-Info "Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop"
            return $false
        }

        Write-Success "Docker Desktop installed successfully"
        Write-Warning-Message "IMPORTANT: Docker Desktop requires a system restart."
        Write-Info "After restart, Docker Desktop will start automatically."
        Write-Info "Please run this installation script again after restarting."

        $restart = Read-Host "`nDo you want to restart now? (Y/N)"
        if ($restart -match '^[Yy]') {
            Write-Info "Restarting system..."
            Restart-Computer -Force
            exit 0
        } else {
            Write-Warning-Message "Please restart your computer manually and run this script again."
            exit 0
        }

    } catch {
        Write-Error-Message "Failed to download or install Docker Desktop: $_"
        Write-Info "Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop"
        return $false
    } finally {
        # Cleanup
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        }
    }

    return $true
}

function Wait-ForDockerReady {
    param(
        [int]$TimeoutSeconds = 120
    )

    Write-Info "Waiting for Docker Desktop to start..."
    $elapsed = 0
    $checkInterval = 5

    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-DockerRunning) {
            Write-Success "Docker Desktop is ready!"
            return $true
        }

        Write-Host "." -NoNewline
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval
    }

    Write-Host ""
    Write-Error-Message "Docker Desktop did not start within $TimeoutSeconds seconds"
    return $false
}

function Initialize-EnvironmentFiles {
    Write-Header "Environment Configuration"

    $configured = $false

    # Generate a single secure SECRET_KEY to use in both files
    $secretKey = -join ((48..57) + (65..90) + (97..122) + (45,95) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

    # Check root .env
    if (-not (Test-Path $ROOT_ENV)) {
        if (Test-Path $ROOT_ENV_EXAMPLE) {
            Write-Info "Creating root .env file from template..."

            # Read template and replace placeholders
            $envContent = Get-Content $ROOT_ENV_EXAMPLE -Raw
            $envContent = $envContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
            $envContent = $envContent -replace 'VERSION=.*', "VERSION=1.8.6.1"

            Set-Content -Path $ROOT_ENV -Value $envContent
            Write-Success "Root .env file created with secure SECRET_KEY"
            $configured = $true
        } else {
            Write-Warning-Message "Root .env.example not found, creating minimal .env file..."
            $minimalEnv = @"
VERSION=1.8.6.1

# Security
SECRET_KEY=$secretKey

# Authentication Settings
AUTH_ENABLED=True
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
DEFAULT_ADMIN_FULL_NAME=System Administrator
DEFAULT_ADMIN_FORCE_RESET=False
"@
            Set-Content -Path $ROOT_ENV -Value $minimalEnv
            Write-Success "Minimal root .env file created"
            $configured = $true
        }
    } else {
        Write-Info "Root .env file already exists"

        # Update SECRET_KEY if it's still a placeholder, and ensure same key in both files
        $rootContent = Get-Content $ROOT_ENV -Raw
        if ($rootContent -match 'SECRET_KEY=(.+)') {
            $existingKey = $matches[1].Trim()
            $lowerKey = $existingKey.ToLower()
            if ($lowerKey.Contains("change") -or $lowerKey.Contains("placeholder") -or $lowerKey.Contains("your-secret-key") -or $existingKey.Length -lt 32) {
                Write-Warning-Message "Insecure SECRET_KEY detected in root .env, updating..."
                $rootContent = $rootContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
                Set-Content -Path $ROOT_ENV -Value $rootContent
                Write-Success "Root .env SECRET_KEY updated"
                $configured = $true
            } else {
                # Use existing key if it's secure
                $secretKey = $existingKey
            }
        }
    }

    # Check backend .env
    if (-not (Test-Path $BACKEND_ENV)) {
        if (Test-Path $BACKEND_ENV_EXAMPLE) {
            Write-Info "Creating backend .env file from template..."

            # Read template and replace placeholder SECRET_KEY with the same key from root .env
            $envContent = Get-Content $BACKEND_ENV_EXAMPLE -Raw
            $envContent = $envContent -replace 'SECRET_KEY=your-secret-key-change-this-in-production.*', "SECRET_KEY=$secretKey"

            # Save to backend/.env
            Set-Content -Path $BACKEND_ENV -Value $envContent

            Write-Success "Backend .env file created with matching SECRET_KEY"
            $configured = $true
        } else {
            Write-Warning-Message "Backend .env.example not found!"
        }
    } else {
        Write-Info "Backend .env file already exists"

        # Update SECRET_KEY if it's still a placeholder, using the same key as root
        $backendContent = Get-Content $BACKEND_ENV -Raw
        if ($backendContent -match 'SECRET_KEY=(.+)') {
            $existingKey = $matches[1].Trim()
            $lowerKey = $existingKey.ToLower()
            if ($lowerKey.Contains("change") -or $lowerKey.Contains("placeholder") -or $lowerKey.Contains("your-secret-key") -or $existingKey.Length -lt 32) {
                Write-Warning-Message "Insecure SECRET_KEY detected in backend/.env, updating..."
                $backendContent = $backendContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
                Set-Content -Path $BACKEND_ENV -Value $backendContent
                Write-Success "Backend .env SECRET_KEY updated"
                $configured = $true
            }
        }
    }

    if ($configured) {
        Write-Host ""
        Write-Warning-Message "IMPORTANT: Review the .env files and update settings as needed!"
        Write-Info "Root .env: $ROOT_ENV"
        Write-Info "Backend .env: $BACKEND_ENV"
        Write-Host ""
        Write-Info "Default admin credentials:"
        Write-Host "  Email:    " -NoNewline -ForegroundColor Cyan
        Write-Host "admin@example.com" -ForegroundColor White
        Write-Host "  Password: " -NoNewline -ForegroundColor Cyan
        Write-Host "YourSecurePassword123!" -ForegroundColor White
        Write-Host ""
        Write-Warning-Message "Change the admin password immediately after first login!"
    }

    return $true
}

function Test-Prerequisites {
    Write-Header "Checking Prerequisites"

    $allPassed = $true

    # Check PowerShell version
    Write-Host "PowerShell Version: " -NoNewline
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion -ge $MIN_POWERSHELL_VERSION) {
        Write-Host "$psVersion " -NoNewline -ForegroundColor Green
        Write-Success ""
    } else {
        Write-Host "$psVersion " -NoNewline -ForegroundColor Red
        Write-Error-Message ""
        Write-Error-Message "PowerShell $MIN_POWERSHELL_VERSION or higher required"
        $allPassed = $false
    }

    # Check Git
    Write-Host "Git:               " -NoNewline
    if (Test-GitInstalled) {
        Write-Success "Installed"
    } else {
        Write-Warning-Message "Not installed (optional)"
        Write-Info "Git is recommended for updates. Install from: https://git-scm.com/"
    }

    # Check Docker
    Write-Host "Docker Desktop:    " -NoNewline
    if (Test-DockerInstalled) {
        $dockerVersion = Get-DockerVersion
        if ($dockerVersion -ge $MIN_DOCKER_VERSION) {
            Write-Host "$dockerVersion " -NoNewline -ForegroundColor Green
            Write-Success ""
        } else {
            Write-Host "$dockerVersion " -NoNewline -ForegroundColor Yellow
            Write-Warning-Message "Older version (upgrade recommended)"
        }
    } else {
        Write-Error-Message "Not installed"
        $allPassed = $false
    }

    # Check Docker running
    if (Test-DockerInstalled) {
        Write-Host "Docker Running:    " -NoNewline
        if (Test-DockerRunning) {
            Write-Success "Yes"
        } else {
            Write-Error-Message "No"
            Write-Info "Please start Docker Desktop and try again"
            $allPassed = $false
        }
    }

    # Check for required files
    Write-Host "`nRequired Files:" -ForegroundColor Cyan
    $requiredFiles = @(
        @{Path = $DOCKER_COMPOSE_FILE; Name = "docker-compose.yml" },
        @{Path = $DOCKERFILE_FULLSTACK; Name = "docker/Dockerfile.fullstack" },
        @{Path = $BACKEND_ENV_EXAMPLE; Name = "backend/.env.example" }
    )

    foreach ($file in $requiredFiles) {
        Write-Host "  $($file.Name): " -NoNewline
        if (Test-Path $file.Path) {
            Write-Success "Found"
        } else {
            Write-Error-Message "Missing"
            $allPassed = $false
        }
    }

    return $allPassed
}

function Show-WelcomeBanner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "║           Student Management System (SMS)                    ║" -ForegroundColor Cyan
    Write-Host "║               Installation Wizard                            ║" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "║                   Version 1.8.6.1                            ║" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Show-WelcomeBanner
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\INSTALL.ps1 [OPTIONS]`n"
    Write-Host "OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -SkipDockerInstall    Skip Docker Desktop installation check"
    Write-Host "  -SkipEnvSetup         Skip environment file setup"
    Write-Host "  -DevMode              Install for development (multi-container)"
    Write-Host "  -Help                 Show this help message`n"
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\INSTALL.ps1                      # Full installation"
    Write-Host "  .\INSTALL.ps1 -SkipDockerInstall   # Skip Docker install check"
    Write-Host "  .\INSTALL.ps1 -DevMode             # Development mode setup`n"
    Write-Host "REQUIREMENTS:" -ForegroundColor Yellow
    Write-Host "  • Windows 10/11 (64-bit)"
    Write-Host "  • PowerShell 5.1 or higher"
    Write-Host "  • Administrator privileges (for Docker installation)"
    Write-Host "  • 4GB RAM minimum (8GB recommended)"
    Write-Host "  • 10GB free disk space`n"
    Write-Host "AFTER INSTALLATION:" -ForegroundColor Yellow
    Write-Host "  1. Access: http://localhost:8082 (Docker) or http://localhost:8000 (Native)"
    Write-Host "  2. Login with: admin@example.com / YourSecurePassword123!"
    Write-Host "  3. Change password immediately in Control Panel → Maintenance`n"
}

function Show-CompletionMessage {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                              ║" -ForegroundColor Green
    Write-Host "║           🎉 Installation Completed Successfully! 🎉          ║" -ForegroundColor Green
    Write-Host "║                                                              ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Start the application:" -ForegroundColor Cyan
    Write-Host "   .\RUN.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Access the web interface:" -ForegroundColor Cyan
    Write-Host "   http://localhost:8082" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Login with default credentials:" -ForegroundColor Cyan
    Write-Host "   Email:    admin@example.com" -ForegroundColor White
    Write-Host "   Password: YourSecurePassword123!" -ForegroundColor White
    Write-Host ""
    Write-Host "4. ⚠️  IMPORTANT: Change your password immediately!" -ForegroundColor Yellow
    Write-Host "   Go to: Control Panel → Maintenance → Change Password" -ForegroundColor White
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  .\RUN.ps1                Start the application" -ForegroundColor White
    Write-Host "  .\RUN.ps1 -Stop          Stop the application" -ForegroundColor White
    Write-Host "  .\RUN.ps1 -Status        Check application status" -ForegroundColor White
    Write-Host "  .\RUN.ps1 -Update        Update to latest version" -ForegroundColor White
    Write-Host "  .\RUN.ps1 -Logs          View application logs" -ForegroundColor White
    Write-Host "  .\RUN.ps1 -Help          Show all available commands" -ForegroundColor White
    Write-Host ""
    Write-Host "Documentation:" -ForegroundColor Cyan
    Write-Host "  Quick Start:  docs/user/QUICK_START_GUIDE.md" -ForegroundColor White
    Write-Host "  Full Docs:    docs/DOCUMENTATION_INDEX.md" -ForegroundColor White
    Write-Host ""
}

# ============================================================================
# MAIN INSTALLATION PROCESS
# ============================================================================

function Start-Installation {
    # Show welcome banner
    Show-WelcomeBanner

    Write-Info "This script will install and configure the Student Management System."
    Write-Info "Installation typically takes 5-10 minutes depending on your internet speed."
    Write-Host ""

    # Check if running as Administrator
    if (-not (Test-Administrator) -and -not $SkipDockerInstall) {
        Write-Warning-Message "This script requires Administrator privileges for Docker installation."
        Write-Info "Please right-click the script and select 'Run as Administrator'"
        Write-Host ""
        $continue = Read-Host "Continue without admin privileges? (Docker installation will be skipped) [Y/N]"
        if ($continue -notmatch '^[Yy]') {
            Write-Info "Installation cancelled. Please run as Administrator."
            exit 1
        }
        $SkipDockerInstall = $true
    }

    # Step 1: Check Prerequisites
    Write-Step 1 "Checking System Prerequisites"
    if (-not (Test-Prerequisites)) {
        Write-Error-Message "Prerequisites check failed!"

        # Offer to install Docker
        if (-not $SkipDockerInstall -and -not (Test-DockerInstalled)) {
            Write-Host ""
            $installDocker = Read-Host "Would you like to install Docker Desktop now? [Y/N]"
            if ($installDocker -match '^[Yy]') {
                if (-not (Install-DockerDesktop)) {
                    Write-Error-Message "Installation failed. Please resolve the issues and try again."
                    exit 1
                }
            } else {
                Write-Error-Message "Docker Desktop is required. Installation cannot continue."
                Write-Info "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
                exit 1
            }
        } else {
            Write-Error-Message "Please resolve the issues above and run the installer again."
            exit 1
        }
    }

    # Wait for Docker if it's not running
    if (-not (Test-DockerRunning)) {
        Write-Warning-Message "Docker Desktop is not running."
        Write-Info "Please start Docker Desktop from the Start Menu or System Tray."
        Write-Host ""
        $wait = Read-Host "Wait for Docker to start? [Y/N]"
        if ($wait -match '^[Yy]') {
            if (-not (Wait-ForDockerReady -TimeoutSeconds 120)) {
                Write-Error-Message "Docker Desktop did not start. Please start it manually and run this script again."
                exit 1
            }
        } else {
            Write-Error-Message "Docker Desktop must be running. Please start it and run this script again."
            exit 1
        }
    }

    # Step 2: Initialize Environment Files
    Write-Step 2 "Setting Up Environment Configuration"
    if (-not $SkipEnvSetup) {
        if (-not (Initialize-EnvironmentFiles)) {
            Write-Error-Message "Environment setup failed!"
            exit 1
        }
    } else {
        Write-Info "Skipping environment file setup (as requested)"
    }

    # Step 3: Create required directories
    Write-Step 3 "Creating Application Directories"
    $directories = @(
        (Join-Path $SCRIPT_DIR "data"),
        (Join-Path $SCRIPT_DIR "data\.triggers"),
        (Join-Path $SCRIPT_DIR "backups"),
        (Join-Path $SCRIPT_DIR "logs")
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Success "Created: $($dir.Replace($SCRIPT_DIR, '.'))"
        } else {
            Write-Info "Exists: $($dir.Replace($SCRIPT_DIR, '.'))"
        }
    }

    # Step 4: Pull/Build Docker Images
    Write-Step 4 "Building Docker Images"
    Write-Info "This step may take 5-10 minutes on first run..."
    Write-Host ""

    Push-Location $SCRIPT_DIR
    try {
        $VERSION = if (Test-Path $VERSION_FILE) { (Get-Content $VERSION_FILE -Raw).Trim() } else { "latest" }
        $IMAGE_TAG = "sms-fullstack:$VERSION"

        Write-Info "Building image: $IMAGE_TAG"
        docker build -t $IMAGE_TAG -f docker/Dockerfile.fullstack . 2>&1 | ForEach-Object {
            if ($_ -match '(Step \d+/\d+|Successfully built|Successfully tagged|CACHED)') {
                Write-Host $_ -ForegroundColor DarkGray
            }
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Docker build failed!"
            Write-Info "Check your Docker installation and internet connection."
            exit 1
        }

        Write-Success "Docker image built successfully"
    } finally {
        Pop-Location
    }

    # Step 5: Create Docker Volume
    Write-Step 5 "Creating Docker Volume for Data Persistence"
    $volumeName = "sms_data"
    $existingVolume = docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $volumeName }

    if ($existingVolume) {
        Write-Info "Volume '$volumeName' already exists"
    } else {
        docker volume create $volumeName 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Volume '$volumeName' created"
        } else {
            Write-Error-Message "Failed to create Docker volume"
            exit 1
        }
    }

    # Step 6: Verify Installation
    Write-Step 6 "Verifying Installation"

    $checks = @(
        @{Name = "Docker images"; Test = { docker images $IMAGE_TAG -q } },
        @{Name = "Docker volume"; Test = { docker volume ls --format "{{.Name}}" | Where-Object { $_ -eq $volumeName } } },
        @{Name = "Root .env file"; Test = { Test-Path $ROOT_ENV } },
        @{Name = "Backend .env file"; Test = { Test-Path $BACKEND_ENV } },
        @{Name = "RUN.ps1 script"; Test = { Test-Path (Join-Path $SCRIPT_DIR "RUN.ps1") } }
    )

    $allChecks = $true
    foreach ($check in $checks) {
        Write-Host "  $($check.Name): " -NoNewline
        $result = & $check.Test
        if ($result) {
            Write-Success "OK"
        } else {
            Write-Error-Message "Failed"
            $allChecks = $false
        }
    }

    if (-not $allChecks) {
        Write-Error-Message "Some verification checks failed!"
        exit 1
    }

    # Step 7: Final Setup
    Write-Step 7 "Finalizing Installation"
    Write-Success "All installation steps completed successfully!"

    # Show completion message
    Show-CompletionMessage

    # Ask if user wants to start now
    Write-Host ""
    $startNow = Read-Host "Would you like to start the application now? [Y/N]"
    if ($startNow -match '^[Yy]') {
        Write-Host ""
        Write-Info "Starting Student Management System..."
        & (Join-Path $SCRIPT_DIR "RUN.ps1")
    } else {
        Write-Info "You can start the application anytime by running: .\RUN.ps1"
    }
}

# ============================================================================
# SCRIPT ENTRY POINT
# ============================================================================

# Show help if requested
if ($Help) {
    Show-Help
    exit 0
}

# Start installation
try {
    Start-Installation
    exit 0
} catch {
    Write-Host "`n`n⚠️  Installation Error: $_" -ForegroundColor Red
    Write-Host "Stack trace:" -ForegroundColor DarkGray
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    Write-Host "`nInstallation failed. Please check the error above and try again." -ForegroundColor Red
    exit 1
}
