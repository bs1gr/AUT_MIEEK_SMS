# Troubleshooting Guide - Student Management System

This guide helps solve common issues when running the application on different PCs.

## 🔧 Quick Diagnosis Tool

**First, run the validator:**
```powershell
.\VALIDATE_SETUP.ps1
```

This will check all prerequisites and show specific issues.

**Try auto-fix:**
```powershell
.\VALIDATE_SETUP.ps1 -Fix
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Scripts Cannot Be Loaded" / "Execution Policy Error"

**Error Message:**
```
File cannot be loaded because running scripts is disabled on this system.
```

**Cause:** PowerShell execution policy is set to Restricted (Windows default).

**Solutions:**

#### Option A: Use the .bat wrapper (Easiest)
```bat
QUICKSTART.bat
```
The .bat file includes `-ExecutionPolicy Bypass` automatically.

#### Option B: Change execution policy for current user
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

#### Option C: Bypass for single execution
```powershell
powershell -ExecutionPolicy Bypass -File .\QUICKSTART.ps1
```

---

### Issue 2: "Python Not Found" / "Node.js Not Found"

**Error Message:**
```
Python 3.11+ not found
```

**Solutions:**

#### If you have Docker Desktop:
```powershell
# Docker mode doesn't need Python/Node.js installed
# Just start Docker Desktop and run:
.\QUICKSTART.ps1
```

#### If you want Native mode:

**Install Python 3.11+:**
1. Download from: https://www.python.org/downloads/
2. **IMPORTANT:** Check "Add Python to PATH" during installation
3. Restart PowerShell/Terminal
4. Verify: `python --version`

**Install Node.js 18+:**
1. Download from: https://nodejs.org/
2. Install (automatically adds to PATH)
3. Restart PowerShell/Terminal
4. Verify: `node --version`

**After installing, rerun:**
```powershell
.\QUICKSTART.ps1
```

---

### Issue 3: "Docker Daemon Not Running"

**Error Message:**
```
Cannot connect to the Docker daemon
```

**Solutions:**

1. **Start Docker Desktop:**
   - Press Windows key, search "Docker Desktop"
   - Click to start
   - Wait 1-2 minutes for it to fully start (whale icon in system tray should be steady)

2. **Verify Docker is running:**
   ```powershell
   docker info
   ```

3. **If Docker Desktop won't start:**
   - Enable WSL 2: https://docs.microsoft.com/en-us/windows/wsl/install
   - Enable Virtualization in BIOS
   - Restart computer

4. **Alternative - Use Native mode:**
   ```powershell
   .\SMART_SETUP.ps1 -PreferNative
   ```

---

### Issue 4: "Port Already in Use"

**Error Message:**
```
Port 8080 (or 8000, 5173) is already in use
```

**Solutions:**

#### Option A: Stop conflicting service
```powershell
# Find what's using the port
netstat -ano | findstr ":8080"

# Stop the process (replace PID with actual number)
taskkill /PID <PID> /F
```

#### Option B: Use SMS.ps1 diagnostics
```powershell
.\SMS.ps1
# Select: Diagnostics → Check Port Conflicts → Kill Process
```

#### Option C: Change ports (Docker mode)
Edit `docker-compose.yml`:
```yaml
ports:
  - "8081:8080"  # Use 8081 instead of 8080
```

---

### Issue 5: "Permission Denied" / "Access Denied"

**Error Message:**
```
Access to the path is denied
```

**Solutions:**

#### Option A: Run as Administrator
1. Right-click PowerShell/Command Prompt
2. Select "Run as Administrator"
3. Navigate to project folder
4. Run: `.\QUICKSTART.bat`

#### Option B: Fix folder permissions
1. Right-click project folder → Properties
2. Security tab → Edit
3. Give your user "Full Control"
4. Click Apply

#### Option C: Move to different location
```powershell
# Avoid C:\Program Files or protected folders
# Use: C:\Projects\AUT_MIEEK_SMS
```

---

### Issue 6: "Antivirus Blocking Scripts"

**Symptoms:**
- Scripts start then immediately stop
- Files appear but then disappear
- "Access denied" errors

**Solutions:**

#### Option A: Add exception in Windows Defender
1. Windows Security → Virus & threat protection
2. Manage settings → Add or remove exclusions
3. Add folder: `C:\Path\To\AUT_MIEEK_SMS`

#### Option B: Temporarily disable antivirus
1. Disable real-time protection temporarily
2. Run `.\QUICKSTART.ps1`
3. Re-enable protection after setup completes

#### Option C: Use pre-built Docker image (safest)
```powershell
# Pull pre-built image instead of building locally
docker pull ghcr.io/bs1gr/aut_mieek_sms:latest
```

---

### Issue 7: "Module Not Found" Errors in Python

**Error Message:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Cause:** Dependencies not installed or wrong Python environment.

**Solutions:**

#### Option A: Force reinstall
```powershell
.\SMART_SETUP.ps1 -Force
```

#### Option B: Manual install
```powershell
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Option C: Check Python interpreter
```powershell
# Make sure using the correct Python
where python
python --version

# Should be 3.11+ and in PATH
```

---

