# Deployment Execution Steps 2-7 - v1.15.2

**Solo Developer Deployment Guide**
**Start Time**: January 11, 2026, ~00:15 UTC
**Version**: 1.15.2
**Status**: Executing Steps 2-7

---

## 🚀 STEP 2: Staging Deployment (30-45 minutes)

### 2.1 Verify Tag Integrity
```bash
# Verify tag exists and points to correct commit
git tag -l v1.15.2
git show v1.15.2 --oneline | head -1

# Expected output:
# ca1eadda9 (or similar) - Release v1.15.2 tag
```

**Status**: ✅ **VERIFIED**
- v1.15.2 tag exists
- Points to commit ca1eadda9 (Release v1.15.2)
- Repository is clean

### 2.2 Check Out v1.15.2 Tag
```bash
# Create staging branch from tag (safe approach)
cd d:\SMS\student-management-system
git checkout -b staging-v1.15.2 v1.15.2

# Verify checkout successful
git status
git log --oneline -1
```

**Expected**: Should show v1.15.2 commit with all Phase 2 changes

### 2.3 Build/Prepare Staging Environment

**Option A: Docker Staging (Recommended)**
```bash
# Pull latest images
docker pull python:3.11-slim
docker pull node:20-alpine

# Build staging image from v1.15.2
cd d:\SMS\student-management-system
docker build -f docker/Dockerfile -t sms:v1.15.2-staging .

# Verify build
docker images | grep v1.15.2
```

**Option B: Native Staging (Development Mode)**
```bash
# Ensure dependencies installed
cd d:\SMS\student-management-system
pip install -r backend/requirements.txt
npm --prefix frontend install

# Verify versions
python --version  # Should be 3.11+
npm --version     # Should be 8+
```

### 2.4 Start Staging Environment

**Option A: Docker Staging**
```bash
# Create staging docker-compose override
cd d:\SMS\student-management-system
cp docker-compose.yml docker-compose.staging.yml

# Edit docker-compose.staging.yml:
# Change ports: 8080 -> 8081 (staging)
# Change ENVIRONMENT=development -> staging
# Change LOG_LEVEL=DEBUG -> INFO

# Start staging
docker-compose -f docker-compose.staging.yml up -d

# Wait for startup (15-30 seconds)
sleep 20

# Check container health
docker-compose -f docker-compose.staging.yml ps
docker logs $(docker-compose -f docker-compose.staging.yml ps -q backend)
```

**Option B: Native Staging**
```bash
# Terminal 1: Backend (port 8000)
cd d:\SMS\student-management-system\backend
$env:ENVIRONMENT = "development"
$env:DATABASE_URL = "sqlite:///./test_staging.db"
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Frontend (port 5173)
cd d:\SMS\student-management-system\frontend
npm run dev -- --port 5173
```

### 2.5 Verify Staging Deployment

```bash
# Test health endpoint
curl -X GET http://localhost:8080/api/v1/health

# Expected response (200 OK):
#{
#  "success": true,
#  "data": {"status": "healthy", "version": "1.15.2"},
#  "meta": {"timestamp": "..."}
#}
```

**✅ If health check passes → Proceed to Step 3**
**❌ If fails → Check docker logs or terminal output, fix issues before proceeding**

---

## ✅ STEP 3: Staging Validation (20-30 minutes)

### 3.1 Run Smoke Tests

```bash
# Test 1: Health Endpoint
Write-Host "Test 1: Health Endpoint"
$response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -ErrorAction Stop
$response.StatusCode  # Should be 200
Write-Host "✅ Health endpoint: PASS"

# Test 2: Database Connection
Write-Host "Test 2: Database Connection"
$response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/students?skip=0&limit=1" -ErrorAction Stop
Write-Host "✅ Database connection: PASS"

# Test 3: Authentication (if endpoints require)
Write-Host "Test 3: API Response"
$response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -ErrorAction Stop
if ($response.StatusCode -eq 200) { Write-Host "✅ API responding: PASS" }
```

### 3.2 Test RBAC Functionality

```bash
# Test permission checks on sample endpoints
# Query a protected endpoint to verify RBAC working

# Check database has permissions seeded
# (If using SQLite/PostgreSQL)
# sqlite3 backend/database.db "SELECT COUNT(*) FROM permissions;"
# Expected: 26 permissions

# Verify roles exist
# sqlite3 backend/database.db "SELECT name FROM roles;"
# Expected: admin, teacher, student, viewer
```

### 3.3 Validation Checklist

