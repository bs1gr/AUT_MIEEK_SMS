# Database Migration Guide: SQLite to PostgreSQL

**Version**: 1.11.1
**Date**: 2025-12-11
**Status**: Complete Reference Guide

This guide provides step-by-step instructions for migrating the Student Management System database from SQLite (development/small deployments) to PostgreSQL (production scale).

---

## 1. Overview

### Why Migrate to PostgreSQL?

| Aspect | SQLite | PostgreSQL |
|--------|--------|-----------|
| **Concurrency** | Poor (file locks) | Excellent (MVCC) |
| **Connection Pooling** | Limited | Full support |
| **Scalability** | Single-file limit (~100GB) | Virtually unlimited |
| **Performance** | Good for <1000 concurrent users | Optimized for 10,000+ users |
| **Transactions** | Basic | Advanced (ACID, isolation levels) |
| **Replication** | Not supported | Built-in streaming replication |
| **Backup/Recovery** | Manual file backup | Automated with WAL archiving |
| **Production Readiness** | Development only | Enterprise grade |

**Current SMS Status**: SQLite is production-safe for up to 500 concurrent users with proper connection pooling.

---

## 2. Pre-Migration Checklist

### Prerequisites

- [ ] PostgreSQL 14+ installed and running
- [ ] `psycopg2` Python package installed (`pip install psycopg2-binary`)
- [ ] `pgloader` tool available (or manual migration method)
- [ ] Full backup of current SQLite database
- [ ] Maintenance window scheduled (30 min - 2 hours)
- [ ] DNS/connection string updated in deployment environment
- [ ] Rollback plan confirmed

### Backup Current Data

```bash
# Create backup of SQLite database
cd backend
cp data/student_management.db backups/student_management.db.pre-postgres-migration.$(date +%s).bak

# Verify backup
sqlite3 backups/student_management.db.pre-postgres-migration.*.bak "SELECT COUNT(*) FROM students;"
```

---

## 3. PostgreSQL Setup

### 3.1 Install PostgreSQL

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS**:
```bash
brew install postgresql
brew services start postgresql
```

**Windows**:
- Download from https://www.postgresql.org/download/windows/
- Run installer with default settings
- Note the password for `postgres` superuser

**Docker**:
```bash
docker run --name sms-postgres \
  -e POSTGRES_USER=sms_user \
  -e POSTGRES_PASSWORD=sms_password \
  -e POSTGRES_DB=sms_db \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  -d postgres:15
```

### 3.2 Create SMS Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create user and database
CREATE USER sms_user WITH PASSWORD 'secure_password_here'; # pragma: allowlist secret
export DATABASE_URL="postgresql://sms_user:sms_password@localhost:5432/sms_db" # pragma: allowlist secret
CREATE DATABASE sms_db OWNER sms_user;
GRANT ALL PRIVILEGES ON DATABASE sms_db TO sms_user;

# Exit psql
\q
```

### 3.3 Verify Connection

```bash
psql -h localhost -U sms_user -d sms_db -c "SELECT 1;"
# Expected output: 1
```

---

## 4. Data Migration Methods

### Method A: Using pgloader (Recommended - Automated)

**Advantage**: Fastest, handles all data types, minimal manual work

#### Installation

```bash
# macOS
brew install pgloader

# Ubuntu/Debian
sudo apt-get install pgloader

# Or Docker
docker run --rm -it dimitreOliveira/pgloader pgloader --version
```

#### Migration

```bash
# Create migration file: sqlite_to_postgres.load
cat > sqlite_to_postgres.load << 'EOF'
LOAD DATABASE
  FROM sqlite:///absolute/path/to/data/student_management.db
  INTO postgresql://sms_user:sms_password@localhost:5432/sms_db # pragma: allowlist secret
  WITH include drop, create tables, create indexes, reset sequences
EXCLUDING TABLE NAMES MATCHING 'alembic_version'
;
EOF

# Run migration
pgloader sqlite_to_postgres.load

# Monitor output for errors
```

**Expected Output**:
```
[2025-12-11 15:30:00] Total execution time: 45.2s
Rows read: 5,342
Rows written: 5,342
```

---

### Method B: Manual Migration (Educational / Debugging)

**Advantage**: Full control, good for understanding data structure

#### 1. Export SQLite Schema

```bash
# Get schema from SQLite
sqlite3 data/student_management.db ".schema" > schema.sql

# View Alembic migration files for reference
ls -la backend/migrations/versions/
```

#### 2. Create PostgreSQL Schema via Alembic

```bash
# Update config to use PostgreSQL
# In .env or environment:
export DATABASE_URL="postgresql://sms_user:sms_password@localhost:5432/sms_db" # pragma: allowlist secret

# Run migrations on empty PostgreSQL DB
cd backend
alembic upgrade head

