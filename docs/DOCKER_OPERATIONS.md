# Docker Operations Guide

**Version:** 1.3.8+
**Mode:** Docker-Only Release

This guide explains the operational architecture for the Student Management System Docker deployment and how to perform common tasks.

---

## 🏗️ Architecture: Host vs Container Separation

The system follows a **clean separation of concerns** between host operations and container operations:

### **Host Layer** (PowerShell Scripts)
- **Purpose:** Container lifecycle management and infrastructure control
- **Tools:** `SMS.ps1`, `SMART_SETUP.ps1`, Docker Compose
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
# Run the intelligent setup script
.\SMART_SETUP.ps1

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
- `.\SMART_SETUP.ps1 -Force` - Force rebuild with `--no-cache`
- `.\SMART_SETUP.ps1 -SkipStart` - Build images but don't start containers
- `.\SMART_SETUP.ps1 -Verbose` - Show detailed build output

---

### Daily Container Management

```powershell
# Start containers (detached mode)
.\SMS.ps1 -Quick

# View status (container health, ports, URLs)
.\SMS.ps1 -Status

# Stop all containers
.\SMS.ps1 -Stop

# Restart all containers
.\SMS.ps1 -Restart

# View backend logs (follow mode)
.\SMS.ps1 -Logs

# Show help and available commands
.\SMS.ps1 -Help
```

**Interactive Mode:**
```powershell
# Run without parameters for status display
.\SMS.ps1
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
.\SMS.ps1 -Stop

# 2. Rebuild images
docker compose build

# 3. Start containers
.\SMS.ps1 -Quick
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
.\SMS.ps1 -Logs

# View specific number of lines
docker logs student-management-system-backend-1 --tail 100

# Follow frontend logs
docker logs student-management-system-frontend-1 -f

# View all logs from both containers
docker compose logs -f
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

# Kill process by PID
taskkill /PID <PID> /F

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
| Stop Containers | Can't stop from inside | `.\SMS.ps1 -Stop` |
| Update Volumes | Requires host Docker access | `docker volume` commands |
| System Cleanup | Host filesystem operation | `docker system prune` |
| Restart System | Container lifecycle control | `.\SMS.ps1 -Restart` |

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
.\SMS.ps1 -Quick

# 2. Make code changes in your editor

# 3. Rebuild affected service
docker compose build backend  # or frontend

# 4. Restart containers
.\SMS.ps1 -Restart

# 5. Check logs for errors
.\SMS.ps1 -Logs

# 6. Test changes at http://localhost:8080
```

### Production Deployment Workflow

```powershell
# 1. Pull latest code
git pull origin main

# 2. Stop current containers
.\SMS.ps1 -Stop

# 3. Rebuild images (no cache for production)
docker compose build --no-cache

# 4. Start containers
.\SMS.ps1 -Quick

# 5. Verify health
.\SMS.ps1 -Status
# Or visit http://localhost:8080/health

# 6. Check Control Panel diagnostics
# http://localhost:8080 → Power Tab → Diagnostics
```

### Backup Before Upgrade

```powershell
# 1. Create database backup via Control Panel
# http://localhost:8080 → Power Tab → Operations → Create Database Backup

# 2. Stop containers
.\SMS.ps1 -Stop

# 3. Backup entire data volume (optional)
docker run --rm -v sms_data:/data -v ${PWD}/backups:/backup alpine tar czf /backup/sms_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# 4. Pull new version
git pull origin main

# 5. Rebuild and start
.\SMART_SETUP.ps1
```

---

## 📚 Additional Resources

- **Quick Start Guide:** [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
- **SMS.ps1 Reference:** Run `.\SMS.ps1 -Help`

---

## 💡 Tips

1. **Always use `SMS.ps1`** for container management instead of raw `docker compose` commands - it provides better output and error handling

2. **Check status frequently** with `.\SMS.ps1 -Status` to ensure containers are healthy

3. **Use the Control Panel** for application operations (diagnostics, database, logs) - it's designed for Docker mode

4. **Read the banner** in Control Panel - it shows helpful command examples for host operations

5. **Keep Docker Desktop running** - all operations require Docker to be available

6. **Version sync matters** - `SMART_SETUP.ps1` automatically syncs VERSION file to docker-compose .env

7. **Health checks are your friend** - FastAPI includes comprehensive health endpoints that Docker uses for container health

---

**Last Updated:** November 6, 2025
**Version:** 1.3.8
**Architecture:** Docker-First, Host/Container Separation
