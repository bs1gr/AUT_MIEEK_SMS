# Docker Cleanup Guide

## Overview

The `DOCKER.ps1` script provides integrated Docker cleanup operations to maintain a clean environment and manage disk space.

## Quick Reference (v2.0)

```powershell
# Safe cleanup (recommended for regular use)
.\DOCKER.ps1 -Prune

# Aggressive cleanup (includes unused images)  
.\DOCKER.ps1 -PruneAll

# Nuclear cleanup (includes volumes - DATA LOSS WARNING)
.\DOCKER.ps1 -DeepClean
```

## Cleanup Levels

### Level 1: Safe Prune (`-Prune`)

```powershell
.\DOCKER.ps1 -Prune
```

**What it removes:**
- Stopped containers
- Dangling images (untagged)
- Build cache
- Unused networks

**Safe to run:** Yes, regularly

### Level 2: Aggressive Prune (`-PruneAll`)

```powershell
.\DOCKER.ps1 -PruneAll
```

**What it removes:**
- Everything in `-Prune`
- All unused images (not just dangling)

**Safe to run:** Yes, but will require re-pulling images

### Level 3: Deep Clean (`-DeepClean`)

```powershell
.\DOCKER.ps1 -DeepClean
```

**What it removes:**
- Everything in `-PruneAll`
- **Unused volumes including data**

**⚠️ WARNING:** This will delete your database if the container is stopped. Creates automatic backup first.

## Docker Cleanup Features

### Step 11: Docker Configuration Files

**Purpose:** Identifies and optionally removes QNAP-specific docker-compose files that may not be needed on standard deployments.

**What it does:**

- Detects `docker-compose.qnap.yml`
- Prompts for confirmation before removal
- Safe to remove if not deploying to QNAP Container Station

**Interactive prompt:**

```text
○ Found docker-compose.qnap.yml
  This file is for QNAP Container Station deployment.
Remove docker-compose.qnap.yml? (y/N):
```

### Step 12: Docker Image and Cache Cleanup

**Purpose:** Reports Docker build cache and dangling images for manual cleanup.

**What it checks:**

- **Dangling images** - Untagged images that can be safely removed
- **Build cache** - Intermediate layers from Docker builds
- **Stopped containers** - Exited containers taking up space

**Output example:**

```text
○ Docker is available
  Docker build cache: 1.638MB
  Run 'docker builder prune' to clean build cache (optional)
  Found stopped containers
  Run 'docker container prune' to remove them (optional)
```

**Why manual?** These operations can affect other Docker projects on your system, so the script reports them but doesn't automatically delete.

### Step 13: Docker Volume Check

**Purpose:** Lists Docker volumes related to the Student Management System.

**What it checks:**

- Total number of Docker volumes on the system
- SMS-specific volumes (containing 'sms' or 'student' in name)
- Provides cleanup instructions

**Output example:**

```text
Found 8 Docker volume(s)
SMS-related volumes:
  - sms_data
  - sms_data_v20251028
  - student-management-system_sms_data
  - student-management-system_sms_data_v20251027
```

**Warning:** Volume pruning will delete data. Only remove volumes you're certain are no longer needed.

### Step 14: Dockerfile Verification

**Purpose:** Verifies all Dockerfile variants are in active use.

**Current active Dockerfiles:**

- `Dockerfile.backend` - Backend service (FastAPI + SQLAlchemy)
- `Dockerfile.frontend` - Frontend service (React + Vite + NGINX)
- `Dockerfile.fullstack` - Combined single-container image

**Output:**

```text
Found Dockerfiles in docker/ directory:
  - Dockerfile.backend
  - Dockerfile.frontend
  - Dockerfile.fullstack
Current setup uses: Dockerfile.backend, Dockerfile.frontend, Dockerfile.fullstack
All appear to be in active use
```

## Manual Docker Cleanup Commands

The script provides information but doesn't automatically run these commands. Run them manually when needed:

### 1. Remove Stopped Containers

```powershell
docker container prune
```

Removes all stopped containers. Safe to run regularly.

### 2. Remove Dangling Images

```powershell
docker image prune
```

Removes untagged images (dangling). Safe to run regularly.

### 3. Remove Build Cache

```powershell
docker builder prune
```

Removes Docker build cache. Will require rebuilding images from scratch next time.

### 4. List Volumes

```powershell
docker volume ls
```

Lists all Docker volumes on the system.

### 5. Remove Unused Volumes

```powershell
docker volume prune
```

**⚠️ CAUTION:** This will delete all volumes not currently in use by a container. May result in data loss.

### 6. Remove Specific Volume

```powershell
docker volume rm <volume-name>
```

**⚠️ CAUTION:** This permanently deletes the volume and all its data.

### 7. Full System Cleanup

```powershell
docker system prune -a
```

**⚠️ CAUTION:** Removes:

- All stopped containers
- All networks not used by at least one container
- All dangling images
- All build cache

Add `--volumes` flag to also remove unused volumes.

## Volume Management Best Practices

### Current Volume Strategy

The project uses versioned volumes with `docker-compose.override.yml`:

