# Refresh token design and API (server-side persisted refresh tokens)

This document describes the refresh token behavior implemented in the backend.

Overview

- Access tokens: short-lived JWTs (stateless). Use for API authorization (Authorization: Bearer <jwt>).
- Refresh tokens: long-lived, single-use tokens stored server-side (rotating). Used to obtain new access tokens without re-authenticating.

Endpoints

- POST /api/v1/auth/refresh
  - Request: { "refresh_token": "<token>" }
  - Response: { "access_token": "<jwt>", "refresh_token": "<new-refresh-token>" }
  - Behavior: verifies presented refresh token, checks expiry & revoked flag, then issues a new access token and a new refresh token. The presented refresh token is revoked (rotation).

- POST /api/v1/auth/logout
  - Request: { "refresh_token": "<token>" }
  - Response: 200/204
  - Behavior: revokes the presented refresh token server-side so it cannot be used again.

Storage & Security

- Refresh tokens are stored in the database hashed (sha256) together with a unique jti and expires_at timestamp.
- Only the hashed token is persisted; the raw token is returned to the client once when created.
- Rotation and revocation policy prevents reuse of previously issued refresh tokens.

Migration notes

- A canonical Alembic migration was added to create the `refresh_tokens` table. A merge revision was created to reconcile this with earlier manual migrations; the original manual migration has been archived.

Operational notes

- Tests and the migration runner are hardened to tolerate repeated runs (idempotent guards) to avoid "table already exists" errors during local or CI test runs.
- For production, ensure the database is migrated to the latest revision before deploying (alembic upgrade head).

Examples

- Example refresh request:

  POST /api/v1/auth/refresh
  {
    "refresh_token": "eyJhbGciOiJI..."
  }

  Response:
  {
    "access_token": "eyJhbGciOiJI...",
    "refresh_token": "rt_<new>..."
  }

See also: `backend/routers/routers_auth.py`, `backend/models.py` and `backend/migrations/versions/` for implementation details.
