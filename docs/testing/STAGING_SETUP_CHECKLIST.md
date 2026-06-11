# Staging Environment Setup Checklist

**Objective:** Prepare staging environment for Phase A validation testing  
**Duration:** 1-2 hours  
**Date:** Before June 10, 2026

---

## Pre-Setup Verification

### Prerequisites Check
- [ ] Staging server access available
- [ ] Production database backups exist
- [ ] Docker available on staging
- [ ] PostgreSQL 13+ available
- [ ] Node.js 18+ available
- [ ] Python 3.10+ available
- [ ] Git access to repository
- [ ] At least 50GB free disk space

---

## Phase 1: Infrastructure Setup (30 minutes)

### Database Preparation

**Step 1: Clone Production Database**
```bash
# Connect to production backup
pg_dump -h prod-db.example.com -U sms -d sms > /tmp/sms_backup.sql

# Restore to staging
psql -h staging-db.example.com -U sms -d sms < /tmp/sms_backup.sql

# Verify restore
psql -h staging-db.example.com -U sms -d sms -c "SELECT COUNT(*) FROM users;"
```

**Step 2: Apply Phase A Migration**
```bash
# Connect to staging backend container
docker exec sms-backend-staging bash

# Run Alembic migration
alembic upgrade head

# Verify table created
psql -c "SELECT * FROM custom_dashboards LIMIT 0;"
```

**Step 3: Database Health Check**
- [ ] custom_dashboards table exists
- [ ] Columns: id, user_id, name, description, configuration, is_default, created_at, updated_at
- [ ] Indexes created on user_id, is_default, created_at
- [ ] Unique constraint on (user_id, name)
- [ ] Foreign key to users table with CASCADE DELETE

### Docker Environment

**Step 4: Build Staging Image**
```bash
# Using Phase A code
git checkout main  # Ensure on Phase A branch

# Build backend image
docker build -t sms:vv1.18.25-staging -f Dockerfile.backend .

# Build frontend image  
docker build -t sms:vv1.18.25-staging -f Dockerfile.frontend .
```

**Step 5: Deploy to Staging**
```bash
# Use docker-compose for staging
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml pull sms:vv1.18.25-staging
docker-compose -f docker-compose.staging.yml up -d
```

**Step 6: Verify Services**
- [ ] Backend running: `curl http://localhost:8000/health`
- [ ] Frontend running: `curl http://localhost/`
- [ ] Database connected: Backend logs show "Database connected"
- [ ] Redis connected (if used): Logs show connection
- [ ] All services healthy: `docker-compose ps`

---

## Phase 2: Code Deployment (30 minutes)

### Backend Deployment

**Step 7: Deploy Backend Code**
```bash
# Pull latest Phase A code
git pull origin main

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start backend
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Verify
curl -s http://localhost:8000/health | jq .
```

**Step 8: Verify Backend Endpoints**
```bash
# Test dashboard endpoints
curl -X GET http://localhost:8000/api/v1/dashboards \
  -H "Authorization: Bearer <TEST_TOKEN>"

# Should return empty array (no dashboards yet)
# Response: {"data": []}
```

### Frontend Deployment

**Step 9: Deploy Frontend Code**
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build for production
npm run build

