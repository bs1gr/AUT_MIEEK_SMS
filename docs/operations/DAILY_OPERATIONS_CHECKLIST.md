# Phase 5 Daily Operations Checklist

**Version**: 1.17.6
**Created**: January 30, 2026 - 16:10 UTC
**Purpose**: Daily operational procedures for production system
**Status**: Ready for deployment

---

## ☀️ Morning Operations (Start of Business Day)

### Health Check (5 minutes)
**Time**: 08:00 - 08:05
**Responsibility**: Operations team

- [ ] **System Status Dashboard**
  ```bash
  docker-compose ps
  # Expected: All 3 containers "Up"
  ```

- [ ] **API Health**
  ```bash
  curl -s http://localhost:8000/health | jq '.status'
  # Expected: "healthy"
  ```

- [ ] **Database Health**
  ```bash
  docker exec sms-db psql -U sms_user -d sms_db -c "SELECT COUNT(*) FROM students;"
  # Expected: Numeric count returned
  ```

- [ ] **Frontend Accessibility**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
  # Expected: 200
  ```

- [ ] **Check Recent Errors**
  ```bash
  docker logs sms-web --since 1h | grep -i "error" | head -5
  # Expected: No critical errors
  ```

**Action if Issue Found**:
- [ ] Check monitoring dashboard for alerts
- [ ] Investigate error logs
- [ ] Escalate to on-call if P1/P2

---

### Backup Status Verification (2 minutes)
**Time**: 08:05 - 08:07
**Responsibility**: Operations team

- [ ] **Last Backup Timestamp**
  ```bash
  ls -lt backups/database/ | head -1
  # Expected: Today's date, within 24 hours
  ```

- [ ] **Backup Size OK**
  ```bash
  du -sh backups/database/sms_backup_*.sql.gz | tail -1
  # Expected: Size reasonable (50MB - 500MB range)
  ```

- [ ] **Backup Storage Free**
  ```bash
  df -h backups/
  # Expected: > 10% free space
  ```

---

### Monitoring Dashboard Check (3 minutes)
**Time**: 08:07 - 08:10
**Responsibility**: Monitoring team

Access Grafana at http://localhost:3000

- [ ] **System Overview Dashboard**
  - CPU usage: < 70% ✓
  - Memory usage: < 80% ✓
  - Disk usage: < 85% ✓

- [ ] **Application Performance Dashboard**
  - API response time (p95): < 500ms ✓
  - Request success rate: > 99% ✓
  - Error rate: < 1% ✓

- [ ] **Database Health Dashboard**
  - Active connections: < 20 ✓
  - Connection pool usage: < 80% ✓
  - Query execution time: < 100ms (avg) ✓

**Total Morning Time**: ~10 minutes

---

## 📋 Hourly Check (During Business Hours)

**Times**: 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00

### Quick Health Check (1 minute)
```bash
# Container status
docker-compose ps

# Error rate
docker logs sms-web --since 10m | grep -c "ERROR"

# Response time sample
curl -w "@- " -o /dev/null -s http://localhost:8000/students \
  -H "Authorization: Bearer $TOKEN" 2>&1 | grep "time_total"
```

### Action on Issues
- Error count > 10: Investigate
- Response time > 1 second: Check resource usage
- Any P1 alert: Escalate immediately

---

## 🌅 Midday Operations (12:00 - 13:00)

### Performance Check (5 minutes)

- [ ] **Current Resource Usage**
  ```bash
  docker stats --no-stream
  ```

- [ ] **Database Performance**
  ```bash
  docker exec sms-db psql -U sms_user -d sms_db -c "
  SELECT query, calls, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 5;
  "
  ```

- [ ] **Active Users**
  ```bash
  curl -s http://localhost:8000/admin/monitoring/active-sessions | jq '.count'
  # Expected: Realistic count for institution
  ```

- [ ] **Load Testing Data**
  - Check monitoring graph for trends
  - Note peak usage times
  - Alert if unexpected spike

---

## 🌆 Evening Operations (17:00 - 18:00)

### Daily Wrap-up (10 minutes)

- [ ] **Error Summary**
  ```bash
  docker logs sms-web --since 8h | grep "ERROR" | wc -l
  # Expected: < 50 errors for entire day
  ```

- [ ] **Performance Summary**
  - Average response time: < 300ms ✓
  - Error rate during peak: < 2% ✓
  - Longest running query: < 5 seconds ✓

- [ ] **User Activity**
  - Peak concurrent users: [Note count]
  - Total logins: [Note count]
  - Most accessed feature: [Note]

- [ ] **System Resource Status**
  - CPU peak: [Note percentage]
  - Memory peak: [Note percentage]
  - Disk usage: [Note percentage]

### Incident Review
- [ ] Any P1/P2 incidents during day: [ ] Yes [ ] No
- [ ] If Yes: Document in incident log
- [ ] Any follow-ups needed: [ ] Yes [ ] No

### Backup Verification
- [ ] Tomorrow's backup scheduled: [ ] Yes
- [ ] Backup window: [Note time]
- [ ] Backup destination: [Note location]

---

## 🌙 End of Day (After 18:00)

### Final Systems Check (3 minutes)

```bash
# Final status
docker-compose ps

# No critical errors
docker logs sms-web --since 1h | grep -i "critical" && echo "⚠️ FOUND" || echo "✅ None"

# Database healthy
docker exec sms-db psql -U sms_user -d sms_db -c "SELECT 1"

