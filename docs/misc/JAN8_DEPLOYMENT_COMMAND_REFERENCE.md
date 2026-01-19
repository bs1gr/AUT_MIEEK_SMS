# Jan 8 Deployment Execution - Morning Command Reference

**Date**: January 8, 2026 (Tomorrow, 09:00 UTC)
**Purpose**: Quick reference for deployment execution
**Audience**: DevOps Lead, QA Engineer, Tech Lead
**Status**: Ready to use

---

## ⏰ Timeline (All times UTC)

| Time | Activity | Duration | Owner | Reference |
|------|----------|----------|-------|-----------|
| 08:30 | Team standup & final questions | 15 min | All | Pre-deployment meeting |
| 08:45 | **Go/No-Go Decision** | 10 min | Tech Lead | PRE_DEPLOYMENT_EXECUTION_WALKTHROUGH.md (Phase 7) |
| 09:00 | Pre-deployment validation begins | 30 min | DevOps Lead | Phase 1 commands below |
| 09:30 | Database backup | 15 min | DevOps Lead | Phase 1.2 commands |
| 09:45 | **DEPLOYMENT BEGINS** | 45 min | DevOps Lead | Phase 1.3-1.7 commands |
| 10:30 | Health check | 10 min | DevOps Lead | Phase 1.8 commands |
| 10:40 | Manual smoke tests | 60 min | QA Engineer | Phase 2 tests |
| 11:40 | E2E automated tests | 15 min | QA Engineer | Phase 3 commands |
| 11:55 | **GO/NO-GO for 24-hour monitoring** | 5 min | Tech Lead | All tests passing? |
| 12:00 | Monitoring begins | 24 hours | DevOps + QA | Phase 4 checklist |
| **Jan 9, 12:00** | **Monitoring complete** | - | Tech Lead | Final sign-off |

---

## 📋 Phase 1: Pre-Deployment Validation (08:00-09:00)

### 1.1 Repository Verification (2 min)
```powershell
cd d:\SMS\student-management-system
git status
git log --oneline -3
# Expected: Clean working tree, HEAD at fc6a30cd4 or later
```

### 1.2 Database Backup (10 min)
```powershell
# Backup existing database
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "d:\SMS\student-management-system\backups\pre_v1.17.2_$timestamp.db"
Copy-Item -Path "d:\SMS\student-management-system\data\student_management.db" -Destination $backupPath -Force -ErrorAction SilentlyContinue
Write-Host "Database backed up to: $backupPath"

# List recent backups
Get-ChildItem -Path "d:\SMS\student-management-system\backups\*.db" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 3 | Format-Table Name, Length, LastWriteTime
# Expected: Backup file exists with current timestamp
```

### 1.3 Port Availability Check (3 min)
```powershell
# Check if ports are available
$ports = @(8080, 8000, 5173)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet
    if ($connection) {
        Write-Host "⚠️  Port $port is in use - may need to stop existing container" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Port $port is available" -ForegroundColor Green
    }
}

# If port 8080 is in use, stop container:
# docker ps
# docker stop sms-fullstack
# docker rm sms-fullstack (optional, if not needed)
```

### 1.4 Disk Space Check (2 min)
```powershell
# Check available disk space
$drive = Get-PSDrive -PSProvider FileSystem -Name D
Write-Host "Drive D: Space available: $([Math]::Round($drive.Free/1GB, 2)) GB"
# Expected: At least 5 GB free
```

### 1.5 Docker Status (3 min)
```powershell
# Verify Docker is running
docker ps
# Expected: Docker responds, shows any running containers

# List recent images
docker images | head -10
# Expected: Images exist (sms-fullstack, etc.)
```

### 1.6 Environment Files (2 min)
```powershell
# Verify environment files exist
Test-Path backend/.env
Test-Path frontend/.env
# Expected: Both return True

# Verify .env files have content
Get-Content backend/.env | head -3
Get-Content frontend/.env | head -3
```

### 1.7 Pre-Deployment Documentation (3 min)
```powershell
# Verify deployment documentation is in place
Test-Path docs/deployment/STAGING_DEPLOYMENT_EXECUTION_PLAYBOOK.md
Test-Path docs/deployment/STAGING_DEPLOYMENT_PLAN_v1.17.2.md
# Expected: Both return True
```

