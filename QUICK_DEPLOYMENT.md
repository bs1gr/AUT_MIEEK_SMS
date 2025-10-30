# Student Management System - Quick Deployment Card

## 🚀 One-Click Installation (Recommended)

**For computers with internet:**
```batch
INSTALLER.bat
```
Double-click and follow prompts!

---

## 📦 Offline Deployment (Air-gapped)

### Step 1: Create Package (on computer with internet)
```batch
CREATE_DEPLOYMENT_PACKAGE.bat
```
Choose option 3 (compressed with Docker image)

### Step 2: Transfer to Target Computer
Copy `deployment-package.zip` via USB/network

### Step 3: Extract and Install
```batch
# Extract the ZIP file
# Then double-click:
INSTALLER.bat
```

---

## 🔧 System Requirements

### Docker Mode (Recommended)
- ✅ Windows 10/11 (64-bit)
- ✅ Docker Desktop
- ✅ 4 GB RAM
- ✅ 10 GB disk space

### Native Mode (Alternative)
- ✅ Windows 10/11 (64-bit)
- ✅ Python 3.11+
- ✅ Node.js 18+
- ✅ 2 GB RAM
- ✅ 5 GB disk space

---

## 📋 Quick Commands

| Action | Command |
|--------|---------|
| **Install** | `INSTALLER.bat` |
| **Start** | `QUICKSTART.bat` |
| **Stop** | `scripts\STOP.ps1` |
| **Manage** | `SMS.ps1` |
| **Status** | `SMS.ps1 -Status` |

---

## 🌐 Access URLs

After starting:
- **Frontend**: http://localhost:8080
- **API Docs**: http://localhost:8000/docs
- **Control Panel**: http://localhost:8080/control

---

## 🛠️ Troubleshooting

### Docker not running?
```powershell
# Start Docker Desktop from Start Menu
# Wait 1-2 minutes, then retry
```

### Port already in use?
```powershell
.\SMS.ps1
# Select: Diagnostics → Check Port Conflicts
```

### Need diagnostics?
```powershell
.\scripts\internal\DIAGNOSE_STATE.ps1
```

---

## 📚 Full Documentation

- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **User Manual**: `README.md`
- **Greek Guide**: `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md`

---

## 🎯 Three Ways to Deploy

### 1️⃣ Online Installation
Best for: Individual computers with internet
```batch
INSTALLER.bat
```

### 2️⃣ Offline Package
Best for: Air-gapped environments, multiple computers
```batch
# On source computer:
CREATE_DEPLOYMENT_PACKAGE.bat

# On target computer:
INSTALLER.bat
```

### 3️⃣ Manual Setup
Best for: Developers, custom configurations
```powershell
# Docker Mode:
.\scripts\SETUP.ps1
.\QUICKSTART.bat

# Native Mode:
cd backend && pip install -r requirements.txt
cd frontend && npm install
.\QUICKSTART.ps1
```

---

## ⚡ Super Quick Start

**Fastest path to running application:**

1. **Windows 10/11 with internet?**
   → Double-click `INSTALLER.bat`

2. **Air-gapped environment?**
   → Create package elsewhere, copy, run `INSTALLER.bat`

3. **Already have Docker Desktop running?**
   → Skip installer, just run `QUICKSTART.bat`

---

## 💡 Tips

- **First time?** Use the installer - it checks everything
- **Multiple computers?** Create one package, deploy everywhere
- **No Docker?** Installer falls back to Python + Node.js automatically
- **Stuck?** Run `.\SMS.ps1` for interactive help and diagnostics

---

**Need help?** Check `DEPLOYMENT_GUIDE.md` for detailed instructions!
