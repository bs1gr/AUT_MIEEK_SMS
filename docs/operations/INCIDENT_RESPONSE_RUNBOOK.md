# Phase 5 Production Incident Response Runbook

**Version**: 1.17.6
**Created**: January 30, 2026 - 16:00 UTC
**Purpose**: Structured procedures for handling production incidents
**Status**: Ready for production deployment

---

## 📋 Incident Response Quick Reference

### Severity Levels

| Severity | Impact | Example | Response Time |
|----------|--------|---------|----------------|
| **P1 - Critical** | Service unavailable, data loss risk | Database down, API 500 errors | Immediate (< 5 min) |
| **P2 - High** | Significant degradation | 50% of users affected, high errors | < 15 min |
| **P3 - Medium** | Minor issues, workaround exists | Some slow endpoints, 5% errors | < 1 hour |
| **P4 - Low** | Non-urgent, can wait | Documentation typo, minor UI bug | Next business day |

### Escalation Matrix

```
Alert Triggered
       ↓
Automated Response (logging, health checks)
       ↓
Is P1? → YES → Page on-call immediately
       ↓ NO
Is P2? → YES → Create incident ticket, notify team
       ↓ NO
Is P3? → YES → Add to backlog for review
       ↓ NO
Is P4? → Record for later review
```

---

## 🚨 Critical Incidents (P1)

### Incident: Database Connection Failure

**Symptoms**:
- API returns 503 Service Unavailable
- Logs show "connection refused" or "connection timeout"
- Dashboard shows 0 active database connections

**Immediate Actions** (< 2 minutes):

```bash
# 1. Check database container status
docker ps | grep sms-db
# Expected: "Up" status

# 2. If container is down, restart it
docker-compose restart sms-db

# 3. Check database logs
docker logs sms-db | tail -50

# 4. Verify database is listening
docker exec sms-db psql -U sms_user -d sms_db -c "SELECT 1"
```

**Investigation** (2-5 minutes):

```bash
# 1. Check disk space (may be full)
docker exec sms-db df -h

# 2. Check PostgreSQL process
docker exec sms-db ps aux | grep postgres

# 3. Check database size (may be corrupted)
docker exec sms-db du -sh /var/lib/postgresql/data

# 4. Review recent migrations (might have failed)
docker logs sms-web | grep -i "alembic\|migration" | tail -20
```

**Recovery** (5-15 minutes):

```bash
# Option 1: Restart database (if transient issue)
docker-compose stop sms-db
sleep 5
docker-compose start sms-db
sleep 10
curl -s http://localhost:8000/health | jq .

# Option 2: Restore from backup (if data corruption)
# See BACKUP_RESTORE_PROCEDURES.md for full steps
docker-compose stop sms-web
# [Execute restore procedure]
docker-compose start sms-web

# Option 3: Check and fix migrations
docker-compose restart sms-web
docker logs sms-web | grep -i "alembic\|error" | head -20
```

**Verification**:
- [ ] `docker-compose ps` shows all containers "Up"
- [ ] `curl http://localhost:8000/health` returns 200
- [ ] `curl http://localhost:8080` loads login page
- [ ] No error messages in `docker logs sms-web`

**Communication**:
- [ ] Notify on-call lead
- [ ] Post status update to #incidents Slack
- [ ] Create incident ticket with timeline

---

### Incident: API Server Crashes (500 Errors)

**Symptoms**:
- API returns 500 Internal Server Error
- Error rate spike in monitoring dashboard
- Logs show exceptions or panics

**Immediate Actions** (< 2 minutes):

```bash
# 1. Check backend container status
docker compose ps | grep sms-web
# Expected: "Up" status

# 2. If container is down, restart it
docker-compose restart sms-web

# 3. Check recent logs
docker logs sms-web --tail=100

# 4. Check for application errors
docker logs sms-web | grep -i "error\|exception\|traceback" | head -20
```

**Investigation** (2-5 minutes):

