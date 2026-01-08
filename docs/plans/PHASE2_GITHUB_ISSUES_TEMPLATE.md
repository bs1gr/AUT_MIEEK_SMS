# Phase 2 GitHub Issues Generation Template

**Timeline**: January 7, 2026 (Planning)
**Execution**: January 8, 2026 (Create all issues)
**Reference**: PHASE2_SWIMLANES_DEPENDENCIES.md (Lines 50-250)

---

## 📋 Issues to Create (Feb 2025 - Mar 2026)

Create all issues in GitHub repository with labels, milestones, and acceptance criteria below.

### **Issue #116: RBAC - Permission Matrix Design**

**Title**: `feat(phase2): RBAC Permission Matrix Design (Week 1)`
**Labels**: `phase-2`, `rbac`, `priority-critical`, `backend`
**Assignee**: Backend Developer 1
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 4 hours
**Start Date**: Jan 27, 2026
**Due Date**: Jan 29, 2026

**Description**:
```markdown
## 🎯 Objective
Design and document the permission matrix for fine-grained RBAC system.

## 📋 Requirements
- Create permission matrix with 15+ permissions across 5 domains
- Domains: students, courses, grades, attendance, audit
- Example permissions:
  - `students:view` - Can view student list and details
  - `students:create` - Can create new students
  - `students:edit` - Can edit student information
  - `students:delete` - Can delete students
  - `courses:*` - Similar pattern
  - `grades:view`, `grades:edit`
  - `attendance:view`, `attendance:edit`
  - `audit:view`
  - `admin:manage_roles`, `admin:manage_permissions`

## ✅ Acceptance Criteria
- [ ] Permission matrix document created: `docs/admin/PERMISSION_MATRIX.md`
- [ ] All 15+ permissions documented with descriptions
- [ ] Permission grouping by domain clear
- [ ] Mapping of permissions to endpoints documented
- [ ] Tech lead review and approval obtained
- [ ] No security concerns identified
- [ ] Matrix compatible with database schema

## 🔄 Blockers & Dependencies
- Blocks: #117 (Database Schema), #118 (Utilities)
- Depends on: None (can start independently)

## 📚 References
- [PHASE2_SWIMLANES_DEPENDENCIES.md](../../docs/plans/PHASE2_SWIMLANES_DEPENDENCIES.md) (Week 1 Task 1.1)
- [ARCHITECTURE.md](../../docs/development/ARCHITECTURE.md)

## ⏱️ Time Estimate
- Design & documentation: 2 hours
- Review & feedback: 1 hour
- Revisions: 1 hour
- **Total: 4 hours**
```

---

### **Issue #117: RBAC - Database Schema & Alembic Migration**

**Title**: `feat(phase2): RBAC Database Schema and Alembic Migration (Week 1)`
**Labels**: `phase-2`, `rbac`, `priority-critical`, `backend`, `database`
**Assignee**: Backend Developer 1
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 10 hours
**Start Date**: Jan 27, 2026
**Due Date**: Jan 31, 2026

**Description**:
```markdown
## 🎯 Objective
Create database schema for RBAC system with Permission and RolePermission tables.

## 📋 Requirements
### Database Schema
- Create `Permission` table:
  - `id` (PK, Integer)
  - `name` (String, unique) - e.g., "students:view"
  - `description` (String) - e.g., "Can view students"
  - `created_at` (DateTime)
  - `updated_at` (DateTime)
  - Index on: `name`

- Create `RolePermission` table (join table):
  - `id` (PK, Integer)
  - `role_id` (FK to Role)
  - `permission_id` (FK to Permission)
  - `created_at` (DateTime)
  - Unique constraint on: (role_id, permission_id)
  - Indexes on: `role_id`, `permission_id`

- Modify `User` model:
  - Add relationship: `roles` (many-to-many with Role)
  - Existing `role_id` kept for backwards compatibility

### Alembic Migration
- Create migration file: `backend/migrations/xxx_add_rbac_tables.py`
- Migration must:
  - Create both tables
  - Add indexes
  - Be reversible (downgrade supported)
  - Be idempotent (can run multiple times safely)

## ✅ Acceptance Criteria
- [ ] ER diagram created showing Permission, RolePermission, Role, User relationships
- [ ] Migration file created in `backend/migrations/`
- [ ] `alembic upgrade head` runs without errors on clean database
- [ ] `alembic downgrade -1` reverts changes successfully
- [ ] No data loss when upgrading
- [ ] Indexes created for performance
- [ ] Foreign key constraints properly configured
- [ ] Tests verify schema structure

## 🔄 Blockers & Dependencies
- Blocks: #118 (Models), #119 (Utilities)
- Depends on: #116 (Permission Matrix - for reference)

## 📚 References
- [PHASE2_SWIMLANES_DEPENDENCIES.md](../../docs/plans/PHASE2_SWIMLANES_DEPENDENCIES.md) (Week 1 Task 1.2, 1.3)
- [backend/models.py](../../backend/models.py) (reference existing schema)

## ⏱️ Time Estimate
- Schema design: 3 hours
- Migration implementation: 3 hours
- Testing (upgrade/downgrade): 2 hours
- Documentation: 2 hours
- **Total: 10 hours**
```

