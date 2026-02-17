# QUICK REFERENCE - PHASE 5 GO-LIVE

**Version**: v1.17.6
**Date**: January 31, 2026
**Status**: ✅ PRODUCTION READY

---

## 🚀 ONE-PAGE DEPLOYMENT GUIDE

### PRE-DEPLOYMENT (1 hour before)
```powershell
# 1. Notify stakeholders
# "Go-live starting in 1 hour"

# 2. Verify current status
docker-compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps

# 3. Backup existing data (if applicable)
# docker-compose exec -T postgres pg_dump -U sms_user student_management > backup.sql
```

### DEPLOYMENT (10-20 minutes)
```powershell
# DEPLOY THE SYSTEM
.\DOCKER.ps1 -Start

# Wait for output: "✅ All services healthy"

# VERIFY DEPLOYMENT
docker-compose ps
# Should show: all containers in "Up" state

# TEST HEALTH
curl http://localhost:8080/health
# Should return: {"status": "healthy", ...}

# RUN SMOKE TESTS
.\RUN_E2E_TESTS.ps1
# Should show: 19+ tests passing
```

### POST-DEPLOYMENT (30 minutes)
```powershell
# 1. Verify user access
#    • Test admin login
#    • Test teacher login
#    • Test student login

# 2. Verify critical features
#    • View grades
#    • Submit attendance
#    • Manage users (admin)

# 3. Start monitoring
#    • Check response times
#    • Monitor error rates
#    • Verify backup status

# 4. Notify users
#    "System is live! You can now access..."
```

### GO-LIVE
```
✅ All systems operational
✅ Users can access system
✅ Support team on standby
✅ Monitoring active
⏱️ Monitor for first 24 hours
```

---

## 📋 CRITICAL CONTACTS

### During Go-Live
- **System Admin**: [Contact]
- **Operations Lead**: [Contact]
- **Emergency Escalation**: [Contact]

### If Issues Occur
1. Check: `docker-compose logs -f`
2. Verify: Health endpoint working
3. Contact: System admin
4. Rollback: Follow INCIDENT_RESPONSE_RUNBOOK.md

---

## 🎓 TRAINING QUICK START

### Admin Training (4 hours)
- System overview
- User management
- Reporting
- Settings & configuration

### Teacher Training (3 hours)
- Entering grades
- Attendance tracking
- Student management
- Grade reporting

### Student Training (1.5 hours)
- Viewing grades
- Course information
- Profile management
- Support contact

---

## ✅ VERIFICATION CHECKLIST

### Before Deployment
- [ ] All stakeholders notified
- [ ] Support team briefed
- [ ] Backup completed
- [ ] Rollback plan reviewed

### During Deployment
- [ ] `.\DOCKER.ps1 -Start` executed
- [ ] All containers showing "Up"
- [ ] Health endpoint responding
- [ ] Smoke tests passing (19+)

### After Deployment
- [ ] Users can login (test each role)
- [ ] Critical features working
- [ ] Monitoring active
- [ ] No errors in logs

### Go-Live
- [ ] Users have access
- [ ] Training completed
- [ ] Support on standby
- [ ] Monitoring running

---

## 🔧 COMMON COMMANDS

```powershell
# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Stop system
docker-compose down

# Restart
docker-compose up -d

# Health check
curl http://localhost:8080/health

# Database access
docker-compose exec postgres psql -U sms_user -d student_management
```

---

## 🆘 EMERGENCY PROCEDURES

### If System Won't Start
```powershell
# 1. Check logs
docker-compose logs

# 2. Stop and clean
docker-compose down

# 3. Restart
.\DOCKER.ps1 -Start

# 4. If still fails: Check INCIDENT_RESPONSE_RUNBOOK.md
```

### If Database Issues
```powershell
# 1. Check database
docker-compose exec postgres psql -U sms_user -d student_management

# 2. Check migrations
# SELECT version FROM alembic_version;

# 3. Restore from backup if needed
# See: BACKUP_RESTORE_PROCEDURES.md
```

### If Performance Issues
```powershell
# 1. Check resource usage
docker stats

# 2. Check response times
# Monitor: http://localhost:3000/prometheus

# 3. Check error rate
# View: Grafana dashboards
```

---

## 📞 SUPPORT ESCALATION

**Level 1 - Issue Appears** (0-5 min)
- Check documentation
- Review logs
- Run health checks

**Level 2 - Issue Persists** (5-15 min)
- Contact system admin
- Review incident runbook
- Consider rollback

**Level 3 - Critical Issue** (15+ min)
- Executive escalation
- Prepare for rollback
- Notify stakeholders

---

## 📊 PERFORMANCE TARGETS

**Normal Operation**:
- Response time p95: <500ms
- Error rate: <1%
- Uptime: >99%
- DB connections: <20

**Alert Thresholds**:
- Response time p95: >1000ms = Action
- Error rate: >5% = Action
- Uptime: <99% = Action
- DB connections: >30 = Action

---

## ✅ SIGN-OFF

**System Status**: ✅ READY
**Documentation**: ✅ COMPLETE
**Training**: ✅ READY
**Support**: ✅ READY

**APPROVED FOR GO-LIVE** ✅

---

**Quick Reference Card**
v1.17.6 - January 31, 2026
See full documentation at: docs/deployment/
