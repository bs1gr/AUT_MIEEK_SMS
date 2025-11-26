# Scripts Consolidation Guide - v2.0

**Version:** 2.0  
**Date:** November 25, 2025  
**Status:** Active Migration Guide

---

## Overview

The Student Management System underwent a comprehensive script consolidation in v2.0, reducing complexity and improving maintainability.

### Key Changes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Main Entry Points** | 6 scripts | 2 scripts | 67% reduction |
| **Lines of Code** | 4,181 | 1,900 | 54% reduction |
| **Docker Scripts** | Multiple files | Single DOCKER.ps1 | Unified |
| **Native Scripts** | Multiple files | Single NATIVE.ps1 | Unified |
| **Feature Parity** | 100% | 100% | Maintained |

---

## 🚀 Quick Migration

### For Docker Users (Production/Staging)

```powershell
# Old Way
.\RUN.ps1                    # Start application
.\RUN.ps1 -Update            # Update application
.\INSTALL.ps1                # First-time install
.\SMS.ps1 -Stop              # Stop application
.\DEEP_DOCKER_CLEANUP.ps1    # Clean Docker

# New Way (v2.0)
.\DOCKER.ps1 -Start          # Start application (default)
.\DOCKER.ps1 -Update         # Update application
.\DOCKER.ps1 -Install        # First-time install
.\DOCKER.ps1 -Stop           # Stop application
.\DOCKER.ps1 -DeepClean      # Clean Docker
```

### For Developers (Native Mode)

```powershell
# Old Way
.\scripts\dev\run-native.ps1              # Start dev mode
.\SMS.ps1 -Start -Native                  # Alternative start
.\scripts\operator\KILL_FRONTEND_NOW.ps1  # Kill processes
.\scripts\CLEANUP_TEMP.ps1                # Clean artifacts

# New Way (v2.0)
.\NATIVE.ps1 -Start          # Start dev mode
.\NATIVE.ps1 -Backend        # Backend only
.\NATIVE.ps1 -Frontend       # Frontend only
.\NATIVE.ps1 -Stop           # Stop cleanly
.\NATIVE.ps1 -Clean          # Clean artifacts
```

---

## 📋 Complete Migration Table

### Main Entry Points

| Old Script | New Command | Purpose |
|------------|-------------|---------|
| `RUN.ps1` | `DOCKER.ps1 -Start` | Start Docker deployment |
| `RUN.ps1 -Update` | `DOCKER.ps1 -Update` | Fast update |
| `RUN.ps1 -Clean` | `DOCKER.ps1 -UpdateClean` | Clean rebuild |
| `INSTALL.ps1` | `DOCKER.ps1 -Install` | First-time installation |
| `SMS.ps1 -Start` (Docker) | `DOCKER.ps1 -Start` | Start Docker |
| `SMS.ps1 -Start` (Native) | `NATIVE.ps1 -Start` | Start native dev |
| `SMS.ps1 -Stop` | `DOCKER.ps1 -Stop` or `NATIVE.ps1 -Stop` | Stop application |
| `SMS.ps1 -Status` | `DOCKER.ps1 -Status` or `NATIVE.ps1 -Status` | Check status |
| `SUPER_CLEAN_AND_DEPLOY.ps1` | `DOCKER.ps1 -UpdateClean` | Clean update |
| `DEEP_DOCKER_CLEANUP.ps1` | `DOCKER.ps1 -DeepClean` | Docker cleanup |

### Native Development Scripts

| Old Script | New Command | Purpose |
|------------|-------------|---------|
| `scripts\dev\run-native.ps1` | `NATIVE.ps1 -Start` | Start dev mode |
| `scripts\operator\KILL_FRONTEND_NOW.ps1` | `NATIVE.ps1 -Stop` | Stop processes |
| `scripts\CLEANUP_TEMP.ps1` | `NATIVE.ps1 -Clean` | Clean artifacts |
| `scripts\REMOVE_PREVIEW_AND_DIST.ps1` | `NATIVE.ps1 -Clean` | Clean build dirs |

### Docker Helper Scripts

| Old Script | New Command | Purpose |
|------------|-------------|---------|
| `scripts\docker\DOCKER_FULLSTACK_UP.ps1` | `DOCKER.ps1 -Start` | Start container |
| `scripts\docker\DOCKER_FULLSTACK_DOWN.ps1` | `DOCKER.ps1 -Stop` | Stop container |
| `scripts\docker\DOCKER_FULLSTACK_REFRESH.ps1` | `DOCKER.ps1 -Update` | Update container |
| `scripts\docker\DOCKER_RUN.ps1` | `DOCKER.ps1 -Start` | Run Docker |
| `scripts\docker\DOCKER_UP.ps1` | `DOCKER.ps1 -Start` | Start services |
| `scripts\docker\DOCKER_DOWN.ps1` | `DOCKER.ps1 -Stop` | Stop services |

