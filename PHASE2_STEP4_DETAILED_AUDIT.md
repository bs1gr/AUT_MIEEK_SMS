# Phase 2 Step 4: Endpoint Refactoring - Detailed Audit

**Date**: January 11, 2026
**Status**: ⏳ IN-PROGRESS - Major Discovery
**Discovery**: Only 55% complete, need to refactor 71 endpoints

---

## 📊 Complete Endpoint Audit Results

**Total Endpoints**: 158
**Already Protected**: 87 (55%) ✅
**Legacy require_role()**: 42 (27%) ⚠️
**Unprotected**: 29 (18%) ❌

---

## ✅ Routers Already Complete (87 endpoints)

These routers already use `@require_permission()` - **NO WORK NEEDED**:

| Router | Endpoints | Status |
|--------|-----------|--------|
| routers_students.py | 8 | ✅ COMPLETE (students:*) |
| routers_courses.py | 7 | ✅ COMPLETE (courses:*) |
| routers_enrollments.py | 6 | ✅ COMPLETE (enrollments:*) |
| routers_grades.py | 8 | ✅ COMPLETE (grades:*) |
| routers_attendance.py | 10 | ✅ COMPLETE (attendance:*) |
| routers_highlights.py | 6 | ✅ COMPLETE (students:*) |
| routers_performance.py | 6 | ✅ COMPLETE (students:*) |
| routers_analytics.py | 4 | ✅ COMPLETE (reports:generate) |
| routers_reports.py | 7 | ✅ COMPLETE (reports:generate) |
| routers_metrics.py | 5 | ✅ COMPLETE (reports:generate) |
| routers_adminops.py | 3 | ✅ COMPLETE (adminops:*) via optional_require_permission |
| **TOTAL** | **87** | **55% of all endpoints** |

---

## ⚠️ Routers Needing Migration (42 endpoints)

These use **legacy `require_role()`** - need migration to `@require_permission()`:

### High Priority (Admin-Critical)

#### 1. routers_admin.py (1 endpoint)
**Current**: Uses `require_role("admin")`
**Target**: `@require_permission("users:view")`

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| GET /admin/users | require_role("admin") | users:view |

**Effort**: 5 minutes

---

#### 2. routers_audit.py (3 endpoints)
**Current**: Uses `require_role("admin")`
**Target**: `@require_permission("audit:view")`

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| GET /audit/logs | require_role("admin") | audit:view |
| GET /audit/logs/{id} | require_role("admin") | audit:view |
| GET /audit/stats | require_role("admin") | audit:view |

**Effort**: 10 minutes

---

#### 3. routers_auth.py (13 endpoints)
**Current**: Uses `require_role("admin")` + authentication endpoints
**Target**: Mixed (some public, some require permissions)

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| POST /auth/register | None (public) | None (keep public) |
| POST /auth/login | None (public) | None (keep public) |
| POST /auth/logout | require_role("user") | None (authenticated only) |
| POST /auth/refresh | require_role("user") | None (authenticated only) |
| GET /auth/me | require_role("user") | None (authenticated only) |
| POST /auth/change-password | require_role("user") | users:edit_self |
| POST /auth/reset-password | None (public) | None (keep public) |
| POST /auth/reset-password/confirm | None (public) | None (keep public) |
| POST /auth/verify-email | None (public) | None (keep public) |
| GET /auth/users | require_role("admin") | users:view |
| POST /auth/users | require_role("admin") | users:create |
| PUT /auth/users/{id} | require_role("admin") | users:edit |
| DELETE /auth/users/{id} | require_role("admin") | users:delete |

**Effort**: 20 minutes

---

#### 4. routers_imports.py (4 endpoints)
**Current**: Uses `optional_require_permission()` + `require_role()`
**Target**: All `@require_permission("system:import")`

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| POST /imports/students | optional_require_permission("system:import") | system:import |
| POST /imports/courses | optional_require_permission("system:import") | system:import |
| POST /imports/grades | optional_require_permission("system:import") | system:import |
| POST /imports/attendance | require_role("admin") | system:import |

**Effort**: 10 minutes

---

#### 5. routers_jobs.py (5 endpoints)
**Current**: Uses `require_role("admin")`
**Target**: `@require_permission("system:jobs")`

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| GET /jobs | require_role("admin") | system:jobs_view |
| GET /jobs/{id} | require_role("admin") | system:jobs_view |
| POST /jobs/{id}/cancel | require_role("admin") | system:jobs_manage |
| DELETE /jobs/{id} | require_role("admin") | system:jobs_manage |
| POST /jobs/cleanup | require_role("admin") | system:jobs_manage |

**Effort**: 10 minutes

---

#### 6. routers_notifications.py (9 endpoints)
**Current**: Uses `require_role()`
**Target**: Mixed permissions

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| GET /notifications | require_role("user") | None (self only) |
| GET /notifications/{id} | require_role("user") | None (self only) |
| PUT /notifications/{id}/read | require_role("user") | None (self only) |
| PUT /notifications/mark-all-read | require_role("user") | None (self only) |
| DELETE /notifications/{id} | require_role("user") | None (self only) |
| POST /notifications/send | require_role("admin") | notifications:send |
| POST /notifications/broadcast | require_role("admin") | notifications:broadcast |
| GET /notifications/preferences | require_role("user") | None (self only) |
| PUT /notifications/preferences | require_role("user") | None (self only) |

**Effort**: 15 minutes

---

