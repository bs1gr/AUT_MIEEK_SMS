# Permission Reference - Complete Matrix

**Version**: 1.15.1
**Date**: January 11, 2026
**Purpose**: Comprehensive reference of all system permissions in SMS

---

## Overview

All permissions in SMS follow the format: **`resource:action`**

- **Resource**: What you're accessing (students, courses, grades, etc.)
- **Action**: What you're doing (view, create, edit, delete, manage)

**Special Values**:
- `*:*` = All permissions (admin only)
- `resource:*` = All actions on a resource

---

## Complete Permission List

### 1. Student Management Permissions

#### `students:view`

- **Resource**: Students
- **Action**: View
- **Description**: Read student data including profiles, contact info, enrollment status
- **Applies to Endpoints**:
  - GET /api/v1/students
  - GET /api/v1/students/{id}
  - GET /api/v1/students/search
- **Assigned By Default To**: admin, teacher, viewer
- **Required For**: Viewing student lists, accessing student details
- **Scope**: All students (teachers see only their class students)

#### `students:create`

- **Resource**: Students
- **Action**: Create
- **Description**: Create new student records
- **Applies to Endpoints**:
  - POST /api/v1/students
- **Assigned By Default To**: admin
- **Required For**: Registering new students
- **Scope**: Can create for any course/class

#### `students:edit`

- **Resource**: Students
- **Action**: Edit
- **Description**: Modify existing student data
- **Applies to Endpoints**:
  - PUT /api/v1/students/{id}
  - PATCH /api/v1/students/{id}
- **Assigned By Default To**: admin, teacher
- **Required For**: Updating student info, changing enrollments
- **Scope**: Varies (teachers may be limited to their class)

#### `students:delete`

- **Resource**: Students
- **Action**: Delete
- **Description**: Remove student records (soft delete, kept in audit)
- **Applies to Endpoints**:
  - DELETE /api/v1/students/{id}
- **Assigned By Default To**: admin
- **Required For**: Removing students from system
- **Scope**: Can delete any student

---

### 2. Course Management Permissions

#### `courses:view`

- **Resource**: Courses
- **Action**: View
- **Description**: Read course information including curriculum, schedule, enrollment
- **Applies to Endpoints**:
  - GET /api/v1/courses
  - GET /api/v1/courses/{id}
  - GET /api/v1/courses/{id}/students
- **Assigned By Default To**: admin, teacher, viewer
- **Required For**: Viewing course list, accessing course details

#### `courses:create`

- **Resource**: Courses
- **Action**: Create
- **Description**: Create new courses
- **Applies to Endpoints**:
  - POST /api/v1/courses
- **Assigned By Default To**: admin
- **Required For**: Setting up new courses/classes

#### `courses:edit`

- **Resource**: Courses
- **Action**: Edit
- **Description**: Modify course details (name, description, schedule)
- **Applies to Endpoints**:
  - PUT /api/v1/courses/{id}
  - PATCH /api/v1/courses/{id}
- **Assigned By Default To**: admin
- **Required For**: Updating course information

#### `courses:delete`

- **Resource**: Courses
- **Action**: Delete
- **Description**: Remove courses from system
- **Applies to Endpoints**:
  - DELETE /api/v1/courses/{id}
- **Assigned By Default To**: admin
- **Required For**: Discontinuing courses

---

### 3. Grade Management Permissions

#### `grades:view`

- **Resource**: Grades
- **Action**: View
- **Description**: Read grade data (student grades, grade books)
- **Applies to Endpoints**:
  - GET /api/v1/grades
  - GET /api/v1/grades/{id}
  - GET /api/v1/students/{id}/grades
  - GET /api/v1/courses/{id}/grades
- **Assigned By Default To**: admin, teacher, viewer
- **Scope**:
  - Admin: All students' grades
  - Teacher: Only their class' grades
  - Student: Own grades (enforced at endpoint)
  - Viewer: All grades (read-only)

#### `grades:edit`

- **Resource**: Grades
- **Action**: Edit
- **Description**: Submit and modify grades
- **Applies to Endpoints**:
  - POST /api/v1/grades
  - PUT /api/v1/grades/{id}
  - PATCH /api/v1/grades/{id}
  - DELETE /api/v1/grades/{id}
- **Assigned By Default To**: admin, teacher
- **Scope**:
  - Admin: All grades
  - Teacher: Only their class' grades
- **Required For**: Grade entry, grade corrections

---

### 4. Attendance Management Permissions

#### `attendance:view`

