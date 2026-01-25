# Native Mode Monitoring Guide

## Current Limitation

The full monitoring stack (Prometheus, Grafana, Loki, AlertManager) **requires Docker** and is not available in native development mode.

### Why?

The monitoring services are containerized applications:

- **Prometheus** - Metrics database
- **Grafana** - Visualization platform
- **Loki** - Log aggregation
- **AlertManager** - Alert routing
- **Node Exporter** - System metrics
- **cAdvisor** - Container metrics

These are distributed as Docker images and don't have simple native installations.

---

## Native Mode Options

When running native development with `NATIVE.ps1`, you have several alternatives:

### Option 1: Metrics Endpoint Only (Lightweight) ✅

**What you get:**

- ✅ Application metrics at <http://localhost:8000/metrics>
- ✅ Prometheus-compatible format
- ✅ No additional infrastructure needed

**How to use:**

1. **Start backend in native mode:**

   ```powershell
   .\NATIVE.ps1 -Backend
   ```

2. **Ensure metrics are enabled:**

   ```powershell
   # In backend/.env or environment variable
   $env:ENABLE_METRICS="1"
   ```

3. **Access metrics:**

   ```powershell
   # View in browser
   Start-Process http://localhost:8000/metrics

   # Or with curl
   curl http://localhost:8000/metrics
   ```

**Sample output:**

```text
# HELP sms_http_requests_total Total number of HTTP requests

# TYPE sms_http_requests_total counter
sms_http_requests_total{handler="/api/v1/students",method="GET",status="200"} 42.0

# HELP sms_students_total Total number of students in the system

# TYPE sms_students_total gauge
sms_students_total{status="active"} 150.0

# HELP sms_http_request_duration_seconds Duration of HTTP requests in seconds

# TYPE sms_http_request_duration_seconds histogram
sms_http_request_duration_seconds_bucket{le="0.01"} 1234.0

```text
**Use cases:**

- Quick debugging
- Performance profiling
- CI/CD health checks
- Integration testing

---

### Option 2: Hybrid Mode (Recommended) ✅

**What you get:**

- ✅ Native backend + frontend (fast development)
- ✅ Full monitoring stack in Docker
- ✅ Best of both worlds

**How to use:**

1. **Start native services:**

   ```powershell
   .\NATIVE.ps1 -Start
   ```

2. **Start monitoring stack separately:**

   ```powershell
   docker-compose -f docker/docker-compose.monitoring.yml up -d
   ```

3. **Access everything:**

   - Backend: <http://localhost:8000> (native)
   - Frontend: <http://localhost:5173> (native)
   - Grafana: <http://localhost:3000> (Docker)
   - Prometheus: <http://localhost:9090> (Docker)

**Benefits:**

- Fast backend/frontend reloads
- Full monitoring capabilities
- Prometheus scrapes native backend metrics

**Network configuration:**

```yaml
# docker-compose.monitoring.yml already configured for this

prometheus:
  extra_hosts:
    - "host.docker.internal:host-gateway"

# Scrapes from host machine

scrape_configs:
  - job_name: 'sms-backend'

    static_configs:
      - targets: ['host.docker.internal:8000']

```text
---

### Option 3: Local Prometheus Installation (Advanced)

**For Windows power users who want native monitoring:**

#### Install Prometheus

1. **Download Prometheus:**

   ```powershell
   # Download from https://prometheus.io/download/
   # Or use Chocolatey
   choco install prometheus
   ```

2. **Create config:**

   ```yaml
   # prometheus.yml
   global:
     scrape_interval: 15s

   scrape_configs:

     - job_name: 'sms-backend'

       static_configs:

         - targets: ['localhost:8000']

   ```

3. **Run Prometheus:**

   ```powershell
   prometheus --config.file=prometheus.yml
   ```

4. **Access UI:**
   <http://localhost:9090>

#### Install Grafana (Optional)

1. **Download Grafana:**

   ```powershell
   # Download from https://grafana.com/grafana/download
   # Or use Chocolatey
   choco install grafana
   ```

2. **Start Grafana:**

   ```powershell
   grafana-server
   ```

3. **Access UI:**
   <http://localhost:3000> (admin/admin)

