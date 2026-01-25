# Monitoring & Alerting Guide

## Overview

The Student Management System includes a comprehensive monitoring and alerting stack built on industry-standard tools:

- **Prometheus**: Metrics collection and time-series database
- **Grafana**: Visualization and dashboard platform
- **Loki**: Log aggregation system
- **Promtail**: Log shipping agent
- **AlertManager**: Alert routing and notification management
- **Node Exporter**: System-level metrics
- **cAdvisor**: Container metrics

## Quick Start

### Starting the Monitoring Stack

```bash
# Start monitoring stack only

docker-compose -f docker/docker-compose.monitoring.yml up -d

# Start with main application

docker-compose -f docker/docker-compose.yml -f docker/docker-compose.monitoring.yml up -d

```text
### Accessing Services

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Grafana | <http://localhost:3000> | admin / admin |
| Prometheus | <http://localhost:9090> | N/A |
| AlertManager | <http://localhost:9093> | N/A |
| Loki | <http://localhost:3100> | N/A |

### First-Time Setup

1. **Change Grafana Password**

   ```bash
   # Login to Grafana at http://localhost:3000
   # Navigate to: Profile > Change Password
   ```

2. **Configure Email Alerts**
   - Edit `monitoring/alertmanager/alertmanager.yml`
   - Update SMTP settings:

     ```yaml
     smtp_smarthost: 'your-smtp-server:587'
     smtp_from: 'alerts@yourdomain.com'
     smtp_auth_username: 'your-email@yourdomain.com'
     smtp_auth_password: 'your-password'
     ```

3. **Configure Slack Notifications** (Optional)
   - Get Slack webhook URL from Slack App settings
   - Update `monitoring/alertmanager/alertmanager.yml`:

     ```yaml
     slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
     ```

4. **Restart AlertManager**

   ```bash
   docker-compose -f docker-compose.monitoring.yml restart alertmanager
   ```

## Architecture

### Metrics Flow

```text
Application (FastAPI)
    │
    └─> Exposes /metrics endpoint
            │
            └─> Prometheus scrapes metrics (every 15s)
                    │
                    ├─> Stores in time-series database
                    ├─> Evaluates alert rules
                    │   │
                    │   └─> Sends alerts to AlertManager
                    │           │
                    │           └─> Routes to Email/Slack/PagerDuty
                    │
                    └─> Grafana queries for dashboards

```text
### Logs Flow

```text
Application Logs
    │
    ├─> Backend logs (logs/*.log)
    │
    └─> Promtail collects logs
            │
            └─> Ships to Loki
                    │
                    ├─> Stores in log database
                    │
                    └─> Grafana queries for log exploration

```text
## Available Metrics

### HTTP Metrics

- `sms_http_requests_total` - Total HTTP requests by endpoint, method, status
- `sms_http_request_duration_seconds` - Request latency histogram
- `sms_http_request_size_bytes` - Request size distribution
- `sms_http_response_size_bytes` - Response size distribution
- `sms_http_requests_inprogress` - Current in-flight requests
- `sms_api_slow_requests_total` - Requests taking >1 second

### Business Metrics

- `sms_students_total{status="active|inactive"}` - Total students
- `sms_courses_total{semester="..."}` - Total courses per semester
- `sms_enrollments_total` - Active enrollments
- `sms_grades_total{course="...", grade_type="..."}` - Grades recorded
- `sms_attendance_total{status="present|absent|late|excused"}` - Attendance records

### Database Metrics

- `sms_db_query_duration_seconds{operation="select|insert|update|delete"}` - Query performance
- `sms_db_errors_total{error_type="..."}` - Database errors
- `sms_db_connections_active` - Active database connections

### Authentication Metrics

- `sms_auth_attempts_total{status="success|failed|locked"}` - Login attempts
- `sms_auth_active_sessions` - Current active sessions

### Cache Metrics

- `sms_cache_hits_total{cache_type="..."}` - Cache hits
- `sms_cache_misses_total{cache_type="..."}` - Cache misses

### Rate Limiting Metrics

- `sms_rate_limit_exceeded_total{endpoint="...", limit_type="..."}` - Rate limit violations

### Error Metrics

- `sms_errors_total{error_type="...", endpoint="..."}` - Application errors

## Dashboards

### SMS Overview Dashboard

**Location**: Grafana > Dashboards > Student Management System > Overview

**Panels**:

- API Status (UP/DOWN)
- Total Active Students
- Active Enrollments
- Request Rate
- HTTP Request Rate by Endpoint
- Response Time Percentiles (p50, p95, p99)
- Error Rate (4xx, 5xx)
- Database Query Performance
- Student Distribution
- Authentication Success/Failure
- Cache Hit Rate

