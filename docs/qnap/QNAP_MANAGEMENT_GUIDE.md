# QNAP Management Guide

## Student Management System

Complete guide for managing and maintaining the Student Management System on QNAP NAS.

---

## Table of Contents

1. [Management Script Overview](#management-script-overview)
2. [Daily Operations](#daily-operations)
3. [Backup and Restore](#backup-and-restore)
4. [Monitoring and Logs](#monitoring-and-logs)
5. [Updates and Upgrades](#updates-and-upgrades)
6. [Performance Optimization](#performance-optimization)
7. [Maintenance Tasks](#maintenance-tasks)
8. [Common Operations](#common-operations)

---

## Management Script Overview

The `manage-qnap.sh` script provides an interactive menu for all management operations.

### Launching Management Menu

```bash
# SSH into QNAP
ssh admin@YOUR_QNAP_IP

# Navigate to installation directory
cd /share/Container/sms-app

# Launch management menu
./scripts/qnap/manage-qnap.sh
```

### Menu Options

```text
Student Management System - QNAP Management Menu
=================================================
1.  Start All Services
2.  Stop All Services
3.  Restart All Services
4.  View Service Status
5.  Backup Database
6.  Restore Database
7.  View Logs (All Services)
8.  View Logs (Specific Service)
9.  Update Application
10. Enable Monitoring
11. Disable Monitoring
12. Docker Cleanup
13. Exit
```

---

## Daily Operations

### Starting Services

**Using Management Script**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 1. Start All Services
```

**Using Docker Compose**:

```bash
docker compose -f docker-compose.qnap.yml up -d
```

**Start Specific Service**:

```bash
docker compose -f docker-compose.qnap.yml up -d backend
```

### Stopping Services

**Using Management Script**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 2. Stop All Services
```

**Using Docker Compose**:

```bash
docker compose -f docker-compose.qnap.yml down
```

**Stop Without Removing Containers**:

```bash
docker compose -f docker-compose.qnap.yml stop
```

### Restarting Services

**Restart All**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 3. Restart All Services
```

**Restart Specific Service**:

```bash
docker compose -f docker-compose.qnap.yml restart backend
```

**Restart After Configuration Change**:

```bash
# Edit configuration
nano .env.qnap

# Recreate containers with new config
docker compose -f docker-compose.qnap.yml up -d --force-recreate
```

### Checking Service Status

**Interactive Status**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 4. View Service Status
```

**Quick Status Check**:

```bash
docker compose -f docker-compose.qnap.yml ps
```

**Detailed Container Info**:

```bash
docker compose -f docker-compose.qnap.yml ps --format json
docker inspect sms-backend
```

**Health Status**:

```bash
curl http://localhost:8080/health
```

---

## Backup and Restore

### Manual Database Backup

**Using Management Script** (Recommended):

```bash
./scripts/qnap/manage-qnap.sh
# Select: 5. Backup Database
```

This creates timestamped backup in `/share/Container/sms-backups/`:

- Format: `sms_backup_YYYYMMDD_HHMMSS.sql`
- Automatically compresses with gzip
- Keeps last 30 backups by default

**Using Docker Exec**:

```bash
# Create backup directory if not exists
mkdir -p /share/Container/sms-backups

# Run pg_dump
docker exec sms-postgres pg_dump \
  -U sms_user \
  -d student_management \
  -F c \
  -f /tmp/backup.dump

# Copy from container to host
docker cp sms-postgres:/tmp/backup.dump \
  /share/Container/sms-backups/backup_$(date +%Y%m%d_%H%M%S).dump
```

### Automated Backup Schedule

**Using QNAP Task Scheduler**:

1. Open QNAP UI → Control Panel → System → Task Scheduler
2. Create → User-defined Script
3. Configure:

   - **General**:
     - Task Name: "SMS Daily Backup"
     - User: admin
   - **Schedule**:
     - Frequency: Daily
     - Time: 02:00 AM
   - **Task Settings**:

     ```bash
     #!/bin/bash
     cd /share/Container/sms-app
     ./scripts/qnap/manage-qnap.sh backup-silent
     ```

**Backup Retention Policy**:

```bash
# Edit manage-qnap.sh to adjust retention
# Default: Keep last 30 backups

# Find the backup_database() function and modify:
RETENTION_DAYS=30  # Change as needed
```

### Restoring from Backup

**Using Management Script**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 6. Restore Database
# Choose backup from list
```

**Manual Restore**:

```bash
# List available backups
ls -lh /share/Container/sms-backups/

# Restore specific backup
docker exec -i sms-postgres psql \
  -U sms_user \
  -d student_management \
  < /share/Container/sms-backups/sms_backup_20251119_020000.sql

# Or using pg_restore for custom format
docker exec -i sms-postgres pg_restore \
  -U sms_user \
  -d student_management \
  -c \
  /share/Container/sms-backups/backup_20251119_020000.dump
```

**Restore with Rollback Script**:

```bash
./scripts/qnap/rollback-qnap.sh
# Interactive menu to select and restore backup
```

### Backup Verification

```bash
# Test backup integrity
gzip -t /share/Container/sms-backups/sms_backup_*.sql.gz

# Restore to test database to verify
docker exec sms-postgres createdb -U sms_user test_restore
docker exec -i sms-postgres psql \
  -U sms_user \
  -d test_restore \
  < /share/Container/sms-backups/latest_backup.sql
docker exec sms-postgres dropdb -U sms_user test_restore
```

---

## Monitoring and Logs

### Viewing Logs

**All Services**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 7. View Logs (All Services)
```

**Specific Service**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 8. View Logs (Specific Service)
# Choose: backend, frontend, or postgres
```

**Real-time Logs**:

```bash
# All services
docker compose -f docker-compose.qnap.yml logs -f

# Specific service
docker compose -f docker-compose.qnap.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.qnap.yml logs --tail=100
```

**Application Logs**:

```bash
# Backend logs (stored in volume)
docker exec sms-backend ls -lh /app/logs/

# View application log file
docker exec sms-backend tail -f /app/logs/app.log

# Or from QNAP host
tail -f /share/Container/sms-logs/app.log
```

### Log Rotation

Logs are automatically rotated using the Python logging configuration:

- **Max Size**: 2MB per file
- **Backup Count**: 5 files
- **Total Space**: ~10MB per service

**Manual Log Cleanup**:

```bash
# Clear old logs (keeps last 7 days)
find /share/Container/sms-logs/ -name "*.log.*" -mtime +7 -delete
```

### Monitoring with Grafana (Optional)

**Enable Monitoring**:

```bash
./scripts/qnap/manage-qnap.sh
# Select: 10. Enable Monitoring
```

**Access Grafana**:

- URL: `http://YOUR_QNAP_IP:3000`
- Default credentials: `admin` / `admin`
- **Change password immediately after first login**

**Available Dashboards**:
1. **System Overview**: CPU, Memory, Disk, Network
2. **Application Metrics**: Request rates, response times, errors
3. **Database Performance**: Query statistics, connection pool
4. **Container Health**: Resource usage per container

**Disable Monitoring** (saves ~300MB RAM):

```bash
./scripts/qnap/manage-qnap.sh
# Select: 11. Disable Monitoring
```

### Health Checks

**HTTP Health Endpoint**:

```bash
# Detailed health check
curl http://localhost:8080/health

# Readiness probe
curl http://localhost:8080/health/ready

# Liveness probe
curl http://localhost:8080/health/live
```

**Container Health Status**:

```bash
# Check health status of all containers
docker compose -f docker-compose.qnap.yml ps

# Watch health status continuously
watch -n 5 'docker compose -f docker-compose.qnap.yml ps'
```

---

## Updates and Upgrades

### Application Updates

**Using Management Script** (Recommended):

```bash
./scripts/qnap/manage-qnap.sh
# Select: 9. Update Application
```

This performs:
1. ✅ Pre-update backup
2. ✅ Pull latest images
3. ✅ Graceful service restart
4. ✅ Health verification
5. ✅ Rollback on failure

**Manual Update Process**:

```bash
# 1. Backup current database
./scripts/qnap/manage-qnap.sh backup-silent

# 2. Pull latest code/images
cd /share/Container/sms-app
git pull origin main  # If using git

# 3. Rebuild images
docker compose -f docker-compose.qnap.yml build --pull

# 4. Stop services
docker compose -f docker-compose.qnap.yml down

# 5. Start with new images
docker compose -f docker-compose.qnap.yml up -d

# 6. Verify health
curl http://localhost:8080/health
docker compose -f docker-compose.qnap.yml logs -f
```

### Database Migrations

Migrations run automatically on backend startup via `entrypoint.py`.

**Verify Migration Status**:

```bash
# Check migration logs
docker compose -f docker-compose.qnap.yml logs backend | grep -i migration

# Check current Alembic version
docker exec sms-backend alembic current

# View migration history
docker exec sms-backend alembic history
```

**Manual Migration** (if needed):

```bash
# Run pending migrations
docker exec sms-backend alembic upgrade head

# Rollback one migration
docker exec sms-backend alembic downgrade -1
```

### Rollback After Failed Update

**Using Rollback Script**:

```bash
./scripts/qnap/rollback-qnap.sh
# Select pre-update backup
# Script will restore and restart services
```

**Manual Rollback**:

```bash
# 1. Stop services
docker compose -f docker-compose.qnap.yml down

# 2. Restore database backup
# (see Backup and Restore section)

# 3. Revert to previous images
docker compose -f docker-compose.qnap.yml up -d

# 4. Verify
curl http://localhost:8080/health
```

---

## Performance Optimization

### Resource Limits

**Check Current Usage**:

```bash
# Real-time resource monitoring
docker stats

# One-time snapshot
docker stats --no-stream
```

**Adjust Resource Limits**:

Edit `docker-compose.qnap.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1024M  # Increase if needed
          cpus: '1.0'    # Adjust based on QNAP CPU
        reservations:
          memory: 512M
```

**Apply Changes**:

```bash
docker compose -f docker-compose.qnap.yml up -d --force-recreate
```

### Database Optimization

**Analyze Database Performance**:

```bash
# Connect to PostgreSQL
docker exec -it sms-postgres psql -U sms_user -d student_management

# Check database size
SELECT pg_size_pretty(pg_database_size('student_management'));

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check slow queries
SELECT calls, mean_exec_time, query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Database Maintenance**:

```bash
# Vacuum and analyze (run weekly)
docker exec sms-postgres vacuumdb -U sms_user -d student_management --analyze --verbose

# Reindex (run monthly)
docker exec sms-postgres reindexdb -U sms_user -d student_management
```

### Nginx Optimization

Already optimized in `docker/nginx.qnap.conf`:

- Gzip compression enabled
- Worker processes tuned for NAS (2 workers)
- Connection limits appropriate for home/small office
- Static file caching configured

**Monitor Nginx Performance**:

```bash
# Check Nginx logs
docker compose -f docker-compose.qnap.yml logs frontend | grep nginx

# Access logs
docker exec sms-frontend tail -f /var/log/nginx/access.log

# Error logs
docker exec sms-frontend tail -f /var/log/nginx/error.log
```

### Application Cache

Response caching is enabled by default in the backend.

**Clear Cache**:

```bash
# Restart backend to clear cache
docker compose -f docker-compose.qnap.yml restart backend
```

---

## Maintenance Tasks

### Daily Tasks (Automated)

**Recommended Schedule**: 2:00 AM daily

```bash
#!/bin/bash
# Add to QNAP Task Scheduler

cd /share/Container/sms-app

# Database backup
./scripts/qnap/manage-qnap.sh backup-silent

# Check disk space
df -h /share/Container/ | mail -s "QNAP SMS Disk Usage" admin@example.com
```

### Weekly Tasks

**Recommended Schedule**: Sunday, 3:00 AM

```bash
#!/bin/bash
# Weekly maintenance script

cd /share/Container/sms-app

# Database vacuum
docker exec sms-postgres vacuumdb -U sms_user -d student_management --analyze

# Docker cleanup
docker system prune -f

# Remove old backups (keep last 30 days)
find /share/Container/sms-backups/ -name "*.sql.gz" -mtime +30 -delete

# Clear old logs
find /share/Container/sms-logs/ -name "*.log.*" -mtime +7 -delete
```

### Monthly Tasks

**Recommended Schedule**: 1st day of month, 4:00 AM

```bash
#!/bin/bash
# Monthly maintenance

cd /share/Container/sms-app

# Full database reindex
docker exec sms-postgres reindexdb -U sms_user -d student_management

# Update application (if auto-update enabled)
# ./scripts/qnap/manage-qnap.sh update-silent

# Generate backup archive
tar -czf "/share/Container/sms-backups/monthly_$(date +%Y%m).tar.gz" \
  /share/Container/sms-backups/sms_backup_$(date +%Y%m)*.sql.gz
```

### Disk Space Management

**Monitor Disk Usage**:

```bash
# Check overall space
df -h /share/Container/

# Check per-directory usage
du -sh /share/Container/sms-*

# Find large files
find /share/Container/sms-* -type f -size +100M -exec ls -lh {} \;
```

**Clean Up Space**:

```bash
# Remove old Docker images
docker image prune -a

# Remove old backups
find /share/Container/sms-backups/ -name "*.sql.gz" -mtime +60 -delete

# Clear Docker build cache
docker builder prune -a

# Using management script
./scripts/qnap/manage-qnap.sh
# Select: 12. Docker Cleanup
```

---

## Common Operations

### Changing Configuration

**Update Environment Variables**:

```bash
# Edit .env.qnap
nano .env.qnap

# Recreate containers with new config
docker compose -f docker-compose.qnap.yml up -d --force-recreate

# Verify changes
docker compose -f docker-compose.qnap.yml exec backend env | grep YOUR_VARIABLE
```

### Changing Port

**Change Frontend Port**:

```bash
# 1. Edit .env.qnap
nano .env.qnap
# Change: SMS_PORT=8081

# 2. Restart frontend
docker compose -f docker-compose.qnap.yml up -d --force-recreate frontend

# 3. Update firewall rules if needed
# 4. Access application at new port
```

### Adding Users

**Via Web Interface** (Recommended):
1. Log in as admin
2. Navigate to Users → Add User
3. Fill in user details
4. Assign roles and permissions

**Via Database** (Advanced):

```bash
# Connect to database
docker exec -it sms-postgres psql -U sms_user -d student_management

# Add user (example)
INSERT INTO users (email, username, hashed_password, is_active)
VALUES ('user@example.com', 'newuser', 'HASHED_PASSWORD', true);
```

### Accessing Database

**Using psql**:

```bash
# Interactive session
docker exec -it sms-postgres psql -U sms_user -d student_management

# Run single query
docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT COUNT(*) FROM students;"
```

**Using Database Client**:

- Host: YOUR_QNAP_IP
- Port: 5432 (if exposed in docker-compose)
- Database: student_management
- User: sms_user
- Password: (from .env.qnap)

### Exporting Data

**CSV Export via API**:

```bash
# Export students
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://YOUR_QNAP_IP:8080/api/v1/export/students/csv \
  -o students.csv

# Export grades
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://YOUR_QNAP_IP:8080/api/v1/export/grades/csv \
  -o grades.csv
```

**Database Export**:

```bash
# Full database export
docker exec sms-postgres pg_dump \
  -U sms_user \
  -d student_management \
  -F p \
  > /share/Container/sms-backups/full_export_$(date +%Y%m%d).sql
```

---

## Getting Help

### Quick Reference

```bash
# Service status
docker compose -f docker-compose.qnap.yml ps

# View logs
docker compose -f docker-compose.qnap.yml logs -f

# Restart service
docker compose -f docker-compose.qnap.yml restart SERVICE_NAME

# Backup database
./scripts/qnap/manage-qnap.sh backup-silent

# Check health
curl http://localhost:8080/health

# Management menu
./scripts/qnap/manage-qnap.sh
```

### Documentation

- [Installation Guide](QNAP_INSTALLATION_GUIDE.md) - Initial setup
- [Troubleshooting Guide](QNAP_TROUBLESHOOTING_GUIDE.md) - Problem resolution
- [Security Guide](QNAP_SECURITY.md) - Security best practices
- [Upgrade Guide](QNAP_UPGRADE_GUIDE.md) - Version upgrades
- [Script Documentation](../../scripts/qnap/README.md) - Script reference

---

**Version**: 1.8.0  
**Last Updated**: November 19, 2025  
**Platform**: QNAP NAS with Container Station
