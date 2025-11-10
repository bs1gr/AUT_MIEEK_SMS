Control API: secure shutdown endpoints
=====================================

This PR contains changes to harden and document the application's control (shutdown) endpoints.

What changed
------------
- Added `backend/control_auth.py` dependency to centralize control endpoint authorization.
- Wired the dependency into existing control endpoints in `backend/main.py` (requires `ENABLE_CONTROL_API=1`).
- Added rate-limit decorators to control endpoints using the existing `RATE_LIMIT_WRITE` quota and provided a noop-limiter fallback so imports are safe in environments without the limiter.
- Added audit logging for control endpoint authorization decisions.
- Added `backend/CONTROL_API.md` with operational notes and examples.
- Tests opt in to the control API via `backend/tests/conftest.py` (no implicit test bypass).

Security model
--------------
- Default: control endpoints hidden (need `ENABLE_CONTROL_API=1`).
- If `ADMIN_SHUTDOWN_TOKEN` is set, remote callers must provide `X-ADMIN-TOKEN` matching the token (constant-time compare).
- If `ADMIN_SHUTDOWN_TOKEN` is not set, only loopback requests are allowed.
- `ALLOW_REMOTE_SHUTDOWN=1` allows non-loopback addresses, but only when a token is set.

Notes for reviewers
-------------------
- I lowered noisy diagnostic logs in `backend/control_auth.py` to DEBUG so CI logs are less verbose. Audit logs for grants/rejections remain at INFO/WARNING.
- Tests were adjusted to explicitly enable the control API during test runs. See `backend/tests/conftest.py`.
- Small follow-ups recommended: rotate debug->INFO changes if you want stricter runtime audit, and consider integrating `create_control_dependency` with the real auth system to allow logged-in admin users to use the control endpoints.

How I validated
--------------
- Ran backend test suite: `cd backend && pytest -q` — tests passed locally.
- Exercised control endpoint tests that previously failed; updated test fixture to opt-in.