### Creating Custom Dashboards

1. Navigate to Grafana
2. Click "+" → "Dashboard"
3. Add Panel
4. Select Prometheus datasource
5. Enter PromQL query:

   ```promql
   # Example: Request rate by endpoint
   rate(sms_http_requests_total[5m])

   # Example: 95th percentile response time
   histogram_quantile(0.95, rate(sms_http_request_duration_seconds_bucket[5m]))

   # Example: Error percentage
   rate(sms_http_requests_total{status=~"5.."}[5m])
   /
   rate(sms_http_requests_total[5m]) * 100
   ```

## Alert Rules

### Critical Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **APIDown** | API unreachable for 1 minute | Check backend logs, restart service |
| **HighErrorRate** | >5% error rate for 5 minutes | Review application logs |
| **DatabaseConnectionsFailed** | 10+ DB errors in 5 minutes | Check database connectivity |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **HighResponseTime** | p95 > 2s for 10 minutes | Check for slow queries |
| **HighRequestRate** | >100 req/s for 5 minutes | Monitor for DDoS |
| **RateLimitExceeded** | >5 violations/s for 5 minutes | Review rate limit logs |
| **SlowDatabaseQueries** | p95 query time > 1s for 10 minutes | Review indexes |
| **AuthenticationFailureSpike** | >10 failed logins/s | Check for brute force |

### Info Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **HighMemoryUsage** | >1GB memory for 15 minutes | Monitor for leaks |
| **LowCacheHitRate** | <50% cache hits for 15 minutes | Review cache config |
| **HighNumberOfSlowRequests** | >1 slow request/s for 10 minutes | Optimize slow endpoints |

## Querying Metrics

### Useful PromQL Queries

**Request Rate**:

```promql
# Total request rate

rate(sms_http_requests_total[5m])

# Request rate by endpoint

sum by (handler) (rate(sms_http_requests_total[5m]))

```text
**Response Time**:

```promql
# 50th percentile (median)

histogram_quantile(0.50, rate(sms_http_request_duration_seconds_bucket[5m]))

# 95th percentile

histogram_quantile(0.95, rate(sms_http_request_duration_seconds_bucket[5m]))

# 99th percentile

histogram_quantile(0.99, rate(sms_http_request_duration_seconds_bucket[5m]))

```text
**Error Rate**:

```promql
# 4xx error rate

rate(sms_http_requests_total{status=~"4.."}[5m])

# 5xx error rate

rate(sms_http_requests_total{status=~"5.."}[5m])

# Error percentage

(
  rate(sms_http_requests_total{status=~"5.."}[5m])
  /
  rate(sms_http_requests_total[5m])
) * 100

```text
**Active Students**:

```promql
# Total active students

sms_students_total{status="active"}

# Change over time

rate(sms_students_total{status="active"}[1h])

```text
**Cache Performance**:

```promql
# Cache hit rate

(
  rate(sms_cache_hits_total[5m])
  /
  (rate(sms_cache_hits_total[5m]) + rate(sms_cache_misses_total[5m]))
) * 100

```text
## Querying Logs

### LogQL Basics

**View all backend logs**:

```logql
{job="sms-backend"}

```text
**Filter by log level**:

```logql
{job="sms-backend", level="ERROR"}

```text
**Search for specific text**:

```logql
{job="sms-backend"} |= "authentication failed"

```text
**Filter out noise**:

```logql
{job="sms-backend"} != "health check"

```text
**Extract and count errors**:

```logql
sum(count_over_time({job="sms-backend", level="ERROR"}[5m]))

```text
**Parse JSON logs**:

```logql
{job="sms-backend"} | json | line_format "{{.level}} {{.message}}"

```text
## Troubleshooting

### Monitoring Stack Not Starting

**Problem**: Docker containers fail to start

**Solutions**:

```bash
# Check logs

docker-compose -f docker-compose.monitoring.yml logs

# Check port conflicts

netstat -ano | findstr "3000 9090 9093 3100"

# Remove old volumes

docker-compose -f docker-compose.monitoring.yml down -v
docker-compose -f docker-compose.monitoring.yml up -d

```text
### No Metrics in Prometheus

**Problem**: Prometheus shows no data

**Solutions**:

1. Check if backend is exposing metrics:

   ```bash
   curl http://localhost:8000/metrics
   ```

2. Check Prometheus targets:
   - Navigate to <http://localhost:9090/targets>
   - Ensure `sms-backend` target is UP

