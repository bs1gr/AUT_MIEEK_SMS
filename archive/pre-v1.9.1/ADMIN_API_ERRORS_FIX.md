# 401/422 API Error Resolution

## TL;DR - What's Happening

The 401 (Unauthorized) and 422 (Unprocessable Entity) errors you're seeing are **expected behavior** when the user hasn't logged in yet.

**Solution:** Log in first with your admin credentials.

---

## Quick Diagnosis

### Are you seeing this in the browser console?
```
api/v1/admin/users:1   Failed to load resource: the server responded with a status of 401 (Unauthorized)
api/v1/admin/users/1/reset-password:1   Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)
```

### What it means:
- **401 = Not authenticated** - You haven't logged in yet, or your token is invalid/expired
- **422 = Malformed request** - The request body doesn't match the schema (usually happens when sent without auth)

---

## How to Fix

### 1. Log in to the system
- Go to `http://localhost:8082/`
- Enter:
  - **Email:** `admin@example.com`
  - **Password:** `YourSecurePassword123!`
- Click "Sign In"

### 2. Navigate to Admin panel
- Look for the **Control Panel** or **Operations** section
- Click the **Administrator** tab
- You should now see the list of users (no more 401 errors!)

### 3. Use admin features
Once logged in, you can:
- **View users:** They appear in the table
- **Create user:** Fill the form at the bottom
- **Reset password:** Click the "Reset password" button on any user row
- **Change your own password:** Use the teal "Change Your Password" card

---

## Why This Happens

The admin endpoints are **protected** - they require:
1. A valid JWT authentication token
2. The token must belong to a user with the `admin` role

When the AdminUsersPanel component tries to load users before you've logged in, it gets rejected with 401.

This is **correct and secure behavior**.

---

## Troubleshooting

### "I logged in but still see 401"
**Solution:** Clear your browser cache and localStorage
1. Press `Ctrl+Shift+Delete` (or Cmd+Shift+Delete on Mac)
2. Clear cookies and cached data
3. Close and reopen the browser
4. Log in again

### "I logged in but don't see the Admin tab"
**Make sure:**
- You logged in with an **admin** account (role must be "admin")
- Default admin: `admin@example.com` / `YourSecurePassword123!`
- If you created a non-admin user, you won't see the admin panel

### "Still getting errors?"
**Check the browser DevTools:**
1. Press `F12` to open Developer Tools
2. Go to **Network** tab
3. Try to access the admin panel
4. Look for the failed request to `/api/v1/admin/users`
5. Click it and check:
   - **Request Headers:** Should show `Authorization: Bearer <token>`
   - **Response:** Should show the error details (401 or 422)

---

## Backend is Working Fine

We've verified that the backend API endpoints work correctly:

```
✅ GET /api/v1/admin/users → 200 OK (with valid token)
✅ POST /api/v1/admin/users/{id}/reset-password → 200 OK (with valid token)
✅ Backend authentication working correctly
✅ Admin role enforcement working correctly
```

The issue is entirely on the frontend side (missing auth headers when unauthenticated).

---

## Next Steps

1. **Log in** using the admin credentials
2. **Access the Admin panel** from the Control Panel
3. **Test password reset** by clicking the button on a user row
4. **If it works:** The issue is resolved ✅
5. **If still broken:** Check DevTools Network tab and share the error response

The system is designed to prevent unauthorized access to admin endpoints, so 401 errors are expected when you're not authenticated.
