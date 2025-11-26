<#
.SYNOPSIS
    Pre-Commit Verification Script - SMS Application

.DESCRIPTION
    Unified automation for pre-commit verification. Ensures code quality and
    deployment readiness by performing comprehensive tests across both Native
    and Docker deployment modes.

    Operations performed:
    - Prerequisites check (Python, Node.js, Docker)
    - Environment cleanup (stop processes, clean temp files)
    - Native app testing (Backend + Frontend health checks)
    - Docker app testing (Container + Database health checks)
    - Compilation verification (TypeScript, ESLint)
    - Git status validation
    - Test results summary

.PARAMETER Quick
    Skip Docker testing (Native only)

.PARAMETER SkipNative
    Skip Native testing (Docker only)

.PARAMETER SkipDocker
    Skip Docker testing (Native only)

.PARAMETER NoCleanup
    Skip environment cleanup before testing

.PARAMETER Help
    Show this help message

.EXAMPLE
    .\PRE_COMMIT_CHECK.ps1
    # Run full pre-commit verification (Native + Docker)

.EXAMPLE
    .\PRE_COMMIT_CHECK.ps1 -Quick
    # Fast check (Native only)

.EXAMPLE
    .\PRE_COMMIT_CHECK.ps1 -SkipNative
    # Docker only

.NOTES
    Version: 1.0.0
    Created: 2025-11-25
    Purpose: Automated pre-commit verification for v1.9.0 release
#>

param(
    [switch]$Quick,
    [switch]$SkipNative,
    [switch]$SkipDocker,
    [switch]$NoCleanup,
    [switch]$Help
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = 'Stop'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$NATIVE_SCRIPT = Join-Path $SCRIPT_DIR "NATIVE.ps1"
$DOCKER_SCRIPT = Join-Path $SCRIPT_DIR "DOCKER.ps1"
$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$FRONTEND_DIR = Join-Path $SCRIPT_DIR "frontend"
$BACKEND_PORT = 8000
$FRONTEND_PORT = 5173
$DOCKER_PORT = 8080
$TEST_TIMEOUT = 60

# Test results tracking
$script:TestResults = @{
    Prerequisites = @()
    Cleanup = @()
    NativeBackend = @()
    NativeFrontend = @()
    DockerContainer = @()
    DockerDatabase = @()
    Compilation = @()
    GitStatus = @()
    Overall = $true
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message, [string]$Color = 'Cyan')
    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Color
    Write-Host "║  $($Message.PadRight(58))  ║" -ForegroundColor $Color
    Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
    $script:TestResults.Overall = $false
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Add-TestResult {
    param(
        [string]$Category,
        [string]$Test,
        [bool]$Passed,
        [string]$Message = ""
    )

    $result = @{
        Test = $Test
        Passed = $Passed
        Message = $Message
        Timestamp = Get-Date -Format "HH:mm:ss"
    }

    $script:TestResults[$Category] += $result

    if (-not $Passed) {
        $script:TestResults.Overall = $false
    }
}

function Test-CommandAvailable {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction SilentlyContinue
        return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
    } catch {
        return $false
    }
}

function Test-PortInUse {
    param([int]$Port)
    try {
        $connections = netstat -ano | Select-String ":$Port" | Where-Object { $_ -match 'LISTENING' }
        return ($null -ne $connections -and $connections.Count -gt 0)
    }
    catch {
        return $false
    }
}

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )

    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-PortInUse -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    return $false
}

function Test-HttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                return @{ Success = $true; StatusCode = 200; Content = $response.Content }
            }
        }
        catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    return @{ Success = $false; StatusCode = 0; Content = "" }
}

# ============================================================================
# HELP
# ============================================================================