---

## 🚀 Phase 2: Deployment Execution (09:45-10:45)

### 2.1 Build Docker Image (if needed)
```powershell
# Only run if image doesn't exist or needs rebuild
cd d:\SMS\student-management-system
docker build -t sms-fullstack:latest -f docker/Dockerfile .
# Expected: Build completes without errors (may take 2-5 min)
```

### 2.2 Stop Existing Container (if running)
```powershell
# Stop and remove old container
docker stop sms-fullstack -ErrorAction SilentlyContinue
docker rm sms-fullstack -ErrorAction SilentlyContinue
Write-Host "Old container cleaned up" -ForegroundColor Green
```

### 2.3 Deploy Container with Volume Mount
```powershell
# Deploy container with current data directory
docker run -d `
  --name sms-fullstack `
  -p 8080:8000 `
  -v d:\SMS\student-management-system\data:/app/data `
  -e ENVIRONMENT=production `
  -e AUTH_MODE=permissive `
  -e DISABLE_RATE_LIMITING=0 `
  sms-fullstack:latest

Write-Host "Container deployed" -ForegroundColor Green
```

### 2.4 Check Container Logs (3 min)
```powershell
# Wait for startup
Start-Sleep -Seconds 3

# Check logs for startup messages
docker logs sms-fullstack | head -50
# Expected: FastAPI startup message, no critical errors

# Watch logs in real-time (press Ctrl+C to stop)
docker logs -f sms-fullstack
```

### 2.5 Verify Migration Completed (2 min)
```powershell
# Check logs for migration messages
docker logs sms-fullstack | Select-String "migration|upgrade|alembic" -Context 0
# Expected: Messages show migrations ran or were already up-to-date
```

---

## ✅ Phase 3: Health Checks (10:30-10:40)

### 3.1 API Health Endpoints (with retry)
```powershell
function Test-HealthEndpoint {
    param([string]$Url, [int]$MaxRetries = 30)

    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
            if ($response.status -eq "healthy") {
                Write-Host "✅ $Url - Healthy" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "⏳ Attempt $i/$MaxRetries: Waiting for API..." -ForegroundColor Yellow
            Start-Sleep -Seconds 1
        }
    }
    Write-Host "❌ $Url - Failed after $MaxRetries retries" -ForegroundColor Red
    return $false
}

# Test all health endpoints
Test-HealthEndpoint "http://localhost:8080/health"
Test-HealthEndpoint "http://localhost:8080/health/ready"
Test-HealthEndpoint "http://localhost:8080/health/live"
```

### 3.2 Verify API Accessibility
```powershell
# Test basic API call
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/students?limit=1" -Method Get
    Write-Host "✅ API is responding to requests" -ForegroundColor Green
} catch {
    Write-Host "❌ API not responding: $_" -ForegroundColor Red
}
```

### 3.3 Database Connection Test
```powershell
# Test database by querying students count
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/students?limit=1" -Method Get
    if ($response.data) {
        Write-Host "✅ Database is accessible and responsive" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Database issue: $_" -ForegroundColor Red
}
```

---

## 🧪 Phase 4: Manual Smoke Tests (10:40-11:40)

### Quick Reference - Each Test Should Pass
```
Test 1: Login Flow
  - Navigate to http://localhost:8080
  - Expected: Login page loads
  - Duration: 1-2 min

Test 2: Admin Login
  - Use admin credentials from .env
  - Expected: Dashboard loads without errors
  - Duration: 2-3 min

Test 3: Student List
  - Navigate to Students page
  - Expected: Student list displays, pagination works
  - Duration: 2-3 min

Test 4: Student Create
  - Create new student with test data
  - Expected: Student created successfully
  - Duration: 3-5 min

Test 5: Grade Entry
  - Navigate to Grades section
  - Expected: Grade entry form displays
  - Duration: 2-3 min

Test 6: Attendance Log
  - Navigate to Attendance section
  - Expected: Attendance marking works
  - Duration: 2-3 min

Test 7: Analytics Dashboard
  - Navigate to Analytics
  - Expected: Charts and metrics display
  - Duration: 2-3 min

Test 8: Multi-language Support
  - Toggle between EN and EL
  - Expected: UI updates correctly
  - Duration: 1-2 min
