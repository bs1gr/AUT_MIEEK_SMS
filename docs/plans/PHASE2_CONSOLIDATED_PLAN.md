# Phase 2 Implementation Plan - Consolidated

**Created**: January 6, 2026
**Status**: Planning Phase
**Duration**: 4-6 weeks (estimated)
**Release Target**: v1.16.0 (February/March 2026)
**Prerequisites**: v1.15.0 complete ✅

---

## 📋 Overview

Phase 2 consolidates three parallel improvement tracks into a unified roadmap:
1. **Fine-Grained RBAC** (Phase 2.4) - Permission-based access control
2. **CI/CD & Testing Improvements** - E2E monitoring and coverage
3. **Installer & Deployment Enhancements** - Polish and automation

**Team Required**: 2-3 backend developers + 1 frontend developer + 1 DevOps/QA

---

## 🎯 Phase 2 Goals & Success Metrics

### Primary Objectives
1. **Security**: Fine-grained permissions for better access control
2. **Quality**: Comprehensive CI/CD with coverage tracking
3. **Deployment**: Enhanced installer experience and monitoring
4. **Performance**: Load testing integration and benchmarking

### Success Metrics
- [ ] Permission-based RBAC fully functional (15+ permissions defined)
- [ ] E2E tests passing consistently in CI (95%+ success rate)
- [ ] Test coverage reporting enabled (75% backend, 70% frontend)
- [ ] Installer improvements validated on 3+ Windows environments
- [ ] Load testing integrated into CI pipeline

---

## 🗓️ Implementation Timeline

### Week 1-2: RBAC Foundation (HIGH Priority)
**Focus**: Design and database changes for permission system

**Tasks**:
1. Permission matrix design and documentation
2. Database schema changes (permissions, roles_permissions tables)
3. Backend models and Alembic migrations
4. Permission check utilities and decorators

**Deliverables**:
- [ ] Permission matrix documented (15+ permissions)
- [ ] Database migration created and tested
- [ ] `@require_permission()` decorator functional
- [ ] Unit tests for permission checks

---

### Week 2-3: RBAC Implementation (HIGH Priority)
**Focus**: Backend logic and endpoint refactoring

**Tasks**:
1. Refactor endpoints to use permission checks
2. Admin API for role/permission management
3. Frontend UI for permission management (optional)
4. Integration testing

**Deliverables**:
- [ ] All admin endpoints use permission checks
- [ ] API endpoints for permission management
- [ ] Migration guide for existing deployments
- [ ] Integration tests passing

---

### Week 3-4: CI/CD & Testing Improvements (HIGH Priority)
**Focus**: E2E test monitoring and coverage reporting

**Tasks**:
1. E2E test monitoring in GitHub Actions
2. Coverage collection and reporting
3. Performance regression tracking
4. CI cache optimization

**Deliverables**:
- [ ] E2E tests passing in CI (95%+ success rate)
- [ ] Coverage reporting to Codecov/Coveralls
- [ ] Minimum coverage thresholds enforced
- [ ] CI execution time reduced by 30%

---

### Week 4-5: Load Testing & Performance (MEDIUM Priority)
**Focus**: Performance benchmarking and regression detection

**Tasks**:
1. Load testing integration into CI
2. Performance metrics dashboard
3. Regression detection automation
4. Database query profiling

**Deliverables**:
- [ ] Load tests running in CI
- [ ] Performance baselines established
- [ ] Automated regression alerts
- [ ] Query performance metrics tracked

---

### Week 5-6: Polish & Documentation (MEDIUM Priority)
**Focus**: Final improvements and comprehensive documentation

**Tasks**:
1. Installer enhancements validation
2. Comprehensive testing documentation
3. Admin guides for permission management
4. Release preparation

**Deliverables**:
- [ ] All documentation updated
- [ ] Admin user guides complete
- [ ] Release notes prepared
- [ ] v1.16.0 ready for release

---

## 🔧 Detailed Implementation Plans

### 1. Fine-Grained RBAC (Weeks 1-3)

#### 1.1 Permission Matrix Design

**Permission Structure**: `resource:action`

| Resource   | Action         | Permission Key         | Admin | Staff | Teacher | Student |
|------------|---------------|-----------------------|-------|-------|---------|---------|
| Students   | View          | students:view         |   ✅   |  ✅   |   ✅    |   ✅    |
| Students   | Create        | students:create       |   ✅   |  ✅   |         |         |
| Students   | Edit          | students:edit         |   ✅   |  ✅   |         |         |
| Students   | Delete        | students:delete       |   ✅   |       |         |         |
| Courses    | View          | courses:view          |   ✅   |  ✅   |   ✅    |   ✅    |
| Courses    | Create        | courses:create        |   ✅   |  ✅   |         |         |
| Courses    | Edit          | courses:edit          |   ✅   |  ✅   |         |         |
| Courses    | Delete        | courses:delete        |   ✅   |       |         |         |
| Grades     | View          | grades:view           |   ✅   |  ✅   |   ✅    |   ✅    |
| Grades     | Edit          | grades:edit           |   ✅   |  ✅   |   ✅    |         |
| Attendance | View          | attendance:view       |   ✅   |  ✅   |   ✅    |   ✅    |
| Attendance | Edit          | attendance:edit       |   ✅   |  ✅   |   ✅    |         |
| Reports    | Generate      | reports:generate      |   ✅   |  ✅   |   ✅    |         |
| Audit Logs | View          | audit:view            |   ✅   |       |         |         |
| Users      | Manage Roles  | users:manage_roles    |   ✅   |       |         |         |
| Users      | Manage Perms  | users:manage_perms    |   ✅   |       |         |         |

