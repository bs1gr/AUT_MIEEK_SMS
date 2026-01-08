# Documentation Index

> **📌 CANONICAL SOURCE:** This file references `docs/DOCUMENTATION_INDEX.md` which is the authoritative documentation index. See that file for the complete, always-current list of all documentation.

**Last Updated:** January 8, 2026 (Phase 2 Week 2 & 3 RBAC Complete)
**Version:** 1.15.1 ✅ Production Ready
**Status:** Phase 1 Complete + Phase 2 RBAC Backend Complete - See `docs/DOCUMENTATION_INDEX.md` for complete status

## 🚀 Quick Start

**New to SMS?** Start here:

1. Read `../START_HERE.md` (5 minutes)
2. Visit `docs/DOCUMENTATION_INDEX.md` for complete navigation
3. Choose your role below for specialized guides

**Returning developer?** Go straight to: `docs/DOCUMENTATION_INDEX.md`
**AI Agent picking up work?** → **`AGENT_QUICK_START.md`** (5 minutes to understand state + continue)
---

## 📍 Main Documentation Index

**The canonical documentation hub is at:** [`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md)

All documentation is organized under `docs/` into four main categories:

- **[docs/user/](docs/user/)** - User guides, quick starts, and how-tos
- **[docs/development/](docs/development/)** - Technical docs, architecture, APIs
- **[docs/deployment/](docs/deployment/)** - Operations, deployment, troubleshooting
- **[docs/reference/](docs/reference/)** - Quick reference guides (scripts, security, Docker)

---

## 🎯 Quick Navigation

### For Quick Start

- **First time?** → Read `START_HERE.md` (5 minutes)
- **Need the overview?** → Read `README.md` (comprehensive guide)
- **Want to deploy?** → Read `DEPLOYMENT_READINESS.md` (pre-deployment checklist)
- **AI/Agent picking up work?** → Read `AGENT_QUICK_START.md` (understand state without re-planning)

### For Development & Architecture

- **System architecture?** → `docs/development/ARCHITECTURE.md`
- **Security details?** → `docs/SECURITY_GUIDE_COMPLETE.md`
- **Git workflow?** → `docs/development/GIT_WORKFLOW.md`
- **API reference?** → `backend/CONTROL_API.md`

### For Audits & Reports

- **Codebase quality?** → `AUDIT_SUMMARY.md` (10/10 rating)
- **Detailed audit?** → `CODEBASE_AUDIT_REPORT.md` (comprehensive)
- **Release notes?** → `CHANGELOG.md` or `docs/releases/RELEASE_NOTES_v1.15.0.md`

### For Operations

- **Docker guide?** → `docs/deployment/DOCKER_OPERATIONS.md`
- **Production setup?** → `docs/deployment/PRODUCTION_DOCKER_GUIDE.md`
- **Database migration?** → `docs/operations/DATABASE_MIGRATION_GUIDE.md`
- **PostgreSQL migration?** → `docs/deployment/POSTGRES_MIGRATION_GUIDE.md`
- **Monitoring setup?** → `docs/deployment/INDEX.md`

### For Phase 2 RBAC & Administration (NEW - v1.15.1+!)

- **Permission management?** → `docs/admin/PERMISSION_MANAGEMENT_GUIDE.md` (930 lines - complete workflows)
- **RBAC operations?** → `docs/admin/RBAC_OPERATIONS_GUIDE.md` (1,050 lines - daily/weekly/monthly checklists)
- **Permission matrix?** → `docs/admin/PERMISSION_MATRIX.md` (25 permissions, 148 endpoints)
- **API permissions?** → `backend/API_PERMISSIONS_REFERENCE.md` (540 lines - all 79 endpoints)

### For Phase 2 Planning & Execution (NEW!)

- **Quick reference?** → `docs/deployment/QUICK_REFERENCE_PHASE2.md` (2 min overview)
- **Executive summary?** → `docs/deployment/EXECUTIVE_SUMMARY_PHASE2_READY.md` (5 min status)
- **Staging deployment?** → `docs/deployment/STAGING_DEPLOYMENT_EXECUTION_PLAYBOOK.md` (with commands)
- **Risk management?** → `docs/deployment/PHASE2_RISK_REGISTER.md` (10 risks + mitigation)
- **Team onboarding?** → `docs/deployment/PHASE2_KICKOFF_TRANSITION_DOCUMENT.md` (3-hour path)
- **PR standards?** → `.github/pull_request_template/PHASE2_PR_GUIDE.md` (template)

---

## Core Documentation

### Root Level Files

| File | Purpose | Audience |
|------|---------|----------|
| `AGENT_QUICK_START.md` | **How AI agents pick up work without duplication** | **Agents/Automation** |
| `START_HERE.md` | First-time user guide | Everyone |
| `README.md` | Complete project overview | Everyone |
| `CHANGELOG.md` | Version history and changes | Developers |
| `TODO.md` | Project status and roadmap (DEPRECATED — use ACTIVE_WORK_STATUS.md) | Team members |
| `DEPLOYMENT_READINESS.md` | Pre-deployment checklist | Operators |
| `CONTRIBUTING.md` | Contribution guidelines | Developers |
| `AUDIT_SUMMARY.md` | Quick audit summary | Auditors/Managers |
| `CODEBASE_AUDIT_REPORT.md` | Detailed audit analysis | Technical leads |
| `docs/ACTIVE_WORK_STATUS.md` | **Current state of all work (single source of truth)** | **Everyone** |
| `docs/releases/` | Release documentation archive | Release managers |

### Development Documentation

Located in `docs/development/`:

- `ARCHITECTURE.md` - System design and module organization
- `AUTHENTICATION.md` - Auth system documentation
- `GIT_WORKFLOW.md` - Git standards and commit conventions
- `FRONTEND_AUDIT_IMPROVEMENTS.md` - Frontend optimization details
- `FRONTEND_DOCUMENTATION_SUMMARY.md` - Frontend architecture overview

### Deployment Documentation

Located in `docs/deployment/`:

- `INDEX.md` - Deployment guide index
- `DOCKER_OPERATIONS.md` - Docker operations and commands
- `PRODUCTION_DOCKER_GUIDE.md` - Production setup procedures
- `POSTGRES_MIGRATION_GUIDE.md` - SQLite to PostgreSQL migration
- `DEPLOY.md` - General deployment procedures
- `CI_CD_PIPELINE_GUIDE.md` - GitHub Actions configuration
- `PRE_DEPLOYMENT_EXECUTION_WALKTHROUGH.md` - Pre-deployment validation (7 phases, 30 min)
- `STAGING_DEPLOYMENT_PLAN_v1.15.1.md` - v1.15.1 staging deployment plan (45 min)
- `STAGING_DEPLOYMENT_EXECUTION_PLAYBOOK.md` - Complete staging deployment runbook with commands
- `PHASE2_RISK_REGISTER.md` - Phase 2 risk assessment & mitigation strategies (10 risks)
- `PHASE2_KICKOFF_TRANSITION_DOCUMENT.md` - Phase 2 transition guide & team onboarding (3 hours)
- `EXECUTIVE_SUMMARY_PHASE2_READY.md` - Phase 2 executive summary & immediate actions
- `QUICK_REFERENCE_PHASE2.md` - Phase 2 quick reference card (2 min overview)

### User Documentation

Located in `docs/user/`:

- `QUICK_START_GUIDE.md` - End-user quick start
- `LOCALIZATION.md` - Internationalization setup
- `PWA_SETUP_GUIDE.md` - PWA features guide
- `QUICK_REFERENCE_MANUAL.md` - User reference manual
- `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md` - Greek language user guide

### Security Documentation

Located in `docs/`:

- `SECURITY_GUIDE_COMPLETE.md` - **Comprehensive consolidated security guide** (Dec 2025)
  - Replaces: SECURITY.md, SECURITY_AUDIT_REPORT.md, SECURITY_FIX_SUMMARY.md
  - Archived originals: `archive/security-audit-2025-12-06/`
- `reference/SECURITY_GUIDE.md` - Quick reference (supplementary)

### Installer & Build Documentation

Located in `docs/`:

- `GREEK_ENCODING_FIX.md` - Greek text encoding solution for Inno Setup
- `DOCKER_NAMING_CONVENTIONS.md` - Volume versioning and naming conventions

Located in root:

- `INSTALLER_BUILDER.ps1` - Consolidated installer build script
- `fix_greek_encoding_permanent.py` - Build-time Greek encoding converter

Located in `installer/`:

- `README.md` - Canonical Windows installer workflow and packaging guide

### Reference Documentation

Located in `docs/reference/`:

- `session-import-safety.md` - Session import procedures
- Various API and feature references

---

## Navigation by Use Case

### I Want to Contribute or Plan Work

**Start with:** `docs/plans/UNIFIED_WORK_PLAN.md` (⭐ single source of truth)

1. Check unified work plan for current priorities and timeline
2. Review contribution guidelines in `CONTRIBUTING.md`
3. Check GitHub issues for assigned work
4. Follow Git workflow in `docs/development/GIT_WORKFLOW.md`

### I Want to Deploy the Application

**Start with:** `DEPLOYMENT_READINESS.md`

1. Check pre-deployment checklist
2. Read `docs/deployment/DOCKER_OPERATIONS.md`
3. For production, see `docs/deployment/PRODUCTION_DOCKER_GUIDE.md`
4. For monitoring, see `docs/deployment/INDEX.md`

### I Want to Set Up Development Environment

**Start with:** `START_HERE.md`

1. Follow quick start instructions
2. Run `NATIVE.ps1 -Setup` or `DOCKER.ps1 -Install`
3. Refer to `docs/development/ARCHITECTURE.md` for code structure
4. Check `docs/development/GIT_WORKFLOW.md` for commit standards

### I Want to Understand the Codebase

**Start with:** `CODEBASE_AUDIT_REPORT.md` or `AUDIT_SUMMARY.md`

1. Get overview of code quality (10/10 rating)
2. Review `docs/development/ARCHITECTURE.md` for design
3. Check `docs/SECURITY_GUIDE_COMPLETE.md` for security measures
4. Review test files in `backend/tests/` and `frontend/tests/`

### I Need to Troubleshoot an Issue

**Quick checklist:**

1. Check relevant documentation in `docs/`
2. Review `CHANGELOG.md` for known issues
3. Check logs: `backend/logs/app.log` or browser console
4. Review GitHub issues for similar problems

### I Want to Review Security

**Start with:** `docs/SECURITY_GUIDE_COMPLETE.md`

1. Review comprehensive security guide (covers all December 2025 audit findings)
2. Check authentication: `docs/development/AUTHENTICATION.md`
3. See archived details: `archive/security-audit-2025-12-06/`

### I Need to Run Smoke Tests

**Start with:** `docs/operations/SMOKE_TEST_CHECKLIST_v1.12.md`

1. Execute `python fix_greek_encoding_permanent.py` to regenerate installer assets
2. Run `.\COMMIT_READY.ps1 -Quick` for automated validation
3. Follow manual validations in the checklist (Docker + Native parity)
4. Reference legacy checklist in `docs/archive/documentation/checklists/` if historical comparison needed

### I Need to Migrate to PostgreSQL

**Start with:** `docs/deployment/POSTGRES_MIGRATION_GUIDE.md`

1. Read complete migration guide (443 lines)
2. Backup existing SQLite database
3. Follow step-by-step procedures
4. Use troubleshooting section if issues arise

---

## File Organization

### Root Level

```
├── START_HERE.md                  (5-minute start)
├── README.md                      (comprehensive overview)
├── CHANGELOG.md                   (version history)
├── DEPLOYMENT_READINESS.md        (pre-deployment)
├── AUDIT_SUMMARY.md               (quick audit)
├── CODEBASE_AUDIT_REPORT.md       (detailed audit)
├── CONTRIBUTING.md                (contribution guide)
├── docs/plans/UNIFIED_WORK_PLAN.md (⭐ planning single source of truth)
└── docs/releases/                 (release documentation archive)
```

### Backend

```
backend/
├── main.py                        (entry point)
├── app_factory.py                 (app creation)
├── models.py                      (database models)
├── routers/                       (15 API routers)
├── schemas/                       (Pydantic models)
├── tests/                         (360+ tests)
├── CONTROL_API.md                 (control API docs)
└── README.md                      (backend readme)
```

### Frontend

```
frontend/
├── src/
│   ├── App.tsx                    (main component)
│   ├── main.tsx                   (entry point)
│   ├── features/                  (feature modules)
│   ├── components/                (UI components)
│   ├── pages/                     (page components)
│   ├── api/                       (axios client)
│   ├── translations.ts            (i18n setup)
│   └── locales/                   (EN/EL translations)
└── README.md                      (frontend readme)
```

### Documentation

```
docs/
├── DOCUMENTATION_INDEX.md         (canonical index)
├── SECURITY_GUIDE_COMPLETE.md     (security hub)
├── plans/
│   └── UNIFIED_WORK_PLAN.md       (⭐ single source of truth for planning)
├── development/                   (development guides)
│   ├── phase-reports/             (phase progress archives)
│   └── roadmaps/                  (release roadmaps)
├── deployment/                    (deployment guides)
├── operations/                    (operations runbooks & smoke tests)
├── releases/                      (release documentation)
├── reference/                     (API references)
├── user/                          (user guides)
└── archive/                       (archived materials)
```

### Archive

```
docs/archive/
├── documentation/
│   ├── automation/                (workflow artifacts)
│   ├── checklists/                (legacy validation checklists)
│   └── reports/                   (historical documentation reports)
├── pr-updates/                    (PR-specific update notes)
└── security-audit-2025-12-06/     (archived security artifacts)
```

---

## Key Statistics

### Documentation

- **Total files:** 50+ guides
- **Total pages:** Comprehensive coverage
- **Translations:** English + Greek (select files)
- **Updated:** December 13, 2025

### Codebase

- **Backend:** FastAPI + SQLAlchemy
- **Frontend:** React 19.2.0 + TypeScript + Vite
- **Tests:** 360+ backend tests (100% passing)
- **Code quality:** 10/10 (Production Ready)

### Version

- **Current:** 1.15.1
- **Status:** Production Ready
- **Release Date:** January 7, 2026
- **Repository:** github.com/bs1gr/AUT_MIEEK_SMS

---

## Getting Help

### Quick Questions

1. **Can't find something?** → Search this index or use Ctrl+F
2. **Need setup help?** → `START_HERE.md`
3. **Want overview?** → `README.md`
4. **Deployment help?** → `DEPLOYMENT_READINESS.md`

### Technical Questions

1. **Architecture?** → `docs/development/ARCHITECTURE.md`
2. **Security?** → `docs/SECURITY_GUIDE_COMPLETE.md`
3. **API?** → `backend/CONTROL_API.md`
4. **Git?** → `docs/development/GIT_WORKFLOW.md`

### For Auditors/Managers

1. **Code quality?** → `AUDIT_SUMMARY.md` (10/10 rating)
2. **Detailed analysis?** → `CODEBASE_AUDIT_REPORT.md`
3. **Security posture?** → `docs/SECURITY_GUIDE_COMPLETE.md`
4. **Release info?** → `docs/releases/RELEASE_NOTES_v1.15.1.md`

---

## Documentation Updates

### December 24, 2025 (v1.15.0)

- ✅ Moved release documentation into `docs/releases/`
- ✅ Organized roadmap and phase progress reports under `docs/development/`
- ✅ Archived legacy reports, audits, and checklists under `docs/archive/documentation/`
- ✅ Added release notes for v1.15.0
- ✅ Refreshed index pointers and metadata after cleanup

### Previous Updates

- See `CHANGELOG.md` for complete version history
- See `archive/pre-v1.15.0/CHANGELOG_ARCHIVE.md` for legacy history

---

## Version Information

**Documentation Version:** v1.15.1
**Last Updated:** January 8, 2026
**Status:** Current and Complete

All documentation reflects the current state of the codebase and is verified accurate as of v1.15.1.