```

**For detailed test procedures**, refer to:
- `docs/deployment/STAGING_DEPLOYMENT_EXECUTION_PLAYBOOK.md` (Section 2)

---

## 🤖 Phase 5: Automated E2E Tests (11:40-11:55)

### Run Playwright E2E Tests
```powershell
cd d:\SMS\student-management-system/frontend

# Run all E2E tests
npx playwright test --project=chromium
# Expected: 19/19 tests passing or similar baseline

# If specific test fails:
npx playwright test --project=chromium --grep "test name"
```

### Alternative: Run via npm script
```powershell
cd d:\SMS\student-management-system/frontend
npm run test:e2e
# Expected: Same results, all critical tests passing
```

---

## 📊 Phase 6: Monitoring & Sign-Off

### 6.1 Container Running Verification
```powershell
# Check container is still running
docker ps | Select-Object STATUS, PORTS, NAMES | Format-Table
# Expected: sms-fullstack container showing "Up" status
```

### 6.2 Memory/CPU Usage
```powershell
# Check container resource usage
docker stats --no-stream sms-fullstack
# Expected: Reasonable memory usage (<500MB for initial), CPU <10%
```

### 6.3 Log Monitoring Plan
```powershell
# Start continuous log monitoring for 24 hours
# Option 1: Save logs to file
docker logs sms-fullstack > d:\SMS\student-management-system\monitoring\deployment_logs_$(Get-Date -Format "yyyyMMdd_HHmm").txt

# Option 2: Real-time monitoring (in separate terminal)
docker logs -f sms-fullstack
```

### 6.4 Monitoring Checklist (Next 24 Hours)
```
□ Every 1 hour: Check container still running (docker ps)
□ Every 1 hour: Check no critical errors in logs (docker logs | grep -i error)
□ Every 4 hours: Check API health endpoint (curl http://localhost:8080/health)
□ Every 4 hours: Check database performance (query student count)
□ Morning after: Final verification before production sign-off
```

---

## 🆘 Troubleshooting Quick Reference

| Issue | Command |
|-------|---------|
| Container won't start | `docker logs sms-fullstack` |
| Port already in use | `netstat -ano \| findstr ":8080"` then `taskkill /PID <pid>` |
| API not responding | `curl http://localhost:8080/health` (or wait 10 seconds) |
| Database errors | Check `data/student_management.db` exists and is readable |
| Tests failing | Check frontend is built: `cd frontend && npm run build` |
| Need rollback | Stop container and restore backup database |

---

## 📝 Sign-Off Checklist (Jan 8 Evening)

Before declaring deployment successful:

- [ ] **Repository Clean**: `git status` shows no uncommitted changes
- [ ] **Container Running**: `docker ps` shows sms-fullstack running
- [ ] **Health Endpoints**: All 3 health endpoints responding (alive, ready, healthy)
- [ ] **API Working**: Can call `/api/v1/students` successfully
- [ ] **Smoke Tests**: All 8 manual tests passed (✅ documented)
- [ ] **E2E Tests**: 19/19 tests passing (or baseline established)
- [ ] **No Errors**: `docker logs` shows no critical errors
- [ ] **Database**: `student_management.db` exists and is accessible
- [ ] **Backup**: Pre-deployment database backup confirmed
- [ ] **Monitoring**: Log monitoring configured and running

**Tech Lead Sign-Off**: _________________ Date: _______ Time: _______

---

## 📞 Emergency Contacts

**If deployment fails**:
1. Check troubleshooting section above
2. Review `docker logs sms-fullstack` for specific errors
3. Contact Tech Lead immediately
4. Refer to "Rollback Procedures" in STAGING_DEPLOYMENT_EXECUTION_PLAYBOOK.md

**For questions**:
- Deployment runbook: `docs/deployment/STAGING_DEPLOYMENT_EXECUTION_PLAYBOOK.md`
- Deployment plan: `docs/deployment/STAGING_DEPLOYMENT_PLAN_$11.15.2.md`
- General questions: Tech Lead

---

**Ready for Jan 8 execution**: ✅
**Last verified**: January 7, 2026, 21:00 UTC
**Next action**: Execute Phase 1 (Pre-deployment validation) at 08:00 Jan 8
