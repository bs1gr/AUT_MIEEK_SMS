# RBAC Admin Guide - Role-Based Access Control

**Version**: 1.15.2
**Date**: January 11, 2026
**Status**: Production Ready
**Document Owner**: System Administrator

---

## 📋 Quick Summary

This guide covers Role-Based Access Control (RBAC) administration for SMS $11.18.3+. It explains how permissions work, how to assign them, and how to troubleshoot access issues.

**Key Concepts**:
- **Permission**: A specific action on a resource (e.g., `students:view`, `grades:edit`)
- **Role**: A collection of permissions assigned to a group of users (e.g., teacher, admin, student)
- **User**: An individual account that gets role(s) assigned
- **Resource:Action Format**: All permissions follow `resource:action` (e.g., `students:create`, `audit:view`)

---

## 🎯 Permission Matrix

### Core Permissions (26 Total)

#### Student Management (4 permissions)

| Permission | Resource | Action | Scope | Assigned To |
|-----------|----------|--------|-------|------------|
| `students:view` | Students | View | Read all student data | admin, teacher, viewer |
| `students:create` | Students | Create | Add new students | admin |
| `students:edit` | Students | Edit | Modify student data | admin, teacher |
| `students:delete` | Students | Delete | Remove students | admin |

#### Course Management (4 permissions)

| Permission | Resource | Action | Scope | Assigned To |
|-----------|----------|--------|-------|------------|
| `courses:view` | Courses | View | Read all courses | admin, teacher, viewer |
| `courses:create` | Courses | Create | Add new courses | admin |
| `courses:edit` | Courses | Edit | Modify courses | admin |
| `courses:delete` | Courses | Delete | Remove courses | admin |

#### Grade Management (2 permissions)

| Permission | Resource | Action | Scope | Assigned To |
|-----------|----------|--------|-------|------------|
| `grades:view` | Grades | View | Read all grades | admin, teacher, viewer |
| `grades:edit` | Grades | Edit | Submit/modify grades | admin, teacher |

#### Attendance Management (2 permissions)

| Permission | Resource | Action | Scope | Assigned To |
|-----------|----------|--------|-------|------------|
| `attendance:view` | Attendance | View | Read attendance records | admin, teacher, viewer |
| `attendance:edit` | Attendance | Edit | Log/modify attendance | admin, teacher |

#### Reporting & Analytics (4 permissions)

| Permission | Resource | Action | Scope | Assigned To |
|-----------|----------|--------|-------|------------|
| `reports:view` | Reports | View | Read reports | admin, teacher, viewer |
| `reports:generate` | Reports | Generate | Create new reports | admin, teacher |
| `analytics:view` | Analytics | View | Read analytics data | admin, teacher, viewer |
| `metrics:view` | Metrics | View | Read metrics dashboards | admin, teacher, viewer |

#### System Administration (6 permissions)

| Permission | Resource | Action | Scope | Assigned To |
|-----------|----------|--------|-------|------------|
| `audit:view` | Audit Log | View | Read audit logs | admin |
| `permissions:view` | Permissions | View | Read permission definitions | admin |
| `permissions:manage` | Permissions | Manage | Grant/revoke permissions | admin |
| `jobs:manage` | Background Jobs | Manage | Start/stop/monitor jobs | admin |
| `imports:manage` | Imports | Manage | Import data | admin |
| `exports:generate` | Exports | Generate | Export data | admin |

#### Advanced Features (4 permissions)

| Permission | Resource | Action | Scope | Assigned To |
|-----------|----------|--------|-------|------------|
| `notifications:broadcast` | Notifications | Broadcast | Send system notifications | admin |
| `diagnostics:view` | Diagnostics | View | View system health | admin |
| `diagnostics:manage` | Diagnostics | Manage | Reset diagnostics | admin |
| `sessions:manage` | Sessions | Manage | Manage user sessions | admin |

---

## 👥 Default Roles

### Admin Role

**Purpose**: Full system access for administrators
**Permissions**: All 26 permissions (`*:*`)
**Use Case**: System administrators, super users
**Typical Users**: 1-2 people per organization

**Granted Permissions**:

```text
students:*, courses:*, grades:*, attendance:*,
reports:*, analytics:*, metrics:*,
audit:*, permissions:*, jobs:*, imports:*, exports:*,
notifications:*, diagnostics:*, sessions:*

```text
### Teacher Role

**Purpose**: Manage classes, grades, and attendance
**Permissions** (11 total):

