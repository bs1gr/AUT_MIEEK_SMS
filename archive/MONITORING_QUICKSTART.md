# Monitoring Quick Start Guide

> **⚠️ Note:** Full monitoring stack **requires Docker**. For native development mode, see [Native Mode Monitoring](docs/development/NATIVE_MODE_MONITORING.md) for alternatives.

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Backend monitoring dependencies
cd backend
pip install -r requirements.txt
```

### Step 2: Start the Monitoring Stack

```bash
# From project root
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- ✅ Prometheus (metrics) - http://localhost:9090
- ✅ Grafana (dashboards) - http://localhost:3000
- ✅ Loki (logs) - http://localhost:3100
- ✅ AlertManager (alerts) - http://localhost:9093
- ✅ Node Exporter (system metrics)
- ✅ cAdvisor (container metrics)

### Step 3: Start Your Application

```bash
# Enable metrics in backend
$env:ENABLE_METRICS="1"  # PowerShell
# OR
export ENABLE_METRICS=1  # Bash

# Start backend
cd backend
python -m uvicorn main:app --reload
```

### Step 4: Access Monitoring

**Option 1: Integrated UI (Recommended)** 🆕
1. Open http://localhost:8080
2. Navigate to **Power** page (top navigation)
3. Scroll to **System Monitoring** section
4. View Grafana, Prometheus, and Metrics in tabs

**Option 2: Direct Access**
1. Open http://localhost:3000
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin`
3. Navigate to **Dashboards** → **Student Management System** → **Overview**

## 📊 What You'll See

### Grafana Dashboard

The overview dashboard shows:
- **API Status**: Is the API up?
- **Active Students**: Current number of students
- **Request Rate**: Requests per second
- **Response Time**: p50, p95, p99 latencies
- **Error Rate**: 4xx and 5xx errors
- **Database Performance**: Query times
- **Authentication**: Login success/failure

### Prometheus Metrics

View raw metrics at: http://localhost:8000/metrics

Example metrics:
```
# HTTP request rate
sms_http_requests_total 1234

# Response time (histogram)
sms_http_request_duration_seconds_bucket{le="0.1"} 567

# Active students
sms_students_total{status="active"} 42
```

### Logs in Loki

1. In Grafana, click "Explore" (compass icon)
2. Select "Loki" datasource
3. Enter query: `{job="sms-backend"}`
4. See logs in real-time!

## 🔔 Configure Alerts

### Email Notifications

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'  # Use App Password for Gmail
```

Then restart:
```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### Slack Notifications

1. Create Slack Incoming Webhook:
   - Go to https://api.slack.com/apps
   - Create app → Incoming Webhooks → Add New Webhook
   - Copy webhook URL

2. Update `monitoring/alertmanager/alertmanager.yml`:
   ```yaml
   global:
     slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
   ```

3. Restart AlertManager

## 🧪 Test Alerts

### Trigger a Test Alert

```bash
# Stop backend to trigger "APIDown" alert
# The alert will fire after 1 minute
docker-compose stop backend

# Wait 1-2 minutes, then check AlertManager
# http://localhost:9093

# Restart backend
docker-compose start backend
```

### Check Alert Status

- **Prometheus**: http://localhost:9090/alerts
- **AlertManager**: http://localhost:9093

## 📈 View Metrics

### Useful Queries

In Prometheus (http://localhost:9090) or Grafana:

**Request rate**:
```promql
rate(sms_http_requests_total[5m])
```

**95th percentile response time**:
```promql
histogram_quantile(0.95, rate(sms_http_request_duration_seconds_bucket[5m]))
```

**Error percentage**:
```promql
rate(sms_http_requests_total{status=~"5.."}[5m])
/
rate(sms_http_requests_total[5m]) * 100
```

**Active students**:
```promql
sms_students_total{status="active"}
```

## 🛠️ Troubleshooting

### "No data in Grafana"

**Check backend is exposing metrics**:
```bash
curl http://localhost:8000/metrics
```

**Check Prometheus is scraping**:
- Go to http://localhost:9090/targets
- Look for `sms-backend` target
- Status should be "UP"

### "Connection refused to host.docker.internal"

**Windows/Mac**: Should work automatically

**Linux**: Add to `docker-compose.monitoring.yml`:
```yaml
prometheus:
  extra_hosts:
    - "host.docker.internal:172.17.0.1"
```

Or run backend in Docker network:
```bash
docker network connect student-management-system_monitoring backend-container
```

### "Alerts not firing"

**Check alert rules**:
```bash
docker-compose -f docker-compose.monitoring.yml logs prometheus | grep -i alert
```

**Check AlertManager**:
```bash
curl http://localhost:9093/api/v1/alerts
```

## 🔄 Native Development Mode

**Running `SUPER_CLEAN_AND_DEPLOY.ps1 -SetupMode Native`?**

The full monitoring stack requires Docker. You have options:

### Option 1: Metrics Only (No Docker)
```powershell
# Start native mode
.\SUPER_CLEAN_AND_DEPLOY.ps1 -SetupMode Native -StartServices

# Metrics available at
curl http://localhost:8000/metrics
```

### Option 2: Hybrid Mode (Recommended)
```powershell
# Start native backend + frontend
.\SUPER_CLEAN_AND_DEPLOY.ps1 -SetupMode Native -StartServices

# Add Docker monitoring separately
docker-compose -f docker-compose.monitoring.yml up -d

# Native app + Full monitoring! 🎉
```

**See full guide:** [Native Mode Monitoring](docs/development/NATIVE_MODE_MONITORING.md)

---

## 🎯 Next Steps

1. **Read Full Guide**: [docs/operations/MONITORING.md](docs/operations/MONITORING.md)
2. **Native Mode Guide**: [docs/development/NATIVE_MODE_MONITORING.md](docs/development/NATIVE_MODE_MONITORING.md)
3. **Create Custom Dashboards**: Add panels in Grafana
4. **Set Up Production Alerts**: Configure PagerDuty/OpsGenie
5. **Enable HTTPS**: Use reverse proxy (nginx/traefik)
6. **Backup Dashboards**: Export from Grafana regularly

## 📚 More Resources

- **Monitoring Guide**: [docs/operations/MONITORING.md](docs/operations/MONITORING.md)
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Tutorials**: https://grafana.com/tutorials/
- **PromQL Guide**: https://prometheus.io/docs/prometheus/latest/querying/basics/

## 🆘 Need Help?

- Check logs: `docker-compose -f docker-compose.monitoring.yml logs`
- Review [docs/operations/MONITORING.md](docs/operations/MONITORING.md)
- Open an issue on GitHub

---

**You're all set! Your monitoring stack is running.** 🎉

Check Grafana at http://localhost:3000 to see your metrics!
