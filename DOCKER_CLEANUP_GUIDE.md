# Docker Cleanup Guide

Complete guide for removing Docker cache from old container installations.

## Quick Reference

| Command | What it does | Data Safety |
|---------|-------------|-------------|
| `.\SMS.ps1 -Prune` | Safe cleanup - removes caches, dangling images | ✅ Safe (keeps volumes) |
| `.\SMS.ps1 -PruneAll` | Safe cleanup + unused networks | ✅ Safe (keeps volumes) |
| `.\DEEP_DOCKER_CLEANUP.ps1` | Nuclear option - removes ALL cache | ✅ Safe (keeps volumes by default) |
| `.\DEEP_DOCKER_CLEANUP.ps1 -IncludeVolumes` | Complete wipe including database | ⚠️ **DESTROYS DATA** |

## When to Use Each Option

### Regular Cleanup (Recommended)
```powershell
.\SMS.ps1 -PruneAll
```
**Use when:**
- Running low on disk space
- After multiple rebuilds
- Monthly maintenance

**Removes:**
- Stopped containers
- Dangling images
- Build cache (filtered)
- Unused networks

**Preserves:**
- Current images in use
- Data volumes (database)
- Active containers

---

### Deep Cleanup (Aggressive)
```powershell
.\DEEP_DOCKER_CLEANUP.ps1 -Force
```
**Use when:**
- Experiencing Docker issues
- Cache corruption suspected
- Preparing for fresh install
- Disk space critically low

**Removes:**
- ALL stopped containers
- ALL unused images (not just dangling)
- ALL build cache (complete wipe)
- ALL unused networks
- Old SMS images (except current version)

**Preserves:**
- Data volumes (database intact)
- Currently running containers

---

### Nuclear Option (DANGER!)
```powershell
.\DEEP_DOCKER_CLEANUP.ps1 -IncludeVolumes -Force
```
**⚠️ WARNING: This deletes your database!**

**Use ONLY when:**
- Deploying to completely new PC
- Starting fresh after major corruption
- Instructed by support/documentation

**Removes:**
- Everything from Deep Cleanup above
- **ALL volumes including database**

**You will need to run** `.\SMART_SETUP.ps1` **after this!**

---

## Step-by-Step: Clean Install on New PC

If you're installing on a fresh PC and have old Docker cache:

1. **Check current usage:**
   ```powershell
   docker system df
   ```

2. **Stop all SMS containers:**
   ```powershell
   .\SMS.ps1 -Stop
   ```

3. **Run deep cleanup:**
   ```powershell
   .\DEEP_DOCKER_CLEANUP.ps1 -Force
   ```

4. **Verify cleanup:**
   ```powershell
   docker system df
   ```

5. **Fresh install:**
   ```powershell
   .\SMART_SETUP.ps1
   ```

---

## Troubleshooting

### "Error response from daemon: conflict"
Some containers are still running. Stop them first:
```powershell
.\SMS.ps1 -Stop
docker ps -a  # Verify all stopped
```

### "Cannot remove volume in use"
Volume is mounted by a running container:
```powershell
docker ps    # Check running containers
docker stop $(docker ps -aq)  # Stop all
```

### Build cache won't clear
Force builder prune:
```powershell
docker builder prune -a -f --all
```

### Disk space not freed after cleanup
Check for large image layers:
```powershell
docker images -a
docker system prune -a --volumes  # Nuclear option
```

---

## Understanding Docker Disk Usage

```powershell
docker system df
```

Output explained:
- **Images**: Built Docker images (your app)
- **Containers**: Running/stopped container instances
- **Local Volumes**: Persistent data (database)
- **Build Cache**: Cached layers from builds

**Reclaimable**: Space you can free up safely

---

## Comparison with Other Scripts

| Script | Purpose | Docker Cleanup | Data Safety |
|--------|---------|----------------|-------------|
| `RUN.ps1 -Prune` | Quick cleanup | Basic | ✅ Safe |
| `SMS.ps1 -PruneAll` | Standard cleanup | Moderate | ✅ Safe |
| `DEEP_DOCKER_CLEANUP.ps1` | Aggressive cleanup | Complete | ✅ Safe (default) |
| `SUPER_CLEAN_AND_DEPLOY.ps1` | Full workspace reset | Basic | ⚠️ Optional volume wipe |

---

## Best Practices

1. **Regular maintenance:** Run `.\SMS.ps1 -PruneAll` monthly
2. **After updates:** Run `.\DEEP_DOCKER_CLEANUP.ps1` after major version changes
3. **Before fresh install:** Use `-IncludeVolumes` only if you want to delete data
4. **Check first:** Always run `docker system df` before cleanup
5. **Backup data:** Use Control Panel → Backups before aggressive cleanup

---

## What Gets Preserved

Even with `DEEP_DOCKER_CLEANUP.ps1`, these are **SAFE**:

✅ Your source code files
✅ Python virtual environments (.venv)
✅ Node modules (node_modules)
✅ Git repository (.git)
✅ Configuration files (.env)
✅ Database volume (unless -IncludeVolumes used)
✅ Backup files (backups/)

Only Docker-specific cache and images are removed.

---

## Quick Command Reference

```powershell
# Check what's using space
docker system df
docker images
docker ps -a
docker volume ls

# Safe cleanup (preserves data)
.\SMS.ps1 -PruneAll

# Aggressive cleanup (preserves data)
.\DEEP_DOCKER_CLEANUP.ps1 -Force

# Nuclear option (DELETES DATA)
.\DEEP_DOCKER_CLEANUP.ps1 -IncludeVolumes -Force

# After cleanup, fresh start
.\SMART_SETUP.ps1
```

---

## Related Documentation

- **Fresh Installation:** `DEPLOYMENT_GUIDE.md`
- **New PC Setup:** `DEPLOY_ON_NEW_PC.md`
- **Quick Start:** `docs/user/QUICK_START_GUIDE.md`
- **Troubleshooting:** `README.md` → Troubleshooting section
