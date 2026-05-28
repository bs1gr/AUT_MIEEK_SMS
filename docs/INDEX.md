# Documentation Index

**Last Updated**: 2026-05-28
**Project Version**: 1.18.22

This is the main entry point for navigating all project documentation. For detailed documentation organization, see [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md).

---

## 📚 Main Documentation Sections

### User Documentation
- **[User Guides](user/INDEX.md)** - End-user guides, quick starts, and how-tos
  - User training materials (English & Greek)
  - RBAC guides
  - Session management guides

### Development Documentation  
- **[Development Guides](development/INDEX.md)** - Technical documentation, architecture, and APIs
  - Architecture and design documents
  - API documentation
  - Testing guides and strategies
  - CI/CD documentation

### Deployment & Operations
- **[Deployment Guides](deployment/INDEX.md)** - Operations, deployment procedures, and troubleshooting
  - Docker operations
  - Production deployment guides
  - QNAP deployment instructions
  - Deployment reports

### Administrator Documentation
- **[Admin Guides](admin/)** - System administration and configuration
  - [Permission Matrix](admin/PERMISSION_MATRIX.md) - Role-based access control matrix
  - [Permission Matrix Endpoint Mapping](admin/PERMISSION_MATRIX_ENDPOINT_MAPPING.md) - Endpoint-to-permission mappings
  - [RBAC Database Schema](admin/RBAC_DATABASE_SCHEMA.md) - Database schema documentation
  - [RBAC Endpoint Audit](admin/RBAC_ENDPOINT_AUDIT.md) - Endpoint security audit
  - [Notifications Admin Guide](admin/NOTIFICATIONS_ADMIN_GUIDE.md) - Notification system configuration
  - [Import/Export Guide](admin/IMPORT_EXPORT_GUIDE.md) - Bulk data import/export operations

### API Documentation
- **[API Guides](api/)** - API reference and examples
  - [API Examples](api/API_EXAMPLES.md) - Code examples for API usage
  - [RBAC API Matrix](api/RBAC_API_MATRIX.md) - API endpoint security matrix

### Reference Materials
- **[Reference Guides](reference/)** - Quick reference documents
  - [Windows Reserved Filename Workaround](reference/WINDOWS_RESERVED_FILENAME_WORKAROUND.md)
  - [Auth Refresh Documentation](reference/AUTH_REFRESH.md)

### Archive & Historical Documents
- **[Archive](archive/)** - Historical documentation, reports, and phase documentation
  - Phase reports and completion status
  - Audit reports and checklists
  - Consolidation reports
  - Session reports and handoff documentation

### Release Documentation
- **[Releases](releases/)** - Release notes and version history
  - [Release Notes](releases/RELEASE_NOTES_v1.14.1.md) - Latest release notes
  - [GitHub Releases](releases/GITHUB_RELEASE_v1.14.3.md) - GitHub release documentation
  - [Release Reports](releases/reports/) - Release verification reports

### CI/CD Documentation
- **[CI Documentation](ci/)** - GitHub Actions and CI/CD pipeline documentation
  - [README](ci/README.md) - CI/CD overview
  - [GitHub Actions Diagnostics](ci/GITHUB_ACTIONS_DIAGNOSTIC_REPORT.md) - Diagnostic reports

---

## 🔍 Quick Links

### Core Configuration
- [README.md](README.md) - Project overview and setup
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - Detailed documentation structure
- [VERSION_HISTORY.md](VERSION_HISTORY.md) - Version and release history

### Critical Guides
- [SECURITY_GUIDE_COMPLETE.md](SECURITY_GUIDE_COMPLETE.md) - Security best practices
- [SECRET_MANAGEMENT_STRATEGY.md](SECRET_MANAGEMENT_STRATEGY.md) - Secrets management
- [AGENT_POLICY_ENFORCEMENT.md](AGENT_POLICY_ENFORCEMENT.md) - Agent policy documentation

### Development Setup
- [E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md) - End-to-end testing documentation
- [FRONTEND_TESTING_STATUS.md](FRONTEND_TESTING_STATUS.md) - Frontend test status
- [PWA_SETUP_GUIDE.md](PWA_SETUP_GUIDE.md) - Progressive Web App setup

### Troubleshooting
- [PHASE6_ROOT_CAUSE_DIAGNOSTIC.md](PHASE6_ROOT_CAUSE_DIAGNOSTIC.md) - Root cause analysis tools
- [MONITORING_CONFIGURATION_INVESTIGATION.md](MONITORING_CONFIGURATION_INVESTIGATION.md) - Monitoring setup
- [TERMINAL_VISIBILITY_POLICY.md](TERMINAL_VISIBILITY_POLICY.md) - Terminal output policy

### Project Status
- [ACTIVE_WORK_STATUS.md](ACTIVE_WORK_STATUS.md) - Current work status
- [plans/UNIFIED_WORK_PLAN.md](plans/UNIFIED_WORK_PLAN.md) - Master work plan

---

## 📋 Documentation Categories

### By Topic

**Authentication & Authorization**
- [AUTHENTICATION.md](development/AUTHENTICATION.md) - Auth system overview
- [AUTH_AND_TEST_INFRASTRUCTURE.md](development/AUTH_AND_TEST_INFRASTRUCTURE.md) - Auth testing

**Performance & Optimization**
- [PHASE6_PERFORMANCE_VALIDATION_REPORT.md](PHASE6_PERFORMANCE_VALIDATION_REPORT.md)
- [CI_CACHE_OPTIMIZATION_ANALYSIS.md](CI_CACHE_OPTIMIZATION_ANALYSIS.md)

**Localization**
- [GREEK_LOCALIZATION_STRATEGY.md](GREEK_LOCALIZATION_STRATEGY.md)
- [USER_TRAINING_QUICKSTART_EL.md](USER_TRAINING_QUICKSTART_EL.md)
- [RBAC_GUIDE_EL.md](user/RBAC_GUIDE_EL.md)

**Deployment**
- [PRODUCTION_DOCKER_GUIDE.md](deployment/PRODUCTION_DOCKER_GUIDE.md)
- [DOCKER_OPERATIONS.md](deployment/DOCKER_OPERATIONS.md)

---

## ✅ Documentation Maintenance

This index is automatically validated by the CI/CD pipeline to ensure:
- All referenced files exist
- No orphaned documentation files
- Proper documentation structure

**Last Validation**: Automated on each workflow run
**Status**: ✅ All documentation indexed and validated

---

## 📝 Contributing

When adding new documentation:
1. Create the file in the appropriate section directory
2. Add a link in the corresponding INDEX.md file
3. Update this main INDEX.md with the new entry
4. Ensure your document has a proper heading (# Title)

For more information, see [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md).
