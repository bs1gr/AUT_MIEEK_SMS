# Changelog - Student Management System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-24

### Added
- ✅ Node.js version checking (enforces v18+)
- ✅ C++ Build Tools / Rust detection
- ✅ Enhanced INSTALL.ps1 with 7-step validation
- ✅ Frontend diagnostic tool (DIAGNOSE_FRONTEND.ps1)
- ✅ Comprehensive deployment documentation
- ✅ Version tracking system

### Changed
- ⬆️ FastAPI 0.115.0 → 0.120.0
- ⬆️ Uvicorn 0.32.0 → 0.38.0
- ⬆️ SQLAlchemy 2.0.36 → 2.0.44
- ⬆️ Pydantic 2.10.3 → 2.12.3
- ⬆️ Pydantic-settings 2.6.1 → 2.11.0
- ⬆️ Alembic 1.13.2 → 1.17.0
- ⬆️ Psutil 6.1.0 → 7.1.1
- ⬆️ React 18.2.0 → 18.3.1
- ⬆️ React-DOM 18.2.0 → 18.3.1
- ⬆️ React-Router-DOM 7.9.4 → 6.28.0 (stable v6 branch)
- ⬆️ Vite 5.0.0 → 5.4.10
- ⬆️ Tailwind CSS 3.3.6 → 3.4.14
- ⬆️ Axios 1.6.0 → 1.7.7
- ⬆️ Lucide-react 0.263.1 → 0.446.0

### Fixed
- 🐛 Node.js version compatibility check
- 🐛 Build tools detection for Python packages
- 🐛 Frontend installation failures on new PCs
- 🐛 Package version mismatches
- 🐛 Deployment package structure

### Security
- 🔒 Updated Axios to fix SSRF vulnerabilities
- 🔒 Updated FastAPI for security improvements
- 🔒 Enhanced input validation with Pydantic 2.12

---

## Version History Format

### Types of Changes
- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security vulnerability fixes

### Semantic Versioning
- **MAJOR** version (x.0.0) - Incompatible API changes
- **MINOR** version (0.x.0) - New functionality (backward compatible)
- **PATCH** version (0.0.x) - Bug fixes (backward compatible)