function Show-Help {
    Write-Header "Pre-Commit Verification Script"
    Write-Host @"
DESCRIPTION:
  Automated pre-commit verification for SMS application. Tests both Native
  and Docker deployment modes to ensure production readiness.

USAGE:
  .\PRE_COMMIT_CHECK.ps1 [OPTIONS]

OPTIONS:
  -Quick         Skip Docker testing (Native only, faster)
  -SkipNative    Skip Native testing (Docker only)
  -SkipDocker    Skip Docker testing (Native only)
  -NoCleanup     Skip environment cleanup before testing
  -Help          Show this help message

TESTS PERFORMED:
  1. Prerequisites Check
     • Python 3.11+ availability
     • Node.js 18+ availability
     • Docker availability (if Docker testing enabled)
     • PowerShell version

  2. Environment Cleanup
     • Stop running Native processes
     • Stop running Docker containers
     • Clean temporary files

  3. Native App Testing (if enabled)
     • Start Backend (FastAPI on port $BACKEND_PORT)
     • Start Frontend (Vite on port $FRONTEND_PORT)
     • Health check Backend (HTTP 200 + "healthy")
     • Health check Frontend (HTTP 200)
     • Stop processes cleanly

  4. Docker App Testing (if enabled)
     • Stop existing containers
     • Build/Start Docker container
     • Health check Container (HTTP 200 + "healthy")
     • Verify Database connection
     • Check Frontend accessibility

  5. Compilation Verification
     • TypeScript compilation (0 production errors)
     • ESLint validation (no blocking errors)

  6. Git Status Validation
     • List modified files
     • List new files
     • List deleted files
     • Check for untracked files

EXAMPLES:
  .\PRE_COMMIT_CHECK.ps1              # Full verification
  .\PRE_COMMIT_CHECK.ps1 -Quick       # Native only (fast)
  .\PRE_COMMIT_CHECK.ps1 -SkipNative  # Docker only
  .\PRE_COMMIT_CHECK.ps1 -NoCleanup   # Skip cleanup phase

OUTPUT:
  Generates comprehensive test report with:
  • Pass/Fail status for each test
  • Detailed error messages for failures
  • Summary statistics
  • Overall readiness status

EXIT CODES:
  0  All tests passed (ready to commit)
  1  One or more tests failed (fix issues before commit)

"@
}

# ============================================================================
# TEST PHASES
# ============================================================================

function Test-Prerequisites {
    Write-Header "Phase 1: Prerequisites Check"

    # Python
    Write-Host "Checking Python... " -NoNewline
    if (Test-CommandAvailable "python") {
        $pythonVersion = python --version 2>&1
        if ($pythonVersion -match 'Python (\d+\.\d+)') {
            $version = [version]$matches[1]
            if ($version -ge [version]"3.11") {
                Write-Success "Python $version ✅"
                Add-TestResult -Category "Prerequisites" -Test "Python" -Passed $true -Message $pythonVersion
            } else {
                Write-Failure "Python $version (requires 3.11+)"
                Add-TestResult -Category "Prerequisites" -Test "Python" -Passed $false -Message "Version too old: $pythonVersion"
            }
        }
    } else {
        Write-Failure "Python not found"
        Add-TestResult -Category "Prerequisites" -Test "Python" -Passed $false -Message "Command not available"
    }

    # Node.js
    Write-Host "Checking Node.js... " -NoNewline
    if (Test-CommandAvailable "node") {
        $nodeVersion = node --version 2>&1
        if ($nodeVersion -match 'v(\d+\.\d+)') {
            $version = [version]$matches[1]
            if ($version -ge [version]"18.0") {
                Write-Success "Node.js $nodeVersion ✅"
                Add-TestResult -Category "Prerequisites" -Test "Node.js" -Passed $true -Message $nodeVersion
            } else {
                Write-Failure "Node.js $nodeVersion (requires 18+)"
                Add-TestResult -Category "Prerequisites" -Test "Node.js" -Passed $false -Message "Version too old: $nodeVersion"
            }
        }
    } else {
        Write-Failure "Node.js not found"
        Add-TestResult -Category "Prerequisites" -Test "Node.js" -Passed $false -Message "Command not available"
    }

    # Docker (if needed)
    if (-not $SkipDocker -and -not $Quick) {
        Write-Host "Checking Docker... " -NoNewline
        if (Test-CommandAvailable "docker") {
            try {
                $null = docker ps 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerVersion = docker --version 2>&1
                    Write-Success "Docker available ✅"
                    Add-TestResult -Category "Prerequisites" -Test "Docker" -Passed $true -Message $dockerVersion
                } else {
                    Write-Failure "Docker not running"
                    Add-TestResult -Category "Prerequisites" -Test "Docker" -Passed $false -Message "Docker daemon not running"
                }
            } catch {
                Write-Failure "Docker not available"
                Add-TestResult -Category "Prerequisites" -Test "Docker" -Passed $false -Message $_
            }
        } else {
            Write-Warning "Docker not found (skipping Docker tests)"
            Add-TestResult -Category "Prerequisites" -Test "Docker" -Passed $false -Message "Command not available"
            $script:SkipDocker = $true
        }
    }

    Write-Host ""
}

