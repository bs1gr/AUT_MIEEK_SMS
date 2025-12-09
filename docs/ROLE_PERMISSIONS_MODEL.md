# Role-Based Access Control (RBAC) Model

## Overview

The Student Management System implements a simple two-role RBAC model:

- **Teacher**: Full access to all database operations (students, courses, grades, attendance, enrollments, etc.)
- **Administrator**: Teacher permissions PLUS user account management

## Role Permission Matrix

### Teacher Role (`"teacher"`)

Teachers have full access to all educational data operations:

| Category | Operations | Endpoints |
|----------|-----------|-----------|
| **Students** | Create, Read, Update, Delete, Activate/Deactivate, Bulk operations | `/api/v1/students/*` |
| **Courses** | Create, Read, Update, Delete, Configure evaluation rules & schedules | `/api/v1/courses/*` |
| **Enrollments** | Enroll/Unenroll students, View enrollments | `/api/v1/enrollments/*` |
| **Grades** | Create, Read, Update, Delete grades | `/api/v1/grades/*` |
| **Attendance** | Create, Read, Update, Delete attendance records | `/api/v1/attendance/*` |
| **Daily Performance** | Create, Read, Update performance scores | `/api/v1/daily-performance/*` |
| **Highlights** | Create, Read, Update student highlights | `/api/v1/highlights/*` |
| **Imports** | Import courses, students, sessions | `/api/v1/import/*`, `/api/v1/sessions/*` |
| **Reports** | Generate and export reports | `/api/v1/exports/*` |

### Administrator Role (`"admin"`)

Administrators have all Teacher permissions PLUS:

| Category | Operations | Endpoints |
|----------|-----------|-----------|
| **User Management** | Create, Read, Update, Delete user accounts | `/api/v1/auth/admin/users/*` |
| **Database Operations** | Backup, Restore, Database management | `/api/v1/control/api/operations/*` |
| **System Settings** | Configure system-wide settings | `/api/v1/admin/*` |

## Implementation Details

### Backend Authorization

All protected endpoints use the `optional_require_role()` dependency:

```python
from backend.routers.routers_auth import optional_require_role

# Educational data operations - Both roles allowed
@router.post("/students/")
async def create_student(
    ...,
    current_user=Depends(optional_require_role("admin", "teacher"))
):
    pass

# User management - Admin only
@router.post("/auth/admin/users")
async def admin_create_user(
    ...,
    current_admin=Depends(optional_require_role("admin"))
):
    pass
```

### AUTH_MODE Configuration

The system supports three authentication modes (configured via `AUTH_MODE` in `.env`):

1. **`disabled`** (default): No authentication required - all endpoints accessible
   - Useful for: Development, testing, emergency access
   - Security: ⚠️ Not recommended for production

2. **`permissive`**: Authentication optional but enforced when present
   - Useful for: Production with legacy clients
   - Security: ✅ Recommended for most deployments

3. **`strict`**: Full authentication required for all protected endpoints
   - Useful for: High-security deployments
   - Security: ✅✅ Maximum security

### Frontend Integration

The frontend automatically includes authentication headers when AUTH_MODE is enabled:

```typescript
// All API calls use the authenticated apiClient
import apiClient, { enrollmentsAPI } from '@/api/api';

// Automatically includes Authorization: Bearer <token> header
await enrollmentsAPI.enrollStudents(courseId, studentIds);
```

## Common Patterns

### Checking User Role in Code

```python
def get_current_user_role(user) -> str:
    return getattr(user, "role", None)

# In endpoint
if get_current_user_role(current_user) == "admin":
    # Admin-specific logic
```

### Frontend Role Display

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();
const isAdmin = user?.role === 'admin';
const isTeacher = user?.role === 'teacher';
```

## Migration from Old Model

### ❌ Old (Incorrect) Model

- Admins had exclusive access to database operations
- Teachers had limited read-only access

### ✅ New (Correct) Model

- Teachers have full database operations access
- Admins only have extra user account management permissions

## Troubleshooting

### "Access Denied" Errors

1. Check user role: `GET /api/v1/auth/me`
2. Verify AUTH_MODE in backend logs
3. Check browser console for token issues

### Database Saving Errors

- **Fixed in v2.0**: All enrollment operations now use authenticated API client
- Ensure frontend uses `enrollmentsAPI` from `@/api/api`, not raw `fetch()`

### Role Assignment

Only admins can change user roles via:

- Control Panel > Users tab
- API: `PATCH /api/v1/auth/admin/users/{user_id}`

## Best Practices

1. **Default Role**: Assign `"teacher"` role to new users
2. **Admin Accounts**: Limit to 2-3 trusted users
3. **Production**: Use `AUTH_MODE=permissive` or `strict`
4. **Testing**: Use `AUTH_MODE=disabled` for automated tests
5. **API Calls**: Always use `apiClient` from `@/api/api` for authentication

## Files Changed in This Update

### Backend

- `backend/routers/routers_sessions.py`: Changed rollback endpoint to allow teachers

### Frontend

- `frontend/src/api/api.js`: Added `enrollmentsAPI` with authenticated calls
- `frontend/src/features/courses/components/CoursesView.tsx`: Replaced raw fetch with apiClient

### Documentation

- Created this file: `docs/ROLE_PERMISSIONS_MODEL.md`

## Related Documentation

- [Authentication Guide](./user/AUTHENTICATION.md)
- [API Reference](./API_REFERENCE.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
