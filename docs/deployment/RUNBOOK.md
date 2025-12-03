# Deployment Runbook

**Status**: Draft (Initial Skeleton)
**Last Updated**: 2025-11-16
**Applies To**: $11.9.7+

This runbook provides a concise, operational sequence for deploying, verifying, and rolling back the Student Management System (SMS).

---

## 1. Preconditions

| Item | Action | Notes |
|------|--------|-------|
| Secrets | Verify `.env` values (SECRET_KEY, DB paths) | Use strong 48+ char SECRET_KEY |
| Images | Confirm latest build tagged (`sms-fullstack:<version>`) | `docker images sms-fullstack` |
| Backup | Ensure last backup <24h old | `backups/` folder timestamp |
| Volume | Check active volume name (`sms_data`) | `docker volume ls` |
| Version | Confirm target version in `VERSION` file | Matches CHANGELOG entry |

---

## 2. Standard Deployment (Fullstack Docker)

1. Pull or fetch latest code/tag.
2. Review `CHANGELOG.md` for breaking changes.
3. Run:

```powershell
./DOCKER.ps1 -Update
```

4. Wait for success message and access URL.
5. Confirm health:
   - `GET /health` returns status OK
   - `GET /health/ready` returns ready
6. Open application: <http://localhost:8080>
7. Validate critical flows (login, list students, grades view).

---

## 3. Verification Checklist

| Check | Endpoint/Action | Pass Condition |
|-------|-----------------|----------------|
| Health | `/health` | status: healthy |
| DB Migrations | Logs on startup | "Alembic upgrade complete" present |
| Static Assets | Load frontend SPA | No 404 for main bundle |
| API Auth | Login flow (if enabled) | Token issued, no 500 |
| Rate Limiting | Hit same GET endpoint >60/min | 429 after threshold |
| Caching | Repeat GET | Response time improves (observational) |

---

## 4. Rollback Procedure

Scenario: New release causes runtime errors or critical regression.

1. Stop stack:

```powershell
./DOCKER.ps1 -Stop
```

2. Checkout previous stable tag (e.g. `git checkout $11.9.7`).
3. Re-run deployment:

```powershell
./DOCKER.ps1 -Start
```

4. If DB schema changed incompatibly and migration rollback required:
   - Identify last migration ID: `alembic current`
   - Downgrade step-by-step or restore backup DB file from `backups/`.
5. Validate health endpoints and core flows again.

---

## 5. Emergency Recovery

| Failure Type | Symptom | Action |
|--------------|---------|--------|
| Container crash loop | `docker ps` shows restarts | `docker logs sms-fullstack` → identify error; rollback tag |
| DB corruption | 500 on all data endpoints | Stop → restore last backup → restart |
| Secret mismatch | Auth failures / invalid signature | Regenerate SECRET_KEY (if rotated incorrectly) and restart |
| Migration failure | Alembic traceback | Manual `alembic upgrade head` in container shell |

---

## 6. Monitoring & Observability

| Source | Method | Notes |
|--------|--------|-------|
| Health | `/health`, `/health/ready`, `/health/live` | Ready vs liveness separation |
| Logs | `DOCKER.ps1 -Logs` or `docker logs sms-app` | Rotating backend logs at `backend/logs/` |
| Performance | Slow-query log | Enabled via performance monitor module |

---

## 7. Secrets & Key Rotation (Preview)

When enabling strict SECRET_KEY enforcement:

1. Generate new key:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

2. Update `.env` or Docker secret store.
3. Restart container.
4. Invalidate existing auth tokens (communicate to users).

---

## 8. Post-Deployment Tasks

| Task | Owner | When |
|------|-------|------|
| Tag release & publish notes | Maintainer | After verification |
| Archive prior releases (≤ threshold) | Ops | Weekly batch or on major release |
| Dependency audit (`pip-audit`, `npm audit`) | CI | Automatic |

---

## 9. Future Enhancements (TODO)

- Add automated rollback script.
- Integrate Prometheus metrics ingestion guide.
- Document blue/green or canary strategies.

---

## 10. References

- Main Guide: `DEPLOYMENT_GUIDE.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
- Asset Inventory: `docs/DEPLOYMENT_ASSET_TRACKER.md`
- Index: `docs/DOCUMENTATION_INDEX.md`

---
**Maintain this file:** Update "Last Updated" and verification steps whenever deployment tooling changes.

