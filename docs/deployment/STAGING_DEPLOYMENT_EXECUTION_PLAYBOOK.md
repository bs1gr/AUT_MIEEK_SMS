# Staging Deployment Execution Playbook (Jan 8-9, 2026)

**Timeline**: January 8-9, 2026 (45 minutes + 24 hours monitoring)
**Owner**: DevOps Lead + QA
**Reference**: STAGING_DEPLOYMENT_PLAN_$11.17.2.md
**Status**: Ready for execution

---

## 🚀 Quick Reference Timeline

```
JAN 8 (WEDNESDAY)
09:00 - 09:30: Pre-deployment validation (30 min)
09:30 - 10:00: Final go/no-go decision (30 min)
10:00 - 10:45: Deploy $11.17.2 to staging (45 min)
10:45 - 12:00: Manual smoke tests (1h 15m)
12:00 - 12:15: Escalation check (15 min)

JAN 8 (AFTERNOON)
14:00 - 15:00: E2E test execution (1 hour)
15:00 - 15:30: Performance validation (30 min)
15:30 - 16:00: Metrics review (30 min)

JAN 8-9 (OVERNIGHT MONITORING)
Monitor logs, health checks, error rates (24 hours)

JAN 9 (THURSDAY MORNING)
09:00 - 10:00: Final validation (1 hour)
10:00 - 10:30: Documentation & sign-off (30 min)
```

---

## 📋 PRE-DEPLOYMENT VALIDATION (30 minutes)

**Execute First**: `docs/deployment/PRE_DEPLOYMENT_EXECUTION_WALKTHROUGH.md` (7 phases, 30 min)

**Quick Checklist**:
```powershell
# Phase 1: Repository Verification
git status                              # Should be clean
Get-Content VERSION                     # Should show 1.15.1
git log --oneline -1                    # Should show recent release commit

# Phase 2: Infrastructure Check
docker --version                        # Should show v27+
docker ps                               # No containers running (OK if empty)
netstat -ano | findstr ":8080"         # Port should be FREE
Get-Volume D | Select-Object SizeRemaining  # Should show ≥5GB

# Phase 3: Database Verification
Get-ChildItem "backend/backups/" -Filter "*.bak" | Select-Object -First 1
# Should show recent backup file

# Phase 4: Documentation Check
Test-Path "docs/releases/RELEASE_NOTES_$11.17.2.md"  # Should exist
Test-Path "docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.17.2.md"  # Should exist

# Phase 5: Scripts Validation
Test-Path "DOCKER.ps1"                  # Should exist
Test-Path "NATIVE.ps1"                  # Should exist
```

**Decision Point**:
- ✅ All checks pass → **PROCEED to deployment**
- ❌ Any check fails → **STOP and fix issue** (create issue for tracker)

---

## 🎯 PHASE 1: DEPLOYMENT (45 minutes)

### Step 1.1: Confirm GO Decision
```
✓ Checklist complete
✓ No blockers identified
✓ Tech lead approval obtained
✓ Stakeholders notified

Proceed with deployment? YES ✓
```

### Step 1.2: Database Backup (5 minutes)
```powershell
# Current data backup (CRITICAL - DO NOT SKIP)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "data/student_management.db" "backend/backups/pre_$11.17.2_backup_$timestamp.db.bak"
Write-Host "✅ Backup created: pre_$11.17.2_backup_$timestamp.db.bak"

# Verify backup
$backupSize = (Get-Item "backend/backups/pre_$11.17.2_backup_$timestamp.db.bak").Length / 1MB
Write-Host "Backup size: $backupSize MB"
if ($backupSize -gt 0.1) {
    Write-Host "✅ Backup valid (>100KB)"
} else {
    Write-Host "❌ STOP - Backup too small, do not proceed"
    exit 1
}
```

### Step 1.3: Stop Current Containers (2 minutes)
```powershell
# Stop any running containers
.\DOCKER.ps1 -Stop

# Verify stopped
Start-Sleep -Seconds 3
$running = docker ps -q
if ($running) {
    Write-Host "❌ ERROR: Containers still running"
    docker ps
    exit 1
} else {
    Write-Host "✅ All containers stopped"
}
```

### Step 1.4: Deploy $11.15.2 (5 minutes)
```powershell
# Start $11.15.2 (will build if needed)
Write-Host "Starting deployment..."
.\DOCKER.ps1 -Start

# Watch for startup messages
Start-Sleep -Seconds 10
docker logs sms-fullstack --tail 20
```

