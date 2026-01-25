# Monitoring Architecture (Deprecated - Use MONITORING.md)

> **⚠️ DEPRECATED**: This document is kept for historical reference. Use the canonical **[MONITORING.md](MONITORING.md)** for current monitoring operations and guidelines.
>
> Deprecation notice ($11.10.1): As of $11.10.1 the embedded Monitoring UI (Grafana/Prometheus/Raw Metrics) was removed from the application UI. The backend may still expose a /metrics endpoint when ENABLE_METRICS=1 and the external monitoring stack can still be operated via `DOCKER.ps1 -WithMonitoring` in Docker mode, but the React "Power" page no longer embeds monitoring dashboards. The content below describes the legacy design and is kept for historical/operator reference.
>
> **Note ($11.9.7+):** Legacy scripts (RUN.ps1, SMS.ps1) have been deprecated. Use `DOCKER.ps1` for all Docker operations and `NATIVE.ps1` for native development.

## Current Monitoring State ($11.9.7+)

- The React Power page now focuses on System Health + Control Panel toggles; there is no in-app button to start Grafana/Prometheus/Loki.
- Operators start the monitoring stack through host commands (`DOCKER.ps1 -WithMonitoring`, `docker compose -f docker/docker-compose.monitoring.yml up -d`) or via the host-only Control API (`/control/api/monitoring/start`).
- When running inside Docker, the `POST /control/api/monitoring/trigger` endpoint plus the watcher service still provide automatic host startup for custom dashboards or scripts.
- The `/metrics` endpoint remains available (when `ENABLE_METRICS=1`) for external collectors even if Grafana/Prometheus are managed elsewhere.

## Overview

Historically, the Student Management System included an embedded monitoring experience built on Prometheus, Grafana, and Loki. As of $11.9.7, this embedded UI was removed. Operators can still run the optional monitoring stack externally (Docker-only), and the Control API endpoints continue to exist for diagnostics. This document clarifies the legacy architecture and current deployment modes.

## ⚠️ Important: Docker-Only Feature

**Monitoring is designed for Docker mode only.** It is not integrated with native development mode.

## On-Demand Activation (Legacy)