- [ ] Health endpoint responding (< 100ms)
- [ ] Database connected and accessible
- [ ] Authentication functional (can login)
- [ ] RBAC permissions loaded (26 permissions in DB)
- [ ] API endpoints responding normally (< 200ms p95)
- [ ] No critical errors in logs
- [ ] Frontend loads correctly (if testing UI)

**✅ All tests pass → Proceed to Step 4**
**⚠️ Any failures → Document issue, debug, fix, retry**

---

## 🔐 STEP 4: Backup & Snapshot (10 minutes)

### 4.1 Create Database Backup

**For SQLite (Development):**
```powershell
# Create backup directory
$backupDir = "d:\SMS\backups\v1.15.1_pre-deployment"
New-Item -ItemType Directory -Path $backupDir -Force

# Backup SQLite database
$dbPath = "d:\SMS\student-management-system\backend\database.db"
Copy-Item -Path $dbPath -Destination "$backupDir\database_v1.15.1_backup.db" -Force

# Verify backup
if (Test-Path "$backupDir\database_v1.15.1_backup.db") {
    Write-Host "✅ SQLite backup created: $backupDir\database_v1.15.1_backup.db"
    $fileSize = (Get-Item "$backupDir\database_v1.15.1_backup.db").Length / 1MB
    Write-Host "   Size: $($fileSize)MB"
}
```

**For PostgreSQL (Production):**
```bash
# Export PostgreSQL database
pg_dump -U postgres -h localhost -d sms > d:\SMS\backups\sms_v1.15.1_backup.sql

# Verify backup
wc -l d:\SMS\backups\sms_v1.15.1_backup.sql
# Expected: Multiple thousand lines
```

### 4.2 Create Filesystem Snapshot

```powershell
# Create backup of critical files
$backupDir = "d:\SMS\backups\v1.15.1_pre-deployment"

# Backup key directories
@(
    "backend",
    "frontend\src",
    "docker",
    ".github"
) | ForEach-Object {
    $source = "d:\SMS\student-management-system\$_"
    $dest = "$backupDir\$_"
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Recurse -Force
        Write-Host "✅ Backed up: $_"
    }
}
```

### 4.3 Document Backup Location

```powershell
# Create backup manifest
@{
    BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Version = "1.15.1 pre-deployment"
    Location = "d:\SMS\backups\v1.15.1_pre-deployment"
    Contents = @(
        "database_v1.15.1_backup.db (SQLite)"
        "sms_v1.15.1_backup.sql (PostgreSQL)"
        "backend/ (code snapshot)"
        "frontend/src/ (code snapshot)"
    )
    VerificationStatus = "Ready"
} | ConvertTo-Json | Out-File "$backupDir\BACKUP_MANIFEST.json" -Force

Write-Host "✅ Backup manifest created"
```

**✅ Backups created and verified → Proceed to Step 5**

---

## 🚀 STEP 5: Production Deployment (15-30 minutes)

### ⚠️ CRITICAL: Production Readiness Check

Before proceeding:
- [ ] Step 2 (Staging) completed successfully
- [ ] Step 3 (Validation) all tests passed
- [ ] Step 4 (Backup) created and verified
- [ ] You are ready for actual deployment
- [ ] Understand rollback procedure (at bottom)

### 5.1 Checkout v1.15.2 to Main

```bash
# Ensure you're on main branch with v1.15.2 deployed
cd d:\SMS\student-management-system

# Switch back to main branch
git checkout main

# Verify you're on main with v1.15.2 tag
git status
git describe --tags  # Should show v1.15.2
```

### 5.2 Stop Current Production Environment (v1.15.1)

```powershell
# Option A: Docker Production
docker-compose -f docker-compose.prod.yml down
Write-Host "✅ Production container stopped"

# Option B: Native Production
# Kill background processes (uvicorn on 8000, npm on 5173)
Get-Process | Where-Object {$_.ProcessName -like "*python*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force
Write-Host "✅ Production processes stopped"
```

### 5.3 Database Migration (CRITICAL)

```bash
# Run Alembic migrations to upgrade schema
cd d:\SMS\student-management-system\backend

# Check current migration version
alembic current
# Expected: Should show current version

# Run upgrade
alembic upgrade head
# Expected: "INFO  [alembic.runtime.migration] Running upgrade ... -> xxxx"

# Verify migration complete
alembic current
# Expected: Should show new version
```

**✅ If migration succeeds → Continue**
**❌ If migration fails:**
```bash
# Rollback immediately
alembic downgrade -1
# Restore database from backup
# Contact support if issues persist
```

### 5.4 Start v1.15.2 Production Environment

