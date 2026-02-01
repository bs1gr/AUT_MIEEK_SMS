# Grafana Monitoring Dashboards Setup Guide

**Version**: 1.0
**Date**: January 31, 2026
**Purpose**: Configure production monitoring dashboards for SMS $11.17.6
**Target**: Days 3-5 operations training and go-live

---

## 🎯 Dashboard Overview

This guide covers setup of 4 production-grade Grafana dashboards for comprehensive SMS monitoring:

1. **System Health Dashboard** - Infrastructure health and resource usage
2. **Application Performance Dashboard** - API response times and throughput
3. **Student System Usage Dashboard** - User activity and engagement metrics
4. **Error Rate and Troubleshooting Dashboard** - Errors, logs, and debugging

---

## 📊 Dashboard 1: System Health Dashboard

### Purpose
Monitor infrastructure health: CPU, memory, disk, database connectivity, services status.

### Key Metrics
- **CPU Usage** (%)
  - Source: Node-Exporter (node_cpu_seconds_total)
  - Threshold: Warning >70%, Critical >90%
  - Interval: Every 30 seconds

- **Memory Usage** (%)
  - Source: Node-Exporter (node_memory_MemAvailable_bytes, node_memory_MemTotal_bytes)
  - Threshold: Warning >80%, Critical >95%
  - Interval: Every 30 seconds

- **Disk Usage** (%)
  - Source: Node-Exporter (node_filesystem_avail_bytes, node_filesystem_size_bytes)
  - Threshold: Warning >75%, Critical >90%
  - Interval: Every 1 minute

- **PostgreSQL Connection Pool**
  - Source: Application metrics (pg_pool_available_connections, pg_pool_connections_used)
  - Threshold: Warning >80% used, Critical >95% used
  - Interval: Every 1 minute

- **Database Query Time** (p95, p99)
  - Source: Prometheus (query_duration_seconds)
  - Threshold: Warning >500ms, Critical >1000ms
  - Interval: Every 30 seconds

- **Redis Cache Health**
  - Source: Redis-Exporter (redis_up, redis_connected_clients)
  - Status: Up/Down indicator
  - Threshold: Alert if down
  - Interval: Every 30 seconds

- **Container Status**
  - Source: cAdvisor (container_up)
  - Status: All 7 services (backend, postgres, redis, prometheus, grafana, loki, alertmanager)
  - Threshold: Alert if any service down
  - Interval: Every 1 minute

### Panels Layout
```
Row 1: CPU Usage | Memory Usage | Disk Usage
Row 2: PostgreSQL Pool | Redis Health | Uptime
Row 3: Database Query Time (p95, p99)
Row 4: Container Status Table
```

### Alert Rules
1. **CPU Critical**: `node_cpu_seconds_total > 90%` for 5 minutes
2. **Memory Critical**: Memory usage > 95% for 5 minutes
3. **Disk Warning**: Disk usage > 75% for 10 minutes
4. **Database Down**: `postgresql_up == 0` for 1 minute
5. **Redis Down**: `redis_up == 0` for 1 minute
6. **Service Down**: Any container state `!= running` for 2 minutes

---

## 📊 Dashboard 2: Application Performance Dashboard

### Purpose
Monitor API performance, response times, throughput, and user experience metrics.

### Key Metrics

- **Request Rate** (requests/second)
  - Source: Prometheus (http_requests_total)
  - Display: Rate over 5 minutes
  - Interval: Every 30 seconds

- **Response Time Distribution** (p50, p95, p99)
  - Source: Prometheus (http_request_duration_seconds_bucket)
  - Targets: All endpoints, Top 10 endpoints
  - Threshold: Warning p95 >500ms, Critical >1000ms
  - Interval: Every 30 seconds

- **Endpoint Performance Table**
  - Source: Prometheus (top 20 endpoints by response time)
  - Columns: Endpoint, Count, Avg, p95, p99, Error Rate
  - Sort: By p95 descending
  - Interval: Every 1 minute

- **Error Rate** (%)
  - Source: Prometheus (http_requests_total{status=~"5.."})
  - Display: Total errors, Error rate %, Top error status codes
  - Threshold: Warning >1%, Critical >5%
  - Interval: Every 1 minute

- **Throughput by Endpoint**
  - Source: Prometheus (requests by endpoint path)
  - Display: Top 10 endpoints by request count
  - Interval: Every 1 minute

- **Status Code Distribution**
  - Source: Prometheus (http_requests_total grouped by status)
  - Display: Pie chart (2xx, 3xx, 4xx, 5xx)
  - Interval: Every 1 minute

- **Active Connections**
  - Source: Prometheus (active_http_connections)
  - Display: Current value, trend over 1 hour
  - Interval: Every 30 seconds

