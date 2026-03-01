# v1.18.5 Deployment Checklist

**Version**: 1.18.5  
**Release Date**: March 1, 2026  
**Deployment Type**: Patch upgrade (v1.18.4 → v1.18.5)  
**Database Migrations**: None required  
**Downtime Estimate**: 5-15 minutes  

---

## ⏳ Pre-Deployment Phase

### 24-Hour Before

- [ ] **Schedule Maintenance Window**
  - Document in status page and user notifications
  - Time: Off-peak hours recommended (e.g., 2:00-3:00 AM UTC)
  - Duration: Budget 30 minutes for safety

- [ ] **Backup Current System**
  ```powershell
  ./DOCKER.ps1 -Backup
  # Verify backup created in backups/ directory
  ```

- [ ] **Review Release Notes**
  - Read [RELEASE_NOTES_v1.18.5.md](RELEASE_NOTES_v1.18.5.md)
  - Understand new features and capabilities
  - Note any breaking changes (none in v1.18.5)

- [ ] **Verify Installer Integrity**
  - Download SMS_Installer_1.18.5.exe
  - Download SMS_Installer_1.18.5.exe.sha256
  - Verify checksum:
    ```powershell
    Get-FileHash SMS_Installer_1.18.5.exe -Algorithm SHA256
    # Compare with .sha256 file content
    ```

- [ ] **Test Environment Update** (if available)
  - Deploy to staging environment
  - Run smoke tests
  - Verify analytics features work

### 1-Hour Before

- [ ] **Final Backup**
  ```powershell
  ./DOCKER.ps1 -Status
  # Verify system is healthy before upgrade
  
  ./DOCKER.ps1 -Backup
  # Create fresh backup immediately before upgrade
  ```

- [ ] **Notify Users** (if applicable)
  - Post maintenance notice
  - Disable non-essential services
  - Close active sessions if possible

- [ ] **Prepare Rollback Plan**
  - Know rollback procedure (see end of this checklist)
  - Backup current scripts and configs
  - Test rollback in test environment if possible

---

## 🚀 Deployment Phase

### Step 1: Stop Current Services

```powershell
./DOCKER.ps1 -Stop
# Wait for containers to gracefully shutdown

# Verify containers are stopped
./DOCKER.ps1 -Status
# Should show all containers as "Exited" or not running
```

**Expected Output:**
```
sms-app:              Exited (0)
sms-db:               Exited (0)
sms-redis:            Exited (0)
sms-backup:           Not running
```

**If timeout occurs:**
- Check Docker daemon: `docker ps -a`
- Manually stop: `docker stop sms-app sms-db sms-redis`
- Force stop if needed: `docker kill $(docker ps -aq)`

### Step 2: Download/Prepare v1.18.5

**Option A: Using Installer (Windows)**
```powershell
# Download SMS_Installer_1.18.5.exe
# Double-click to launch installer
# Choose "Repair/Upgrade" when prompted
# Follow prompts (upgrade from v1.18.4)
```

**Option B: Using Docker deployment**
```powershell
# Update Docker compose files
git fetch origin v1.18.5
git checkout v1.18.5
# Verify VERSION file shows 1.18.5
cat VERSION
```

### Step 3: Update Configuration (if needed)

**Version 1.18.5 Configuration Changes**
- ✅ No new environment variables required
- ✅ No new database credentials needed
- ✅ Analytics features use existing database schema
- ✅ Existing .env file is compatible

**Verify .env Settings**
```powershell
# Check for required variables (should already exist)
$requiredVars = @(
    'DATABASE_URL',
    'ALLOWED_HOSTS',
    'SECRET_KEY',
    'AUTH_MODE',
    'API_KEY'
)

foreach ($var in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "WARNING: $var not set"
    }
}
```

### Step 4: Start New Services

```powershell
./DOCKER.ps1 -Start
# Services will initialize with v1.18.5 code

# Wait for containers to be ready (typically 30-60 seconds)
# Watch startup logs if needed
```

**Expected Initialization Sequence:**
1. Database container starts
2. Database migrations run (none in v1.18.5)
3. Cache (Redis) initializes
4. Application server starts
5. Health checks pass

### Step 5: Verify Successful Deployment

```powershell
# Wait 30-60 seconds for services to be ready
Start-Sleep -Seconds 30

# Check container status
./DOCKER.ps1 -Status
# All containers should show "Up" and "healthy"

# Verify API health endpoint
$healthResponse = curl.exe -s http://localhost:8080/api/v1/health | ConvertFrom-Json
Write-Host "Status: $($healthResponse.status)"
Write-Host "Version: $($healthResponse.version)"
# Expected: status=healthy, version=1.18.5
```

**Common Verification Errors:**
- Connection refused → Services still starting, wait longer
- 500 Internal Server Error → Check logs: `docker logs sms-app`
- Database connection error → Verify DATABASE_URL is correct

### Step 6: Verify Analytics Features

```powershell
# Test analytics endpoints
curl.exe -s http://localhost:8080/api/v1/analytics/cache/status | json

# Expected response:
# {
#   "cache_status": "operational",
#   "last_cleared": "...",
#   "analytics_ready": true
# }

# Test report generation (may take 10-30 seconds first time)
$reportPayload = @{
    name = "Test Analytics Report"
    entity_type = "student"
    output_format = "pdf"
} | ConvertTo-Json

curl.exe -X POST http://localhost:8080/api/v1/analytics/reports/generate `
    -ContentType "application/json" `
    -Body $reportPayload
```

