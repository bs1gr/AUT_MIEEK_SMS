# Production Deployment with PostgreSQL

This guide covers deploying the Student Management System with PostgreSQL in production using Docker Compose.

## Quick Start

```bash
# 1. Copy and configure environment

cp .env.production.example .env
# Edit .env and set POSTGRES_PASSWORD and SECRET_KEY

# 2. Start production stack

docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d

# 3. Check health

docker compose ps
docker compose logs -f backend

```text
## Architecture

Production stack includes:

- **PostgreSQL 16** (Alpine) - Primary database with persistence
- **Backend** (FastAPI) - API server with automatic migrations
- **Frontend** (Nginx) - Static React SPA
- **Dedicated network** (sms_network) - Service isolation
- **Persistent volumes** - postgres_data, sms_data

## Configuration

### Required Environment Variables

```bash
# .env file (create from .env.production.example)

POSTGRES_USER=sms_user
POSTGRES_PASSWORD=<strong-random-password-32-chars>
POSTGRES_DB=student_management
SECRET_KEY=<strong-random-key-32-chars>
CORS_ORIGINS=https://yourdomain.com
SMS_ENV=production

```text
 **Security Notes:**

- Use `openssl rand -hex 32` to generate strong secrets
- Never commit `.env` to version control (in `.gitignore`)
- Rotate `SECRET_KEY` and `POSTGRES_PASSWORD` regularly

### Resource Limits

Default production limits:

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| postgres | 1.0 cores | 512M | 0.25 cores | 256M |
| backend | 1.5 cores | 1024M | 0.5 cores | 512M |
| frontend | 0.75 cores | 512M | 0.25 cores | 256M |

Adjust in `docker-compose.prod.yml` based on your workload.

## Database Management

### Initial Setup

The backend automatically runs Alembic migrations on startup via `run_migrations.py` in the FastAPI lifespan context.

### Manual Migration

```bash
# Enter backend container

docker compose exec backend bash

# Check current version

alembic current

# Create new migration

alembic revision --autogenerate -m "description"

# Apply migrations

alembic upgrade head

```text
### Backup Database

```bash
# PostgreSQL backup

docker compose exec postgres pg_dump -U sms_user student_management > backup_$(date +%Y%m%d).sql

# Restore backup

cat backup_20250111.sql | docker compose exec -T postgres psql -U sms_user student_management

```text
### SQLite to PostgreSQL Migration

If migrating from SQLite:

```bash
# 1. Export from SQLite (native mode)

./scripts/BACKUP_AND_CLEAN.ps1

# 2. Convert schema (use tools like pgloader or manual scripts)

# 3. Import data to PostgreSQL
# 4. Verify data integrity

# 5. Update .env to use PostgreSQL DATABASE_URL

```text
## Health Checks

All services have health checks:

```yaml
# PostgreSQL

test: pg_isready -U sms_user
interval: 10s, timeout: 5s, retries: 5

# Backend

test: curl -fsS http://127.0.0.1:8000/health/ready
interval: 10s, timeout: 5s, retries: 3, start_period: 20s

# Frontend (nginx default)

```text
Check health status:

```bash
docker compose ps
# HEALTHY status = all checks passing

```text
## Monitoring

### Logs

```bash
# All services

docker compose logs -f

# Specific service

docker compose logs -f backend
docker compose logs -f postgres

# JSON logs (last 100 lines)

docker compose logs --tail=100 --no-log-prefix backend | jq

```text
Logs are capped (see `docker-compose.prod.yml`):

- Backend: 10MB × 5 files = 50MB max
- Frontend: 5MB × 3 files = 15MB max
- PostgreSQL: 10MB × 3 files = 30MB max

### Health Endpoints

```bash
# Detailed health info (DB, disk, migrations)

curl http://localhost:8080/api/v1/health

# Kubernetes-style probes

curl http://localhost:8080/api/v1/health/ready  # Readiness
curl http://localhost:8080/api/v1/health/live   # Liveness

```text
### Resource Usage

```bash
# Real-time stats

docker stats

# Specific service

docker stats sms-backend-1 sms-postgres-1

```text
## Scaling Considerations

### Horizontal Scaling

Current limitation: SQLite (dev) or single PostgreSQL (prod). For multi-replica backend:

1. **Database:** PostgreSQL is multi-connection ready
2. **Backend replicas:**

   ```yaml
   backend:
     deploy:
       replicas: 3
   ```

3. **Load balancer:** Add nginx upstream or use Kubernetes
4. **Sessions:** Backend is stateless (JWT tokens)

### Vertical Scaling

Increase resources in `docker-compose.prod.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: "2.0"
        memory: 2048M

```text
## Troubleshooting

### Backend won't start

```bash
# Check logs

docker compose logs backend

# Common issues:

# - DATABASE_URL incorrect
# - PostgreSQL not healthy (check: docker compose ps)

# - Migration failure (check: docker compose logs backend | grep alembic)

```text
### PostgreSQL connection refused

```bash
# Verify PostgreSQL is running

docker compose ps postgres

# Check health

docker compose exec postgres pg_isready -U sms_user

# Verify network

docker network ls | grep sms
docker network inspect sms_network

```text
### Disk space issues

```bash
# Check volume usage

docker system df -v

# Prune unused data

docker system prune -a --volumes  # WARNING: destructive

# Backup before pruning

docker compose exec postgres pg_dump ... > backup.sql

```text
## Security Hardening

Production checklist:

- [x] Strong random `SECRET_KEY` (32+ chars)
- [x] Strong random `POSTGRES_PASSWORD` (32+ chars)
- [x] Restrict `CORS_ORIGINS` to production domains only
- [ ] Use Docker secrets (instead of env vars for sensitive data)
- [ ] Enable HTTPS (add nginx SSL termination)
- [ ] Set up firewall rules (only expose 8080/443)
- [ ] Regular security audits (`pip-audit`, `npm audit` in CI)
- [ ] Database backups (automated daily)
- [ ] Log rotation configured (see `docker-compose.prod.yml`)
- [ ] Resource limits prevent DoS (CPU/memory caps)
- [ ] PostgreSQL not exposed to host (only internal network)

## CI/CD Integration

The project includes GitHub Actions workflows:

- `ci.yml` - Tests + security scans on PR/push
- `docker-publish.yml` - Build/push images on tag

Deploy workflow example:

```yaml
# .github/workflows/deploy-production.yml

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production

        run: |
          ssh user@prod-server "
            cd /app/student-management-system &&
            git pull origin main &&
            docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
          "

```text
## Support

For issues:

- Check `docs/deployment/RUNBOOK.md` for operational procedures
- Review `docs/TROUBLESHOOTING.md` for common problems
- Check `CHANGELOG.md` for version-specific notes
- GitHub Issues: [repository issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues)

## License

Copyright (c) 2025 - See LICENSE file