4. **Add Prometheus datasource:**

   - URL: <http://localhost:9090>
   - Save & Test

**Pros:**

- ✅ No Docker required
- ✅ Native performance

**Cons:**

- ❌ Manual installation
- ❌ No Loki (logs)
- ❌ No AlertManager
- ❌ Harder to maintain

---

### Option 4: Development Logging (Simplest)

**What you get:**

- ✅ Detailed console logs
- ✅ Request/response logging
- ✅ Error tracking
- ✅ No infrastructure needed

**How to use:**

1. **Enable debug logging:**

   ```powershell
   # In backend/.env
   LOG_LEVEL=DEBUG
   ```

2. **Start backend with logging:**

   ```powershell
   backend\.venv\Scripts\python -m uvicorn backend.main:app --reload --log-level debug
   ```

3. **View logs in real-time:**

   ```powershell
   # Logs output to console
   # Also saved to backend/logs/ directory
   ```

**Benefits:**

- Immediate feedback
- No setup required
- Good for local development

---

## Comparison Table

| Feature | Metrics Only | Hybrid Mode | Local Install | Dev Logging |
|---------|-------------|-------------|---------------|-------------|
| **Setup Time** | 0 min | 2 min | 30 min | 0 min |
| **Metrics** | ✅ Raw | ✅ Dashboards | ✅ Dashboards | ❌ |
| **Logs** | ❌ | ✅ Aggregated | ❌ | ✅ Console |
| **Alerts** | ❌ | ✅ | ❌ | ❌ |
| **Resource Usage** | Low | Medium | Low | Low |
| **Docker Required** | ❌ | ✅ (monitoring) | ❌ | ❌ |
| **Best For** | Testing | Development | Power users | Quick debug |

---

## Recommended Workflows

### For Daily Development

```powershell
# Option 1: Native only (fastest)

.\NATIVE.ps1 -Start

# Check metrics manually when needed

curl http://localhost:8000/metrics

```text
### For Feature Development

```powershell
# Option 2: Hybrid mode

.\NATIVE.ps1 -Start

# Start monitoring

docker-compose -f docker/docker-compose.monitoring.yml up -d

# Open Grafana

Start-Process http://localhost:3000

```text
### For Production-Like Testing

```powershell
# Full Docker stack with monitoring

.\DOCKER.ps1 -WithMonitoring

```text
---

## Accessing Metrics in Native Mode

### Python Script to Query Metrics

```python
# scripts/dev/check-metrics.py

import requests
import json

def get_metrics():
    """Fetch and parse Prometheus metrics"""
    response = requests.get('http://localhost:8000/metrics')

    for line in response.text.split('\n'):
        if line and not line.startswith('#'):
            print(line)

def get_student_count():
    """Get current student count from metrics"""
    response = requests.get('http://localhost:8000/metrics')

    for line in response.text.split('\n'):
        if 'sms_students_total{status="active"}' in line:
            count = line.split()[-1]
            print(f"Active students: {count}")
            return float(count)

if __name__ == '__main__':
    get_metrics()

```text
Usage:

```powershell
python scripts/dev/check-metrics.py

```text
### PowerShell Script to Monitor

```powershell
# scripts/dev/watch-metrics.ps1

while ($true) {
    Clear-Host
    Write-Host "=== SMS Metrics ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
    Write-Host ""

    $metrics = Invoke-WebRequest http://localhost:8000/metrics -UseBasicParsing

    # Parse and display key metrics
    $metrics.Content -split "`n" | Where-Object {
        $_ -match "sms_students_total|sms_http_requests_total|sms_auth_attempts"
    } | ForEach-Object {
        Write-Host $_
    }

    Start-Sleep -Seconds 5
}

```text
Usage:

```powershell
.\scripts\dev\watch-metrics.ps1

```text
---

## Native Mode + Monitoring: Step-by-Step

### Complete Setup (Hybrid Mode)

**Step 1: Setup native dependencies**

```powershell
.\NATIVE.ps1 -Setup

```text
**Step 2: Enable metrics**

```powershell
# In backend/.env

ENABLE_METRICS=1

```text
**Step 3: Start backend**

```powershell
cd backend
.\.venv\Scripts\python -m uvicorn backend.main:app --reload --host 0.0.0.0