3. Check Prometheus logs:

   ```bash
   docker-compose -f docker-compose.monitoring.yml logs prometheus
   ```

### No Logs in Loki

**Problem**: Logs not appearing in Grafana

**Solutions**:

1. Check if logs directory exists:

   ```bash
   ls logs/
   ```

2. Check Promtail status:

   ```bash
   docker-compose -f docker-compose.monitoring.yml logs promtail
   ```

3. Verify Loki endpoint:

   ```bash
   curl http://localhost:3100/ready
   ```

### Alerts Not Firing

**Problem**: Expected alerts not triggered

**Solutions**:

1. Check alert rules in Prometheus:
   - Navigate to <http://localhost:9090/alerts>
   - Verify rule syntax and evaluation

2. Check AlertManager status:

   ```bash
   curl http://localhost:9093/api/v1/alerts
   ```

3. Review AlertManager logs:

   ```bash
   docker-compose -f docker-compose.monitoring.yml logs alertmanager
   ```

### High Memory Usage

**Problem**: Monitoring stack consuming too much memory

**Solutions**:

```yaml
# In docker-compose.monitoring.yml, add memory limits:

services:
  prometheus:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

```text
## Performance Tuning

### Prometheus Retention

Adjust retention period in `docker-compose.monitoring.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=30d'  # Keep 30 days
  - '--storage.tsdb.retention.size=10GB'  # Max 10GB

```text
### Loki Retention

Edit `monitoring/loki/loki-config.yml`:

```yaml
limits_config:
  retention_period: 744h  # 31 days

```text
### Scrape Interval

Balance between granularity and load:

- **Default**: 15s (good for most cases)
- **High-traffic**: 30s (reduce load)
- **Detailed debugging**: 5s (temporary only)

Edit `monitoring/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

```text
## Security Best Practices

1. **Change Default Credentials**
   - Grafana admin password
   - SMTP credentials

2. **Enable Authentication**

   ```yaml
   # In monitoring/prometheus/prometheus.yml
   basic_auth:
     username: admin
     password: <bcrypt-hash>
   ```

3. **Use HTTPS**
   - Configure reverse proxy (nginx/traefik)
   - Terminate SSL at proxy

4. **Restrict Access**
   - Use firewall rules
   - Limit to internal network
   - Use VPN for remote access

5. **Secure Secrets**

   ```bash
   # Use environment variables
   export GRAFANA_ADMIN_PASSWORD=<strong-password>
   export SMTP_PASSWORD=<smtp-password>
   ```

## Backup & Recovery

### Backup Grafana Dashboards

```bash
# Export dashboards

curl -X GET http://admin:admin@localhost:3000/api/dashboards/db/sms-overview \
  > backup/sms-overview-$(date +%Y%m%d).json

```text
### Backup Prometheus Data

```bash
# Stop Prometheus

docker-compose -f docker-compose.monitoring.yml stop prometheus

# Backup data directory

tar -czf prometheus-backup-$(date +%Y%m%d).tar.gz \
  -C /var/lib/docker/volumes/student-management-system_prometheus-data/_data .

# Restart Prometheus

docker-compose -f docker-compose.monitoring.yml start prometheus

```text
### Restore from Backup

```bash
# Stop services

docker-compose -f docker-compose.monitoring.yml down

# Restore data

tar -xzf prometheus-backup-20250118.tar.gz \
  -C /var/lib/docker/volumes/student-management-system_prometheus-data/_data

# Restart services

docker-compose -f docker-compose.monitoring.yml up -d

```text
## Integration with CI/CD

### Health Checks in Deployment

```bash
# Check if metrics endpoint is responding

if ! curl -f http://localhost:8000/metrics > /dev/null 2>&1; then
    echo "ERROR: Metrics endpoint not responding"
    exit 1
fi

# Check Prometheus can scrape

if ! curl -f http://localhost:9090/api/v1/targets | grep '"health":"up"' > /dev/null; then
    echo "ERROR: Prometheus cannot scrape targets"
    exit 1
fi

```text
### Load Testing with Monitoring

```bash
# Run load test while monitoring metrics

docker run --rm --network host \
  grafana/k6 run \
  -u 100 \
  -d 5m \
  loadtest.js

# Watch metrics in real-time

watch -n 1 'curl -s http://localhost:9090/api/v1/query?query=rate(sms_http_requests_total[1m])'

```text
## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [LogQL Guide](https://grafana.com/docs/loki/latest/logql/)

## Support

For monitoring-related issues:

1. Check this documentation
2. Review service logs
3. Consult [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
4. Open an issue on GitHub
