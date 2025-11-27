# Docker Operations Guide

**Version:** 1.9.3+
**Mode:** Docker Deployment

This guide explains the operational architecture for the Student Management System Docker deployment and how to perform common tasks.

---

## 🏗️ Architecture: Host vs Container Separation

The system follows a **clean separation of concerns** between host operations and container operations:

### **Host Layer** (PowerShell Scripts)
- **Purpose:** Container lifecycle management and infrastructure control
- **Tools:** `DOCKER.ps1`, Docker Compose
- **Operations:**
  - Start/stop/restart containers
  - Build Docker images
  - View container status and logs
  - Manage Docker volumes
  - System cleanup

### **Container Layer** (Backend API)
- **Purpose:** Application operations and monitoring
- **Tools:** FastAPI endpoints, Web Control Panel
- **Operations:**
  - System status and health checks
  - Diagnostics and troubleshooting
  - Database backup/restore
  - Log viewing
  - Environment information

### **UI Layer** (React Control Panel)
- **Purpose:** User-friendly interface for Docker-safe operations
- **Location:** http://localhost:8080 → Power Tab
- **Features:**
  - Mode-aware UI (shows only Docker-compatible operations)
  - Real-time system monitoring
  - Diagnostic reports
  - Database management
  - Helpful command guidance for host operations

---

## 🚀 Common Operations

### First-Time Setup

```powershell
# Run the installation command
.\DOCKER.ps1 -Install

# What it does:
# ✅ Checks Docker availability (fails if not installed)
# ✅ Creates .env files from templates
# ✅ Syncs VERSION to docker-compose .env
# ✅ Builds Docker images
# ✅ Starts containers
# ✅ Waits for services to be ready
# ✅ Displays access URLs
```

**Options:**
- `.\DOCKER.ps1 -UpdateClean` - Force rebuild with `--no-cache`
- `.\DOCKER.ps1 -Status` - Check container status
- `.\DOCKER.ps1 -Help` - Show all available commands

---

### Daily Container Management

```powershell
# Start containers (detached mode)
.\DOCKER.ps1 -Start

# View status (container health, ports, URLs)
.\DOCKER.ps1 -Status

# Stop all containers
.\DOCKER.ps1 -Stop

# Restart all containers
.\DOCKER.ps1 -Stop; .\DOCKER.ps1 -Start

# View backend logs (follow mode)
.\DOCKER.ps1 -Logs

# Show help and available commands
.\DOCKER.ps1 -Help
```

**Interactive Mode:**
```powershell
# Run without parameters for help display
.\DOCKER.ps1
```

---

### Building and Updating

#### Rebuild After Code Changes

```powershell
# Rebuild specific service
docker compose build backend
docker compose build frontend

# Rebuild all services
docker compose build

# Rebuild without cache (clean build)
docker compose build --no-cache

# Rebuild and restart
docker compose up -d --build
```

#### Update After Pulling Changes

```powershell
# 1. Stop containers
.\DOCKER.ps1 -Stop

# 2. Rebuild images
docker compose build

# 3. Start containers
.\DOCKER.ps1 -Start
```

---

### Database Operations

#### Backup Database

**Via Control Panel:**
1. Navigate to http://localhost:8080 → Power Tab
2. Go to Operations tab
3. Click "Create Database Backup"
4. Backup saved to `backups/` directory

**Via Docker command:**
```powershell
docker compose exec backend python -c "from backend.db import backup_database; backup_database()"
```

#### Restore Database

**Via Control Panel:**
1. Go to Operations tab
2. View available backups
3. Select backup to restore
4. Confirm restoration

**Note:** Database operations are Docker-safe and work from within containers.

---

### Logs and Monitoring

#### View Logs

```powershell
# Follow backend logs (live updates)
.\DOCKER.ps1 -Logs

# View specific number of lines
docker logs sms-fullstack --tail 100

# View all logs
docker compose -f docker/docker-compose.yml logs -f
```

#### Health Checks

**Via Control Panel:**
- Navigate to Diagnostics tab for comprehensive health checks
- View system status, dependencies, configuration
- Check database health and schema version

**Via API:**
```powershell
# Basic health check
curl http://localhost:8080/health

# Readiness probe
curl http://localhost:8080/health/ready

# Liveness probe
curl http://localhost:8080/health/live
```

---

### Troubleshooting

#### Container Won't Start

```powershell
# Check container status
docker ps -a

# View container logs
docker logs student-management-system-backend-1
docker logs student-management-system-frontend-1

# Check Docker daemon
docker info

# Verify images exist
docker images | findstr sms
```

#### Port Conflicts

```powershell
# Check what's using port 8080
netstat -ano | findstr ":8080"

# Kill process by PID — operator guidance
# Prefer operator tooling; request frontend stop via the control API helper:
#   .\scripts\maintenance\stop_frontend_safe.ps1 -ControlUrl 'http://127.0.0.1:8000'
# Operator emergency (interactive, requires confirmation):
#   .\scripts\internal\KILL_FRONTEND_NOW.ps1 -Confirm

# Or change port in docker-compose.yml:
# ports:
#   - "8081:80"  # Frontend now on 8081
```

