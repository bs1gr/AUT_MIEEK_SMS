# Student Management System - State Management Guide

## Quick Diagnosis

Run this command to instantly understand your system state:
```powershell
.\scripts\DIAGNOSE_STATE.ps1
```

This will tell you:
- ✓ Whether you're running **Docker containers** or **native processes**
- ✓ Which containers/processes are running
- ✓ Exactly what commands to run next

---

## Understanding Deployment Modes

### Mode 1: Docker Compose (RECOMMENDED)
**What it is:** Backend and frontend run in separate containers, orchestrated by docker-compose.

**How to identify:**
```powershell
docker compose ps
# You'll see: backend-1 and frontend-1
```

**Access points:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:8080/api (proxied through frontend)
- Backend Docs: http://localhost:8080/api/docs

### Mode 2: Native Host Processes
**What it is:** Python backend and Node frontend run directly on your computer.

**How to identify:**
```powershell
.\scripts\DEBUG_PORTS.ps1
# Shows processes on ports 8000 and 5173
```

**Access points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Backend Docs: http://localhost:8000/docs

### Mode 3: Fullstack Container (Advanced)
**What it is:** Single container with both backend and frontend.

**How to identify:**
```powershell
docker ps | findstr fullstack
# Shows sms-fullstack container
```

---

## Common Scenarios & Solutions

### Scenario 1: "Nothing is running"
```powershell
# Run diagnosis
.\scripts\DIAGNOSE_STATE.ps1

# Start with Docker (recommended)
docker compose up -d --build

# OR start natively
.\QUICKSTART.ps1
```

### Scenario 2: "Containers exist but are stopped"
```powershell
# Start existing containers
docker compose start

# OR recreate them
docker compose down
docker compose up -d --build
```

### Scenario 3: "Something is running but I can't access it"
```powershell
# Check what's running
.\scripts\DIAGNOSE_STATE.ps1

# If Docker: Check frontend at http://localhost:8080
# If Native: Check frontend at http://localhost:5173

# Check ports
.\scripts\DEBUG_PORTS.ps1
```

### Scenario 4: "Port conflicts / Address already in use"
```powershell
# Find what's using the ports
.\scripts\DEBUG_PORTS.ps1

# Stop everything
docker compose down           # Stops Docker containers
.\scripts\STOP.ps1            # Stops native processes

# Then start fresh
docker compose up -d --build
```

### Scenario 5: "I want to switch modes"
```powershell
# FROM Native TO Docker:
.\scripts\STOP.ps1                    # Stop native
docker compose up -d --build          # Start Docker

# FROM Docker TO Native:
docker compose down                   # Stop Docker
.\QUICKSTART.ps1                      # Start native
```

### Scenario 6: "Scripts are failing"
```powershell
# First, understand current state
.\scripts\DIAGNOSE_STATE.ps1

# Check if Docker daemon is running
docker info

# Check if ports are available
.\scripts\DEBUG_PORTS.ps1

# Clean up everything and start fresh
docker compose down
.\scripts\CLEANUP.ps1
docker compose up -d --build
```

---

## Command Cheat Sheet

### Docker Mode Commands

| Task | Command |
|------|---------|
| **Start** | `docker compose up -d` |
| **Stop** | `docker compose stop` |
| **Restart** | `docker compose restart` |
| **Stop & Remove** | `docker compose down` |
| **Rebuild** | `docker compose up -d --build` |
| **View Logs** | `docker compose logs -f` |
| **View Status** | `docker compose ps` |
| **Refresh (rebuild & restart)** | `.\scripts\DOCKER_REFRESH.ps1` |

### Native Mode Commands

| Task | Command |
|------|---------|
| **First time setup** | `.\scripts\SETUP.ps1` |
| **Start** | `.\scripts\RUN.ps1` or `.\QUICKSTART.ps1` |
| **Stop** | Press `Ctrl+C` or `.\scripts\STOP.ps1` |
| **Restart** | Stop then run again |

### Diagnostic Commands

| Task | Command |
|------|---------|
| **Check current state** | `.\scripts\DIAGNOSE_STATE.ps1` |
| **Check ports** | `.\scripts\DEBUG_PORTS.ps1` |
| **Frontend diagnostics** | `.\scripts\DIAGNOSE_FRONTEND.ps1` |
| **Docker health check** | `.\scripts\DOCKER_SMOKE.ps1` |
| **Clean build artifacts** | `.\scripts\CLEANUP.ps1` |