```text
**Step 4: Start frontend** (separate terminal)

```powershell
cd frontend
npm run dev

```text
**Step 5: Start monitoring** (requires Docker)

```powershell
docker-compose -f docker-compose.monitoring.yml up -d

```text
**Step 6: Verify**

- Backend: <http://localhost:8000>
- Frontend: <http://localhost:5173>
- Metrics: <http://localhost:8000/metrics>
- Grafana: <http://localhost:3000>
- Prometheus: <http://localhost:9090>

**Step 7: View in Grafana**

1. Login to <http://localhost:3000> (admin/admin)
2. Go to Dashboards → SMS Overview
3. See live metrics from your native backend!

---

## Troubleshooting

### Prometheus can't scrape native backend

**Problem:** Prometheus in Docker can't reach `localhost:8000`

**Solution 1 (Windows/Mac):**

```yaml
# In docker-compose.monitoring.yml

# Already configured!
extra_hosts:
  - "host.docker.internal:host-gateway"

# Prometheus config uses:

targets: ['host.docker.internal:8000']

```text
**Solution 2 (Linux):**

```yaml
# Use host network mode

network_mode: "host"

```text
**Solution 3 (Manual):**
Find host IP and use that:

```powershell
# Get host IP

ipconfig | Select-String "IPv4"

# Update prometheus.yml

targets: ['192.168.1.100:8000']  # Your IP

```text
### Metrics not showing in Grafana

**Check 1: Backend is running**

```powershell
curl http://localhost:8000/health

```text
**Check 2: Metrics endpoint works**

```powershell
curl http://localhost:8000/metrics

```text
**Check 3: Prometheus is scraping**

- Open <http://localhost:9090/targets>
- Check `sms-backend` status
- Should show "UP"

**Check 4: ENABLE_METRICS is set**

```powershell
# In backend, check environment

python -c "import os; print(os.getenv('ENABLE_METRICS', 'not set'))"

```text
### High resource usage

**Problem:** Docker monitoring stack uses too much RAM

**Solution:** Stop monitoring when not needed

```powershell
docker-compose -f docker-compose.monitoring.yml down

```text
**Alternative:** Use metrics endpoint only (no Docker)

---

## Future Enhancements

### Potential Native Monitoring Tools

**Option 1: Prometheus Windows Exporter**

- Native system metrics
- Lightweight
- No Docker required

**Option 2: Netdata**

- Real-time monitoring
- Beautiful UI
- Native installation available

**Option 3: Custom Dashboard**

- Simple React dashboard
- Polls /metrics endpoint
- Displays in browser

**Option 4: VS Code Extension**

- Monitor metrics in editor
- Real-time alerts
- Integrated debugging

---

## Summary

### Native Mode Monitoring Options

| Approach | Effort | Features | Recommendation |
|----------|--------|----------|----------------|
| **Metrics Only** | None | Basic | ✅ Quick development |
| **Hybrid Mode** | Low | Full | ✅ **Recommended** |
| **Local Install** | High | Full | Advanced users only |
| **Dev Logging** | None | Logs only | Debugging |

### Best Practice

**For development:**

```powershell
# Native backend + frontend (fast reloads)

.\NATIVE.ps1 -Start

# Add monitoring when needed (Docker)

docker-compose -f docker/docker-compose.monitoring.yml up -d

```text
**For production-like:**

```powershell
# Everything in Docker

.\DOCKER.ps1 -WithMonitoring

```text
---

## Quick Reference

```powershell
# Native mode setup

.\NATIVE.ps1 -Setup

# Start native mode

.\NATIVE.ps1 -Start

# Enable metrics

$env:ENABLE_METRICS="1"

# Check metrics

curl http://localhost:8000/metrics

# Add monitoring (Docker)

docker-compose -f docker/docker-compose.monitoring.yml up -d

# Access Grafana

Start-Process http://localhost:3000

# Stop monitoring

docker-compose -f docker-compose.monitoring.yml down

```text
---

**Conclusion:** While full native monitoring isn't available, the **hybrid mode** (native app + Docker monitoring) gives you the best development experience with full observability. 🚀

