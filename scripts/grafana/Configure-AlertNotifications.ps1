# ============================================================================
# Grafana Alert Notification Channels Setup
# ============================================================================
# Purpose: Configure notification channels (Slack, Email, PagerDuty, etc.)
# Usage: .\Configure-AlertNotifications.ps1 -Channel Slack -WebhookUrl "https://hooks.slack.com/..."
# ============================================================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Slack", "Email", "PagerDuty", "Webhook", "Opsgenie", "List")]
    [string]$Channel,

    [Parameter(HelpMessage = "Webhook URL or email address")]
    [string]$Destination,

    [Parameter(HelpMessage = "Notification channel name")]
    [string]$ChannelName,

    [Parameter(HelpMessage = "Grafana API base URL")]
    [string]$GrafanaUrl = "http://localhost:3000",

    [Parameter(HelpMessage = "Grafana admin username")]
    [string]$AdminUser = "admin",

    [Parameter(HelpMessage = "Grafana admin password")]
    [string]$AdminPassword = "newpassword123"
)

# Colors
$Success = @{ ForegroundColor = "Green" }
$Error = @{ ForegroundColor = "Red" }
$Info = @{ ForegroundColor = "Cyan" }

Write-Host "`n╔════════════════════════════════════════╗" @Info
Write-Host "║   Alert Notification Configuration     ║" @Info
Write-Host "╚════════════════════════════════════════╝`n" @Info

# Create auth header
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${AdminUser}:${AdminPassword}"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}

# ============================================================================
# Action: List Notification Channels
# ============================================================================
if ($Channel -eq "List") {
    Write-Host "📋 Fetching notification channels..." @Info

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/alert-notifications" -Headers $headers

        if ($response.Count -eq 0) {
            Write-Host "ℹ️  No notification channels configured yet" @Info
            Write-Host ""
            exit 0
        }

        Write-Host "`n✅ Found $($response.Count) notification channels:`n" @Success

        $response | ForEach-Object {
            Write-Host "  📢 $($_.name)" @Info
            Write-Host "     Type: $($_.type)"
            Write-Host "     ID: $($_.id)"
            Write-Host "     Default: $($_.isDefault)"
            Write-Host ""
        }
        exit 0
    } catch {
        Write-Host "❌ Failed to fetch channels: $($_.Exception.Message)" @Error
        exit 1
    }
}

# Validate required parameters
if (-not $ChannelName) {
    $ChannelName = "$Channel Notification"
}

if (-not $Destination) {
    Write-Host "❌ Destination required" @Error
    Write-Host "   For Slack: -Destination 'https://hooks.slack.com/services/...'" @Error
    Write-Host "   For Email: -Destination 'alerts@example.com'" @Error
    exit 1
}

# ============================================================================
# Slack Notification
# ============================================================================
if ($Channel -eq "Slack") {
    Write-Host "📢 Setting up Slack notifications..." @Info
    Write-Host "   Channel: $ChannelName" @Info
    Write-Host "   Webhook: $($Destination.Substring(0, 50))..." @Info

    $body = @{
        name = $ChannelName
        type = "slack"
        isDefault = $false
        disableResolveMessage = $false
        settings = @{
            url = $Destination
            recipient = "#alerts"
            username = "Grafana Alerts"
            mentionUsers = ""
            mentionGroups = ""
            mentionChannel = "here"
        }
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/alert-notifications" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Slack notification channel created!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host "   Name: $($response.name)" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Email Notification
# ============================================================================
elseif ($Channel -eq "Email") {
    Write-Host "📧 Setting up Email notifications..." @Info
    Write-Host "   Channel: $ChannelName" @Info
    Write-Host "   To: $Destination" @Info

    $body = @{
        name = $ChannelName
        type = "email"
        isDefault = $false
        disableResolveMessage = $false
        settings = @{
            addresses = $Destination
        }
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/alert-notifications" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Email notification channel created!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host "   To: $Destination" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# PagerDuty Notification
# ============================================================================
elseif ($Channel -eq "PagerDuty") {
    Write-Host "🚨 Setting up PagerDuty notifications..." @Info
    Write-Host "   Channel: $ChannelName" @Info
    Write-Host "   Integration Key: $($Destination.Substring(0, 20))..." @Info

    $body = @{
        name = $ChannelName
        type = "pagerduty"
        isDefault = $false
        disableResolveMessage = $false
        settings = @{
            integrationKey = $Destination
            severity = "critical"
        }
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/alert-notifications" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ PagerDuty notification channel created!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Generic Webhook
# ============================================================================
elseif ($Channel -eq "Webhook") {
    Write-Host "🔗 Setting up Webhook notifications..." @Info
    Write-Host "   Channel: $ChannelName" @Info
    Write-Host "   Webhook: $Destination" @Info

    $body = @{
        name = $ChannelName
        type = "webhook"
        isDefault = $false
        disableResolveMessage = $false
        settings = @{
            url = $Destination
            httpMethod = "POST"
        }
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/alert-notifications" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Webhook notification channel created!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Opsgenie Notification
# ============================================================================
elseif ($Channel -eq "Opsgenie") {
    Write-Host "🔔 Setting up Opsgenie notifications..." @Info
    Write-Host "   Channel: $ChannelName" @Info
    Write-Host "   API Key: $($Destination.Substring(0, 20))..." @Info

    $body = @{
        name = $ChannelName
        type = "opsgenie"
        isDefault = $false
        disableResolveMessage = $false
        settings = @{
            apiKey = $Destination
            apiUrl = "https://api.opsgenie.com"
            autoClose = "true"
        }
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/alert-notifications" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Opsgenie notification channel created!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

Write-Host "`n💡 Tip: Set -Channel List to view all configured notification channels`n" @Info
