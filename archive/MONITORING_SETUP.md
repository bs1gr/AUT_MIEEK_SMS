# Monitoring Setup - Consolidated Guide

This guide shows how to set up and use the monitoring stack with your Student Management System setup scripts.

## Quick Start (Recommended)

### Option 1: Setup with Monitoring (First Time)

```powershell
# Initialize system with monitoring stack
.\SMART_SETUP.ps1 -WithMonitoring
```

This will:
- ✅ Build Docker images
- ✅ Start the application
- ✅ Start Prometheus, Grafana, Loki, AlertManager
- ✅ Configure all services

### Option 2: Add Monitoring to Existing Setup

```powershell
# If you already have the app running, just add monitoring
.\SMS.ps1 -MonitoringOnly
```

### Option 3: Start Everything Together

```powershell
# Start/restart with monitoring
.\SMS.ps1 -WithMonitoring
```

## Available Commands

### SMART_SETUP.ps1 (First-Time Setup)

```powershell
# Standard setup
.\SMART_SETUP.ps1

# Setup with monitoring
.\SMART_SETUP.ps1 -WithMonitoring

# Force rebuild with monitoring
.\SMART_SETUP.ps1 -Force -WithMonitoring

# Development mode with monitoring
.\SMART_SETUP.ps1 -DevMode -WithMonitoring
```

### SMS.ps1 (Day-to-Day Management)

```powershell
# Start application + monitoring
.\SMS.ps1 -WithMonitoring

# Start monitoring only
.\SMS.ps1 -MonitoringOnly

# Check status (shows both app and monitoring)
.\SMS.ps1 -Status

# Stop everything (app + monitoring)
.\SMS.ps1 -Stop

# Stop monitoring only
.\SMS.ps1 -StopMonitoring

# Quick start (app only, no monitoring)
.\SMS.ps1 -Quick
```

### RUN.ps1 (Simple One-Click)

```powershell
# Start with monitoring
.\RUN.ps1 -WithMonitoring

# Standard start (no monitoring)
.\RUN.ps1

# Check status
.\RUN.ps1 -Status

# Stop (includes monitoring if running)
.\RUN.ps1 -Stop
```

## What Gets Installed

When you start with monitoring, the following services are launched:

| Service | Port | Purpose | Access |
|---------|------|---------|--------|
| **Prometheus** | 9090 | Metrics collection & storage | http://localhost:9090 |
| **Grafana** | 3000 | Dashboards & visualization | http://localhost:3000 (admin/admin) |
| **Loki** | 3100 | Log aggregation | http://localhost:3100 |
| **Promtail** | 9080 | Log shipping | Internal |
| **AlertManager** | 9093 | Alert routing | http://localhost:9093 |
| **Node Exporter** | 9100 | System metrics | Internal |
| **cAdvisor** | 8080 | Container metrics | Internal |

Plus your application:
- **SMS Backend** - Port 8000 - Exposes `/metrics` endpoint
- **SMS Frontend** - Port 8080 - Main application

## Typical Workflow

### For New Users

1. **First time setup with monitoring:**
   ```powershell
   .\SMART_SETUP.ps1 -WithMonitoring
   ```

2. **Access your application:**
   - Main App: http://localhost:8080
   - Grafana Dashboard: http://localhost:3000

3. **Stop everything when done:**
   ```powershell
   .\SMS.ps1 -Stop
   ```

4. **Next time, quick start:**
   ```powershell
   .\SMS.ps1 -WithMonitoring
   ```

### For Developers

1. **Setup in development mode:**
   ```powershell
   .\SMART_SETUP.ps1 -DevMode -WithMonitoring
   ```

2. **Check status anytime:**
   ```powershell
   .\SMS.ps1 -Status
   ```

3. **View logs:**
   ```powershell
   .\SMS.ps1 -Logs
   ```

4. **Stop monitoring to save resources:**
   ```powershell
   .\SMS.ps1 -StopMonitoring
   ```

5. **Restart just monitoring later:**
   ```powershell
   .\SMS.ps1 -MonitoringOnly
   ```

### For Production

1. **Initial setup:**
   ```powershell
   .\SMART_SETUP.ps1 -WithMonitoring
   ```

2. **Configure AlertManager** (IMPORTANT):
   - Edit `monitoring/alertmanager/alertmanager.yml`
   - Add your email/Slack credentials
   - Restart: `docker-compose -f docker-compose.monitoring.yml restart alertmanager`

3. **Change Grafana password:**
   - Login to http://localhost:3000
   - Profile → Change Password

4. **Automate startup** (optional):
   ```powershell
   # Create scheduled task or service
   .\SMS.ps1 -WithMonitoring
   ```

## Configuration

### Enable Metrics in Backend

Metrics are enabled by default. To disable:

```powershell
# In backend/.env
ENABLE_METRICS=0
```

Or via environment variable:

```powershell
$env:ENABLE_METRICS="0"
```

### Customize Monitoring

