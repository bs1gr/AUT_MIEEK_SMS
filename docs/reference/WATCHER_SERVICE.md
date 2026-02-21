# Monitoring Watcher Service

## Overview

The Monitoring Watcher Service is a Windows PowerShell background job that enables true "one-click" monitoring auto-start from the containerized SMS application. It bridges the gap between the Docker container and the host system by monitoring a shared trigger directory and automatically executing Docker Compose commands when triggered.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Operator triggers monitoring start (CLI/custom UI)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  FastAPI Backend (inside container)                         │
│  POST /control/api/monitoring/trigger                       │
│  Creates: /app/data/.triggers/start_monitoring.ps1          │
└────────────────────┬───────────────────────────────────────┘
                     │
                     │ (Bind Mount)
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Host Filesystem                                            │
│  File appears at: data/.triggers/start_monitoring.ps1       │
└────────────────────┬───────────────────────────────────────┘
                     │
                     │ (Polling every 2 seconds)
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Watcher Service (PowerShell Background Job on Host)        │
│  scripts/monitoring-watcher.ps1                             │
│  - Detects trigger file                                     │
│  - Executes: docker compose -f docker-compose.monitoring.yml up -d │
│  - Verifies containers running                              │
│  - Cleans up trigger file                                   │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Monitoring Stack Running                                   │
│  - Grafana (port 3000)                                      │
│  - Prometheus (port 9090)                                   │
│  - Loki, Alertmanager, cAdvisor, etc.                       │
└────────────────────────────────────────────────────────────┘

```text
## Why This Solution?

### The Problem

Docker containers cannot directly execute Docker commands on the host. On Linux, this is typically solved by mounting the Docker socket (`/var/run/docker.sock`), but **Windows does not support this approach** due to how Docker Desktop operates with WSL.

### Previous Attempt (Failed)

Initial implementation created trigger files but required manual command execution by the user, which defeated the purpose of "one-click" automation.

### Current Solution (Successful)

- **Background Watcher**: PowerShell job runs on the host, has full Docker access
- **Shared Trigger Directory**: Bind-mounted to allow container→host communication
- **Automatic Execution**: No user intervention required after button click
- **Self-Cleaning**: Trigger files deleted after successful execution

## Components

### 1. Watcher Service (`scripts/monitoring-watcher.ps1`)

**Functionality:**

- Background PowerShell job monitoring `data/.triggers/` directory
- Polls every 2 seconds for `start_monitoring.ps1` trigger file
- Executes Docker Compose command when trigger detected
- Verifies containers are actually running (not just exit code)
- Cleans up trigger file after successful start
- Logs all operations to `logs/monitoring-watcher.log`

**Commands:**

```powershell
.\scripts\monitoring-watcher.ps1 -Start     # Start watcher
.\scripts\monitoring-watcher.ps1 -Stop      # Stop watcher
.\scripts\monitoring-watcher.ps1 -Status    # Check status

```text
**Auto-Start:**
Watcher is automatically started by `RUN.ps1` when the application launches.

### 2. Backend Trigger Endpoint (`backend/routers/control/monitoring.py`)

**Endpoint:** `POST /control/api/monitoring/trigger`

**Behavior:**

- Detects if running in container mode
- Creates PowerShell script at `/app/data/.triggers/start_monitoring.ps1`
- Script content includes Docker Compose command
- Returns success response with trigger details

**Critical Path Fix:**
Originally used `/data/.triggers` which didn't match the bind mount. Fixed to use `/app/data/.triggers` to align with the Docker volume structure.

### 3. (Legacy) Frontend UI (`frontend/src/pages/PowerPage.tsx` ≤ 1.9.7)

Earlier versions surfaced a "Start Monitoring Stack" button that called the trigger endpoint directly. That UI was removed in 1.9.7 when the Power page was simplified to System Health + Control Panel. Operators can still build custom dashboards or use scripts to call the trigger endpoint (see section below for sample curl command).

### 4. Startup Integration (`RUN.ps1`)

**Changes:**

- Added bind mount: `-v "${triggersDir}:/app/data/.triggers"`
- Auto-starts watcher after container health check
- Shows watcher status in success banner
- Graceful handling if watcher fails to start

## How It Works

1. **Trigger**: Operator calls the endpoint directly (CLI/scripts) or via legacy Power Page UI (≤ 1.9.7)
2. **API Call**: Client sends POST to `/control/api/monitoring/trigger`
3. **Trigger Creation**: Backend creates PowerShell script in `/app/data/.triggers/`
4. **File Appears**: Bind mount makes file visible on host at `data/.triggers/`
5. **Detection**: Watcher (polling every 2s) detects new file
6. **Execution**: Watcher runs `docker compose -f docker-compose.monitoring.yml up -d`
7. **Verification**: Checks if Grafana and Prometheus containers are running
8. **Cleanup**: Deletes trigger file
9. **Logging**: Records all steps in `logs/monitoring-watcher.log`
10. **Status Update**: Caller can poll watcher status (legacy Power Page auto-refreshed)

**Total Time**: 2-5 seconds from trigger call to monitoring running

## Configuration

### Watcher Settings

- **Poll Interval**: 2 seconds (default, configurable with `-PollInterval`)
- **Trigger Directory**: `data/.triggers/`
- **Log File**: `logs/monitoring-watcher.log`
- **PID File**: `data/.triggers/watcher.pid`

### Container Bind Mounts

```powershell
-v sms_data:/app/data                          # Main data volume
-v "${triggersDir}:/app/data/.triggers"        # Trigger directory (bind mount)
-v "${SCRIPT_DIR}/templates:/app/templates:ro" # Templates (read-only)

