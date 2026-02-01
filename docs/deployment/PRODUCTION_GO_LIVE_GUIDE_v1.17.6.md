# Production Go-Live Guide - Student Management System $11.17.6

**Version**: 1.0
**Release Date**: January 31, 2026
**System Version**: $11.17.6 (Training Environment Ready)
**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT

---

## 📋 Executive Summary

This guide provides step-by-step procedures to deploy the Student Management System $11.17.6 to production with the pre-configured training environment. The system has been verified with:

- ✅ 18 training accounts (3 admins, 5 teachers, 10 students)
- ✅ 54 courses (4 new training courses + 50 existing)
- ✅ Full authentication and authorization working
- ✅ API endpoints verified
- ✅ Frontend application tested

**Key Features in $11.17.6:**
- Student management (create, update, view, archive)
- Course management (create, view, enrollments)
- Grade tracking (enter, view by student/course)
- Attendance management
- User authentication with JWT
- Role-based access control (Admin, Teacher, Viewer, Student)
- Bilingual interface (English/Greek)
- Rate limiting and security hardening

---

## 🎯 Pre-Deployment Checklist (Do This First)

### Prerequisites

- [ ] PostgreSQL 13+ database ready (or use SQLite for single-server deployments)
- [ ] Docker & Docker Compose installed (for Docker deployment)
- [ ] 2GB minimum available disk space
- [ ] Network connectivity verified
- [ ] SSL certificate acquired (for production HTTPS)
- [ ] Backup of any existing student data
- [ ] Training materials distributed to stakeholders

### Verification Steps

```powershell
# Step 1: Verify system health
curl http://localhost:8000/health

# Step 2: Verify training accounts can login
# (Use credentials from docs/training/TRAINING_CREDENTIALS.md)
# Test with admin, teacher, and student accounts

# Step 3: Verify courses are accessible
curl http://localhost:8000/api/v1/courses

# Step 4: Verify frontend UI loads
# Open http://localhost:5173 in browser
```

---

## 🚀 Deployment Options

### Option A: Docker Deployment (Recommended for Production)

**Timeline**: 15-20 minutes

#### Step 1: Prepare Docker Environment

```powershell
# Navigate to project root
cd D:\SMS\student-management-system

# Create production .env file
$env_content = @"
# Database Configuration
DATABASE_ENGINE=docker
DATABASE_USER=sms_user
DATABASE_PASSWORD=YourSecurePassword123!
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=student_management

# Application Settings
SECRET_KEY=your-secret-key-here-min-32-chars
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=AdminPassword123!
AUTH_MODE=permissive
RATE_LIMIT_ENABLED=true
RATE_LIMIT_READ=60/minute
RATE_LIMIT_WRITE=10/minute

# Frontend Configuration
FRONTEND_URL=https://your-domain.com
API_URL=https://your-domain.com/api/v1

# Monitoring (Optional)
MONITORING_ENABLED=false
"@

# Save to .env file
Set-Content -Path ".env" -Value $env_content
```

#### Step 2: Build and Start Containers

```powershell
# Start Docker deployment
.\DOCKER.ps1 -Start

# Monitor startup (takes 2-3 minutes)
docker-compose logs -f

# Verify all services healthy
docker-compose ps
```

**Expected Output:**
```
STATUS          DESCRIPTION
Up (healthy)    backend container running
Up (healthy)    postgres database ready
Up (healthy)    redis cache running
```

#### Step 3: Verify Production Deployment

```powershell
# Check backend health
curl https://your-domain.com/health

# Test API with training admin account
$login_response = Invoke-RestMethod -Uri "https://your-domain.com/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    email = "admin@example.com"
    password = "AdminPassword123!"
  } | ConvertTo-Json)

Write-Host "Login successful: $($login_response.access_token)"

# Retrieve courses
$headers = @{ Authorization = "Bearer $($login_response.access_token)" }
Invoke-RestMethod -Uri "https://your-domain.com/api/v1/courses" -Headers $headers
```

---

### Option B: Native Deployment (For Testing/Staging)

**Timeline**: 10-15 minutes

#### Step 1: Install Dependencies

```powershell
# Backend dependencies
cd D:\SMS\student-management-system\backend
python -m pip install -r requirements.txt

# Frontend dependencies
cd D:\SMS\student-management-system\frontend
npm install
```

#### Step 2: Configure Native Environment

```powershell
# Create backend/.env with SQLite config
$env_content = @"
DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite:///d:/SMS/student-management-system/data/student_management.db
SECRET_KEY=your-secret-key-here-min-32-chars
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=AdminPassword123!
AUTH_MODE=permissive
"@

Set-Content -Path "backend/.env" -Value $env_content
```

#### Step 3: Start Services

