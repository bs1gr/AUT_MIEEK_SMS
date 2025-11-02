# Authentication & Authorization Guide

## Overview

The Student Management System includes an optional JWT-based authentication system with Role-Based Access Control (RBAC). By default, authentication is **disabled** to maintain backward compatibility with existing deployments.

## Quick Start

### Enable Authentication

1. **Set environment variable** in `backend/.env`:
   ```bash
   AUTH_ENABLED=True
   ```

2. **Configure JWT secret** (required for production):
   ```bash
   SECRET_KEY=your-secure-random-key-here-change-this-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

3. **Generate a secure secret key**:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

4. **Restart the application**:
   ```bash
   .\QUICKSTART.ps1
   ```

### Create Initial Admin User

**Method 1: Via API (Recommended for first user)**

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.edu",
    "password": "SecurePassword123!",
    "full_name": "System Administrator",
    "role": "admin"
  }'
```

**Method 2: Via Python Script**

Create `backend/create_admin.py`:

```python
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.routers.routers_auth import get_password_hash
from backend.models import User

def create_admin():
    db = next(get_db())

    # Check if admin exists
    existing = db.query(User).filter(User.email == "admin@school.edu").first()
    if existing:
        print("Admin user already exists")
        return

    # Create admin
    admin = User(
        email="admin@school.edu",
        hashed_password=get_password_hash("ChangeMe123!"),
        full_name="System Administrator",
        role="admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    print(f"Admin user created: {admin.email}")

if __name__ == "__main__":
    create_admin()
```

Run:
```bash
cd backend
python create_admin.py
```

## User Roles

### Admin
- **Full system access**
- Can create/update/delete all resources
- Can perform administrative operations:
  - Database backups/restores
  - System data clearing
  - Bulk import operations
- Can manage users (future feature)

### Teacher
- **Read access** to all resources
- **Write access** to:
  - Students (create, update, deactivate)
  - Courses (create, update)
  - Grades (create, update, delete)
  - Attendance (create, update, delete, bulk operations)
  - Daily Performance (create)
  - Highlights (create, update, delete)
  - Course Enrollments (enroll, unenroll)
  - Bulk imports (students, courses)
- **No access** to:
  - Database backups/restores
  - System-wide data clearing

### Student
- **Read-only access** to their own data:
  - Personal information
  - Grades
  - Attendance records
  - Highlights
  - Course enrollments
- **No write access** (future: can update profile)

## API Authentication

### Register New User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "teacher@school.edu",
  "password": "SecurePassword123!",
  "full_name": "Jane Smith",
  "role": "teacher"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "teacher@school.edu",
  "full_name": "Jane Smith",
  "role": "teacher",
  "is_active": true,
  "created_at": "2025-10-30T12:00:00Z"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "teacher@school.edu",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "id": 1,
  "email": "teacher@school.edu",
  "full_name": "Jane Smith",
  "role": "teacher",
  "is_active": true
}
```

## Protected Endpoints

When `AUTH_ENABLED=True`, the following endpoints require authentication:

### Admin-Only (403 for non-admins)
- `POST /api/v1/adminops/backup`
- `POST /api/v1/adminops/restore`
- `POST /api/v1/adminops/clear-data`

### Admin or Teacher (403 for students, 401 for anonymous)
- `POST /api/v1/students/`
- `PUT /api/v1/students/{id}`
- `DELETE /api/v1/students/{id}`
- `POST /api/v1/students/{id}/activate`
- `POST /api/v1/students/{id}/deactivate`
- `POST /api/v1/students/bulk/create`
- `POST /api/v1/courses/`
- `PUT /api/v1/courses/{id}`
- `DELETE /api/v1/courses/{id}`
- `POST /api/v1/grades/`
- `PUT /api/v1/grades/{id}`
- `DELETE /api/v1/grades/{id}`
- `POST /api/v1/attendance/`
- `PUT /api/v1/attendance/{id}`
- `DELETE /api/v1/attendance/{id}`
- `POST /api/v1/attendance/bulk/create`
- `POST /api/v1/daily-performance/`
- `POST /api/v1/highlights/`
- `PUT /api/v1/highlights/{id}`
- `DELETE /api/v1/highlights/{id}`
- `POST /api/v1/enrollments/course/{course_id}`
- `DELETE /api/v1/enrollments/course/{course_id}/student/{student_id}`
- `POST /api/v1/imports/courses`
- `POST /api/v1/imports/students`
- `POST /api/v1/imports/upload`

### Read Endpoints (No Authentication Required)
All `GET` endpoints remain publicly accessible regardless of `AUTH_ENABLED` setting to support existing deployments and public dashboards.

## Password Requirements

- Minimum length: 8 characters
- Recommended: Mix of uppercase, lowercase, numbers, and special characters
- Hashing: PBKDF2-SHA256 (600,000 iterations)

## Security Configuration

### JWT Settings

Edit `backend/.env`:

```bash
# Secret key for JWT token signing (REQUIRED - change in production!)
SECRET_KEY=your-secure-random-key-here-change-this-in-production

