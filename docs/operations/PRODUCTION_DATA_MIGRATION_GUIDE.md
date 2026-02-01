# Production Data Migration Guide

**Version**: 1.0
**Created**: February 1, 2026
**System Version**: $11.17.6
**Status**: Ready for Execution

---

## 🎯 Purpose

Guide for transitioning from training/sample data to real production data in the Student Management System.

---

## 📊 Current Data Status (Feb 1, 2026)

### Training Data Inventory

**Users** (18 total):
- 3 Admin accounts (admin1-3@school.edu)
- 5 Teacher accounts (teacher1-5@school.edu)
- 10 Student accounts (student1-10@school.edu)

**Courses** (5 total):
- CS101 - Introduction to Computer Science
- CS102 - Data Structures
- WEB201 - Web Development
- DB301 - Database Systems
- NET202 - Computer Networks

**Other Data**:
- Enrollments: 0 (no student-course enrollments created)
- Grades: 0 (no grades recorded)
- Attendance: 0 (no attendance records)

---

## 🗑️ Phase 1: Clean Training Data

### Step 1: Backup Current System

**Create Full Backup** (MANDATORY):
```powershell
# Stop backend to ensure consistent backup
docker stop docker-backend-1

# Create database backup
docker exec docker-postgres-1 pg_dump -U sms_user -d student_management > ./backups/pre-migration-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql

# Restart backend
docker start docker-backend-1
```

**Verify Backup**:
```powershell
# Check backup file exists and has content
Get-ChildItem ./backups/pre-migration-backup-*.sql | Select-Object Name, Length, LastWriteTime
```

### Step 2: Delete Training Accounts

**Option A: API-Based Deletion** (Recommended):
```powershell
# Get admin JWT token
$loginBody = @{ email = "admin1@school.edu"; password = "AdminPass123!" } | ConvertTo-Json
$authResponse = curl -s -X POST "http://localhost:8080/api/v1/auth/login" -H "Content-Type: application/json" -d $loginBody | ConvertFrom-Json
$token = $authResponse.data.access_token

# Delete all training users
$users = curl -s -X GET "http://localhost:8080/api/v1/users/?skip=0&limit=100" -H "Authorization: Bearer $token" | ConvertFrom-Json

foreach ($user in $users.data) {
    if ($user.email -match "^(admin|teacher|student)\d+@school\.edu$") {
        Write-Host "Deleting user: $($user.email)"
        curl -s -X DELETE "http://localhost:8080/api/v1/users/$($user.id)" -H "Authorization: Bearer $token"
    }
}
```

**Option B: Direct Database Deletion** (Faster but bypass application logic):
```powershell
# Execute SQL to delete training users
docker exec -i docker-postgres-1 psql -U sms_user -d student_management -c "
DELETE FROM users WHERE email ~ '^(admin|teacher|student)\d+@school\.edu$';
"
```

### Step 3: Delete Sample Courses

**Via API**:
```powershell
# Get courses
$courses = curl -s -X GET "http://localhost:8080/api/v1/courses/?skip=0&limit=100" -H "Authorization: Bearer $token" | ConvertFrom-Json

# Delete sample courses
foreach ($course in $courses.data) {
    if ($course.course_code -match "^(CS101|CS102|WEB201|DB301|NET202)$") {
        Write-Host "Deleting course: $($course.course_code)"
        curl -s -X DELETE "http://localhost:8080/api/v1/courses/$($course.id)" -H "Authorization: Bearer $token"
    }
}
```

**Via Database**:
```powershell
docker exec -i docker-postgres-1 psql -U sms_user -d student_management -c "
DELETE FROM courses WHERE course_code IN ('CS101', 'CS102', 'WEB201', 'DB301', 'NET202');
"
```

### Step 4: Verify Clean State

```powershell
# Check user count (should be 0 or only real admin accounts)
docker exec -i docker-postgres-1 psql -U sms_user -d student_management -c "
SELECT role, COUNT(*) FROM users GROUP BY role;
"

# Check course count (should be 0)
docker exec -i docker-postgres-1 psql -U sms_user -d student_management -c "
SELECT COUNT(*) FROM courses;
"

# Check for orphaned data
docker exec -i docker-postgres-1 psql -U sms_user -d student_management -c "
SELECT
  (SELECT COUNT(*) FROM enrollments) AS enrollments,
  (SELECT COUNT(*) FROM grades) AS grades,
  (SELECT COUNT(*) FROM attendances) AS attendances;
"
```

---

## 📥 Phase 2: Import Production Data

### Step 1: Prepare Data Sources

**Supported Import Formats**:
- CSV files (recommended for bulk import)
- Excel files (.xlsx)
- JSON files
- Direct API calls (for small datasets)

**Required Data Files**:
1. `users.csv` - Students, teachers, admins
2. `courses.csv` - Course catalog
3. `enrollments.csv` - Student-course mappings
4. `grades.csv` (optional) - Historical grades
5. `attendance.csv` (optional) - Historical attendance