```text
**Note:** The trigger directory is a **bind mount** (not volume) so the host can directly access files created by the container.

## Troubleshooting

### Watcher Not Running

```powershell
.\scripts\monitoring-watcher.ps1 -Status
# If not running:

.\scripts\monitoring-watcher.ps1 -Start

```text
### Trigger File Not Created

- **Check**: `Test-Path data\.triggers\start_monitoring.ps1`
- **Verify**: Container has correct path (`/app/data/.triggers/`)
- **Inspect**: `docker exec sms-app ls -la /app/data/.triggers/`

### Monitoring Not Starting

1. **Check watcher logs**: `Get-Content logs\monitoring-watcher.log -Tail 20`
2. **Verify Docker Compose file**: `Test-Path docker-compose.monitoring.yml`
3. **Manual test**: `docker compose -f docker-compose.monitoring.yml up -d`

### Trigger File Not Cleaning Up

- **Indicates**: Watcher either not running or containers didn't start
- **Solution**: Check if Grafana/Prometheus containers are actually running
- **Logs**: Review watcher logs for errors

## Performance

- **Detection Latency**: 0-2 seconds (poll interval)
- **Startup Time**: ~2-3 seconds (Docker Compose)
- **Total Time**: 2-5 seconds from button click to monitoring active
- **Resource Usage**: Minimal (PowerShell background job)

## Limitations

### Windows-Specific

This solution is designed for Windows with Docker Desktop. On Linux, you can mount the Docker socket directly for simpler container-to-host communication.

### Polling-Based

Uses polling instead of file system events (inotify). While less efficient, it's more reliable across different file systems and Docker setups.

### Manual Watcher Stop

Stopping the monitoring stack from the UI still requires host-side execution. The watcher only handles **starting**, not stopping.

## Future Enhancements

Potential improvements:

1. **Stop Trigger**: Add watcher support for monitoring stop triggers
2. **File System Watcher**: Use `FileSystemWatcher` instead of polling
3. **Status Sync**: Real-time status updates via WebSockets
4. **Health Monitoring**: Watcher reports if monitoring services become unhealthy
5. **Retry Logic**: Automatic retries if monitoring fails to start

## Related Files

- `scripts/monitoring-watcher.ps1` - Watcher service script
- `backend/routers/control/monitoring.py` - Trigger endpoint and control API
- `frontend/src/pages/PowerPage.tsx` - Legacy monitoring UI (removed in $11.18.3)
- `RUN.ps1` - Application launcher with watcher integration
- `docker-compose.monitoring.yml` - Monitoring stack definition

## Testing

**Manual Test:**

```powershell
# 1. Stop monitoring and watcher

docker compose -f docker-compose.monitoring.yml down
.\scripts\monitoring-watcher.ps1 -Stop

# 2. Start watcher

.\scripts\monitoring-watcher.ps1 -Start

# 3. Trigger via API

curl.exe -X POST http://localhost:8080/control/api/monitoring/trigger

# 4. Wait and verify

Start-Sleep 5
docker ps --filter "name=sms-grafana"
docker ps --filter "name=sms-prometheus"

# 5. Check logs

Get-Content logs\monitoring-watcher.log -Tail 10

# 6. Verify cleanup

Test-Path data\.triggers\start_monitoring.ps1  # Should be False

```text
## Conclusion

The Watcher Service provides a robust, Windows-compatible solution for true one-click monitoring auto-start from containerized applications. By leveraging PowerShell background jobs and bind mounts, it bridges the container/host boundary without requiring Docker socket mounting or manual command execution.

**Key Achievement**: Button click → 2-5 seconds → monitoring running automatically. No manual intervention required.
