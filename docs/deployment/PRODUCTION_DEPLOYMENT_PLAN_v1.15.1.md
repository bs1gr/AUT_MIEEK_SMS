# Production Deployment Plan – $11.18.3 (SMS)

**Audience**: Ops / Release Manager
**Duration**: ~45-60 minutes (excluding post-deploy monitoring)
**Target**: Production Docker deployment of SMS $11.18.3

---

## 0) Prerequisites

- ✅ Git up to date: `main` pulled, commit `fca3b2e55` or later
- ✅ Production host access with Docker 29.x+
- ✅ `.env` (prod) prepared with strong secrets (see checklist below)
- ✅ Database ready (PostgreSQL strongly recommended; SQLite discouraged for prod)
- ✅ Backups location writable (volume or host path)
- ✅ Maintenance window + comms approved

### Production .env (minimum)

- `SECRET_KEY` (strong 64+ char)
- `AUTH_ENABLED=True`
- `AUTH_MODE=permissive` or `strict` (recommended: `strict`)
- `DATABASE_URL` (PostgreSQL URL) or `POSTGRES_*` variables
- `CORS_ORIGINS=https://<prod-domain>`
- `DEFAULT_ADMIN_EMAIL` (ops mailbox)
- `DEFAULT_ADMIN_PASSWORD` (temp strong pwd; change post-deploy)
- `ENABLE_CONTROL_API=0` (enable only if needed for ops)

### Backup

- Ensure latest DB backup exists before deploy.
- For SQLite hosts: copy `data/student_management.db` to a dated `.bak`.
- For Postgres: take a snapshot/pg_dump prior to deploy.

---

## 1) Pre-flight Checks (10-15 min)

1. `docker --version` (host) and disk space ≥ 2 GB free
2. Ports free: `8080` (or mapped prod port) – `netstat -ano | findstr :8080`
3. Pull latest code: `git pull origin main`
4. Verify `.env` (prod) present and correct
5. Verify backups exist and are recent

---

## 2) Deploy (15-20 min)

1. From repo root on prod host: `./DOCKER.ps1 -Update`
   - Builds/pulls image, restarts container with current code/env

2. Wait for startup completion (script reports healthy/ready)

---

## 3) Validate (10-15 min)

- Health: `curl http://<host>:8080/health/ready` → 200 OK
- Home page: `GET /` → 200
- Auth: login with admin bootstrap creds; confirm JWT issued
- API spot checks (with token):
  - `GET /api/v1/students` → 200
  - `GET /api/v1/courses` → 200
- Logs: `docker logs sms-app --tail 100` → no errors

---

## 4) Rollback (if needed)

- Stop: `./DOCKER.ps1 -Stop`
- Restore backup: replace DB from pre-deploy snapshot
- Re-run previous stable version (if tagged image available) or rerun `./DOCKER.ps1 -Start` with prior code checkout

---

## 5) Post-Deploy Monitoring (30-60 min, then periodic)

- Tail logs: `docker logs sms-app --tail 100`
- Health: `curl /health` and `/health/ready`
- Metrics (if enabled): `/metrics`
- Resource check: `docker stats sms-app --no-stream`
- Watch for auth errors, DB connection issues, slow queries

---

## 6) Close-out

- Change default admin password immediately (Control Panel → Maintenance → Change Password)
- Document deployment time, version, and any anomalies
- Hand over to support with status and links

---

## Quick Checklist (printable)

- [ ] Code pulled from `main` @ `fca3b2e55`+
- [ ] Prod `.env` validated (secrets, DB, CORS, auth mode)
- [ ] Backup taken
- [ ] Ports/disk OK
- [ ] Deploy: `./DOCKER.ps1 -Update`
- [ ] Health/ready 200
- [ ] API spot checks OK
- [ ] Logs clean
- [ ] Post-deploy monitoring done
- [ ] Admin password rotated
- [ ] Deployment recorded
