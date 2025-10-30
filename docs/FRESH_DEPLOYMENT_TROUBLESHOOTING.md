# Fresh Deployment Troubleshooting Guide

## Quick Issue Resolution

### Issue 1: "Failed to resolve import i18next" Error

**Symptoms:**
```
[plugin:vite:import-analysis] Failed to resolve import "i18next" from "src/i18n/config.js"
```

**Root Cause:**
You're accessing the wrong URL for your deployment mode.

**Solution:**

#### If using Docker mode (recommended):
- ✅ **Correct URL**: http://localhost:8080
- ❌ **Wrong URL**: http://localhost:5173 (this is for native mode only)

Check which mode you're running:
```powershell
# Check if Docker containers are running
docker ps

# If you see containers, use port 8080
```

#### If using Native mode:
The error means frontend dependencies weren't installed. Fix it:

```powershell
# Stop everything first
.\SMS.ps1 -Stop

# Install frontend dependencies
cd frontend
npm install

# Go back to root
cd ..

# Start again
.\ONE-CLICK.ps1
```

---

## Understanding Deployment Modes

### Docker Mode (Port 8080)
- **Single container** serves both backend and built frontend
- **URLs:**
  - Application: http://localhost:8080
  - Control Panel: http://localhost:8080/control
  - API Docs: http://localhost:8080/docs
- **Preferred for:** Production, stability, first-time users
- **No need for:** npm install or separate frontend process

### Native Mode (Ports 8000 + 5173)
- **Two separate processes**: Backend + Frontend dev server
- **URLs:**
  - Backend API: http://localhost:8000
  - Frontend (Vite): http://localhost:5173
  - Control Panel: http://localhost:8000/control
  - API Docs: http://localhost:8000/docs
- **Preferred for:** Development, hot module reload
- **Requires:** Both Python and Node.js installed, npm dependencies

---

## Issue 2: ONE-CLICK.ps1 Script Failed

**Common Causes:**

### 1. Execution Policy Block
**Error:** "cannot be loaded because running scripts is disabled"

**Fix:**
```powershell
# Option A: Run with bypass
powershell -NoProfile -ExecutionPolicy Bypass -File .\ONE-CLICK.ps1

# Option B: Set policy permanently (CurrentUser scope)
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\ONE-CLICK.ps1
```

### 2. Missing Prerequisites
**Error:** "Python 3.11+ is required but not found"

**Fix:**
- Install Python 3.11+: https://www.python.org/downloads/
- Install Node.js 18+: https://nodejs.org/
- Restart PowerShell after installation
- Run ONE-CLICK.ps1 again

### 3. QUICKSTART.ps1 Not Found
**Error:** "QUICKSTART.ps1 not found"

**Fix:**
```powershell
# Make sure you're in the correct directory
cd D:\AUT_MIEEK_SMS-main  # Or wherever you extracted the files
dir  # Should show ONE-CLICK.ps1, QUICKSTART.ps1, etc.

# Then run
.\ONE-CLICK.ps1
```

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
```

---

## How to Check What's Running

### Quick Status Check
```powershell
# Using SMS.ps1
.\SMS.ps1 -Status

# Or check directly
docker ps  # Shows Docker containers
netstat -ano | findstr ":8080"  # Check if port 8080 is in use
netstat -ano | findstr ":8000"  # Check if port 8000 is in use
netstat -ano | findstr ":5173"  # Check if port 5173 is in use
```

### From Control Panel
1. Open Control Panel at:
   - Docker: http://localhost:8080/control
   - Native: http://localhost:8000/control
2. Check "System Status" section
3. Click "Run Diagnostics" for detailed health check

---

## Fresh Start (Nuclear Option)

If everything is broken and you want to start completely fresh:

```powershell
# 1. Stop everything
.\SMS.ps1 -Stop
docker-compose down  # If using Docker

# 2. Delete data directory (⚠️ loses database)
Remove-Item -Recurse -Force data -ErrorAction SilentlyContinue

# 3. Delete node_modules
Remove-Item -Recurse -Force frontend\node_modules -ErrorAction SilentlyContinue

# 4. Delete Python virtual environment
Remove-Item -Recurse -Force backend\venv -ErrorAction SilentlyContinue

# 5. Force reinstall
.\ONE-CLICK.ps1 -ForceInstall
```

---

## Verifying Successful Installation

### 1. Check Services are Running
```powershell
.\SMS.ps1 -Status
```

Should show:
- ✅ Backend: RUNNING
- ✅ Frontend: RUNNING (or Docker: RUNNING)
- ✅ Database: Connected

### 2. Access the Application
Based on your mode:

**Docker Mode:**
- Go to http://localhost:8080
- Should see the Student Management System login/dashboard

**Native Mode:**
- Go to http://localhost:5173
- Should see the Student Management System login/dashboard

### 3. Test Control Panel
Based on your mode:

**Docker Mode:**
- Go to http://localhost:8080/control
- Should see version badges at top
- Click "Run Diagnostics" - all should be green or have helpful warnings

**Native Mode:**
- Go to http://localhost:8000/control
- Same checks as Docker mode

---

## Getting Help

If you're still stuck:

1. **Check Logs:**
   ```powershell
   .\SMS.ps1
   # Select option 9: View Application Logs
   ```

2. **Run Diagnostics:**
   ```powershell
   .\SMS.ps1
   # Select option 8: Run Full Diagnostics
   ```

3. **Check setup.log:**
   ```powershell
   Get-Content setup.log -Tail 50
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

# Kill that process (replace 1234 with actual PID)
taskkill /PID 1234 /F

# Or use SMS.ps1 diagnostics
.\SMS.ps1
# Select option 7: Debug Port Conflicts
```

---

## Summary: Most Common Fix

**If you see the i18next error:**

1. Check if Docker is running: `docker ps`
2. If you see containers → Use **http://localhost:8080** (not 5173)
3. If no containers → Run `cd frontend && npm install` then restart

**That fixes 90% of fresh deployment issues.**
