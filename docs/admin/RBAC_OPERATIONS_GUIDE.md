# RBAC Operations Guide

**Version**: 1.15.1
**Last Updated**: January 8, 2026
**Audience**: System Administrators, SRE, DevOps
**Status**: Production Ready

---

## Overview

This guide covers day-to-day operational procedures for the RBAC system in production. It focuses on monitoring, maintenance, incident response, and compliance activities.

### Quick Reference

- **Permission Management**: See [PERMISSION_MANAGEMENT_GUIDE.md](./PERMISSION_MANAGEMENT_GUIDE.md)
- **Permission Matrix**: See [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md)
- **Database Schema**: See [RBAC_DATABASE_SCHEMA.md](./RBAC_DATABASE_SCHEMA.md)

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Reviews](#monthly-reviews)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Incident Response](#incident-response)
6. [Change Management](#change-management)
7. [Audit & Compliance](#audit--compliance)
8. [Performance Optimization](#performance-optimization)
9. [Backup & Recovery](#backup--recovery)
10. [Runbooks](#runbooks)

---

## Daily Operations

### Morning Health Check (5 minutes)

**Run daily at 9:00 AM**

#### 1. Check RBAC System Health

```bash
# Test permission seeding
cd backend
python ops/seed_rbac_data.py --verify
```

**Expected Output**:

```
✓ All 26 permissions exist
✓ All 3 roles exist
✓ All 44 role-permission mappings exist
```

**If issues found**: Re-run seeding script

```bash
python ops/seed_rbac_data.py
```

#### 2. Verify Active Users Have Roles

```sql
-- Check for users without roles
SELECT COUNT(*) as users_without_roles
FROM users
WHERE is_active = 1 AND role_id IS NULL;
```

**Expected**: `users_without_roles = 0`

**If non-zero**: Investigate and assign default role

```sql
-- View users without roles
SELECT id, email, created_at
FROM users
WHERE is_active = 1 AND role_id IS NULL;

-- Assign viewer role as default
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'viewer')
WHERE is_active = 1 AND role_id IS NULL;
```

#### 3. Review Failed Permission Checks (Last 24 Hours)

**Check application logs**:

```powershell
# Search for 403 errors in last 24 hours
Select-String -Path "backend/logs/app.log" -Pattern "403.*Permission denied" |
    Select-Object -Last 20
```

**Pattern to watch for**: Same user hitting same permission multiple times

**Action**: If legitimate access needed, grant permission. If abuse, investigate.

---

## Weekly Maintenance

### Permission Audit (15 minutes)

**Run every Monday at 10:00 AM**

#### 1. Review Direct User Permissions

**Goal**: Direct permissions should be rare (use roles instead)

```sql
-- List all direct user permissions
SELECT
    u.email,
    p.key as permission,
    up.granted_at,
    up.expires_at,
    granter.email as granted_by
FROM user_permissions up
JOIN users u ON up.user_id = u.id
JOIN permissions p ON up.permission_id = p.id
LEFT JOIN users granter ON up.granted_by = granter.id
WHERE up.expires_at IS NULL OR up.expires_at > datetime('now')
ORDER BY up.granted_at DESC;
```

**Red Flags**:
- ⚠️ More than 5 direct permissions active
- ⚠️ Direct permissions older than 30 days without expiration
- ⚠️ Admin-level permissions granted directly

**Action**: Review each direct permission, convert to role assignment if permanent

#### 2. Clean Up Expired Permissions

```sql
-- Delete expired direct permissions
DELETE FROM user_permissions
WHERE expires_at < datetime('now', '-7 days');  -- Keep for 7 days as history
```

**Expected**: Should delete 0-10 records per week

#### 3. Role Membership Review

```sql
-- Count users per role
SELECT
    r.name as role,
    COUNT(u.id) as user_count
FROM roles r
LEFT JOIN users u ON r.id = u.role_id AND u.is_active = 1
GROUP BY r.name
ORDER BY user_count DESC;
```

**Expected Distribution** (example for 100 users):
- `viewer`: 50-70 users
- `teacher`: 20-30 users
- `admin`: 1-3 users

**Red Flags**:
- ⚠️ More than 5 admins
- ⚠️ Zero users in a role (might indicate broken system)

#### 4. Inactive Permission Detection

```sql
-- Find permissions with no assigned roles or users
SELECT p.key, p.description
FROM permissions p
WHERE p.is_active = 1
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.permission_id = p.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.permission_id = p.id
        AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
  );
```

**Expected**: 0-2 unused permissions

**Action**: Review if permission is still needed, deactivate if obsolete

---

## Monthly Reviews

### Comprehensive RBAC Audit (30 minutes)

**Run first Monday of each month**

#### 1. Permission Matrix Export

```sql
-- Export complete permission matrix
SELECT
    r.name as role,
    p.resource,
    p.action,
    p.key as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = 1 AND p.is_active = 1
ORDER BY r.name, p.resource, p.action;
```

**Save to CSV** for management review:

```bash
sqlite3 data/student_management.db <<EOF > rbac_matrix_$(date +%Y%m%d).csv
.mode csv
.headers on
SELECT
    r.name as role,
    p.resource,
    p.action,
    p.key as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = 1 AND p.is_active = 1
ORDER BY r.name, p.resource, p.action;
.quit
EOF
```

#### 2. User Activity Analysis

```sql
-- Users who never logged in (potential security risk)
SELECT
    u.email,
    r.name as role,
    u.created_at,
    u.last_login
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.is_active = 1
  AND (u.last_login IS NULL OR u.last_login < datetime('now', '-90 days'))
ORDER BY u.created_at;
```

**Action**:
- Contact users to confirm account needed
- Deactivate accounts with no login in 90+ days
- Remove admin role from inactive users immediately

#### 3. Permission Change History

```sql
-- Review all permission grants in last 30 days
SELECT
    u.email as user_email,
    p.key as permission,
    up.granted_at,
    up.expires_at,
    granter.email as granted_by,
    CASE
        WHEN up.expires_at IS NULL THEN 'Permanent'
        WHEN up.expires_at > datetime('now') THEN 'Active'
        ELSE 'Expired'
    END as status
FROM user_permissions up
JOIN users u ON up.user_id = u.id
JOIN permissions p ON up.permission_id = p.id
LEFT JOIN users granter ON up.granted_by = granter.id
WHERE up.granted_at > datetime('now', '-30 days')
ORDER BY up.granted_at DESC;
```

**Review for**:
- Unusual permission grants (e.g., audit:view to non-admins)
- Bulk grants (multiple users same permission same time)
- Permissions granted by non-admin users

#### 4. Compliance Report

**Generate monthly report** with:

1. Total active users: `SELECT COUNT(*) FROM users WHERE is_active = 1;`
2. Total roles: `SELECT COUNT(*) FROM roles WHERE is_active = 1;`
3. Total permissions: `SELECT COUNT(*) FROM permissions WHERE is_active = 1;`
4. Admin users: `SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');`
5. Direct permission grants this month: `SELECT COUNT(*) FROM user_permissions WHERE granted_at > datetime('now', '-30 days');`

**Save template**: `reports/rbac_compliance_YYYYMM.txt`

---

## Monitoring & Alerts

### Key Metrics to Track

#### 1. Permission Denied Rate

**Metric**: Failed permission checks per hour

**Query**:

```sql
-- Count 403 errors in application logs
-- (Requires log parsing or metrics endpoint)
```

**PowerShell script** for log analysis:

```powershell
# Count permission denied errors in last hour
$logFile = "backend/logs/app.log"
$pattern = "403.*Permission denied"
$lastHour = (Get-Date).AddHours(-1)

$errors = Select-String -Path $logFile -Pattern $pattern |
    Where-Object {
        $timestamp = [DateTime]::Parse(($_.Line -split " - ")[0])
        $timestamp -gt $lastHour
    }

Write-Host "Permission denied errors in last hour: $($errors.Count)"
```

**Thresholds**:
- 🟢 **Normal**: <10 per hour
- 🟡 **Warning**: 10-50 per hour (investigate)
- 🔴 **Critical**: >50 per hour (possible attack or misconfiguration)

#### 2. Role Distribution

**Metric**: Percentage of users per role

```sql
SELECT
    r.name,
    COUNT(u.id) as count,
    ROUND(COUNT(u.id) * 100.0 / (SELECT COUNT(*) FROM users WHERE is_active = 1), 2) as percentage
FROM roles r
LEFT JOIN users u ON r.id = u.role_id AND u.is_active = 1
GROUP BY r.name;
```

**Expected Distribution**:
- viewer: 50-70%
- teacher: 20-40%
- admin: 1-5%

**Alert if**: Admin percentage >10%

#### 3. Direct Permission Growth

**Metric**: Number of active direct user permissions

```sql
SELECT COUNT(*) as direct_permissions
FROM user_permissions
WHERE expires_at IS NULL OR expires_at > datetime('now');
```

**Thresholds**:
- 🟢 **Healthy**: <20 direct permissions
- 🟡 **Review**: 20-50 (should use roles)
- 🔴 **Problem**: >50 (RBAC not being used properly)

#### 4. Expired Permission Cleanup

**Metric**: Number of expired but not deleted permissions

```sql
SELECT COUNT(*) as expired_not_cleaned
FROM user_permissions
WHERE expires_at < datetime('now', '-7 days');
```

**Expected**: 0 (should be cleaned weekly)

**Alert if**: >100 records

### Automated Monitoring Script

**Create**: `scripts/rbac_monitor.py`

```python
#!/usr/bin/env python3
"""RBAC monitoring script - run daily via cron"""

import sqlite3
from datetime import datetime, timedelta

DB_PATH = "data/student_management.db"

def check_users_without_roles():
    """Alert if active users missing role"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT COUNT(*) FROM users WHERE is_active = 1 AND role_id IS NULL"
    )
    count = cursor.fetchone()[0]
    conn.close()

    if count > 0:
        print(f"⚠️  WARNING: {count} active users without roles")
        return False
    print(f"✓ All active users have roles")
    return True

def check_admin_count():
    """Alert if too many admins"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        """SELECT COUNT(*) FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.is_active = 1 AND r.name = 'admin'"""
    )
    count = cursor.fetchone()[0]
    conn.close()

    if count > 5:
        print(f"⚠️  WARNING: {count} admin users (expected ≤5)")
        return False
    print(f"✓ Admin count OK: {count}")
    return True

def check_expired_cleanup():
    """Alert if expired permissions not cleaned"""
    conn = sqlite3.connect(DB_PATH)
    cutoff = (datetime.now() - timedelta(days=7)).isoformat()
    cursor = conn.execute(
        f"SELECT COUNT(*) FROM user_permissions WHERE expires_at < '{cutoff}'"
    )
    count = cursor.fetchone()[0]
    conn.close()

    if count > 100:
        print(f"⚠️  WARNING: {count} expired permissions not cleaned")
        return False
    print(f"✓ Expired permissions cleanup OK: {count} records")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("RBAC System Health Check")
    print("=" * 60)

    checks = [
        check_users_without_roles(),
        check_admin_count(),
        check_expired_cleanup(),
    ]

    if all(checks):
        print("\n✓ All checks passed")
        exit(0)
    else:
        print("\n⚠️  Some checks failed - review above")
        exit(1)
```

**Schedule**: Run daily via cron or Task Scheduler

```bash
# Add to crontab (Linux)
0 9 * * * cd /path/to/sms && python scripts/rbac_monitor.py >> logs/rbac_monitor.log 2>&1
```

```powershell
# Windows Task Scheduler (PowerShell)
$action = New-ScheduledTaskAction -Execute "python" -Argument "scripts/rbac_monitor.py" -WorkingDirectory "D:\SMS\student-management-system"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "RBAC Health Check" -Action $action -Trigger $trigger
```

---

## Incident Response

### Scenario 1: Mass Permission Denied Errors

**Symptoms**:
- Sudden spike in 403 errors (>100/hour)
- Multiple users reporting access issues
- Logs show same permission repeatedly denied

**Diagnosis**:

```sql
-- Check if permission exists and is active
SELECT * FROM permissions WHERE key = 'students:view';

-- Check role mappings
SELECT r.name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.key = 'students:view';
```

**Resolution**:

1. **If permission missing**: Re-run seeding script
   ```bash
   python backend/ops/seed_rbac_data.py
   ```

2. **If permission inactive**: Reactivate
   ```sql
   UPDATE permissions SET is_active = 1 WHERE key = 'students:view';
   ```

3. **If role mapping missing**: Re-seed or add manually
   ```sql
   INSERT INTO role_permissions (role_id, permission_id, created_at)
   VALUES (
       (SELECT id FROM roles WHERE name = 'teacher'),
       (SELECT id FROM permissions WHERE key = 'students:view'),
       datetime('now')
   );
   ```

**Prevention**: Add monitoring for permission check success rate

---

### Scenario 2: User Locked Out (No Access)

**Symptoms**:
- User reports "Permission denied" on all actions
- User can log in but can't access any features

**Diagnosis**:

```sql
-- Check user's role
SELECT u.email, r.name as role, r.is_active
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'locked.user@example.com';

-- Check user's permissions
SELECT p.key
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN users u ON rp.role_id = u.role_id
WHERE u.email = 'locked.user@example.com'
  AND p.is_active = 1;
```

**Common Causes**:
1. **No role assigned**: `role_id IS NULL`
2. **Inactive role**: `r.is_active = 0`
3. **Role with no permissions**: No rows returned

**Resolution**:

1. **Assign viewer role** (minimum access):
   ```sql
   UPDATE users
   SET role_id = (SELECT id FROM roles WHERE name = 'viewer')
   WHERE email = 'locked.user@example.com';
   ```

2. **Reactivate role** (if deactivated):
   ```sql
   UPDATE roles SET is_active = 1 WHERE name = 'teacher';
   ```

3. **Re-seed permissions** (if role has no permissions):
   ```bash
   python backend/ops/seed_rbac_data.py
   ```

**Prevention**: Monitor for users without roles daily

---

### Scenario 3: Accidental Admin Privilege Removal

**Symptoms**:
- Admin can no longer access admin panel
- 403 errors on system:admin endpoints

**Emergency Recovery**:

```sql
-- Restore admin role to user
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'primary.admin@example.com';

-- Verify admin role has all permissions
SELECT COUNT(*) FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');
-- Should return 26 (all permissions)

-- If count is wrong, re-seed
```

```bash
python backend/ops/seed_rbac_data.py
```

**Prevention**:
- Always maintain 2+ admin users
- Never test permission changes on own admin account
- Use separate test account for permission experiments

---

### Scenario 4: Database Corruption

**Symptoms**:
- Inconsistent permission behavior
- Missing permissions or roles
- Foreign key violations in logs

**Recovery**:

1. **Backup current database**:
   ```bash
   sqlite3 data/student_management.db ".backup data/student_management_backup_$(date +%Y%m%d_%H%M%S).db"
   ```

2. **Check database integrity**:
   ```bash
   sqlite3 data/student_management.db "PRAGMA integrity_check;"
   ```

3. **Re-seed RBAC data**:
   ```bash
   python backend/ops/seed_rbac_data.py --verify
   python backend/ops/seed_rbac_data.py
   ```

4. **If corruption persists**, restore from backup:
   ```bash
   cp backups/database/backup_YYYYMMDD.db data/student_management.db
   ```

---

## Change Management

### Adding New Permission

**Process**:

1. **Design Phase** (1-2 days)
   - Define permission key (e.g., `exports:download`)
   - Determine which roles need it
   - Document purpose and scope

2. **Implementation** (1 hour)
   - Add to `backend/ops/seed_rbac_data.py`:
     ```python
     Permission(
         key="exports:download",
         resource="exports",
         action="download",
         description="Download export files"
     ),
     ```
   - Add to role mappings:
     ```python
     ("admin", "exports:download"),
     ("teacher", "exports:download"),
     ```

3. **Testing** (30 minutes)
   - Run dry-run: `python backend/ops/seed_rbac_data.py --dry-run`
   - Verify output shows new permission
   - Apply: `python backend/ops/seed_rbac_data.py`
   - Confirm in DB:
     ```sql
     SELECT * FROM permissions WHERE key = 'exports:download';
     ```

4. **Documentation** (15 minutes)
   - Update [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md)
   - Update [API_PERMISSIONS_REFERENCE.md](../../backend/API_PERMISSIONS_REFERENCE.md)

5. **Deployment** (5 minutes)
   - Commit changes
   - Deploy to staging
   - Run seeding script on production

**Rollback**: Deactivate permission if issues found

```sql
UPDATE permissions SET is_active = 0 WHERE key = 'exports:download';
```

---

### Modifying Role Permissions

**Process**:

1. **Impact Assessment** (30 minutes)
   - Identify affected users:
     ```sql
     SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'teacher');
     ```
   - Test on staging environment first

2. **Change Implementation** (15 minutes)
   - Update `backend/ops/seed_rbac_data.py`
   - Run on staging: `python backend/ops/seed_rbac_data.py`
   - Verify:
     ```sql
     SELECT p.key
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = (SELECT id FROM roles WHERE name = 'teacher')
     ORDER BY p.key;
     ```

3. **User Communication** (1 day before)
   - Notify affected users via email
   - Document changes in release notes

4. **Production Deployment** (5 minutes)
   - Deploy code changes
   - Run seeding script: `python backend/ops/seed_rbac_data.py`
   - Monitor logs for 403 errors (30 minutes)

5. **Validation** (1 hour)
   - Test key workflows with affected roles
   - Verify no unexpected denials

**Rollback**: Revert seed_rbac_data.py changes and re-run

---

## Audit & Compliance

### Quarterly Audit Procedures

**Run every 3 months** (March, June, September, December)

#### 1. Access Control Review

**Export all user-role-permission mappings**:

```sql
SELECT
    u.email,
    u.is_active,
    r.name as role,
    GROUP_CONCAT(p.key, ', ') as permissions
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = 1 AND p.is_active = 1
GROUP BY u.email, r.name
ORDER BY u.email;
```

**Save to**: `audits/rbac_access_review_YYYYQQ.csv`

**Review for**:
- Users with excessive permissions
- Inactive users still active
- Role assignments not matching job function

#### 2. Permission Usage Analysis

**Identify unused permissions**:

```sql
-- Permissions assigned but never checked (requires app metrics)
-- Manual review: Check application logs for permission usage
```

**Action**: Consider removing or consolidating unused permissions

#### 3. Admin Access Log

**List all users who had admin access in last 90 days**:

```sql
-- Current admins
SELECT u.email, 'Current' as status
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'admin' AND u.is_active = 1

UNION

-- Users with direct system:admin permission
SELECT u.email, 'Direct Grant' as status
FROM user_permissions up
JOIN users u ON up.user_id = u.id
JOIN permissions p ON up.permission_id = p.id
WHERE p.key = 'system:admin'
  AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
ORDER BY status, email;
```

**Expected**: 1-3 current admins, 0 direct grants

#### 4. Compliance Checklist

- [ ] All active users have role assignments
- [ ] Admin count ≤5 users
- [ ] No direct admin permissions (all via role)
- [ ] Expired permissions cleaned up
- [ ] Permission matrix documented
- [ ] Audit trail preserved (backup history)
- [ ] No permissions granted without approval
- [ ] Role definitions align with job functions

---

## Performance Optimization

### Query Performance

**Check slow RBAC queries**:

```sql
-- Enable query timing
EXPLAIN QUERY PLAN
SELECT p.key
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = 1 AND p.is_active = 1;
```

**Expected**: Should use indexes on `role_permissions.role_id` and `permissions.id`

### Index Verification

```sql
-- Check RBAC table indexes
SELECT name, sql FROM sqlite_master
WHERE type = 'index'
  AND (tbl_name LIKE '%permission%' OR tbl_name LIKE '%role%');
```

**Required Indexes**:
- `permissions.key` (UNIQUE)
- `permissions.is_active`
- `role_permissions.role_id`
- `role_permissions.permission_id`
- `user_permissions.user_id`
- `user_permissions.permission_id`

**If missing**: Recreate via Alembic migration

### Caching Strategy

**Backend already implements**:
- User permission cache (in-memory)
- Role permission cache (in-memory)

**Monitor cache hit rate** (requires application metrics):

```python
# In backend code
cache_hits = permission_cache_hits
cache_misses = permission_cache_misses
hit_rate = cache_hits / (cache_hits + cache_misses)
```

**Target**: >90% cache hit rate

**If low hit rate**: Review cache TTL and eviction policy

---

## Backup & Recovery

### Daily Backup Procedure

**Automated backup** (runs daily at 2:00 AM):

```bash
#!/bin/bash
# scripts/backup_rbac.sh

BACKUP_DIR="backups/rbac"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_PATH="data/student_management.db"

mkdir -p "$BACKUP_DIR"

# Backup full database
sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/rbac_backup_$TIMESTAMP.db"

# Export RBAC tables only (for quick restore)
sqlite3 "$DB_PATH" <<EOF > "$BACKUP_DIR/rbac_tables_$TIMESTAMP.sql"
.mode insert
SELECT * FROM permissions;
SELECT * FROM roles;
SELECT * FROM role_permissions;
SELECT * FROM user_permissions;
EOF

# Compress old backups (>7 days)
find "$BACKUP_DIR" -name "*.db" -mtime +7 -exec gzip {} \;

echo "Backup completed: $TIMESTAMP"
```

**Retention Policy**:
- Keep daily backups for 30 days
- Keep monthly backups for 1 year
- Compress backups >7 days old

### Recovery Procedures

**Scenario 1: Restore RBAC Tables Only**

```bash
# Restore from SQL export
sqlite3 data/student_management.db < backups/rbac/rbac_tables_20260108.sql
```

**Scenario 2: Full Database Restore**

```bash
# Stop application first
./DOCKER.ps1 -Stop

# Restore database
cp backups/rbac/rbac_backup_20260108.db data/student_management.db

# Restart application
./DOCKER.ps1 -Start
```

**Scenario 3: Point-in-Time Recovery**

```bash
# Find backup closest to desired time
ls -lt backups/rbac/

# Restore from that backup
cp backups/rbac/rbac_backup_20260108_140000.db data/student_management.db
```

---

## Runbooks

### Runbook 1: Grant Emergency Admin Access

**Use Case**: Regular admin unavailable, need emergency access

**Steps**:

1. **Verify requester identity** (phone call, video verification)

2. **Create temporary admin account**:
   ```sql
   INSERT INTO users (email, password_hash, is_active, role_id, created_at, updated_at)
   VALUES (
       'emergency.admin@example.com',
       '$2b$12$...', -- Generate hash with: `python -c "from passlib.hash import bcrypt; print(bcrypt.hash('temp_password'))"`
       1,
       (SELECT id FROM roles WHERE name = 'admin'),
       datetime('now'),
       datetime('now')
   );
   ```

3. **Set expiration** (revoke in 24 hours):
   ```sql
   -- Create reminder task
   INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at, expires_at)
   VALUES (
       (SELECT id FROM users WHERE email = 'emergency.admin@example.com'),
       (SELECT id FROM permissions WHERE key = 'system:admin'),
       1,
       datetime('now'),
       datetime('now', '+1 day')
   );
   ```

4. **Document** in incident log

5. **Revoke after 24 hours**:
   ```sql
   UPDATE users SET is_active = 0 WHERE email = 'emergency.admin@example.com';
   ```

---

### Runbook 2: Bulk Role Migration

**Use Case**: Move 50 users from "viewer" to "teacher"

**Steps**:

1. **Export user list**:
   ```sql
   SELECT email FROM users
   WHERE role_id = (SELECT id FROM roles WHERE name = 'viewer')
     AND email LIKE '%@school.edu';
   ```

2. **Verify users** (manual review of exported list)

3. **Backup database**:
   ```bash
   sqlite3 data/student_management.db ".backup backups/pre_migration_$(date +%Y%m%d).db"
   ```

4. **Execute migration**:
   ```sql
   BEGIN TRANSACTION;

   UPDATE users
   SET role_id = (SELECT id FROM roles WHERE name = 'teacher'),
       updated_at = datetime('now')
   WHERE role_id = (SELECT id FROM roles WHERE name = 'viewer')
     AND email LIKE '%@school.edu';

   -- Verify count
   SELECT changes() as rows_updated;

   COMMIT;
   ```

5. **Verify results**:
   ```sql
   SELECT email FROM users
   WHERE role_id = (SELECT id FROM roles WHERE name = 'teacher')
     AND email LIKE '%@school.edu';
   ```

6. **Notify users** of permission changes

---

### Runbook 3: Decommission Role

**Use Case**: Remove obsolete "guest" role

**Steps**:

1. **Check usage**:
   ```sql
   SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'guest');
   ```

2. **If users exist**, migrate to new role:
   ```sql
   UPDATE users
   SET role_id = (SELECT id FROM roles WHERE name = 'viewer')
   WHERE role_id = (SELECT id FROM roles WHERE name = 'guest');
   ```

3. **Deactivate role** (don't delete - preserves history):
   ```sql
   UPDATE roles SET is_active = 0 WHERE name = 'guest';
   ```

4. **Remove role permissions**:
   ```sql
   DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'guest');
   ```

5. **Document** in changelog

---

## Troubleshooting Reference

### Quick Diagnostics

```bash
# Check if RBAC tables exist
sqlite3 data/student_management.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%permission%' OR name LIKE '%role%';"

# Count records in each table
sqlite3 data/student_management.db "
  SELECT 'permissions', COUNT(*) FROM permissions UNION ALL
  SELECT 'roles', COUNT(*) FROM roles UNION ALL
  SELECT 'role_permissions', COUNT(*) FROM role_permissions UNION ALL
  SELECT 'user_permissions', COUNT(*) FROM user_permissions;
"

# Check for foreign key violations
sqlite3 data/student_management.db "PRAGMA foreign_key_check;"

# Verify indexes
sqlite3 data/student_management.db "PRAGMA index_list(permissions);"
```

### Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing permissions | 404 permission not found | Re-run `seed_rbac_data.py` |
| User no role | 403 on all endpoints | Assign viewer role |
| Too many 403s | Spike in errors | Check permission seeding |
| Slow queries | High latency | Verify indexes exist |
| Expired not cleaned | Growing table | Run weekly cleanup |

---

## Support & Escalation

### Contact Information

- **Tier 1 Support**: DevOps team (`devops@example.com`)
- **Tier 2 Support**: Backend team (`backend@example.com`)
- **Tier 3 Support**: Security team (`security@example.com`)

### Escalation Criteria

**Escalate to Tier 2 if**:
- Issue not resolved in 1 hour
- Affects >10% of users
- Requires code changes

**Escalate to Tier 3 if**:
- Security breach suspected
- Unauthorized admin access
- Data exposure risk

---

## Appendix

### Useful Queries

**Permission cheat sheet**:

```sql
-- List all permissions
SELECT key, description FROM permissions ORDER BY key;

-- List all roles
SELECT name, description FROM roles WHERE is_active = 1;

-- Show user's role
SELECT u.email, r.name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ?;

-- Show role's permissions
SELECT p.key FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?;

-- Count users per role
SELECT r.name, COUNT(u.id) FROM roles r LEFT JOIN users u ON r.id = u.role_id GROUP BY r.name;
```

---

**Last Updated**: January 8, 2026
**Version**: 1.15.1
**Maintained By**: SRE Team
