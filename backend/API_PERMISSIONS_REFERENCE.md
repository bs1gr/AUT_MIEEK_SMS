# API Permissions Reference

**Version**: 1.15.1
**Last Updated**: January 8, 2026

This document provides a complete reference of all API endpoints and their required permissions after Phase 2 RBAC implementation.

## Overview

The Student Management System uses Role-Based Access Control (RBAC) with fine-grained permissions. Each administrative endpoint requires specific permissions, enforced via the `@require_permission` decorator.

### Permission Format

Permissions follow the format: `{resource}:{action}`

**Example**: `students:edit` (permission to edit student records)

## Authentication Modes

The API supports three authentication modes via the `AUTH_MODE` environment variable:

| Mode | Description | Use Case |
|------|-------------|----------|
| `disabled` | No authentication required | Emergency access, local development |
| `permissive` | Authentication optional | **Recommended for production** |
| `strict` | Full authentication required | Maximum security (not implemented yet) |

**Default**: `permissive`

## Permission Categories

### 1. Student Management (`students:*`)

| Permission | Description | Scope |
|-----------|-------------|-------|
| `students:view` | View student records | Read-only access |
| `students:create` | Create new students | Write access |
| `students:edit` | Update student information | Write access |
| `students:delete` | Delete students (soft-delete) | Destructive |

### 2. Course Management (`courses:*`)

| Permission | Description | Scope |
|-----------|-------------|-------|
| `courses:view` | View course catalog | Read-only access |
| `courses:create` | Create new courses | Write access |
| `courses:edit` | Update course information | Write access |
| `courses:delete` | Delete courses (soft-delete) | Destructive |

### 3. Grade Management (`grades:*`)

| Permission | Description | Scope |
|-----------|-------------|-------|
| `grades:view` | View grade records | Read-only access |
| `grades:edit` | Submit and update grades | Write access |

### 4. Attendance Management (`attendance:*`)

| Permission | Description | Scope |
|-----------|-------------|-------|
| `attendance:view` | View attendance records | Read-only access |
| `attendance:edit` | Log and update attendance | Write access |

### 5. Reporting & Analytics (`reports:*`)

| Permission | Description | Scope |
|-----------|-------------|-------|
| `reports:generate` | Generate reports and analytics | Read-only access to aggregated data |

### 6. Audit Logs (`audit:*`)

| Permission | Description | Scope |
|-----------|-------------|-------|
| `audit:view` | View audit log entries | Read-only access to audit trail |

### 7. User & Role Management (`users:*`)

| Permission | Description | Scope |
|-----------|-------------|-------|
| `users:manage_roles` | Assign/remove user roles | Administrative |
| `users:manage_perms` | Manage role permissions | Administrative |

## Endpoint Permission Matrix

### Student Endpoints (`/api/v1/students/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/students` | `students:view` | No |
| POST | `/students` | `students:create` | No |
| GET | `/students/{id}` | `students:view` | Yes (own record) |
| PUT | `/students/{id}` | `students:edit` | Yes (own record) |
| DELETE | `/students/{id}` | `students:delete` | No |
| GET | `/students/email/{email}` | `students:view` | Yes (own email) |
| GET | `/students/search` | `students:view` | No |
| PUT | `/students/{id}/restore` | `students:delete` | No |

**Self-Access Rules**:
- Students can view their own record (`GET /students/{id}` where id matches their user)
- Students can edit basic fields in their own record (email, phone) but NOT academic fields
- Students cannot delete their own record

### Course Endpoints (`/api/v1/courses/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/courses` | `courses:view` | No |
| POST | `/courses` | `courses:create` | No |
| GET | `/courses/{id}` | `courses:view` | No |
| PUT | `/courses/{id}` | `courses:edit` | No |
| DELETE | `/courses/{id}` | `courses:delete` | No |
| GET | `/courses/code/{code}` | `courses:view` | No |
| PUT | `/courses/{id}/restore` | `courses:delete` | No |

**Self-Access Rules**: None (students cannot modify courses)

### Course Enrollment Endpoints (`/api/v1/courses/{course_id}/students/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/courses/{course_id}/students` | `courses:view` | No |
| POST | `/courses/{course_id}/students/{student_id}` | `courses:edit` | No |
| DELETE | `/courses/{course_id}/students/{student_id}` | `courses:edit` | No |

