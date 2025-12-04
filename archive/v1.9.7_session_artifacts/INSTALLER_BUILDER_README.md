# Installer Production & Versioning Consolidation (v1.9.7)

## Overview

The installer production and versioning workflow has been consolidated into a single unified pipeline that ensures version consistency across all components and integrates with pre-commit validation.

## Components

### 1. **INSTALLER_BUILDER.ps1** (New - Single Source of Truth)
Consolidated script for all installer production tasks:
- Version auditing and validation
- Wizard image regeneration
- Inno Setup compilation
- Code signing
- Smoke testing
- Git integration

**Location:** `D:\SMS\student-management-system\INSTALLER_BUILDER.ps1`

### 2. **BUILD_DISTRIBUTION.ps1** (Updated)
Now delegates installer building to `INSTALLER_BUILDER.ps1`:
- Creates ZIP distribution
- Calls `INSTALLER_BUILDER.ps1` for installer build

### 3. **COMMIT_READY.ps1** (Updated)
Integrated installer audit into Full mode:
- New function: `Invoke-InstallerAudit()`
- Runs automatically in `-Mode full`
- Catches version mismatches before commits

## Usage

### Quick Version Audit
```powershell
.\INSTALLER_BUILDER.ps1 -Action audit
```
Checks version consistency across all installer components without modifying anything.

### Build Installer with Auto-Fix
```powershell
.\INSTALLER_BUILDER.ps1 -Action build -AutoFix
```
- Validates versions
- Auto-regenerates wizard images if outdated
- Compiles with Inno Setup
- Signs with AUT MIEEK certificate
- Smoke tests result

### Production Release
```powershell
.\INSTALLER_BUILDER.ps1 -Action release -TagAndPush
```
- Full build pipeline
- Creates git tag `v1.9.7`
- Pushes to origin
- Uploads to GitHub releases

### Pre-Commit Full Validation
```powershell
.\COMMIT_READY.ps1 -Mode full
```
Includes:
- Code quality checks
- All tests
- Deployment health checks
- **Installer version audit** (NEW)
- Cleanup

## Version Consistency Flow

### Single Source of Truth: `VERSION` file
```
1.9.7
```

### Version Propagation
1. **Read from:** `VERSION` file
2. **Used by:**
   - `installer/SMS_Installer.iss` (reads dynamically in preprocessor)
   - `installer/create_wizard_images.ps1` (renders in wizard images)
   - `INSTALLER_BUILDER.ps1` (reports and validates)
   - GitHub releases (tagged with `v1.9.7`)

### Automatic Components Updated
- ✅ `installer/SMS_Installer.iss` - Dynamic preprocessor reads VERSION
- ✅ `installer/wizard_image.bmp` - Generated with current version
- ✅ `installer/wizard_small.bmp` - Generated with current version
- ✅ `dist/SMS_Installer_1.9.7.exe` - Built with current version
- ✅ Git tag `v1.9.7` - Created on release

## Integration with Pre-Commit Workflow

### Before Commit (Local Development)
```powershell
# Quick check
.\COMMIT_READY.ps1 -Mode quick

# Standard check (recommended)
.\COMMIT_READY.ps1 -Mode standard

# Full check before release
.\COMMIT_READY.ps1 -Mode full
```

The **Full mode** now includes installer audit which catches:
- Version file mismatches
- Outdated wizard images
- Missing components
- Signature validation

### Before Release
```powershell
# Build distribution and installer
.\BUILD_DISTRIBUTION.ps1

# Or with more control
.\INSTALLER_BUILDER.ps1 -Action release -TagAndPush
```

## Key Features

### ✅ Automatic Version Synchronization
- VERSION file is single source of truth
- All components read from it
- No manual version bumping needed

### ✅ Wizard Image Regeneration
- Auto-detects when images need updating
- Uses `create_wizard_images.ps1` script
- Reads current version from VERSION file
- Can be triggered manually: `.\INSTALLER_BUILDER.ps1 -Action build -AutoFix`

### ✅ Code Signing
- Uses AUT MIEEK certificate (`AUT_MIEEK_CodeSign.pfx`)
- Validates Authenticode signature
- Certificate location: `installer/AUT_MIEEK_CodeSign.pfx`

### ✅ Pre-Commit Validation
- `COMMIT_READY.ps1 -Mode full` includes installer audit
- Catches version inconsistencies before commits
- No manual verification needed

### ✅ Git Integration
- Automatic tagging: `git tag v1.9.7`
- Force-updates if tag already exists
- Pushes to origin automatically
- Integrates with GitHub releases workflow

### ✅ Smoke Testing
- Validates installer properties
- Checks file signature
- Verifies version resources
- Ensures installation readiness

## Troubleshooting

### Installer Shows Wrong Version
**Problem:** Wizard image shows v1.9.4 instead of v1.9.7

