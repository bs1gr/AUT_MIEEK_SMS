# Student Management System

## 🗂️ Script Organization (v1.3.8+)

Scripts are now reorganized into two distinct, well-defined sets:

### **Developer Workbench** ([scripts/dev/](scripts/dev/))

For building, running, debugging, testing, and cleaning during development.

**Key Scripts**:

- `SMOKE_TEST.ps1` - Quick health check
- `CLEANUP.bat` - Clean build artifacts
- `.\scripts\internal\DIAGNOSE_STATE.ps1` - Full diagnostics
- `.\scripts\internal\DEBUG_PORTS.ps1` - Port conflict debugging
- `.\scripts\internal\DEVTOOLS.ps1` - Advanced developer tools

[Read Developer Guide →](scripts/dev/README.md)

### **End-User / DevOps** ([scripts/deploy/](scripts/deploy/))

For deployment, Docker orchestration, and production maintenance.

**Key Scripts**:

- `SMART_SETUP.ps1` - Intelligent setup (main entry point)
- `STOP.ps1` - Stop all services
- `UNINSTALL.bat` - Complete uninstall
- `CHECK_VOLUME_VERSION.ps1` - Check Docker volume versions
- `docker/DOCKER_*.ps1` - Docker operations

[Read Deployment Guide →](scripts/deploy/README.md)

### **Root Scripts** (End-User Entry Points)

- `SMS.ps1` - **Main management interface** (interactive menu, recommended)
- `INSTALL.bat` - **One-click installer** (easiest way to get started)

**📖 Complete Guide**: See [docs/SCRIPTS_GUIDE.md](docs/SCRIPTS_GUIDE.md) for comprehensive documentation.

<!-- Removed broken link: SCRIPT_REORGANIZATION_SUMMARY.md (reorg summary now covered in docs/SCRIPTS_GUIDE.md) -->

[![CI](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/v/release/bs1gr/AUT_MIEEK_SMS?sort=semver)](https://github.com/bs1gr/AUT_MIEEK_SMS/releases)

## 📚 Documentation / Τεκμηρίωση

- 🇬🇧 **English**: [README.md](README.md) (this file)
- 🇬🇷 **Ελληνικά**:
  - [⚡ Γρήγορη Εκκίνηση](ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md) - Quick start guide
  - [📖 Πλήρης Οδηγός Χρήσης](ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md) - Complete user manual

---

> Deprecated wrappers
>
> - START.bat and ONE-CLICK.ps1/ONE-CLICK.bat are deprecated and only forward to the primary scripts.
> - Prefer QUICKSTART.ps1 to start and SMS.ps1 for management.
> - ONE-CLICK.ps1 forwards to SMART_SETUP.ps1; START.bat forwards to QUICKSTART.ps1.

## 🔖 Releases

- Latest: [v1.3.8](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.8)
- All releases: <https://github.com/bs1gr/AUT_MIEEK_SMS/releases>

## 🚀 Quick Start - New Simplified Installation

### **Easiest Method** (No PowerShell Issues!)

**Just one command:**

```batch
INSTALL.bat
```

**Or with Python:**

```bash
python install.py
```

That's it! The installer handles everything automatically:

- ✅ Detects Docker/Python/Node.js
- ✅ Chooses best mode for your system
- ✅ Installs all dependencies
- ✅ Starts the application
- ✅ Opens your browser

**See [INSTALL.md](INSTALL.md) for the simple guide!**

---

### Alternative Methods (Advanced Users)

Using PowerShell scripts (requires execution policy):

```powershell
.\QUICKSTART.ps1    # Auto-setup and start
.\SMS.ps1           # Interactive management
```

Note: If you get execution policy errors, just use `INSTALL.bat` instead - it works everywhere!

### 🐧 Linux Quick Start

On Linux, you can validate your environment and start in either Docker (recommended) or native development mode:

1) Validate prerequisites (Docker/Python/Node/pwsh):

```bash
./scripts/linux_env_check.sh            # validate only
./scripts/linux_env_check.sh --fix      # auto-create .env files and folders
```

2) Start the app:

- Docker release (recommended):

```bash
./scripts/deploy/run-docker-release.sh
```

- Native development (hot reload):

```bash
./scripts/dev/run-native.sh
```

Notes:

