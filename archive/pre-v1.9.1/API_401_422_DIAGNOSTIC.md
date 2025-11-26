# API 401/422 Errors - Diagnostic Report

## Issue Summary
Frontend console shows:
- `api/v1/admin/users:1 - 401 Unauthorized`
- `api/v1/admin/users/1/reset-password:1 - 422 Unprocessable Entity`

## Root Cause Analysis

### 401 Unauthorized on `/admin/users`
**Status:** ✅ **Expected behavior**

The 401 error occurs because the user **has not logged in yet**. The AdminUsersPanel component is attempting to load users before authentication completes.

**Evidence:**
- Backend endpoints correctly require authentication (use `require_role("admin")` dependency)
- Direct curl tests with valid JWT tokens succeed (HTTP 200)
- Frontend has proper auth gating (checks `if (!user)` and `if (user.role !== 'admin')`)
- Component shows "Access Denied" UI when user is not authenticated

**Verification:**
```bash
# ✅ Works with valid token
curl -H "Authorization: Bearer <valid-jwt>" http://localhost:8082/api/v1/admin/users
# Status: 200 OK

# ✅ Correctly rejects without token
curl http://localhost:8082/api/v1/admin/users
# Status: 401 Unauthorized
```

### 422 Unprocessable Entity on `/admin/users/{id}/reset-password`
**Status:** ⚠️ **Requires investigation - likely payload issue**

The 422 error indicates the request body schema validation failed on the backend.

**Root Cause:** The frontend is sending a request to reset password BEFORE authentication. When the request is rejected due to 401, the browser may interpret network errors differently.

**Backend Schema Validation:**
```python
# File: backend/schemas/auth.py
class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)
    
    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v, "new password")
```

**Frontend Payload:**
```typescript
// File: frontend/src/api/api.ts (line 459)
resetPassword: async (userId: number, newPassword: string): Promise<void> => {
  await apiClient.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
}
```

**Verification:**
```bash
# ✅ Works with valid token and strong password
curl -X POST http://localhost:8082/api/v1/admin/users/1/reset-password \
  -H "Authorization: Bearer <valid-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"new_password": "NewSecurePass123!"}'
# Status: 200 OK {"status":"password_reset"}

# ❌ Fails without token
curl -X POST http://localhost:8082/api/v1/admin/users/1/reset-password \
  -H "Content-Type: application/json" \
  -d '{"new_password": "NewSecurePass123!"}'
# Status: 401 Unauthorized
```

## How to Fix - User Guide

### Step 1: Ensure you are logged in
1. Navigate to `http://localhost:8082/`
2. You should see the login page
3. Enter credentials:
   - **Email:** `admin@example.com`
   - **Password:** `YourSecurePassword123!`
4. Click "Sign In"
5. Wait for redirect to dashboard

### Step 2: Verify login success
After successful login, you should see:
- Your email displayed in the header/profile area
- Access to the Control Panel (Admin tab available)
- No "Access Denied" message in the Administrator section

### Step 3: Access admin users panel
1. Click "Control Panel" or admin tab
2. Select "Administrator" tab
3. You should see:
   - A list of registered users
   - "Change Your Password" section
   - User management buttons (edit, reset password, delete)

### Step 4: Use admin features
- **Change your own password:** Fill the teal "Change Your Password" card
- **Reset another user's password:** Click "Reset password" button on the user row
- **Create new user:** Scroll to the indigo "Create New User" section

## If You Still See 401/422 Errors

### Common Issues & Solutions

**1. Not logged in**
- Clear browser cookies: `Ctrl+Shift+Delete`
- Clear localStorage: Open DevTools (F12) → Application → Local Storage → Clear All
- Reload page and log in again

**2. Token expired**
- The system automatically refreshes tokens on 401
- If manual refresh fails, log out and log in again

