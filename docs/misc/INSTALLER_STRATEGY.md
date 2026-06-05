# SMS Installer Strategy - vv1.18.24

**Version:** 1.0  
**Date:** May 31, 2026  
**Status:** Design Document  
**Scope:** Docker and Native Lite Deployment Only

---

## Executive Summary

The SMS installer will support **TWO deployment types ONLY**:

1. **Docker Production** - For centralized, managed deployments
2. **Native Lite** - For portable, standalone deployments

⚠️ **Native Production is NOT included in the installer**

---

## Deployment Architecture

### Supported Installation Types

| Type | Purpose | Scope | Users | Infrastructure |
|------|---------|-------|-------|-----------------|
| **Docker Production** | Enterprise deployment | Organization-wide | 100+ | Docker + QNAP |
| **Native Lite** | Portable standalone | Individual/Team | 1-50 | Windows/Linux PC |
| ~~Native Production~~ | ❌ NOT SUPPORTED | ❌ Removed | ❌ N/A | ❌ N/A |

---

## Installation Package Structure

### What Gets Bundled

```
SMS_Installer_vv1.18.24/
├── docker/
│   ├── docker-compose.yml          (Production setup)
│   ├── .env.example                (Environment template)
│   ├── setup.sh                    (Docker initialization)
│   └── README.md                   (Docker instructions)
│
├── lite/
│   ├── SMS_Native_Lite_Simple.exe  (67.1 MB executable)
│   ├── README.md                   (Quick start)
│   └── QUICKSTART.txt              (Installation steps)
│
├── docs/
│   ├── DOCKER_DEPLOYMENT_GUIDE.md
│   ├── LITE_DEPLOYMENT_GUIDE.md
│   └── INSTALLER_README.md
│
├── installer.exe                   (Main installer wizard)
└── CHANGELOG.md
```

---

## Installation Wizard Flow

### Step 1: Welcome Screen
```
╔════════════════════════════════════════════╗
║   SMS Student Management System vv1.18.24   ║
║              Installation Wizard           ║
╚════════════════════════════════════════════╝

Select Installation Type:
  ☐ Docker Production
    (Centralized, scalable, managed)
    
  ☐ Native Lite
    (Portable, standalone, simple)
    
[Continue] [Exit]
```

### Step 2: Docker Production Setup (If Selected)

```
Docker Installation Flow:
  1. Check Docker installed
  2. Configure environment variables
  3. Set database credentials (QNAP)
  4. Configure network/ports
  5. Build containers
  6. Test deployment
  7. Start services
```

### Step 3: Native Lite Setup (If Selected)

```
Native Lite Installation Flow:
  1. Select installation location
  2. Create shortcuts
  3. Configure database (optional QNAP)
  4. Test executable
  5. Create desktop launcher
  6. Show quickstart guide
```

---

## Docker Production Deployment

### Pre-requisites

```
✓ Docker installed (18.09+)
✓ Docker Compose installed (1.24+)
✓ Linux server or Windows with Docker Desktop
✓ QNAP server running PostgreSQL (optional)
✓ Network connectivity
✓ 4 GB RAM minimum
✓ 20 GB storage minimum
```

### Installation Steps

```bash
# Step 1: Extract installer
unzip SMS_Installer_vv1.18.24.zip
cd SMS_Installer_vv1.18.24/docker

# Step 2: Configure environment
cp .env.example .env
# Edit .env with your settings:
# - Database credentials
# - Network configuration
# - Ports (default 8000)
# - Admin credentials

# Step 3: Build and start
docker-compose up -d

# Step 4: Verify
docker-compose logs -f

# Access at: http://localhost:8000
```

### Docker Files Included

```
docker-compose.yml
├── FastAPI backend (port 8000)
├── React frontend
├── PostgreSQL (if not using QNAP)
└── Nginx reverse proxy (optional)

.env.example
├── POSTGRES_HOST
├── POSTGRES_USER
├── POSTGRES_PASSWORD
├── POSTGRES_DB
├── ADMIN_EMAIL
├── ADMIN_PASSWORD
└── Other configurations

setup.sh
├── Docker validation
├── Environment setup
├── Database initialization
└── Service startup
```

---

## Native Lite Deployment

### Pre-requisites

