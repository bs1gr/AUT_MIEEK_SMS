# Monitoring Operations Guide

**Version**: 1.0
**Date**: January 30, 2026
**Status**: ✅ PRODUCTION READY
**For**: System Administrators & Operations Team

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Verify Monitoring Stack is Running

```powershell
# Check all monitoring services
.\scripts\monitoring\Verify-MonitoringStack.ps1

# Expected output: Health Score 90%+ 🟢 EXCELLENT
```

### Step 2: Access Dashboards

```
Grafana:      http://localhost:3000 (username: admin)
Prometheus:   http://localhost:9090
AlertManager: http://localhost:9093
Loki:         http://localhost:3100
```

### Step 3: Create Dashboards (First Time)

```powershell
# Create all 4 production dashboards
.\scripts\grafana\Configure-Dashboards.ps1 -Action CreateSystemHealth
.\scripts\grafana\Configure-Dashboards.ps1 -Action CreateAppPerformance
.\scripts\grafana\Configure-Dashboards.ps1 -Action CreateStudentUsage
.\scripts\grafana\Configure-Dashboards.ps1 -Action CreateTroubleshooting
```

**Result**: 4 dashboards visible in Grafana with real-time metrics

---

## 📊 Monitoring Stack Overview

### Services & Responsibilities

| Service | Port | Purpose |
|---------|------|---------|
| **Prometheus** | 9090 | Metrics collection & storage |
| **Grafana** | 3000 | Visualization & dashboards |
| **AlertManager** | 9093 | Alert routing & notifications |
| **Loki** | 3100 | Log aggregation |
| **Node Exporter** | 9100 | System metrics (CPU, memory, disk) |
| **cAdvisor** | 8080 | Container metrics |

### Data Flow

```
┌──────────────┐
│  Prometheus  │ ◄── Scrapes metrics every 15s
│              │
└──────┬───────┘
       │
       ├──► ┌──────────────┐
       │    │   Grafana    │ ◄── Visualizes
       │    │  Dashboards  │
       │    └──────────────┘
       │
       └──► ┌──────────────┐
            │ AlertManager │ ◄── Triggers alerts
            │ Notifications│
            └──────────────┘

┌──────────────┐
│   Loki       │ ◄── Docker logs
│  (Logs)      │
└──────┬───────┘
       │
       └──► Grafana ◄── Log visualization
```

---

## 🚨 Alert Management

### Viewing Active Alerts

```powershell
# List all active alerts
$alerts = Invoke-WebRequest -Uri "http://localhost:9093/api/v1/alerts" `
    -UseBasicParsing | ConvertFrom-Json

$alerts.data | Where-Object { $_.status.state -eq "active" } |
    ForEach-Object { "$($_.labels.alertname): $($_.annotations.summary)" }
