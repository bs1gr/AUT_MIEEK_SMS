# Deployment Asset Tracker

**Last Updated**: 2025-11-17  
**Maintainers**: Release Engineering + DevOps Guild  
**Codebase Health**: 8.5/10 (Excellent - Post-cleanup)

This tracker lists every asset that must stay healthy for smooth deployments. Update it whenever you add a new script, workflow, container image, or runbook that production teams rely on.

---

## 1. Automation & Entry Points

| Asset | Path / Identifier | Purpose | Owner | Notes |
|-------|-------------------|---------|-------|-------|
| RUN.ps1 | `./RUN.ps1` | One-click Docker-first bootstrap (builds images, applies migrations, starts stack) | Release Eng. | Use for production + staging; respects `SMS_ENV` guards |
| SMART_SETUP.ps1 | `./SMART_SETUP.ps1` | Intelligent setup/diagnostics (detects deps, installs, initializes DB) | Release Eng. | Use `-Force` for rebuild, `-DevMode` for split services |
| SMS.ps1 | `./SMS.ps1` | Operational menu: start/stop/status, backups, diagnostics | Support Ops | Option `B` handles DB backups before upgrades |
| CLEANUP_PLAN.ps1 | `./CLEANUP_PLAN.ps1` | Automated cleanup script with dry-run support (Phase 1: high priority, Phase 2: consolidation) | Release Eng. | Added Nov 2025; use for future cleanup audits |
| scripts/STOP.ps1 | `./scripts/STOP.ps1` | Emergency stop for native processes/containers | Support Ops | Used by SMS.ps1 when forcing shutdown |
| SUPER_CLEAN_AND_DEPLOY.ps1 | `./SUPER_CLEAN_AND_DEPLOY.ps1` | Full rebuild/reset followed by deployment | Release Eng. | Requires manual confirmation; wipes cache/volumes |
| scripts/ops/archive-releases.ps1 | `./scripts/ops/archive-releases.ps1` | Marks legacy GitHub releases (≤ threshold tag) as archived/pre-release | Release Eng. | Supports `-DryRun`, `-ThresholdTag`, `-SkipPrereleaseToggle`, `-ReleasesJsonPath` (fixture: `scripts/ops/samples/releases.sample.json`) |
| scripts/ops/remove-legacy-packages.ps1 | `./scripts/ops/remove-legacy-packages.ps1` | Deletes or privatizes GHCR packages (`sms-*`) | Release Eng. | Supports `-DryRun`, `-Privatize`, custom org/package list, `-PackageDataPath` (fixture: `scripts/ops/samples/package-versions.sample.json`) |
| Archive legacy releases workflow | `.github/workflows/archive-legacy-releases.yml` | Actions wrapper for archival script, produces immutable audit log | Release Eng. | Run twice (dry-run then live) per release |

---

## 2. Containers & Images

| Asset | Location | Purpose | Owner | Notes |
|-------|----------|---------|-------|-------|
| Dockerfile.fullstack | `./docker/Dockerfile.fullstack` | Production image (FastAPI + React served together) | Platform Eng. | Used by RUN.ps1 + docker-publish.yml |
| Dockerfile.backend | `./docker/Dockerfile.backend` | Backend-only image (DevMode / diagnostics) | Platform Eng. | Tag: `ghcr.io/bs1gr/sms-backend` |
| Dockerfile.frontend | `./docker/Dockerfile.frontend` | Frontend-only image (DevMode / diagnostics) | Platform Eng. | Tag: `ghcr.io/bs1gr/sms-frontend` |
| docker-compose.yml | `./docker-compose.yml` | Local development stack | Platform Eng. | Not used in production |
| docker-compose.prod.yml | `./docker-compose.prod.yml` | Production reference compose with health checks | Platform Eng. | Keep image digests in sync with CI outputs |
| deploy/k8s manifests | `./deploy/k8s/` | Kubernetes deployment templates (backend/frontend/fullstack) | Platform Eng. | Replace `REPLACE_WITH_DIGEST` before applying |

---

## 3. Documentation & Runbooks

| Asset | Path | Purpose | Owner | Notes |
|-------|------|---------|-------|-------|
| Deployment Guide | `./DEPLOYMENT_GUIDE.md` | Windows-first deployment playbook | Release Eng. | Highlights Docker-only production stance |
| Deployment Checklist | `./DEPLOYMENT_CHECKLIST.md` | Step-by-step verification list | Release Eng. | Run before sign-off |
| Codebase Analysis Report | `./CODEBASE_ANALYSIS_REPORT.md` | Comprehensive health analysis (v1.6.4) | Release Eng. | Documents 8.5/10 health rating, cleanup findings |
| Cleanup Summary | `./CLEANUP_SUMMARY.md` | Nov 2025 cleanup completion report | Release Eng. | Documents Phase 1+2 execution and results |
| Fresh Deployment Troubleshooting | `./docs/FRESH_DEPLOYMENT_TROUBLESHOOTING.md` | Known issues + fixes | Support Ops | Link from SMS.ps1 diagnostics |
| Documentation Index | `./docs/DOCUMENTATION_INDEX.md` | Map to every active doc | Docs Team | Version should match current release |
| Release Notes v1.6.3 | `./docs/releases/v1.6.3.md` | Canonical notes + archive/package checklist | Release Eng. | Source for `gh release create` |
| CONTROL_API.md | `./backend/CONTROL_API.md` | Details `/control` panel endpoints | Backend Team | Required for remote administration |