---

### **Issue #118: RBAC - Backend Models Implementation**

**Title**: `feat(phase2): RBAC Backend Models (Week 1)`
**Labels**: `phase-2`, `rbac`, `priority-critical`, `backend`
**Assignee**: Backend Developer 1
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 6 hours
**Start Date**: Jan 29, 2026
**Due Date**: Jan 31, 2026

**Description**:
```markdown
## 🎯 Objective
Implement Permission and RolePermission models in SQLAlchemy.

## 📋 Requirements
### Permission Model
```python
class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)  # e.g., "students:view"
    description = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

### RolePermission Model
```python
class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint('role_id', 'permission_id'),)

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    permission_id = Column(Integer, ForeignKey('permissions.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Role Model Updates
- Add relationship: `permissions = relationship("Permission", secondary=RolePermission)`
- Add method: `has_permission(permission_name: str) -> bool`
- Add method: `has_all_permissions(*permission_names) -> bool`
- Add method: `has_any_permission(*permission_names) -> bool`

## ✅ Acceptance Criteria
- [ ] Permission model created with all fields
- [ ] RolePermission join table created
- [ ] Role model updated with relationships
- [ ] Helper methods implemented and working
- [ ] Models use SoftDeleteMixin (if applicable)
- [ ] Relationships bidirectional and tested
- [ ] Type hints added to all methods
- [ ] Documentation docstrings added

## 🔄 Blockers & Dependencies
- Blocks: #119 (Utilities), #120 (API Endpoints)
- Depends on: #117 (Migration created)

## ⏱️ Time Estimate
- Model implementation: 3 hours
- Relationships and methods: 2 hours
- Testing: 1 hour
- **Total: 6 hours**
```

---

### **Issue #119: RBAC - Permission Check Decorator & Utilities**

**Title**: `feat(phase2): RBAC Permission Check Decorator and Utilities (Week 1)`
**Labels**: `phase-2`, `rbac`, `priority-critical`, `backend`
**Assignee**: Backend Developer 2
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 6 hours
**Start Date**: Jan 27, 2026
**Due Date**: Jan 31, 2026

**Description**:
```markdown
## 🎯 Objective
Create decorator and utility functions for permission checking in endpoints.

## 📋 Requirements
### Create `backend/rbac.py` with:

#### 1. Decorator: `@require_permission(permission_name)`
```python
from functools import wraps
from fastapi import HTTPException, Depends, Request

def require_permission(permission_name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, request: Request, **kwargs):
            user = request.state.user  # Set by auth middleware
            if not user.has_permission(permission_name):
                raise HTTPException(status_code=403, detail="Permission denied")
            return await func(*args, request=request, **kwargs)
        return wrapper
    return decorator
```

#### 2. Decorator: `@require_any_permission(*permission_names)`
- Allow if user has ANY of the permissions (OR logic)

#### 3. Helper: `has_permission(user, permission_name) -> bool`
- Utility function to check permission outside of decorator

#### 4. Helper: `get_user_permissions(user) -> List[str]`
- Get all permissions for a user

### Usage Example
```python
@router.post("/students/")
@require_permission("students:create")
async def create_student(data: StudentCreate, request: Request):
    # User automatically checked for "students:create" permission
    ...
```

## ✅ Acceptance Criteria
- [ ] `backend/rbac.py` file created
- [ ] `@require_permission()` decorator works with single permission
- [ ] `@require_any_permission()` decorator works with OR logic
- [ ] Helper functions implemented
- [ ] 10+ unit tests covering all scenarios
- [ ] Type hints added to all functions
- [ ] Documentation/docstrings complete
- [ ] Error handling for missing user/permissions

## 🔄 Blockers & Dependencies
- Blocks: #120-#125 (All endpoint refactoring)
- Depends on: #116 (Permission Matrix - for reference)

## ⏱️ Time Estimate
- Decorator implementation: 2 hours
- Utility functions: 1 hour
- Unit tests: 2 hours
- Documentation: 1 hour
- **Total: 6 hours**
```

---