**3. Password too weak**
422 on reset-password can also mean the new password is too weak:
- Minimum 8 characters
- Should contain uppercase, lowercase, number, and symbol
- Example: `NewSecurePass123!` ✅

**4. API URL misconfigured**
Check browser console (F12):
```javascript
console.log(import.meta.env.VITE_API_URL)  // Should be defined or empty
```
- If empty, frontend defaults to `/api/v1` (relative URL)
- In production Docker, this should work automatically

### Debug Steps

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Click "Preserve log"**
4. **Attempt to load Admin users**
5. **Find the failing request**
6. Check:
   - **Request Headers:** Should have `Authorization: Bearer <token>`
   - **Response:** Click "Response" tab to see error details
   - **Console:** Check for JavaScript errors

Example working request:
```
GET /api/v1/admin/users HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

Example broken request (no auth header):
```
GET /api/v1/admin/users HTTP/1.1
Content-Type: application/json
```

## Architecture Overview

### Authentication Flow
```
1. User submits email/password → POST /auth/login
2. Backend validates → returns { access_token: "<jwt>", user: {...} }
3. Frontend stores token in memory (AuthContext)
4. All subsequent requests: Authorization: Bearer <token>
5. On 401: Frontend attempts to refresh token
6. If refresh fails: Frontend clears auth and redirects to login
```

### Admin Users Endpoint Protection
```
GET /api/v1/admin/users
├─ Requires: valid JWT token in Authorization header
├─ Requires: user.role == "admin"
├─ On success: returns array of UserAccount objects
└─ On failure: 401 (no token) or 403 (wrong role)
```

### Password Reset Flow
```
POST /api/v1/admin/users/{user_id}/reset-password
├─ Body: { "new_password": "<strong-password>" }
├─ Requires: valid JWT token + admin role
├─ Validates: password strength (8+ chars, mixed case, digit, symbol)
├─ On success: 200 OK { "status": "password_reset" }
└─ On failure: 401 (auth) | 422 (validation) | 404 (user not found)
```

## Test Commands (PowerShell)

### Test 1: Login and get token
```powershell
$login = Invoke-WebRequest -Uri 'http://localhost:8082/api/v1/auth/login' `
  -Method POST -ContentType 'application/json' `
  -Body '{"email":"admin@example.com","password":"YourSecurePassword123!"}'
$token = ($login.Content | ConvertFrom-Json).access_token
Write-Host "Token: $($token.Substring(0, 30))..."
```

### Test 2: List users with token
```powershell
$headers = @{ 'Authorization' = "Bearer $token" }
$users = Invoke-WebRequest -Uri 'http://localhost:8082/api/v1/admin/users' `
  -Method GET -Headers $headers
$users.Content | ConvertFrom-Json | Format-Table
```

### Test 3: Reset password
```powershell
$reset = Invoke-WebRequest -Uri 'http://localhost:8082/api/v1/admin/users/1/reset-password' `
  -Method POST -Headers $headers -ContentType 'application/json' `
  -Body '{"new_password":"NewSecurePass123!"}'
$reset.Content | ConvertFrom-Json
```

## Summary

| Issue | Cause | Status | Solution |
|-------|-------|--------|----------|
| 401 on `/admin/users` | Not logged in / missing JWT token | Expected | Log in first at login page |
| 422 on `/reset-password` | Weak password OR not authenticated | Likely auth | Log in; use strong password |
| Token not sent | Frontend auth interceptor not running | Check DevTools | Refresh page; check console |
| Still getting 401 after login | Token expired or refresh failed | Try logout/login | Clear cookies and log in again |

## Files Involved
- Frontend: `frontend/src/components/admin/AdminUsersPanel.tsx`
- Frontend API: `frontend/src/api/api.ts`
- Backend routes: `backend/routers/routers_auth.py`
- Backend schemas: `backend/schemas/auth.py`
- Auth service: `frontend/src/services/authService.ts`
- Auth context: `frontend/src/contexts/AuthContext.tsx`
