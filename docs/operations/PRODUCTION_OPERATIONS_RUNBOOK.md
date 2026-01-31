# Production Operations Runbook

**Version**: 1.0
**Last Updated**: February 1, 2026
**System Version**: v1.17.6
**Status**: Production Live

---

## 🎯 Purpose

This runbook provides step-by-step procedures for managing the Student Management System in production.

---

## 📊 Daily Health Checks (5 minutes)

### Morning Checklist

**Step 1: Container Health**
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
```
- **Expected**: All 12 containers running (5 core + 7 monitoring)
- **Action if Failed**: Check logs with `docker logs <container-name>`

**Step 2: System Health Endpoint**
```powershell
curl -s "http://localhost:8080/health" | ConvertFrom-Json
```
- **Expected**: `"status": "healthy"`, all checks passing
- **Action if Failed**: Check specific failing component

**Step 3: Performance Metrics**
- Navigate to: http://localhost:3000 (Grafana)
- Check "System Overview" dashboard
- **Expected**: 
  - Response time p95 < 500ms
  - Error rate < 2%
  - CPU < 80%
  - Memory < 85%
- **Action if Failed**: Investigate alerts in AlertManager

**Step 4: Database Connectivity**
```powershell
docker exec docker-postgres-1 psql -U sms_user -d student_management -c "SELECT COUNT(*) FROM users;"
```
- **Expected**: Connection successful, returns count
- **Action if Failed**: Check PostgreSQL logs

**Step 5: Backup Verification**
```powershell
Get-ChildItem ".\backups\" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, LastWriteTime, Length
```
- **Expected**: Recent backup within last 24 hours
- **Action if Failed**: Trigger manual backup

---

## 🚨 Incident Response Procedures

### Critical Alert: Backend Down (HTTP 500 errors)

**Priority**: P0 (Immediate)
**Response Time**: 0-5 minutes

**Steps**:
1. Check container status: `docker ps | grep backend`
2. Check backend logs: `docker logs docker-backend-1 --tail 100`
3. Check database connectivity: `docker logs docker-postgres-1 --tail 50`
4. Restart backend if needed: `docker restart docker-backend-1`
5. Verify recovery: `curl http://localhost:8080/health`
6. Document incident in `incidents/` folder

**Escalation**: If restart doesn't resolve → Full system rollback

### High Alert: Slow Response Times (p95 > 1000ms)

**Priority**: P1 (High)
**Response Time**: 5-15 minutes

**Steps**:
1. Check Grafana "Application Performance" dashboard
2. Identify slow endpoints in Prometheus: http://localhost:9090
3. Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
4. Check database query performance: `docker exec docker-postgres-1 psql -U sms_user -d student_management -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"`
5. Check for long-running queries
6. Consider cache warming or query optimization

**Escalation**: If p95 > 2000ms for 15+ minutes → Scale up resources

### Medium Alert: High Error Rate (> 5%)

**Priority**: P2 (Medium)
**Response Time**: 15-30 minutes

**Steps**:
1. Check error logs: `docker logs docker-backend-1 | grep ERROR`
2. Identify error patterns (500, 422, 403, 404)
3. Check Loki logs: http://localhost:3100
4. Investigate specific endpoints with high error rates
5. Review recent deployments or configuration changes

**Escalation**: If error rate > 10% → Rollback to previous version

---

## 🔄 Routine Maintenance

### Weekly Tasks (30 minutes)

**Every Monday**:
- [ ] Review Grafana dashboards for trends
- [ ] Check disk space: `Get-PSDrive C`
- [ ] Review alert history in AlertManager
- [ ] Verify backup integrity (test restore)
- [ ] Update security patches if available

**Every Friday**:
- [ ] Generate weekly performance report
- [ ] Review user activity metrics
- [ ] Clean up old logs (> 30 days)
- [ ] Check for Docker image updates
- [ ] Review and address non-critical alerts