- **Resource**: Attendance
- **Action**: View
- **Description**: Read attendance records
- **Applies to Endpoints**:
  - GET /api/v1/attendance
  - GET /api/v1/attendance/{id}
  - GET /api/v1/students/{id}/attendance
  - GET /api/v1/courses/{id}/attendance
- **Assigned By Default To**: admin, teacher, viewer
- **Scope**:
  - Admin: All attendance
  - Teacher: Their class attendance
  - Viewer: Read-only all attendance

#### `attendance:edit`

- **Resource**: Attendance
- **Action**: Edit
- **Description**: Create and modify attendance records
- **Applies to Endpoints**:
  - POST /api/v1/attendance
  - PUT /api/v1/attendance/{id}
  - PATCH /api/v1/attendance/{id}
- **Assigned By Default To**: admin, teacher
- **Scope**:
  - Admin: All classes
  - Teacher: Their own classes
- **Required For**: Logging attendance, corrections

---

### 5. Report & Analytics Permissions

#### `reports:view`

- **Resource**: Reports
- **Action**: View
- **Description**: Read generated reports
- **Applies to Endpoints**:
  - GET /api/v1/reports
  - GET /api/v1/reports/{id}
  - GET /api/v1/reports/download/{id}
- **Assigned By Default To**: admin, teacher, viewer

#### `reports:generate`

- **Resource**: Reports
- **Action**: Generate
- **Description**: Create new reports (grades summary, attendance, performance)
- **Applies to Endpoints**:
  - POST /api/v1/reports
  - POST /api/v1/reports/academic-summary
  - POST /api/v1/reports/attendance-summary
- **Assigned By Default To**: admin, teacher
- **Required For**: Running report generation jobs

#### `analytics:view`

- **Resource**: Analytics
- **Action**: View
- **Description**: Read analytics dashboards and statistics
- **Applies to Endpoints**:
  - GET /api/v1/analytics/dashboard
  - GET /api/v1/analytics/trends
  - GET /api/v1/analytics/student-performance
- **Assigned By Default To**: admin, teacher, viewer
- **Scope**: Teachers see only their class analytics

#### `metrics:view`

- **Resource**: Metrics
- **Action**: View
- **Description**: Access system metrics and performance data
- **Applies to Endpoints**:
  - GET /api/v1/metrics/system
  - GET /api/v1/metrics/api-performance
  - GET /api/v1/metrics/database-health
- **Assigned By Default To**: admin, teacher, viewer
- **Scope**: Admin sees all metrics, others see filtered

---

### 6. System Administration Permissions

#### `audit:view`

- **Resource**: Audit Log
- **Action**: View
- **Description**: Read audit logs of system actions
- **Applies to Endpoints**:
  - GET /api/v1/audit/logs
  - GET /api/v1/audit/logs/{id}
- **Assigned By Default To**: admin
- **Scope**: Read-only access to all audit entries
- **Note**: Critical for compliance and security auditing

#### `permissions:view`

- **Resource**: Permissions
- **Action**: View
- **Description**: View permission definitions and role mappings
- **Applies to Endpoints**:
  - GET /api/v1/permissions
  - GET /api/v1/permissions/by-resource
  - GET /api/v1/permissions/{id}
  - GET /api/v1/rbac/roles
  - GET /api/v1/rbac/users/{id}/permissions
- **Assigned By Default To**: admin
- **Required For**: Permission auditing

#### `permissions:manage`

- **Resource**: Permissions
- **Action**: Manage
- **Description**: Grant and revoke permissions, create custom roles
- **Applies to Endpoints**:
  - POST /api/v1/permissions
  - PUT /api/v1/permissions/{id}
  - DELETE /api/v1/permissions/{id}
  - POST /api/v1/permissions/users/grant
  - POST /api/v1/permissions/users/revoke
  - POST /api/v1/permissions/roles/grant
  - POST /api/v1/permissions/roles/revoke
  - POST /api/v1/rbac/roles
  - PUT /api/v1/rbac/roles/{id}
- **Assigned By Default To**: admin
- **Scope**: Full permission administration
- **⚠️ CRITICAL**: Only grant to trusted administrators

#### `jobs:manage`

- **Resource**: Background Jobs
- **Action**: Manage
- **Description**: Control background jobs (start, stop, monitor)
- **Applies to Endpoints**:
  - GET /api/v1/jobs
  - GET /api/v1/jobs/{id}
  - POST /api/v1/jobs/{id}/start
  - POST /api/v1/jobs/{id}/stop
  - DELETE /api/v1/jobs/{id}
