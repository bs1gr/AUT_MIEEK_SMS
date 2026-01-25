# Docker Naming Conventions & Version Management

## Overview

This guide explains the standardized naming conventions used for Docker images, volumes, and database backups in the Student Management System. All naming follows a consistent pattern that includes version information and timestamps for easy tracking and management.

---

## File Naming Standards

### 1. Docker Images 🖼️

**Format:** `sms-[service]:[VERSION]`

**Examples:**

```text
sms-backend:1.1.0
sms-frontend:1.1.0
sms-backend:1.2.0
sms-frontend:1.2.0

```text

**Components:**

- `sms-` - Project prefix
- `[service]` - Service name (backend or frontend)
- `:[VERSION]` - Version tag from VERSION file

**Benefits:**

- ✅ Shorter, cleaner names than previous convention
- ✅ Version tracking built-in
- ✅ Easy to identify which version is running
- ✅ Multiple versions can coexist for testing/rollback

---

### 2. Data Volumes 💾

**Format:** `sms_data_rebuild_v[VERSION]_[YYYYMMDD]_[HHMMSS]`

**Examples:**

```text
sms_data_rebuild_$11.9.7_20251029_143022
sms_data_rebuild_$11.9.7_20251029_150845
sms_data_rebuild_$11.9.7_20251030_091234

```text
**Components:**

- `sms_data_rebuild` - Indicates volume created via rebuild process
- `v[VERSION]` - App version when volume was created (e.g., $11.9.7)
- `[YYYYMMDD]` - Date in ISO format (e.g., 20251029)
- `[HHMMSS]` - Time in 24-hour format (e.g., 143022)

**What it tells you:**

- 📦 Purpose: Data volume for rebuild
- 📌 Version: Which app version it was built for
- 📅 Date: When it was created
- ⏰ Time: Exact creation time

**Benefits:**

- ✅ Instantly know when volume was created
- ✅ Track which app version it belongs to
- ✅ Easy to identify latest rebuild
- ✅ No naming conflicts due to unique timestamp
- ✅ Old volumes preserved for rollback scenarios

---

### 3. Database Backups 💾

**Format:** `sms_backup_v[VERSION]_[YYYYMMDD]_[HHMMSS].db`

**Examples:**

```text
sms_backup_$11.9.7_20251029_143022.db
sms_backup_$11.9.7_20251029_150845.db
sms_backup_$11.9.7_20251030_091234.db

```text
**Components:**

- `sms_backup` - Indicates database backup file
- `v[VERSION]` - App version at backup time (e.g., $11.9.7)
- `[YYYYMMDD]` - Date in ISO format
- `[HHMMSS]` - Time in 24-hour format
- `.db` - SQLite database file extension

**What it tells you:**

- 💾 Type: Database backup
- 📌 Version: App version when backup was created
- 📅 Date: Backup date
- ⏰ Time: Exact backup time

**Benefits:**

- ✅ Know which version's data you're restoring
- ✅ Easy to find backups by version
- ✅ Chronological sorting works naturally
- ✅ Clear, professional naming convention

---

## How to Use

### Regular Startup (Quick Start)

```powershell
.\RUN.ps1
# or use the management menu

.\SMS.ps1
# Select option 1: Start Containers

```text
**What happens:**

- Reads version from `VERSION` file (e.g., 1.1.0)
- Sets environment variable: `$env:VERSION = "1.1.0"`
- Starts containers with tagged images: `sms-backend:1.1.0`, `sms-frontend:1.1.0`
- Uses existing images if available (fast startup)
- Reuses existing data volume

**When to use:**

- ✅ Daily development work
- ✅ After system restart
- ✅ Quick testing
- ✅ No code changes since last build

---

### Rebuild from Scratch

```powershell
.\SMS.ps1
# Select option 'X' - Rebuild from Scratch

```text
**What happens:**

1. **Stops** all running containers
2. **Removes** existing images (both new and old naming patterns)
3. **Clears** Docker build cache (no stale layers)
4. **Optionally creates** new data volume with versioned name
5. **Rebuilds** images with `--no-cache` flag
6. **Tags** images with current version from VERSION file
7. **Starts** containers with fresh images

**Output:**

```text
[1/6] Stopping containers...
✓ Containers stopped

[2/6] Removing old images...
✓ Images removed

[3/6] Clearing Docker build cache...
✓ Build cache cleared

[4/6] Creating new data volume...
✓ New volume configured: sms_data_rebuild_$11.9.7_20251029_143022
  Volume naming: sms_data_rebuild_v[VERSION]_[DATE]_[TIME]

[5/6] Rebuilding images (this may take a few minutes)...
✓ Images rebuilt successfully
  Image names: sms-backend:1.1.0, sms-frontend:1.1.0

[6/6] Starting containers...
✓ Containers started

Rebuild completed successfully!

```text
**When to use:**