### Step 1.5: Verify Deployment (5 minutes)
```powershell
# Check containers running
$containers = docker ps
Write-Host $containers
Write-Host "Container should be named 'sms-fullstack' with 'Up' status"

# Health check endpoint
$healthUrl = "http://localhost:8080/health"
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Health check PASSED (took $retryCount seconds)"
            Write-Host $response.Content | ConvertFrom-Json | Format-List
            break
        }
    } catch {
        $retryCount++
        if ($retryCount % 5 -eq 0) {
            Write-Host "⏳ Waiting for container startup... ($retryCount/$maxRetries)"
        }
        Start-Sleep -Seconds 1
    }
}

if ($retryCount -eq $maxRetries) {
    Write-Host "❌ FAILURE: Health check failed after $maxRetries seconds"
    Write-Host "Docker logs:"
    docker logs sms-fullstack --tail 50
    exit 1
}
```

### Step 1.6: Verify Frontend (3 minutes)
```powershell
# Check frontend is accessible
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend accessible at http://localhost:8080"
    }
} catch {
    Write-Host "❌ Frontend not accessible"
    exit 1
}
```

### Step 1.7: Log Verification (5 minutes)
```powershell
# Check for errors in logs
docker logs sms-fullstack --since 5m | Select-String -Pattern "ERROR|CRITICAL|FATAL"

if ($?) {
    Write-Host "⚠️ Review above error messages"
} else {
    Write-Host "✅ No critical errors in recent logs"
}
```

**Deployment Phase Complete**: ✅ $11.15.2 running and healthy

---

## 🧪 PHASE 2: MANUAL SMOKE TESTS (1h 15m)

Execute 8 critical manual tests. Each test takes 5-10 minutes.

### Test 2.1: Admin Login
**Steps**:
1. Open http://localhost:8080 in browser
2. Click "Login" button
3. Enter admin email: `admin@example.com`
4. Enter password: `password` (or from test data)
5. Click "Login"

**Expected**: Redirect to dashboard, see "Admin" role

**Time**: 3 min
**Result**: ✅ PASS / ❌ FAIL

### Test 2.2: Student List View
**Steps**:
1. From dashboard, click "Students" in sidebar
2. Verify list loads (should show 50+ students from seed data)
3. Try searching for a student by name
4. Verify pagination works (next page button)

**Expected**: Student list displays, search works, no errors

**Time**: 5 min
**Result**: ✅ PASS / ❌ FAIL

### Test 2.3: Student Create
**Steps**:
1. Click "+ Add Student" button
2. Fill form: Name, Email, ID, etc.
3. Click "Save"

**Expected**: New student added, appears in list, confirmation message

**Time**: 5 min
**Result**: ✅ PASS / ❌ FAIL

### Test 2.4: Student Edit
**Steps**:
1. Click on a student in list
2. Click "Edit" button
3. Change one field (e.g., email)
4. Click "Save"

**Expected**: Changes saved, no errors, list updated

**Time**: 5 min
**Result**: ✅ PASS / ❌ FAIL

### Test 2.5: Course Management
**Steps**:
1. Click "Courses" in sidebar
2. Verify list shows (should have test courses)
3. Click "+ Add Course"
4. Create new course
5. Click "Save"

**Expected**: Course created, appears in list

**Time**: 5 min
**Result**: ✅ PASS / ❌ FAIL

### Test 2.6: Grade Entry
**Steps**:
1. Click "Grades" in sidebar
2. Select a course
3. Select a student
4. Enter a grade (0-20 scale)
5. Click "Save"

**Expected**: Grade saved, shows in grade list

**Time**: 5 min
**Result**: ✅ PASS / ❌ FAIL

### Test 2.7: Attendance Logging
**Steps**:
1. Click "Attendance" in sidebar
2. Select a course
3. Mark attendance for 3+ students
4. Click "Save"

**Expected**: Attendance saved, shows as marked

**Time**: 5 min
**Result**: ✅ PASS / ❌ FAIL

### Test 2.8: Analytics Dashboard
**Steps**:
1. Click "Analytics" in sidebar
2. Verify dashboard loads
3. Check if charts render (students, courses, grades, etc.)
4. Try date range filter

**Expected**: Dashboard displays, no JavaScript errors

**Time**: 5 min
**Result**: ✅ PASS / ❌ FAIL

### Smoke Test Summary
```
Total Tests: 8
Passed: __/8
Failed: __/8
Errors: ___________________

If any failed:
- Document error message
- Check backend logs for related errors
- Create issue in tracker with screenshot
- Decision: Continue or rollback
```

---

## 🤖 PHASE 3: E2E AUTOMATED TESTS (1 hour)

### Step 3.1: Prepare Test Environment
```powershell
cd frontend
npx playwright test --config=playwright.config.ts
```

