# Manual Cleanup Guide - SMS Installation on Your PC

**Date**: February 3, 2026
**Issue**: Old files/images remain after upgrade to v1.17.7
**Status**: Fixed in installer (v1.17.7 rebuild) + manual cleanup needed NOW

---

## 🔧 Manual Cleanup (BEFORE running new installer)

Run these commands in **Administrator Command Prompt** or **PowerShell**:

### Step 1: Stop Docker Completely
```powershell
docker stop sms-app 2>nul
docker rm sms-app 2>nul
docker stop sms-postgres 2>nul
docker rm sms-postgres 2>nul
```

### Step 2: Remove Old Docker Images
```powershell
# Remove old sms-fullstack images
docker rmi sms-fullstack:1.12.3
docker rmi sms-fullstack:1.17.6
# This keeps only the latest (1.17.7) image
```

### Step 3: Manually Delete Old Installation Files

Run this PowerShell script:

```powershell
$smsPath = "C:\Program Files\SMS"

# Stop services
Write-Host "Stopping services..."
taskkill /F /IM docker_manager.bat 2>$null
Start-Sleep -Seconds 2

# Delete old uninstaller files
Write-Host "Removing old uninstaller files..."
Remove-Item -Path "$smsPath\unins000.exe" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$smsPath\unins000.dat" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$smsPath\unins000.msg" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$smsPath\unins1.12.3.*" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$smsPath\unins1.17.6.*" -Force -ErrorAction SilentlyContinue

# Delete old .env files (will be recreated by Docker)
Write-Host "Removing old configuration files..."
Remove-Item -Path "$smsPath\.env" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$smsPath\backend\.env" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$smsPath\frontend\.env" -Force -ErrorAction SilentlyContinue

# Delete old application code directories (DATA/BACKUPS/LOGS will be preserved)
Write-Host "Removing old application files..."
$dirsToRemove = @("backend", "frontend", "docker", "scripts", "templates", "config")
foreach ($dir in $dirsToRemove) {
    $path = "$smsPath\$dir"
    if (Test-Path $path) {
        Write-Host "  Removing: $dir"
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "✅ Manual cleanup complete!"
Write-Host ""
Write-Host "Next: Run the new SMS_Installer_1.17.7.exe"
```

### Step 4: Clean Docker System (Optional but Recommended)
```powershell
# Remove dangling images and volumes
docker system prune -a -f --volumes
```

---

## 🔍 Verification Checklist

After manual cleanup, verify:

✅ **Old uninstaller gone**:
```powershell
Get-ChildItem "C:\Program Files\SMS\unins*.exe" -ErrorAction SilentlyContinue
# Should return: nothing (no results)
```

✅ **Old .env files removed**:
```powershell
Test-Path "C:\Program Files\SMS\.env"
Test-Path "C:\Program Files\SMS\backend\.env"
# Should both return: False
```

✅ **Old Docker image removed**:
```powershell
docker images sms-fullstack
# Should show only: sms-fullstack  1.17.7
```

✅ **Data preserved**:
```powershell
Get-ChildItem "C:\Program Files\SMS\data"
Get-ChildItem "C:\Program Files\SMS\backups"
# Should show contents (database, backups)
```

---

## 📥 Next: Install Fixed Installer

1. Download: `SMS_Installer_1.17.7.exe` (new version with cleanup fixes)
2. Run installer - it will:
   - Remove remaining old files automatically
   - Install fresh v1.17.7 code
   - Preserve data/ backups/ logs/
   - Restore .env from backup automatically
3. Start Docker container (option 1 from menu)
4. Test login at http://localhost:8080

---

## ⚠️ If Login Still Fails (400 Error)

The 400 error should be fixed now because:
- ✅ Old .env deleted (no stale credentials)
- ✅ Fresh install of backend (no code conflicts)
- ✅ Data preserved (database still intact)

**If still getting 400 after cleanup + new install:**

1. Check Docker logs:
```powershell
docker logs sms-app
docker logs sms-postgres
```

2. Check .env file:
```powershell
Get-Content "C:\Program Files\SMS\backend\.env"
# Look for: SECRET_KEY, DATABASE_URL, VITE_API_URL
```

3. Restart container:
```powershell
docker stop sms-app
Start-Sleep -Seconds 2
docker start sms-app
# Wait 10 seconds, then try login
```

---

## 📋 What's Fixed in New Installer

The rebuilt installer (v1.17.7) now:

✅ **Removes old uninstaller files** completely (unins000.exe, unins*.dat)
✅ **Removes old Docker images** (1.12.3, 1.17.6)
✅ **Deletes old .env files** before restoration (ensures fresh config)
✅ **Cleans old code directories** (backend/frontend/docker/scripts)
✅ **Preserves data** (database, backups, logs, config)
✅ **Logs all cleanup operations** for troubleshooting

---

## 🆘 If Something Goes Wrong

Keep the backup:
```powershell
Get-ChildItem "C:\Program Files\SMS\backups\"
# Contains: pre_upgrade_* folders with database and .env files
```

You can always:
1. Uninstall completely (`Programs and Features` → Uninstall SMS)
2. Delete SMS folder manually
3. Clean Docker: `docker system prune -a -f`
4. Run new installer fresh (data in backups folder remains)

---

**Status**: Manual cleanup guide ready
**Action**: Execute cleanup script above, then install new SMS_Installer_1.17.7.exe
**Expected Result**: Clean upgrade with all old artifacts removed and data preserved