### Monthly Tasks (2 hours)

**First Monday of Month**:
- [ ] Full system health audit
- [ ] Database vacuum and analyze: `docker exec docker-postgres-1 psql -U sms_user -d student_management -c "VACUUM ANALYZE;"`
- [ ] Review and rotate encryption keys
- [ ] Backup rotation (archive old backups)
- [ ] Performance baseline update
- [ ] Capacity planning review

---

## 📈 Performance Baselines

### Current Production Baseline (Feb 1, 2026)

| Metric | Baseline | Alert Threshold | Critical Threshold |
|--------|----------|-----------------|-------------------|
| Response Time (p95) | 350ms | 500ms | 1000ms |
| Response Time (p99) | 2000ms | 3000ms | 5000ms |
| Throughput | 30.22 req/s | 20 req/s | 10 req/s |
| Error Rate | 1.33% | 2% | 5% |
| CPU Usage | 15% | 80% | 95% |
| Memory Usage | 15.3% | 85% | 95% |
| Disk Usage | 2.95% | 80% | 90% |

### Performance Degradation Actions

**When p95 exceeds 500ms**:
1. Check database connection pool
2. Review recent query changes
3. Check for N+1 queries
4. Verify cache hit rates

**When throughput drops below 20 req/s**:
1. Check for resource contention
2. Review concurrent user load
3. Check for database locks
4. Verify network connectivity

---

## 🔒 Security Procedures

### Access Control

**Admin Access**:
- All admin actions logged in `backend/logs/audit.log`
- Review admin activity weekly
- Rotate admin passwords monthly

**API Keys**:
- Review API key usage monthly
- Revoke unused keys quarterly
- Monitor rate limiting violations

### Security Patches

**When CVE Detected**:
1. Assess severity (CVSS score)
2. Check if system affected
3. Plan patch deployment
4. Test in staging environment
5. Deploy during maintenance window
6. Verify patch effectiveness

---

## 💾 Backup & Recovery

### Automated Backup Schedule

- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Location**: `./backups/`
- **Encryption**: AES-256 (BACKUP_ENCRYPTION_KEY)

### Manual Backup

```powershell
docker exec sms-db-backup python -m backend.services.backup_service --backup
```

### Restore Procedure

**From Latest Backup**:
```powershell
# 1. Stop backend
docker stop docker-backend-1

# 2. Restore database
docker exec -i docker-postgres-1 psql -U sms_user -d student_management < ./backups/backup_YYYYMMDD_HHMMSS.sql

# 3. Restart backend
docker start docker-backend-1

# 4. Verify
curl http://localhost:8080/health
```

**Recovery Time Objective (RTO)**: 15 minutes
**Recovery Point Objective (RPO)**: 24 hours

---

## 📡 Monitoring & Alerting

### Grafana Dashboards

