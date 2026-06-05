# Deployment Security Runbook - SMS vv1.18.24+

**Purpose:** Step-by-step guide for secure production deployment  
**Audience:** DevOps Engineers, Release Managers  
**Version:** 1.0  
**Last Updated:** 2026-06-02

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Process](#deployment-process)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Deployment Windows](#deployment-windows)
6. [Emergency Procedures](#emergency-procedures)

---

## Pre-Deployment Checklist

### Phase 1: Code Review & Testing (48 hours before)

**Required Approvals:**
- [ ] Code review approved (minimum 2 reviewers)
- [ ] Security review completed
- [ ] All tests passing (CI/CD pipeline green)
- [ ] No security alerts (CodeQL, Bandit, Trivy)
- [ ] Dependency scan passed (Safety, pip-audit, npm audit)

**Verification Commands:**
```bash
# Check test status
git log -1 --format="%h %s" # Verify commit

# Check CI/CD pipeline
gh run view --repo bs1gr/AUT_MIEEK_SMS  # GitHub Actions status

# Verify no security alerts
gh api repos/bs1gr/AUT_MIEEK_SMS/code-scanning/alerts

# Check dependencies
pip-audit --skip-editable
npm audit --production
```

### Phase 2: Version & Documentation (24 hours before)

**Version Management:**
- [ ] Version bumped (MAJOR.MINOR.PATCH format)
- [ ] VERSION file updated
- [ ] package.json version updated
- [ ] CHANGELOG.md updated with changes
- [ ] Release notes drafted

**Verification:**
```bash
# Verify version consistency
cat VERSION          # Should be v1.x.x format
grep "version" package.json
grep -r "v1." CHANGELOG.md | head -1
```

**Documentation:**
- [ ] Deployment guide updated
- [ ] API changes documented (if any)
- [ ] Breaking changes clearly marked
- [ ] Migration guide provided (if needed)

### Phase 3: Environment Setup (12 hours before)

**Staging Environment:**
- [ ] Deploy to staging first
- [ ] Run full test suite in staging
- [ ] Smoke tests pass
- [ ] Performance acceptable
- [ ] No errors in staging logs

**Security Checks (Staging):**
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] HTTPS enforced
- [ ] Database backups current

**Credentials & Secrets:**
- [ ] All secrets in environment variables (not files)
- [ ] Staging secrets correct
- [ ] Production secrets ready but NOT yet injected
- [ ] Backup keys rotated (if needed)

### Phase 4: Pre-Deployment Meeting (2 hours before)

**Participants:**
- [ ] DevOps Lead
- [ ] Security Lead
- [ ] Technical Lead
- [ ] Product Lead (optional)

**Agenda:**
1. Review deployment plan
2. Discuss rollback triggers
3. Confirm on-call responder
4. Review communication plan
5. Final Q&A

---

## Deployment Process

### Deployment Window Requirements

**Best Practices:**
- **Timing:** Low-traffic period (off-business hours)
- **Day:** Tuesday-Thursday (avoid Monday/Friday)
- **Duration:** Allocate 2x estimated deployment time
- **Backup:** Have 1-hour buffer after deployment
- **Communication:** Announce 24 hours in advance

### Step-by-Step Deployment

#### Step 1: Pre-Deployment Snapshot (T-30 min)

```bash
#!/bin/bash
set -e

DEPLOYMENT_ID="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="/backups/sms/${DEPLOYMENT_ID}"

echo "Creating pre-deployment snapshot..."
mkdir -p ${BACKUP_DIR}

# Database backup
pg_dump postgresql://[user]:[pass]@[host]/sms > ${BACKUP_DIR}/pre_deploy.sql

# Docker image backup (tag current)
docker tag ghcr.io/bs1gr/sms:latest ghcr.io/bs1gr/sms:backup_${DEPLOYMENT_ID}

# Git backup
git bundle create ${BACKUP_DIR}/git_backup.bundle --all

echo "✓ Pre-deployment snapshot created: ${DEPLOYMENT_ID}"
```

#### Step 2: Notify Team (T-20 min)

```bash
# Send notifications
slack-notify "#deployments" ":rocket: Deploying SMS vv1.18.24 in 20 minutes"
status-page-update "Deployment in progress - brief outage expected"
```

#### Step 3: Stop Non-Critical Services (T-15 min)

```bash
# Gracefully stop background tasks
docker exec sms_app kill -SIGTERM $(pgrep -f "celery|scheduler")
sleep 30  # Allow graceful shutdown

# Verify all tasks completed
docker logs sms_app | grep -i "shutdown complete"
```

#### Step 4: Database Migration (T-10 min)

```bash
# Backup current state
pg_dump sms > /backups/pre_migration_$(date +%s).sql

# Run migrations
docker exec sms_app alembic upgrade head

# Verify migrations
docker exec sms_app alembic current

# Rollback if needed
# docker exec sms_app alembic downgrade -1
```

#### Step 5: Deploy New Version (T-5 min)

```bash
# Pull latest code
git pull origin main

# Build new image
docker build -t sms:vv1.18.24 .

# Tag for registry
docker tag sms:vv1.18.24 ghcr.io/bs1gr/sms:vv1.18.24
docker tag sms:vv1.18.24 ghcr.io/bs1gr/sms:latest

# Push to registry
docker push ghcr.io/bs1gr/sms:vv1.18.24
docker push ghcr.io/bs1gr/sms:latest

# Stop old container
docker stop sms_app

# Start new container with new image
docker run -d \
  --name sms_app \
  --network sms_network \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -p 8000:8000 \
  ghcr.io/bs1gr/sms:vv1.18.24

# Wait for startup
sleep 10

# Verify running
docker logs sms_app | grep -i "application startup complete"
```

#### Step 6: Health Checks (T+0 min)

```bash
#!/bin/bash

echo "Running post-deployment health checks..."

# Check 1: HTTP health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" https://api.sms-app.com/health)
if [ "$response" != "200" ]; then
  echo "❌ Health endpoint returned: $response"
  exit 1
fi
echo "✓ Health endpoint: 200 OK"

# Check 2: Database connectivity
docker exec sms_app python -c "
from backend.db import SessionLocal
db = SessionLocal()
db.execute('SELECT 1')
db.close()
print('Database OK')
"

# Check 3: Authentication working
curl -X POST https://api.sms-app.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sms.app","password":"test"}' \
  | grep -q "access_token"
echo "✓ Authentication OK"

# Check 4: Frontend loads
curl -I https://sms-app.com | grep -q "200"
echo "✓ Frontend loads"

# Check 5: No error spikes in logs
error_count=$(docker logs sms_app --since 1m | grep -i "error" | wc -l)
if [ $error_count -gt 10 ]; then
  echo "⚠ High error count in logs: $error_count"
else
  echo "✓ Log errors normal: $error_count"
fi

echo "All health checks passed!"
```

#### Step 7: Restart Services (T+10 min)

```bash
# Start background services
docker exec sms_app start_scheduler.py &
docker exec sms_app start_notification_worker.py &

# Verify services running
sleep 5
docker ps | grep sms_app
```

#### Step 8: Smoke Tests (T+15 min)

```bash
#!/bin/bash

echo "Running smoke tests..."

# Test 1: Login
curl -X POST https://api.sms-app.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sms-lite.app",
    "password": "AdminPassword123!"
  }' \
  | jq .access_token

# Test 2: Get users
TOKEN=$(curl -s -X POST https://api.sms-app.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sms-lite.app","password":"AdminPassword123!"}' \
  | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" \
  https://api.sms-app.com/api/users | jq '.total'

# Test 3: Create student
curl -X POST https://api.sms-app.com/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "TEST001",
    "first_name": "Test",
    "last_name": "User"
  }'

echo "✓ Smoke tests completed"
```

#### Step 9: Monitor (T+30 min - 2 hours)

```bash
# Watch logs for errors
docker logs -f sms_app | grep -i error

# Monitor metrics
# CPU usage
docker stats sms_app --no-stream

# Database queries
# Check slow query logs

# User feedback
# Monitor support channel for issues
```

#### Step 10: Final Notification (T+2 hours)

```bash
slack-notify "#deployments" ":white_check_mark: Deployment complete! SMS vv1.18.24 live."
status-page-update "Deployment completed successfully"
```

---

## Post-Deployment Verification

### Immediate (within 1 hour)

- [ ] All endpoints responding
- [ ] No error spikes in logs
- [ ] Database queries normal (performance)
- [ ] User reports no issues
- [ ] Authentication flows working
- [ ] File uploads working
- [ ] PDF generation working

### Short-term (24 hours)

- [ ] No unusual database activity
- [ ] All scheduled jobs running
- [ ] Email notifications sending
- [ ] API performance metrics normal
- [ ] No security alerts (CodeQL, etc.)
- [ ] User feedback positive

### Long-term (1 week)

- [ ] All features functioning normally
- [ ] No regressions reported
- [ ] Performance stable
- [ ] No new issues discovered
- [ ] Deployment considered successful

---

## Rollback Procedures

### When to Rollback

**Automatic triggers:**
- ❌ Health endpoint returns non-200
- ❌ 5+ errors in logs per minute
- ❌ Database queries taking >5 seconds
- ❌ Application crashes
- ❌ Security vulnerability discovered

**Manual triggers:**
- Critical bug reported by user
- Data corruption detected
- Security incident
- Performance degradation >50%

### Rollback Process

#### Immediate Actions (< 5 minutes)

```bash
#!/bin/bash

echo "⚠️  INITIATING ROLLBACK"

# Stop new container
docker stop sms_app

# Restore previous version from backup tag
docker run -d \
  --name sms_app \
  --network sms_network \
  -e DATABASE_URL="${DATABASE_URL}" \
  ghcr.io/bs1gr/sms:backup_$(date -d '1 hour ago' +%Y%m%d_%H%M%S)

# Verify rollback
sleep 10
curl -I https://api.sms-app.com/health

# Notify team
slack-notify "#deployments" ":warning: ROLLBACK INITIATED - New deployment reverted"
status-page-update "Rollback in progress"
```

#### Database Rollback (< 10 minutes)

```bash
# Only if database migrations caused the issue
BACKUP_DIR="/backups/sms/$(date +%Y%m%d_%H)"

# Stop application
docker stop sms_app

# Restore database
dropdb sms
pg_restore < ${BACKUP_DIR}/pre_deploy.sql

# Restart application
docker start sms_app

# Verify
docker exec sms_app alembic current
```

#### Post-Rollback Verification

- [ ] Health endpoint: 200 OK
- [ ] User authentication working
- [ ] Database accessible
- [ ] No errors in logs
- [ ] All users notified

#### Investigation & Follow-up

- [ ] Root cause analysis initiated
- [ ] Incident documented
- [ ] Team meeting scheduled
- [ ] Fix developed and tested
- [ ] Re-deployment scheduled (with caution)

---

## Deployment Windows

### Recommended Windows

| Frequency | Best Time | Reason |
|-----------|-----------|--------|
| **Daily** | 2:00 AM UTC | Off-business hours globally |
| **Weekly** | Tuesday 3:00 AM UTC | Mid-week, less disruption |
| **Monthly** | First Tuesday 3:00 AM UTC | Consistent schedule |
| **Emergency** | ASAP (regardless of time) | Security/critical fix |

### Blackout Dates (NO DEPLOYMENTS)

- December 20 - January 5 (Holiday season)
- Friday evening through Sunday
- Major business events
- Known high-traffic periods
- Exam periods (for educational deployments)

---

## Emergency Procedures

### Security Vulnerability Deployment

**CVSS 9-10 (Critical):**
- [ ] Skip normal approval process
- [ ] Deploy within 1 hour
- [ ] Shorter testing window acceptable
- [ ] Notify all stakeholders immediately
- [ ] Consider downtime acceptable

**Deployment checklist (abbreviated):**
1. Verify fix compiles
2. Run security tests
3. Test in staging (10 minutes)
4. Deploy to production
5. Run health checks
6. Monitor closely

### Data Corruption Incident

If data corruption detected:

```bash
# STOP - Do not continue
docker stop sms_app

# Assess scope
pg_dump sms | diff - /backups/pre_deploy.sql | head -100

# Decide: Rollback or Repair
# Option 1: Rollback to previous version
# Option 2: Repair affected data (requires specialist)

# Contact DBA for guidance
```

### User Data Exposure

If security breach suspected:

1. [ ] Immediately call Security Lead
2. [ ] Do NOT wait for normal escalation
3. [ ] Follow SECURITY_INCIDENT_RESPONSE.md
4. [ ] Notify legal/compliance
5. [ ] Prepare user notifications

---

## Deployment Checklist Template

```markdown
## Deployment: SMS v[VERSION] - [DATE]

**Deployer:** [NAME]  
**Time Window:** [START] - [END] UTC  
**Approval:** [APPROVER SIGNATURE]

### Pre-Deployment (48h before)
- [ ] Code review approved (2+ reviewers)
- [ ] Security review complete
- [ ] All tests passing (CI/CD)
- [ ] No security alerts
- [ ] Version updated
- [ ] Changelog updated
- [ ] Staging tests passed

### Deployment
- [ ] Pre-deployment snapshot created
- [ ] Team notified
- [ ] Database migration successful
- [ ] New version deployed
- [ ] Health checks passed (6/6)
- [ ] Smoke tests passed
- [ ] Services restarted
- [ ] Team notified (complete)

### Post-Deployment (24h)
- [ ] No error spikes
- [ ] Database performance normal
- [ ] User feedback positive
- [ ] All features working
- [ ] Deployment marked successful

### Incident (if any)
- [ ] Incident type: [TYPE]
- [ ] Severity: [SEVERITY]
- [ ] Resolution: [DETAILS]
- [ ] Postmortem scheduled: [DATE/TIME]

**Deployment Status:** ✅ SUCCESSFUL / ❌ ROLLBACK
```

---

## On-Call Responsibilities

**During deployment window:**
1. Monitor logs continuously
2. Watch status page
3. Respond to user issues immediately
4. Escalate to Security Lead if security issue
5. Be ready to execute rollback

**After deployment:**
1. Monitor for 24 hours
2. Check metrics hourly for first 6 hours
3. Follow up on any issues
4. Participate in postmortem if needed

---

**Last Updated:** 2026-06-02  
**Status:** ACTIVE  
**Next Review:** 2026-09-02

