# ============================================================================
# Monitoring Stack Verification Script
# ============================================================================
# Purpose: Verify all monitoring services are healthy and properly configured
# Usage: .\Verify-MonitoringStack.ps1
# ============================================================================

param(
    [Parameter(HelpMessage = "Enable verbose output")]
    [switch]$Verbose,

    [Parameter(HelpMessage = "Fix issues automatically if possible")]
    [switch]$AutoFix
)

# Colors
$Success = @{ ForegroundColor = "Green" }
$Warning = @{ ForegroundColor = "Yellow" }
$Error = @{ ForegroundColor = "Red" }
$Info = @{ ForegroundColor = "Cyan" }

# Monitoring services
$Services = @{
    "prometheus" = @{ port = 9090; healthPath = "/-/healthy" }
    "grafana" = @{ port = 3000; healthPath = "/api/health" }
    "alertmanager" = @{ port = 9093; healthPath = "/-/healthy" }
    "loki" = @{ port = 3100; healthPath = "/ready" }
    "node-exporter" = @{ port = 9100; healthPath = "/metrics" }
    "cadvisor" = @{ port = 8080; healthPath = "/api/v1/spec" }
}

Write-Host "`n╔════════════════════════════════════════════════════════╗" @Info
Write-Host "║   Monitoring Stack Health Verification                 ║" @Info
Write-Host "╚════════════════════════════════════════════════════════╝`n" @Info

# ============================================================================
# Docker Container Status Check
# ============================================================================
Write-Host "📦 Docker Container Status" @Info
Write-Host "─────────────────────────────────────────" @Info

$failedContainers = @()

foreach ($service in $Services.Keys) {
    $containerName = "sms-$service"

    # Check if container exists and is running
    try {
        $status = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $containerName }

        if ($status) {
            Write-Host "  ✅ $containerName" @Success

            # Get container details
            $details = docker inspect $containerName --format '{{json .}}' | ConvertFrom-Json
            $uptime = (New-TimeSpan -Start $details.State.StartedAt -End (Get-Date)).ToString()

            if ($Verbose) {
                Write-Host "     Uptime: $uptime" @Info
                Write-Host "     Status: $($details.State.Status)" @Info
            }
        }
        else {
            Write-Host "  ❌ $containerName - NOT RUNNING" @Error
            $failedContainers += $containerName
        }
    } catch {
        Write-Host "  ⚠️  $containerName - Cannot determine status" @Warning
        if ($Verbose) { Write-Host "     Error: $($_.Exception.Message)" }
    }
}

Write-Host ""

# ============================================================================
# Health Endpoint Verification
# ============================================================================
Write-Host "🏥 Service Health Endpoints" @Info
Write-Host "─────────────────────────────────────────" @Info

$unhealthyServices = @()

foreach ($service in $Services.Keys) {
    $port = $Services[$service].port
    $healthPath = $Services[$service].healthPath
    $url = "http://localhost:$port$healthPath"

    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ $service ($port)" @Success
            if ($Verbose) { Write-Host "     Response: $($response.StatusCode) OK" @Info }
        }
        else {
            Write-Host "  ⚠️  $service ($port) - Unexpected status" @Warning
            Write-Host "     Code: $($response.StatusCode)" @Warning
            $unhealthyServices += $service
        }
    } catch {
        Write-Host "  ❌ $service ($port) - Connection failed" @Error
        if ($Verbose) { Write-Host "     Error: $($_.Exception.Message)" }
        $unhealthyServices += $service
    }
}

Write-Host ""

# ============================================================================
# Prometheus Configuration Validation
# ============================================================================
Write-Host "📊 Prometheus Configuration" @Info
Write-Host "─────────────────────────────────────────" @Info

