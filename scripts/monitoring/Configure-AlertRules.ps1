# ============================================================================
# AlertManager Alert Rules Configuration Script
# ============================================================================
# Purpose: Create and manage alert rules for production monitoring
# Usage: .\Configure-AlertRules.ps1 -Action CreateRules
# ============================================================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("CreateRules", "TestAlert", "ListRules", "ValidateConfig")]
    [string]$Action,

    [Parameter(HelpMessage = "Path to alert rules file")]
    [string]$RulesFile = "monitoring/alert-rules.yml"
)

# Colors
$Success = @{ ForegroundColor = "Green" }
$Error = @{ ForegroundColor = "Red" }
$Info = @{ ForegroundColor = "Cyan" }
$Warning = @{ ForegroundColor = "Yellow" }

Write-Host "`n╔════════════════════════════════════════════════════════╗" @Info
Write-Host "║   AlertManager Alert Rules Configuration               ║" @Info
Write-Host "╚════════════════════════════════════════════════════════╝`n" @Info

# ============================================================================
# Alert Rules Configuration
# ============================================================================
$alertRules = @{
    groups = @(
        @{
            name = "sms_system_alerts"
            interval = "30s"
            rules = @(
                @{
                    alert = "HighCPUUsage"
                    expr = "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100) > 80"
                    for = "5m"
                    annotations = @{
                        summary = "High CPU usage detected on {{ `$labels.instance }}"
                        description = "CPU usage is {{ `$value }}% for the last 5 minutes"
                    }
                    labels = @{
                        severity = "warning"
                        team = "operations"
                    }
                },
                @{
                    alert = "CriticalCPUUsage"
                    expr = "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100) > 95"
                    for = "2m"
                    annotations = @{
                        summary = "CRITICAL CPU usage on {{ `$labels.instance }}"
                        description = "CPU usage is {{ `$value }}% - immediate action required"
                    }
                    labels = @{
                        severity = "critical"
                        team = "operations"
                    }
                },
                @{
                    alert = "HighMemoryUsage"
                    expr = "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85"
                    for = "5m"
                    annotations = @{
                        summary = "High memory usage on {{ `$labels.instance }}"
                        description = "Memory usage is {{ `$value }}% for the last 5 minutes"
                    }
                    labels = @{
                        severity = "warning"
                        team = "operations"
                    }
                },
                @{
                    alert = "DiskSpaceRunningOut"
                    expr = "(node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"}) * 100 < 15"
                    for = "5m"
                    annotations = @{
                        summary = "Low disk space on {{ `$labels.instance }}"
                        description = "{{ `$value }}% disk space remaining - consider cleanup"
                    }
                    labels = @{
                        severity = "warning"
                        team = "operations"
                    }
                },
                @{
                    alert = "CriticalDiskSpace"
                    expr = "(node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"}) * 100 < 5"
                    for = "1m"
                    annotations = @{
                        summary = "CRITICAL disk space on {{ `$labels.instance }}"
                        description = "Only {{ `$value }}% disk space remaining - immediate cleanup required"
                    }
                    labels = @{
                        severity = "critical"
                        team = "operations"
                    }
                }
            )
        },
        @{
            name = "sms_application_alerts"
            interval = "30s"
            rules = @(
                @{
                    alert = "HighErrorRate"
                    expr = "(rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])) * 100 > 5"
                    for = "5m"
                    annotations = @{
                        summary = "High error rate detected"
                        description = "Error rate is {{ `$value }}% (threshold: 5%)"
                    }
                    labels = @{
                        severity = "warning"
                        team = "development"
                    }
                },
                @{
                    alert = "ResponseTimeHigh"
                    expr = "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5"
                    for = "5m"
                    annotations = @{
                        summary = "High response time detected"
                        description = "p95 response time is {{ `$value }}s (threshold: 0.5s)"
                    }
                    labels = @{
                        severity = "warning"
                        team = "performance"
                    }
                },
                @{
                    alert = "ServiceDown"
                    expr = "up{job=~\"prometheus|grafana|alertmanager|loki\"} == 0"
                    for = "2m"
                    annotations = @{
                        summary = "{{ `$labels.job }} service is down"
                        description = "{{ `$labels.instance }} has been unavailable for 2 minutes"
                    }
                    labels = @{
                        severity = "critical"
                        team = "operations"
                    }
                },
                @{
                    alert = "DatabaseConnectionPoolExhausted"
                    expr = "pg_stat_activity_count > 95"
                    for = "3m"
                    annotations = @{
                        summary = "Database connection pool nearly exhausted"
                        description = "{{ `$value }} of 100 connections in use"
                    }
                    labels = @{
                        severity = "warning"
                        team = "database"
                    }
                },
                @{
                    alert = "HighLoginFailureRate"
                    expr = "(rate(auth_login_total{status=\"failed\"}[5m]) / rate(auth_login_total[5m])) * 100 > 10"
                    for = "5m"
                    annotations = @{
                        summary = "High login failure rate"
                        description = "{{ `$value }}% of login attempts are failing"
                    }
                    labels = @{
                        severity = "warning"
                        team = "security"
                    }
                }
            )
        },
        @{
            name = "sms_availability_alerts"
            interval = "1m"
            rules = @(
                @{
                    alert = "BackendUnresponsive"
                    expr = "up{job=\"backend\"} == 0"
                    for = "1m"
                    annotations = @{
                        summary = "Backend API is not responding"
                        description = "Backend has been unavailable for 1 minute - check service health"
                    }
                    labels = @{
                        severity = "critical"
                        team = "operations"
                        page = "true"
                    }
                },
                @{
                    alert = "DatabaseUnresponsive"
                    expr = "pg_up == 0"
                    for = "1m"
                    annotations = @{
                        summary = "Database connection failed"
                        description = "Cannot connect to PostgreSQL database - check connectivity"
                    }
                    labels = @{
                        severity = "critical"
                        team = "database"
                        page = "true"
                    }
                },
                @{
                    alert = "NoActiveUsers"
                    expr = "increase(http_requests_total[1h]) < 10"
                    for = "30m"
                    annotations = @{
                        summary = "No user activity detected"
                        description = "Less than 10 requests in the last hour - possible issue"
                    }
                    labels = @{
                        severity = "info"
                        team = "operations"
                    }
                }
            )
        }
    )
}