# Verify tables created
psql -U sms_user -d sms_db -c "\dt"
# Should show: students, courses, grades, attendance, etc.
```

#### 3. Export Data from SQLite

```bash
# For each table, export as CSV
sqlite3 -header -csv data/student_management.db "SELECT * FROM students;" > students.csv
sqlite3 -header -csv data/student_management.db "SELECT * FROM courses;" > courses.csv
sqlite3 -header -csv data/student_management.db "SELECT * FROM grades;" > grades.csv
sqlite3 -header -csv data/student_management.db "SELECT * FROM attendance;" > attendance.csv
# Repeat for all tables...
```

#### 4. Import Data to PostgreSQL

```bash
# Connect to PostgreSQL database
psql -U sms_user -d sms_db

# Import each table (disable constraints temporarily)
\copy students(id, student_id, first_name, last_name, email, ...) FROM 'students.csv' WITH CSV HEADER;
\copy courses(id, course_code, course_name, semester, ...) FROM 'courses.csv' WITH CSV HEADER;
\copy grades(id, student_id, course_id, grade, ...) FROM 'grades.csv' WITH CSV HEADER;
\copy attendance(id, student_id, course_id, session_date, ...) FROM 'attendance.csv' WITH CSV HEADER;

# Verify counts match
SELECT COUNT(*) FROM students;  -- Should match SQLite count
SELECT COUNT(*) FROM courses;
SELECT COUNT(*) FROM grades;

# Update sequences
SELECT setval('students_id_seq', (SELECT MAX(id) FROM students) + 1);
SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses) + 1);
-- Repeat for all tables...
```

---

## 5. Connection Configuration

### Update Application Config

**Backend (.env file)**:
```bash
# Old SQLite (if using file-based):
# DATABASE_URL=sqlite:///./data/student_management.db

# New PostgreSQL:
DATABASE_URL=postgresql://sms_user:sms_password@postgres.example.com:5432/sms_db  # pragma: allowlist secret

# Optional: Connection pooling tuning
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_RECYCLE=3600
```

**Backend code (`backend/db.py`)**:
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Pool configuration automatically switches based on DB type
if database_url.startswith("postgresql"):
    engine = create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=3600
    )
else:  # SQLite
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
```

### Update Docker Deployment

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sms_db
      POSTGRES_USER: sms_user
      POSTGRES_PASSWORD: sms_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sms_user -d sms_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://sms_user:sms_password@postgres:5432/sms_db  # pragma: allowlist secret
      DB_POOL_SIZE: 20
      DB_MAX_OVERFLOW: 10
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8080:8080"

volumes:
  postgres_data:
```

---

## 6. Verification & Testing

### 6.1 Data Integrity Checks

```bash
# Query counts from PostgreSQL
psql -U sms_user -d sms_db << 'EOF'
SELECT
  (SELECT COUNT(*) FROM students) as student_count,
  (SELECT COUNT(*) FROM courses) as course_count,
  (SELECT COUNT(*) FROM grades) as grade_count,
  (SELECT COUNT(*) FROM attendance) as attendance_count,
  (SELECT COUNT(*) FROM course_enrollments) as enrollment_count;
EOF

# Compare with SQLite counts
sqlite3 data/student_management.db << 'EOF'
SELECT
  (SELECT COUNT(*) FROM students) as student_count,
  (SELECT COUNT(*) FROM courses) as course_count,
  (SELECT COUNT(*) FROM grades) as grade_count,
  (SELECT COUNT(*) FROM attendance) as attendance_count,
  (SELECT COUNT(*) FROM course_enrollments) as enrollment_count;
EOF
```

**Expected**: Counts should match exactly.

### 6.2 Data Sampling

```bash
# Compare sample records
psql -U sms_user -d sms_db -c "SELECT * FROM students LIMIT 5;"
sqlite3 data/student_management.db "SELECT * FROM students LIMIT 5;"

# Check for NULLs, encoding issues
psql -U sms_user -d sms_db -c "SELECT * FROM students WHERE email IS NULL OR first_name IS NULL;"
```

### 6.3 Smoke Tests

```bash
# Run backend smoke tests with new database
cd backend
pytest tests/test_students_router.py -v
pytest tests/test_courses_router.py -v
pytest tests/test_grades_router.py -v
```

### 6.4 Performance Baseline

```bash
# Query timing on PostgreSQL
psql -U sms_user -d sms_db -c "\timing on"
SELECT COUNT(*) FROM grades WHERE student_id = 1;
SELECT * FROM students WHERE email = 'john@example.com';

# Compare with SQLite
sqlite3 data/student_management.db ".timer on"
SELECT COUNT(*) FROM grades WHERE student_id = 1;
SELECT * FROM students WHERE email = 'john@example.com';
```

**Expected**: PostgreSQL should be ≥2x faster for large datasets.

---

## 7. Rollback Procedure

### If Migration Fails

```bash
# 1. Stop application
docker-compose down  # or equivalent for your deployment

# 2. Restore database connection to SQLite
# Edit .env:
# DATABASE_URL=sqlite:///./data/student_management.db

# 3. Verify SQLite backup is intact
sqlite3 backups/student_management.db.pre-postgres-migration.*.bak "SELECT COUNT(*) FROM students;"

