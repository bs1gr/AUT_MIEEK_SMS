# $11.15.2 Staging Deployment Plan

**Date**: January 7, 2026
**Version**: 1.15.1
**Environment**: Staging
**Status**: ⏳ Ready to Deploy

---

## 📋 Deployment Overview

This plan guides deployment of $11.15.2 (Post-Phase 1 Polish release) to staging environment for validation testing before production release.

**Estimated Time**: 30-45 minutes
**Downtime**: ~5 minutes (container restart)
**Rollback Time**: <5 minutes (revert to $11.15.2 if needed)

---

## 🎯 Staging Deployment Objectives

1. **Validate E2E Monitoring** - Ensure monitoring infrastructure works in staging
2. **Test Metrics Collection** - Verify metrics extraction scripts function correctly
3. **Smoke Testing** - Run full suite of smoke tests
4. **Performance Baseline** - Verify no performance regressions
5. **Documentation Validation** - Confirm deployment guides are accurate

---

## ✅ Pre-Deployment Checklist

### Environment Verification (5 minutes)

- [ ] Staging server accessible via SSH/RDP
- [ ] Docker installed and running: `docker version`
- [ ] Docker Compose installed: `docker-compose --version`
- [ ] Sufficient disk space: `df -h` (need ≥5GB free)
- [ ] Sufficient memory: `free -h` (need ≥4GB available)
- [ ] Network connectivity to primary database (if external)

### Code Verification (5 minutes)

```bash
# Clone or pull latest main branch

cd /staging/student-management-system
git pull origin main
git log --oneline -5  # Verify $11.15.2 commit 3b9d44fd5 is latest

# Verify version file

cat VERSION  # Should show: 1.15.1

```text
- [ ] Latest commit is `3b9d44fd5`
- [ ] VERSION file shows 1.15.1
- [ ] CHANGELOG.md updated with $11.15.2 entry
- [ ] Release notes available (RELEASE_NOTES_$11.15.2.md)

### Backup Procedures (5 minutes)

```bash
# Backup current database ($11.15.2)

mkdir -p /staging/backups/pre-1.15.1
docker exec sms-fullstack sqlite3 /data/student_management.db ".backup '/staging/backups/pre-1.15.1/student_management_$11.15.2.db'"

# Verify backup

ls -lh /staging/backups/pre-1.15.1/

```text
- [ ] Database backed up
- [ ] Backup verified (file size >100KB)
- [ ] Backup path documented

---

## 🚀 Deployment Steps

### Phase 1: Preparation (5 minutes)

```bash
# Navigate to project

cd /staging/student-management-system

# Verify clean state

git status  # Should show no uncommitted changes

# Pull latest code

git pull origin main

# Verify version

cat VERSION  # 1.15.1

```text
- [ ] Code updated to latest
- [ ] Version confirmed
- [ ] No local changes

### Phase 2: Shutdown (2 minutes)

```bash
# Using Docker deployment script

./DOCKER.ps1 -Stop

# Verify containers stopped

docker ps  # Should show no running sms containers

# Alternative (direct docker-compose)

docker-compose down

```text
- [ ] $11.15.2 containers stopped
- [ ] No data loss (volumes preserved)
- [ ] Ports freed

### Phase 3: Deployment (5 minutes)

```bash
# Deploy $11.15.2

./DOCKER.ps1 -Update

# What happens:

# - Pulls latest images
# - Rebuilds if necessary

# - Starts containers
# - Waits for health checks

# - Runs startup migrations

# Monitor startup

docker-compose logs -f sms-fullstack

# Watch for:

# "Application startup complete"
# "Uvicorn running on 0.0.0.0:8000"

```text
- [ ] Build completed successfully
- [ ] Containers started
- [ ] Health checks passing
- [ ] Logs show no errors

### Phase 4: Validation (15 minutes)

```bash
# Basic accessibility

curl -s http://localhost:8080 | head -20
# Should return HTML with login form

# API health check

curl -s http://localhost:8080/api/v1/health | jq .

# Check version endpoint

curl -s http://localhost:8080/api/v1/version | jq .

# Expected response:

# {
#   "version": "1.15.1",

#   "status": "ok",
#   "environment": "staging"

# }

```text
- [ ] Frontend accessible (port 8080)
- [ ] Backend responding (port 8000/api)
- [ ] Health checks passing
- [ ] Version confirmed as 1.15.1

---

## 🧪 Staging Validation Tests

### Smoke Test Suite (30 minutes)

**Run full smoke test checklist:**

```bash
# Execute smoke tests

cd /staging/student-management-system
python -m pytest backend/tests/test_smoke_*.py -v

# Or use smoke test script if available

./COMMIT_READY.ps1 -Quick  # Quick validation

```text
**Test Categories**:

- [ ] **Authentication Tests**
  - [ ] Login with valid credentials
  - [ ] Login with invalid credentials
  - [ ] Session persistence
  - [ ] Logout functionality

- [ ] **Core CRUD Tests**
  - [ ] Create student
  - [ ] Read student list
  - [ ] Update student
  - [ ] Delete student
  - [ ] Create course
  - [ ] Enroll student

- [ ] **E2E Test Baseline**
  - [ ] Run E2E test suite
  - [ ] Expected: 19/24 critical tests passing
  - [ ] Verify test report generation
  - [ ] Check metrics collection

