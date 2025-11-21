# 🚀 Deploy on New PC - Quick Installation Guide

This guide will help you install the Student Management System on a new computer in just a few minutes.

## Prerequisites

Before you begin, ensure your system meets these requirements:
- **OS**: Windows 10/11 (64-bit), macOS, or Linux
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 10GB free space
- **Admin**: Administrator/root privileges (for Docker installation)

## Method 1: Automated Installation (Recommended - Windows Only)

### Step 1: Download or Clone Repository

**Option A: Download ZIP from GitHub**
1. Go to https://github.com/bs1gr/AUT_MIEEK_SMS
2. Click green "Code" button → "Download ZIP"
3. Extract ZIP to your desired location (e.g., `C:\SMS` or `D:\Projects\SMS`)
4. Open PowerShell as Administrator in that folder

**Option B: Clone with Git**
```bash
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS
```

### Step 2: Run Automated Installer

**Right-click** on `INSTALL.ps1` and select **"Run with PowerShell as Administrator"**

Or from PowerShell (as Administrator):
```powershell
.\INSTALL.ps1
```

The installer will:
- ✅ Check system prerequisites
- ✅ Install Docker Desktop (if needed)
- ✅ Create environment configuration files
- ✅ Build Docker images
- ✅ Set up database volumes
- ✅ Verify installation

**That's it!** The installer handles everything automatically.

### Step 3: Start the Application

After installation completes:
```powershell
.\RUN.ps1
```

### Step 4: Access & Login

1. Open browser: **http://localhost:8082**
2. Click **Login** button (top-right)
3. Enter default credentials:
   - **Email:** `admin@example.com`
   - **Password:** `YourSecurePassword123!`
4. Click **Sign In**

### Step 5: ⚠️ Change Password (CRITICAL!)

**Immediately after first login:**
1. Go to **Control Panel** → **Maintenance** tab
2. Find **"Change Your Password"** section (teal card at top)
3. Enter current password: `YourSecurePassword123!`
4. Enter your new **strong** password (min 8 chars, mixed case, numbers, symbols)
5. Confirm and save

---

## Method 2: Manual Installation (All Platforms)

If you prefer manual setup or are using macOS/Linux:

### Step 1: Install Docker Desktop

**Windows:** https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
**macOS:** https://desktop.docker.com/mac/main/amd64/Docker.dmg
**Linux:** Follow instructions at https://docs.docker.com/engine/install/

### Step 2: Clone Repository

```bash
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS
```

### Step 3: Configure Environment

**Windows PowerShell:**
```powershell
# Copy root environment file
copy .env.example .env

# Copy backend environment file
copy backend\.env.example backend\.env
```

**Linux/Mac:**
```bash
# Copy root environment file
cp .env.example .env

# Copy backend environment file
cp backend/.env.example backend/.env
```

**Review and edit `.env` files:**
- Update `SECRET_KEY` with a secure random value
- Verify admin credentials (optional - defaults are fine for first run)
- Save files

### Step 4: Start Application

**Windows:**
```powershell
.\RUN.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy/run-docker-release.sh
./scripts/deploy/run-docker-release.sh
```

### Step 5: Login & Secure

1. Open **http://localhost:8082** (Docker) or **http://localhost:8000** (Native)
2. Login with: `admin@example.com` / `YourSecurePassword123!`
3. **Immediately change password** in Control Panel → Maintenance

---

## Updating Existing Installation

If you already have SMS installed and want to get the latest version:

**Windows:**
```powershell
# Pull latest changes from GitHub
git pull origin main

# Update with automatic backup
.\RUN.ps1 -Update

# Or clean update (rebuild from scratch)
.\RUN.ps1 -UpdateNoCache
```

**Linux/Mac:**
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting

### Installation Issues

#### Docker Desktop Not Starting
**Problem:** Docker Desktop won't start or shows errors
**Solution:**
1. Restart computer
2. Check Windows Features: Enable Hyper-V or WSL2
3. Reinstall Docker Desktop from https://www.docker.com/products/docker-desktop

#### Port Already in Use
**Problem:** Error: "Port 8082 is already in use"
**Solution:**
```powershell
# Windows: Find what's using the port
netstat -ano | findstr :8082

# Kill the process (replace PID with actual process ID)
taskkill /F /PID <PID>
```

#### Build Fails
**Problem:** Docker build fails or times out
**Solution:**
1. Check internet connection
2. Clear Docker cache: `.\RUN.ps1 -Prune`
3. Try clean build: `.\RUN.ps1 -UpdateNoCache`