Previously the monitoring stack was started eagerly when using legacy scripts with monitoring flags. During the v1.8.x refactor we introduced **on-demand** activation via the Power page (`/power`) and the Control API. As of $11.9.7 the Power page controls were retired, so operators now use the host-only Control API endpoints (listed below) or the PowerShell script `DOCKER.ps1 -WithMonitoring`. The table remains for historical reference and to document the still-supported API contract:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/control/api/monitoring/status` | GET | Returns availability & running state for Grafana, Prometheus, Loki |
| `/control/api/monitoring/start`  | POST | Starts monitoring stack (host only; refused inside container) |
| `/control/api/monitoring/stop`   | POST | Stops monitoring stack (host only) |

### Power Page Lazy Flow (Legacy ≤ $11.9.7)

1. User opens `/power` → UI calls `monitoring/status`.
2. If not running: tabs & external links (Grafana / Prometheus) remain hidden; a **Start Monitoring** button is shown.
3. Clicking **Start Monitoring** triggers `/monitoring/start`; a loading indicator is shown.
4. After stack becomes healthy, tabs are revealed and each iframe (Grafana dashboards, Prometheus explorer) is **lazy-loaded** only when first selected.
5. External links remain guarded—clicking them while stopped prompts to start the stack.

### Current Monitoring Modes

- **With Monitoring**: `DOCKER.ps1 -WithMonitoring` starts the application plus monitoring stack immediately.
- **Default**: `DOCKER.ps1 -Start` starts only the application.
- **API Control**: Direct calls to `/control/api/monitoring/start` for programmatic control.

**Note:** Separate monitoring-only mode has been deprecated. Use the `-WithMonitoring` flag or Control API.

### Benefits

- Lower initial resource footprint (no early allocation for Grafana/Prometheus/Loki).
- Faster cold start / update cycles.
- Explicit operator control (start only when needed for diagnostics).
- Clear UI feedback about stack state.

### Constraints

- Start/stop endpoints are blocked when executed from inside the application container for safety; use host PowerShell scripts if deep lifecycle control is required.
- Docker and `docker-compose.monitoring.yml` must be present and accessible on the host.
- Rate limiting protects against rapid repeated start/stop attempts.

### Security Considerations (Monitoring Control)

| Aspect | Current Behavior | Recommendation |
|--------|------------------|----------------|
| Auth for start/stop | Host-only execution; no token required | Keep endpoints behind loopback/VPN or reverse proxy auth in production |
| Abuse / rapid toggling | Heavy rate limit applied | Add future cooldown + audit logging to detect repeated churn |
| Compose file path | Fixed to `docker-compose.monitoring.yml` | Do not allow user-supplied paths |
| Sensitive data exposure | Status returns only booleans + URLs | Acceptable; avoid adding credentials/secrets to payloads |
| Grafana default credentials | `admin/admin` until changed | Change immediately; use provisioned users / SSO for production |
| Network exposure | Ports bound to localhost by default | Restrict exposure; consider firewall / proxy TLS termination |
| Future auth | Planned token header (similar to shutdown token) | Rotate token regularly; store in secret manager |

Hardening checklist (apply when moving beyond local use):

1. Change Grafana admin password & enable RBAC.
2. Restrict `/control/api/monitoring/*` to loopback or authenticated reverse proxy.
3. Add access logs for start/stop attempts.
4. Monitor frequency of lifecycle actions; alert on excessive toggling.
5. Avoid exposing Prometheus/Loki directly; route through Grafana or secured proxy.
6. Scrub PII from logs before Loki ingestion.
7. Plan rotation procedure for future `MONITORING_CONTROL_TOKEN` once implemented.

### Example Manual Invocation

```powershell
Invoke-RestMethod -Uri http://localhost:8080/control/api/monitoring/start -Method POST
Invoke-RestMethod -Uri http://localhost:8080/control/api/monitoring/status -Method GET | ConvertTo-Json -Depth 4

```text
Sample status payload when stopped:

```json
{
   "available": true,
   "running": false,
   "services": {
      "grafana": {"running": false, "url": "http://localhost:3000", "port": 3000},
      "prometheus": {"running": false, "url": "http://localhost:9090", "port": 9090},
      "loki": {"running": false, "url": "http://localhost:3100", "port": 3100}
   }
}

```text
## Deployment Modes

### 1. Docker Mode (Fullstack) - RECOMMENDED

**For End Users:**

```powershell
.\DOCKER.ps1 -WithMonitoring

```text
**Architecture:**

- Main App: `sms-app` container (port 8080:8000)
- Grafana: `sms-grafana` container (port 3000)
- Prometheus: `sms-prometheus` container (port 9090)
- Loki: `sms-loki` container (port 3100)
- cAdvisor: `sms-cadvisor` container (port 8081)

**Access Points:**

- **Power Page (legacy ≤ $11.9.7):** <http://localhost:8080/power> (embedded dashboards, removed in $11.9.7)
- **Grafana:** <http://localhost:3000> (admin/admin)
- **Prometheus:** <http://localhost:9090>
- **API Metrics:** <http://localhost:8080/metrics>
- **API Docs:** <http://localhost:8080/docs>

**How It Works:**

1. Backend exposes `/metrics` endpoint (Prometheus format)
2. Prometheus scrapes metrics via `host.docker.internal:8000`
3. Grafana visualizes metrics from Prometheus
4. Loki aggregates logs from Promtail
5. (Legacy) Power page embedded Grafana dashboards in iframes (system health + control panel only in $11.9.7+)

### 2. Docker Mode (Multi-container)

**For Developers:**

```powershell
# Native mode (no monitoring - monitoring is Docker-only)

.\NATIVE.ps1 -Start

# Docker mode with monitoring

.\DOCKER.ps1 -WithMonitoring

```text
**Architecture:**

- Backend: `sms-backend` container (port 8000)
- Frontend: `sms-frontend` container (port 8080)
- Monitoring: Same as fullstack mode

**Use Case:** Development with separate backend/frontend logs and hot-reload capability.

### 3. Native Mode (NO MONITORING)

**For Developers:**

```powershell
.\NATIVE.ps1 -Start

```text
**Architecture:**

- Backend: Uvicorn on localhost:8000
- Frontend: Vite dev server on localhost:5173
- **Monitoring: NOT INTEGRATED**

**Why No Monitoring:**

- Prometheus config targets `host.docker.internal:8000` (Docker-specific)
- Power page expects Grafana at localhost:3000 (not running)
- Native mode is for rapid development, not production monitoring

**Manual Monitoring in Native Mode (Advanced):**

If you really need monitoring while developing natively:

1. Start monitoring stack separately:

   ```powershell
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. Edit `monitoring/prometheus/prometheus.yml`:

   ```yaml
   - targets: ['host.docker.internal:8000']  # Change to: ['localhost:8000']

   ```

3. Access Grafana at <http://localhost:3000>

4. Power page will NOT work (served by backend which isn't in container)

## Components

### Prometheus (Metrics Collection)

**Purpose:** Scrapes and stores time-series metrics

**Scrape Targets:**

- `sms-backend`: Application metrics (/metrics endpoint)
- `node-exporter`: System metrics (CPU, memory, disk, network)
- `cadvisor`: Container metrics (Docker stats)
- `prometheus`: Self-monitoring
- `grafana`: Dashboard health
- `alertmanager`: Alert delivery status

**Configuration:** `monitoring/prometheus/prometheus.yml`

**Important:** Configured for Docker mode. Native mode requires manual adjustment.

### Grafana (Visualization)

**Purpose:** Dashboard and visualization platform

**Credentials:** admin/admin (change on first login)

**Dashboards Included:**

1. **Application Health** (`/d/sms-app-health/`)
   - API status, request rates, errors
   - Database performance, cache stats
   - Authentication metrics
   - Student/enrollment counts

2. **Infrastructure** (`/d/sms-infrastructure/`)
   - CPU, memory, disk, network usage
   - Container resource consumption
   - System load and processes

3. **Logs** (`/d/sms-logs/`)
   - Log volume and error rates
   - Recent error messages
   - Authentication events
   - Slow query tracking

**Data Sources:**

- Prometheus: `http://prometheus:9090` (auto-configured)
- Loki: `http://loki:3100` (auto-configured)

### Loki (Log Aggregation)

**Purpose:** Centralized log collection and querying

**Log Sources:**

- Backend application logs (via Promtail)
- Container logs (Docker daemon)

**Configuration:** `monitoring/loki/loki-config.yml`

### Power Page (/power)

Note ($11.9.7): The Power page no longer embeds Grafana/Prometheus or raw metrics. It now focuses on System Health and the Control Panel only. The section below documents the legacy embedded dashboard for reference.

**Purpose (legacy):** Embedded monitoring dashboard for quick access

**Features:**

- Tabbed interface with 4 sections
- Auto-refresh every 30 seconds
- Kiosk mode Grafana embeds
- Quick links to full monitoring UIs

**Technology (legacy):**

- Static HTML template (removed in $11.9.7)
- Dynamic URL resolution via JavaScript
- Detects hostname and ports from browser location
- Responsive design

**URL Resolution:**

```javascript
const currentHost = window.location.hostname;
const GRAFANA_URL = `http://${currentHost}:3000`;
const PROMETHEUS_URL = `http://${currentHost}:9090`;

```text
This allowed the legacy power page to work even if:

- Accessed via different hostname (not localhost)
- Custom port configurations (future enhancement)

## Port Configuration

### Default Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Main App | 8080 | HTTP | Frontend + API (fullstack) |
| Backend | 8000 | HTTP | API only (multi-container/native) |
| Frontend | 5173 | HTTP | Vite dev (native only) |
| Grafana | 3000 | HTTP | Dashboards |
| Prometheus | 9090 | HTTP | Metrics query |
| Loki | 3100 | HTTP | Log query |
| cAdvisor | 8081 | HTTP | Container metrics |
| AlertManager | 9093 | HTTP | Alert management |
| Node Exporter | 9100 | HTTP | System metrics |

### Custom Ports (Future)

To use custom Grafana port:

```powershell
.\DOCKER.ps1 -WithMonitoring -GrafanaPort 3001

```text
**Note:** Custom port configuration is a future enhancement. Currently uses default ports.
Currently supported for Grafana only. Prometheus uses fixed port 9090.

## Metrics Exposed

### Application Metrics (Backend)

Exposed at `/metrics` endpoint in Prometheus format.

**Categories:**

- **HTTP Metrics:** Request count, duration, status codes
- **Database Metrics:** Query duration, connection pool stats
- **Business Metrics:** Student counts, enrollments, grades
- **Authentication:** Login attempts, failures, lockouts
- **Cache:** Hit/miss ratios, operations count

**Implementation:** `backend/middleware/prometheus_metrics.py`

**Library:** `prometheus-fastapi-instrumentator`

**Example Metrics:**

```text
sms_http_requests_total{method="GET",handler="/api/v1/students"} 1234
sms_http_request_duration_seconds_bucket{le="0.5"} 1200
sms_students_total{status="active"} 150
sms_db_query_duration_seconds_sum 45.67
sms_auth_attempts_total{result="success"} 500

```text
### System Metrics (Node Exporter)

**Collected From:** Host system

**Includes:**

- CPU: Usage per core, load average
- Memory: Available, used, cached, swap
- Disk: I/O, read/write rates, space usage
- Network: Traffic in/out, errors, packets

### Container Metrics (cAdvisor)

**Collected From:** Docker daemon

**Includes:**

- Container CPU usage
- Container memory usage
- Container network I/O
- Container filesystem usage
- Container restart counts

## Security Considerations

### Current Status

#### ⚠️ Development Mode - Not Production-Ready

- No authentication on Power page
- Default Grafana credentials (admin/admin)
- All monitoring ports exposed to localhost
- No TLS/SSL encryption
- No rate limiting on monitoring endpoints

### Production Recommendations

1. **Authentication:**
   - Add authentication to `/power` endpoint
   - Change default Grafana password
   - Use OAuth/LDAP for Grafana
   - Implement API key authentication for Prometheus

2. **Network Security:**
   - Restrict monitoring ports to internal network only
   - Use reverse proxy (NGINX) with TLS
   - Implement firewall rules
   - Use VPN for remote access

3. **Access Control:**
   - Implement RBAC in Grafana
   - Separate read-only users from admins
   - Audit logging for dashboard changes
   - Regular credential rotation

4. **Data Protection:**
   - Encrypt sensitive metrics labels
   - Scrub PII from logs
   - Implement metric retention policies
   - Backup Grafana dashboards and configs

## Troubleshooting

### Monitoring Stack Won't Start

**Check Docker:**

```powershell
docker --version
docker ps

```text
**Check Port Conflicts:**

```powershell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":9090"

```text
**View Logs:**

```powershell
docker logs sms-grafana
docker logs sms-prometheus

```text
### Power Page Returns 404

**Current workflow ($11.9.7+):** Ensure `SERVE_FRONTEND=1` (or the reverse proxy serves the built SPA) so the React router can handle `/power`. Rebuild the frontend (`npm run build` inside `frontend/`) if assets are missing.

**Legacy template (≤ $11.9.7):** The `templates/power.html` Jinja file was removed from active builds and archived at `archive/obsolete/templates/power.html` for historical reference. Docker images built from $11.9.7+ intentionally omit this template, so `docker exec sms-app ls /app/templates/power.html` will no longer succeed.

**Check Route Registration:**

```powershell
curl http://localhost:8080/openapi.json | jq '.paths | keys | .[] | select(. == "/power")'

```text
### Grafana Dashboards Empty

**Check Prometheus Targets:**

1. Open <http://localhost:9090/targets>
2. Verify `sms-backend` target is UP
3. Check endpoint: <http://localhost:8000/metrics>

**If Target is DOWN:**

```powershell
# Docker mode

docker exec sms-app curl -s http://localhost:8000/metrics | head -n 5

# Native mode (monitoring not supported)

curl http://localhost:8000/metrics

```text
### Metrics Not Updating

**Verify Scrape Interval:**

- Default: 15 seconds globally
- Backend: 10 seconds
- Container: 30 seconds

**Force Refresh:**

1. Reload Prometheus config: `curl -X POST http://localhost:9090/-/reload`
2. Restart Prometheus: `docker restart sms-prometheus`

### Native Mode - Monitoring Not Working

**This is expected.** Monitoring is Docker-only.

**Options:**

1. Use Docker mode: `.\DOCKER.ps1 -WithMonitoring`
2. Manually start monitoring stack (advanced, see section above)
3. Use external monitoring tools (Datadog, New Relic, etc.)

## Performance Impact

### Resource Usage

**Monitoring Stack:**

- Prometheus: ~200MB RAM, minimal CPU
- Grafana: ~150MB RAM, minimal CPU
- Loki: ~100MB RAM, minimal CPU
- cAdvisor: ~50MB RAM, minimal CPU
- Node Exporter: ~20MB RAM, minimal CPU

**Total Overhead:** ~500-600MB RAM + disk I/O for time-series storage

### Scrape Impact on Backend

**Metrics Endpoint:**

- Response time: <5ms typical
- Memory overhead: ~10-20MB for metric storage
- CPU overhead: <1% for collection and serving

**Minimal impact on application performance.**

## Future Enhancements

1. **Native Mode Integration** (Low Priority)
   - Conditional Prometheus targets based on mode
   - Mode detection in power page
   - Alternative monitoring for native development

2. **Advanced Alerting**
   - Email/Slack notifications
   - Predefined alert rules
   - SLA monitoring
   - On-call rotation

3. **Custom Dashboards**
   - Per-course analytics
   - Per-teacher dashboards
   - Student engagement metrics
   - Grade distribution analysis

4. **Distributed Tracing**
   - Jaeger integration
   - Request flow visualization
   - Performance bottleneck identification

5. **Log Analysis**
   - Automated anomaly detection
   - Log pattern recognition
   - Error grouping and deduplication

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [FastAPI Metrics (Instrumentator)](https://github.com/trallnag/prometheus-fastapi-instrumentator)

## Support

For issues or questions:

1. Check this documentation first
2. Review container logs: `docker logs sms-prometheus`
3. Check GitHub Issues: [Repository URL]
4. Contact development team

---

**Version:** 1.0.0
**Last Updated:** November 18, 2025
**Maintained By:** SMS Development Team