- PowerShell 7+ (pwsh) is recommended on Linux, as helper scripts delegate to SMART_SETUP.ps1 for consistent behavior.
- If pwsh isn’t installed, linux_env_check.sh will warn you. You can still run with plain Docker:

```bash
docker compose up -d --build
```

### Deployment Modes

The runtime now enforces a clear separation between release and development workflows.

#### 🐳 Release (Docker Full Stack Only)

- Production and release builds **must** run via the Docker full-stack bundle.
- Launch with `.\scripts\deploy\run-docker-release.ps1` (Windows/PowerShell) or `scripts/deploy/run-docker-release.sh` (macOS/Linux).
- `SMART_SETUP.ps1` automatically switches to Docker whenever `SMS_ENV=production` or Docker is preferred.
- Access the stack at `http://localhost:8080` (frontend + API proxy).

#### 🔧 Local Development (Native)

- Native execution is reserved for local development and fast iteration.
- Use `.\scripts\dev\run-native.ps1` (PowerShell) or `scripts/dev/run-native.sh` (bash) to start backend (FastAPI) + frontend (Vite).
- Helper scripts set `SMS_ENV=development` automatically; if `SMS_ENV` is `production`, the backend refuses to start natively.
- Access the backend at `http://localhost:8000` and the frontend at `http://localhost:5173`.

#### 🔁 Switching Modes

- Leave `SMS_ENV` unset (or set to `development`) for native workflows.
- Set `SMS_ENV=production` for Docker release workflows—native helpers and the backend will block execution in this mode.
- `SMART_SETUP.ps1`, `SMS.ps1`, and the new helper scripts respect these guards to prevent configuration drift.

### Environment Detection

- `backend/environment.py` provides a single source of truth for runtime detection (development, test, production).
- Production mode is triggered by `SMS_ENV=production`, Docker container heuristics, or explicit CI configuration.
- When production is detected outside Docker, the backend fails fast with a clear error to avoid unsupported native releases.
- Development and test runs default to native execution unless Docker is requested explicitly.

### Common Commands

```powershell
# Start (auto-detects best mode)
.\QUICKSTART.ps1

# Stop everything
.\SMS.ps1 -Stop

# Non-destructive cleanup (keeps data and Docker volumes)
.\CLEANUP.bat

# Full uninstall (removes venv/node_modules & images, keeps data/volumes)
.\UNINSTALL.bat

# Interactive menu (status, diagnostics, restart)
.\SMS.ps1  # then choose from menu
```

---

## ⚠️ Common Issues & Quick Fixes

### "Failed to resolve import i18next" Error

**Cause:** You're accessing the wrong URL for your deployment mode.

**Fix:**

- If using **Docker mode** → Use `http://localhost:8080` (not 5173)
- If using **Native mode** → Run `cd frontend && npm install` then restart

**How to check your mode:**

```powershell
docker ps  # If you see containers → Docker mode (port 8080)
           # If no containers → Native mode (ports 8000 + 5173)
```

### Script Execution Policy Error

**Fix:**

Use the batch wrapper if needed:

```powershell
.\QUICKSTART.bat
```

### Port Already in Use

**Fix:**

```powershell
.\SMS.ps1
# Select option 7: Debug Port Conflicts
```

**See:** [Fresh Deployment Troubleshooting Guide](docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md) for detailed solutions.

---

## 🛠️ For Developers

### Manual Setup (Advanced)

If you prefer manual control:

```powershell
# Intelligent setup (same as ONE-CLICK for first-time)
.\QUICKSTART.ps1

# Force reinstall
.\QUICKSTART.ps1 -Force

# Choose deployment mode
.\QUICKSTART.ps1 -PreferDocker   # Force Docker mode
.\QUICKSTART.ps1 -PreferNative   # Force native mode
```

### Developer Scripts

All complex/developer scripts moved to `scripts/internal/`:

- `CREATE_DEPLOYMENT_PACKAGE.ps1` - Create distribution package
- `INSTALLER.ps1` - Advanced installation options
- `DEVTOOLS.ps1` - Developer operations menu
- `CLEANUP.ps1` - Clean temporary files
- See `scripts/internal/README.md` for full list

**For normal operations, use `QUICKSTART.ps1` or `SMS.ps1` instead.**

---

### 🧪 Testing (Backend)

Always invoke pytest via the same Python interpreter that installed the backend dependencies to avoid environment mismatch (e.g., missing PyJWT leading to router import failures and 404s):