### Issue 8: "npm Install Fails" / Frontend Errors

**Error Message:**
```
npm ERR! network error
```

**Solutions:**

#### Clear npm cache and retry:
```powershell
cd frontend
npm cache clean --force
rm -r node_modules -Force
npm install
```

#### Use different npm registry:
```powershell
npm config set registry https://registry.npmjs.org/
npm install
```

#### Update npm itself:
```powershell
npm install -g npm@latest
```

---

### Issue 9: "Database Migration Failed"

**Error Message:**
```
ERROR [alembic.runtime.migration] Error running migrations
```

**Solutions:**

#### Option A: Delete and recreate database
```powershell
# Docker mode
docker volume rm sms_data
.\QUICKSTART.ps1

# Native mode
Remove-Item -Force data\student_management.db
.\QUICKSTART.ps1
```

#### Option B: Manual migration
```powershell
cd backend
alembic upgrade head
```

---

### Issue 10: Scripts Do Nothing / No Output

**Symptoms:**
- Double-click .bat file → nothing happens
- No error messages, just closes immediately

**Solutions:**

#### Run from command line to see errors:
```powershell
# Open PowerShell in project folder
cd C:\Path\To\AUT_MIEEK_SMS

# Run with pause to see errors
.\QUICKSTART.bat
pause
```

#### Check logs:
```powershell
# View setup log
Get-Content setup.log -Tail 50

# View application logs
Get-Content backend\logs\app.log -Tail 50
```

---

## 🔍 Step-by-Step Fresh Install Process

If nothing works, try this clean installation:

### Step 1: Clean Environment
```powershell
# Remove any partial installations
.\CLEANUP.bat

# Or manually:
Remove-Item -Recurse -Force backend\venv -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend\node_modules -ErrorAction SilentlyContinue
```

### Step 2: Validate Prerequisites
```powershell
.\VALIDATE_SETUP.ps1
# Fix any issues shown
```

### Step 3: Choose Mode

#### For Docker Mode:
```powershell
# Start Docker Desktop (wait for it to be ready)
docker info  # Should succeed

# Run
.\QUICKSTART.ps1
```

#### For Native Mode:
```powershell
# Ensure Python 3.11+ and Node.js 18+ installed
python --version  # Check version
node --version    # Check version

# Force native mode
.\SMART_SETUP.ps1 -PreferNative
```

### Step 4: Monitor Installation
```powershell
# Watch the setup log in real-time (new terminal)
Get-Content setup.log -Wait -Tail 20
```

### Step 5: Verify Success
```powershell
# Check status
.\SMS.ps1 -Status

# Access application
# Docker: http://localhost:8080
# Native: http://localhost:5173
```

---

## 📝 Collecting Diagnostic Information

If you need to report an issue, collect this information:

```powershell
# System info
.\VALIDATE_SETUP.ps1 > diagnostic_report.txt

# PowerShell version
$PSVersionTable >> diagnostic_report.txt

# Python version
python --version >> diagnostic_report.txt 2>&1

# Node version
node --version >> diagnostic_report.txt 2>&1

# Docker version
docker --version >> diagnostic_report.txt 2>&1
docker info >> diagnostic_report.txt 2>&1

# Recent logs
Get-Content setup.log -Tail 100 >> diagnostic_report.txt
```

Share `diagnostic_report.txt` when asking for help.

---

## 🚀 Alternative Installation Methods

### Method 1: Download Release Package (No Git)
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest
2. Download **Source code (zip)**
3. Extract to `C:\SMS\`
4. Run `QUICKSTART.bat`

### Method 2: Clone with Git
```powershell
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS
.\QUICKSTART.bat
```

### Method 3: Manual Setup (Advanced)
```powershell
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn backend.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🆘 Still Having Issues?

1. **Check existing logs:**
   - `setup.log` - Installation process
   - `backend/logs/app.log` - Application runtime

2. **Run validation with fix:**
   ```powershell
   .\VALIDATE_SETUP.ps1 -Fix
   ```

3. **Try Docker mode** (most reliable):
   ```powershell
   # Install Docker Desktop
   # Then run:
   .\QUICKSTART.ps1
   ```

4. **Check GitHub Issues:**
   https://github.com/bs1gr/AUT_MIEEK_SMS/issues

5. **Create detailed issue report:**
   Include `diagnostic_report.txt` and `setup.log`

---

## ✅ Success Indicators

You'll know it's working when:

- ✅ `QUICKSTART.ps1` completes without errors
- ✅ Browser opens automatically (or URL is shown)
- ✅ Application loads at http://localhost:8080 (or 5173)
- ✅ API docs accessible at `/docs`
- ✅ No errors in `setup.log`

---

## 📞 Quick Reference Commands

```powershell
# Validate system
.\VALIDATE_SETUP.ps1

# Start application
.\QUICKSTART.ps1

# Stop application
.\SMS.ps1 -Stop

# Check status
.\SMS.ps1 -Status

# Force reinstall
.\QUICKSTART.ps1 -Force

# View logs
Get-Content setup.log -Tail 50

# Interactive menu
.\SMS.ps1
```

---

**Last Updated:** October 2025  
**For more help:** Check README.md and ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md
