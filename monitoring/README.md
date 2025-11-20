# Monitoring Stack Configuration

This directory contains configuration files for the comprehensive monitoring and alerting stack.

## Directory Structure

```text
monitoring/
├── prometheus/              # Metrics collection
│   ├── prometheus.yml       # Main Prometheus config
│   └── alerts/              # Alert rules
│       ├── api_alerts.yml   # API/infrastructure alerts
│       └── business_alerts.yml  # Business metrics alerts
│
├── grafana/                 # Visualization
│   ├── provisioning/        # Auto-configuration
│   │   ├── datasources/     # Prometheus & Loki datasources
│   │   └── dashboards/      # Dashboard provisioning
│   └── dashboards/          # Dashboard JSON files
│       └── sms-overview.json
│
├── loki/                    # Log aggregation
│   └── loki-config.yml
│
├── promtail/                # Log shipping
│   └── promtail-config.yml
│
└── alertmanager/            # Alert routing
    └── alertmanager.yml     # Notification config
```

## Quick Configuration

### On-Demand vs Eager Start (v1.8.3+)

The monitoring stack is still available, but the embedded Power page controls were removed in v1.8.3. Operators now have two options:

1. **Eager Start** – `RUN.ps1 -WithMonitoring` (all services launch immediately, same as before).
2. **On-Demand Start** – Use a host-side command (`SMS.ps1 -MonitoringOnly` or `docker compose -f docker-compose.monitoring.yml up -d`) or call the Control API directly from the host.

Control API endpoints (host only):

- `GET /control/api/monitoring/status` – stack state
- `POST /control/api/monitoring/start` – start services
- `POST /control/api/monitoring/stop` – stop services
- `POST /control/api/monitoring/trigger` – create a watcher trigger when running inside Docker

Benefits: lower resource use at boot, quicker updates, explicit operator control. When running inside the full-stack container, leverage the watcher trigger endpoint instead of direct Docker commands.

Security: Start/stop endpoints remain host-only and rate limited. Keep `/control/api/monitoring/*` behind loopback or an authenticated proxy in production. Optional token support is planned via `MONITORING_CONTROL_TOKEN`.

### 1. Prometheus (Metrics)

**File**: `prometheus/prometheus.yml`

**Key Settings**:

```yaml
scrape_interval: 15s        # How often to collect metrics
retention: 30d              # How long to keep data
```

**Alert Rules**:

- `alerts/api_alerts.yml` - Infrastructure and API alerts
- `alerts/business_alerts.yml` - Business metrics alerts

### 2. Grafana (Dashboards)

**Access**: <http://localhost:3000>
**Default Credentials**: admin / admin (⚠️ CHANGE IN PRODUCTION)

**Pre-configured**:

- ✅ Prometheus datasource
- ✅ Loki datasource
- ✅ SMS Overview dashboard

**Customize**:

- Add dashboards to `grafana/dashboards/`
- Update provisioning in `grafana/provisioning/`

### 3. Loki (Logs)

**File**: `loki/loki-config.yml`

**Key Settings**:

```yaml
retention_period: 744h      # 31 days
ingestion_rate_mb: 50       # Max 50MB/s ingestion
```

### 4. Promtail (Log Collector)

**File**: `promtail/promtail-config.yml`

**Collects From**:

- Backend logs (`logs/*.log`)
- Docker container logs
- System logs

### 5. AlertManager (Notifications)

**File**: `alertmanager/alertmanager.yml`

**⚠️ REQUIRED**: Configure before production use

**Email Setup**:

```yaml
smtp_smarthost: 'smtp.gmail.com:587'
smtp_from: 'alerts@yourdomain.com'
smtp_auth_username: 'your-email@gmail.com'
smtp_auth_password: 'YOUR_APP_PASSWORD'
```

**Slack Setup**:

```yaml
slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
```

## Available Alerts

### Critical Alerts (Immediate Notification)

- **APIDown**: API unreachable for 1+ minutes
- **HighErrorRate**: Error rate >5% for 5+ minutes
- **DatabaseConnectionsFailed**: 10+ DB errors in 5 minutes

### Warning Alerts (Team Notification)

- **HighResponseTime**: p95 response time >2s
- **HighRequestRate**: Unusual traffic spike (>100 req/s)
- **RateLimitExceeded**: High rate of limit violations
- **SlowDatabaseQueries**: p95 query time >1s
- **AuthenticationFailureSpike**: Possible brute force attack

### Info Alerts (Low Priority)

