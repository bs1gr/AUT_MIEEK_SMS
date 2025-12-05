# Documentation Index

**Last Updated:** December 5, 2025 (v1.9.8)  
**Version:** 1.9.8  
**Status:** Production Ready

---

## Quick Navigation

### For Quick Start
- **First time?** → Read `START_HERE.md` (5 minutes)
- **Need the overview?** → Read `README.md` (comprehensive guide)
- **Want to deploy?** → Read `DEPLOYMENT_READINESS.md` (pre-deployment checklist)

### For Development & Architecture
- **System architecture?** → `docs/development/ARCHITECTURE.md`
- **Security details?** → `docs/SECURITY.md`
- **Git workflow?** → `docs/development/GIT_WORKFLOW.md`
- **API reference?** → `backend/CONTROL_API.md`

### For Audits & Reports
- **Codebase quality?** → `AUDIT_SUMMARY.md` (10/10 rating)
- **Detailed audit?** → `CODEBASE_AUDIT_REPORT.md` (comprehensive)
- **Release notes?** → `CHANGELOG.md` or `INSTALLER_RELEASE_NOTES_v1.9.8.md`

### For Operations
- **Docker guide?** → `docs/deployment/DOCKER_OPERATIONS.md`
- **Production setup?** → `docs/deployment/PRODUCTION_DOCKER_GUIDE.md`
- **PostgreSQL migration?** → `docs/deployment/POSTGRES_MIGRATION_GUIDE.md`
- **Monitoring setup?** → `docs/deployment/INDEX.md`

---

## Core Documentation

### Root Level Files

| File | Purpose | Audience |
|------|---------|----------|
| `START_HERE.md` | First-time user guide | Everyone |
| `README.md` | Complete project overview | Everyone |
| `CHANGELOG.md` | Version history and changes | Developers |
| `TODO.md` | Project status and roadmap | Team members |
| `DEPLOYMENT_READINESS.md` | Pre-deployment checklist | Operators |
| `CONTRIBUTING.md` | Contribution guidelines | Developers |
| `AUDIT_SUMMARY.md` | Quick audit summary | Auditors/Managers |
| `CODEBASE_AUDIT_REPORT.md` | Detailed audit analysis | Technical leads |
| `INSTALLER_RELEASE_NOTES_v1.9.8.md` | v1.9.8 release notes | End users |

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

### User Documentation

Located in `docs/user/`:

- `QUICK_START_GUIDE.md` - End-user quick start
- `LOCALIZATION.md` - Internationalization setup
- `PWA_SETUP_GUIDE.md` - PWA features guide
- `QUICK_REFERENCE_MANUAL.md` - User reference manual
- `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md` - Greek language user guide

### Security Documentation

Located in `docs/`:

- `SECURITY.md` - Comprehensive security guide
- `SECURITY_AUDIT_REPORT.md` - Security audit findings
- `SECURITY_FIX_SUMMARY.md` - Security fixes applied

### Reference Documentation

Located in `docs/reference/`:

- `session-import-safety.md` - Session import procedures
- Various API and feature references

---

## Navigation by Use Case

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
3. Check `docs/SECURITY.md` for security measures
4. Review test files in `backend/tests/` and `frontend/tests/`

### I Need to Troubleshoot an Issue

**Quick checklist:**

1. Check relevant documentation in `docs/`
2. Review `CHANGELOG.md` for known issues
3. Check logs: `backend/logs/app.log` or browser console
4. Review GitHub issues for similar problems

### I Want to Review Security

**Start with:** `docs/SECURITY.md`

1. Review security guide (15 sections)
2. Check `docs/SECURITY_AUDIT_REPORT.md`
3. Review `docs/SECURITY_FIX_SUMMARY.md`
4. Check authentication: `docs/development/AUTHENTICATION.md`

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
├── TODO.md                        (project status)
├── DEPLOYMENT_READINESS.md        (pre-deployment)
├── AUDIT_SUMMARY.md               (quick audit)
├── CODEBASE_AUDIT_REPORT.md       (detailed audit)
├── CONTRIBUTING.md                (contribution guide)
└── INSTALLER_RELEASE_NOTES_v1.9.8.md (release notes)
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
├── development/                   (development guides)
├── deployment/                    (deployment guides)
├── user/                          (user guides)
├── reference/                     (API references)
├── SECURITY.md                    (security guide)
└── ARCHITECTURE.md                (system design)
```

### Archive
```
archive/
├── pre-v1.9.1/                    (legacy content)
├── pre-v1.9.7-docker-scripts/     (old docker helpers)
├── root_docs_cleanup_2025-12-05/  (archived root docs)
├── sessions/                      (session artifacts)
├── deprecated_commit_scripts_2025-11-27/
└── README.md                      (archive guide)
```

---

## Key Statistics

### Documentation
- **Total files:** 50+ guides
- **Total pages:** Comprehensive coverage
- **Translations:** English + Greek (select files)
- **Updated:** December 5, 2025

### Codebase
- **Backend:** FastAPI + SQLAlchemy
- **Frontend:** React 19.2.0 + TypeScript + Vite
- **Tests:** 360+ backend tests (100% passing)
- **Code quality:** 10/10 (Production Ready)

### Version
- **Current:** 1.9.8
- **Status:** Production Ready
- **Release Date:** December 4, 2025
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
2. **Security?** → `docs/SECURITY.md`
3. **API?** → `backend/CONTROL_API.md`
4. **Git?** → `docs/development/GIT_WORKFLOW.md`

### For Auditors/Managers

1. **Code quality?** → `AUDIT_SUMMARY.md` (10/10 rating)
2. **Detailed analysis?** → `CODEBASE_AUDIT_REPORT.md`
3. **Security posture?** → `docs/SECURITY_AUDIT_REPORT.md`
4. **Release info?** → `INSTALLER_RELEASE_NOTES_v1.9.8.md`

---

## Documentation Updates

### December 5, 2025 (v1.9.8)
- ✅ Archived obsolete documentation (17 files)
- ✅ Updated main documentation index
- ✅ Created comprehensive audit reports
- ✅ Consolidated documentation structure

### Previous Updates
- See `CHANGELOG.md` for complete version history
- See `archive/pre-v1.9.1/CHANGELOG_ARCHIVE.md` for legacy history

---

## Version Information

**Documentation Version:** v1.9.8  
**Last Updated:** December 5, 2025  
**Status:** Current and Complete

All documentation reflects the current state of the codebase and is verified accurate as of v1.9.8.
