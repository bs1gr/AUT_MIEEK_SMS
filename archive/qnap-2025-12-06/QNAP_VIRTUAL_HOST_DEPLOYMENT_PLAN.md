# QNAP Virtual Host Deployment Plan
## Student Management System - Virtual Hosting Installation Guide

**Version:** 1.8.5
**Last Updated:** 2025-11-27
**Target Platform:** QNAP NAS with Container Station
**Deployment Method:** Virtual Hosting via QNAP Web Server

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Deployment Options Comparison](#deployment-options-comparison)
5. [Recommended Approach: Hybrid Deployment](#recommended-approach-hybrid-deployment)
6. [Step-by-Step Installation](#step-by-step-installation)
7. [Virtual Host Configuration](#virtual-host-configuration)
8. [Security Considerations](#security-considerations)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Appendices](#appendices)

---

## Executive Summary

This deployment plan outlines how to install the Student Management System (SMS) on a QNAP NAS as a virtual web application using QNAP's virtual hosting capabilities combined with Container Station.

### Key Points

- **Architecture:** React SPA frontend + FastAPI backend + PostgreSQL database
- **Deployment Method:** Hybrid approach using Container Station for backend/database and QNAP Web Server for static frontend hosting
- **Access Method:** Virtual hosting with custom domain (e.g., `sms.yourdomain.com`)
- **Resource Requirements:** Minimum 4GB RAM, 2 CPU cores, 10GB storage
- **Estimated Installation Time:** 30-60 minutes

### Why This Approach?

1. **Better Resource Utilization:** QNAP Web Server serves static files efficiently
2. **Professional URL:** Access via custom domain instead of IP:PORT
3. **SSL Support:** Easy HTTPS setup via QNAP SSL certificate management
4. **Backup Integration:** Native QNAP backup and snapshot support
5. **Flexibility:** Can serve multiple web applications simultaneously

---

## Architecture Overview

### Current Application Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Student Management System                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (React 19.2.0 + Vite 7.2.2)                       │
│  ├─ UI Framework: Radix UI + TailwindCSS                    │
│  ├─ State Management: Zustand + React Query                 │
│  ├─ Routing: React Router DOM 7.9.5                         │
│  └─ i18n: i18next (English/Greek)                           │
│                                                               │
│  Backend (FastAPI 0.121.2)                                   │
│  ├─ Runtime: Python 3.11 + Uvicorn                          │
│  ├─ ORM: SQLAlchemy 2.0.44 + Alembic                        │
│  ├─ Auth: PyJWT + Passlib (bcrypt)                          │
│  ├─ Security: CSRF protection, rate limiting                │
│  └─ Monitoring: Prometheus + metrics                        │
│                                                               │
│  Database (PostgreSQL 16)                                    │
│  └─ Production-ready relational database                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture on QNAP

```
┌────────────────────────────────────────────────────────────────┐
│                         QNAP NAS                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ QNAP Web Server (Port 80/443)                           │  │
│  │ Virtual Host: sms.yourdomain.com                        │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ Static Frontend Files (/Web/sms)                        │  │
│  │ - index.html, JS bundles, CSS, assets                   │  │
│  │ - Reverse proxy /api/* → Container backend              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓ API requests                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Container Station                                        │  │
│  │                                                           │  │
│  │  ┌──────────────────┐     ┌──────────────────┐          │  │
│  │  │ sms-backend      │────→│ sms-postgres     │          │  │
│  │  │ (FastAPI:8000)   │     │ (PostgreSQL:5432)│          │  │
│  │  │ Internal network │     │ Persistent volume│          │  │
│  │  └──────────────────┘     └──────────────────┘          │  │
│  │                                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Persistent Storage                                       │  │
│  │ /share/Container/sms-postgres    - Database files       │  │
│  │ /share/Container/sms-backups     - Automated backups    │  │
│  │ /share/Container/sms-logs        - Application logs     │  │
│  │ /share/Web/sms                   - Frontend static files│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

External Access:
https://sms.yourdomain.com → QNAP Web Server → Frontend + API Proxy → Backend
```

---

## Prerequisites

### QNAP Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores @ 1.5GHz | 4 cores @ 2.0GHz+ |
| **RAM** | 4GB | 8GB+ |
| **Storage** | 10GB available | 50GB+ (for growth) |
| **QTS Version** | 4.5.0+ | 5.0.0+ |
| **Container Station** | Installed | Latest version |

### Software Requirements

1. **QNAP Applications**
   - Container Station (latest version)
   - Web Server (Apache/Nginx via App Center)
   - File Station (for file management)

2. **Network Requirements**
   - Static IP address for QNAP (recommended)
   - Domain name pointing to QNAP WAN IP
   - Router port forwarding (80, 443)
   - Firewall rules configured

3. **External Services**
   - DNS provider (for domain configuration)
   - SSL certificate (Let's Encrypt or commercial)

4. **Development Tools** (for building frontend)
   - Docker (if building images locally)
   - OR pre-built images from Docker Hub/GHCR

### Pre-Installation Checklist

- [ ] QNAP firmware updated to latest stable version
- [ ] Container Station installed and running
- [ ] Web Server enabled in QNAP
- [ ] Domain name configured and pointing to QNAP
- [ ] Port forwarding configured (80, 443)
- [ ] SSH access to QNAP enabled (for CLI operations)
- [ ] Backup of existing data (if any)
- [ ] Admin credentials ready

---

## Deployment Options Comparison

### Option 1: Pure Container Deployment (Current Default)

**How it works:**
All components run in Container Station with port mapping (e.g., port 8080).

**Pros:**
- ✅ Simplest to deploy (single `docker-compose up`)
- ✅ All-in-one containerized stack
- ✅ Easy to update and rollback
- ✅ Included in existing `docker-compose.qnap.yml`

**Cons:**
- ❌ Accessed via `http://qnap-ip:8080` (not professional)
- ❌ Requires port number in URL
- ❌ No easy virtual hosting
- ❌ SSL setup more complex

**Best for:** Testing, development, single-user deployments

---

### Option 2: QNAP Virtual Host + Container Backend (RECOMMENDED)

**How it works:**
Frontend served by QNAP Web Server on port 80/443, backend runs in containers.

**Pros:**
- ✅ Professional URL: `https://sms.yourdomain.com`
- ✅ Native SSL certificate integration
- ✅ Can host multiple apps on same QNAP
- ✅ Better static file serving performance
- ✅ QNAP Web Server handles caching, compression
- ✅ Standard web server features (access logs, etc.)

**Cons:**
- ❌ Slightly more complex initial setup
- ❌ Requires reverse proxy configuration
- ❌ Two-stage deployment (containers + web server)

**Best for:** Production, multi-user, enterprise deployments

---

### Option 3: Full QNAP Native (Without Containers)

**How it works:**
Run Python backend natively on QNAP without Docker.

**Pros:**
- ✅ Lowest resource overhead
- ✅ Direct QNAP integration

**Cons:**
- ❌ Complex dependency management
- ❌ No isolation (conflicts possible)
- ❌ Harder to update/maintain
- ❌ Not officially supported by SMS project
- ❌ Requires Python compilation on QNAP

**Best for:** Advanced users with specific requirements (NOT RECOMMENDED)

---

## Recommended Approach: Hybrid Deployment

We recommend **Option 2** for production deployments. This approach balances professional features, ease of maintenance, and optimal performance.

### Architecture Components

1. **QNAP Web Server** (Port 80/443)
   - Hosts static frontend files
   - Reverse proxy for API calls
   - SSL termination
   - Virtual host configuration

2. **Container Station** (Internal network)
   - Backend FastAPI service
   - PostgreSQL database
   - Isolated from external access

3. **Shared Storage**
   - Bind mounts to QNAP shares
   - Easy backup integration

---

## Step-by-Step Installation

### Phase 1: Prepare QNAP Environment

#### 1.1 Create Directory Structure

SSH into your QNAP and create necessary directories:

```bash
# Connect via SSH
ssh admin@YOUR_QNAP_IP

# Create directory structure
mkdir -p /share/Container/sms-postgres
mkdir -p /share/Container/sms-backups
mkdir -p /share/Container/sms-logs
mkdir -p /share/Web/sms
mkdir -p /share/Container/student-management-system

# Set permissions
chmod -R 755 /share/Web/sms
chmod -R 750 /share/Container/sms-*
```

#### 1.2 Upload Application Files

**Option A: Git Clone (Recommended)**
```bash
cd /share/Container
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git student-management-system
cd student-management-system
git checkout main  # or specific version tag
```

**Option B: Manual Upload**
1. Download repository as ZIP from GitHub
2. Use File Station to upload to `/share/Container/student-management-system`
3. Unzip using QNAP File Station or SSH

#### 1.3 Configure Environment Variables

```bash
cd /share/Container/student-management-system

# Copy example environment file
cp .env.qnap.example .env.qnap

# Edit configuration (use vi, nano, or File Station text editor)
nano .env.qnap
```

**Required changes in `.env.qnap`:**

```bash
# Database password (generate secure password)
POSTGRES_PASSWORD=$(openssl rand -hex 32)

# Secret key (generate secure key)
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")

# QNAP IP address
QNAP_IP=192.168.1.100  # Change to your actual IP

# Port configuration (8000 for internal backend)
SMS_PORT=8000  # Internal port, not exposed externally

# Keep all other defaults or customize as needed
```

Save and close the file.

---

### Phase 2: Deploy Backend Containers

#### 2.1 Start Container Services

```bash
cd /share/Container/student-management-system

# Start backend and database containers
docker compose -f docker/docker-compose.qnap.yml up -d backend postgres

# Check container status
docker compose -f docker/docker-compose.qnap.yml ps

# View logs to ensure successful startup
docker compose -f docker/docker-compose.qnap.yml logs -f backend
```

**Expected output:**
```
✓ Container sms-postgres-qnap   Healthy
✓ Container sms-backend-qnap    Healthy
```

#### 2.2 Verify Backend Health

```bash
# Test backend health endpoint
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "version": "1.8.5"
# }
```

#### 2.3 Initialize Database (First Time Only)

The database will auto-migrate on first startup. Verify:

```bash
# Check backend logs for migration messages
docker compose -f docker/docker-compose.qnap.yml logs backend | grep -i migration

# Create admin user (if not auto-created)
docker exec -it sms-backend-qnap python -m backend.scripts.create_admin
```

---

### Phase 3: Build and Deploy Frontend

#### 3.1 Build Frontend Static Files

**Option A: Build Locally on QNAP (if Node.js is available)**

```bash
cd /share/Container/student-management-system/frontend

# Install dependencies
npm install

# Build production bundle
VITE_API_URL="/api/v1" npm run build

# Copy build output to web directory
cp -r dist/* /share/Web/sms/
```

**Option B: Build on Another Machine and Upload**

On your development machine:
```bash
cd student-management-system/frontend

# Build with correct API URL
VITE_API_URL="/api/v1" npm run build

# The dist/ folder now contains all static files
# Upload contents of dist/ to /share/Web/sms/ on QNAP
```

**Option C: Use Pre-built Docker Image**

```bash
# Extract frontend files from Docker image
docker create --name temp-frontend sms-frontend-qnap:latest
docker cp temp-frontend:/usr/share/nginx/html/. /share/Web/sms/
docker rm temp-frontend
```

#### 3.2 Verify Frontend Files

```bash
# Check that files were copied correctly
ls -la /share/Web/sms/

# Expected files:
# - index.html
# - assets/ (JS and CSS bundles)
# - favicon.ico
# - vite.svg
# - locales/ (i18n files)
```

---

### Phase 4: Configure QNAP Web Server

#### 4.1 Enable Web Server

1. Open QTS web interface: `http://QNAP_IP:8080`
2. Navigate to **Control Panel** → **Applications** → **Web Server**
3. Check **"Enable Web Server"**
4. Check **"Enable secure connection (HTTPS)"** (if using SSL)
5. Click **Apply**

#### 4.2 Create Virtual Host

1. In Web Server settings, go to **Virtual Host** tab
2. Check **"Enable Virtual Host"**
3. Click **"Create a Virtual Host"**
4. Configure:
   - **Host name:** `sms.yourdomain.com` (your actual domain)
   - **Folder name:** `sms` (maps to `/share/Web/sms`)
   - **Protocol:** `HTTP` (or HTTPS if SSL configured)
   - **Port:** `80` (or `443` for HTTPS)
5. Click **Apply**

#### 4.3 Configure Reverse Proxy for API

QNAP Web Server uses Apache by default. We need to configure reverse proxy for `/api/*` requests.

**Method 1: Via QNAP UI (if available)**

Some QNAP models support proxy configuration via UI:
1. In Virtual Host settings, look for **Proxy** or **Rewrite Rules**
2. Add rule: `/api/*` → `http://localhost:8000/api/*`

**Method 2: Manual Apache Configuration (Advanced)**

SSH into QNAP and edit Apache config:

```bash
# Locate Apache config
vi /etc/config/apache/apache.conf

# Add to the <VirtualHost> section for sms.yourdomain.com
```

Add this configuration:

```apache
<VirtualHost *:80>
    ServerName sms.yourdomain.com
    DocumentRoot /share/Web/sms

    # Enable reverse proxy modules
    ProxyPreserveHost On
    ProxyRequests Off

    # Proxy API requests to backend container
    ProxyPass /api http://localhost:8000/api
    ProxyPassReverse /api http://localhost:8000/api

    # Proxy health checks
    ProxyPass /health http://localhost:8000/health
    ProxyPassReverse /health http://localhost:8000/health

    # Proxy docs
    ProxyPass /docs http://localhost:8000/docs
    ProxyPassReverse /docs http://localhost:8000/docs

    # Serve static files directly
    <Directory /share/Web/sms>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # SPA routing - redirect all to index.html
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # Cache static assets
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Don't cache HTML
    <FilesMatch "\.html$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
    </FilesMatch>
</VirtualHost>
```

Restart Apache:
```bash
/etc/init.d/Qthttpd.sh restart
```

#### 4.4 Alternative: Use Nginx as Reverse Proxy Container

If Apache configuration is too complex, deploy an Nginx reverse proxy container:

Create `docker-compose.proxy.yml`:

```yaml
version: '3.8'

services:
  nginx-proxy:
    image: nginx:alpine
    container_name: sms-nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /share/Web/sms:/usr/share/nginx/html:ro
      - ./nginx-virtual-host.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro  # If using SSL
    networks:
      - sms-network
    depends_on:
      - backend

networks:
  sms-network:
    external: true
    name: student-management-system_sms-network
```

Create `nginx-virtual-host.conf`:

```nginx
server {
    listen 80;
    server_name sms.yourdomain.com;

    root /usr/share/nginx/html;
    index index.html;

    # API proxy to backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://backend:8000/health;
    }

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Deploy proxy:
```bash
docker compose -f docker-compose.proxy.yml up -d
```

---

### Phase 5: SSL/HTTPS Configuration (Recommended)

#### 5.1 Option A: QNAP Built-in SSL

1. Navigate to **Control Panel** → **System** → **Security** → **Certificate & Private Key**
2. Click **Import Certificate**
3. Upload your SSL certificate files:
   - Certificate file (.crt or .pem)
   - Private key file (.key)
   - Certificate chain (if applicable)
4. Assign certificate to Web Server
5. Update Virtual Host to use HTTPS (port 443)

#### 5.2 Option B: Let's Encrypt via QNAP

1. In **Certificate & Private Key** settings
2. Click **Add** → **Get a certificate from ACME**
3. Enter domain name: `sms.yourdomain.com`
4. Follow QNAP wizard to complete validation
5. Assign certificate to Web Server

#### 5.3 Update Backend CORS Settings

After enabling HTTPS, update backend environment:

```bash
nano /share/Container/student-management-system/.env.qnap

# Update CORS to include HTTPS
CORS_ORIGINS=https://sms.yourdomain.com,http://sms.yourdomain.com
```

Restart backend:
```bash
docker compose -f docker/docker-compose.qnap.yml restart backend
```

---

### Phase 6: DNS Configuration

#### 6.1 Internal DNS (LAN Access)

For internal network access, add entry to your router's DNS or hosts file:

```
192.168.1.100    sms.yourdomain.com
```

#### 6.2 External DNS (Internet Access)

Configure your domain's DNS records:

1. Log into your DNS provider (Cloudflare, GoDaddy, etc.)
2. Add **A record**:
   - Name: `sms` (or `@` for root domain)
   - Type: `A`
   - Value: Your QNAP's public WAN IP
   - TTL: 3600 (1 hour)

3. Wait for DNS propagation (5 minutes to 48 hours)

#### 6.3 Router Port Forwarding

Configure your router to forward traffic:

| External Port | Internal IP | Internal Port | Protocol |
|---------------|-------------|---------------|----------|
| 80 | 192.168.1.100 | 80 | TCP |
| 443 | 192.168.1.100 | 443 | TCP |

---

### Phase 7: Testing and Validation

#### 7.1 Internal Access Test

```bash
# From QNAP or LAN machine
curl -I http://sms.yourdomain.com

# Expected: 200 OK with HTML response

# Test API endpoint
curl http://sms.yourdomain.com/api/v1/health

# Expected: {"status":"healthy",...}
```

#### 7.2 Browser Test

1. Open browser to `http://sms.yourdomain.com` (or `https://` if SSL configured)
2. Verify:
   - ✅ Frontend loads without errors
   - ✅ Login page displays
   - ✅ No console errors in browser DevTools
   - ✅ API calls succeed (check Network tab)

#### 7.3 Functionality Test

1. **Login Test**
   - Use default admin credentials (check backend docs)
   - Should redirect to dashboard

2. **CRUD Operations**
   - Create a test student
   - Edit student details
   - Delete student
   - All operations should persist

3. **Performance Check**
   - Page load should be < 3 seconds
   - API responses should be < 500ms

---

### Phase 8: Post-Deployment Configuration

#### 8.1 Enable Monitoring (Optional)

```bash
# Start monitoring stack
docker compose -f docker/docker-compose.qnap.yml --profile monitoring up -d

# Access Grafana: http://QNAP_IP:3000
# Access Prometheus: http://QNAP_IP:9090
```

#### 8.2 Configure Backups

Create backup script `/share/Container/backup-sms.sh`:

```bash
#!/bin/bash
# SMS Backup Script for QNAP

BACKUP_DIR="/share/Container/sms-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec sms-postgres-qnap pg_dump -U sms_user student_management | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Backup uploads/data
tar -czf "$BACKUP_DIR/data_backup_$DATE.tar.gz" /share/Container/sms-data

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make executable and add to cron:
```bash
chmod +x /share/Container/backup-sms.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /share/Container/backup-sms.sh
```

#### 8.3 Set Up Log Rotation

Logs are already configured with rotation in docker-compose.qnap.yml:
```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"
```

No additional configuration needed.

---

## Virtual Host Configuration

### Multiple Virtual Hosts Example

You can host multiple applications on the same QNAP:

```
/share/Web/
├── sms/                    # sms.yourdomain.com
│   └── index.html
├── wiki/                   # wiki.yourdomain.com
│   └── index.html
└── files/                  # files.yourdomain.com
    └── index.html
```

Each gets its own virtual host in QNAP Web Server settings.

### Custom Domain Examples

| Use Case | Domain | Backend Port | Notes |
|----------|--------|--------------|-------|
| Production | `sms.company.com` | 8000 | Full SSL, public access |
| Staging | `sms-staging.company.com` | 8001 | Separate backend container |
| Development | `sms-dev.local` | 8002 | Internal only, hosts file |

---

## Security Considerations

### 1. Firewall Rules

**QNAP Firewall Configuration:**
1. Go to **Control Panel** → **Security** → **Security Level**
2. Enable firewall
3. Add rules:
   - Allow: Port 80, 443 (Web)
   - Allow: Port 22 (SSH - from trusted IPs only)
   - Deny: All other ports by default

### 2. Access Control

**Restrict Admin Access:**
```bash
# In .env.qnap, limit CORS to specific domain
CORS_ORIGINS=https://sms.yourdomain.com

# In backend, enable authentication
AUTH_ENABLED=true
CSRF_ENABLED=true
```

### 3. Regular Updates

```bash
# Update containers monthly
cd /share/Container/student-management-system
docker compose -f docker/docker-compose.qnap.yml pull
docker compose -f docker/docker-compose.qnap.yml up -d
```

### 4. Secrets Management

**Never commit secrets to git:**
- `.env.qnap` should be in `.gitignore`
- Use QNAP's encryption for sensitive folders
- Rotate passwords every 90 days

### 5. SSL Best Practices

- Use TLS 1.2+ only
- Enable HSTS headers
- Consider Cloudflare proxy for DDoS protection

---

## Monitoring and Maintenance

### Health Checks

**Automated Health Monitoring:**

Create `/share/Container/health-check.sh`:

```bash
#!/bin/bash
# SMS Health Check Script

# Check backend health
HEALTH=$(curl -s http://localhost:8000/health | jq -r '.status')

if [ "$HEALTH" != "healthy" ]; then
    echo "ALERT: Backend unhealthy at $(date)" | \
    mail -s "SMS Health Alert" admin@yourdomain.com
fi

# Check frontend accessibility
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://sms.yourdomain.com)

if [ "$HTTP_CODE" != "200" ]; then
    echo "ALERT: Frontend returned $HTTP_CODE at $(date)" | \
    mail -s "SMS Frontend Alert" admin@yourdomain.com
fi
```

Add to crontab (every 5 minutes):
```bash
*/5 * * * * /share/Container/health-check.sh
```

### Monitoring Dashboards

Access Grafana dashboards (if monitoring enabled):
- **URL:** `http://QNAP_IP:3000`
- **Default Login:** admin / (password from .env.qnap)

Pre-configured dashboards:
1. System Overview
2. API Performance
3. Database Metrics
4. User Activity

### Log Analysis

**View logs:**
```bash
# Backend logs
docker compose -f docker/docker-compose.qnap.yml logs -f backend

# Database logs
docker compose -f docker/docker-compose.qnap.yml logs -f postgres

# QNAP Web Server logs
tail -f /var/log/httpd/access_log
tail -f /var/log/httpd/error_log
```

### Performance Tuning

**QNAP Resource Allocation:**

1. **Container Station Settings:**
   - Reserve at least 2GB RAM for SMS containers
   - Set CPU priority to "High" for production

2. **PostgreSQL Tuning:**
   Edit `docker-compose.qnap.yml` to add:
   ```yaml
   postgres:
     environment:
       - POSTGRES_SHARED_BUFFERS=256MB
       - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
       - POSTGRES_WORK_MEM=16MB
   ```

3. **Backend Workers:**
   Adjust in `.env.qnap`:
   ```bash
   WORKERS=4  # Increase for high traffic
   ```

---

## Troubleshooting

### Issue 1: Frontend Shows Blank Page

**Symptoms:**
- Browser shows white screen
- Console errors: "Failed to fetch"

**Solutions:**
1. Check frontend files were deployed:
   ```bash
   ls -la /share/Web/sms/
   ```

2. Verify VITE_API_URL was set during build:
   ```bash
   grep -r "api/v1" /share/Web/sms/assets/*.js
   ```

3. Check browser console for CORS errors
4. Verify backend is running:
   ```bash
   curl http://localhost:8000/health
   ```

---

### Issue 2: API Returns 502 Bad Gateway

**Symptoms:**
- API calls fail with 502 error
- `/api/v1/health` returns 502

**Solutions:**
1. Check backend container is running:
   ```bash
   docker ps | grep sms-backend
   ```

2. Check backend logs:
   ```bash
   docker compose -f docker/docker-compose.qnap.yml logs backend
   ```

3. Verify reverse proxy configuration in Apache/Nginx
4. Test backend directly:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

---

### Issue 3: Database Connection Failed

**Symptoms:**
- Backend logs show: "database connection failed"
- Health check returns unhealthy

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Verify credentials in `.env.qnap`:
   ```bash
   grep POSTGRES_PASSWORD /share/Container/student-management-system/.env.qnap
   ```

3. Check database logs:
   ```bash
   docker compose -f docker/docker-compose.qnap.yml logs postgres
   ```

4. Manually test connection:
   ```bash
   docker exec -it sms-postgres-qnap psql -U sms_user -d student_management
   ```

---

### Issue 4: SSL Certificate Errors

**Symptoms:**
- Browser shows "Your connection is not private"
- HTTPS not working

**Solutions:**
1. Verify certificate is valid:
   ```bash
   openssl s_client -connect sms.yourdomain.com:443 -showcerts
   ```

2. Check QNAP certificate assignment
3. Ensure certificate includes full chain
4. Verify domain name matches certificate CN/SAN

---

### Issue 5: Virtual Host Not Accessible

**Symptoms:**
- Domain doesn't resolve
- Shows QNAP default page instead

**Solutions:**
1. Check DNS propagation:
   ```bash
   nslookup sms.yourdomain.com
   dig sms.yourdomain.com
   ```

2. Verify virtual host configuration in QNAP
3. Check Apache virtual host config:
   ```bash
   cat /etc/config/apache/apache.conf | grep -A 20 "sms.yourdomain.com"
   ```

4. Restart web server:
   ```bash
   /etc/init.d/Qthttpd.sh restart
   ```

---

### Issue 6: High Resource Usage

**Symptoms:**
- QNAP becomes slow
- Container Station shows high CPU/RAM

**Solutions:**
1. Check container resource usage:
   ```bash
   docker stats
   ```

2. Review and adjust resource limits in `docker-compose.qnap.yml`
3. Reduce number of backend workers in `.env.qnap`
4. Disable monitoring stack if not needed:
   ```bash
   docker compose -f docker/docker-compose.qnap.yml --profile monitoring down
   ```

---

## Appendices

### Appendix A: Complete File Structure

```
/share/
├── Container/
│   ├── student-management-system/          # Application repository
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── docker/
│   │   │   ├── docker-compose.qnap.yml
│   │   │   ├── Dockerfile.backend.qnap
│   │   │   └── Dockerfile.frontend.qnap
│   │   ├── .env.qnap                       # Configuration (NOT in git)
│   │   └── ...
│   ├── sms-postgres/                       # PostgreSQL data (bind mount)
│   │   └── pgdata/
│   ├── sms-backups/                        # Automated backups
│   │   ├── db_backup_20251127_020000.sql.gz
│   │   └── ...
│   ├── sms-logs/                           # Application logs
│   │   ├── app.log
│   │   └── error.log
│   └── sms-monitoring/                     # Monitoring data (optional)
│       ├── prometheus-data/
│       └── grafana-data/
└── Web/
    └── sms/                                # Frontend static files
        ├── index.html
        ├── assets/
        │   ├── index-ABC123.js
        │   └── index-XYZ789.css
        ├── locales/
        └── favicon.ico
```

### Appendix B: Environment Variables Reference

See [backend/ENV_VARS.md](../../backend/ENV_VARS.md) for complete documentation.

**Critical Variables for QNAP:**

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | Yes | `RandomSecure123!` | Database password |
| `SECRET_KEY` | Yes | `abc123...xyz` | JWT signing key (48+ chars) |
| `QNAP_IP` | Yes | `192.168.1.100` | QNAP local IP |
| `SMS_PORT` | No | `8000` | Internal backend port |
| `CORS_ORIGINS` | Yes | `https://sms.domain.com` | Allowed origins |

### Appendix C: Useful Commands

**Container Management:**
```bash
# View all containers
docker ps -a

# Restart all SMS services
docker compose -f docker/docker-compose.qnap.yml restart

# Update images
docker compose -f docker/docker-compose.qnap.yml pull

# View container logs
docker compose -f docker/docker-compose.qnap.yml logs -f

# Stop all services
docker compose -f docker/docker-compose.qnap.yml down

# Remove all data (CAUTION!)
docker compose -f docker/docker-compose.qnap.yml down -v
```

**Database Operations:**
```bash
# Database backup
docker exec sms-postgres-qnap pg_dump -U sms_user student_management > backup.sql

# Database restore
cat backup.sql | docker exec -i sms-postgres-qnap psql -U sms_user student_management

# Open database shell
docker exec -it sms-postgres-qnap psql -U sms_user -d student_management

# List all tables
docker exec sms-postgres-qnap psql -U sms_user -d student_management -c '\dt'
```

**QNAP Web Server:**
```bash
# Restart web server
/etc/init.d/Qthttpd.sh restart

# Check Apache status
/etc/init.d/Qthttpd.sh status

# View Apache config
cat /etc/config/apache/apache.conf

# Test Apache configuration
apachectl -t
```

### Appendix D: Migration from Port-Based to Virtual Host

If you're currently using port 8080 access and want to migrate to virtual hosting:

1. **Current state:** `http://qnap-ip:8080`
2. **Target state:** `https://sms.yourdomain.com`

**Migration Steps:**

```bash
# 1. Build frontend with new API URL
cd /share/Container/student-management-system/frontend
VITE_API_URL="/api/v1" npm run build

# 2. Deploy to web directory
cp -r dist/* /share/Web/sms/

# 3. Update CORS in backend
nano /share/Container/student-management-system/.env.qnap
# Change: CORS_ORIGINS=https://sms.yourdomain.com

# 4. Restart backend
docker compose -f docker/docker-compose.qnap.yml restart backend

# 5. Stop old frontend container (no longer needed)
docker compose -f docker/docker-compose.qnap.yml stop frontend

# 6. Configure virtual host (see Phase 4)

# 7. Test new URL
curl -I https://sms.yourdomain.com
```

### Appendix E: Security Hardening Checklist

- [ ] Change all default passwords
- [ ] Generate secure `SECRET_KEY` (48+ characters)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure QNAP firewall rules
- [ ] Restrict SSH access to trusted IPs
- [ ] Enable QNAP automatic security updates
- [ ] Set up automated backups (daily minimum)
- [ ] Configure log rotation
- [ ] Enable fail2ban for SSH (if available)
- [ ] Disable QNAP default web interface port exposure
- [ ] Enable database encryption at rest
- [ ] Configure Cloudflare proxy (optional, for DDoS protection)
- [ ] Set up monitoring alerts
- [ ] Document disaster recovery procedures
- [ ] Test backup restoration quarterly

### Appendix F: Performance Benchmarks

**Expected Performance on Typical QNAP (Intel Celeron J4125, 8GB RAM):**

| Metric | Value | Notes |
|--------|-------|-------|
| Frontend Load Time | < 2s | First contentful paint |
| API Response Time | < 300ms | Average |
| Database Query Time | < 50ms | Simple queries |
| Concurrent Users | 20-30 | Before degradation |
| Memory Usage (Total) | ~2GB | All containers |
| CPU Usage (Idle) | < 10% | Background tasks |
| CPU Usage (Active) | 30-50% | During user activity |

### Appendix G: Upgrade Procedure

**When a new version is released:**

```bash
cd /share/Container/student-management-system

# 1. Backup current state
./backup-sms.sh

# 2. Pull latest code
git fetch --tags
git checkout $11.9.7  # Replace with desired version

# 3. Update environment if needed
diff .env.qnap.example .env.qnap
# Manually merge any new required variables

# 4. Rebuild containers
docker compose -f docker/docker-compose.qnap.yml build --no-cache

# 5. Rebuild frontend
cd frontend
npm install
VITE_API_URL="/api/v1" npm run build
cp -r dist/* /share/Web/sms/

# 6. Restart containers
cd ..
docker compose -f docker/docker-compose.qnap.yml up -d

# 7. Verify health
docker compose -f docker/docker-compose.qnap.yml ps
curl http://localhost:8000/health

# 8. Test in browser
# Open https://sms.yourdomain.com and verify functionality
```

### Appendix H: Support and Resources

**Official Documentation:**
- GitHub Repository: https://github.com/bs1gr/AUT_MIEEK_SMS
- Deployment Docs: `/docs/deployment/` in repository
- API Documentation: https://sms.yourdomain.com/docs (after deployment)

**QNAP Resources:**
- QNAP Helpdesk: https://www.qnap.com/en/support
- Container Station Guide: https://www.qnap.com/solution/container_station/
- Virtual Host Tutorial: https://www.qnap.com/en/how-to/tutorial/article/host-multiple-websites-on-qnap-nas-with-virtual-hosting

**Community Support:**
- Submit issues to GitHub repository
- QNAP Community Forum: https://forum.qnap.com/

---

## Conclusion

This deployment plan provides a comprehensive guide to installing the Student Management System on QNAP NAS using virtual hosting. The hybrid approach balances professional features, ease of maintenance, and optimal performance.

**Key Takeaways:**

1. **Backend runs in containers** for isolation and easy updates
2. **Frontend served by QNAP Web Server** for better performance and professional URLs
3. **Virtual hosting** enables multiple applications on same QNAP
4. **SSL/HTTPS** integrated via QNAP's native certificate management
5. **Automated backups** leverage QNAP's backup features

**Next Steps:**

1. Review prerequisites and ensure QNAP meets requirements
2. Follow step-by-step installation (estimated 30-60 minutes)
3. Configure DNS and SSL certificates
4. Set up monitoring and backups
5. Train users and document any customizations

For questions or issues, consult the troubleshooting section or submit an issue to the GitHub repository.

---

**Document Version:** 1.0
**Author:** Claude Code (Anthropic)
**Date:** 2025-11-27
**Based on:** SMS $11.9.7, QNAP QTS 5.x, Container Station
**License:** Same as Student Management System project

