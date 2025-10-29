# Rebuild Troubleshooting Guide

## Overview
This document describes common issues encountered during the rebuild process and their solutions.

## Fixed Issues

### 1. Database Initialization on Empty Volumes
**Problem:** When creating a new empty volume during rebuild, the backend failed to start because the database file didn't exist and had no tables.

**Symptoms:**
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) unable to open database file
```

**Solution:** The rebuild process now automatically:
1. Detects when a new empty volume is created (no data migration)
2. Waits for containers to start
3. Initializes the database schema using SQLAlchemy's `Base.metadata.create_all()`
4. Restarts the backend to ensure clean state

**Manual Fix (if needed):**
```powershell
docker compose exec backend python -c "from backend.models import Base, init_db; engine = init_db('sqlite:////data/student_management.db'); Base.metadata.create_all(bind=engine)"
docker compose restart backend
```

### 2. Volume Permission Issues
**Problem:** The `/data` directory in containers was owned by `root`, but the application runs as `appuser`, preventing database file creation.

**Symptoms:**
```
touch: cannot touch '/data/student_management.db': Permission denied
```

**Solution:** 
- Updated `docker/Dockerfile.backend` to create `/data` directory and set ownership during image build
- This ensures proper permissions from the start for any new volume

**Manual Fix (if needed):**
```powershell
docker compose exec -u root backend chown -R appuser:appuser /data
```

### 3. Empty Baseline Migration
**Problem:** The Alembic baseline migration (`0b65fa8f5f95_baseline.py`) was empty and didn't create tables, causing subsequent migrations to fail.

**Symptoms:**
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: courses
```

**Current Approach:** Instead of relying on Alembic migrations for initial schema creation, the rebuild process uses SQLAlchemy's `create_all()` method to initialize the database. Future schema changes should still use Alembic migrations.

## Rebuild Process Flow

When you select rebuild option (X) in `SMS.ps1`:

1. **Analysis Phase**
   - Detects current volume from docker-compose.override.yml or compose config
   - Scans candidate volumes if no explicit current volume found
   - Auto-selects volume with most recent database file

2. **Rebuild Phase**
   - Stops containers
   - Removes old images
   - Clears build cache
   - Creates new versioned volume (if requested)
   - Migrates data from old volume (if requested)
   - Rebuilds images with `--no-cache`

3. **Initialization Phase** (NEW)
   - Starts containers
   - **If new empty volume:** Automatically initializes database schema
   - Restarts backend for clean state

4. **Completion**
   - Reports summary with volume, image, and migration status
   - Provides application URL

## Best Practices

### When to Migrate Data
- **Yes:** When you want to preserve students, courses, grades, and attendance records
- **No:** When you want a clean slate for testing or development

### When to Create New Volume
- **Yes:** When you want to test changes without affecting current data
- **No:** When you just want to rebuild images with code changes

### Volume Naming Convention
- Format: `sms_data_rebuild_v[VERSION]_[DATE]_[TIME]`
- Example: `sms_data_rebuild_v1.1.0_20251029_160248`
- Old volumes are preserved for rollback

## Rollback Procedure

If something goes wrong after rebuild:

1. Stop containers:
   ```powershell
   docker compose down
   ```

2. Edit `docker-compose.override.yml` to point to old volume:
   ```yaml
   services:
     backend:
       volumes:
         - sms_data_rebuild_v1.1.0_20251029_154149:/data
   ```

3. Restart:
   ```powershell
   docker compose up -d
   ```

## Related Documentation
- [Docker Naming Conventions](DOCKER_NAMING_CONVENTIONS.md)
- [Architecture Overview](ARCHITECTURE.md)