### Grade Endpoints (`/api/v1/grades/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/grades/student/{student_id}` | `grades:view` | Yes (own grades) |
| POST | `/grades` | `grades:edit` | No |
| PUT | `/grades/{id}` | `grades:edit` | No |
| DELETE | `/grades/{id}` | `grades:edit` | No |
| GET | `/grades/course/{course_id}` | `grades:view` | No |
| GET | `/grades/{id}` | `grades:view` | Yes (own grade) |
| PUT | `/grades/{id}/restore` | `grades:edit` | No |
| GET | `/grades/student/{student_id}/summary` | `grades:view` | Yes (own summary) |

**Self-Access Rules**:
- Students can view their own grades
- Students cannot submit or edit grades

### Attendance Endpoints (`/api/v1/attendance/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/attendance/student/{student_id}` | `attendance:view` | Yes (own records) |
| POST | `/attendance` | `attendance:edit` | No |
| PUT | `/attendance/{id}` | `attendance:edit` | No |
| DELETE | `/attendance/{id}` | `attendance:edit` | No |
| GET | `/attendance/course/{course_id}` | `attendance:view` | No |
| GET | `/attendance/date/{date}` | `attendance:view` | No |
| GET | `/attendance/{id}` | `attendance:view` | Yes (own record) |
| PUT | `/attendance/{id}/restore` | `attendance:edit` | No |
| GET | `/attendance/student/{student_id}/summary` | `attendance:view` | Yes (own summary) |
| GET | `/attendance/student/{student_id}/statistics` | `attendance:view` | Yes (own stats) |

**Self-Access Rules**:
- Students can view their own attendance records and statistics
- Students cannot log or modify attendance

### Daily Performance Endpoints (`/api/v1/performance/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/performance` | `grades:view` | No |
| POST | `/performance` | `grades:edit` | No |
| GET | `/performance/{id}` | `grades:view` | Yes (own record) |
| PUT | `/performance/{id}` | `grades:edit` | No |
| DELETE | `/performance/{id}` | `grades:edit` | No |
| GET | `/performance/student/{student_id}` | `grades:view` | Yes (own records) |

**Self-Access Rules**:
- Students can view their own daily performance records
- Students cannot create or modify performance entries

### Highlight Endpoints (`/api/v1/highlights/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/highlights` | `grades:view` | No |
| POST | `/highlights` | `grades:edit` | No |
| GET | `/highlights/{id}` | `grades:view` | Yes (if about student) |
| PUT | `/highlights/{id}` | `grades:edit` | No |
| DELETE | `/highlights/{id}` | `grades:edit` | No |
| GET | `/highlights/student/{student_id}` | `grades:view` | Yes (own records) |

**Self-Access Rules**:
- Students can view highlights about them
- Students cannot create or modify highlights

### Analytics Endpoints (`/api/v1/analytics/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/analytics/student/{student_id}` | `reports:generate` | Yes (own analytics) |
| GET | `/analytics/course/{course_id}` | `reports:generate` | No |
| GET | `/analytics/cohort` | `reports:generate` | No |
| GET | `/analytics/at-risk` | `reports:generate` | No |

**Self-Access Rules**:
- Students can view their own analytics
- Course and cohort analytics are admin-only

### Metrics Endpoints (`/api/v1/metrics/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/metrics/students` | `reports:generate` | No |
| GET | `/metrics/courses` | `reports:generate` | No |
| GET | `/metrics/grades` | `reports:generate` | No |
| GET | `/metrics/attendance` | `reports:generate` | No |
| GET | `/metrics/dashboard` | `reports:generate` | No |

**Self-Access Rules**: None (all metrics are aggregated administrative views)

### Reports Endpoints (`/api/v1/reports/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/reports/student/{student_id}/transcript` | `reports:generate` | Yes (own transcript) |
| GET | `/reports/course/{course_id}/roster` | `reports:generate` | No |
| GET | `/reports/course/{course_id}/grade-distribution` | `reports:generate` | No |
| GET | `/reports/student/{student_id}/attendance-report` | `reports:generate` | Yes (own report) |
| GET | `/reports/at-risk-students` | `reports:generate` | No |
| GET | `/reports/class-performance` | `reports:generate` | No |
| GET | `/reports/export` | `reports:generate` | No |

**Self-Access Rules**:
- Students can generate their own transcript and attendance report
- Administrative reports (roster, distribution, at-risk) are admin-only

### Audit Endpoints (`/api/v1/audit/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/audit/logs` | `audit:view` | No |

**Self-Access Rules**: None (audit logs are administrative only)

### Permission Management Endpoints (`/api/v1/permissions/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/permissions` | `users:manage_perms` | No |
| POST | `/permissions` | `users:manage_perms` | No |
| GET | `/permissions/{id}` | `users:manage_perms` | No |
| PUT | `/permissions/{id}` | `users:manage_perms` | No |
| DELETE | `/permissions/{id}` | `users:manage_perms` | No |

