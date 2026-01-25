# Environment Configuration Strategy

**Date:** December 9, 2025
**Version:** $11.10.1
**Status:** Phase 2 - Configuration Clarification

---

## Overview

This document clarifies the Student Management System's environment configuration strategy, including:

- Which `.env` files are authoritative
- How configuration is sourced and inherited
- How to set up development and production environments

---

## Environment File Hierarchy

### Authoritative Configuration

```text
Root .env                         ← PRIMARY: Authoritative for all environments
├── Sourced by: DOCKER.ps1 (Docker deployment)
├── Sourced by: NATIVE.ps1 (Native development)
├── Sourced by: Docker container startup
└── Contains: All shared configuration

backend/.env (legacy)             ← IGNORED: For reference only
├── Note: Not used by DOCKER.ps1 or NATIVE.ps1
├── Note: Not needed if root .env is present
└── Recommendation: Remove or keep as documentation

frontend/.env (legacy)            ← IGNORED: For reference only
├── Note: Not used by either deployment mode
└── Recommendation: Remove or keep as documentation

QNAP Variant .env files           ← SPECIALIZED: Deployment-specific
├── .env.qnap: QNAP ARM environment
└── .env.production.example: Production template

```text
### How It Works

1. **Root .env** is the single source of truth
2. **Scripts** (DOCKER.ps1, NATIVE.ps1) read root .env
3. **Docker** mounts root .env into container
4. **Backend/Frontend .env files** are ignored (legacy, kept for reference)

---

## Configuration by Deployment Mode

### Docker Deployment

**Where configuration comes from:**

1. Root `.env` file (read by DOCKER.ps1)
2. Environment variables (passed to container via `-e` flags)
3. `docker-compose.yml` defaults (fallback)

**Example:**

```bash
# DOCKER.ps1 reads:

$env:DATABASE_URL = "sqlite:////data/student_management.db"
$env:SECRET_KEY = "your-secret-key"
$env:AUTH_MODE = "permissive"

# Then passes to container:

docker run -e DATABASE_URL="$env:DATABASE_URL" ... sms-fullstack

```text
### Native Development

**Where configuration comes from:**

1. Root `.env` file (read by NATIVE.ps1)
2. System environment variables
3. backend/backend/config.py defaults (fallback)

**Example:**

```bash
# NATIVE.ps1 reads root .env and loads into PowerShell:

$env:DATABASE_URL = "sqlite:///./data/student_management.db"
$env:SECRET_KEY = "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"

# Then starts backend with these variables set:

$env:DATABASE_URL = "..."
uvicorn backend.main:app --reload

```text
---

## Configuration Files

### `.env` (Active - Root Level)

**Location:** `/.env` (root of repository)
**Purpose:** Authoritative configuration for all environments
**Created from:** `.env.example`
**Deployed to:** Docker container, native processes

**Typical contents:**

```bash
# Database

DATABASE_URL=sqlite:////data/student_management.db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Security

SECRET_KEY=dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345
AUTH_MODE=permissive

# API

VITE_API_URL=/api/v1
ENABLE_AUTO_LOGIN=true

# Monitoring (optional)

ENABLE_METRICS=false
GRAFANA_ENABLED=false

```text
### `.env.example` (Template - Root Level)

**Location:** `/.env.example`
**Purpose:** Template for creating `.env`
**Updated by:** Developers when adding new settings
**Never committed:** `.env` itself (only `.env.example`)

**Should contain:** All possible configuration keys with safe defaults

### `.env.production.example` (Template - Production)

**Location:** `/.env.production.example`
**Purpose:** Template for production deployment
**Used for:** QNAP production instances
**Notes:** Database credentials and secrets must be updated

### `.env.qnap` (QNAP-Specific - Archived)

**Location:** `/`
**Status:** Legacy (can be archived)
**Was for:** QNAP ARM-based deployment
**Current:** Use `.env.production.example` template instead

### `backend/.env` (Legacy - Deprecated)

**Location:** `/backend/.env`
**Status:** Deprecated (kept for reference only)
**Used by:** Old deployment methods (no longer used)
**Current behavior:** Ignored by DOCKER.ps1 and NATIVE.ps1

**Recommendation:**

- Remove this file OR
- Keep with clear deprecation note

### `frontend/.env` (Legacy - Deprecated)

**Location:** `/frontend/.env`
**Status:** Deprecated (kept for reference only)
**Used by:** Old Vite setup (no longer used)
**Current behavior:** Ignored by DOCKER.ps1 and NATIVE.ps1

**Recommendation:**

- Remove this file OR
- Keep with clear deprecation note

---

## Configuration Sourcing Order

### DOCKER.ps1 Script Execution

