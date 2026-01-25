# Staging Deployment Validation - Phase 2 RBAC (Jan 8, 2026)

**Status**: Ready for execution
**Timeline**: 1-2 hours
**Owner**: DevOps/QA
**Objective**: Verify Phase 2 RBAC backend on staging before production deployment

---

## 📋 Pre-Deployment Checklist

### 1. CI/CD Pipeline Status

- [ ] GitHub Actions on main branch completed (all checks passing)
- [ ] No failed workflows or error logs
- [ ] Latest commit: `ca8b2db2f` (docs: add Phase 2 RBAC merge summary)
- [ ] No merge conflicts or blocking issues

**How to check:**

```powershell
# View latest commits

git log --oneline -10

# Check GitHub Actions: https://github.com/bs1gr/AUT_MIEEK_SMS/actions

```text
---

## 🚀 Staging Deployment Steps

### Phase 1: Environment Setup (5-10 minutes)

#### Step 1.1: Clean staging environment

```powershell
# Stop any running containers

docker ps -a | grep sms

# If running, stop it

docker stop sms-app sms-db
docker rm sms-app sms-db

# Remove old volumes to start fresh (OPTIONAL - only if major schema changes)

# docker volume rm sms_data sms_logs

```text
#### Step 1.2: Pull latest code

```powershell
# Ensure on main branch

git checkout main

# Pull latest changes

git pull origin main

# Verify latest commits

git log --oneline -3

```text
#### Step 1.3: Verify file changes

```powershell
# Show all changed files since last deployment

git diff HEAD~5..HEAD --name-only

# Should include RBAC-related changes:

# - backend/rbac.py
# - backend/routers/routers_*.py (multiple)

# - backend/ops/seed_rbac_data.py
# - backend/migrations/

```text
---

### Phase 2: Docker Build & Start (10-15 minutes)

#### Step 2.1: Build fresh Docker image

```powershell
# Navigate to project root

cd D:\SMS\student-management-system

# Clean build (no cache)

.\DOCKER.ps1 -UpdateClean

# Or standard build (with cache)

.\DOCKER.ps1 -Start

```text
#### Step 2.2: Verify container is running

```powershell
# Check container status

docker ps | grep sms

# Expected output should show:

# - sms-app (FastAPI backend)
# - sms-db (or SQLite volume)

```text
#### Step 2.3: Check logs for errors

```powershell
# View container logs

docker logs sms-app

# Watch for:

# - Successful startup messages
# - No critical errors

# - Migration completion messages
# - "Uvicorn running on" confirmation

```text
---

### Phase 3: Database & RBAC Seeding (10-15 minutes)

#### Step 3.1: Run RBAC seeding script

```powershell
# Execute seeding script inside container

docker exec sms-app python /app/backend/ops/seed_rbac_data.py

# Expected output:

# - "Seeding complete" message
# - No errors or warnings

# - Should be idempotent (safe to run multiple times)

```text
#### Step 3.2: Verify seeding results

```powershell
# Check that permissions were created

docker exec sms-app python /app/backend/ops/seed_rbac_data.py --verify

# Expected output:

# ✓ All 26 permissions found
# ✓ All 3 roles found

# ✓ All role-permission mappings found
# ✓ RBAC seeding verification PASSED

```text
#### Step 3.3: Verify database schema (optional)

```powershell
# Check migrations ran successfully

docker exec sms-app python -c "
from backend.db import SessionLocal
from backend.models import Permission, Role, RolePermission
db = SessionLocal()
print(f'Permissions: {db.query(Permission).count()}')
print(f'Roles: {db.query(Role).count()}')
print(f'Mappings: {db.query(RolePermission).count()}')
"

```text
---

### Phase 4: API Health & Functionality (15-20 minutes)

#### Step 4.1: Check health endpoints

```powershell
# Health check

curl http://localhost:8080/health

# Should return:

# {
#   "status": "healthy",

#   "version": "1.15.1",
#   "database": "connected",

#   ...
# }

```text
#### Step 4.2: Verify RBAC endpoints are protected

```powershell
# Test permission check on protected endpoint (should fail without auth)

curl -X GET http://localhost:8080/api/v1/admin/permissions

# Should return 401 Unauthorized or 403 Forbidden

# Test with auth (if available)

# curl -X GET http://localhost:8080/api/v1/admin/permissions \
#   -H "Authorization: Bearer YOUR_TOKEN"

```text
#### Step 4.3: Test permission API endpoints

```powershell
# List all permissions

curl http://localhost:8080/api/v1/permissions

# Get permissions grouped by resource

curl http://localhost:8080/api/v1/permissions/by-resource

# Get permission stats

curl http://localhost:8080/api/v1/permissions/stats

```text
#### Step 4.4: Verify monitoring tools work

