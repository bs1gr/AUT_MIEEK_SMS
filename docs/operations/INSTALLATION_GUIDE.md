# Student Management System - Installation Guide

**Version**: 1.9.8
**Last Updated**: December 4, 2025
**Latest Improvements**: Rate limiting fixes, infinite loop resolution, CI/CD enhancements

---

## 🎯 Overview

This guide will help you install and run the Student Management System on your computer. The entire process takes about **10-15 minutes** for first-time setup.

### What's New in $11.9.8
- ✅ **Critical Rate Limiting Fix**: 21 GET endpoints now properly protected (prevents 429 errors)
- ✅ **Infinite Loop Fixes**: Eliminated cascade requests in AttendanceView and StudentProfile
- ✅ **CI/CD Pipeline Enhanced**: Trivy security scanning now handles failures gracefully
- ✅ **Stability Improved**: 1383 tests passing (361 backend + 1022 frontend)
- ✅ **100% Linting Clean**: Frontend ESLint validation complete

---

## 📋 Prerequisites

### What You Need

1. **Windows 10/11** (64-bit)
   - For Mac/Linux users, see [Advanced Installation](#advanced-installation-maclinux)

2. **Docker Desktop** (free)
   - Download from: <https://www.docker.com/products/docker-desktop>
   - Minimum system requirements:
     - 4 GB RAM (8 GB recommended)
     - 10 GB free disk space
     - WSL 2 enabled (Windows automatically enables this)

3. **Internet Connection**
   - Required for first-time download and image build

---

## 🚀 Installation Steps

### Step 1: Install Docker Desktop

1. **Download Docker Desktop**
   - Visit <https://www.docker.com/products/docker-desktop>
   - Click "Download for Windows"
   - Run the installer (`Docker Desktop Installer.exe`)

2. **Install with default settings**
   - Accept the license agreement
   - Use WSL 2 (recommended)
   - Start Docker Desktop after installation

3. **Verify Docker is running**
   - Look for the Docker whale icon in your system tray
   - Icon should be stable (not animated)
   - If you see "Docker Desktop is starting...", wait a minute

### Step 2: Download SMS

**Option A: Download ZIP** (Easiest)

1. Go to: <https://github.com/bs1gr/AUT_MIEEK_SMS>
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to a folder (e.g., `C:\SMS\student-management-system`)

**Option B: Clone with Git** (If you have Git installed)

```powershell
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS
```

### Step 3: Run SMS

1. **Open PowerShell**
   - Press `Win + X`
   - Select "Windows PowerShell" or "Terminal"

2. **Navigate to SMS directory**

   ```powershell
   cd C:\SMS\student-management-system
   ```

   (Replace with your actual path)

3. **Start SMS (Docker, recommended)**

   ```powershell
   .\DOCKER.ps1 -Start
   ```

   **For native development (devs only):**

   ```powershell
   .\NATIVE.ps1 -Start
   ```

4. **Wait for first-time setup**
   - The first run takes 5-10 minutes (building Docker image)
   - You'll see progress messages
   - When you see "🎉 SMS is now running!", it's ready!

5. **Access the application**
   - Open your web browser
   - Go to: <http://localhost:8080>
   - You should see the Student Management dashboard

**First-Time Features**:

- Automatic database initialization
- Rate limiting enabled (1000 reads/min, 600 writes/min)
- Health checks running
- Offline mode ready (PWA enabled)

---

## 🎉 You're Done!

The application is now running. Here's what you can do:

### Access Points

| URL | Description |
|-----|-------------|
| <http://localhost:8080> | Main application |
| <http://localhost:8080/docs> | API documentation |
| <http://localhost:8080/health> | Health status |

### Daily Usage

**Docker Deployment (Production/Testing)**:

```powershell
.\DOCKER.ps1 -Start              # Start SMS (or check if already running)
.\DOCKER.ps1 -Stop               # Stop SMS
.\DOCKER.ps1 -Status             # Check if running
.\DOCKER.ps1 -Logs               # View application logs
.\DOCKER.ps1 -Update             # Update to latest version (with automatic backup)
.\DOCKER.ps1 -UpdateClean        # Clean update (rebuild from scratch)
.\DOCKER.ps1 -Backup             # Create manual database backup
.\DOCKER.ps1 -WithMonitoring     # Start with Grafana/Prometheus monitoring
```

**Native Development (Hot Reload)**:

```powershell
.\NATIVE.ps1 -Start              # Start backend + frontend with auto-reload
.\NATIVE.ps1 -Backend            # Backend only (uvicorn --reload)
.\NATIVE.ps1 -Frontend           # Frontend only (Vite HMR)
.\NATIVE.ps1 -Stop               # Stop all processes
.\NATIVE.ps1 -Status             # Check status
```

**Pre-Commit Quality Checks**:

```powershell
.\COMMIT_READY.ps1 -Quick        # Quick validation (2-3 min)
.\COMMIT_READY.ps1 -Standard     # Standard checks (5-8 min)
.\COMMIT_READY.ps1 -Full         # Full validation (15-20 min)
```

---

## 🔄 Updating SMS

### Standard Update (Recommended)

```powershell
.\DOCKER.ps1 -Update
```

This will:
1. ✅ Create automatic backup of your database
2. ✅ Download latest changes via git
3. ✅ Rebuild Docker image
4. ✅ Restart with new version

### Clean Update (Full Rebuild)

```powershell
.\DOCKER.ps1 -UpdateClean
```

Use this if you encounter build issues:
1. ✅ Creates backup
2. ✅ Clears Docker cache (no-cache build)
3. ✅ Fresh image build
4. ✅ Full restart

**Your data is always safe** in the `backups/` directory.

### $11.9.8 Specific Updates

If upgrading from $11.9.8 or earlier, you'll benefit from:
- Fixed rate limiting (no more 429 errors)
- Faster AttendanceView (eliminated duplicate requests)
- Smoother StudentProfile loading
- Better error handling in CI/CD pipeline

---

## 🛑 Stopping SMS

To stop the application:

```powershell
.\DOCKER.ps1 -Stop
```

Or simply press `Ctrl+C` in the terminal where SMS is running (it will stop gracefully).

---

## 🚨 Troubleshooting

### Problem: "Docker is not available"

**Solution**:

1. Check if Docker Desktop is running (look for whale icon in system tray)
2. If not running, start Docker Desktop
3. Wait 1-2 minutes for Docker to fully start
4. Try `.\DOCKER.ps1 -Start` again

### Problem: "Port 8080 is already in use"

**Solution 1**: Find and stop the conflicting application:

```powershell
# Find what's using port 8080
netstat -ano | findstr ":8080"

# Stop SMS if it's running
.\DOCKER.ps1 -Stop
```

**Solution 2**: Change SMS to use a different port by editing the docker-compose configuration.

### Problem: "Build failed" or "Failed to start container"

**Solution**:

1. Check if you have enough disk space (need 10 GB free)
2. Check Docker logs for errors: `docker logs sms-app`
3. Try a clean update:

```powershell
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -UpdateClean
```

4. If still failing, restart Docker Desktop:
   - Right-click Docker whale icon
   - Select "Restart"
   - Wait 2 minutes
   - Try `.\DOCKER.ps1 -Start` again

3. If still failing, clean Docker:

   ```powershell
   .\DOCKER.ps1 -DeepClean
   # Warning: This removes all unused Docker data!
   ```

### Problem: Application starts but web page doesn't load

**Solution**:

1. Wait 30 seconds (application may still be starting)
2. Check application status:

   ```powershell
   .\DOCKER.ps1 -Status
   ```

3. View logs for errors:

   ```powershell
   .\DOCKER.ps1 -Logs
   ```

4. If you see errors, take a screenshot and report the issue

### Problem: "Backup failed"

**Solution**:

1. Check if `backups/` directory exists
2. Make sure you have write permissions
3. Check disk space
4. Try manual backup:

   ```powershell
   .\DOCKER.ps1 -Backup
   ```

### Problem: Forgot to stop before shutdown

**Solution**:
Don't worry! Docker will auto-restart the container on next boot.
To stop it:

```powershell
.\DOCKER.ps1 -Stop
```

---

## 📁 File Structure

After installation, you'll have:

```text
student-management-system/
├── DOCKER.ps1                 ← Docker deployment script (v2.0)
├── NATIVE.ps1                 ← Native development script (v2.0)
├── VERSION                    ← Current version number
├── docker/                    ← Docker configuration
├── backend/                   ← Application code
├── frontend/                  ← Web interface code
├── templates/                 ← Import templates (CSV, JSON)
├── backups/                   ← Database backups (auto-created)
├── data/                      ← Application data (inside Docker)
└── docs/                      ← Documentation
```

---

## 💾 Backup and Data

### Automatic Backups

Backups are created automatically:

- Before every update (`.\DOCKER.ps1 -Update`)
- Stored in `backups/` directory
- Named with timestamp and checksum (e.g., `sms_backup_20251106_143022_a1b2c3d4.db`)
- Last 10 backups are kept (older ones auto-deleted)

### Manual Backup

Create a backup anytime:

```powershell
.\DOCKER.ps1 -Backup
```

### Restore from Backup

1. Stop SMS:

   ```powershell
   .\DOCKER.ps1 -Stop
   ```

2. Find your backup file in `backups/` directory

3. Replace the database:

   ```powershell
   # Copy backup into Docker volume
   docker run --rm -v sms_data:/data -v ${PWD}/backups:/backups alpine `
     cp /backups/sms_backup_XXXXXX_XXXXXX.db /data/student_management.db
   ```

4. Start SMS:

   ```powershell
   .\DOCKER.ps1 -Start
   ```

---

## 🧪 Testing & Validation

To verify everything is working correctly after installation:

```powershell
# Run comprehensive smoke tests
.\COMMIT_READY.ps1 -Quick

# Check system health
.\DOCKER.ps1 -Logs

# Verify rate limiting is working
# (API should respond with 1000 read requests/min, 600 writes/min limits)
```

---

## 📊 Performance Expectations

### $11.9.8 Baseline (After Installation)

| Metric | Target | Status |
|--------|--------|--------|
| Page Load | < 1s | ✅ |
| API Response | < 50ms | ✅ |
| Student List | < 2s | ✅ |
| Attendance View | < 1.5s | ✅ |
| Rate Limit (Read) | 1000/min | ✅ |
| Rate Limit (Write) | 600/min | ✅ |

If your performance is significantly worse, see troubleshooting section above.

---

## 🎯 Known Issues & Fixes ($11.9.8)

All critical issues from $11.9.8 and earlier are **FIXED**:

- ✅ **429 Rate Limit Errors** - FIXED (21 GET endpoints now protected)
- ✅ **AttendanceView Duplicates** - FIXED (infinite loop eliminated)
- ✅ **Slow StudentProfile** - FIXED (event listener loop resolved)
- ✅ **CI/CD SARIF Upload** - FIXED (graceful failure handling)

If you're upgrading from an older version, run:

```powershell
.\DOCKER.ps1 -UpdateClean
```

---

To access SMS from other computers on your network:

1. **Find your computer's IP address**:
   ```powershell
   ipconfig | findstr IPv4
   ```
   (Look for something like `192.168.1.100`)

2. **Allow firewall access**:
   - Windows will ask if you want to allow Docker
   - Click "Allow access"

3. **Access from other device**:
   - Open browser on another computer
   - Go to: `http://YOUR_IP:8080`
   - Example: `http://192.168.1.100:8080`

**Note**: Both devices must be on the same network (e.g., same Wi-Fi)

---

## 🖥️ QNAP Installation

To run SMS on a QNAP NAS:

1. **Install Container Station**
   - Open App Center
   - Search for "Container Station"
   - Install

2. **Create Container**
   - Open Container Station
   - Click "Create" → "Create Application"
   - Use this configuration:

   ```yaml
   version: '3.8'
   services:
     sms:
       image: sms-fullstack:1.4.0
       container_name: sms-app
       ports:
         - "8080:8000"
       volumes:
         - sms_data:/app/data
         - /share/sms/templates:/app/templates:ro
       restart: unless-stopped

   volumes:
     sms_data:
   ```

3. **Build the image** (on your computer first):
   ```powershell
   docker build -t sms-fullstack:1.4.0 -f docker/Dockerfile.fullstack .
   docker save sms-fullstack:1.4.0 -o sms-fullstack-1.4.0.tar
   ```

4. **Upload to QNAP**:
   - Go to Container Station → Images
   - Click "Import"
   - Upload the `.tar` file

5. **Start container**:
   - Go to Containers
   - Find `sms-app`
   - Click "Start"

6. **Access**:
   - `http://QNAP_IP:8080`

---


## 🔧 Advanced Installation (Mac/Linux)

### Mac/Linux (with Docker)

Same as Windows, but use Terminal instead of PowerShell:

```bash
# Start SMS (Docker)
pwsh ./DOCKER.ps1 -Start

# Or use docker compose directly
docker compose up -d --build
```

> **Note:** Only `DOCKER.ps1` (Docker) and `NATIVE.ps1` (native development) are supported entry points in $11.9.7+. All legacy scripts were consolidated.

---

## 📞 Getting Help

### Resources

- **Documentation**: `docs/` folder
- **User Manual (Greek)**: `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md`
- **Quick Start (Greek)**: `ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md`
- **GitHub Issues**: <https://github.com/bs1gr/AUT_MIEEK_SMS/issues>

### Logs

If you need to report an issue, include logs:

```powershell
.\DOCKER.ps1 -Logs > logs.txt
```

This saves logs to `logs.txt` which you can share.

### Health Check

Check if everything is working:

1. Open: <http://localhost:8080/health>
2. You should see a JSON response with:
   - `status: "healthy"`
   - `database: "connected"`
   - `migrations: "up_to_date"`

---

## 🎓 Next Steps

After installation:

1. **Import sample data**:
   - Go to Operations tab
   - Import `templates/courses_template.json` (26 courses)
   - Import `templates/students_import_template.csv` (sample students)

2. **Explore features**:
   - Dashboard: Overview and statistics
   - Students: Manage student records
   - Courses: Course management
   - Attendance: Track attendance
   - Grading: Manage grades
   - Calendar: View academic calendar

3. **Configure**:
   - Set academic year in system settings
   - Configure grading scale (default: Greek 0-20)
   - Set absence penalty rules

---

## ✅ Installation Checklist

- [ ] Docker Desktop installed and running
- [ ] SMS downloaded and extracted
- [ ] Ran `.\DOCKER.ps1 -Start` successfully
- [ ] Can access <http://localhost:8080>
- [ ] Imported sample data (optional)
- [ ] Created first student/course (optional)
- [ ] Bookmarked <http://localhost:8080>

**🎉 Congratulations! You're all set!**

---

**Version**: 1.9.3
**Last Updated**: January 2025
**License**: MIT


