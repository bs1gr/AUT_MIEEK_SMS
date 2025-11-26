# v1.8.6.4 – Script Consolidation, Auth Alignment & Installer Suite

Date: 2025-11-22

## Highlights

- Unified operational workflow: all legacy PowerShell scripts replaced by two canonical entry points: `DOCKER.ps1` (production / container lifecycle) and `NATIVE.ps1` (hot‑reload development).
- Windows GUI installer + uninstaller suite introduced (progress UI, Docker auto‑detection, logging, packaging guidance).
- Admin endpoints migrated to `optional_require_role()` to respect `AUTH_MODE` (disabled/permissive/strict) while retaining emergency access mode.
- Previous security hardening (password strength, CSRF, lockout, SECRET_KEY validation) now baseline.
- Performance optimizations active: eager loading, selective caching, DB indexing, React code splitting & memoization.
- Full documentation modernization (English + Greek) removing operational references to deprecated scripts.

## Consolidation Summary

Legacy scripts (RUN.ps1, INSTALL.ps1, SMS.ps1, run-native.ps1, SUPER_CLEAN_AND_DEPLOY.ps1, etc.) archived. Migration matrix: `SCRIPTS_CONSOLIDATION_GUIDE.md`.

## Upgrade Notes

1. Replace any CI/local automation invoking legacy scripts with `DOCKER.ps1` / `NATIVE.ps1` equivalents.
2. Ensure `.env` contains a strong `SECRET_KEY` (generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"`).
3. Optional: Enable strict key enforcement via `SECRET_KEY_STRICT_ENFORCEMENT=True`.
4. Run `DOCKER.ps1 -UpdateClean` after upgrade from pre‑consolidation versions for a clean container rebuild.

## Installer Suite

- Supports guided install/uninstall, dependency checks (Python/Node/Docker), database initialization, logging.
- Packaging via PS2EXE / Inno Setup / Advanced Installer (code signing optional).

## Post‑Release Checklist

- Verify healthy start: `DOCKER.ps1 -Start` (port 8080) + `/health` endpoint OK.
- Run backend & critical frontend API tests (already passing in release validation).
- Validate installer build & (optional) signing.
- Communicate consolidation changes to operators (link guide).

## Looking Ahead (v1.8.6.5 Focus)

- Deeper frontend component & hook test coverage.
- Deployment runbook expansion (rollback + incident response flows).
- Metrics & load testing instrumentation (Prometheus/OpenTelemetry + baseline performance suite).
- CI optimizations (npm caching, release automation).

---
Stable, consolidated, and ready for wider distribution.
