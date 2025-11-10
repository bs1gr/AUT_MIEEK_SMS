Control API (shutdown) — Operational notes

Overview
--------
The control API exposes endpoints for operators to stop the frontend, the backend, or both. These are powerful operations and must be protected.

Endpoints
---------
- POST /control/api/stop-all        — stop frontend, kill node processes, schedule backend shutdown
- POST /control/api/stop            — stop frontend only
- POST /control/api/stop-backend    — stop backend only
- POST /api/v1/admin/shutdown       — alias for /control/api/stop-all (backward compatibility)

Environment variables (behavior)
--------------------------------
- ENABLE_CONTROL_API
  - Default: unset/false — control endpoints are hidden and will return 404/403 depending on checks.
  - Set to "1" to explicitly enable the control API.

- ADMIN_SHUTDOWN_TOKEN
  - Optional shared-secret token that remote callers must present in the `X-ADMIN-TOKEN` header.
  - If present, remote calls are permitted (subject to ALLOW_REMOTE_SHUTDOWN) and must include a header with the exact token.
  - The token is compared using a constant-time comparison to mitigate timing attacks.

- ALLOW_REMOTE_SHUTDOWN
  - Only meaningful when `ADMIN_SHUTDOWN_TOKEN` is set.
  - Set to "1" to allow the API to accept requests from non-loopback addresses (remote IPs).
  - If not set, and `ADMIN_SHUTDOWN_TOKEN` is not set, only loopback requests are accepted.

- ALLOW_SOFT_SHUTDOWN
  - Existing behavior used by shutdown threads to choose softer exit strategies. Leave unset for immediate force-exit behavior.

Operational guidance
--------------------
- Recommended production setup:
  1. Set `ENABLE_CONTROL_API=1`.
  2. Set a long random `ADMIN_SHUTDOWN_TOKEN` (store in your secret manager).
  3. Set `ALLOW_REMOTE_SHUTDOWN=1` only if absolutely required (and restrict network access via firewall/VPN).

- Calling the API remotely (example):

  Linux / macOS (bash):

  ```bash
  curl -X POST \
    -H "X-ADMIN-TOKEN: s3cr3t-token-here" \
    https://your-server/control/api/stop-all
  ```

  Windows PowerShell (pwsh):

  ```powershell
  Invoke-RestMethod -Uri https://your-server/control/api/stop-all -Method POST -Headers @{ 'X-ADMIN-TOKEN' = 's3cr3t-token-here' }
  ```

Security notes
--------------
- If you don't set `ADMIN_SHUTDOWN_TOKEN`, the control API will only accept requests from loopback (127.0.0.1 / ::1).
- Prefer not to expose control endpoints publicly. Use orchestration (systemd, docker compose, Kubernetes) to handle process lifecycle where possible.
- Rotate `ADMIN_SHUTDOWN_TOKEN` regularly and store it in a proper secret store (not source control).

Testing
-------
- Tests should opt in to the control API by setting `ENABLE_CONTROL_API=1` during test runs. The repository includes a pytest fixture to do this automatically.

Contact
-------
- For operational questions, see `docs/ARCHITECTURE.md` or contact the platform/operator team.