**Solution:**
```powershell
.\INSTALLER_BUILDER.ps1 -Action build -AutoFix
```

This regenerates wizard images with current VERSION.

### Version File Not Read
**Problem:** VERSION file exists but installer not reflecting it

**Solution:**
1. Verify VERSION file is at root: `cat .\VERSION`
2. Manually regenerate wizard images: `.\installer\create_wizard_images.ps1`
3. Recompile installer: `.\INSTALLER_BUILDER.ps1 -Action build`

### Code Signing Failed
**Problem:** Installer build succeeds but signing fails

**Solution:**
1. Verify certificate exists: `ls installer/AUT_MIEEK_CodeSign.pfx`
2. Check SignTool availability: `signtool.exe /?`
3. Build without signing: `.\INSTALLER_BUILDER.ps1 -Action build -SkipCodeSign`

### Git Tag Already Exists
**Problem:** Tag v1.9.7 already exists, can't create new

**Solution:**
```powershell
# The script handles this automatically with --force
.\INSTALLER_BUILDER.ps1 -Action release -TagAndPush
# Or manually:
git tag -d v1.9.7
git push origin v1.9.7 --force
```

## Deployment Behavior

### Development (Native Mode)
```powershell
.\NATIVE.ps1 -Start          # Start backend + frontend
.\INSTALLER_BUILDER.ps1 -Action audit  # Verify installer health
```

### Docker Deployment
```powershell
.\DOCKER.ps1 -Start          # Start Docker container
.\INSTALLER_BUILDER.ps1 -Action audit  # Verify installer health
```

### Production Release
```powershell
.\COMMIT_READY.ps1 -Mode full            # Full validation including installer
.\BUILD_DISTRIBUTION.ps1                 # Build ZIP + installer
.\INSTALLER_BUILDER.ps1 -Action release -TagAndPush  # Release to GitHub
```

## File Organization

```
student-management-system/
├── VERSION                          # Single source of truth
├── INSTALLER_BUILDER.ps1            # Consolidated installer pipeline (NEW)
├── BUILD_DISTRIBUTION.ps1           # Updated: delegates to INSTALLER_BUILDER
├── COMMIT_READY.ps1                 # Updated: includes installer audit
├── installer/
│   ├── SMS_Installer.iss           # Inno Setup script (reads VERSION dynamically)
│   ├── create_wizard_images.ps1     # Version-aware image generator
│   ├── SIGN_INSTALLER.ps1           # Code signing script
│   ├── AUT_MIEEK_CodeSign.pfx       # Code signing certificate
│   ├── wizard_image.bmp             # Wizard image (auto-generated)
│   ├── wizard_small.bmp             # Wizard icon (auto-generated)
│   └── SMS_Installer.iss            # Inno Setup configuration
└── dist/
    ├── SMS_Distribution_1.9.7.zip   # ZIP archive
    └── SMS_Installer_1.9.7.exe      # Windows installer (signed)
```

## Release Checklist

- [ ] Run `.\COMMIT_READY.ps1 -Mode full` - All checks pass
- [ ] Version is correct in `VERSION` file (e.g., 1.9.7)
- [ ] Run `.\BUILD_DISTRIBUTION.ps1` - Creates ZIP and installer
- [ ] Verify installer shows correct version in wizard
- [ ] Run `.\INSTALLER_BUILDER.ps1 -Action test` - Smoke test passes
- [ ] Run `.\INSTALLER_BUILDER.ps1 -Action release -TagAndPush` - Release to GitHub
- [ ] Attach `SMS_Installer_1.9.7.exe` to GitHub release page
- [ ] Update CHANGELOG.md with release notes

## Maintenance Notes

### When to Update Wizard Images
- After VERSION file change (automatic with `-AutoFix`)
- After installer/create_wizard_images.ps1 modification (automatic)
- Every major/minor release (caught by pre-commit audit)

### When to Regenerate
```powershell
# Manual regeneration (if needed)
.\installer\create_wizard_images.ps1

# Or via builder
.\INSTALLER_BUILDER.ps1 -Action build -AutoFix
```

### Monitoring
- Pre-commit `Full` mode audits installer consistency
- Version mismatches detected before commits
- No orphaned old installers (old versions kept in `dist/`)

## Related Scripts

- **DOCKER.ps1** - Docker deployment control (v2.0 consolidated)
- **NATIVE.ps1** - Native deployment control (v2.0 consolidated)
- **COMMIT_READY.ps1** - Pre-commit validation (updated with installer audit)
- **BUILD_DISTRIBUTION.ps1** - Distribution building (updated to use INSTALLER_BUILDER)

## Version History

- **v1.9.7** (2025-12-04): Consolidated installer production and versioning
- **v1.9.6**: Previous installer build process
- **v1.9.5**: Script consolidation (DOCKER.ps1, NATIVE.ps1)
- **v1.9.4**: Initial versioning system