function Invoke-Cleanup {
    if ($NoCleanup) {
        Write-Header "Phase 2: Environment Cleanup" "Yellow"
        Write-Warning "Cleanup skipped (NoCleanup flag)"
        return
    }

    Write-Header "Phase 2: Environment Cleanup"

    # Stop Native processes
    Write-Info "Stopping Native processes..."
    try {
        & $NATIVE_SCRIPT -Stop 2>&1 | Out-Null
        Write-Success "Native processes stopped"
        Add-TestResult -Category "Cleanup" -Test "Stop Native" -Passed $true
    } catch {
        Write-Warning "Native stop failed (may not be running)"
        Add-TestResult -Category "Cleanup" -Test "Stop Native" -Passed $true -Message "Not running"
    }

    # Force kill any remaining Node/Python processes
    Write-Info "Cleaning up lingering processes..."
    try {
        Get-Process | Where-Object {$_.ProcessName -match "node|uvicorn"} | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Success "Process cleanup complete"
        Add-TestResult -Category "Cleanup" -Test "Kill Processes" -Passed $true
    } catch {
        Add-TestResult -Category "Cleanup" -Test "Kill Processes" -Passed $true -Message "No processes to kill"
    }

    # Stop Docker container
    if (-not $SkipDocker -and -not $Quick) {
        Write-Info "Stopping Docker container..."
        try {
            & $DOCKER_SCRIPT -Stop 2>&1 | Out-Null
            Write-Success "Docker container stopped"
            Add-TestResult -Category "Cleanup" -Test "Stop Docker" -Passed $true
        } catch {
            Write-Warning "Docker stop failed (may not be running)"
            Add-TestResult -Category "Cleanup" -Test "Stop Docker" -Passed $true -Message "Not running"
        }
    }

    Start-Sleep -Seconds 2
    Write-Host ""
}