- ✅ After major code changes
- ✅ Troubleshooting Docker issues
- ✅ Fresh start with empty database
- ✅ Version upgrades
- ✅ Cache-related build problems
- ✅ Preparing for production deployment

---

### Create Database Backup

```powershell
.\SMS.ps1
# Select option 'B' - Backup Database

```text
**What happens:**

- Reads current version from VERSION file
- Generates timestamp
- Creates backup with format: `sms_backup_v[VERSION]_[DATE]_[TIME].db`
- Saves to `backups/` folder

**Example output:**

```text
Creating backup from Docker volume...
  Target: sms_backup_$11.9.7_20251029_143022.db

✓ Backup created successfully (188.45 KB)
  Location: backups\sms_backup_$11.9.7_20251029_143022.db

```text
**When to use:**

- ✅ Before major data changes
- ✅ Before version upgrades
- ✅ Regular backup schedule
- ✅ Before testing risky features
- ✅ Before database migrations

---

## Version Management

### Updating Version

#### Step 1: Update VERSION File

```powershell
# Edit the VERSION file in project root

echo "1.2.0" > VERSION

```text
#### Step 2: Rebuild with New Version

```powershell
.\SMS.ps1
# Select option 'X' - Rebuild from Scratch

```text
**Result:**

- New images created: `sms-backend:1.2.0`, `sms-frontend:1.2.0`
- New volume (if selected): `sms_data_rebuild_$11.9.7_20251029_153045`
- Old $11.9.7 images and volumes remain for rollback

---

### Example Workflow: Version Upgrade

```powershell
# Current state: VERSION = 1.1.0

# Running: sms-backend:1.1.0, sms-frontend:1.1.0
# Volume: sms_data_rebuild_$11.9.7_20251029_143022

# Step 1: Create backup before upgrade

.\SMS.ps1  # Option B - Backup
# Creates: sms_backup_$11.9.7_20251029_150000.db

# Step 2: Update version

echo "1.2.0" > VERSION

# Step 3: Rebuild with new version

.\SMS.ps1  # Option X - Rebuild
# Choose to keep existing volume (to preserve data)

# Result:

# - New images: sms-backend:1.2.0, sms-frontend:1.2.0
# - Same volume: sms_data_rebuild_$11.9.7_20251029_143022 (data preserved)

# - Old images still available for rollback

# If something goes wrong, can easily rollback:

# 1. Change VERSION back to 1.1.0
# 2. docker compose up -d

# 3. Uses old sms-backend:1.1.0 and sms-frontend:1.1.0 images

```text
---

## Multiple Versions Coexisting

### Scenario: Testing New Version

```powershell
# Production version: 1.1.0

docker images
# sms-backend:1.1.0

# sms-frontend:1.1.0

# Update VERSION to 1.2.0 and rebuild

echo "1.2.0" > VERSION
.\SMS.ps1  # Option X

# Now have both versions

docker images
# sms-backend:1.2.0  (new)

# sms-frontend:1.2.0 (new)
# sms-backend:1.1.0  (old - still available)

# sms-frontend:1.1.0 (old - still available)

# Test $11.9.7, if issues found:

echo "1.1.0" > VERSION
docker compose down
docker compose up -d
# Back to stable $11.9.7

```text
---

## Cleanup Old Versions

### List All Versions

```powershell
# List all SMS images

docker images | Select-String "sms-"

# List all SMS volumes

docker volume ls | Select-String "sms_data"

# List all backups

Get-ChildItem .\backups\*.db | Sort-Object LastWriteTime -Descending

```text
### Remove Specific Version

```powershell
# Remove specific image version

docker rmi sms-backend:1.0.0 sms-frontend:1.0.0

# Remove specific volume (ensure not in use!)

docker volume rm student-management-system_sms_data_rebuild_$11.9.7_20251020_120000

# Remove specific backup

Remove-Item .\backups\sms_backup_$11.9.7_20251020_120000.db

```text
### Automated Cleanup (via SMS.ps1)

```powershell
.\SMS.ps1
# Option 'M' - Manage Backups

# Then 'C' - Clean old backups (keeps latest 10)

```text
---

## Naming Convention Benefits

| Benefit | Description |
|---------|-------------|
| **Professional** | Enterprise-grade naming that's self-documenting |
| **Version Tracking** | Always know which version you're running |
| **Time Stamped** | Easy to identify when resources were created |
| **No Conflicts** | Unique timestamps prevent naming collisions |
| **Rollback Ready** | Old versions preserved for easy rollback |
| **Shorter Names** | `sms-*` prefix instead of `student-management-system-*` |
| **Consistent** | Same pattern across images, volumes, and backups |
| **Sortable** | ISO date/time format sorts chronologically |
| **Searchable** | Easy to filter by version or date |