```powershell
# Start both backend and frontend
.\NATIVE.ps1 -Start

# Or start them separately:
# .\NATIVE.ps1 -Backend    (Terminal 1)
# .\NATIVE.ps1 -Frontend   (Terminal 2)
```

---

## 🔐 Security Configuration

### Essential Security Steps (BEFORE Go-Live)

#### 1. Change Default Admin Credentials

```powershell
# Login to admin panel
# Navigate to: Admin → Users → Change Password

# Or via API:
$admin_token = (Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body (@{email="admin@example.com"; password="AdminPassword123!"} | ConvertTo-Json)).access_token

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/users/change-password" `
  -Method POST `
  -Headers @{Authorization="Bearer $admin_token"} `
  -ContentType "application/json" `
  -Body (@{
    old_password = "AdminPassword123!"
    new_password = "YourNewSecurePassword123!"
    confirm_password = "YourNewSecurePassword123!"
  } | ConvertTo-Json)
```

#### 2. Configure SSL/TLS Certificate

```powershell
# For Docker deployments, add to docker-compose.yml:
services:
  backend:
    environment:
      - SECURE_SSL_REDIRECT=true
      - SESSION_COOKIE_SECURE=true
      - CSRF_COOKIE_SECURE=true
```

#### 3. Enable Rate Limiting

```powershell
# Already enabled in $11.17.6, verify configuration:
# Environment variables in .env:
# RATE_LIMIT_ENABLED=true
# RATE_LIMIT_READ=60/minute
# RATE_LIMIT_WRITE=10/minute
```

#### 4. Set Up Backups

```powershell
# PostgreSQL automated backups (add to crontab or Task Scheduler)
$backup_script = @"
docker exec student-management-system-postgres-1 pg_dump -U sms_user student_management | gzip > backups/sms_`$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
"@

# For Windows Task Scheduler:
# - Trigger: Daily at 2:00 AM
# - Action: Run PowerShell script
# - Location: scripts/backup/automated-backup.ps1
```

---

## 📊 Monitoring & Health Checks

### Pre-Production Validation

```powershell
# 1. Backend Health Check
curl http://localhost:8000/health
# Expected: 200 OK with database/migration/system status

# 2. API Documentation
curl http://localhost:8000/docs

# 3. Test All Core Endpoints
# Students
curl http://localhost:8000/api/v1/students -H "Authorization: Bearer $token"

# Courses
curl http://localhost:8000/api/v1/courses -H "Authorization: Bearer $token"

# Grades
curl http://localhost:8000/api/v1/grades -H "Authorization: Bearer $token"

# Attendance
curl http://localhost:8000/api/v1/attendance -H "Authorization: Bearer $token"
```

### Post-Deployment Monitoring

Monitor these metrics:

| Metric | Target | Check Frequency |
|--------|--------|-----------------|
| **API Response Time** | < 500ms p95 | Every 5 min |
| **Error Rate** | < 1% | Every 5 min |
| **Database Connectivity** | 100% | Every 1 min |
| **Disk Space** | > 20% free | Every 1 hour |
| **Memory Usage** | < 80% | Every 5 min |
| **Active Users** | Track for capacity | Every 1 hour |

---

## 🎓 Training Environment Setup

### Training Account Access

All training accounts are pre-configured and ready:

**Admin Accounts** (3 total):
```
admin.training1@mieek.edu.cy / Training2026!
admin.training2@mieek.edu.cy / Training2026!
admin.training3@mieek.edu.cy / Training2026!
```

**Teacher Accounts** (5 total):
```
teacher.demo1@mieek.edu.cy / Training2026!
teacher.demo2@mieek.edu.cy / Training2026!
... (5 total)
```

**Student Accounts** (10 total):
```
student.demo1@mieek.edu.cy / Training2026!
student.demo2@mieek.edu.cy / Training2026!
... (10 total)
```

*Full credentials available in: `docs/training/TRAINING_CREDENTIALS.md` (⚠️ Keep confidential, not in git)*

### Training Sample Data

**Courses Created** (4 sample courses):
- CS102: Data Structures
- WEB201: Web Development
- DB301: Database Systems
- NET202: Computer Networks

Plus 50 additional test courses available in system.

### Using Training Environment

```powershell
# Re-run setup if you need to reset or add accounts:
cd D:\SMS\student-management-system
.\scripts\training\Setup-TrainingEnvironment.ps1 -Mode full -Verify

# Available modes:
# -Mode minimal   : Creates only basic structure (3 courses, 5 users)
# -Mode full      : Creates complete training environment (54 courses, 18 users)
# -Mode reset     : Clears and recreates (destructive, data loss)
```

---

## 🔄 Migration Path (Existing Systems)

If migrating from an older version or different system:

### Data Migration Steps

```powershell
# Step 1: Back up existing data
$date = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -Path "data/student_management.db" -Destination "backups/student_management.$date.bak"

