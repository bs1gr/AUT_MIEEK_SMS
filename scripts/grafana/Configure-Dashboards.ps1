# ============================================================================
# Grafana Dashboard Configuration Script
# ============================================================================
# Purpose: Create and manage Grafana dashboards via API
# Usage: .\Configure-Dashboards.ps1 -Action CreateDashboard -DashboardName "System Health"
# ============================================================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("CreateSystemHealth", "CreateAppPerformance", "CreateStudentUsage", "CreateTroubleshooting", "ListDashboards", "DeleteDashboard")]
    [string]$Action,

    [Parameter(HelpMessage = "Dashboard name for delete operation")]
    [string]$DashboardName,

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
Write-Host "║   Grafana Dashboard Configuration      ║" @Info
Write-Host "╚════════════════════════════════════════╝`n" @Info

# Create auth header
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${AdminUser}:${AdminPassword}"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}

# ============================================================================
# Helper function to create dashboard
# ============================================================================
function New-GrafanaDashboard {
    param(
        [string]$Title,
        [string]$Description,
        [array]$Panels
    )

    $dashboard = @{
        dashboard = @{
            title = $Title
            description = $Description
            tags = @("sms", "monitoring")
            timezone = "browser"
            panels = $Panels
            refresh = "30s"
            time = @{
                from = "now-6h"
                to = "now"
            }
            timepicker = @{
                refresh_intervals = @("5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d")
            }
            schemaVersion = 39
            version = 0
            uid = [guid]::NewGuid().ToString().Replace("-", "").Substring(0, 8)
        }
        overwrite = $true
    }

    return $dashboard | ConvertTo-Json -Depth 10
}