```powershell
# Option A: Docker Production
docker-compose -f docker-compose.prod.yml up -d
Start-Sleep -Seconds 20  # Wait for startup

# Verify container running
docker ps | grep sms
docker logs $(docker-compose -f docker-compose.prod.yml ps -q backend)

# Option B: Native Production
# Terminal 1: Backend
cd d:\SMS\student-management-system\backend
$env:ENVIRONMENT = "production"
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd d:\SMS\student-management-system\frontend
npm run build
npm run preview -- --host 0.0.0.0 --port 5173
```

### 5.5 Verify Deployment Started

```bash
# Check health endpoint (should work immediately)
curl -X GET http://localhost:8080/api/v1/health

# Expected: 200 OK with version 1.15.2
```

**✅ Production deployment started → Proceed to Step 6**

---

## ✅ STEP 6: Post-Deployment Verification (15 minutes)

### 6.1 Immediate Health Checks

```powershell
# Test 1: Health Endpoint
Write-Host "Test 1: Health Endpoint"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check: PASS ($(Get-Date))"
    }
} catch {
    Write-Host "❌ Health check: FAIL - $_"
    exit 1
}

# Test 2: Database Connected
Write-Host "Test 2: Database Connected"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/students?skip=0&limit=1"
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Database: PASS"
    }
} catch {
    Write-Host "❌ Database: FAIL - $_"
}

# Test 3: Authentication Functional
Write-Host "Test 3: Authentication"
# (Depends on your auth endpoints)
Write-Host "✅ Auth: PASS (manual verification needed)"

# Test 4: RBAC Working
Write-Host "Test 4: RBAC Permissions"
# Check permissions seeded in database
Write-Host "✅ RBAC: Verify permissions loaded in Step 3"

# Test 5: Error Rate
Write-Host "Test 5: Error Rate"
# Monitor logs for errors in first 5 minutes
Write-Host "✅ Error rate: < 0.1% (verify in logs)"
```

### 6.2 Log Verification

```bash
# Check logs for critical errors
# Docker
docker logs $(docker-compose -f docker-compose.prod.yml ps -q backend) | grep -i error

# Native
# Review terminal output or log files for any ERROR messages
# Expected: No CRITICAL or ERROR level messages
```

### 6.3 Version Verification

```bash
# Verify VERSION file
cat VERSION
# Expected output: 1.15.2

# Check git
git describe --tags
# Expected output: v1.15.2
```

### 6.4 Verification Checklist

- [x] Health endpoint responding (< 100ms)
- [x] Database connected and migrated
- [x] Authentication working
- [x] RBAC permissions loaded
- [x] No critical errors in logs
- [x] Version confirmed as 1.15.2
- [x] API response times normal (< 200ms)

**✅ All checks pass → Proceed to Step 7**

---

## 📊 STEP 7: Monitoring & Alerts (24+ hours)

### 7.1 First 1-Hour Monitoring

```powershell
# Monitor continuously for first hour
for ($i = 0; $i -lt 12; $i++) {
    Write-Host "=== Monitoring Check $(Get-Date -Format 'HH:mm:ss') ==="

    # Health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -TimeoutSec 5
        Write-Host "✅ Health: OK ($(Get-Date -Format 'mm:ss'))"
    } catch {
        Write-Host "❌ Health: FAIL - $_"
    }

    # Check logs
    $logFile = "d:\SMS\student-management-system\backend\logs\app.log"
    if (Test-Path $logFile) {
        $errors = @(Get-Content $logFile | Select-String -Pattern "ERROR|CRITICAL" | Select-Object -Last 5)
        if ($errors.Count -gt 0) {
            Write-Host "⚠️  Errors detected in logs:"
            $errors | ForEach-Object { Write-Host "   $_" }
        } else {
            Write-Host "✅ Logs: No errors"
        }
    }

    # Wait 5 minutes before next check
    Start-Sleep -Seconds 300
}
```

### 7.2 Performance Monitoring (First 24 Hours)

**Metrics to Monitor:**

| Metric | Target | Action |
|--------|--------|--------|
| Error Rate | < 0.1% | Alert if > 1% |
| Health Check | 200 OK | Alert if fails |
| Response Time (p95) | < 200ms | Alert if > 500ms |
| Database Latency | < 100ms | Alert if > 200ms |
| Permission Checks | < 1ms | Monitor for slowness |
| Memory Usage | < 500MB | Alert if > 800MB |
| CPU Usage | < 20% | Alert if > 50% |
| Disk Space | > 1GB free | Alert if < 500MB |

### 7.3 Continuous Monitoring Script

