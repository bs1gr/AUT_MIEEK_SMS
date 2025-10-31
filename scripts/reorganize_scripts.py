#!/usr/bin/env python3
"""
Script Reorganization Utility
Restructures operational scripts into dev/ and deploy/ directories
"""
import os
import shutil
from pathlib import Path

# Define the root directory
ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"

# Define source-to-destination mappings
RESTRUCTURE_PLAN = {
    # Developer scripts -> scripts/dev/
    "dev": {
        "CLEANUP.bat": ROOT / "CLEANUP.bat",
        "SMOKE_TEST.ps1": SCRIPTS_DIR / "SMOKE_TEST.ps1",
        "debug_import_control.py": SCRIPTS_DIR / "debug_import_control.py",
        "internal/DEBUG_PORTS.ps1": SCRIPTS_DIR / "internal/DEBUG_PORTS.ps1",
        "internal/DEBUG_PORTS.bat": SCRIPTS_DIR / "internal/DEBUG_PORTS.bat",
        "internal/DIAGNOSE_STATE.ps1": SCRIPTS_DIR / "internal/DIAGNOSE_STATE.ps1",
        "internal/DIAGNOSE_FRONTEND.ps1": SCRIPTS_DIR / "internal/DIAGNOSE_FRONTEND.ps1",
        "internal/DIAGNOSE_FRONTEND.bat": SCRIPTS_DIR / "internal/DIAGNOSE_FRONTEND.bat",
        "internal/KILL_FRONTEND_NOW.ps1": SCRIPTS_DIR / "internal/KILL_FRONTEND_NOW.ps1",
        "internal/KILL_FRONTEND_NOW.bat": SCRIPTS_DIR / "internal/KILL_FRONTEND_NOW.bat",
        "internal/TEST_TERMINAL.ps1": SCRIPTS_DIR / "internal/TEST_TERMINAL.ps1",
        "internal/CLEANUP.bat": SCRIPTS_DIR / "internal/CLEANUP.bat",
        "internal/CLEANUP_COMPREHENSIVE.ps1": SCRIPTS_DIR / "internal/CLEANUP_COMPREHENSIVE.ps1",
        "internal/CLEANUP_DOCS.ps1": SCRIPTS_DIR / "internal/CLEANUP_DOCS.ps1",
        "internal/CLEANUP_OBSOLETE_FILES.ps1": SCRIPTS_DIR / "internal/CLEANUP_OBSOLETE_FILES.ps1",
        "internal/VERIFY_LOCALIZATION.ps1": SCRIPTS_DIR / "internal/VERIFY_LOCALIZATION.ps1",
        "internal/DEVTOOLS.ps1": SCRIPTS_DIR / "internal/DEVTOOLS.ps1",
        "internal/DEVTOOLS.bat": SCRIPTS_DIR / "internal/DEVTOOLS.bat",
    },
    # End-user/DevOps scripts -> scripts/deploy/
    "deploy": {
        "set-docker-metadata.ps1": SCRIPTS_DIR / "set-docker-metadata.ps1",
        "docker/DOCKER_DOWN.ps1": SCRIPTS_DIR / "docker/DOCKER_DOWN.ps1",
        "docker/DOCKER_UP.ps1": SCRIPTS_DIR / "docker/DOCKER_UP.ps1",
        "docker/DOCKER_RUN.ps1": SCRIPTS_DIR / "docker/DOCKER_RUN.ps1",
        "docker/DOCKER_REFRESH.ps1": SCRIPTS_DIR / "docker/DOCKER_REFRESH.ps1",
        "docker/DOCKER_SMOKE.ps1": SCRIPTS_DIR / "docker/DOCKER_SMOKE.ps1",
        "docker/DOCKER_UPDATE_VOLUME.ps1": SCRIPTS_DIR / "docker/DOCKER_UPDATE_VOLUME.ps1",
        "docker/DOCKER_FULLSTACK_UP.ps1": SCRIPTS_DIR / "docker/DOCKER_FULLSTACK_UP.ps1",
        "docker/DOCKER_FULLSTACK_DOWN.ps1": SCRIPTS_DIR / "docker/DOCKER_FULLSTACK_DOWN.ps1",
        "docker/DOCKER_FULLSTACK_REFRESH.ps1": SCRIPTS_DIR / "docker/DOCKER_FULLSTACK_REFRESH.ps1",
        "internal/CREATE_PACKAGE.ps1": SCRIPTS_DIR / "internal/CREATE_PACKAGE.ps1",
        "internal/CREATE_PACKAGE.bat": SCRIPTS_DIR / "internal/CREATE_PACKAGE.bat",
        "internal/CREATE_DEPLOYMENT_PACKAGE.ps1": SCRIPTS_DIR / "internal/CREATE_DEPLOYMENT_PACKAGE.ps1",
        "internal/CREATE_DEPLOYMENT_PACKAGE.bat": SCRIPTS_DIR / "internal/CREATE_DEPLOYMENT_PACKAGE.bat",
        "internal/INSTALLER.ps1": SCRIPTS_DIR / "internal/INSTALLER.ps1",
        "internal/INSTALLER.bat": SCRIPTS_DIR / "internal/INSTALLER.bat",
    },
    # Keep in deploy/ (already there)
    "deploy_existing": {
        "STOP.ps1": SCRIPTS_DIR / "deploy/STOP.ps1",
        "STOP.bat": SCRIPTS_DIR / "deploy/STOP.bat",
        "CHECK_VOLUME_VERSION.ps1": SCRIPTS_DIR / "deploy/CHECK_VOLUME_VERSION.ps1",
        "SMART_SETUP.ps1": SCRIPTS_DIR / "deploy/SMART_SETUP.ps1",
        "UNINSTALL.bat": SCRIPTS_DIR / "deploy/UNINSTALL.bat",
    }
}

