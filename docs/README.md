# SMS Documentation

Welcome to the Student Management System documentation hub.

## 📚 Quick Navigation

| Role | Start Here | Description |
|------|-----------|-------------|
| 👤 **End User** | [user/](user/) | Installation, usage guides, features |
| 💻 **Developer** | [development/](development/) | Architecture, API, development setup |
| 🛠️ **Operations** | [operations/](operations/) | Runbooks, smoke tests, monitoring |
| 🚀 **DevOps** | [deployment/](deployment/) | Deployment, infrastructure, troubleshooting |
| 📖 **Reference** | [reference/](reference/) | Quick guides, security, features |
| 📦 **Releases** | [releases/](releases/) | Release notes and audits |

## 🗂️ Directory Structure

```text
docs/
├── DOCUMENTATION_INDEX.md   # Canonical index
├── README.md                # This overview
├── CONFIG_STRATEGY.md       # Environment configuration strategy
├── development/             # Developer documentation
│   ├── INDEX.md
│   ├── DEVELOPER_GUIDE_COMPLETE.md
│   ├── ARCHITECTURE.md
│   └── phase-reports/
├── deployment/              # Deployment runbooks & guides
│   ├── INDEX.md
│   ├── DOCKER_OPERATIONS.md
│   └── PRODUCTION_DOCKER_GUIDE.md
├── operations/              # Operations, scripts, smoke tests
│   ├── INSTALLATION_GUIDE.md
│   ├── SCRIPTS_GUIDE.md
│   └── SMOKE_TEST_CHECKLIST_v1.12.md
├── reference/               # Quick reference guides
│   ├── SECURITY_GUIDE_COMPLETE.md
│   └── session-import-safety.md
├── releases/                # Release notes & audits
│   ├── RELEASE_NOTES_1.12.2.md
│   └── RELEASE_SUMMARY_1.12.2.md
└── archive/                 # Archived materials
    ├── documentation/
    └── pr-updates/
```

## 📖 Core Documents

### Getting Started

- **[../README.md](../README.md)** - Main project README
- **[user/QUICK_START_GUIDE.md](user/QUICK_START_GUIDE.md)** - 5-minute quick start
- **[operations/INSTALLATION_GUIDE.md](operations/INSTALLATION_GUIDE.md)** - Full installation guide

### Comprehensive Guides

- **[user/USER_GUIDE_COMPLETE.md](user/USER_GUIDE_COMPLETE.md)** - Complete user manual
- **[development/DEVELOPER_GUIDE_COMPLETE.md](development/DEVELOPER_GUIDE_COMPLETE.md)** - Complete developer guide

### System Documentation

- **[development/ARCHITECTURE.md](development/ARCHITECTURE.md)** - System architecture
- **[deployment/DOCKER_OPERATIONS.md](deployment/DOCKER_OPERATIONS.md)** - Docker operations
- **[reference/SECURITY_GUIDE_COMPLETE.md](reference/SECURITY_GUIDE_COMPLETE.md)** - Security best practices and audits
- **[operations/SMOKE_TEST_CHECKLIST_v1.12.md](operations/SMOKE_TEST_CHECKLIST_v1.12.md)** - Release-ready smoke validation

## 🔍 Finding What You Need

### I want to

**Install the system**
→ [operations/INSTALLATION_GUIDE.md](operations/INSTALLATION_GUIDE.md)

**Deploy to production**
→ [deployment/](deployment/)

**Develop new features**
→ [development/DEVELOPER_GUIDE_COMPLETE.md](development/DEVELOPER_GUIDE_COMPLETE.md)

**Learn about architecture**
→ [development/ARCHITECTURE.md](development/ARCHITECTURE.md)

**Troubleshoot issues**
→ [operations/FRESH_DEPLOYMENT_TROUBLESHOOTING.md](operations/FRESH_DEPLOYMENT_TROUBLESHOOTING.md)

**Understand a feature**
→ [reference/](reference/)

**Check release notes**
→ [releases/](releases/)

## 🌍 Internationalization

Greek documentation is available:

- **[user/ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](user/ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)** - Greek quick start
- **[user/ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](user/ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - Greek user guide

## 📋 Documentation Index

For a complete catalog of all documentation, see:
**[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)**

## 🔄 Version

**Current Version:** 1.12.2
**Last Updated:** 2025-12-13

## 📝 Contributing

When contributing documentation:

1. Place files in the appropriate directory
2. Update relevant INDEX.md files
3. Update [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
4. Follow markdown linting rules (see [../.markdownlint.json](../.markdownlint.json))

## 📧 Feedback

Found issues with documentation? Create a GitHub issue with the `documentation` label.
