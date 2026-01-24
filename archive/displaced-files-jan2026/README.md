# Displaced Files Archive (Jan 2026)

This folder contains files found displaced at the workspace root or duplicating functionality elsewhere. They were archived for clarity and to avoid confusion.

## Inventory

- site.webmanifest (moved from repository root)
  - Reason: Frontend already has `frontend/public/manifest.json` (Vite/SPA manifest). The root `site.webmanifest` is likely a stale or alternative manifest. If needed, compare contents and merge into `frontend/public` as `manifest.webmanifest` using the Vite PWA plugin configuration.

## Restoration

If any archived file is needed:
1. Review its contents and confirm the intended location.
2. Move it back to the appropriate folder (e.g., `frontend/public/` for web manifests).
3. Run `COMMIT_READY.ps1 -Quick` before committing changes.