# All containers running
docker-compose ps | grep -c "Up 3"
```

---

## 📅 Weekly Operations (Every Monday)

### Full System Audit (1 hour)
**Time**: Monday 09:00
**Responsibility**: Senior operations team

- [ ] **Database Integrity Check**
  ```bash
  docker exec sms-db psql -U sms_user -d sms_db << EOF
  -- Check for duplicate users
  SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

  -- Check for orphaned records
  SELECT COUNT(*) FROM enrollments WHERE student_id NOT IN (SELECT id FROM students);

  -- Check database size
  SELECT pg_size_pretty(pg_database_size('sms_db'));
  EOF
  ```

- [ ] **Backup Chain Verification**
  ```bash
  ls -lt backups/database/ | head -7
  # Should have 7 daily backups (Mon-Sun)
  ```

- [ ] **Log File Rotation**
  ```bash
  ls -lh backend/logs/
  # Ensure logs are rotated and aged logs compressed
  ```

- [ ] **Monitoring Alert Rules**
  - Review alert thresholds
  - Check for threshold breaches
  - Update thresholds if needed based on usage patterns

- [ ] **Performance Trend Analysis**
  - Query execution times trending up? [ ]
  - Error rates increasing? [ ]
  - Response times degrading? [ ]
  - Resource usage increasing? [ ]

- [ ] **User Feedback Review**
  - Check support tickets from past week
  - Common issues noted: [List]
  - Feature requests noted: [List]

### Weekly Report
Create weekly status report including:
- Total uptime: ___%
- Average response time: ____ms
- Peak concurrent users: ____
- Critical incidents: ____
- Performance trends: [Summary]
- Action items for next week: [List]

---

## 📊 Monthly Operations (First Monday of Month)

### Comprehensive Review (2-3 hours)
**Time**: First Monday 09:00
**Responsibility**: Management + operations team

- [ ] **System Performance Report**
  - Generate from monitoring dashboard
  - Compare to previous month
  - Document trends and patterns

- [ ] **Capacity Planning Review**
  - Disk usage trends
  - Memory usage trends
  - Database growth rate
  - Forecast next 3 months

- [ ] **Security Audit**
  - Review access logs
  - Check for unauthorized access attempts
  - Verify SSL certificates valid
  - Review user permissions

- [ ] **Backup Testing**
  - Restore from last backup to test environment
  - Verify data integrity post-restore
  - Document restore time
  - Test automated backup process

- [ ] **Disaster Recovery Plan Review**
  - Test failover procedures
  - Verify backup accessibility
  - Review and update contact list
  - Conduct DR exercise (dry run)

- [ ] **User Satisfaction Analysis**
  - Review help desk tickets
  - Analyze common issues
  - Calculate resolution time trends
  - Plan improvements

### Monthly Metrics Summary
```
System Uptime:           99.X%
Average Response Time:   TBD ms
Max Concurrent Users:    TBD
New Users Added:         TBD
Courses Created:         TBD
Support Tickets:         TBD
Critical Incidents:      X
Performance Incidents:   X
Data Growth Rate:        X%/month
Estimated Full Disk:     X months
```

---

## 🚨 On-Call Runbook

### When Alerting (P1/P2)

1. **Within 1 minute**
   - Acknowledge alert in monitoring system
   - Check alert type and severity
   - Initiate incident response

2. **Within 5 minutes**
   - Determine if ongoing outage
   - Follow appropriate runbook:
     - Database down → See Incident Response Runbook
     - API 500 errors → See Incident Response Runbook
     - High error rate → See Incident Response Runbook
   - Page on-call lead if needed

3. **Within 15 minutes**
   - Implement fix or workaround
   - Document incident details
   - Notify stakeholders of status

4. **Within 1 hour**
   - Restore service to normal
   - Complete incident report
   - Schedule post-incident review

---

## 📋 Quick Reference

### Container Status
```bash
docker-compose ps                # All containers status
docker logs sms-web --tail=50   # Recent application logs
docker exec sms-db psql -c "SELECT 1"  # Test DB connection
```

### Performance Check
```bash
docker stats --no-stream         # Resource usage
curl http://localhost:8000/health  # API health
curl http://localhost:8080       # Frontend access
```

### Error Investigation
```bash
docker logs sms-web --since 1h | grep ERROR
docker logs sms-db --since 1h | grep ERROR
docker logs sms-proxy --since 1h
```

### Backup Operations
```bash
ls -lt backups/database/         # Recent backups
du -sh backups/                  # Backup storage usage
df -h backups/                   # Storage availability
```

---

## 📞 Escalation Path

- **Green Status** (No issues): Log daily checks, continue monitoring
- **Yellow Status** (Minor issues): Investigate, document, escalate if needed
- **Red Status** (Critical): Execute incident response, notify team immediately

---

## ✅ Completion Checklist

- [ ] Morning health check completed
- [ ] Backup status verified
- [ ] Monitoring dashboard reviewed
- [ ] No active alerts
- [ ] Error rate normal
- [ ] Response times normal
- [ ] Resource usage acceptable
- [ ] Users able to access system
- [ ] Daily wrap-up documentation complete

---

**📊 Status**: Ready for production deployment
**🚀 Next Step**: Implement on Day 1 of Phase 5 deployment
**⏱️ Total Daily Time**: ~15 minutes for all checks
**📞 Escalation**: Senior ops or on-call lead for any issues
