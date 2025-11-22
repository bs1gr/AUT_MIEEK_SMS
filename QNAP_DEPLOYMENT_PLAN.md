# QNAP Deployment Plan

> Version: 1.8.x+  
> Target Platform: QNAP NAS (QTS 5 / QuTS hero) with Container Station 3+  
> Database: PostgreSQL (containerized)  
> Services: postgres, backend (FastAPI), frontend (React + Nginx), optional monitoring (Prometheus + Grafana)

## 1. Objectives

Provide a reproducible, secure, and maintainable deployment of the Student Management System (SMS) on QNAP NAS hardware using Docker/Container Station with:

- Persistent data & backups on QNAP shared folders
- Clear environment configuration via `.env.qnap`
- Optional monitoring stack enabled through compose profiles
- Built‑in rollback and backup strategy

## 2. Components

| Service     | Container Name          | Purpose                              |
|-------------|-------------------------|--------------------------------------|
| PostgreSQL  | `sms-postgres-qnap`     | Relational data store                |
| Backend     | `sms-backend-qnap`      | FastAPI API + business logic         |
| Frontend    | `sms-frontend-qnap`     | React SPA served via Nginx           |
| Prometheus* | `sms-prometheus-qnap`   | Metrics collection (optional)        |
| Grafana*    | `sms-grafana-qnap`      | Metrics visualization (optional)     |

\* Enabled only when using `--profile monitoring`.

## 3. Prerequisites

- QNAP NAS with at least 4GB RAM (8GB recommended for monitoring stack)
- Container Station installed & Docker CLI available
- Free disk space: ≥10GB (database + backups + images)
- Network access to chosen ports (default: 8080 frontend, 5432 internal DB, 9090 Prometheus, 3000 Grafana)

## 4. Directory Layout (Bind Mount Targets)

```text
/share/Container/
├── sms-postgres/        # PostgreSQL data
├── sms-data/            # App runtime data (if used by backend)
├── sms-backups/         # Database backups
├── sms-logs/            # Backend logs
└── sms-monitoring/      # Monitoring data (optional)
    ├── prometheus-data/
    └── grafana-data/
```

Create these before first run:

```bash
mkdir -p /share/Container/{sms-postgres,sms-data,sms-backups,sms-logs,sms-monitoring/prometheus-data,sms-monitoring/grafana-data}
```

## 5. Environment Configuration

Copy template:

```bash
cp .env.qnap.example .env.qnap
vi .env.qnap   # or use the QNAP file editor
```

Critical variables:

- `POSTGRES_PASSWORD` – required
- `SECRET_KEY` – long random string (scripts generate automatically)
- `SMS_PORT` – external HTTP port (default 8080)
- `QNAP_IP` – NAS IP for CORS & Grafana root URL
- `ENABLE_CONTROL_API` – set `1` to allow maintenance endpoints
- `ENABLE_METRICS` – set `1` if enabling Prometheus scrape from backend

## 6. Build & Deploy

### Standard Deployment

```bash
docker compose -f docker-compose.qnap.yml --env-file .env.qnap up -d --build
```

Access application:

```text
http://<QNAP_IP>:8080
```

### Monitoring Profile

```bash
docker compose -f docker-compose.qnap.yml --env-file .env.qnap --profile monitoring up -d --build
```

Prometheus: `http://<QNAP_IP>:9090`  
Grafana: `http://<QNAP_IP>:3000` (default admin/admin unless overridden)

### Status & Logs

```bash
docker compose -f docker-compose.qnap.yml ps
docker compose -f docker-compose.qnap.yml logs -f backend
docker compose -f docker-compose.qnap.yml logs -f postgres
```

## 7. Backup Strategy

Nightly (recommended via cron or QNAP scheduled task):

```bash
docker exec sms-postgres-qnap pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /share/Container/sms-backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

Ad‑hoc backup via management script:

```bash
scripts/qnap/manage-qnap.sh  # choose "Backup database"
```

Retention: Keep last 30 daily backups + all manual upgrade backups.

## 8. Rollback Procedure

1. Identify backup file in `/share/Container/sms-backups/` (e.g., `backup_20251120_120000.sql.gz`).
2. Run rollback script:

```bash
scripts/qnap/rollback-qnap.sh --to-backup /share/Container/sms-backups/backup_20251120_120000.sql.gz
```

3. Script performs safety pre‑backup, stops services, restores DB, restarts services, validates health.

## 9. Update Procedure

1. Create manual backup.
2. Pull latest source / update git branch.
3. Rebuild images:

```bash
docker compose -f docker-compose.qnap.yml --env-file .env.qnap build --no-cache
```

4. Apply updated containers:

```bash
docker compose -f docker-compose.qnap.yml --env-file .env.qnap up -d
```

5. Verify health endpoint:

```bash
curl -fsS http://<QNAP_IP>:8080/health/ready
```

Rollback if any failure (see Section 8).

## 10. Security Hardening

- Use strong `SECRET_KEY` (≥64 random chars)
- Limit exposed ports (only 8080 public; DB internal)
- Set `LOG_LEVEL=INFO` in production
- Disable monitoring if unused to reduce surface
- Restrict NAS firewall to trusted IP ranges
- Regularly prune unused images:

```bash
docker image prune -f
```

## 11. Monitoring & Metrics

Enable backend metrics (`ENABLE_METRICS=1`) to allow Prometheus scraping of `/metrics` inside `backend` container. Dashboards auto‑provisioned in Grafana when profile active.

## 12. Testing & Validation

Post‑deployment checklist:

- `/health` returns 200
- Login & basic CRUD operations succeed
- Session export/import performs dry‑run validation
- Backup file created successfully
- Monitoring dashboards populated (if enabled)

## 13. Disaster Recovery

In case of NAS failure:

1. Restore latest backup directory + data directories to new QNAP
2. Recreate `.env.qnap` (or restore from secure vault)
3. Rebuild & start containers (Section 6)
4. Run rollback script if restoring from SQL dump

## 14. Maintenance Schedule

| Frequency | Task |
|-----------|------|
| Daily     | Automated DB backup, log size check |
| Weekly    | Prune unused images, verify backups integrity |
| Monthly   | Security review of environment variables, update dependencies |
| Quarterly | Full restore test to staging NAS |

## 15. Troubleshooting Quick Reference

| Symptom | Action |
|---------|--------|
| Backend unhealthy | Check backend logs; verify DB reachable; re‑run compose up |
| DB auth errors | Confirm `POSTGRES_PASSWORD` in `.env.qnap` matches container env |
| Port conflict | Change `SMS_PORT` or stop conflicting service |
| Slow performance | Reduce monitoring stack; review NAS resource usage |
| Missing backups | Verify cron job; check permissions on `/share/Container/sms-backups` |

## 16. References

- `docker-compose.qnap.yml`
- `scripts/qnap/install-qnap.sh`
- `scripts/qnap/manage-qnap.sh`
- `scripts/qnap/rollback-qnap.sh`
- `scripts/qnap/README.md`
- `docs/qnap/QNAP_INSTALLATION_GUIDE.md` (if present)

---
**Document Purpose**: Satisfies deployment documentation requirement and serves as master operational reference for QNAP NAS hosting of SMS.