```powershell
cd backend
python -m pytest -q               # run all tests
python -m pytest -q tests/..\*    # run a subset
python -m pytest --cov=backend --cov-report=term-missing
```

Troubleshooting:

- If you see "ModuleNotFoundError: No module named 'jwt'" or many 404s for API routes during tests, you're likely using a different interpreter than the one that has dependencies installed. Run tests with `python -m pytest` (not just `pytest`) from the `backend` folder.
- Health tests intentionally mock DB errors to exercise branches; error logs like "Database health check failed: Connection failed" are expected within those tests.

---

## 📦 Deploying to Other Computers

**Three deployment options:**

1. Copy project → Run `QUICKSTART.ps1` (PowerShell) or `QUICKSTART.bat` (Windows)
2. **Offline Package**: Run `.\scripts\internal\CREATE_DEPLOYMENT_PACKAGE.ps1`, copy ZIP to target
3. **Manual Setup**: Follow [Complete Deployment Guide](DEPLOYMENT_GUIDE.md)

**Documentation:**

- **[Quick Start Guide](docs/QUICK_START_GUIDE.md)** - Fast reference card
- **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Detailed instructions with troubleshooting
- **[Fresh Deployment Troubleshooting](docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md)** - Common issues and fixes

---

## 🎯 What's New in v1.3.8

### Testing & Quality Improvements Release

- ✅ **Enhanced Test Coverage**: Expanded student router tests, imports validation, comprehensive error handling tests
- 🔒 **Structured Error Handling**: Refactored error handling across all routers with consistent patterns
- 🎯 **Backend Coverage Reporting**: Configured comprehensive coverage reporting for backend tests
- 🔧 **CI/CD Enhancements**: Ruff normalization, validation improvements, wheelhouse caching, GitHub Checks API integration
- 🐍 **Python Entrypoint**: Replaced shell entrypoint with robust Python implementation for better error handling
- 🐋 **Docker Improvements**: Enhanced environment configuration, SECRET_KEY handling, path validation for Docker mode

See [RELEASE_NOTES_v1.3.8.md](RELEASE_NOTES_v1.3.8.md) for complete details.

---

## 🎯 What's New in v1.2.0

### For End Users

- ✨ **QUICKSTART.ps1**: Intelligent setup and start (auto-detects mode)
- ✨ **SMS.ps1**: Unified interactive management
- 🎨 **Control Panel UI**: Modern web interface with real-time monitoring
- 📊 **Version Display**: See all component versions (Python, Node, Docker, dependencies)
- 🌍 **Complete Translations**: All features in English and Greek
- 🧹 **Simplified Root**: Only essential files visible
- 🐳 **Docker Priority**: Automatically uses Docker when available for simplest deployment

### Under the Hood

- 🔍 **Intelligent Detection**: Auto-detects system state and required actions
- 🛠️ **Auto-Repair**: Fixes common issues automatically
- 📝 **Better Logging**: Comprehensive logs for troubleshooting
- 🐳 **Docker Priority**: Prefers Docker for stability, falls back to native
- 🔄 **Empty Field Fix**: Proper handling of optional fields in forms

---

A comprehensive student management system with course evaluation, attendance tracking, grade calculation, and performance analytics.

## System Requirements

**Recommended (Docker Mode):**

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- No Python or Node.js required on host

**Alternative (Native Mode):**

- Python 3.11+
- Node.js 18+
- Both modes work equally well!

## Features

- 📚 **Course Management** - Create and manage courses with customizable evaluation rules
- 👥 **Student Management** - Track student information and enrollment
- 📊 **Grade Calculation** - Automatic weighted grade calculation with Greek (0-20) and percentage scales
- 📅 **Attendance Tracking** - Monitor student attendance with absence penalties
- 📈 **Performance Analytics** - Detailed performance reports and trends
- 📆 **Daily Performance** - Track daily student performance with weighted multipliers
- 📤 **Data Export** - Export to Excel, PDF, and ICS calendar formats
- 🌐 **Bilingual** - Full support for English and Greek languages
- 🎨 **Modern UI** - Clean, responsive interface with Tailwind CSS
- 🔐 **Authentication & Authorization** - Optional JWT-based auth with role-based access control (admin/teacher/student) - See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)

## Detailed Usage

### Using SMS.ps1 (Recommended)

The **SMS.ps1** script provides an interactive menu for all operations:

```powershell
.\SMS.ps1
```

**Features:**

- Start/Stop/Restart application (auto-detects Docker vs Native)
- System diagnostics and troubleshooting
- Database backup and restore
- View logs and port usage
- Docker management
- Developer tools access

**Command-line options:**

```powershell
.\SMS.ps1           # Interactive menu
.\SMS.ps1 -Quick    # Quick start
.\SMS.ps1 -Status   # Show system status
.\SMS.ps1 -Stop     # Stop all services
.\SMS.ps1 -Help     # Show help
```

### Using QUICKSTART.ps1 (Simple)

```powershell
.\QUICKSTART.ps1           # Intelligent setup & start
.\QUICKSTART.ps1 -Force    # Force reinstall everything
.\QUICKSTART.ps1 -Help     # Show options
```

This will:

1. Check Docker Desktop is installed and running
2. Ensure Linux containers mode is enabled
3. Build the fullstack Docker image
4. Create the database volume

### Starting the Application

Start with one command:

```powershell
.\QUICKSTART.ps1
```

Or use the management interface:

```powershell
.\SMS.ps1
```

**Automatic Recovery:**

- If Docker image not found → Automatically runs SETUP
- If Docker not running → Shows helpful error message
- If port in use → Shows conflicting containers

The application will be available at <http://localhost:8080>

Startup behavior:

- The frontend now waits for the backend to become healthy before starting (Compose healthcheck + dependency), so you shouldn't see a temporary “offline/failed to connect” banner on first load anymore.
- If the backend is still booting when you open the page, the UI shows a short “Checking…” state and silently retries a few times before showing any offline message.

### Smoke Test (Fast validation)

After startup, you can quickly verify everything with:

```powershell
.\scripts\SMOKE_TEST.ps1
```

What it does:

- Auto-detects mode and base URL (Docker 8080 or Native 8000)
- Checks: /health, /health/ready, /health/live, /control and root page
- Prints concise PASS/FAIL with HTTP status codes

### Stopping the Application

Simple stop:

Use the management script:

```powershell
.\SMS.ps1 -Stop             # Clean stop all services
```

Or the stop helper (compatibility):

```powershell
.\scripts\STOP.ps1          # Stop container
.\scripts\STOP.ps1 -Help    # Show options
```

### Developer Tools & Troubleshooting

For advanced operations, diagnostics, and Docker management, use the unified menu:

```powershell
.\SMS.ps1
# Or advanced tools (optional)
.\scripts\internal\DEVTOOLS.ps1
```

Menu provides:

- Docker operations (build, logs, shell access)
- Diagnostics (port conflicts, API tests, database info)
- Docker Compose (legacy multi-container setup)
- Native development mode (Python + Node.js)
- Cleanup and maintenance tools

### Control Panel (Optional)

When the app is running, access the control panel at:

<http://localhost:8080/control>

Features:

- Start/stop frontend dev server
- System status monitoring
- Service management
- Cleanup and maintenance operations

## Maintenance

### Comprehensive Project Cleanup

Automated cleanup script that removes obsolete files across the entire project, including Docker-related artifacts:

```powershell
.\scripts\internal\CLEANUP_COMPREHENSIVE.ps1
```

**What it cleans:**

1. **Obsolete Components** - Old LanguageToggle component (replaced by LanguageSwitcher)
2. **Obsolete Folders** - Old configs, docs, routers, scripts, tests
3. **Old HTML Files** - Legacy control panels (replaced by React components)
4. **Duplicate Structures** - Redundant sms/ subfolder
5. **Backup Files** - Old .backup files
6. **Old Backups** - Keeps 2 most recent, removes older ones
7. **Python Cache** - `__pycache__` directories
8. **Test Cache** - `.pytest_cache` directories
9. **Build Cache** - Vite and frontend build artifacts
10. **Docker Config** - QNAP-specific files (optional, interactive prompt)
11. **Docker Images** - Reports dangling images (manual cleanup suggested)
12. **Docker Cache** - Reports build cache size (manual cleanup suggested)
13. **Docker Volumes** - Lists SMS-related volumes (manual cleanup suggested)
14. **Dockerfiles** - Verifies all Dockerfile variants are in use

**Docker Cleanup Commands (run manually when needed):**

