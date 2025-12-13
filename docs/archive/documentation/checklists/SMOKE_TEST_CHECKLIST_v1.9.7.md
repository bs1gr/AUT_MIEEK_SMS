# Smoke Test Checklist $11.9.7

**Purpose**: Comprehensive smoke test checklist to verify operational integrity across all modules before release

**Estimated Time**: 30-45 minutes (full suite)

**Modes**: Docker and Native deployment

**Date**: 2025-12-04

---

## Pre-Test Setup

### Prerequisites

- [ ] Clean environment (or test on fresh VM/container)
- [ ] All dependencies installed (Docker Desktop OR native Python/Node)
- [ ] `.env` files configured (backend and frontend)
- [ ] Database backed up (if testing on existing data)

### Version Verification

```powershell
# Check version file
Get-Content .\VERSION
# Expected: 1.9.7

# Check package.json
Get-Content .\frontend\package.json | Select-String "version"
# Expected: "version": "1.9.7"
```

---

## Part 1: Installation & Startup (10 min)

### Docker Deployment

```powershell
# Clean slate test
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -Prune

# Fresh installation
.\DOCKER.ps1 -Install
```

**Checklist:**

- [ ] Docker image builds successfully (no errors)
- [ ] Container starts without crashes
- [ ] Health check passes: `curl http://localhost:8080/health`
- [ ] Frontend serves at: `http://localhost:8080`
- [ ] API docs available: `http://localhost:8080/docs`
- [ ] No error logs in: `docker logs sms-fullstack`

### Native Deployment

```powershell
# Setup (first time)
.\NATIVE.ps1 -Setup

# Start services
.\NATIVE.ps1 -Start
```

**Checklist:**

- [ ] Backend starts on port 8000
- [ ] Frontend starts on port 5173
- [ ] Health check passes: `curl http://localhost:8000/health`
- [ ] Frontend accessible: `http://localhost:5173`
- [ ] API docs available: `http://localhost:8000/docs`
- [ ] Hot reload working (edit a file, see changes)

---

## Part 2: Authentication & Security (5 min)

### Registration & Login

**Test User:**

- Email: `test@example.com`
- Password: `TestPass123!`
- Role: `admin`

**Actions:**

1. [ ] Navigate to login page
2. [ ] Register new user (observe validation)
3. [ ] Logout
4. [ ] Login with created credentials
5. [ ] Verify JWT token stored in localStorage
6. [ ] Refresh page - user stays logged in (refresh token)

### CSRF Protection

**Docker Mode Only:**

- [ ] CSRF token included in forms (check cookies)
- [ ] POST requests without token rejected (403)
- [ ] Proper CSRF headers sent

### Rate Limiting

**Test:**

```bash
# Rapid-fire requests (should get 429 after threshold)
for i in {1..30}; do curl http://localhost:8080/api/v1/students; done
```

- [ ] Rate limit enforced (429 Too Many Requests)
- [ ] Retry-After header present

---

## Part 3: Core Functionality (15 min)

### Student Management

**Create Student:**

- [ ] Navigate to Students → Add Student
- [ ] Fill form with test data:
  - First Name: Γιάννης
  - Last Name: Παπαδόπουλος
  - Email: <student1@test.com>
  - Student ID: STU001
- [ ] Submit form
- [ ] Student appears in list
- [ ] Search for student by name (Greek characters work)

**Edit Student:**

- [ ] Click edit on created student
- [ ] Change email to: <student1-updated@test.com>
- [ ] Save changes
- [ ] Verify update persists after refresh

**Delete Student:**

- [ ] Soft delete student (mark inactive)
- [ ] Student no longer visible in active list
- [ ] Verify database soft delete (not hard delete)

### Course Management

**Create Course:**

- [ ] Navigate to Courses → Add Course
- [ ] Fill form:
  - Code: CS101
  - Name: Introduction to Programming
  - Description: Beginner course
  - Semester: Fall 2024
- [ ] Submit
- [ ] Course appears in list

**Enroll Student:**

