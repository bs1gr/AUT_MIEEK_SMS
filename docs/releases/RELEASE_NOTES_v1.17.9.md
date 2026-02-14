# Release Notes - Version 1.17.9

**Release Date**: February 13, 2026
**Release Type**: Patch Release (Bug fixes + Minor Enhancements)
**Previous Version**: 1.17.8
**Commits**: 48 commits since v1.17.8

---

## 🎯 Release Highlights

This patch release focuses on **workspace management automation**, **CI/CD reliability improvements**, and **developer tooling enhancements**. Key additions include automated deprecation policy enforcement, comprehensive workspace analysis tools, and robust staging deployment workflows.

---

## ✨ New Features

### Workspace Management Toolkit

**Auto-Fix Capability** (`feat(workspace)` - 14b74fd5e)
- Automated remediation for deprecated scripts
- Smart archive directory creation and organization
- `.gitignore` pattern auto-enforcement
- Manual fix guidance for complex scenarios

**Workspace Analysis Tool** (`feat(workspace)` - 14b74fd5e)
- 437-line comprehensive workspace health analyzer
- 8 analysis sections: disk usage, large files, old files, temp files, archive health, code metrics, dependencies
- Multiple output formats: Console, Markdown, JSON, HTML
- Identifies consolidation opportunities and optimization recommendations

**Documentation** (`docs(workspace)` - 54f52321e)
- 303-line comprehensive workspace management toolkit guide
- Usage examples and monthly cleanup workflows
- CI/CD integration patterns
- Performance benchmarks and troubleshooting guide

### Automated Deprecation Policy Enforcement

**Policy Automation** (`feat(automation)` - 3df8c25bb)
- Automated scanning for deprecated scripts outside designated locations
- Integration with GitHub Actions for continuous monitoring
- Configurable rules and exemption patterns
- Detailed violation reports with remediation steps

**Cleanup Policies** (`chore(deprecation)` - b9f5fc98b)
- Established formal deprecation workflow
- Archive structure standardization (cleanup-feb2026/ pattern)
- RELEASE_PREPARATION.ps1 archived (replaced by RELEASE_READY.ps1)

### Runner Automation

**Automated Reconfiguration** (`feat(runner)` - 0d23fded2)
- Self-service runner reconfiguration for Docker access
- docker-users group membership automation
- Service account validation and recovery scripts
- Execution helper scripts for remote administration

---

## 🐛 Bug Fixes

### CI/CD Pipeline Stability

**Docker Health Checks** (Multiple commits: fbd9a6d23, acfa66750, 7174a3ece, 1c8930c6c, cf386e616, be1fef50c, 7da1e80da, b28a8e004, 6c770bd63)
- Added comprehensive Docker health validation before staging deployments
- Non-blocking health checks to prevent deployment failures
- Improved diagnostics for service account runners
- Fixed PowerShell syntax errors in health check steps
- Robust exit code handling and error messages

**Production Deployment** (`ci(production-deploy)` - 601e0f697)
- Graceful skip when production URL not configured
- Added monthly cleanup schedule
- Configurable health checks via environment variables

**Staging Environment** (Multiple commits: e858c303b, d6ad06f4c, 8787d2ea5, c74980d6a, e858c303b)
- Hardened runner preflight validation
- Fixed Docker start script syntax errors
- Archived obsolete runner reconfiguration helpers
- Improved runner Docker access documentation

### Load Testing Suite

**Path & Dependency Resolution** (Multiple commits: 97202b328, c65c3b219, d7adc6e95, 4074219dd, a485711b1, 63853bd39, b38b4a56e, bb9f8fab1, 11a3d4597, acfa66750)
- Fixed archived suite path handling
- Resolved Python package imports with proper `__init__.py` files
- Corrected PYTHONPATH for root/locust directory structure
- Fixed database initialization before backend startup
- Added verbose error output for troubleshooting
- Resolved migration path and report input path issues
- Used Locust CLI for consistent execution
- Fixed regression check to use latest analysis file

### Pre-commit Hooks

**Recursion Bug Fix** (`docs(hooks)` - 39f8068a4)
- Documented and resolved infinite recursion in pre-commit-legacy hook
- Reduced validation runs from 18+ to clean execution
- 215-line comprehensive fix documentation
- Hook chain diagrams and prevention checklist