Edit configuration files in `monitoring/` directory:

- **Prometheus**: `monitoring/prometheus/prometheus.yml`
- **Grafana**: `monitoring/grafana/provisioning/`
- **Loki**: `monitoring/loki/loki-config.yml`
- **AlertManager**: `monitoring/alertmanager/alertmanager.yml`

After changes, restart:

```powershell
docker-compose -f docker-compose.monitoring.yml restart <service-name>
```

## Verifying Setup

### Check if Monitoring is Running

```powershell
.\SMS.ps1 -Status
```

Look for "Monitoring Stack Status" section.

### Test Metrics Endpoint

```powershell
# PowerShell
Invoke-WebRequest http://localhost:8000/metrics

# Or in browser
# Open: http://localhost:8000/metrics
```

You should see Prometheus-format metrics.

### Check Grafana Dashboard

1. Open http://localhost:3000
2. Login (admin/admin)
3. Navigate to Dashboards → Student Management System → Overview
4. You should see live metrics

### View Logs in Grafana

1. In Grafana, click "Explore" (compass icon)
2. Select "Loki" datasource
3. Enter query: `{job="sms-backend"}`
4. Click "Run query"

## Troubleshooting

### Monitoring Won't Start

**Check Docker is running:**
```powershell
docker ps
```

**Check configuration exists:**
```powershell
Test-Path docker-compose.monitoring.yml
```

**View monitoring logs:**
```powershell
docker-compose -f docker-compose.monitoring.yml logs
```

### No Metrics in Grafana

**Check Prometheus is scraping:**
- Open http://localhost:9090/targets
- Look for `sms-backend` target
- Status should be "UP"

**Check backend is exposing metrics:**
```powershell
curl http://localhost:8000/metrics
```

**Check ENABLE_METRICS setting:**
```powershell
# Should show 1 or true
docker exec sms-backend env | Select-String ENABLE_METRICS
```

### Grafana Shows "Login Failed"

**Reset password:**
```powershell
# Stop Grafana
docker-compose -f docker-compose.monitoring.yml stop grafana

# Reset to defaults
docker-compose -f docker-compose.monitoring.yml rm -f grafana

# Start fresh
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

Default credentials: `admin` / `admin`

### Ports Already in Use

**Check what's using the port:**
```powershell
# Check specific port
netstat -ano | Select-String ":3000"
netstat -ano | Select-String ":9090"
```

**Stop conflicting services or change ports** in `docker-compose.monitoring.yml`

### High Resource Usage

**Stop monitoring when not needed:**
```powershell
.\SMS.ps1 -StopMonitoring
```

**Reduce retention periods** in configs:
- `monitoring/prometheus/prometheus.yml` - Change retention to 7d
- `monitoring/loki/loki-config.yml` - Change retention to 168h

## Resource Requirements

### Minimum

- **RAM**: 4GB free (2GB for monitoring stack)
- **Disk**: 10GB free (for metrics/logs storage)
- **CPU**: 2 cores

### Recommended

- **RAM**: 8GB free (4GB for monitoring stack)
- **Disk**: 50GB free (for longer retention)
- **CPU**: 4 cores

### With Monitoring Disabled

- **RAM**: 2GB free
- **Disk**: 5GB free
- **CPU**: 2 cores

## Monitoring-Only Mode

If you just want to test monitoring without the main app:

```powershell
# Start monitoring services only
.\SMS.ps1 -MonitoringOnly

# Access services
# Grafana: http://localhost:3000
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093

# Stop when done
.\SMS.ps1 -StopMonitoring
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deploy with Monitoring

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup with Monitoring
        run: |
          .\SMART_SETUP.ps1 -WithMonitoring -NoPause

      - name: Wait for Health
        run: |
          Start-Sleep -Seconds 30
          $response = Invoke-WebRequest http://localhost:8080/health
          if ($response.StatusCode -ne 200) { exit 1 }

      - name: Check Metrics
        run: |
          $metrics = Invoke-WebRequest http://localhost:8000/metrics
          if ($metrics.Content -notmatch "sms_http_requests_total") { exit 1 }
```

## Next Steps

1. **Explore Dashboards** - http://localhost:3000
2. **Set Up Alerts** - Edit `monitoring/alertmanager/alertmanager.yml`
3. **Create Custom Dashboards** - In Grafana UI
4. **Read Full Guide** - [docs/operations/MONITORING.md](operations/MONITORING.md)
5. **Quick Reference** - [MONITORING_QUICKSTART.md](../MONITORING_QUICKSTART.md)

## Support

- **Quick Start**: [MONITORING_QUICKSTART.md](../MONITORING_QUICKSTART.md)
- **Full Guide**: [docs/operations/MONITORING.md](operations/MONITORING.md)
- **Configuration**: [monitoring/README.md](../monitoring/README.md)
- **Issues**: GitHub repository

---

**Monitoring integrated! Start with `.\SMART_SETUP.ps1 -WithMonitoring`** 🚀📊
