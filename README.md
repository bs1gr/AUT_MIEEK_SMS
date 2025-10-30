# Student Management System

[![CI](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml)

## 📚 Documentation / Τεκμηρίωση

- 🇬🇧 **English**: [README.md](README.md) (this file)
- 🇬🇷 **Ελληνικά**: 
  - [⚡ Γρήγορη Εκκίνηση](ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md) - Quick start guide
  - [📖 Πλήρης Οδηγός Χρήσης](ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md) - Complete user manual

---

## 🚀 ONE-CLICK START - For End Users

**NEW v1.2.0**: Universal batch file launcher with Docker-first approach!

### Just Run This:

**Windows (Recommended - Works everywhere!):**
```cmd
START.bat
```

**Or PowerShell (alternative):**
```powershell
.\ONE-CLICK.ps1
```

### Why START.bat is Better:

✅ **Docker-First**: Automatically uses Docker if available (simplest, production-ready)  
✅ **No PowerShell issues**: Works on all Windows versions (7, 8, 10, 11)  
✅ **No execution policy blocks**: Batch files always run  
✅ **No admin rights needed**: Simple double-click  
✅ **Smart fallback**: Uses native mode only if Docker is unavailable

### Deployment Modes:

#### 🐳 Docker Mode (Recommended for End Users)
- **One command** starts everything
- **No version conflicts** - isolated environment
- **Production-ready** - same as deployment
- **Requirement**: Docker Desktop installed
- **Access**: `http://localhost:8080`

#### 🔧 Native Mode (For Developers Only)
- **Hot reload** for code changes
- **Direct debugging** capabilities
- **Requirements**: Python 3.11+ AND Node.js 18+
- **Access**: `http://localhost:5173` (frontend) + `http://localhost:8000` (backend)

The launcher **automatically decides**:

- 🐳 **Docker available?** → Uses Docker (recommended)
- 🔧 **Only Python/Node?** → Falls back to native development mode
- 🆕 **First time?** → Guides installation based on what you have
- 🏃 **Already running?** → Shows URLs and interactive menu

### That's It!

No manual configuration. No complex steps. Just works.

**Quick Access:**
- **Application**: Shown after start (port depends on mode)
- **Control Panel**: `/control` endpoint (real-time monitoring)
- **API Docs**: `/docs` endpoint (Swagger/ReDoc)

### Common Commands

```cmd
# Start (auto-detects best mode)
START.bat

# Stop everything
.\SMS.ps1 -Stop

# Interactive menu (status, diagnostics, restart)
START.bat  # then choose from menu

# Force Docker mode (PowerShell)
docker-compose up -d

# Force native mode (PowerShell - development only)
cd backend && python -m uvicorn backend.main:app --reload
cd frontend && npm run dev
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

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ONE-CLICK.ps1
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

**For normal operations, use `ONE-CLICK.ps1` or `SMS.ps1` instead.**

---

## 📦 Deploying to Other Computers

**Three deployment options:**

1. **ONE-CLICK** (Recommended): Copy project → Run `START.bat` (Windows) or `ONE-CLICK.ps1` (PowerShell)
2. **Offline Package**: Run `scripts/internal/CREATE_DEPLOYMENT_PACKAGE.ps1`, copy ZIP to target
3. **Manual Setup**: Follow [Complete Deployment Guide](DEPLOYMENT_GUIDE.md)

**Documentation:**

- **[Quick Deployment Guide](QUICK_DEPLOYMENT.md)** - Fast reference card
- **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Detailed instructions with troubleshooting
- **[Fresh Deployment Troubleshooting](docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md)** - Common issues and fixes

---

## 🎯 What's New in v1.2.0

### For End Users

- ✨ **START.bat**: Universal Windows launcher with Docker-first approach
- ✨ **ONE-CLICK.ps1**: PowerShell alternative with full diagnostics
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

### Stopping the Application

Simple stop:

```batch
docker stop sms-fullstack
```

Or use the stop script:

```powershell
.\scripts\STOP.ps1                # Stop container
.\STOP.ps1 -RemoveImage   # Stop and remove image
.\STOP.ps1 -Help          # Show options
```

### Developer Tools & Troubleshooting

For advanced operations, diagnostics, and Docker management:

```batch
DEVTOOLS.bat
```

Interactive menu with:

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
scripts/CLEANUP_COMPREHENSIVE.ps1
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
scripts/CLEANUP_OBSOLETE_FILES.ps1
```

Note: When the backend runs inside Docker, it cannot modify files on your host filesystem; use the PowerShell script on the host.

### Update Docker data volume (safe volume rotation)

Creates a new versioned Docker volume for backend data and writes docker-compose.override.yml to switch the backend to the new volume. Optionally migrates data from the current volume. Old volumes are preserved.

Recommended flow:

```powershell
# Create a new versioned volume and migrate existing data
scripts/DOCKER_UPDATE_VOLUME.ps1

# Or, create a fresh empty volume (no migration)
scripts/DOCKER_UPDATE_VOLUME.ps1 -NoMigrate

# Apply the override
docker compose down
docker compose up -d
```

Reverting: edit or delete docker-compose.override.yml and restart compose. Old volumes are preserved and can be listed with `docker volume ls`.


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

For development with hot-reload (requires Python 3.8+ and Node.js 16+):

**Backend:**

```batch
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend (in separate terminal):**

```batch
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
│   ├── SETUP.ps1             # Build Docker image
│   ├── STOP.ps1              # Stop containers
│   ├── DEVTOOLS.ps1          # Developer tools menu
│   └── DOCKER_*.ps1          # Docker management
└── tools/                     # Data import/export tools
```

## Documentation

### Available Documentation

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

- Swagger UI: <http://localhost:8080/docs>
- ReDoc: <http://localhost:8080/redoc>
- API Info: <http://localhost:8080/api> (JSON metadata)

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

```batch
DEVTOOLS.bat
# Then select option 7: Debug Port Conflicts
```

### Docker Issues

Check Docker status:

```batch
DEVTOOLS.bat
# Then select option 6: Check Docker Status
```

### Database Issues

If you encounter database issues, check the logs:

```batch
DEVTOOLS.bat
# Then select option 2: View Container Logs
```

To reset the database:

```batch
DEVTOOLS.bat
# Then select option R: Reset Database (Delete Volume)
```

#### Backup, Restore, and Migrate

Use the Developer Tools menu for one-click database management:

- Backup: DEVTOOLS → `[B]` Backup Database (to `./backups`)
- Restore: DEVTOOLS → `[T]` Restore Database (from `./backups`)
- Migrate: DEVTOOLS → `[M]` Migrate Compose → Fullstack Volume

Notes:

- Backup saves a timestamped copy of `/data/student_management.db` from the `sms_data` volume to the local `./backups` folder.
- Restore stops the running container (if any) and copies the selected backup back into the `sms_data` volume.
- Migrate copies all data from the legacy compose volume `student-management-system_sms_data` into `sms_data`.

### Frontend Issues

If the frontend isn't loading, try rebuilding:

```batch
.\QUICKSTART.bat -Rebuild
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
- **TypeScript** - Type safety
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
