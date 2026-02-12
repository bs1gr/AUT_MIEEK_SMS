<#
.SYNOPSIS
    Manual runner reconfiguration (no svc.ps1 required)

.DESCRIPTION
    Reconfigures GitHub Actions runner service to run as specific user
    without requiring svc.ps1 script.
#>

[CmdletBinding()]
param(
    [string]$ServiceName = "actions.runner.bs1gr-AUT_MIEEK_SMS.REC",
    [string]$UserAccount = "REC\Vasilis",
    [string]$RunnerPath = "D:\actions-runner"
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
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Manual Runner Reconfiguration Tool" -ForegroundColor Cyan
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

# Get current service account
$serviceConfig = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'"
Write-Host "  Current account: $($serviceConfig.StartName)" -ForegroundColor Gray

# Prompt for password
Write-Host ""
Write-Host "▶ Password required for user account reconfiguration" -ForegroundColor Yellow
Write-Host "  Account: $UserAccount" -ForegroundColor Gray
$password = Read-Host "Enter password for $UserAccount" -AsSecureString
$credential = New-Object System.Management.Automation.PSCredential($UserAccount, $password)

# Test credentials
Write-Host ""
Write-Host "▶ Validating credentials..." -ForegroundColor Yellow
try {
    # Try to access a network resource or use credential
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

    # Create temporary test to validate credentials
    $testResult = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "echo test" -Credential $credential -NoNewWindow -PassThru -Wait
    if ($testResult.ExitCode -ne 0) {
        throw "Credential validation failed"
    }

    Write-Host "✓ Credentials validated" -ForegroundColor Green
} catch {
    Write-Host "❌ Invalid credentials: $_" -ForegroundColor Red
    exit 1
}

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
Write-Host "▶ Reconfiguring service account..." -ForegroundColor Yellow
try {
    # Use sc.exe to change service account
    $scResult = sc.exe config $ServiceName obj= $UserAccount password= $plainPassword

    if ($LASTEXITCODE -ne 0) {
        throw "sc.exe returned exit code $LASTEXITCODE"
    }

    Write-Host "✓ Service reconfigured to run as: $UserAccount" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to reconfigure service: $_" -ForegroundColor Red
    Write-Host "  Attempting to restart with original account..." -ForegroundColor Yellow
    Start-Service -Name $ServiceName
    exit 1
}

# Grant user rights to run as service
Write-Host ""
Write-Host "▶ Granting 'Log on as a service' right..." -ForegroundColor Yellow
try {
    # This requires secedit, which should be available on Windows
    $tempFile = [System.IO.Path]::GetTempFileName()
    secedit /export /cfg $tempFile /quiet

    $content = Get-Content $tempFile
    $userSID = (New-Object System.Security.Principal.NTAccount($UserAccount)).Translate([System.Security.Principal.SecurityIdentifier]).Value

    # Check if user already has the right
    $serviceLogonRight = $content | Select-String "SeServiceLogonRight"
    if ($serviceLogonRight -and $serviceLogonRight -notmatch $userSID) {
        # Add user to SeServiceLogonRight
        $content = $content -replace "(SeServiceLogonRight = .*)", "`$1,*$userSID"
        $content | Set-Content $tempFile
        secedit /configure /db secedit.sdb /cfg $tempFile /quiet
    }

    Remove-Item $tempFile -Force
    Write-Host "✓ Service logon right granted" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: Could not configure service logon right automatically" -ForegroundColor Yellow
    Write-Host "  You may need to grant this manually via Local Security Policy" -ForegroundColor Gray
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
    Write-Host ""
    Write-Host "Check Windows Event Viewer for details:" -ForegroundColor Yellow
    Write-Host "  Application and Services Logs > Microsoft > Windows > TaskScheduler" -ForegroundColor Gray
    exit 1
}

# Verify final configuration
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
    Write-Host "Runner service is now configured to run as: $UserAccount" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run FIX_DOCKER_USERS_GROUP.ps1 to ensure docker-users group membership" -ForegroundColor Gray
    Write-Host "  2. Trigger a test deployment" -ForegroundColor Gray
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠ WARNING: Configuration may not have applied correctly" -ForegroundColor Yellow
    Write-Host "  Expected: $UserAccount" -ForegroundColor Gray
    Write-Host "  Actual: $($finalConfig.StartName)" -ForegroundColor Gray
    exit 1
}
