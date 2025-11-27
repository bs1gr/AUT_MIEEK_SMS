# Control API (shutdown) — Operational notes

## Overview

The control API exposes endpoints for operators to stop the frontend, the backend, or both. These are powerful operations and must be protected.

## Endpoints

- POST `/control/api/stop-all`        — stop frontend, kill node processes, schedule backend shutdown
- POST `/control/api/stop`            — stop frontend only
- POST `/control/api/stop-backend`    — stop backend only
- POST `/control/api/restart`         — schedule a backend restart when running natively
- GET  `/control/api/restart`         — informational helper (see below)
- POST `/api/v1/admin/shutdown`       — alias for `/control/api/stop-all` (backward compatibility)

### Monitoring Stack (On‑Demand Activation)

Beginning with the lazy monitoring implementation, the monitoring services (Grafana, Prometheus, Loki) are NOT started automatically unless you:

1. Launch the app with `DOCKER.ps1 -WithMonitoring` (eager start, legacy behaviour retained), OR
2. Explicitly start them via the Control API / Power page.

New endpoints:

- GET  `/control/api/monitoring/status` — current state of Grafana / Prometheus / Loki (running flags, URLs).
- POST `/control/api/monitoring/start`  — start the monitoring docker-compose stack (host only; rejected inside container).
- POST `/control/api/monitoring/stop`   — stop the monitoring stack (host only; no-op if already stopped).

> v1.8.3 note: The default Power page was simplified to "System Health" + Control actions and no longer exposes monitoring tabs or a **Start Monitoring** button. These endpoints remain available for custom dashboards, automation (watcher service), or operators who still surface the legacy UI.

When you do implement a monitoring launcher, these endpoints allow the experience to stay lazy-loaded: call `/monitoring/status` to decide whether to render dashboards and only reveal Grafana / Prometheus links once `running=true`.

Security & Constraints:

- The start/stop endpoints refuse execution when called from inside the main application container (they require host context).
- Rate limited with the heavy operation limiter (`_RATE_LIMIT_HEAVY`).
- They still depend on Docker being available and `docker-compose.monitoring.yml` being present.
- Failure responses include context strings for UI messaging / diagnostics.

Example (PowerShell) to start monitoring from an operator script:

```powershell
Invoke-RestMethod -Uri http://localhost:8080/control/api/monitoring/start -Method POST
```

Example status payload:

```json
{
  "available": true,
  "running": false,
  "services": {
    "grafana": {"running": false, "url": "http://localhost:3000", "port": 3000},
    "prometheus": {"running": false, "url": "http://localhost:9090", "port": 9090},
    "loki": {"running": false, "url": "http://localhost:3100", "port": 3100}
  },
  "compose_file": "C:/path/to/repo/docker-compose.monitoring.yml"
}
```

UI Flow (custom dashboards / advanced operators):

1. Page loads → call `/monitoring/status`.
2. If not running → keep monitoring tabs hidden, surface guidance or a **Start Monitoring** button.
3. When the operator triggers **Start Monitoring** → POST `/monitoring/start`.
4. Poll status; when `running=true` → reveal dashboards and lazy-load iframes/links.
5. Optionally add a button wired to `/monitoring/stop` to reclaim resources when dashboards are no longer needed (feature is not enabled in the default UI yet).

### Monitoring Endpoint Security Considerations

The monitoring control endpoints introduce lifecycle operations (start/stop) that interact with host Docker resources. They are intentionally constrained:

| Concern | Mitigation |
|---------|------------|
| Unauthorized remote start/stop | Endpoints refuse execution when called from inside the container; they require host context + Docker availability. |
| Excessive toggling / resource churn | Heavy rate limit applied (`_RATE_LIMIT_HEAVY`) to throttle repeated start/stop attempts. |
| Exposure over public network | Recommended to keep `/control/api/monitoring/*` reachable only from loopback or behind VPN/firewall; do NOT reverse‑proxy publicly without auth. |
| Lack of authentication | (Current state) Endpoints rely on host access; future enhancement will add optional token (similar to shutdown token) for explicit auth. |
| Privilege escalation via arbitrary compose file | Compose file path is fixed (`docker-compose.monitoring.yml`) inside repository root; no user‑supplied path accepted. |
| Information leakage | Status endpoint returns only running flags + URLs (no sensitive configuration). |

Recommended production hardening:

1. Restrict network exposure (firewall or bind service to private interface).
2. Add reverse proxy authentication (Basic Auth / OAuth) before exposing Power page externally.
3. Rotate future monitoring control token once implemented; log all lifecycle actions.
4. Monitor start/stop action frequency via application logs to detect abuse.
5. Keep Grafana admin password changed from default and limit its external exposure.

Future planned enhancements:

- Optional `MONITORING_CONTROL_TOKEN` header for start/stop endpoints.
- Structured audit log entries (`action=start_monitoring` / `action=stop_monitoring`).
- Configurable cooldown between start/stop operations.

### Audit Logging (NEW)

Monitoring lifecycle endpoints now emit structured audit log entries to the application logs. Each event includes actionable metadata for dashboards or alerting.

| Action | When Emitted | Extra Fields |
|--------|--------------|--------------|
| `monitoring_start_requested` | Incoming POST /monitoring/start | request_id, client_host |
| `monitoring_start_success`   | Successful stack start | request_id, services |
| `monitoring_start_error`     | Unexpected exception during start | request_id, error |
| `monitoring_stop_requested`  | Incoming POST /monitoring/stop | request_id, client_host |
| `monitoring_stop_success`    | Successful stack stop | request_id, services |
| `monitoring_stop_error`      | Unexpected exception during stop | request_id, error |

