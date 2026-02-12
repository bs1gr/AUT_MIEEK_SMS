<#
.SYNOPSIS
    Verifies GitHub Actions runner has proper Docker access.

.DESCRIPTION
    This script tests whether the GitHub Actions runner can access Docker Desktop
    and execute Docker commands successfully. Use this after reconfiguring the runner
    to verify the permission fix worked.

.EXAMPLE
    .\VERIFY_RUNNER_DOCKER_ACCESS.ps1
    Run all verification checks

.EXAMPLE
    .\VERIFY_RUNNER_DOCKER_ACCESS.ps1 -Verbose
    Run with detailed output
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Test-Check {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$SuccessMessage,
        [string]$FailMessage
    )

    Write-Host ""
    Write-Host "▶ Testing: $Name" -ForegroundColor Yellow

    try {
        $result = & $Test
        if ($result) {
            Write-Host "  ✓ $SuccessMessage" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ $FailMessage" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        return $false
    }
}

# ============================================================================
# Verification Checks
# ============================================================================

Write-Header "GitHub Actions Runner Docker Access Verification"

$checks = @{
    Passed = 0
    Failed = 0
    Total = 0
}

# Check 1: Docker command available
$checks.Total++
$result = Test-Check `
    -Name "Docker Command Availability" `
    -Test {
        $cmd = Get-Command docker -ErrorAction SilentlyContinue
        return $null -ne $cmd
    } `
    -SuccessMessage "Docker command found in PATH" `
    -FailMessage "Docker command not found"

if ($result) { $checks.Passed++ } else { $checks.Failed++ }

# Check 2: Docker version
$checks.Total++
$result = Test-Check `
    -Name "Docker Version Check" `
    -Test {
        $version = docker version --format '{{.Client.Version}}' 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Version: $version" -ForegroundColor Gray
            return $true
        }
        return $false
    } `
    -SuccessMessage "Docker version retrieved successfully" `
    -FailMessage "Failed to get Docker version"

if ($result) { $checks.Passed++ } else { $checks.Failed++ }

# Check 3: Docker daemon connectivity
$checks.Total++
$result = Test-Check `
    -Name "Docker Daemon Connection" `
    -Test {
        docker ps > $null 2>&1
        return $LASTEXITCODE -eq 0
    } `
    -SuccessMessage "Successfully connected to Docker daemon" `
    -FailMessage "Cannot connect to Docker daemon (permission denied?)"

if ($result) { $checks.Passed++ } else { $checks.Failed++ }

# Check 4: Docker info retrieval
$checks.Total++
$result = Test-Check `
    -Name "Docker Info Retrieval" `
    -Test {
        $info = docker info --format '{{.OperatingSystem}}' 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OS: $info" -ForegroundColor Gray
            return $true
        }
        return $false
    } `
    -SuccessMessage "Docker info retrieved successfully" `
    -FailMessage "Failed to retrieve Docker info"

if ($result) { $checks.Passed++ } else { $checks.Failed++ }

# Check 5: Docker container operations
$checks.Total++
$result = Test-Check `
    -Name "Docker Container Operations" `
    -Test {
        $containers = docker ps -a --format '{{.Names}}' 2>&1
        if ($LASTEXITCODE -eq 0) {
            $count = ($containers | Measure-Object).Count
            Write-Host "  Found $count container(s)" -ForegroundColor Gray
            return $true
        }
        return $false
    } `
    -SuccessMessage "Docker container listing works" `
    -FailMessage "Failed to list Docker containers"

if ($result) { $checks.Passed++ } else { $checks.Failed++ }

# Check 6: Docker Compose availability
$checks.Total++
$result = Test-Check `
    -Name "Docker Compose Availability" `
    -Test {
        docker compose version > $null 2>&1
        return $LASTEXITCODE -eq 0
    } `
    -SuccessMessage "Docker Compose is available" `
    -FailMessage "Docker Compose not available"

if ($result) { $checks.Passed++ } else { $checks.Failed++ }

# Check 7: Runner service status
$checks.Total++
$result = Test-Check `
    -Name "Runner Service Status" `
    -Test {
        $service = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "  Service: $($service.Name)" -ForegroundColor Gray
            Write-Host "  Status: $($service.Status)" -ForegroundColor Gray
            $account = (Get-CimInstance Win32_Service -Filter "Name='$($service.Name)'").StartName
            Write-Host "  Account: $account" -ForegroundColor Gray
            return $service.Status -eq 'Running'
        }
        return $false
    } `
    -SuccessMessage "Runner service is running" `
    -FailMessage "Runner service not found or not running"

if ($result) { $checks.Passed++ } else { $checks.Failed++ }

# ============================================================================
# Summary
# ============================================================================

Write-Header "Verification Summary"

Write-Host ""
Write-Host "Total Checks: $($checks.Total)" -ForegroundColor White
Write-Host "Passed:       $($checks.Passed)" -ForegroundColor Green
Write-Host "Failed:       $($checks.Failed)" -ForegroundColor $(if ($checks.Failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

$successRate = [math]::Round(($checks.Passed / $checks.Total) * 100, 1)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })

Write-Host ""

if ($checks.Failed -eq 0) {
    Write-Host "✓✓✓ ALL CHECKS PASSED ✓✓✓" -ForegroundColor Green -BackgroundColor Black
    Write-Host ""
    Write-Host "The runner is properly configured for Docker access." -ForegroundColor Green
    Write-Host "You can now trigger pipeline runs that require Docker." -ForegroundColor White
    Write-Host ""
    exit 0
} elseif ($checks.Passed -ge 4) {
    Write-Host "⚠ PARTIAL SUCCESS ⚠" -ForegroundColor Yellow -BackgroundColor Black
    Write-Host ""
    Write-Host "Most checks passed, but some issues remain." -ForegroundColor Yellow
    Write-Host "Review the failure messages above for details." -ForegroundColor White
    Write-Host ""
    exit 1
} else {
    Write-Host "✗✗✗ VERIFICATION FAILED ✗✗✗" -ForegroundColor Red -BackgroundColor Black
    Write-Host ""
    Write-Host "Docker access is NOT properly configured." -ForegroundColor Red
    Write-Host "Please review the error messages above." -ForegroundColor White
    Write-Host ""
    Write-Host "Possible solutions:" -ForegroundColor Yellow
    Write-Host "  1. Ensure Docker Desktop is running" -ForegroundColor White
    Write-Host "  2. Run RECONFIGURE_RUNNER_USER_MODE.ps1 as Administrator" -ForegroundColor White
    Write-Host "  3. Verify user account has Docker Desktop access" -ForegroundColor White
    Write-Host ""
    exit 1
}
