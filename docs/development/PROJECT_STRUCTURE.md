# Documentation Structure

**Last Updated**: 2025-11-16
**Version**: 1.7.0

## 📁 Directory Organization

```text
docs/
├── user/                          # End-user guides
│   ├── QUICK_START_GUIDE.md       # → Quick start for users
│   ├── THEMES_SUMMARY.md          # → Theme customization guide
│   └── LOCALIZATION.md            # → Language/i18n guide
│
├── development/                   # Developer guides
│   ├── ARCHITECTURE.md            # → System architecture
│   ├── AUTHENTICATION.md          # → Auth implementation
│   ├── API_EXAMPLES.md            # → API usage examples
│   ├── ARCHITECTURE_DIAGRAMS.md   # → System diagrams
│   ├── LOAD_TEST_PLAYBOOK.md      # → Performance testing
│   └── DEVELOPER_FAST_START.md    # → Developer onboarding
│
├── deployment/                    # Operations & deployment
│   ├── RUNBOOK.md                 # → Deployment procedures
│   ├── DOCKER_OPERATIONS.md       # → Docker commands
│   ├── DEPLOY.md                  # → Deployment guide
│   └── TROUBLESHOOTING.md         # → Common issues & fixes
│
├── releases/                      # Release documentation
│   └── v*.md                      # Version-specific notes
│
└── archive/                       # Historical documents
    └── ...                        # Deprecated docs

```text
## 📚 Core Documentation (Root Level)

These stay at project root for discoverability:

- `README.md` - Main project documentation
- `CHANGELOG.md` - Version history
- `docs/plans/UNIFIED_WORK_PLAN.md` - Current roadmap
- `INSTALLATION_GUIDE.md` - Installation steps
- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `LICENSE` - Project license

## 🎯 Quick Navigation

### For Users

- **Getting Started**: [README.md](../README.md) → [INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md)
- **Quick Start**: [docs/user/QUICK_START_GUIDE.md](user/QUICK_START_GUIDE.md)
- **Customization**: [docs/user/THEMES_SUMMARY.md](user/THEMES_SUMMARY.md)
- **Languages**: [docs/user/LOCALIZATION.md](user/LOCALIZATION.md)

### For Developers

- **Architecture**: [docs/development/ARCHITECTURE.md](development/ARCHITECTURE.md)
- **API Guide**: [docs/development/API_EXAMPLES.md](development/API_EXAMPLES.md)
- **Auth System**: [docs/development/AUTHENTICATION.md](development/AUTHENTICATION.md)
- **Testing**: [frontend/tests/e2e/README.md](../frontend/tests/e2e/README.md)

### For Operators

- **Deployment**: [docs/deployment/RUNBOOK.md](deployment/RUNBOOK.md)
- **Docker Ops**: [docs/deployment/DOCKER_OPERATIONS.md](deployment/DOCKER_OPERATIONS.md)
- **Troubleshooting**: [docs/deployment/TROUBLESHOOTING.md](deployment/TROUBLESHOOTING.md)

## 🔄 Migration Status

### Moved to User Docs

- ✅ `QUICK_START_GUIDE.md` → `docs/user/`
- ✅ `THEMES_SUMMARY.md` → `docs/user/`
- ✅ `LOCALIZATION.md` → `docs/user/`

### Moved to Development Docs

- ✅ `ARCHITECTURE.md` → Already in `docs/development/`
- ✅ `AUTHENTICATION.md` → `docs/development/`
- ✅ `DEVELOPER_FAST_START.md` → `docs/development/`

### Moved to Deployment Docs

- ✅ `DOCKER_OPERATIONS.md` → `docs/deployment/`
- ✅ `DEPLOY.md` → `docs/deployment/`
- ✅ `FRESH_DEPLOYMENT_TROUBLESHOOTING.md` → `docs/deployment/TROUBLESHOOTING.md`

### Consolidated

- ✅ Created unified `docs/deployment/TROUBLESHOOTING.md` from:
  - `FRESH_DEPLOYMENT_TROUBLESHOOTING.md`
  - `REBUILD_TROUBLESHOOTING.md`
  - `DOCKER_CLEANUP.md` (now archived; cleanup content lives in `docs/reference/DOCKER_CLEANUP_GUIDE.md`)

## 📋 Index Files

Each directory contains an `INDEX.md`:

- `docs/user/INDEX.md` - User documentation index
- `docs/development/INDEX.md` - Developer documentation index
- `docs/deployment/INDEX.md` - Operations documentation index

## 🗑️ Cleanup Actions

Files moved to `archive/` (historical reference only):

- Completed analyses
- One-time migration docs
- Superseded guides
- Temporary planning docs

## 📊 Documentation Health Monitoring

GitHub Action `.github/workflows/doc-audit.yml` runs weekly to:

- Check last-modified dates
- Validate status tags
- Report stale documentation
- Ensure consistent structure

## 🔍 Finding Documentation

1. **Start with README.md** - Overview and getting started
2. **Check UNIFIED_WORK_PLAN.md** - Current priorities and roadmap
3. **Browse by role**:
   - User → `docs/user/`
   - Developer → `docs/development/`
   - Operator → `docs/deployment/`

4. **Search by topic** - Use this index or GitHub search

## 📝 Contributing to Documentation

When adding new documentation:

1. Place in appropriate directory (`user/`, `development/`, `deployment/`)
2. Update relevant `INDEX.md`
3. Add entry to this structure document
4. Include status tag: `Status: Active`, `Status: Draft`, etc.
5. Add last-updated date in frontmatter
