# ✅ Monitoring Integration Complete!

The monitoring stack has been fully integrated into your existing setup scripts. You can now start monitoring with a single command!

## 🎯 Quick Commands

### Start Everything with Monitoring
```powershell
# First time setup
.\SMART_SETUP.ps1 -WithMonitoring

# Or quick start
.\SMS.ps1 -WithMonitoring
```

### Start Monitoring Only
```powershell
.\SMS.ps1 -MonitoringOnly
```

### Check Status
```powershell
.\SMS.ps1 -Status
# Shows both application and monitoring status
```

### Stop Everything
```powershell
.\SMS.ps1 -Stop
# Stops both application and monitoring
```

### Stop Monitoring Only
```powershell
.\SMS.ps1 -StopMonitoring
```

## 📋 All Available Commands

### SMART_SETUP.ps1 (First-Time Setup)

| Command | Description |
|---------|-------------|
| `.\SMART_SETUP.ps1` | Standard setup (no monitoring) |
| `.\SMART_SETUP.ps1 -WithMonitoring` | Setup with full monitoring stack |
| `.\SMART_SETUP.ps1 -Force -WithMonitoring` | Rebuild from scratch with monitoring |
| `.\SMART_SETUP.ps1 -DevMode -WithMonitoring` | Development mode with monitoring |

### SMS.ps1 (Day-to-Day Management)

| Command | Description |
|---------|-------------|
| `.\SMS.ps1` | Interactive mode - show status |
| `.\SMS.ps1 -Quick` | Start app only (no monitoring) |
| `.\SMS.ps1 -WithMonitoring` | Start app + monitoring |
| `.\SMS.ps1 -MonitoringOnly` | Start monitoring only |
| `.\SMS.ps1 -Status` | Show app and monitoring status |
| `.\SMS.ps1 -Stop` | Stop everything (app + monitoring) |
| `.\SMS.ps1 -StopMonitoring` | Stop monitoring only |
| `.\SMS.ps1 -Restart` | Restart app containers |
| `.\SMS.ps1 -Logs` | View backend logs |
| `.\SMS.ps1 -Help` | Show full help |

### RUN.ps1 (Simple One-Click)

| Command | Description |
|---------|-------------|
| `.\RUN.ps1` | Start app (no monitoring) |
| `.\RUN.ps1 -WithMonitoring` | Start app with monitoring |
| `.\RUN.ps1 -Status` | Check if running |
| `.\RUN.ps1 -Stop` | Stop cleanly |
| `.\RUN.ps1 -Update` | Update with backup |

## 🌐 Access URLs

After starting with monitoring:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Main Application** | http://localhost:8080 | Your user account |
| **🎯 Monitoring UI** | **http://localhost:8080/power** | **Embedded in System Health** |
| **Grafana Dashboards** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **AlertManager** | http://localhost:9093 | - |
| **Application Metrics** | http://localhost:8000/metrics | - |
| **API Documentation** | http://localhost:8080/docs | - |

### 🆕 New: Integrated Monitoring UI

All monitoring dashboards are now accessible directly from the main application!

**Access:** http://localhost:8080/power → Scroll to "System Monitoring" section

**Features:**
- ✅ Embedded Grafana dashboard (SMS Overview)
- ✅ Prometheus query interface
- ✅ Raw metrics endpoint viewer
- ✅ Quick links to full services
- ✅ No need to remember separate ports!

See [MONITORING_INTEGRATION_POWER_PAGE.md](MONITORING_INTEGRATION_POWER_PAGE.md) for details.

## 📊 What's Included

When you start with `-WithMonitoring`, you get:

### Monitoring Services
- ✅ **Prometheus** - Metrics collection (port 9090)
- ✅ **Grafana** - Dashboards & visualization (port 3000)
- ✅ **Loki** - Log aggregation (port 3100)
- ✅ **Promtail** - Log shipping
- ✅ **AlertManager** - Alert routing (port 9093)
- ✅ **Node Exporter** - System metrics
- ✅ **cAdvisor** - Container metrics

### Pre-configured Features
- ✅ 23 alert rules (critical, warning, info)
- ✅ SMS Overview dashboard
- ✅ Automatic log collection
- ✅ 30-day metrics retention
- ✅ 31-day log retention
- ✅ Email & Slack alert support (requires config)

## 🎨 Script Integration Details

### SMS.ps1 Enhancements

**New Parameters:**
- `-WithMonitoring` - Start app with monitoring
- `-MonitoringOnly` - Start monitoring only
- `-StopMonitoring` - Stop monitoring only

**New Functions:**
- `Get-MonitoringStatus` - Check monitoring status
- `Start-MonitoringStack` - Start monitoring services
- `Stop-MonitoringStack` - Stop monitoring services
- `Show-MonitoringStatus` - Display monitoring status

**Enhanced Behavior:**
- `-Status` now shows both app and monitoring
- `-Stop` now stops monitoring if running
- Interactive mode shows monitoring if present

### SMART_SETUP.ps1 Enhancements

**New Parameters:**
- `-WithMonitoring` - Include monitoring in setup

**Enhanced Behavior:**
- Automatically starts monitoring after app setup
- Shows monitoring URLs in completion message
- Includes monitoring management commands in output

### RUN.ps1 Enhancements

**New Parameters:**
- `-WithMonitoring` - Start with monitoring

## 🚀 Usage Examples

