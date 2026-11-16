# Environment variables (runtime configuration)

This document lists the important environment variables used by the backend and their recommended usage for development, CI and production.

DISABLE_STARTUP_TASKS

- Type: boolean ("1"/"0")
- Default: not set
- Purpose: When set to `1`, the FastAPI lifespan skips everything a real server does at startup: the migrations, the RBAC defaults, the admin bootstrap, the purge of dead refresh tokens, loading the saved SMTP settings, and starting the background schedulers (export cleanup, scheduled reports, course activation, the automatic database backup, the heartbeat to a monitoring service). Intended for tests and CI to avoid startup side-effects; a test run (pytest) gets the same without setting it. Do not set it on a real server: scheduled reports and saved mail settings would not work.

AUTO_BACKUP_ENABLED, AUTO_BACKUP_INTERVAL_HOURS, AUTO_BACKUP_KEEP

- Type: boolean / integer / integer
- Default: `true` / `24` / `30`
- Purpose: The automatic database backup. Every real server checks one minute after its start and then hourly whether its newest automatic backup (`auto_backup_*.enc` in `BACKUPS_DIR/database`) is older than the interval, and makes an encrypted one if so; the newest `AUTO_BACKUP_KEEP` are kept and backups made by hand are never removed. Not done in a test run or with `DISABLE_STARTUP_TASKS`. See `docs/admin/BACKUP_AND_RESTORE.md`.

BACKUP_KEYS_DIR

- Type: path
- Default: empty = `/data/.keys` in Docker (the data volume), next to the code (`src/.keys`) from source; SMS Lite sets it to `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets\backup-keys`
- Purpose: The folder that holds `master.key`, the key every encrypted backup of this installation is made with. It must outlive an update of the application: an encrypted backup opens only with the key it was made with. A key found in the old place (next to the code) is copied over at first use.

MONITOR_PING_URL, MONITOR_FAIL_URL, MONITOR_PING_MINUTES

- Type: URL / URL / integer
- Default: empty / empty / `60`
- Purpose: The "alive and well" signal for a monitoring service outside the server (a dead man's switch such as healthchecks.io). While the server runs, its database answers and its automatic backup is in order, it calls `MONITOR_PING_URL` every `MONITOR_PING_MINUTES` (minimum 5); when the calls stop, the service tells a person. When something is wrong the call is withheld, or, if `MONITOR_FAIL_URL` is set (healthchecks.io: the ping address followed by `/fail`), that address is called with a short fixed phrase, never an error text. Empty = off. The address is a secret of sorts and is not written to the log. See `docs/deployment/CLOUD_HOST_ORACLE.md`, "Watching the server".

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

DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD / DEFAULT_ADMIN_FULL_NAME / DEFAULT_ADMIN_FORCE_RESET / DEFAULT_ADMIN_AUTO_RESET / DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED

- Type: string / string / string / boolean ("1"/"0") / boolean / boolean
- Default: unset (`DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED`: `1`)
- Purpose: When both email and password are provided, startup creates that administrator, but **only in a database with no users yet** (a new install). A database that already has accounts, such as the shared QNAP one, never gets a default admin added, so a public default password cannot open a new admin account there. An existing account is left as an administrator set it (deactivated or demoted stays so); only `DEFAULT_ADMIN_FULL_NAME` is kept in sync.
  - `DEFAULT_ADMIN_FORCE_RESET` (break-glass): creates the account even in a database with users, restores it to an active admin, resets the password and revokes all refresh tokens.
  - `DEFAULT_ADMIN_AUTO_RESET`: restores the account to an active admin, and resets the password when it differs from the configured one.
  - `DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED`: whether a newly created admin must change the password at first login. SMS Lite sets it to `0` when the installer asked the user for the password.

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

SMTP_OVERRIDE_PATH

- Type: string (file path)
- Default: `src/backend/data/smtp_override.json` from source; `/data/smtp_override.json` (the data volume) in Docker; SMS Lite sets it to `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets\smtp_override.json`
- Purpose: Where the SMTP settings saved from Control Panel > Email are read from and written to; they override the `SMTP_*` variables at startup. In Docker the old place (next to the code) was the container's own layer, so settings entered in the application were gone after every update. Nothing is copied into a path set here: a throwaway backend pointed at its own folder starts without mail settings. `RUN_E2E_ISOLATED.ps1` points it into its throwaway run directory, so an E2E run neither sends real mail through the developer's configured relay nor overwrites its saved settings.

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
