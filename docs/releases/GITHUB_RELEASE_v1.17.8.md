## ⚠️ BREAKING CHANGES

This release includes a **frontend module relocation**. **Read the migration guide before upgrading if you import legacy page modules in custom code.**

### 🔴 What Changed

**Module Relocation (Frontend):**

- Power/System page moved to the Operations feature module (`SystemPage`)
- RBAC permissions page moved to the Admin feature module (`PermissionsPage`)

**Affected Users:**
- ❌ Custom frontend code importing `@/pages/PowerPage` or `@/pages/AdminPermissionsPage` → **Migration Required**
- ✅ Web UI users → **No action needed**
- ✅ Docker/standard deployment → **No action needed**

**Not Affected:**
- Database schema (no migrations needed)
- API endpoints (all unchanged)
- Configuration files

### 📖 Migration Guide

**[⬆️ FULL MIGRATION GUIDE](docs/guides/MIGRATION_v1.18.3.md)** - Complete instructions with code examples for updating imports.

### 📊 What's Included in v1.18.3

- Reporting & analytics UX enhancements
- Custom report email overrides and delivery improvements
- Operations/control panel polish and health UI unification
- Installer/uninstaller reliability and cleanup updates
- Documentation alignment (migration guide + release/cleanup reports)

### 📦 Installation

**Windows:** Download \SMS_Installer_1.17.8.exe\ from the assets below.

**Docker:**
```powershell
./DOCKER.ps1 -Update
```

**Native (Development):**
```powershell
./NATIVE.ps1 -Start
```

### 📚 Documentation

- **[Migration Guide](docs/guides/MIGRATION_v1.18.3.md)** - How to update your code
- **[Release Report](docs/releases/reports/RELEASE_REPORT_v1.18.3.md)** - Executive summary and impact assessment
- **[Cleanup Report](docs/releases/reports/CLEANUP_EXECUTION_REPORT_v1.18.3.md)** - Detailed cleanup audit
- **[CHANGELOG](CHANGELOG.md)** - Full commit history
