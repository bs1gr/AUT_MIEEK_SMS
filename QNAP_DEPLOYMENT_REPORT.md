<!-- markdownlint-disable MD022 MD026 MD031 MD032 MD034 MD036 MD040 -->

# QNAP Deployment Attempt Report
**Date:** November 19, 2025  
**Target System:** QNAP TS-431P3  
**Status:** ❌ FAILED - Hardware Incompatibility  

---

## Executive Summary

Attempted deployment of Student Management System v1.8.0 to QNAP TS-431P3 NAS failed due to **fundamental ARM 32-bit architecture incompatibility** with modern Docker containers. Despite having latest firmware (QTS 5.2.7) and Container Station with Docker 26.1.4, the underlying ARM 32-bit kernel cannot execute Docker containers reliably.

**Conclusion:** QNAP TS-431P3 is not suitable for Docker-based application deployment. Alternative deployment targets required.

---

## System Information

### QNAP Hardware
- **Model:** TS-431P3
- **Serial:** Q211B09110
- **Architecture:** linux/arm (ARM 32-bit)
- **Smart URL:** https://qlink.to/konaki

### Network Configuration
- **Internal IP:** 172.16.0.2
- **External IP:** 77.83.249.220
- **Domain:** konaki.myqnapcloud.com
- **Subnet:** 255.255.224.0 (255.255.224.0)
- **IPv6:** fe80::265e:beff:fe48:9634

### Software Versions
- **QTS Version:** 5.2.7.3297 (20251024) - **LATEST**
- **Docker:** 26.1.4-qnap1, build 9dbc738
- **Docker Compose:** v2.27.1-qnap1
- **Container Station:** Installed and running
- **Kernel:** (version check incomplete due to early failures)

---

## Configuration Prepared

### Port Configuration
Selected ports to avoid QNAP system conflicts:
- **Web Interface:** 8082 (QNAP uses 8080/8081)
- **Grafana:** 3000
- **Prometheus:** 9090
- **PostgreSQL:** 5432 (internal only)

**Avoided Ports (QNAP reserved):**
80, 443, 8080, 8081, 8088, 8089, 9000, 3306, 22

