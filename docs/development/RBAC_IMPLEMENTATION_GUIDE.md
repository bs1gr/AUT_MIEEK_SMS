# RBAC Implementation Guide

**Version**: 1.13.0
**Last Updated**: 2026-01-06
**Status**: ✅ Complete - All tests passing (394/394)

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented in the Student Management System. The system provides granular permission management with three-tier permission structure: resource-based, action-based, and role-based.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Models](#core-models)
3. [Permission Structure](#permission-structure)
4. [API Endpoints](#api-endpoints)
5. [Permission Checking](#permission-checking)
6. [Implementation Examples](#implementation-examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

### Three-Tier Permission Model

```text
┌─────────────────┐
│   User Roles    │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌──────────────────┐              ┌─────────────────────┐
│ Role Permissions │              │ Direct User Perms   │
│ (via RolePerms)  │              │ (via UserPerms)     │
└────────┬─────────┘              └──────────┬──────────┘
         │                                    │
         └────────────────┬───────────────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │ Permissions  │
                    │ (key, res,   │
                    │  action)     │
                    └──────────────┘

```text
### Permission Resolution

When checking if a user has a permission:

1. Check direct user permissions (`UserPermission`)
2. Resolve user's roles
3. Check all role permissions (`RolePermission`)
4. Return combined set of allowed actions

---

## Core Models

### Permission Model

```python
class Permission(BaseModel):
    """Granular permission definition"""
    id: int
    key: str                    # Unique identifier (e.g., 'students:create')
    resource: str               # Resource type (e.g., 'students')
    action: str                 # Action type (e.g., 'create', 'read', 'update', 'delete')
    description: str            # Human-readable description
    is_active: bool             # Enable/disable permission
    created_at: datetime
    updated_at: datetime

    # Relationships
    role_permissions: List[RolePermission]
    user_permissions: List[UserPermission]

```text
**Permission Key Format**: `{resource}:{action}`
- Examples: `students:create`, `grades:read`, `courses:update`, `reports:export`

### Role Relationship Models

```python
class RolePermission(BaseModel):
    """Maps roles to permissions"""
    id: int
    role: str                   # Role name (admin, teacher, etc.)
    permission_id: int
    permission: Permission
    is_active: bool
    created_at: datetime

    __table_args__ = (
        UniqueConstraint('role', 'permission_id', name='uq_role_permission'),
    )

class UserPermission(BaseModel):
    """Direct user permissions (override roles)"""
    id: int
    user_id: int
    permission_id: int
    permission: Permission
    grant_reason: str           # Why this permission was granted
    granted_by: int             # Admin user who granted it
    granted_at: datetime
    expires_at: Optional[datetime]  # Optional expiration
    is_active: bool

    __table_args__ = (
        UniqueConstraint('user_id', 'permission_id', name='uq_user_permission'),
    )

```text
---

## Permission Structure

### Built-in Permission Levels

```text
RESOURCES:
├── students
│   ├── create
│   ├── read
│   ├── update
│   ├── delete
│   └── export
├── grades
│   ├── create
│   ├── read
│   ├── update
│   ├── delete
│   └── view_detailed
├── courses
│   ├── create
│   ├── read
│   ├── update
│   ├── delete
│   └── manage_enrollment
├── attendance
│   ├── create
│   ├── read
│   ├── update
│   └── delete
├── reports
│   ├── read
│   └── export
└── admin
    ├── manage_users
    ├── manage_roles
    ├── manage_permissions
    └── view_audit_logs

```text
### Default Role Permissions

**Admin Role**:
- All permissions across all resources
- System management and configuration
- Audit log access

**Teacher Role**:
- `students:read`, `students:export`
- `grades:create`, `grades:read`, `grades:update`
- `courses:read`, `courses:manage_enrollment`
- `attendance:read`, `attendance:create`, `attendance:update`
- `reports:read`, `reports:export`

**Student Role**:
- `grades:read` (own grades only)
- `courses:read` (enrolled courses)
- `attendance:read` (own attendance)

---

## API Endpoints

### Permission Management

#### List All Permissions

```text
GET /api/v1/admin/permissions
Query Parameters:
  - page: int (default: 1)
  - limit: int (default: 50)
  - resource: str (optional, filter by resource)
  - action: str (optional, filter by action)
  - is_active: bool (optional)

Response:
{
  "data": [
    {
      "id": 1,
      "key": "students:create",
      "resource": "students",
      "action": "create",
      "description": "Create new student records",
      "is_active": true,
      "created_at": "2026-01-06T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 50
}

```text
#### Create Permission

```text
POST /api/v1/admin/permissions
Request Body:
{
  "key": "custom:action",
  "resource": "custom_resource",
  "action": "action_name",
  "description": "Description of permission"
}

Response: [Permission object]

```text
#### Update Permission

```text
PUT /api/v1/admin/permissions/{id}
Request Body:
{
  "description": "Updated description",
  "is_active": false
}

Response: [Permission object]

```text
#### Delete Permission

```text
DELETE /api/v1/admin/permissions/{id}
Response: 204 No Content

```text
### User Permissions

#### Grant Permission to User

```text
POST /api/v1/admin/user-permissions
Request Body:
{
  "user_id": 123,
  "permission_id": 5,
  "grant_reason": "Special access for project",
  "expires_at": "2026-12-31T23:59:59Z"  # Optional
}

Response:
{
  "id": 45,
  "user_id": 123,
  "permission_id": 5,
  "grant_reason": "Special access for project",
  "granted_by": 1,
  "granted_at": "2026-01-06T10:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z",
  "is_active": true
}

```text
#### Get User's Permissions

```text
GET /api/v1/admin/user-permissions/{user_id}
Response:
{
  "data": [
    {
      "id": 45,
      "permission": {
        "id": 5,
        "key": "grades:export",
        "resource": "grades",
        "action": "export"
      },
      "grant_reason": "Special access for project",
      "granted_by": 1,
      "granted_at": "2026-01-06T10:00:00Z",
      "expires_at": "2026-12-31T23:59:59Z",
      "is_active": true
    }
  ]
}

```text
#### Revoke Permission

```text
DELETE /api/v1/admin/user-permissions/{id}
Response: 204 No Content

```text
#### Update Permission Expiration

```text
PUT /api/v1/admin/user-permissions/{id}
Request Body:
{
  "expires_at": "2026-06-30T23:59:59Z"
}

Response: [UserPermission object]

```text
### Role Permissions

#### Assign Permission to Role

```text
POST /api/v1/admin/role-permissions
Request Body:
{
  "role": "teacher",
  "permission_id": 5
}

Response:
{
  "id": 78,
  "role": "teacher",
  "permission_id": 5,
  "is_active": true,
  "created_at": "2026-01-06T10:00:00Z"
}

```text
#### Get Role Permissions

```text
GET /api/v1/admin/role-permissions?role=teacher
Response:
{
  "data": [
    {
      "id": 78,
      "role": "teacher",
      "permission": {
        "id": 5,
        "key": "students:read",
        "resource": "students",
        "action": "read"
      },
      "is_active": true
    }
  ],
  "total": 12
}

```text
#### Remove Permission from Role

```text
DELETE /api/v1/admin/role-permissions/{id}
Response: 204 No Content

```text
---

## Permission Checking

### Decorator-Based Permission Checking

Use `optional_require_role` for admin endpoints that respect AUTH_MODE:

```python
from backend.dependencies import optional_require_role

@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(optional_require_role("admin")),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    # If AUTH_MODE="disabled", current_admin will be None (skip auth)
    # If AUTH_MODE="permissive", checks if user is admin (login required)
    # If AUTH_MODE="strict", enforces admin role strictly
    return await delete_user_service(user_id, db)

```text
### Service-Level Permission Checking

```python
from backend.services.permission_service import PermissionService

class StudentService:
    def __init__(self, db: Session):
        self.db = db
        self.perm_service = PermissionService(db)

    async def get_student(self, student_id: int, current_user: User):
        # Check if user can read students
        has_perm = await self.perm_service.has_permission(
            user=current_user,
            resource="students",
            action="read"
        )

        if not has_perm and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        return self.db.query(Student).filter_by(id=student_id).first()

```text
### Checking Multiple Permissions

```python
# Check if user has ANY of these permissions

has_any = await perm_service.has_any_permission(
    user=current_user,
    permissions=[
        ("students", "create"),
        ("students", "import")
    ]
)

# Check if user has ALL of these permissions

has_all = await perm_service.has_all_permissions(
    user=current_user,
    permissions=[
        ("reports", "read"),
        ("reports", "export")
    ]
)

```text
---

## Implementation Examples

### Example 1: Adding Permission Check to Existing Endpoint

**Before:**

```python
@router.post("/students/import")
async def import_students(
    file: UploadFile,
    current_user: User = Depends(optional_require_role("admin", "teacher"))
):
    """Import students from CSV"""
    return await process_import(file)

```text
**After:**

```python
@router.post("/students/import")
async def import_students(
    file: UploadFile,
    current_user: User = Depends(optional_require_role("admin", "teacher")),
    db: Session = Depends(get_db)
):
    """Import students from CSV"""
    perm_service = PermissionService(db)

    # Check granular permission
    if not await perm_service.has_permission(current_user, "students", "import"):
        raise HTTPException(status_code=403, detail="Not authorized to import students")

    return await process_import(file, current_user, db)

```text
### Example 2: Creating a Custom Permission

```python
# In migration or seed data:

permission = Permission(
    key="students:bulk_edit",
    resource="students",
    action="bulk_edit",
    description="Bulk edit student records",
    is_active=True
)
db.add(permission)
db.commit()

# Assign to teacher role:

role_perm = RolePermission(
    role="teacher",
    permission_id=permission.id,
    is_active=True
)
db.add(role_perm)
db.commit()

```text
### Example 3: Temporary User Permissions

```python
# Grant permission that expires in 30 days

permission = db.query(Permission).filter_by(
    resource="reports",
    action="export"
).first()

user_perm = UserPermission(
    user_id=123,
    permission_id=permission.id,
    grant_reason="Project deadline: Q1 reporting",
    granted_by=current_admin.id,
    expires_at=datetime.utcnow() + timedelta(days=30),
    is_active=True
)
db.add(user_perm)
db.commit()

```text
---

## Testing

### Test Coverage

All RBAC functionality is covered by 102+ tests in `backend/tests/test_rbac.py` and `backend/tests/test_permissions_api.py`:

- ✅ Permission model CRUD operations
- ✅ Role permission assignments
- ✅ User permission management
- ✅ Permission expiration handling
- ✅ Permission caching and performance
- ✅ API endpoint security
- ✅ Soft delete handling
- ✅ Concurrent access handling

### Running RBAC Tests

```bash
# Run all RBAC tests

cd backend
pytest tests/test_rbac.py tests/test_permissions_api.py -v

# Run specific test

pytest tests/test_rbac.py::TestPermissionModel::test_permission_creation -v

# Run with coverage

pytest tests/test_rbac.py --cov=backend.models --cov-report=html

```text
### Writing New RBAC Tests

```python
import pytest
from backend.models import Permission, RolePermission, UserPermission
from backend.services.permission_service import PermissionService

@pytest.mark.asyncio
async def test_custom_permission_grant(db):
    """Test granting custom permission to user"""
    # Create permission
    perm = Permission(
        key="custom:action",
        resource="custom",
        action="action",
        description="Custom test permission"
    )
    db.add(perm)
    db.commit()

    # Grant to user
    user_perm = UserPermission(
        user_id=1,
        permission_id=perm.id,
        grant_reason="Testing"
    )
    db.add(user_perm)
    db.commit()

    # Verify
    perm_service = PermissionService(db)
    user = db.query(User).get(1)

    assert await perm_service.has_permission(user, "custom", "action")

```text
---

## Troubleshooting

### Common Issues

#### 1. Permission Check Always Fails

**Problem**: User has permission but `has_permission()` returns False

**Solution**:
- Verify permission is active: `permission.is_active == True`
- Check UserPermission expiration: `expires_at` should be None or future date
- Ensure RolePermission is active for the user's role
- Clear any cached permissions: `PermissionService.clear_cache()`

```python
# Debug permission resolution

perm_service = PermissionService(db)
perms = await perm_service.get_user_permissions(user)
print(f"User has {len(perms)} total permissions")
print([p.key for p in perms])

```text
#### 2. Permission API Returns 403

**Problem**: Admin endpoint returns 403 Forbidden

**Check**:
- AUTH_MODE setting (see below)
- User has `admin` role or equivalent permission
- Permission.is_active == True
- No expired UserPermission blocking access

```python
# Check AUTH_MODE

from backend.environment import RuntimeContext
print(f"AUTH_MODE: {RuntimeContext.auth_mode()}")

```text
#### 3. Migration Issues

**Problem**: Fresh database migration fails

**Solution**: The migration `d37fb9f4bd49` was fixed to handle both fresh and upgraded databases:
- Uses Alembic Inspector to check if indexes exist
- Only drops indexes that actually exist
- See [backend/migrations/versions/d37fb9f4bd49_update_rbac_enhance_permission_model_.py](../../backend/migrations/versions/d37fb9f4bd49_update_rbac_enhance_permission_model_.py)

### AUTH_MODE Configuration

The system respects three auth modes:

```python
# backend/environment.py

AUTH_MODE = os.getenv("AUTH_MODE", "permissive")  # default: permissive

# Modes:

# "disabled" - No authentication required (emergency access, testing)
# "permissive" - Authentication optional (login enables features)

# "strict" - Full authentication required (production recommended)

```text
**Use Cases**:
- **Testing**: Set `AUTH_MODE=disabled` or `DISABLE_STARTUP_TASKS=1`
- **Development**: Use `AUTH_MODE=permissive` (default)
- **Production**: Use `AUTH_MODE=strict` with proper JWT secrets

### Database Inspection

```python
# List all permissions

from backend.models import Permission, RolePermission, UserPermission
from backend.db import SessionLocal

db = SessionLocal()
perms = db.query(Permission).all()
print(f"Total permissions: {len(perms)}")

# Check role assignments

teacher_perms = db.query(RolePermission).filter_by(role="teacher").all()
print(f"Teacher role has {len(teacher_perms)} permissions")

# Check user overrides

user_perms = db.query(UserPermission).filter_by(user_id=123).all()
print(f"User 123 has {len(user_perms)} direct permissions")

```text
---

## Performance Considerations

### Caching Strategy

The PermissionService implements two-level caching:

1. **In-Memory Cache** (per request): Cached permission resolution
2. **Database Indexing**: Optimized queries on frequently accessed columns
   - `permission.key` (unique)
   - `role_permission.role` (for role lookups)
   - `user_permission.user_id` (for user lookups)

### Query Optimization

For large deployments:

```python
# Use eager loading to reduce queries

from sqlalchemy.orm import joinedload

user = db.query(User).options(
    joinedload(User.permissions)
).first()

# Use permission caching

perm_service = PermissionService(db)
perms = await perm_service.get_user_permissions(
    user,
    cache_ttl=300  # Cache for 5 minutes
)

```text
---

## See Also

- [ROLE_PERMISSIONS_MODEL.md](../ROLE_PERMISSIONS_MODEL.md) - Permission matrix reference
- [backend/services/permission_service.py](../../backend/services/permission_service.py) - Service implementation
- [backend/routers/routers_permissions.py](../../backend/routers/routers_permissions.py) - API endpoints
- [backend/models.py](../../backend/models.py) - Permission models (lines 1-100)
- [backend/tests/test_rbac.py](../../backend/tests/test_rbac.py) - Complete test suite
- [AUTHENTICATION.md](AUTHENTICATION.md) - Related auth documentation