### Example 1: Developer Workflow

```powershell
# Day 1: Initial setup with monitoring
.\SMART_SETUP.ps1 -DevMode -WithMonitoring

# Work on code...
# Check status occasionally
.\SMS.ps1 -Status

# Stop for the day
.\SMS.ps1 -Stop

# Day 2: Quick start
.\SMS.ps1 -WithMonitoring

# Just need monitoring for debugging
.\SMS.ps1 -StopMonitoring  # Save resources
# Later...
.\SMS.ps1 -MonitoringOnly  # Start monitoring again
```

### Example 2: Production Deployment

```powershell
# Initial deployment
.\SMART_SETUP.ps1 -WithMonitoring

# Configure alerts (one-time)
# Edit monitoring/alertmanager/alertmanager.yml
docker-compose -f docker-compose.monitoring.yml restart alertmanager

# Daily operations
.\SMS.ps1 -Status  # Check everything
.\SMS.ps1 -Logs    # If issues arise

# Maintenance
.\SMS.ps1 -Stop
# Perform maintenance...
.\SMS.ps1 -WithMonitoring
```

### Example 3: Testing Monitoring

```powershell
# Start just monitoring (no app)
.\SMS.ps1 -MonitoringOnly

# Explore Grafana at http://localhost:3000
# Configure dashboards, test queries

# When satisfied, stop
.\SMS.ps1 -StopMonitoring

# Start everything together
.\SMS.ps1 -WithMonitoring
```

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [MONITORING_QUICKSTART.md](MONITORING_QUICKSTART.md) | 5-minute quick start guide |
| [docs/MONITORING_SETUP.md](docs/MONITORING_SETUP.md) | Consolidated setup guide (this integration) |
| [docs/operations/MONITORING.md](docs/operations/MONITORING.md) | Comprehensive 200+ line guide |
| [monitoring/README.md](monitoring/README.md) | Configuration reference |

## ⚙️ Configuration

### Enable/Disable Metrics

Metrics are enabled by default. To disable:

```powershell
# In backend/.env
ENABLE_METRICS=0

# Or via environment
$env:ENABLE_METRICS="0"
```

### Configure Alerts

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
# Email alerts
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

# Slack alerts
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK'
```

Then restart:
```powershell
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

## 🔧 Troubleshooting

### Monitoring Won't Start

```powershell
# Check Docker is running
docker ps

# View monitoring logs
docker-compose -f docker-compose.monitoring.yml logs

# Check config file exists
Test-Path docker-compose.monitoring.yml
```

### No Metrics in Grafana

```powershell
# Check Prometheus targets
# Open: http://localhost:9090/targets
# Look for "sms-backend" - should be UP

# Test metrics endpoint
curl http://localhost:8000/metrics

# Check backend environment
docker exec sms-backend env | Select-String ENABLE_METRICS
```

### Can't Login to Grafana

Default credentials: `admin` / `admin`

If forgotten, reset:
```powershell
docker-compose -f docker-compose.monitoring.yml stop grafana
docker-compose -f docker-compose.monitoring.yml rm -f grafana
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

## 💡 Tips

1. **Start with monitoring during development** - Catch issues early
2. **Stop monitoring when not needed** - Save system resources
3. **Use `-Status` frequently** - Know what's running
4. **Explore Grafana** - Pre-built dashboard at http://localhost:3000
5. **Check alerts** - View at http://localhost:9093
6. **Set up notifications** - Configure AlertManager for your team
7. **Review metrics** - `/metrics` endpoint shows all available metrics
8. **Use log queries** - Grafana Explore with Loki datasource

## 🎯 Next Steps

1. **Start with monitoring:**
   ```powershell
   .\SMART_SETUP.ps1 -WithMonitoring
   ```

2. **Open Grafana:**
   http://localhost:3000 (admin/admin)

3. **View the overview dashboard:**
   Dashboards → Student Management System → Overview

4. **Configure alerts:**
   Edit `monitoring/alertmanager/alertmanager.yml`

5. **Explore logs:**
   Grafana → Explore → Loki → `{job="sms-backend"}`

6. **Read the guides:**
   - [MONITORING_QUICKSTART.md](MONITORING_QUICKSTART.md)
   - [docs/MONITORING_SETUP.md](docs/MONITORING_SETUP.md)

## 📞 Support

- **Quick Start**: See [MONITORING_QUICKSTART.md](MONITORING_QUICKSTART.md)
- **Setup Guide**: See [docs/MONITORING_SETUP.md](docs/MONITORING_SETUP.md)
- **Full Documentation**: See [docs/operations/MONITORING.md](docs/operations/MONITORING.md)
- **Configuration**: See [monitoring/README.md](monitoring/README.md)
- **Issues**: GitHub repository

---

## Summary

✅ **SMS.ps1** - Enhanced with 3 new monitoring commands
✅ **SMART_SETUP.ps1** - Added `-WithMonitoring` flag
✅ **RUN.ps1** - Added `-WithMonitoring` flag
✅ **Monitoring functions** - Fully integrated
✅ **Documentation** - Complete guides created
✅ **One-command setup** - `.\SMART_SETUP.ps1 -WithMonitoring`

**You're ready to monitor!** Start with:
```powershell
.\SMART_SETUP.ps1 -WithMonitoring
```

Then open http://localhost:3000 to see your metrics! 📊🎉
