# End-User / DevOps Deployment Scripts

This directory contains scripts for **deployment, Docker orchestration, and production maintenance**.

## Target Audience

End-users, system administrators, and DevOps engineers deploying and managing the application.

## Scripts

### Primary Entry Points

- `SMART_SETUP.ps1` - Intelligent setup and deployment (auto-detects environment)
- `STOP.ps1/.bat` - Stop all running services
- `UNINSTALL.bat` - Complete uninstallation

### Docker Operations

- `DOCKER_UP.ps1` - Start Docker containers
- `DOCKER_DOWN.ps1` - Stop Docker containers
- `DOCKER_RUN.ps1` - Run Docker in interactive mode
- `DOCKER_REFRESH.ps1` - Rebuild and restart containers
- `DOCKER_SMOKE.ps1` - Smoke test Docker deployment
- `DOCKER_UPDATE_VOLUME.ps1` - Update Docker volumes
- `DOCKER_FULLSTACK_*.ps1` - Fullstack Docker operations

### Database & Volume Management

- `CHECK_VOLUME_VERSION.ps1` - Check Docker volume schema version

### Packaging & Distribution

- `CREATE_PACKAGE.ps1/.bat` - Create distribution package
- `CREATE_DEPLOYMENT_PACKAGE.ps1/.bat` - Create deployment-ready package
- `INSTALLER.ps1/.bat` - Installer for end-users

### Metadata & Versioning

- `set-docker-metadata.ps1` - Set Docker image metadata

## Usage Patterns

### First-Time Deployment

```powershell
# Smart setup (auto-detects Docker/Native)
.\SMART_SETUP.ps1

# Or Docker-specific setup
.\SMART_SETUP.ps1 -PreferDocker
```

### Docker Deployment

```powershell
# Start containers
.\DOCKER_UP.ps1

# Rebuild and refresh
.\DOCKER_REFRESH.ps1

# Stop containers
.\DOCKER_DOWN.ps1
```

### Maintenance

```powershell
# Check volume version compatibility
.\CHECK_VOLUME_VERSION.ps1

# Stop all services
.\STOP.ps1

# Complete uninstall
.\UNINSTALL.bat
```

### Creating Distribution Packages

```powershell
# Create deployment package
.\CREATE_DEPLOYMENT_PACKAGE.ps1

# Create installer
.\INSTALLER.ps1
```

## Docker Volume Management

The system uses versioned Docker volumes to prevent data loss:

- Volume names include version numbers (e.g., `sms_data_v1.2.3`)
- `CHECK_VOLUME_VERSION.ps1` detects schema mismatches
- Automatic migration available when upgrading versions

## Notes

- `SMART_SETUP.ps1` is the recommended entry point for most users
- Docker mode is recommended for production deployments
- Native mode requires Python 3.11+ and Node.js 18+
- All scripts support both Windows and cross-platform usage
- For active development, use scripts in `../dev/` instead
