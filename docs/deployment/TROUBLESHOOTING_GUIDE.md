# SMS Production Troubleshooting Guide
## v1.17.6 - Days 3-5 Go-Live Support Procedures

**Version**: 1.0
**Date**: January 31, 2026
**Purpose**: Comprehensive troubleshooting for administrators during production go-live and operations
**Target Audience**: Day 3-5 training participants and on-call support team

---

## 📋 Quick Diagnosis Flow

When a user reports an issue:

1. **Ask**: "Can you describe exactly what happened?"
2. **Check**: Dashboard alerts (Grafana → Troubleshooting dashboard)
3. **Look**: User report in error logs (Loki → search error message)
4. **Verify**: Is it widespread (other users affected) or isolated (single user)?
5. **Action**: Use decision tree below to find solution

---

## 🚨 Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|----------------|----------|
| **CRITICAL** | System down, no users can login | **Immediate** (0-5 min) | Database offline, all services down |
| **HIGH** | Major feature broken for all/most users | **Urgent** (5-15 min) | Can't view grades, attendance records missing |
| **MEDIUM** | Feature broken for some users or slow | **Standard** (15-60 min) | Login slow, specific user data missing |
| **LOW** | Cosmetic or minor issue, workaround exists | **Normal** (within 24h) | UI formatting, help link broken |

---

## 🔴 CRITICAL ISSUES

### Issue 1: System Complete Outage

**Symptom**: All users getting "Connection refused" or blank page

**Quick Check**:
```powershell
# Check all services are running
docker ps --filter "label=com.sms.network=sms" --format "table {{.Names}}\t{{.Status}}"
```

**Expected**:
```
NAME                    STATUS
sms-backend             Up 2 hours (healthy)
sms-postgres            Up 2 hours (healthy)
sms-redis               Up 2 hours (healthy)
sms-frontend-proxy      Up 2 hours
```

**Diagnosis Steps**:

1. **Check Docker**:
   ```powershell
   docker ps -a
   # Any containers with status "Exited"?
   docker logs sms-backend --tail 50
   # Look for errors
   ```

2. **Check Logs**:
   ```bash
   # Backend logs
   docker logs sms-backend | grep -i "error\|exception\|failed"

   # Database logs
   docker logs sms-postgres | grep -i "error\|fatal\|shutdown"
   ```

3. **Check Connectivity**:
   ```bash
   # Can backend connect to database?
   docker exec sms-backend python -c "from backend.db import engine; engine.connect(); print('✓ DB OK')"
   ```

**Solutions**:

1. **Restart all services**:
   ```powershell
   # If using DOCKER.ps1
   .\DOCKER.ps1 -Stop
   .\DOCKER.ps1 -Start
   ```

2. **Check disk space**:
   ```bash
   df -h
   # If < 10% free, delete old backups/logs
   ```

3. **Check port conflicts**:
   ```powershell
   netstat -ano | findstr ":8080\|:5432\|:6379"
   # If ports in use, find process and stop
   ```

4. **Nuclear option** (last resort):
   ```powershell
   .\DOCKER.ps1 -PruneAll
   .\DOCKER.ps1 -Start
   # WARNING: Removes unused images/volumes
   ```

**Escalation**: If still down after restart, contact infrastructure team.

---

### Issue 2: Database Connection Failures

**Symptom**: Users see "Database connection error" or database operations hang

**Error Message Examples**:
- "Failed to connect to postgres://..."
- "Connection timeout (10s exceeded)"
- "Connection pool exhausted"

**Quick Check**:
```bash
# Can we reach database?
docker exec sms-postgres pg_isready -U sms_user -d student_management

# Result should be: "accepting connections"
```

**Diagnosis Steps**:

1. **Check PostgreSQL Status**:
   ```bash
   docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT version();"
   # If error: database is down or corrupted
   ```

2. **Check Connections**:
   ```bash
   docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT count(*) FROM pg_stat_activity;"
   # Compare with max_connections (typically 100-200)
   # If close to max, connection pool exhaustion
   ```

3. **Check Disk Space**:
   ```bash
   docker exec sms-postgres du -sh /var/lib/postgresql/data
   # If > 90% of available space, disk full
   ```

**Solutions**:

1. **If connection pool exhausted**:
   ```bash
   # View active connections
   docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT pid, usename, query FROM pg_stat_activity WHERE state = 'active';"

   # Kill idle connections
   docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';"
   ```

2. **If disk full**:
   ```bash
   # Delete old backups
   rm -f backups/student_management_*.sql.gz
   # Or move to external storage
   ```