```text
students:view,           (read student info)
courses:view,            (read courses)
grades:view, grades:edit, (view and submit grades)
attendance:view, attendance:edit, (view and log attendance)
reports:view, reports:generate, (view and create reports)
analytics:view, metrics:view (read analytics)

```text
**Use Case**: Teachers managing their classes
**Typical Users**: 10-50 per organization

### Student Role

**Purpose**: Limited self-service access
**Permissions** (2 total):

```text
grades:view,             (read own grades)
reports:view             (read reports)

```text
**Use Case**: Students viewing their own data
**Typical Users**: 100-1000 per organization
**Note**: Students can only see their own data (enforced via scoping filters)

### Viewer Role (Optional)

**Purpose**: Read-only access for reporting/analysis
**Permissions** (7 total):

```text
students:view, courses:view,
grades:view, attendance:view,
reports:view, analytics:view, metrics:view

```text
**Use Case**: Data analysts, auditors, parents (on own children only)
**Typical Users**: 5-10 per organization

---

## 📊 Role Assignment Matrix

| User Type | Primary Role | Secondary Roles | Notes |
|-----------|-------------|-----------------|-------|
| Super Admin | admin | - | Full system access |
| System Admin | admin | - | Full system access |
| Principal | admin OR teacher | - | Usually admin (full oversight) |
| Curriculum Coordinator | teacher | viewer | Manage curriculum + read-only analysis |
| Teacher | teacher | - | Manage classes + grades + attendance |
| Department Head | teacher | - | Usually teacher with specific course permissions |
| Secretary | teacher | - | May help with grade entry, attendance |
| Student | student | - | Self-service access only |
| Parent | viewer | - | View own child's grades (scoped) |
| Auditor | viewer | - | Read-only audit access |
| External Evaluator | viewer | - | Read-only for assessment purposes |

---

## 🔧 Managing Permissions

### How Permissions Are Enforced

Every admin endpoint in the SMS API has a `@require_permission` decorator:

```python
@router.post("/students/")
@require_permission("students:create")  # Only users with this permission can call
async def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    # Endpoint implementation
    pass

```text
**When a User Tries to Access**:
1. Request comes in with user's authentication token
2. `@require_permission` decorator checks user's roles
3. For each role, system checks if it has the required permission
4. If ANY role has the permission → Access granted ✅
5. If NO role has the permission → Access denied (403 Forbidden) ❌

**Permission Inheritance**:
- Users can have multiple roles
- Each role contributes its permissions
- Permissions are cumulative (union of all role permissions)
- No role subtraction

### Viewing Current Permissions

**Via API** (requires `permissions:view`):

```bash
GET /api/v1/permissions/
GET /api/v1/permissions/by-resource
GET /api/v1/permissions/{permission_id}
GET /api/v1/permissions/stats

```text
**Via Database** (if you have DB access):

```sql
-- List all permissions
SELECT id, name, resource, action, description FROM permission;

-- List role-permission mappings
SELECT r.name as role, p.name as permission
FROM role r
JOIN role_permission rp ON r.id = rp.role_id
JOIN permission p ON p.id = rp.permission_id;

-- List user-permission mappings
SELECT u.username, u.email, r.name as role, p.name as permission
FROM user u
JOIN user_role ur ON u.id = ur.user_id
JOIN role r ON r.id = ur.role_id
JOIN role_permission rp ON r.id = rp.role_id
JOIN permission p ON p.id = rp.permission_id;

```text
### Granting Permissions

**To a Role** (recommended):

```bash
POST /api/v1/permissions/roles/grant
{
  "role_id": 2,                    # Teacher role
  "permission_ids": [5, 6, 7, 8]   # Grant grades:view, grades:edit, etc.
}

```text
**To a User** (only if needed):

```bash
POST /api/v1/permissions/users/grant
{
  "user_id": 42,
  "permission_ids": [3, 4]  # Grant specific permissions
}

```text
### Revoking Permissions

**From a Role**:

```bash
POST /api/v1/permissions/roles/revoke
{
  "role_id": 3,
  "permission_ids": [1, 2]
}

```text
**From a User**:

```bash
POST /api/v1/permissions/users/revoke
{
  "user_id": 42,
  "permission_ids": [3, 4]
}

```text
---

## 🚨 Common Admin Tasks

### Task 1: Grant Admin Access to New Administrator

**Scenario**: Hired a new system administrator who needs full access

**Steps**:
1. Create user account (or find existing user)
2. Assign `admin` role to the user

**Via API**:

```bash
# Get admin role ID

GET /api/v1/rbac/roles?name=admin

# Assign role to user (assuming admin_role_id=1)

POST /api/v1/rbac/users/{user_id}/roles
{
  "role_id": 1  # Admin role
}

```text
**Via Database**:

