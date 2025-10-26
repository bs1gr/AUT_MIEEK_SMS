# Phase 3 - Advanced Deployment

This phase focuses on packaging, distribution, and updates across platforms.

## Docker Containerization

- Backend: Python 3.11-slim base, install backend/requirements.txt, run uvicorn backend.main:app
- Frontend: Node 20-alpine, build Vite app, serve via nginx (multi-stage build)
- Compose: backend + frontend + volume mounts for logs/backups, .env support
- Acceptance: `docker compose up` serves API on 8000, UI on 5173/80 with reverse proxy option

## Windows Installer (InstallForge/NSIS)

- Bundle: Python embeddable + venv, dependencies, scripts/RUN.ps1, frontend build, shortcuts
- Pre-flight: Check ports 8000/5173 free; offer alternative ports
- Acceptance: One-click install, Start Menu shortcuts (Start/Stop), uninstaller, desktop icon

## Auto-update Mechanism

- Source of truth: VERSION file + GitHub Releases assets (zip)
- App check: On launch, compare local VERSION to remote; prompt and download + swap
- Delta-friendly: Keep data directories (backups/, templates/, logs/) intact
- Acceptance: Simulated new release updates binaries without data loss

## Cross-platform Support (macOS/Linux)

- Scripts: Bash counterparts for scripts/*.ps1 (RUN.sh, INSTALL.sh, STOP.sh)
- Systemd service templates for backend; launchd plist for macOS (optional)
- Acceptance: Verified RUN.sh installs deps and starts both services locally

## CI/CD (Optional stretch)

- GitHub Actions: build backend wheel and frontend artifacts; create Docker images; publish Release
- Acceptance: Tag push triggers build and produces installable artifacts and images

## Prereqs/Housekeeping

- Ensure .gitignore excludes caches, logs, DBs (done)
- Resolve git push auth (SSH key or HTTPS token)

## Tracking

- [x] Analytics router tests for final grade
- [ ] Dockerfiles + compose
- [ ] Windows installer scripts
- [ ] Auto-update service
- [ ] Cross-platform scripts
- [ ] CI build pipeline

