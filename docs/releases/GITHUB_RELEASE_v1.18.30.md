# v1.18.30 — Checkpoint Release: Full System Snapshot

> **This is the definitive checkpoint release.** It supersedes all prior releases (v1.18.0–v1.18.29), which have been archived as historical pre-releases. v1.18.30 documents the complete state of the application.

---

## What Is This System?

**Student Management System (SMS)** is a bilingual (English / Greek) web application built for [ΜΙΕΕΚ](https://www.mieek.ac.cy/) — a post-secondary vocational training college in Limassol, Cyprus. It manages the full student lifecycle: enrollment, attendance, grading, reporting, analytics, and administration — in a single deployable package.

---

## Core Features

### Student Records
- Full CRUD for students, courses, and enrollments
- Bulk CSV import and export
- Custom field support and inline editing

### Attendance Tracking
- Per-session attendance recording with date range selection
- Offline queue: records saved locally and synced on reconnect (`offlineAttendanceQueue`)
- Special score display and custom participation categories

### Grading System
- Weighted grade entry with special participation options
- Group-by with GPA field display
- Per-course breakdown with attendance + grade + score summaries
- Highlight labels with Greek/English equivalents

### Reports Engine
- PDF and CSV export with full course breakdown
- GPA-per-course, overall GPA, and excellence categorization
- History toggle for auditing previous report snapshots
- Print-ready output via `react-to-print`
- Group-by and label configuration preserved per export

### Analytics & Dashboards
- **8 built-in chart types:** Line, Bar, Pie, Area, Scatter, Radar, Funnel, Treemap
- Custom dashboard builder: create named dashboards, add/remove charts, filter by chart type
- Predictive analytics endpoint (`/analytics/predict`)
- Course-level and student-level drill-down
- Chart data export (JSON/CSV)

### Email & Notifications
- SMTP delivery wired end-to-end (backend → email)
- Persistent SMTP configuration (survives server restarts)
- In-app notification bell with unread badge
- Update-available notification (auto-updater integration)
- Dismiss button with i18n support

### Control Panel
- **Auto-Updater:** Background update check, SHA256-verified download, installer launch
- **Database Management:** Backup (encrypted/unencrypted SQL), diagnostics, remote DB connection test
- **User Administration:** Role assignment, user creation/deletion, password reset
- **Maintenance:** Workflow cleanup, migration status, log rotation

### Offline Support
- `useNetworkStatus` hook with visual offline banner
- Three offline queues: attendance, grades, student updates — all auto-synced on reconnect

### RBAC (Role-Based Access Control)
- Roles: `admin`, `teacher`, `viewer`
- `optional_require_role()` on all admin endpoints — respects `AUTH_MODE` for emergency access
- JWT authentication with refresh token rotation
- Password strength validation, login throttling, CSRF protection

### Bilingual Support (EN / EL)
- All UI strings fully translated in English and Greek
- Language detection with manual override
- PDF exports in either language

---

## Deployment Modes

| Mode | Entry Point | Port | Use For |
|------|-------------|------|---------|
| **Lite Edition** | `SMS_Lite.exe` | Embedded | Teachers — standalone, no Docker |
| **Docker Edition** | `.\infra\scripts\dev\DOCKER.ps1 -Start` | 8080 | Production deployments |
| **Native Dev** | `.\infra\scripts\dev\NATIVE.ps1 -Start` | 8000 + 5173 | Development |
| **QNAP NAS** | QNAP-specific docker-compose | 8080 | Central PostgreSQL on NAS |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.13), SQLAlchemy ORM, Alembic migrations |
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3 |
| State | TanStack Query v5, Zustand v5, react-hook-form v7 |
| Charts | Recharts v3 |
| i18n | react-i18next v16, i18next v25 |
| Database | PostgreSQL (production), SQLite (Lite / development) |
| Auth | JWT (PyJWT 2.13.0), bcrypt |
| Containers | Docker Compose, optional monitoring stack (Grafana, Prometheus, Loki) |
| Installer | Inno Setup + PowerShell, Windows-signed `.exe` |
| Testing | pytest 929 tests, Vitest 1 939 tests, Playwright 82 E2E tests |

