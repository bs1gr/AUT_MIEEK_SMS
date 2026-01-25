# RBAC Permission Matrix Design

**Version:** 1.0
**Created:** January 6, 2026
**Status:** Design Phase
**Related:** [Phase 2 Consolidated Plan](../plans/PHASE2_CONSOLIDATED_PLAN.md), [GitHub Issue #102](https://github.com/bs1gr/AUT_MIEEK_SMS/issues/102)

---

## 📋 Overview

Fine-grained permission-based access control system replacing the current role-based implementation. Enables granular control over resource access while maintaining backward compatibility with existing role system.

**Key Benefits:**
- Precise access control at resource:action level
- Role-permission many-to-many relationships
- Easy permission auditing and compliance
- Flexible permission assignment without code changes

---

## 🎯 Permission Structure

**Format:** `resource:action`

**Examples:**
- `students:view` - View student records
- `grades:edit` - Modify grade entries
- `audit:view` - Access audit logs

**Wildcards (future):**
- `students:*` - All student permissions
- `*:view` - View all resources

---

## 🔐 Complete Permission Matrix

### Student Management Permissions

| Permission Key      | Description                    | Admin | Staff | Teacher | Student |
|---------------------|--------------------------------|-------|-------|---------|---------|
| students:view       | View student records           |   ✅   |  ✅   |   ✅    |   ✅¹   |
| students:view_all   | View all student records       |   ✅   |  ✅   |   ✅    |         |
| students:create     | Create new student records     |   ✅   |  ✅   |         |         |
| students:edit       | Edit student information       |   ✅   |  ✅   |         |   ✅¹   |
| students:delete     | Soft-delete student records    |   ✅   |       |         |         |
| students:export     | Export student data            |   ✅   |  ✅   |   ✅    |         |

¹ *Students can only view/edit their own record (enforced via resource ownership check)*

---

### Course Management Permissions

| Permission Key      | Description                    | Admin | Staff | Teacher | Student |
|---------------------|--------------------------------|-------|-------|---------|---------|
| courses:view        | View course information        |   ✅   |  ✅   |   ✅    |   ✅    |
| courses:create      | Create new courses             |   ✅   |  ✅   |         |         |
| courses:edit        | Edit course details            |   ✅   |  ✅   |         |         |
| courses:delete      | Soft-delete courses            |   ✅   |       |         |         |
| courses:export      | Export course data             |   ✅   |  ✅   |   ✅    |         |

---

### Grade Management Permissions

| Permission Key      | Description                    | Admin | Staff | Teacher | Student |
|---------------------|--------------------------------|-------|-------|---------|---------|
| grades:view         | View grade records             |   ✅   |  ✅   |   ✅    |   ✅²   |
| grades:view_all     | View all student grades        |   ✅   |  ✅   |   ✅    |         |
| grades:create       | Create grade entries           |   ✅   |  ✅   |   ✅³   |         |
| grades:edit         | Edit existing grades           |   ✅   |  ✅   |   ✅³   |         |
| grades:delete       | Soft-delete grade records      |   ✅   |  ✅   |         |         |
| grades:export       | Export grade data              |   ✅   |  ✅   |   ✅    |   ✅²   |
| grades:bulk_import  | Bulk import grades (CSV/Excel) |   ✅   |  ✅   |   ✅    |         |

² *Students can only view/export their own grades*
³ *Teachers can only edit grades for their assigned courses*

---

### Attendance Permissions

| Permission Key         | Description                    | Admin | Staff | Teacher | Student |
|------------------------|--------------------------------|-------|-------|---------|---------|
| attendance:view        | View attendance records        |   ✅   |  ✅   |   ✅    |   ✅⁴   |
| attendance:view_all    | View all attendance data       |   ✅   |  ✅   |   ✅    |         |
| attendance:create      | Record attendance              |   ✅   |  ✅   |   ✅⁵   |         |
| attendance:edit        | Edit attendance records        |   ✅   |  ✅   |   ✅⁵   |         |
| attendance:delete      | Soft-delete attendance         |   ✅   |  ✅   |         |         |
| attendance:export      | Export attendance data         |   ✅   |  ✅   |   ✅    |         |

⁴ *Students can only view their own attendance*
⁵ *Teachers can only manage attendance for their assigned courses*

---

### Daily Performance Permissions

| Permission Key            | Description                    | Admin | Staff | Teacher | Student |
|---------------------------|--------------------------------|-------|-------|---------|---------|
| performance:view          | View performance records       |   ✅   |  ✅   |   ✅    |   ✅⁶   |
| performance:view_all      | View all performance data      |   ✅   |  ✅   |   ✅    |         |
| performance:create        | Create performance entries     |   ✅   |  ✅   |   ✅⁷   |         |
| performance:edit          | Edit performance records       |   ✅   |  ✅   |   ✅⁷   |         |
| performance:delete        | Soft-delete performance        |   ✅   |  ✅   |         |         |

⁶ *Students can only view their own performance records*
⁷ *Teachers can only manage performance for their assigned courses*

---

### Highlight Management Permissions

| Permission Key         | Description                    | Admin | Staff | Teacher | Student |
|------------------------|--------------------------------|-------|-------|---------|---------|
| highlights:view        | View highlight records         |   ✅   |  ✅   |   ✅    |   ✅⁸   |
| highlights:view_all    | View all highlights            |   ✅   |  ✅   |   ✅    |         |
| highlights:create      | Create highlight entries       |   ✅   |  ✅   |   ✅⁹   |         |
| highlights:edit        | Edit highlights                |   ✅   |  ✅   |   ✅⁹   |         |
| highlights:delete      | Soft-delete highlights         |   ✅   |  ✅   |         |         |

⁸ *Students can only view their own highlights*
⁹ *Teachers can only manage highlights for their assigned courses*

---

### Reporting & Analytics Permissions

| Permission Key            | Description                    | Admin | Staff | Teacher | Student |
|---------------------------|--------------------------------|-------|-------|---------|---------|
| reports:generate          | Generate standard reports      |   ✅   |  ✅   |   ✅    |         |
| reports:export            | Export reports (PDF/Excel)     |   ✅   |  ✅   |   ✅    |         |
| reports:schedule          | Schedule automated reports     |   ✅   |       |         |         |
| analytics:view            | View analytics dashboards      |   ✅   |  ✅   |   ✅    |         |
| analytics:export          | Export analytics data          |   ✅   |  ✅   |         |         |

---

### System Administration Permissions

| Permission Key            | Description                    | Admin | Staff | Teacher | Student |
|---------------------------|--------------------------------|-------|-------|---------|---------|
| users:view                | View user accounts             |   ✅   |  ✅   |         |         |
| users:create              | Create user accounts           |   ✅   |       |         |         |
| users:edit                | Edit user information          |   ✅   |       |         |         |
| users:delete              | Soft-delete users              |   ✅   |       |         |         |
| users:manage_roles        | Assign/remove roles            |   ✅   |       |         |         |
| users:manage_permissions  | Direct permission assignment   |   ✅   |       |         |         |

---

### Audit & Compliance Permissions

| Permission Key         | Description                    | Admin | Staff | Teacher | Student |
|------------------------|--------------------------------|-------|-------|---------|---------|
| audit:view             | View audit logs                |   ✅   |       |         |         |
| audit:export           | Export audit logs              |   ✅   |       |         |         |
| security:view          | View security settings         |   ✅   |       |         |         |
| security:manage        | Manage security config         |   ✅   |       |         |         |

---

### Backup & Maintenance Permissions

| Permission Key         | Description                    | Admin | Staff | Teacher | Student |
|------------------------|--------------------------------|-------|-------|---------|---------|
| backups:view           | View backup status             |   ✅   |       |         |         |
| backups:create         | Trigger manual backup          |   ✅   |       |         |         |
| backups:restore        | Restore from backup            |   ✅   |       |         |         |
| maintenance:execute    | Run maintenance tasks          |   ✅   |       |         |         |

---

## 📊 Permission Count Summary

| Role    | Total Permissions | View/Read | Create | Edit | Delete | Manage |
|---------|-------------------|-----------|--------|------|--------|--------|
| Admin   | 52                | 20        | 13     | 13   | 11     | 6      |
| Staff   | 33                | 18        | 9      | 8    | 3      | 0      |
| Teacher | 25                | 15        | 6      | 6    | 0      | 0      |
| Student | 11                | 10        | 0      | 1    | 0      | 0      |

---

## 🗄️ Database Schema Changes

### New Tables

#### `permissions` Table

```sql
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'students:view'
    resource VARCHAR(50) NOT NULL,      -- e.g., 'students'
    action VARCHAR(50) NOT NULL,        -- e.g., 'view'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX ix_permissions_key ON permissions(key);
CREATE INDEX ix_permissions_resource ON permissions(resource);
CREATE INDEX ix_permissions_is_active ON permissions(is_active);

```text
#### `roles_permissions` Junction Table

```sql
CREATE TABLE roles_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX ix_roles_permissions_role_id ON roles_permissions(role_id);
CREATE INDEX ix_roles_permissions_permission_id ON roles_permissions(permission_id);

```text
#### `user_permissions` Table (for direct assignments)

```sql
CREATE TABLE user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    granted_by INTEGER,  -- admin who granted permission
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,  -- optional expiration
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, permission_id)
);

-- Indexes
CREATE INDEX ix_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX ix_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX ix_user_permissions_expires_at ON user_permissions(expires_at);

```text
---

## 🔨 Implementation Details

### Backend Components

#### 1. Permission Check Decorator

```python
# backend/dependencies.py

from functools import wraps
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

def require_permission(permission_key: str, allow_self: bool = False):
    """
    Decorator to enforce permission checks on endpoints.

    Args:
        permission_key: Permission key (e.g., 'students:view')
        allow_self: If True, allow users to access their own resources

    Usage:
        @require_permission('students:edit')
        async def update_student(...):
            pass

        @require_permission('students:view', allow_self=True)
        async def get_student(student_id: int, current_user: User, ...):
            # Allows students to view their own record
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user=None, db: Session = None, **kwargs):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            # Check if user has permission
            if not has_permission(current_user, permission_key, db):
                # Check self-access if allowed
                if allow_self and _is_self_access(current_user, kwargs):
                    return await func(*args, current_user=current_user, db=db, **kwargs)

                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permission: {permission_key}"
                )

            return await func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator


def has_permission(user: User, permission_key: str, db: Session) -> bool:
    """
    Check if user has a specific permission.

    Checks:
    1. Direct user permissions (user_permissions table)
    2. Role-based permissions (roles_permissions via user.roles)

    Returns:
        bool: True if user has permission
    """
    # Admin bypass (optional - can be configured)
    if user.role == "admin":
        return True

    # Check direct user permissions
    direct_permission = db.query(UserPermission).join(Permission).filter(
        UserPermission.user_id == user.id,
        Permission.key == permission_key,
        Permission.is_active == True,
        (UserPermission.expires_at.is_(None) | (UserPermission.expires_at > datetime.utcnow()))
    ).first()

    if direct_permission:
        return True

    # Check role-based permissions
    role_permission = db.query(RolePermission).join(Permission).join(Role).filter(
        Role.name == user.role,
        Permission.key == permission_key,
        Permission.is_active == True
    ).first()

    return role_permission is not None


def _is_self_access(user: User, kwargs: dict) -> bool:
    """
    Check if request is for user's own resource.

    Supports:
    - student_id parameter matching user.id
    - user_id parameter matching user.id

    """
    student_id = kwargs.get('student_id')
    user_id = kwargs.get('user_id')

    if student_id and user.id == student_id:
        return True
    if user_id and user.id == user_id:
        return True

    return False

```text
#### 2. SQLAlchemy Models

```python
# backend/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    resource = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    user_permissions = relationship("UserPermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(Base):
    __tablename__ = "roles_permissions"

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")

    __table_args__ = (UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),)


class UserPermission(Base):
    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="user_permissions")
    permission = relationship("Permission", back_populates="user_permissions")
    grantor = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (UniqueConstraint('user_id', 'permission_id', name='uq_user_permission'),)


# Update existing User model

class User(Base):
    # ... existing fields ...

    # Add relationship
    user_permissions = relationship("UserPermission", foreign_keys="[UserPermission.user_id]", back_populates="user", cascade="all, delete-orphan")


# Update existing Role model

class Role(Base):
    # ... existing fields ...

    # Add relationship
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")

```text
#### 3. Pydantic Schemas

```python
# backend/schemas/permissions.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PermissionBase(BaseModel):
    key: str = Field(..., min_length=3, max_length=100, pattern=r'^[a-z_]+:[a-z_]+$')
    resource: str = Field(..., min_length=2, max_length=50)
    action: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    is_active: bool = True


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(BaseModel):
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PermissionResponse(PermissionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RolePermissionCreate(BaseModel):
    role_id: int
    permission_id: int


class RolePermissionResponse(BaseModel):
    id: int
    role_id: int
    permission_id: int
    created_at: datetime
    permission: PermissionResponse

    class Config:
        from_attributes = True


class UserPermissionCreate(BaseModel):
    user_id: int
    permission_id: int
    expires_at: Optional[datetime] = None


class UserPermissionResponse(BaseModel):
    id: int
    user_id: int
    permission_id: int
    granted_by: Optional[int]
    granted_at: datetime
    expires_at: Optional[datetime]
    permission: PermissionResponse

    class Config:
        from_attributes = True

```text
---

## 🚀 Migration Guide

### Step 1: Database Migration

```bash
cd backend
alembic revision --autogenerate -m "Add RBAC permission tables"
alembic upgrade head

```text
### Step 2: Seed Default Permissions

```python
# backend/scripts/seed_permissions.py

from sqlalchemy.orm import Session
from backend.models import Permission, Role, RolePermission
from backend.db import SessionLocal

PERMISSIONS = [
    # Students
    {"key": "students:view", "resource": "students", "action": "view", "description": "View student records"},
    {"key": "students:view_all", "resource": "students", "action": "view_all", "description": "View all student records"},
    {"key": "students:create", "resource": "students", "action": "create", "description": "Create new student records"},
    {"key": "students:edit", "resource": "students", "action": "edit", "description": "Edit student information"},
    {"key": "students:delete", "resource": "students", "action": "delete", "description": "Soft-delete student records"},
    {"key": "students:export", "resource": "students", "action": "export", "description": "Export student data"},

    # Courses
    {"key": "courses:view", "resource": "courses", "action": "view", "description": "View course information"},
    {"key": "courses:create", "resource": "courses", "action": "create", "description": "Create new courses"},
    {"key": "courses:edit", "resource": "courses", "action": "edit", "description": "Edit course details"},
    {"key": "courses:delete", "resource": "courses", "action": "delete", "description": "Soft-delete courses"},
    {"key": "courses:export", "resource": "courses", "action": "export", "description": "Export course data"},

    # ... (all 52 permissions)
]

ROLE_PERMISSIONS = {
    "admin": [...],  # All 52 permissions
    "staff": [...],  # 33 permissions
    "teacher": [...],  # 25 permissions
    "student": [...],  # 11 permissions
}

def seed_permissions(db: Session):
    # Create permissions
    for perm_data in PERMISSIONS:
        perm = db.query(Permission).filter_by(key=perm_data["key"]).first()
        if not perm:
            perm = Permission(**perm_data)
            db.add(perm)
    db.commit()

    # Assign to roles
    for role_name, perm_keys in ROLE_PERMISSIONS.items():
        role = db.query(Role).filter_by(name=role_name).first()
        if role:
            for perm_key in perm_keys:
                perm = db.query(Permission).filter_by(key=perm_key).first()
                if perm:
                    role_perm = db.query(RolePermission).filter_by(
                        role_id=role.id, permission_id=perm.id
                    ).first()
                    if not role_perm:
                        role_perm = RolePermission(role_id=role.id, permission_id=perm.id)
                        db.add(role_perm)
    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_permissions(db)
        print("✅ Permissions seeded successfully")
    finally:
        db.close()

```text
### Step 3: Refactor Endpoints

```python
# Before (role-based)

@router.post("/students/")
async def create_student(
    student: StudentCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    pass

# After (permission-based)

@router.post("/students/")
@require_permission("students:create")
async def create_student(
    student: StudentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pass

```text
---

## 🧪 Testing Strategy

### Unit Tests

```python
# backend/tests/test_permissions.py

def test_admin_has_all_permissions(db: Session):
    admin = create_user(db, role="admin")
    assert has_permission(admin, "students:delete", db) == True
    assert has_permission(admin, "audit:view", db) == True

def test_student_limited_permissions(db: Session):
    student = create_user(db, role="student")
    assert has_permission(student, "students:view", db) == True
    assert has_permission(student, "students:create", db) == False
    assert has_permission(student, "audit:view", db) == False

def test_self_access_allowed(db: Session):
    student = create_user(db, role="student")
    # Student can view their own record
    assert _is_self_access(student, {"student_id": student.id}) == True
    # But not others
    assert _is_self_access(student, {"student_id": 999}) == False

```text
### Integration Tests

```python
def test_endpoint_permission_enforcement(client: TestClient):
    # Admin can delete
    admin_token = login_as_admin(client)
    response = client.delete(
        "/api/v1/students/1",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200

    # Teacher cannot delete
    teacher_token = login_as_teacher(client)
    response = client.delete(
        "/api/v1/students/1",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 403
    assert "Missing permission: students:delete" in response.json()["detail"]

```text
---

## 📚 Related Documents

- [Phase 2 Consolidated Plan](../plans/PHASE2_CONSOLIDATED_PLAN.md)
- [GitHub Issue #102 - Permission Matrix](https://github.com/bs1gr/AUT_MIEEK_SMS/issues/102)
- [GitHub Issue #103 - Database Schema](https://github.com/bs1gr/AUT_MIEEK_SMS/issues/103)
- [GitHub Issue #104 - Backend Implementation](https://github.com/bs1gr/AUT_MIEEK_SMS/issues/104)

---

## ✅ Success Criteria

- [ ] 52 permissions defined across all resources
- [ ] Database schema created with proper indexes
- [ ] `@require_permission()` decorator functional
- [ ] Backward compatibility with existing role system
- [ ] All unit tests passing
- [ ] Integration tests covering permission enforcement
- [ ] Seed script creates default permissions
- [ ] Documentation complete with examples

---

**Next Steps:**
1. Review and approve permission matrix
2. Create Alembic migration for database changes
3. Implement SQLAlchemy models and relationships
4. Build permission check decorator
5. Create seed script for default permissions
6. Refactor existing endpoints (see [GitHub Issue #104](https://github.com/bs1gr/AUT_MIEEK_SMS/issues/104))