3. **If database corrupted**:
   ```bash
   # Restore from backup
   docker exec sms-postgres pg_restore -U sms_user -d student_management < backups/latest_backup.sql
   # See BACKUP_RESTORE_PROCEDURES.md for details
   ```

**Escalation**: If database not recovering, restore from backup or contact DBA.

---

### Issue 3: Backend Service Crashes

**Symptom**: Backend container keeps restarting (status: "Restarting")

**Quick Check**:
```bash
docker logs sms-backend --tail 100
# Look for stack traces, exceptions, errors
```

**Common Causes**:

1. **Out of Memory**:
   - Error: "MemoryError" or "Killed" in logs
   - Solution: Increase Docker memory limit
   - Check: `docker stats sms-backend` (% MEM column)

2. **Unhandled Exception**:
   - Error: Python traceback in logs
   - Solution: Check application logs, fix exception
   - See: Error logs section below

3. **Missing Dependencies**:
   - Error: "ModuleNotFoundError: No module named..."
   - Solution: Rebuild backend image
   - Command: `.\DOCKER.ps1 -UpdateClean`

4. **Database Migration Failure**:
   - Error: "Alembic migration failed"
   - Solution: Check migration files, rollback if needed
   - See: Database section below

**Solutions**:

1. **Check detailed logs**:
   ```bash
   docker logs sms-backend --since 5m --timestamps
   ```

2. **Increase memory** (if OOM):
   ```yaml
   # In docker-compose.yml
   sms-backend:
     mem_limit: 2g  # Increase if needed
   ```

3. **Restart service**:
   ```powershell
   docker restart sms-backend
   docker logs sms-backend --follow
   ```

**Escalation**: If crash loop continues, restore backup or redeploy.

---

## 🟠 HIGH PRIORITY ISSUES

### Issue 1: Users Can't Login

**Symptom**: "Invalid credentials" or "User not found" for all/most users

**Step 1: Verify User Exists**:
```bash
# Query database
docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT email, full_name FROM \"user\" WHERE email = 'student1@studentmanagement.local';"

# If no results: user account doesn't exist
# Solution: Re-seed database or create account manually
```

**Step 2: Check Auth Settings**:
```bash
# Check AUTH_MODE environment variable
docker exec sms-backend printenv | grep AUTH_MODE

# If AUTH_MODE=strict: database must have users
# If AUTH_MODE=disabled: should work without users (test)
# If AUTH_MODE=permissive: should allow unknown users (create on first login)
```

**Step 3: Check Password Reset**:
- Is "Forgot Password" link working?
- Can users reset their password?
- Are email notifications sending?

**Solutions**:

1. **If users not in database**:
   ```bash
   # Reseed test data
   cd backend
   python seed_database.py --config ../seeds/test_data_config.yml
   ```

2. **If AUTH_MODE wrong**:
   ```bash
   # Update .env and restart
   # For go-live: AUTH_MODE=permissive (recommended)
   # For demo: AUTH_MODE=disabled
   docker restart sms-backend
   ```

3. **If passwords compromised**:
   ```bash
   # Force password reset for all users
   # Contact DBA or use admin panel reset option
   ```

**Escalation**: If authentication system broken, may need to redeploy.

---

### Issue 2: Grades Not Showing or Out of Date

**Symptom**: Users see blank grades or old data even after recent submissions

**Step 1: Check Data in Database**:
```bash
docker exec sms-postgres psql -U sms_user -d student_management -c \
  "SELECT enrollment_id, assessment_name, score, grade_date FROM grade ORDER BY grade_date DESC LIMIT 10;"
```

**Step 2: Check Cache**:
```bash
# Clear Redis cache
docker exec sms-redis redis-cli FLUSHALL

# Or specific cache key
docker exec sms-redis redis-cli DEL "grades:student:123"
```

**Step 3: Check Permissions**:
```bash
# Verify student has permission to see their grades
docker exec sms-postgres psql -U sms_user -d student_management -c \
  "SELECT u.email, up.permission_name FROM \"user\" u \
   LEFT JOIN user_permission up ON u.id = up.user_id \
   WHERE u.email = 'student1@studentmanagement.local';"
```

**Solutions**:

1. **Clear cache**:
   ```bash
   docker exec sms-redis redis-cli FLUSHALL
   # Restart backend to pick up changes
   docker restart sms-backend
   ```

2. **Check data import**:
   ```bash
   # If grades imported from external system
   # Verify import process completed successfully
   # Check import logs for errors
   ```

3. **Grant permissions**:
   ```bash
   # Ensure students have "grades:read" permission
   # Use admin panel or API to grant permission
   ```

---

### Issue 3: Attendance Records Missing or Incorrect

