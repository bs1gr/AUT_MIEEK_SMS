# Docker Cleanup Guide

Complete guide for removing Docker cache from old container installations.

## Quick Reference (v2.0)

| Command | What it does | Data Safety |
|---------|-------------|-------------|
| `.\DOCKER.ps1 -Prune` | Safe cleanup - removes caches, dangling images | ✅ Safe (keeps volumes) |
| `.\DOCKER.ps1 -PruneAll` | Safe cleanup + unused networks + unused images | ✅ Safe (keeps volumes) |
| `.\DOCKER.ps1 -DeepClean` | Nuclear option - removes ALL cache and volumes | ⚠️ **DESTROYS DATA** (creates backup first) |

## When to Use Each Option

### Regular Cleanup (Recommended)

```powershell
.\DOCKER.ps1 -Prune
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

### Aggressive Cleanup

```powershell
.\DOCKER.ps1 -PruneAll
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
.\DOCKER.ps1 -DeepClean
```

**⚠️ WARNING: This deletes your database!**

**Use ONLY when:**

- Deploying to completely new PC
- Starting fresh after major corruption
- Instructed by support/documentation

**Removes:**

- Everything from Aggressive Cleanup above
- **ALL volumes including database**

**Note:** Automatic backup is created before deletion.

**You will need to run** `.\DOCKER.ps1 -Install` **after this!**

---

## Step-by-Step: Clean Install on New PC

If you're installing on a fresh PC and have old Docker cache:

1. **Check current usage:**

   ```powershell
   docker system df
   ```

2. **Stop all SMS containers:**

   ```powershell
   .\DOCKER.ps1 -Stop
   ```

3. **Run aggressive cleanup:**

   ```powershell
   .\DOCKER.ps1 -PruneAll
   ```

4. **Verify cleanup:**

   ```powershell
   docker system df
   ```

5. **Fresh install:**

   ```powershell
   .\DOCKER.ps1 -Install
   ```

---

## Additional Checks (carried over from legacy ops guide)

- **QNAP compose detection:** Cleanup flow detects `docker-compose.qnap.yml` and asks before removal.
- **Image/cache inspection:** Summarizes image sizes before pruning to help choose between `-Prune` and `-PruneAll`.
- **Backups before volume removal:** `-DeepClean` creates an automatic backup of the database volume; move it off-host before restoring if needed.

---

## Troubleshooting

### "Error response from daemon: conflict"

Some containers are still running. Stop them first:

```powershell
.\DOCKER.ps1 -Stop
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

## Comparison of Cleanup Options

| Command | Purpose | Docker Cleanup | Data Safety |
|--------|---------|----------------|-------------|
| `DOCKER.ps1 -Prune` | Quick cleanup | Basic | ✅ Safe |
| `DOCKER.ps1 -PruneAll` | Aggressive cleanup | Complete | ✅ Safe |
| `DOCKER.ps1 -DeepClean` | Full workspace reset | Complete + Volumes | ⚠️ Backup created |

---

## Best Practices

1. **Regular maintenance:** Run `.\DOCKER.ps1 -Prune` monthly
2. **After updates:** Run `.\DOCKER.ps1 -PruneAll` after major version changes
3. **Before fresh install:** Use `-DeepClean` only if you want to delete data
4. **Check first:** Always run `docker system df` before cleanup
5. **Backup data:** Use Control Panel → Backups before aggressive cleanup

---

## What Gets Preserved

With `DOCKER.ps1 -Prune` and `-PruneAll`, these are **SAFE**:

✅ Your source code files
✅ Python virtual environments (.venv)
✅ Node modules (node_modules)
✅ Git repository (.git)
✅ Configuration files (.env)
✅ Database volume
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
.\DOCKER.ps1 -Prune

# Aggressive cleanup (preserves data)
.\DOCKER.ps1 -PruneAll

# Nuclear option (creates backup first)
.\DOCKER.ps1 -DeepClean

# After cleanup, fresh start
.\DOCKER.ps1 -Install
```

---

## Related Documentation

- **Fresh Installation:** `DEPLOYMENT_GUIDE.md`
- **New PC Setup:** `DEPLOY_ON_NEW_PC.md`
- **Quick Start:** `docs/user/QUICK_START_GUIDE.md`
- **Troubleshooting:** `README.md` → Troubleshooting section
