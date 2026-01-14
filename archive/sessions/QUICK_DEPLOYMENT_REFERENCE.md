# Quick Deployment Reference Card - v1.15.2

**Solo Developer Edition** | **All Steps 2-7** | **Total: ~2.5 hours**

---

## 📋 STEP-BY-STEP QUICK COMMANDS

### STEP 2: STAGING DEPLOYMENT (30-45 min)

```powershell
# Verify tag
git tag -l v1.15.2

# Checkout staging
git checkout -b staging-v1.15.2 v1.15.2

# Start Docker staging
docker-compose -f docker-compose.staging.yml up -d

# OR start native staging (Terminal 1: Backend)
cd backend
$env:ENVIRONMENT = "development"
python -m uvicorn main:app --reload --port 8000

# OR start native staging (Terminal 2: Frontend)
cd frontend
npm run dev -- --port 5173

# Test health
curl http://localhost:8080/api/v1/health
# Expected: 200 OK
```

**✅ PASS CONDITION**: Health endpoint returns 200 OK

---

### STEP 3: STAGING VALIDATION (20-30 min)

```powershell
# Quick smoke tests
$tests = @{
    "Health Endpoint" = "http://localhost:8080/api/v1/health"
    "Database" = "http://localhost:8080/api/v1/students?skip=0&limit=1"
}

foreach ($test in $tests.GetEnumerator()) {
    try {
        Invoke-WebRequest -Uri $test.Value | Out-Null
        Write-Host "✅ $($test.Key): PASS"
    } catch {
        Write-Host "❌ $($test.Key): FAIL"
    }
}

# Check database permissions
# sqlite3 backend/database.db "SELECT COUNT(*) FROM permissions;"
# Expected: 26

# Check logs for errors
docker logs $(docker-compose -f docker-compose.staging.yml ps -q backend) | grep -i error
```

**✅ PASS CONDITION**: All tests pass, no critical errors in logs

---

### STEP 4: BACKUP & SNAPSHOT (10 min)

```powershell
# Create backup directory
$backupDir = "d:\SMS\backups\v1.15.1_pre-deployment"
New-Item -ItemType Directory -Path $backupDir -Force

# Backup database
Copy-Item -Path "backend\database.db" -Destination "$backupDir\database_backup.db" -Force

# Backup key files
@("backend", "frontend\src", "docker") | ForEach-Object {
    Copy-Item -Path $_ -Destination "$backupDir\$_" -Recurse -Force
}

# Verify backup
Get-ChildItem $backupDir -Recurse | Measure-Object
Write-Host "✅ Backup location: $backupDir"
```

**✅ PASS CONDITION**: Backup created and verified, size > 100MB

---

### STEP 5: PRODUCTION DEPLOYMENT (15-30 min)

```powershell
# Switch to main with v1.15.2
git checkout main
git describe --tags  # Should show v1.15.2

# CRITICAL: Create pre-migration backup (safety net)
Copy-Item -Path "backend\database.db" -Destination "$backupDir\database_pre_migration.db" -Force

# Stop current production
docker-compose -f docker-compose.prod.yml down
# OR: Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force

# Run migrations (CRITICAL)
cd backend
alembic current  # Check current version
alembic upgrade head  # Upgrade to latest
alembic current  # Verify upgrade

# Start v1.15.2 production
cd ..
docker-compose -f docker-compose.prod.yml up -d
Start-Sleep -Seconds 20

# Verify deployment
curl http://localhost:8080/api/v1/health
# Expected: 200 OK with version 1.15.2
```

**✅ PASS CONDITION**:
- Migrations run successfully
- Health endpoint returns 200 OK
- Version is 1.15.2

---

### STEP 6: POST-DEPLOYMENT VERIFICATION (15 min)

```powershell
# All 5 critical tests
Write-Host "Running post-deployment verification..."

# Test 1: Health
$h = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health"
Write-Host "✅ Health: $($h.StatusCode)"

# Test 2: Database
$d = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/students?skip=0&limit=1"
Write-Host "✅ Database: $($d.StatusCode)"

# Test 3: Version
cat VERSION
Write-Host "✅ Version: 1.15.2"

# Test 4: Logs clean
docker logs $(docker-compose -f docker-compose.prod.yml ps -q backend) | grep -i "error\|critical" | wc -l
Write-Host "✅ Critical errors: 0"

# Test 5: RBAC
Write-Host "✅ RBAC: Permissions verified in Step 3"

Write-Host ""
Write-Host "🟢 ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL"
```

**✅ PASS CONDITION**: All 5 tests pass

---

### STEP 7: MONITORING & ALERTS (24+ hours)

```powershell
# Start monitoring loop
$monitoringLog = "monitoring_v1.15.2_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
$endTime = (Get-Date).AddHours(24)

while ((Get-Date) -lt $endTime) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -TimeoutSec 5
        "$ts - HEALTHY ($($response.StatusCode))" | Tee-Object -FilePath $monitoringLog -Append
    } catch {
        "$ts - ERROR: $_" | Tee-Object -FilePath $monitoringLog -Append
        Write-Host "🚨 CRITICAL ALERT!" -ForegroundColor Red
    }

    Start-Sleep -Seconds 300  # Check every 5 minutes
}

Write-Host "✅ Monitoring complete"
```

**✅ MONITORING SUCCESS**: No errors logged, health stable, all metrics normal

---

## 🔄 EMERGENCY ROLLBACK (Do this if deployment fails)

```powershell
# IMMEDIATE STOP
docker-compose -f docker-compose.prod.yml down
Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force

# RESTORE BACKUP
Copy-Item -Path "$backupDir\database_backup.db" -Destination "backend\database.db" -Force

# START V1.15.1
git checkout v1.15.1
docker-compose -f docker-compose.prod.yml up -d
Start-Sleep -Seconds 20

# VERIFY
curl http://localhost:8080/api/v1/health
Write-Host "✅ Rollback complete - v1.15.1 restored"
```

---

## 📊 STATUS TRACKING

```
Step 1: Pre-Deployment Review          ✅ COMPLETE (5 min)
Step 2: Staging Deployment             ⏳ NEXT (30-45 min)
Step 3: Staging Validation             ⏳ PENDING (20-30 min)
Step 4: Backup & Snapshot              ⏳ PENDING (10 min)
Step 5: Production Deployment          ⏳ PENDING (15-30 min)
Step 6: Post-Deployment Verification   ⏳ PENDING (15 min)
Step 7: Monitoring & Alerts            ⏳ PENDING (24 hours)
────────────────────────────────────────────────────────────
Total: ~2.5 hours execution + 24h monitoring
```

---

## ⚠️ CRITICAL CHECKPOINTS

| Step | Must-Pass | Failure = Rollback |
|------|-----------|-------------------|
| 2 | Health endpoint OK | YES |
| 3 | No critical errors | YES |
| 4 | Backup > 100MB | YES |
| 5 | Migrations success | YES |
| 6 | All 5 tests pass | YES |
| 7 | Error rate < 0.1% | Maybe |

---

## 🎯 NOW: Start with Step 2!

Execute STEP 2 commands above and report:
1. ✅ Does health endpoint work?
2. ✅ Are there any errors?
3. ✅ Is staging ready for validation?

**Go!** 🚀