### Step 2: Data Validation

**CSV Format Requirements**:

**users.csv**:
```csv
email,password,role,first_name,last_name,is_active
john.doe@school.edu,SecurePass123!,student,John,Doe,true
jane.smith@school.edu,SecurePass456!,teacher,Jane,Smith,true
admin@school.edu,AdminPass789!,admin,System,Administrator,true
```

**courses.csv**:
```csv
course_code,course_name,description,semester,credits,status
MATH101,Calculus I,Introduction to differential calculus,Fall 2026,4,active
ENG201,English Literature,Survey of British literature,Fall 2026,3,active
```

**enrollments.csv**:
```csv
student_email,course_code,enrollment_date
john.doe@school.edu,MATH101,2026-09-01
john.doe@school.edu,ENG201,2026-09-01
```

### Step 3: Import Users

**Via CSV Import Script**:
```powershell
# Use existing import functionality
cd backend
python -m scripts.import_users --file ../data/users.csv --validate
python -m scripts.import_users --file ../data/users.csv --execute
```

**Via API (for small datasets)**:
```powershell
# Example: Import single user
$newUser = @{
    email = "john.doe@school.edu"
    password = "SecurePass123!"
    role = "student"
    first_name = "John"
    last_name = "Doe"
} | ConvertTo-Json

curl -s -X POST "http://localhost:8080/api/v1/users/" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d $newUser
```

### Step 4: Import Courses

```powershell
# CSV import
cd backend
python -m scripts.import_courses --file ../data/courses.csv --validate
python -m scripts.import_courses --file ../data/courses.csv --execute
```

### Step 5: Import Enrollments

```powershell
# CSV import
cd backend
python -m scripts.import_enrollments --file ../data/enrollments.csv --validate
python -m scripts.import_enrollments --file ../data/enrollments.csv --execute
```

### Step 6: Import Historical Data (Optional)

**Grades**:
```powershell
cd backend
python -m scripts.import_grades --file ../data/grades.csv --execute
```

**Attendance**:
```powershell
cd backend
python -m scripts.import_attendance --file ../data/attendance.csv --execute
```

---

## ✅ Phase 3: Data Verification

### Step 1: Count Verification

```powershell
# Check imported counts
docker exec -i docker-postgres-1 psql -U sms_user -d student_management -c "
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
  (SELECT COUNT(*) FROM users WHERE role = 'teacher') AS teachers,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admins,
  (SELECT COUNT(*) FROM courses) AS courses,
  (SELECT COUNT(*) FROM enrollments) AS enrollments;
"
```

**Expected Results** (example for 500 students, 30 teachers):
```
 students | teachers | admins | courses | enrollments
----------+----------+--------+---------+-------------
      500 |       30 |      3 |      50 |        2500
```

### Step 2: Data Integrity Checks

**Check for Orphaned Enrollments**:
```sql
SELECT e.id, e.student_id, e.course_id
FROM enrollments e
LEFT JOIN users u ON e.student_id = u.id
LEFT JOIN courses c ON e.course_id = c.id
WHERE u.id IS NULL OR c.id IS NULL;
```

**Check for Duplicate Users**:
```sql
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

**Check for Invalid Roles**:
```sql
SELECT role, COUNT(*)
FROM users
WHERE role NOT IN ('admin', 'teacher', 'student', 'viewer')
GROUP BY role;
```

### Step 3: Functional Testing

**Test User Login**:
```powershell
# Try logging in as imported student
$testLogin = @{
    email = "john.doe@school.edu"
    password = "SecurePass123!"
} | ConvertTo-Json

$response = curl -s -X POST "http://localhost:8080/api/v1/auth/login" -H "Content-Type: application/json" -d $testLogin | ConvertFrom-Json

if ($response.success) {
    Write-Host "✓ Login successful for imported user" -ForegroundColor Green
} else {
    Write-Host "✗ Login failed" -ForegroundColor Red
}
```

**Test Course Retrieval**:
```powershell
# Verify courses accessible
$courses = curl -s "http://localhost:8080/api/v1/courses/?skip=0&limit=10" | ConvertFrom-Json
Write-Host "Courses found: $($courses.data.Count)"
```

**Test Enrollment Query**:
```powershell
# Verify student can see enrolled courses
$studentId = 1 # Replace with actual student ID
$enrollments = curl -s "http://localhost:8080/api/v1/students/$studentId/enrollments" -H "Authorization: Bearer $token" | ConvertFrom-Json
Write-Host "Enrollments found: $($enrollments.data.Count)"
```

---

## 🔒 Phase 4: Security & Cleanup

### Step 1: Update Admin Credentials

**Change Default Admin Password**:
```powershell
# Update admin password via API
$passwordUpdate = @{
    current_password = "AdminPass123!"
    new_password = "NewSecurePassword456!"
} | ConvertTo-Json