# ============================================================================
# System Health Dashboard
# ============================================================================
if ($Action -eq "CreateSystemHealth") {
    Write-Host "📊 Creating System Health Dashboard..." @Info

    $panels = @(
        @{
            title = "CPU Usage"
            type = "gauge"
            gridPos = @{ h = 8; w = 8; x = 0; y = 0 }
            targets = @(@{ expr = "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)" })
            fieldConfig = @{ defaults = @{ thresholds = @{ mode = "absolute"; steps = @(@{ color = "green"; value = 0 }, @{ color = "yellow"; value = 70 }, @{ color = "red"; value = 90 }) } } }
        },
        @{
            title = "Memory Usage"
            type = "gauge"
            gridPos = @{ h = 8; w = 8; x = 8; y = 0 }
            targets = @(@{ expr = "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100" })
            fieldConfig = @{ defaults = @{ thresholds = @{ mode = "absolute"; steps = @(@{ color = "green"; value = 0 }, @{ color = "yellow"; value = 80 }, @{ color = "red"; value = 95 }) } } }
        },
        @{
            title = "Disk Usage"
            type = "gauge"
            gridPos = @{ h = 8; w = 8; x = 16; y = 0 }
            targets = @(@{ expr = "((node_filesystem_size_bytes{mountpoint=\"/\"} - node_filesystem_avail_bytes{mountpoint=\"/\"}) / node_filesystem_size_bytes{mountpoint=\"/\"}) * 100" })
            fieldConfig = @{ defaults = @{ thresholds = @{ mode = "absolute"; steps = @(@{ color = "green"; value = 0 }, @{ color = "yellow"; value = 75 }, @{ color = "red"; value = 90 }) } } }
        },
        @{
            title = "Database Connections"
            type = "stat"
            gridPos = @{ h = 8; w = 12; x = 0; y = 8 }
            targets = @(@{ expr = "pg_stat_activity_count" })
        },
        @{
            title = "Service Health Status"
            type = "table"
            gridPos = @{ h = 8; w = 12; x = 12; y = 8 }
            targets = @(@{ expr = "up{job=~\"prometheus|alertmanager|grafana|loki\"}" })
        }
    )

    $body = New-GrafanaDashboard -Title "System Health Dashboard" `
        -Description "Monitor infrastructure health: CPU, memory, disk, database" -Panels $panels

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/dashboards/db" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Dashboard created successfully!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host "   URL: $GrafanaUrl/d/$($response.uid)/" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Application Performance Dashboard
# ============================================================================
elseif ($Action -eq "CreateAppPerformance") {
    Write-Host "📈 Creating Application Performance Dashboard..." @Info

    $panels = @(
        @{
            title = "Request Rate (req/s)"
            type = "graph"
            gridPos = @{ h = 8; w = 12; x = 0; y = 0 }
            targets = @(@{ expr = "rate(http_requests_total[5m])" })
        },
        @{
            title = "Response Time p95"
            type = "graph"
            gridPos = @{ h = 8; w = 12; x = 12; y = 0 }
            targets = @(@{ expr = "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" })
            alert = @{
                conditions = @(@{ evaluator = @{ params = @(0.5); type = "gt" }; operator = @{ type = "and" }; query = @{ params = @("A", "5m", "now") }; type = "query" })
                frequency = "1m"
                handler = 1
                message = "Response time p95 > 500ms"
            }
        },
        @{
            title = "Error Rate %"
            type = "graph"
            gridPos = @{ h = 8; w = 12; x = 0; y = 8 }
            targets = @(@{ expr = "(rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])) * 100" })
        },
        @{
            title = "Active Connections"
            type = "gauge"
            gridPos = @{ h = 8; w = 12; x = 12; y = 8 }
            targets = @(@{ expr = "http_requests_in_flight" })
        }
    )

    $body = New-GrafanaDashboard -Title "Application Performance Dashboard" `
        -Description "Monitor API performance, response times, throughput" -Panels $panels

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/dashboards/db" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Dashboard created successfully!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host "   URL: $GrafanaUrl/d/$($response.uid)/" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Student Usage Dashboard
# ============================================================================
elseif ($Action -eq "CreateStudentUsage") {
    Write-Host "👥 Creating Student System Usage Dashboard..." @Info

    $panels = @(
        @{
            title = "Active Users (Real-time)"
            type = "stat"
            gridPos = @{ h = 4; w = 6; x = 0; y = 0 }
            targets = @(@{ expr = "http_requests_in_flight" })
        },
        @{
            title = "Daily Active Users (DAU)"
            type = "stat"
            gridPos = @{ h = 4; w = 6; x = 6; y = 0 }
            targets = @(@{ expr = "increase(http_requests_total[24h])" })
        },
        @{
            title = "Login Success Rate %"
            type = "gauge"
            gridPos = @{ h = 8; w = 12; x = 12; y = 0 }
            targets = @(@{ expr = "(rate(auth_login_total{status=\"success\"}[5m]) / rate(auth_login_total[5m])) * 100" })
        },
        @{
            title = "Peak Usage Hours"
            type = "heatmap"
            gridPos = @{ h = 8; w = 12; x = 0; y = 8 }
            targets = @(@{ expr = "rate(http_requests_total[1m])" })
        },
        @{
            title = "Page Load Times (ms)"
            type = "graph"
            gridPos = @{ h = 8; w = 12; x = 12; y = 8 }
            targets = @(@{ expr = "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000" })
        }
    )

    $body = New-GrafanaDashboard -Title "Student System Usage Dashboard" `
        -Description "Monitor user activity, engagement, usage patterns" -Panels $panels

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/dashboards/db" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Dashboard created successfully!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host "   URL: $GrafanaUrl/d/$($response.uid)/" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Troubleshooting Dashboard
# ============================================================================
elseif ($Action -eq "CreateTroubleshooting") {
    Write-Host "🔧 Creating Troubleshooting Dashboard..." @Info

    $panels = @(
        @{
            title = "Error Rate by Severity"
            type = "piechart"
            gridPos = @{ h = 8; w = 12; x = 0; y = 0 }
            targets = @(@{ expr = "increase(log_entries_total[1h])" })
        },
        @{
            title = "Top 10 Error Messages"
            type = "table"
            gridPos = @{ h = 8; w = 12; x = 12; y = 0 }
            targets = @(@{ expr = "topk(10, increase(errors_total[1h]))" })
        },
        @{
            title = "Database Errors"
            type = "graph"
            gridPos = @{ h = 8; w = 12; x = 0; y = 8 }
            targets = @(@{ expr = "rate(db_errors_total[5m])" })
        },
        @{
            title = "Authentication Failures"
            type = "graph"
            gridPos = @{ h = 8; w = 12; x = 12; y = 8 }
            targets = @(@{ expr = "rate(auth_failures_total[5m])" })
        },
        @{
            title = "Slow Queries (>1s)"
            type = "table"
            gridPos = @{ h = 8; w = 24; x = 0; y = 16 }
            targets = @(@{ expr = "topk(20, increase(query_duration_seconds_bucket{le=\"1\"}[1h]))" })
        }
    )

    $body = New-GrafanaDashboard -Title "Troubleshooting Dashboard" `
        -Description "Error logs, debugging info, slow queries, system anomalies" -Panels $panels

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/dashboards/db" `
            -Method Post -Headers $headers -Body $body

        Write-Host "✅ Dashboard created successfully!" @Success
        Write-Host "   ID: $($response.id)" @Info
        Write-Host "   URL: $GrafanaUrl/d/$($response.uid)/" @Info
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# List Dashboards
# ============================================================================
elseif ($Action -eq "ListDashboards") {
    Write-Host "📋 Fetching dashboards..." @Info

    try {
        $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/search?tag=sms" -Headers $headers

        if ($response.Count -eq 0) {
            Write-Host "ℹ️  No SMS dashboards found" @Info
            Write-Host ""
            exit 0
        }

        Write-Host "`n✅ Found $($response.Count) dashboards:`n" @Success

        $response | ForEach-Object {
            Write-Host "  📊 $($_.title)" @Info
            Write-Host "     URL: $GrafanaUrl$($_.url)"
            Write-Host "     UID: $($_.uid)"
            Write-Host ""
        }
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Delete Dashboard
# ============================================================================
elseif ($Action -eq "DeleteDashboard") {
    if (-not $DashboardName) {
        Write-Host "❌ DashboardName required" @Error
        exit 1
    }

    Write-Host "🗑️  Deleting dashboard: $DashboardName" @Info
    $confirm = Read-Host "   Are you sure? (yes/no)"

    if ($confirm -ne "yes") {
        Write-Host "❌ Operation cancelled" @Error
        exit 0
    }

    try {
        $search = Invoke-RestMethod -Uri "$GrafanaUrl/api/search?query=$DashboardName" -Headers $headers

        if ($search.Count -eq 0) {
            Write-Host "❌ Dashboard not found" @Error
            exit 1
        }

        $uid = $search[0].uid
        Invoke-RestMethod -Uri "$GrafanaUrl/api/dashboards/uid/$uid" -Method Delete -Headers $headers

        Write-Host "✅ Dashboard deleted successfully!" @Success
        Write-Host ""
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" @Error
        exit 1
    }
}

Write-Host "✅ Ready to create SMS monitoring dashboards!" @Success
Write-Host ""
Write-Host "📊 Available Dashboards:" @Info
Write-Host "   • System Health" @Info
Write-Host "   • Application Performance" @Info
Write-Host "   • Student Usage" @Info
Write-Host "   • Troubleshooting" @Info
Write-Host ""