**Symptom**: Attendance data blank or showing wrong dates

**Step 1: Verify Data Exists**:
```bash
docker exec sms-postgres psql -U sms_user -d student_management -c \
  "SELECT COUNT(*) FROM attendance WHERE student_id = 1;"
```

**Step 2: Check Date Range**:
```bash
# Attendance only shows for current semester
# Verify dates are in expected range
docker exec sms-postgres psql -U sms_user -d student_management -c \
  "SELECT MIN(attendance_date), MAX(attendance_date) FROM attendance;"
```

**Solutions**:

1. **Seed attendance data**:
   ```bash
   python backend/seed_database.py --config seeds/test_data_config.yml
   ```

2. **Check semester configuration**:
   - Ensure current_semester matches data
   - Update if needed: Admin panel → Settings

3. **Verify permissions**:
   - Students: Can only see their attendance
   - Teachers: Can see their class attendance
   - Admins: Can see all attendance

---

## 🟡 MEDIUM PRIORITY ISSUES

### Issue 1: Slow Performance / High Response Times

**Symptom**: System is slow, pages take >2-3 seconds to load

**Quick Check** (Grafana → App Performance Dashboard):
- Request rate: Normal?
- Response time p95: > 500ms? If yes, investigate
- CPU/Memory: > 80%? Upgrade resources
- Database query time: Check slow queries

**Step 1: Identify Slow Endpoint**:
```promql
# In Prometheus/Grafana
histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
```

**Step 2: Check Resource Usage**:
```bash
docker stats sms-backend sms-postgres
# CPU >70%? Memory >80%? Disk space low?
```

**Step 3: Database Analysis**:
```bash
# Check slow queries
docker exec sms-postgres psql -U sms_user -d student_management -c \
  "SELECT query, calls, mean_time, max_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Solutions**:

1. **Enable query caching**:
   ```python
   # In backend config
   CACHE_ENABLED=true
   CACHE_TTL=300  # 5 minutes
   ```

2. **Add database indexes** (if query slow):
   ```sql
   CREATE INDEX idx_grades_student_course ON grade(enrollment_id);
   CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date);
   ```

3. **Scale resources**:
   ```bash
   # Increase memory/CPU in docker-compose.yml
   sms-backend:
     mem_limit: 4g
     cpus: '2.0'
   ```

4. **Optimize query** (if specific slow query):
   - Use EXPLAIN ANALYZE to see execution plan
   - Add missing indexes
   - Restructure query to avoid N+1

---

### Issue 2: Intermittent Errors / 500 Errors

**Symptom**: Users occasionally see "Server Error" or specific requests fail randomly

**Step 1: Check Error Dashboard** (Grafana → Troubleshooting):
- Error rate? Trending up?
- Specific endpoint failing?
- Error message patterns?

**Step 2: Review Recent Errors**:
```bash
# Get last 50 errors
docker exec sms-backend tail -50 logs/app.log | grep -i error
```

**Step 3: Check Logs in Loki**:
```
# In Grafana, go to Loki Explorer
# Search: {job="backend"} | "ERROR" | "500"
# Find patterns in failing requests
```

**Common Causes**:

1. **Race Condition** (concurrent requests):
   - Symptom: Random 500 errors, hard to reproduce
   - Solution: Add database locks or queue requests

2. **Resource Limits**:
   - Symptom: Errors under load
   - Solution: Increase mem_limit or add load balancer

3. **Timeout**:
   - Symptom: Errors after >30 seconds
   - Solution: Increase timeout threshold or optimize query

**Solutions**:

1. **Increase request timeout**:
   ```python
   # In config.py
   REQUEST_TIMEOUT = 60  # seconds, increase if needed
   ```

2. **Add error recovery**:
   ```python
   # Implement retry logic with exponential backoff
   @app.middleware("http")
   async def retry_middleware(request, call_next):
       # Retry transient errors
   ```

3. **Monitor and alert**:
   - Set error rate alert > 1%
   - Alert on specific error messages
   - Set up log aggregation

---

## 🔵 LOW PRIORITY ISSUES

### Issue 1: UI Layout Issues / Formatting Problems

**Symptom**: Buttons misaligned, text overlapping, layout broken

**Quick Fix**:
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh page (F5)
- Try different browser
- Check browser console for JavaScript errors

**If Persists**:
- Check CSS files loaded
- Verify theme settings correct
- Run frontend tests (might find UI regression)

---

### Issue 2: Help Links or Documentation Broken

**Symptom**: Help links return 404 or documentation page not found

**Solution**:
- Verify documentation files deployed
- Check documentation server running
- Update link URLs if hosting changed

---

### Issue 3: Email Notifications Not Sending

**Symptom**: Users don't receive password reset emails, notifications, etc.

**Check SMTP Configuration**:
```bash
# Verify SMTP settings in backend
docker exec sms-backend printenv | grep SMTP
```

**Verify Email Service**:
```bash
# Test email connection
docker exec sms-backend python -c \
  "import smtplib; smtplib.SMTP('SMTP_HOST', SMTP_PORT).quit(); print('✓ SMTP OK')"