- **Cache Hit Rate** (%)
  - Source: Application metrics (cache_hits, cache_misses)
  - Display: Overall hit rate, by cache section
  - Interval: Every 1 minute

### Panels Layout
```
Row 1: Request Rate | Error Rate | Throughput
Row 2: Response Time Distribution (p50, p95, p99)
Row 3: Endpoint Performance Table
Row 4: Status Code Distribution | Active Connections
Row 5: Cache Hit Rate | Top 10 Endpoints by Traffic
```

### Alert Rules
1. **High Error Rate**: Error rate > 5% for 5 minutes
2. **Slow Endpoint**: p95 response time > 1000ms for 5 minutes
3. **High Latency**: Average response time > 500ms for 10 minutes
4. **Service Overload**: Active connections > 1000 for 5 minutes
5. **Error Spike**: Errors/minute increase > 200% in 1 minute

---

## 📊 Dashboard 3: Student System Usage Dashboard

### Purpose
Monitor user activity and engagement: login frequency, active users, feature usage, peak hours.

### Key Metrics

- **Active Users (Real-time)**
  - Source: Application logs/audit trail (distinct user_ids in last 5 minutes)
  - Display: Current count, comparison to baseline
  - Interval: Every 1 minute

- **Daily Active Users (DAU)**
  - Source: Application logs (distinct users per day)
  - Display: Line chart, last 30 days
  - Interval: Daily at midnight

- **Login Success Rate** (%)
  - Source: Application logs (successful vs failed logins)
  - Display: Last 24 hours as gauge
  - Threshold: Warning <95%, Critical <90%
  - Interval: Every 1 minute

- **Peak Usage Hours**
  - Source: Request rate by hour
  - Display: Heatmap or line chart (requests by hour of day)
  - Identifies: Peak hours, off-peak times
  - Interval: Every 1 minute

- **Feature Usage** (% of active sessions)
  - Source: Application metrics
  - Features tracked: Grades view, Attendance view, Course view, Analytics, Settings
  - Display: Pie chart or bar chart
  - Interval: Every 5 minutes

- **Page Load Times** (student perspectives)
  - Source: Frontend metrics (core web vitals)
  - Metrics: First Contentful Paint (FCP), Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS)
  - Display: Gauge (green <2s, yellow 2-4s, red >4s)
  - Interval: Every 1 minute

- **Student Login Trends**
  - Source: Application logs (distinct usernames)
  - Display: Line chart over 7 days
  - Interval: Every 1 hour

- **Geographic/Device Distribution** (if available)
  - Source: Application logs (device types, browsers)
  - Display: Pie chart (web, mobile, tablet), browser versions
  - Interval: Every 1 hour

### Panels Layout
```
Row 1: Active Users | DAU | Login Success Rate
Row 2: Peak Usage Hours Heatmap
Row 3: Feature Usage Pie Chart
Row 4: Page Load Times | Student Login Trends
```

### Alert Rules
1. **Login Failure Spike**: Failed logins > 10% for 5 minutes
2. **System Unresponsive**: No user activity for 5 minutes (p95 >5 minutes)
3. **High Load**: DAU > 200 concurrent users
4. **Slow Page Loads**: LCP > 4 seconds for 10 minutes

---

## 📊 Dashboard 4: Error Rate and Troubleshooting Dashboard

### Purpose
Identify issues quickly: error logs, debugging data, failed transactions, suspicious patterns.

### Key Metrics

- **Error Rate by Severity**
  - Source: Application logs (ERROR, WARN, INFO levels)
  - Display: Stacked bar chart (count by severity level)
  - Threshold: Warning >50 errors/min, Critical >100/min
  - Interval: Every 1 minute

- **Top 10 Error Messages**
  - Source: Application error logs
  - Display: Table (error message, count, last occurrence, affected users)
  - Sort: By count descending
  - Interval: Every 1 minute

- **Database Errors**
  - Source: Application logs (db.errors)
  - Display: Connection errors, query timeouts, constraint violations
  - Interval: Every 1 minute

- **Authentication Failures**
  - Source: Application logs (auth.failures)
  - Display: Failed logins, invalid tokens, permission denied
  - Interval: Every 1 minute

- **Request Errors by Endpoint**
  - Source: Prometheus (http_requests_total{status=~"5.."} by path)
  - Display: Table (endpoint, error count, last error time)
  - Interval: Every 1 minute

- **Exception Stack Traces**
  - Source: Loki logs (search by exception type)
  - Display: Recent exceptions (last 50)
  - Drill-down: Click to view full stack trace
  - Interval: Real-time

- **System Anomalies**
  - Source: Loki alerts
  - Display: Memory leaks, connection pool exhaustion, resource limits
  - Interval: Every 5 minutes

