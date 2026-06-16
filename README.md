# Student Management System

[![CI/CD Pipeline](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci-cd-pipeline.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci-cd-pipeline.yml)
[![CodeQL](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/bs1gr/AUT_MIEEK_SMS?sort=semver)](https://github.com/bs1gr/AUT_MIEEK_SMS/releases)

**Built for:** [ΜΙΕΕΚ - Μεταλυκειακά Ινστιτούτα Επαγγελματικής Εκπαίδευσης και Κατάρτισης](https://www.mieek.ac.cy/index.php/el/)
**Location:** Limassol, Cyprus
**Version:** v1.18.30 (Production Ready)

Bilingual (EN/EL) student management system with dual deployment modes: Docker production stack and native development mode. Features RBAC, analytics dashboards, bulk import/export, attendance tracking, and a Windows installer.

---

## Current Status (June 2026)

- Backend tests: 929 passing
- Frontend tests: 1,939 passing
- E2E tests: 82 passing
- Installer: `SMS_Installer_1.18.30.exe` (25.08 MB), signed

See [CHANGELOG.md](CHANGELOG.md) for full version history.

---

## For AI Agents

Read [CLAUDE.md](CLAUDE.md) before working on this project. It contains all mandatory policies, critical commands, and project rules. Also read [docs/AGENT_POLICY_ENFORCEMENT.md](docs/AGENT_POLICY_ENFORCEMENT.md) for full policy details.

---

## Quick Start

### End Users — Windows Installer

1. Download `SMS_Installer_1.18.30.exe` from [GitHub Releases](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest)
2. Right-click → **Run as Administrator**
3. Follow the installation wizard
4. Choose your edition:
   - **Lite Edition** (`SMS_Lite.exe`) — Standalone, no Docker needed. Recommended for individual teachers.
   - **Docker Edition** — Full deployment with Docker Desktop required.
5. Launch from the desktop shortcut

Edition guides:
- [Lite Edition](docs/deployment/LITE_EDITION_GUIDE.md)
- [Docker Edition](docs/deployment/DOCKER_DEPLOYMENT_GUIDE.md)
- [QNAP NAS Deployment](docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md)

### First-Time Login

Default credentials (change immediately after first login):

- **Email:** `admin@example.com`
- **Password:** `YourSecurePassword123!`

After login: Control Panel → Maintenance → Change Your Password.

---

## Developer Setup

### Deployment modes

| Mode | Script | Ports | Use for |
|------|--------|-------|---------|
| Native | `.\infra\scripts\dev\NATIVE.ps1 -Start` | 8000 + 5173 | Development and testing |
| Docker | `.\infra\scripts\dev\DOCKER.ps1 -Start` | 8080 | Production only |

These are the only two entry points. Never swap them.

### Native development commands

```powershell
.\infra\scripts\dev\NATIVE.ps1 -Setup     # Install dependencies (first time)
.\infra\scripts\dev\NATIVE.ps1 -Start     # Backend + frontend with hot-reload
.\infra\scripts\dev\NATIVE.ps1 -Backend   # Backend only (FastAPI :8000)
.\infra\scripts\dev\NATIVE.ps1 -Frontend  # Frontend only (Vite :5173)
.\infra\scripts\dev\NATIVE.ps1 -Stop      # Stop all processes
.\infra\scripts\dev\NATIVE.ps1 -Status    # Show what's running
```

### Docker production commands

```powershell
.\infra\scripts\dev\DOCKER.ps1 -Start        # Start (auto-build if needed)
.\infra\scripts\dev\DOCKER.ps1 -Stop         # Stop cleanly
.\infra\scripts\dev\DOCKER.ps1 -Update       # Fast update (cached)
.\infra\scripts\dev\DOCKER.ps1 -UpdateClean  # Clean rebuild
.\infra\scripts\dev\DOCKER.ps1 -Status       # Health check
.\infra\scripts\dev\DOCKER.ps1 -Backup       # Manual backup
.\infra\scripts\dev\DOCKER.ps1 -Logs         # Tail backend logs
```

### Testing

```powershell
# ALWAYS use the batch runner locally (direct pytest crashes VS Code)
.\infra\scripts\testing\RUN_TESTS_BATCH.ps1

# Frontend tests
npm --prefix src/frontend run test -- --run

# Pre-commit validation gate
.\infra\scripts\ops\COMMIT_READY.ps1 -Quick
```

### Linting

```powershell
python -m ruff check src/backend/ --fix     # Python (auto-fix)
npm --prefix src/frontend run lint -- --fix  # TypeScript (auto-fix)
```

---

## Project Structure

```
student-management-system/
├── CLAUDE.md                    # AI agent guide (read first)
├── README.md                    # This file
├── CHANGELOG.md                 # Version history
├── VERSION                      # Current version
│
├── src/
│   ├── backend/                 # FastAPI (Python 3.13), Alembic, SQLAlchemy
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── alembic/
│   │   └── tests/
│   └── frontend/                # React + Vite + TypeScript, bilingual EN/EL
│       └── src/
│           ├── features/
│           ├── components/
│           └── i18n/locales/    # Translation files (en/ and el/)
│
├── infra/
│   ├── docker/                  # Docker Compose files
│   ├── installer/               # Inno Setup + build scripts
│   └── scripts/
│       ├── dev/                 # NATIVE.ps1, DOCKER.ps1
│       ├── ops/                 # COMMIT_READY.ps1
│       ├── testing/             # RUN_TESTS_BATCH.ps1
│       └── release/             # RELEASE_READY.ps1, INSTALLER_BUILDER.ps1
│
├── docs/
│   ├── plans/                   # UNIFIED_WORK_PLAN.md (active planning)
│   ├── deployment/              # Deployment runbooks
│   ├── user/                    # End-user guides
│   ├── admin/                   # RBAC and admin guides
│   ├── reference/               # Quick reference sheets
│   └── DOCUMENTATION_INDEX.md  # Master navigation index
│
├── monitoring/                  # Grafana, Prometheus, Loki config
└── archive/                     # Historical session documents
```

---

## Key Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | AI agent mandatory guide |
| [docs/plans/UNIFIED_WORK_PLAN.md](docs/plans/UNIFIED_WORK_PLAN.md) | Active work and release state |
| [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) | All documentation navigation |
| [docs/AGENT_POLICY_ENFORCEMENT.md](docs/AGENT_POLICY_ENFORCEMENT.md) | Full policy details |
| [docs/deployment/LITE_EDITION_GUIDE.md](docs/deployment/LITE_EDITION_GUIDE.md) | Lite edition for teachers |
| [docs/user/RBAC_GUIDE.md](docs/user/RBAC_GUIDE.md) | Roles and permissions |
| [CHANGELOG.md](CHANGELOG.md) | Full version history |

---

## Security

- RBAC with role-based endpoint protection (`optional_require_role()`)
- Password strength validation, login throttling, CSRF protection
- All admin endpoints respect `AUTH_MODE` for emergency access
- See [docs/security/](docs/security/) for full security documentation

---

## Requirements

- **Docker Edition:** Windows 10/11 + Docker Desktop
- **Native Dev:** Python 3.13, Node.js 18+, PowerShell 7+
- **Lite Edition:** Windows 10/11, no Docker needed

---

## Backend Environment

Key environment variables are documented in `src/backend/ENV_VARS.md`. In CI, tests run with `DISABLE_STARTUP_TASKS=1` to skip migrations and background tasks on import.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
