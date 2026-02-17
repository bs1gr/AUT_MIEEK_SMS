# Fresh Deployment Troubleshooting Guide

## Quick Issue Resolution

### Issue 1: "Failed to resolve import i18next" Error

**Symptoms:**

```text
[plugin:vite:import-analysis] Failed to resolve import "i18next" from "src/i18n/config.js"

```text
**Root Cause:**
You're accessing the wrong URL for your deployment mode.

**Solution:**

#### If using Docker mode (recommended)

- ✅ **Correct URL**: <http://localhost:8080>
- ❌ **Wrong URL**: <http://localhost:5173> (this is for native mode only)

Check which mode you're running:

```cmd
REM Check if Docker containers are running
docker ps

REM If you see containers, use port 8080

```text
#### If using Native mode

The error means frontend dependencies weren't installed. Fix it:

```powershell
# Stop everything first

.\DOCKER.ps1 -Stop

# Install frontend dependencies (if using native mode)

cd frontend
npm install
cd ..

# Start again in Docker mode (recommended)

.\DOCKER.ps1 -Start

# Or start in native mode for development

.\NATIVE.ps1 -Start

```text
---

## Understanding Deployment Modes

### Docker Mode (Port 8080)

- **Single container** serves both backend and built frontend
- **URLs:**
  - Application: <http://localhost:8080>
  - Control Panel: <http://localhost:8080/control>
  - API Docs: <http://localhost:8080/docs>
- **Preferred for:** Production, stability, first-time users
- **No need for:** npm install or separate frontend process

### Native Mode (Ports 8000 + 5173)

- **Two separate processes**: Backend + Frontend dev server
- **URLs:**
  - Backend API: <http://localhost:8000>
  - Frontend (Vite): <http://localhost:5173>
  - Control Panel: <http://localhost:8000/control>
  - API Docs: <http://localhost:8000/docs>
- **Preferred for:** Development, hot module reload
- **Requires:** Both Python and Node.js installed, npm dependencies

---

## Issue 2: PowerShell Script Issues

**Current Scripts (v1.9.7+):**

- `DOCKER.ps1` - Docker deployment operations
- `NATIVE.ps1` - Native development mode

**Common Issues:**

**Common Causes:**

### 1. Execution Policy Block

**Error:** "cannot be loaded because running scripts is disabled"

**Fix:**

```powershell
# Option A: Run with bypass (one-time)

pwsh -NoProfile -ExecutionPolicy Bypass -File .\DOCKER.ps1 -Start

# Option B: Set policy permanently (CurrentUser scope)

pwsh -Command "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"
.\DOCKER.ps1 -Start

# Option C: Use VBS toggle (no PowerShell issues)

# Double-click DOCKER_TOGGLE.vbs in Windows Explorer

```text
### 2. Missing Prerequisites

**Error:** "Python 3.11+ is required but not found"

**Fix:**

- Install Python 3.12+: <https://www.python.org/downloads/>
- Install Node.js 20+: <https://nodejs.org/>
- Install Docker Desktop: <https://www.docker.com/products/docker-desktop>
- Restart PowerShell after installation
- Run `.\DOCKER.ps1 -Install` for first-time setup

### 3. Script Not Found

**Error:** "DOCKER.ps1 not found"

**Fix:**

```powershell
# Make sure you're in the correct directory

cd D:\SMS\student-management-system  # Or wherever you extracted the files
dir  # Should show DOCKER.ps1, NATIVE.ps1, COMMIT_READY.ps1, etc.

# Then run

.\DOCKER.ps1 -Start

```text
### 4. npm Install Failed

**Error:** "npm install failed" or dependency errors

**Fix:**

```powershell
# Clear npm cache

npm cache clean --force

# Delete node_modules and try again

cd frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Reinstall

npm install

# If still fails, check npm version

npm --version  # Should be 9+ for Node 18+

# Update npm if needed

npm install -g npm@latest

```text
---

## How to Check What's Running

### Quick Status Check

