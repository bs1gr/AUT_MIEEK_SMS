# Script Consolidation and Deprecations

To reduce confusion and duplication, this project now standardizes on two primary entry points:

- QUICKSTART.ps1 — One-command intelligent setup and start (auto-detects Docker vs Native)
- SMS.ps1 — Unified interactive management menu (start/stop/status/diagnostics/backup)

## Compatibility Wrappers (still supported)

These files remain for compatibility and simply forward to the primary scripts. They display a brief notice when launched:

- START.bat — Windows batch wrapper (prefer QUICKSTART.ps1 or QUICKSTART.bat)
- ONE-CLICK.ps1 — Legacy PowerShell launcher (prefer QUICKSTART.ps1)

## Deprecated Helpers

- scripts/STOP.ps1 — Use `SMS.ps1 -Stop` instead. The helper remains available for direct container/process stop, but it’s considered legacy.

## What changed

- Documentation now recommends QUICKSTART.ps1 and SMS.ps1 as the main entry points.
- START.bat and ONE-CLICK.ps1 show a compatibility notice and continue to work.
- References to `.\STOP.ps1` have been corrected to `.\scripts\STOP.ps1` or `SMS.ps1 -Stop`.

## Next planned cleanup (non-breaking)

- Monitor usage of compatibility wrappers; if unused, they may be removed in a future major release with a clear migration path.

If you maintain external docs or scripts pointing to the old entry points, please update them to call `QUICKSTART.ps1` or `SMS.ps1` directly.