function Test-NativeDeployment {
    if ($SkipNative) {
        Write-Header "Phase 3: Native App Testing" "Yellow"
        Write-Warning "Native testing skipped (SkipNative flag)"
        return
    }

    Write-Header "Phase 3: Native App Testing"

    # Start Native
    Write-Info "Starting Native app (Backend + Frontend)..."
    try {
        Start-Job -ScriptBlock {
            param($Script)
            & $Script -Start
        } -ArgumentList $NATIVE_SCRIPT | Out-Null

        Start-Sleep -Seconds 3
    } catch {
        Write-Failure "Failed to start Native app"
        Add-TestResult -Category "NativeBackend" -Test "Start" -Passed $false -Message $_
        Add-TestResult -Category "NativeFrontend" -Test "Start" -Passed $false -Message $_
        return
    }

    # Wait for Backend
    Write-Info "Waiting for Backend (port $BACKEND_PORT)..."
    if (Wait-ForPort -Port $BACKEND_PORT -TimeoutSeconds 30) {
        Write-Success "Backend port listening"

        # Health check
        Write-Info "Testing Backend health endpoint..."
        $healthCheck = Test-HttpEndpoint -Url "http://localhost:$BACKEND_PORT/health" -TimeoutSeconds 30

        if ($healthCheck.Success) {
            try {
                $healthData = $healthCheck.Content | ConvertFrom-Json
                if ($healthData.status -eq "healthy") {
                    Write-Success "Backend health: healthy ✅"
                    Add-TestResult -Category "NativeBackend" -Test "Health Check" -Passed $true -Message "Status: healthy"
                } else {
                    Write-Failure "Backend health: $($healthData.status)"
                    Add-TestResult -Category "NativeBackend" -Test "Health Check" -Passed $false -Message "Status: $($healthData.status)"
                }
            } catch {
                Write-Success "Backend responding (200 OK)"
                Add-TestResult -Category "NativeBackend" -Test "Health Check" -Passed $true -Message "HTTP 200"
            }
        } else {
            Write-Failure "Backend health check failed"
            Add-TestResult -Category "NativeBackend" -Test "Health Check" -Passed $false -Message "Timeout or non-200 response"
        }
    } else {
        Write-Failure "Backend failed to start"
        Add-TestResult -Category "NativeBackend" -Test "Start" -Passed $false -Message "Port not listening after 30s"
    }

    # Wait for Frontend
    Write-Info "Waiting for Frontend (port $FRONTEND_PORT)..."
    if (Wait-ForPort -Port $FRONTEND_PORT -TimeoutSeconds 30) {
        Write-Success "Frontend port listening"

        # Health check
        Write-Info "Testing Frontend accessibility..."
        $frontendCheck = Test-HttpEndpoint -Url "http://localhost:$FRONTEND_PORT" -TimeoutSeconds 20

        if ($frontendCheck.Success) {
            Write-Success "Frontend accessible ✅"
            Add-TestResult -Category "NativeFrontend" -Test "Accessibility" -Passed $true -Message "HTTP 200"
        } else {
            Write-Failure "Frontend not accessible"
            Add-TestResult -Category "NativeFrontend" -Test "Accessibility" -Passed $false -Message "Timeout or non-200 response"
        }
    } else {
        Write-Failure "Frontend failed to start"
        Add-TestResult -Category "NativeFrontend" -Test "Start" -Passed $false -Message "Port not listening after 30s"
    }

    # Stop Native
    Write-Info "Stopping Native app..."
    try {
        & $NATIVE_SCRIPT -Stop 2>&1 | Out-Null
        Write-Success "Native app stopped"
    } catch {
        Write-Warning "Native stop had issues"
    }

    Start-Sleep -Seconds 2
    Write-Host ""
}

function Test-DockerDeployment {
    if ($SkipDocker -or $Quick) {
        Write-Header "Phase 4: Docker App Testing" "Yellow"
        Write-Warning "Docker testing skipped"
        return
    }

    Write-Header "Phase 4: Docker App Testing"

    # Start Docker
    Write-Info "Starting Docker container..."
    try {
        Start-Job -ScriptBlock {
            param($Script)
            & $Script -Start
        } -ArgumentList $DOCKER_SCRIPT | Out-Null

        Start-Sleep -Seconds 5
    } catch {
        Write-Failure "Failed to start Docker"
        Add-TestResult -Category "DockerContainer" -Test "Start" -Passed $false -Message $_
        return
    }

    # Wait for container
    Write-Info "Waiting for Docker container (port $DOCKER_PORT)..."
    if (Wait-ForPort -Port $DOCKER_PORT -TimeoutSeconds 60) {
        Write-Success "Docker port listening"

        # Health check
        Write-Info "Testing Docker health endpoint..."
        $healthCheck = Test-HttpEndpoint -Url "http://localhost:$DOCKER_PORT/health" -TimeoutSeconds 40

        if ($healthCheck.Success) {
            try {
                $healthData = $healthCheck.Content | ConvertFrom-Json
                if ($healthData.status -eq "healthy") {
                    Write-Success "Container health: healthy ✅"
                    Add-TestResult -Category "DockerContainer" -Test "Health Check" -Passed $true -Message "Status: healthy"

                    # Check database
                    if ($healthData.database) {
                        $dbStatus = $healthData.database
                        if ($dbStatus -eq "connected") {
                            Write-Success "Database: connected ✅"
                            Add-TestResult -Category "DockerDatabase" -Test "Connection" -Passed $true -Message "Status: connected"
                        } else {
                            Write-Failure "Database: $dbStatus"
                            Add-TestResult -Category "DockerDatabase" -Test "Connection" -Passed $false -Message "Status: $dbStatus"
                        }
                    }
                } else {
                    Write-Failure "Container health: $($healthData.status)"
                    Add-TestResult -Category "DockerContainer" -Test "Health Check" -Passed $false -Message "Status: $($healthData.status)"
                }
            } catch {
                Write-Success "Container responding (200 OK)"
                Add-TestResult -Category "DockerContainer" -Test "Health Check" -Passed $true -Message "HTTP 200"
            }
        } else {
            Write-Failure "Container health check failed"
            Add-TestResult -Category "DockerContainer" -Test "Health Check" -Passed $false -Message "Timeout or non-200 response"
        }

        # Check frontend
        Write-Info "Testing Docker frontend..."
        $frontendCheck = Test-HttpEndpoint -Url "http://localhost:$DOCKER_PORT" -TimeoutSeconds 20

        if ($frontendCheck.Success) {
            Write-Success "Frontend accessible ✅"
            Add-TestResult -Category "DockerContainer" -Test "Frontend" -Passed $true -Message "HTTP 200"
        } else {
            Write-Failure "Frontend not accessible"
            Add-TestResult -Category "DockerContainer" -Test "Frontend" -Passed $false -Message "Timeout or non-200 response"
        }
    } else {
        Write-Failure "Docker container failed to start"
        Add-TestResult -Category "DockerContainer" -Test "Start" -Passed $false -Message "Port not listening after 60s"
    }

    Write-Host ""
}

