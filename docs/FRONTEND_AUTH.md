Frontend Authentication (Login / Logout)

Overview

This document explains the frontend authentication integration, how tokens are handled, and how to create an admin user in the backend for full access.

High-level flow

- User submits email + password to POST /api/v1/auth/login.
- Backend issues short-lived access token (JWT) and a refresh token.
  - Preferred mode: refresh token is set as an HttpOnly cookie (Secure, SameSite=Lax) by the backend.
  - Fallback: backend may return refresh_token in the JSON body; the frontend stores it in localStorage only when cookie mode is not available.
- Frontend stores access token in memory (AuthContext) and user info in localStorage to rehydrate UI.
- For every API request the access token is attached as Authorization: Bearer <token>.
- When an API request returns 401, the client calls POST /api/v1/auth/refresh (sending cookie or refresh_token body as fallback) to obtain a new access token and retries the original request once.
- Logout calls POST /api/v1/auth/logout, which revokes the refresh token server-side and clears the refresh cookie.

Files added/changed

- frontend/src/services/authService.ts - in-memory access token and refresh helper
- frontend/src/contexts/AuthContext.tsx - React context providing login/logout/refresh
- frontend/src/components/auth/LoginWidget.tsx - login form component
- frontend/src/components/auth/LogoutButton.tsx - logout button
- frontend/src/components/auth/AuthControls.tsx - helper to display login or logout
- frontend/src/api/api.ts - axios client extended to attach authorization header and refresh-on-401
- backend/routers/routers_auth.py - updated to set HttpOnly refresh cookie on login, read cookie on refresh/logout
- backend/schemas/auth.py - refresh/logout requests now accept optional refresh_token (cookie fallback)
- backend/tools/create_admin.py - script to create an admin user

How to run locally (dev)

1. Start backend API (default port 8000):

```powershell
cd backend
# ensure virtualenv and deps installed
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

2. Start frontend dev server:

```powershell
cd frontend
npm install
npm run dev
```

3. Open app in browser and use the login widget (top-right). If backend sets HttpOnly cookie you don't need to store refresh_token in localStorage.

Create admin user (one-off)

Administrator accounts must be created using an internal tool or an administrator-only workflow. Public registration in the UI does NOT grant admin privileges.

Recommended (preferred) — run as a module from the repository root:

```powershell
# From repository root
python -m backend.tools.create_admin --email admin@example.com --password 'StrongP@ssw0rd!'
```

Alternate (if running the script file directly):

```powershell
# Ensure Python can import the 'backend' package from the repo root
$env:PYTHONPATH = (Resolve-Path .).Path
python backend/tools/create_admin.py --email admin@example.com --password 'StrongP@ssw0rd!'
```

Do NOT rely on public `/auth/register` to create admin users. If an account must be promoted, use your internal admin process or the script above. This prevents privilege escalation by untrusted users.

Notes & security

- The preferred approach uses HttpOnly Secure cookies for refresh tokens. This reduces XSS risk because cookies cannot be read from JavaScript. Ensure your frontend is served over HTTPS when `COOKIE_SECURE` is set to True in backend settings.
- The access token is intentionally kept in memory to reduce persistent XSS attack surface. It will be lost on full page reload; the app uses refresh endpoint to obtain a new access token when needed.
- CSRF: Because we use SameSite=Lax for the refresh cookie and the refresh endpoint is POST, the risk is reduced for typical navigation patterns. For higher security, implement CSRF tokens or SameSite=Strict depending on your SSO flow.

Troubleshooting

- If login succeeds but authenticated API calls do not include Authorization header, verify the frontend dev server is configured and that `AuthProvider` is wrapping the app (this is set in `frontend/src/main.tsx`).
- If refresh isn't working, check backend logs for validation errors and ensure cookies are being set (browser devtools -> Application -> Cookies).

If you want, I can now:
- Add Playwright E2E tests for login/refresh/logout flows (requires test infra + CI changes), or
- Implement stricter SameSite + CSRF handling on the backend.

*** End of document ***
