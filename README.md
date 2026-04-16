# Student Management System

![Markdown Lint](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/markdown-lint.yml/badge.svg?branch=main)
![CI/CD Pipeline](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci-cd-pipeline.yml/badge.svg?branch=main)
![Backend Tests](https://img.shields.io/badge/Backend%20Tests-742%20passing-brightgreen)
![Frontend Tests](https://img.shields.io/badge/Frontend%20Tests-1249%20passing-brightgreen)
![Phase Status](https://img.shields.io/badge/Phase%206-Complete-blue)

**Built for:** [ΜΙΕΕΚ - Μεταλυκειακά Ινστιτούτα Επαγγελματικής Εκπαίδευσης και Κατάρτισης](https://www.mieek.ac.cy/index.php/el/)
**Location:** Limassol, Cyprus
**Developer:** Teacher at ΜΙΕΕΚ
$11.18.18 (Production Ready)

---

## 🎉 Current Status (February 4, 2026)

✅ **Phase 6 Complete - Production Live**
- All 742 backend tests passing (100%)
- All 1249 frontend tests passing (100%)
- All 19+ E2E tests passing (100%)
- Installer $1.18.8 ready for deployment
- Code security verified (path traversal prevention documented)
- Maintenance phase: Code health issues identified and documented

📖 See [CLEANUP_AND_COMPLETION_SUMMARY_JAN21.md][cleanup-summary]
for complete details.

[cleanup-summary]: CLEANUP_AND_COMPLETION_SUMMARY_JAN21.md

---

## 🤖 For AI Agents & Automation

**⚠️ MANDATORY:** All AI agents must read
[`docs/AGENT_POLICY_ENFORCEMENT.md`](docs/AGENT_POLICY_ENFORCEMENT.md)
before working on this project.

**Critical Policies:**
- ❌ NEVER run `pytest -q` directly → Use `\.\RUN_TESTS_BATCH.ps1` (prevents crashes)
- ❌ NEVER create new backlog/planning docs → Update `docs/plans/UNIFIED_WORK_PLAN.md`
- ❌ NEVER edit DB schema directly → Use Alembic migrations
- ✅ ALWAYS run `COMMIT_READY.ps1 -Quick` before committing

**Quick Start for Agents:** [`docs/AGENT_QUICK_START.md`](docs/AGENT_QUICK_START.md) (5 min onboarding)

---

## 📦 Quick Start

### **For End Users** — One-Click Installation ⭐ NEW

#### 🎯 Windows Installer (Easiest Method)

**GUI Installer** - No PowerShell knowledge required!

1. **Download** `SMS_Installer_X.X.X.exe` from [GitHub Releases](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest)
2. **Right-click** → **"Run as Administrator"**
3. **Follow** the installation wizard
4. **Install Docker Desktop** if prompted (the installer will check)
5. **Launch** from the desktop shortcut

**Features:**

- ✅ Professional Windows installer wizard
- ✅ Automatic Docker Desktop detection
- ✅ Desktop and Start Menu shortcuts
- ✅ Uninstaller included
- ✅ No PowerShell execution policy issues

> **Note:** Docker Desktop is required. The installer will guide you if it's not installed.

#### Alternative: ZIP Distribution

1. **Download** `SMS_Distribution_X.X.X.zip` from [GitHub Releases](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/latest)
2. **Extract** to any location (Desktop, Documents, etc.)
3. **Run** `DOCKER.ps1 -Install` in PowerShell (as Administrator)
4. **Follow** the prompts (~5-10 minutes first run)

**📖 Installer Documentation:** [installer/README.md](installer/README.md)

#### Fresh Installation / First-Time Setup (PowerShell Method)

Use the consolidated deployment script:

```powershell
# First-time installation (builds image, creates env files, initializes DB)
.\DOCKER.ps1 -Install
```

Performs automatically:

- ✅ System prerequisite checks (Docker Desktop running, PowerShell version)
- ✅ Secure environment file generation & SECRET_KEY validation
- ✅ Docker image build (cached on subsequent runs)
- ✅ Volume/database initialization & migration run
- ✅ Optional start prompt on success

Troubleshooting & full walkthrough: [DEPLOY_ON_NEW_PC.md](DEPLOY_ON_NEW_PC.md)

#### Already Installed? Daily Usage (Consolidated v2.0)

We migrated from 100+ scripts (RUN.ps1 / INSTALL.ps1 / SMS.ps1 / run-native.ps1 / SUPER_CLEAN_AND_DEPLOY.ps1) to **two primary entry points**:

**🎯 CRITICAL WORKFLOW RULE:**
```powershell
# ✅ TEST on Native (development with hot reload)
.\NATIVE.ps1 -Start          # Backend 8000 + Frontend 5173 (hot reload)

# ✅ DEPLOY on Docker (production container)
.\DOCKER.ps1 -Start          # Production deployment (port 8080)
```

**This is the ONLY correct workflow. Use NATIVE for testing, use DOCKER for deploying to production.**

Detailed commands:
- **`DOCKER.ps1`** – Production/staging & operator tasks
- **`NATIVE.ps1`** – Developer hot-reload workflow

See full mapping table in [SCRIPTS_CONSOLIDATION_GUIDE.md](archive/pre-$1.18.8/SCRIPTS_CONSOLIDATION_GUIDE.md) (archived).

##### 🎯 NEW: Desktop Shortcut (One-Click Start/Stop)

Create a desktop shortcut to toggle SMS with a single click:

```powershell
# Run once to create desktop shortcut
.\CREATE_DESKTOP_SHORTCUT.ps1
```

Then double-click "Student Management System" on your Desktop:

- **Click once** → Start SMS ✅
- **Click again** → Stop SMS 🛑

**📖 Quick Guide:** [DESKTOP_SHORTCUT_QUICK_START.md](DESKTOP_SHORTCUT_QUICK_START.md)

```powershell
# Docker Deployment (Production / Staging)
.\DOCKER.ps1 -Start          # Start (auto-build if image missing)
.\DOCKER.ps1 -Stop           # Stop container(s) cleanly
.\DOCKER.ps1 -Update         # Fast update (cached build + pre-backup)
.\DOCKER.ps1 -UpdateClean    # Clean update (no-cache build + pre-backup)
.\DOCKER.ps1 -Status         # Show status & health
.\DOCKER.ps1 -Logs           # Tail backend logs
.\DOCKER.ps1 -Backup         # Manual backup (timestamped)
.\DOCKER.ps1 -Help           # Full command reference

# Monitoring (optional stack)
.\DOCKER.ps1 -WithMonitoring  # Start app + Grafana/Prometheus

# Cleanup & Maintenance
.\DOCKER.ps1 -Prune          # Safe cleanup (stopped containers, dangling images)
.\DOCKER.ps1 -PruneAll       # Add unused networks (keeps volumes)
.\DOCKER.ps1 -DeepClean      # Nuclear cleanup (rebuild required afterwards)
```

**Native Development Mode (Developers):**

```powershell
.\NATIVE.ps1 -Setup          # Create venv + npm install
.\NATIVE.ps1 -Start          # Start backend (uvicorn --reload) + frontend (Vite HMR)
.\NATIVE.ps1 -Backend        # Backend only
.\NATIVE.ps1 -Frontend       # Frontend only
.\NATIVE.ps1 -Stop           # Stop all native processes
.\NATIVE.ps1 -Status         # Show active dev processes
.\NATIVE.ps1 -Clean          # Remove venv/node_modules build artifacts
.\NATIVE.ps1 -Help           # Command reference
```

**Native desktop toggle (Windows):**

```powershell
.\CREATE_NATIVE_SHORTCUT.ps1   # Create or refresh the "SMS Native Toggle" desktop shortcut
.\NATIVE_TOGGLE.ps1 status     # Show native status
.\NATIVE_TOGGLE.ps1 toggle     # Toggle native backend + frontend
.\NATIVE_TOGGLE.ps1 toggle -Explain  # Show why it chose start vs stop
```

What it does:

- Creates a dedicated `SMS Native Toggle` desktop shortcut for the native workflow only
- Uses the custom `SMS_Native_Toggle.ico` icon generated from `AUT_Logo.png`
- Starts or stops native backend/frontend with one double-click
- Automatically hides/removes the shortcut if `backend\.venv` or `frontend\node_modules` is missing

> **📖 Full Cleanup Guide:** See [docs/reference/DOCKER_CLEANUP_GUIDE.md](docs/reference/DOCKER_CLEANUP_GUIDE.md) for detailed instructions

**Requirements:**

- Windows 10/11 with [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- Docker Desktop must be running

**Access the application (Docker fullstack default port):** <http://localhost:8080>

### 🔐 Admin Login (First-Time Users)

**Good News:** Admin account is created automatically on first startup!

**⚠️ SECURITY WARNING: Default credentials below are INSECURE and must be changed!**

**Default Login Credentials (CHANGE IMMEDIATELY):**

- **Email:** `admin@example.com`
- **Password:** `YourSecurePassword123!`

**❗ CRITICAL - After First Login:**

1. Go to **Control Panel** → **Maintenance** tab
2. Use the "Change Your Password" section (teal card at top)
3. Set your own secure password immediately

> **🔐 PRODUCTION SECURITY:** These default credentials are intentionally weak examples.
> **NEVER deploy to production without changing them first!**
> Generate strong password: `python -c "import secrets; print(secrets.token_urlsafe(24))"`

**Technical Details:**
The admin account is automatically bootstrapped when the application starts because the `.env` file has these values configured:

```dotenv
AUTH_ENABLED=True
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
DEFAULT_ADMIN_FULL_NAME=System Administrator
```

Note about automated admin password rotation:

- DEFAULT_ADMIN_AUTO_RESET (default: false) — when enabled, if the configured
  DEFAULT_ADMIN_PASSWORD differs from the password stored in the database for
  the default admin account, the application will update the DB password on
  startup and revoke any existing refresh tokens for that user. This is
  intended to make automated credential rotation (e.g., via CI/CD or secret
  managers) safe and predictable. The flag is intentionally off by default to
  avoid surprising changes in production.

**If Login Fails:**
If you get "Invalid email or password", the admin user might not have been created. Run:

```powershell
# For Docker:
docker exec sms-app python /app/backend/tools/create_admin.py --email admin@example.com --password "YourSecurePassword123!"

# For Native mode:
python backend/tools/create_admin.py --email admin@example.com --password "YourSecurePassword123!"
```

> **📖 Full Guide:** See [docs/user/QUICK_START_GUIDE.md](docs/user/QUICK_START_GUIDE.md) for detailed troubleshooting

**QNAP NAS Deployment** 🆕:

Deploy to QNAP Container Station with PostgreSQL database:

- See [docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md](docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md)
- Full management scripts and monitoring included
- Automatic backups and rollback capabilities

**Monitoring UI deprecation ($1.18.8):**

- The embedded Monitoring UI (Grafana/Prometheus/Raw Metrics) has been removed from the app.
- The Power page now focuses on System Health and the Control Panel only.
- The `/metrics` endpoint remains available when `ENABLE_METRICS=1` for external monitoring tools.
- Any existing monitoring stacks can still be run externally; in-app start/stop UI has been retired.

---

### **For Developers** – Native Development Mode (Hot Reload)

Use native mode for hot-reload development:

```powershell
# Native development (NEW v2.0 - Consolidated)
.\NATIVE.ps1 -Setup     # Install dependencies (first time)
.\NATIVE.ps1 -Start     # Start backend + frontend with hot-reload
.\NATIVE.ps1 -Backend   # Start backend only (uvicorn --reload)
.\NATIVE.ps1 -Frontend  # Start frontend only (Vite HMR)
.\NATIVE.ps1 -Stop      # Stop all processes
.\NATIVE.ps1 -Status    # Check what's running
.\NATIVE.ps1 -Help      # Show all commands

# Features:
# • Backend:  http://localhost:8000 (FastAPI with hot-reload)
# • Frontend: http://localhost:5173 (Vite with HMR)
# • API Docs: http://localhost:8000/docs
```

**Docker Deployment (Testing/Production):**

```powershell
.\DOCKER.ps1 -Start
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -Help
```

Full guides: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) · [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---


## ♿ Accessibility, Color Contrast & i18n Improvements (2025)

### Accessibility & Color Contrast

- All major frontend modules have been updated to meet WCAG AA color contrast standards.
- Font color classes now use high-contrast, vivid Tailwind colors (e.g., `text-indigo-700`, `text-indigo-800`) for improved readability and accessibility.
- Drop shadows and font weight are used to further enhance text clarity on light backgrounds.
- All UI changes are validated with automated and manual accessibility checks.

**Best Practice:**
When adding or updating UI components, always:
- Use high-contrast color classes for text (avoid `text-gray-500/600/700` for primary content)
- Validate with accessibility tools (e.g., Lighthouse, axe)
- Ensure ARIA roles/labels are present where needed

### Internationalization (i18n)

- All UI strings are managed via modular TypeScript translation files (`frontend/src/locales/{en,el}/*.ts`).
- Never hardcode UI text; always use `t('key')` from the translation context.
- Translation integrity is enforced by tests; both EN and EL must be present for all keys.

**See also:**
- [docs/user/LOCALIZATION.md](docs/user/LOCALIZATION.md) for i18n setup and translation workflow
- [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md) for frontend structure and accessibility patterns

---
## 🗂️ Project Consolidation (v2.0)

### Scripts Consolidation ✅

All legacy scripts (`RUN.ps1`, `INSTALL.ps1`, `SMS.ps1`, `scripts/dev/run-native.ps1`, `SUPER_CLEAN_AND_DEPLOY.ps1`) consolidated into **two primary entry points**:

| Entry Point | Purpose | Key Features |
|------------|---------|--------------|
| **DOCKER.ps1** | Production/Staging deployment | Install, Start/Stop, Update, Monitoring, Backups, Cleanup, Logs |
| **NATIVE.ps1** | Developer hot-reload | Setup deps, Backend/Frontend, Start/Stop, Status, Clean |

**Benefits:**

- ✅ 54% code reduction (4,181 → 1,900 lines)
- ✅ 67% fewer entry points (6 → 2 scripts)
- ✅ Unified command patterns
- ✅ 100% feature parity maintained
- ✅ Better error handling and diagnostics

**Migration:** See [SCRIPTS_CONSOLIDATION_GUIDE.md](archive/pre-$1.18.8/SCRIPTS_CONSOLIDATION_GUIDE.md) for complete command mapping and migration guide (archived).

**Archived:** Legacy scripts preserved in `archive/pre-$1.18.8/deprecated/scripts_consolidation_2025-11-21/`

### Documentation Consolidation ✅

Systematic documentation organization following role-based structure:

```text
docs/
├── user/          # End-user guides
├── development/   # Developer documentation (including GIT_WORKFLOW.md)
├── deployment/    # DevOps & operations
├── operations/    # Administrative tasks
├── reference/     # Quick references
└── DOCUMENTATION_INDEX.md  # Master navigation index
```

**Root Directory:** Reduced from 15+ markdown files to essential documents

- README.md (main entry point)
- CHANGELOG.md (version history)
- DESKTOP_SHORTCUT_QUICK_START.md (user feature)

**Archived:** Session documents moved to `archive/sessions_2025-11/`

**Master Index:** [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md)

---

## 📂 Project Structure

### Root Directory Organization

The repository follows best practices for clean project organization:

```text
student-management-system/
├── 📄 README.md                 # Main documentation
├── 📄 CHANGELOG.md              # Version history
├── 📄 docs/plans/UNIFIED_WORK_PLAN.md  # Planning source of truth
├── 📄 LICENSE                   # MIT License
├── 📄 VERSION                   # Current version (1.18.8)
│
├── 🐳 DOCKER.ps1                # Production deployment script
├── 💻 NATIVE.ps1                # Development mode script
├── ✅ COMMIT_READY.ps1           # Unified pre-commit validation & cleanup
│
├── 📚 docs/                     # Documentation (role-based)
│   ├── user/                    # End-user guides
│   ├── development/             # Developer documentation
│   ├── deployment/              # DevOps & operations
│   ├── operations/              # Administrative tasks
│   ├── reference/               # Quick references
│   └── DOCUMENTATION_INDEX.md   # Master index
│
├── 🐳 docker/                   # Docker configuration
│   ├── docker-compose.yml       # Main compose file
│   ├── docker-compose.prod.yml  # Production configuration
│   ├── docker-compose.qnap.yml  # QNAP NAS configuration
│   └── docker-compose.monitoring.yml  # Monitoring stack
│
├── ⚙️  config/                  # Configuration files
│   ├── mypy.ini                 # Type checking config
│   ├── pytest.ini               # Testing config
│   └── ruff.toml                # Linting config
│
├── 🔧 scripts/                  # Utility scripts
│   ├── internal/                # Internal utilities
│   ├── dev/                     # Development tools
│   ├── deploy/                  # Deployment scripts
│   └── ops/                     # Operations automation
│
├── 🗄️  archive/                # Historical documents
│   ├── sessions_2025-11/        # November session docs
│   └── deprecated/              # Deprecated scripts
│
├── 🔙 backend/                  # FastAPI application
│   ├── main.py                  # Application entry point
│   ├── models.py                # SQLAlchemy models
│   ├── routers/                 # API endpoints
│   ├── schemas/                 # Pydantic schemas
│   └── tests/                   # Backend tests
│
├── 🎨 frontend/                 # React application
│   ├── src/                     # Source code
│   ├── public/                  # Static assets
│   └── package.json             # NPM dependencies
│
├── 📊 monitoring/               # Monitoring configuration
│   ├── grafana/                 # Grafana dashboards
│   └── prometheus/              # Prometheus config
│
└── 🛠️  tools/                   # Specialized tools
    ├── installer/               # Windows installer wizard
    └── backup_tools.ps1         # Backup utilities
```

**Key Principles:**

- ✅ **Minimal Root** - Only 3 essential .md files + main scripts
- ✅ **Organized Configs** - All config files in `config/` directory
- ✅ **Clear Separation** - Docker, scripts, docs in dedicated directories
- ✅ **Archived History** - Session documents in `archive/`
- ✅ **Documentation Hub** - All docs indexed in `docs/DOCUMENTATION_INDEX.md`

---

## 📚 Documentation / Τεκμηρίωση

➡️ For a complete, always-current list of all guides, troubleshooting references, and release/process documentation, see the master index: [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md).

- 🇬🇧 **English**: [README.md](README.md) (this file)
- 🇬🇷 **Ελληνικά**:
  - [⚡ Γρήγορη Εκκίνηση](ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md) - Quick start guide
  - [📖 Πλήρης Οδηγός Χρήσης](ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md) - Complete user manual
- 🧾 **Release Asset Inventory**: [docs/DEPLOYMENT_ASSET_TRACKER.md](docs/DEPLOYMENT_ASSET_TRACKER.md) – authoritative list of scripts, workflows, and runbooks required for deployments.

## Backend Runtime Configuration (env)

See `backend/ENV_VARS.md` for recommended environment variables and secure defaults. In CI the test job runs with `DISABLE_STARTUP_TASKS=1` to avoid running migrations and background startup tasks when tests import the application.

---

[![CI](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci.yml) [![Markdown Lint](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/markdown-lint.yml/badge.svg?branch=main)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/markdown-lint.yml) [![Release](https://img.shields.io/github/v/release/bs1gr/AUT_MIEEK_SMS?sort=semver)](https://github.com/bs1gr/AUT_MIEEK_SMS/releases)

## 🆕 Latest Highlights

### Security & Auth

- Admin endpoints now respect `AUTH_MODE` via `optional_require_role()` (emergency access honored when disabled).
- Password strength validation, login throttling & lockout, CSRF protection implemented.

### Windows GUI Installer Suite

- Visual 7-step installer & 5-step uninstaller executables (wizard experience, Docker auto-install, real-time logs).
- Executable builder with PS2EXE/Inno Setup/Advanced Installer support.

### Script Consolidation

- Replaced RUN/INSTALL/SMS/native scripts with `DOCKER.ps1` & `NATIVE.ps1` (single-source management).

### Performance & UX

- Eager loading & caching improvements; memoized heavy React components; bundle code-splitting.

### Documentation

- Consolidated structure (`docs/user`, `docs/deployment`, `docs/development`) & master index updated.
- RBAC (roles & permissions): `docs/user/RBAC_GUIDE.md` explains defaults, admin endpoints, and safeguards.

Full release notes: `CHANGELOG.md` (sections 1.18.8.0–1.18.8.4).

---

## Historical Highlights (Selected)

### $1.18.8 – Control API Re-base Path & Restart UX

Canonical `/control/api/*` path, shared `CONTROL_API_BASE`, restart UX improvements.

### $1.18.8 – Repository Cleanup

Systematic cleanup & maintainability upgrades.

### $1.18.8 – Release Archive Pipeline

Legacy release archival & GHCR retirement guidance.

### Latest Updates (November 2025)

- 🚪 **Canonical Control API path:** Operational endpoints now sit under `/control/api/*`, decoupling them from the public REST surface and matching the FastAPI lifespan design.
- 🔗 **Shared Control API base helper:** Frontend utilities export `CONTROL_API_BASE`, so Control Panel components, backups, and restart workflows all target the same origin with zero string duplication.
- ♻️ **Restart UX polish:** Buttons render backend hints (Docker vs. native), localized fallbacks, and instructions for configuring shutdown tokens so operators always know why a restart is blocked.
- 📘 **Documentation refresh:** README, `CHANGELOG.md`, and `backend/CONTROL_API.md` explain the new base path, while fresh release notes live in `docs/releases/$1.18.8.md`.

---

<!-- Older detailed release sections trimmed for brevity. See CHANGELOG.md for full history. -->

### Latest Updates (November 2025)

- 🧹 **Comprehensive codebase cleanup:** Systematically cleaned root directory, archived historical docs, consolidated duplicate scripts, improved file organization (see `CLEANUP_SUMMARY.md`)
- 📊 **Codebase health improved:** 7.5/10 → 8.5/10 rating with better organization and zero duplication
- 📚 **Enhanced documentation:** Added comprehensive analysis report, cleanup automation script, and integration guides
- ✅ **Zero breaking changes:** All 246 backend + 929 frontend tests passing, application fully operational
- 🎯 **Better maintainability:** Canonical script locations, proper file organization, updated references

---

## 📦 What's New in $1.18.8

- 🗂️ **Legacy release archive surfaced:** All GitHub releases at or below $1.18.8 are now labeled as archived, link to the repo’s new `archive/` directory, and bundle their last-known binaries for audit purposes.
- 📦 **GitHub Packages retirement playbook:** Added guidance in the docs and management scripts for deleting or privatizing the three obsolete packages so downstream deployments don’t accidentally pull stale artifacts.
- 🧭 **Release management docs refreshed:** README, CHANGELOG, and the documentation index now call out $1.18.8 as the active release and explain how the archive flow works for operators.
- 📝 **Release notes automation hooks:** Introduced a dedicated `docs/releases/$1.18.8.md` source of truth so GitHub Releases can be generated straight from the repo without copy/paste drift.
- 🧰 **Operator visibility:** Control Panel + RUN/SMS scripts reference the new archive path in their troubleshooting copy, keeping previously removed helpers discoverable but isolated from day-to-day workflows.
- 🔒 **Compliance follow-up:** Documented the Starlette 1.18.8 patch and attendance-export safeguards inside the new release so auditors have a single entry point for the recent security hardening.
- 📣 **Upgrade messaging:** Added explicit instructions for tagging/publishing the new release and for consumers who need to migrate automation off the deprecated assets.

## 📦 Releases

- Latest: [$1.18.8](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/$1.18.8) – Phase 3 Features (Analytics, Notifications, Bulk Import/Export)
- Previous: [$1.18.8](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/$1.18.8) – RBAC System Implementation
- Archive: [$1.18.8](https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/$1.18.8) – Phase 1 Completion
- All releases: <https://github.com/bs1gr/AUT_MIEEK_SMS/releases>

ℹ️ Publish the exact notes shown above via `docs/releases/$1.18.8.md` using `gh release create $1.18.8 --notes-file docs/releases/$1.18.8.md`.

---

## 📦 What's New in $1.18.8

- 🟢 **Canonical entry points:** Consolidated to `DOCKER.ps1` (Docker deployment) and `NATIVE.ps1` (native development). All legacy scripts (`RUN.ps1`, `INSTALL.ps1`, `SMS.ps1`, `run-native.ps1`) were archived in v2.0.
- 🔒 **Security:** Documented the optional `SECRET_KEY_STRICT_ENFORCEMENT` flag that rejects placeholder secrets when you turn it on. Keep it enabled for hardened deployments; local setups can leave it off until the next security release.
- 🧹 **Script cleanup:** All obsolete scripts (`QUICKSTART.ps1`, `SETUP.ps1`, etc.) removed. Documentation and references updated.
- 🛡️ **Robust error handling:** PowerShell scripts now handle null/empty values and pipeline errors gracefully.
- 📄 **Documentation:** All guides updated to reflect the new minimal entry points and security best practices.

---

## 📦 What's New in $1.18.8

- 🚀 **One-click deployment** with `DOCKER.ps1` (formerly `RUN.ps1`)
- 💾 **Automatic backups** before updates
- 🛑 **Graceful shutdown** with Ctrl+C
- 🏥 **Health check polling** with timeout
- 📊 **Backup management** (keeps last 10 automatically)
- 🔄 **Update command** with rollback capability
- 🎯 **Fullstack Docker** as default (single container)
- 🛠️ **Dev mode** option for multi-container setup

---

## 🚀 Quick Start

**New to the project?** Use the automatic setup:

```powershell
# Download from GitHub releases and extract, then run:
.\SETUP_AFTER_GITHUB_ZIP.ps1
```

This automatically installs everything! Or use the classic method: ($1.18.8)

### **Recommended Method** - One-Click Docker Deployment

**Start/Stop/Update:**

```powershell
.\DOCKER.ps1 -Start          # Start (default, auto-builds if needed)
.\DOCKER.ps1 -Stop           # Stop cleanly
.\DOCKER.ps1 -Update         # Fast update (cached build + backup)
.\DOCKER.ps1 -UpdateClean    # Clean update (no-cache build + backup)
.\DOCKER.ps1 -Prune          # Safe cleanup (dangling images, stopped containers)
.\DOCKER.ps1 -Status         # Check status & health
.\DOCKER.ps1 -Logs           # View backend logs
.\DOCKER.ps1 -Backup         # Create manual backup
.\DOCKER.ps1 -Help           # Full command reference
```

**For Developers:**

```powershell
.\NATIVE.ps1 -Start                 # Native dev mode (backend+frontend)
.\DOCKER.ps1 -Start                # Docker deployment (recommended)
docker-compose up -d                # Multi-container mode (advanced)
```

**What happens:**

- ✅ Checks Docker availability (fails if not installed)
- ✅ Creates .env files from templates
- ✅ Builds Docker images
- ✅ Starts containers on port 8080
- ✅ Provides access URLs
- ✅ Fast update (`-Update`) uses cached layers (quick)
- ✅ Clean update (`-UpdateNoCache`) prunes build/image cache & uses `--no-cache` rebuild

**Requirements:** Docker Desktop installed and running

**See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for detailed guide!**

---

### Deployment Modes

The runtime enforces a clear separation between release and development workflows.

#### 🐳 Release (Docker Full Stack)

- Production and release builds **must** run via the Docker full-stack bundle.
- Launch with `DOCKER.ps1` (Windows/PowerShell) or `scripts/deploy/run-docker-release.sh` (macOS/Linux).
- Access the stack at <http://localhost:8080> (frontend + API proxy).

#### 📦 QNAP NAS Deployment

- Dedicated deployment for QNAP Container Station with PostgreSQL database
- Automated installation via `scripts/qnap/install-qnap.sh`
- Management menu with backup/restore/update operations
- Monitoring stack with Grafana and Prometheus
- Complete rollback capabilities
- See [docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md](docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md) for full documentation

#### 🔧 Local Development (Native)

- Native execution is reserved for local development and fast iteration.
- Use `NATIVE.ps1` (PowerShell) to start backend (FastAPI) + frontend (Vite) with hot reload.
- Helper scripts set `SMS_ENV=development` automatically; if `SMS_ENV` is `production`, the backend refuses to start natively.
- Access the backend at `http://localhost:8000` and the frontend at `http://localhost:5173`.

#### 🔁 Switching Modes

- Leave `SMS_ENV` unset (or set to `development`) for native workflows.
- Set `SMS_ENV=production` for Docker release workflows—native helpers and the backend will block execution in this mode.
- `DOCKER.ps1` and helper scripts respect these guards to prevent configuration drift.

### PostgreSQL Support & Migration ($1.18.8)

- `RUN.ps1` and all Docker helpers now read `DATABASE_URL`,
  `DATABASE_ENGINE`, and the `POSTGRES_*` variables from `.env` automatically.
  Set `DATABASE_ENGINE=postgresql` and fill in `POSTGRES_HOST`, `POSTGRES_DB`,
  `POSTGRES_USER`, `POSTGRES_PASSWORD`, etc., or leave `DATABASE_URL` blank to
  let the backend build the connection string for you.
- The backend ships with `psycopg[binary]` out of the box, so no extra packages
  are needed when pointing the stack at PostgreSQL (local, managed, or QNAP).
- Existing deployments can migrate their SQLite data using the new helper:

  ```powershell
  cd backend
  python -m backend.scripts.migrate_sqlite_to_postgres `
      --sqlite-path ../data/student_management.db `
      --postgres-url postgresql+psycopg://user:pass@host:5432/student_management
  ```

  Add `--dry-run` to preview row counts, `--tables` to copy a subset, or
  consult the [PostgreSQL Migration Guide](docs/deployment/POSTGRES_MIGRATION_GUIDE.md)
  for the full checklist (backups, validation, and troubleshooting tips).

### Environment Detection

- `backend/environment.py` provides a single source of truth for runtime detection (development, test, production).
- Production mode is triggered by `SMS_ENV=production`, Docker container heuristics, or explicit CI configuration.
- When production is detected outside Docker, the backend fails fast with a clear error to avoid unsupported native releases.
- Development and test runs default to native execution unless Docker is requested explicitly.

### Common Commands

```powershell
# Docker deployment (production)
.\DOCKER.ps1 -Start       # Start Docker container
.\DOCKER.ps1 -Stop        # Stop Docker container
.\DOCKER.ps1 -Update      # Fast update with backup
.\DOCKER.ps1 -Prune       # Safe Docker cleanup

# Native development (hot reload)
.\NATIVE.ps1 -Start       # Start backend + frontend
.\NATIVE.ps1 -Stop        # Stop all processes
```

---

## ⚠️ Common Issues & Quick Fixes

### "Failed to resolve import i18next" Error

**Cause:** You're accessing the wrong URL for your deployment mode.

**Fix:**

- If using **Docker mode** → Use `http://localhost:8080` (not 5173)
- If using **Native mode** → Run `cd frontend && npm install` then restart

**How to check your mode:**

```powershell
docker ps  # If you see containers → Docker mode (port 8080)
           # If no containers → Native mode (ports 8000 + 5173)
```

### Script Execution Policy Error

**Fix:**

Run PowerShell with relaxed policy if needed:

```powershell
pwsh -ExecutionPolicy Bypass -NoProfile -File .\DOCKER.ps1 -Start
```

### Port Already in Use

**Fix:**

```powershell
.\DOCKER.ps1 -Status        # Check what's running
netstat -ano | findstr :8080  # Find process using port
```

**See:** [Fresh Deployment Troubleshooting Guide](docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md) for detailed solutions.

---

## 🛠️ For Developers

### Manual Setup (Advanced)

If you prefer manual control:

```powershell
# First-time installation
.\DOCKER.ps1 -Install  # Creates env, pulls image, etc.

# Development mode (separate processes, hot reload)
.\NATIVE.ps1 -Start    # Backend + frontend with hot reload

# Force rebuild containers
.\DOCKER.ps1 -UpdateClean  # Clean rebuild with --no-cache
```

### Developer Scripts

All complex/developer scripts moved to `scripts/internal/`:

- `CREATE_DEPLOYMENT_PACKAGE.ps1` - Create distribution package
- `INSTALLER.ps1` - Advanced installation options
- `DEVTOOLS.ps1` - Developer operations menu
- `CLEANUP.ps1` - Clean temporary files
- See `scripts/internal/README.md` for full list

**For normal operations, use `DOCKER.ps1` or `NATIVE.ps1` instead.**

---

### 🧪 Testing (Backend)

Always invoke pytest via the same Python interpreter that installed the backend dependencies to avoid environment mismatch (e.g., missing PyJWT leading to router import failures and 404s):

```powershell
cd backend
python -m pytest -q               # run all tests
python -m pytest -q tests/..\*    # run a subset
python -m pytest --cov=backend --cov-report=term-missing
```

Troubleshooting:

- If you see "ModuleNotFoundError: No module named 'jwt'" or many 404s for API routes during tests, you're likely using a different interpreter than the one that has dependencies installed. Run tests with `python -m pytest` (not just `pytest`) from the `backend` folder.
- Health tests intentionally mock DB errors to exercise branches; error logs like "Database health check failed: Connection failed" are expected within those tests.

---

## 📦 Deploying to Other Computers

**Four deployment options:**

1. **Windows Docker**: Copy project → Run `DOCKER.ps1 -Start` (`pwsh -NoProfile -File .\DOCKER.ps1 -Start`)
2. **QNAP NAS**: Upload to QNAP → Run `scripts/qnap/install-qnap.sh` ([QNAP Guide](docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md))
3. **Offline Package**: Run `.\scripts\internal\CREATE_DEPLOYMENT_PACKAGE.ps1`, copy ZIP to target
4. **Manual Setup**: Follow [Complete Deployment Guide](DEPLOYMENT_GUIDE.md)

**Documentation:**

- **[Quick Start Guide](docs/user/QUICK_START_GUIDE.md)** - Fast reference card
- **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Detailed instructions with troubleshooting
- **[Fresh Deployment Troubleshooting](docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md)** - Common issues and fixes

---

## 🎯 What's New in $1.18.8

### Testing & Quality Improvements Release

- ✅ **Enhanced Test Coverage**: Expanded student router tests, imports validation, comprehensive error handling tests, translation integrity testing (7 validation suites), exception handler regression tests (7 RFC 7807 compliance tests)
- 🔒 **RFC 7807 Error Handling**: Global Problem Details standard implementation with JSON-serializable responses, header preservation, and Pydantic error sanitization
- 🛡️ **Security Headers Middleware**: Global security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ⚡ **Session Management Optimization**: SQLAlchemy `expire_on_commit=False` for improved post-commit attribute access
- 🎯 **Backend Coverage Reporting**: Configured comprehensive coverage reporting for backend tests
- 🔧 **CI/CD Enhancements**: Ruff normalization, validation improvements, wheelhouse caching, GitHub Checks API integration, frontend quality gates (ESLint i18n, translation tests, API tests)
- ✅ **Pre-commit Hooks**: Automated validation with backend tests, ESLint i18n checks, and translation integrity tests
- 🌐 **Translation Quality**: Resolved 10 missing translation keys, established regression prevention with automated tests
- 🐍 **Python Entrypoint**: Replaced shell entrypoint with robust Python implementation for better error handling
- 🐋 **Docker Improvements**: Enhanced environment configuration, SECRET_KEY handling, path validation for Docker mode

**Quality Metrics:**

- Backend: 245+ tests passing
- Frontend: 1007 tests passing (11 skipped)
- Translation integrity: 7 validation suites
- Exception handlers: 7 RFC 7807 compliance tests

See [CHANGELOG.md](CHANGELOG.md) for complete details.

---

## 🎯 What's New in $1.18.8

### Under the Hood

- 🔍 **Intelligent Detection**: Auto-detects system state and required actions
- 🛠️ **Auto-Repair**: Fixes common issues automatically
- 📝 **Better Logging**: Comprehensive logs for troubleshooting
- 🐳 **Docker Priority**: Prefers Docker for stability, falls back to native
- 🔄 **Empty Field Fix**: Proper handling of optional fields in forms

---

A comprehensive student management system with course evaluation, attendance tracking, grade calculation, and performance analytics.

## System Requirements

**Recommended (Docker Mode):**

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- No Python or Node.js required on host

**Alternative (Native Mode):**

- Python 3.11+
- Node.js 18+
- Both modes work equally well!

## Features

- 📚 **Course Management** - Create and manage courses with customizable evaluation rules
- 👥 **Student Management** - Track student information and enrollment
- 📊 **Grade Calculation** - Automatic weighted grade calculation with Greek (0-20) and percentage scales
- 📅 **Attendance Tracking** - Monitor student attendance with absence penalties
- 📈 **Performance Analytics** - Detailed performance reports and trends
- 📆 **Daily Performance** - Track daily student performance with weighted multipliers
- 📤 **Data Export** - Export to Excel, PDF, and ICS calendar formats with bilingual (EN/EL) column headers driven by the `Accept-Language` header
- 📦 **Session Export / Import** - Full semester JSON packaging (courses, students, enrollments, grades, attendance, daily performance, highlights) with dry-run validation, automatic pre-import backup, and rollback support
- 🌐 **Bilingual** - Full support for English and Greek languages
- 🎨 **Modern UI** - Clean, responsive interface with Tailwind CSS
- 🔐 **Authentication & Authorization** - Optional JWT-based auth with role-based access control (admin/teacher/student) - See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)

## Detailed Usage

### Using DOCKER.ps1 (Production/Staging)

The **DOCKER.ps1** script provides comprehensive Docker deployment management:

```powershell
.\DOCKER.ps1 -Start
```

**Features:**

- Start/Stop/Restart application
- Automatic backups before updates
- Health monitoring and diagnostics
- Database operations
- View logs and status
- Docker cleanup operations

**Command-line options:**

```powershell
.\DOCKER.ps1 -Start      # Start application
.\DOCKER.ps1 -Stop       # Stop all services
.\DOCKER.ps1 -Status     # Show system status
.\DOCKER.ps1 -Update     # Update with backup
.\DOCKER.ps1 -Help       # Show all commands
```

### Using NATIVE.ps1 (Development)

For development with hot-reload:

```powershell
.\NATIVE.ps1 -Start      # Start backend + frontend
.\NATIVE.ps1 -Backend    # Backend only
.\NATIVE.ps1 -Frontend   # Frontend only
.\NATIVE.ps1 -Stop       # Stop all
```

### Starting the Application

Start with one command:

```powershell
.\DOCKER.ps1 -Start   # Docker deployment (production)
.\NATIVE.ps1 -Start   # Native mode (development, hot reload)
```

The application will be available at <http://localhost:8080>

Startup behavior:

- The frontend now waits for the backend to become healthy before starting (Compose healthcheck + dependency), so you shouldn't see a temporary “offline/failed to connect” banner on first load anymore.
- If the backend is still booting when you open the page, the UI shows a short “Checking…” state and silently retries a few times before showing any offline message.

### Smoke Test (Fast validation)

After startup, you can quickly verify everything with:

```powershell
.\scripts\SMOKE_TEST.ps1
```

What it does:

- Auto-detects mode and base URL (Docker 8080 or Native 8000)
- Checks: /health, /health/ready, /health/live, /control and root page
- Prints concise PASS/FAIL with HTTP status codes

### Stopping the Application

```powershell
.\DOCKER.ps1 -Stop          # Clean stop Docker container
```

Or use the desktop shortcut (double-click to toggle start/stop).

### Developer Tools

For development with hot-reload:

```powershell
.\NATIVE.ps1 -Start         # Backend + Frontend with hot-reload
.\NATIVE.ps1 -Backend       # Backend only
.\NATIVE.ps1 -Frontend      # Frontend only
```

For Docker operations:

```powershell
.\DOCKER.ps1 -Status        # Check container status
.\DOCKER.ps1 -Logs          # View container logs
.\DOCKER.ps1 -Update        # Update with backup
```

### Control Panel (Optional)

Once the stack is running you have two management surfaces:

- **System Health workspace** (`/power`): toggles the live status card (`ServerControl`) and the React Control Panel. Monitoring dashboards were removed in $1.18.8, so this view now focuses on health, automation, and host guidance. Use `http://localhost:5173/power` in native mode or `http://localhost:8080/power` in Docker/full-stack mode.
- **Legacy control dashboard** (`/control`): classic HTML panel hosted by the backend. Available at <http://localhost:8080/control> when the API is exposed directly.

Features:

- Start/stop frontend dev server (native mode)
- System status monitoring with uptime, auto-refresh and restart button
- Service management, dependency installers, Docker helpers
- Cleanup and maintenance operations

#### Enabling the restart button

1. Edit `backend/.env` (or the environment used by your process manager) and set:

  ```bash
  ENABLE_CONTROL_API=1
  ADMIN_SHUTDOWN_TOKEN=<long-random-string>   # optional but recommended for remote calls
  ALLOW_REMOTE_SHUTDOWN=1                     # optional: only when you must restart from another host
  ```

2. Restart the backend (`.\DOCKER.ps1 -Stop` followed by `.\DOCKER.ps1 -Start`).
3. Open the System Health workspace (`/power`) and click **Restart**.

Notes:

- Inside Docker/full-stack mode the restart endpoint is disabled for safety. Use `.\DOCKER.ps1 -Restart` or stop/start the container instead.
- Without `ADMIN_SHUTDOWN_TOKEN`, only loopback callers (same machine) can trigger the restart. When the token is set the frontend automatically sends it via the `X-ADMIN-TOKEN` header.
- The helper endpoint `GET /control/api/restart` returns structured diagnostics if you need to troubleshoot the button or API access.

## Maintenance

### Docker Cleanup

```powershell
.\DOCKER.ps1 -Prune         # Safe cleanup of unused Docker resources
.\DOCKER.ps1 -DeepClean     # Nuclear cleanup (removes all SMS Docker resources)
```

**What it cleans:**

1. **Obsolete Components** - Old components replaced by newer versions
2. **Obsolete Folders** - Old configs, docs, routers, scripts, tests
3. **Duplicate Files** - Redundant scripts and configurations
4. **Backup Files** - Old .backup files (keeps 2 most recent backups)
5. **Python Cache** - `__pycache__` directories
6. **Test Cache** - `.pytest_cache` directories
7. **Build Cache** - Vite and frontend build artifacts
8. **Docker Resources** - Reports dangling images, build cache, unused volumes

**Recent cleanup (Nov 2025):** See [archive/CLEANUP_SUMMARY.md](archive/CLEANUP_SUMMARY.md) for details on latest cleanup wave

**Docker Cleanup Commands (run manually when needed):**

```powershell
# Remove stopped containers
docker container prune

# Remove dangling images
docker image prune

# Remove build cache
docker builder prune

# Remove unused volumes (CAUTION: may delete data)
docker volume prune

# Remove specific volume
docker volume rm <volume-name>

# Full system cleanup (CAUTION: removes all unused Docker data)
docker system prune -a
```

### Cleanup obsolete files (legacy)

Removes non-essential and outdated documentation files to keep the repository lean.

- From the UI (when backend runs on host): Control Panel → Operations → Cleanup obsolete files
- From Windows host: run the script

```powershell
.\scripts\internal\CLEANUP_OBSOLETE_FILES.ps1
```

Note: When the backend runs inside Docker, it cannot modify files on your host filesystem; use the PowerShell script on the host.

### Update Docker data volume (safe volume rotation)

Creates a new versioned Docker volume for backend data and writes docker-compose.override.yml to switch the backend to the new volume. Optionally migrates data from the current volume. Old volumes are preserved.

Recommended flow:

```powershell
# Create a new versioned volume and migrate existing data
.\scripts\docker\DOCKER_UPDATE_VOLUME.ps1

# Or, create a fresh empty volume (no migration)
.\scripts\docker\DOCKER_UPDATE_VOLUME.ps1 -NoMigrate

# Apply the override
docker compose down
docker compose up -d
```

Reverting: edit or delete docker-compose.override.yml and restart compose. Old volumes are preserved and can be listed with `docker volume ls`.

### Quick Maintenance Scripts (Windows)

> **Note:** As of $1.18.8, only `CLEANUP.bat` and `CLEANUP_COMPREHENSIVE.ps1` are retained for health/maintenance. All other batch scripts are deprecated.

- `CLEANUP.bat` — Non-destructive cleanup: stops Docker services, clears caches/logs, preserves data and Docker volumes, backs up native DB.
- `CLEANUP_COMPREHENSIVE.ps1` — Deep cleanup of all artifacts, logs, and build files.

If you truly want to remove the Docker data volume (this deletes your Docker-stored data), run manually:

```powershell
docker volume rm sms_data  # CAUTION: permanent data loss in the volume
```

## Advanced Usage

### Docker Compose (Multi-container)

If you prefer the traditional multi-container setup with NGINX:

```powershell
# Build and start
docker compose build
docker compose up -d

# Stop
docker compose down
```

### Native Development Mode

For development with hot-reload (requires Python 3.11+ and Node.js 18+):

```powershell
# Start backend + frontend (hot-reload)
.\NATIVE.ps1 -Start

# NOTE: DEV_EASE is used by the pre-commit script `COMMIT_READY.ps1` only and should
# not be used to alter runtime behavior. To make local pre-commit skips explicit, set
# the environment variable `DEV_EASE=true` when running COMMIT_READY locally.
#
# Optional: Install the sample pre-commit hook provided at `.githooks/commit-ready-precommit.sample`.
# You can copy it to `.git/hooks/pre-commit` and make it executable, or use the included installers:
#
# PowerShell (Windows):
#
# ```powershell
# pwsh ./scripts/install-git-hooks.ps1
# ```
#
# macOS / Linux:
#
# ```bash
# ./scripts/install-git-hooks.sh
# ```
#
# On Windows you can also add a PowerShell hook variant that invokes:
# `pwsh -NoProfile -ExecutionPolicy Bypass -File ./COMMIT_READY.ps1 -Mode quick`.
> **Note:** Use the consolidated `NATIVE.ps1`. Legacy helpers under `scripts/dev/` were archived and are no longer supported.
```

> **Note:** Use the consolidated `NATIVE.ps1`. Legacy helpers under `scripts/dev/` were archived and are no longer supported.

## Project Structure

```text
student-management-system/
├── DOCKER.ps1                # Docker deployment (install, start, stop, update)
├── NATIVE.ps1                # Native development (hot-reload backend + frontend)
├── NATIVE_TOGGLE.ps1         # Native start/stop toggle helper
├── NATIVE_TOGGLE.cmd         # Double-click wrapper for the native toggle
├── CREATE_NATIVE_SHORTCUT.ps1 # Creates the native desktop shortcut
├── SMS_Native_Toggle.ico     # Native shortcut icon
├── DOCKER_TOGGLE.vbs         # Desktop shortcut toggle script
├── CREATE_DESKTOP_SHORTCUT.ps1  # Creates desktop shortcut
├── BUILD_DISTRIBUTION.ps1    # Build installer and ZIP distribution
├── backend/                  # FastAPI backend
│   ├── main.py               # Application entry point
│   ├── models.py             # Database models
│   ├── routers/              # API route handlers
│   ├── schemas/              # Pydantic schemas
│   ├── services/             # Business logic layer (9 services)
├── frontend/                 # React + Vite frontend
├── installer/                # Inno Setup installer files
│   ├── SMS_Installer.iss     # Installer script
│   ├── Greek.isl             # Greek translations
│   ├── SIGN_INSTALLER.ps1    # Code signing script
│   └── AUT_MIEEK_CodeSign.cer # Public certificate
├── docker/                   # Docker configuration files
├── scripts/                  # Utility scripts
├── docs/                     # Comprehensive documentation (30+ files)
├── archive/                  # Historical/deprecated files
└── tools/                    # Data import/export tools
```

## Documentation

### Available Documentation

- [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) – Canonical map of every active guide (start here)
- [CHANGELOG.md](CHANGELOG.md) – Release history and upgrade notes
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) – Platform-specific installation walkthrough
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) – Production deployment steps
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) – Final verification before going live
- [docs/deployment/POSTGRES_MIGRATION_GUIDE_COMPLETE.md](docs/deployment/POSTGRES_MIGRATION_GUIDE_COMPLETE.md) – SQLite → PostgreSQL migration workflow
- [docs/operations/MONITORING.md](docs/operations/MONITORING.md) – Monitoring & alerting guide (canonical)
- [docs/SCRIPTS_GUIDE.md](docs/SCRIPTS_GUIDE.md) – Supported automation scripts and entry points
- [docs/VERSIONING_AND_CACHING.md](docs/VERSIONING_AND_CACHING.md) – Version bump and cache busting policy
- [docs/development/AUTHENTICATION.md](docs/development/AUTHENTICATION.md) – Authentication/authorization implementation details
- [docs/user/QUICK_START_GUIDE.md](docs/user/QUICK_START_GUIDE.md) – Five-minute onboarding for new operators
- [docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md](docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md) – Dedicated QNAP deployment instructions

## API Documentation

Once the backend is running, access the interactive API documentation:

- Swagger UI: <http://localhost:8080/docs> (Docker) or <http://localhost:8000/docs> (Native)
- ReDoc: <http://localhost:8080/redoc> (Docker) or <http://localhost:8000/redoc> (Native)
- API Info: <http://localhost:8080/api> (Docker) or <http://localhost:8000/api> (Native) — JSON metadata

**🔐 Security Requirements (CRITICAL):**

1. **SECRET_KEY** - MUST be set with a strong random value:

   ```bash
   # Generate secure key
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

   - **Minimum length:** 32 characters (48+ recommended)
   - **Never use defaults:** System rejects placeholder/example keys
   - **Docker deployment:** No default fallback - must be set in `.env`
   - **Validation:** Automatic checks on startup prevent weak keys
   - **Impact if weak:** Complete authentication bypass, JWT token forgery

2. **Admin Credentials** - Change defaults immediately:

   - Default `admin@example.com` / `YourSecurePassword123!` are intentionally weak
   - **MUST change after first login** via Control Panel → Maintenance
   - Generate secure password: `python -c "import secrets; print(secrets.token_urlsafe(24))"`
   - For production, set unique credentials in `.env` before first deployment

3. **Enforcement Modes:**

   - `AUTH_ENABLED=True` (recommended): Full authentication required
   - `SECRET_KEY_STRICT_ENFORCEMENT=True`: Rejects weak keys (auto-enabled when AUTH_ENABLED)
   - Docker mode: Automatic security validation during startup

**Note**: In fullstack mode, the root URL `/` serves the frontend SPA, while API endpoints remain at `/api/v1/*`.

### Session Export / Import (Unified Semester Migration)

Safely migrate or archive an entire semester between environments.

**Endpoints:**
`GET /api/v1/sessions/semesters` – list semesters
`GET /api/v1/sessions/export?semester=SEMESTER` – export (preferred)
`POST /api/v1/sessions/export` – legacy export (will be deprecated)
`POST /api/v1/sessions/import?dry_run=true` – validate only
`POST /api/v1/sessions/import` – perform import (`merge_strategy=update|skip`)
`GET /api/v1/sessions/backups` – list backup files
`POST /api/v1/sessions/rollback` – restore from backup (creates safety snapshot first)

**Safety Features:** dry-run structural & referential validation, automatic timestamped pre-import backup (SQLite), transactional rollback on critical errors, per-entity summaries, rollback safety snapshot.

**Filename & Unicode:** Non-ASCII semester names are normalized to ASCII (`session_export_semester_<timestamp>.json`) to avoid header encoding issues; Greek metadata preserved inside JSON body.

**Import Merge Strategies:**
`update` – update existing + create new (default)
`skip` – ignore existing, create only new

**Legacy Field Compatibility:** Older exports may include `component_type` for grades; import ignores it and export includes it only when present.

**Example Dry-Run:**

```powershell
$token = '<ACCESS_TOKEN>'
Invoke-WebRequest -Method POST `
  -Uri 'http://localhost:8080/api/v1/sessions/import?dry_run=true' `
  -Headers @{ Authorization = "Bearer $token" } `
  -Form @{ file = Get-Item './session_export_semester_20251122_201923.json' }
```

**Response Snippet:**

```json
{
  "dry_run": true,
  "validation_passed": true,
  "semester": "Α' Εξάμηνο",
  "counts": { "courses": 7, "students": 8, "enrollments": 24, "grades": 9, "attendance": 116, "daily_performance": 30, "highlights": 12 },
  "message": "Validation passed. Safe to import."
}
```

**Rollback Usage:**

```powershell
Invoke-WebRequest -Method POST `
  -Uri 'http://localhost:8080/api/v1/sessions/rollback?backup_filename=pre_import_backup_semester_20251122_201923.db' `
  -Headers @{ Authorization = "Bearer $token" }
```

Restart the application after rollback to clear caches.

**Deprecation Notice:** POST export endpoint will be removed in a future release – use GET.

For a full end-to-end walkthrough with scenarios and troubleshooting, see `docs/user/SESSION_EXPORT_IMPORT_GUIDE.md` (user guide; technical details in `docs/reference/session-export-import.md`).

### Academic settings and date range filtering

- Backend setting `SEMESTER_WEEKS` (default 14, allowed 1–52) controls the default window used when only one date bound is provided in queries.
- Supported endpoints accept optional `start_date` and `end_date` query params (ISO date `YYYY-MM-DD`):
  - Attendance: `GET /api/v1/attendance`, `GET /api/v1/attendance/student/{student_id}`, `GET /api/v1/attendance/course/{course_id}`
  - Grades: `GET /api/v1/grades`, `GET /api/v1/grades/student/{student_id}`, `GET /api/v1/grades/course/{course_id}`
- Behavior:
  - Both provided: results within inclusive range from `start_date` to `end_date` (inclusive); if `start_date` > `end_date` → HTTP 400.
  - Only start_date provided: end_date defaults to start_date + (`SEMESTER_WEEKS` × 7) − 1 day.
  - Only end_date provided: start_date defaults to end_date − (`SEMESTER_WEEKS` × 7) + 1 day.
- Grades-specific: pass `use_submitted=true` to filter by `date_submitted` instead of `date_assigned`.

To change the default semester length, set `SEMESTER_WEEKS` in `backend/.env` (see `backend/.env.example`).

## Troubleshooting

### Port Conflicts

Check for port conflicts:

```powershell
.\DOCKER.ps1 -Status
# Or check manually:
netstat -ano | findstr ":8080"
```

### Docker Issues

Check Docker status:

```powershell
.\DOCKER.ps1 -Status
.\DOCKER.ps1 -Logs
```

### Database Issues

If you encounter database issues, check the logs:

```powershell
.\DOCKER.ps1 -Logs
```

To reset the database (warning: data loss):

```powershell
.\DOCKER.ps1 -Stop
docker volume rm sms_data
.\DOCKER.ps1 -Start
```

#### Backup and Restore

Use DOCKER.ps1 for database management:

```powershell
.\DOCKER.ps1 -Backup     # Backup to ./backups
.\DOCKER.ps1 -Restore    # Restore from ./backups
```

- Restore stops the running container (if any) and copies the selected backup back into the `sms_data` volume.
- Migrate copies all data from the legacy compose volume `student-management-system_sms_data` into `sms_data`.

### Frontend Issues

If the frontend isn't loading, try rebuilding:

```powershell
.\DOCKER.ps1 -UpdateClean   # Clean rebuild with no-cache
```

---

### 🧪 End-to-End (E2E) Testing: Local & CI Alignment

To run E2E tests locally in a way that matches CI (backend serves frontend, permissive auth, seeded test user):

```powershell
# From project root
.\e2e-local.ps1
```

This script will:
- Seed E2E test data (user: test@example.com / password123)
- Start the backend with `SERVE_FRONTEND=1`, `AUTH_MODE=permissive`, `CSRF_ENABLED=0`
- Run Playwright E2E tests with `PLAYWRIGHT_BASE_URL=http://1.18.8.1:8000`
- Clean up the backend process after tests

**Troubleshooting:**
- If tests fail with login or navigation timeouts, ensure no other backend/frontend is running on ports 8000/5173.
- The backend must serve the built frontend for E2E to work (not Vite dev server).
- For CI, see `.github/workflows/e2e-tests.yml` for the authoritative setup.

**Test user credentials:**
- Email: `test@example.com`
- Password: `password123`

---