```

### Alert Severity Levels

| Severity | Response Time | Example |
|----------|---------------|---------|
| **Critical** | 0-5 minutes | Backend down, database unreachable |
| **Warning** | 5-15 minutes | High CPU, high error rate |
| **Info** | 1 hour | No user activity, info alerts |

### Alert Rules Configured

**System Alerts:**
- `HighCPUUsage` (>80% for 5m) → Warning
- `CriticalCPUUsage` (>95% for 2m) → Critical
- `HighMemoryUsage` (>85% for 5m) → Warning
- `DiskSpaceRunningOut` (<15% free) → Warning
- `CriticalDiskSpace` (<5% free) → Critical

**Application Alerts:**
- `HighErrorRate` (>5% for 5m) → Warning
- `ResponseTimeHigh` (p95 >0.5s) → Warning
- `ServiceDown` (service unavailable 2m+) → Critical
- `HighLoginFailureRate` (>10% for 5m) → Warning

**Availability Alerts:**
- `BackendUnresponsive` → Critical (page alert)
- `DatabaseUnresponsive` → Critical (page alert)
- `NoActiveUsers` (detected in 30m) → Info

### Silencing Alerts

When performing maintenance, silence alerts to prevent false notifications:

```powershell
# Silence a specific alert for 1 hour
$silence = @{
    matchers = @(@{ name = "alertname"; value = "ServiceDown"; isRegex = $false })
    startsAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    endsAt = (Get-Date).AddHours(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    comment = "Maintenance window"
    createdBy = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9093/api/v1/silences" `
    -Method Post -Body $silence -ContentType "application/json"
```

---

## 📈 Dashboard Usage

### System Health Dashboard

**Monitors:**
- CPU usage (gauge)
- Memory usage (gauge)
- Disk usage (gauge)
- Database connections
- Service health status

**When to Check:**
- Daily during business hours
- Before/after deployments
- When performance issues reported

**Expected Values:**
- CPU: <70% normal, 70-90% concerning, >90% alert
- Memory: <80% normal, 80-95% concerning
- Disk: >15% free normal, <15% concerning, <5% critical

### Application Performance Dashboard

**Monitors:**
- Request rate (req/s)
- Response time (p95)
- Error rate (%)
- Active connections

**Typical Values:**
- Request rate: 50-100 req/s peak
- Response time p95: <500ms
- Error rate: <1%
- Active connections: <50

**When Performance Degrades:**
1. Check response time trend (is it gradually increasing?)
2. Check error rate (sudden spike?)
3. Check database connection count
4. Review application logs in Loki

### Student Usage Dashboard

**Monitors:**
- Active users (real-time)
- Daily active users (DAU)
- Login success rate
- Peak usage hours
- Page load times

**Insights:**
- DAU helps understand adoption
- Login success rate indicates auth health
- Peak hours guide resource planning
- Load times reveal frontend performance

---

## 📝 Daily Operations Checklist

### Morning Check (5 minutes)

```powershell
# Run health verification
.\scripts\monitoring\Verify-MonitoringStack.ps1 -Verbose

# Check for critical alerts
Invoke-WebRequest -Uri "http://localhost:9093/api/v1/alerts?active=true" `
    -UseBasicParsing | ConvertFrom-Json |
    Select-Object -ExpandProperty data |
    Where-Object { $_.labels.severity -eq "critical" } |
    ForEach-Object { Write-Host "CRITICAL: $($_.labels.alertname)" }
```

**Checklist:**
- [ ] All services running (Health Score >90%)
- [ ] No critical alerts
- [ ] Database connections normal (<50)
- [ ] Disk space adequate (>20% free)

### During Business Hours

**Every 2 hours:**
1. Check Application Performance dashboard
2. Review error rate trend
3. Verify response times (<500ms p95)

**Every 4 hours:**
1. Check System Health dashboard
2. Verify CPU/memory utilization
3. Check database performance

### End of Day Check (2 minutes)

```powershell
# Export daily metrics summary
$date = Get-Date -Format "yyyy-MM-dd"
$summary = @{
    date = $date
    avgCPU = (Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=avg(cpu_usage)" `
        -UseBasicParsing | ConvertFrom-Json).data.result[0].value[1]
    avgMemory = (Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=avg(memory_usage)" `
        -UseBasicParsing | ConvertFrom-Json).data.result[0].value[1]
    errors = (Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=increase(http_requests_total{status=~\"5..\"}[24h])" `
        -UseBasicParsing | ConvertFrom-Json).data.result[0].value[1]
}

$summary | ConvertTo-Json | Out-File "monitoring/daily-summary-$date.json"
```

---

## 🔧 Troubleshooting Common Issues

### Issue: High Error Rate

**Diagnosis Steps:**
1. Check error type in Troubleshooting dashboard
2. Look at application logs in Loki
3. Verify database connectivity
4. Check recent deployments

**Solution:**
```powershell
# Get error details from Prometheus
$query = 'topk(10, increase(http_requests_total{status=~"5.."}[1h]))'
$result = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=$query" -UseBasicParsing

# Review logs
docker logs sms-backend --tail 100 --follow
```

### Issue: High Response Time

**Diagnosis Steps:**
1. Check p95 and p99 times
2. Review database query performance
3. Check backend CPU/memory
4. Monitor network latency

**Solution:**
```powershell
# Check slowest endpoints
$query = 'topk(5, rate(http_request_duration_seconds_bucket{le="1"}[5m]))'
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=$query" -UseBasicParsing

# Restart backend if needed
docker restart sms-backend
```

### Issue: Disk Space Running Out

**Diagnosis Steps:**
1. Verify alert: `DiskSpaceRunningOut` or `CriticalDiskSpace`
2. Check which directories use space
3. Identify cleanup candidates

**Solution:**
```powershell
# Check disk usage
docker exec sms-backend du -sh /data/*

# Clean old logs
docker exec sms-backend rm -f logs/*.log.gz
docker exec sms-backend find logs -mtime +30 -delete

# Clean Loki retention (if needed)
docker exec sms-loki rm -f /loki/chunks/*
```

### Issue: Database Connections Exhausted

**Diagnosis Steps:**
1. Check `DatabaseConnectionPoolExhausted` alert
2. Count active connections
3. Identify slow queries

**Solution:**
```powershell
# Check active connections
$query = 'pg_stat_activity_count'
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=$query" -UseBasicParsing

# Kill long-running connections
docker exec sms-postgres psql -U sms_user -d student_management -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - INTERVAL '30 minutes';"
```

---

## 🔒 Security & Access Control

### Grafana Authentication

```powershell
# Change admin password
.\scripts\grafana\Manage-GrafanaPassword.ps1 -NewPassword "secure_password"

# Add new user
.\scripts\grafana\Manage-GrafanaUsers.ps1 -Action CreateUser `
    -Username "operator@example.com" -Password "pass123" -Role Editor

# Set user permissions
.\scripts\grafana\Manage-GrafanaUsers.ps1 -Action SetPermissions `
    -Username "operator@example.com" -DashboardTag "sms"
```

### AlertManager Access

AlertManager should only be accessible by authorized personnel:

```powershell
# Verify AlertManager is behind authentication
docker logs sms-alertmanager | grep -i "authentication"

# If not authenticated, configure reverse proxy with auth
```

### Prometheus Access

Prometheus contains sensitive metrics - restrict access:

```powershell
# Configure firewall rule
New-NetFirewallRule -DisplayName "Prometheus - Localhost Only" `
    -Direction Inbound -Action Block -Protocol TCP -LocalPort 9090 `
    -RemoteAddress "0.0.0.0/0"

# Allow only internal network
New-NetFirewallRule -DisplayName "Prometheus - Internal" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 9090 `
    -RemoteAddress "192.168.0.0/24"
```

---

## 📋 Backup & Recovery

### Backup Grafana Dashboards

```powershell
# Export all dashboards
$dashboards = Invoke-RestMethod -Uri "http://localhost:3000/api/search" -Headers @{
    "Authorization" = "Bearer $(Read-Host 'Grafana API Token')"
}

foreach ($dashboard in $dashboards) {
    $content = Invoke-RestMethod -Uri "http://localhost:3000/api/dashboards/uid/$($dashboard.uid)" `
        -Headers @{ "Authorization" = "Bearer $token" }

    $content | ConvertTo-Json | Out-File "backup/dashboard-$($dashboard.uid).json"
}
```

### Backup Alert Rules

```powershell
# Export AlertManager configuration
docker exec sms-alertmanager cat /etc/alertmanager/config.yml | `
    Out-File "backup/alertmanager-config-$(Get-Date -Format 'yyyyMMdd').yml"

# Export alert rules
docker exec sms-prometheus cat /etc/prometheus/alert-rules.yml | `
    Out-File "backup/prometheus-rules-$(Get-Date -Format 'yyyyMMdd').yml"
```

### Restore from Backup

```powershell
# Restore dashboard
$backup = Get-Content "backup/dashboard-abc123.json" | ConvertFrom-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/dashboards/db" `
    -Method Post -Body ($backup | ConvertTo-Json) -Headers $headers
```

---

## 📞 Escalation Procedures

### Critical Alert Response (0-5 minutes)

1. **Acknowledge alert** in AlertManager
2. **Check status** of affected service
3. **Page on-call engineer** if needed
4. **Start incident** in tracking system

```powershell
# Acknowledge critical alert
$acknowledgement = @{
    labels = @{ alertname = "BackendUnresponsive" }
    status = "acknowledged"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9093/api/v1/alerts/groups" `
    -Body $acknowledgement -Method Post
```

### High Priority Alert Response (5-15 minutes)

1. **Investigate** root cause
2. **Check logs** in Loki
3. **Analyze metrics** in Prometheus
4. **Take corrective action** (restart service, scale resources, etc.)

### Low Priority Alert Response (1+ hours)

1. **Monitor** for continuation
2. **Schedule** remediation during maintenance window
3. **Document** findings and solution

---

## 📊 Capacity Planning

### Metrics to Monitor

```powershell
# Current resource utilization (daily)
$utilization = @{
    cpu_avg = (Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=avg(rate(node_cpu_seconds_total{mode!=\"idle\"}[5m])) * 100" -UseBasicParsing | ConvertFrom-Json).data.result[0].value[1]
    memory_avg = (Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=avg((1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))) * 100" -UseBasicParsing | ConvertFrom-Json).data.result[0].value[1]
    disk_usage = (Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=((node_filesystem_size_bytes{mountpoint=\"/\"} - node_filesystem_avail_bytes{mountpoint=\"/\"}) / node_filesystem_size_bytes{mountpoint=\"/\"}) * 100" -UseBasicParsing | ConvertFrom-Json).data.result[0].value[1]
}

$utilization
```

### Growth Trend Analysis

Monitor weekly trend to predict when resources will be exhausted:

- **CPU**: If growing 2% per week → Need upgrade in 20 weeks
- **Memory**: If growing 1% per week → Need upgrade in 40 weeks
- **Disk**: If growing 5% per week → Need cleanup in 3 weeks

---

## 🎯 SLA Monitoring

### Target Service Levels

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **Uptime** | 99.5% | 99.0% | <99.0% |
| **Response Time p95** | <500ms | 500-750ms | >750ms |
| **Error Rate** | <0.5% | 0.5-2% | >2% |
| **Database Connections** | <50 | 50-80 | >80 |

### Calculate Monthly SLA

```powershell
# Get uptime percentage
$query = 'up{job="backend"}'
$uptime = (Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query_range?query=$query&start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z&step=300s" -UseBasicParsing | ConvertFrom-Json)

$upPercent = ($uptime.data.result[0].values | Where-Object { $_[1] -eq "1" } | Measure-Object).Count / $uptime.data.result[0].values.Count * 100

Write-Host "Monthly Uptime: $upPercent%"
```

---

## 📚 Additional Resources

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **AlertManager Docs**: https://prometheus.io/docs/alerting/alertmanager/
- **Loki Docs**: https://grafana.com/docs/loki/

---

## ✅ Checklist: Initial Setup Complete

- [ ] All monitoring services running (Health Score >90%)
- [ ] 4 dashboards created (System, Performance, Usage, Troubleshooting)
- [ ] Alert rules configured and validated
- [ ] Alert notifications configured (Slack, email, etc.)
- [ ] Grafana admin password changed
- [ ] Daily operations checklist created
- [ ] Escalation procedures documented
- [ ] Backup procedures tested
- [ ] SLA targets defined
- [ ] On-call rotation established

---

**Status**: ✅ Monitoring infrastructure operational and ready for production
**Last Updated**: January 30, 2026
**Next Review**: February 3, 2026
