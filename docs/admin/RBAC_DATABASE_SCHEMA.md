# RBAC Database Schema Documentation

**Created**: January 8, 2026
**Status**: ✅ ALREADY IMPLEMENTED
**Version**: 1.0
**Source**: `backend/models.py` (lines 399-535)

---

## 📊 Schema Overview

The RBAC system uses a **multi-table design** supporting both role-based and direct user permissions:

```
┌─────────┐      ┌──────────────┐      ┌────────────┐
│  User   │─────▶│  UserRole    │─────▶│    Role    │
└─────────┘      └──────────────┘      └────────────┘
     │                                         │
     │                                         ▼
     │                                  ┌──────────────────┐
     │                                  │ RolePermission   │
     │                                  └──────────────────┘
     │                                         │
     ▼                                         ▼
┌──────────────────┐                   ┌────────────┐
│ UserPermission   │──────────────────▶│ Permission │
└──────────────────┘                   └────────────┘
```

---

## 🗂️ Table Schemas

### 1. **Permission** Table
**Purpose**: Stores all system permissions with resource:action convention

| Column | Type | Constraints | Index | Description |
|--------|------|-------------|-------|-------------|
| `id` | Integer | PRIMARY KEY | ✅ | Unique identifier |
| `key` | String(100) | UNIQUE, NOT NULL | ✅ (unique) | Permission key (e.g., `students:view`) |
| `resource` | String(50) | NOT NULL | ✅ | Resource domain (e.g., `students`) |
| `action` | String(50) | NOT NULL | ❌ | Action type (e.g., `view`) |
| `description` | Text | - | ❌ | Human-readable description |
| `is_active` | Boolean | DEFAULT true | ✅ | Enable/disable permission |
| `created_at` | DateTime(TZ) | NOT NULL | ❌ | Creation timestamp |
| `updated_at` | DateTime(TZ) | NOT NULL | ❌ | Last update timestamp |

**Indexes**:
- `idx_permissions_key` (unique) - Fast lookup by permission key
- `idx_permissions_resource` - Filter by resource domain
- `idx_permissions_is_active` - Filter active permissions

**Example Rows**:
```sql
INSERT INTO permissions (key, resource, action, description, is_active) VALUES
('students:view', 'students', 'view', 'View student list and details', true),
('students:create', 'students', 'create', 'Create new students', true),
('students:edit', 'students', 'edit', 'Update student information', true),
('students:delete', 'students', 'delete', 'Soft-delete students', true);
```

---

### 2. **Role** Table
**Purpose**: Stores role definitions (Admin, Teacher, Viewer, etc.)

| Column | Type | Constraints | Index | Description |
|--------|------|-------------|-------|-------------|
| `id` | Integer | PRIMARY KEY | ✅ | Unique identifier |
| `name` | String(100) | UNIQUE, NOT NULL | ✅ (unique) | Role name (e.g., `admin`) |
| `description` | String(255) | - | ❌ | Human-readable description |

**Indexes**:
- `idx_roles_name` (unique) - Fast lookup by role name

**Example Rows**:
```sql
INSERT INTO roles (name, description) VALUES
('admin', 'System administrator with full access'),
('teacher', 'Teaching staff with grading and attendance permissions'),
('viewer', 'Read-only access to reports and data');
```

---

### 3. **RolePermission** Table (Junction)
**Purpose**: Maps which permissions belong to each role

| Column | Type | Constraints | Index | Description |
|--------|------|-------------|-------|-------------|
| `id` | Integer | PRIMARY KEY | ✅ | Unique identifier |
| `role_id` | Integer | FK → roles.id, NOT NULL | ✅ | Reference to role |
| `permission_id` | Integer | FK → permissions.id, NOT NULL | ✅ | Reference to permission |
| `created_at` | DateTime(TZ) | NOT NULL | ❌ | Assignment timestamp |

**Constraints**:
- `FK role_id → roles.id ON DELETE CASCADE` - Delete role removes all permissions
- `FK permission_id → permissions.id ON DELETE CASCADE` - Delete permission removes all assignments

**Indexes**:
- `idx_role_permission_unique` (role_id, permission_id) - Prevent duplicate assignments
- Standard index on `role_id` for fast joins
- Standard index on `permission_id` for reverse lookups

**Example Rows**:
```sql
-- Admin role gets all permissions (25 rows)
INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 1),  -- admin gets students:view
(1, 2),  -- admin gets students:create
(1, 3),  -- admin gets students:edit
...;

-- Teacher role gets teaching permissions (11 rows)
INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1),  -- teacher gets students:view
(2, 10), -- teacher gets grades:edit
...;
```

---