def ensure_directories():
    """Create target directories if they don't exist"""
    (SCRIPTS_DIR / "dev").mkdir(exist_ok=True)
    print("[OK] Created scripts/dev/")

    (SCRIPTS_DIR / "deploy").mkdir(exist_ok=True)
    print("[OK] Ensured scripts/deploy/ exists")

def move_file(source: Path, dest_relative: str, category: str):
    """Move a file from source to destination"""
    if not source.exists():
        print(f"  [SKIP] {source.name} (not found)")
        return False

    dest = SCRIPTS_DIR / category / dest_relative
    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        shutil.copy2(source, dest)
        print(f"  -> Moved {source.name} to {category}/{dest_relative}")
        return True
    except Exception as e:
        print(f"  [ERROR] moving {source.name}: {e}")
        return False

def reorganize():
    """Execute the reorganization plan"""
    print("\n" + "="*70)
    print("  SCRIPT REORGANIZATION")
    print("="*70 + "\n")

    print("[1/4] Creating directory structure...")
    ensure_directories()

    print("\n[2/4] Moving developer scripts to scripts/dev/...")
    moved_dev = 0
    for dest_path, source_path in RESTRUCTURE_PLAN["dev"].items():
        if move_file(source_path, dest_path, "dev"):
            moved_dev += 1
    print(f"  [OK] Moved {moved_dev} developer scripts")

    print("\n[3/4] Moving deployment scripts to scripts/deploy/...")
    moved_deploy = 0
    for dest_path, source_path in RESTRUCTURE_PLAN["deploy"].items():
        if move_file(source_path, dest_path, "deploy"):
            moved_deploy += 1
    print(f"  [OK] Moved {moved_deploy} deployment scripts")

    print("\n[4/4] Verifying existing deployment scripts...")
    existing = 0
    for dest_path, source_path in RESTRUCTURE_PLAN["deploy_existing"].items():
        if source_path.exists():
            existing += 1
            print(f"  [OK] {dest_path} already in place")
        else:
            print(f"  [WARN] {dest_path} not found")

    print("\n" + "="*70)
    print(f"  REORGANIZATION COMPLETE")
    print(f"  Developer scripts: {moved_dev} moved to scripts/dev/")
    print(f"  Deployment scripts: {moved_deploy} moved to scripts/deploy/")
    print(f"  Existing deploy scripts: {existing} verified")
    print("="*70 + "\n")

    return moved_dev, moved_deploy, existing