1. **System Overview** (http://localhost:3000/d/system-overview)
   - Container health
   - Resource usage (CPU, memory, disk)
   - Network traffic

2. **Application Performance** (http://localhost:3000/d/app-performance)
   - Response times (p50, p95, p99)
   - Throughput (req/s)
   - Error rates by endpoint

3. **Business Metrics** (http://localhost:3000/d/business-metrics)
   - Active users
   - Course enrollments
   - Grade submissions

### Alert Channels

**Configured Channels**:
- Email: admin@school.edu (all alerts)
- Slack: #sms-alerts (critical only)
- Teams: SMS Operations (critical only)

**To Configure Alerts** (if not already set up):
```powershell
.\scripts\monitoring\Configure-AlertNotifications.ps1 -Channel slack -WebhookUrl "https://hooks.slack.com/..."
```

---

## 🛠️ Common Issues & Solutions

### Issue: Container Won't Start

**Symptoms**: `docker ps` shows container missing or restarting

**Diagnosis**:
```powershell
docker logs <container-name> --tail 50
docker inspect <container-name>
```

**Solutions**:
1. Check port conflicts: `netstat -ano | findstr ":<port>"`
2. Check volume permissions
3. Verify environment variables: `docker exec <container> env`
4. Rebuild image: `docker-compose build <service>`

### Issue: High Memory Usage

**Symptoms**: Memory > 85%, potential OOM errors

**Diagnosis**:
```powershell
docker stats --no-stream
```

**Solutions**:
1. Restart memory-intensive containers
2. Check for memory leaks in application logs
3. Increase container memory limits in docker-compose.yml
4. Review database connection pool size

### Issue: Slow Database Queries

**Symptoms**: p95 > 1000ms, database CPU high

**Diagnosis**:
```sql
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY query_start;
```

**Solutions**:
1. Kill long-running queries: `SELECT pg_terminate_backend(pid);`
2. Add missing indexes: Check `EXPLAIN ANALYZE` output
3. Vacuum database: `VACUUM ANALYZE;`
4. Update table statistics: `ANALYZE;`

---

## 📞 Contact Information

**System Administrator**: Solo Developer
**On-Call Schedule**: 24/7 monitoring via Grafana/Prometheus alerts
**Escalation Path**:
1. Check this runbook first
2. Review Grafana alerts
3. Check logs in Loki
4. Escalate to developer if unresolved within SLA

---

## 📝 Change Management

### Production Change Procedure

**For Non-Critical Changes** (< 5 min downtime):
1. Announce in maintenance window
2. Create backup before change
3. Apply change via `DOCKER.ps1 -Update`
4. Verify health checks
5. Monitor for 15 minutes
6. Document change

**For Critical Changes** (> 5 min downtime):
1. Schedule maintenance window (off-hours)
2. Notify users 24 hours in advance
3. Create full backup
4. Test in staging environment first
5. Apply change with rollback plan ready
6. Extended monitoring (1 hour)
7. Post-change review

---

## 🔍 Audit & Compliance

### Log Retention

- **Application Logs**: 90 days (backend/logs/)
- **System Logs**: 30 days (Docker logs)
- **Audit Logs**: 1 year (backend/logs/audit.log)
- **Backup Logs**: 30 days (backups/)

### Compliance Checks

**Monthly**:
- Review audit logs for unauthorized access
- Verify encryption key rotation
- Check GDPR compliance (data retention)
- Validate backup integrity

---

## 📊 Capacity Planning

### Current Capacity

- **Users**: 18 training accounts (system supports 10,000+)
- **Courses**: 5 sample courses (system supports 1,000+)
- **Concurrent Users**: Tested up to 50 (production target: 200+)
- **Database Size**: ~100MB (capacity: 100GB+)
- **Disk Space**: 925GB free (97% available)

### Growth Projections

**Year 1** (2026):
- Expected users: 500-1000
- Expected courses: 50-100
- Estimated disk growth: 1-2 GB/month
- **Action**: No scaling needed

**Year 2** (2027):
- Expected users: 2000-5000
- Expected courses: 200-500
- Estimated disk growth: 5-10 GB/month
- **Action**: Consider horizontal scaling (multiple backend instances)

---

## 🎯 SLA Commitments

**Uptime**: 99.5% (maximum 3.65 hours downtime/month)
**Response Time**: p95 < 500ms for 95% of requests
**Error Rate**: < 2% for all API endpoints
**Backup Recovery**: < 15 minutes RTO, < 24 hours RPO

**Current Performance** (Feb 1, 2026):
- Uptime: 100% (6+ hours stable)
- Response Time: 350ms p95 ✅ (30% under SLA)
- Error Rate: 1.33% ✅ (33% under SLA)
- Last Backup: Automated daily backups operational

---

**Document Owner**: Solo Developer
**Review Schedule**: Quarterly (next review: May 1, 2026)
**Version History**:
- v1.0 (Feb 1, 2026): Initial production runbook