```powershell
# Using DOCKER.ps1

.\DOCKER.ps1 -Status

# Or using NATIVE.ps1

.\NATIVE.ps1 -Status

# Or check directly

docker ps  # Shows Docker containers
netstat -ano | findstr ":8080"  # Check if port 8080 is in use
netstat -ano | findstr ":8000"  # Check if port 8000 is in use
netstat -ano | findstr ":5173"  # Check if port 5173 is in use

```text
### From Control Panel

1. Open Control Panel at:
   - Docker: <http://localhost:8080/control>
   - Native: <http://localhost:8000/control>

2. Check "System Status" section
3. Click "Run Diagnostics" for detailed health check

---

## Fresh Start (Nuclear Option)

If everything is broken and you want to start completely fresh:

```powershell
# 1. Stop everything

.\DOCKER.ps1 -Stop  # Or .\NATIVE.ps1 -Stop

# 2. Clean Docker (if using Docker mode)

.\DOCKER.ps1 -DeepClean  # Removes containers, images, volumes

# 3. Delete data directory (⚠️ loses database)

Remove-Item -Recurse -Force data -ErrorAction SilentlyContinue

# 4. Delete node_modules (if using native mode)

Remove-Item -Recurse -Force frontend\node_modules -ErrorAction SilentlyContinue

# 5. Delete Python virtual environment (if using native mode)

Remove-Item -Recurse -Force backend\venv -ErrorAction SilentlyContinue

# 6. Fresh installation

.\DOCKER.ps1 -Install  # For Docker mode
# Or

.\NATIVE.ps1 -Setup    # For native mode

```text
---

## Verifying Successful Installation

### 1. Check Services are Running

```powershell
.\DOCKER.ps1 -Status  # For Docker mode
# Or

.\NATIVE.ps1 -Status  # For native mode

```text
Should show:

- ✅ Backend: RUNNING
- ✅ Frontend: RUNNING (or Docker: RUNNING)
- ✅ Database: Connected

### 2. Access the Application

Based on your mode:

**Docker Mode:**

- Go to <http://localhost:8080>
- Should see the Student Management System login/dashboard

**Native Mode:**

- Go to <http://localhost:5173>
- Should see the Student Management System login/dashboard

### 3. Test Control Panel

Based on your mode:

**Docker Mode:**

- Go to <http://localhost:8080/control>
- Should see version badges at top
- Click "Run Diagnostics" - all should be green or have helpful warnings

**Native Mode:**

- Go to <http://localhost:8000/control>
- Same checks as Docker mode

---

## Getting Help

If you're still stuck:

1. **Check Logs:**

   ```powershell
   # Docker logs
   docker logs sms-fullstack

   # Or check backend log files
   Get-Content backend\logs\app.log -Tail 50
   ```

2. **Run Diagnostics:**

   ```powershell
   # Via scripts
   .\scripts\DIAGNOSE_STATE.ps1

   # Or via Control Panel
   # Navigate to http://localhost:8080/control and click "Run Diagnostics"
   ```

3. **Check Docker status:**

   ```powershell
   .\DOCKER.ps1 -Status
   docker ps -a
   ```

4. **Common Log Locations:**
   - Setup: `setup.log` (in root)
   - Backend: `backend/logs/app.log`
   - Docker: `docker-compose logs`

---

## Port Conflicts

If ports 8000, 8080, or 5173 are already in use:

```powershell
# Find what's using the port

netstat -ano | findstr ":8080"
# Note the PID (last column)

# Kill that process (replace 1234 with actual PID) — operator guidance follows

# Prefer using operator tooling rather than running taskkill directly.
#  - Request frontend stop via control API helper:

#      .\scripts\maintenance\stop_frontend_safe.ps1 -ControlUrl 'http://127.0.0.1:8000'
# If you are an operator and understand the risks, run the emergency script interactively:

#      .\scripts\internal\KILL_FRONTEND_NOW.ps1 -Confirm

# Or use diagnostic script

.\scripts\DIAGNOSE_STATE.ps1

```text
---

## Summary: Most Common Fix

**If you see the i18next error:**

1. Check if Docker is running: `docker ps`
2. If you see containers → Use **<http://localhost:8080>** (not 5173)
3. If no containers → Run `cd frontend && npm install` then restart

**That fixes 90% of fresh deployment issues.**