---

## 🆕 New Features in v2.0

### DOCKER.ps1 Enhancements

```powershell
# New monitoring integration
.\DOCKER.ps1 -WithMonitoring     # Start with Grafana/Prometheus

# Enhanced backup system
.\DOCKER.ps1 -Backup             # Manual backup

# Improved cleanup options
.\DOCKER.ps1 -Prune              # Safe cleanup
.\DOCKER.ps1 -PruneAll           # Aggressive cleanup  
.\DOCKER.ps1 -DeepClean          # Nuclear option

# Better diagnostics
.\DOCKER.ps1 -Status             # Detailed status
.\DOCKER.ps1 -Logs               # Follow logs
.\DOCKER.ps1 -Shell              # Enter container

# Monitoring control
.\DOCKER.ps1 -StopMonitoring     # Stop monitoring only
```

### NATIVE.ps1 Enhancements

```powershell
# Individual service control
.\NATIVE.ps1 -Backend            # Backend only
.\NATIVE.ps1 -Frontend           # Frontend only

# Improved setup
.\NATIVE.ps1 -Setup              # Install/update dependencies

# Better status reporting
.\NATIVE.ps1 -Status             # Show running processes

# Enhanced cleanup
.\NATIVE.ps1 -Clean              # Remove artifacts
.\NATIVE.ps1 -DeepClean          # Full cleanup (future)
```

---

## 📁 Scripts Directory Structure

### Current Organization (v2.0)

```text
D:\SMS\student-management-system\
├── DOCKER.ps1                      # ✅ Main Docker script
├── NATIVE.ps1                      # ✅ Main native script
├── COMMIT_PREP.ps1                 # ✅ Git commit automation
├── PRE_COMMIT_CHECK.ps1            # ✅ Pre-commit validation
├── CREATE_DESKTOP_SHORTCUT.ps1     # ✅ Desktop shortcut
├── DOCKER_TOGGLE.ps1               # ✅ Docker toggle (VBS launcher)
│
├── config/                         # ⚙️  Configuration files
│   ├── mypy.ini                    # Type checking
│   ├── pytest.ini                  # Testing
│   └── ruff.toml                   # Linting
│
├── docker/                         # 🐳 Docker configuration
│   ├── docker-compose.yml          # Main compose file
│   ├── docker-compose.prod.yml     # Production
│   ├── docker-compose.qnap.yml     # QNAP NAS
│   └── docker-compose.monitoring.yml # Monitoring stack
│
└── scripts/
    ├── README.md                   # Scripts documentation
    ├── SMOKE_TEST.ps1              # Quick health check
    ├── VERIFY_VERSION.ps1          # Version management
    ├── CHECK_VOLUME_VERSION.ps1    # DB version check
    ├── SETUP.ps1                   # Legacy setup (use DOCKER.ps1 -Install)
    ├── STOP.ps1                    # Legacy stop (use DOCKER.ps1 -Stop)
    ├── internal/                   # Internal utilities (advanced)
    │   ├── DEBUG_PORTS.ps1         # Port diagnostics
    │   ├── DIAGNOSE_FRONTEND.ps1   # Frontend diagnostics
    │   ├── DIAGNOSE_STATE.ps1      # System state analysis
    │   ├── KILL_FRONTEND_NOW.ps1   # Emergency kill (use NATIVE.ps1 -Stop)
    │   └── CLEANUP_*.ps1           # Various cleanup scripts
    ├── docker/                     # Docker helpers (internal)
    │   └── DOCKER_*.ps1            # Low-level Docker scripts
    ├── dev/                        # Development tools
    │   └── internal/               # Dev utilities
    ├── deploy/                     # Deployment scripts
    │   └── docker/                 # Deployment Docker scripts
    ├── ops/                        # Operations (GitHub releases, etc.)
    ├── maintenance/                # Maintenance tasks
    └── ci/                         # CI/CD scripts
```

### Archived Scripts

Location: `archive/deprecated/scripts_consolidation_2025-11-21/`