```yaml
services:
  backend:
    volumes:
      - sms_data_v20251028:/data
volumes:
  sms_data_v20251028:
    driver: local
```

### Safe Volume Rotation

Use the provided script for safe volume updates:

```powershell
# Create new volume and migrate data
.\scripts\DOCKER_UPDATE_VOLUME.ps1

# Apply changes
docker compose down
docker compose up -d
```

This preserves old volumes as backups.

### Cleaning Old Volumes

1. **Identify current volume:**

   ```powershell
   # Check docker-compose.override.yml
   Get-Content docker-compose.override.yml
   ```

2. **List all SMS volumes:**

   ```powershell
   docker volume ls | Select-String -Pattern 'sms|student'
   ```

3. **Remove old volumes (after verification):**

   ```powershell
   docker volume rm student-management-system_sms_data_v20251027
   ```

## Docker Configuration Files

### Active Files

- **`docker-compose.yml`** - Main multi-container configuration
  - Backend service (FastAPI)
  - Frontend service (React + NGINX)
  - NGINX reverse proxy
  - Network and volume definitions

- **`docker-compose.override.yml`** - Volume version overrides
  - Created by `DOCKER_UPDATE_VOLUME.ps1`
  - Specifies current data volume version
  - Can be edited manually or deleted to revert

- **`docker/Dockerfile.backend`** - Backend service image
  - Python 3.11 slim
  - FastAPI application
  - SQLAlchemy + SQLite

- **`docker/Dockerfile.frontend`** - Frontend service image
  - Node.js build stage
  - NGINX runtime stage
  - Static React application

- **`docker/Dockerfile.fullstack`** - Combined image
  - Used by RUN.ps1 / SMS.ps1
  - Single container with both frontend and backend
  - Simpler deployment

- **`docker/nginx.conf`** - NGINX configuration
  - Reverse proxy rules
  - API routing (/api → backend)
  - Static file serving

- **`.dockerignore`** - Build exclusions
  - VCS files (.git)
  - Python caches (**pycache**)
  - Node modules
  - Build artifacts
  - Logs and backups

### Removed Files

- **`docker-compose.qnap.yml`** - QNAP-specific configuration
  - **Removed by:** Comprehensive cleanup script
  - **Reason:** Not needed for standard Docker deployments
  - **If needed:** Can be restored from git history

## Troubleshooting

### Script Says "Docker not available"

**Cause:** Docker Desktop is not running or not installed.

**Solution:**

```powershell
# Check Docker status
docker version

# Start Docker Desktop (Windows)
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Cannot Remove Volume - "volume is in use"

**Cause:** A container is currently using the volume.

**Solution:**

```powershell
# Stop all SMS containers
docker compose down

# Or stop specific container
docker stop sms-fullstack

# Then retry volume removal
docker volume rm <volume-name>
```

### Build Cache Taking Too Much Space

**Cause:** Multiple image builds create intermediate layers.

**Solution:**

```powershell
# Check Docker disk usage
docker system df

# Remove build cache
docker builder prune

# Or remove everything (except running containers and active volumes)
docker system prune -a
```

### Too Many Old Volumes

**Cause:** Multiple runs of `DOCKER_UPDATE_VOLUME.ps1` create versioned volumes.

**Solution:**

1. Identify current volume from `docker-compose.override.yml`
2. Keep 1-2 recent backup volumes
3. Remove older versions:

   ```powershell
   docker volume rm student-management-system_sms_data_v20251026
   ```

## Integration with DOCKER.ps1

### Running the Cleanup

```powershell
# Navigate to project root
cd d:\SMS\student-management-system

# Safe cleanup
.\DOCKER.ps1 -Prune

# Or aggressive cleanup
.\DOCKER.ps1 -PruneAll
```

### What Gets Cleaned Automatically

- ✅ Stopped containers
- ✅ Dangling images
- ✅ Build cache
- ✅ Unused networks

### What Requires Caution

- ⚠️ Unused images (`-PruneAll` removes these)
- ⚠️ Data volumes (`-DeepClean` removes these - backup created first)

### Safety Features

- Automatic backup before `-DeepClean`
- Confirmation prompts for destructive operations
- Status reporting after cleanup

## Regular Maintenance Schedule

### Weekly

```powershell
# Safe cleanup
.\DOCKER.ps1 -Prune
```

### Monthly

```powershell
# Aggressive cleanup
.\DOCKER.ps1 -PruneAll

# Check disk usage
docker system df
```

### Quarterly

```powershell
# Check old volumes
docker volume ls | Select-String -Pattern 'sms|student'

# Manually remove old volumes if needed
docker volume rm <old-volume-name>
```

## Summary

The Docker cleanup integration in `DOCKER.ps1` provides:

1. **Three cleanup levels** (Prune, PruneAll, DeepClean)
2. **Automatic backups** before destructive operations
3. **Safe defaults** that don't affect data
4. **Clear warnings** for destructive operations
5. **Status reporting** after cleanup

This approach balances automation with safety, ensuring you maintain a clean Docker environment without risking data loss.