try {
    # Check Prometheus targets
    $targets = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/targets" `
        -UseBasicParsing -TimeoutSec 5 | ConvertFrom-Json

    $activeTargets = $targets.data.activeTargets.Count
    $droppedTargets = $targets.data.droppedTargets.Count

    Write-Host "  📌 Active Targets: $activeTargets" @Success
    Write-Host "  ⏭️  Dropped Targets: $droppedTargets" @Info

    if ($droppedTargets -gt 0) {
        Write-Host "  ⚠️  Warning: Some targets are dropped" @Warning
        if ($Verbose) {
            $targets.data.droppedTargets | ForEach-Object {
                Write-Host "     - $($_.labels.job): $($_.discoverError)" @Warning
            }
        }
    }

    # Check enabled scrape configs
    $config = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/query?query=up" `
        -UseBasicParsing -TimeoutSec 5 | ConvertFrom-Json

    $upServices = $config.data.result | Where-Object { $_.value[1] -eq "1" } | Measure-Object | Select-Object -ExpandProperty Count
    Write-Host "  🟢 Services UP: $upServices/$($config.data.result.Count)" @Success

} catch {
    Write-Host "  ❌ Failed to query Prometheus" @Error
    if ($Verbose) { Write-Host "     Error: $($_.Exception.Message)" }
}

Write-Host ""

# ============================================================================
# Grafana Configuration Check
# ============================================================================
Write-Host "📈 Grafana Configuration" @Info
Write-Host "─────────────────────────────────────────" @Info

try {
    $headers = @{ "Content-Type" = "application/json" }

    # Check datasources
    $datasources = Invoke-RestMethod -Uri "http://localhost:3000/api/datasources" `
        -Headers $headers -TimeoutSec 5 -ErrorAction Stop

    Write-Host "  📊 Datasources: $($datasources.Count)" @Success

    $datasources | ForEach-Object {
        $status = if ($_.isDefault) { " (default)" } else { "" }
        Write-Host "     ✓ $($_.name) [$($_.type)]$status" @Info
    }

    # Check dashboards
    $dashboards = Invoke-RestMethod -Uri "http://localhost:3000/api/search?tag=sms" `
        -Headers $headers -TimeoutSec 5 -ErrorAction Stop

    Write-Host "  📋 SMS Dashboards: $($dashboards.Count)" @Success

    if ($dashboards.Count -gt 0) {
        $dashboards | ForEach-Object {
            Write-Host "     ✓ $($_.title)" @Info
        }
    }
    else {
        Write-Host "     ⚠️  No dashboards found - run Configure-Dashboards.ps1" @Warning
    }

} catch {
    Write-Host "  ❌ Failed to query Grafana" @Error
    if ($Verbose) { Write-Host "     Error: $($_.Exception.Message)" }
}

Write-Host ""

# ============================================================================
# AlertManager Configuration Check
# ============================================================================
Write-Host "🚨 AlertManager Configuration" @Info
Write-Host "─────────────────────────────────────────" @Info

