## ⚠️ BREAKING CHANGES - MAJOR Release

This is a **MAJOR** release with breaking changes. **Read the migration guide before upgrading if you use custom scripts.**

### 🔴 What Changed

**Removed Modules (after 6+ month deprecation):**

- release(v1.17.2): Consolidate Phase 3 features with version alignment and Phase 4 planning

**Affected Users:**
- ❌ Custom Python scripts importing old modules → **Migration Required**
- ✅ Web UI users → **No action needed**
- ✅ Docker/standard deployment → **No action needed**

**Not Affected:**
- Database schema (no migrations needed)
- API endpoints (all unchanged)
- Configuration files

### 📖 Migration Guide

**[⬆️ FULL MIGRATION GUIDE](docs/guides/MIGRATION_v1.17.4.md)** - Complete instructions with code examples for updating imports.

### 📊 What's Included in v1.17.4

- **21 new features** - Enhancement and new capabilities
- **76 bug fixes** - Stability and reliability improvements
- **Deprecated modules removed** - Clean codebase, reduced maintenance
- **Complete documentation** - Release report, migration guide, cleanup audit

### 📦 Installation

**Windows:** Download \SMS_Installer_1.17.4.exe\ from the assets below.

**Docker:**
`powershell
.\DOCKER.ps1 -Update
`

**Native (Development):**
`powershell
.\NATIVE.ps1 -Start
`

### 📚 Documentation

- **[Migration Guide](docs/guides/MIGRATION_v1.17.4.md)** - How to update your code
- **[Release Report](docs/releases/reports/RELEASE_REPORT_v1.17.4.md)** - Executive summary and impact assessment
- **[Cleanup Report](docs/releases/reports/CLEANUP_EXECUTION_REPORT_v1.17.4.md)** - Detailed cleanup audit
- **[CHANGELOG](CHANGELOG.md)** - Full commit history