```bash
# 1. Get full error context
docker logs sms-web | tail -200 > /tmp/error.log
grep -A 10 "Traceback" /tmp/error.log

# 2. Check for resource issues
docker stats sms-web
# If CPU > 90% or Memory > 90%, likely resource exhaustion

# 3. Check database connectivity
docker exec sms-web python -c "
from backend.db import SessionLocal
try:
    db = SessionLocal()
    db.execute('SELECT 1')
    print('Database OK')
except Exception as e:
    print(f'Database Error: {e}')
"

# 4. Check environment variables
docker inspect sms-web | grep -A 20 "Env"
```

**Recovery** (5-15 minutes):

```bash
# Option 1: Restart application
docker-compose restart sms-web
sleep 5
curl -s http://localhost:8000/health

# Option 2: Check for recent deployments
git log --oneline -n 5

# Option 3: Rollback if recent changes
docker-compose down
git checkout HEAD~1  # Go back 1 commit
docker-compose up -d

# Option 4: Check disk space or memory
docker system df
docker system prune -f  # Clean up unused resources
```

**Escalation** (If not resolved in 10 min):
- [ ] Check application code for recent changes
- [ ] Review recent deployments/commits
- [ ] Check if external service dependency is down
- [ ] Escalate to backend team lead

---

### Incident: Website Inaccessible (Proxy Down)

**Symptoms**:
- Cannot reach http://localhost:8080
- Connection refused or timeout
- Nginx returns 502 Bad Gateway

**Immediate Actions** (< 2 minutes):

```bash
# 1. Check proxy container status
docker ps | grep sms-proxy

# 2. Restart proxy
docker-compose restart sms-proxy

# 3. Check if backend is accessible
curl -s http://localhost:8000/health

# 4. Verify proxy logs
docker logs sms-proxy | tail -50
```

**Investigation**:

```bash
# 1. Check if proxy container is running
docker ps -a | grep sms-proxy

# 2. Check proxy configuration
docker exec sms-proxy nginx -t

# 3. Check port binding
netstat -tlnp | grep 8080

# 4. Check if backend is responding
docker exec sms-proxy curl -s http://sms-web:8000/health
```

**Recovery**:

```bash
# Option 1: Restart proxy
docker-compose restart sms-proxy

# Option 2: Reload nginx config
docker exec sms-proxy nginx -s reload

# Option 3: Rebuild proxy container
docker-compose up -d --force-recreate sms-proxy

# Option 4: Check if port 8080 is in use
lsof -i :8080
# Kill process if needed: kill -9 <PID>
```

**Verification**:
- [ ] `curl -s http://localhost:8080` returns 200
- [ ] Can see login page in browser
- [ ] Console shows no connection errors

---

## ⚠️ High Priority Incidents (P2)

### High Error Rate (> 5% of requests failing)

**Detection**: Monitoring alert triggers on error rate

**Steps**:
1. Check error logs for patterns
2. Identify affected endpoint(s)
3. Check if recent deployment caused issue
4. If recent change → consider rollback
5. If external service → check service status
6. Scale resources if CPU/memory high

```bash
# Check error distribution
docker logs sms-web | grep "ERROR" | grep -o '\[.*\]' | sort | uniq -c | sort -rn | head -10
```

### High Response Times (p95 > 1 second)

**Detection**: Monitoring shows spike in response time

**Steps**:
1. Check database query performance
2. Check cache hit rate
3. Check for N+1 queries in slow endpoints
4. Scale database connections if needed
5. Implement query optimization

```bash
# Check slow queries
docker exec sms-db psql -U sms_user -d sms_db -c "
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

### Memory/CPU Exhaustion

**Detection**: System metrics show > 80% usage

**Steps**:
1. Identify which container is consuming resources
2. Check for memory leaks (growing over time)
3. Scale container limits if needed
4. Optimize code or increase resources
5. Monitor for recurrence

```bash
# Check container resource usage
docker stats --no-stream

