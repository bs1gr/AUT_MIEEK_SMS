# ============================================================================
# Grafana User Management Script
# ============================================================================
# Purpose: Create and manage Grafana users via API
# Usage: .\Manage-GrafanaUsers.ps1 -Action AddUser -Email "user@example.com" -Password "pass123"
# ============================================================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("AddUser", "ListUsers", "DeleteUser", "SetUserRole", "ResetPassword")]
    [string]$Action,

    [Parameter(HelpMessage = "User email")]
    [string]$Email,

    [Parameter(HelpMessage = "User password")]
    [string]$Password,

    [Parameter(HelpMessage = "User display name")]
    [string]$Name,

    [Parameter(HelpMessage = "User role (Admin, Editor, Viewer)")]
    [ValidateSet("Admin", "Editor", "Viewer")]
    [string]$Role = "Editor",

    [Parameter(HelpMessage = "Grafana API base URL")]
    [string]$GrafanaUrl = "http://localhost:3000",

    [Parameter(HelpMessage = "Grafana admin username")]
    [string]$AdminUser = "admin",

    [Parameter(HelpMessage = "Grafana admin password")]
    [string]$AdminPassword = "newpassword123",

    [Parameter(HelpMessage = "User ID for delete/reset operations")]
    [int]$UserId
)

# Colors
$Success = @{ ForegroundColor = "Green" }
$Error = @{ ForegroundColor = "Red" }
$Info = @{ ForegroundColor = "Cyan" }
$Warning = @{ ForegroundColor = "Yellow" }

Write-Host "`n╔════════════════════════════════════════╗" @Info
Write-Host "║   Grafana User Management              ║" @Info
Write-Host "╚════════════════════════════════════════╝`n" @Info

# Create auth header
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${AdminUser}:${AdminPassword}"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}

# ============================================================================
# Action: List Users
# ============================================================================
if ($Action -eq "ListUsers") {
    Write-Host "📋 Fetching Grafana users..." @Info

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/users" -Headers $headers

        Write-Host "`n✅ Found $($response.Count) users:`n" @Success

        $response | ForEach-Object {
            $role = if ($_.isAdmin) { "Admin" } else { if ($_.isGrafanaAdmin) { "GrafanaAdmin" } else { "Editor" } }
            Write-Host "  ID: $($_.id.ToString().PadRight(3)) | $($_.login.PadRight(20)) | $role" @Info
            Write-Host "     Email: $($_.email)"
        }
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed to fetch users: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Action: Add User
# ============================================================================
elseif ($Action -eq "AddUser") {
    if (-not $Email -or -not $Password) {
        Write-Host "❌ Email and Password required for AddUser action" @Error
        Write-Host "   Usage: .\Manage-GrafanaUsers.ps1 -Action AddUser -Email user@example.com -Password pass123" @Error
        exit 1
    }

    $displayName = if ($Name) { $Name } else { $Email.Split("@")[0] }

    Write-Host "➕ Creating new Grafana user..." @Info
    Write-Host "   Email: $Email" @Info
    Write-Host "   Name: $displayName" @Info
    Write-Host "   Role: $Role" @Info

    $body = @{
        login = $Email
        email = $Email
        name = $displayName
        password = $Password
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/admin/users" -Method Post -Headers $headers -Body $body

        if ($response.id) {
            Write-Host "✅ User created successfully!" @Success
            Write-Host "   User ID: $($response.id)" @Info

            # Set role if not default
            if ($Role -ne "Editor") {
                $roleUpdate = @{ role = $Role } | ConvertTo-Json
                Invoke-RestMethod -Uri "$GrafanaUrl/api/admin/users/$($response.id)/permissions" `
                    -Method Put -Headers $headers -Body $roleUpdate | Out-Null
                Write-Host "   Role set to: $Role" @Info
            }
            Write-Host ""
            exit 0
        }
    } catch {
        Write-Host "❌ Failed to create user: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Action: Delete User
# ============================================================================
elseif ($Action -eq "DeleteUser") {
    if (-not $UserId) {
        Write-Host "❌ UserId required for DeleteUser action" @Error
        Write-Host "   Usage: .\Manage-GrafanaUsers.ps1 -Action DeleteUser -UserId 5" @Error
        exit 1
    }

    Write-Host "🗑️  Deleting user ID: $UserId" @Warning
    $confirm = Read-Host "   Are you sure? (yes/no)"

    if ($confirm -ne "yes") {
        Write-Host "❌ Operation cancelled" @Error
        exit 0
    }

    try {
        Invoke-RestMethod -Uri "$GrafanaUrl/api/admin/users/$UserId" -Method Delete -Headers $headers
        Write-Host "✅ User deleted successfully!" @Success
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed to delete user: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Action: Set User Role
# ============================================================================
elseif ($Action -eq "SetUserRole") {
    if (-not $UserId) {
        Write-Host "❌ UserId required for SetUserRole action" @Error
        exit 1
    }

    Write-Host "🔧 Setting role for user ID: $UserId to $Role" @Info

    $body = @{ role = $Role } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$GrafanaUrl/api/admin/users/$UserId/permissions" `
            -Method Put -Headers $headers -Body $body | Out-Null
        Write-Host "✅ Role updated successfully!" @Success
        Write-Host "   User: $UserId | Role: $Role" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed to update role: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Action: Reset User Password
# ============================================================================
elseif ($Action -eq "ResetPassword") {
    if (-not $UserId -or -not $Password) {
        Write-Host "❌ UserId and Password required for ResetPassword action" @Error
        exit 1
    }

    Write-Host "🔑 Resetting password for user ID: $UserId" @Info

    $body = @{ password = $Password } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$GrafanaUrl/api/admin/users/$UserId/password" `
            -Method Put -Headers $headers -Body $body | Out-Null
        Write-Host "✅ Password reset successfully!" @Success
        Write-Host "   User: $UserId | New Password: $Password" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed to reset password: $($_.Exception.Message)" @Error
        exit 1
    }
}
