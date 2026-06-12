# Environment variables (runtime configuration)

This document lists the important environment variables used by the backend and their recommended usage for development, CI and production.

DISABLE_STARTUP_TASKS

- Type: boolean ("1"/"0")
- Default: not set
- Purpose: When set to `1`, the FastAPI lifespan will skip heavy startup tasks such as running migrations, legacy schema checks and background auto-import threads. Intended for tests and CI to avoid startup side-effects.

CONTROL_API_ALLOW_TASKKILL

- Type: boolean ("1"/"0")
- Default: `0` (disabled)
- Purpose: When set to `1` allows control endpoints to execute system-level taskkill commands. Default disabled to avoid accidental termination of host processes in development/CI.

ADMIN_SHUTDOWN_TOKEN

- Type: string
- Purpose: When set, control endpoints require the header `X-ADMIN-TOKEN` matching this token (constant-time compare). Use a strong secret in production.

ENABLE_CONTROL_API

- Type: boolean ("1"/"0")
- Purpose: When not set to `1`, control endpoints return 404 (hidden). Enable only on operator-managed instances.

ALLOW_REMOTE_SHUTDOWN

- Type: boolean ("1"/"0")
- Purpose: When set, remote requests may be allowed to the control API, but only if `ADMIN_SHUTDOWN_TOKEN` is configured. Defaults to disabled.

ALLOW_SCHEMA_AUTO_CREATE

- Type: boolean ("1"/"0")
- Purpose: If migrations are absent and this is enabled, the app will attempt to create tables via SQLAlchemy metadata as a last-resort. Prefer using Alembic migrations instead of enabling this in production.

ALLOW_SOFT_SHUTDOWN

- Type: boolean ("1"/"0")
- Purpose: When set during shutdown, the app will attempt a softer termination (SIGTERM) before forcing `os._exit(0)`.

SERVE_FRONTEND

- Type: boolean ("1"/"0")
- Purpose: When set and a built SPA exists under `frontend/dist`, the backend will serve the SPA at `/`.

AUTH_ENABLED

- Type: boolean ("1"/"0")
- Default: `0`
- Purpose: Enables JWT authentication and role-based access control. When disabled, endpoints remain open for backward compatibility.

AUTH_LOGIN_THROTTLE_ENABLED / AUTH_USER_LOCKOUT_ENABLED

- Type: boolean ("1"/"0")
- Defaults: `1` (enabled)
- Purpose: Granular switches to disable the in-memory login throttle and per-user lockout logic. Recommended to set both to `0` in CI/E2E runs to avoid false 429 lockouts when tests retry flows.

AUTH_LOGIN_MAX_ATTEMPTS / AUTH_LOGIN_LOCKOUT_SECONDS / AUTH_LOGIN_TRACKING_WINDOW_SECONDS

- Type: integer / integer / integer (seconds)
- Defaults: `5` attempts / `300` seconds / `300` seconds
- Purpose: Controls the built-in login throttle. After `AUTH_LOGIN_MAX_ATTEMPTS` failures inside the tracking window, the account (and originating IP/email combination) is locked for `AUTH_LOGIN_LOCKOUT_SECONDS`. Increase the window to relax sensitivity or raise attempts to tolerate more mistakes.

SECRET_KEY_STRICT_ENFORCEMENT

- Type: boolean ("1"/"0")
- Default: `0`
- Purpose: When enabled, the backend refuses to start with placeholder or short `SECRET_KEY` values even if authentication is disabled. Operators should turn this on for hardened deployments; leave it off only when you intentionally accept the risk (e.g., local debugging). CI and pytest automatically receive a random ephemeral secret when placeholders are detected.

DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD / DEFAULT_ADMIN_FULL_NAME / DEFAULT_ADMIN_FORCE_RESET

- Type: string / string / string / boolean ("1"/"0")
- Default: unset
- Purpose: When both email and password are provided, the application ensures an administrator account exists with those credentials on each startup. `DEFAULT_ADMIN_FULL_NAME` (optional) sets the display name. If `DEFAULT_ADMIN_FORCE_RESET` is truthy, the password is reset and all refresh tokens are revoked on startup.

CSRF_ENABLED

- Type: boolean ("1"/"0")
- Default: `0`
- Purpose: When set to `1`, installs the CSRF middleware that validates tokens on all POST/PUT/PATCH/DELETE requests outside the exempt list. Leave disabled in legacy deployments until the frontend calls `/api/v1/security/csrf` before writes.

