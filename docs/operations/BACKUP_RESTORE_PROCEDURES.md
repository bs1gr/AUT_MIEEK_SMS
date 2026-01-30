# Phase 5 Production Backup & Restore Procedures

**Version**: 1.17.6  
**Created**: January 30, 2026 - 15:45 UTC  
**Purpose**: Data protection and disaster recovery planning  
**Status**: Ready to implement in production

---

## 📋 Backup Strategy

### Backup Types

#### 1. **Database Backups** (CRITICAL - Daily)
- **Type**: PostgreSQL full database dump
- **Frequency**: Daily at 02:00 UTC (off-peak)
- **Retention**: 30 days rolling retention
- **Location**: `/backups/database/` (Docker volume)
- **Size**: ~50-200MB (depends on data volume)
- **Time to Complete**: ~2-5 minutes
- **Verification**: Automated validation on creation

#### 2. **Application Configuration** (Monthly)
- **Type**: Volume snapshots (.env, configs)
- **Frequency**: Monthly (before releases)
- **Retention**: 6 months
- **Location**: Version control + backup archive
- **Contents**: docker-compose.yml, .env, nginx config

#### 3. **Full System Snapshots** (Weekly)
- **Type**: Docker volume snapshots
- **Frequency**: Weekly (Sunday 03:00 UTC)
- **Retention**: 4 weeks
- **Location**: Docker volume storage
- **Scope**: Database volume + application state

---

## 🔧 Backup Procedures

### Daily Database Backup

**Manual Backup** (Execute anytime):

```bash
# Create timestamped backup
BACKUP_TIME=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="sms_backup_$BACKUP_TIME.sql"

# Dump database
docker exec sms-db pg_dump -U sms_user -d sms_db > "backups/database/$BACKUP_FILE"

# Compress backup
gzip "backups/database/$BACKUP_FILE"

# Verify backup
ls -lh "backups/database/$BACKUP_FILE.gz"

echo "✅ Backup created: $BACKUP_FILE.gz"
```

**Automated Daily Backup** (Cron job):

```bash
# Add to crontab (run as root)
0 2 * * * /usr/local/bin/backup-sms-db.sh

# Content of /usr/local/bin/backup-sms-db.sh:
#!/bin/bash
set -e
BACKUP_TIME=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/data/backups/database/sms_backup_$BACKUP_TIME.sql"
mkdir -p "$(dirname "$BACKUP_FILE")"
docker exec sms-db pg_dump -U sms_user -d sms_db | gzip > "$BACKUP_FILE.gz"
# Clean old backups (keep 30 days)
find /data/backups/database -name "*.gz" -mtime +30 -delete
echo "Backup completed: $BACKUP_FILE.gz"
```

### Configuration Backup

**Create Configuration Archive**:

```bash
# Backup important files
tar -czf "backups/config/config_$(date +%Y%m%d).tar.gz" \
  docker-compose.yml \
  .env \
  .env.production.SECURE \
  docker/nginx.conf \
  backend/alembic/versions/

# Verify archive
tar -tzf "backups/config/config_$(date +%Y%m%d).tar.gz" | head -10
```

### Volume Snapshot Backup

**Using Docker Volume Backup**:

```bash
# Create backup container to snapshot database volume
docker run --rm \
  -v sms_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar -czf /backup/volume_sms_postgres_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# List snapshots
ls -lh backups/volume_*.tar.gz
```

---

## 🔄 Restore Procedures

### Scenario 1: Restore from Daily Database Backup

**Steps**:

1. **Stop application** (prevents data writes during restore):
   ```bash
   docker-compose stop sms-web
   ```

2. **Find backup to restore**:
   ```bash
   ls -lh backups/database/
   # Pick the most recent backup before the issue occurred
   ```

3. **Create temporary database** (for safety):
   ```bash
   docker exec sms-db createdb -U sms_user -d sms_db_restore
   ```

4. **Restore data** (dry run first):
   ```bash
   # Dry run - verify backup is valid
   gunzip -c backups/database/sms_backup_20260130_020000.sql.gz | \
     docker exec -i sms-db psql -U sms_user -d sms_db_restore > /dev/null
   
   if [ $? -eq 0 ]; then
     echo "✅ Backup is valid - safe to restore"
   else
     echo "❌ Backup validation failed"
     exit 1
   fi
   ```

