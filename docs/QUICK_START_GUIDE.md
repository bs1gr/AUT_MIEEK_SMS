# 🚀 Quick Start Guide - Universal Windows Launcher

## The Easy Way (Recommended)

### Step 1: Download

- Download the project from GitHub
- Extract the ZIP file to a folder (e.g., `C:\SMS` or `D:\AUT_MIEEK_SMS`)

### Step 2: Run

- Navigate to the extracted folder
- **Double-click `START.bat`**
- That's it!

```text
Your Folder
│
├── START.bat          ← DOUBLE-CLICK THIS!
├── ONE-CLICK.ps1      ← Alternative (PowerShell)
├── SMS.ps1
├── README.md
├── backend\
├── frontend\
└── ...
```

---

## What START.bat Does Automatically

### First Time

1. ✅ Checks for Python and Node.js
2. ✅ Installs all dependencies
3. ✅ Creates database
4. ✅ Chooses best mode (Docker or Native)
5. ✅ Starts the application
6. ✅ Shows you the URL to open

### Already Installed

1. ✅ Detects existing installation
2. ✅ Starts the application
3. ✅ Shows you the URL to open

### Already Running

1. ✅ Detects running services
2. ✅ Shows current URLs
3. ✅ Offers interactive menu

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

### When Running Native Mode

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

## Interactive Menu

If the system is already running, you'll see an interactive menu:

```text
╔══════════════════════════════════════════════════════════════╗
║   🎓 STUDENT MANAGEMENT SYSTEM - INTERACTIVE MENU           ║
╚══════════════════════════════════════════════════════════════╝

  1. Start Application
  2. Stop Application
  3. Show Status
  4. Restart Application
  5. Force Reinstall
  6. Open Application in Browser
  7. Open Control Panel
  8. View Documentation
  0. Exit

Select option (0-8):
```

---

## Why START.bat is Better Than PowerShell

| Feature | START.bat | ONE-CLICK.ps1 |
|---------|-----------|---------------|
| **Works on ALL Windows versions** | ✅ Yes (7/8/10/11) | ⚠️ Depends on PS version |
| **No execution policy blocks** | ✅ Never | ❌ Often blocked |
| **No security warnings** | ✅ Clean | ⚠️ Sometimes warns |
| **Just double-click** | ✅ Always works | ⚠️ May need right-click |
| **No admin rights needed** | ✅ Never | ⚠️ Sometimes |
| **Works without PowerShell 7** | ✅ Yes | ⚠️ Best with PS7 |

---

## Prerequisites

### Minimum Required

- **Windows 7 or newer**
- **Python 3.11+** - [Download here](https://www.python.org/downloads/)
- **Node.js 18+** - [Download here](https://nodejs.org/)

### Optional (for Docker mode)

- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)

**Note:** START.bat will detect what you have and choose the best mode automatically.

---

## Common Scenarios

### Scenario 1: Fresh Windows PC

```text
1. Install Python 3.11+ (check "Add to PATH")
2. Install Node.js 18+ (default options)
3. Extract project to a folder
4. Double-click START.bat
5. Wait for installation (first time only)
6. Open browser to shown URL
```

### Scenario 2: Have Docker Desktop

```text
1. Make sure Docker Desktop is running
2. Double-click START.bat
3. System will use Docker mode (preferred)
4. Open http://localhost:8080
```

### Scenario 3: Developer Setup

```text
1. Install Python + Node.js (no Docker)
2. Double-click START.bat
3. System will use Native mode (dev server)
4. Open http://localhost:5173
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

REM Kill that process (replace 1234 with actual PID)
taskkill /PID 1234 /F

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

```cmd
START.bat
```

### To Stop

```cmd
START.bat
REM Select option 2: Stop Application
```

### To Check Status

```cmd
START.bat
REM Select option 3: Show Status
```

### To Open in Browser

```cmd
START.bat
REM Select option 6: Open Application in Browser
```

---

## Advanced: Command Line Usage

You can also use START.bat from Command Prompt:

```cmd
REM Just start (auto-detect)
START.bat

REM The batch file is interactive, so just follow the prompts
```

For advanced scripting, use the PowerShell scripts:

```powershell
.\ONE-CLICK.ps1 -PreferDocker    # Force Docker mode
.\ONE-CLICK.ps1 -PreferNative    # Force Native mode
.\ONE-CLICK.ps1 -ForceInstall    # Force reinstall
```

But for 99% of users, just **double-click START.bat** and you're done! 🎉

---

## What Happens Behind the Scenes

### Detection Phase

1. START.bat checks if Python is installed
2. Checks if Node.js is installed
3. Checks if Docker is installed and running
4. Checks if system is already installed
5. Checks if services are already running

### Decision Phase

- **If not installed:** Runs installation
- **If installed but stopped:** Starts services
- **If already running:** Shows status and menu

### Installation Phase

1. Creates Python virtual environment
2. Installs Python dependencies (FastAPI, SQLAlchemy, etc.)
3. Runs database migrations
4. Installs Node.js dependencies (React, Vite, etc.)
5. Chooses Docker or Native based on availability

### Startup Phase

- **Docker mode:** Runs `docker-compose up -d`
- **Native mode:** Starts backend + frontend in separate windows

---

## Getting Help

If you're stuck:

1. **Check the URLs shown by START.bat** - Use the correct one for your mode
2. **Read the error messages** - They usually tell you what's wrong
3. **Try Force Reinstall** - Option 5 in the menu
4. **Check the documentation** - `README.md` and `docs/` folder
5. **Run diagnostics** - Open Control Panel and click "Run Diagnostics"

For detailed troubleshooting, see: `docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md`

---

## Summary

✅ **Download project**
✅ **Double-click START.bat**
✅ **Wait for setup (first time)**
✅ **Open the URL shown**
✅ **Done!**

No PowerShell complications. No execution policies. Just works. 🚀

---

## 🐧 Note for Linux Users

For Linux environments, use the helper scripts:

- Validate prerequisites:

```bash
./scripts/linux_env_check.sh
./scripts/linux_env_check.sh --fix
```

- Start in Docker (recommended):

```bash
./scripts/deploy/run-docker-release.sh
```

- Start in native development (hot reload):

```bash
./scripts/dev/run-native.sh
```

PowerShell 7+ (pwsh) is recommended on Linux, as the start helpers delegate to SMART_SETUP.ps1. If pwsh isn’t available, you can fall back to:

```bash
docker compose up -d --build
```
