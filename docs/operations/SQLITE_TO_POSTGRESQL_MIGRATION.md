# SQLite to PostgreSQL Migration Guide

## Overview

This guide walks you through migrating your Student Management System from SQLite to PostgreSQL. PostgreSQL is recommended for production deployments due to better concurrency, network access, and scalability.

## Why Migrate to PostgreSQL?

### SQLite Limitations (Production)

- ❌ **Poor Concurrency**: Write operations lock the entire database
- ❌ **Single Machine**: No network access, cannot scale horizontally
- ❌ **Size Limit**: Practical limit around 1TB
- ❌ **No User Management**: No built-in authentication/authorization

### PostgreSQL Benefits (Production)

- ✅ **Excellent Concurrency**: MVCC allows simultaneous reads/writes
- ✅ **Network Access**: Remote connections, load balancing, replication
- ✅ **Unlimited Size**: Handles multi-TB databases efficiently
- ✅ **Rich Feature Set**: Full-text search, JSON support, extensions
- ✅ **Enterprise Ready**: ACID compliance, robust backup/restore

## Prerequisites

- PostgreSQL 12+ installed (or access to hosted instance)
- Backup of your SQLite database
- System downtime window (15-60 minutes depending on data size)

## Migration Steps

### Step 1: Install PostgreSQL

**Windows (Docker Desktop)**:

```powershell
docker run -d `
  --name sms-postgres `
  -e POSTGRES_USER=sms_user `
  -e POSTGRES_PASSWORD=changeme `
  -e POSTGRES_DB=sms_db `
  -p 5432:5432 `
  -v sms_postgres_data:/var/lib/postgresql/data `
  postgres:15-alpine

```text
**Windows (Native)**:

Download from <https://www.postgresql.org/download/windows/>

**Linux (Docker)**:

```bash
docker run -d \
  --name sms-postgres \
  -e POSTGRES_USER=sms_user \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=sms_db \
  -p 5432:5432 \
  -v sms_postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

```text
### Step 2: Backup SQLite Database

```powershell
# Stop the application first

.\DOCKER.ps1 -Stop
# or for native mode:

.\NATIVE.ps1 -Stop

# Create timestamped backup

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "data\student_management.db" "backups\database\student_management_${timestamp}.db"

# Verify backup

if (Test-Path "backups\database\student_management_${timestamp}.db") {
    Write-Host "✓ Backup created successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Backup failed!" -ForegroundColor Red
    exit 1
}

```text
### Step 3: Configure PostgreSQL Connection

Edit `backend/.env`:

```bash
# Database Configuration

DATABASE_ENGINE=postgresql

# PostgreSQL Connection (Option 1: Individual parameters)

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=sms_db
POSTGRES_SSLMODE=prefer

# PostgreSQL Connection (Option 2: Full URL - overrides above)

# DATABASE_URL=postgresql://sms_user:changeme@localhost:5432/sms_db

# Optional: Connection pooling (auto-configured, but can override)

# SQLALCHEMY_POOL_SIZE=20
# SQLALCHEMY_MAX_OVERFLOW=10

# SQLALCHEMY_POOL_RECYCLE=3600

```text
**Security Best Practices**:

```bash
# Generate strong password

python -c "import secrets; print(secrets.token_urlsafe(32))"

# For production, use environment variables instead of .env file

export POSTGRES_PASSWORD="your_generated_password"

```text
### Step 4: Export SQLite Data

Install `pgloader` (recommended) or use manual export:

**Option A: Using pgloader (Recommended)**:

```powershell
# Install pgloader (Windows with WSL2 or Docker)

docker run --rm -v ${PWD}:/data dimitri/pgloader:latest `
  pgloader `
  /data/data/student_management.db `
  postgresql://sms_user:changeme@host.docker.internal:5432/sms_db

```text
**Option B: Manual Export with Python**:

```python
# backend/scripts/migrate_sqlite_to_postgres.py

import sqlite3
import psycopg
from datetime import datetime

# Connect to SQLite

sqlite_conn = sqlite3.connect('data/student_management.db')
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()

# Connect to PostgreSQL

pg_conn = psycopg.connect(
    "postgresql://sms_user:changeme@localhost:5432/sms_db"
)
pg_cur = pg_conn.cursor()

# Get all tables

sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in sqlite_cur.fetchall()
          if not row[0].startswith('sqlite_') and row[0] != 'alembic_version']

print(f"Found {len(tables)} tables to migrate: {', '.join(tables)}")

# Migrate each table

for table in tables:
    print(f"Migrating table: {table}")

    # Get column names
    sqlite_cur.execute(f"PRAGMA table_info({table})")
    columns = [col[1] for col in sqlite_cur.fetchall()]

    # Fetch all rows
    sqlite_cur.execute(f"SELECT * FROM {table}")
    rows = sqlite_cur.fetchall()

    if not rows:
        print(f"  → No data in {table}")
        continue

    # Insert into PostgreSQL
    placeholders = ','.join(['%s'] * len(columns))
    insert_sql = f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})"

    for row in rows:
        try:
            pg_cur.execute(insert_sql, tuple(row))
        except Exception as e:
            print(f"  ✗ Error inserting row: {e}")
            pg_conn.rollback()
        else:
            pg_conn.commit()

    print(f"  ✓ Migrated {len(rows)} rows")

# Update sequences for auto-increment columns

for table in tables:
    try:
        pg_cur.execute(f"""
            SELECT setval(
                pg_get_serial_sequence('{table}', 'id'),
                COALESCE((SELECT MAX(id) FROM {table}), 1),
                true
            )
        """)
        pg_conn.commit()
    except Exception as e:
        print(f"  ! Could not update sequence for {table}: {e}")

print("\n✓ Migration completed!")
sqlite_conn.close()
pg_conn.close()

```text
Run migration script:

```powershell
cd backend
python scripts/migrate_sqlite_to_postgres.py

```text
### Step 5: Run Alembic Migrations

```powershell
cd backend

# Check current migration status

alembic current

# Apply all migrations to PostgreSQL

alembic upgrade head

# Verify schema

alembic current

```text
### Step 6: Verify Data Integrity

```powershell
# Start application in test mode

.\NATIVE.ps1 -Backend

# In another terminal, run verification

cd backend
python -c "
from backend.db import init_db, get_session
from backend.models import Student, Course, Grade, Attendance

engine = init_db()
db = get_session(engine)

print('Verifying data migration...')
print(f'Students: {db.query(Student).count()}')
print(f'Courses: {db.query(Course).count()}')
print(f'Grades: {db.query(Grade).count()}')
print(f'Attendance: {db.query(Attendance).count()}')

# Test a query

student = db.query(Student).first()
if student:
    print(f'Sample student: {student.first_name} {student.last_name}')
else:
    print('WARNING: No students found!')

db.close()
print('✓ Verification complete')
"

```text
### Step 7: Production Deployment

**For Docker Mode**:

```powershell
# Update docker-compose configuration to use external PostgreSQL

# Edit docker/docker-compose.yml or set environment variables

$env:DATABASE_ENGINE="postgresql"
$env:POSTGRES_HOST="your-postgres-host"
$env:POSTGRES_PASSWORD="your-secure-password"

# Start application

.\DOCKER.ps1 -Start

```text
**For Native Mode**:

```powershell
# Ensure backend/.env has PostgreSQL configuration

.\NATIVE.ps1 -Start

```text
### Step 8: Performance Tuning

After migration, optimize PostgreSQL:

```sql
-- Connect to database
psql -U sms_user -d sms_db

-- Analyze tables for query planner
ANALYZE;

-- Check indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public';

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Monitor query performance
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

```text
## Rollback Procedure

If migration fails:

```powershell
# Stop application

.\DOCKER.ps1 -Stop

# Restore SQLite from backup

$backupFile = Get-ChildItem "backups\database\student_management_*.db" |
              Sort-Object LastWriteTime -Descending |
              Select-Object -First 1

Copy-Item $backupFile.FullName "data\student_management.db" -Force

# Revert backend/.env

DATABASE_ENGINE=sqlite
# Comment out PostgreSQL settings

# Restart application

.\DOCKER.ps1 -Start

```text
## Performance Comparison

| Metric | SQLite | PostgreSQL |
|--------|--------|------------|
| **Concurrent Writes** | 1 at a time | Unlimited |
| **Connection Limit** | 1 process | 100+ (configurable) |
| **Network Access** | ❌ No | ✅ Yes |
| **Replication** | ❌ No | ✅ Yes |
| **Query Complexity** | Good | Excellent |
| **Full-Text Search** | Basic | Advanced |
| **JSON Support** | Limited | Native JSONB |

## Maintenance Tasks

### Regular Backups (PostgreSQL)

```bash
# Daily backup script

#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sms_db_${DATE}.sql.gz"

# Create backup

pg_dump -U sms_user -d sms_db | gzip > "${BACKUP_FILE}"

# Keep last 30 days

find "${BACKUP_DIR}" -name "sms_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}"

```text
### Monitoring

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('sms_db'));

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries (requires pg_stat_statements extension)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

```text
## Troubleshooting

### Connection Refused

```bash
# Check if PostgreSQL is running

docker ps | grep postgres
# or

sudo systemctl status postgresql

# Check network connectivity

nc -zv localhost 5432

```text
### Authentication Failed

```bash
# Reset password

docker exec -it sms-postgres psql -U postgres -c "ALTER USER sms_user PASSWORD 'new_password';"

```text
### Slow Queries After Migration

```sql
-- Create missing indexes
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_course_id ON grades(course_id);

-- Update statistics
VACUUM ANALYZE;

```text
### Out of Connections

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Increase max_connections (requires restart)
ALTER SYSTEM SET max_connections = 200;
-- Then restart PostgreSQL

-- Or optimize connection pooling in backend/.env
SQLALCHEMY_POOL_SIZE=15
SQLALCHEMY_MAX_OVERFLOW=5

```text
## Support

- **PostgreSQL Documentation**: <https://www.postgresql.org/docs/>
- **SQLAlchemy PostgreSQL Dialect**: <https://docs.sqlalchemy.org/en/20/dialects/postgresql.html>
- **Project Issues**: <https://github.com/bs1gr/AUT_MIEEK_SMS/issues>

## References

- `backend/config.py` - Database configuration
- `backend/models.py` - Connection pooling setup
- `docs/development/ARCHITECTURE.md` - System architecture
- `backend/ENV_VARS.md` - Environment variables