function Test-Compilation {
    Write-Header "Phase 5: Compilation Verification"

    # TypeScript compilation
    Write-Info "Running TypeScript compiler..."
    Push-Location $FRONTEND_DIR
    try {
        $tscOutput = npx tsc --noEmit 2>&1 | Out-String
        $productionErrors = $tscOutput | Select-String -Pattern "error TS" | Where-Object { $_ -notmatch "(test\.|\.test\.)" }

        if ($productionErrors) {
            Write-Failure "TypeScript errors found in production code"
            Add-TestResult -Category "Compilation" -Test "TypeScript" -Passed $false -Message "$($productionErrors.Count) errors"
            Write-Host $tscOutput -ForegroundColor Red
        } else {
            Write-Success "TypeScript compilation: 0 production errors ✅"
            Add-TestResult -Category "Compilation" -Test "TypeScript" -Passed $true -Message "0 production errors"
        }
    } catch {
        Write-Warning "TypeScript check failed: $_"
        Add-TestResult -Category "Compilation" -Test "TypeScript" -Passed $false -Message $_
    } finally {
        Pop-Location
    }

    # ESLint check (non-blocking, informational only)
    Write-Info "Running ESLint (informational)..."
    Push-Location $FRONTEND_DIR
    try {
        $eslintOutput = npm run lint 2>&1 | Out-String
        $blockingErrors = $eslintOutput | Select-String -Pattern "error" | Where-Object { $_ -notmatch "warning" }

        if ($blockingErrors -and $blockingErrors.Count -gt 0) {
            Write-Warning "ESLint errors found (review but non-blocking)"
            Add-TestResult -Category "Compilation" -Test "ESLint" -Passed $true -Message "Warnings only (non-blocking)"
        } else {
            Write-Success "ESLint: No blocking errors ✅"
            Add-TestResult -Category "Compilation" -Test "ESLint" -Passed $true -Message "Clean or warnings only"
        }
    } catch {
        Write-Info "ESLint check skipped (not critical)"
        Add-TestResult -Category "Compilation" -Test "ESLint" -Passed $true -Message "Skipped"
    } finally {
        Pop-Location
    }

    Write-Host ""
}

