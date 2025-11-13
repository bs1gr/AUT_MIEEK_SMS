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

DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD / DEFAULT_ADMIN_FULL_NAME / DEFAULT_ADMIN_FORCE_RESET

- Type: string / string / string / boolean ("1"/"0")
- Default: unset
- Purpose: When both email and password are provided, the application ensures an administrator account exists with those credentials on each startup. `DEFAULT_ADMIN_FULL_NAME` (optional) sets the display name. If `DEFAULT_ADMIN_FORCE_RESET` is truthy, the password is reset and all refresh tokens are revoked on startup.

Notes and recommendations

- In CI and unit tests: set `DISABLE_STARTUP_TASKS=1` to avoid external network calls, background threads and migrations running during TestClient imports.
- In production: enable `ENABLE_CONTROL_API=1` only on instances managed by operators and set a strong `ADMIN_SHUTDOWN_TOKEN`. Avoid enabling `CONTROL_API_ALLOW_TASKKILL` unless you understand and accept the risks.
- Prefer running migrations explicitly in your deployment pipeline (`alembic upgrade head`) rather than relying on automatic startup migrations.
