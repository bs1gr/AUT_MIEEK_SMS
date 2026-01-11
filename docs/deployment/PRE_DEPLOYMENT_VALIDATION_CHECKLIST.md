# Pre-Deployment Validation Checklist - $11.15.2

**Date**: January 7, 2026
**Version**: 1.15.1
**Environment**: Staging (Pre-Deployment)
**Status**: Ready for Execution

---

## ✅ Code & Version Verification

### Repository Status
- [ ] Main branch has latest code
- [ ] Git status clean (no uncommitted changes)
- [ ] Latest commit: `3b9d44fd5`
- [ ] Commit message mentions "$11.15.2"

```bash
# Verification commands:
git status  # Should show "nothing to commit"
git log --oneline -1  # Should show 3b9d44fd5
cat VERSION  # Should show 1.15.1
```

### File Integrity
- [ ] VERSION file: 1.15.1
- [ ] CHANGELOG.md: $11.15.2 entry present
- [ ] RELEASE_NOTES_$11.15.2.md: Complete (650+ lines)
- [ ] docker-compose.yml: Present and valid
- [ ] .env.example: Present and correct
- [ ] All required scripts executable

```bash
# Verification:
ls -la VERSION CHANGELOG.md RELEASE_NOTES_$11.15.2.md
grep "## \[1.15.1\]" CHANGELOG.md  # Should find entry
```

---

## 🏗️ Infrastructure Verification

### Staging Environment
- [ ] Server/VM accessible (SSH/RDP works)
- [ ] Docker installed: `docker version` succeeds
- [ ] Docker Compose installed: `docker-compose --version` succeeds
- [ ] Disk space: ≥5GB free (check with `df -h`)
- [ ] Memory: ≥4GB available (check with `free -h`)
- [ ] Network: Stable connectivity

```bash
# Verification commands:
docker version
docker-compose --version
df -h | grep -E "^/dev"
free -h
ping 8.8.8.8
```

### Port Availability
- [ ] Port 8080 available (frontend)
- [ ] Port 8000 available (backend)
- [ ] Port 5432 available (if using PostgreSQL)
- [ ] No other containers using these ports

```bash
# Verification:
netstat -tuln | grep -E ":(8000|8080|5432)"  # Should show nothing
docker ps  # Should show no other sms containers
```

### Volume Status
- [ ] `/data` directory writable (for SQLite)
- [ ] `/var/lib/docker/volumes` accessible
- [ ] Backups directory exists: `/backups/`
- [ ] Sufficient space in all locations

```bash
# Verification:
ls -la /data
mkdir -p /backups && touch /backups/test.txt && rm /backups/test.txt
```

---

## 📦 Database & Data

### Current Database
- [ ] $11.15.2 database backed up
- [ ] Backup file size >100KB
- [ ] Backup file verified (not corrupted)
- [ ] Backup path documented

```bash
# Backup procedures:
docker exec sms-fullstack sqlite3 /data/student_management.db \
  ".backup '/backups/pre-1.15.1/student_management_$11.15.2.db'"
ls -lh /backups/pre-1.15.1/student_management_$11.15.2.db
```

### Data Expectations
- [ ] Test data exists (at least 10 students, 5 courses)
- [ ] Sample users created (test@example.com)
- [ ] Audit log sample data present (from $11.15.2)
- [ ] No critical data inconsistencies

```bash
# Verification:
sqlite3 /data/student_management.db "SELECT COUNT(*) FROM students;"
sqlite3 /data/student_management.db "SELECT COUNT(*) FROM courses;"
sqlite3 /data/student_management.db "SELECT COUNT(*) FROM audit_logs;"
```

---

## 📋 Documentation Verification

### Release Documentation
- [ ] RELEASE_NOTES_$11.15.2.md: Complete and accurate
- [ ] CHANGELOG.md: Updated with $11.15.2
- [ ] Migration guide: Included and clear
- [ ] Deployment instructions: Verified
- [ ] Known issues: Documented (notification tests)

```bash
# Verification:
wc -l RELEASE_NOTES_$11.15.2.md  # Should be 600+
grep -A 5 "## Known Issues" RELEASE_NOTES_$11.15.2.md
```

### Monitoring Documentation
- [ ] E2E_CI_MONITORING.md: Present
- [ ] E2E_MONITORING_PROCEDURES.md: Present
- [ ] e2e_metrics_collector.py: Present and executable
- [ ] e2e_failure_detector.py: Present and executable