```

**Common Fixes**:
- Check SMTP_PASSWORD is correct
- Verify SMTP port (usually 587 or 465)
- Check firewall allows outbound on SMTP port
- Verify sender email address whitelisted

---

## 📊 Error Reference - Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Connection refused" | Backend/DB offline | Check `docker ps`, restart services |
| "Invalid credentials" | User not in DB or wrong password | Check user exists, verify auth mode |
| "Database connection error" | Can't reach PostgreSQL | Check PostgreSQL running, network connectivity |
| "Permission denied" | User lacks permission | Grant permission via admin panel |
| "404 Not Found" | Endpoint doesn't exist | Check endpoint URL, verify API documentation |
| "500 Internal Server Error" | Backend error | Check logs: `docker logs sms-backend` |
| "Request timeout" | Slow query or network issue | Optimize query, increase timeout |
| "Memory limit exceeded" | Out of RAM | Increase mem_limit in docker-compose.yml |
| "Disk quota exceeded" | Storage full | Delete old backups, add more disk |
| "CSRF token invalid" | CSRF protection failed | Clear cookies, verify token generation |

---

## 🔧 Debugging Toolkit

### Command Cheat Sheet

```bash
# View logs
docker logs sms-backend --tail 100 --timestamps
docker logs sms-postgres | tail -50

# Query database
docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT * FROM \"user\" LIMIT 5;"

# Execute backend command
docker exec sms-backend python script.py

# View running processes
docker ps -a
docker stats --no-stream

# Check network
docker network inspect sms_default

# View environment variables
docker exec sms-backend printenv

# Monitor in real-time
docker logs sms-backend -f --timestamps
```

### Log Analysis

```bash
# Find specific error
docker logs sms-backend 2>&1 | grep "500\|ERROR\|Exception"

# Count errors by type
docker logs sms-backend 2>&1 | grep "ERROR:" | cut -d: -f3- | sort | uniq -c | sort -rn

# Get errors in time window
docker logs sms-backend --since 5m --until 2m | grep ERROR
```

---

## 📞 Escalation Procedures

### When to Escalate

| Situation | Action | Time |
|-----------|--------|------|
| Can't fix within 15 min | Escalate to infrastructure | Immediately |
| Database corrupted | Restore backup, then escalate | Immediately |
| User data missing/altered | Incident report, don't attempt fix | Immediately |
| Performance degrading over time | Check for memory leaks, escalate if found | Within 30 min |
| Unknown error | Collect logs, search error database | Within 1 hour |

### Incident Report Template

```
Title: [Severity] [System] - [Issue Description]

Timeline:
- HH:MM: Issue first reported
- HH:MM: Investigation started
- HH:MM: Cause identified
- HH:MM: Solution applied
- HH:MM: Resolved

Symptoms:
[Description of user-facing issue]

Root Cause:
[Technical explanation]

Solution:
[What was done to fix]

Preventions:
[Improvements to prevent recurrence]

Contacts:
- Incident Lead: [Name]
- On-call Infrastructure: [Name/Phone]
- Database Admin: [Name/Phone]
```

---

## 📚 Additional Resources

- **System Architecture**: `docs/development/ARCHITECTURE.md`
- **Monitoring Setup**: `docs/monitoring/GRAFANA_DASHBOARDS_SETUP.md`
- **Backup Procedures**: `docs/deployment/BACKUP_RESTORE_PROCEDURES.md`
- **Database Management**: `docs/operations/DATABASE_MIGRATION_GUIDE.md`
- **Performance Tuning**: `docs/operations/PERFORMANCE_TUNING.md`

---

## ⏰ Training Schedule (Days 3-5)

**Day 3 (Feb 3)**: Troubleshooting fundamentals
- Common issues and quick fixes
- Log analysis and debugging
- Error interpretation

**Day 4 (Feb 4)**: Advanced troubleshooting
- System monitoring and alerts
- Performance analysis
- Escalation procedures

**Day 5 (Feb 5)**: War gaming and practice
- Simulated incidents
- Live troubleshooting practice
- Post-incident review procedures

---

**Created**: January 31, 2026
**Last Updated**: January 31, 2026
**Version**: 1.0 - Production Ready for Go-Live