- **Assigned By Default To**: admin
- **Scope**: Full job management
- **Examples**: Report generation, data exports, batch processing

#### `imports:manage`

- **Resource**: Imports
- **Action**: Manage
- **Description**: Import data (students, courses, grades)
- **Applies to Endpoints**:
  - POST /api/v1/imports/students
  - POST /api/v1/imports/courses
  - POST /api/v1/imports/grades
  - POST /api/v1/imports/{id}/preview
  - POST /api/v1/imports/{id}/execute
- **Assigned By Default To**: admin
- **Scope**: Full import capability
- **Warning**: Can modify large datasets

#### `exports:generate`

- **Resource**: Exports
- **Action**: Generate
- **Description**: Export data to external formats
- **Applies to Endpoints**:
  - POST /api/v1/exports/students
  - POST /api/v1/exports/courses
  - POST /api/v1/exports/grades
  - POST /api/v1/exports/attendance
  - GET /api/v1/exports/{id}/download
- **Assigned By Default To**: admin
- **Scope**: Can export all data
- **Note**: Data sensitivity - consider scoping to admin only

---

### 7. Advanced Feature Permissions

#### `notifications:broadcast`

- **Resource**: Notifications
- **Action**: Broadcast
- **Description**: Send system-wide notifications to users
- **Applies to Endpoints**:
  - POST /api/v1/notifications/broadcast
  - POST /api/v1/notifications/class
  - POST /api/v1/notifications/user
- **Assigned By Default To**: admin
- **Scope**: Can send to any user/class
- **Examples**: System alerts, announcements, maintenance notices

#### `diagnostics:view`

- **Resource**: Diagnostics
- **Action**: View
- **Description**: Check system health and diagnostics
- **Applies to Endpoints**:
  - GET /api/v1/admin/diagnostics
  - GET /api/v1/admin/health
  - GET /api/v1/admin/performance
- **Assigned By Default To**: admin
- **Scope**: Full system diagnostics
- **Examples**: Database health, API performance, error rates

#### `diagnostics:manage`

- **Resource**: Diagnostics
- **Action**: Manage
- **Description**: Reset and manage diagnostics
- **Applies to Endpoints**:
  - POST /api/v1/admin/diagnostics/reset
  - POST /api/v1/admin/cache/clear
  - POST /api/v1/admin/logs/cleanup
- **Assigned By Default To**: admin
- **Scope**: Full diagnostic management
- **Warning**: Can affect system state

#### `sessions:manage`

- **Resource**: Sessions
- **Action**: Manage
- **Description**: View and manage user sessions
- **Applies to Endpoints**:
  - GET /api/v1/admin/sessions
  - GET /api/v1/admin/sessions/{id}
  - POST /api/v1/admin/sessions/{id}/logout
  - DELETE /api/v1/admin/sessions/{id}
- **Assigned By Default To**: admin
- **Scope**: Full session management
- **Examples**: Force logout, session monitoring

#### `users:view`

- **Resource**: Users
- **Action**: View
- **Description**: View user accounts and details
- **Applies to Endpoints**:
  - GET /api/v1/admin/users
  - GET /api/v1/admin/users/{id}
- **Assigned By Default To**: admin
- **Scope**: Can view all user accounts

#### `users:manage`

- **Resource**: Users
- **Action**: Manage
- **Description**: Create, modify, and delete user accounts
- **Applies to Endpoints**:
  - POST /api/v1/admin/users
  - PUT /api/v1/admin/users/{id}
  - DELETE /api/v1/admin/users/{id}
  - POST /api/v1/admin/users/{id}/reset-password
- **Assigned By Default To**: admin
- **Scope**: Full user account management
- **⚠️ CRITICAL**: Only grant to trusted administrators

---

## Permission Combinations

### Common Role-Permission Mappings

#### Admin Role (`*:*` = all permissions)

```text
students:view, students:create, students:edit, students:delete,
courses:view, courses:create, courses:edit, courses:delete,
grades:view, grades:edit,
attendance:view, attendance:edit,
reports:view, reports:generate,
analytics:view, metrics:view,
audit:view,
permissions:view, permissions:manage,
jobs:manage, imports:manage, exports:generate,
notifications:broadcast,
diagnostics:view, diagnostics:manage,
sessions:manage,
users:view, users:manage

```text
#### Teacher Role

```text
students:view, students:edit,
courses:view,
grades:view, grades:edit,
attendance:view, attendance:edit,
reports:view, reports:generate,
analytics:view, metrics:view

```text
#### Student Role

```text
grades:view,
reports:view

```text
#### Viewer Role (Read-Only)