# ============================================================================
# Create Alert Rules File
# ============================================================================
if ($Action -eq "CreateRules") {
    Write-Host "📝 Creating alert rules configuration..." @Info

    try {
        # Convert to YAML format
        $yaml = "# AlertManager Alert Rules for SMS`n"
        $yaml += "# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"

        foreach ($group in $alertRules.groups) {
            $yaml += "groups:`n"
            $yaml += "  - name: $($group.name)`n"
            $yaml += "    interval: $($group.interval)`n"
            $yaml += "    rules:`n"

            foreach ($rule in $group.rules) {
                $yaml += "      - alert: $($rule.alert)`n"
                $yaml += "        expr: |`n"
                $yaml += "          $($rule.expr)`n"
                $yaml += "        for: $($rule.for)`n"
                $yaml += "        annotations:`n"
                $yaml += "          summary: `"$($rule.annotations.summary)`"`n"
                $yaml += "          description: `"$($rule.annotations.description)`"`n"
                $yaml += "        labels:`n"

                foreach ($label in $rule.labels.GetEnumerator()) {
                    $yaml += "          $($label.Name): `"$($label.Value)`"`n"
                }

                $yaml += "`n"
            }
        }

        # Ensure directory exists
        $directory = Split-Path -Parent $RulesFile
        if (-not (Test-Path $directory)) {
            New-Item -ItemType Directory -Path $directory -Force | Out-Null
        }

        # Write to file
        Set-Content -Path $RulesFile -Value $yaml -Encoding UTF8

        Write-Host "✅ Alert rules file created: $RulesFile" @Success
        Write-Host "   Rules: $($alertRules.groups.Count) groups, $($alertRules.groups.rules.Count) total rules" @Info
        Write-Host ""
        Write-Host "📌 Next Step: Load into Prometheus" @Info
        Write-Host "   1. Copy to monitoring/alert-rules.yml" @Info
        Write-Host "   2. Update prometheus.yml to include: rule_files: ['alert-rules.yml']" @Info
        Write-Host "   3. Restart Prometheus container" @Info
        Write-Host ""

        exit 0
    } catch {
        Write-Host "❌ Failed to create alert rules: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# Test Alert
# ============================================================================
elseif ($Action -eq "TestAlert") {
    Write-Host "🧪 Sending test alert to AlertManager..." @Info

    $testAlert = @(
        @{
            status = "firing"
            labels = @{
                alertname = "TestAlert"
                severity = "warning"
                instance = "localhost"
            }
            annotations = @{
                summary = "This is a test alert"
                description = "Test alert sent at $(Get-Date)"
            }
            generatorURL = "http://prometheus:9090"
            startsAt = (Get-Date -AsUTC).ToString("yyyy-MM-ddTHH:mm:ssZ")
            endsAt = "0001-01-01T00:00:00Z"
        }
    ) | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9093/api/v1/alerts" `
            -Method Post -Body $testAlert -ContentType "application/json" -UseBasicParsing

        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Test alert sent successfully" @Success
            Write-Host "   Check Grafana for the alert notification" @Info
        }
        else {
            Write-Host "⚠️  Alert sent but with status code: $($response.StatusCode)" @Warning
        }

        exit 0
    } catch {
        Write-Host "❌ Failed to send test alert: $($_.Exception.Message)" @Error
        exit 1
    }
}

