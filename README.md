# Student Management System

[![CI](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml)

## How to run

- **Quick start (fullstack Docker container)**:

```batch
QUICKSTART.bat
```

Runs the single-container fullstack image on http://localhost:8080 (build via `UTILITIES.bat` → Install if needed).

- **Utilities & troubleshooting**:

```batch
UTILITIES.bat
```

Provides install, diagnostics, Docker operations, and more.

A comprehensive student management system with course evaluation, attendance tracking, grade calculation, and performance analytics.

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

## Quick Start

### Option 1: Quick Start (Recommended)

Run the fullstack Docker container:

```batch
QUICKSTART.bat
```

This starts the single-container fullstack image on <http://localhost:8080>. If the image doesn't exist, build it first via `UTILITIES.bat` → Install.

Or with options:

```powershell
.\QUICKSTART.ps1              # Start fullstack on port 8080
.\QUICKSTART.ps1 -Rebuild     # Rebuild image and start
.\QUICKSTART.ps1 -Port 9000   # Start on custom port
.\QUICKSTART.ps1 -Help        # Show all options
```

### Option 2: Utilities & Troubleshooting

For diagnostics, installation, cleanup, and Docker management:

```batch
UTILITIES.bat
```

Provides interactive menu for:

- Install/update dependencies
- System health checks
- Port conflict debugging
- Docker operations (up/down/fullstack)
- Deployment packaging
- Version info and more

### Option 3: Direct Commands

```batch
# First time installation
INSTALL.bat

# Start the application
RUN.bat

# Stop the application
STOP.bat
```

### Option 4: Docker (Single-host, production-like)

If you have Docker installed, you can build and run the app with one command and access it at <http://localhost:8080>.

```pwsh
# From project root
docker compose build
docker compose up -d

# Or use helper scripts on Windows
./scripts/DOCKER_UP.ps1
```

Stop containers:

```pwsh
docker compose down

# Or helper script
./scripts/DOCKER_DOWN.ps1
```

See DOCKER.md for full details.

#### Fullstack (single container)

Alternatively, build the fullstack image where the backend serves the SPA:

```pwsh
docker build -f docker/Dockerfile.fullstack -t sms-fullstack .
docker run --rm -p 8080:8000 sms-fullstack
# open http://localhost:8080
```

On Windows, you can also use the helper scripts or the launcher menu:

```pwsh
./scripts/DOCKER_FULLSTACK_UP.ps1            # start (use existing image)
./scripts/DOCKER_FULLSTACK_UP.ps1 -Rebuild   # rebuild then start
./scripts/DOCKER_FULLSTACK_DOWN.ps1          # stop (and optionally remove image)
```
Launcher options: F (Fullstack Up), G (Fullstack Down).

## System Requirements

- **Python** 3.8 or higher
- **Node.js** 16 or higher
- **npm** 8 or higher
- **Windows** operating system

## Installation

1. Run the installer:
   ```batch
   INSTALL.bat
   ```

2. The installer will automatically:
   - Create Python virtual environment
   - Install backend dependencies
   - Install frontend dependencies
   - Create necessary directories
   - Set up the database

For detailed installation instructions, see [INSTALL_GUIDE.md](INSTALL_GUIDE.md)

## Usage

### Starting the Application

```batch
RUN.bat
```

This will start:

- Backend server on <http://localhost:8000>
- Frontend development server on <http://localhost:5173>

The application will automatically open in your default browser.

### Control Panel (Lightweight Mode)

The **HTML Control Panel** provides a browser-based interface to manage the application:

- **Access**: <http://localhost:8000/control> (backend must be running)
- **Features**:
  - Real-time backend and frontend status
  - Start/stop frontend on demand
  - Start/stop backend
  - Quick links to open the app, API docs, and ReDoc
- **Launching Control Panel Only**:
  - Run `\.\QUICKSTART.ps1 -ControlOnly`, or
  - Run `\.\scripts\RUN.ps1 -ControlOnly`
  - This starts the backend, opens the control panel in your browser, and exits the script immediately
  - Ideal for minimal, safe runs without long-running terminal processes

**Use cases**:

- Quick status checks
- On-demand frontend starts (no permanent terminal windows)
- Safer than full automatic startup for testing or demos
- Clean exit after starting services

### Stopping the Application

```batch
STOP.bat
```

This will gracefully shut down both frontend and backend servers.

### Emergency Shutdown

If normal shutdown fails:

```batch
.\scripts\KILL_FRONTEND_NOW.bat
```

Or use option 3 in the launcher menu.

## Project Structure

```
student-management-system/
├── backend/                 # FastAPI backend
│   ├── main.py             # Application entry point
│   ├── models.py           # Database models
│   ├── config.py           # Configuration
│   ├── routers/            # API route handlers
│   ├── schemas/            # Pydantic schemas
│   └── migrations/         # Alembic migrations
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/            # API client
│   │   ├── utils/          # Utility functions
│   │   └── translations.js # Localization
│   └── public/
├── scripts/                # Utility scripts
│   ├── INSTALL.ps1
│   ├── RUN.ps1
│   ├── STOP.ps1
│   ├── DEBUG_PORTS.ps1
│   ├── CLEANUP.ps1
│   └── CREATE_PACKAGE.ps1
├── QUICKSTART.bat          # Minimal quick start
├── UTILITIES.bat           # Utilities & troubleshooting menu
├── INSTALL.bat             # Quick installer
├── RUN.bat                 # Quick start
└── STOP.bat                # Quick stop
```

## Documentation

- [Installation Guide](INSTALL_GUIDE.md) - Detailed installation instructions
- [Help Documentation](HELP_DOCUMENTATION_COMPLETE.md) - Complete feature documentation
- [Code Improvements](CODE_IMPROVEMENTS.md) - Code quality analysis
- [Daily Performance Guide](DAILY_PERFORMANCE_GUIDE.md) - Daily performance feature guide
- [Teaching Schedule Guide](TEACHING_SCHEDULE_GUIDE.md) - Schedule management guide

## API Documentation

Once the backend is running, access the interactive API documentation:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- API Info: <http://localhost:8000/api> (JSON metadata)

**Note**: When running in fullstack mode (single Docker container), the root URL `/` serves the frontend SPA, while API endpoints remain at `/api/v1/*`. Use `/api` to view API metadata as JSON.

## Troubleshooting

### Port Conflicts

Check for port conflicts:
```batch
.\scripts\DEBUG_PORTS.bat
```

### System Health Check

Verify all dependencies are installed:
```batch
LAUNCHER.bat
# Then select option 5: Check System Health
```

### Database Issues

If you encounter database issues, check the logs:
```
backend/logs/structured.json
```

### Frontend Issues

Clear node_modules and reinstall:
```batch
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```

## Development

### Backend Development

```bash
cd backend
# Activate virtual environment
..\venv\Scripts\Activate.ps1
# Run with auto-reload
uvicorn main:app --reload --port 8000
```

### Frontend Development

```bash
cd frontend
npm run dev
```

## Testing

Run backend tests:
```bash
cd backend
..\venv\Scripts\Activate.ps1
pytest
```

## Building for Production

Create a deployment package:
```batch
.\scripts\CREATE_PACKAGE.bat
```

This creates a `student-management-system-deploy-{date}.zip` file ready for deployment.

## Technology Stack

### Backend
- **FastAPI** - Modern web framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation
- **SQLite** - Database
- **Uvicorn** - ASGI server

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS
- **lucide-react** - Icon library

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For help and documentation:
1. Check the in-app Help section (Utils → Help Documentation)
2. Review the [Help Documentation](HELP_DOCUMENTATION_COMPLETE.md)
3. Check the [Installation Guide](INSTALL_GUIDE.md)

## Contributing

This is a student management system designed for educational institutions. For feature requests or bug reports, please create an issue.

## Version

Current Version: 1.0.0
Last Updated: October 2025