### Role Permission Endpoints (`/api/v1/roles/{role_id}/permissions/*`)

| Method | Endpoint | Required Permission | Allow Self Access |
|--------|----------|---------------------|-------------------|
| GET | `/roles/{role_id}/permissions` | `users:manage_roles` | No |
| POST | `/roles/{role_id}/permissions` | `users:manage_roles` | No |
| DELETE | `/roles/{role_id}/permissions/{permission_id}` | `users:manage_roles` | No |

## Error Responses

### Permission Denied (403 Forbidden)

When a user lacks the required permission:

```json
{
  "success": false,
  "error": {
    "code": "HTTP_403",
    "message": "Permission denied: students:edit",
    "details": {
      "required_permission": "students:edit",
      "user_permissions": ["students:view"],
      "allow_self_access": false
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-08T10:30:00Z",
    "version": "1.15.1"
  }
}
```

### Unauthorized (401)

When authentication is required but not provided (in `strict` mode):

```json
{
  "success": false,
  "error": {
    "code": "HTTP_401",
    "message": "Authentication required",
    "details": null
  },
  "meta": {
    "request_id": "req_def456",
    "timestamp": "2026-01-08T10:30:00Z",
    "version": "1.15.1"
  }
}
```

## Testing Permissions

### Using the Test Client

When writing tests, you can create users with specific permissions:

```python
from backend.models import User, Role, Permission, RolePermission
from backend.schemas import UserCreate

def test_student_can_view_own_grades(client, db):
    # Create permission
    perm = Permission(
        key="grades:view",
        resource="grades",
        action="view",
        description="View grades"
    )
    db.add(perm)

    # Create role with permission
    role = Role(name="student", description="Student role")
    db.add(role)
    db.flush()

    role_perm = RolePermission(role_id=role.id, permission_id=perm.id)
    db.add(role_perm)

    # Create user with role
    user = User(username="student1", role_id=role.id)
    db.add(user)
    db.commit()

    # Test endpoint
    response = client.get(
        f"/api/v1/grades/student/{user.id}",
        headers={"Authorization": f"Bearer {user.id}"}
    )
    assert response.status_code == 200
```

### Testing Self-Access

Some endpoints allow users to access their own data even without explicit permissions:

```python
def test_student_cannot_view_other_student_grades(client, db):
    student1 = create_student_user(db, "student1")
    student2 = create_student_user(db, "student2")

    # Student1 tries to view Student2's grades
    response = client.get(
        f"/api/v1/grades/student/{student2.id}",
        headers={"Authorization": f"Bearer {student1.id}"}
    )
    assert response.status_code == 403  # Forbidden
```

## Security Best Practices

1. **Principle of Least Privilege**: Grant only the minimum permissions needed
2. **Regular Audits**: Review user permissions periodically via audit logs
3. **Self-Access Restrictions**: Students can view but not modify their own records
4. **Administrative Separation**: `users:manage_roles` and `users:manage_perms` should be restricted to admin accounts
5. **Token Security**: Use strong authentication tokens and rotate regularly

## Migration Guide

### Upgrading from Pre-RBAC (v1.14.3 or earlier)

If you're upgrading from a version before RBAC implementation:

1. **Database Migration**: Run `alembic upgrade head` to add permission tables
2. **Seed Permissions**: Run the permission seeding script
3. **Assign Default Roles**: Assign appropriate roles to existing users
4. **Test Access**: Verify users can access expected endpoints
5. **Review Audit Logs**: Check for any permission denied errors

### Default Role Assignments

After migration, assign these default roles:

| User Type | Recommended Role | Permissions |
|-----------|------------------|-------------|
| Administrator | `admin` | All permissions (`*:*`) |
| Teacher/Instructor | `teacher` | `courses:view`, `students:view`, `grades:edit`, `attendance:edit`, `reports:generate` |
| Student | `student` | Self-access only (no explicit permissions needed) |
| Auditor | `auditor` | `students:view`, `courses:view`, `grades:view`, `attendance:view`, `reports:generate`, `audit:view` |

## Support & Documentation

- **Architecture**: See `docs/development/ARCHITECTURE.md`
- **RBAC Design**: See `docs/admin/RBAC_DESIGN.md`
- **Permission Matrix**: See `docs/admin/PERMISSION_MATRIX.md`
- **API Examples**: See `backend/CONTROL_API.md`

---

**Last reviewed**: January 8, 2026
**Next review**: February 2026 (post Phase 2 completion)