### 4. **UserRole** Table (Junction)
**Purpose**: Maps which roles are assigned to each user

| Column | Type | Constraints | Index | Description |
|--------|------|-------------|-------|-------------|
| `id` | Integer | PRIMARY KEY | ✅ | Unique identifier |
| `user_id` | Integer | FK → users.id, NOT NULL | ✅ | Reference to user |
| `role_id` | Integer | FK → roles.id, NOT NULL | ✅ | Reference to role |

**Constraints**:
- `FK user_id → users.id ON DELETE CASCADE` - Delete user removes role assignments
- `FK role_id → roles.id ON DELETE CASCADE` - Delete role removes all user assignments

**Indexes**:
- `idx_user_role_unique` (user_id, role_id) - Prevent duplicate assignments

**Example Rows**:
```sql
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1),  -- User 1 has admin role
(2, 2),  -- User 2 has teacher role
(3, 3);  -- User 3 has viewer role
```

---

### 5. **UserPermission** Table (Direct Assignments)
**Purpose**: Grant specific permissions directly to users (bypassing roles)

| Column | Type | Constraints | Index | Description |
|--------|------|-------------|-------|-------------|
| `id` | Integer | PRIMARY KEY | ✅ | Unique identifier |
| `user_id` | Integer | FK → users.id, NOT NULL | ✅ | Reference to user |
| `permission_id` | Integer | FK → permissions.id, NOT NULL | ✅ | Reference to permission |
| `granted_by` | Integer | FK → users.id | ❌ | Admin who granted permission |
| `granted_at` | DateTime(TZ) | NOT NULL | ❌ | Grant timestamp |
| `expires_at` | DateTime(TZ) | - | ✅ | Optional expiration |

**Constraints**:
- `FK user_id → users.id ON DELETE CASCADE`
- `FK permission_id → permissions.id ON DELETE CASCADE`
- `FK granted_by → users.id ON DELETE SET NULL` - Preserve history if granting admin deleted

**Indexes**:
- `idx_user_permission_unique` (user_id, permission_id) - Prevent duplicates
- `idx_user_permission_user_id` - Fast user lookup
- `idx_user_permission_expires_at` - Query expired permissions

**Use Cases**:
- **Temporary elevated access**: Grant `system:import` to a teacher for 1 day
- **Exception handling**: Grant `grades:delete` to specific user without making them admin
- **Time-limited permissions**: Expire automatically via `expires_at` check

**Example Rows**:
```sql
INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at, expires_at) VALUES
(5, 22, 1, '2026-01-08 10:00:00+00', '2026-01-15 23:59:59+00');  -- Temporary system:import
```

---

### 6. **User** Table (Extended)
**Purpose**: User accounts with legacy role field for backward compatibility

| Column | Type | Constraints | Index | Description |
|--------|------|-------------|-------|-------------|
| `id` | Integer | PRIMARY KEY | ✅ | Unique identifier |
| `email` | String(255) | UNIQUE, NOT NULL | ✅ | User email |
| `hashed_password` | String(255) | NOT NULL | ❌ | Bcrypt hash |
| `full_name` | String(200) | - | ❌ | Display name |
| `role` | String(50) | NOT NULL, DEFAULT 'teacher' | ✅ | **Legacy role** (still used) |
| `is_active` | Boolean | DEFAULT true | ✅ | Account status |
| ... | ... | ... | ... | Other auth fields |

**Relationships**:
- `user_permissions` → UserPermission (one-to-many, cascade delete)
- `user_roles` → UserRole (one-to-many via table, cascade delete)

**Migration Strategy**:
- **Phase 1** (Current): Both `User.role` string and `UserRole` table coexist
- **Phase 2** (Future): Deprecate `User.role` after full RBAC migration
- **Compatibility**: Auth checks use **both** systems during transition

---

## 🔄 Permission Resolution Logic

### How Permissions Are Checked

```python
def user_has_permission(user_id: int, permission_key: str) -> bool:
    """Check if user has a specific permission.

    Resolution order:
    1. Check UserPermission (direct assignments, respect expiration)
    2. Check UserRole → RolePermission (role-based)
    3. Fallback to legacy User.role (admin gets all)
    """
    # Step 1: Direct user permissions
    direct_perm = db.query(UserPermission).join(Permission).filter(
        UserPermission.user_id == user_id,
        Permission.key == permission_key,
        Permission.is_active == True,
        or_(
            UserPermission.expires_at.is_(None),
            UserPermission.expires_at > datetime.now(timezone.utc)
        )
    ).first()
    if direct_perm:
        return True

    # Step 2: Role-based permissions
    role_perm = db.query(RolePermission).join(UserRole).join(Permission).filter(
        UserRole.user_id == user_id,
        Permission.key == permission_key,
        Permission.is_active == True
    ).first()
    if role_perm:
        return True

    # Step 3: Legacy role check (backward compatibility)
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.role == "admin":
        return True  # Admins have all permissions

    return False
```