```sql
-- Find the admin role
SELECT id FROM role WHERE name = 'admin';  -- Usually id=1

-- Assign admin role to user
INSERT INTO user_role (user_id, role_id)
VALUES (42, 1);  -- User 42 gets admin role

```text
**Verification**:

```bash
GET /api/v1/rbac/users/{user_id}/permissions
# Should see all 26 permissions listed

```text
---

### Task 2: Create Custom Role with Limited Permissions

**Scenario**: Create a "Department Head" role with teacher permissions plus student creation rights

**Steps**:
1. Create new role
2. Grant specific permissions

**Via API**:

```bash
# Create role

POST /api/v1/rbac/roles
{
  "name": "department_head",
  "description": "Department head with limited admin capabilities"
}

# Grant permissions (get permission IDs first)

GET /api/v1/permissions/by-resource

# Then grant selected permissions

POST /api/v1/permissions/roles/grant
{
  "role_id": 5,  # department_head role ID
  "permission_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9]  # All teacher + student:create
}

# Assign users to role

POST /api/v1/rbac/users/{user_id}/roles
{
  "role_id": 5
}

```text
**Via Database**:

```sql
-- Create role
INSERT INTO role (name, description)
VALUES ('department_head', 'Department head with limited admin capabilities');

-- Grant permissions (replace IDs with actual permission IDs)
INSERT INTO role_permission (role_id, permission_id) VALUES
  (5, 1),   -- students:view
  (5, 2),   -- students:create
  (5, 3),   -- students:edit
  (5, 4),   -- students:delete
  (5, 5),   -- courses:view
  (5, 6),   -- courses:create
  (5, 7),   -- grades:view
  (5, 8),   -- grades:edit
  (5, 9);   -- attendance:view

-- Assign users
INSERT INTO user_role (user_id, role_id)
VALUES (45, 5);  -- User 45 is now department head

```text
---

### Task 3: Revoke Single Permission from User

**Scenario**: Teacher submitted grades but shouldn't have edit permission due to policy change

**Steps**:
1. Find user
2. Revoke specific permission

**Via API**:

```bash
# Find the permission ID

GET /api/v1/permissions/?name=grades%3Aedit

# Revoke from user

POST /api/v1/permissions/users/revoke
{
  "user_id": 32,
  "permission_ids": [8]  # grades:edit
}

```text
**Via Database**:

```sql
-- Find permission ID
SELECT id FROM permission WHERE name = 'grades:edit';  -- Usually id=8

-- Remove from user (if user has direct permission)
DELETE FROM user_permission
WHERE user_id = 32 AND permission_id = 8;

-- Or remove role from user (if inherited via role)
DELETE FROM user_role
WHERE user_id = 32 AND role_id = 2;  -- Remove teacher role

```text
**Note**: If permission is inherited via role, revoking from the user won't help. You must either:
- Remove the user from the role, OR
- Revoke the permission from the role itself

---

### Task 4: Audit Who Can Access a Specific Resource

**Scenario**: Need to know who can view student records

**Via API**:

```bash
# Get all users with students:view permission

GET /api/v1/rbac/permissions/students:view/users

# Response will include all users with the permission (directly or via role)

```text
**Via Database**:

```sql
-- Find students:view permission
SELECT id FROM permission WHERE name = 'students:view';  -- id=1

-- Find all users with this permission (direct)
SELECT DISTINCT u.id, u.username, u.email
FROM user u
JOIN user_permission up ON u.id = up.user_id
WHERE up.permission_id = 1;

-- Find all users with this permission (via role)
SELECT DISTINCT u.id, u.username, u.email
FROM user u
JOIN user_role ur ON u.id = ur.user_id
JOIN role_permission rp ON ur.role_id = rp.role_id
WHERE rp.permission_id = 1;

-- Combined (both direct and role-based)
SELECT DISTINCT u.id, u.username, u.email, r.name as role_source
FROM user u
LEFT JOIN user_role ur ON u.id = ur.user_id
LEFT JOIN role_permission rp ON ur.role_id = rp.role_id
LEFT JOIN role r ON ur.role_id = r.id
WHERE rp.permission_id = 1 OR EXISTS (
  SELECT 1 FROM user_permission up
  WHERE up.user_id = u.id AND up.permission_id = 1
)
ORDER BY u.username;

```text
---

### Task 5: Review What a Specific User Can Do

**Scenario**: Teacher claims they can't submit grades. Check what they can actually do.

**Via API**:

```bash
GET /api/v1/rbac/users/{user_id}/permissions

# Response lists all permissions the user has (from all roles + direct perms)

```text
**Via Database**:

```sql
-- All permissions for a user (direct + role-based)
SELECT DISTINCT p.name, p.resource, p.action, p.description,
  CASE
    WHEN up.permission_id IS NOT NULL THEN 'Direct'
    WHEN rp.permission_id IS NOT NULL THEN 'Via ' || r.name
  END as source
FROM user u
LEFT JOIN user_permission up ON u.id = up.user_id AND up.permission_id = p.id
LEFT JOIN user_role ur ON u.id = ur.user_id
LEFT JOIN role_permission rp ON ur.role_id = rp.role_id AND rp.permission_id = p.id
LEFT JOIN role r ON ur.role_id = r.id
JOIN permission p ON (up.permission_id = p.id OR rp.permission_id = p.id)
WHERE u.id = 32
ORDER BY p.resource, p.action;

```text
---

## 🔍 Troubleshooting Permission Issues

### Issue 1: User Gets "Access Denied" (403 Forbidden)

**Symptoms**:

```text
POST /api/v1/students/
Response: 403 Forbidden - User lacks required permission: students:create

```text
**Investigation**:
1. Check user's roles and permissions
2. Verify required permission is assigned to at least one role
3. Confirm user hasn't had permission explicitly revoked

**Solution Steps**:

```bash
# Step 1: Check user's current permissions

GET /api/v1/rbac/users/{user_id}/permissions

# Step 2: Verify required permission exists

GET /api/v1/permissions/?name=students%3Acreate

# Step 3: Grant permission to user's role

POST /api/v1/permissions/roles/grant
{
  "role_id": {role_id},
  "permission_ids": [{permission_id}]
}

# Step 4: Verify (user may need to re-login)

GET /api/v1/rbac/users/{user_id}/permissions

```text
**Common Causes**:
- ❌ User doesn't have a role assigned (admin should verify)
- ❌ Required permission exists but isn't granted to user's role
- ❌ Permission was revoked from user (check user_permission table)
- ❌ User has wrong role for their job function
- ❌ User needs to re-login to refresh token

---

### Issue 2: User Has Too Many Permissions

**Symptoms**: User assigned to admin role but should only be teacher

**Investigation**:

```bash
# Check user's roles

GET /api/v1/rbac/users/{user_id}/roles

# Should show only: teacher, not admin

```text
**Solution**:

```bash
# Find the user's roles

GET /api/v1/rbac/users/{user_id}/roles

# Remove admin role

POST /api/v1/rbac/users/{user_id}/roles/remove
{
  "role_id": 1  # admin role
}

# Verify

GET /api/v1/rbac/users/{user_id}/roles
# Should now show only: teacher

```text
---

### Issue 3: Permission Not Taking Effect

**Symptoms**: User gets permission but still denied access

**Causes & Solutions**:
1. **User hasn't re-logged in**
   - Solution: Have user logout and login again (permission is in JWT token)
   - Tokens are cached until expiry

2. **Permission in wrong format**
   - Verify format is exactly `resource:action` (lowercase, colon separator)
   - ❌ Wrong: `Student:View`, `students_view`, `students view`
   - ✅ Right: `students:view`

3. **Endpoint requires different permission than expected**
   - Solution: Check endpoint documentation or code
   - Different endpoint might require `students:edit` instead of `students:view`

4. **Role permission grant didn't work**
   - Solution: Try direct user permission grant as workaround

   ```bash
   POST /api/v1/permissions/users/grant
   {
     "user_id": {user_id},
     "permission_ids": [{permission_id}]
   }
   ```

---

## 📈 Monitoring & Auditing

### Regular Monitoring Tasks

**Daily** (5 minutes):
1. Check audit logs for denied access attempts
   ```bash
   GET /api/v1/audit/logs?action=access_denied&limit=100
   ```

2. Review new users and their assigned roles
   ```bash
   GET /api/v1/users?created_after=today&sort=-created_at
   ```

**Weekly** (15 minutes):
1. Review role membership changes
   ```sql
   SELECT * FROM audit_log
   WHERE action IN ('role_assigned', 'role_revoked')
   AND created_at > NOW() - INTERVAL '7 days'
   ORDER BY created_at DESC;
   ```

2. Check for users with multiple admin-like roles
   ```sql
   SELECT u.username, GROUP_CONCAT(r.name) as roles, COUNT(r.id) as role_count
   FROM user u
   JOIN user_role ur ON u.id = ur.user_id
   JOIN role r ON ur.role_id = r.id
   GROUP BY u.id
   HAVING role_count > 2
   ORDER BY role_count DESC;
   ```

