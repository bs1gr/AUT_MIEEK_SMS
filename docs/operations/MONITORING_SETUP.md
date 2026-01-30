# Phase 5 Production Monitoring Setup

**Version**: 1.17.6  
**Created**: January 30, 2026 - 15:50 UTC  
**Purpose**: Production monitoring, alerting, and dashboard configuration  
**Status**: Ready to implement upon deployment

---

## 📊 Monitoring Architecture

### Components

```
┌─────────────────────────────────────────────┐
│      Application (FastAPI + React)          │
├─────────────────────────────────────────────┤
│  Prometheus Exporter (metrics on :9090)     │
├─────────────────────────────────────────────┤
│ Prometheus (time-series DB, :9091)          │
├─────────────────────────────────────────────┤
│ Grafana (dashboards, :3000)                 │
├─────────────────────────────────────────────┤
│ AlertManager (alerting rules)               │
└─────────────────────────────────────────────┘
```

### Monitoring Tools

| Tool | Purpose | Port | Config File |
|------|---------|------|-------------|
| **Prometheus** | Metric collection | 9091 | `monitoring/prometheus.yml` |
| **Grafana** | Visualization | 3000 | `monitoring/grafana-provisioning/` |
| **AlertManager** | Alert routing | 9093 | `monitoring/alertmanager.yml` |
| **Node Exporter** | System metrics | 9100 | Auto-configured |

---

## 🚀 Quick Setup (10 minutes)

### Step 1: Start Monitoring Stack

```bash
# Option A: Docker Compose (Recommended)
docker-compose -f docker/docker-compose.monitoring.yml up -d

# Option B: Manual start with existing infrastructure
docker run -d \
  --name prometheus \
  -p 9091:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

docker run -d \
  --name grafana \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

docker run -d \
  --name node-exporter \
  -p 9100:9100 \
  prom/node-exporter
```

### Step 2: Configure Prometheus

**File**: `monitoring/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'sms-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:5432']
    metrics_path: '/metrics'

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

### Step 3: Access Grafana

1. Open browser: `http://localhost:3000`
2. Login: `admin` / `admin` (change password immediately!)
3. Navigate to **Configuration → Data Sources**
4. Add Prometheus: `http://prometheus:9090`

### Step 4: Create Initial Dashboards

**Dashboard 1: System Health**
- CPU usage (5-min avg)
- Memory usage (VM + Docker)
- Disk usage
- Network I/O

**Dashboard 2: Application Metrics**
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (% 5xx errors)
- Active database connections

**Dashboard 3: Database Health**
- Query performance
- Connection count
- Cache hit ratio
- Table sizes

---

## 📈 Key Metrics to Monitor

### Critical Metrics (Alert if exceeded)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **CPU Usage** | > 80% for 5 min | Page on-call |
| **Memory Usage** | > 90% | Immediate investigation |
| **Disk Usage** | > 85% | Scale storage, cleanup |
| **API Error Rate** | > 5% (5 min) | Check application logs |
| **Response Time p95** | > 1000ms | Check database performance |
| **Database Connections** | > 80% of pool | Check for connection leaks |

### Warning Metrics (Investigate within 15 min)

| Metric | Threshold |
|--------|-----------|
| CPU Usage | 60-80% |
| Memory Usage | 75-90% |
| API Error Rate | 1-5% |
| Response Time p95 | 500-1000ms |

### Informational Metrics (Monitor trends)

- Request rate variations
- Response time trends
- Error patterns by endpoint
- Database query performance
- Cache effectiveness

---

## 🚨 Alert Rules Configuration

**File**: `monitoring/alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  
  routes:
    - match:
        severity: critical
      receiver: 'critical'
      group_wait: 10s
      repeat_interval: 15m
    
    - match:
        severity: warning
      receiver: 'warning'
      group_wait: 1m
      repeat_interval: 4h

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#monitoring'
        text: 'Alert: {{ .GroupLabels.alertname }}'

  - name: 'critical'
    slack_configs:
      - channel: '#critical-alerts'
        text: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_KEY}'

  - name: 'warning'
    slack_configs:
      - channel: '#warnings'
        text: '⚠️  WARNING: {{ .GroupLabels.alertname }}'
```

### Alert Rules (Prometheus)

**File**: `monitoring/alert-rules.yml`

```yaml
groups:
  - name: sms_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 'node_cpu_seconds_total > 0.8'
        for: 5m
        annotations:
          summary: 'High CPU usage detected'
          severity: 'critical'

      # High memory usage
      - alert: HighMemoryUsage
        expr: 'node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1'
        for: 5m
        annotations:
          summary: 'High memory usage (< 10% available)'
          severity: 'critical'

      # High API error rate
      - alert: HighErrorRate
        expr: 'rate(http_requests_total{status=~"5.."}[5m]) > 0.05'
        for: 5m
        annotations:
          summary: 'API error rate > 5%'
          severity: 'critical'

      # Slow response times
      - alert: SlowResponseTime
        expr: 'histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1'
        for: 5m
        annotations:
          summary: 'API p95 response time > 1s'
          severity: 'warning'

      # Database connection issues
      - alert: DatabaseConnectionWarning
        expr: 'pg_stat_activity_count / pg_settings_max_connections > 0.8'
        for: 5m
        annotations:
          summary: 'Database connections > 80% of pool'
          severity: 'warning'
```

---

## 📊 Custom Dashboards

### Creating Dashboards in Grafana

#### Dashboard 1: System Overview