- **Slow Query Log**
  - Source: PostgreSQL slow query log (via Loki)
  - Display: Query, duration, count
  - Threshold: >1000ms
  - Interval: Every 1 minute

### Panels Layout
```
Row 1: Error Rate by Severity | Top 10 Error Messages
Row 2: Database Errors | Authentication Failures
Row 3: Request Errors by Endpoint
Row 4: Exception Stack Traces (latest 50)
Row 5: System Anomalies | Slow Query Log
```

### Alert Rules
1. **High Error Rate**: Errors/minute > 50 for 5 minutes
2. **Database Connection Errors**: > 10 in 5 minutes
3. **Auth Failures**: > 20 failed logins in 1 minute (possible attack)
4. **Memory Leak**: Memory trending up > 90% for 30 minutes
5. **Slow Query**: Query duration > 1000ms, repeated 5+ times
6. **Service Error**: 5xx errors > 1% for 5 minutes

---

## 🔧 Provisioning Setup

### Option 1: Manual Dashboard Creation

1. **Login to Grafana** (port 3000)
   - URL: http://localhost:3000
   - Default: admin/admin (change immediately!)

2. **Create Data Source**
   - Click Configuration → Data Sources
   - Add Prometheus: http://prometheus:9090
   - Add Loki: http://loki:3100
   - Test connection

3. **Create Dashboards**
   - Click + → Dashboard
   - Add panels for each metric
   - Set alerts and thresholds
   - Save with appropriate name

4. **Import Dashboard JSON**
   - Click + → Import
   - Upload provided JSON files
   - Select Prometheus/Loki data sources

### Option 2: Automated Provisioning (Recommended)

Create `monitoring/grafana/provisioning/dashboards/dashboards.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'SMS Dashboards'
    orgId: 1
    folder: 'Production'
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

Create dashboard JSON files in:
```
monitoring/grafana/provisioning/dashboards/
├── system-health.json
├── app-performance.json
├── student-usage.json
└── troubleshooting.json
```

Grafana automatically loads dashboards on startup.

---

## 🚀 Deployment Instructions

### Step 1: Enable Monitoring Stack

```bash
cd docker
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Step 2: Verify Services

```bash
# Check all monitoring services running
docker ps --filter "label=com.sms.component=monitoring"
```

### Step 3: Access Grafana

- URL: http://localhost:3000
- Default credentials: admin/admin
- **IMMEDIATELY change password!**

### Step 4: Configure Data Sources

1. Navigate to Configuration → Data Sources
2. Add Prometheus: `http://prometheus:9090`
3. Add Loki: `http://loki:3100`
4. Test connections

### Step 5: Import Dashboards

```bash
# Option A: Manual import via UI
# - Click + → Import
# - Upload JSON files from monitoring/grafana/provisioning/dashboards/

# Option B: Automated provisioning
# - Deploy docker-compose with provisioning volume mounted
# - Dashboards load automatically
```

### Step 6: Configure Alerts

1. Set up notification channels (Email, Slack, Teams)
2. Create alert rules from each dashboard
3. Set thresholds appropriate for production

### Step 7: Verify Dashboards

- System Health: Check CPU, Memory, Disk
- App Performance: Check request rate, response times
- Student Usage: Check active users
- Troubleshooting: Check error logs

---

## 📋 Quick Reference

### Common Queries

**Request Rate (last 5 minutes)**:
```promql
rate(http_requests_total[5m])
```

**Response Time p95**:
```promql
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

**Error Rate**:
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

**Active Connections**:
```promql
rate(http_connections_opened_total[1m]) - rate(http_connections_closed_total[1m])
```

**Database Query Time p99**:
```promql
histogram_quantile(0.99, postgresql_query_duration_seconds_bucket)
```

### Dashboard Performance Tips

- **Refresh Rate**: Use 30s-1m for production (not faster)
- **Time Range**: Default 1-6 hours (avoid 30+ days)
- **Query Optimization**: Use aggregation (rate, increase, histograms)
- **Alert Thresholds**: Conservative (avoid false positives)
- **Color Schemes**: Green (good), Yellow (warning), Red (critical)

---

## 🎓 Training Materials

For operators/admins, create training on:
1. How to interpret each dashboard
2. What each alert means
3. Escalation procedures
4. How to drill down on issues
5. Creating custom dashboards

Covered in [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)

---

## 📞 Support

For issues:
- Check Grafana logs: `docker logs sms-grafana`
- Check Prometheus scrape targets: http://prometheus:9090/targets
- Check Loki datasource: http://loki:3100/api/prom/labels
- Contact: support@studentmanagement.local

---

**Created**: January 31, 2026
**Last Updated**: January 31, 2026
**Version**: 1.0 - Production Ready