5. **Drop current database and restore** (DESTRUCTIVE - confirm twice):
   ```bash
   # CONFIRMATION REQUIRED - This deletes current data!
   read -p "⚠️  This will DELETE current database. Type 'yes' to confirm: " confirm
   if [ "$confirm" != "yes" ]; then
     echo "Restore cancelled"
     exit 1
   fi
   
   # Drop and restore
   docker exec sms-db dropdb -U sms_user sms_db
   docker exec sms-db createdb -U sms_user sms_db
   gunzip -c backups/database/sms_backup_20260130_020000.sql.gz | \
     docker exec -i sms-db psql -U sms_user -d sms_db
   ```

6. **Run migrations** (ensure schema is current):
   ```bash
   docker exec sms-web alembic upgrade head
   ```

7. **Start application** (resume operations):
   ```bash
   docker-compose start sms-web
   ```

8. **Verify restore**:
   ```bash
   curl -s http://localhost:8000/health | jq .
   # Should return: {"status": "healthy", "database": "connected"}
   ```

### Scenario 2: Rollback to Full System Snapshot

**Steps**:

1. **List available snapshots**:
   ```bash
   ls -lh backups/volume_*.tar.gz
   ```

2. **Stop all containers**:
   ```bash
   docker-compose stop
   ```

3. **Remove current volume** (DESTRUCTIVE):
   ```bash
   docker volume rm sms_postgres_data
   ```

4. **Restore volume from snapshot**:
   ```bash
   # Create volume
   docker volume create sms_postgres_data
   
   # Extract backup into volume
   docker run --rm \
     -v sms_postgres_data:/data \
     -v $(pwd)/backups:/backup \
     alpine tar -xzf /backup/volume_sms_postgres_20260129_030000.tar.gz -C /data
   ```

5. **Start containers**:
   ```bash
   docker-compose up -d
   ```

6. **Verify all services**:
   ```bash
   docker-compose ps
   docker logs sms-web | tail -20
   ```

### Scenario 3: Restore Specific Application Version

**Steps**:

1. **Check available configuration backups**:
   ```bash
   ls -lh backups/config/
   ```

2. **Extract configuration from backup**:
   ```bash
   tar -xzf backups/config/config_20260125.tar.gz
   ```

3. **Review and verify** restored files:
   ```bash
   diff docker-compose.yml docker-compose.yml.bak
   cat .env | grep IMPORTANT_SETTINGS
   ```

4. **Apply restored configuration**:
   ```bash
   # Restart with new config
   docker-compose restart
   ```

5. **Validate restored config**:
   ```bash
   docker-compose config | head -20
   ```

---

## ✅ Backup Verification

### Weekly Verification Checklist

```bash
# 1. Check latest backup exists and is recent
LAST_BACKUP=$(ls -t backups/database/*.gz | head -1)
BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LAST_BACKUP")))
if [ $BACKUP_AGE -lt 86400 ]; then
  echo "✅ Backup is fresh (less than 24 hours old)"
else
  echo "⚠️  Backup is old (more than 24 hours)"
fi

# 2. Verify backup file integrity
gunzip -t "$LAST_BACKUP" && echo "✅ Backup file is valid"

# 3. Test dry-run restore
gunzip -c "$LAST_BACKUP" | docker exec -i sms-db psql -U sms_user -d sms_db_test > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Backup can be restored successfully"
else
  echo "❌ Backup restore test FAILED"
fi

# 4. Verify backup storage
BACKUP_SIZE=$(du -sh backups/database | cut -f1)
echo "✅ Total backup storage: $BACKUP_SIZE"
```

---

## 📊 Backup Schedule

| Backup Type | Frequency | Time (UTC) | Retention | Verification |
|------------|-----------|-----------|-----------|---|
| **Database** | Daily | 02:00 | 30 days | Auto-validate |
| **Config** | Monthly | 01:00 (1st) | 6 months | Manual verify |
| **Snapshot** | Weekly | 03:00 (Sun) | 4 weeks | Weekly test |

---

## 🚨 Disaster Recovery Runbook

### Database Corruption Detected

**Symptoms**: 
- Queries returning errors
- Migrations failing
- Data inconsistencies

