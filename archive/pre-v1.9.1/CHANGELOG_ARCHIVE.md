# Archived Changelog (Pre-v1.9.1)

This document contains the historical changelog entries from versions prior to v1.9.1.
These versions represent the development history leading up to the consolidated v1.9.x release series.

For current release notes, see the main `CHANGELOG.md` in the project root.

---

## Version History Summary

| Version Range | Period | Key Milestones |
|---------------|--------|----------------|
| v1.8.0 - v1.8.7 | Nov 2025 | QNAP deployment, Session Export/Import, Windows GUI Installer |
| v1.6.0 - v1.6.5 | Nov 2025 | Authentication system, Control API, Release automation |
| v1.3.0 - v1.3.9 | Oct-Nov 2025 | CSV import, Code quality, CI/CD improvements |
| v1.2.0 - v1.2.3 | Oct 2025 | JWT authentication, Installation overhaul |
| v1.1.0 | Earlier | Initial feature set |

---

## Detailed Historical Entries

### [1.8.7] - 2025-11-23

- Version alignment across documentation
- Fixed broken links and template cleanup
- QNAP documentation updates
- Developer tooling: NATIVE.ps1 safety + CI checks
- Admin bootstrap: DEFAULT_ADMIN_AUTO_RESET feature

### [1.8.6.4] - 2025-11-22

- **Windows GUI Installation Wizard** - 7-step visual wizard
- **Windows GUI Uninstaller Wizard** - 5-step uninstallation
- **Executable Installer Builder** - Standalone Windows EXE
- Admin Endpoints AUTH_MODE compliance fix

### [1.8.6.3] - 2025-11-21

- DEEP_DOCKER_CLEANUP.ps1 - Advanced Docker cleanup
- DOCKER_CLEANUP_GUIDE.md documentation
- Deprecated SMART_SETUP.ps1

### [1.8.6.2] - 2025-11-21

- Fixed INSTALL.ps1 SECRET_KEY generation/validation

### [1.8.6.1] - 2025-11-21

- INSTALL.ps1 - Automated one-click installation wizard
- .env.example root configuration template

### [1.8.6] - 2025-11-21

- Rate limiting increased for production use
- Authentication token persistence fix
- Admin user management improvements

### [1.8.5] - 2025-11-20

- Comprehensive codebase cleanup (12 obsolete files removed)

### [1.8.4] - 2025-11-20

- PostgreSQL migration support
- Enhanced container diagnostics

### [1.8.3] - 2025-11-19

- Removed embedded Monitoring UI from Power page

### [1.8.2] - 2025-11-19

- RUN.ps1: Safe Docker pruning utilities (-Prune, -PruneAll)

### [1.8.0] - 2025-11-19

- **QNAP NAS Deployment Support** - Complete containerized solution
- **On-Demand Monitoring Activation** - Lazy-loaded dashboards
- **Control Router Refactoring** - Modularized into 7 submodules

### [1.6.5] - 2025-11-17

- Canonical Control API mounting under /control/api/*
- Shared Control API base URL
- Restart UX improvements

### [1.6.4] - 2025-11-17

- Comprehensive codebase cleanup & organization
- Frontend Zod schema test coverage (214 tests)
- Frontend utility test coverage (145 tests)
- Service layer architecture

### [1.6.3] - 2025-11-15

- Release archive playbook
- GitHub package retirement guidance
- Release automation tooling

### [1.6.2] - 2025-11-15

- Attendance analytics export
- Operations & export UX improvements
- Security patch for Starlette CVE

### [1.6.0] - 2025-11-13

- Server-persisted refresh token support
- Default administrator bootstrap
- Frontend authentication experience

### [1.3.9] - 2025-11-06

- CSV import for students (Greek columns)
- Codebase cleanup

### [1.3.8] - 2025-11-05

- Testing & quality improvements
- Backend coverage reporting

### [1.3.7] - 2025-11-03

- Import-resolver centralization
- CI enforcement (ruff, mypy)
- Pre-commit hooks

### [1.3.4] - 2025-11-01

- Final code quality improvements
- Eliminated all code duplication

### [1.3.3] - 2025-11-01

- Pagination for backups
- Shared utilities extraction
- Timeout constants

### [1.3.2] - 2025-11-01

- **Critical Security Fixes**
- SECRET_KEY validation
- Path traversal protection
- Atomic PID file writes

### [1.3.1] - 2025-11-01

- Architecture improvements
- Standardized dependency injection

### [1.2.3] - 2025-10-31

- SMART_SETUP.ps1 intelligent installer
- Version consistency improvements

### [1.2.2] - 2025-10-31

- Theme application fixes
- Docker image versioning

### [1.2.1] - 2025-10-31

- **Major Installation Overhaul**
- Simplified to single INSTALL.bat command

### [1.2.0] - 2025-10-30

- JWT authentication with RBAC
- Timezone-aware timestamps
- Rate limiting

### [1.1.0] - Earlier

- Initial feature development

---

## GitHub Release Links

For official releases with downloadable assets:

- [v1.8.6.4](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.6.4)
- [v1.8.6.3](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.6.3)
- [v1.8.6.2](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.6.2)
- [v1.8.6.1](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.6.1)
- [v1.8.6](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.6)
- [v1.8.3](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.3)
- [v1.8.2](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.8.2)
- [v1.6.5](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.5)
- [v1.6.4](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.4)
- [v1.6.3](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.3)
- [v1.6.2](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.2)
- [v1.6.0](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.0)

---

*This archive was created as part of the v1.9.3 release to consolidate legacy documentation.*
