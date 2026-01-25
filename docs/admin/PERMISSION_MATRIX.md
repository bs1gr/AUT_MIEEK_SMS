# Permission Matrix - RBAC Design

**Created**: January 8, 2026
**Updated**: January 11, 2026
**Status**: ✅ PHASE 2 STEP 1 - COMPLETE
**Version**: 1.0 (Final - Ready for Implementation)
**Total Admin Endpoints**: 79 endpoints mapped
**Total Permissions**: 25 permissions defined

---

## 📋 Permission Overview

This document defines all permissions for the Student Management System's Role-Based Access Control (RBAC) implementation.

### Permission Naming Convention

- Format: `<domain>:<action>`
- Domain: students, courses, grades, attendance, reports, audit, users, system
- Action: view, create, edit, delete, manage

### Total Permissions Defined: **18 core + 7 advanced = 25 permissions**

---

## 🎯 Core Permissions (18)

### 1. Student Management Permissions (4)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `students:view` | View student list and details | `GET /students`, `GET /students/{id}` | ✅ | ✅ | ✅ |
| `students:create` | Create new students | `POST /students` | ✅ | ❌ | ❌ |
| `students:edit` | Update student information | `PUT /students/{id}` | ✅ | ⚠️ Limited | ❌ |
| `students:delete` | Soft-delete students | `DELETE /students/{id}` | ✅ | ❌ | ❌ |

**Endpoints**: 8 total (routers_students.py)

---

### 2. Course Management Permissions (4)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `courses:view` | View course list and details | `GET /courses`, `GET /courses/{id}` | ✅ | ✅ | ✅ |
| `courses:create` | Create new courses | `POST /courses` | ✅ | ❌ | ❌ |
| `courses:edit` | Update course information | `PUT /courses/{id}` | ✅ | ❌ | ❌ |
| `courses:delete` | Soft-delete courses | `DELETE /courses/{id}` | ✅ | ❌ | ❌ |

**Endpoints**: 7 total (routers_courses.py)

---

### 3. Grade Management Permissions (3)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `grades:view` | View grade records | `GET /grades`, `GET /grades/{id}`, `GET /grades/student/{id}` | ✅ | ✅ | ✅ |
| `grades:edit` | Submit and update grades | `POST /grades`, `PUT /grades/{id}` | ✅ | ✅ | ❌ |
| `grades:delete` | Delete grade records | `DELETE /grades/{id}` | ✅ | ❌ | ❌ |

**Endpoints**: 8 total (routers_grades.py)

---

### 4. Attendance Management Permissions (3)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `attendance:view` | View attendance records | `GET /attendance`, `GET /attendance/{id}` | ✅ | ✅ | ✅ |
| `attendance:edit` | Log and update attendance | `POST /attendance`, `PUT /attendance/{id}` | ✅ | ✅ | ❌ |
| `attendance:delete` | Delete attendance records | `DELETE /attendance/{id}` | ✅ | ❌ | ❌ |

**Endpoints**: 10 total (routers_attendance.py)

---

### 5. Enrollment Management Permissions (2)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `enrollments:view` | View course enrollments | `GET /enrollments`, `GET /enrollments/{id}` | ✅ | ✅ | ✅ |
| `enrollments:manage` | Create/update/delete enrollments | `POST /enrollments`, `PUT /enrollments/{id}`, `DELETE /enrollments/{id}` | ✅ | ✅ | ❌ |

**Endpoints**: 6 total (routers_enrollments.py)

---

### 6. Reports & Analytics Permissions (2)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `reports:view` | View and generate reports | `GET /reports/*`, `POST /reports/generate` | ✅ | ✅ | ⚠️ Limited |
| `analytics:view` | View analytics dashboards | `GET /analytics/*`, `GET /metrics/*` | ✅ | ✅ | ⚠️ Limited |

**Endpoints**: 16 total (routers_reports.py + routers_analytics.py + routers_metrics.py)

---

## 🔧 Administrative Permissions (7)

### 7. User Management Permissions (2)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `users:view` | View user list | `GET /auth/users`, `GET /admin/users` | ✅ | ❌ | ❌ |
| `users:manage` | Create/update/delete users, manage roles | `POST /auth/register`, `PUT /auth/users/{id}`, `DELETE /auth/users/{id}`, `PUT /auth/users/{id}/role` | ✅ | ❌ | ❌ |

**Endpoints**: 14 total (routers_auth.py + routers_admin.py)

---

### 8. Permission Management Permissions (2)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `permissions:view` | View permissions and roles | `GET /permissions`, `GET /rbac/*` | ✅ | ❌ | ❌ |
| `permissions:manage` | Assign/revoke permissions | `POST /permissions`, `PUT /rbac/*`, `DELETE /rbac/*` | ✅ | ❌ | ❌ |

**Endpoints**: 28 total (routers_permissions.py + routers_rbac.py)

---

### 9. Audit & Monitoring Permissions (1)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `audit:view` | View audit logs and system diagnostics | `GET /audit/logs`, `GET /diagnostics/*`, `GET /performance/*` | ✅ | ❌ | ❌ |

**Endpoints**: 14 total (routers_audit.py + routers_diagnostics.py + routers_performance.py)

---