# If leak suspected, check process
docker exec sms-web ps aux | grep python
docker exec sms-web free -h
```

---

## ℹ️ Medium Priority Incidents (P3)

### Some Endpoints Slow but Working

**Response**:
1. Add to monitoring for trend tracking
2. Schedule optimization work
3. Communicate to users (if external impact)
4. Create ticket for performance team

### Intermittent Errors (< 1% of requests)

**Response**:
1. Increase log verbosity to capture details
2. Collect error patterns (time, endpoint, error type)
3. Check for transient external service issues
4. Monitor for trend (increasing = escalate to P2)

### Non-Critical Service Degradation

**Response**:
1. Document issue
2. Create ticket
3. Plan fix in next sprint

---

## 🔄 General Recovery Procedures

### Health Check After Incident

```bash
#!/bin/bash
echo "🔍 Post-Incident Health Check"

# 1. Container status
echo "📦 Container Status:"
docker compose ps

# 2. API health
echo "🏥 API Health:"
curl -s http://localhost:8000/health | jq .

# 3. Database connection
echo "🗄️  Database:"
docker exec sms-db psql -U sms_user -d sms_db -c "SELECT COUNT(*) FROM information_schema.tables;" 2>&1

# 4. Frontend access
echo "🌐 Frontend:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080

# 5. Error rate
echo "📊 Recent Errors:"
docker logs sms-web --since 5m | grep "ERROR" | wc -l
echo " errors in last 5 minutes"

# 6. Resource usage
echo "💾 Resource Usage:"
docker stats --no-stream
```

---

## 📊 Incident Tracking

### Incident Report Template

```
Title: [Brief description]
Severity: P1/P2/P3/P4
Start Time: YYYY-MM-DD HH:MM:SS UTC
End Time: YYYY-MM-DD HH:MM:SS UTC
Duration: X minutes

Root Cause:
[What caused the incident]

Impact:
- X users affected
- Service downtime: Y minutes
- Data affected: Yes/No

Resolution:
[Steps taken to resolve]

Prevention:
[How to prevent in future]

Timeline:
14:30 - Alert triggered
14:32 - On-call responded
14:35 - Issue identified
14:40 - Fix deployed
14:42 - Verified resolved
```

### Post-Incident Review (Within 24 hours)

- [ ] Complete incident report
- [ ] Document root cause
- [ ] Create action items
- [ ] Update monitoring/alerting if needed
- [ ] Communicate learnings to team
- [ ] Schedule follow-up improvements

---

## 📞 Escalation Contact List

```
On-Call Lead: [Name] [Phone] [Slack: @oncall]
Backend Lead: [Name] [Phone] [Slack: @backend-lead]
DevOps Lead: [Name] [Phone] [Slack: @devops-lead]
Manager: [Name] [Phone] [Slack: @manager]

Emergency Escalation:
- Critical P1: Immediate page (PagerDuty)
- P2: Slack + Notify on-call lead
- P3: Slack + Create ticket
```

---

## 🛠️ Useful Commands Reference

### View Logs
```bash
docker logs sms-web                    # Last 20 lines
docker logs sms-web --tail=100         # Last 100 lines
docker logs sms-web --since 5m         # Last 5 minutes
docker logs sms-web -f                 # Follow (tail -f)
docker logs sms-web 2>&1 | grep ERROR  # Filter by ERROR
```

### Check Status
```bash
docker compose ps                      # Container status
docker exec sms-db psql -c "SELECT 1" # DB connectivity
curl http://localhost:8000/health      # API health
docker stats --no-stream               # Resource usage
```

### Restart Services
```bash
docker-compose restart sms-web         # Restart backend
docker-compose restart sms-db          # Restart database
docker-compose restart sms-proxy       # Restart proxy
docker-compose restart                 # Restart all
```

### Database Access
```bash
docker exec -it sms-db psql -U sms_user -d sms_db  # Interactive psql
docker exec sms-db psql -c "SHOW max_connections"  # Show setting
docker exec sms-db psql -c "SELECT * FROM pg_stat_activity" # Active connections
```

---

**🎯 Goal**: Minimize incident response time and impact
**📊 Status**: Runbook complete and ready for deployment
**⏱️ Timeline**: Activate upon production deployment (Jan 30, 2026)