### **Issue #120: RBAC - Endpoint Refactoring (Students, Courses, Grades)**

**Title**: `feat(phase2): RBAC Endpoint Refactoring - Apply Permissions (Week 2)`
**Labels**: `phase-2`, `rbac`, `priority-critical`, `backend`
**Assignee**: Backend Developer 1 + 2
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 20 hours
**Start Date**: Feb 3, 2026
**Due Date**: Feb 7, 2026

**Description**:
```markdown
## 🎯 Objective
Refactor 30+ existing endpoints to enforce RBAC permissions.

## 📋 Requirements
Apply permissions to endpoints in these routers:
- `routers_students.py` - 8 endpoints (POST, GET, PUT, DELETE)
- `routers_courses.py` - 8 endpoints
- `routers_course_enrollments.py` - 6 endpoints
- `routers_grades.py` - 6 endpoints
- `routers_attendance.py` - 4 endpoints
- `routers_analytics.py` - 3 endpoints
- `routers_audit.py` - 4 endpoints

Example refactoring:
```python
# BEFORE
@router.post("/students/")
async def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    return db.add(...)

# AFTER
@router.post("/students/")
@require_permission("students:create")
async def create_student(data: StudentCreate, request: Request, db: Session = Depends(get_db)):
    return db.add(...)
```

## ✅ Acceptance Criteria
- [ ] All 30+ endpoints reviewed and mapped to permissions
- [ ] Student endpoints updated (8)
- [ ] Course endpoints updated (8)
- [ ] Grade endpoints updated (6)
- [ ] Attendance endpoints updated (4)
- [ ] Analytics endpoints updated (3)
- [ ] Audit endpoints updated (4)
- [ ] Unit tests for each endpoint (50+ tests)
- [ ] Zero regressions in existing tests
- [ ] Error messages user-friendly (403 vs 401)
- [ ] Code reviewed and approved

## 🔄 Blockers & Dependencies
- Blocks: #121 (Integration Testing), #122 (API Documentation)
- Depends on: #119 (Decorator ready)

## ⏱️ Time Estimate (per endpoint type)
- Student endpoints: 6 hours (Dev 1)
- Course endpoints: 6 hours (Dev 2)
- Other endpoints: 8 hours (Dev 1 + 2)
- **Total: 20 hours**
```

---

### **Issue #121: RBAC - Permission Management API**

**Title**: `feat(phase2): RBAC Permission Management API (Week 3)`
**Labels**: `phase-2`, `rbac`, `priority-high`, `backend`, `api`
**Assignee**: Backend Developer 2
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 8 hours
**Start Date**: Feb 10, 2026
**Due Date**: Feb 14, 2026

**Description**:
```markdown
## 🎯 Objective
Create REST API endpoints for managing permissions and role-permission assignments.

## 📋 Requirements
Create endpoints in `backend/routers/routers_rbac.py`:

1. **GET /api/v1/permissions**
   - List all available permissions
   - Optional filters: domain, name
   - Response: List of Permission objects

2. **GET /api/v1/roles/{role_id}/permissions**
   - Get permissions assigned to a role
   - Response: List of Permission objects

3. **POST /api/v1/roles/{role_id}/permissions**
   - Assign permission to role
   - Body: {permission_id: int} or {permission_name: str}
   - Response: Updated RolePermission

4. **DELETE /api/v1/roles/{role_id}/permissions/{permission_id}**
   - Remove permission from role
   - Response: 204 No Content

5. **POST /api/v1/permissions/seed**
   - Seed default permissions (idempotent)
   - Response: {created_count, existing_count}

## ✅ Acceptance Criteria
- [ ] All 5 endpoints implemented
- [ ] Endpoints secured with `@require_permission("admin:manage_permissions")`
- [ ] Seed endpoint is idempotent
- [ ] All endpoints have unit tests (40+ tests)
- [ ] Error handling for invalid IDs, duplicates
- [ ] API documentation updated
- [ ] Response schemas defined in Pydantic

## 🔄 Blockers & Dependencies
- Blocks: #123 (Frontend Permission UI), #124 (E2E Tests)
- Depends on: #118 (Models), #120 (Endpoints refactored)

## ⏱️ Time Estimate
- Endpoint implementation: 5 hours
- Testing: 2 hours
- Documentation: 1 hour
- **Total: 8 hours**
```

---

### **Issue #122: RBAC - Permission Management Frontend UI (Week 3, Optional)**

**Title**: `feat(phase2): RBAC Permission Management UI - Admin Panel (Week 3, Optional)`
**Labels**: `phase-2`, `rbac`, `priority-medium`, `frontend`, `optional`
**Assignee**: Frontend Developer
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 15 hours
**Start Date**: Feb 10, 2026
**Due Date**: Feb 14, 2026