### Step 3.2: Monitor Test Execution
```
Expected duration: 5-10 minutes
Tests should complete without timeouts

Real-time output:
✅ Test 1: should load login page
✅ Test 2: should login successfully
✅ Test 3: should load dashboard
✅ Test 4: should list students
... (19 total tests)
```

### Step 3.3: Review Results
```
PASS: Test Results Summary
============================
Total: 19 tests
Passed: 19 ✅
Failed: 0
Skipped: 0
Duration: 8m 30s

Critical Path: 100% PASS

Result: ✅ All tests passing
```

**If Tests Fail**:
```
Failed Test: "should create a new student successfully"
Error: Timeout after 60000ms

Action:
1. Check if endpoint responds: curl http://localhost:8080/api/v1/students
2. Check backend logs: docker logs sms-fullstack
3. If endpoint slow: Investigate database performance
4. If consistent: Increase timeout and re-run
```

---

## 📊 PHASE 4: PERFORMANCE VALIDATION (30 minutes)

### Step 4.1: API Response Times
```powershell
# Test 5 critical endpoints for response time

$endpoints = @(
    "http://localhost:8080/api/v1/students",
    "http://localhost:8080/api/v1/courses",
    "http://localhost:8080/api/v1/grades",
    "http://localhost:8080/api/v1/analytics/dashboard",
    "http://localhost:8080/health"
)

foreach ($endpoint in $endpoints) {
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 5
        $timer.Stop()
        Write-Host "$endpoint : $($timer.ElapsedMilliseconds)ms - ✅"
    } catch {
        Write-Host "$endpoint : ERROR - ❌"
    }
}
```

**Expected Response Times**:
- Student list: <200ms
- Course list: <200ms
- Grades: <200ms
- Analytics: <500ms
- Health: <100ms

**If Slow**:
- Check database indexes
- Review recent changes in Week 1 code
- Investigate N+1 queries

### Step 4.2: Error Rate Check
```powershell
# Check for errors in logs from last hour
docker logs sms-fullstack --since 1h | Select-String -Pattern "500|ERROR|CRITICAL" | Measure-Object

# Should show: 0 critical errors
# If >5 errors: Investigate before proceeding
```

### Step 4.3: Database Performance
```powershell
# Check database file size (shouldn't grow unexpectedly)
(Get-Item "data/student_management.db").Length / 1MB

# Should be ~2-3 MB (baseline from backup)
```

---

## ✅ MONITORING (24 hours)

**Automatic**:
- Docker container health checks (every 30 seconds)
- Application logs streamed to file
- Metrics collected (CPU, memory, requests/sec)

**Manual Checks** (every 2-4 hours):
```powershell
# Check container still running
docker ps | findstr sms-fullstack

# Check recent errors
docker logs sms-fullstack --since 2h | Select-String "ERROR"

# Check health endpoint
Invoke-WebRequest -Uri "http://localhost:8080/health" | Select-Object StatusCode, StatusDescription
```

**24-hour Validation**:
- ✅ Zero critical errors
- ✅ Response times stable
- ✅ No OOM or CPU maxing
- ✅ All manual tests still pass

---

## 📝 SIGN-OFF CHECKLIST (Jan 9 Morning, 30 min)

```
✓ Pre-deployment validation passed (all 30 points)
✓ Deployment completed successfully
✓ Health checks passing
✓ Manual smoke tests: 8/8 passed
✓ E2E automated tests: 19/19 passed
✓ Performance within targets
✓ No critical errors in logs
✓ 24-hour monitoring completed
✓ Metrics baseline recorded
✓ Team notified of success

Approved By: _________________ (Tech Lead)
Date/Time: _________________
Status: ✅ APPROVED FOR PRODUCTION
```

---

## 🔄 ROLLBACK PROCEDURE (If Issues Found)

**Trigger**: Any critical failure (data corruption, security issue, system down)

### Step 1: Stop Current Deployment (2 min)
```powershell
.\DOCKER.ps1 -Stop
```

### Step 2: Restore Database from Backup (3 min)
```powershell
# Use backup from earlier today
Copy-Item "backend/backups/pre_$11.15.2_backup_20260108_100000.db.bak" "data/student_management.db" -Force
Write-Host "✅ Database restored from backup"
```

### Step 3: Redeploy $11.15.2 (5 min)
```powershell
# Change VERSION file back to 1.15.0
echo "1.15.0" | Set-Content VERSION

# Restart with old version
.\DOCKER.ps1 -Start

# Verify health
Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 30
```

### Step 4: Validate Rollback
```powershell
# Run manual smoke tests again (5 min)
# Verify all 8 tests still pass
# Document issue for investigation

Write-Host "Rollback complete - $11.15.2 restored"
```

---

**Playbook Status**: ✅ Ready for execution
**Created**: January 7, 2026
**Execution Date**: January 8-9, 2026
