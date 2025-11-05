# Docker Cleanup Guide

## Overview

The comprehensive cleanup script (`CLEANUP_COMPREHENSIVE.ps1`) includes automated Docker cleanup steps to help maintain a clean Docker environment and identify obsolete Docker-related files.

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
  - Used by QUICKSTART.bat/ps1
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

## Integration with Cleanup Script

### Running the Cleanup

```powershell
# Navigate to project root
cd d:\SMS\student-management-system

# Run comprehensive cleanup
.\scripts\CLEANUP_COMPREHENSIVE.ps1
```

### What Gets Cleaned Automatically

- ✅ QNAP docker-compose file (with confirmation)
- ✅ Obsolete Python/Node caches
- ✅ Old backup directories

### What Requires Manual Action

- ⚠️ Docker build cache (suggested command provided)
- ⚠️ Dangling images (suggested command provided)
- ⚠️ Stopped containers (suggested command provided)
- ⚠️ Old volumes (list provided, must remove manually)

### Why Manual?

Docker cleanup commands can affect:

- Other Docker projects on your system
- Running containers
- Data volumes with important information

The script provides information and suggestions, but leaves the final decision to you.

## Regular Maintenance Schedule

### Weekly

```powershell
# Run comprehensive cleanup
.\scripts\CLEANUP_COMPREHENSIVE.ps1

# Remove stopped containers
docker container prune -f
```

### Monthly

```powershell
# Remove dangling images
docker image prune -f

# Remove build cache
docker builder prune -f
```

### Quarterly

```powershell
# Check disk usage
docker system df

# Clean old volumes (after verification)
docker volume ls | Select-String -Pattern 'sms|student'
# Manually remove old volumes

# Optional: Full system cleanup
docker system prune -a
```

## Summary

The Docker cleanup integration in `CLEANUP_COMPREHENSIVE.ps1` provides:

1. **Automated removal** of QNAP-specific files (with confirmation)
2. **Informational reporting** on Docker artifacts
3. **Helpful commands** for manual cleanup
4. **Safety warnings** for destructive operations
5. **Integration** with existing cleanup workflows

This approach balances automation with safety, ensuring you maintain a clean Docker environment without risking data loss or affecting other projects.
