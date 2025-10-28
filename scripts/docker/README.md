# Docker Scripts

Docker deployment and management scripts for the Student Management System.

## Docker Compose Operations

- **DOCKER_UP.ps1** - Start Docker Compose services (recommended)
- **DOCKER_DOWN.ps1** - Stop and remove Docker Compose services
- **DOCKER_REFRESH.ps1** - Rebuild and restart Docker Compose
- **DOCKER_SMOKE.ps1** - Quick health check for Docker deployment

## Fullstack Container (Single Container Mode)

- **DOCKER_FULLSTACK_UP.ps1** - Start fullstack container
- **DOCKER_FULLSTACK_DOWN.ps1** - Stop fullstack container
- **DOCKER_FULLSTACK_REFRESH.ps1** - Rebuild fullstack container
- **DOCKER_RUN.ps1** - Advanced Docker startup with mode selection

## Volume Management

- **DOCKER_UPDATE_VOLUME.ps1** - Migrate data between volume configurations

---

## Quick Reference

### Start Docker Application
```powershell
.\docker\DOCKER_UP.ps1
# or use SMS.ps1 for interactive menu
```

### Stop Docker Application
```powershell
.\docker\DOCKER_DOWN.ps1
```

### Rebuild After Code Changes
```powershell
.\docker\DOCKER_REFRESH.ps1
```

---

**Tip:** Use `SMS.ps1` from the root directory for interactive Docker management with guided options.