```bash
# Verification:
ls -la docs/operations/E2E_*.md
ls -la scripts/e2e_*.py
file scripts/e2e_metrics_collector.py  # Should show Python script
```

---

## 🔧 Deployment Scripts

### PowerShell Scripts (Windows) or Bash (Linux)
- [ ] DOCKER.ps1 exists and is executable
- [ ] NATIVE.ps1 exists and is executable
- [ ] docker-compose.yml valid YAML
- [ ] docker-compose.prod.yml present

```bash
# Verification (Windows):
.\DOCKER.ps1 -Help | head  # Should show commands

# Verification (Linux):
./DOCKER.ps1 -Help 2>/dev/null || echo "Run on Windows or WSL2"
```

### Configuration Files
- [ ] docker/.env created from .env.example
- [ ] POSTGRES_PASSWORD set (if using PostgreSQL)
- [ ] DATABASE_URL configured correctly
- [ ] API_KEY settings present (if needed)

```bash
# Verification:
ls -la docker/.env
grep -E "^[A-Z_]+=.+$" docker/.env | head -10
```

---

## 🧪 Pre-Deployment Tests

### Code Quality Checks
- [ ] No Python syntax errors: `python -m py_compile backend/*.py`
- [ ] No JavaScript syntax errors: `npm run lint` (frontend)
- [ ] No missing dependencies: `pip check`, `npm audit`

```bash
# Verification:
cd backend && python -m py_compile *.py routers/*.py services/*.py
cd ../frontend && npm audit --audit-level=moderate
```

### Unit Tests (Optional but Recommended)
- [ ] Backend tests: `pytest backend/tests/ -q`
- [ ] Frontend tests: `npm run test -- --run` (if quick enough)

```bash
# Run tests:
cd backend && pytest tests/test_smoke_*.py -v  # Just smoke tests
cd ../frontend && npm run test -- --run --reporter=verbose --bail
```

---

## 📞 Communication Checklist

### Notification
- [ ] Staging team notified of deployment window
- [ ] No critical staging tests scheduled during deployment
- [ ] Backup contact information exchanged
- [ ] Escalation path documented

### Documentation
- [ ] Deployment plan shared with team
- [ ] Rollback procedure documented and accessible
- [ ] Contact list updated with emergency contacts
- [ ] Success/failure notification template prepared

---

## 🚀 Go/No-Go Decision

### Go Criteria (All Must Be Met)
- ✅ Code version verified (1.15.1)
- ✅ Infrastructure ready (Docker, ports, space)
- ✅ Database backed up
- ✅ Documentation complete
- ✅ Scripts verified
- ✅ Team notified
- ✅ Rollback plan ready

### No-Go Conditions
- ❌ Code version mismatch
- ❌ Infrastructure issues (Docker not running, ports occupied)
- ❌ Database backup failed
- ❌ Network connectivity issues
- ❌ Critical documentation missing
- ❌ Team not available for monitoring

---

## 📊 Verification Summary

| Category | Status | Items | Checked |
|----------|--------|-------|---------|
| Code & Version | ⏳ | 4 | 0/4 |
| Infrastructure | ⏳ | 6 | 0/6 |
| Database & Data | ⏳ | 4 | 0/4 |
| Documentation | ⏳ | 5 | 0/5 |
| Deployment Scripts | ⏳ | 4 | 0/4 |
| Pre-Deployment Tests | ⏳ | 3 | 0/3 |
| Communication | ⏳ | 4 | 0/4 |

**Total**: 0/30 items checked

---

## 📝 Sign-Off

### Pre-Deployment Verification Lead
- **Name**: ___________________
- **Date**: ___________________
- **Time**: ___________________
- **Signature**: ___________________

### Approval Authority
- **Name**: ___________________
- **Date**: ___________________
- **Approval**: ☐ GO | ☐ NO-GO

---

## 🔄 Execution Path

### If All Items Checked ✅
→ Proceed to STAGING_DEPLOYMENT_PLAN_$11.15.2.md
→ Execute deployment steps
→ Run validation tests

### If Any Items Unchecked ⚠️
→ Review and fix issues
→ Update this checklist
→ Escalate to Tech Lead if needed

### If No-Go Conditions Found ❌
→ Do NOT proceed with deployment
→ Document issues
→ Escalate to DevOps Lead
→ Reschedule deployment

---

**Checklist Status**: Ready for Use
**Created**: January 7, 2026
**Last Updated**: January 7, 2026
**Next Review**: Before staging deployment (Jan 8)