# 4. Restart application
docker-compose up

# 5. Notify users of rollback
```

### If PostgreSQL Runs Into Issues Post-Migration

```bash
# 1. Identify the issue
psql -U sms_user -d sms_db -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# 2. Check logs
docker logs postgres | tail -50

# 3. Check connections
psql -U sms_user -d sms_db -c "SELECT COUNT(*) FROM pg_stat_activity;"

# 4. If connection pool exhausted:
# Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND pid <> pg_backend_pid();
```

---

## 8. Optimization After Migration

### Create Indexes

PostgreSQL needs explicit indexes on frequently-queried columns:

```sql
-- Students
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_is_active ON students(is_active);

-- Courses
CREATE INDEX idx_courses_course_code ON courses(course_code);
CREATE INDEX idx_courses_is_active ON courses(is_active);

-- Grades
CREATE INDEX idx_grades_student_id_course_id ON grades(student_id, course_id);
CREATE INDEX idx_grades_date_submitted ON grades(date_submitted);

-- Attendance
CREATE INDEX idx_attendance_student_id_course_id ON attendance(student_id, course_id);
CREATE INDEX idx_attendance_session_date ON attendance(session_date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Verify indexes
SELECT * FROM pg_indexes WHERE tablename = 'grades';
```

### Analyze Statistics

```sql
-- Update table statistics for query planner
ANALYZE students;
ANALYZE courses;
ANALYZE grades;
ANALYZE attendance;
ANALYZE course_enrollments;

-- Check planner stats
SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables;
```

### Enable Slow Query Log

```sql
-- In PostgreSQL config (postgresql.conf):
log_min_duration_statement = 1000  -- Log queries > 1 second

-- View slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## 9. Connection Pooling Tuning

### PgBouncer (Recommended for High Load)

```bash
# Install
sudo apt-get install pgbouncer  # Ubuntu
brew install pgbouncer           # macOS

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
sms_db = host=localhost port=5432 dbname=sms_db user=sms_user password=sms_password

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3

# Start PgBouncer
pgbouncer -d -c /etc/pgbouncer/pgbouncer.ini
```

### Application-Level Pooling (SQLAlchemy)

Already configured in backend (see Section 5).

---

## 10. Monitoring & Maintenance

### Daily Checks

```bash
# Connection count
psql -U sms_user -d sms_db -c "SELECT count(*) FROM pg_stat_activity;"

# Cache hit ratio (should be >99%)
psql -U sms_user -d sms_db << 'EOF'
SELECT
  sum(heap_blks_read) as heap_read, sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
EOF

# Dead rows (should be <10% of total)
SELECT relname, n_live_tup, n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio
FROM pg_stat_user_tables
ORDER BY dead_ratio DESC;
```

### Weekly Maintenance

```bash
# Vacuum (removes dead rows)
VACUUM ANALYZE;

# Reindex if needed
REINDEX TABLE students;
REINDEX TABLE grades;

# Check for missing indexes
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

### Monthly Tasks

```bash
# Full backup
pg_dump -U sms_user -d sms_db -Fc > sms_db_backup_$(date +%Y%m%d).dump

# Verify backup
pg_restore --list sms_db_backup_*.dump | head -20

# Archive old backups
tar czf sms_backups_archive_$(date +%Y%m).tar.gz sms_db_backup_*.dump
```

---

## 11. Troubleshooting

| Issue | Symptom | Solution |
|---|---|---|
| **Connection refused** | `psql: could not connect to server` | Check PostgreSQL running (`pg_isready`), verify credentials |
| **Encoding mismatch** | Greek characters show as `?` | Ensure UTF-8 encoding in both SQLite export and PostgreSQL import |
| **Sequence mismatch** | Insert fails with "duplicate key" | Run `SELECT setval('table_id_seq', MAX(id)+1)` |
| **Missing indexes** | Queries slow after migration | Run `CREATE INDEX` commands from Section 8 |
| **Connection pool exhausted** | "too many connections" error | Increase `max_connections` in postgresql.conf or use PgBouncer |
| **Disk space** | Migration hangs or fails | Ensure `/var/lib/postgresql` has ≥2x current DB size free |

---

## 12. Timeline Estimate

| Phase | Task | Duration |
|---|---|---|
| **Preparation** | Setup PostgreSQL, backup, config | 15 min |
| **Migration** | pgloader or manual export/import | 10-30 min (depends on data size) |
| **Verification** | Data integrity checks, testing | 20 min |
| **Optimization** | Indexes, analyze, tuning | 15 min |
| **Monitoring** | Verify performance, logs | 10 min |
| **Total** | | **70-90 minutes** |

---

## 13. References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgloader Documentation](https://pgloader.io/)
- [SQLAlchemy PostgreSQL Guide](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)
- Backend database configuration in `.env` or environment variables
- Alembic migrations in `backend/migrations/` directory

---

**Last Updated**: 2025-12-11
**Maintained By**: DevOps Team
**Next Review**: 2025-12-25
