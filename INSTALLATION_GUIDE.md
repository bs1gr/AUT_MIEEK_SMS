# Student Management System - Installation Guide

**Version**: 1.5.0
**Last Updated**: November 7, 2025

---

## 🎯 Overview

This guide will help you install and run the Student Management System on your computer. The entire process takes about **10-15 minutes** for first-time setup.

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
   .\RUN.ps1
   ```

   **For native development (devs only):**
   ```powershell
   pwsh -NoProfile -File scripts/dev/run-native.ps1
   ```

4. **Wait for first-time setup**
   - The first run takes 5-10 minutes (building Docker image)
   - You'll see progress messages
   - When you see "🎉 SMS is now running!", it's ready!

5. **Access the application**
   - Open your web browser
   - Go to: <http://localhost:8080>
   - You should see the Student Management dashboard

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

```powershell
.\RUN.ps1           # Start SMS (or check if already running)
.\RUN.ps1 -Stop     # Stop SMS
.\RUN.ps1 -Status   # Check if running
.\RUN.ps1 -Logs     # View application logs
.\RUN.ps1 -Update   # Update to latest version (with automatic backup)
.\RUN.ps1 -Backup   # Create manual database backup
```

**For native development:**
```powershell
pwsh -NoProfile -File scripts/dev/run-native.ps1
```

---

## 🔄 Updating SMS

To update to the latest version:

```powershell
.\RUN.ps1 -Update
```

This will:
1. ✅ Create automatic backup of your database
2. ✅ Download latest changes
3. ✅ Rebuild Docker image
4. ✅ Restart with new version

Your data is safe in the `backups/` directory.

---

## 🛑 Stopping SMS

To stop the application:

```powershell
.\RUN.ps1 -Stop
```

Or simply press `Ctrl+C` in the terminal where SMS is running (it will stop gracefully).

---

## 🚨 Troubleshooting

### Problem: "Docker is not available"

**Solution**:
1. Check if Docker Desktop is running (look for whale icon in system tray)
2. If not running, start Docker Desktop
3. Wait 1-2 minutes for Docker to fully start
4. Try `.\RUN.ps1` again

### Problem: "Port 8080 is already in use"

**Solution 1**: Find and stop the conflicting application:
```powershell
# Find what's using port 8080
netstat -ano | findstr ":8080"

# Note the PID (last column), then:
taskkill /PID <number> /F
```

**Solution 2**: Change SMS to use a different port:
```powershell
# Edit RUN.ps1, change line 33:
$PORT = 8081  # (or any other free port)
```

### Problem: "Build failed" or "Failed to start container"

**Solution**:
1. Check if you have enough disk space (need 10 GB free)
2. Restart Docker Desktop:
   - Right-click Docker whale icon
   - Select "Restart"
   - Wait 2 minutes
   - Try `.\RUN.ps1` again

3. If still failing, clean Docker:
   ```powershell
   docker system prune -a
   # Warning: This removes all unused Docker data!
   ```

### Problem: Application starts but web page doesn't load

**Solution**:
1. Wait 30 seconds (application may still be starting)
2. Check application status:
   ```powershell
   .\RUN.ps1 -Status
   ```
3. View logs for errors:
   ```powershell
   .\RUN.ps1 -Logs
   ```
4. If you see errors, take a screenshot and report the issue

### Problem: "Backup failed"

**Solution**:
1. Check if `backups/` directory exists
2. Make sure you have write permissions
3. Check disk space
4. Try manual backup:
   ```powershell
   .\RUN.ps1 -Backup
   ```

### Problem: Forgot to stop before shutdown

**Solution**:
Don't worry! Docker will auto-restart the container on next boot.
To stop it:
```powershell
.\RUN.ps1 -Stop
```

---

## 📁 File Structure

After installation, you'll have:

```
student-management-system/
├── RUN.ps1                    ← Canonical Docker entry point (one-click)
├── scripts/dev/run-native.ps1 ← Canonical native entry point (dev only)
├── SMS.ps1                    ← Docker management (optional)
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
- Before every update (`.\RUN.ps1 -Update`)
- Stored in `backups/` directory
- Named with timestamp and checksum (e.g., `sms_backup_20251106_143022_a1b2c3d4.db`)
- Last 10 backups are kept (older ones auto-deleted)

### Manual Backup

Create a backup anytime:

```powershell
.\RUN.ps1 -Backup
```


### Restore from Backup

1. Stop SMS:
   ```powershell
   .\RUN.ps1 -Stop
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
   .\RUN.ps1
   ```

---

## 🌐 Accessing from Other Devices

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
./RUN.ps1
```

> **Note:** Only RUN.ps1 (Docker) and scripts/dev/run-native.ps1 (native, dev only) are supported as entry points in v1.5.0+. All other scripts are deprecated or removed.

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
.\RUN.ps1 -Logs > logs.txt
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
- [ ] Ran `.\RUN.ps1` successfully
- [ ] Can access <http://localhost:8080>
- [ ] Imported sample data (optional)
- [ ] Created first student/course (optional)
- [ ] Bookmarked <http://localhost:8080>

**🎉 Congratulations! You're all set!**

---

**Version**: 1.5.0
**Last Updated**: November 7, 2025
**License**: MIT