---

## Port Reference

| Service | Docker Mode | Native Mode |
|---------|-------------|-------------|
| **Frontend** | 8080 | 5173 |
| **Backend API** | 8080/api (proxied) | 8000 |
| **Backend direct** | 8000 (internal) | 8000 |

**Note:** In Docker mode, you only need to access port 8080 - the frontend container proxies backend requests automatically.

---

## Troubleshooting Decision Tree

```
Can't access the app?
│
├─ Run: .\scripts\DIAGNOSE_STATE.ps1
│
├─ Is anything running?
│  ├─ NO → Start it:
│  │        docker compose up -d --build
│  │        OR .\QUICKSTART.ps1
│  │
│  └─ YES → Check the correct URL:
│           Docker: http://localhost:8080
│           Native: http://localhost:5173
│
├─ Getting "address already in use"?
│  └─ Run: .\scripts\DEBUG_PORTS.ps1
│     Then: docker compose down OR .\scripts\STOP.ps1
│
├─ Containers won't start?
│  └─ Check: docker info (is Docker running?)
│     Then: docker compose down
│            docker compose up -d --build
│
└─ Still broken?
   └─ Nuclear option:
      docker compose down
      .\scripts\CLEANUP.ps1
      docker system prune -a
      docker compose up -d --build
```

---

## Best Practices

1. **Always diagnose first**: Run `.\scripts\DIAGNOSE_STATE.ps1` before trying to fix anything
2. **Use Docker mode for production/demo**: More reliable, isolated, easier to manage
3. **Use native mode for development**: Faster iteration, direct access to code
4. **Clean stop before switching**: Don't run both modes simultaneously
5. **Check ports before starting**: Use `.\scripts\DEBUG_PORTS.ps1` to avoid conflicts
6. **Keep Docker Desktop running**: Required for Docker mode to work

---

## Quick Reference Cards

### 🚀 "I just want to START it"
```powershell
docker compose up -d --build
# Then visit: http://localhost:8080
```

### ⏸️ "I want to STOP it"
```powershell
docker compose stop
# OR for native: .\scripts\STOP.ps1
```

### 🔄 "I want to RESTART it"
```powershell
docker compose restart
# OR: .\scripts\DOCKER_REFRESH.ps1 (rebuild included)
```

### 🗑️ "I want to DELETE everything and start fresh"
```powershell
docker compose down
docker system prune -a  # (careful: removes all unused Docker data)
.\scripts\CLEANUP.ps1
docker compose up -d --build
```

### 🔍 "I want to know WHAT'S RUNNING"
```powershell
.\scripts\DIAGNOSE_STATE.ps1
```

---

## Environment Files

### docker-compose.yml
Main Docker configuration. Defines services, networks, volumes.
**Location:** Project root
**Don't modify** unless you know what you're doing.

### docker-compose.override.yml
Optional custom volume configuration (created by DOCKER_UPDATE_VOLUME.ps1).
**Location:** Project root
**Generated file** - can be deleted to revert to default volume.

### .env files
Not currently used, but can add them to customize environment variables.

---

## Data Persistence

### Docker Mode
Data stored in Docker volume: `sms_data_v*`
- View volumes: `docker volume ls`
- Inspect: `docker volume inspect sms_data_v1`
- Persists across container restarts
- Managed via `scripts/DOCKER_UPDATE_VOLUME.ps1`

### Native Mode
Data stored in `backend/student_management.db`
- SQLite database file
- Backup via Control Panel or `scripts/DEVTOOLS.ps1`

---

## Getting Help

1. **Check state**: `.\scripts\DIAGNOSE_STATE.ps1`
2. **Check logs**: `docker compose logs -f` (Docker) or check terminal output (Native)
3. **Check documentation**: See `docs/QUICKREF.md` and `docs/DOCKER.md`
4. **Check ports**: `.\scripts\DEBUG_PORTS.ps1`
5. **Clean and retry**: `.\scripts\CLEANUP.ps1` then rebuild

---

**Last Updated:** October 27, 2025  
**Generated by:** DIAGNOSE_STATE.ps1 diagnostic system