- [ ] Open course details
- [ ] Enroll a student in course
- [ ] Verify enrollment appears in student profile

### Grade Management

**Create Grade:**

- [ ] Navigate to Grades → Add Grade
- [ ] Select student + course
- [ ] Enter grade data:
  - Component: Midterm
  - Weight: 40%
  - Grade: 85/100
  - Date Assigned: 2024-12-01
- [ ] Submit
- [ ] Grade appears in list

**Calculate Final Grade:**

- [ ] Add multiple grade components (e.g., Final 60%, Midterm 40%)
- [ ] Verify weighted calculation correct
- [ ] Check absence penalty applied (if configured)

### Attendance Tracking

**Mark Attendance:**

- [ ] Navigate to Attendance
- [ ] Select date and course
- [ ] Mark students as Present/Absent/Late
- [ ] Submit
- [ ] Attendance recorded correctly

**View Reports:**

- [ ] Generate attendance report for course
- [ ] Export to CSV/Excel
- [ ] Verify file downloads and opens correctly

---

## Part 4: Database & Migrations (5 min)

### Alembic Migrations

```bash
cd backend

# Check migration status
alembic current
# Should show current revision

# Verify no pending migrations
alembic check
# Should report no issues

# Test migration up/down
alembic downgrade -1
alembic upgrade head
```

**Checklist:**

- [ ] Current migration matches VERSION
- [ ] No pending migrations
- [ ] Downgrade works without errors
- [ ] Upgrade restores schema
- [ ] Data preserved during migration cycle

### Database Integrity

```bash
# Check database file
ls data/student_management.db

# SQLite integrity check
sqlite3 data/student_management.db "PRAGMA integrity_check;"
# Expected: ok
```

- [ ] Database file exists and is readable
- [ ] Integrity check passes
- [ ] No corruption detected
- [ ] Backup created in backups/ directory

---

## Part 5: Internationalization (3 min)

### Language Switching

- [ ] Default language loads correctly (browser detection)
- [ ] Switch to Greek (Ελληνικά)
- [ ] All UI elements translated
- [ ] No missing translations (no `i18n.missing` keys)
- [ ] Switch back to English
- [ ] Preference persists after refresh

### Greek Character Support

- [ ] Enter Greek text in student name: Ιωάννης Παπαδόπουλος
- [ ] Search works with Greek characters
- [ ] Export preserves Greek characters (CSV)
- [ ] PDF reports show Greek correctly (if applicable)

---

## Part 6: API Testing (5 min)

### OpenAPI Documentation

- [ ] Access `/docs` endpoint
- [ ] Swagger UI loads
- [ ] Try sample API request (GET /api/v1/students)
- [ ] Response returns valid JSON
- [ ] Error responses include problem details (RFC 7807)

### API Response Format

**Test Request:**

```bash
curl -X GET http://localhost:8080/api/v1/students \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Checklist:**

- [ ] HTTP 200 status
- [ ] JSON response structure correct
- [ ] Pagination metadata included (if applicable)
- [ ] No SQL injection vulnerabilities (test with `' OR 1=1--`)

### Error Handling

**Test Invalid Request:**

```bash
curl -X POST http://localhost:8080/api/v1/students \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

- [ ] HTTP 422 Unprocessable Entity
- [ ] RFC 7807 problem details returned
- [ ] Clear error message
- [ ] No stack traces exposed

---

## Part 7: Performance & Monitoring (5 min)

### Response Times

**Acceptable Thresholds:**

- Health check: < 50ms
- Student list: < 200ms
- Grade calculation: < 500ms
- Complex analytics: < 2s

**Test:**

```bash
# Use curl with timing
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/health

# Or use browser DevTools Network tab
```

- [ ] All endpoints within acceptable ranges
- [ ] No N+1 query issues (check logs for multiple queries)
- [ ] Database connection pool healthy

### Health Checks

```bash
# Detailed health
curl http://localhost:8080/health

# Readiness probe
curl http://localhost:8080/health/ready

