# Deprecated Setup Scripts

**Archived:** November 17, 2025  
**Reason:** Consolidation and simplification of setup workflows

## Scripts Archived

### 1. `FAST_SETUP_DEV.ps1`
**Original Location:** `scripts/FAST_SETUP_DEV.ps1`  
**Replacement:** `scripts/dev/run-native.ps1`  
**Why Deprecated:** 
- Duplicated functionality of `scripts/dev/run-native.ps1` which calls `SMART_SETUP.ps1 -PreferNative`
- Single-purpose script for venv + pre-commit setup
- Native development should use the canonical `scripts/dev/run-native.ps1` entry point

**Migration Path:**
```powershell
# Old
.\scripts\FAST_SETUP_DEV.ps1

# New
.\scripts\dev\run-native.ps1
```

### 2. `SETUP_PRECOMMIT.ps1`
**Original Location:** `scripts/SETUP_PRECOMMIT.ps1`  
**Replacement:** Manual installation or integration into dev workflow  
**Why Deprecated:**
- Single-purpose script that only installs pre-commit hooks
- Should be part of onboarding or run manually when needed
- Not frequently used enough to warrant a dedicated script

**Migration Path:**
```powershell
# Manual installation (when needed)
cd backend
.\.venv\Scripts\Activate.ps1
pip install pre-commit ruff isort
pre-commit install
```

Or add to `scripts/dev/run-native.ps1` if pre-commit setup should be automatic.

### 3. `scripts/deploy/SMART_SETUP.ps1`
**Original Location:** `scripts/deploy/SMART_SETUP.ps1`  
**Replacement:** Root `SMART_SETUP.ps1`  
**Why Deprecated:**
- Duplicate of root-level `SMART_SETUP.ps1` with identical functionality
- Caused confusion about which script to use
- Deployment workflows should use `RUN.ps1` (Docker) or root `SMART_SETUP.ps1`

**Migration Path:**
```powershell
# Old
.\scripts\deploy\SMART_SETUP.ps1

# New (Docker - recommended)
.\RUN.ps1

# New (Advanced setup)
.\SMART_SETUP.ps1
```

### 4. `scripts/internal/INSTALLER.ps1`
**Original Location:** `scripts/internal/INSTALLER.ps1`  
**Replacement:** `RUN.ps1`  
**Why Deprecated:**
- Old installation logic superseded by `RUN.ps1`
- Complex internal implementation details better handled by SMART_SETUP
- No longer referenced or maintained

**Migration Path:**
```powershell
# Old
.\scripts\internal\INSTALLER.ps1

# New
.\RUN.ps1
```

### 5. `scripts/deploy/internal/INSTALLER.ps1`
**Original Location:** `scripts/deploy/internal/INSTALLER.ps1`  
**Replacement:** `RUN.ps1`  
**Why Deprecated:**
- Duplicate installer in deploy directory
- Same reasons as `scripts/internal/INSTALLER.ps1`
- Deployment uses `RUN.ps1` exclusively now

**Migration Path:**
```powershell
# Old
.\scripts\deploy\internal\INSTALLER.ps1

# New
.\RUN.ps1
```

## Current Setup Script Hierarchy

### For End Users (Production/Docker)
```
RUN.ps1                  # ONE-CLICK - Start Docker app (recommended)
  └─> Internally uses Docker Compose with fullstack container
  
SMS.ps1                  # Management - Stop, status, logs, restart
```

### For Developers (Native Mode)
```
scripts/dev/run-native.ps1    # Native development mode
  └─> Calls SMART_SETUP.ps1 -PreferNative
  
SMART_SETUP.ps1              # Advanced setup with options (Docker or Native)
  └─> Handles dependencies, migrations, environment setup
```

### For Maintenance
```
SUPER_CLEAN_AND_DEPLOY.ps1   # Cleanup + optional setup
SMART_BACKEND_TEST.ps1       # Backend test runner with isolated venv
```

### Already Deprecated (in archive/scripts/)
```
scripts/SETUP.ps1            # Old setup (forwards to SMART_SETUP.ps1)
```

## Benefits of Consolidation

1. **Fewer entry points** - Clear which script to use for what purpose
2. **Less duplication** - Single source of truth for setup logic
3. **Easier maintenance** - Fewer scripts to update when requirements change
4. **Better documentation** - Clear hierarchy and usage patterns
5. **Reduced confusion** - No more "which setup script should I use?"

## If You Need These Scripts

These archived scripts are kept for reference only. They are no longer maintained or tested.
If you absolutely need functionality from one of these scripts:

1. Check the migration path above
2. Use the replacement scripts which have the same or better functionality
3. File an issue if the replacement doesn't meet your needs

## Script Usage Matrix (Current)

| Task | Use This Script |
|------|----------------|
| Install & start app (Docker) | `.\RUN.ps1` |
| Install & start app (Native dev) | `.\scripts\dev\run-native.ps1` |
| Stop Docker app | `.\RUN.ps1 -Stop` or `.\SMS.ps1 -Stop` |
| Update Docker app | `.\RUN.ps1 -Update` |
| Check status | `.\RUN.ps1 -Status` or `.\SMS.ps1 -Status` |
| View logs | `.\RUN.ps1 -Logs` or `.\SMS.ps1 -Logs` |
| Advanced setup options | `.\SMART_SETUP.ps1` with flags |
| Clean workspace | `.\SUPER_CLEAN_AND_DEPLOY.ps1` |
| Run backend tests | `.\SMART_BACKEND_TEST.ps1` |
| Install pre-commit hooks | Manual (see SETUP_PRECOMMIT.ps1 section above) |

## See Also

- [Main README.md](../../../README.md) - Project overview and quick start
- [INSTALL.md](../../../INSTALL.md) - Installation guide
- [scripts/README.md](../../scripts/README.md) - Script documentation
- [.github/copilot-instructions.md](../../../.github/copilot-instructions.md) - Developer reference
