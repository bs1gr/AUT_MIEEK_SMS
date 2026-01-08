# Permission Management Guide

**Version**: 1.15.1
**Last Updated**: January 8, 2026
**Audience**: System Administrators, DevOps
**Status**: Production Ready

---

## Overview

This guide covers operational procedures for managing RBAC permissions in the Student Management System. After Phase 2 implementation, all 79 API endpoints are protected with fine-grained permissions.

### Quick Links

- **Permission Matrix**: [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md) - Complete permission reference
- **API Reference**: [../../backend/API_PERMISSIONS_REFERENCE.md](../../backend/API_PERMISSIONS_REFERENCE.md) - Endpoint permissions
- **Database Schema**: [RBAC_DATABASE_SCHEMA.md](./RBAC_DATABASE_SCHEMA.md) - Technical details

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Permission Seeding](#permission-seeding)
3. [Managing Roles](#managing-roles)
4. [Granting Permissions](#granting-permissions)
5. [Revoking Permissions](#revoking-permissions)
6. [User Permission Workflows](#user-permission-workflows)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Getting Started

### Prerequisites

- Administrative access to the server
- Database access (SQLite or PostgreSQL)
- Python environment with backend dependencies

### First-Time Setup

After deploying v1.15.1+, run the permission seeding script:

```bash
cd backend
python ops/seed_rbac_data.py
```

This creates:
- **26 permissions** across 8 domains
- **3 default roles** (admin, teacher, viewer)
- **44 role-permission mappings**

**Note**: Seeding is idempotent—safe to run multiple times.

---

## Permission Seeding

### Running the Seed Script

**Full seeding** (creates/updates all data):

```bash
python backend/ops/seed_rbac_data.py
```

**Dry run** (preview without changes):

```bash
python backend/ops/seed_rbac_data.py --dry-run
```

**Verification only** (check existing data):

```bash
python backend/ops/seed_rbac_data.py --verify
```

### Seed Script Output

```
======================================================================
RBAC Data Seeding Script
======================================================================

📊 Database: sqlite:///D:/SMS/student-management-system/data/student_management.db

1️⃣  Seeding Permissions...
  ✓  Permission exists: students:view
  ✓  Permission exists: students:create
  ...
  ✓  Created: 0, Updated: 0, Unchanged: 26

2️⃣  Seeding Roles...
  ✓  Role exists: admin
  ✓  Role exists: teacher
  ✓  Role exists: viewer
  ✓  Created: 0, Updated: 0, Unchanged: 3

3️⃣  Seeding Role-Permission Mappings...
  ✓  Created: 0, Skipped: 44

======================================================================
SUMMARY
======================================================================
Permissions: 0 created, 0 updated, 26 unchanged
Roles: 0 created, 0 updated, 3 unchanged
Role-Permission Mappings: 0 created, 44 skipped
======================================================================
```

### What Gets Seeded

**Permissions** (26 total):

| Domain | Count | Examples |
|--------|-------|----------|
| students | 4 | `students:view`, `students:create`, `students:edit`, `students:delete` |
| courses | 4 | `courses:view`, `courses:create`, `courses:edit`, `courses:delete` |
| grades | 3 | `grades:view`, `grades:edit`, `grades:delete` |
| attendance | 3 | `attendance:view`, `attendance:edit`, `attendance:delete` |
| enrollments | 2 | `enrollments:view`, `enrollments:manage` |
| reports | 2 | `reports:view`, `analytics:view` |
| users | 2 | `users:view`, `users:manage` |
| permissions | 2 | `permissions:view`, `permissions:manage` |
| audit | 1 | `audit:view` |
| system | 3 | `system:admin`, `system:import`, `system:export` |

**Roles** (3 default):

1. **admin** - Full access (all permissions)
2. **teacher** - Course management, grading, attendance
3. **viewer** - Read-only access to students, courses, grades

---

## Managing Roles

### View All Roles

**SQL Query**:

```sql
SELECT id, name, description, is_active, created_at
FROM roles
WHERE is_active = 1
ORDER BY name;
```

**Expected Output**:

| id | name | description | is_active | created_at |
|----|------|-------------|-----------|------------|
| 1 | admin | Administrator with full access | 1 | 2026-01-08... |
| 2 | teacher | Instructor with course/grade management | 1 | 2026-01-08... |
| 3 | viewer | Read-only observer | 1 | 2026-01-08... |

### View Role Permissions

**SQL Query** (all permissions for a role):

```sql
SELECT p.key, p.resource, p.action, p.description
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = 1  -- Change role_id as needed
  AND p.is_active = 1
ORDER BY p.resource, p.action;
```

**Example Output for admin role**:

```
attendance:delete | attendance | delete | Delete attendance records
attendance:edit   | attendance | edit   | Log and update attendance
attendance:view   | attendance | view   | View attendance records
...
(26 rows - admin has all permissions)
```

### Create Custom Role

**Using SQL**:

```sql
INSERT INTO roles (name, description, is_active, created_at, updated_at)
VALUES ('instructor', 'Teaching assistant with limited access', 1, datetime('now'), datetime('now'));
```

**Verify Creation**:

```sql
SELECT * FROM roles WHERE name = 'instructor';
```

---

## Granting Permissions

### Grant Permission to Role

**Method 1: Direct SQL**

```sql
-- Step 1: Get role ID
SELECT id FROM roles WHERE name = 'instructor';  -- e.g., returns 4

-- Step 2: Get permission ID
SELECT id FROM permissions WHERE key = 'grades:edit';  -- e.g., returns 10

-- Step 3: Grant permission
INSERT INTO role_permissions (role_id, permission_id, created_at)
VALUES (4, 10, datetime('now'));
```

**Method 2: Using API** (POST `/api/v1/permissions/roles/grant`):

```bash
curl -X POST http://localhost:8080/api/v1/permissions/roles/grant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "role_name": "instructor",
    "permission_key": "grades:edit"
  }'
```

**Response**:

```json
{
  "status": "granted",
  "role_name": "instructor",
  "permission_key": "grades:edit"
}
```

### Grant Multiple Permissions to Role

**Bulk SQL Insert**:

```sql
-- Grant instructor read/edit for grades and attendance
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 4, id, datetime('now')
FROM permissions
WHERE key IN ('grades:view', 'grades:edit', 'attendance:view', 'attendance:edit');
```

**Verify**:

```sql
SELECT p.key
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = 4;
```

### Grant Permission Directly to User

**Use Case**: Temporary access or special cases

**SQL**:

```sql
-- Step 1: Get user and permission IDs
SELECT id FROM users WHERE email = 'temp.admin@example.com';  -- e.g., 42
SELECT id FROM permissions WHERE key = 'audit:view';          -- e.g., 23

-- Step 2: Grant permission
INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at, expires_at)
VALUES (42, 23, 1, datetime('now'), datetime('now', '+7 days'));
```

**Note**: `granted_by` should be the ID of the admin granting the permission.

---

## Revoking Permissions

### Revoke Permission from Role

**Method 1: Direct SQL**

```sql
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'instructor')
  AND permission_id = (SELECT id FROM permissions WHERE key = 'grades:edit');
```

**Method 2: Using API** (POST `/api/v1/permissions/roles/revoke`):

```bash
curl -X POST http://localhost:8080/api/v1/permissions/roles/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "role_name": "instructor",
    "permission_key": "grades:edit"
  }'
```

### Revoke All Permissions from Role

**SQL**:

```sql
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'instructor');
```

**Warning**: This removes ALL permissions from the role.

### Revoke Direct User Permission

**SQL**:

```sql
DELETE FROM user_permissions
WHERE user_id = (SELECT id FROM users WHERE email = 'temp.admin@example.com')
  AND permission_id = (SELECT id FROM permissions WHERE key = 'audit:view');
```

---

## User Permission Workflows

### Assign Role to User

**SQL**:

```sql
-- Update user's role
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'teacher')
WHERE email = 'instructor@example.com';
```

**Verify**:

```sql
SELECT u.email, r.name as role
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'instructor@example.com';
```

### View All User Permissions

**SQL** (combines role permissions + direct permissions):

```sql
-- Role-based permissions
SELECT DISTINCT p.key, p.description, 'role' as source
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'instructor@example.com'
  AND p.is_active = 1

UNION

-- Direct user permissions
SELECT p.key, p.description, 'direct' as source
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE u.email = 'instructor@example.com'
  AND p.is_active = 1
  AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))

ORDER BY key;
```

### Check If User Has Specific Permission

**SQL**:

```sql
SELECT COUNT(*) as has_permission
FROM (
    -- Check role permissions
    SELECT 1
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.email = 'instructor@example.com'
      AND p.key = 'grades:edit'
      AND p.is_active = 1

    UNION

    -- Check direct permissions
    SELECT 1
    FROM users u
    JOIN user_permissions up ON u.id = up.user_id
    JOIN permissions p ON up.permission_id = p.id
    WHERE u.email = 'instructor@example.com'
      AND p.key = 'grades:edit'
      AND p.is_active = 1
      AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
);
```

**Result**: `has_permission = 1` means user has the permission, `0` means they don't.

---

## Troubleshooting

### Permission Denied Errors

**Error**: `403 Forbidden - Permission denied: requires 'students:edit'`

**Diagnosis**:

1. **Verify user's role**:
   ```sql
   SELECT u.email, r.name as role
   FROM users u
   LEFT JOIN roles r ON u.role_id = r.id
   WHERE u.email = 'user@example.com';
   ```

2. **Check role permissions**:
   ```sql
   SELECT p.key
   FROM permissions p
   JOIN role_permissions rp ON p.id = rp.permission_id
   JOIN roles r ON rp.role_id = r.id
   WHERE r.name = 'teacher'  -- Replace with actual role
     AND p.key = 'students:edit';
   ```

3. **Grant missing permission**:
   ```sql
   INSERT INTO role_permissions (role_id, permission_id, created_at)
   VALUES (
       (SELECT id FROM roles WHERE name = 'teacher'),
       (SELECT id FROM permissions WHERE key = 'students:edit'),
       datetime('now')
   );
   ```

### Permission Not Found

**Error**: `404 - Permission not found or inactive`

**Diagnosis**:

```sql
SELECT * FROM permissions WHERE key = 'students:edit';
```

**If missing**, re-run seeding script:

```bash
python backend/ops/seed_rbac_data.py
```

### Expired Direct Permissions

**Symptom**: User had access yesterday but not today

**Check for expired permissions**:

```sql
SELECT p.key, up.expires_at
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id = (SELECT id FROM users WHERE email = 'user@example.com')
  AND up.expires_at < datetime('now');
```

**Solution**: Grant new permission or remove expiration:

```sql
UPDATE user_permissions
SET expires_at = NULL
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
  AND permission_id = (SELECT id FROM permissions WHERE key = 'audit:view');
```

### Check Permission Audit Trail

**View recent permission grants**:

```sql
SELECT
    u.email,
    p.key,
    up.granted_at,
    up.expires_at,
    granter.email as granted_by
FROM user_permissions up
JOIN users u ON up.user_id = u.id
JOIN permissions p ON up.permission_id = p.id
LEFT JOIN users granter ON up.granted_by = granter.id
ORDER BY up.granted_at DESC
LIMIT 20;
```

---

## Security Best Practices

### 1. Principle of Least Privilege

✅ **DO**: Grant only the minimum permissions needed

```sql
-- Good: Teacher needs to grade but not delete students
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT
    (SELECT id FROM roles WHERE name = 'teacher'),
    id,
    datetime('now')
FROM permissions
WHERE key IN ('grades:view', 'grades:edit', 'students:view');
```

❌ **DON'T**: Grant admin to everyone

```sql
-- Bad: Giving full admin access to instructors
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin');
```

### 2. Use Role-Based Permissions

✅ **DO**: Assign permissions to roles, then roles to users

```sql
-- Create role → Grant permissions → Assign users
INSERT INTO roles (name, description, is_active, created_at, updated_at)
VALUES ('grader', 'TA with grading access only', 1, datetime('now'), datetime('now'));

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT
    (SELECT id FROM roles WHERE name = 'grader'),
    id,
    datetime('now')
FROM permissions
WHERE key IN ('grades:view', 'grades:edit');

UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'grader')
WHERE email IN ('ta1@example.com', 'ta2@example.com');
```

❌ **DON'T**: Grant permissions directly to individual users (except for temporary access)

### 3. Use Expiration for Temporary Access

✅ **DO**: Set expiration dates for temporary permissions

```sql
-- Grant audit access for 7 days
INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at, expires_at)
VALUES (
    (SELECT id FROM users WHERE email = 'auditor@example.com'),
    (SELECT id FROM permissions WHERE key = 'audit:view'),
    1,  -- Admin user ID
    datetime('now'),
    datetime('now', '+7 days')
);
```

### 4. Regular Audits

**Monthly permission review query**:

```sql
-- Find users with direct permissions (unusual)
SELECT
    u.email,
    p.key,
    up.expires_at,
    granter.email as granted_by
FROM user_permissions up
JOIN users u ON up.user_id = u.id
JOIN permissions p ON up.permission_id = p.id
LEFT JOIN users granter ON up.granted_by = granter.id
WHERE up.expires_at IS NULL OR up.expires_at > datetime('now')
ORDER BY u.email;
```

**Export role permissions matrix**:

```sql
SELECT
    r.name as role,
    p.resource,
    GROUP_CONCAT(p.action, ', ') as actions
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = 1 AND p.is_active = 1
GROUP BY r.name, p.resource
ORDER BY r.name, p.resource;
```

### 5. Protect Admin Role

✅ **DO**: Limit admin role to 1-2 trusted users

```sql
-- Check who has admin role
SELECT email FROM users
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');
```

✅ **DO**: Use separate roles for day-to-day operations

```sql
-- Create super_user role with most permissions except system:admin
INSERT INTO roles (name, description, is_active, created_at, updated_at)
VALUES ('super_user', 'High privileges without system admin', 1, datetime('now'), datetime('now'));

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT
    (SELECT id FROM roles WHERE name = 'super_user'),
    id,
    datetime('now')
FROM permissions
WHERE key NOT LIKE 'system:%';
```

---

## Common Permission Scenarios

### Scenario 1: New Teacher Onboarding

**Goal**: Give instructor full course/grade/attendance management

```sql
-- Assign teacher role
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'teacher')
WHERE email = 'new.teacher@example.com';
```

**Teacher role includes**:
- `courses:view`, `courses:create`, `courses:edit`
- `students:view`
- `grades:view`, `grades:edit`
- `attendance:view`, `attendance:edit`
- `reports:view`

### Scenario 2: Temporary Auditor Access

**Goal**: Grant audit access for external reviewer (2 weeks)

```sql
INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at, expires_at)
VALUES (
    (SELECT id FROM users WHERE email = 'external.auditor@review.com'),
    (SELECT id FROM permissions WHERE key = 'audit:view'),
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    datetime('now'),
    datetime('now', '+14 days')
);
```

### Scenario 3: Promote User to Admin

**Goal**: Elevate trusted user to full admin

```sql
-- Verify current permissions
SELECT r.name FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'trusted.user@example.com';

-- Promote to admin
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'trusted.user@example.com';
```

### Scenario 4: Create Custom "Registrar" Role

**Goal**: User who manages student records but not grades

```sql
-- Create role
INSERT INTO roles (name, description, is_active, created_at, updated_at)
VALUES ('registrar', 'Student records management', 1, datetime('now'), datetime('now'));

-- Grant permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT
    (SELECT id FROM roles WHERE name = 'registrar'),
    id,
    datetime('now')
FROM permissions
WHERE key IN (
    'students:view',
    'students:create',
    'students:edit',
    'courses:view',
    'enrollments:view',
    'enrollments:manage',
    'reports:view'
);

-- Assign users
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'registrar')
WHERE email IN ('registrar1@example.com', 'registrar2@example.com');
```

---

## API Endpoints for Permission Management

### List All Permissions

```bash
GET /api/v1/permissions/
```

**Response**:

```json
[
  {
    "id": 1,
    "key": "students:view",
    "resource": "students",
    "action": "view",
    "description": "View student list and details",
    "is_active": true
  },
  ...
]
```

### Get Permissions Grouped by Resource

```bash
GET /api/v1/permissions/by-resource
```

**Response**:

```json
[
  {
    "resource": "students",
    "permissions": [
      {"key": "students:view", "action": "view", ...},
      {"key": "students:create", "action": "create", ...}
    ]
  },
  ...
]
```

### Get Permission Statistics

```bash
GET /api/v1/permissions/stats
```

**Response**:

```json
{
  "total_permissions": 26,
  "active_permissions": 26,
  "inactive_permissions": 0,
  "permissions_by_resource": {
    "students": 4,
    "courses": 4,
    "grades": 3,
    ...
  },
  "most_common_actions": [
    ["view", 10],
    ["edit", 8],
    ["create", 4],
    ...
  ]
}
```

### Grant Permission to Role

```bash
POST /api/v1/permissions/roles/grant
Content-Type: application/json

{
  "role_name": "teacher",
  "permission_key": "students:edit"
}
```

### Revoke Permission from Role

```bash
POST /api/v1/permissions/roles/revoke
Content-Type: application/json

{
  "role_name": "teacher",
  "permission_key": "students:delete"
}
```

### Get User's Effective Permissions

```bash
GET /api/v1/permissions/users/{user_id}
```

**Response**:

```json
{
  "user_id": 42,
  "email": "teacher@example.com",
  "role": "teacher",
  "permissions": ["students:view", "students:edit", ...],
  "direct_permissions": [
    {
      "permission_key": "audit:view",
      "granted_at": "2026-01-08T10:00:00Z",
      "expires_at": "2026-01-15T10:00:00Z"
    }
  ],
  "role_permissions": [
    {"permission_key": "students:view", "role_name": "teacher"},
    ...
  ]
}
```

---

## Backup & Restore

### Backup Permission Configuration

**Export all RBAC data**:

```bash
sqlite3 data/student_management.db <<EOF
.mode insert
.output rbac_backup.sql
SELECT * FROM permissions;
SELECT * FROM roles;
SELECT * FROM role_permissions;
SELECT * FROM user_permissions;
.quit
EOF
```

**Or use Python script**:

```bash
python backend/ops/seed_rbac_data.py --export rbac_backup.json
```

### Restore from Backup

**Re-run seeding script** (safest):

```bash
python backend/ops/seed_rbac_data.py
```

**Or restore from SQL backup**:

```bash
sqlite3 data/student_management.db < rbac_backup.sql
```

---

## Maintenance

### Cleanup Expired Permissions

**Automatically handled by queries** (expires_at checked), but you can clean up manually:

```sql
DELETE FROM user_permissions
WHERE expires_at < datetime('now');
```

### Deactivate Permission (Don't Delete)

**Better than deletion** (preserves history):

```sql
UPDATE permissions
SET is_active = 0, updated_at = datetime('now')
WHERE key = 'old:permission';
```

### Re-activate Permission

```sql
UPDATE permissions
SET is_active = 1, updated_at = datetime('now')
WHERE key = 'old:permission';
```

---

## Support & Documentation

- **Permission Matrix**: See [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md) for complete list
- **API Reference**: See [API_PERMISSIONS_REFERENCE.md](../../backend/API_PERMISSIONS_REFERENCE.md)
- **Database Schema**: See [RBAC_DATABASE_SCHEMA.md](./RBAC_DATABASE_SCHEMA.md)
- **Codebase**: `backend/rbac.py`, `backend/ops/seed_rbac_data.py`

---

**Last Updated**: January 8, 2026
**Version**: 1.15.1
**Reviewed By**: Phase 2 RBAC Team