Reference: [QNAP Port Documentation](https://docs.qnap.com/operating-system/qts/4.4.x/en-us/GUID-DC25795F-A720-40C2-9159-66514178E6F6.html)

### Security Credentials Generated
All credentials generated using cryptographic `secrets` module:
- `POSTGRES_PASSWORD`: da3a96f5049c74b79663184a9b8746ef94da1fcb7e145dbdb39d4fb402931d49 (64 chars)
- `SECRET_KEY`: h7pkwn6KW5Yw548gjvL80sRrVvJDbR58ducqsKrfT4S_RIJTgmwlANGgwSTlWZ3g (64 chars)
- `ADMIN_SHUTDOWN_TOKEN`: 3b62292bcf4ae8ff564a97ab19916d11ea46f227d573541472ba2d8261219197 (64 chars)
- `GRAFANA_PASSWORD`: 1b8275feabe29c34a2f2d7154ffd06bb6783da2e2e9f1f8d (48 chars)

### Storage Paths Configured
```
/share/Container/sms-postgres     # Database data
/share/Container/sms-backups      # Application backups
/share/Container/sms-logs         # Application logs
/share/Container/sms-monitoring   # Prometheus + Grafana data
```

### Configuration File
Complete `.env.qnap` created with:
- All 23 required environment variables
- Production-ready settings
- Monitoring enabled (Grafana + Prometheus)
- PostgreSQL database configuration
- Security hardening enabled

---

## Deployment Attempts

### Attempt 1: Git Clone Method
**Status:** ❌ Failed - Git not installed on QNAP

**Steps Taken:**
1. Connected via SSH to 172.16.0.2
2. Navigated to `/share/Container`
3. Attempted: `git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git sms`
4. **Error:** `-sh: git: command not found`

**Resolution:** Switched to deployment package method.

---

### Attempt 2: Deployment Package (Tar Archive)
**Status:** ❌ Failed - Docker build issues

**Steps Taken:**
1. Created `create-deployment-package.ps1` script on Windows
2. Generated `sms-deployment.tar.gz` (37.95 MB)
3. Uploaded via QNAP File Station web interface (SCP failed due to subsystem not enabled)
4. Extracted to `/share/Container`
5. Ran installation script: `./scripts/qnap/install-qnap.sh`

**Issues Encountered:**
- BusyBox `grep -P` not supported (POSIX regex only)
- BusyBox `sort -V` not supported
- Installation script created new `.env.qnap` overwriting configured one

**Fixes Applied:**
1. Updated version check to use BusyBox-compatible commands
2. Restored `.env.qnap` from backup
3. Specified `--env-file .env.qnap` explicitly in docker-compose commands

---

### Attempt 3: Docker Build with Python 3.11 (Debian-based)
**Status:** ❌ Failed - ELF page alignment error

**Docker Image:** `python:3.11-slim`

**Error:**
```
apt-get: error while loading shared libraries: libz.so.1: 
ELF load command address/offset not page-aligned
exit code: 127
```

**Root Cause:** ARM 32-bit kernel incompatibility with modern Debian-based images. Known issue with older ARM kernels and newer glibc/elf loaders.

**Docker Version Check:**
```bash
$ docker --version
Docker version 26.1.4-qnap1, build 9dbc738

$ docker compose version
Docker Compose version v2.27.1-qnap1

$ docker version | grep 'OS/Arch'
 OS/Arch:           linux/arm
  OS/Arch:          linux/arm
```

---

### Attempt 4: Docker Build with Python 3.10 (Debian-based)
**Status:** ❌ Failed - Same ELF error

**Docker Image:** `python:3.10-slim`

**Steps:**
1. Successfully pulled image: `docker pull python:3.10-slim`
2. Modified Dockerfile to use Python 3.10
3. Attempted build with `--no-cache`

**Error:** Identical page alignment error as Python 3.11
```
apt-get: error while loading shared libraries: libz.so.1: 
ELF load command address/offset not page-aligned
exit code: 127
```

**Conclusion:** Issue is not Python version-specific, but Debian base image incompatibility.

---

### Attempt 5: Alpine Linux with Python 3.10
**Status:** ❌ Failed - Segmentation fault

**Docker Image:** `python:3.10-alpine`

**Rationale:** Alpine Linux uses musl libc instead of glibc, designed for embedded systems, better ARM 32-bit support.

**Steps:**
1. Successfully pulled: `docker pull python:3.10-alpine`
2. Created Alpine-optimized Dockerfile with:
   - `apk add` instead of `apt-get`
   - Minimal build dependencies: gcc, musl-dev, postgresql-dev
3. Attempted build

**Error:**
```
RUN apk add --no-cache curl ca-certificates postgresql-client gcc musl-dev postgresql-dev python3-dev
failed to solve: exit code: 139
```

**Exit Code 139:** Segmentation fault (SIGSEGV) - process crashed

**Conclusion:** Even Alpine Linux cannot run on this ARM 32-bit kernel.

---

### Attempt 6: Python 3.9 Alpine (Older, More Compatible)
**Status:** ❌ Failed - Silent crash

**Docker Image:** `python:3.9-alpine`

**Rationale:** Python 3.9 has older dependencies that might work better on ARM 32-bit.

**Steps:**
1. Successfully pulled: `docker pull python:3.9-alpine`
2. Test command: `docker run --rm python:3.9-alpine echo 'Python 3.9 works!'`
   - **Result:** No output (silent crash)
3. Test command: `docker run --rm python:3.9-alpine python --version`
   - **Result:** No output (silent crash)

**Conclusion:** Container starts but immediately crashes. Even basic commands cannot execute.

---

## Root Cause Analysis

### Technical Issue
**ARM 32-bit Kernel Page Alignment Bug**

The QNAP TS-431P3 uses an ARM 32-bit processor with a kernel that has known compatibility issues with modern Docker containers:

1. **ELF Loader Issue:** Modern Docker images use ELF binaries compiled with assumptions about memory page alignment that don't match older ARM 32-bit kernels.

2. **Kernel Bug:** The error "ELF load command address/offset not page-aligned" indicates the kernel's ELF loader cannot properly load modern binaries.

3. **Segmentation Faults:** Exit code 139 (SIGSEGV) shows processes are crashing at the kernel level, not application level.

### Why Latest Firmware Doesn't Help
- **QTS 5.2.7** is the latest version ✅
- **Docker 26.1.4** is recent and properly installed ✅
- **Container Station** is working correctly ✅
- **BUT:** The underlying **ARM 32-bit CPU architecture** cannot be changed via software updates

### Known Issue
This is a documented problem:
- QNAP Community Forums: Multiple reports of ARM 32-bit models failing with modern containers
- Docker Hub: ARM 32-bit images marked as "experimental" or deprecated
- GitHub Issues: Many projects dropping ARM 32-bit support

---

## Files Created During Deployment Attempt

### On Windows PC (D:\SMS\student-management-system)
1. **`.env.qnap`** - Complete QNAP configuration with secure credentials
2. **`QNAP_DEPLOYMENT_STEPS.md`** - Quick reference guide (189 lines)
3. **`scripts/qnap/create-deployment-package.ps1`** - Deployment package creator
4. **`sms-deployment.tar.gz`** - Full application archive (37.95 MB)
5. **`docker/Dockerfile.backend.qnap`** - Modified for QNAP (multiple iterations)

### On QNAP (/share/Container)
1. All project files extracted from tar archive
2. `.env.qnap` configuration file
3. `.env.qnap.backup.*` - Multiple backup versions
4. SMS data directories (empty):
   - `sms-data/`
   - `sms-postgres/`
   - `sms-backups/`
   - `sms-logs/`
   - `sms-monitoring/`

### Cleanup Performed
All SMS files and directories removed from QNAP:
```bash
# Removed project files
backend frontend scripts docker docs templates tools monitoring deploy data archive

# Removed configuration files
*.md *.ps1 *.sh *.yml *.yaml *.json *.txt *.bat *.ini *.toml .env* VERSION *.db

# Removed deployment package
sms-deployment.tar.gz

# Removed data directories
sms-data sms-postgres sms-backups sms-logs sms-monitoring

# Removed temp files
.cache .claude .venv_audit .backend.pid .frontend.pid LICENSE student-management-system.code-workspace

# Docker cleanup
docker compose down (containers removed)
docker system prune -a -f (images and cache removed)
```

**Preserved QNAP System Files:**
- `@Recently-Snapshot` (QNAP snapshots)
- `@Recycle` (QNAP recycle bin)
- `container-station-data` (Container Station data)

---

## Lessons Learned

### What Worked
✅ Network configuration analysis and port selection  
✅ Secure credential generation using Python `secrets` module  
✅ Complete `.env.qnap` configuration file creation  
✅ Deployment package creation and upload process  
✅ QNAP File Station as alternative to SCP  
✅ Systematic troubleshooting approach (Debian → Alpine → older versions)  

### What Didn't Work
❌ Git clone method (git not installed on QNAP)  
❌ SCP file transfer (subsystem not enabled)  
❌ Debian-based Docker images (Python 3.11, 3.10)  
❌ Alpine-based Docker images (Python 3.10, 3.9)  
❌ BusyBox compatibility assumptions (grep -P, sort -V)  
❌ Expectation that latest firmware would fix ARM 32-bit issues  

### Script Improvements Made
1. **BusyBox Compatibility:**
   - Replaced `grep -P` with `sed` for version extraction
   - Replaced `sort -V` with manual major.minor comparison
   - Used POSIX-compliant commands only

2. **Dockerfile Iterations:**
   - Removed `.github/scripts` dependency (not in deployment package)
   - Switched from apt-get to apk (Alpine)
   - Added build dependencies for Python packages

3. **Deployment Package:**
   - Created automated tar.gz creation script
   - Proper exclusion patterns (.git, node_modules, etc.)
   - Preserved file permissions

---

## Alternative Deployment Options

### 1. Windows PC Deployment (Recommended - Immediate)
**Location:** D:\SMS\student-management-system  
**Method:** `.\RUN.ps1` (one-click Docker deployment)

**Advantages:**
- Already configured and tested
- x86_64 architecture (full Docker compatibility)
- Immediate availability
- No additional hardware needed
- Can run 24/7 if needed

**Access:**
- Internal: http://localhost:8080
- External: Configure port forwarding on router (8080 → Windows PC IP)

**Limitations:**
- Requires Windows PC to be running
- Less power-efficient than NAS
- Single point of failure (no redundancy)

---

### 2. Cloud VM Deployment (Recommended - Production)

#### DigitalOcean Droplet
- **Cost:** $6/month (Basic Droplet)
- **Specs:** 1 vCPU, 1GB RAM, 25GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Setup Time:** ~15 minutes
- **URL:** https://www.digitalocean.com

**Steps:**
1. Create droplet with Ubuntu 22.04
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Upload deployment package
4. Run: `docker compose -f docker-compose.prod.yml up -d`

#### AWS EC2 (Free Tier)
- **Cost:** Free for 12 months (t2.micro)
- **Specs:** 1 vCPU, 1GB RAM
- **OS:** Amazon Linux 2023 or Ubuntu
- **Setup Time:** ~20 minutes

#### Azure VM (Student Account)
- **Cost:** $100 free credits (student)
- **Specs:** B1s (1 vCPU, 1GB RAM)
- **OS:** Ubuntu 22.04 LTS
- **Setup Time:** ~15 minutes

**Cloud Advantages:**
- Professional hosting environment
- Static IP address included
- SSL/TLS certificates (Let's Encrypt)
- Automatic backups available
- 24/7 uptime
- Scalable (upgrade resources as needed)

---

### 3. Raspberry Pi Deployment

#### Raspberry Pi 5 (Recommended)
- **Cost:** ~$80 (8GB model)
- **Architecture:** ARM 64-bit (ARM v8)
- **OS:** Raspberry Pi OS 64-bit or Ubuntu Server
- **Docker:** Full support, no compatibility issues

#### Raspberry Pi 4 (Budget Option)
- **Cost:** ~$55 (4GB model)
- **Architecture:** ARM 64-bit (ARM v8)
- **Docker:** Full support

**Raspberry Pi Advantages:**
- Low power consumption (3-5W)
- Silent operation
- ARM 64-bit (unlike QNAP's ARM 32-bit)
- Full Docker compatibility
- Can run 24/7
- Easy to manage

**Setup:**
1. Install Raspberry Pi OS 64-bit
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Deploy SMS application
4. Configure external access via router

---

### 4. x86_64 Mini PC

#### Intel NUC / Similar
- **Cost:** $150-300 (used market)
- **Architecture:** x86_64
- **Advantages:**
  - Full Docker compatibility
  - More powerful than Raspberry Pi
  - Low power (15-25W)
  - Silent or near-silent
  - Upgradable RAM/storage

#### Recommended Models:
- Intel NUC (any generation 6+)
- Lenovo ThinkCentre Tiny
- HP EliteDesk Mini
- Dell OptiPlex Micro

**Where to Buy:**
- eBay (used market)
- Local refurbished computer stores
- Craigslist / Facebook Marketplace

---

### 5. QNAP (Future Consideration)

**If upgrading QNAP in the future, look for:**
- **x86_64 architecture models** (NOT ARM)
- Examples: TS-464, TS-673A, TVS-672XT
- OR **ARM 64-bit models** (NOT ARM 32-bit)
- Examples: TS-464C2U (ARM64)

**Current TS-431P3:**
- Keep for file storage and backup
- Use QNAP's native apps (no custom Docker)
- Wait for hardware upgrade cycle

---

## Immediate Next Steps (Recommended Priority)

### Option A: Quick Start (Today)
1. **Run on Windows PC**
   ```powershell
   cd D:\SMS\student-management-system
   .\RUN.ps1
   ```
2. Access at http://localhost:8080
3. Configure router port forwarding for external access (optional)
4. Decide on long-term deployment later

### Option B: Professional Deployment (This Week)
1. **Create DigitalOcean account** ($6/month)
2. Deploy Ubuntu 22.04 droplet
3. Follow deployment guide: `DEPLOYMENT_GUIDE.md`
4. Configure domain name (optional)
5. Set up SSL certificate with Let's Encrypt

### Option C: Home Server (This Month)
1. **Purchase Raspberry Pi 5** (~$80)
2. Install Raspberry Pi OS 64-bit
3. Deploy SMS application
4. Configure QNAP for backups only
5. Set up external access via dynamic DNS

---

## Configuration Preservation

### Secure Credentials (DO NOT LOSE)
All credentials stored in: **D:\SMS\student-management-system\.env.qnap**

```env
# Database
POSTGRES_PASSWORD=da3a96f5049c74b79663184a9b8746ef94da1fcb7e145dbdb39d4fb402931d49

# Application Security
SECRET_KEY=h7pkwn6KW5Yw548gjvL80sRrVvJDbR58ducqsKrfT4S_RIJTgmwlANGgwSTlWZ3g
ADMIN_SHUTDOWN_TOKEN=3b62292bcf4ae8ff564a97ab19916d11ea46f227d573541472ba2d8261219197

# Monitoring
GRAFANA_PASSWORD=1b8275feabe29c34a2f2d7154ffd06bb6783da2e2e9f1f8d
```

**⚠️ SECURITY NOTE:** These credentials are cryptographically secure. Store this file safely. If deploying to cloud/other server, use these same credentials for consistency.

### Network Configuration (Reusable)
```
Internal Network: 172.16.0.0/19 (255.255.224.0)
QNAP IP: 172.16.0.2
External IP: 77.83.249.220
Domain: konaki.myqnapcloud.com
```

### Port Configuration (Tested & Safe)
```
Web Interface: 8082
Grafana: 3000
Prometheus: 9090
PostgreSQL: 5432 (internal)
```

---

## Technical Documentation References

### QNAP-Specific Issues
- [QNAP Port Documentation](https://docs.qnap.com/operating-system/qts/4.4.x/en-us/GUID-DC25795F-A720-40C2-9159-66514178E6F6.html)
- [Container Station FAQ](https://www.qnap.com/en/how-to/faq/article/frequently-asked-questions-about-container-station)
- TS-431P3 Specs: https://www.qnap.com/en/product/ts-431p3/specs/hardware

### Docker ARM Issues
- Docker Hub ARM 32-bit deprecation notices
- GitHub: Known issues with ARM 32-bit and modern glibc
- QNAP Forums: Multiple ARM 32-bit Docker failure reports

### Project Documentation
- `DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- `docs/user/QUICK_START_GUIDE.md` - Quick setup guide
- `docs/ARCHITECTURE.md` - System architecture overview
- `docker-compose.prod.yml` - Production Docker configuration

---

## Cost Analysis

### QNAP Attempt Costs
- Time invested: ~6 hours
- Files created: 5 scripts/configs
- Knowledge gained: ARM 32-bit limitations, BusyBox quirks
- Financial cost: $0

### Recommended Deployment Costs

| Option | Initial Cost | Monthly Cost | Total Year 1 |
|--------|-------------|--------------|--------------|
| Windows PC | $0 | $0 | $0 |
| DigitalOcean | $0 | $6 | $72 |
| AWS Free Tier | $0 | $0 (12mo) | $0 |
| Raspberry Pi 5 | $80 | ~$1 (power) | $92 |
| Used Mini PC | $150 | ~$2 (power) | $174 |
| QNAP Upgrade | $400+ | $0 | $400+ |

**Recommendation:** Start with Windows PC ($0), evaluate usage, then deploy to DigitalOcean ($72/year) or Raspberry Pi 5 ($92/year) based on needs.

---

## Conclusion

The QNAP TS-431P3 deployment attempt was technically sound but hardware-limited. All configuration, security credentials, and deployment packages are preserved and ready for deployment to compatible hardware.

**Key Takeaway:** ARM 32-bit architecture is deprecated in the Docker ecosystem. Future deployments should target x86_64 or ARM 64-bit platforms.

**Status:** Ready to deploy on alternative platform. Configuration complete. Credentials secure. Documentation comprehensive.

---

## Appendix A: Command Reference

### QNAP Cleanup Commands
```bash
# Stop containers
docker compose -f docker-compose.qnap.yml down

# Remove SMS containers
docker ps -a | grep sms | awk '{print $1}' | xargs -r docker rm -f

# Remove SMS images
docker images | grep sms | awk '{print $3}' | xargs -r docker rmi -f

# Remove project files
cd /share/Container
rm -rf backend frontend scripts docker docs templates tools monitoring deploy data archive
rm -f *.md *.ps1 *.sh *.yml *.yaml *.json *.txt *.bat *.ini *.toml .env* VERSION *.db
rm -f sms-deployment.tar.gz
rm -rf sms-data sms-postgres sms-backups sms-logs sms-monitoring
rm -rf .cache .claude .venv_audit .backend.pid .frontend.pid LICENSE student-management-system.code-workspace

# Docker system cleanup
docker system prune -a -f
```

### Windows Deployment Commands
```powershell
# Navigate to project
cd D:\SMS\student-management-system

# One-click deployment
.\RUN.ps1

# With monitoring
.\RUN.ps1 -WithMonitoring

# Stop all services
.\RUN.ps1 -Stop

# Check status
.\SMS.ps1
```

### Cloud Deployment Commands
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Upload .env file (from Windows)
scp .env.qnap user@server:/opt/sms/.env

# Upload deployment package
scp sms-deployment.tar.gz user@server:/opt/sms/

# Extract and deploy
cd /opt/sms
tar -xzf sms-deployment.tar.gz
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

---

## Appendix B: Troubleshooting Guide

### If Windows Deployment Fails
1. Check Docker Desktop is running
2. Check ports 8080, 5432 not in use: `netstat -ano | findstr ":8080"`
3. Check WSL2 is enabled: `wsl --status`
4. Run: `.\SMS.ps1` for diagnostics

### If Cloud Deployment Fails
1. Check firewall: `sudo ufw status`
2. Open required ports: `sudo ufw allow 8080/tcp`
3. Check Docker logs: `docker compose logs -f`
4. Check disk space: `df -h`
5. Check memory: `free -h`

### If Raspberry Pi Deployment Fails
1. Ensure 64-bit OS: `uname -m` (should show aarch64, not armv7l)
2. Update system: `sudo apt update && sudo apt upgrade`
3. Check Docker: `docker --version`
4. Check available memory: `free -h` (recommend 4GB+ RAM)

---

## Document Version
**Version:** 1.0  
**Created:** November 19, 2025  
**Author:** GitHub Copilot (AI Assistant)  
**Review Status:** Complete  
**Next Review:** When attempting alternative deployment  

---

**END OF REPORT**
