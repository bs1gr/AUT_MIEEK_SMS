# Fine-Grained RBAC (Phase 2.4) Implementation Plan

**Goal:** Move from role-based access to permission-based access for maximum security and flexibility.

---

## 1. Design Review
- [ ] Define permissions (CRUD per resource, special actions)
- [ ] Map permissions to roles (admin, staff, teacher, student, etc.)
- [ ] Document permission matrix

## 2. Database/Model Changes
- [ ] Add `permissions` table/model (if not present)
- [ ] Add many-to-many relationship: roles ↔ permissions
- [ ] Add endpoints/models for managing roles/permissions

## 3. Backend Logic
- [ ] Update dependency logic to check permissions, not just roles
- [ ] Add decorators/utilities for permission checks (e.g., `@require_permission('students:edit')`)
- [ ] Refactor endpoints to use permission checks

## 4. Admin UI/API
- [ ] Add endpoints for assigning/removing permissions to roles
- [ ] Add endpoints for assigning roles to users
- [ ] (Optional) Add frontend UI for managing roles/permissions

## 5. Testing & Documentation
- [ ] Add/expand tests for permission enforcement
- [ ] Update API docs and onboarding guides
- [ ] Document migration/upgrade steps

---

_Last updated: 2025-12-18_

---

## 1a. Permission Matrix (Draft)

| Resource   | Action         | Permission Key         | Admin | Staff | Teacher | Student |
|------------|---------------|-----------------------|-------|-------|---------|---------|
| Students   | View          | students:view         |   ✅   |  ✅   |   ✅    |   ✅    |
| Students   | Create        | students:create       |   ✅   |  ✅   |         |         |
| Students   | Edit          | students:edit         |   ✅   |  ✅   |         |         |
| Students   | Delete        | students:delete       |   ✅   |       |         |         |
| Courses    | View          | courses:view          |   ✅   |  ✅   |   ✅    |   ✅    |
| Courses    | Create        | courses:create        |   ✅   |  ✅   |         |         |
| Courses    | Edit          | courses:edit          |   ✅   |  ✅   |         |         |
| Courses    | Delete        | courses:delete        |   ✅   |       |         |         |
| Grades     | View          | grades:view           |   ✅   |  ✅   |   ✅    |   ✅    |
| Grades     | Edit          | grades:edit           |   ✅   |  ✅   |   ✅    |         |
| Attendance | View          | attendance:view       |   ✅   |  ✅   |   ✅    |   ✅    |
| Attendance | Edit          | attendance:edit       |   ✅   |  ✅   |   ✅    |         |
| Reports    | Generate      | reports:generate      |   ✅   |  ✅   |   ✅    |         |
| Users      | Manage Roles  | users:manage_roles    |   ✅   |       |         |         |
| Users      | Manage Perms  | users:manage_perms    |   ✅   |       |         |         |

_This matrix is a starting point—expand as needed for new resources or actions._

---

## 2. Database/Model Changes (Recommended)

### Tables/Models to Add or Update

- `permissions` (id, key, description)
- `roles_permissions` (role_id, permission_id)  # Many-to-many
- Update `roles` (ensure unique name, description)
- Update `users` (user_id, role_id, ...)

### Alembic Migration Example (Pseudo)
```python
op.create_table('permissions',
 sa.Column('id', sa.Integer(), primary_key=True),
 sa.Column('key', sa.String(length=64), unique=True, nullable=False),
 sa.Column('description', sa.String(length=255)),
)
op.create_table('roles_permissions',
 sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id', ondelete='CASCADE')),
 sa.Column('permission_id', sa.Integer(), sa.ForeignKey('permissions.id', ondelete='CASCADE')),
 sa.PrimaryKeyConstraint('role_id', 'permission_id')
)
```

### Next Steps
- Generate Alembic migration for new tables/relationships
- Update SQLAlchemy models in `backend/models.py`
- Seed default permissions and role mappings

_Always use Alembic for schema changes—never edit DB schema directly!_