```powershell
# Remove stopped containers
docker container prune

# Remove dangling images
docker image prune

# Remove build cache
docker builder prune

# Remove unused volumes (CAUTION: may delete data)
docker volume prune

# Remove specific volume
docker volume rm <volume-name>

# Full system cleanup (CAUTION: removes all unused Docker data)
docker system prune -a
```

### Cleanup obsolete files (legacy)

Removes non-essential and outdated documentation files to keep the repository lean.

- From the UI (when backend runs on host): Control Panel → Operations → Cleanup obsolete files
- From Windows host: run the script

```powershell
.\scripts\internal\CLEANUP_OBSOLETE_FILES.ps1
```

Note: When the backend runs inside Docker, it cannot modify files on your host filesystem; use the PowerShell script on the host.

### Update Docker data volume (safe volume rotation)

Creates a new versioned Docker volume for backend data and writes docker-compose.override.yml to switch the backend to the new volume. Optionally migrates data from the current volume. Old volumes are preserved.

Recommended flow:

```powershell
# Create a new versioned volume and migrate existing data
.\scripts\docker\DOCKER_UPDATE_VOLUME.ps1

# Or, create a fresh empty volume (no migration)
.\scripts\docker\DOCKER_UPDATE_VOLUME.ps1 -NoMigrate

# Apply the override
docker compose down
docker compose up -d
```

Reverting: edit or delete docker-compose.override.yml and restart compose. Old volumes are preserved and can be listed with `docker volume ls`.

### Quick Maintenance Scripts (Windows)

For convenience, two top-level batch scripts are included:

- `CLEANUP.bat` — Non-destructive cleanup:
  - Stops Docker services/containers related to this project
  - Clears Python caches, pytest caches, backend logs, frontend build artifacts
  - Preserves data (SQLite `data/student_management.db`) and Docker volumes
  - Automatically backs up the native DB to `./backups/<timestamp>/native/`

- `UNINSTALL.bat` — Full uninstall, preserving your data:
  - Calls CLEANUP first
  - Removes `backend/venv` and `frontend/node_modules`
  - Removes project Docker images (`sms-backend`, `sms-frontend`, legacy `sms-fullstack`) while keeping volumes
  - Keeps all backups in `./backups`

If you truly want to remove the Docker data volume (this deletes your Docker-stored data), run manually:

```powershell
docker volume rm sms_data  # CAUTION: permanent data loss in the volume
```

## Advanced Usage

### Docker Compose (Multi-container)

If you prefer the traditional multi-container setup with NGINX:

```powershell
# Build and start
docker compose build
docker compose up -d

# Stop
docker compose down
```

### Native Development Mode

For development with hot-reload (requires Python 3.11+ and Node.js 18+):

**Backend:**

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend (in separate terminal):**

```powershell
cd frontend
npm install
npm run dev
```

Or use the DEVTOOLS menu for automated setup.

## Project Structure

```text
student-management-system/
├── QUICKSTART.bat / .ps1      # Start application (main entry point)
├── backend/                   # FastAPI backend
│   ├── main.py               # Application entry point
│   ├── models.py             # Database models
│   ├── routers/              # API route handlers
│   └── schemas/              # Pydantic schemas
├── frontend/                  # React frontend
│   └── src/                  # React components & logic
├── docker/                    # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── Dockerfile.fullstack  # Single-container image
├── scripts/                   # Utility scripts
│   ├── SETUP.ps1             # Initial setup utilities
│   ├── STOP.ps1              # Stop containers/processes
│   ├── SMOKE_TEST.ps1        # Quick health validation
│   ├── docker/               # Docker management helpers
│   └── internal/             # Advanced developer tools (optional)
└── tools/                     # Data import/export tools
```

## Documentation

### Available Documentation