Use these entries to:

1. Detect abnormal start/stop churn (possible misuse).
2. Correlate monitoring availability with incident timelines.
3. Feed SIEM / observability platforms for compliance reporting.

All entries include `request_id` when the middleware has assigned one, enabling correlation with other request-scoped logs.

## Environment variables (behavior)

- **ENABLE_CONTROL_API**
  - Default: unset/false — control endpoints are hidden and will return 404/403 depending on checks.
  - Set to `"1"` to explicitly enable the control API.

- **ADMIN_SHUTDOWN_TOKEN**
  - Optional shared-secret token that remote callers must present in the `X-ADMIN-TOKEN` header.
  - If present, remote calls are permitted (subject to `ALLOW_REMOTE_SHUTDOWN`) and must include a header with the exact token.
  - The token is compared using a constant-time comparison to mitigate timing attacks.

- **ALLOW_REMOTE_SHUTDOWN**
  - Only meaningful when `ADMIN_SHUTDOWN_TOKEN` is set.
  - Set to `"1"` to allow the API to accept requests from non-loopback addresses (remote IPs).
  - If not set, and `ADMIN_SHUTDOWN_TOKEN` is not set, only loopback requests are accepted.

- **ALLOW_SOFT_SHUTDOWN**
  - Existing behavior used by shutdown threads to choose softer exit strategies. Leave unset for immediate force-exit behavior.

## Operational guidance

- Recommended production setup:
  1. Set `ENABLE_CONTROL_API=1`.
  2. Set a long random `ADMIN_SHUTDOWN_TOKEN` (store in your secret manager).
  3. Set `ALLOW_REMOTE_SHUTDOWN=1` only if absolutely required (and restrict network access via firewall/VPN).

- Calling the API remotely (example):

  **Linux / macOS (bash):**

  ```bash
  curl -X POST \
    -H "X-ADMIN-TOKEN: s3cr3t-token-here" \
    https://your-server/control/api/stop-all
  ```

  **Windows PowerShell (pwsh):**

  ```powershell
  Invoke-RestMethod -Uri https://your-server/control/api/stop-all -Method POST -Headers @{ 'X-ADMIN-TOKEN' = 's3cr3t-token-here' }
  ```

## Restart endpoint (`/control/api/restart`)

- **Purpose**: schedule a graceful backend restart when the FastAPI server runs directly on the host (native mode). The endpoint is intentionally disabled inside Docker containers because a process cannot safely restart its own container—use `DOCKER.ps1 -Stop` then `DOCKER.ps1 -Start` on the host instead.
- **Prerequisites**: `ENABLE_CONTROL_API=1`. Without this flag the endpoint responds with 404/diagnostic guidance (also exposed via the GET helper).
- **Security**: Same rules as other control endpoints. When `ADMIN_SHUTDOWN_TOKEN` is set you must include `X-ADMIN-TOKEN`. Without a token only loopback callers are accepted, and only if `ALLOW_REMOTE_SHUTDOWN` remains unset.
- **Helper endpoint**: `GET /control/api/restart` returns a structured JSON payload that explains why the endpoint may be unavailable (e.g., missing env vars, running inside Docker, wrong HTTP method). Link users to this endpoint when troubleshooting.
- **UI integration**: The React "System Health" card (Power page `/power`) uses this endpoint for the **Restart backend** button. When the backend responds with 404/403/400 status codes, the UI surfaces the translated guidance (`restartEndpointDisabled`, `restartTokenRequired`, etc.).

### Enabling the restart button in the UI

1. Edit `backend/.env` (or the environment for your process manager) and set:

   ```bash
   ENABLE_CONTROL_API=1
   ADMIN_SHUTDOWN_TOKEN=<long-random-string>   # optional but recommended
   ALLOW_REMOTE_SHUTDOWN=1                     # optional: only if you must call from non-loopback hosts
   ```

2. Restart the backend (e.g., `.\DOCKER.ps1 -Stop` then `.\DOCKER.ps1 -Start`) so the new variables are loaded.
3. Open the System Health view: `http://localhost:5173/power` in native mode or `http://localhost:8080/power` in Docker/fullstack mode.
4. Click **Restart**. If you configured `ADMIN_SHUTDOWN_TOKEN`, calls from remote browsers need to supply the token via the `X-ADMIN-TOKEN` header (handled automatically when accessing from the same host where the backend runs).

If you see "Restart unsupported" inside the UI, the backend detected that it is running inside Docker and refused to schedule a restart. Use host-level scripts instead.

## Security notes

- If you don't set `ADMIN_SHUTDOWN_TOKEN`, the control API will only accept requests from loopback (127.0.0.1 / ::1).
- Prefer not to expose control endpoints publicly. Use orchestration (systemd, docker compose, Kubernetes) to handle process lifecycle where possible.
- Rotate `ADMIN_SHUTDOWN_TOKEN` regularly and store it in a proper secret store (not source control).

## Testing

- Tests should opt in to the control API by setting `ENABLE_CONTROL_API=1` during test runs. The repository includes a pytest fixture to do this automatically.

## Contact

- For operational questions, see `docs/ARCHITECTURE.md` or contact the platform/operator team.
