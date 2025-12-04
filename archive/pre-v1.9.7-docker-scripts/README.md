# Archived Docker Helper Scripts

**Archive Date:** December 4, 2025  
**Archive Reason:** Consolidated into DOCKER.ps1 v2.0

## Background

These scripts were internal helpers for Docker operations but are now **fully replaced** by the comprehensive `DOCKER.ps1` script introduced in v1.9.1.

## Migration Guide

| Old Script | New Command | Notes |
|------------|-------------|-------|
| `DOCKER_UP.ps1` | `.\DOCKER.ps1 -Start` | Includes health checks, monitoring |
| `DOCKER_DOWN.ps1` | `.\DOCKER.ps1 -Stop` | Clean shutdown with volume preservation |
| `DOCKER_REFRESH.ps1` | `.\DOCKER.ps1 -UpdateClean` | No-cache rebuild |
| `DOCKER_RUN.ps1` | `.\DOCKER.ps1 -Start` | All options supported via parameters |
| `DOCKER_SMOKE.ps1` | `.\DOCKER.ps1 -Status` | Integrated health checks |
| `DOCKER_UPDATE_VOLUME.ps1` | `.\DOCKER.ps1 -Update` | Automatic backup before update |

## Why Consolidated?

1. **Single Source of Truth:** DOCKER.ps1 provides all functionality with better error handling
2. **Better User Experience:** Comprehensive help, validation, and feedback
3. **Reduced Maintenance:** Bug fixes and features apply to one script
4. **Enhanced Features:** Backup, monitoring, health checks all integrated

## Usage

```powershell
# Old way (deprecated)
.\scripts\deploy\docker\DOCKER_UP.ps1 -Rebuild

# New way (recommended)
.\DOCKER.ps1 -Start

# See all options
.\DOCKER.ps1 -Help
```

## Lines of Code Removed

- **283 lines** of duplicate code eliminated
- **Maintenance complexity** reduced significantly

These scripts are preserved for reference but should **not be used** in production.
