## What's New in v1.13.1

> **🐛 PATCH RELEASE**: This release fixes TypeScript compilation errors in E2E tests that were blocking CI workflows.

### 🔧 Bug Fixes

#### E2E Testing
- **Fixed TypeScript compilation errors** across E2E test files
  - Corrected pragma comment syntax in `critical-flows.spec.ts` (moved outside function call parentheses)
  - Simplified route handler in `hooks.ts` (`route.continue()` returns void)
  - Fixed Response type import and header access in `logging.ts`
  - Removed unused imports and parameters in `student-management.spec.ts`

#### Project Management
- **Added TODO.md** to track planned improvements and known issues
- **Updated COMMIT_READY.ps1** whitelist to allow TODO.md in root directory

### ✅ Validation

All checks passing:
- ✅ TypeScript compilation (0 errors)
- ✅ Backend tests (pytest)
- ✅ Frontend tests (Vitest)
- ✅ Linting (ESLint, Ruff, MyPy)
- ✅ Pre-commit hooks
- ✅ Translation integrity

### 📦 Installation

**Docker (Recommended)**:
```powershell
.\DOCKER.ps1 -Update
```

**Windows Installer**: Download `StudentManagementSystem_1.13.1_Setup.exe` from the assets below.

**Native Mode**:
```powershell
git pull
.\NATIVE.ps1 -Setup
.\NATIVE.ps1 -Start
```

### 📋 Full Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for complete details.

---