#### 7. routers_rbac.py (16 endpoints)
**Current**: Uses `require_role("admin")`
**Target**: `@require_permission("permissions:*")`

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| GET /rbac/roles | require_role("admin") | permissions:view |
| POST /rbac/roles | require_role("admin") | permissions:create |
| GET /rbac/roles/{id} | require_role("admin") | permissions:view |
| PUT /rbac/roles/{id} | require_role("admin") | permissions:edit |
| DELETE /rbac/roles/{id} | require_role("admin") | permissions:delete |
| GET /rbac/permissions | require_role("admin") | permissions:view |
| POST /rbac/permissions | require_role("admin") | permissions:create |
| GET /rbac/permissions/{id} | require_role("admin") | permissions:view |
| PUT /rbac/permissions/{id} | require_role("admin") | permissions:edit |
| DELETE /rbac/permissions/{id} | require_role("admin") | permissions:delete |
| POST /rbac/users/{id}/grant | require_role("admin") | permissions:grant |
| POST /rbac/users/{id}/revoke | require_role("admin") | permissions:revoke |
| GET /rbac/users/{id}/permissions | require_role("admin") | permissions:view |
| POST /rbac/roles/{id}/grant | require_role("admin") | permissions:grant |
| POST /rbac/roles/{id}/revoke | require_role("admin") | permissions:revoke |
| GET /rbac/roles/{id}/permissions | require_role("admin") | permissions:view |

**Effort**: 25 minutes

---

#### 8. routers_sessions.py (6 endpoints)
**Current**: Uses `require_role()`
**Target**: Mixed permissions

| Endpoint | Current Protection | New Permission |
|----------|-------------------|----------------|
| GET /sessions | require_role("user") | None (self only) |
| GET /sessions/{id} | require_role("user") | None (self only) |
| DELETE /sessions/{id} | require_role("user") | None (self only) |
| DELETE /sessions/all | require_role("user") | None (self only) |
| GET /sessions/active | require_role("admin") | users:view |
| POST /sessions/{id}/revoke | require_role("admin") | users:edit |

**Effort**: 10 minutes

---

## ❌ Routers Needing New Protection (29 endpoints)

These have **NO permission decorators** - need `@require_permission()` added:

### 1. routers_diagnostics.py (5 endpoints)
**Status**: Unprotected
**Target**: `@require_permission("system:diagnostics")`

| Endpoint | New Permission |
|----------|----------------|
| GET /diagnostics/health | system:diagnostics (or public?) |
| GET /diagnostics/db | system:diagnostics |
| GET /diagnostics/redis | system:diagnostics |
| GET /diagnostics/cache | system:diagnostics |
| GET /diagnostics/performance | system:diagnostics |

**Effort**: 10 minutes

---

### 2. routers_exports.py (13 endpoints)
**Status**: 2 with optional_require_permission, 11 unprotected
**Target**: `@require_permission("system:export")`

| Endpoint | New Permission |
|----------|----------------|
| GET /exports/students | system:export |
| GET /exports/courses | system:export |
| GET /exports/grades | system:export |
| GET /exports/attendance | system:export |
| GET /exports/reports | system:export |
| GET /exports/analytics | system:export |
| (+ 7 more) | system:export |

**Effort**: 20 minutes

---

### 3. routers_feedback.py (1 endpoint)
**Status**: Unprotected
**Target**: `@require_permission("feedback:submit")` or public?

| Endpoint | New Permission |
|----------|----------------|
| POST /feedback | feedback:submit (or public?) |

**Effort**: 5 minutes

---

### 4. routers_permissions.py (12 endpoints)
**Status**: 11 have @require_permission, 1 missing
**Target**: Fix missing endpoint

| Endpoint | Current | New Permission |
|----------|---------|----------------|
| (1 endpoint missing decorator) | None | permissions:* |

**Effort**: 5 minutes

---

## 📊 Effort Summary

| Category | Routers | Endpoints | Estimated Effort |
|----------|---------|-----------|------------------|
| ✅ Already Complete | 11 | 87 | 0 min (done!) |
| ⚠️ Legacy Migration | 8 | 42 | 115 min (~2 hours) |
| ❌ New Protection | 4 | 29 | 40 min |
| **TOTAL** | **23** | **158** | **2.5 hours** |

---

## 🎯 Execution Strategy

### Phase 1: Admin-Critical (1 hour)
1. routers_admin.py (5 min)
2. routers_audit.py (10 min)
3. routers_rbac.py (25 min)
4. routers_jobs.py (10 min)
5. routers_imports.py (10 min)

### Phase 2: Authentication & Users (30 min)
1. routers_auth.py (20 min)
2. routers_sessions.py (10 min)

### Phase 3: System Operations (40 min)
1. routers_notifications.py (15 min)
2. routers_exports.py (20 min)
3. routers_diagnostics.py (10 min)

### Phase 4: Minor Fixes (10 min)
1. routers_feedback.py (5 min)
2. routers_permissions.py (5 min)

---

## ✅ Success Criteria

- All 158 endpoints protected with `@require_permission()`
- No legacy `require_role()` usage remaining
- All imports updated to use `from backend.rbac import require_permission`
- Full backend test suite passing (370+ tests)
- E2E tests passing (19+ critical tests)
- Documentation updated (API_PERMISSIONS_REFERENCE.md)

---

**Created**: January 11, 2026
**Status**: ⏳ READY TO EXECUTE
**Next**: Start with Phase 1 (Admin-Critical routers)