# JWT algorithm (HS256 recommended)
ALGORITHM=HS256

# Token expiration time in minutes (default: 30)
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### CORS Settings

If accessing API from a different origin:

```bash
# In backend/.env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

## Frontend Integration

### Store Token

After successful login, store the token:

```javascript
// After login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
localStorage.setItem('access_token', data.access_token);
```

### Include Token in Requests

```javascript
const token = localStorage.getItem('access_token');

const response = await fetch('/api/v1/students/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(studentData)
});
```

### Handle Token Expiration

```javascript
if (response.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('access_token');
  window.location.href = '/login';
}
```

## Backward Compatibility

### Default Behavior (AUTH_ENABLED=False)
- All endpoints are **publicly accessible**
- No authentication required
- No authorization checks
- Existing deployments continue working unchanged

### Migration Path

1. **Enable auth in development:**
   ```bash
   AUTH_ENABLED=True
   ```

2. **Test with initial admin user**

3. **Create teacher accounts**

4. **Update frontend** to include authentication UI

5. **Enable in production:**
   - Set `AUTH_ENABLED=True`
   - Use strong `SECRET_KEY`
   - Configure HTTPS/TLS
   - Set appropriate `CORS_ORIGINS`

## Troubleshooting

### "Not authenticated" (401)
- Token missing or invalid
- Token expired (check `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Wrong `Authorization` header format (must be `Bearer <token>`)

### "Forbidden" (403)
- Valid token but insufficient permissions
- User role doesn't have access to endpoint
- Check user role: `GET /api/v1/auth/me`

### "User already registered" (400)
- Email already exists in database
- Use different email or update existing user

### Forgot Admin Password
1. **Stop the application**
2. **Reset in database:**
   ```python
   from backend.db import get_db
   from backend.models import User
   from backend.routers.routers_auth import get_password_hash

   db = next(get_db())
   admin = db.query(User).filter(User.email == "admin@school.edu").first()
   admin.hashed_password = get_password_hash("NewPassword123!")
   db.commit()
   ```
3. **Restart application**

## Testing

### Run Auth Tests

```bash
cd backend
pytest tests/test_auth_router.py -v
pytest tests/test_rbac_enforcement.py -v
```

### Test with AUTH_ENABLED=True

```bash
# Temporarily enable auth for testing
$env:AUTH_ENABLED="True"
pytest tests/test_rbac_enforcement.py -v
```

## Rate Limiting

All authenticated endpoints are rate-limited:

- **Read operations:** 60 requests/minute
- **Write operations:** 10 requests/minute
- **Heavy operations** (backups, imports): 5 requests/minute

Rate limits apply per IP address, regardless of authentication status.

## Best Practices

### Production Deployment

1. ✅ **Use strong SECRET_KEY** (min 32 characters, random)
2. ✅ **Enable HTTPS/TLS** for all API traffic
3. ✅ **Set short token expiration** (15-30 minutes)
4. ✅ **Implement token refresh** (future feature)
5. ✅ **Monitor failed login attempts**
6. ✅ **Use environment-specific configs**
7. ✅ **Backup database** before enabling auth
8. ✅ **Test in staging** before production

### Security

1. 🔒 Never commit `SECRET_KEY` to version control
2. 🔒 Use `.env` files for configuration
3. 🔒 Rotate `SECRET_KEY` periodically
4. 🔒 Enforce strong password policies
5. 🔒 Log authentication events
6. 🔒 Monitor for suspicious activity

## Future Enhancements

- [ ] Token refresh mechanism
- [ ] Password reset via email
- [ ] Two-factor authentication (2FA)
- [ ] User management UI
- [ ] Role assignment UI
- [ ] Audit logging for all changes
- [ ] Session management
- [ ] OAuth2/SAML integration
- [ ] API key authentication for integrations

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | `False` | Enable authentication system |
| `SECRET_KEY` | (required) | JWT signing key - must be set in production |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime in minutes |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |

### Database Models

**users** table:
- `id`: Primary key
- `email`: Unique, indexed
- `hashed_password`: PBKDF2-SHA256 hash
- `full_name`: Display name
- `role`: `admin`, `teacher`, or `student`
- `is_active`: Boolean flag
- `created_at`: Timestamp (timezone-aware)
- `updated_at`: Timestamp (timezone-aware)

## Support

For issues or questions:
1. Check logs: `backend/logs/app.log`
2. Review test cases: `backend/tests/test_auth_router.py`
3. Consult `docs/ARCHITECTURE.md` for system design
4. Open GitHub issue with details

---

**Version:** 1.2.0
**Last Updated:** October 30, 2025
**Maintainer:** Student Management System Team