- [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) - **Authentication & Authorization guide**
<!-- Removed broken link: FRESH_CLONE_TEST_REPORT_V1.2.md (no longer present) -->
- [docs/DEPLOY.md](docs/DEPLOY.md) - **Deployment guide** ⭐ Updated v1.3.8
- [RELEASE_NOTES_v1.3.8.md](RELEASE_NOTES_v1.3.8.md) - **Release notes for v1.3.8** ⭐ NEW
- [CHANGELOG.md](CHANGELOG.md) - Version history with links to detailed release notes
- [docs/DOCKER_NAMING_CONVENTIONS.md](docs/DOCKER_NAMING_CONVENTIONS.md) - **Docker naming conventions and version management** ⭐ NEW
- [docs/DOCKER_CLEANUP.md](docs/DOCKER_CLEANUP.md) - Docker cleanup procedures
- [docs/LOCALIZATION.md](docs/LOCALIZATION.md) - Internationalization (i18n) guide
- [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) - Security audit and fixes
- [docs/FRONTEND_ASSESSMENT.md](docs/FRONTEND_ASSESSMENT.md) - Frontend architecture assessment
- [docs/DEPENDENCY_UPGRADES.md](docs/DEPENDENCY_UPGRADES.md) - Dependency management
- [docs/QNAP.md](docs/QNAP.md) - QNAP deployment guide
- [docs/SERVERLESS.md](docs/SERVERLESS.md) - Serverless deployment options

## API Documentation

Once the backend is running, access the interactive API documentation:

- Swagger UI: <http://localhost:8080/docs> (Docker) or <http://localhost:8000/docs> (Native)
- ReDoc: <http://localhost:8080/redoc> (Docker) or <http://localhost:8000/redoc> (Native)
- API Info: <http://localhost:8080/api> (Docker) or <http://localhost:8000/api> (Native) — JSON metadata

**Note**: In fullstack mode, the root URL `/` serves the frontend SPA, while API endpoints remain at `/api/v1/*`.

### Academic settings and date range filtering

- Backend setting `SEMESTER_WEEKS` (default 14, allowed 1–52) controls the default window used when only one date bound is provided in queries.
- Supported endpoints accept optional `start_date` and `end_date` query params (ISO date `YYYY-MM-DD`):
  - Attendance: `GET /api/v1/attendance`, `GET /api/v1/attendance/student/{student_id}`, `GET /api/v1/attendance/course/{course_id}`
  - Grades: `GET /api/v1/grades`, `GET /api/v1/grades/student/{student_id}`, `GET /api/v1/grades/course/{course_id}`
- Behavior:
  - Both provided: results within inclusive range from `start_date` to `end_date` (inclusive); if `start_date` > `end_date` → HTTP 400.
  - Only start_date provided: end_date defaults to start_date + (`SEMESTER_WEEKS` × 7) − 1 day.
  - Only end_date provided: start_date defaults to end_date − (`SEMESTER_WEEKS` × 7) + 1 day.
- Grades-specific: pass `use_submitted=true` to filter by `date_submitted` instead of `date_assigned`.

To change the default semester length, set `SEMESTER_WEEKS` in `backend/.env` (see `backend/.env.example`).

## Troubleshooting

### Port Conflicts

Check for port conflicts:

```powershell
.\SMS.ps1
# Then select: Debug Port Conflicts
```

### Docker Issues

Check Docker status:

```powershell
.\SMS.ps1
# Then select: Docker Status/Logs
```

### Database Issues

If you encounter database issues, check the logs:

```powershell
.\SMS.ps1
# Then select: View Logs
```

To reset the database:

```powershell
.\SMS.ps1
# Then select: Database → Reset (Delete Volume)
```

#### Backup, Restore, and Migrate

Use the unified menu for one-click database management:

- Backup: SMS.ps1 → Backup Database (to `./backups`)
- Restore: SMS.ps1 → Restore Database (from `./backups`)
- Migrate: SMS.ps1 → Migrate Compose → Fullstack Volume

Notes:

- Backup saves a timestamped copy of `/data/student_management.db` from the `sms_data` volume to the local `./backups` folder.
- Restore stops the running container (if any) and copies the selected backup back into the `sms_data` volume.
- Migrate copies all data from the legacy compose volume `student-management-system_sms_data` into `sms_data`.

### Frontend Issues

If the frontend isn't loading, try rebuilding:

```powershell
.\QUICKSTART.ps1 -Force
```

## Development

### Backend Development

The backend is built with:

- **FastAPI** - Modern web framework
- **SQLAlchemy** - ORM for database
- **Pydantic** - Data validation
- **Alembic** - Database migrations

### Frontend Development

The frontend uses:

- **React** - UI library
- **JavaScript (JSX)** - Application code
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Support

Need help?

1. Check the in-app Help section (Utils → Help Documentation)
2. Review the documentation files in this repository
3. Access the Control Panel at <http://localhost:8080/control> for system management

## License

See [LICENSE](LICENSE) file for details.

## Version

Current version: See [VERSION](VERSION) file.
