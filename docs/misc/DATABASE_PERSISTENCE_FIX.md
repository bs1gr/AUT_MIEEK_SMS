# Database Persistence Fix - Volume Loss After Container Restart

**Issue**: When starting the fullstack container, creating data (admin user, files), stopping, and restarting the container, all data is lost and the database reverts to empty state.

**Root Causes Identified**:

1. **Environment File Reinitialization**: The `Initialize-EnvironmentFiles()` function in DOCKER.ps1 creates `.env` files only if they don't exist, BUT the fresh install logic may be overriding the database engine to SQLite
2. **No Persistent Volume Reference**: The environment doesn't guarantee the volume persists or that new containers use the same volume
3. **Database Path Inconsistency**: The SQLite database might be stored in a non-persistent location on first run
4. **Missing Volume Validation**: No checks to ensure the `sms_data` volume is properly mounted and persisting

---

## Deep Analysis

### What Should Happen
```
1. DOCKER.ps1 -Start called
   ↓
2. Initialize .env with SQLite config (first run only)
   - Sets DATABASE_ENGINE=sqlite
   - Sets up SECRET_KEY
   ↓
3. Create/verify Docker volume: sms_data
   ↓
4. Start container with volume mount: sms_data:/data
   - Container app writes to /data/student_management.db
   ↓
5. Volume persists data on host
   ↓
6. Stop container (volume remains)
   ↓
7. Start new container with same volume mount
   - /data/student_management.db already exists with all data
   - Application loads existing database
```

### What's Actually Happening
```
1. Container starts
   ↓
2. Initialize-EnvironmentFiles runs irregularly
   ↓
3. Volume not properly validated/created
   ↓
4. Container may be starting with fresh database
   ↓
5. Data lost on stop/restart
```

---

## Primary Issue: No Volume Persistence Guarantee

**Location**: DOCKER.ps1, `Set-ComposeVolumeEnvironment()` function (line 453+)

**Problem**: This function only runs for Docker Compose (PostgreSQL) mode, NOT for fullstack SQLite mode. The fullstack container has no volume validation logic.

**Solution**: Add volume validation for SQLite mode in `Start-Application()`.

---

## Secondary Issue: Environment File Reset

**Location**: DOCKER.ps1, `Initialize-EnvironmentFiles()` function (line 708+)

**Problem**: If `.env` doesn't exist during fresh install, it might:
- Get created with wrong database settings
- Have PostgreSQL configuration that overrides SQLite default
- Lose configuration between runs if the file isn't persisted

**Solution**: Ensure `.env` is properly created once and never reset unless explicitly requested.

---

## Required Fixes

### Fix 1: Volume Persistence Validation for SQLite Mode

**File**: `DOCKER.ps1`

**Issue**: Fullstack mode doesn't validate or ensure the `sms_data` volume exists and persists.

**Solution**: Add volume creation and validation before starting SQLite container.

```powershell
# Add to Start-Application function, before starting container
if (-not $useCompose) {
    Write-Info "Validating SQLite data volume..."

    # Ensure volume exists
    $volumeCheck = docker volume ls --format "{{.Name}}" 2>$null | Select-String "^sms_data$"
    if (-not $volumeCheck) {
        Write-Info "Creating persistent data volume: sms_data"
        docker volume create sms_data 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Failed to create sms_data volume"
            return 1
        }
    }

    # Verify volume mount
    Write-Success "✓ Data volume 'sms_data' ready (persistent)"
}
```

### Fix 2: Enhanced Environment File Validation

**File**: `DOCKER.ps1`

**Issue**: Fresh install should create `.env` once and preserve it across container restarts.

**Solution**: Add backup mechanism and validation.

```powershell
function Initialize-EnvironmentFiles {
    # ... existing code ...

    # Root .env
    if (-not (Test-Path $ROOT_ENV)) {
        # Create fresh .env
        if (Test-Path $ROOT_ENV_EXAMPLE) {
            $envContent = Get-Content $ROOT_ENV_EXAMPLE -Raw
            # ... modifications ...
            Set-Content -Path $ROOT_ENV -Value $envContent
            Write-Success "Root .env created (persistent - won't be recreated)"
        }
    } else {
        # IMPORTANT: Verify .env is not corrupted on restart
        $envContent = Get-Content $ROOT_ENV -Raw

        # Check for critical settings
        if (-not ($envContent -match 'SECRET_KEY=')) {
            Write-Warning ".env missing SECRET_KEY, regenerating..."
            $secretKey = -join ((48..57) + (65..90) + (97..122) + (45,95) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
            $envContent = $envContent -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey"
            Set-Content -Path $ROOT_ENV -Value $envContent
        }

        # Verify DATABASE_ENGINE is set for SQLite deployments
        if (-not (Get-EnvVarValue -Name "DATABASE_ENGINE")) {
            Write-Warning ".env DATABASE_ENGINE not set, should be 'sqlite' for fresh installs"
        }
    }
}
```

### Fix 3: Database Path Consistency

**File**: `DOCKER.ps1` environment setup

**Issue**: Ensure DATABASE_URL always points to persistent `/data` directory.

**Solution**: Add explicit DATABASE_URL configuration for SQLite mode.

```powershell
# In Start-Application, before starting container:
$dockerCmd += @(
    "-e", "DATABASE_ENGINE=sqlite",
    "-e", "DATABASE_URL=sqlite:////data/student_management.db",  # Full path in volume
    # ... rest of config ...
)
```

