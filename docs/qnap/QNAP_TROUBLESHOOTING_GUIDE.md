# QNAP Troubleshooting Guide

## Student Management System v1.8.0

Comprehensive troubleshooting guide for resolving common issues on QNAP deployments.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Container Issues](#container-issues)
3. [Database Issues](#database-issues)
4. [Network Issues](#network-issues)
5. [Performance Issues](#performance-issues)
6. [Update/Upgrade Issues](#updateupgrade-issues)
7. [Backup/Restore Issues](#backuprestore-issues)
8. [System Resource Issues](#system-resource-issues)

---

## Installation Issues

### Issue: Port 8080 Already in Use

**Symptoms**:
- Installation script reports port conflict
- Cannot bind to address error
- `docker compose up` fails with port binding error

**Diagnosis**:
```bash
# Check what's using port 8080
netstat -tuln | grep 8080
lsof -i :8080  # If lsof is available
```

**Solution 1**: Change SMS Port
```bash
# Edit .env.qnap
nano .env.qnap

# Change port
SMS_PORT=8081  # Or any available port

# Restart installation
./scripts/qnap/install-qnap.sh
```

**Solution 2**: Stop Conflicting Service
```bash
# Identify service using port
netstat -tulnp | grep 8080

# Stop the service (example: another container)
docker stop CONTAINER_NAME

# Or stop QNAP service
# UI: Control Panel → Applications → Stop Service
```

### Issue: Insufficient Disk Space

**Symptoms**:
- "No space left on device" error
- Build fails during image creation
- Cannot create volume

**Diagnosis**:
```bash
# Check available space
df -h /share/Container/

# Check Docker disk usage
docker system df
```

**Solution**:
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune

# Check space again
df -h /share/Container/

# If still insufficient, free up space in QNAP shares
# Or move Docker to larger volume
```

### Issue: Invalid Secret Key or Password

**Symptoms**:
- Installation completes but login fails
- "Invalid credentials" error
- Backend fails to start with authentication error

**Diagnosis**:
```bash
# Check .env.qnap for placeholder values
cat .env.qnap | grep CHANGE_ME

# Check backend logs
docker compose -f docker-compose.qnap.yml logs backend | grep -i secret
```

**Solution**:
```bash
# Generate proper secrets
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
POSTGRES_PASSWORD=$(openssl rand -hex 32)

# Update .env.qnap
nano .env.qnap
# Replace <CHANGE_ME> values with generated secrets

# Recreate containers
docker compose -f docker-compose.qnap.yml down
docker compose -f docker-compose.qnap.yml up -d
```

### Issue: Docker Compose Version Too Old

**Symptoms**:
- "version not supported" error
- Syntax errors in docker-compose.qnap.yml
- Missing features (profiles, etc.)

**Diagnosis**:
```bash
# Check Docker Compose version
docker compose version

# Should be 2.0 or higher
```

**Solution**:
```bash
# Update Container Station via QNAP App Center
# Or manually install Docker Compose v2

# Verify version after update
docker compose version
```

---

## Container Issues

### Issue: Containers Not Starting

**Symptoms**:
- Services remain in "Restarting" state
- Immediate exit after start
- Health check never passes

**Diagnosis**:
```bash
# Check container status
docker compose -f docker-compose.qnap.yml ps

# Check logs for errors
docker compose -f docker-compose.qnap.yml logs

# Check specific container
docker compose -f docker-compose.qnap.yml logs backend
```

**Common Causes and Solutions**:

**1. Database Connection Failure**:
```bash
# Check if postgres is healthy
docker compose -f docker-compose.qnap.yml ps postgres

# If postgres is down, check its logs
docker compose -f docker-compose.qnap.yml logs postgres

# Restart postgres first
docker compose -f docker-compose.qnap.yml restart postgres

# Wait 30 seconds, then restart backend
sleep 30
docker compose -f docker-compose.qnap.yml restart backend
```

**2. Missing Environment Variables**:
```bash
# Verify all required vars are set
docker compose -f docker-compose.qnap.yml config

# Check for errors in output
# Fix .env.qnap and recreate
docker compose -f docker-compose.qnap.yml up -d --force-recreate
```

**3. Permission Issues**:
```bash
# Check directory permissions
ls -la /share/Container/sms-*

# Fix permissions
chmod -R 755 /share/Container/sms-postgres
chmod -R 755 /share/Container/sms-logs
chmod -R 755 /share/Container/sms-backups

# Recreate containers
docker compose -f docker-compose.qnap.yml down
docker compose -f docker-compose.qnap.yml up -d
```

### Issue: Container Keeps Restarting

**Symptoms**:
- Container starts then exits repeatedly
- Restart count keeps increasing
- Application inaccessible

**Diagnosis**:
```bash
# Check restart count
docker compose -f docker-compose.qnap.yml ps

# View last crash logs
docker compose -f docker-compose.qnap.yml logs --tail=50 backend

# Check exit code
docker inspect sms-backend | grep -i exitcode
```

**Solution**:
```bash
# View crash logs in detail
docker logs sms-backend --tail=100

# Common issues:
# 1. Configuration error - fix .env.qnap
# 2. Database not ready - increase health check timeout
# 3. Port conflict - change port
# 4. Resource limits too low - adjust in docker-compose

# Stop restart loop
docker compose -f docker-compose.qnap.yml down

# Fix the issue, then start again
docker compose -f docker-compose.qnap.yml up -d
```

### Issue: Container "Unhealthy" Status

**Symptoms**:
- Status shows "(unhealthy)" in ps output
- Application intermittently accessible
- Slow response times

**Diagnosis**:
```bash
# Check health status details
docker inspect sms-backend | grep -A 20 Health

# Check health endpoint
curl -v http://localhost:8080/health

# Check backend health directly
docker exec sms-backend curl http://localhost:8000/health
```

**Solution**:
```bash
# Restart unhealthy container
docker compose -f docker-compose.qnap.yml restart backend

# If persists, check resource usage
docker stats --no-stream

# Increase resources if needed (edit docker-compose.qnap.yml)
# Or investigate application logs for errors
docker compose -f docker-compose.qnap.yml logs backend | tail -100
```

---

## Database Issues

### Issue: Cannot Connect to Database

**Symptoms**:
- Backend logs show connection refused
- "FATAL: database does not exist" error
- "password authentication failed" error

**Diagnosis**:
```bash
# Check if postgres is running
docker compose -f docker-compose.qnap.yml ps postgres

# Try connecting manually
docker exec -it sms-postgres psql -U sms_user -d student_management

# Check DATABASE_URL format
docker compose -f docker-compose.qnap.yml exec backend env | grep DATABASE_URL
```

**Solution 1**: Database Not Created
```bash
# Create database manually
docker exec -it sms-postgres psql -U sms_user -d postgres

# In psql:
CREATE DATABASE student_management;
\q

# Restart backend
docker compose -f docker-compose.qnap.yml restart backend
```

**Solution 2**: Wrong Credentials
```bash
# Verify credentials in .env.qnap match
cat .env.qnap | grep POSTGRES

# Update DATABASE_URL if needed
# Format: postgresql://USER:PASSWORD@postgres:5432/DATABASE

# Recreate with correct credentials
docker compose -f docker-compose.qnap.yml up -d --force-recreate
```

**Solution 3**: Connection Timeout
```bash
# Check if postgres is healthy
docker compose -f docker-compose.qnap.yml ps postgres

# Wait longer for postgres to be ready
# Edit docker-compose.qnap.yml - increase health check interval

# Or restart in correct order
docker compose -f docker-compose.qnap.yml down
docker compose -f docker-compose.qnap.yml up -d postgres
sleep 60
docker compose -f docker-compose.qnap.yml up -d backend frontend
```

### Issue: Database Corruption

**Symptoms**:
- Application errors on data access
- Inconsistent data returned
- pg_dump fails with errors

**Diagnosis**:
```bash
# Check for corruption
docker exec sms-postgres psql -U sms_user -d student_management -c "SELECT 1;"

# Check database integrity
docker exec sms-postgres vacuumdb -U sms_user -d student_management --analyze
```

**Solution**:
```bash
# Stop services
docker compose -f docker-compose.qnap.yml down

# Backup current state (even if corrupt)
docker compose -f docker-compose.qnap.yml up -d postgres
sleep 10
docker exec sms-postgres pg_dump -U sms_user -d student_management \
  > /share/Container/sms-backups/corrupt_backup_$(date +%Y%m%d).sql

# Stop postgres
docker compose -f docker-compose.qnap.yml down

# Remove corrupted data volume
docker volume rm sms_postgres_data

# Restore from last good backup
./scripts/qnap/rollback-qnap.sh
```

### Issue: Slow Database Queries

**Symptoms**:
- Application response times slow
- Database CPU usage high
- Timeout errors in logs

**Diagnosis**:
```bash
# Connect to database
docker exec -it sms-postgres psql -U sms_user -d student_management

# Check slow queries
SELECT pid, query, state, wait_event, query_start
FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 seconds';

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solution**:
```bash
# Run vacuum analyze
docker exec sms-postgres vacuumdb -U sms_user -d student_management --analyze --verbose

# Reindex database
docker exec sms-postgres reindexdb -U sms_user -d student_management

# Check if improvement occurred
# If not, consider adding indexes (contact support)
```

---

## Network Issues

### Issue: Cannot Access Application from Browser

**Symptoms**:
- Browser shows "Connection refused" or timeout
- Can ping QNAP but not access application
- Works from QNAP itself but not from network

**Diagnosis**:
```bash
# Test from QNAP
curl http://localhost:8080/health

# Check if container is running
docker compose -f docker-compose.qnap.yml ps

# Check port mapping
docker compose -f docker-compose.qnap.yml ps frontend
```

**Solution 1**: Firewall Blocking
```bash
# Check QNAP firewall status
# UI: Control Panel → Security → Firewall

# Add rule to allow SMS_PORT
# Or temporarily disable firewall to test

# Test again from external machine
curl http://QNAP_IP:8080/health
```

**Solution 2**: Port Not Exposed
```bash
# Verify port mapping in docker-compose.qnap.yml
cat docker-compose.qnap.yml | grep -A 5 "frontend:" | grep ports

# Should show: "8080:80" or "${SMS_PORT}:80"

# If missing, edit docker-compose.qnap.yml and recreate
docker compose -f docker-compose.qnap.yml up -d --force-recreate frontend
```

**Solution 3**: Wrong IP Address
```bash
# Verify QNAP IP address
ip addr show | grep "inet "

# Update .env.qnap with correct IP
nano .env.qnap

# Recreate containers
docker compose -f docker-compose.qnap.yml up -d --force-recreate
```

### Issue: CORS Errors in Browser

**Symptoms**:
- Browser console shows CORS errors
- API calls fail from frontend
- "No 'Access-Control-Allow-Origin' header" error

**Diagnosis**:
```bash
# Check nginx configuration
docker exec sms-frontend cat /etc/nginx/conf.d/default.conf | grep -A 5 cors

# Check backend logs for CORS errors
docker compose -f docker-compose.qnap.yml logs backend | grep -i cors
```

**Solution**:
```bash
# CORS is configured in nginx.qnap.conf
# If issues persist, check if accessing via correct URL

# Should use: http://QNAP_IP:PORT
# Not: http://localhost:PORT (unless on QNAP)

# If custom domain, update nginx config to allow it
# Edit docker/nginx.qnap.conf
# Add to add_header lines:
# add_header 'Access-Control-Allow-Origin' 'https://your-domain.com' always;

# Rebuild frontend
docker compose -f docker-compose.qnap.yml build frontend
docker compose -f docker-compose.qnap.yml up -d --force-recreate frontend
```

### Issue: API Endpoints Return 502 Bad Gateway

**Symptoms**:
- Frontend loads but API calls fail
- 502 error for /api/* requests
- Nginx error logs show "upstream" errors

**Diagnosis**:
```bash
# Check if backend is running
docker compose -f docker-compose.qnap.yml ps backend

# Check backend logs
docker compose -f docker-compose.qnap.yml logs backend

# Check nginx error log
docker compose -f docker-compose.qnap.yml logs frontend | grep error
```

**Solution**:
```bash
# Restart backend
docker compose -f docker-compose.qnap.yml restart backend

# Wait for backend to be healthy
sleep 30

# Test backend directly
docker exec sms-frontend curl http://backend:8000/health

# If still fails, check network
docker network inspect sms-network

# Ensure all containers are on same network
# Recreate if needed
docker compose -f docker-compose.qnap.yml down
docker compose -f docker-compose.qnap.yml up -d
```

---

## Performance Issues

### Issue: High Memory Usage

**Symptoms**:
- QNAP becomes sluggish
- Container Station shows high memory usage
- Out of memory errors in logs

**Diagnosis**:
```bash
# Check overall memory
free -h

# Check per-container memory
docker stats --no-stream

# Check if swap is being used
swapon -s
```

**Solution 1**: Reduce Resource Limits
```bash
# Edit docker-compose.qnap.yml
nano docker-compose.qnap.yml

# Reduce memory limits:
# backend: 1024M -> 512M
# frontend: 512M -> 256M
# postgres: 512M -> 384M

# Apply changes
docker compose -f docker-compose.qnap.yml up -d --force-recreate
```

**Solution 2**: Disable Monitoring
```bash
# Stop monitoring services
./scripts/qnap/manage-qnap.sh
# Select: 11. Disable Monitoring

# This frees ~300MB RAM
```

**Solution 3**: Restart Services
```bash
# Sometimes memory leaks occur
# Periodic restart helps

# Restart all services
docker compose -f docker-compose.qnap.yml restart
```

### Issue: Slow Response Times

**Symptoms**:
- Pages load slowly
- API calls take several seconds
- Timeouts occur

**Diagnosis**:
```bash
# Check response time
time curl http://localhost:8080/health

# Check system load
uptime
top -bn1 | head -20

# Check disk I/O
iostat -x 1 5
```

**Solution 1**: Database Maintenance
```bash
# Run vacuum analyze
docker exec sms-postgres vacuumdb -U sms_user -d student_management --analyze

# Reindex
docker exec sms-postgres reindexdb -U sms_user -d student_management
```

**Solution 2**: Clear Application Cache
```bash
# Restart backend to clear cache
docker compose -f docker-compose.qnap.yml restart backend
```

**Solution 3**: Check Disk Performance
```bash
# Check if disk is healthy
# UI: Control Panel → Storage & Snapshots → Storage → Disk Health

# Check if S.M.A.R.T. reports issues

# Consider moving to SSD if on HDD
```

### Issue: High CPU Usage

**Symptoms**:
- QNAP fans spin up constantly
- System becomes unresponsive
- High CPU in Container Station

**Diagnosis**:
```bash
# Check which container uses CPU
docker stats

# Check QNAP overall CPU
top -bn1 | head -20
```

**Solution**:
```bash
# Reduce worker count in backend
# Edit docker-compose.qnap.yml or Dockerfile.backend.qnap
# Change workers from 2 to 1

# Restart backend
docker compose -f docker-compose.qnap.yml up -d --force-recreate backend

# Add CPU limits if needed
# In docker-compose.qnap.yml:
#   deploy:
#     resources:
#       limits:
#         cpus: '0.5'
```

---

## Update/Upgrade Issues

### Issue: Update Fails

**Symptoms**:
- Update script reports errors
- Services won't start after update
- Version mismatch errors

**Diagnosis**:
```bash
# Check what failed
docker compose -f docker-compose.qnap.yml logs

# Check if backup was created
ls -lt /share/Container/sms-backups/ | head -5
```

**Solution**:
```bash
# Rollback to previous version
./scripts/qnap/rollback-qnap.sh

# Or manual rollback:
# 1. Restore database backup
# 2. Use old Docker images
docker compose -f docker-compose.qnap.yml down
docker compose -f docker-compose.qnap.yml up -d

# Check what went wrong
docker compose -f docker-compose.qnap.yml logs

# Fix issue and retry update
```

### Issue: Migration Fails

**Symptoms**:
- "Alembic migration failed" in backend logs
- Database schema mismatch errors
- Application won't start after update

**Diagnosis**:
```bash
# Check migration status
docker exec sms-backend alembic current

# Check migration logs
docker compose -f docker-compose.qnap.yml logs backend | grep -i alembic

# Check migration history
docker exec sms-backend alembic history
```

**Solution**:
```bash
# If migration stuck, try manual migration
docker exec sms-backend alembic upgrade head

# If fails, restore backup and retry
./scripts/qnap/rollback-qnap.sh

# Contact support with:
# - Migration logs
# - Alembic current version
# - Target version
```

---

## Backup/Restore Issues

### Issue: Backup Fails

**Symptoms**:
- Backup script reports errors
- No backup file created
- Partial backup files

**Diagnosis**:
```bash
# Check disk space
df -h /share/Container/sms-backups/

# Check postgres is running
docker compose -f docker-compose.qnap.yml ps postgres

# Try manual backup
docker exec sms-postgres pg_dump -U sms_user -d student_management > test_backup.sql
```

**Solution**:
```bash
# Free up space
rm /share/Container/sms-backups/old_backup_*.sql.gz

# Restart postgres if unhealthy
docker compose -f docker-compose.qnap.yml restart postgres

# Retry backup
./scripts/qnap/manage-qnap.sh backup-silent
```

### Issue: Restore Fails

**Symptoms**:
- Restore script reports errors
- Database remains in old state
- Corruption after restore

**Diagnosis**:
```bash
# Check backup file integrity
gunzip -t /share/Container/sms-backups/backup_file.sql.gz

# Check if backup is valid SQL
head -50 /share/Container/sms-backups/backup_file.sql
```

**Solution**:
```bash
# Stop services
docker compose -f docker-compose.qnap.yml down

# Try restore with clean database
docker volume rm sms_postgres_data
docker compose -f docker-compose.qnap.yml up -d postgres
sleep 30

# Restore backup
docker exec -i sms-postgres psql -U sms_user -d student_management \
  < /share/Container/sms-backups/backup_file.sql

# Start other services
docker compose -f docker-compose.qnap.yml up -d
```

---

## System Resource Issues

### Issue: QNAP Running Out of Resources

**Symptoms**:
- Overall system slowdown
- Multiple services affected
- QNAP UI becomes unresponsive

**Solution**:
```bash
# Check what's using resources
top -bn1
docker stats --no-stream

# Stop non-essential services temporarily
./scripts/qnap/manage-qnap.sh
# Select: 2. Stop All Services

# Restart QNAP if needed
# UI: Control Panel → System → Restart

# After restart, start SMS services
./scripts/qnap/manage-qnap.sh
# Select: 1. Start All Services
```

---

## Getting Additional Help

### Diagnostic Information to Collect

When reporting issues, collect:

```bash
# System info
uname -a
cat /etc/os-release

# Docker info
docker version
docker compose version

# Container status
docker compose -f docker-compose.qnap.yml ps

# Recent logs
docker compose -f docker-compose.qnap.yml logs --tail=200 > diagnostic_logs.txt

# Resource usage
docker stats --no-stream > resource_usage.txt
df -h > disk_space.txt
free -h > memory_usage.txt

# Configuration (remove sensitive data)
cat .env.qnap | grep -v PASSWORD | grep -v SECRET > config_sanitized.txt
```

### Support Resources

- GitHub Issues: Report bugs with diagnostic info
- Documentation: Check docs/qnap/ for detailed guides
- QNAP Forums: Community support
- Container Station Docs: Official QNAP documentation

---

**Version**: 1.8.0  
**Last Updated**: November 19, 2025  
**Platform**: QNAP NAS with Container Station
