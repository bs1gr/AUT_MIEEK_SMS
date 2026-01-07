# Phase 2 Preparation Guide - Week 0 (Jan 8-26, 2026)

**Created**: January 8, 2026
**Branch**: `feature/phase2-rbac-prep`
**Status**: Early Preparation (Phase 2 officially starts Jan 27)
**Purpose**: Get ahead on planning and design before official kickoff

---

## 🎯 Preparation Goals (Jan 8-26)

**Main Objective**: Complete all design and planning work so Week 1 (Jan 27) can start with implementation immediately

### What We Can Do Now (Before Jan 27)
1. ✅ Design permission matrix (no code changes)
2. ✅ Design database schema (no migrations yet)
3. ✅ Review existing codebase patterns
4. ✅ Create implementation templates
5. ✅ Write unit test templates
6. ✅ Document migration strategy

### What We'll Do During Phase 2 (Jan 27+)
- Database migrations
- Code implementation
- Integration testing
- Production deployment

---

## 📋 Week 0 Task List (Jan 8-26)

### Task 1: Permission Matrix Design (4 hours)
**GitHub Issue**: #116
**Owner**: Tech Lead / Backend Dev
**Timeline**: Jan 8-10

**Objective**: Define all 15+ permissions needed for the system

**Steps**:
1. [ ] Review existing endpoints (`backend/routers/`)
2. [ ] Categorize by domain (students, courses, grades, attendance, reports, audit, users)
3. [ ] Define permission names (e.g., `students:view`, `students:edit`, `students:delete`)
4. [ ] Document permission matrix in `docs/admin/PERMISSION_MATRIX.md`
5. [ ] Get stakeholder approval

**Deliverable**: Permission matrix document with:
- Permission name
- Description
- Affected endpoints
- Default role assignments (admin, teacher, viewer)

**Template** (to create):
```markdown
# Permission Matrix

## Student Management Permissions
| Permission | Description | Endpoints | Admin | Teacher | Viewer |
|------------|-------------|-----------|-------|---------|--------|
| students:view | View student list and details | GET /students, GET /students/{id} | ✅ | ✅ | ✅ |
| students:create | Create new students | POST /students | ✅ | ❌ | ❌ |
| students:edit | Update student information | PUT /students/{id} | ✅ | ⚠️ Limited | ❌ |
| students:delete | Soft-delete students | DELETE /students/{id} | ✅ | ❌ | ❌ |
```

---

### Task 2: Database Schema Design (6 hours)
**GitHub Issue**: #117
**Owner**: Backend Dev
**Timeline**: Jan 10-12

**Objective**: Design Permission and RolePermission tables

**Steps**:
1. [ ] Design `permissions` table schema
2. [ ] Design `role_permissions` junction table
3. [ ] Plan indexes (permission.name, role_permission.role_id, role_permission.permission_id)
4. [ ] Document relationships with existing User/Role models
5. [ ] Create ER diagram
6. [ ] Write migration plan (upgrade/downgrade steps)

**Schema Design** (to document):
```python
# permissions table
class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

# role_permissions junction table
class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_role_permission_unique", "role_id", "permission_id", unique=True),
    )
```

**Deliverable**: `docs/admin/RBAC_DESIGN.md` with:
- ER diagram
- Table schemas
- Relationship descriptions
- Migration strategy

---

### Task 3: Review Existing Codebase (2 hours)
**Timeline**: Jan 12-14

**Objective**: Understand current auth patterns

**Steps**:
1. [ ] Review `backend/routers/routers_auth.py` (JWT token creation)
2. [ ] Review `backend/dependencies.py` (current role checking)
3. [ ] List all endpoints needing permission checks
4. [ ] Document current `require_role()` usage
5. [ ] Identify migration path from role-based to permission-based

**Audit Checklist**:
```powershell
# Count endpoints by router
Get-ChildItem backend/routers/routers_*.py | ForEach-Object {
    $file = $_.Name
    $count = (Select-String -Path $_.FullName -Pattern "@router\.(get|post|put|delete)").Count
    Write-Output "$file : $count endpoints"
}

# Find all role checks
Select-String -Path backend/routers/*.py -Pattern "require_role|optional_require_role"
```

**Deliverable**: Endpoint audit spreadsheet

