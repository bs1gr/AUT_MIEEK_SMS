<#
.SYNOPSIS
    Simple runner reconfiguration (direct sc.exe approach)

.DESCRIPTION
    Reconfigures GitHub Actions runner service to run as specific user
    using sc.exe directly (no password validation).
#>

[CmdletBinding()]
param(
    [string]$ServiceName = "actions.runner.bs1gr-AUT_MIEEK_SMS.REC",
    [string]$UserAccount = "REC\Vasilis"
)

$ErrorActionPreference = "Stop"

# Check admin privileges
function Test-AdminPrivileges {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-AdminPrivileges)) {
    Write-Host "❌ ERROR: This script requires Administrator privileges" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Simple Runner Reconfiguration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Verify service exists
Write-Host "▶ Checking service..." -ForegroundColor Yellow
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "❌ Service not found: $ServiceName" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Service found: $ServiceName" -ForegroundColor Green
Write-Host "  Current status: $($service.Status)" -ForegroundColor Gray

# Get current account
$serviceConfig = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'"
Write-Host "  Current account: $($serviceConfig.StartName)" -ForegroundColor Gray

# Check if already configured correctly
if ($serviceConfig.StartName -eq $UserAccount) {
    Write-Host ""
    Write-Host "✅ Service is already configured correctly!" -ForegroundColor Green
    Write-Host "   Account: $UserAccount" -ForegroundColor Gray
    exit 0
}

# Prompt for password
Write-Host ""
Write-Host "▶ Enter password for service account" -ForegroundColor Yellow
Write-Host "  Account: $UserAccount" -ForegroundColor Gray
$password = Read-Host "Password" -AsSecureString

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

# Stop the service
Write-Host ""
Write-Host "▶ Stopping runner service..." -ForegroundColor Yellow
try {
    Stop-Service -Name $ServiceName -Force -ErrorAction Stop
    Start-Sleep -Seconds 2
    Write-Host "✓ Service stopped" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to stop service: $_" -ForegroundColor Red
    exit 1
}

# Reconfigure service using sc.exe
Write-Host ""
Write-Host "▶ Reconfiguring service account (this may take a moment)..." -ForegroundColor Yellow
try {
    # Reconfigure service to use new account
    $output = & sc.exe config $ServiceName obj= $UserAccount password= $plainPassword 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Service reconfigured successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ sc.exe returned error:" -ForegroundColor Red
        Write-Host "  $output" -ForegroundColor Red
        Write-Host ""
        Write-Host "Attempting to restart service with previous configuration..." -ForegroundColor Yellow
        Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
        exit 1
    }
} catch {
    Write-Host "❌ Exception during reconfiguration: $_" -ForegroundColor Red
    exit 1
}

# Start the service
Write-Host ""
Write-Host "▶ Starting runner service..." -ForegroundColor Yellow
try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Start-Sleep -Seconds 3

    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq 'Running') {
        Write-Host "✓ Service started successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠ Service status: $($service.Status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to start service: $_" -ForegroundColor Red
    exit 1
}

# Verify configuration
Write-Host ""
Write-Host "▶ Verifying configuration..." -ForegroundColor Yellow
$finalConfig = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'"
Write-Host "  Service: $($finalConfig.Name)" -ForegroundColor Gray
Write-Host "  Account: $($finalConfig.StartName)" -ForegroundColor Gray
Write-Host "  State: $($finalConfig.State)" -ForegroundColor Gray

if ($finalConfig.StartName -eq $UserAccount) {
    Write-Host ""
    Write-Host "✅ RECONFIGURATION SUCCESSFUL" -ForegroundColor Green
    Write-Host ""
    Write-Host "Runner service now runs as: $UserAccount" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Trigger a test deployment from the dev machine" -ForegroundColor Gray
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠ WARNING: Configuration may not have applied" -ForegroundColor Yellow
    Write-Host "  Expected: $UserAccount" -ForegroundColor Gray
    Write-Host "  Actual: $($finalConfig.StartName)" -ForegroundColor Gray
    exit 1
}