**Description**:
```markdown
## 🎯 Objective
Create frontend components and admin page for managing permissions.

## 📋 Requirements
### Components (3)
1. **PermissionMatrix.tsx**
   - Display all permissions in table format
   - Columns: name, description, domain
   - Filterable by domain
   - Sortable by name

2. **RolePermissions.tsx**
   - Select role from dropdown
   - Show assigned permissions (checked)
   - Show available permissions (unchecked)
   - Save/Cancel buttons
   - Bulk assign/remove

3. **PermissionSelector.tsx**
   - Multi-select dropdown for permissions
   - Used in RolePermissions component
   - Search functionality

### Admin Page
- Route: `/admin/permissions`
- Layout: Sidebar navigation + main content
- Features:
  - Select role
  - Show permissions
  - Assign/remove permissions
  - Bulk operations (optional)

### Translations
- Add keys to `frontend/src/locales/en/permissions.ts`
- Add keys to `frontend/src/locales/el/permissions.ts`

## ✅ Acceptance Criteria
- [ ] 3 components created
- [ ] Admin page accessible at /admin/permissions
- [ ] Can view all permissions
- [ ] Can assign/remove permissions
- [ ] EN and EL translations complete
- [ ] 30+ component tests
- [ ] E2E test for permission assignment workflow
- [ ] UI responsive (mobile, tablet, desktop)

## 🔄 Blockers & Dependencies
- Blocks: #124 (E2E Tests for UI)
- Depends on: #121 (API endpoints ready)

## Note
This is marked **optional** - core RBAC works without UI. UI improves admin experience.

## ⏱️ Time Estimate
- Components: 10 hours
- Admin page integration: 3 hours
- Translations: 1 hour
- Testing: 1 hour
- **Total: 15 hours**
```

---

### **Issue #123: Phase 2 - E2E Testing & Stabilization (Week 5)**

**Title**: `test(phase2): E2E Testing Expansion and CI Stabilization (Week 5)`
**Labels**: `phase-2`, `testing`, `priority-high`, `qa`
**Assignee**: QA Engineer
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 20 hours
**Start Date**: Feb 24, 2026
**Due Date**: Feb 28, 2026

**Description**:
```markdown
## 🎯 Objective
Expand E2E test suite to 30+ tests and ensure >95% pass rate in CI.

## 📋 Requirements
### Test Expansion
- Expand from 24 tests to 30+ tests
- Add 5+ permission-based tests
- Add 3+ admin panel tests
- Test suite file: `frontend/tests/e2e/permissions.spec.ts`

### Permission Tests
1. Test assign permission → verify access granted
2. Test remove permission → verify access denied
3. Test cascading permissions (role change → permission changes)
4. Test permission denied error message
5. Test admin can assign/remove permissions

### Admin Panel Tests
1. Test admin page loads correctly
2. Test permission list displays
3. Test can assign permission to role
4. Test can remove permission from role

### Success Criteria
- [ ] 30+ total tests in test suite
- [ ] 95%+ pass rate in CI runs
- [ ] <5% flakiness (no random failures)
- [ ] All tests complete in <15 minutes
- [ ] Critical path tests: all passing
- [ ] Performance tests: <500ms p95
- [ ] CI metrics collected (via e2e_metrics_collector.py)

## 🔄 Blockers & Dependencies
- Blocks: #125 (Load Testing), #126 (Final Testing)
- Depends on: #120 (Endpoints), #121 (API), #122 (Optional UI)

## ⏱️ Time Estimate
- Test creation: 12 hours
- Debugging/fixes: 5 hours
- CI integration: 2 hours
- Documentation: 1 hour
- **Total: 20 hours**
```

---

### **Issue #124: Phase 2 - Load Testing & Performance Baselines (Week 4)**

**Title**: `perf(phase2): Load Testing Integration and Performance Baselines (Week 4)`
**Labels**: `phase-2`, `performance`, `priority-high`, `devops`
**Assignee**: QA Engineer + DevOps
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 12 hours
**Start Date**: Feb 17, 2026
**Due Date**: Feb 21, 2026