---

## 📈 Performance Considerations

### Index Strategy
All foreign keys are indexed for JOIN performance:
- `role_permissions.role_id` - Fast role → permissions lookup
- `role_permissions.permission_id` - Fast permission → roles lookup
- `user_roles.user_id` - Fast user → roles lookup
- `user_permissions.user_id` - Fast user → direct permissions lookup
- `permissions.key` (unique) - Fast permission key lookup
- `permissions.resource` - Filter by domain
- `permissions.is_active` - Filter active permissions only

### Query Optimization
- **Composite unique indexes** prevent duplicate assignments
- **Cascade deletes** maintain referential integrity
- **is_active flag** allows soft-disabling permissions without deletion
- **expires_at index** enables efficient expiration cleanup queries

---

## 🚀 Seeding Strategy

### Default Permissions (25 total)
Reference: [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md)

```python
# Students domain (4)
students:view, students:create, students:edit, students:delete

# Courses domain (4)
courses:view, courses:create, courses:edit, courses:delete

# Grades domain (3)
grades:view, grades:edit, grades:delete

# Attendance domain (3)
attendance:view, attendance:edit, attendance:delete

# Enrollments domain (2)
enrollments:view, enrollments:manage

# Reports/Analytics domain (2)
reports:view, analytics:view

# Users domain (2)
users:view, users:manage

# Permissions domain (2)
permissions:view, permissions:manage

# System domain (3)
audit:view, system:import, system:export
```

### Default Roles (3 core)
```python
# Admin role: All 25 permissions
admin = Role(name="admin", description="System administrator")

# Teacher role: 11 permissions
teacher_perms = [
    "students:view", "students:edit",
    "courses:view",
    "grades:view", "grades:edit",
    "attendance:view", "attendance:edit",
    "enrollments:view", "enrollments:manage",
    "reports:view", "analytics:view"
]

# Viewer role: 7 permissions
viewer_perms = [
    "students:view", "courses:view", "grades:view",
    "attendance:view", "enrollments:view",
    "reports:view", "analytics:view"
]
```

---

## 🔧 Migration Plan

### Phase 1: Seeding (Week 1 - Jan 27-31)
1. ✅ Create tables (already exists via models.py)
2. 🔜 Seed 25 permissions via `backend/seed_permissions.py`
3. 🔜 Create 3 default roles (admin, teacher, viewer)
4. 🔜 Assign permissions to roles via RolePermission
5. 🔜 Migrate existing User.role to UserRole table

**Script**: `backend/ops/seed_rbac_data.py` (to be created)

### Phase 2: Integration (Week 2 - Feb 3-7)
1. Update `@require_permission()` decorator to use new tables
2. Refactor all admin endpoints to check permissions
3. Maintain backward compatibility with legacy User.role
4. Add permission checks to 148 endpoints

### Phase 3: UI (Week 3 - Feb 10-14)
1. Build permission management API
2. Create admin UI for role/permission assignment
3. Add permission indicators in frontend

---

## 📋 Open Questions & Decisions

### ✅ Resolved
- **Multi-role support**: Users can have multiple roles via UserRole
- **Direct permissions**: UserPermission allows exceptions to role-based access
- **Expiration**: UserPermission supports time-limited access via expires_at
- **Resource/action split**: Permission table splits key into resource+action for flexible querying

### ❓ Pending
- **Role hierarchy**: Should admin inherit teacher permissions? (Current: No hierarchy, explicit assignments)
- **Permission caching**: Cache user permissions in Redis? (Current: Query on each request)
- **Audit trail**: Log permission changes? (Current: No, but can add via AuditLog)

---

## ✅ Schema Validation Checklist

- [x] All tables have primary keys
- [x] All foreign keys have indexes
- [x] Unique constraints on natural keys (role.name, permission.key)
- [x] Composite unique indexes on junction tables
- [x] Cascade deletes configured for cleanup
- [x] Timestamps for audit trail
- [x] is_active flags for soft-disable
- [x] Backward compatibility maintained (User.role still exists)

**Schema Status**: ✅ **PRODUCTION READY** (already implemented in models.py)

---

**Last Updated**: January 8, 2026 00:30
**Reviewed By**: Schema already in production since v1.14+
**Next Steps**:
1. Create seeding script (Task 4 prerequisite)
2. Design `@require_permission()` decorator (Task 4)
3. Plan migration from User.role to UserRole table
