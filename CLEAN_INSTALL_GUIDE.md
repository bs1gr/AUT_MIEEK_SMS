# Clean Installation Guide

## Problem: Old/Obsolete Docker Images

If you're seeing version **1.8.2** or other obsolete versions being pulled instead of the latest **1.8.4**, follow these steps:

---

## 🔧 Quick Fix (One Command)

```powershell
.\RUN.ps1 -UpdateNoCache
```

This will:
1. Create a backup
2. Remove all obsolete images
3. Rebuild from scratch with latest code
4. Start the application

---

## 🧹 Manual Cleanup (If Needed)

### Step 1: Check Current Images

```powershell
docker images sms-fullstack
```

You should see something like:
```
REPOSITORY      TAG       IMAGE ID       CREATED         SIZE
sms-fullstack   1.8.4     abc123def456   2 hours ago     1.2GB
sms-fullstack   1.8.2     old789old012   2 days ago      1.1GB
```

### Step 2: Remove Obsolete Images

**Option A: Remove specific version**
```powershell
docker rmi sms-fullstack:1.8.2
```

**Option B: Remove ALL old sms-fullstack images**
```powershell
# Stop container first
.\RUN.ps1 -Stop

# Remove all sms-fullstack images
docker rmi $(docker images sms-fullstack -q) -f

# Or on Windows PowerShell:
docker images sms-fullstack -q | ForEach-Object { docker rmi $_ -f }
```

**Option C: Use built-in prune (Recommended)**
```powershell
.\RUN.ps1 -PruneAll
```

This removes:
- Stopped containers
- Unused images
- Build cache
- Obsolete sms-fullstack images (automatically detected)

### Step 3: Verify Cleanup

```powershell
docker images sms-fullstack
```

Should show only the latest version or nothing at all.

### Step 4: Rebuild Latest

```powershell
# Build and start latest version
.\RUN.ps1
```

Or for a completely clean build:
```powershell
.\RUN.ps1 -UpdateNoCache
```

---

## 🆕 Fresh Installation on New PC

### Prerequisites
1. **Docker Desktop** installed and running
2. **Git** for cloning the repository
3. **PowerShell 7+** (recommended) or Windows PowerShell 5.1+

### Installation Steps

```powershell
# 1. Clone the repository
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS

# 2. Check the VERSION file (should be 1.8.4 or later)
Get-Content .\VERSION

# 3. Start the application (will build latest)
.\RUN.ps1
```

The script will:
- ✅ Read version from `VERSION` file (1.8.4)
- ✅ Build Docker image tagged as `sms-fullstack:1.8.4`
- ✅ Start the container
- ✅ Display access URLs

---

## 🔍 Troubleshooting

### Issue: Script pulls wrong version

**Check 1: VERSION file content**
```powershell
Get-Content .\VERSION
```
Should show: `1.8.4`

**Check 2: What image is being built?**
```powershell
# Check RUN.ps1 logic
Select-String -Path .\RUN.ps1 -Pattern "IMAGE_TAG =" -Context 2
```

**Check 3: Docker cache might have old layers**
```powershell
# Force clean rebuild
.\RUN.ps1 -UpdateNoCache
```

### Issue: Multiple versions installed

**Check all images:**
```powershell
docker images | Select-String "sms-fullstack"
```

**Remove all and start fresh:**
```powershell
# Stop everything
.\RUN.ps1 -Stop

# Remove all sms-fullstack images
docker images sms-fullstack -q | ForEach-Object { docker rmi $_ -f }

# Clean rebuild
.\RUN.ps1 -UpdateNoCache
```

### Issue: Container runs old version despite image being new

**Check running container:**
```powershell
docker ps --filter "name=sms-app" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

**Restart with new image:**
```powershell
.\RUN.ps1 -Stop
.\RUN.ps1
```

---

## 📊 Verify Installation

After installation, verify the correct version:

### 1. Check Docker Image
```powershell
docker images sms-fullstack
# Should show: sms-fullstack   1.8.4   ...
```

### 2. Check Running Container
```powershell
docker ps --filter "name=sms-app"
# Should show container running sms-fullstack:1.8.4
```

### 3. Check Application Version
Open browser: http://localhost:8082

Check the footer or about page for version 1.8.4

### 4. Check Health Endpoint
```powershell
curl http://localhost:8082/health
```

Look for version information in the response.

---

## 🚀 Recommended Commands

### For New PC Setup
```powershell
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS
.\RUN.ps1 -UpdateNoCache  # Clean first build
```

### For Regular Updates
```powershell
git pull origin main
.\RUN.ps1 -Update  # Fast update with backup
```

### For Complete Clean
```powershell
.\RUN.ps1 -Stop
.\RUN.ps1 -PruneAll
.\RUN.ps1  # Start fresh
```

---

## 📝 Notes

- **VERSION file is the source of truth**: The `VERSION` file at the repository root controls which version is built
- **Image tags are automatic**: RUN.ps1 reads VERSION and builds `sms-fullstack:<version>`
- **No manual tagging needed**: The script handles all Docker image tagging
- **Backups are automatic**: Updates always create backups before rebuilding
- **Cached builds are fast**: Use `-Update` for fast updates, `-UpdateNoCache` for clean rebuilds

---

## ⚠️ Important

**Never manually tag Docker images for SMS**. Always let RUN.ps1 manage the image tags based on the VERSION file. This ensures consistency across all installations.

If you need to force a specific version:
1. Update the VERSION file
2. Run `.\RUN.ps1 -UpdateNoCache`
3. Commit and push the VERSION change

---

## 🔗 Related Commands

| Command | Purpose |
|---------|---------|
| `.\RUN.ps1` | Start application (builds if needed) |
| `.\RUN.ps1 -Update` | Fast update with backup |
| `.\RUN.ps1 -UpdateNoCache` | Clean rebuild from scratch |
| `.\RUN.ps1 -Stop` | Stop the application |
| `.\RUN.ps1 -Status` | Check running status |
| `.\RUN.ps1 -Logs` | View application logs |
| `.\RUN.ps1 -Backup` | Create manual backup |
| `.\RUN.ps1 -Prune` | Clean unused Docker resources |
| `.\RUN.ps1 -PruneAll` | Complete Docker cleanup |

---

For more information, see:
- `README.md` - Main project documentation
- `docs/user/QUICK_START_GUIDE.md` - Quick start guide
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