try {
    $alerts = Invoke-WebRequest -Uri "http://localhost:9093/api/v1/alerts" `
        -UseBasicParsing -TimeoutSec 5 | ConvertFrom-Json

    $firing = $alerts.data | Where-Object { $_.status.state -eq "active" } | Measure-Object | Select-Object -ExpandProperty Count
    $resolved = $alerts.data | Where-Object { $_.status.state -eq "resolved" } | Measure-Object | Select-Object -ExpandProperty Count

    Write-Host "  🔴 Firing Alerts: $firing" @Info
    Write-Host "  🟢 Resolved Alerts: $resolved" @Info

    if ($firing -gt 0) {
        Write-Host "  ⚠️  Active alerts detected:" @Warning
        $alerts.data | Where-Object { $_.status.state -eq "active" } | ForEach-Object {
            Write-Host "     - $($_.labels.alertname): $($_.annotations.summary)" @Warning
        }
    }

} catch {
    Write-Host "  ⚠️  Failed to query AlertManager" @Warning
    if ($Verbose) { Write-Host "     Error: $($_.Exception.Message)" }
}

Write-Host ""

# ============================================================================
# Loki Log Stream Check
# ============================================================================
Write-Host "📝 Loki Log Configuration" @Info
Write-Host "─────────────────────────────────────────" @Info

try {
    $labels = Invoke-WebRequest -Uri "http://localhost:3100/loki/api/v1/labels" `
        -UseBasicParsing -TimeoutSec 5 | ConvertFrom-Json

    Write-Host "  📌 Label Names Available: $($labels.data.Count)" @Success

    if ($Verbose -and $labels.data.Count -gt 0) {
        $labels.data[0..4] | ForEach-Object {
            Write-Host "     - $_" @Info
        }
        if ($labels.data.Count -gt 5) {
            Write-Host "     ... and $($labels.data.Count - 5) more" @Info
        }
    }

    # Check for recent logs
    $query = 'count(rate({job="docker"}[5m]))'
    $logVolume = Invoke-WebRequest -Uri "http://localhost:3100/loki/api/v1/query?query=$query" `
        -UseBasicParsing -TimeoutSec 5 | ConvertFrom-Json

    if ($logVolume.data.result.Count -gt 0) {
        Write-Host "  ✅ Recent log streams detected" @Success
    }
    else {
        Write-Host "  ℹ️  No recent logs in Loki" @Info
    }

} catch {
    Write-Host "  ⚠️  Failed to query Loki" @Warning
    if ($Verbose) { Write-Host "     Error: $($_.Exception.Message)" }
}

Write-Host ""

# ============================================================================
# Storage & Resource Usage
# ============================================================================
Write-Host "💾 Storage & Resource Usage" @Info
Write-Host "─────────────────────────────────────────" @Info

try {
    # Get Docker disk usage
    $dockerStats = docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}" | Select-Object -Skip 1

    Write-Host "  📊 Resource Usage (Sampling):" @Info

    foreach ($stat in $dockerStats) {
        if ($stat -match "sms-") {
            $parts = $stat -split '\s+' | Where-Object { $_ }
            Write-Host "     $($parts[0]): $($parts[1]) Memory, $($parts[2]) CPU" @Info
        }
    }

} catch {
    Write-Host "  ⚠️  Could not retrieve Docker stats" @Warning
}

Write-Host ""

# ============================================================================
# Summary & Recommendations
# ============================================================================
Write-Host "📋 Summary" @Info
Write-Host "─────────────────────────────────────────" @Info

$totalServices = $Services.Count
$failedCount = $failedContainers.Count
$unhealthyCount = $unhealthyServices.Count

$healthScore = (($totalServices - ($failedCount + $unhealthyCount)) / $totalServices * 100)

Write-Host "  Health Score: " -NoNewline @Info
if ($healthScore -ge 90) {
    Write-Host "$healthScore% 🟢 EXCELLENT" @Success
}
elseif ($healthScore -ge 70) {
    Write-Host "$healthScore% 🟡 GOOD" @Info
}
else {
    Write-Host "$healthScore% 🔴 NEEDS ATTENTION" @Error
}

Write-Host ""

if ($failedContainers.Count -gt 0 -or $unhealthyServices.Count -gt 0) {
    Write-Host "⚠️  Issues Detected:" @Warning

    if ($failedContainers.Count -gt 0) {
        Write-Host "  • Containers not running: $($failedContainers -join ', ')" @Warning
    }

    if ($unhealthyServices.Count -gt 0) {
        Write-Host "  • Unhealthy services: $($unhealthyServices -join ', ')" @Warning
    }

    Write-Host ""
    Write-Host "Recommended Actions:" @Warning
    Write-Host "  1. Check Docker logs: docker logs sms-<service>" @Warning
    Write-Host "  2. Restart affected services: docker restart sms-<service>" @Warning
    Write-Host "  3. Review configuration files in docker/ directory" @Warning
    Write-Host "  4. Check network connectivity: docker network inspect docker_sms_network" @Warning

    if ($AutoFix) {
        Write-Host ""
        Write-Host "🔧 Attempting automatic fixes..." @Info

        # Restart failed containers
        foreach ($container in $failedContainers) {
            Write-Host "   Restarting $container..." @Info
            try {
                docker restart $container | Out-Null
                Write-Host "   ✅ $container restarted" @Success
            } catch {
                Write-Host "   ❌ Failed to restart $container" @Error
            }
        }
    }
}
else {
    Write-Host "✅ All monitoring services are healthy!" @Success
    Write-Host "   No issues detected. Monitoring stack is operational." @Success
}

Write-Host ""
Write-Host "📌 Next Steps:" @Info
Write-Host "   1. Access Grafana: http://localhost:3000" @Info
Write-Host "   2. Create dashboards: .\Configure-Dashboards.ps1" @Info
Write-Host "   3. Configure alerts: .\Configure-AlertNotifications.ps1" @Info
Write-Host "   4. Set admin password: .\Manage-GrafanaPassword.ps1" @Info
Write-Host ""

exit 0