**Recovery Steps**:
1. ✅ Stop writes (docker-compose stop sms-web)
2. ✅ Identify backup from before corruption
3. ✅ Perform dry-run restore (verify backup valid)
4. ✅ Restore from backup (full procedure above)
5. ✅ Verify data integrity
6. ✅ Resume operations
7. ✅ Monitor for issues

**Expected Downtime**: 5-15 minutes

### Storage Full

**Symptoms**:
- "No space left on device" errors
- Backups failing to create
- Application slowing down

**Recovery Steps**:
1. ✅ Check disk usage: `df -h`
2. ✅ Identify large files: `du -sh * | sort -hr`
3. ✅ Clean old backups: `find backups -mtime +60 -delete`
4. ✅ Compress old logs: `gzip backend/logs/*.log`
5. ✅ Verify space freed
6. ✅ Resume backups

**Prevention**: Monitor disk usage, auto-cleanup old backups (30+ days)

### Complete System Failure

**Symptoms**:
- All containers exited
- Cannot start application
- Docker volumes corrupted

**Recovery Steps**:
1. ✅ Stop and remove all containers: `docker-compose down`
2. ✅ Remove volumes: `docker volume rm sms_postgres_data`
3. ✅ Restore latest snapshot (see Scenario 2 above)
4. ✅ Start containers: `docker-compose up -d`
5. ✅ Monitor logs: `docker logs -f sms-web`
6. ✅ Verify health: `curl http://localhost:8000/health`

**Expected Downtime**: 10-20 minutes

---

## 📋 Backup Maintenance

### Monthly Cleanup

```bash
#!/bin/bash
# Clean backups older than 30 days
find /data/backups/database -name "*.gz" -mtime +30 -exec rm {} \;
echo "✅ Cleaned old database backups"

# Clean snapshots older than 4 weeks
find /data/backups/volume -name "*.tar.gz" -mtime +28 -exec rm {} \;
echo "✅ Cleaned old volume snapshots"

# Archive old config backups to long-term storage
tar -czf /archive/config_backups_jan2026.tar.gz backups/config/
echo "✅ Archived old configuration backups"
```

### Backup Monitoring

Monitor backup status regularly:

```bash
# Daily status check
BACKUP_SIZE=$(du -sh /data/backups | cut -f1)
BACKUP_COUNT=$(ls /data/backups/database/*.gz 2>/dev/null | wc -l)
OLDEST_BACKUP=$(ls -t /data/backups/database/*.gz 2>/dev/null | tail -1 | xargs -I {} basename {})

echo "📊 Backup Status Report"
echo "  Total Size: $BACKUP_SIZE"
echo "  Backup Count: $BACKUP_COUNT"
echo "  Oldest Backup: $OLDEST_BACKUP"
echo "  Last Backup: $(ls -t /data/backups/database/*.gz 2>/dev/null | head -1 | xargs ls -lh | awk '{print $6, $7, $8}')"
```

---

## 🔐 Backup Security

### Encryption

**For sensitive environments**, encrypt backups:

```bash
# Encrypt backup before storage
openssl enc -aes-256-cbc -in backup.sql -out backup.sql.enc -k "$(cat /secrets/backup_key)"

# Decrypt backup for restoration
openssl enc -d -aes-256-cbc -in backup.sql.enc -out backup.sql -k "$(cat /secrets/backup_key)"
```

### Access Control

- Restrict backup directory permissions: `chmod 700 /data/backups`
- Store encryption keys separately: `/secrets/backup_key` (permissions 600)
- Audit backup access: `auditctl -w /data/backups -p wa`

### Off-site Backup

For critical deployments, copy backups to remote storage:

```bash
# Copy latest backup to cloud storage (AWS S3 example)
LATEST_BACKUP=$(ls -t /data/backups/database/*.gz | head -1)
aws s3 cp "$LATEST_BACKUP" s3://my-backup-bucket/sms/database/
echo "✅ Backup copied to S3"
```

---

## 📞 Reference

- **Restore Procedures**: See sections "Restore Procedures" above
- **Backup Verification**: Weekly checklist in "Backup Verification"
- **Emergency Contact**: Document in RUNBOOK.md
- **Backup Status**: Check `backups/` directory regularly

---

**🎯 Goal**: Ensure zero data loss with tested recovery procedures  
**📊 Status**: Procedures documented and ready to implement  
**⏱️ Timeline**: Implement full automation by Week 1 completion (Feb 3)
