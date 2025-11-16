
# 🚀 Quick Start Guide (v1.5.0)


## The Easy Way (Recommended)

### Step 1: Download

- Download the project from GitHub
- Extract the ZIP file to a folder (e.g., `C:\SMS\student-management-system`)

### Step 2: Run (Docker, recommended)

- Open PowerShell in the extracted folder
- Run:

```powershell
.\RUN.ps1
```

### For Native Development (Developers Only)

```powershell
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

---


## What RUN.ps1 Does Automatically

### First Time

1. ✅ Checks for Docker Desktop
2. ✅ Installs all dependencies (in container)
3. ✅ Creates database (in container)
4. ✅ Starts the application
5. ✅ Shows you the access URL

### Already Installed

1. ✅ Detects existing installation
2. ✅ Starts the application
3. ✅ Shows you the access URL

### Already Running

1. ✅ Detects running services
2. ✅ Shows current URLs

---

## What You'll See


### When Running Docker Mode

```text
═══════════════════════════════════════════════════════════
  🌐 ACCESS YOUR APPLICATION
═══════════════════════════════════════════════════════════

  Application:    http://localhost:8080
  Control Panel:  http://localhost:8080/control
  API Docs:       http://localhost:8080/docs

  Mode: Docker (Production)

═══════════════════════════════════════════════════════════
```

**Open your browser and go to:** `http://localhost:8080`

### When Running Native Mode (Developers Only)

```text
═══════════════════════════════════════════════════════════
  🌐 ACCESS YOUR APPLICATION
═══════════════════════════════════════════════════════════

  Backend API:    http://localhost:8000
  Frontend:       http://localhost:5173
  Control Panel:  http://localhost:8000/control
  API Docs:       http://localhost:8000/docs

  Mode: Native (Development)

═══════════════════════════════════════════════════════════
```

**Open your browser and go to:** `http://localhost:5173`

---


## Management Menu

Use `.\SMS.ps1` for interactive management, status, logs, backup, and troubleshooting.

---


<!-- All batch and legacy PowerShell launchers are deprecated/removed in v1.5.0. Use RUN.ps1 or scripts/dev/run-native.ps1 only. -->

---


## Prerequisites

- **Windows 10/11** (64-bit)
- **Docker Desktop** (recommended, for production and end users)
- **PowerShell 7+** (pwsh, for native dev mode)
- **Python 3.11+** and **Node.js 18+** (for native dev mode only)

> **Note:** RUN.ps1 will detect Docker and guide you. Native mode is for developers only.

---

## Common Scenarios


### Scenario 1: End User (Recommended)

```text
1. Install Docker Desktop
2. Extract project to a folder
3. Open PowerShell in the folder
4. Run .\RUN.ps1
5. Open browser to http://localhost:8080
```

### Scenario 2: Developer Setup (Native Mode)

```text
1. Install Python 3.11+ and Node.js 18+
2. Open PowerShell 7+ in the folder
3. Run pwsh -NoProfile -File scripts/dev/run-native.ps1
4. Open browser to http://localhost:5173
5. Hot reload enabled for development
```

---

## Troubleshooting

### Problem: "Python not found"

**Solution:** Install Python 3.11+ from [python.org](https://www.python.org/downloads/)

- ✅ Check "Add Python to PATH" during installation
- Restart START.bat after installing

### Problem: "Node.js not found"

**Solution:** Install Node.js 18+ from [nodejs.org](https://nodejs.org/)

- Choose the LTS (Long Term Support) version
- Restart START.bat after installing

### Problem: Port 8080 already in use

**Solution:** Something else is using the port

```cmd
REM Check what's using port 8080
netstat -ano | findstr ":8080"

REM If a process is using the port, prefer the safer operator flow:
REM   .\scripts\maintenance\stop_frontend_safe.ps1 -ControlUrl 'http://127.0.0.1:8000'
REM As an emergency operator action (interactive only), run:
REM   .\scripts\internal\KILL_FRONTEND_NOW.ps1 -Confirm

REM Or use the interactive menu
START.bat
REM Select option 2 to stop, then option 1 to start
```

### Problem: "Failed to resolve import i18next"

**Solution:** You're using the wrong URL for your mode

- If Docker is running → Use `http://localhost:8080`
- If Native is running → Use `http://localhost:5173`
- Run START.bat again to see which URL to use

### Problem: Want to start fresh

**Solution:** Use the Force Reinstall option

```cmd
START.bat
REM Select option 5: Force Reinstall
REM Confirm with 'yes'
REM Wait for fresh installation
```

---

## Quick Reference


### To Start

```powershell
.\RUN.ps1
```

### To Stop

```powershell
.\RUN.ps1 -Stop
```

### To Check Status

```powershell
.\RUN.ps1 -Status
```

### To Open in Browser

Open <http://localhost:8080> (Docker) or <http://localhost:5173> (native dev)

---


<!-- All advanced scripting and legacy PowerShell scripts are deprecated/removed in v1.5.0. Use only RUN.ps1 or scripts/dev/run-native.ps1. -->

---


## What Happens Behind the Scenes

### Detection Phase

1. RUN.ps1 checks if Docker is installed and running
2. Checks if system is already installed
3. Checks if services are already running

### Installation Phase (Docker)

1. Builds Docker image (if needed)
2. Installs all dependencies in container
3. Runs database migrations in container

### Startup Phase

- **Docker mode:** Runs fullstack container and shows access URL
- **Native mode:** (devs only) Starts backend + frontend with hot reload

---


## Getting Help

If you're stuck:

1. **Check the URLs shown by RUN.ps1** - Use the correct one for your mode
2. **Read the error messages** - They usually tell you what's wrong
3. **Check the documentation** - `README.md` and `docs/` folder
4. **Run diagnostics** - Use `.\SMS.ps1` for troubleshooting

For detailed troubleshooting, see: `docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md`

---


## Summary

✅ **Download project**
✅ **Run .\RUN.ps1**
✅ **Wait for setup (first time)**
✅ **Open the URL shown**
✅ **Done!**

No legacy scripts. No execution policy issues. Just works. 🚀

---


## 🐧 Note for Linux Users

For Linux environments:

- Validate prerequisites:

```bash
./scripts/linux_env_check.sh
./scripts/linux_env_check.sh --fix
```

- Start in Docker (recommended):

```bash
./RUN.ps1
```

- Start in native development (hot reload, devs only):

```bash
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

If PowerShell 7+ (pwsh) is not available, you can fall back to:

```bash
docker compose up -d --build
```
