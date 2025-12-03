# Student Management System - Architecture & Automation Guide

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Start/Stop Logic](#startstop-logic)
3. [Automation Options](#automation-options)
4. [Database Versioning & Migration](#database-versioning--migration)
5. [Best Practices](#best-practices)

---

## System Architecture

### Components

```text
┌─────────────────────────────────────────────────────────────┐
│                    SMS Application                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Frontend   │  │   Backend    │  │   Database   │    │
│  │ React + Vite │  │  FastAPI     │  │ SQLite (default)│ │
│  │ Port: 5173   │  │  Port: 8000  │  │ PostgreSQL (optional) ││
│  │ Port: 5173   │  │  Port: 8000  │  │   File-based │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Modes

#### 1. **Native Mode** (Direct on Host)

- **Frontend**: Node.js dev server on port 5173
- **Backend**: Python/Uvicorn on port 8000
- **Database**: SQLite file at `data/student_management.db` (default) or PostgreSQL when `DATABASE_ENGINE=postgresql`
- **Pros**: Direct access, easier debugging, faster iterations
- **Cons**: Requires Node.js + Python on host, PostgreSQL is optional but must be installed separately

#### 2. **Docker Mode** (Containerized)

- **Frontend**: Nginx serving built SPA on port 8080
- **Backend**: Python/Uvicorn in container (port 8000 internal)
- **Database**: SQLite volume `sms_data` by default or external PostgreSQL when `DATABASE_ENGINE=postgresql` / `DATABASE_URL` points to a remote cluster
- **Pros**: Isolated, consistent environment, easier deployment
- **Cons**: Requires Docker Desktop, slightly slower for dev

### Database Options ($11.9.7+)

- **SQLite** remains the zero-config default for all modes. The launcher (`DOCKER.ps1`) ensures migrations run against `data/student_management.db` or the `/data` volume inside containers.
- **PostgreSQL** is now a first-class option. Set either `DATABASE_ENGINE=postgresql` or provide `POSTGRES_*` variables (host, port, user, password, db). When these variables are present, the backend auto-builds a Psycopg connection URL.
- **DATABASE_URL override**: advanced operators can provide a fully-qualified SQLAlchemy URL (e.g., `postgresql+psycopg://...`) to bypass auto-generation.
- The backend validates all PostgreSQL parameters (SSL mode, options, IPv6 hosts) and refuses to start if required fields are missing.
- See `docs/deployment/POSTGRES_MIGRATION_GUIDE.md` for end-to-end migration steps when switching engines.

---

## Start/Stop Logic

### Current Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                    User Entry Points                        │
├─────────────────────────────────────────────────────────────┤
│  DOCKER.ps1     →  Docker deployment (production)           │
│  NATIVE.ps1     →  Native development mode                  │
│  DOCKER_TOGGLE  →  Desktop shortcut (VBS wrapper)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Status Detection (Get-SystemStatus)            │
├─────────────────────────────────────────────────────────────┤
│  1. Check Docker availability                               │
│  2. Check running containers                                │
│  3. Check ports (8000, 5173, 8080)                          │
│  4. Determine: DOCKER | NATIVE | DOCKER_STOPPED | NOT_RUNNING│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Start Decision Logic                      │
├─────────────────────────────────────────────────────────────┤
│  IF already running:                                        │
│    - NonInteractive: exit silently                          │
│    - Interactive: prompt to restart                         │
│  ELSE IF mode == 'auto':                                    │
│    - Use Docker if available, else Native                   │
│  ELSE:                                                      │
│    - Start in specified mode                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┬──────────────────────────────────────┐
│   Docker Start       │        Native Start                  │
├──────────────────────┼──────────────────────────────────────┤
│ docker compose up -d │  1. Check Python/Node installed      │
│      --build         │  2. Run SETUP.ps1 if needed          │
│                      │  3. Start backend (venv + uvicorn)   │
│                      │  4. Start frontend (npm run dev)     │
└──────────────────────┴──────────────────────────────────────┘
```

### Stop Logic

```text
┌─────────────────────────────────────────────────────────────┐
│                    Stop Entry Points                        │
├─────────────────────────────────────────────────────────────┤
│  DOCKER.ps1 -Stop      →  Stop Docker container             │
│  NATIVE.ps1 -Stop      →  Stop native processes             │
│  Control Panel "Stop"  →  Backend API stop                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┬──────────────────────────────────────┐
│   Docker Stop        │        Native Stop                   │
├──────────────────────┼──────────────────────────────────────┤
│ docker compose stop  │  1. Kill processes on port 5173-5180│
│ (or down to remove)  │  2. Kill all node.exe                │
│                      │  3. Kill backend process (PID)       │
└──────────────────────┴──────────────────────────────────────┘
```

### Important: Control Panel Limitation

**In Docker mode**, the Control Panel "Stop All" button:

- ✅ **CAN**: Stop the backend container (from within)
- ❌ **CANNOT**: Stop frontend/nginx container (isolation)
- ✅ **SOLUTION**: Use `DOCKER.ps1 -Stop` on host for full shutdown

---

## Automation Options

### 1. **Full Automated Start** (Already Available)

```powershell
# Docker deployment (production)
.\DOCKER.ps1 -Start

# Native development mode
.\NATIVE.ps1 -Start

# Advanced modes
.\DOCKER.ps1 -WithMonitoring  # With Grafana/Prometheus
docker compose up -d          # Manual Docker start
```

### 2. **Full Automated Stop** (Already Available)

```powershell
# Docker stop
.\DOCKER.ps1 -Stop

# Native stop
.\NATIVE.ps1 -Stop

# Docker-specific
docker compose stop     # Stop containers
docker compose down     # Stop and remove
```

### 3. **Restart Automation**

```powershell
# Two-step restart
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -Start

# Or use Update which handles restart
.\DOCKER.ps1 -Update
```

### 4. **Scheduled Automation** (Using Windows Task Scheduler)

#### Example: Auto-start on system boot

```powershell
$trigger = New-ScheduledTaskTrigger -AtStartup
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-File D:\SMS\student-management-system\DOCKER.ps1 -Start"
Register-ScheduledTask -TaskName "SMS-AutoStart" -Trigger $trigger -Action $action
```

#### Example: Auto-restart daily

```powershell
$trigger = New-ScheduledTaskTrigger -Daily -At 3AM
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-File D:\SMS\student-management-system\scripts\daily-restart.ps1"
Register-ScheduledTask -TaskName "SMS-DailyRestart" -Trigger $trigger -Action $action
```

### 5. **CI/CD Integration**

```yaml
# Example GitHub Actions workflow
name: Deploy SMS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Stop current instance
        run: .\DOCKER.ps1 -Stop
      - name: Start new instance
        run: .\DOCKER.ps1 -Start
```

---

## Database Versioning & Migration

### Current State

#### Schema Migrations (Alembic)

- **Tool**: Alembic (SQLAlchemy migration tool)
- **Location**: `backend/migrations/versions/`
- **Current versions**:
  - `0b65fa8f5f95` - Baseline schema (creates all initial tables)
  - `3f2b1a9c0d7e` - Add absence_penalty to courses

**Important**: The baseline migration (`0b65fa8f5f95`) creates all core tables on fresh databases:

- `students`, `courses`, `attendances`, `course_enrollments`
- `daily_performances`, `grades`, `highlights`
- All necessary indexes for performance

This ensures that first-time installations initialize properly without requiring existing tables.

#### First-Run Database Validation

- **Tool**: `backend/tools/validate_first_run.py`
- **Purpose**: Test fresh database creation and migrations programmatically
- **Usage**:

  ```powershell
  cd backend
  ..\.venv\Scripts\python.exe tools\validate_first_run.py
  ```

- **Checks**:
  - Database file creation
  - Migration execution success
  - Table count and schema verification
  - Alembic version tracking
- **When to use**: Troubleshooting first-time installs or testing migration changes

#### Docker Volume Versioning

- **Manual operation**: Control Panel → Docker Operations → "Update Docker Data Volume"
- **Creates**: Timestamped volumes like `sms_data_v20251028_152300`
- **Optional migration**: Copies data from old volume to new
- **Requires restart**: `docker compose down` → `docker compose up -d`

### SQLite ↔ PostgreSQL Support

- **Engine Detection**: The backend inspects `DATABASE_ENGINE`, `DATABASE_URL`, and `POSTGRES_*` variables. If PostgreSQL credentials are present, it automatically builds a secure Psycopg connection string (including IPv6 host normalization, SSL parameters, and optional query options).
- **Lifespan Integration**: `run_migrations.py` now targets whichever engine is active. No manual edits are required when switching between SQLite and PostgreSQL.
- **Safety Checks**: Paths for SQLite databases are validated to prevent escapes outside the project directory or `/data` volume. PostgreSQL URLs must start with `postgresql+psycopg://`.

#### Recommended Environment Variables

```ini
DATABASE_ENGINE=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=sms
POSTGRES_PASSWORD=ChangeMe!
POSTGRES_DB=sms
POSTGRES_SSLMODE=prefer
# Optional advanced parameters
POSTGRES_OPTIONS=application_name=sms&connect_timeout=10
```

Set `DATABASE_URL` only when you need full control (custom driver parameters or managed hosting connection strings).

### SQLite → PostgreSQL Migration Workflow

1. **Review the guide**: `docs/deployment/POSTGRES_MIGRATION_GUIDE.md` summarizes prerequisites, dry-run commands, and rollback options.
2. **Export data**: Run `python backend/scripts/migrate_sqlite_to_postgres.py --sqlite data/student_management.db --postgres postgresql+psycopg://...` to copy existing data into PostgreSQL. The script enforces foreign key ordering and provides summary counts.
3. **Update environment**:

   - Set `DATABASE_ENGINE=postgresql` (or `DATABASE_URL`).
   - Provide the `POSTGRES_*` variables in `backend/.env` and Docker secrets if running in containers.
4. **Run migrations**: `DOCKER.ps1` automatically runs Alembic migrations against the new engine before serving traffic.
5. **Verify health**: Use `/health` endpoints plus targeted API smoke tests against the PostgreSQL-backed instance.
6. **Fallback plan**: Keep the SQLite file/volume snapshot until PostgreSQL adoption is confirmed. The migration script can be re-run if additional data is added before cutover.

### The Problem

**Scenario**: You update the native database schema (via Alembic migration), then want to use Docker mode.

**Current flow (manual)**:

1. Run migration in native mode: `alembic upgrade head`
2. Native DB is now at new schema version
3. Switch to Docker mode
4. Docker still uses old volume with old schema
5. **Result**: Schema mismatch errors!

**Current workaround**:

1. Manually update Docker volume via Control Panel
2. Choose "migrate data" to copy from native DB
3. Restart Docker stack

### Implemented Automation (Pre-start Version Check)

As of this update, the host launcher (`DOCKER.ps1`) performs a pre-start schema version check when starting in Docker mode:

- Non-interactive (Quick Start): If a mismatch is detected between the native DB schema and the Docker volume schema, a warning is shown with guidance to run `.\scripts\CHECK_VOLUME_VERSION.ps1 -AutoMigrate` or use the Control Panel Docker operation.
- Interactive (Menu/CLI): If a mismatch is detected, you will be prompted to auto-migrate the Docker volume before containers start.

This reduces accidental starts with incompatible schemas while keeping you in control.

### Proposed Automation

#### Option A: Automatic Version Detection

```python
# Add to backend/routers/control/operations.py

def get_db_schema_version(db_path: Path) -> str:
    """Get current Alembic schema version from database."""
    # Query alembic_version table
    pass

async def auto_migrate_docker_volume():
    """
    Automatically detect if Docker volume needs update:
    1. Check native DB schema version
    2. Check Docker volume DB schema version
    3. If mismatch, create new volume and migrate
    """
    native_db = Path("data/student_management.db")
    docker_volume = "sms_data"

    native_version = get_db_schema_version(native_db)
    # Extract and check Docker volume version...

    if native_version > docker_version:
        # Auto-create new volume and migrate
        await docker_update_volume(migrate=True)
        return {"action": "auto_migrated", "from": docker_version, "to": native_version}

    return {"action": "none", "version": native_version}
```

#### Option B: Pre-Start Hook

```powershell
# Add to DOCKER.ps1 Start-Application

function Invoke-PreStartCheck {
    param([string]$Mode)

    if ($Mode -eq 'docker') {
        # Check if schema versions match
        $nativeVersion = Get-DBSchemaVersion "data/student_management.db"
        $dockerVersion = Get-DockerVolumeSchemaVersion

        if ($nativeVersion -ne $dockerVersion) {
            Write-Warning "Schema version mismatch detected!"
            Write-Host "Native DB: v$nativeVersion, Docker: v$dockerVersion"

            $confirm = Read-Host "Auto-migrate Docker volume? (Y/n)"
            if ($confirm -notmatch '^n') {
                Invoke-DockerVolumeMigration
            }
        }
    }
}
```

#### Option C: Startup Migration Script

```dockerfile
# Add to Dockerfile.backend
COPY scripts/startup-migrate.sh /app/
ENTRYPOINT ["/app/startup-migrate.sh"]

# startup-migrate.sh
#!/bin/bash
# Run Alembic migrations on container start
cd /app/backend
alembic upgrade head
# Then start the app
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Recommended Solution

**Hybrid approach**: Automatic + Manual override

1. **Add version tracking**:
   - Store schema version in `VERSION` file or database
   - Track Docker volume version in override file

2. **Automatic detection on start**:
   - DOCKER.ps1 checks for version mismatches before Docker start
   - Non-interactive: warns and continues; Interactive: offers one-click migration

3. **Keep manual control**:
   - Control Panel operation remains for explicit migrations
   - DOCKER.ps1 commands for volume management

---

## Best Practices

### Development Workflow

1. **Use Native mode for development**:

```powershell
.\NATIVE.ps1 -Start  # Hot-reload enabled
```

2. **Run migrations immediately**:

```powershell
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

3. **Test in Docker before deployment**:

```powershell
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -Start
```

### Production Deployment

1. **Always use Docker mode**:
   - Consistent environment
   - Easier updates
   - Better isolation

2. **Version your volumes**:

```powershell
# Before major updates
docker compose exec backend sh -c "cd /data && tar czf backup.tar.gz student_management.db"
# Use Control Panel to create new versioned volume
```

3. **Automate backups**:

```powershell
# .\scripts\backup-docker-volume.ps1
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker run --rm -v sms_data:/data -v "${PWD}/backups:/backup" `
   alpine tar czf "/backup/sms_data_$timestamp.tar.gz" -C /data .
```

### Troubleshooting

**"Already running" after exit**:

- Use `.\DOCKER.ps1 -Stop` instead of Control Panel in Docker mode
- Or: `docker compose -f docker/docker-compose.yml down` to fully remove containers

**Schema mismatch errors**:

- Check versions: `alembic current` in both native and Docker
- Migrate Docker volume via Control Panel
- Or: Export native DB → Import to Docker

**Port conflicts**:

- Run: `.\DOCKER.ps1 -Status` to check running containers
- Kill processes: `Stop-Process -Id <PID> -Force`

---

## Summary

### ✅ Already Automated

- ✅ One-command start: `DOCKER.ps1 -Start` / `NATIVE.ps1 -Start`
- ✅ One-command stop: `DOCKER.ps1 -Stop` / `NATIVE.ps1 -Stop`
- ✅ Auto mode detection (Docker vs Native)
- ✅ Manual volume migration (Control Panel)
- ✅ Pre-start schema version check (warns/prompt to auto-migrate)

### 🔧 Can Be Improved

- 🔄 Extend auto-migration options and rollback support
- 🔄 Pre-start volume migration hooks
- 🔄 Scheduled restart/backup tasks

### 📋 Recommendations

1. **For now**: Use current manual workflow for volume migrations
2. **Next step**: Add automatic version detection and warnings
3. **Future**: Full automated migration with rollback support