### Fix 4: Container Startup Verification

**File**: `DOCKER.ps1`

**Issue**: No verification that database file actually exists after container starts.

**Solution**: Add health check validation.

```powershell
function Wait-ForHealthy {
    # Existing code ...

    # New: Verify database actually exists
    $dbCheck = docker exec $CONTAINER_NAME sh -c 'if [ -f /data/student_management.db ]; then echo "OK"; else echo "MISSING"; fi' 2>/dev/null
    if ($dbCheck -eq "MISSING") {
        Write-Warning "⚠️  Database file not found in volume!"
        Write-Info "This may indicate a volume persistence issue on your Docker installation"
        Write-Info "Troubleshooting:"
        Write-Host "  1. Check volume: docker volume inspect sms_data"
        Write-Host "  2. Check container mount: docker inspect $CONTAINER_NAME | grep -A5 Mounts"
        return $false
    }
}
```

---

## Implementation Steps

### Step 1: Backup Current .env
```powershell
if (Test-Path .\.env) {
    Copy-Item .\.env ".\.env.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Success "Backed up current .env"
}
```

### Step 2: Add Volume Validation
Apply Fix 1 to DOCKER.ps1 before container startup.

### Step 3: Add Environment File Validation
Apply Fix 2 to Initialize-EnvironmentFiles().

### Step 4: Use DOCKER.ps1 Command
```powershell
.\DOCKER.ps1 -Start          # Uses updated script with fixes
```

### Step 5: Verify Persistence
```powershell
# After data creation:
docker volume inspect sms_data   # Check volume exists
docker exec sms ls -lh /data/     # Check db file exists in volume

# After restart:
docker ps                         # See container ID
docker volume inspect sms_data    # Volume should still exist
docker exec sms ls -lh /data/     # Database file should still exist
```

---

## Testing Persistence

### Test Scenario: Fresh Install with Data Persistence

```powershell
# 1. Start fresh
.\DOCKER.ps1 -Start

# 2. Create data
# Access http://localhost:8080
# Create admin user, add students, etc.

# 3. Verify volume has data
docker volume inspect sms_data
# Should show real files/directories

# 4. Stop container
docker stop sms_app

# 5. Start new container
docker start sms_app

# 6. Verify data persists
# Access http://localhost:8080
# Should have all created data

# 7. Check volume
docker run --rm -v sms_data:/data alpine ls -lh /data/
# Should show student_management.db with size > 0
```

---

## Troubleshooting Persistent Data Loss

If data is still lost after applying fixes:

### Check 1: Volume Mounting
```powershell
docker inspect sms_app | ConvertFrom-Json | Select-Object -ExpandProperty Mounts
# Should show: "Name": "sms_data", "Destination": "/data", "Type": "volume"
```

### Check 2: Database File Existence
```powershell
docker exec sms_app ls -lh /data/student_management.db
# Should show file with size > 0 KB
```

### Check 3: Docker Desktop Settings (Windows/Mac)
- Ensure volume driver is `local`
- Check Docker Desktop "Preferences → Resources → File Sharing" includes the volume mount point
- Verify disk space available for volumes

### Check 4: Volume Driver Health
```powershell
docker volume inspect sms_data | ConvertFrom-Json
# "Driver": "local" (correct)
# "Mountpoint": "C:\ProgramData\Docker\volumes\sms_data\_data" (Windows)
# OR "/var/lib/docker/volumes/sms_data/_data" (Linux)
```

### Check 5: Application Configuration
```powershell
# Check DATABASE_URL is correct
docker exec sms_app sh -c 'echo "DATABASE_URL: $(grep DATABASE_URL /app/backend/.env || echo NOTSET)"'
# Should show: sqlite:////data/student_management.db
```

---

## Commands for Manual Verification

```powershell
# List all volumes
docker volume ls

# Inspect sms_data volume
docker volume inspect sms_data

# Check volume contents from host
docker run --rm -v sms_data:/vol alpine du -sh /vol
docker run --rm -v sms_data:/vol alpine ls -lh /vol/

# Check inside running container
docker exec sms_app ls -lh /data/

# Monitor volume operations
docker exec sms_app sh -c 'tail -f /var/log/database.log'  # If available

# Force volume recreation (WARNING: DELETES DATA)
# Only if absolutely necessary to reset:
# docker volume rm sms_data
# docker volume create sms_data
```

---

## Environment File Preservation

The `.env` file should only be created once during fresh installation. Subsequent container restarts should:
1. ✅ Read existing `.env`
2. ✅ Load DATABASE_ENGINE and DATABASE_URL from it
3. ✅ NOT recreate or modify database engine settings
4. ✅ Mount the persistent `sms_data` volume
5. ✅ Access existing `/data/student_management.db`

If `.env` is accidentally deleted or corrupted, the container will still work but will use defaults. This should not affect volume persistence if the volume exists.

---

## Summary

The fix consists of:
1. **Volume Validation**: Ensure `sms_data` volume exists before container start
2. **Environment Persistence**: Create `.env` once and never reset database settings
3. **Mount Point Verification**: Ensure Docker mounts the volume correctly
4. **Health Checks**: Verify database file exists after container startup
5. **Troubleshooting Commands**: Provide diagnostic tools for users

**Expected Result**: After deploying fixes, container restart should preserve all data in the persistent `sms_data` volume.
