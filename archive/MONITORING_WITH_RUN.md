# Integrated Monitoring with RUN.ps1

## Overview

The Student Management System now includes **fully integrated monitoring** that starts automatically with a single command. This includes Grafana dashboards, Prometheus metrics, and embedded monitoring in the Power page.

## Quick Start

### Start with Monitoring (Recommended)

```powershell
.\RUN.ps1 -WithMonitoring
```

This single command will:
- ✅ Start the SMS application (if not already running)
- ✅ Start Prometheus (metrics collection)
- ✅ Start Grafana (dashboards and visualization)
- ✅ Start Loki (log aggregation)
- ✅ Start AlertManager (alert routing)
- ✅ Configure everything automatically
- ✅ Handle port conflicts intelligently

### Access Your Monitoring

After starting, you'll have three ways to access monitoring:

**1. Embedded in App (Easiest) 🆕**
- URL: http://localhost:8080/power
- Navigate to: Power → System Health → System Monitoring
- Three tabs: Grafana, Prometheus, Raw Metrics
- No separate login needed

**2. Grafana Dashboards**
- URL: http://localhost:3000
- Login: admin / admin
- Pre-configured SMS dashboard included

**3. Prometheus**
- URL: http://localhost:9090
- Query interface for metrics
- Target status monitoring

## Port Conflict Resolution

### Automatic Detection