---

## Troubleshooting

### Issue: Images not using version tags

**Problem:** Images show as `sms-backend:latest` instead of `sms-backend:1.1.0`

**Solution:**

```powershell
# Ensure VERSION file exists and has content

Get-Content VERSION

# Use rebuild option which sets VERSION env var

.\SMS.ps1  # Option X

```text
---

### Issue: Old naming pattern still in use

**Problem:** Seeing `student-management-system-backend:latest` instead of new names

**Solution:**

```powershell
# Rebuild will clean up old images automatically

.\SMS.ps1  # Option X
# The rebuild process removes both old and new naming patterns

```text
---

### Issue: Cannot create new volume (name conflict)

**Problem:** Volume name already exists

**Solution:**

- The naming includes timestamp (down to the second), conflicts are extremely rare
- If it happens, wait 1 second and try again
- Or manually specify a different name in docker-compose.override.yml

---

### Issue: Cannot find backups by version

**Problem:** Backup files don't show version

**Solution:**

```powershell
# Old backups may use old naming

# New backups (after update) use: sms_backup_v[VERSION]_[DATE]_[TIME].db

# List all backups with details

Get-ChildItem .\backups\*.db | Format-Table Name, LastWriteTime, Length

```text
---

## Technical Implementation

### Files Modified

1. **`SMS.ps1`**
   - Sets `$env:VERSION` before docker compose commands
   - Updated `Rebuild-Application` function with new volume naming
   - Updated `Backup-Database` function with versioned filenames

2. **`docker-compose.yml`**

   ```yaml
   services:
     backend:
       image: sms-backend:${VERSION:-latest}
       build: ...

     frontend:
       image: sms-frontend:${VERSION:-latest}
       build: ...
   ```

3. **`VERSION`** (project root)

   ```text
   1.1.0
   ```

### How VERSION Environment Variable Works

```powershell
# SMS.ps1 reads VERSION file

$version = (Get-Content "VERSION" -Raw).Trim()  # "1.1.0"

# Sets environment variable before docker compose

$env:VERSION = $version

# Docker Compose substitutes ${VERSION} in docker-compose.yml

# image: sms-backend:${VERSION:-latest}
# Becomes: sms-backend:1.1.0

```text
---

## Best Practices

### ✅ DO

- **Keep VERSION file up to date** with your app version
- **Create backup before version upgrades** (Option B)
- **Use rebuild option for major changes** (Option X)
- **Keep at least 3 recent backups** for safety
- **Document version changes** in release notes
- **Test new versions** before removing old ones

### ❌ DON'T

- **Don't manually edit docker-compose.override.yml** (use Option X instead)
- **Don't delete volumes while containers are running**
- **Don't remove all old versions immediately** (keep for rollback)
- **Don't use special characters in VERSION file** (numbers and dots only)
- **Don't forget to backup before destructive operations**

---

## Quick Reference

| Task | Command | Creates |
|------|---------|---------|
| Start app | `.\RUN.ps1` | Uses existing images |
| Rebuild all | `.\SMS.ps1` → X | `sms-backend:1.1.0`<br>`sms-frontend:1.1.0`<br>`sms_data_rebuild_$11.9.7_20251029_143022` |
| Backup DB | `.\SMS.ps1` → B | `sms_backup_$11.9.7_20251029_143022.db` |
| Update version | Edit `VERSION` file | N/A |
| View status | `.\SMS.ps1 -Status` | N/A |
| List images | `docker images \| Select-String "sms-"` | N/A |
| List volumes | `docker volume ls \| Select-String "sms_"` | N/A |
| List backups | `Get-ChildItem .\backups\*.db` | N/A |

---

## Related Documentation

- [README.md](../README.md) - Main project documentation
- [reference/DOCKER_CLEANUP_GUIDE.md](../reference/DOCKER_CLEANUP_GUIDE.md) - Docker cleanup procedures (canonical)
- [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) - One-click deployment guide (`RUN.ps1`)
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

---

## Support

If you encounter issues with naming conventions or versioning:

1. Run diagnostics: `.\SMS.ps1` → Option 8
2. Check Docker status: `docker ps -a`
3. Verify VERSION file: `Get-Content VERSION`
4. Review logs: `.\SMS.ps1` → Option 9

For more help, see [FRESH_DEPLOYMENT_TROUBLESHOOTING.md](FRESH_DEPLOYMENT_TROUBLESHOOTING.md) or open an issue on GitHub.

