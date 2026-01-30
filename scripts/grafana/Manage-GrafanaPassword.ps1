# ============================================================================
# Grafana Password Management Script
# ============================================================================
# Purpose: Safely change Grafana admin password
# Usage: .\Manage-GrafanaPassword.ps1 -NewPassword "secure-password-123"
# ============================================================================

param(
    [Parameter(Mandatory = $true, HelpMessage = "New password for Grafana admin")]
    [ValidateLength(8, 128)]
    [string]$NewPassword,

    [Parameter(HelpMessage = "Grafana container name")]
    [string]$ContainerName = "sms-grafana",

    [Parameter(HelpMessage = "Grafana admin username")]
    [string]$AdminUser = "admin"
)

# Colors for output
$Success = @{ ForegroundColor = "Green" }
$Error = @{ ForegroundColor = "Red" }
$Info = @{ ForegroundColor = "Cyan" }

Write-Host "`n" @Info
Write-Host "╔════════════════════════════════════════╗" @Info
Write-Host "║   Grafana Password Management          ║" @Info
Write-Host "╚════════════════════════════════════════╝" @Info
Write-Host ""

# Verify container exists
Write-Host "1️⃣  Checking if Grafana container is running..." @Info
$container = docker ps --filter "name=$ContainerName" --quiet

if (-not $container) {
    Write-Host "❌ ERROR: Container '$ContainerName' not found or not running" @Error
    Write-Host "   Run: docker ps | Select-String grafana" @Error
    exit 1
}

Write-Host "✅ Grafana container found: $container" @Success
Write-Host ""

# Validate password strength
Write-Host "2️⃣  Validating password strength..." @Info
$validations = @{
    "Length (8+ chars)" = $NewPassword.Length -ge 8
    "Contains uppercase" = $NewPassword -match "[A-Z]"
    "Contains lowercase" = $NewPassword -match "[a-z]"
    "Contains numbers" = $NewPassword -match "[0-9]"
}

$allValid = $true
foreach ($check in $validations.Keys) {
    $status = if ($validations[$check]) { "✅" } else { "⚠️ " }
    Write-Host "  $status $check"
    if (-not $validations[$check]) { $allValid = $false }
}

if (-not $allValid) {
    Write-Host ""
    Write-Host "⚠️  Password does not meet recommended strength requirements" @Error
    Write-Host "   But will continue anyway..." @Info
}

Write-Host ""

# Confirm action
Write-Host "3️⃣  Resetting password for user: $AdminUser" @Info
Write-Host "   Container: $ContainerName" @Info
$confirm = Read-Host "   Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Operation cancelled" @Error
    exit 0
}

Write-Host ""
Write-Host "4️⃣  Executing password reset..." @Info

# Reset password
$output = docker exec $ContainerName grafana cli admin reset-admin-password $NewPassword 2>&1

if ($LASTEXITCODE -eq 0 -and $output -match "successfully") {
    Write-Host "✅ Password reset successful!" @Success
    Write-Host ""
    Write-Host "📋 Login Information:" @Info
    Write-Host "   URL:      http://localhost:3000"
    Write-Host "   Username: $AdminUser"
    Write-Host "   Password: $NewPassword"
    Write-Host ""
    Write-Host "💡 Tip: Store this password securely (e.g., password manager)" @Info
    exit 0
} else {
    Write-Host "❌ Password reset failed!" @Error
    Write-Host "   Error: $output" @Error
    Write-Host ""
    Write-Host "🔧 Troubleshooting:" @Info
    Write-Host "   1. Check container logs: docker logs $ContainerName --tail 50"
    Write-Host "   2. Verify container is healthy: docker ps | Select-String $ContainerName"
    Write-Host "   3. Try restarting container: docker restart $ContainerName"
    exit 1
}