### 10. System Administration Permissions (2)

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `system:import` | Import data from files | `POST /imports/*` | ✅ | ❌ | ❌ |
| `system:export` | Export data to files | `POST /exports/*` | ✅ | ⚠️ Limited | ❌ |

**Endpoints**: 17 total (routers_imports.py + routers_exports.py)

---

## 📱 Special Permissions

### 11. Notifications & Communication

| Permission | Description | Endpoints Affected | Admin | Teacher | Viewer |
|------------|-------------|-------------------|-------|---------|--------|
| `notifications:manage` | Send broadcast notifications | `POST /notifications/broadcast` | ✅ | ⚠️ Limited | ❌ |

**Endpoints**: 9 total (routers_notifications.py)

**Note**: Regular users can view/manage their own notifications without special permission

---

## 🎭 Role Definitions

### Admin Role (Default: All Permissions)

```python
admin_permissions = [
    "students:view", "students:create", "students:edit", "students:delete",
    "courses:view", "courses:create", "courses:edit", "courses:delete",
    "grades:view", "grades:edit", "grades:delete",
    "attendance:view", "attendance:edit", "attendance:delete",
    "enrollments:view", "enrollments:manage",
    "reports:view", "analytics:view",
    "users:view", "users:manage",
    "permissions:view", "permissions:manage",
    "audit:view",
    "system:import", "system:export",
    "notifications:manage",
]

```text
### Teacher Role (Teaching Permissions)

```python
teacher_permissions = [
    "students:view", "students:edit",  # Can view and update (limited)
    "courses:view",
    "grades:view", "grades:edit",  # Can submit grades
    "attendance:view", "attendance:edit",  # Can log attendance
    "enrollments:view", "enrollments:manage",  # Can enroll students
    "reports:view", "analytics:view",  # Can generate reports
    "system:export",  # Can export for grading
    "notifications:manage",  # Can send class announcements (limited)
]

```text
### Viewer Role (Read-Only)

```python
viewer_permissions = [
    "students:view",
    "courses:view",
    "grades:view",
    "attendance:view",
    "enrollments:view",
    "reports:view",  # Limited reports
    "analytics:view",  # Limited analytics
]

```text
---

## 🔄 Permission Hierarchy & Combinations

### Implicit Permissions

Some permissions imply others:
- `students:edit` implies `students:view`
- `grades:edit` implies `grades:view`
- `permissions:manage` implies `permissions:view`

### Combined Permissions

Some operations require multiple permissions:
- **Grade calculation**: `grades:view` + `attendance:view`
- **Student report**: `students:view` + `grades:view` + `attendance:view`
- **Course management**: `courses:edit` + `enrollments:manage`

---

## 📊 Permission Coverage Analysis

### Endpoints by Permission Requirement

| Permission Domain | Endpoints | Percentage |
|-------------------|-----------|------------|
| Students | 8 | 5.4% |
| Courses | 7 | 4.7% |
| Grades | 8 | 5.4% |
| Attendance | 10 | 6.8% |
| Enrollments | 6 | 4.1% |
| Reports/Analytics | 16 | 10.8% |
| Users/Auth | 14 | 9.5% |
| Permissions/RBAC | 28 | 18.9% |
| Audit/Diagnostics | 14 | 9.5% |
| Import/Export | 17 | 11.5% |
| Notifications | 9 | 6.1% |
| Other | 11 | 7.4% |
| **Total** | **148** | **100%** |

---

## 🚀 Implementation Plan

### Phase 1: Database Changes (Week 1)

1. Create `permissions` table
2. Create `role_permissions` junction table
3. Seed 25 permissions
4. Assign default permissions to roles

### Phase 2: Backend Implementation (Week 2)

1. Implement `@require_permission()` decorator
2. Refactor all admin endpoints to use permissions
3. Add permission checks to existing endpoints

### Phase 3: API & UI (Week 3)

1. Create permission management API
2. Build admin UI for role/permission management
3. Add permission indicators in UI

---

## 📝 Open Questions

1. **Granular vs Coarse Permissions**: Should we have `students:view` or separate `students:list` and `students:detail`?
   - **Decision**: Keep coarse-grained (easier to manage, fewer permissions)

2. **Limited Permissions**: How to handle "limited" teacher permissions (e.g., can edit own students only)?
   - **Decision**: Add row-level security checks in endpoint logic, not in permission system

3. **Anonymous Access**: Which endpoints should allow anonymous access?
   - **Decision**: Only `/health`, `/feedback/submit`, and public endpoints

4. **Permission Caching**: Should we cache user permissions in JWT token?
   - **Decision**: Cache permission names in Redis, check on each request

---

## ✅ Next Steps

1. **Database Design** (#90) - Design Permission and RolePermission tables
2. **Implementation**: Start coding in Phase 2 Step 2 (Database Schema)

**Detailed endpoint mapping**: See `PERMISSION_MATRIX_ENDPOINT_MAPPING.md` for complete list of all 79 admin endpoints mapped to permissions.

---

**Last Updated**: January 11, 2026 (Phase 2 Step 1 Complete)
**Status**: ✅ APPROVED & READY FOR IMPLEMENTATION
**Deliverables**: 2 markdown documents + endpoint mapping complete
**Next Phase**: Step 2 - Database Schema & Migration (#90)