- `RUN.ps1`
- `INSTALL.ps1`
- `SMS.ps1`
- `SUPER_CLEAN_AND_DEPLOY.ps1`
- `DEEP_DOCKER_CLEANUP.ps1`
- `SETUP_AFTER_GITHUB_ZIP.ps1`
- `SMART_BACKEND_TEST.ps1`
- `archive_deprecated_files.ps1`
- `scripts/dev/run-native.ps1`
- `scripts/operator/KILL_FRONTEND_NOW*.ps1`
- `scripts/CLEANUP_TEMP.ps1`
- `scripts/cleanup-artifacts.ps1`
- `scripts/REMOVE_PREVIEW_AND_DIST.ps1`

---

## 🔄 Migration Strategy

### Phase 1: Learn New Commands (Immediate)

1. Replace `RUN.ps1` with `DOCKER.ps1 -Start`
2. Replace `INSTALL.ps1` with `DOCKER.ps1 -Install`
3. Replace `run-native.ps1` with `NATIVE.ps1 -Start`

### Phase 2: Update Automation (Week 1)

1. Update CI/CD pipelines
2. Update deployment scripts
3. Update documentation references

### Phase 3: Training (Week 2)

1. Team training on new commands
2. Update runbooks
3. Update operational procedures

---

## 🛠️ Troubleshooting

### Q: My old script doesn't work anymore

**A:** Check the migration table above. All functionality is preserved in either `DOCKER.ps1` or `NATIVE.ps1`.

### Q: Can I still use the old scripts?

**A:** Yes, they're archived in `archive/deprecated/scripts_consolidation_2025-11-21/`. However, they won't receive updates.

### Q: How do I report bugs in the new scripts?

**A:** Create a GitHub issue with:

- Command you ran
- Expected behavior
- Actual behavior
- Error messages

### Q: Where's the old SMS.ps1 menu?

**A:** The menu functionality is now split:

- Docker operations → `DOCKER.ps1` (use `-Help` for options)
- Native operations → `NATIVE.ps1` (use `-Help` for options)

### Q: How do I see all available options?

**A:** Run with `-Help`:

```powershell
.\DOCKER.ps1 -Help    # Docker options
.\NATIVE.ps1 -Help    # Native options
```

---

## 📖 Additional Resources

### Documentation

- **User Guide:** `docs/user/QUICK_START_GUIDE.md`
- **Developer Guide:** `docs/development/DEVELOPER_GUIDE_COMPLETE.md`
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Scripts Reference:** `scripts/README.md`

### Help Commands

```powershell
# Show all Docker options
.\DOCKER.ps1 -Help

# Show all Native options
.\NATIVE.ps1 -Help

# Check application status
.\DOCKER.ps1 -Status

# Check script versions
Get-Content VERSION
```

---

## 📊 Consolidation Statistics

### Before Consolidation (v1.x)

- **Main Scripts:** 6 (RUN.ps1, INSTALL.ps1, SMS.ps1, etc.)
- **Lines of Code:** 4,181
- **Docker Scripts:** 15+ files
- **Native Scripts:** 10+ files
- **Maintenance Cost:** High (overlapping functionality)

### After Consolidation (v2.0)

- **Main Scripts:** 2 (DOCKER.ps1, NATIVE.ps1)
- **Lines of Code:** 1,900 (54% reduction)
- **Docker Scripts:** Consolidated into DOCKER.ps1
- **Native Scripts:** Consolidated into NATIVE.ps1
- **Maintenance Cost:** Low (single source of truth)

### Benefits

✅ **Simplified Learning Curve** - Two main scripts instead of six  
✅ **Reduced Code Duplication** - 54% less code to maintain  
✅ **Improved Consistency** - Unified command patterns  
✅ **Better Error Handling** - Centralized error management  
✅ **Enhanced Features** - Monitoring, better cleanup, improved diagnostics  
✅ **100% Feature Parity** - All old functionality preserved  

---

## 🔮 Future Roadmap

### v2.1 (Planned)

- [ ] Add `DOCKER.ps1 -Rollback` for version rollback
- [ ] Add `NATIVE.ps1 -Test` for automated testing
- [ ] Improve `NATIVE.ps1 -Status` with process health

### v2.2 (Planned)

- [ ] Add `DOCKER.ps1 -Scale` for container scaling
- [ ] Add `NATIVE.ps1 -Profile` for performance profiling
- [ ] Cross-platform support (Linux/Mac bash equivalents)

---

## 📞 Support

- **Documentation:** `docs/DOCUMENTATION_INDEX.md`
- **Issues:** GitHub Issues
- **Quick Help:** `.\DOCKER.ps1 -Help` or `.\NATIVE.ps1 -Help`

---

**Last Updated:** November 25, 2025  
**Version:** 2.0  
**Maintained By:** Development Team
