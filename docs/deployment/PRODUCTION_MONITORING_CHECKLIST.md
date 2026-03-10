# Production Monitoring Checklist

> **Historical document (Jan 2026):** This checklist captures a production monitoring routine written for the early 2026 deployment context.
> Role labels, escalation wording, and deployment references below are historical and should not be treated as current operating instructions.
> For current status and active guidance, use `docs/plans/UNIFIED_WORK_PLAN.md`, `docs/DOCUMENTATION_INDEX.md`, and the active monitoring runbooks.

**Version**: 1.0
**Created**: January 31, 2026
**For**: Historical `$11.18.3` production deployment context

---

## 📊 Daily Monitoring Tasks (5 minutes)

### Morning Health Check (08:00 UTC)

- [ ] **System Status**
  ```powershell
  # Check all containers running
  docker ps -a --filter "name=sms" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  ```
  - Backend: ✓ healthy
  - PostgreSQL: ✓ healthy
  - Redis: ✓ healthy
  - Monitoring stack: ✓ all services up

- [ ] **API Health**
  ```powershell
  # Test health endpoint
  curl http://localhost:8000/api/v1/health
  ```
  - Database: ✓ connected
  - Migrations: ✓ up-to-date
  - Disk space: ✓ >10GB free
  - Memory: ✓ <80% used

- [ ] **Grafana Dashboards**
  - Open: http://localhost:3000
  - System Dashboard: All metrics green
  - Performance Dashboard: Response times <500ms
  - No active alerts

### Business Hours Check (12:00 UTC)

- [ ] **User Activity**
  - Active sessions: Check normal range
  - API requests/min: Within expected baseline
  - Error rate: <1%

- [ ] **Performance Metrics**
  - p95 response time: <380ms (production baseline)
  - p99 response time: <2000ms
  - Throughput: >30 req/s during peak

- [ ] **Alert Review**
  - Prometheus Alerts: http://localhost:9093
  - Active alerts: 0 critical, <3 warnings
  - Resolve or acknowledge all alerts

### End of Day Check (17:00 UTC)

- [ ] **Backup Verification**
  ```powershell
  # Check latest backup exists
  Get-ChildItem backups/ | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  ```
  - Backup created: Today's date
  - Size: >1MB (non-empty database)

- [ ] **Log Review**
  - Loki logs: http://localhost:3100
  - No ERROR level messages (critical)
  - Warning count: <10

- [ ] **Resource Usage**
  - Disk usage: <70%
  - Memory usage: <80%
  - CPU usage: <60% average

---

## 📅 Weekly Monitoring Tasks (30 minutes)

### Monday Morning (Week Start Review)

- [ ] **Performance Trend Analysis**
  - Grafana Performance Dashboard (last 7 days)
  - p95 response time trend: Stable or improving
  - Error rate trend: <1% average
  - Identify any spikes or anomalies

- [ ] **Capacity Planning**
  - Database size growth: Calculate weekly increase
  - Disk space projection: Estimate weeks remaining
  - User growth: Track new accounts created
  - Course enrollment growth: Trending

- [ ] **Security Audit**
  ```powershell
  # Check failed login attempts
  docker logs sms-backend 2>&1 | Select-String "401" | Measure-Object
  ```
  - Failed logins: <100/week (expected range)
  - No brute force patterns detected
  - Review audit log for suspicious activity

### Friday Afternoon (Week End Cleanup)

- [ ] **Alert Rule Review**
  ```powershell
  # Review AlertManager configuration
  scripts/monitoring/Configure-AlertRules.ps1 -List
  ```
  - All 20+ rules still relevant
  - Thresholds match current baselines
  - No false positive alerts this week

- [ ] **Dashboard Health**
  - All 4 Grafana dashboards loading correctly
  - No missing data sources
  - Panels showing recent data (<5 min old)

- [ ] **Backup Testing**
  ```powershell
  # Test restore procedure (dry-run)
  scripts/BACKUP_DATABASE.ps1 -Verify
  ```
  - Latest backup file readable
  - Can extract database successfully
  - No corruption detected

---

## 📆 Monthly Monitoring Tasks (2 hours)

### First Monday of Month

- [ ] **Comprehensive Performance Review**
  - Generate monthly metrics report
  - Compare to previous month
  - Identify optimization opportunities
  - Document findings

- [ ] **Security Update Check**
  ```powershell
  # Backend dependencies
  cd backend && pip list --outdated

  # Frontend dependencies
  cd frontend && npm outdated
  ```
  - CVE check: pip-audit, npm audit
  - Plan security updates if needed
  - Schedule maintenance window

