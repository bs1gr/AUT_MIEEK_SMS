# SMS Installer v1.9.10 Release

**Date**: December 7, 2025  
**Version**: 1.9.10  

## Installer Artifact

**File**: `SMS_Installer_1.9.10.exe`  
**Size**: 5.28 MB  
**SHA256**: `A6C1242B95C0672DAA48608471E5D3B752B5301EE650A44773D6AD962720DF88`

## Verification

To verify the installer integrity on Windows:

```powershell
# Calculate hash
$hash = (Get-FileHash -Path "SMS_Installer_1.9.10.exe" -Algorithm SHA256).Hash
Write-Host $hash
# Should match: A6C1242B95C0672DAA48608471E5D3B752B5301EE650A44773D6AD962720DF88
```

## What's New in v1.9.10

### Features

- ✅ Academic grading scale with letter grades (A+/A/A-/B+/B/B-/C+/C/D/F)
- ✅ Letter grade display in grade breakdown UI
- ✅ Fixed Greek language translations for category dropdown
- ✅ Enhanced grade analytics with 10-tier classification

### Bug Fixes

- 🐛 Fixed redundant "Average:" labels in grade breakdown
- 🐛 Fixed Greek translation not updating on language change
- 🐛 Fixed missing Tailwind CSS dependency (@alloc/quick-lru)

### Improvements

- 📊 180x performance improvement in dashboard analytics (v1.9.9)
- 🔒 Enhanced security with consolidated documentation
- 🧹 Repository cleanup and script consolidation

## Installation

1. Download `SMS_Installer_1.9.10.exe`
2. Double-click to run the installer
3. Follow the setup wizard (available in English and Greek)
4. The application will launch automatically after installation

## System Requirements

- **OS**: Windows 10 or later
- **Memory**: 4 GB RAM minimum
- **Disk Space**: 500 MB for installation
- **Browser**: Modern browser (Edge, Chrome, Firefox)

## Support

For issues or questions, please refer to:

- `START_HERE.md` - Quick start guide
- `docs/DOCUMENTATION_INDEX.md` - Complete documentation
- `docs/deployment/DOCKER_OPERATIONS.md` - Deployment help

---

**Build Details**:

- Compiled: December 7, 2025
- Build System: Inno Setup 6
- Version File: Dynamically read from VERSION (1.9.10)
- Wizard Images: Modern v2.0 design
- Greek Support: Windows-1253 encoding verified
