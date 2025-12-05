# SMS v1.9.8 Installer Quick Reference

**Version:** 1.9.8  
**File:** `SMS_Installer_1.9.8.exe` (5.27 MB)  
**Date:** December 5, 2025

---

## 🚀 Two Installation Modes

When you run the installer, you'll see a page asking to choose your installation type:

```
╔════════════════════════════════════════════╗
║ Installation Type - Choose One:            ║
├────────────────────────────────────────────┤
│ ○ Docker Production Only (RECOMMENDED)     │
│   → Fastest, cleanest, best for end users  │
│                                            │
│ ○ Include Development Environment          │
│   → Full source code, local development    │
╚════════════════════════════════════════════╝
```

---

## 📌 Mode 1: Docker Production Only (DEFAULT)

**Who should choose this:** End users, production deployments

### What Gets Installed
- ✅ Docker application container
- ✅ SMS scripts (DOCKER.ps1, DOCKER_TOGGLE.ps1)
- ✅ Application documentation
- ✅ Configuration files
- ❌ No source code
- ❌ No development tools

### Installation Size
- **Installer download:** 5.27 MB
- **Total after install:** ~800 MB (Docker image + runtime)

### First Run
```powershell
# Method 1: Click desktop shortcut "Student Management System"
# Method 2: Open PowerShell and run:
cd "C:\Program Files\SMS"
.\DOCKER.ps1 -Start
```

### Access Application
- Open browser: `http://localhost:8080`
- Login with default credentials

### Update Application
```powershell
cd "C:\Program Files\SMS"
.\DOCKER.ps1 -Update
```

### Stop Application
```powershell
cd "C:\Program Files\SMS"
.\DOCKER.ps1 -Stop
```

---

## 🛠️ Mode 2: Development Environment (OPTIONAL)

**Who should choose this:** Software developers, system administrators

### What Gets Installed
- ✅ Docker container
- ✅ Full backend source code (Python)
- ✅ Full frontend source code (React/TypeScript)
- ✅ Development scripts (NATIVE.ps1, COMMIT_READY.ps1)
- ✅ All documentation
- ❌ node_modules (auto-created on `npm install`)
- ❌ Python venv (auto-created on `pip install`)

### Installation Size
- **Installer download:** 5.27 MB + source files
- **Total after install:** ~2.5+ GB (includes development dependencies)

### Prerequisites
- **Node.js 20+** - Required for frontend development
- **Python 3.10+** - Required for backend development
- **Docker Desktop** - Required for containerized mode (optional)

### First Run - Docker Mode
```powershell
cd "C:\Program Files\SMS"
.\DOCKER.ps1 -Start
# Access: http://localhost:8080
```

### First Run - Native Development
```powershell
cd "C:\Program Files\SMS\frontend"
npm install                    # Install dependencies (first time only)

cd "C:\Program Files\SMS\backend"
pip install -r requirements.txt  # Install dependencies (first time only)

cd "C:\Program Files\SMS"
.\NATIVE.ps1 -Start           # Start both services
```

**Development Services:**
- Frontend HMR: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Live reload on file changes

### Common Developer Tasks

```powershell
# Start native development (backend + frontend with hot-reload)
.\NATIVE.ps1 -Start

# Start only backend (hot-reload enabled)
.\NATIVE.ps1 -Backend

# Start only frontend (Vite HMR)
.\NATIVE.ps1 -Frontend

# Stop all services
.\NATIVE.ps1 -Stop

# Pre-commit quality checks
cd backend
.\COMMIT_READY.ps1 -Quick      # Format + lint + smoke test (~3 min)
.\COMMIT_READY.ps1 -Standard   # Above + backend tests (~8 min)
.\COMMIT_READY.ps1 -Full       # All checks including frontend (~20 min)

# Run tests
cd backend && pytest -q         # Backend tests
cd frontend && npm run test     # Frontend tests

# Database migrations
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## ❓ How to Decide Which Mode?

### Choose "Docker Production Only" if:
- ✅ You just want to run SMS
- ✅ You don't plan to modify the code
- ✅ You want minimal disk space
- ✅ You want the fastest installation
- ✅ You're a non-technical end user

### Choose "Development Environment" if:
- ✅ You're a software developer
- ✅ You want to modify the source code
- ✅ You want to run tests locally
- ✅ You want to use hot-reload
- ✅ You have Node.js and Python installed

---

## 🔄 Can I Switch Modes Later?

**Yes!** You can reinstall and switch modes:

1. **Upgrade to Dev Environment:**
   - Run installer again
   - Select "Include Development Environment"
   - Your data is preserved

2. **Downgrade to Docker-Only:**
   - Run installer again
   - Select "Docker Production Only"
   - Your data is preserved (choose "Keep user data" when prompted)

---

## 🆘 Troubleshooting

### "Docker is not installed"
- **Solution:** Download from https://www.docker.com/products/docker-desktop
- The installer will offer to open the download page

### "Node.js is not installed" (Dev mode)
- **Solution:** Download from https://nodejs.org (20+ LTS)
- Install before running NATIVE.ps1

### "Python is not installed" (Dev mode)
- **Solution:** Download from https://www.python.org (3.10+)
- Install before running NATIVE.ps1

### Application won't start
- **Verify Docker is running:** `docker ps` in PowerShell
- **Check logs:** `docker logs sms-app`
- **Restart Docker container:** `.\DOCKER.ps1 -Stop && .\DOCKER.ps1 -Start`

---

## 📚 More Information

- **Full documentation:** Read `README.md` in installation folder
- **Production checklist:** See `DEPLOYMENT_READINESS.md`
- **Changelog:** View `CHANGELOG.md` for version history
- **GitHub:** https://github.com/bs1gr/AUT_MIEEK_SMS

---

## 💾 Disk Space Requirements

| Component | Docker-Only | + Dev Env |
|-----------|-------------|-----------|
| Installer | 5.27 MB | 5.27 MB |
| Docker image | 800 MB | 800 MB |
| Backend source | - | 500 KB |
| Frontend source | - | 300 KB |
| node_modules | - | ~1.5 GB |
| Python venv | - | ~300 MB |
| User data | ~50 MB | ~50 MB |
| **TOTAL** | **~850 MB** | **~2.5+ GB** |

---

## 🔒 What About My Data?

Your data (students, courses, grades) is always preserved:
- Database file: `data/student_management.db`
- Automatic backups: `backups/` directory
- Configuration: `.env` files

When upgrading or reinstalling, you'll be asked if you want to keep your data. **Always click YES** to preserve your work!

---

## ✅ Installation Checklist

After installation completes:

- [ ] Desktop shortcut created
- [ ] SMS folder in C:\Program Files\SMS
- [ ] First application launch successful
- [ ] Can access http://localhost:8080
- [ ] Can login with default credentials

---

## 🎯 Next Steps

**Docker Mode:**
1. Run installer
2. Select "Docker Production Only"
3. Click desktop shortcut
4. Login to application

**Development Mode:**
1. Install Node.js 20+ and Python 3.10+
2. Run installer
3. Select "Include Development Environment"
4. Run `.\NATIVE.ps1 -Start`
5. Open http://localhost:5173 for frontend dev

---

**Version:** 1.9.8  
**Last Updated:** December 5, 2025  
**Support:** GitHub Issues - https://github.com/bs1gr/AUT_MIEEK_SMS/issues