#### 1.2 Database Schema

**New Tables**:
```sql
-- permissions table
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY,
    key VARCHAR(64) UNIQUE NOT NULL,  -- e.g., "students:create"
    description VARCHAR(255),
    resource VARCHAR(32) NOT NULL,     -- e.g., "students"
    action VARCHAR(32) NOT NULL,       -- e.g., "create"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- roles_permissions junction table
CREATE TABLE roles_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

**Alembic Migration**:
```bash
cd backend
alembic revision --autogenerate -m "Add permissions and roles_permissions tables"
alembic upgrade head
```

#### 1.3 Backend Implementation

**Permission Check Decorator**:
```python
# backend/security/permissions.py

from functools import wraps
from fastapi import HTTPException, Depends
from backend.dependencies import get_current_user

def require_permission(permission_key: str):
    """Decorator to check if user has specific permission."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user = Depends(get_current_user), **kwargs):
            if not has_permission(current_user, permission_key):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission '{permission_key}' required"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

def has_permission(user, permission_key: str) -> bool:
    """Check if user has permission via their role."""
    if not user or not user.role:
        return False
    return permission_key in [p.key for p in user.role.permissions]
```

**Usage in Routers**:
```python
from backend.security.permissions import require_permission

@router.post("/students/")
@require_permission("students:create")
async def create_student(student: StudentCreate, current_user = Depends(get_current_user)):
    # Only users with students:create permission can access
    pass
```

#### 1.4 Permission Management API

**New Endpoints**:
- `GET /api/v1/permissions` - List all permissions
- `GET /api/v1/roles/{role_id}/permissions` - Get role permissions
- `POST /api/v1/roles/{role_id}/permissions` - Assign permissions to role
- `DELETE /api/v1/roles/{role_id}/permissions/{permission_id}` - Remove permission
- `POST /api/v1/permissions/seed` - Seed default permissions (admin only)

---

### 2. CI/CD & Testing Improvements (Weeks 3-4)

#### 2.1 E2E Test Monitoring

**GitHub Actions Enhancement**:
```yaml
# .github/workflows/e2e-tests.yml
- name: Run E2E Tests with Retry
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 15
    max_attempts: 2
    command: npm run test:e2e

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/

- name: Comment PR with Results
  if: github.event_name == 'pull_request'
  uses: daun/playwright-report-comment@v3
```

**Success Criteria**:
- [ ] E2E tests run on every PR
- [ ] Test results posted as PR comments
- [ ] Screenshots/videos captured on failure
- [ ] 95%+ success rate over 30 days

#### 2.2 Coverage Reporting

**Backend Coverage (pytest-cov)**:
```yaml
# .github/workflows/backend-tests.yml
- name: Run Tests with Coverage
  run: |
    cd backend
    pytest --cov=backend --cov-report=xml --cov-report=term

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/coverage.xml
    flags: backend
    fail_ci_if_error: true
```

**Frontend Coverage (Vitest)**:
```yaml
# .github/workflows/frontend-tests.yml
- name: Run Tests with Coverage
  run: |
    cd frontend
    npm run test:coverage

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./frontend/coverage/coverage-final.json
    flags: frontend
```

**Minimum Thresholds**:
- Backend: 75% overall, 60% per file
- Frontend: 70% overall, 50% per file

#### 2.3 CI Cache Optimization

**Docker Layer Caching**:
```yaml
- name: Build Docker with Cache
  uses: docker/build-push-action@v4
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**NPM Cache**:
```yaml
- name: Cache NPM Dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
```

**Expected Improvement**: 30% faster CI execution (from ~15 min to ~10 min)

---

### 3. Load Testing & Performance (Weeks 4-5)

#### 3.1 Load Testing Integration

**Tools**: Locust or k6

**Test Scenarios**:
1. Student list endpoint (1000 students, 100 concurrent users)
2. Grade calculation (500 students, 50 concurrent users)
3. Attendance marking (200 students, 30 concurrent users)
4. Login flow (100 concurrent users)

**GitHub Actions**:
```yaml
# .github/workflows/load-tests.yml
- name: Run Load Tests
  run: |
    cd load_tests
    locust -f locustfile.py --headless -u 100 -r 10 --run-time 5m --host http://localhost:8000

- name: Check Performance Regression
  run: |
    python scripts/check_performance_regression.py
```

**Performance Baselines** (from v1.15.0):
- Student list: <100ms (p95)
- Grade calculation: <200ms (p95)
- Attendance: <80ms (p95)

#### 3.2 Database Query Profiling

**SQLAlchemy Logging**:
```python
# Enable in development
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

**Query Performance Tracking**:
- Log slow queries (>100ms)
- Track N+1 query patterns
- Monitor connection pool usage

---

### 4. Documentation & Polish (Weeks 5-6)

#### 4.1 Admin Guides

**New Documentation**:
- `docs/admin/PERMISSION_MANAGEMENT.md` - How to manage permissions
- `docs/admin/RBAC_MIGRATION_GUIDE.md` - Upgrading from role-based to permission-based
- `docs/development/TESTING_GUIDE.md` - Complete testing guide
- `docs/operations/PERFORMANCE_MONITORING.md` - Performance tracking guide

#### 4.2 Installer Enhancements

**Already Complete** (from v1.14.0):
- ✅ SMS Toggle shortcut persistence fixed
- ✅ Uninstaller naming (unins{version}.exe)
- ✅ Docker integration improvements
- ✅ Script reliability (VBS → BAT conversion)

**Validation Tasks**:
- [ ] Test installer on clean Windows 10/11
- [ ] Verify shortcuts work correctly
- [ ] Test uninstaller functionality
- [ ] Validate Docker integration

---

## 🚧 Implementation Order (Priority)

### Sprint 1 (Week 1): Foundation
1. **RBAC Design** - Permission matrix and database schema
2. **E2E Monitoring** - GitHub Actions setup for test tracking
3. **Documentation** - Phase 2 kickoff guide

### Sprint 2 (Week 2): Core Implementation
1. **RBAC Backend** - Models, migrations, permission checks
2. **Coverage Setup** - Codecov integration
3. **Load Test Baseline** - Initial load tests

### Sprint 3 (Week 3): Integration
1. **RBAC Endpoints** - Permission management API
2. **CI Optimization** - Cache improvements
3. **Performance Tracking** - Query profiling

### Sprint 4 (Week 4): Testing
1. **RBAC Testing** - Integration and E2E tests
2. **Load Testing** - CI integration
3. **Regression Detection** - Automated alerts

### Sprint 5 (Week 5): Polish
1. **RBAC Frontend** - Permission management UI (optional)
2. **Documentation** - Admin guides
3. **Installer Validation** - Final testing

### Sprint 6 (Week 6): Release
1. **Final Testing** - Full regression suite
2. **Migration Guide** - v1.15.0 → v1.16.0
3. **Release Prep** - Release notes, tagging

---

## 📊 Success Criteria

### Must Have (Phase 2 Complete)
- [ ] Fine-grained permissions fully implemented
- [ ] 15+ permissions defined and tested
- [ ] Permission management API functional
- [ ] E2E tests passing in CI (95%+ success rate)
- [ ] Coverage reporting enabled (75% backend, 70% frontend)
- [ ] Load testing integrated

### Nice to Have
- [ ] Permission management UI in admin panel
- [ ] Real-time performance dashboard
- [ ] Automated performance regression alerts
- [ ] Enhanced installer features

---

## 🔗 Reference Documents

### Planning
- [RBAC_PHASE2.4_PLAN.md](RBAC_PHASE2.4_PLAN.md) - Original RBAC plan
- [REMAINING_ISSUES_PRIORITY_PLAN.md](REMAINING_ISSUES_PRIORITY_PLAN.md) - CI/CD issues
- [INSTALLER_IMPROVEMENTS_v1.12.3+.md](INSTALLER_IMPROVEMENTS_v1.12.3+.md) - Installer notes

### Implementation
- [PHASE1_AUDIT_IMPROVEMENTS_v1.15.0.md](PHASE1_AUDIT_IMPROVEMENTS_v1.15.0.md) - Phase 1 reference
- [../misc/IMPLEMENTATION_PATTERNS.md](../misc/IMPLEMENTATION_PATTERNS.md) - Code patterns

### Status Tracking
- [../ACTIVE_WORK_STATUS.md](../ACTIVE_WORK_STATUS.md) - Current work status
- [../releases/EXECUTION_TRACKER_v1.16.0.md](../releases/EXECUTION_TRACKER_v1.16.0.md) - Phase 2 tracker (to be created)

---

## 🎯 Next Steps

1. **Review & Approve** - Team review of this consolidated plan
2. **Create GitHub Issues** - Break down into trackable issues (#68-#80)
3. **Team Kickoff** - Schedule Phase 2 kickoff meeting
4. **Sprint Planning** - Detailed sprint 1 task breakdown
5. **Environment Setup** - Development branches and test environments

---

**Last Updated**: January 6, 2026
**Next Review**: Sprint 1 completion (Week 1)