If port 3000 (Grafana's default) is already in use, RUN.ps1 will:
1. Detect the conflict automatically
2. Find the next available port (3001, 3002, etc.)
3. Start Grafana on the alternative port
4. Show you the correct URL

### Manual Port Selection

You can also specify a custom port explicitly:

```powershell
.\RUN.ps1 -WithMonitoring -GrafanaPort 3005
```

This is useful when:
- You know port 3000 is occupied (e.g., by another Grafana instance)
- You want to use a specific port for organizational reasons
- You're running multiple SMS instances

## What Gets Started

When you run `.\RUN.ps1 -WithMonitoring`, these containers start:

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| **SMS App** | sms-app | 8080 | Main application |
| **Prometheus** | sms-prometheus | 9090 | Metrics collection |
| **Grafana** | sms-grafana | 3000* | Dashboards |
| **Loki** | sms-loki | 3100 | Log aggregation |
| **Promtail** | sms-promtail | - | Log shipping |
| **AlertManager** | sms-alertmanager | 9093 | Alerts |
| **Node Exporter** | sms-node-exporter | 9100 | System metrics |
| **cAdvisor** | sms-cadvisor | 8081 | Container metrics |

*Port may vary if 3000 is in use

## Common Workflows

### Daily Usage

```powershell
# Start everything with monitoring
.\RUN.ps1 -WithMonitoring

# Check status (shows monitoring status too)
.\RUN.ps1 -Status

# View logs
.\RUN.ps1 -Logs

# Stop everything (prompts to stop monitoring)
.\RUN.ps1 -Stop
```

### First-Time Setup

```powershell
# 1. Start with monitoring
.\RUN.ps1 -WithMonitoring

# 2. Wait for "SMS is now running!" message

# 3. Access embedded monitoring
#    Open: http://localhost:8080/power
#    Navigate to: System Health → System Monitoring

# 4. (Optional) Access Grafana directly
#    Open: http://localhost:3000
#    Login: admin/admin
#    CHANGE PASSWORD immediately!
```

### Troubleshooting

**Monitoring won't start:**
```powershell
# Check Docker is running
docker ps

# Check for port conflicts manually
netstat -ano | Select-String ":3000"
netstat -ano | Select-String ":9090"

# Try with custom port
.\RUN.ps1 -WithMonitoring -GrafanaPort 3005
```

**Grafana shows "Cannot connect to Prometheus":**
- Wait 30 seconds for all services to start
- Check status: `.\RUN.ps1 -Status`
- Verify Prometheus is running: `docker ps | Select-String prometheus`

**Port still says "in use" after stopping:**
- Services take ~10 seconds to fully stop
- Force cleanup: `docker-compose -f docker-compose.monitoring.yml down`

## Stopping Monitoring

### With Main App

When you run `.\RUN.ps1 -Stop`, you'll be prompted:

```
Stop monitoring stack too? (Y/n)
```

- Press `Y` or Enter → Stops everything (app + monitoring)
- Press `N` → Stops only the app, leaves monitoring running

### Monitoring Only

To stop just the monitoring stack:

```powershell
cd monitoring
docker-compose -f docker-compose.monitoring.yml down
```

Or use SMS.ps1:
```powershell
.\SMS.ps1 -StopMonitoring
```

## Viewing Status

```powershell
.\RUN.ps1 -Status
```

Output includes:
- SMS application status
- Docker availability
- Container health
- **Monitoring stack status** (new!)
  - Prometheus: Running/Stopped
  - Grafana: Running/Stopped + URL
  - Power Page: URL (embedded monitoring)

## Advanced Usage

### Start Without Monitoring

```powershell
.\RUN.ps1  # No -WithMonitoring flag
```

Benefits:
- Faster startup
- Lower resource usage
- Simpler deployment

### Add Monitoring Later

```powershell
# 1. Start app normally
.\RUN.ps1

# 2. Add monitoring separately
docker-compose -f docker-compose.monitoring.yml up -d

# 3. Access at http://localhost:8080/power
```

### Custom Configuration

Edit `docker-compose.monitoring.yml` to customize:
- Retention periods (default: 30 days for metrics, 31 days for logs)
- Alert rules
- Dashboard provisioning
- Resource limits

## What's Monitored

### Application Metrics
- HTTP request rates
- Response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database query performance
- Authentication attempts

### Business Metrics
- Active students count
- Course enrollments
- Grade submissions
- Attendance records

### System Metrics
- CPU usage
- Memory usage
- Disk I/O
- Container metrics

### Logs
- Application logs (backend)
- System logs
- Error tracking
- Request tracing

## Performance Impact

### With Monitoring

**Resource Usage:**
- CPU: +15-20% (mostly Prometheus)
- RAM: +500MB-1GB (all monitoring containers)
- Disk: Minimal (logs and metrics retained for 30 days)

**Startup Time:**
- +10-15 seconds (first time)
- +5-10 seconds (subsequent starts)

### Without Monitoring

**Resource Usage:**
- CPU: Baseline
- RAM: ~500MB (app only)
- Disk: Minimal

**Startup Time:**
- 20-30 seconds (first time)
- 5-10 seconds (subsequent starts)

## Recommendations

### For Production
✅ **Always use `-WithMonitoring`**
- Track performance trends
- Detect issues early
- Monitor user activity
- Comply with SLAs

### For Development
⚠️ **Use `-WithMonitoring` when needed**
- Testing performance optimizations
- Debugging slow queries
- Load testing
- Integration testing

### For Demo/Presentation
⚡ **Optional - use standard mode**
- Simpler setup
- Faster startup
- Lower resource usage

## Frequently Asked Questions

**Q: Do I need to configure anything before using monitoring?**
A: No! It works out of the box. Just use `.\RUN.ps1 -WithMonitoring`.

**Q: What if port 3000 is already taken?**
A: RUN.ps1 detects this automatically and uses the next available port (3001, 3002, etc.).

**Q: Can I use a specific port?**
A: Yes! Use `-GrafanaPort 3005` to specify port 3005 (or any other port).

**Q: How do I access the monitoring dashboards?**
A: Three ways:
1. Embedded: http://localhost:8080/power (easiest)
2. Grafana: http://localhost:3000 (full features)
3. Prometheus: http://localhost:9090 (raw metrics)

**Q: Do I need to create dashboards?**
A: No! A comprehensive SMS dashboard is pre-configured and loads automatically.

**Q: How much disk space does monitoring use?**
A: Approximately 1-2GB after 30 days of metrics retention (default).

**Q: Can I change retention periods?**
A: Yes! Edit `docker-compose.monitoring.yml` and change:
- Prometheus: `--storage.tsdb.retention.time=30d` (line ~51)
- Loki: `retention_period: 744h` in loki-config.yml

**Q: What's the default Grafana password?**
A: admin/admin (CHANGE THIS IN PRODUCTION!)

**Q: How do I stop monitoring?**
A: Run `.\RUN.ps1 -Stop` and answer `Y` when prompted.

**Q: Can I run monitoring on a different machine?**
A: Not directly with RUN.ps1. You'd need to:
1. Start monitoring manually: `docker-compose -f docker-compose.monitoring.yml up -d`
2. Configure Prometheus to scrape remote SMS instance

**Q: Does monitoring slow down the application?**
A: Minimal impact (<5% overhead). Metrics collection is very lightweight.

**Q: Where are the logs stored?**
A: In Docker volumes:
- Prometheus data: `prometheus-data` volume
- Grafana data: `grafana-data` volume
- Loki logs: `loki-data` volume

## Support

For monitoring issues:
1. Check status: `.\RUN.ps1 -Status`
2. View logs: `docker-compose -f docker-compose.monitoring.yml logs`
3. Restart monitoring: Stop and start again with `.\RUN.ps1 -WithMonitoring`
4. Check documentation: [MONITORING_INTEGRATION.md](MONITORING_INTEGRATION.md)

## Next Steps

- 📖 Read [MONITORING_INTEGRATION.md](MONITORING_INTEGRATION.md) for full monitoring documentation
- 🎯 Explore the embedded dashboards at http://localhost:8080/power
- 📊 Create custom dashboards in Grafana
- 🔔 Configure alert notifications (email, Slack, etc.)

---

**You're ready to monitor!** Run `.\RUN.ps1 -WithMonitoring` and enjoy comprehensive observability. 🚀📊
