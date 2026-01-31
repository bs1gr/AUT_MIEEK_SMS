# Create Grafana Dashboards for SMS Monitoring
# This script creates essential monitoring dashboards

$grafanaUrl = "http://localhost:3000"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:newpassword123"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Creating Grafana Dashboards ===" -ForegroundColor Cyan

# Dashboard 1: System Overview
$systemDashboard = @{
    dashboard = @{
        title = "SMS System Overview"
        tags = @("sms", "system", "overview")
        timezone = "browser"
        refresh = "30s"
        panels = @(
            @{
                id = 1
                title = "CPU Usage"
                type = "graph"
                gridPos = @{ h = 8; w = 12; x = 0; y = 0 }
                targets = @(@{
                    expr = "100 - (avg(rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100)"
                    legendFormat = "CPU Usage %"
                })
            },
            @{
                id = 2
                title = "Memory Usage"
                type = "graph"
                gridPos = @{ h = 8; w = 12; x = 12; y = 0 }
                targets = @(@{
                    expr = "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
                    legendFormat = "Memory Usage %"
                })
            },
            @{
                id = 3
                title = "Disk Space Free"
                type = "graph"
                gridPos = @{ h = 8; w = 12; x = 0; y = 8 }
                targets = @(@{
                    expr = "node_filesystem_free_bytes{mountpoint='/'} / 1024 / 1024 / 1024"
                    legendFormat = "Free GB"
                })
            },
            @{
                id = 4
                title = "Container Status"
                type = "stat"
                gridPos = @{ h = 8; w = 12; x = 12; y = 8 }
                targets = @(@{
                    expr = "count(container_last_seen)"
                    legendFormat = "Running Containers"
                })
            }
        )
        schemaVersion = 39
        version = 0
    }
    overwrite = $true
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$grafanaUrl/api/dashboards/db" -Method Post -Headers $headers -Body $systemDashboard
    Write-Host "✓ Created: SMS System Overview (UID: $($response.uid))" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create System Overview: $_" -ForegroundColor Red
}

# Dashboard 2: Application Performance
$appDashboard = @{
    dashboard = @{
        title = "SMS Application Performance"
        tags = @("sms", "application", "performance")
        timezone = "browser"
        refresh = "30s"
        panels = @(
            @{
                id = 1
                title = "HTTP Request Rate"
                type = "graph"
                gridPos = @{ h = 8; w = 12; x = 0; y = 0 }
                targets = @(@{
                    expr = "rate(http_requests_total[5m])"
                    legendFormat = "Requests/sec"
                })
            },
            @{
                id = 2
                title = "Response Time (p95)"
                type = "graph"
                gridPos = @{ h = 8; w = 12; x = 12; y = 0 }
                targets = @(@{
                    expr = "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
                    legendFormat = "p95 Response Time"
                })
            },
            @{
                id = 3
                title = "Error Rate"
                type = "graph"
                gridPos = @{ h = 8; w = 12; x = 0; y = 8 }
                targets = @(@{
                    expr = "rate(http_requests_total{status=~'5..'}[5m])"
                    legendFormat = "5xx Errors/sec"
                })
            },
            @{
                id = 4
                title = "Active Database Connections"
                type = "stat"
                gridPos = @{ h = 8; w = 12; x = 12; y = 8 }
                targets = @(@{
                    expr = "pg_stat_activity_count"
                    legendFormat = "Active Connections"
                })
            }
        )
        schemaVersion = 39
        version = 0
    }
    overwrite = $true
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$grafanaUrl/api/dashboards/db" -Method Post -Headers $headers -Body $appDashboard
    Write-Host "✓ Created: SMS Application Performance (UID: $($response.uid))" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create Application Performance: $_" -ForegroundColor Red
}

# Dashboard 3: Business Metrics
$businessDashboard = @{
    dashboard = @{
        title = "SMS Business Metrics"
        tags = @("sms", "business", "metrics")
        timezone = "browser"
        refresh = "1m"
        panels = @(
            @{
                id = 1
                title = "Total Students"
                type = "stat"
                gridPos = @{ h = 6; w = 6; x = 0; y = 0 }
                targets = @(@{
                    expr = "sms_students_total"
                    legendFormat = "Students"
                })
            },
            @{
                id = 2
                title = "Total Courses"
                type = "stat"
                gridPos = @{ h = 6; w = 6; x = 6; y = 0 }
                targets = @(@{
                    expr = "sms_courses_total"
                    legendFormat = "Courses"
                })
            },
            @{
                id = 3
                title = "Total Enrollments"
                type = "stat"
                gridPos = @{ h = 6; w = 6; x = 12; y = 0 }
                targets = @(@{
                    expr = "sms_enrollments_total"
                    legendFormat = "Enrollments"
                })
            },
            @{
                id = 4
                title = "Active Users (24h)"
                type = "stat"
                gridPos = @{ h = 6; w = 6; x = 18; y = 0 }
                targets = @(@{
                    expr = "count(rate(http_requests_total[24h]))"
                    legendFormat = "Active Users"
                })
            }
        )
        schemaVersion = 39
        version = 0
    }
    overwrite = $true
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$grafanaUrl/api/dashboards/db" -Method Post -Headers $headers -Body $businessDashboard
    Write-Host "✓ Created: SMS Business Metrics (UID: $($response.uid))" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create Business Metrics: $_" -ForegroundColor Red
}

Write-Host "`n=== Dashboard Creation Complete ===" -ForegroundColor Cyan
Write-Host "Access dashboards at: $grafanaUrl/dashboards" -ForegroundColor Green
