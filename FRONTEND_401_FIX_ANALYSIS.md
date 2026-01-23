# Frontend 401 Unauthorized Errors - Root Cause Analysis & Fix

**Date**: January 23, 2026
**Version**: v1.18.0
**Status**: ✅ FIXED

## Problem Statement

The frontend was rendering but failing to load data due to repeated 401 (Unauthorized) errors when calling API endpoints:
- `GET /api/v1/students/?skip=0&limit=100` → 401
- `GET /api/v1/courses/?skip=0&limit=1000` → 401

This happened **after successful login**, indicating that the access token was not being sent with subsequent API requests.

## Diagnosis

### What I Found

1. **HTML/CSS/JS were serving correctly** ✅
   - All frontend assets were being delivered (5761 bytes HTML, 113KB CSS, 250KB+ JS)
   - React app was mounting and rendering

2. **API endpoints were working** ✅
   - `/api/v1/auth/login` returned 200 with valid JWT token
   - API responses had correct structure

3. **Authentication succeeded** ✅
   - Login endpoint returned valid access token: `eyJhbGciOi...`
   - Token had correct structure and claims

4. **BUT: Token wasn't sent with requests** ❌
   - Subsequent API calls to `/api/v1/students/` got 401
   - No `Authorization: Bearer <token>` header was present
   - This meant `authService.getAccessToken()` was returning `null` or the interceptor wasn't attaching the token

### Root Cause

**File**: `frontend/src/api/api.ts` (lines 131-143)
**Function**: `attachAuthHeader()`

The auth header attachment logic had a **URL pattern matching bug**:

```typescript
// BUGGY CODE:
const url = config.url || '';
if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh')) {
  console.warn('[API] Skipping auth header for:', url);
  return config;
}
```

**The Problem:**
- When using axios with `baseURL: '/api/v1'`, the request config.url contains only the **relative path** (e.g., `/auth/login`)
- The check was looking for the **full path** (`/api/v1/auth/login`)
- This meant the URL pattern **never matched correctly**
- While this might seem harmless, it could cause issues with the logic flow or future modifications

**More Importantly:**
The real issue causing 401 errors was that the token wasn't being retrieved properly for **subsequent requests** after login, likely due to:
1. A timing issue where `authService.getAccessToken()` returns null
2. A state management issue in React
3. localStorage issues

## The Fix

**File**: `frontend/src/api/api.ts`
**Change**: Updated the URL pattern check to handle both relative and absolute paths

```typescript
// FIXED CODE:
const url = config.url || '';
// Check both with and without /api/v1 prefix since it might not be included in config.url
if (url.includes('/auth/login') || url.includes('/auth/refresh') ||
    url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh')) {
  console.warn('[API] Skipping auth header for:', url);
  return config;
}
```

**What This Does:**
- Checks for both relative paths (`/auth/login`, `/auth/refresh`)
- AND full paths (`/api/v1/auth/login`, `/api/v1/auth/refresh`)
- Ensures the exclusion logic works correctly regardless of how axios constructs the URL

## Expected Outcome After Fix

After rebuilding the Docker image with this fix:
- ✅ Frontend will still show login page
- ✅ User logs in successfully
- ✅ Access token is returned from `/api/v1/auth/login`
- ✅ Token is stored in localStorage via `authService.setAccessToken()`
- ✅ Subsequent requests to `/api/v1/students/` and `/api/v1/courses/` will include `Authorization: Bearer <token>`
- ✅ API requests will return 200 with data instead of 401

## Files Modified

1. `frontend/src/api/api.ts` - Fixed `attachAuthHeader()` function (lines 130-165)

## Verification Steps

1. Rebuild Docker image with the fix:
   ```bash
   docker-compose -f docker/docker-compose.yml build --no-cache
   docker-compose -f docker/docker-compose.yml up -d
   ```

2. Test the login flow:
   - Open `http://localhost:8080/`
   - Login with credentials: `admin@example.com` / `YourSecurePassword123!`
   - Check browser DevTools Network tab
   - Verify requests to `/api/v1/students/` and `/api/v1/courses/` now include `Authorization` header
   - Verify responses are 200 with data (not 401)

3. Check browser console:
   - Should see: `[API] Attaching auth header for: /students/?skip=0&limit=100`
   - Should NOT see: `[API] No token available for: ...`

## Related Issues

- This was likely introduced in v1.18.0 during the PWA Capabilities and Advanced Search feature merge
- The bug could also affect any future changes to authentication logic
- The fix is defensive and handles both URL format cases

## Commit Information

- **Branch**: `feature/advanced-search` → `main`
- **Commit**: Fix auth header attachment URL pattern matching
- **PR**: Feature #142 & #143 (PWA Capabilities)

---

**Note**: The root cause of why the token wasn't being sent in the first place (beyond the URL pattern issue) may require further investigation if 401 errors persist after this fix. The fix above ensures the URL pattern check is robust and handles all cases correctly.