```
✓ Windows 10/11 or Linux
✓ 512 MB RAM minimum
✓ 100 MB storage
✓ Port 8000 available
✓ Modern web browser
```

### Installation Steps

```
Option 1: Installer Wizard
  1. Run installer.exe
  2. Select "Native Lite"
  3. Choose installation folder
  4. Create shortcuts
  5. Finish

Option 2: Manual
  1. Extract SMS_Native_Lite_Simple.exe
  2. Save to desired location
  3. Double-click to run
  4. Browser opens automatically
```

### What Gets Installed

```
Selected Folder/
├── SMS_Native_Lite_Simple.exe  (67.1 MB)
├── QUICKSTART.txt
├── README.md
└── (Optional) Desktop Shortcut
```

---

## Feature Comparison

| Feature | Docker | Lite |
|---------|--------|------|
| **Setup Time** | 30 min | 2 min |
| **Complexity** | High | Low |
| **Users** | 100+ | 1-50 |
| **Database** | PostgreSQL | SQLite/PostgreSQL |
| **Scaling** | Easy | Limited |
| **Maintenance** | Ongoing | Minimal |
| **Port 8000** | Shared | Single |
| **Network Access** | Full | Local only |
| **Backup** | Docker volumes | AppData folder |
| **Cost** | Infrastructure | None |

---

## Installer Configuration

### System Requirements Check

The installer will verify:

```
✓ Operating system compatibility
✓ Available disk space (min 100 MB for Lite, 20 GB for Docker)
✓ Available RAM (min 512 MB for Lite, 4 GB for Docker)
✓ Port availability (8000, 5432)
✓ Internet connectivity (for Docker download)
✓ Docker/Docker Compose (for Docker option only)
```

### Pre-Installation Checklist

```
Before Docker Installation:
  ☐ Docker installed and running
  ☐ 20+ GB disk space available
  ☐ 4+ GB RAM available
  ☐ Port 8000 available
  ☐ Network configured
  ☐ QNAP credentials (if using)
  ☐ Firewall rules configured

Before Native Lite Installation:
  ☐ 100 MB+ disk space available
  ☐ 512 MB+ RAM available
  ☐ Port 8000 available
  ☐ Modern browser installed
```

---

## Installer Downloads

### Docker Package
```
File: SMS_Docker_vv1.18.24.zip
Size: ~50 MB (compose files, docs, scripts)
Contents: Docker configs, setup guides, documentation
Download: https://github.com/bs1gr/AUT_MIEEK_SMS/releases
```

### Lite Package
```
File: SMS_Native_Lite_vv1.18.24.zip
Size: ~75 MB (executable + docs)
Contents: SMS_Native_Lite_Simple.exe, guides, shortcuts
Download: https://github.com/bs1gr/AUT_MIEEK_SMS/releases
```

### Combined Installer
```
File: SMS_Installer_vv1.18.24.exe
Size: ~125 MB (both options bundled)
Contents: Wizard, both packages, all documentation
Download: https://github.com/bs1gr/AUT_MIEEK_SMS/releases
```

---

## Installation Methods

### Method 1: Combined Installer (Recommended)

```
User Experience:
  1. Download SMS_Installer_vv1.18.24.exe
  2. Run installer
  3. Select deployment type
  4. Follow wizard
  5. Installation complete

Best for:
  - First-time users
  - Organization-wide deployment
  - Standardized setup
```

### Method 2: Docker-Only Installation

```
For IT teams who know Docker:
  1. Download SMS_Docker_vv1.18.24.zip
  2. Extract files
  3. Run setup.sh
  4. Configure environment
  5. Start services

Best for:
  - Experienced Docker users
  - Custom configurations
  - Production deployments
```

### Method 3: Native Lite-Only Installation

```
For portable/standalone use:
  1. Download SMS_Native_Lite_vv1.18.24.zip
  2. Extract SMS_Native_Lite_Simple.exe
  3. Save to desired location
  4. Run executable
  5. Browser opens automatically

Best for:
  - Individual users
  - Testing/evaluation
  - Offline deployment
```

---

## Uninstallation

### Docker Uninstall

```bash
# Stop services
docker-compose down

# Remove volumes (optional - keeps data)
docker-compose down -v

# Remove images (optional - frees disk space)
docker rmi sms-backend:1.18.24
docker rmi sms-frontend:1.18.24
```