# Liveness probe
curl http://localhost:8080/health/live
```

**Checklist:**

- [ ] `/health` returns detailed status
- [ ] Database connection OK
- [ ] Disk space sufficient
- [ ] All services ready

### Logging

- [ ] Logs written to `backend/logs/app.log`
- [ ] Request IDs present in logs (tracing)
- [ ] No critical errors
- [ ] Structured logs in `structured.json`

---

## Part 8: Pre-Commit Quality Gates (3 min)

### Code Quality

```powershell
# Run full quality check
.\COMMIT_READY.ps1 -Quick
```

**Checklist:**

- [ ] Ruff linting passes (no errors)
- [ ] Black formatting passes
- [ ] Mypy type checking passes (baseline)
- [ ] Pytest tests pass (backend)
- [ ] ESLint passes (frontend)
- [ ] No critical security vulnerabilities (pip-audit)

### Test Coverage

```bash
cd backend
pytest --cov=backend --cov-report=term-missing
```

- [ ] Coverage > 70% (target)
- [ ] Critical paths covered
- [ ] No failing tests

---

## Part 9: Docker Specific Tests (5 min)

### Volume Persistence

```powershell
# Stop container
.\DOCKER.ps1 -Stop

# Start again
.\DOCKER.ps1 -Start
```

- [ ] Data persists after container restart
- [ ] Database version matches VERSION file
- [ ] No migration conflicts

### Container Logs

```bash
docker logs sms-fullstack --tail 100
```

- [ ] No critical errors
- [ ] Migrations ran successfully on startup
- [ ] Uvicorn serving on port 8000 internally

### Environment Variables

```bash
docker exec sms-fullstack env | grep SMS_
```

- [ ] `SMS_ENV=production` (Docker)
- [ ] `SMS_EXECUTION_MODE=docker`
- [ ] `AUTH_ENABLED=true`
- [ ] `CSRF_ENABLED=true`

---

## Part 10: Cleanup Scripts (2 min)

### Pre-Release Cleanup

```powershell
# Dry run first
.\scripts\CLEANUP_PRE_RELEASE.ps1 -DryRun

# Execute cleanup
.\scripts\CLEANUP_PRE_RELEASE.ps1
```

**Checklist:**

- [ ] Temp files removed
- [ ] Python cache cleared
- [ ] Log files cleared
- [ ] Important data preserved (data/, backups/, archive/)
- [ ] Space freed reported

---

## Summary Checklist

### Critical (Must Pass)

- [ ] Application starts without errors (Docker + Native)
- [ ] Authentication works (register, login, logout)
- [ ] Core CRUD operations functional (Students, Courses, Grades)
- [ ] Database migrations apply cleanly
- [ ] Health checks pass
- [ ] No critical security vulnerabilities

### Important (Should Pass)

- [ ] Rate limiting enforced
- [ ] CSRF protection active (Docker)
- [ ] i18n working (EN/EL)
- [ ] Greek characters supported
- [ ] API documentation accessible
- [ ] Logs recording correctly

### Nice-to-Have (May Defer)

- [ ] Performance within thresholds
- [ ] Test coverage > 70%
- [ ] No lint warnings
- [ ] Monitoring dashboards (if enabled)

---

## Sign-Off

**Tester**: ___________________________

**Date**: ___________________________

**Environment**: [ ] Docker [ ] Native

**Result**: [ ] PASS [ ] FAIL (details below)

**Critical Issues**:

1. _____________________________________
2. _____________________________________
3. _____________________________________

**Notes**:

---

## Appendix: Automated Test Commands

### Backend Tests

```bash
cd backend
pytest -v
pytest --cov=backend --cov-report=html
```

### Frontend Tests

```bash
cd frontend
npm run test
npm run test:e2e  # Playwright E2E
```

### Full Quality Suite

```powershell
.\COMMIT_READY.ps1 -Full  # 15-20 minutes
```

---

**Version**: 1.0.0
**Last Updated**: 2025-12-04
**Next Review**: $11.9.7 release
