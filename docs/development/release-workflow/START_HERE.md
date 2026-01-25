# Student Management System - Post-Installation Setup

Welcome to the Student Management System! This guide will help you get started.

## Quick Start

### For Docker Users (Recommended)

```powershell
# Start the application

.\DOCKER.ps1 -Start

# Access the application

Start-Process "http://localhost:8080"

```text
### For Development Users

```powershell
# Install dependencies (first time only)

.\NATIVE.ps1 -Setup

# Start both backend and frontend

.\NATIVE.ps1 -Start

# Access the application

Start-Process "http://localhost:5173"

```text
## Configuration

1. **Backend Configuration**: Edit `backend/.env` for database and API settings
2. **Frontend Configuration**: Edit `frontend/.env` for API endpoint
3. **Docker Configuration**: See `docker/docker-compose.yml` for container settings

## Default Credentials

- **Username**: admin
- **Password**: (Set during first run)

## Documentation

- Full documentation: See `docs/DOCUMENTATION_INDEX.md`
- User guide: See `docs/user/QUICK_START_GUIDE.md`
- Developer guide: See `docs/development/ARCHITECTURE.md`

## Support

For issues and questions, please refer to the documentation or create an issue on GitHub.

---

**Version**: 1.14.0
**Last Updated**: December 29, 2025