**Description**:
```markdown
## 🎯 Objective
Set up load testing in CI/CD and establish performance baselines for all APIs.

## 📋 Requirements
### Load Testing Scenarios
- Student list endpoint: <100ms p95
- Grade calculation: <200ms p95
- Attendance logging: <80ms p95
- Permission check: <50ms p95
- Login: <500ms p95

### CI/CD Integration
- Add load test job to `.github/workflows/ci-cd-pipeline.yml`
- Run weekly (Sunday 2 AM)
- Generate report artifacts
- Post results to Slack

### Performance Baselines
- Establish baseline metrics for all endpoints
- Create dashboard for trending
- Alert on >20% regression

## ✅ Acceptance Criteria
- [ ] Load testing suite configured (Locust or k6)
- [ ] All scenarios created and validated
- [ ] CI/CD job integrated
- [ ] Baselines established for all endpoints
- [ ] Monitoring dashboard created
- [ ] Alerts configured
- [ ] Documentation updated

## 🔄 Blockers & Dependencies
- Blocks: None (parallel work)
- Depends on: #120 (Endpoints refactored)

## ⏱️ Time Estimate
- Scenario setup: 5 hours
- CI/CD integration: 4 hours
- Dashboard/monitoring: 2 hours
- Documentation: 1 hour
- **Total: 12 hours**
```

---

### **Issue #125: Phase 2 - Final System Testing & Release (Week 6)**

**Title**: `test(phase2): Final System Testing and v1.15.1 Release Preparation (Week 6)`
**Labels**: `phase-2`, `testing`, `priority-critical`, `release`
**Assignee**: QA + Tech Lead
**Milestone**: Phase 2 - v1.15.1
**Estimate**: 20 hours
**Start Date**: Mar 3, 2026
**Due Date**: Mar 7, 2026

**Description**:
```markdown
## 🎯 Objective
Execute final system testing and prepare v1.15.1 for production release.

## 📋 Requirements
### System Testing
- Integration test: All RBAC features together
- Regression test: All Phase 1 features still work
- Permission test: 50+ permission scenarios
- Performance test: Load test suite passes
- Smoke test: 8 critical workflows
- E2E test: 30+ tests pass

### Bug Fixes
- Fix any issues found during testing
- Document any deferred items

### Staging Deployment
- Deploy v1.15.1 to staging
- Validate for 24 hours
- Collect metrics
- Monitor for issues

### Release Documentation
- Update CHANGELOG.md
- Create RELEASE_NOTES_v1.15.1.md
- Create MIGRATION_GUIDE_v1.15.1.md
- Get tech lead + PM sign-off

## ✅ Acceptance Criteria
- [ ] All system tests passing
- [ ] Zero critical bugs remaining
- [ ] Staging validated (24 hours)
- [ ] Performance baselines met
- [ ] E2E metrics excellent (95%+ pass)
- [ ] Release documentation complete
- [ ] Tech lead sign-off obtained
- [ ] PM/stakeholder approval obtained

## 🔄 Blockers & Dependencies
- Blocks: Production deployment
- Depends on: #123 (E2E tests), #124 (Load tests)

## ⏱️ Time Estimate
- System testing: 10 hours
- Bug fixes: 5 hours
- Staging validation: 3 hours
- Release docs: 2 hours
- **Total: 20 hours**
```

---

## 📝 GitHub Issue Creation Instructions

### Step 1: Create Issues Bulk
Visit: https://github.com/bs1gr/AUT_MIEEK_SMS/issues

For each issue above:
1. Click "New Issue"
2. Copy title and description
3. Add labels:
   - `phase-2`
   - `rbac` or `testing` or `performance`
   - `priority-critical` or `priority-high` or `priority-medium`
   - `backend` or `frontend` or `devops`
4. Set milestone: `Phase 2 - v1.15.1` (create if doesn't exist)
5. Assign to team member
6. Click "Submit new issue"

### Step 2: Link Related Issues
For each issue, add comments linking to related issues:
```
Related to: #120, #121, #123
Blocked by: #119
Blocks: #120, #121
```

### Step 3: Update PHASE2_SWIMLANES_DEPENDENCIES.md
Add links to each issue:
```
**Issue Reference**: Issue #116
**GitHub URL**: https://github.com/bs1gr/AUT_MIEEK_SMS/issues/116
```

### Step 4: Create GitHub Project (Optional)
Create board: "Phase 2 - RBAC Implementation"
- Add all issues
- Create columns: Backlog, In Progress, In Review, Done
- Assign team members

---

## ✅ Verification Checklist

- [ ] All 9 issues created (#116-#124)
- [ ] All issues have proper labels
- [ ] All issues assigned to team members
- [ ] All issues have milestone set
- [ ] All issues have acceptance criteria
- [ ] All issues linked to dependencies
- [ ] Team notified via Slack
- [ ] Project board created and populated (optional)

---

**Document Status**: ✅ Ready for GitHub issue creation
**Created**: January 7, 2026
**Next**: Execute on January 8, 2026
