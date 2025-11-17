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

- **Purpose**: schedule a graceful backend restart when the FastAPI server runs directly on the host (native mode). The endpoint is intentionally disabled inside Docker containers because a process cannot safely restart its own container—use `SMS.ps1 -Restart` or `RUN.ps1 -Stop/-Start` on the host instead.
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

2. Restart the backend (e.g., `.\RUN.ps1 -Stop` then `.\RUN.ps1`) so the new variables are loaded.
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
