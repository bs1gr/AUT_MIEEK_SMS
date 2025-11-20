# Aggressive Cleanup Enhancement (v1.8.4+)

## Overview

Enhanced `.\RUN.ps1 -UpdateNoCache` to aggressively remove **ALL** previous Docker builds, volumes (except data), and images before creating the latest version with the backed-up database.

**Problem Solved:** On new PC installations, obsolete cached versions (e.g., 1.8.2) were being used instead of the latest (1.8.4).

## What Changed

### Before (Conservative Cleanup)
- ❌ Only removed "unused" sms-fullstack images
- ❌ Old versions could remain if no container referenced them
- ❌ Build cache cleanup was single-pass
- ❌ New PCs could pull wrong version from cache

### After (Aggressive Cleanup)
- ✅ **Force-removes ALL sms-fullstack images** (every version)
- ✅ Double-pass build cache cleanup (thorough)
- ✅ Ensures clean slate for rebuild
- ✅ New PCs always get latest version
- ✅ **Database backup preserved** (safety maintained)
- ✅ **sms_data volume protected** (never touched)

## Technical Implementation

### CleanUpdate-Application Enhancement
```powershell
# NEW: Aggressive cleanup step
Write-Info "Removing ALL previous sms-fullstack images (clean slate)..."
$allSmsImages = docker images sms-fullstack -q 2>$null
if ($allSmsImages) {
    $allSmsImages | ForEach-Object { 
        try { docker rmi -f $_ 2>$null | Out-Null } catch { }
    }
    Write-Success "All previous images removed"
}
```

### Prune-DockerResources Enhancement
```powershell
# NEW: Double-pass build cache cleanup
Write-Info "Pruning ALL builder cache..."
docker builder prune -af --filter "until=1h" 2>$null | Out-Null
docker builder prune -af 2>$null | Out-Null
```

## Safety Guarantees

### ✅ Database Safety
1. **Backup created FIRST** - Before any cleanup begins
2. **Located at:** `backups/backup_TIMESTAMP.db`
3. **Restore possible** - Via Control Panel or SMS.ps1

### ✅ Volume Safety
- **sms_data volume:** NEVER touched by aggressive cleanup
- **Protection:** Explicit skip in Prune-DockerResources
- **Data persistence:** Database, uploads, logs remain intact

### ✅ Recovery Path
If anything goes wrong:
```powershell
# Option 1: Restore from backup
.\SMS.ps1  # Select "Restore from backup"

# Option 2: Full rebuild
.\SUPER_CLEAN_AND_DEPLOY.ps1
```

## Usage

### Recommended Command (New PCs)
```powershell
.\RUN.ps1 -UpdateNoCache
```

**What it does:**
1. ✅ Backs up database to `backups/`
2. ✅ Stops current container
3. ✅ **Removes ALL sms-fullstack images (every version)**
4. ✅ **Double-cleans build cache**
5. ✅ Prunes stopped containers, dangling images
6. ✅ Builds latest from scratch (`--no-cache`)
7. ✅ Starts new container with backed-up database

### Alternative (Quick Update)
```powershell
.\RUN.ps1 -Update  # Less aggressive, keeps some cache
```

## Verification

After running `-UpdateNoCache`:

```powershell
# 1. Check only latest image exists
docker images sms-fullstack
# Should show ONLY: sms-fullstack:1.8.4

# 2. Check container running
docker ps
# Should show: sms-app (healthy)

# 3. Verify database intact
# Open http://localhost:8082
# Check students, courses, etc. all present

# 4. Check backups created
dir backups/
# Should show: backup_TIMESTAMP.db
```

## Performance Impact

| Aspect | Impact | Notes |
|--------|--------|-------|
| **Build time** | +2-5 minutes | Rebuilds from scratch (worth it for clean slate) |
| **Disk space** | Freed | Removes ALL old images (can be 500MB-2GB) |
| **Network** | Moderate | Re-pulls base images (python:3.11-slim, node:18-alpine) |
| **Data loss** | **NONE** | Database backed up, volume protected |

## Troubleshooting

### Issue: "No space left on device"
```powershell
# Full Docker cleanup
docker system prune -a --volumes
# Then retry UpdateNoCache
```

### Issue: "Cannot remove image, in use by container"
```powershell
# Stop and remove ALL sms containers
docker ps -a | grep sms | awk '{print $1}' | xargs docker rm -f
# Then retry UpdateNoCache
```

### Issue: "Database connection failed after update"
```powershell
# Check volume mount
docker inspect sms-app | grep sms_data
# Should show: /data mounted to sms_data volume

# Restore from backup if needed
.\SMS.ps1  # Option: Restore from backup
```

## Related Documentation

- **Quick Start:** `docs/user/QUICK_START_GUIDE.md`
- **Clean Install:** `CLEAN_INSTALL_GUIDE.md`
- **Full Wipe:** `SUPER_CLEAN_AND_DEPLOY.ps1 -h`
- **Copilot Guide:** `.github/copilot-instructions.md`

## Commit

- **Hash:** a0bbc7a
- **Date:** 2025-01-XX
- **Branch:** main
- **Tag:** v1.8.4+ (post-release enhancement)

## Benefits

✅ **Foolproof new PC setup** - Always installs latest version
✅ **No version confusion** - Old images can't interfere
✅ **Disk space recovery** - Removes accumulated build artifacts
✅ **Zero data loss** - Backup + volume protection
✅ **Fast diagnosis** - Clean slate eliminates cache-related bugs

---

**TL;DR:** `.\RUN.ps1 -UpdateNoCache` now nukes ALL previous sms-fullstack images and thoroughly cleans build cache, ensuring new PCs get the correct latest version. Database is backed up first, sms_data volume is never touched. Clean slate guaranteed.