- [ ] **User Feedback Review**
  - Collect support tickets/issues
  - Identify common problems
  - Prioritize fixes for next sprint

- [ ] **SLA Compliance Report**
  - Uptime: Target >99.5%
  - Performance: p95 <500ms target
  - Error rate: <1% target
  - Calculate actual vs target
  - Document any violations

- [ ] **Backup Rotation**
  ```powershell
  # Clean up old backups (keep 30 days)
  scripts/CLEANUP_OLD_BACKUPS.ps1 -DaysToKeep 30
  ```
  - Monthly backups: Keep 12 months
  - Weekly backups: Keep 8 weeks
  - Daily backups: Keep 30 days

---

## 🚨 Incident Response Triggers

### Critical (Immediate Response - 0-5 min)

**Trigger Conditions:**
- ❌ API health endpoint down (500 errors)
- ❌ Database connection lost
- ❌ All containers stopped
- ❌ Disk space <5% free
- ❌ p95 response time >5000ms

**Action:**
1. Check Slack/Teams notifications
2. Open incident response runbook: `docs/deployment/INCIDENT_RESPONSE_RUNBOOK.md`
3. Follow emergency procedures
4. Notify the owner and any required external contacts immediately

### High Priority (Response within 5-15 min)

**Trigger Conditions:**
- ⚠️ Error rate >5%
- ⚠️ Memory usage >90%
- ⚠️ Backup failed
- ⚠️ Monitoring service down

**Action:**
1. Investigate root cause
2. Apply fix or workaround
3. Document in incident log
4. Schedule post-mortem

### Medium Priority (Response within 1 hour)

**Trigger Conditions:**
- 🔔 Performance degradation (p95 >1000ms)
- 🔔 Warning alerts active >30 min
- 🔔 Log errors increasing

**Action:**
1. Review logs and metrics
2. Identify trends
3. Create work item for fix
4. Monitor for escalation

---

## 📈 Metrics Collection

### Automated Metrics (Prometheus)

**System Metrics:**
- CPU usage (per container)
- Memory usage (per container)
- Disk I/O
- Network traffic

**Application Metrics:**
- HTTP request count
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections

**Database Metrics:**
- Query execution time
- Connection pool usage
- Table sizes
- Index performance

### Manual Metrics (Weekly)

**Business Metrics:**
- Total students: Count
- Total courses: Count
- Total grades recorded: Count
- User activity: Sessions/day
- Peak usage time: Hour range

**Performance Baselines:**
- Average response time: Target 380ms
- Throughput: Target >30 req/s
- Error rate: Target <1%
- Uptime: Target >99.5%

---

## 🛠️ Tools & Access

### Monitoring Stack URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana** | http://localhost:3000 | Dashboards & visualizations |
| **Prometheus** | http://localhost:9090 | Metrics & queries |
| **AlertManager** | http://localhost:9093 | Alert management |
| **Loki** | http://localhost:3100 | Log aggregation |

### Credentials

**Grafana:**
- Username: `admin`
- Password: Check `scripts/monitoring/Manage-GrafanaPassword.ps1`

**Prometheus/AlertManager:**
- No authentication (localhost only)

### Quick Commands

```powershell
# Start monitoring stack
docker-compose -f docker/docker-compose.monitoring.yml up -d

# Check monitoring health
scripts/monitoring/Verify-MonitoringStack.ps1

# View logs
docker-compose -f docker/docker-compose.monitoring.yml logs -f

# Restart specific service
docker-compose -f docker/docker-compose.monitoring.yml restart grafana
```

---

## 📚 Related Documentation

- [Monitoring Operations Guide](../monitoring/MONITORING_OPERATIONS_GUIDE.md) - Complete ops procedures
- [Incident Response Runbook](INCIDENT_RESPONSE_RUNBOOK.md) - Emergency procedures
- [Backup & Restore Procedures](BACKUP_RESTORE_PROCEDURES.md) - Data recovery
- [Daily Operations Checklist](DAILY_OPERATIONS_CHECKLIST.md) - Standard tasks

---

## ✅ Checklist Summary

### Daily (5 min)
- [ ] Morning: Health check, container status, API
- [ ] Midday: User activity, performance, alerts
- [ ] Evening: Backups, logs, resources

### Weekly (30 min)
- [ ] Performance trends, capacity planning
- [ ] Security audit, alert review
- [ ] Backup testing, dashboard health

### Monthly (2 hours)
- [ ] Comprehensive review, SLA report
- [ ] Security updates, user feedback
- [ ] Backup rotation, optimization planning

---

**Last Updated**: January 31, 2026
**Next Review**: February 28, 2026
