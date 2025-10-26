# Quick Reference - Student Management System

## New Simplified Workflow (Docker-First)

### For End Users

```batch
# First time only
SETUP.bat          # Builds Docker image (~5 min)

# Daily use
QUICKSTART.bat     # Start the app
STOP.bat           # Stop the app
```

Access at: <http://localhost:8080>

### For Developers

```batch
DEVTOOLS.bat       # Open developer tools menu
```

Interactive menu with:

- **Docker Operations**: Build, logs, shell, cleanup
- **Diagnostics**: Port conflicts, API tests, database info
- **Native Mode**: Run Python backend + Node.js frontend directly (hot-reload)
- **Legacy**: Docker Compose multi-container setup

## What Changed

### Removed from Root

- `INSTALL.bat` → Replaced by `SETUP.bat`
- `RUN.bat` → Replaced by `QUICKSTART.bat`
- `UTILITIES.bat/.ps1` → Replaced by `DEVTOOLS.bat/.ps1`

These old scripts are archived in `Obsolete/native_scripts/` for reference.

### New Root Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `SETUP.bat/.ps1` | Build Docker image | First time only |
| `QUICKSTART.bat/.ps1` | Start fullstack container | Every time you want to run the app |
| `STOP.bat/.ps1` | Stop container | When done using the app |
| `DEVTOOLS.bat/.ps1` | Developer tools menu | Troubleshooting, advanced operations |

### Why This Change?

1. **Simpler onboarding**: 3 commands instead of complex native setup
2. **Consistent environment**: Docker ensures everyone runs the same stack
3. **No host dependencies**: No Python/Node.js required on user's machine
4. **Production-like**: Users experience the deployment environment
5. **Clear separation**: Run vs. Development tools

### Migration Guide

#### Old Way (Native)

```batch
INSTALL.bat              # Install Python, Node.js deps
RUN.bat                  # Start backend + frontend
UTILITIES.bat            # Menu for everything
```

#### New Way (Docker)

```batch
SETUP.bat                # Build Docker image (first time)
QUICKSTART.bat           # Start fullstack container
DEVTOOLS.bat             # Advanced tools & troubleshooting
```

#### For Developers Who Want Native Mode

Native mode (Python + Node.js hot-reload) is still available:

```batch
DEVTOOLS.bat
# Select option N: Start Native Backend+Frontend
```

Or directly:

```batch
.\Obsolete\native_scripts\INSTALL.bat  # Setup native deps
.\Obsolete\native_scripts\RUN.bat      # Run native
```

## Architecture

### Fullstack Container (Default)

- **What**: Single Docker container
- **Backend**: FastAPI on port 8000 (internal)
- **Frontend**: Built SPA served by FastAPI
- **Database**: SQLite on Docker volume
- **Exposed**: Port 8080 on host

### Docker Compose (Legacy)

- **What**: Multi-container setup
- **Backend**: FastAPI container
- **Frontend**: NGINX container serving SPA
- **Proxy**: NGINX proxies `/api/*` to backend
- **Exposed**: Port 8080 (NGINX)

### Native Mode (Development)

- **What**: Direct Python + Node.js execution
- **Backend**: Uvicorn on port 8000
- **Frontend**: Vite dev server on port 5173
- **Hot-reload**: Yes (both backend and frontend)

## Troubleshooting

### Docker Not Found

```batch
# Install Docker Desktop
https://www.docker.com/products/docker-desktop/
```

### Port 8080 Already in Use

```batch
.\QUICKSTART.ps1 -Port 9000  # Use different port
```

### Image Build Failed

```batch
DEVTOOLS.bat
# Select option 1: Build Fullstack Image
# Check logs for errors
```

### Container Won't Start

```batch
DEVTOOLS.bat
# Select option 6: Check Docker Status
# Select option 2: View Container Logs
```

### Need to Reset Database

```batch
DEVTOOLS.bat
# Select option R: Reset Database (Delete Volume)
# Then restart with QUICKSTART.bat
```

## Summary

**Simple workflow for everyone:**

1. `SETUP.bat` (once)
2. `QUICKSTART.bat` (daily)
3. `STOP.bat` (when done)

**Advanced operations:**

- `DEVTOOLS.bat` (diagnostics, native mode, compose)

**Result:**

- Clean, Docker-first experience
- Native mode still available for developers
- Clear separation between daily use and troubleshooting