# Step 2: Run migrations
cd backend
alembic upgrade head

# Step 3: Seed training data (optional)
python seed_database.py
```

### User Account Migration

```powershell
# Create mapping of old → new user accounts
$user_mapping = @{
    "old_admin@university.com" = "admin.training1@mieek.edu.cy"
    # ... additional mappings
}

# Import users via API (requires admin token)
foreach ($old, $new in $user_mapping.GetEnumerator()) {
    # POST /api/v1/admin/users with new account details
}
```

---

## 📞 Troubleshooting

### Common Deployment Issues

**Issue: Port 8000 already in use**
```powershell
# Kill existing process
Stop-Process -Name python -Force -ErrorAction SilentlyContinue

# Or find what's using port 8000:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Issue: Database connection timeout**
```powershell
# Check PostgreSQL service:
docker-compose ps postgres
# or
Get-Service -Name PostgreSQL*

# Test connection:
psql -h localhost -U sms_user -d student_management
```

**Issue: Frontend can't reach API**
```powershell
# Verify CORS configuration in backend
# Check FRONTEND_URL and API_URL environment variables

# Test API directly:
curl http://localhost:8000/api/v1/courses
```

**Issue: Training accounts not working**
```powershell
# Re-create training environment:
.\scripts\training\Setup-TrainingEnvironment.ps1 -Mode full

# Or manually create admin:
$admin_data = @{
    email = "admin@example.com"
    password = "AdminPassword123!"
    full_name = "System Administrator"
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/users" `
  -Method POST `
  -ContentType "application/json" `
  -Body $admin_data
```

---

## ✅ Post-Deployment Verification

### Day 1 Checklist

- [ ] All containers/services running and healthy
- [ ] Admin can login with secure password
- [ ] Teachers can view assigned courses and grades
- [ ] Students can view their own grades and attendance
- [ ] API endpoints responding with < 500ms latency
- [ ] Error logs clean (no 500 errors)
- [ ] Backups executing successfully
- [ ] Monitoring dashboards showing data

### Day 1 Validation

```powershell
# Run end-to-end validation script
.\scripts\validation\verify-production-deployment.ps1

# Check error logs
docker-compose logs backend | Select-String ERROR

# Verify database health
docker exec student-management-system-postgres-1 pg_isready

# Check disk space
Get-Volume -DriveLetter D | Select-Object SizeRemaining, Size
```

---

## 📈 Performance Expectations

**Expected Performance Metrics ($11.17.6):**

| Operation | Response Time | Success Rate |
|-----------|---------------|--------------|
| List Students | 100-300ms | 99.9% |
| Create Grade | 200-400ms | 99.8% |
| Search Students | 150-350ms | 99.9% |
| Export to Excel | 500-800ms | 99.5% |
| Authentication | 50-100ms | 99.99% |

**System Capacity:**
- Concurrent Users: 50-100 (SQLite), 500+ (PostgreSQL)
- Max Students: 10,000 (SQLite), 1M+ (PostgreSQL)
- Max Courses: 500 (SQLite), 100K+ (PostgreSQL)

---

## 🚀 Next Steps (After Go-Live)

### Week 1 Post-Deployment

- Monitor system stability and user feedback
- Address any performance issues
- Validate user workflows
- Document any customizations made

### Future Upgrades

To upgrade to **$11.17.6** (includes Analytics Dashboard):
```powershell
.\DOCKER.ps1 -Update

# Or for native:
git pull origin main
npm --prefix frontend install
cd backend && alembic upgrade head
```

---

## 📞 Support Resources

| Resource | Location |
|----------|----------|
| **API Documentation** | `http://localhost:8000/docs` |
| **User Guide** | `docs/user/USER_GUIDE_COMPLETE.md` |
| **Admin Guide** | `docs/admin/RBAC_OPERATIONS_GUIDE.md` |
| **Troubleshooting** | `docs/deployment/FRESH_DEPLOYMENT_TROUBLESHOOTING.md` |
| **Training Materials** | `docs/training/TRAINING_DELIVERY_CHECKLIST.md` |

---

## 📝 Deployment Sign-Off

```
System Version:           $11.17.6
Deployment Date:          [YYYY-MM-DD]
Deployment By:            [NAME]
Environment:              [staging/production]
Database:                 [SQLite/PostgreSQL]
Training Accounts:        18 (3 admin, 5 teacher, 10 student)
Courses Available:        54 (including 4 training courses)
Go-Live Status:           [Ready/Not Ready]
```

---

**Document Version**: 1.0
**Last Updated**: January 31, 2026
**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT
**Next Review**: February 28, 2026