---

## 4. Health, Migrations, and Monitoring

| Asset | Path | Purpose | Owner | Notes |
|-------|------|---------|-------|-------|
| run_migrations.py | `./backend/run_migrations.py` | Auto-runs Alembic migrations during lifespan | Backend Team | Invoked by main app + RUN.ps1 |
| migrations/ | `./backend/migrations/` | Alembic migrations | Backend Team | Never edit DB schema directly; generate revisions |
| health_checks.py | `./backend/health_checks.py` | Implements /health, /health/live, /health/ready | Backend Team | Used by k8s + compose health probes |
| performance_monitor.py | `./backend/performance_monitor.py` | Slow-query + resource monitoring hooks | Backend Team | Enabled via env flags |
| logs/app.log & structured.json | `./backend/logs/` | Rotating log outputs | Backend Team | Request IDs injected via middleware |

---

## 5. Backup & Recovery

| Asset | Path | Purpose | Owner | Notes |
|-------|------|---------|-------|-------|
| Database backups | `./backups/database/` | Automated/exported SQLite backups | Support Ops | SMS.ps1 → option B stores files here |
| archive/ bundle | `./archive/` | Frozen legacy scripts + docs for auditors | Release Eng. | Link in each archived GitHub release |
| scripts/ops/archive-releases.ps1 | `./scripts/ops/archive-releases.ps1` | (Also) ensures archive links remain discoverable | Release Eng. | Run before every new tag; offline test payload in `scripts/ops/samples/` |

---

## 6. CI/CD Touchpoints

| Asset | Path | Purpose | Owner | Notes |
|-------|------|---------|-------|-------|
| ci.yml | `.github/workflows/ci.yml` | Tests + linting on PR | Platform Eng. | Ensure backend/frontend matrices stay green |
| docker-publish.yml | `.github/workflows/docker-publish.yml` | Builds/pushes Docker images + digests | Platform Eng. | Exports digests for k8s manifests |
| release-on-tag.yml | `.github/workflows/release-on-tag.yml` | Creates GitHub releases from tags | Release Eng. | Reads `.github/RELEASE_NOTES_<tag>.md` if present |
| archive-legacy-releases.yml | `.github/workflows/archive-legacy-releases.yml` | (See §1) Archive workflow | Release Eng. | Trigger via Actions tab |

---

## 7. Installer & Packaging Assets

| Asset | Path | Purpose | Owner | Notes |
|-------|------|---------|-------|-------|
| INSTALLER.ps1 / INSTALLER.bat | `./INSTALLER.ps1`, `./INSTALLER.bat` | Guided installation workflow that checks prerequisites, installs dependencies, and starts the stack | Release Eng. | Prefer PowerShell version for logging; `.bat` is compatibility shim |
| CREATE_DEPLOYMENT_PACKAGE.ps1 / .bat | `./CREATE_DEPLOYMENT_PACKAGE.ps1`, `./CREATE_DEPLOYMENT_PACKAGE.bat` | Builds offline deployment bundles (optionally embeds Docker image + ZIP) | Release Eng. | Use option 3 for full package w/ Docker image |
| deployment-package/LOAD_DOCKER_IMAGE.bat | `./deployment-package/LOAD_DOCKER_IMAGE.bat` | Loads prebuilt Docker image on air-gapped hosts | Release Eng. | Generated by package script; include with USB drop |
| scripts/deploy/run-docker-release.ps1 | `./scripts/deploy/run-docker-release.ps1` | Starts release-mode container stack from deployment package | Support Ops | Used post-install when installer is skipped |

---

## Maintenance Checklist

1. **Before tagging**: Run archive script (dry-run + live) and remove/privatize legacy GHCR packages.
2. **Before deployment**: Execute `SMS.ps1 -Stop`, `scripts/ops/remove-legacy-packages.ps1 -DryRun` (offline option: `-PackageDataPath scripts/ops/samples/package-versions.sample.json`), backend/frontend test suites, and `DEPLOYMENT_CHECKLIST.md`.
3. **After deployment**: Verify health endpoints, review `backend/logs/structured.json`, and capture digests in `deploy/k8s/*.yaml`.
4. **Monthly**: Update this tracker and `docs/DOCUMENTATION_INDEX.md` with any new assets.

> 📌 **Reminder**: This file is the authoritative inventory for deployment serviceability. If an asset is critical to release success but is missing here, add it immediately.
