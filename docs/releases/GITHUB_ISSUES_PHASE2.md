# Phase 2 GitHub Issues - Creation Guide

**Date**: January 6, 2026
**Purpose**: Issue templates for Phase 2 ($11.15.0) work
**Total Issues**: 13 issues (#68-#80)

---

## 🎯 Quick Create Instructions

**For each issue below**:
1. Go to: https://github.com/bs1gr/AUT_MIEEK_SMS/issues/new
2. Copy the title and body
3. Add labels: `phase-2`, `enhancement` (+ priority label)
4. Set milestone: `$11.15.0`
5. Assign to appropriate team member

---

## 🔴 CRITICAL Priority Issues

### Issue #68: RBAC Permission Matrix Design

**Title**: Design permission matrix for fine-grained RBAC

**Labels**: `phase-2`, `enhancement`, `critical`, `security`

**Body**:
```markdown
## Overview
Design comprehensive permission matrix for fine-grained role-based access control.

## Objectives
- [ ] Define all permissions using `resource:action` format
- [ ] Map permissions to roles (admin, staff, teacher, student)
- [ ] Document permission inheritance rules
- [ ] Review with security team

## Deliverables
- [ ] Permission matrix documented in `docs/security/PERMISSION_MATRIX.md`
- [ ] 15+ permissions defined
- [ ] All resources covered (students, courses, grades, attendance, reports, users)
- [ ] Edge cases documented

## Resources
See [Phase 2 Plan](../plans/PHASE2_CONSOLIDATED_PLAN.md) for initial matrix.

## Acceptance Criteria
- Permission matrix covers all endpoints
- No permission overlaps or conflicts
- Reviewed and approved by team

## Estimated Effort
2-3 hours

## Sprint
Sprint 1 (Week 1)
```

---

### Issue #69: Database Schema for Permissions

**Title**: Add permissions and roles_permissions tables

**Labels**: `phase-2`, `enhancement`, `critical`, `database`

**Body**:
```markdown
## Overview
Create database schema for permissions-based RBAC system.

## Tasks
- [ ] Create `permissions` table (id, key, description, resource, action)
- [ ] Create `roles_permissions` junction table
- [ ] Add foreign key constraints
- [ ] Create Alembic migration
- [ ] Add indexes for performance

## Technical Details
```sql
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY,
    key VARCHAR(64) UNIQUE NOT NULL,
    description VARCHAR(255),
    resource VARCHAR(32) NOT NULL,
    action VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

## Acceptance Criteria
- [ ] Tables created via Alembic migration
- [ ] Migration tested on clean database
- [ ] Rollback tested
- [ ] No breaking changes to existing data

## Estimated Effort
3-4 hours

## Sprint
Sprint 1 (Week 1)

## Dependencies
- #68 (permission matrix design)
```

---

## 🟠 HIGH Priority Issues

### Issue #70: Backend Permission Check Utilities

**Title**: Implement permission check decorator and utilities

**Labels**: `phase-2`, `enhancement`, `high`, `backend`

**Body**:
```markdown
## Overview
Create utilities and decorators for checking user permissions in backend endpoints.

## Tasks
- [ ] Create `@require_permission()` decorator
- [ ] Implement `has_permission(user, permission_key)` function
- [ ] Add permission caching for performance
- [ ] Handle edge cases (no user, no role, multiple permissions)

## Implementation
See `docs/plans/PHASE2_CONSOLIDATED_PLAN.md` for code examples.

## Acceptance Criteria
- [ ] Decorator works with FastAPI endpoints
- [ ] Proper error messages (403 with permission name)
- [ ] Unit tests pass (10+ test cases)
- [ ] Performance acceptable (<5ms overhead)

## Estimated Effort
4-5 hours

## Sprint
Sprint 1 (Week 2)

## Dependencies
- #69 (database schema)
```

---

### Issue #71: Refactor Endpoints to Use Permissions

**Title**: Migrate endpoints from role checks to permission checks

**Labels**: `phase-2`, `enhancement`, `high`, `backend`, `refactoring`

**Body**:
```markdown
## Overview
Update all admin endpoints to use permission-based checks instead of role-based.

## Scope
- [ ] Student endpoints (create, edit, delete)
- [ ] Course endpoints (create, edit, delete)
- [ ] Grade endpoints (edit)
- [ ] Attendance endpoints (edit)
- [ ] User management endpoints
- [ ] Audit log endpoints

## Migration Strategy
- Replace `@Depends(require_role("admin"))` with `@Depends(optional_require_role("admin"))`
- Add `@require_permission("resource:action")` decorator
- Test each endpoint after migration

## Acceptance Criteria
- [ ] All admin endpoints use permission checks
- [ ] No regression in functionality
- [ ] Integration tests pass
- [ ] Backward compatibility maintained

## Estimated Effort
6-8 hours

## Sprint
Sprint 2 (Week 2-3)

## Dependencies
- #70 (permission utilities)
```

---

### Issue #72: Permission Management API

**Title**: Create REST API for permission management

**Labels**: `phase-2`, `enhancement`, `high`, `backend`, `api`

**Body**:
```markdown
## Overview
Implement REST API endpoints for managing permissions and role assignments.

## Endpoints to Create
- [ ] `GET /api/v1/permissions` - List all permissions
- [ ] `GET /api/v1/roles/{role_id}/permissions` - Get role permissions
- [ ] `POST /api/v1/roles/{role_id}/permissions` - Assign permissions to role
- [ ] `DELETE /api/v1/roles/{role_id}/permissions/{permission_id}` - Remove permission
- [ ] `POST /api/v1/permissions/seed` - Seed default permissions

## Acceptance Criteria
- [ ] All endpoints functional and tested
- [ ] Admin-only access enforced
- [ ] Proper error handling
- [ ] API documentation updated

## Estimated Effort
4-5 hours

## Sprint
Sprint 2 (Week 2)

## Dependencies
- #71 (endpoint refactoring)
```

---

### Issue #73: Permission Management UI (Optional)

**Title**: Create admin UI for permission management

**Labels**: `phase-2`, `enhancement`, `medium`, `frontend`, `optional`

**Body**:
```markdown
## Overview
Create admin panel UI for managing permissions and role assignments.

## Features
- [ ] View all permissions grouped by resource
- [ ] View role-permission mappings
- [ ] Assign/remove permissions from roles
- [ ] Permission inheritance visualization
- [ ] Audit trail for permission changes

## Acceptance Criteria
- [ ] UI accessible only to admins
- [ ] Changes reflected immediately
- [ ] Error handling with user-friendly messages
- [ ] Responsive design

## Estimated Effort
6-8 hours

## Sprint
Sprint 2-3 (Week 3) - OPTIONAL

## Dependencies
- #72 (permission API)

## Notes
This is optional. Can use API directly via Postman/curl if time is limited.
```

---

## 🔵 CI/CD & Testing Issues

### Issue #74: E2E Test CI Monitoring

**Title**: Monitor and optimize E2E tests in GitHub Actions

**Labels**: `phase-2`, `enhancement`, `high`, `ci-cd`, `testing`

**Body**:
```markdown
## Overview
Ensure E2E tests run reliably in CI with proper error reporting.

## Tasks
- [ ] Monitor E2E test results for 5+ CI runs
- [ ] Identify and fix timeout issues
- [ ] Add retry logic for flaky tests
- [ ] Capture screenshots/videos on failure
- [ ] Post test results to PR comments

## Current Status
✅ Authentication fixed locally
⏳ Need CI validation

## Acceptance Criteria
- [ ] E2E tests pass in CI with 95%+ success rate
- [ ] No timeout issues
- [ ] Test artifacts uploaded on failure
- [ ] Results posted to PRs

## Estimated Effort
2-4 hours (monitoring + fixes)

## Sprint
Sprint 1 (Week 1)

## Related
See `docs/plans/REMAINING_ISSUES_PRIORITIZED.md`
```

---

### Issue #75: Coverage Reporting Integration

**Title**: Set up test coverage reporting with Codecov

**Labels**: `phase-2`, `enhancement`, `high`, `ci-cd`, `testing`

**Body**:
```markdown
## Overview
Integrate test coverage reporting into CI pipeline with quality gates.

## Tasks
Backend:
- [ ] Add pytest-cov to GitHub Actions
- [ ] Upload coverage to Codecov
- [ ] Set minimum threshold (75%)

Frontend:
- [ ] Add Vitest coverage to GitHub Actions
- [ ] Upload coverage to Codecov
- [ ] Set minimum threshold (70%)

Documentation:
- [ ] Add coverage badge to README.md
- [ ] Document coverage requirements

## Acceptance Criteria
- [ ] Coverage collected on every CI run
- [ ] Coverage badge visible in README
- [ ] Minimum thresholds enforced
- [ ] PRs blocked if coverage decreases

## Estimated Effort
1-2 hours

## Sprint
Sprint 1 (Week 1)
```

---

### Issue #76: CI Cache Optimization

**Title**: Optimize GitHub Actions caching for faster builds

**Labels**: `phase-2`, `enhancement`, `low`, `ci-cd`, `performance`

**Body**:
```markdown
## Overview
Improve CI execution time through better caching strategies.

## Optimizations
- [ ] Docker layer caching (type=gha)
- [ ] NPM package caching
- [ ] Pip dependency caching
- [ ] Playwright browser caching

## Expected Improvement
30% faster CI execution (15 min → 10 min)

## Acceptance Criteria
- [ ] Cache hit rate >80% for Docker
- [ ] Cache hit rate >90% for NPM
- [ ] CI execution time reduced by 30%
- [ ] No cache invalidation issues

## Estimated Effort
2 hours

## Sprint
Sprint 3 (Week 3)
```

---

### Issue #77: Load Testing Integration

**Title**: Integrate load testing into CI pipeline

**Labels**: `phase-2`, `enhancement`, `medium`, `ci-cd`, `performance`

**Body**:
```markdown
## Overview
Add automated load testing to detect performance regressions.

## Tasks
- [ ] Set up Locust or k6 for load testing
- [ ] Create test scenarios (student list, grade calc, attendance)
- [ ] Establish performance baselines (from $11.15.0)
- [ ] Integrate into GitHub Actions (weekly)
- [ ] Set up regression alerts

## Test Scenarios
- Student list: 100 concurrent users, 1000 students
- Grade calculation: 50 concurrent users, 500 grades
- Attendance: 30 concurrent users, 200 records
- Login: 100 concurrent users

## Baselines (p95)
- Student list: <100ms
- Grade calculation: <200ms
- Attendance: <80ms
- Login: <500ms

## Acceptance Criteria
- [ ] Load tests running locally
- [ ] Integrated into CI (weekly)
- [ ] Baselines documented
- [ ] Regression alerts configured

## Estimated Effort
2-3 hours

## Sprint
Sprint 3 (Week 2-3)
```

---

## 📚 Documentation Issues

### Issue #78: Admin Permission Management Guide

**Title**: Create admin guide for managing permissions

**Labels**: `phase-2`, `enhancement`, `medium`, `documentation`

**Body**:
```markdown
## Overview
Create comprehensive guide for administrators managing permissions.

## Documents to Create
- [ ] `docs/admin/PERMISSION_MANAGEMENT.md` - How-to guide
- [ ] `docs/admin/RBAC_MIGRATION_GUIDE.md` - Upgrade guide for $11.15.0 → $11.15.0
- [ ] `docs/admin/PERMISSION_TROUBLESHOOTING.md` - Common issues

## Content
- Permission concepts and terminology
- How to assign permissions to roles
- How to create custom roles
- Best practices and security considerations
- Migration steps from $11.15.0

## Acceptance Criteria
- [ ] All guides complete and reviewed
- [ ] Examples and screenshots included
- [ ] Tested by non-technical admin
- [ ] Linked from main documentation index

## Estimated Effort
2-3 hours

## Sprint
Sprint 4 (Week 4)

## Dependencies
- #72 (permission API)
- #73 (permission UI, if implemented)
```

---

### Issue #79: Testing Documentation Consolidation

**Title**: Consolidate and update testing documentation

**Labels**: `phase-2`, `enhancement`, `low`, `documentation`

**Body**:
```markdown
## Overview
Update E2E testing documentation with CI findings and best practices.

## Updates Needed
- [ ] Add CI-specific troubleshooting to E2E_TESTING_GUIDE.md
- [ ] Document common CI timeout issues
- [ ] Add debugging tips for GitHub Actions
- [ ] Create quick reference for running tests locally
- [ ] Update with load testing information

## Acceptance Criteria
- [ ] E2E_TESTING_GUIDE.md updated with CI section
- [ ] All common issues documented
- [ ] Quick reference created
- [ ] Validated by team

## Estimated Effort
1 hour

## Sprint
Sprint 3 (Week 2)

## Dependencies
- #74 (E2E CI monitoring)
```

---

## 🚀 Release Issue

### Issue #80: $11.15.0 Release Preparation

**Title**: Prepare $11.15.0 release with Phase 2 improvements

**Labels**: `phase-2`, `enhancement`, `release`

**Body**:
```markdown
## Overview
Final release preparation for $11.15.0 with all Phase 2 improvements.

## Pre-Release Tasks
- [ ] All Phase 2 issues closed (#68-#79)
- [ ] All tests passing (backend, frontend, E2E)
- [ ] Performance benchmarks validated
- [ ] Security review complete
- [ ] Documentation updated

## Release Tasks
- [ ] Update VERSION file to 1.16.0
- [ ] Update CHANGELOG.md
- [ ] Create release notes (docs/releases/RELEASE_NOTES_$11.15.0.md)
- [ ] Test database migration (1.15.0 → 1.16.0)
- [ ] Build and test Docker image
- [ ] Create GitHub Release
- [ ] Tag: $11.15.0

## Post-Release Tasks
- [ ] Monitor for issues (24 hours)
- [ ] Update project roadmap
- [ ] Close milestone $11.15.0
- [ ] Plan Phase 3 (if applicable)

## Acceptance Criteria
- [ ] Release published on GitHub
- [ ] Docker image available
- [ ] Documentation complete
- [ ] No critical issues in first 24 hours

## Estimated Effort
4-6 hours

## Sprint
Sprint 6 (Week 6)

## Dependencies
All Phase 2 issues (#68-#79)
```

---

## 📋 Issue Summary Table

| Issue | Title | Priority | Effort | Sprint |
|-------|-------|----------|--------|--------|
| #68 | RBAC Permission Matrix Design | CRITICAL | 2-3h | Week 1 |
| #69 | Database Schema for Permissions | CRITICAL | 3-4h | Week 1 |
| #70 | Backend Permission Utilities | HIGH | 4-5h | Week 2 |
| #71 | Refactor Endpoints | HIGH | 6-8h | Week 2-3 |
| #72 | Permission Management API | HIGH | 4-5h | Week 2 |
| #73 | Permission Management UI | MEDIUM | 6-8h | Week 3 (optional) |
| #74 | E2E Test CI Monitoring | HIGH | 2-4h | Week 1 |
| #75 | Coverage Reporting | HIGH | 1-2h | Week 1 |
| #76 | CI Cache Optimization | LOW | 2h | Week 3 |
| #77 | Load Testing Integration | MEDIUM | 2-3h | Week 2-3 |
| #78 | Admin Permission Guide | MEDIUM | 2-3h | Week 4 |
| #79 | Testing Documentation | LOW | 1h | Week 2 |
| #80 | $11.15.0 Release Prep | RELEASE | 4-6h | Week 6 |

**Total Effort**: ~40-52 hours (excluding optional #73)

---

## 🎯 Creation Order

**Week 1 (Create First)**:
1. #68 - RBAC Permission Matrix Design
2. #69 - Database Schema for Permissions
3. #74 - E2E Test CI Monitoring
4. #75 - Coverage Reporting Integration

**Week 2 (Create After Sprint 1)**:
5. #70 - Backend Permission Utilities
6. #71 - Refactor Endpoints
7. #72 - Permission Management API
8. #77 - Load Testing Integration

**Week 3-4 (Create Later)**:
9. #73 - Permission Management UI (optional)
10. #76 - CI Cache Optimization
11. #78 - Admin Permission Guide
12. #79 - Testing Documentation

**Week 6 (Create Last)**:
13. #80 - $11.15.0 Release Preparation

---

**Created**: January 6, 2026
**Ready For**: GitHub issue creation
**Reference**: [Phase 2 Consolidated Plan](../plans/PHASE2_CONSOLIDATED_PLAN.md)