---

### Task 4: Permission Check Utilities Design (4 hours)
**GitHub Issue**: #118
**Timeline**: Jan 14-16

**Objective**: Design decorator and helper functions

**Steps**:
1. [ ] Design `@require_permission(perm)` decorator
2. [ ] Design `has_permission(user, perm)` function
3. [ ] Design `has_any_permission(user, perms)` for OR logic
4. [ ] Design `has_all_permissions(user, perms)` for AND logic
5. [ ] Plan error handling (403 Forbidden with permission name)

**Decorator Template**:
```python
# backend/rbac.py (to create)
from functools import wraps
from fastapi import HTTPException, Depends
from backend.dependencies import get_current_user

def require_permission(permission: str):
    """Decorator to require a specific permission for an endpoint.

    Usage:
        @router.post("/students/")
        @require_permission("students:create")
        async def create_student(...):
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user = Depends(get_current_user), **kwargs):
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied: {permission} required"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

def has_permission(user, permission_name: str) -> bool:
    """Check if user has a specific permission."""
    # Will implement after database changes
    pass
```

**Deliverable**: `backend/rbac.py` template with TODOs

---

### Task 5: Unit Test Templates (3 hours)
**Timeline**: Jan 16-18

**Objective**: Pre-write test cases for RBAC

**Steps**:
1. [ ] Create test file template: `backend/tests/test_rbac.py`
2. [ ] Write test cases (with TODOs):
   - `test_permission_check_allows_authorized_user()`
   - `test_permission_check_denies_unauthorized_user()`
   - `test_multiple_permissions_or_logic()`
   - `test_multiple_permissions_and_logic()`
   - `test_permission_decorator_on_endpoint()`
3. [ ] Create fixtures for test users with different permissions

**Test Template**:
```python
# backend/tests/test_rbac.py (to create)
import pytest
from backend.rbac import require_permission, has_permission

def test_permission_check_allows_authorized_user():
    """Test that user with permission can access endpoint."""
    # TODO: Implement after database changes
    pass

def test_permission_check_denies_unauthorized_user():
    """Test that user without permission gets 403."""
    # TODO: Implement after database changes
    pass

# ... 40+ test cases
```

**Deliverable**: Complete test file with 40+ test stubs

---

### Task 6: Migration Strategy Document (2 hours)
**Timeline**: Jan 18-20

**Objective**: Plan the migration from role-based to permission-based

**Steps**:
1. [ ] Document backward compatibility approach
2. [ ] Plan default permission seeding (admin gets all, teacher gets subset)
3. [ ] Write rollback procedure
4. [ ] Document impact on existing deployments

**Migration Strategy**:
```markdown
# RBAC Migration Strategy

## Phase 1: Database Changes (Week 1)
1. Add permissions + role_permissions tables
2. Seed default permissions (15+)
3. Assign all permissions to admin role
4. Assign read-only permissions to teacher role

## Phase 2: Dual Mode (Week 2)
1. Keep existing role checks working
2. Add permission checks alongside role checks
3. Test both systems in parallel

## Phase 3: Cutover (Week 3)
1. Remove old role checks
2. Full permission-based access control
3. Update documentation

## Rollback Plan
- Keep old role-based code commented
- Database migration has downgrade() function
- Can revert in <1 hour if issues found
```

**Deliverable**: `docs/deployment/RBAC_MIGRATION_GUIDE.md`

---

### Task 7: Documentation Planning (2 hours)
**Timeline**: Jan 20-22

**Objective**: Plan all documentation updates needed

**Steps**:
1. [ ] List all docs needing updates:
   - Architecture diagram (add permissions tables)
   - API documentation (add permission requirements)
   - Admin guide (permission management UI)
   - Developer guide (how to add new permissions)
2. [ ] Create documentation templates
3. [ ] Assign owners for each doc

**Deliverable**: Documentation checklist in project tracker

---

### Task 8: Review and Refinement (2 hours)
**Timeline**: Jan 22-26

**Objective**: Final review before Phase 2 kickoff

**Steps**:
1. [ ] Review all design docs
2. [ ] Get stakeholder sign-off
3. [ ] Create Week 1 implementation checklist
4. [ ] Prepare dev environment for coding
5. [ ] Schedule Phase 2 kickoff meeting (Jan 27)