#### Database Issues

**Via Control Panel:**
1. Go to Diagnostics tab
2. Check Database status
3. View SMS Schema Version
4. Run troubleshooting from Control Panel

**Manual check:**
```powershell
# Access backend container
docker compose exec backend bash

# Check database file
ls -lh /data/student_management.db

# Run migrations
cd /app/backend && alembic upgrade head
```

#### Reset Everything

```powershell
# Stop and remove containers, networks, and volumes
docker compose down -v

# Remove images
docker rmi sms-backend:1.3.8 sms-frontend:1.3.8

# Fresh setup
.\SMART_SETUP.ps1
```

---

## 🔒 What You CANNOT Do From Control Panel (Docker Mode)

These operations require **host-level access** and must be run from PowerShell:

| Operation | Why It's Disabled | Alternative |
|-----------|-------------------|-------------|
| Install Dependencies | Built into Docker images | `docker compose build` |
| Build Docker Images | Container can't build itself | `docker compose build` |
| Stop Containers | Can't stop from inside | `.\DOCKER.ps1 -Stop` |
| Update Volumes | Requires host Docker access | `docker volume` commands |
| System Cleanup | Host filesystem operation | `.\DOCKER.ps1 -Prune` |
| Restart System | Container lifecycle control | `.\DOCKER.ps1 -Stop; .\DOCKER.ps1 -Start` |

**Why this separation?**
- **Security:** Containers shouldn't have Docker socket access
- **Reliability:** Prevents container self-termination issues
- **Clarity:** Clear boundary between app and infrastructure
- **Best Practice:** Follows Docker principle of single responsibility

---

## 📊 Container Details

### Backend Container
- **Image:** `sms-backend:1.3.8`
- **Base:** `python:3.11-slim`
- **Ports:** 8000 (internal only)
- **Volumes:**
  - `sms_data:/data` (database)
  - `./backend:/app/backend` (dev only)
- **Health Check:** `/health` endpoint
- **Entry Point:** `entrypoint.py` (runs migrations, starts Uvicorn)

### Frontend Container
- **Image:** `sms-frontend:1.3.8`
- **Base:** `nginx:alpine`
- **Ports:** 8080 (host) → 80 (container)
- **Content:** React SPA built files + nginx config
- **Reverse Proxy:** Routes `/api/v1/*` to backend container

---

## 🔄 Workflow Examples

### Development Workflow

```powershell
# 1. Start system
.\DOCKER.ps1 -Start

# 2. Make code changes in your editor

# 3. Rebuild affected service
docker compose -f docker/docker-compose.yml build

# 4. Restart containers
.\DOCKER.ps1 -Stop; .\DOCKER.ps1 -Start

# 5. Check logs for errors
.\DOCKER.ps1 -Logs

# 6. Test changes at http://localhost:8080
```

### Production Deployment Workflow

```powershell
# 1. Pull latest code
git pull origin main

# 2. Stop current containers
.\DOCKER.ps1 -Stop

# 3. Rebuild images (no cache for production)
.\DOCKER.ps1 -UpdateClean

# 4. Verify health
.\DOCKER.ps1 -Status
# Or visit http://localhost:8080/health

# 5. Check Control Panel diagnostics
# http://localhost:8080 → Power Tab → Diagnostics
```

### Backup Before Upgrade

```powershell
# 1. Create database backup via Control Panel
# http://localhost:8080 → Power Tab → Operations → Create Database Backup

# 2. Stop containers
.\DOCKER.ps1 -Stop

# 3. Backup entire data volume (optional)
docker run --rm -v sms_data:/data -v ${PWD}/backups:/backup alpine tar czf /backup/sms_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# 4. Pull new version
git pull origin main

# 5. Rebuild and start
.\DOCKER.ps1 -Update
```

---

## 📚 Additional Resources

- **Quick Start Guide:** [QUICK_START_GUIDE.md](../user/QUICK_START_GUIDE.md)
- **Architecture:** [ARCHITECTURE.md](../development/ARCHITECTURE.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md)
- **DOCKER.ps1 Reference:** Run `.\DOCKER.ps1 -Help`

---

## 💡 Tips

1. **Always use `DOCKER.ps1`** for container management instead of raw `docker compose` commands - it provides better output and error handling

2. **Check status frequently** with `.\DOCKER.ps1 -Status` to ensure containers are healthy

3. **Use the Control Panel** for application operations (diagnostics, database, logs) - it's designed for Docker mode

4. **Read the banner** in Control Panel - it shows helpful command examples for host operations

5. **Keep Docker Desktop running** - all operations require Docker to be available

6. **Version sync matters** - `DOCKER.ps1 -Install` automatically syncs VERSION file to docker-compose .env

7. **Health checks are your friend** - FastAPI includes comprehensive health endpoints that Docker uses for container health

---

**Last Updated:** December 2025
**Version:** 1.9.3
**Architecture:** Docker-First, Host/Container Separation