# Deploy dist folder
cp -r dist/* /var/www/staging/

# Verify in browser
# http://staging-frontend/
```

**Step 10: Verify Frontend**
- [ ] Analytics page loads: `/analytics`
- [ ] Dashboard manager link visible: "Manage" button
- [ ] No console errors (F12 DevTools)
- [ ] All charts render (scroll down)
- [ ] Dashboard selector shows (if dashboards exist)

---

## Phase 3: Test Data Setup (30 minutes)

### Create Test Datasets

**Step 11: Create Test Users**
```bash
# Use admin credentials to create test users
# Via API or directly in database

# Create 5 test users for UAT
INSERT INTO users (email, first_name, last_name, password_hash) VALUES
('tester1@staging.local', 'Test', 'User1', 'hash1'),
('tester2@staging.local', 'Test', 'User2', 'hash2'),
('tester3@staging.local', 'Test', 'User3', 'hash3'),
('tester4@staging.local', 'Test', 'User4', 'hash4'),
('tester5@staging.local', 'Test', 'User5', 'hash5');
```

**Step 12: Create Sample Dashboards (for testing)**
```bash
# Create 3 sample dashboards per user
INSERT INTO custom_dashboards 
  (user_id, name, description, configuration, is_default) 
VALUES
(1, 'Performance Dashboard', 'Focus on student performance',
 '{"charts": ["performance", "gradeDistribution", "scatter"]}', true),
(1, 'Attendance Dashboard', 'Track attendance patterns',
 '{"charts": ["attendance", "trend", "heatmap"]}', false),
(1, 'Analysis Dashboard', 'Statistical analysis',
 '{"charts": ["scatter", "heatmap", "boxplot", "sankey"]}', false);
```

**Step 13: Verify Test Data**
- [ ] 5 test users created and accessible
- [ ] 3+ sample dashboards per user
- [ ] Test login works for each user
- [ ] Sample data appears in analytics

---

## Phase 4: Testing Environment Configuration (30 minutes)

### E2E Test Setup

**Step 14: Configure Playwright**
```bash
# Install Playwright
npm install @playwright/test

# Configure for staging
# Update playwright.config.ts:
# baseURL: 'http://staging-frontend'
# apiBaseURL: 'http://staging-backend:8000/api/v1'
```

**Step 15: Create Test Credentials**
```bash
# Create .env.test file
TEST_USER_1=tester1@staging.local
TEST_PASSWORD_1=test_password_1
TEST_USER_2=tester2@staging.local
TEST_PASSWORD_2=test_password_2

# Ensure not committed to git
echo ".env.test" >> .gitignore
```

### Load Testing Setup

**Step 16: Install Load Testing Tools**
```bash
# Install k6
brew install k6  # macOS
# or download from k6.io for other OS

# Verify installation
k6 version
```

**Step 17: Configure Load Test Scripts**
```bash
# Create load-tests directory
mkdir -p load-tests

# Copy load test scenarios
# (provided in PHASE_A_VALIDATION_PLAN.md)
```

### Monitoring Setup

**Step 18: Enable Monitoring**
```bash
# Docker stats
docker stats --no-stream

# Database monitoring
# Enable pg_stat_statements (if not enabled)
# psql -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Backend logging
# Verify DEBUG logs enabled in backend/.env

# Frontend logging
# Verify console.logs visible in DevTools
```

---

## Phase 5: Health Checks (15 minutes)

### Complete Health Verification

**Step 19: Service Health**
```bash
# Backend health
curl -s http://localhost:8000/health | jq '.'
# Expected: {"status": "healthy", "version": "vv1.18.25"}

# Frontend health  
curl -s http://localhost/ | grep -q "SMS" && echo "OK" || echo "FAILED"

# Database health
psql -h staging-db -U sms -d sms -c "SELECT 1;" && echo "OK" || echo "FAILED"

# Redis health (if used)
redis-cli -h staging-redis ping && echo "PONG" || echo "FAILED"
```

**Step 20: API Endpoints Verification**
```bash
# Test all Phase A endpoints
# GET /dashboards
curl -X GET http://localhost:8000/api/v1/dashboards

# POST /dashboards (create)
curl -X POST http://localhost:8000/api/v1/dashboards \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","configuration":{"charts":["performance"]}}'

# GET /dashboards/{id}
curl -X GET http://localhost:8000/api/v1/dashboards/1

# PUT /dashboards/{id}
curl -X PUT http://localhost:8000/api/v1/dashboards/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated"}'

# DELETE /dashboards/{id}
curl -X DELETE http://localhost:8000/api/v1/dashboards/1

# POST /dashboards/{id}/set-default
curl -X POST http://localhost:8000/api/v1/dashboards/1/set-default
```

**Step 21: UI Feature Verification**
- [ ] Analytics page loads without errors
- [ ] All 10 chart types visible
- [ ] "Manage Dashboards" button visible
- [ ] Dashboard selector dropdown present
- [ ] Can create new dashboard
- [ ] Can edit dashboard
- [ ] Can delete dashboard
- [ ] Can set default dashboard
- [ ] Chart filtering works when switching dashboards

### Database Verification

**Step 22: Database Integrity**
```bash
# Check table structure
psql -c "\\d custom_dashboards"

# Verify indexes
psql -c "SELECT * FROM pg_indexes WHERE tablename='custom_dashboards';"

# Check constraints
psql -c "\\d+ custom_dashboards"

# Verify cascade delete works
# (Test with DELETE user after setting up dashboards)
```

---

## Staging Environment Checklist

### Infrastructure ✅
- [ ] Server access confirmed
- [ ] Disk space available (50GB+)
- [ ] Required tools installed (Docker, PostgreSQL, Node, Python)
- [ ] Network connectivity verified
- [ ] Backups accessible

### Database ✅
- [ ] Production data cloned to staging
- [ ] custom_dashboards table created
- [ ] Indexes created
- [ ] Constraints applied
- [ ] Test users created
- [ ] Sample dashboards created

### Backend ✅
- [ ] Code deployed (Phase A)
- [ ] Dependencies installed
- [ ] Database migrations applied
- [ ] Services running and healthy
- [ ] All API endpoints responding
- [ ] No critical errors in logs

### Frontend ✅
- [ ] Code deployed (Phase A)
- [ ] Dependencies installed
- [ ] Build completed successfully
- [ ] Analytics page loads
- [ ] All UI elements visible
- [ ] No console errors

### Testing ✅
- [ ] E2E test framework installed
- [ ] Test credentials created
- [ ] Load testing tools installed
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Health checks passing

### Documentation ✅
- [ ] Test plan reviewed
- [ ] UAT plan prepared
- [ ] Load test scenarios created
- [ ] Monitoring dashboards ready
- [ ] Runbooks available
- [ ] Contact info available

---

## Pre-Testing Sign-Off

**Staging Environment Ready?** YES / NO

**Sign-Off By:** _________________ (Name)  
**Date:** _________________ (Date)  
**Time:** _________________ (Time)

**Notes:**
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

## Troubleshooting

### Database Connection Fails
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# If fails, check:
# - Host is correct
# - Port is correct
# - Credentials are correct
# - Database exists
# - User has permissions
```

### Migration Fails
```bash
# Check migration history
alembic current

# Check available migrations
alembic heads

# If stuck, downgrade and retry
alembic downgrade -1
alembic upgrade head
```

### Backend Won't Start
```bash
# Check logs
docker logs sms-backend-staging

# Check requirements installed
pip list | grep -i sqlalchemy

# Verify environment variables
env | grep DATABASE_URL

# Check port availability
lsof -i :8000
```

### Frontend Not Loading
```bash
# Check nginx/web server logs
tail -f /var/log/nginx/error.log

# Check file permissions
ls -la /var/www/staging/

# Verify build succeeded
ls -la dist/index.html

# Clear browser cache
# Ctrl+Shift+Delete (Windows)
# Cmd+Shift+Delete (Mac)
```

### Tests Failing
```bash
# Run with verbose output
npx playwright test --reporter=verbose

# Run in debug mode
PWDEBUG=1 npx playwright test

# Check test data exists
psql -c "SELECT COUNT(*) FROM users;"

# Verify test credentials work
curl -X POST /login -d @credentials.json
```

---

## Quick Reference

**Start Staging Services:**
```bash
docker-compose -f docker-compose.staging.yml up -d
```

**Stop Staging Services:**
```bash
docker-compose -f docker-compose.staging.yml down
```

**View Staging Logs:**
```bash
docker-compose -f docker-compose.staging.yml logs -f
```

**SSH to Backend:**
```bash
docker exec -it sms-backend-staging bash
```

**Connect to Database:**
```bash
psql -h staging-db -U sms -d sms
```

**Run Frontend Dev Server:**
```bash
npm run dev
```

**Run Backend Dev Server:**
```bash
uvicorn backend.main:app --reload
```

---

**Last Updated:** June 9, 2026  
**Status:** Ready to Execute


