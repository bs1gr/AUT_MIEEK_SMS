# Testing Database Persistence - Quick Start

After deploying the persistence fixes, follow these steps to verify data persists across container restarts.

## Prerequisites

```powershell
# Ensure no containers running
docker ps -a
# If sms_app container exists, remove it
docker rm -f sms_app 2>$null

# Optional: Start fresh (removes old volume)
# WARNING: This deletes all data!
# docker volume rm sms_data
```

## Test Procedure (5 minutes)

### Step 1: Start Container with New Fixes
```powershell
.\DOCKER.ps1 -Start
# Expected output:
#   ✓ Validating persistent data volume for SQLite deployment...
#   ✓ Data volume 'sms_data' created (fresh)  [first run]
#   --- or ---
#   ✓ Data volume 'sms_data' exists (persistent)  [subsequent runs]
#   ✓ Database file confirmed in persistent volume
```

This takes 1-2 minutes. Wait for "Application is healthy and ready!"

### Step 2: Create Test Data
```powershell
# Open browser: http://localhost:8080
# Create admin user (if not already created):
#   Email: admin@test.example.com
#   Password: TestPassword123!

# In the app:
# 1. Go to Students
# 2. Add a new student (name: "Persistence Test", ID: "PT001")
# 3. Save the student
# 4. Note the student appears in the list
```

### Step 3: Stop Container
```powershell
docker stop sms_app
# Container stops but volume persists
```

Wait a few seconds for clean shutdown.

### Step 4: Verify Volume Still Has Data
```powershell
# Check volume still exists
docker volume ls | Select-String sms_data
# Output: sms_data               local

# Check database file size (should be > 100KB with data)
docker run --rm -v sms_data:/vol alpine ls -lh /vol/
# Output: -rw-r--r--    1 root     root      X.XXM student_management.db

# Should NOT be empty or missing
```

### Step 5: Restart Container (The Critical Test)
```powershell
.\DOCKER.ps1 -Start
# Re-starts existing container with same volume
```

Wait for "Application is healthy and ready!"

### Step 6: Verify Data Persisted
```powershell
# Open browser: http://localhost:8080
# Expected to see:
# ✓ Admin user still exists (can log in with same credentials)
# ✓ Student "Persistence Test" still in the list
# ✓ All data from Step 2 is present
```

**If data is there → Persistence is working! ✅**

---

## What Works After Fix

| Scenario | Expected | Status |
|----------|----------|--------|
| Fresh install → create data | Volume created, data saved | ✅ |
| Container stop/start | Data persists in volume | ✅ |
| Container restart | Loads existing database | ✅ |
| Multiple starts/stops | Data accumulates | ✅ |
| Host restart (Docker Desktop) | Volume survives | ✅ |

---

## Verification Commands

### Quick Health Check
```powershell
# After starting container:
docker volume ls | Select-String sms_data
docker exec sms_app ls -lh /data/student_management.db
docker exec sms_app sh -c 'echo "DATABASE_URL: $(grep -E "^DATABASE" /app/backend/.env 2>/dev/null || echo 'NOT SET')"'
```

### Full Diagnostic
```powershell
# Check everything
echo "=== Volume Status ===" 
docker volume inspect sms_data

echo "=== Container Mounts ===" 
docker inspect sms_app | ConvertFrom-Json | Select -ExpandProperty Mounts

echo "=== Database File ===" 
docker exec sms_app ls -lh /data/

echo "=== Database Configuration ===" 
docker exec sms_app sh -c 'grep -E "DATABASE|SMS_EXECUTION" /app/backend/.env'
```

---

## Troubleshooting

### Issue: Data Lost After Restart

**Check 1: Volume Exists**
```powershell
docker volume ls
# Should list 'sms_data'
```

**Check 2: Volume Has Files**
```powershell
docker run --rm -v sms_data:/vol alpine du -sh /vol
# Should NOT say "0 B" or empty
```

**Check 3: Container Mounts Volume**
```powershell
docker inspect sms_app 2>$null | ConvertFrom-Json | Select -ExpandProperty Mounts | Where Name -eq sms_data
# Should show: Name: sms_data, Source: (local path), Destination: /data
```

**Check 4: Container Permissions**
```powershell
docker exec sms_app ls -la /data/
# Should show student_management.db with read/write permissions
```

**Check 5: Database Configuration**
```powershell
docker exec sms_app grep DATABASE_URL /app/backend/.env
# Should show: sqlite:////data/student_management.db
```

### Issue: "Database file not confirmed in persistent volume"

This warning appears if volume is not properly persisting. Causes:

1. **Docker Desktop resource limits**: Increase memory/disk in settings
2. **Volume driver issue**: Check `docker volume inspect sms_data` shows `"Driver": "local"`
3. **File permission issue**: Container can't write to volume
   - Solution: `docker exec sms_app chmod 777 /data`
4. **Volume mount not working**: 
   - Solution: Stop container, remove volume, restart: 
   ```powershell
   docker volume rm sms_data
   .\DOCKER.ps1 -Start
   ```

---

## Performance Notes

After persistence fixes:
- ✅ First start (creates volume): ~2-3 minutes
- ✅ Second start (reuses volume): ~2-3 minutes  
- ✅ Database file: ~5-50 MB (depending on data)
- ✅ Volume operations: Transparent to user

---

## Success Criteria

✅ **Test Passes When:**
- Fresh install creates data volume
- Admin user persists across restarts
- Students/data visible after restart
- No "Database file not found" warnings
- Volume appears in `docker volume ls`

❌ **Test Fails When:**
- Data missing after restart
- "Database file not confirmed" error
- Volume disappears
- Can't log in with created admin account
- "DATABASE_NOT_FOUND" in startup log

---

## Next Steps After Successful Test

1. **Create a databackup** (optional but recommended):
   ```powershell
   .\DOCKER.ps1 -BackupData
   # Backup location: ./backups/
   ```

2. **Monitor in production**: Watch for any data loss issues
   
3. **Report any issues**: If data is still lost, provide:
   - Docker version: `docker --version`
   - Output of: `docker volume inspect sms_data`  
   - Container logs: `docker logs sms_app`
   - Diagnostic: See full diagnostic above

---

**Document Created**: February 16, 2026  
**Applies To**: DOCKER.ps1 persistence fixes commit c938b6357  
**Status**: Ready for testing