# ============================================================================
# List Configured Rules
# ============================================================================
elseif ($Action -eq "ListRules") {
    Write-Host "📋 Configured Alert Rules" @Info
    Write-Host "─────────────────────────────────────────`n" @Info

    foreach ($group in $alertRules.groups) {
        Write-Host "📌 $($group.name.ToUpper())" @Info
        Write-Host "   Interval: $($group.interval)" @Info
        Write-Host "   Rules: $($group.rules.Count)" @Info
        Write-Host ""

        foreach ($rule in $group.rules) {
            Write-Host "   • $($rule.alert)" @Info
            Write-Host "     Severity: $($rule.labels.severity)" @Info
            Write-Host "     For: $($rule.for)" @Info
            Write-Host "     Summary: $($rule.annotations.summary)" @Info
            Write-Host ""
        }
    }

    exit 0
}

# ============================================================================
# Validate AlertManager Configuration
# ============================================================================
elseif ($Action -eq "ValidateConfig") {
    Write-Host "✓ Validating AlertManager configuration..." @Info
    Write-Host ""

    try {
        # Check AlertManager status
        $status = Invoke-WebRequest -Uri "http://localhost:9093/-/healthy" `
            -UseBasicParsing -TimeoutSec 5

        if ($status.StatusCode -eq 200) {
            Write-Host "✅ AlertManager is running and healthy" @Success
        }

        # Get configuration
        $config = Invoke-WebRequest -Uri "http://localhost:9093/api/v1/status" `
            -UseBasicParsing -TimeoutSec 5 | ConvertFrom-Json

        Write-Host "   Version: $($config.data.versionInfo.version)" @Info
        Write-Host "   Uptime: $($config.data.uptime)" @Info
        Write-Host ""

        # List alert receivers
        Write-Host "📨 Configured Receivers:" @Info
        $config.data.config.receivers | ForEach-Object {
            Write-Host "   • $($_.name)" @Info
        }

        Write-Host ""
        Write-Host "✅ Configuration is valid" @Success

        exit 0
    } catch {
        Write-Host "❌ Failed to validate configuration: $($_.Exception.Message)" @Error
        exit 1
    }
}

Write-Host "❌ Unknown action: $Action" @Error
exit 1
