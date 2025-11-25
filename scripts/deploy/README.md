# End-User / DevOps Deployment Scripts

This directory contains scripts for **deployment, Docker orchestration, and production maintenance**.

## Target Audience

End-users, system administrators, and DevOps engineers deploying and managing the application.

## Scripts



### Primary Entry Points (v1.5.0+)

- `DOCKER.ps1` (root) - Canonical one-click Docker deployment (recommended for all users)
- `NATIVE.ps1` (root) - Native development mode

> **Note:** As of v2.0, use `..\..\DOCKER.ps1` for Docker deployment. Legacy scripts were archived under `archive/deprecated/scripts_consolidation_2025-11-21/`.



### Docker Operations (Advanced)

- `DOCKER_UP.ps1`, `DOCKER_DOWN.ps1`, etc. - Advanced/legacy scripts (use `DOCKER.ps1` for most operations; direct use is discouraged)

### Database & Volume Management

- `CHECK_VOLUME_VERSION.ps1` - Check Docker volume schema version

### Packaging & Distribution

- `CREATE_PACKAGE.ps1/.bat` - Create distribution package
- `CREATE_DEPLOYMENT_PACKAGE.ps1/.bat` - Create deployment-ready package
- `INSTALLER.ps1/.bat` - Installer for end-users

### Metadata & Versioning

- `set-docker-metadata.ps1` - Set Docker image metadata



### Usage Patterns

#### Fullstack Docker (Recommended)

```powershell
# Start (one-click, v2.0+)
pwsh -NoProfile -File ..\..\DOCKER.ps1 -Start

# Stop containers
pwsh -NoProfile -File ..\..\DOCKER.ps1 -Stop
```

### Linux Helpers (Bash)

On Linux, you can use the helper scripts for a consistent setup:

```bash
# Validate environment (Docker, Python, Node, pwsh, env files)
./scripts/linux_env_check.sh
./scripts/linux_env_check.sh --fix   # optional safe fixes (.env and folders)

# Start in Docker release mode (recommended on Linux)
./scripts/deploy/run-docker-release.sh
```

If pwsh isn't installed, you can fall back to plain Docker:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```


### Maintenance

```powershell
# Check volume version compatibility
.\CHECK_VOLUME_VERSION.ps1

# Stop all services
pwsh -NoProfile -File ..\..\DOCKER.ps1 -Stop
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

- `DOCKER.ps1` is the recommended entry point for Docker deployments as of v2.0
- All other setup/start scripts (SMART_SETUP.ps1, run-docker-release.ps1, etc.) are deprecated or removed
- Docker mode is recommended for production deployments
- Native mode requires Python 3.11+ and Node.js 18+ (see scripts/dev/)
- All scripts support both Windows and cross-platform usage
- For active development, use scripts in `../dev/` instead
