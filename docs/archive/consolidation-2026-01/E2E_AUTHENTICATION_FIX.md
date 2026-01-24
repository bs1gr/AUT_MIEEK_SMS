# E2E Authentication Fix - Resolution

## Problem

E2E tests were failing because the `loginViaAPI()` helper only set the `access_token` in localStorage but didn't set the user object. The AuthContext requires both:
- `sms_access_token` - JWT token for API requests
- `sms_user_v1` - User profile object for UI state

Without the user object, the `RequireAuth` component would check `useAuth().user`, find it `null`, and redirect back to the login page.

## Root Cause

1. Login endpoint (`/api/v1/auth/login`) returns only `{ access_token, token_type, refresh_token }`
2. AuthContext stores user profile separately in `sms_user_v1` localStorage key
3. E2E helper `loginViaAPI()` only set the token, not the user object
4. On navigation, `RequireAuth` found `user === null` → redirected to `/`

## Solution

Modified `frontend/tests/e2e/helpers.ts` `loginViaAPI()` function to:

1. **POST to `/auth/login`** - Get access token
2. **GET from `/auth/me`** - Fetch user profile using the token
3. **Set both in localStorage:**
   - `sms_access_token` = JWT token
   - `sms_user_v1` = stringified user object

```typescript
// After getting token from login endpoint
const meResponse = await page.request.get(`${apiBase}/api/v1/auth/me`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const userData = await meResponse.json();

// Inject both token and user
await page.evaluate(({ token: t, user }) => {
  window.localStorage.setItem('sms_access_token', t);
  window.localStorage.setItem('sms_user_v1', JSON.stringify(user));
}, { token, user: userData });

```text
## Validation

After the fix:
- ✅ Login succeeds (token length: 139-148 chars)
- ✅ User profile fetched (email: test@example.com)
- ✅ Both token and user set in localStorage
- ✅ Navigation to `/dashboard` successful
- ✅ No authentication redirects
- ✅ E2E tests now past authentication layer

## Files Changed

- `frontend/tests/e2e/helpers.ts` - Enhanced `loginViaAPI()` function

## Related Work

- `seed_e2e_data.py` - Enhanced validation output
- `check_login_health.py` - Added login endpoint health check
- `.github/workflows/e2e-tests.yml` - Added database verification step

## Next Steps

The authentication layer is now working. Remaining E2E test failures are related to:
1. Test implementation issues (not capturing created entity IDs)
2. UI selector mismatches
3. Form interaction patterns

These are separate from authentication and should be addressed independently.

## Date

2026-01-05