```powershell
1. Check root .env exists
   └─ If not found: Try .env.example as fallback

2. Load .env into PowerShell environment
   └─ $env:DATABASE_URL = value from .env

3. Pass environment to docker run command
   └─ docker run -e DATABASE_URL="$env:DATABASE_URL" ...

4. Container receives environment variables
   └─ Backend code reads $env:DATABASE_URL

```text
### NATIVE.ps1 Script Execution

```powershell
1. Check root .env exists
   └─ If not found: Show error

2. Load .env into PowerShell environment
   └─ $env:DATABASE_URL = value from .env

3. Start backend with environment
   └─ uvicorn backend.main:app (inherits $env:*)

4. Start frontend with environment
   └─ npm run dev (inherits $env:VITE_*)

```text
---

## Setting Up Your Environment

### First-Time Setup (Developer)

```bash
# 1. Copy template

cp .env.example .env

# 2. Review and update if needed

cat .env

# 3. Deploy

.\SMS.ps1 -Docker -Install           # Or
.\SMS.ps1 -Native -Setup

```text
### First-Time Setup (Production/QNAP)

```bash
# 1. Copy production template

cp .env.production.example .env

# 2. Update with production values

$EDITOR .env
# Update: DATABASE_URL, SECRET_KEY, AUTH_MODE, etc.

# 3. Deploy

.\SMS.ps1 -Docker -Install

```text
### Adding New Configuration

When adding a new environment variable:

1. **Update** `.env.example` with the new key and safe default
2. **Update** `.env.production.example` with production note
3. **Update** `backend/config.py` or `frontend/.env.example` with defaults
4. **Document** in this file's "Available Settings" section
5. **Test** in both Docker and native modes

---

## Available Settings

### Database Configuration

| Key | Default | Purpose |
|-----|---------|---------|
| `DATABASE_URL` | `sqlite:////data/student_management.db` | Primary database connection |
| `POSTGRES_HOST` | `localhost` | PostgreSQL server (if using) |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `student_management` | PostgreSQL database name |
| `POSTGRES_USER` | - | PostgreSQL username |
| `POSTGRES_PASSWORD` | - | PostgreSQL password |
| `ALLOW_EXTERNAL_DB_PATH` | `0` | Allow paths outside project dir |

### Security

| Key | Default | Purpose |
|-----|---------|---------|
| `SECRET_KEY` | `dev-placeholder-...` | JWT signing key (CHANGE for prod) |
| `AUTH_MODE` | `permissive` | `disabled`, `permissive`, `strict` |
| `CSRF_ENABLED` | `1` | Enable CSRF protection |

### API & Frontend

| Key | Default | Purpose |
|-----|---------|---------|
| `VITE_API_URL` | `/api/v1` | API endpoint for frontend |
| `ENABLE_AUTO_LOGIN` | `true` | Auto-login on page load |
| `VITE_ENABLE_AUTO_LOGIN` | - | Override for Vite |

### Logging & Monitoring

| Key | Default | Purpose |
|-----|---------|---------|
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `ENABLE_METRICS` | `false` | Prometheus metrics endpoint |
| `GRAFANA_ENABLED` | `false` | Grafana dashboard |

---

## Migration Notes

### For $11.10.1

**Breaking change:** `backend/.env` and `frontend/.env` are now ignored

**Action required:**

- Verify all configuration is in root `.env`
- Remove old backend/.env and frontend/.env if no longer needed
- Update documentation if you have custom setup

**Benefits:**

- Single source of truth
- Simpler migration to new paths
- Clearer configuration flow

---

## Best Practices

### Development

1. ✅ Use `.env.example` as template
2. ✅ Never commit `.env` (only `.env.example`)
3. ✅ Use safe defaults in `.env.example`
4. ✅ Document all new keys

### Production

1. ✅ Use `.env.production.example` as template
2. ✅ Update SECRET_KEY to random value
3. ✅ Use strong database credentials
4. ✅ Set AUTH_MODE to `strict`
5. ✅ Back up `.env` (it's critical)

### Troubleshooting

**Issue:** Backend can't find database

- **Check:** Is `DATABASE_URL` set in root `.env`?
- **Check:** Is the .env file actually being read?

**Issue:** Environment variable not picked up

- **Check:** Is it in root `.env` or root `.env.example`?
- **Check:** Did you restart the process after changing `.env`?

---

## Deprecation Timeline

- **$11.10.1:** Multiple .env files still work, root is authoritative
- **$11.10.1:** Warnings if backend/.env or frontend/.env exist
- **$11.10.1:** backend/.env and frontend/.env fully removed

---

## See Also

- `DOCKER.ps1` - Reads root .env during Docker deployment
- `NATIVE.ps1` - Reads root .env during native deployment
- `backend/config.py` - Python config loading
- `.env.example` - Template for all environments