```text
students:view,
courses:view,
grades:view,
attendance:view,
reports:view,
analytics:view,
metrics:view

```text
---

## Permission Hierarchy & Dependencies

### Resource Dependencies

```text
students → courses (students enroll in courses)
          → grades (grades linked to students)
          → attendance (attendance linked to students)

courses → grades (grades linked to courses)
        → attendance (attendance linked to courses)

reports → depends on: students, courses, grades, attendance
analytics → depends on: students, courses, grades, attendance

```text
**Implication**: If user can view `grades:view`, they implicitly need `students:view` and `courses:view` to understand the data context.

### Action Hierarchy

```text
view < edit < create/delete < manage

Where:
- view = read-only
- edit = modify existing
- create/delete = add new / remove
- manage = full control (combined view+edit+create+delete+special)

```text
---

## Special Cases

### Scoped Permissions

Some permissions are scoped - meaning access is filtered based on user role/context:

| Permission | Scoped? | Scope Definition |
|-----------|---------|------------------|
| `students:view` | YES | Admin: all; Teacher: own class; Student: self |
| `grades:view` | YES | Admin: all; Teacher: own class; Student: self |
| `attendance:view` | YES | Admin: all; Teacher: own class; Student: self |
| `analytics:view` | YES | Admin: all; Teacher: own class only |
| `reports:view` | NO | Same report available to all |
| `exports:generate` | NO | Can export all data (admin only recommended) |

### Permissions That Depend on Endpoint

Same endpoint may require different permissions based on operation:

**Example: /api/v1/grades**

```text
GET /api/v1/grades                    → requires grades:view
POST /api/v1/grades                   → requires grades:edit
PUT /api/v1/grades/{id}               → requires grades:edit
GET /api/v1/grades/statistics         → requires grades:view + analytics:view

```text
---

## Testing Permissions

### Test Scenarios

```bash
# Test 1: User with students:view can read students

GET /api/v1/students
Authorization: Bearer {student_viewer_token}
Expected: 200 OK

# Test 2: User without students:create cannot create students

POST /api/v1/students
Authorization: Bearer {student_viewer_token}
Expected: 403 Forbidden

# Test 3: User with students:create can create students

POST /api/v1/students
Authorization: Bearer {admin_token}
Expected: 201 Created

# Test 4: User can access only their own student record

GET /api/v1/students/{another_students_id}
Authorization: Bearer {student_token}
Expected: 403 Forbidden (scoped access)

# Test 5: User with multiple roles has combined permissions

Authorization: Bearer {department_head_token}  # Has both teacher + student:create
Expected: Can access both grades:edit AND students:create

```text
---

## Permission Audit Queries

### Find all users with specific permission

```sql
SELECT DISTINCT u.id, u.username
FROM user u
LEFT JOIN user_role ur ON u.id = ur.user_id
LEFT JOIN role_permission rp ON ur.role_id = rp.role_id
LEFT JOIN permission p ON rp.permission_id = p.id
WHERE p.name = 'students:create'
   OR EXISTS (
     SELECT 1 FROM user_permission up
     WHERE up.user_id = u.id AND up.permission_id = p.id
   );

```text
### Find all permissions for specific user

```sql
SELECT DISTINCT p.name, p.resource, p.action
FROM user u
LEFT JOIN user_role ur ON u.id = ur.user_id
LEFT JOIN role_permission rp ON ur.role_id = rp.role_id
LEFT JOIN permission p ON rp.permission_id = p.id
WHERE u.id = {user_id}
ORDER BY p.resource, p.action;

```text
### Find unused permissions

```sql
SELECT p.id, p.name
FROM permission p
LEFT JOIN role_permission rp ON p.id = rp.permission_id
LEFT JOIN user_permission up ON p.id = up.permission_id
WHERE rp.permission_id IS NULL AND up.permission_id IS NULL;

```text
---

## Migration Guide ($11.18.3 → $11.18.3)

### What Changed

- New @require_permission decorator replaces manual role checking
- All 65 endpoints refactored to use decorator pattern
- Permission matrix expanded to 26 permissions
- 17 previously unprotected endpoints now require authentication

### No Action Required

- Existing users maintain their roles and permissions
- Existing API clients continue to work
- Database schema backward compatible

### What to Verify

1. Users with admin role still have full access
2. Teachers can still grade and take attendance
3. Students can still view their own grades
4. Reports still generate correctly
5. Exports still work with appropriate permissions

---

**Version**: 1.15.1
**Last Updated**: January 11, 2026
**Status**: Production Ready ✅