---

## Installation (Windows)

1. Download **`SMS_Installer_1.18.30.exe`** from the assets below
2. Right-click → **Run as Administrator**
3. Follow the wizard — choose Lite or Docker edition
4. Launch from the desktop shortcut

**Default credentials (change immediately):**
- Email: `admin@example.com`
- Password: `YourSecurePassword123!`

**Docker update from prior version:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```

---

## What Changed in v1.18.30

This release consolidates 5 post-v1.18.29 commits:

### Security
- `starlette` upgraded 1.0.1 → 1.3.1 (high/medium CVEs resolved)
- `cryptography` upgraded 46.0.7 → 49.0.0 (CVE-2026-39892 + 2 Dependabot alerts)
- `python-multipart` upgraded 0.0.27 → 0.0.32 (CVEs in ≤0.0.30)
- `PyJWT` aligned to 2.13.0 in pyproject.toml (Dependabot #176–181)
- `js-yaml` npm override pinned to `^4.2.0` in frontend (Dependabot #175)
- Resolved all 25 active Dependabot security alerts

### Infrastructure
- Fixed bash arithmetic crash in 3 CI workflow files (`((VAR++))` → `VAR=$((VAR + 1))`) — the first workflow deletion was silently aborting under `set -euo pipefail`
- Suppressed `StarletteDeprecationWarning` in pytest (starlette 1.3.1 prefers httpx2 for TestClient; non-breaking, suppressed until migration)
- Decluttered 234 stale files from the repository

---

## Accumulated Milestone Summary (v1.18.0 → v1.18.30)

| Version | Date | Key Milestone |
|---------|------|---------------|
| v1.18.0 | Feb 2026 | Initial production foundation |
| v1.18.7 | Mar 2026 | Control Panel auto-updater, offline queues, QNAP support |
| v1.18.8 | Mar 2026 | SQL backup (encrypted/unencrypted), database management panel |
| v1.18.9 | Mar 2026 | Remote DB credential UI, dismiss notifications, Docker host bridge |
| v1.18.12 | Mar 2026 | **First Official Public Release** — installer pipeline + CodeQL |
| v1.18.13 | Mar 2026 | Reports: group-by, GPA fields, course breakdown PDF/CSV |
| v1.18.14 | Mar 2026 | Security hardening: flatted, cryptography, python-multipart, PyJWT |
| v1.18.16 | Mar 2026 | QNAP as default profile, installer credential-format support |
| v1.18.17 | Apr 2026 | Docker QNAP self-heal, Vite 7.3.2, lodash override |
| v1.18.21 | Apr 2026 | Custom special score display, weighted special participation |
| v1.18.22 | May 2026 | Analytics route fix, analytics export RBAC restore |
| v1.18.25 | Jun 2026 | **Major:** custom dashboards, 8 chart types, predictive analytics, scatter plots |
| v1.18.26 | Jun 2026 | Directory structure flatten (658 files), CI/CD overhaul |
| v1.18.27 | Jun 2026 | Installer pipeline post-flatten fix, signed installer |
| v1.18.29 | Jun 2026 | Email delivery end-to-end, SMTP persistence, status badge, 16 new tests |
| v1.18.30 | Jun 2026 | **Checkpoint release:** security upgrades, CI fix, 25 Dependabot alerts resolved |

---

## Test Coverage at Checkpoint

| Suite | Count | Status |
|-------|-------|--------|
| Backend (pytest) | 929 | ✅ All passing |
| Frontend (Vitest) | 1 939 | ✅ All passing |
| E2E (Playwright) | 82 | ✅ All passing |
| Security scan | 0 alerts | ✅ Clean |

---

## Documentation

- [README](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/README.md) — Quick start and developer setup
- [CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md) — Full commit history
- [Lite Edition Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/deployment/LITE_EDITION_GUIDE.md)
- [QNAP Deployment Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md)
- [RBAC Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/RBAC_GUIDE.md)