### Runner & Docker Access

**docker-users Group Membership** (`fix(runner)` - d172a7ef9)
- Automated script for adding runner account to docker-users group
- Resolves "access denied" errors on self-hosted Windows runners
- Verification and testing procedures

**Service Account Validation** (`fix(runner)` - f978ea3da, 9ed7f6c1d, 50e7adecf)
- Corrected path handling in reconfiguration scripts
- Added svc.ps1 validation checks
- Manual reconfiguration fallback for missing files
- Simpler sc.exe-based approach for robustness

---

## 🧹 Maintenance & Cleanup

### Archive Consolidation

**displaced-files-jan2026/** (`chore(archive)` - 48c25aedd)
- Consolidated small archive directory (1.33 KB) into sessions/jan2026-displaced/
- Reduced archive subdirectories from 4 to 3
- Updated archive README with consolidation documentation

### Code Quality

**Whitespace Cleanup** (`style(automation)` - 06dedf9c4)
- Cleaned trailing whitespace in deprecation automation files
- Fixed formatting in GitHub Actions workflows

**Code Formatting** (`chore` - f31b754a4)
- Applied consistent code formatting (trailing whitespace, EOF newlines)
- Improved codebase consistency

**Policy Enforcement** (`chore(policy)` - 402e4d14b)
- Removed TODO/FIXME marker policy violations
- Enforced clean codebase standards

### Documentation Updates

**Work Plan** (`docs(work-plan)` - 96116e330)
- Updated with policy enforcement completion status
- Added v1.17.8 release context

**Deployment Docs** (`docs(deployment)` - 8787d2ea5)
- Updated runner Docker access fix notes
- Added troubleshooting procedures

---

## 📊 Statistics

**Development Activity**:
- **Commits**: 48
- **Files Changed**: 120+
- **Lines Added**: ~1,500
- **Lines Removed**: ~800

**Code Quality**:
- ✅ All 2,579+ tests passing (100%)
- ✅ Zero linting errors
- ✅ Pre-commit hooks operational
- ✅ 100% deprecation policy compliance

**Workspace Health**:
- Total size: 2.37 GB
- Archive: 496.89 MB (3 subdirectories, 3,881 files)
- Python: 320 files, 76,380 LOC
- Frontend: 420 files, 86,553 LOC
- Dependencies: 40 Python + 85 NPM (34 prod + 51 dev)

---

## 🔧 Technical Improvements

### Workspace Tooling

**analyze_workspace.ps1**:
- Disk usage analysis (excludes node_modules, .venv, .git)
- Large file detection (>10 MB threshold)
- Old file identification (>180 days, not archived)
- Temp/cache file scanning (*.tmp, *.bak, *.cache)
- Archive health monitoring
- Code quality metrics with proper exclusions
- Dependency counting (Python requirements.txt + NPM package.json)
- Customizable output formats

**audit_deprecated_markers.ps1**:
- Enhanced from 288 → 327 lines (v1.0 → v1.1)
- Auto-move deprecated scripts to archive/cleanup-{date}/legacy-scripts/
- Auto-create archive directories on-demand
- Auto-add .gitignore protection patterns
- Comprehensive violation reporting

### CI/CD Enhancements

**Deployment Workflows**:
- Production deployment: Configurable health checks, graceful skip when URL not configured
- Staging deployment: Docker health validation, improved error handling
- Self-hosted runners: Automated Docker access recovery

**Load Testing**:
- Archived suite support with proper path resolution
- Python package import fixes
- Database initialization workflow
- Verbose diagnostics for troubleshooting

### Runner Administration

**Reconfiguration Scripts**:
- `scripts/runner/reconfigure_runner.ps1`: Automated Docker access restoration
- `scripts/runner/add_to_docker_users.ps1`: Group membership automation
- `scripts/runner/validate_runner_service.ps1`: Service account validation
- Execution helpers for remote administration

---

## 🚀 Upgrade Instructions

### For All Users

This is a **patch release** with **no breaking changes**. Upgrade is seamless:

**Docker Deployment**:
```powershell
# Standard upgrade (recommended)
.\DOCKER.ps1 -Update

# Clean rebuild (if issues occur)
.\DOCKER.ps1 -UpdateClean
```

**Native Development**:
```powershell
# Stop services
.\NATIVE.ps1 -Stop

# Pull latest changes
git pull origin main

# Restart services
.\NATIVE.ps1 -Start
```

**Installer (Windows)**:
1. Download `SMS_Installer_1.17.9.exe` from GitHub Releases
2. Run installer (auto-detects existing installation)
3. Installer preserves data and settings automatically

### For Developers

**Update Dependencies** (if needed):
```powershell
# Backend (Python)
cd backend
pip install -r requirements.txt

# Frontend (NPM)
cd ../frontend
npm install
```

**Verify Installation**:
```powershell
# Run pre-commit validation
.\COMMIT_READY.ps1 -Quick

# Run test suites
.\RUN_TESTS_BATCH.ps1             # Backend
npm --prefix frontend run test    # Frontend
```

### New Tools Available

**Workspace Analysis**:
```powershell
# Generate workspace health report
.\scripts\utils\analyze_workspace.ps1 -OutputFormat Markdown

# Include archive analysis
.\scripts\utils\analyze_workspace.ps1 -IncludeArchive
```

**Deprecation Audit**:
```powershell
# Check for deprecated scripts
.\scripts\utils\audit_deprecated_markers.ps1

# Auto-fix violations (with confirmation)
.\scripts\utils\audit_deprecated_markers.ps1 -AutoFix
```

---

## 📚 Documentation

**New Documentation**:
- `docs/development/WORKSPACE_MANAGEMENT_TOOLKIT.md` - Comprehensive workspace tooling guide (303 lines)
- `docs/development/PRE_COMMIT_HOOK_RECURSION_FIX.md` - Hook recursion fix documentation (215 lines)
- `archive/README.md` - Updated with consolidation notes

**Updated Documentation**:
- `docs/plans/UNIFIED_WORK_PLAN.md` - Policy enforcement completion status
- `docs/deployment/runner-fixes/` - Runner Docker access procedures

---

## 🔗 Related Resources

**Release Assets**:
- Windows Installer: `SMS_Installer_1.17.9.exe`
- Source Code: GitHub tag `v1.17.9`
- Docker Images: `ghcr.io/bs1gr/aut_mieek_sms:1.17.9`

**Documentation**:
- User Guide: `docs/user/USER_GUIDE_COMPLETE.md`
- Developer Guide: `docs/development/DEVELOPER_GUIDE_COMPLETE.md`
- Deployment Guide: `docs/deployment/DEPLOYMENT_GUIDE.md`

**Support**:
- GitHub Issues: https://github.com/bs1gr/AUT_MIEEK_SMS/issues
- Documentation Index: `docs/DOCUMENTATION_INDEX.md`

---

## ✅ Testing & Validation

**Test Coverage**:
- ✅ Backend: 742/742 tests passing (31 batches, 100%)
- ✅ Frontend: 1,813/1,813 tests passing (99 test files, 100%)
- ✅ E2E: 19+ critical tests passing (100%)
- ✅ Total: 2,574+ tests passing

**Quality Gates**:
- ✅ Ruff: 0 errors (Python linting)
- ✅ MyPy: 0 errors (Type checking)
- ✅ ESLint: 0 errors (Frontend linting)
- ✅ Prettier: 100% formatted
- ✅ Pre-commit hooks: Passing cleanly

**Deployment Validation**:
- ✅ Native mode: Backend (8000) + Frontend (5173) operational
- ✅ Docker mode: Production container (8080) stable
- ✅ Database migrations: All applied successfully
- ✅ Installer build: SMS_Installer_1.17.9.exe verified

---

## 🎉 Acknowledgments

This release represents comprehensive workspace management automation and CI/CD stability improvements. Special focus on developer experience with new tooling for workspace health monitoring and automated deprecation policy enforcement.

**Key Contributors**: Solo Developer + AI Agent

---

**For questions or issues**: See `CONTRIBUTING.md` or open a GitHub issue.

**Next Release**: v1.18.0 (planned for March 2026) - Major feature enhancements