**Monthly** (30 minutes):
1. Complete permission audit
   ```sql
   SELECT COUNT(*) as user_count, r.name as role, COUNT(DISTINCT p.id) as permission_count
   FROM user u
   JOIN user_role ur ON u.id = ur.user_id
   JOIN role r ON ur.role_id = r.id
   JOIN role_permission rp ON r.id = rp.role_id
   JOIN permission p ON p.id = rp.permission_id
   GROUP BY r.id
   ORDER BY permission_count DESC;
   ```

2. Review access patterns for anomalies
   ```sql
   SELECT user_id, endpoint, COUNT(*) as access_count, MAX(accessed_at) as last_access
   FROM access_log
   WHERE accessed_at > NOW() - INTERVAL '30 days'
   GROUP BY user_id, endpoint
   HAVING access_count > 1000  -- Unusual activity
   ORDER BY access_count DESC;
   ```

---

## 🔐 Security Best Practices

### Principle of Least Privilege

✅ **DO**: Assign minimum permissions needed for job function
❌ **DON'T**: Assign admin to everyone "just in case"

### Regular Audits

✅ **DO**: Monthly review of role assignments
✅ **DO**: Monitor access logs for abuse
❌ **DON'T**: Fire and forget after assignment

### Role Segregation

✅ **DO**: Create separate roles for different job functions
✅ **DO**: Use role inheritance (e.g., "department_head" = "teacher" + "admin")
❌ **DON'T**: Give all users the same role

### Permission Documentation

✅ **DO**: Document custom roles and why they exist
✅ **DO**: Keep audit trail of all permission changes
❌ **DON'T**: Make ad-hoc permission grants without tracking

### Emergency Access

✅ **DO**: Have a documented emergency admin override procedure
✅ **DO**: Log all emergency access for audit purposes
✅ **DO**: Revoke emergency access once issue resolved
❌ **DON'T**: Leave permanent backdoors

---

## 📞 Getting Help

### Common Questions

**Q: How do I create a new permission?**
A: New permissions are defined in code (`backend/models.py` Permission model) and seeded via the `seed_rbac_data.py` script. Contact the development team to add new permissions.

**Q: Can I give a user permission without assigning a role?**
A: Yes, use the direct user permission grant endpoint. However, it's recommended to use roles for easier management.

**Q: What happens when I remove a role from a user?**
A: All permissions inherited from that role are revoked. Directly-assigned permissions remain.

**Q: How do I backup permission settings?**
A: Export from the permission database tables:

```bash
mysqldump -u user -p database role role_permission user_role user_permission > rbac_backup.sql

```text
**Q: How long do permission changes take to take effect?**
A: Immediately for new sessions. Existing sessions may need to re-login if JWT token caching is enabled.

---

## 🆘 Emergency Procedures

### If Admin Account is Locked Out

**Option 1: Via Database** (requires DB access):

```sql
-- Create new admin user
INSERT INTO user (username, email, hashed_password, role)
VALUES ('emergency_admin', 'admin@example.com', '...', 'admin');

-- Assign admin role
INSERT INTO user_role (user_id, role_id)
VALUES (LAST_INSERT_ID(), 1);  -- Admin role ID=1

-- Login with this user
-- DELETE this user once normal admin access restored

```text
**Option 2: Via API** (if any admin can authenticate):

```bash
POST /api/v1/rbac/users
{
  "username": "temporary_admin",
  "email": "temp@example.com",
  "password": "temp_strong_password_123"
}

POST /api/v1/rbac/users/{new_user_id}/roles
{
  "role_id": 1  # Admin role
}

# Use this user to restore normal admin access

# Then delete this temporary user

```text
### If Permission System is Broken

**Nuclear Option** (reset to default permissions):

```bash
POST /api/v1/rbac/reset-to-defaults
{
  "confirm": true
}

```text
**Result**: All roles reset to defaults, all custom permissions cleared, all users reset to default role assignments.

**Recovery**:
1. Don't do this in production without backup
2. Restore permission database from backup
3. Call development team

---

## 📚 Related Documentation

- **API Reference**: [API_PERMISSIONS_REFERENCE.md](../../backend/API_PERMISSIONS_REFERENCE.md)
- **Developer Guide**: [docs/development/ARCHITECTURE.md](../development/ARCHITECTURE.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- **Audit Log Format**: [docs/operations/AUDIT_LOGGING.md](../operations/AUDIT_LOGGING.md)

---

**Last Updated**: January 11, 2026
**Version**: 1.15.2
**Status**: Production Ready ✅