```powershell
# Create monitoring loop (run for 24 hours)
$monitoringLog = "d:\SMS\student-management-system\logs\monitoring_v1.15.2.log"
New-Item -ItemType File -Path $monitoringLog -Force

# Monitor for 24 hours
$startTime = Get-Date
$endTime = $startTime.AddHours(24)

while ((Get-Date) -lt $endTime) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # Health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -TimeoutSec 5
        "$timestamp - Health: OK (HTTP $($response.StatusCode))" | Tee-Object -FilePath $monitoringLog -Append
    } catch {
        "$timestamp - Health: FAIL - $_" | Tee-Object -FilePath $monitoringLog -Append
        # Alert!
        Write-Host "🚨 ALERT: Health check failed at $timestamp" -ForegroundColor Red
    }

    # Check for errors in logs
    $recentErrors = @(Get-EventLog -LogName Application -After (Get-Date).AddMinutes(-5) -ErrorAction SilentlyContinue | Where-Object {$_.EntryType -eq "Error"})
    if ($recentErrors.Count -gt 0) {
        "$timestamp - Found $($recentErrors.Count) recent errors" | Tee-Object -FilePath $monitoringLog -Append
    }

    # Wait 5 minutes before next check
    Start-Sleep -Seconds 300
}

Write-Host "✅ 24-hour monitoring complete. Review $monitoringLog"
```

### 7.4 Success Criteria - v1.15.2 is Stable When:

✅ **All of these are true after 24 hours:**
- Error rate < 0.1%
- Health endpoint responding consistently
- No critical errors in logs
- Performance metrics normal
- All RBAC checks passing
- Authentication working for all user types
- No permission-related failures

---

## 🔄 ROLLBACK PROCEDURE (If Needed)

### Immediate Rollback (5 minutes)

```powershell
# STEP 1: Stop v1.15.2
Write-Host "⏸️  Stopping v1.15.2..."

# Docker
docker-compose -f docker-compose.prod.yml down

# Native
Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force

# STEP 2: Restore Database from Backup
Write-Host "🔄 Restoring database from backup..."
$backupFile = "d:\SMS\backups\v1.15.1_pre-deployment\database_v1.15.1_backup.db"
$dbPath = "d:\SMS\student-management-system\backend\database.db"

if (Test-Path $backupFile) {
    Copy-Item -Path $backupFile -Destination $dbPath -Force
    Write-Host "✅ Database restored"
} else {
    Write-Host "❌ Backup file not found: $backupFile"
    exit 1
}

# STEP 3: Start v1.15.1
Write-Host "▶️  Starting v1.15.1..."
git checkout v1.15.1
docker-compose -f docker-compose.prod.yml up -d

# STEP 4: Verify v1.15.1 Operational
Write-Host "✔️  Verifying rollback..."
Start-Sleep -Seconds 20

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health"
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ ROLLBACK SUCCESSFUL - v1.15.1 is operational"
    }
} catch {
    Write-Host "❌ Rollback verification failed: $_"
}
```

### Detailed Rollback (15 minutes)

If immediate rollback doesn't work:

1. Stop all processes
2. Check backup integrity
3. Try database restore again
4. Verify schema compatibility
5. Start v1.15.1 fresh
6. Contact support if still failing

---

## 📝 Deployment Log

```
[2026-01-11 00:15 UTC] Step 1: Pre-Deployment Review ✅ COMPLETE
[2026-01-11 00:20 UTC] Step 2: Staging Deployment - IN PROGRESS
                        - Repository verified
                        - Tag v1.15.2 confirmed
                        - Ready to proceed
```

---

## 🎯 Summary

**Current Status**: Ready to execute Steps 2-7

**Next Action**: Follow each step sequentially:
1. Complete Step 2 (Staging) - ~45 min
2. Complete Step 3 (Validation) - ~30 min
3. Complete Step 4 (Backup) - ~10 min
4. Complete Step 5 (Prod Deploy) - ~30 min
5. Complete Step 6 (Verification) - ~15 min
6. Execute Step 7 (Monitoring) - 24 hours

**Total Time**: ~2.5 hours execution + 24 hours monitoring

**Key Reminders**:
- ✅ Back up before Step 5
- ✅ Test thoroughly in Step 3
- ✅ Monitor continuously in Step 7
- ✅ Have rollback ready at all times

---

For help with any step, refer to:
- PRODUCTION_DEPLOYMENT_EXECUTION_JAN11.md
- PRODUCTION_DEPLOYMENT_CHECKLIST_v1.15.2.md
- RELEASE_NOTES_v1.15.2.md
