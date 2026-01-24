## ⚠️ BREAKING CHANGES - MAJOR Release

This is a **MAJOR** release with breaking changes. **Read the migration guide before upgrading if you use custom scripts.**

### 🔴 What Changed

**Removed Modules (after 6+ month deprecation):**
- `backend.auto_import_courses` → use `backend.scripts.import_.courses`
- `backend.tools.*` (11 modules) → use `backend.db.cli.*`
- 2 cache monitoring workflows removed

**Affected Users:**
- ❌ Custom Python scripts importing old modules → **Migration Required**
- ✅ Web UI users → **No action needed**
- ✅ Docker/standard deployment → **No action needed**

**Not Affected:**
- Database schema (no migrations needed)
- API endpoints (all unchanged)
- Configuration files

### 📖 Migration Guide

**[⬆️ FULL MIGRATION GUIDE](docs/guides/MIGRATION_1.14.2.md)** - Complete instructions with code examples for updating imports.

### 📊 What's Included in 1.14.2

- **12 deprecated modules removed** - Clean codebase, reduced maintenance
- **Workflow optimization** - 29 → 27 active workflows
- **Zero active usage validated** - All removed code confirmed unused before removal
- **Complete documentation** - Migration guide, release report, cleanup audit

### 📦 Installation

**Windows:** Download `SMS_Installer_1.13.0.exe` from the assets below.

**Docker:**

```powershell
.\DOCKER.ps1 -Update

```text
**Native (Development):**

```powershell
.\NATIVE.ps1 -Start

```text
### 📚 Documentation

- **[Migration Guide](docs/guides/MIGRATION_1.14.2.md)** - How to update your code
- **[Release Report](docs/releases/reports/RELEASE_REPORT_1.14.2.md)** - Executive summary and impact assessment
- **[Cleanup Report](docs/releases/reports/CLEANUP_EXECUTION_REPORT_1.14.2.md)** - Detailed cleanup audit
- **[CHANGELOG](CHANGELOG.md)** - Full commit history

