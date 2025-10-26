# Student Management System

[![CI](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml)

## Quick Start (3 Easy Steps)

**1. First time setup:**

```batch
SETUP.bat
```

This builds the Docker image (one-time setup, takes a few minutes).

**2. Start the application:**

```batch
QUICKSTART.bat
```

Access at <http://localhost:8080>

**3. Stop the application:**

```batch
STOP.bat
```

A comprehensive student management system with course evaluation, attendance tracking, grade calculation, and performance analytics.

## System Requirements

- **Docker Desktop** (Windows/macOS) or Docker Engine (Linux)
- No Python or Node.js required on host (everything runs in Docker)

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

### First Time Setup

Run the setup script to build the Docker image:

```batch
SETUP.bat
```

Or with PowerShell:

```powershell
.\SETUP.ps1              # Build image
.\SETUP.ps1 -SkipBuild   # Check environment only
.\SETUP.ps1 -Help        # Show options
```

This will:

1. Check Docker Desktop is installed and running
2. Ensure Linux containers mode is enabled
3. Build the fullstack Docker image
4. Create the database volume

### Starting the Application

After setup, start the app with:

```batch
QUICKSTART.bat
```

Or with options:

```powershell
.\QUICKSTART.ps1              # Start on port 8080
.\QUICKSTART.ps1 -Rebuild     # Rebuild image and start
.\QUICKSTART.ps1 -Port 9000   # Use custom port
.\QUICKSTART.ps1 -Help        # Show all options
```

The application will be available at <http://localhost:8080>

### Stopping the Application

```batch
STOP.bat
```

Or with options:

```powershell
.\STOP.ps1                # Stop container
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

See [CONTROL_PANEL_GUIDE.md](CONTROL_PANEL_GUIDE.md) for details.

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

See [DOCKER.md](DOCKER.md) for full Docker documentation.

### Native Development Mode

For development with hot-reload (requires Python 3.8+ and Node.js 16+):

```batch
# Setup (first time)
.\Obsolete\native_scripts\INSTALL.bat

# Start backend + frontend
.\Obsolete\native_scripts\RUN.bat

# Stop
.\scripts\STOP.ps1
```

Or use the DEVTOOLS menu → Native Dev Mode.

## Project Structure

```text
student-management-system/
├── SETUP.bat / .ps1           # First-time setup
├── QUICKSTART.bat / .ps1      # Start application
├── STOP.bat / .ps1            # Stop application
├── DEVTOOLS.bat / .ps1        # Developer tools menu
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
├── docker-compose.yml         # Multi-container setup
└── scripts/                   # Utility scripts
```

## Documentation

- [DOCKER.md](DOCKER.md) - Docker setup and configuration
- [CONTROL_PANEL_GUIDE.md](CONTROL_PANEL_GUIDE.md) - Control panel usage
- [SESSION_SUMMARY.md](SESSION_SUMMARY.md) - Development session notes
- [CHANGELOG.md](CHANGELOG.md) - Version history

## API Documentation

Once the backend is running, access the interactive API documentation:

- Swagger UI: <http://localhost:8080/docs>
- ReDoc: <http://localhost:8080/redoc>
- API Info: <http://localhost:8080/api> (JSON metadata)

**Note**: In fullstack mode, the root URL `/` serves the frontend SPA, while API endpoints remain at `/api/v1/*`.

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
3. Check [CONTROL_PANEL_GUIDE.md](CONTROL_PANEL_GUIDE.md) for control panel usage

## License

See [LICENSE](LICENSE) file for details.

## Version

Current version: See [VERSION](VERSION) file.