---

## ✅ Post-Deployment Validation

### Immediate Checks (0-5 minutes after start)

- [ ] **System Health**
  - [ ] API responds: `curl http://localhost:8080/api/v1/health`
  - [ ] Database connected: `curl http://localhost:8080/api/v1/health/db`
  - [ ] No error logs: `docker logs sms-app | grep ERROR`

- [ ] **Version Verification**
  - [ ] Correct version visible: VERSION file shows 1.18.5
  - [ ] API reports correct version: `/health` endpoint
  - [ ] Frontend shows v1.18.5 in UI footer

- [ ] **Core Features**
  - [ ] Login/authentication working
  - [ ] Dashboard loads
  - [ ] Student list displays
  - [ ] Grade entry functional

### 5-15 Minute Checks

- [ ] **Analytics Features**
  - [ ] Analytics Dashboard loads at `/analytics`
  - [ ] Dashboard charts render with data
  - [ ] Filters work (student, course, time period)
  - [ ] Summary cards display correct values

- [ ] **Report Generation**
  - [ ] Create custom report via wizard
  - [ ] Generate PDF/Excel export
  - [ ] Download succeeds
  - [ ] File opens correctly

- [ ] **Predictive Analytics**
  - [ ] Predictions available in dashboard
  - [ ] Risk assessment panel shows data
  - [ ] Confidence scores displayed

- [ ] **Database Integrity**
  - [ ] No data corruption observed
  - [ ] All students/courses visible
  - [ ] Grades display correctly
  - [ ] Attendance records present

### 15-30 Minute Checks

- [ ] **Stress Testing (optional)**
  - [ ] Multiple concurrent analytics queries
  - [ ] Large report generation (100+ records)
  - [ ] Dashboard with all filters applied
  - [ ] Rapid login/logout cycles

- [ ] **Translation Verification**
  - [ ] Switch language: Settings → Greek (Ελληνικά)
  - [ ] Analytics UI translates correctly
  - [ ] Report labels in Greek
  - [ ] All text displays properly

- [ ] **Performance Monitoring**
  - [ ] API response times <200ms (p95)
  - [ ] Dashboard load time <2 seconds
  - [ ] Report generation <30 seconds
  - [ ] No memory leaks in logs

---

## 🔄 Rollback Procedure

**If critical issues discovered during deployment:**

### Immediate Rollback (within first hour)

```powershell
# Step 1: Stop v1.18.5 services
./DOCKER.ps1 -Stop

# Step 2: Revert to v1.18.4
git fetch origin v1.18.4
git checkout v1.18.4
# OR if using installer:
# Download SMS_Installer_1.18.4.exe and run

# Step 3: Restore from backup
./DOCKER.ps1 -RestoreFromBackup
# Select latest backup from before upgrade

# Step 4: Restart
./DOCKER.ps1 -Start

# Step 5: Verify restored state
curl http://localhost:8080/api/v1/health
# Should show version 1.18.4
```

### Deferred Rollback (after 1+ hour)

```powershell
# If v1.18.5 has been running successfully but issues appear later:

# 1. Identify issue and gather logs
docker logs sms-app > deployment_logs_v1.18.5.txt
docker stats --no-stream > system_stats.txt

# 2. Open GitHub issue with logs
# (Do NOT immediately rollback if unclear if it's a v1.18.5 issue)

# 3. If confirmed v1.18.5 issue:
# Follow "Immediate Rollback" procedure above
```

### No Rollback Needed (most likely scenario)

- v1.18.5 is stable
- Analytics features working as designed
- All verification checks pass
- Continue normal operations

---

## 🔔 Issue Escalation

**If verification fails, follow this path:**

1. **Check Logs First**
   ```powershell
   docker logs sms-app | tail -100
   # Look for error patterns
   ```

2. **Common Issues & Solutions**
   - See [FRESH_DEPLOYMENT_TROUBLESHOOTING.md](../FRESH_DEPLOYMENT_TROUBLESHOOTING.md)
   - Check analytics-specific issues in [ANALYTICS_TROUBLESHOOTING.md](../ANALYTICS_TROUBLESHOOTING.md)

3. **Open GitHub Issue**
   - Title: `[v1.18.5] Deployment Issue - {description}`
   - Include: Docker logs, error screenshots, system specs
   - Tag: `deployment` `v1.18.5` `help-wanted`

4. **Emergency Contact** (if available)
   - Slack: #system-emergencies
   - Email: deployment-issues@example.com

---

## 📋 Final Sign-Off

**Deployment Completed**
- [ ] All verification checks passed
- [ ] No critical issues identified
- [ ] Previous version backed up
- [ ] Rollback plan confirmed working
- [ ] Team/users notified of success

**Deployment Time**
- Start Time: _______________
- End Time: _______________
- **Total Downtime: _____ minutes**

**Signed By**: _________________ **Date**: _____________

---

## 📞 Support & Follow-Up

**Post-Deployment Monitoring**
- Monitor system for 24 hours
- Check error logs daily for first week
- Gather user feedback on analytics features
- Document any issues for v1.18.6 planning

**Scheduled Check-ins**
- [ ] 1 hour after deployment
- [ ] 24 hours after deployment
- [ ] 1 week after deployment (analytics usage)
- [ ] 1 month after deployment (performance)

**Success Metrics**
- 0 critical production errors in first 24 hours
- All tests passing (2,691+)
- Analytics features functional
- No user access issues