def create_readme_files():
    """Create README.md files for both directories"""
    print("Creating README files...")

    dev_readme = SCRIPTS_DIR / "dev" / "README.md"
    deploy_readme = SCRIPTS_DIR / "deploy" / "README.md"

    dev_content = """# Developer Workbench Scripts

This directory contains scripts for the **development lifecycle**: building, running, debugging, testing, and cleaning during active development.

## Target Audience
Developers actively working on the codebase.

## Scripts

### Core Development
- `SMOKE_TEST.ps1` - Quick smoke test to verify application health
- `debug_import_control.py` - Debug Python import issues

### Diagnostic Tools
- `DEBUG_PORTS.ps1/.bat` - Check and debug port conflicts
- `DIAGNOSE_STATE.ps1` - Comprehensive system state diagnostics
- `DIAGNOSE_FRONTEND.ps1/.bat` - Frontend-specific diagnostics
- `DEVTOOLS.ps1/.bat` - Advanced developer tools menu

### Cleanup Tools
- `CLEANUP.bat` - Clean build artifacts and temp files (non-destructive)
- `CLEANUP_COMPREHENSIVE.ps1` - Deep cleanup of all artifacts
- `CLEANUP_DOCS.ps1` - Clean documentation artifacts
- `CLEANUP_OBSOLETE_FILES.ps1` - Remove obsolete files
- `KILL_FRONTEND_NOW.ps1/.bat` - Force-kill frontend processes

### Testing & Verification
- `TEST_TERMINAL.ps1` - Test terminal/PowerShell environment
- `VERIFY_LOCALIZATION.ps1` - Verify localization files

## Usage Patterns

### Quick Development Cycle
```powershell
# Start development
.\\..\\SMS.ps1 -Quick

# Run tests
.\\SMOKE_TEST.ps1

# Debug issues
.\\DIAGNOSE_STATE.ps1
```

### Cleanup After Development
```powershell
# Quick cleanup (preserves data)
.\\CLEANUP.bat

# Deep cleanup
.\\CLEANUP_COMPREHENSIVE.ps1
```

### Debugging Port Conflicts
```powershell
# Check what's using ports
.\\DEBUG_PORTS.ps1

# Force-kill frontend if stuck
.\\KILL_FRONTEND_NOW.ps1
```

## Notes
- These scripts assume you're in an active development environment
- Most scripts work with both Docker and native modes
- Use `.bat` versions if you have PowerShell execution policy issues
- For production deployment, use scripts in `../deploy/` instead
"""

    deploy_content = """# End-User / DevOps Deployment Scripts

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
.\\SMART_SETUP.ps1

# Or Docker-specific setup
.\\SMART_SETUP.ps1 -PreferDocker
```

### Docker Deployment
```powershell
# Start containers
.\\DOCKER_UP.ps1

# Rebuild and refresh
.\\DOCKER_REFRESH.ps1

# Stop containers
.\\DOCKER_DOWN.ps1
```

### Maintenance
```powershell
# Check volume version compatibility
.\\CHECK_VOLUME_VERSION.ps1

# Stop all services
.\\STOP.ps1

# Complete uninstall
.\\UNINSTALL.bat
```

### Creating Distribution Packages
```powershell
# Create deployment package
.\\CREATE_DEPLOYMENT_PACKAGE.ps1

# Create installer
.\\INSTALLER.ps1
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
"""

    dev_readme.write_text(dev_content, encoding='utf-8')
    print(f"  [OK] Created {dev_readme}")

    deploy_readme.write_text(deploy_content, encoding='utf-8')
    print(f"  [OK] Created {deploy_readme}")

if __name__ == "__main__":
    # Execute reorganization
    moved_dev, moved_deploy, existing = reorganize()

    # Create README files
    create_readme_files()

    print("\n[OK] Script reorganization complete!")
    print("\nNext steps:")
    print("  1. Review the moved files in scripts/dev/ and scripts/deploy/")
    print("  2. Update any scripts that reference moved files")
    print("  3. Test key workflows to ensure everything still works")
    print("  4. Update main README.md with the new structure\n")