### Login Issues

#### Can't Login / Invalid Credentials
**Problem:** "Invalid email or password" error
**Solution:**

**Option 1: Check environment files**
```powershell
# Verify .env file has admin settings
Get-Content .env | Select-String "DEFAULT_ADMIN"
```

**Option 2: Manually create admin user**
```powershell
# Docker mode
docker exec -it sms-app python /app/backend/tools/create_admin.py --email admin@example.com --password "YourSecurePassword123!"

# Native mode
python backend/tools/create_admin.py --email admin@example.com --password "YourSecurePassword123!"
```

#### Account Locked
**Problem:** "Account is locked" message
**Solution:** Wait 5 minutes (default lockout time) or restart the application

### Application Not Accessible

#### Browser Shows "Connection Refused"
**Problem:** Can't access http://localhost:8082
**Solution:**
1. Check if container is running: `.\RUN.ps1 -Status`
2. View logs for errors: `.\RUN.ps1 -Logs`
3. Verify Docker is running: `docker ps`

#### Application Crashes on Startup
**Problem:** Container stops immediately after starting
**Solution:**
```powershell
# Check logs for errors
.\RUN.ps1 -Logs

# Common fixes:
# 1. Database migration issue - check migrations.log
# 2. Port conflict - change PORT in .env
# 3. Invalid SECRET_KEY - regenerate in .env
```

### Database Issues

#### Data Lost After Restart
**Problem:** Students/courses disappear after restart
**Solution:**
- Verify volume exists: `docker volume ls | findstr sms_data`
- Check volume is mounted: `docker inspect sms-app | findstr sms_data`
- Restore from backup: Copy from `./backups/` directory

#### Migration Errors
**Problem:** "Migration failed" errors in logs
**Solution:**
```powershell
# Skip migrations temporarily (emergency only)
docker rm -f sms-app
docker run -d --name sms-app -e SMS_SKIP_MIGRATIONS=1 ...

# Then check migrations.log and fix schema issues
```

---

## Advanced Options

### Using PostgreSQL Instead of SQLite

For production deployments, PostgreSQL is recommended:

1. **Edit `.env` file:**
```env
DATABASE_ENGINE=postgresql
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=student_management
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=your-secure-password
```

2. **Restart application:**
```powershell
.\RUN.ps1 -Stop
.\RUN.ps1
```

See `docs/deployment/POSTGRES_MIGRATION_GUIDE.md` for migrating existing data.

### Running with Monitoring Stack

Enable Grafana and Prometheus monitoring:
```powershell
.\RUN.ps1 -WithMonitoring
```

Access:
- **Grafana:** http://localhost:3000 (admin/admin)
- **Prometheus:** http://localhost:9090
- **Metrics:** http://localhost:8082/metrics

### Development Mode

For developers who want to modify code:
```powershell
# Native mode (faster iteration)
.\scripts\dev\run-native.ps1

# Multi-container mode
docker-compose up -d
```

---

## Getting Help

### Documentation
- **Quick Start:** `docs/user/QUICK_START_GUIDE.md`
- **Full Documentation:** `docs/DOCUMENTATION_INDEX.md`
- **Installation Guide:** `INSTALLATION_GUIDE.md`
- **Deployment Guide:** `docs/deployment/DEPLOY.md`
- **API Documentation:** http://localhost:8082/docs (when running)

### Support
- **GitHub Issues:** https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- **Check Version:** `type VERSION` or `cat VERSION`
- **View Logs:** `.\RUN.ps1 -Logs`

### Useful Commands Reference

```powershell
# Application Management
.\RUN.ps1                    # Start application
.\RUN.ps1 -Stop              # Stop application
.\RUN.ps1 -Status            # Check status
.\RUN.ps1 -Logs              # View logs
.\RUN.ps1 -Update            # Update (with backup)
.\RUN.ps1 -UpdateNoCache     # Clean update
.\RUN.ps1 -Backup            # Manual backup

# Docker Management
.\RUN.ps1 -Prune             # Clean Docker cache
.\RUN.ps1 -PruneAll          # Clean cache + networks

# Monitoring
.\RUN.ps1 -WithMonitoring    # Start with Grafana/Prometheus
```

---

**Current Version:** v1.8.6.1
**Repository:** https://github.com/bs1gr/AUT_MIEEK_SMS
**License:** MIT
**Maintained by:** AUT MIEEK Team