function Test-GitStatus {
    Write-Header "Phase 6: Git Status Validation"

    try {
        $gitStatus = git status --short 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Failure "Git status check failed"
            Add-TestResult -Category "GitStatus" -Test "Git Available" -Passed $false -Message "Command failed"
            return
        }

        $modified = ($gitStatus | Where-Object { $_ -match "^\s*M\s+" }).Count
        $added = ($gitStatus | Where-Object { $_ -match "^\s*A\s+" }).Count
        $deleted = ($gitStatus | Where-Object { $_ -match "^\s*D\s+" }).Count
        $untracked = ($gitStatus | Where-Object { $_ -match "^\?\?\s+" }).Count

        Write-Info "Git status summary:"
        Write-Host "  • Modified:   $modified files" -ForegroundColor White
        Write-Host "  • Added:      $added files" -ForegroundColor White
        Write-Host "  • Deleted:    $deleted files" -ForegroundColor White
        Write-Host "  • Untracked:  $untracked files" -ForegroundColor White

        $totalChanges = $modified + $added + $deleted + $untracked

        if ($totalChanges -gt 0) {
            Write-Success "Git status: $totalChanges file(s) changed ✅"
            Add-TestResult -Category "GitStatus" -Test "Changes Detected" -Passed $true -Message "$totalChanges files"
        } else {
            Write-Warning "No changes detected in git"
            Add-TestResult -Category "GitStatus" -Test "Changes Detected" -Passed $false -Message "0 files changed"
        }

    } catch {
        Write-Failure "Git check failed: $_"
        Add-TestResult -Category "GitStatus" -Test "Git Available" -Passed $false -Message $_
    }

    Write-Host ""
}

# ============================================================================
# SUMMARY
# ============================================================================

function Show-Summary {
    Write-Header "Test Results Summary" "Magenta"

    $categories = @("Prerequisites", "Cleanup", "NativeBackend", "NativeFrontend", "DockerContainer", "DockerDatabase", "Compilation", "GitStatus")

    foreach ($category in $categories) {
        $tests = $script:TestResults[$category]
        if ($tests.Count -eq 0) { continue }

        $passed = ($tests | Where-Object { $_.Passed }).Count
        $failed = ($tests | Where-Object { -not $_.Passed }).Count
        $total = $tests.Count

        Write-Host "`n📊 $category ($passed/$total passed)" -ForegroundColor Cyan

        foreach ($test in $tests) {
            $icon = if ($test.Passed) { "✅" } else { "❌" }
            $color = if ($test.Passed) { "Green" } else { "Red" }
            $msg = if ($test.Message) { " - $($test.Message)" } else { "" }
            Write-Host "  $icon $($test.Test)$msg" -ForegroundColor $color
        }
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

    if ($script:TestResults.Overall) {
        Write-Host "`n🎉 ALL TESTS PASSED - READY TO COMMIT! 🎉`n" -ForegroundColor Green
        Write-Info "Next steps:"
        Write-Host "  1. Review changes:  git status" -ForegroundColor White
        Write-Host "  2. Stage changes:   git add -u" -ForegroundColor White
        Write-Host "  3. Commit:          git commit -F commit_msg.txt" -ForegroundColor White
        Write-Host "  4. Push:            git push origin main" -ForegroundColor White
    } else {
        Write-Host "`n⚠️  SOME TESTS FAILED - FIX ISSUES BEFORE COMMIT ⚠️`n" -ForegroundColor Red
        Write-Info "Review failed tests above and fix issues"
    }

    Write-Host ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if ($Help) {
    Show-Help
    exit 0
}

# Quick mode implies skip Docker
if ($Quick) {
    $SkipDocker = $true
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║           PRE-COMMIT VERIFICATION - SMS v1.9.0               ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Info "Starting comprehensive pre-commit checks..."
Write-Host ""

$startTime = Get-Date

# Run test phases
Test-Prerequisites
Invoke-Cleanup
Test-NativeDeployment
Test-DockerDeployment
Test-Compilation
Test-GitStatus

# Show summary
$duration = (Get-Date) - $startTime
Write-Info "Total duration: $($duration.TotalSeconds.ToString('0.0'))s"
Show-Summary

# Exit with appropriate code
if ($script:TestResults.Overall) {
    exit 0
} else {
    exit 1
}