```powershell
# Run RBAC health checks

docker exec sms-app python /app/scripts/rbac_monitor.py

# Should output:

# ✓ All health checks passed
# - Users without roles: 0

# - Admins detected: 1+
# - Permission seeding verified

```text
---

### Phase 5: E2E Testing (20-30 minutes)

#### Step 5.1: Run core E2E tests

```powershell
# Run only critical path tests (student management, auth, basic flows)

npm run e2e -- --grep "critical|student|auth"

# OR run full E2E suite (takes longer)

npm run e2e

# Expected: 19+ tests passing (100% critical path)

```text
#### Step 5.2: Run smoke test scenario

```powershell
# Manual smoke test (if E2E unavailable):

# 1. Open http://localhost:8080 in browser
# 2. Login with test credentials

# 3. Navigate to admin section (verify permissions work)
# 4. Create/edit/delete a student (verify basic CRUD)

# 5. Check student list loads without errors

```text
---

### Phase 6: Performance Baseline (10-15 minutes)

#### Step 6.1: Run baseline metrics

```powershell
# If load testing available, run quick baseline

cd load-testing
locust -f load_test.py --headless -u 10 -r 5 -t 2m

# OR run manual latency checks

curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/v1/students
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/v1/permissions

```text
#### Step 6.2: Check database query performance

```powershell
# Monitor slow queries in logs

docker logs sms-app | grep -i "slow\|duration"

# Should see no slow queries (>1000ms) on basic operations

```text
---

### Phase 7: Monitoring & 24-Hour Soak (24 hours)

#### Step 7.1: Enable monitoring

```powershell
# Start with monitoring enabled

.\DOCKER.ps1 -WithMonitoring

# OR manually check metrics

curl http://localhost:8080/metrics

```text
#### Step 7.2: Set monitoring alerts

```powershell
# Monitor for:

# - Endpoint error rates >1%
# - Permission check failures

# - Database connection pool exhaustion
# - Memory/CPU anomalies

```text
#### Step 7.3: Run 24-hour soak

```powershell
# Leave staging running for 24 hours

# Check logs periodically:
docker logs --tail 100 sms-app

# Look for:

# - Any errors or exceptions
# - Memory leaks

# - Connection pool issues
# - Permission-related failures

```text
---

## ✅ Success Criteria

| Check | Expected Result | Status |
|-------|-----------------|--------|
| **Docker build** | Successful, no errors | ⬜ Pending |
| **Container running** | sms-app healthy | ⬜ Pending |
| **RBAC seeding** | 26 permissions + 3 roles created | ⬜ Pending |
| **Health endpoint** | Returns 200 + version info | ⬜ Pending |
| **Permission API** | 12 endpoints respond correctly | ⬜ Pending |
| **E2E tests** | 19+ critical tests passing | ⬜ Pending |
| **RBAC monitor** | All 5 health checks pass | ⬜ Pending |
| **24-hour soak** | No errors or warnings | ⬜ Pending |
| **Performance** | p95 latencies within targets | ⬜ Pending |

---

## 🚨 Rollback Procedure

If issues are found during staging:

```powershell
# 1. Stop staging deployment

.\DOCKER.ps1 -Stop

# 2. Restore previous version (if needed)

git checkout HEAD~3  # Go back 3 commits

# 3. Rebuild with previous version

.\DOCKER.ps1 -Start

# 4. Run seeding with previous schema

docker exec sms-app python /app/backend/ops/seed_rbac_data.py

# 5. Verify rollback successful

docker logs sms-app

```text
---

## 📊 Issues Found & Resolution

Document any issues encountered during staging validation:

### Issue Template

```text
Issue #:
Severity: (Critical/High/Medium/Low)
Description:
Steps to Reproduce:
Expected Result:
Actual Result:
Root Cause:
Resolution:
Status: (Open/In Progress/Resolved)

```text
---

## 🎯 Final Sign-Off

Once all checks pass:

- [ ] All 7 phases completed successfully
- [ ] No blockers or critical issues found
- [ ] Performance baselines established
- [ ] 24-hour soak completed without errors
- [ ] Ready for production deployment approval

**Signed by:** _________________
**Date:** _________________
**Time to complete:** ______ hours

---

## 📖 Reference Documentation

- [Permission Management Guide](../admin/PERMISSION_MANAGEMENT_GUIDE.md) - Admin workflows
- [RBAC Operations Guide](../admin/RBAC_OPERATIONS_GUIDE.md) - Operational procedures
- [API Permissions Reference](../../backend/API_PERMISSIONS_REFERENCE.md) - API endpoints
- [Docker Operations](./DOCKER_OPERATIONS.md) - Docker commands
- [Phase 2 RBAC Merge Summary](../../PHASE2_RBAC_MERGE_COMPLETE.md) - Merge details

---

**Created:** January 8, 2026
**Updated:** January 8, 2026
**Status:** Ready for execution