**Final Checklist**:
- [ ] Permission matrix approved
- [ ] Database schema reviewed
- [ ] Decorator design finalized
- [ ] Test templates ready
- [ ] Migration strategy documented
- [ ] All GitHub issues labeled and assigned

---

## 📊 Progress Tracking

| Task | Effort | Status | Due Date | Notes |
|------|--------|--------|----------|-------|
| 1. Permission Matrix | 4h | ✅ **COMPLETE** | Jan 10 | 25 permissions, 148 endpoints mapped |
| 2. Database Schema | 6h | ✅ **COMPLETE** | Jan 12 | Already exists! Documented existing schema |
| 3. Codebase Review | 2h | ✅ **COMPLETE** | Jan 14 | 5 files reviewed, migration roadmap created |
| 4. Decorator Design | 4h | 🟡 Ready to Start | Jan 16 | Unblocked (Task 2 done) |
| 5. Test Templates | 3h | 🔴 Blocked | Jan 18 | Needs Task 4 complete |
| 6. Migration Strategy | 2h | 🟡 Ready to Start | Jan 20 | Unblocked (Task 2 done) |
| 7. Documentation Plan | 2h | 🟡 Can Start | Jan 22 | Independent task |
| 8. Review & Refinement | 2h | 🔴 Blocked | Jan 26 | Needs all complete |
| **Total** | **25h** | **3/8 (37.5%)** | **Jan 26** | **12h spent, 13h remaining** |

---

## 🎯 Success Criteria (Week 0 Complete)

By January 26, we should have:
- ✅ Complete permission matrix (15+ permissions defined)
- ✅ Database schema designed and reviewed
- ✅ RBAC utilities designed (decorator + helpers)
- ✅ 40+ unit tests written (as stubs)
- ✅ Migration strategy documented
- ✅ All design docs reviewed and approved

**Ready to Start Coding**: January 27, 2026 (Week 1 of Phase 2)

---

## 📝 Daily Log

### Jan 8, 2026
- ✅ Created Phase 2 prep branch (`feature/phase2-rbac-prep`)
- ✅ Reviewed Phase 2 plan (PHASE2_CONSOLIDATED_PLAN.md, UNIFIED_WORK_PLAN.md)
- ✅ Created this preparation guide (PHASE2_PREP_GUIDE.md)
- ✅ **Completed Task 1: Permission Matrix Design** (4 hours)
  - Audited all 24 routers (148 endpoints total)
  - Designed 25 permissions across 8 domains
  - Created [docs/admin/PERMISSION_MATRIX.md](../admin/PERMISSION_MATRIX.md)
  - Defined Admin, Teacher, Viewer role defaults
- **Next**: Task 2 (Database Schema Design) - Target Jan 9-12

### Jan 9, 2026
- Discovered schema already implemented in [backend/models.py](../../backend/models.py)
- Documented 6 tables: Permission, Role, RolePermission, UserRole, UserPermission, User
- Created [docs/admin/RBAC_DATABASE_SCHEMA.md](../admin/RBAC_DATABASE_SCHEMA.md)
- Analyzed permission resolution logic and index strategy
- Identified backward compatibility approach (User.role + UserRole coexist)
- ✅ **Completed Task 3: Codebase Review** (2 hours)
  - Reviewed 5 files: rbac.py, current_user.py, routers_auth.py, dependencies.py, models.py
  - Analyzed 1,955 lines of authentication and RBAC code
  - Created [docs/admin/RBAC_CODEBASE_REVIEW.md](../admin/RBAC_CODEBASE_REVIEW.md)
  - **Key Finding**: RBAC 75% complete! Schema + utilities exist, endpoints need migration
  - Identified 4 critical gaps: no seed data, 148 endpoints on legacy auth, decorator untested
  - Created 3-week migration roadmap for Phase 2 implementation
- **Next**: Task 4 (Decorator Design), Task 6 (Migration Strategy), or Task 7 (Docs Planning)

### Jan 10, 2026
- Status:
- Next:

---

**Last Updated**: January 8, 2026 00:20
**Next Review**: January 10, 2026 (after Task 2 complete)
**Phase 2 Kickoff**: January 27, 2026