CSRF_HEADER_NAME / CSRF_HEADER_TYPE

- Type: string / string (optional)
- Default: `X-CSRF-Token` / unset
- Purpose: Controls the request header inspected by the CSRF middleware. If `CSRF_HEADER_TYPE` is set (e.g. `Token`), clients must send `HeaderName: Token <value>`.

CSRF_COOKIE_NAME / CSRF_COOKIE_PATH / CSRF_COOKIE_DOMAIN / CSRF_COOKIE_SAMESITE / CSRF_COOKIE_SECURE / CSRF_COOKIE_HTTPONLY / CSRF_COOKIE_MAX_AGE

- Types: string / string / string / enum(`lax`,`strict`,`none`) / boolean? / boolean / int
- Defaults: `fastapi-csrf-token` / `/` / unset / `lax` / inherits `COOKIE_SECURE` unless SameSite=None / `True` / `3600`
- Purpose: Configure how the signed CSRF cookie is emitted. Use SameSite=None + Secure for cross-site embedders; otherwise keep Lax.

CSRF_TOKEN_LOCATION / CSRF_TOKEN_KEY

- Type: enum(`header`,`body`) / string
- Default: `header` / `csrf-token`
- Purpose: Determines where the middleware expects the unhashed token. Header mode pairs with SPA usage; body mode supports classic form submissions (token extracted from form field `token_key`).

CSRF_EXEMPT_PATHS

- Type: comma-separated string (wildcards allowed with trailing `*`)
- Default: `/api/v1/security/csrf,/docs,/openapi.json,/redoc`
- Purpose: Paths that skip CSRF validation. Always include `/api/v1/security/csrf` so clients can bootstrap tokens. Wildcards apply to prefixes (e.g. `/docs/*`).

CSRF_ENFORCE_IN_TESTS

- Type: boolean ("1"/"0")
- Default: `0`
- Purpose: When `1`, enables CSRF checks even inside pytest/TestClient contexts. Useful for regression suites once tests send tokens.

DEV_EASE

- Type: boolean ("1"/"0")
- Default: `False`
- Purpose: IMPORTANT — DEV_EASE is now reserved for the pre-commit helper `COMMIT_READY.ps1` only. It must not
  be used to change runtime application behavior (authentication, CSRF or secret enforcement) for the backend
  or frontend. Use it only when running `COMMIT_READY.ps1` locally to opt-in to skipping tests/cleanup or
  enabling AutoFix during a pre-commit run.

Note: CI, pytest and production runs must remain strict — do not enable DEV_EASE in CI or in running services.

SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_FROM

- Type: string / integer / string / string / string
- Default: unset / 587 / unset / unset / unset
- Purpose: Configures SMTP for email notifications. `SMTP_HOST` is required to enable email sending. `SMTP_PORT` defaults to 587 (TLS). `SMTP_USER` and `SMTP_PASSWORD` are required if SMTP server needs authentication. `SMTP_FROM` is the sender email address. When not configured, email notifications are logged but not sent.

SMTP_USE_TLS

- Type: boolean ("1"/"0")
- Default: `1`
- Purpose: When set, initiates STARTTLS on the SMTP connection. Set to `0` for direct TLS connections (port 465) or non-encrypted connections (port 25).

SMTP_ATTACHMENT_MAX_MB

- Type: integer
- Default: `10`
- Purpose: Maximum size (in MB) for report attachments sent via SMTP. Files larger than this limit are omitted and a download note is included instead.

REDIS_ENABLED / REDIS_URL

- Type: boolean ("1"/"0") / string
- Default: `0` / `redis://localhost:6379/0`
- Purpose: When set to `1` and `REDIS_URL` is valid, enables Redis caching and Pub/Sub for real-time notifications in distributed deployments. Leave disabled for single-server deployments.

Notes and recommendations

- In CI and unit tests: set `DISABLE_STARTUP_TASKS=1` to avoid external network calls, background threads and migrations running during TestClient imports.
- In production: enable `ENABLE_CONTROL_API=1` only on instances managed by operators and set a strong `ADMIN_SHUTDOWN_TOKEN`. Avoid enabling `CONTROL_API_ALLOW_TASKKILL` unless you understand and accept the risks.
- For email: Configure SMTP settings before deploying to staging/production. Test with a verified email address first.
- For notifications: Redis is optional but recommended for production deployments with multiple servers.
- Prefer running migrations explicitly in your deployment pipeline (`alembic upgrade head`) rather than relying on automatic startup migrations.