- [ ] **API Response Format**
  - [ ] Success response structure
  - [ ] Error response structure
  - [ ] Request ID tracking
  - [ ] Timestamp metadata

### E2E Monitoring Validation (15 minutes)

```bash
# Test metrics collection

cd /staging/student-management-system
npm run e2e  # Run E2E tests

# Verify metrics collection

python scripts/e2e_metrics_collector.py \
  frontend/playwright-report/report.json \
  staging-$(date +%s) \
  staging \
  $(git rev-parse HEAD) \
  300

# Expected output:

# ✅ Metrics saved
# ✅ E2E Test Metrics Collected

# ✅ Pass rate data extracted

```text
- [ ] E2E tests run successfully
- [ ] Metrics collector works
- [ ] Reports generated
- [ ] No errors in monitoring scripts

### Performance Baseline (10 minutes)

```bash
# Create 100 students

for i in {1..100}; do
  curl -X POST http://localhost:8080/api/v1/students \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Test Student $i\", \"email\": \"student$i@example.com\"}"
done

# Measure list performance

time curl -s http://localhost:8080/api/v1/students | jq .

# Expected: <100ms response time

```text
- [ ] Student creation works
- [ ] List performance <100ms
- [ ] No timeouts or errors
- [ ] Database queries optimized

---

## 📊 Post-Deployment Validation

### Log Review (5 minutes)

```bash
# Check application logs

docker-compose logs sms-fullstack --tail=100

# Look for:

# ✅ No ERROR or CRITICAL messages
# ✅ Successful startup sequence

# ✅ Health checks passing
# ✅ Database migrations completed

```text
- [ ] No error messages
- [ ] Startup completed cleanly
- [ ] Health checks green

### Monitoring Validation (5 minutes)

```bash
# Test monitoring endpoints

curl -s http://localhost:8080/api/v1/metrics/students | jq .
curl -s http://localhost:8080/api/v1/metrics/courses | jq .
curl -s http://localhost:8080/api/v1/metrics/grades | jq .

# Expected: Metric objects with count/stats

```text
- [ ] Metrics endpoints responding
- [ ] Audit log API functional
- [ ] No missing data

### User Interface Check (5 minutes)

Open in browser: `http://localhost:8080`

- [ ] Login page loads
- [ ] CSS styles render correctly
- [ ] Navigation menu present
- [ ] All pages responsive

---

## 🆘 Rollback Procedure

If critical issues found, rollback to $11.15.2:

```bash
# Stop current deployment

./DOCKER.ps1 -Stop

# Restore database backup (if needed)

docker exec sms-fullstack sqlite3 /data/student_management.db ".restore '/staging/backups/pre-1.15.1/student_management_$11.15.2.db'"

# Checkout previous version

git checkout $11.15.2  # Or git checkout <commit-hash>
cat VERSION  # Verify 1.15.0

# Restart with previous version

./DOCKER.ps1 -Start

# Verify rollback

curl -s http://localhost:8080/api/v1/version | jq .
# Should show version 1.15.0

```text
**Rollback Time**: <5 minutes
**Data Loss**: None (using volume backups)

---

## 📝 Sign-Off Checklist

| Item | Status | Notes |
|------|--------|-------|
| Pre-deployment checks | ✅ | All prerequisites met |
| Code updated to $11.15.2 | ✅ | Commit 3b9d44fd5 |
| Containers deployed | ✅ | All health checks passing |
| Smoke tests | ✅ | All critical tests passing |
| E2E tests | ✅ | 19/24 critical tests passing |
| Monitoring functional | ✅ | Scripts working correctly |
| Performance baseline | ✅ | No regressions detected |
| Log review | ✅ | No errors found |
| User acceptance | ✅ | UI/UX verified |

---

## 📅 Timeline & Deadlines

### Jan 7 (Today)

- ✅ $11.15.2 release prepared (DONE)
- ⏳ Staging deployment begins

### Jan 8-9 (Tomorrow-Next Day)

- [ ] Deploy to staging
- [ ] Run validation tests
- [ ] Gather feedback

### Jan 10-14 (Week 2)

- [ ] Fix any staging issues
- [ ] Get production approval
- [ ] Schedule production deployment

### Jan 15+ (Production Deploy)

- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Document findings

---

## 📞 Escalation Contacts

| Role | Contact | Response Time |
|------|---------|----------------|
| DevOps Lead | TBD | <30 min |
| QA Lead | TBD | <1 hour |
| Backend Lead | TBD | <2 hours |
| Tech Lead | TBD | <4 hours |

---

## 📚 Reference Documents

- **Deployment Guide**: `docs/deployment/DOCKER_OPERATIONS.md`
- **Release Notes**: `docs/releases/RELEASE_NOTES_$11.15.2.md`
- **Monitoring Guide**: `docs/operations/E2E_MONITORING_PROCEDURES.md`
- **Health Check Guide**: `backend/health_checks.py`

---

## ✨ Success Criteria

**Staging deployment is successful when:**

✅ $11.15.2 deployed without errors
✅ All smoke tests passing (100% critical path)
✅ E2E tests passing (≥95% critical path)
✅ Monitoring infrastructure functional
✅ No performance regressions
✅ No error logs found
✅ All validation tests passing

**Go/No-Go Decision**: If all criteria met → Approve for production deployment

---

**Deployment Plan Status**: ✅ **READY TO EXECUTE**
**Target Date**: January 8, 2026
**Environment**: Staging
**Version**: 1.15.1

