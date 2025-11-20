# Obsolete Files Archive

This folder contains files that have been deprecated and removed from active use in the codebase. They are retained here for historical reference only and should not be executed or imported by any active workflows.

Archived on: 2025-11-19

Contents:

- tools/stop_monitor.ps1 — Deprecated; operator helper moved to `scripts/operator/stop_monitor.ps1`.
- scripts/SETUP.ps1 — Deprecated wrapper; use `RUN.ps1` or `SMART_SETUP.ps1`.
- scripts/STOP.bat — Deprecated; use `SMS.ps1 -Stop`.
- scripts/deploy/STOP.ps1 — Deprecated; use `SMS.ps1 -Stop`.
- templates/power.html — Legacy embedded monitoring UI preserved here for reference (removed from active templates in v1.8.3). See docs/MONITORING_ARCHITECTURE.md for historical details.

Note: These files are not part of the supported entry points as of v1.5.0+. Refer to `README.md` for the canonical commands.