curl -s -X PUT "http://localhost:8080/api/v1/users/me/password" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d $passwordUpdate
```

### Step 2: Force Password Reset for Imported Users

**If using temporary passwords**:
```sql
-- Mark all users as requiring password change
UPDATE users SET password_reset_required = TRUE WHERE role != 'admin';
```

### Step 3: Audit Log Review

```powershell
# Check audit logs for import activities
docker logs docker-backend-1 | Select-String "import" | Select-Object -Last 50
```

### Step 4: Remove Import Scripts (Optional)

```powershell
# Archive import data files
New-Item -ItemType Directory -Path "./backups/import-data-archive-$(Get-Date -Format 'yyyyMMdd')" -Force
Move-Item "./data/*.csv" "./backups/import-data-archive-$(Get-Date -Format 'yyyyMMdd')/"
```

---

## 📊 Phase 5: Post-Migration Monitoring

### Step 1: Monitor System Performance

**Check Response Times** (first 24 hours):
- Navigate to Grafana: http://localhost:3000
- Check "Application Performance" dashboard
- Verify p95 < 500ms under real user load

### Step 2: Monitor Error Rates

**Check for Import-Related Errors**:
```powershell
docker logs docker-backend-1 | Select-String "ERROR" | Select-Object -Last 100
```

### Step 3: Database Growth Tracking

```sql
-- Check database size
SELECT
  pg_size_pretty(pg_database_size('student_management')) AS db_size,
  pg_size_pretty(pg_total_relation_size('users')) AS users_size,
  pg_size_pretty(pg_total_relation_size('courses')) AS courses_size,
  pg_size_pretty(pg_total_relation_size('enrollments')) AS enrollments_size;
```

### Step 4: Backup Validation

**Verify Post-Migration Backup**:
```powershell
# Create post-migration backup
docker exec docker-postgres-1 pg_dump -U sms_user -d student_management > ./backups/post-migration-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql

# Test restore in separate database (validation only)
docker exec -i docker-postgres-1 psql -U sms_user -c "CREATE DATABASE test_restore;"
docker exec -i docker-postgres-1 psql -U sms_user -d test_restore < ./backups/post-migration-backup-*.sql
docker exec -i docker-postgres-1 psql -U sms_user -c "DROP DATABASE test_restore;"
```

---

## 🚨 Rollback Procedure

### If Migration Fails

**Step 1: Stop Backend**:
```powershell
docker stop docker-backend-1
```

**Step 2: Restore Pre-Migration Backup**:
```powershell
# Drop current database
docker exec -i docker-postgres-1 psql -U sms_user -c "DROP DATABASE student_management;"

# Recreate database
docker exec -i docker-postgres-1 psql -U sms_user -c "CREATE DATABASE student_management;"

# Restore backup
docker exec -i docker-postgres-1 psql -U sms_user -d student_management < ./backups/pre-migration-backup-*.sql
```

**Step 3: Restart Backend**:
```powershell
docker start docker-backend-1
```

**Step 4: Verify Rollback**:
```powershell
# Check that training data is back
curl -s "http://localhost:8080/api/v1/users/?skip=0&limit=100" | ConvertFrom-Json
```

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Create full system backup
- [ ] Verify backup integrity
- [ ] Prepare import data files (CSV/Excel)
- [ ] Validate data format and structure
- [ ] Schedule maintenance window (if needed)
- [ ] Notify users of planned migration

### Migration
- [ ] Delete training accounts (18 users)
- [ ] Delete sample courses (5 courses)
- [ ] Verify clean state (0 users, 0 courses)
- [ ] Import production users
- [ ] Import production courses
- [ ] Import enrollments
- [ ] Import historical data (grades, attendance - optional)

### Post-Migration
- [ ] Verify user counts match expectations
- [ ] Check for orphaned data
- [ ] Test user logins (sample 10+ users)
- [ ] Test course access
- [ ] Test enrollment queries
- [ ] Update admin credentials
- [ ] Force password reset for imported users (if temp passwords)
- [ ] Create post-migration backup
- [ ] Monitor system performance (24 hours)
- [ ] Review audit logs
- [ ] Archive import data files

### Documentation
- [ ] Document actual user counts
- [ ] Document any migration issues encountered
- [ ] Update system documentation with new user roles
- [ ] Create user onboarding guide (if needed)

---

## 🎯 Success Criteria

**Migration is successful when**:
- ✅ All training data removed (0 training accounts)
- ✅ All production data imported (verified counts)
- ✅ No orphaned records (referential integrity maintained)
- ✅ All imported users can log in
- ✅ System performance within SLA (p95 < 500ms)
- ✅ Error rate < 2%
- ✅ Post-migration backup created and validated
- ✅ No critical errors in logs

---

## 📞 Support

**If Migration Issues Occur**:
1. Check error logs: `docker logs docker-backend-1`
2. Review database logs: `docker logs docker-postgres-1`
3. Consult this guide's troubleshooting section
4. Execute rollback procedure if necessary
5. Contact solo developer for assistance

---

**Document Owner**: Solo Developer
**Review Schedule**: After each migration execution
**Version History**:
- v1.0 (Feb 1, 2026): Initial migration guide

