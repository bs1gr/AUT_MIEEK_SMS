# QNAP Installation Guide

## Student Management System

Complete guide for deploying the Student Management System on QNAP NAS using Container Station.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Installation Methods](#installation-methods)
4. [Quick Installation (Recommended)](#quick-installation-recommended)
5. [Manual Installation](#manual-installation)
6. [Post-Installation Steps](#post-installation-steps)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### QNAP Requirements

- **QTS Version**: 5.0+ or QuTS hero h5.0+
- **Container Station**: Version 3.0 or higher
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB free space in `/share/Container/`
- **CPU**: Multi-core processor (Intel/AMD x86_64)

### Software Requirements

- **Docker**: Installed via Container Station
- **Docker Compose**: Version 2.0+ (included with Container Station)
- **SSH Access**: Enabled for script execution
- **Network**: Static IP address recommended

### Port Requirements

The following ports must be available:

| Port | Service | Required |
|------|---------|----------|
| 8080 | Frontend (configurable) | Yes |
| 3000 | Grafana (optional) | No |
| 9090 | Prometheus (optional) | No |

**Internal ports** (not exposed):

- 5432: PostgreSQL (container-internal only)
- 8000: Backend API (accessed via Nginx reverse proxy)

---

## Pre-Installation Checklist

Before starting installation, verify:

- [ ] QNAP NAS is accessible via SSH
- [ ] Container Station is installed and running
- [ ] Port 8080 (or alternative) is not in use
- [ ] At least 10GB free space in `/share/Container/`
- [ ] Static IP address configured (recommended)
- [ ] Firewall rules allow access to chosen ports
- [ ] Admin credentials ready for initial setup

### Checking Port Availability

```bash
# SSH into your QNAP and check if port 8080 is in use
netstat -tuln | grep 8080

# If output is empty, port is available
# If output shows a service, choose a different port
```

### Checking Available Space

```bash
# Check available space in Container directory
df -h /share/Container/
```

---

## Installation Methods

### Method 1: Automated Installation Script (Recommended)

The automated installation script handles:

- Pre-flight environment checks
- Directory structure creation
- Secret generation
- Docker image building
- Container deployment
- Health verification

**Best for**: Most users, production deployments

### Method 2: Manual Installation

Step-by-step manual deployment using Docker Compose commands.

**Best for**: Advanced users, custom configurations, troubleshooting

---

## Quick Installation (Recommended)

### Step 1: Download Installation Files

```bash
# SSH into your QNAP NAS
ssh admin@YOUR_QNAP_IP

# Create installation directory
mkdir -p /share/Container/sms-installer
cd /share/Container/sms-installer

# Download or copy the following files to this directory:
# - docker-compose.qnap.yml
# - .env.qnap.example
# - scripts/qnap/install-qnap.sh
# - docker/Dockerfile.backend.qnap
# - docker/Dockerfile.frontend.qnap
# - docker/nginx.qnap.conf
```

**Option A: Using Git (if available)**

```bash
git clone https://github.com/YOUR_USERNAME/student-management-system.git
cd student-management-system
git checkout feature/qnap-deployment  # Or main after merge
```

**Option B: Using File Station**

1. Download the project ZIP from GitHub
2. Upload to QNAP via File Station
3. Extract to `/share/Container/sms-installer/`

### Step 2: Configure Environment

```bash
# Copy environment template
cd /share/Container/sms-installer
cp .env.qnap.example .env.qnap

# Edit configuration
nano .env.qnap  # or use vim/vi
```

**Required configurations**:

```bash
# Database credentials
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=<GENERATE_SECURE_PASSWORD>
POSTGRES_DB=student_management

# Application secret (generate with command below)
SECRET_KEY=<GENERATE_SECURE_KEY>

# QNAP network settings
QNAP_IP=192.168.1.100  # Your QNAP's IP address
SMS_PORT=8080          # Or alternative if 8080 is in use
```

**Generate secure secrets**:

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# Generate POSTGRES_PASSWORD
openssl rand -hex 32

# Update .env.qnap with generated values
```

### Step 3: Run Installation Script

```bash
# Make script executable
chmod +x scripts/qnap/install-qnap.sh

# Dry-run mode (recommended first time)
./scripts/qnap/install-qnap.sh --dry-run

# Review dry-run output, then proceed with actual installation
./scripts/qnap/install-qnap.sh
```

**Installation script performs**:

1. ✅ Validates QNAP environment
2. ✅ Checks Docker and Compose versions
3. ✅ Verifies available resources (RAM, disk)
4. ✅ Checks port availability
5. ✅ Creates directory structure
6. ✅ Validates configuration file
7. ✅ Builds Docker images
8. ✅ Deploys services
9. ✅ Waits for health checks
10. ✅ Displays access information

### Step 4: Verify Installation

The script will display access URLs:

```text
✅ Installation complete!

Access URLs:
  Frontend: http://192.168.1.100:8080
  Health Check: http://192.168.1.100:8080/health
  Control Panel: http://192.168.1.100:8080/control (admin only)

Container Status:
  ✅ sms-postgres: healthy
  ✅ sms-backend: healthy
  ✅ sms-frontend: healthy

Next Steps:
  1. Access the application at http://192.168.1.100:8080
  2. Create admin account (first user is auto-admin)
  3. Configure application settings
  4. Set up regular backups (see manage-qnap.sh)
```

**Test the installation**:

```bash
# Check container status
docker compose -f docker-compose.qnap.yml ps

# Check logs
docker compose -f docker-compose.qnap.yml logs -f

# Test health endpoint
curl http://localhost:8080/health
```

---

## Manual Installation

For advanced users who prefer manual control over the deployment process.

### Step 1: Prepare Directory Structure

```bash
# SSH into QNAP
ssh admin@YOUR_QNAP_IP

# Create directory structure
mkdir -p /share/Container/sms-postgres
mkdir -p /share/Container/sms-backups
mkdir -p /share/Container/sms-logs
mkdir -p /share/Container/sms-monitoring

# Set permissions
chmod -R 755 /share/Container/sms-*
```

### Step 2: Prepare Configuration Files

```bash
# Create project directory
mkdir -p /share/Container/sms-app
cd /share/Container/sms-app

# Create docker directory for Dockerfiles
mkdir -p docker

# Copy or create the following files:
# - docker-compose.qnap.yml (root directory)
# - .env.qnap (root directory)
# - docker/Dockerfile.backend.qnap
# - docker/Dockerfile.frontend.qnap
# - docker/nginx.qnap.conf
```

### Step 3: Configure Environment Variables

```bash
# Create .env.qnap from template
cat > .env.qnap << 'EOF'
# Database Configuration
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=<YOUR_SECURE_PASSWORD>
POSTGRES_DB=student_management

# Application Security
SECRET_KEY=<YOUR_SECURE_KEY>
SECRET_KEY_STRICT_ENFORCEMENT=1

# QNAP Network Configuration
QNAP_IP=<YOUR_QNAP_IP>
SMS_PORT=8080

# QNAP Directory Paths
QNAP_DATA_PATH=/share/Container/sms-postgres
QNAP_BACKUP_PATH=/share/Container/sms-backups
QNAP_LOG_PATH=/share/Container/sms-logs
QNAP_MONITORING_PATH=/share/Container/sms-monitoring

# Application Configuration
SMS_ENV=production
SMS_EXECUTION_MODE=docker
QNAP_DEPLOYMENT=1
LOG_LEVEL=INFO
ENABLE_CONTROL_API=1
EOF

# Edit with your actual values
nano .env.qnap
```

### Step 4: Validate Configuration

```bash
# Validate docker-compose.qnap.yml syntax
docker compose -f docker-compose.qnap.yml --env-file .env.qnap config --quiet

# If no errors, configuration is valid
```

### Step 5: Build Images

```bash
# Build backend image
docker compose -f docker-compose.qnap.yml build backend

# Build frontend image
docker compose -f docker-compose.qnap.yml build frontend

# Verify images
docker images | grep sms
```

### Step 6: Deploy Services

```bash
# Start PostgreSQL first
docker compose -f docker-compose.qnap.yml up -d postgres

# Wait for PostgreSQL to be healthy (30-60 seconds)
docker compose -f docker-compose.qnap.yml ps postgres

# Start backend
docker compose -f docker-compose.qnap.yml up -d backend

# Wait for backend to be healthy (30-60 seconds)
docker compose -f docker-compose.qnap.yml ps backend

# Start frontend
docker compose -f docker-compose.qnap.yml up -d frontend

# Verify all services are running
docker compose -f docker-compose.qnap.yml ps
```

### Step 7: Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.qnap.yml ps

# Check logs for errors
docker compose -f docker-compose.qnap.yml logs --tail=50

# Test health endpoint
curl http://localhost:8080/health

# Test frontend
curl http://localhost:8080/
```

---

## Post-Installation Steps

### 1. Create Admin Account

1. Access the application at `http://YOUR_QNAP_IP:8080`
2. Click "Register" or "Create Account"
3. **First registered user automatically becomes admin**
4. Fill in admin details:

   - Email: admin@yourdomain.com
   - Username: admin
   - Password: (use strong password)

### 2. Configure Application Settings

1. Log in with admin account
2. Navigate to Settings/Configuration
3. Configure:

   - School/Institution name
   - Academic year settings
   - Grading scale preferences
   - Email notifications (optional)

### 3. Set Up Backups

```bash
# Use management script for automated backups
./scripts/qnap/manage-qnap.sh

# Select option: "3. Backup Database"
# Configure backup schedule in QNAP Task Scheduler
```

**Recommended backup schedule**:

- Daily: Automated backups at 2:00 AM
- Weekly: Full backup retention
- Monthly: Archive backups
- Before updates: Always backup before upgrading

### 4. Configure QNAP Firewall (If Enabled)

```bash
# Allow access to SMS port
# QNAP UI: Control Panel → Network & File Services → Security → Firewall

# Add rule:
# - Protocol: TCP
# - Port: 8080 (or your SMS_PORT)
# - Source: LAN or specific IPs
# - Action: Allow
```

### 5. Set Up Monitoring (Optional)

```bash
# Enable Prometheus and Grafana
docker compose -f docker-compose.qnap.yml --profile monitoring up -d

# Access Grafana: http://YOUR_QNAP_IP:3000
# Default credentials: admin/admin (change immediately)
```

### 6. Schedule Regular Maintenance

Create scheduled tasks in QNAP:

**Daily Tasks** (2:00 AM):

```bash
cd /share/Container/sms-app
./scripts/qnap/manage-qnap.sh backup
```

**Weekly Tasks** (Sunday 3:00 AM):

```bash
cd /share/Container/sms-app
docker system prune -f
```

**Monthly Tasks** (1st day, 4:00 AM):

```bash
cd /share/Container/sms-app
./scripts/qnap/manage-qnap.sh update
```

---

## Verification

### Health Check Endpoints

```bash
# Detailed health status
curl http://YOUR_QNAP_IP:8080/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-19T10:00:00Z",
  "database": "connected",
  "migrations": "up-to-date",
  "disk_space": "sufficient",
  "version": "1.8.0"
}
```

### Container Status

```bash
# Check all containers
docker compose -f docker-compose.qnap.yml ps

# Expected output:
NAME            STATUS          PORTS
sms-postgres    Up (healthy)    5432/tcp
sms-backend     Up (healthy)    8000/tcp
sms-frontend    Up (healthy)    0.0.0.0:8080->80/tcp
```

### Log Review

```bash
# View all logs
docker compose -f docker-compose.qnap.yml logs

# View specific service
docker compose -f docker-compose.qnap.yml logs backend

# Follow logs in real-time
docker compose -f docker-compose.qnap.yml logs -f
```

### Database Connection Test

```bash
# Connect to PostgreSQL container
docker exec -it sms-postgres psql -U sms_user -d student_management

# Run test query
SELECT version();
\dt  # List tables
\q   # Quit
```

### Performance Verification

```bash
# Check resource usage
docker stats --no-stream

# Expected resource usage:
# - Backend: ~200-500MB RAM
# - Frontend: ~50-100MB RAM
# - PostgreSQL: ~100-300MB RAM
# Total: ~350-900MB RAM
```

---

## Troubleshooting

### Installation Fails: Port Already in Use

**Problem**: Port 8080 is already occupied

**Solution**:

```bash
# Find process using port 8080
netstat -tuln | grep 8080

# Change SMS_PORT in .env.qnap
nano .env.qnap
# Update: SMS_PORT=8081

# Restart installation
./scripts/qnap/install-qnap.sh
```

### Installation Fails: Insufficient Space

**Problem**: Not enough disk space

**Solution**:

```bash
# Check available space
df -h /share/Container/

# Clean up old containers and images
docker system prune -a

# Free up space in Container share
# Use QNAP File Station to remove unused files
```

### Containers Not Starting

**Problem**: Services fail to start or remain unhealthy

**Solution**:

```bash
# Check logs for errors
docker compose -f docker-compose.qnap.yml logs

# Common issues:
# 1. Database not ready - wait longer for postgres health check
# 2. Port conflicts - check netstat and change ports
# 3. Permission issues - verify directory permissions

# Restart services
docker compose -f docker-compose.qnap.yml restart

# Or recreate containers
docker compose -f docker-compose.qnap.yml down
docker compose -f docker-compose.qnap.yml up -d
```

### Cannot Access Application

**Problem**: Browser cannot reach http://QNAP_IP:8080

**Solution**:

```bash
# 1. Verify containers are running
docker compose -f docker-compose.qnap.yml ps

# 2. Check QNAP firewall
# UI: Control Panel → Security → Firewall
# Ensure port 8080 is allowed

# 3. Test from QNAP itself
curl http://localhost:8080/health

# 4. Check Docker network
docker network inspect sms-network
```

### Database Connection Errors

**Problem**: Backend cannot connect to PostgreSQL

**Solution**:

```bash
# 1. Check PostgreSQL is healthy
docker compose -f docker-compose.qnap.yml ps postgres

# 2. Verify DATABASE_URL in backend logs
docker compose -f docker-compose.qnap.yml logs backend | grep DATABASE_URL

# 3. Test database connection
docker exec -it sms-postgres psql -U sms_user -d student_management -c "SELECT 1;"

# 4. Restart backend service
docker compose -f docker-compose.qnap.yml restart backend
```

### Memory Issues

**Problem**: QNAP runs out of memory

**Solution**:

```bash
# Check current memory usage
free -h

# Reduce resource limits in docker-compose.qnap.yml
# Edit deploy.resources.limits.memory for services

# Disable optional monitoring services
docker compose -f docker-compose.qnap.yml --profile monitoring down
```

### Build Failures

**Problem**: Docker image build fails

**Solution**:

```bash
# Check build logs
docker compose -f docker-compose.qnap.yml build --no-cache backend

# Common issues:
# 1. Network connectivity - check internet connection
# 2. Disk space - clean up with 'docker system prune'
# 3. Invalid Dockerfile - verify syntax

# Try building without cache
docker compose -f docker-compose.qnap.yml build --no-cache --pull
```

---

## Getting Help

### Documentation Resources

- [QNAP Deployment Plan](../../QNAP_DEPLOYMENT_PLAN.md) - Complete deployment strategy
- [Management Guide](QNAP_MANAGEMENT_GUIDE.md) - Daily operations and maintenance
- [Troubleshooting Guide](QNAP_TROUBLESHOOTING_GUIDE.md) - Detailed problem resolution
- [Script Documentation](../../scripts/qnap/README.md) - Management script reference
- [Architecture Documentation](../ARCHITECTURE.md) - System design and components

### Support Channels

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check docs/ directory for detailed guides
- **QNAP Forums**: Community support for QNAP-specific issues
- **Container Station**: Official QNAP Container Station documentation

### Useful Commands

```bash
# Quick status check
docker compose -f docker-compose.qnap.yml ps

# View logs
docker compose -f docker-compose.qnap.yml logs -f --tail=100

# Restart all services
docker compose -f docker-compose.qnap.yml restart

# Stop all services
docker compose -f docker-compose.qnap.yml down

# Update and restart
docker compose -f docker-compose.qnap.yml pull
docker compose -f docker-compose.qnap.yml up -d

# Backup database
./scripts/qnap/manage-qnap.sh backup

# Access management menu
./scripts/qnap/manage-qnap.sh
```

---

## Next Steps

After successful installation:

1. ✅ Read the [Management Guide](QNAP_MANAGEMENT_GUIDE.md) for daily operations
2. ✅ Set up automated backups using QNAP Task Scheduler
3. ✅ Configure monitoring (optional) for production environments
4. ✅ Review [Security Best Practices](QNAP_SECURITY.md)
5. ✅ Plan upgrade strategy using [Upgrade Guide](QNAP_UPGRADE_GUIDE.md)

---

**Version**: 1.8.7
**Last Updated**: November 23, 2025
**Platform**: QNAP NAS with Container Station
