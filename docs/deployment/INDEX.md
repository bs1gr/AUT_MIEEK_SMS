# Deployment & Operations Documentation

Documentation for deploying and operating the Student Management System in production.

## 🚀 Deployment

### Runbook

- **[RUNBOOK.md](RUNBOOK.md)** - Complete deployment procedures
  - Pre-deployment checklist
  - Deployment steps
  - Rollback procedures
  - Health check validation

### Deployment Guides

- **[../../DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md)** - Full deployment guide
  - Docker deployment
  - Native deployment
  - Environment configuration
  - Database setup

- **[../../DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md)** - Deployment verification
  - Pre-deployment checks
  - Post-deployment validation
  - Smoke tests

### Docker Operations

- **[DOCKER_OPERATIONS.md](DOCKER_OPERATIONS.md)** - Docker commands & management
  - Building images
  - Running containers
  - Docker Compose operations
  - Volume management
  - Network configuration

- **[../DOCKER_NAMING_CONVENTIONS.md](../DOCKER_NAMING_CONVENTIONS.md)** - Docker naming standards
- **[../DOCKER_CLEANUP.md](../DOCKER_CLEANUP.md)** - Docker cleanup procedures

## 🔧 Troubleshooting

### Common Issues

- **[../FRESH_DEPLOYMENT_TROUBLESHOOTING.md](../FRESH_DEPLOYMENT_TROUBLESHOOTING.md)** - Fresh deployment issues
  - Database initialization errors
  - Port conflicts
  - Permission issues
  - CORS configuration

- **[../REBUILD_TROUBLESHOOTING.md](../REBUILD_TROUBLESHOOTING.md)** - Rebuild & migration issues
  - Alembic migration conflicts
  - Database schema mismatches
  - Docker build failures

### Emergency Procedures

- **[../OPERATOR_EMERGENCY_GUIDE.md](../OPERATOR_EMERGENCY_GUIDE.md)** - Emergency response guide
  - Service down procedures
  - Database recovery
  - Backup restoration
  - Emergency contacts

## 📊 Monitoring & Maintenance

### Health Checks

Available endpoints for monitoring:

```bash
# Detailed health status
GET /health

# Kubernetes readiness probe
GET /health/ready

# Kubernetes liveness probe
GET /health/live
```

### Logging

- **Application Logs**: `backend/logs/app.log` (native) or container logs (Docker)
- **Structured Logs**: `backend/logs/structured.json`
- **Access Logs**: Uvicorn logs

View logs:

```bash
# Docker
docker logs sms-fullstack

# Native
tail -f backend/logs/app.log
```

### Performance Monitoring

- Response cache hit rates
- Slow query logging (>300ms)
- Database connection pool stats
- Request ID tracing

## 🔄 Updates & Upgrades

### Rolling Updates

```bash
# Pull latest changes
git pull origin main

# Fast update with backup
.\DOCKER.ps1 -Update

# Or clean rebuild (no cache)
.\DOCKER.ps1 -UpdateClean

# Or manual Docker rebuild
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

### Database Migrations

```bash
cd backend

# Check current version
alembic current

# Apply pending migrations
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

### Backup & Restore

```bash
# Backup database
.\scripts\ops\backup-database.ps1

# Restore database
.\scripts\ops\restore-database.ps1 -BackupFile path\to\backup.db
```

## 🐳 Docker Deployment

### Production Setup

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Environment Variables

Key production environment variables (set in `.env`):

```env
# Core settings
SMS_ENV=production
SMS_EXECUTION_MODE=docker

# Security (REQUIRED)
SECRET_KEY=<strong-random-key-48-chars-minimum>
SECRET_KEY_STRICT_ENFORCEMENT=true

# Authentication
AUTH_ENABLED=true

# CSRF Protection
CSRF_ENABLED=true
COOKIE_SECURE=true

# CORS
CORS_ORIGINS=https://yourdomain.com

# Database
DATABASE_URL=sqlite:////data/student_management.db
```

## 📦 Release Management

- **[../releases/](../releases/)** - Version-specific release notes
- **Asset Tracking**: [../DEPLOYMENT_ASSET_TRACKER.md](../DEPLOYMENT_ASSET_TRACKER.md)

## 🔒 Security Operations

### SSL/TLS Configuration

Configure reverse proxy (nginx/Caddy) for HTTPS:

- Certificate management
- HTTP to HTTPS redirect
- Security headers

### Secrets Management

- Store `SECRET_KEY` securely (environment variables, secrets manager)
- Rotate JWT keys periodically
- Use strong passwords for admin accounts
- Enable CSRF protection in production

### Firewall & Network

- Restrict database port access
- Allow only necessary ports (80/443, management)
- Use internal networks for service communication

## 📱 Control Panel

Access the web-based control panel:

- **URL**: `http://localhost:8080/control`
- **Features**: Start/stop services, view status, check logs
- **Limitation**: Cannot stop Docker from inside container (use host commands)

## 🎯 Quick Reference

### Start Services

```bash
# Docker (recommended)
.\DOCKER.ps1 -Start

# Native development
.\NATIVE.ps1 -Start
```

### Stop Services

```bash
# Docker stop
.\DOCKER.ps1 -Stop

# Native stop
.\NATIVE.ps1 -Stop

# Docker compose directly
docker compose -f docker/docker-compose.yml down
```

### Check Status

```bash
# Docker status
.\DOCKER.ps1 -Status

# Native status
.\NATIVE.ps1 -Status

# Docker compose
docker compose -f docker/docker-compose.yml ps

# Health check
curl http://localhost:8080/health
```

## 🆘 Getting Help

- Review troubleshooting guides above
- Check [GitHub Issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues)
- Contact system administrator
- Emergency guide: [../OPERATOR_EMERGENCY_GUIDE.md](../OPERATOR_EMERGENCY_GUIDE.md)
