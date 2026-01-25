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

```text
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

```text
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

```text
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

```text
**Deliverable**: `backend/rbac.py` template with TODOs

---

### Task 5: Unit Test Templates (3 hours)

**Timeline**: Jan 16-18

**Objective**: Pre-write test cases for RBAC

**Steps**:
1. [x] Create test file template: `backend/tests/test_rbac_templates.py`
2. [x] Write test cases (with TODOs):
    - `test_permission_check_allows_authorized_user()`
    - `test_permission_check_denies_unauthorized_user()`
    - `test_multiple_permissions_or_logic()`
    - `test_multiple_permissions_and_logic()`
    - `test_permission_decorator_on_endpoint()`

3. [x] Create placeholders for fixtures (db/client) to be finalized during implementation

**Test Template**:

```python
# backend/tests/test_rbac.py (created as backend/tests/test_rbac_templates.py)

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

```text
**Deliverable**: Complete test file with 40+ test stubs (`backend/tests/test_rbac_templates.py`, all marked skip for Phase 2)

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

```text
**Deliverable**: `docs/deployment/RBAC_MIGRATION_GUIDE.md`

---

### Task 7: Documentation Planning (2 hours)

**Timeline**: Jan 20-22

**Objective**: Plan all documentation updates needed

**Steps**:
1. [x] List all docs needing updates:
    - Architecture: `docs/development/ARCHITECTURE.md` (add permissions tables & request flow)
    - API: `backend/CONTROL_API.md` (permission requirements per endpoint) + OpenAPI notes
    - Admin: `docs/admin/PERMISSION_MANAGEMENT.md` (new) built from template below
    - Dev guide: `docs/development/RBAC_DEVELOPER_GUIDE.md` (new) for adding permissions/endpoints
    - Migration: `docs/deployment/RBAC_MIGRATION_GUIDE.md` (sync with seeding + rollout)
    - Testing: `docs/development/TESTING_GUIDE.md` (add RBAC section + how to run new tests)
    - Release: `.github/pull_request_template/PHASE2_PR_GUIDE.md` (add permission checklist)

2. [x] Create documentation templates
3. [x] Assign owners for each doc (Tech Lead = architecture + migration, Backend Dev = API + dev guide, Frontend Dev = admin UI, QA = testing guide, Release Manager = PR template touch-up)

**Deliverable**: Documentation checklist in project tracker

---

### Task 8: Review and Refinement (2 hours)

**Timeline**: Jan 22-26

**Objective**: Final review before Phase 2 kickoff

**Steps**:
1. [x] Review all design docs (matrix, schema, code review, decorators, migration strategy, test templates)
2. [x] Get stakeholder sign-off (Tech Lead + Backend + QA) on prep package
3. [x] Create Week 1 implementation checklist (seed data, migrate routers by domain, run RBAC tests, update docs)
4. [x] Prepare dev environment for coding (scripts validated: `NATIVE.ps1 -Setup`, lint hooks pass, pytest green with skips)
5. [x] Schedule Phase 2 kickoff meeting (Jan 27, agenda: seed script run, router migration plan, doc updates)

**Final Checklist**:
- [x] Permission matrix approved
- [x] Database schema reviewed
- [x] Decorator design finalized
- [x] Test templates ready
- [x] Migration strategy documented
- [x] All GitHub issues labeled and assigned

---

## 📊 Progress Tracking

| Task | Effort | Status | Due Date | Notes |
|------|--------|--------|----------|-------|
| 1. Permission Matrix | 4h | ✅ **COMPLETE** | Jan 10 | 25 permissions, 148 endpoints mapped |
| 2. Database Schema | 6h | ✅ **COMPLETE** | Jan 12 | Already exists! Documented existing schema |
| 3. Codebase Review | 2h | ✅ **COMPLETE** | Jan 14 | 5 files reviewed, migration roadmap created |
| 4. Decorator Design | 4h | ✅ **COMPLETE** | Jan 16 | Decorators refactored to use DI + ORM |
| 5. Test Templates | 3h | ✅ **COMPLETE** | Jan 18 | 45 skipped stubs in `backend/tests/test_rbac_templates.py` |
| 6. Migration Strategy | 2h | ✅ **COMPLETE** | Jan 20 | Seeding + rollout/rollback plan documented |
| 7. Documentation Plan | 2h | ✅ **COMPLETE** | Jan 22 | Doc owners + templates listed |
| 8. Review & Refinement | 2h | ✅ **COMPLETE** | Jan 26 | Final checklist approved + kickoff scheduled |
| **Total** | **25h** | **8/8 (100%)** | **Jan 26** | **25h spent, 0h remaining** |

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

- ✅ **Completed Task 4: Decorator Design** (4 hours)
  - Refactored @require_permission / @require_any_permission / @require_all_permissions to use FastAPI DI
  - Decorators now inject request, db (Depends(get_db)), and current_user (Depends(get_current_user))
  - Permission checks use ORM joins (UserRole → RolePermission) instead of raw SQL
  - Strengthened permission filtering with is_active flag checks
  - Self-access logic preserved (student_id path/query) via _is_self_access
- **Next**: Task 6 (Migration Strategy) or Task 7 (Docs Planning)

### Jan 11, 2026

- ✅ **Completed Task 6: Migration Strategy** (2 hours)
  - **Seeding Plan** (`backend/ops/seed_rbac_data.py`):
    - Seed 25 permissions (PERMISSION_MATRIX.md)
    - Create 3 roles: admin, teacher, viewer
    - Assign permissions: admin=25, teacher=11, viewer=7
    - Idempotent upsert by permission.key and role.name
  - **Rollout Steps**:

        1) Run seed script (native + docker) and verify counts (25 perms, 3 roles, 43 role-perms)
        2) Smoke-check has_permission() for admin/teacher/viewer
        3) Migrate endpoints router-by-router to @require_permission
  - **Rollback Steps**:
    - Use DB backup or script --dry-run for safe replays
    - Keep legacy optional_require_role enabled during migration
  - **Validation Hooks**: Add sanity checks in Task 5 test templates
- **Next**: Task 7 (Documentation Plan) or start Task 5 (Test Templates)

### Jan 12, 2026

- ✅ **Completed Task 5: Unit Test Templates** (3 hours)
  - Added `backend/tests/test_rbac_templates.py` with 45 skipped stubs covering permission resolution, decorator any/all logic, self-access, seeding idempotency, cache invalidation, and standardized error payloads
  - Placeholders rely on existing `db`/`client` fixtures; ready to implement once Phase 2 begins
  - Progress: 6/8 tasks complete (75%), 21h spent, 4h remaining
- **Next**: Task 7 (Documentation Plan) then Task 8 (Review & Refinement)

### Jan 13, 2026

- ✅ **Completed Task 7: Documentation Planning** (2 hours)
  - Document updates scoped: architecture, API permissions, admin UI guide, dev RBAC guide, migration guide sync, testing guide RBAC section, PR template checklist
  - Owners assigned: Tech Lead (architecture/migration), Backend Dev (API + dev guide), Frontend Dev (admin UI), QA (testing guide), Release Manager (PR template)
  - Templates defined for `docs/admin/PERMISSION_MANAGEMENT.md` and `docs/development/RBAC_DEVELOPER_GUIDE.md`
- ✅ **Completed Task 8: Review & Refinement** (2 hours)
  - Reviewed all prep docs, confirmed checklist; Week 1 implementation checklist drafted (seed, migrate routers by domain, run RBAC tests, update docs)
  - Kickoff scheduled for Jan 27; environments validated (lint hooks, pytest green with expected skips)
  - Progress: 8/8 tasks complete (100%), 25h spent, 0h remaining

---

**Last Updated**: January 11, 2026 10:00
**Next Review**: January 12, 2026 (after Task 5/7 kickoff)
**Phase 2 Kickoff**: January 27, 2026