- **HighMemoryUsage**: Memory >1GB for 15+ minutes
- **LowCacheHitRate**: Cache efficiency <50%
- **HighNumberOfSlowRequests**: Frequent slow endpoints

## Customization

### Add New Alert Rule

1. Edit `prometheus/alerts/api_alerts.yml` or `business_alerts.yml`
2. Add rule:

```yaml
   - alert: MyNewAlert
     expr: my_metric > 100
     for: 5m
     labels:
       severity: warning
       component: api
     annotations:
       summary: "My alert summary"
       description: "Detailed description"
       action: "What to do"
   ```

3. Restart Prometheus:

   ```bash
   docker-compose -f docker-compose.monitoring.yml restart prometheus
   ```

### Create New Dashboard

#### Option 1: Import JSON

1. Create dashboard in Grafana UI
2. Export as JSON
3. Save to `grafana/dashboards/my-dashboard.json`
4. Restart Grafana

#### Option 2: Use Template

1. Copy `grafana/dashboards/sms-overview.json`
2. Modify panels
3. Save as new file
4. Restart Grafana

### Modify Retention Periods

**Prometheus** (metrics):

```yaml
# prometheus/prometheus.yml
storage:
  tsdb:
    retention:
      time: 30d    # Change to 7d, 60d, 90d, etc.
      size: 10GB   # Change to 5GB, 20GB, etc.
```

**Loki** (logs):

```yaml
# loki/loki-config.yml
limits_config:
  retention_period: 744h  # Change to 168h (7d), 2160h (90d), etc.
```

### Add Custom Metrics

**In Backend Code**:

```python
from backend.middleware.prometheus_metrics import (
    Counter, Gauge, Histogram
)

# Define metric
my_counter = Counter('sms_my_events_total', 'Description', ['label'])

# Use metric
my_counter.labels(label='value').inc()
```

**In Prometheus**:

```yaml
# No config needed - automatically scraped from /metrics
```

## Maintenance

### Backup Configurations

```bash
# Backup all configs
tar -czf monitoring-backup-$(date +%Y%m%d).tar.gz monitoring/

# Backup Prometheus data
docker-compose -f docker-compose.monitoring.yml stop prometheus
tar -czf prometheus-data-$(date +%Y%m%d).tar.gz \
  /var/lib/docker/volumes/*prometheus-data*
docker-compose -f docker-compose.monitoring.yml start prometheus
```

### Update Alert Rules

```bash
# Edit rules
nano monitoring/prometheus/alerts/api_alerts.yml

# Reload Prometheus (without restart)
curl -X POST http://localhost:9090/-/reload

# Or restart
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.monitoring.yml logs -f

# Specific service
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f alertmanager
```

### Clean Up Old Data

```bash
# Stop services
docker-compose -f docker-compose.monitoring.yml down

# Remove all data (⚠️ destructive)
docker-compose -f docker-compose.monitoring.yml down -v

# Start fresh
docker-compose -f docker-compose.monitoring.yml up -d
```

## Security Checklist

- [ ] Change Grafana admin password
- [ ] Configure AlertManager SMTP credentials
- [ ] Enable Prometheus authentication (if exposed)
- [ ] Use HTTPS reverse proxy in production
- [ ] Restrict network access to monitoring ports
- [ ] Store secrets in environment variables
- [ ] Enable audit logging
- [ ] Regular backup of configurations and data

## Troubleshooting

### Prometheus Not Scraping

**Check target status**:

```bash
curl http://localhost:9090/api/v1/targets | jq
```

**Common issues**:

- Backend not running: Start backend with `ENABLE_METRICS=1`
- Port conflict: Check if 8000 is in use
- Docker network: Ensure `host.docker.internal` resolves

### Grafana Shows No Data

**Check datasources**:

```bash
curl http://admin:admin@localhost:3000/api/datasources
```

**Common issues**:

- Prometheus not running
- Loki not running
- Datasource URL incorrect

### Alerts Not Firing

**Check alert rules**:

```bash
curl http://localhost:9090/api/v1/rules | jq
```

**Common issues**:

- Alert rule syntax error
- Expression never true
- AlertManager not configured

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [AlertManager Guide](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## Support

For help:

1. Check [MONITORING.md](../docs/operations/MONITORING.md) for detailed guide
2. Review [MONITORING_QUICKSTART.md](../MONITORING_QUICKSTART.md) for common tasks
3. Check service logs
4. Open GitHub issue

---

**Happy Monitoring!** 📊🔍