**Panels**:
1. **Current CPU** - Gauge showing latest CPU %
2. **Memory Available** - Bar chart with threshold lines
3. **Disk Usage** - Pie chart by partition
4. **Network I/O** - Line chart (bytes/sec)

**Query Example** (CPU):
```promql
(1 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))) * 100
```

#### Dashboard 2: Application Performance

**Panels**:
1. **Requests/Second** - Rate over time
2. **Response Time Distribution** - Histogram (p50, p95, p99)
3. **Errors by Status Code** - Bar chart
4. **Endpoints by Latency** - Top 10 slowest

**Query Example** (Requests/Sec):
```promql
rate(http_requests_total[1m])
```

#### Dashboard 3: Database Health

**Panels**:
1. **Active Connections** - Gauge + trend
2. **Query Performance** - Top 10 slow queries
3. **Cache Hit Ratio** - Percentage trend
4. **Table Sizes** - Pie chart

**Query Example** (Active Connections):
```promql
pg_stat_activity_count
```

---

## 🔔 Notification Channels

### Slack Integration

1. **Create Incoming Webhook** in Slack
2. Set `SLACK_WEBHOOK_URL` environment variable
3. Test alert:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test alert"}' \
     $SLACK_WEBHOOK_URL
   ```

### Email Alerts (Alternative)

```yaml
receivers:
  - name: 'critical'
    email_configs:
      - to: 'admin@example.com'
        from: 'alerts@sms.example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: '${SMTP_USER}'
        auth_password: '${SMTP_PASSWORD}'
```

### PagerDuty Integration

```yaml
receivers:
  - name: 'critical'
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_INTEGRATION_KEY}'
        client: 'SMS Production'
        description: '{{ .GroupLabels.alertname }}'
```

---

## 📋 Daily Monitoring Checklist

### Morning (08:00 UTC)

- [ ] Check Grafana dashboards for overnight issues
- [ ] Review error logs from last 24 hours
- [ ] Verify all containers running and healthy
- [ ] Check disk space usage trend
- [ ] Review alert history for false positives

### Mid-Day (12:00 UTC)

- [ ] Monitor API error rate during peak usage
- [ ] Check response time metrics
- [ ] Verify database performance
- [ ] Check backup completion status

### Evening (18:00 UTC)

- [ ] Review performance metrics summary
- [ ] Check for any security alerts
- [ ] Prepare for next day's maintenance if needed
- [ ] Archive logs if needed

### Weekly (Every Monday 01:00 UTC)

- [ ] Deep analysis of performance trends
- [ ] Review and update alert thresholds if needed
- [ ] Test alert notification channels
- [ ] Review disk usage trend - plan scaling if needed
- [ ] Backup monitoring configuration

---

## 🚀 Scaling & Optimization

### When to Scale

**Add more resources if**:
- CPU consistently > 60%
- Memory consistently > 75%
- Response time p95 > 1000ms
- Database connections > 70%

### Optimization Steps

1. **Enable Query Caching**
   ```bash
   # In .env
   CACHE_TTL=3600
   CACHE_BACKEND=redis
   ```

2. **Increase Database Connection Pool**
   ```python
   # backend/models.py
   pool_size=30  # Increase from default 20
   max_overflow=20
   ```

3. **Implement API Rate Limiting**
   ```bash
   RATE_LIMIT_WRITE=20/min
   RATE_LIMIT_READ=100/min
   ```

4. **Enable Response Compression**
   ```nginx
   # docker/nginx.conf
   gzip on;
   gzip_min_length 1024;
   ```

---

## 📞 Escalation Procedure

### Alert Levels

| Level | Action | Timeframe | Owner |
|-------|--------|-----------|-------|
| **Critical** | Page on-call immediately | < 5 min | DevOps/SRE |
| **Warning** | Investigate within 1 hour | < 1 hr | Backend Team |
| **Info** | Review in daily standup | < 24 hr | Team |

### Escalation Path

```
Alert Triggered (AlertManager)
        ↓
Slack #monitoring notification
        ↓
If no action → Escalate to critical channel
        ↓
If still no action → Page on-call (PagerDuty)
        ↓
On-call investigates and resolves
```

---

## 🔍 Troubleshooting Monitoring

### Prometheus Not Collecting Metrics

```bash
# Check if targets are accessible
curl http://localhost:8000/metrics

# Check Prometheus status
docker logs prometheus

# Verify config syntax
docker exec prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Grafana Dashboards Missing Data

```bash
# Check if Prometheus data source is configured
# Login to Grafana → Configuration → Data Sources

# Verify metrics available in Prometheus
# Go to http://localhost:9091 → Status → Targets
```

### High Alert Volume (False Positives)

1. Check threshold settings are realistic
2. Increase `for:` duration to reduce noise
3. Add label conditions to scope alerts
4. Test thresholds against historical data

---

## 📊 Maintenance

### Monthly Maintenance

- [ ] Review and adjust alert thresholds
- [ ] Archive old metrics data (keep 30 days)
- [ ] Update dashboard descriptions
- [ ] Test disaster recovery with monitoring

### Quarterly Review

- [ ] Analyze monitoring cost vs. value
- [ ] Review SLA compliance against metrics
- [ ] Plan capacity expansion if needed
- [ ] Update runbooks with new alert procedures

---

**🎯 Goal**: Comprehensive production monitoring with proactive alerting  
**📊 Status**: Configuration templates ready to deploy  
**⏱️ Timeline**: Deploy monitoring stack by Week 1 Day 3 (Feb 1)