### Native Lite Uninstall

```
Simply delete:
  ✓ SMS_Native_Lite_Simple.exe
  ✓ Shortcuts (if created)
  
Clean data (optional):
  ✓ %LOCALAPPDATA%\SMS_Native_Lite_Simple\
```

---

## Verification After Installation

### Docker Verification

```bash
# Check services running
docker-compose ps

# Check logs
docker-compose logs

# Test application
curl http://localhost:8000
# Should see HTML response (frontend)

# Test API
curl http://localhost:8000/api/health
# Should see: {"status": "healthy"}
```

### Native Lite Verification

```
Manual checks:
  1. Run SMS_Native_Lite_Simple.exe
  2. Wait 8-10 seconds for startup
  3. Browser opens to http://127.0.0.1:8000
  4. Login page visible
  5. Login with default credentials
  6. Dashboard loads
```

---

## Troubleshooting

### Docker Installation Issues

**Issue: Docker not found**
```
Solution:
  1. Install Docker from docker.com
  2. Start Docker service
  3. Retry installation
```

**Issue: Port 8000 already in use**
```
Solution:
  1. Stop conflicting service
  2. Or change port in .env file
  3. Rebuild: docker-compose build
```

### Native Lite Installation Issues

**Issue: Port 8000 in use**
```
Solution:
  1. Find process: netstat -ano | findstr :8000
  2. Kill process: taskkill /PID [PID] /F
  3. Restart executable
```

**Issue: Cannot run executable**
```
Solution:
  1. Right-click exe → Properties
  2. Unblock if prompted
  3. Run as administrator
  4. Check antivirus isn't blocking
```

---

## Support & Documentation

### Included Documentation

Each installation includes:
```
✓ README.md (quick reference)
✓ QUICKSTART.txt (step-by-step)
✓ Deployment guide (detailed)
✓ Troubleshooting (problem solving)
✓ FAQ (common questions)
```

### Getting Help

```
Docker Issues:
  → IT_DEPLOYMENT_GUIDE.md (Docker section)
  → Docker documentation
  → IT support team

Native Lite Issues:
  → USER_TRAINING_GUIDE.md
  → FAQ.md
  → IT help desk
```

---

## What Was Removed (Native Production)

**Why Native Production is not included:**

```
❌ Native Production eliminated because:
  - Overlaps with Docker functionality
  - More complex than Lite
  - No unique advantage over Docker
  - Deployment support focus on:
    • Docker (scalable, managed)
    • Lite (simple, portable)

✅ Result:
  - Simpler installer
  - Clearer user choice
  - Better support focus
  - Cleaner documentation
```

---

## Installation Wizard Design

### Installer Technology

```
Built with: Inno Setup (Windows) + Bash scripts (Linux)
Language: Visual, intuitive, step-by-step
Size: ~125 MB (includes both options)
Installation time: 5-30 minutes (depending on selection)
Uninstaller: Automatic cleanup
```

### User Experience Principles

```
✓ Simple choice: Docker vs Lite
✓ Clear prerequisites display
✓ Automatic validation checks
✓ Progress indication
✓ Error messages with solutions
✓ Success confirmation
✓ Launch option at end
```

---

## Release Information

| Component | Version | Status |
|-----------|---------|--------|
| SMS Backend | vv1.18.24 | Ready |
| SMS Frontend | vv1.18.24 | Ready |
| Docker Config | vv1.18.24 | Ready |
| Native Lite Exe | 67.1 MB | Ready |
| Installer Wizard | vv1.18.24 | Design |
| Documentation | vv1.18.24 | Complete |

---

## Next Steps

**Phase 1: Complete ✅**
- Release notes created
- Deployment guides written
- User training prepared
- FAQ comprehensive

**Phase 2: Installer Creation**
- Design installer wizard (this document)
- Build installer executable
- Test all installation paths
- Create installer documentation

**Phase 3: Release & Deployment**
- Merge PR #192
- Create GitHub release
- Publish installer packages
- Begin user deployment

---

**Status:** Design Document  
**Next:** Implementation of installer wizard  
**Timeline:** Phase 2 ready to start  

---

*SMS Installer Strategy vv1.18.24 - Docker & Lite Only*

