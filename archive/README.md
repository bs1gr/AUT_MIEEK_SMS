# Archived Assets

This directory captures deprecated entry points and operator helpers that were formally
removed from the active workspace in the v1.6.2 release (2025-11-15). The files are
retained here strictly for historical reference so the Git history and GitHub web UI
continue to expose their final state without cluttering the supported tooling paths.

## Contents

- `scripts/SETUP.*` – legacy setup wrapper superseded by `RUN.ps1` and `SMART_SETUP.ps1`.
- `scripts/STOP.*` (root + `scripts/deploy/`) – legacy stop helpers replaced by
  `SMS.ps1 -Stop`.
- `scripts/*/KILL_FRONTEND_NOW.*` – placeholder wrappers now consolidated under
  `scripts/operator/`.
- `tools/stop_monitor.ps1` – pointer script replaced by `scripts/operator/stop_monitor.ps1`.

## Usage Guidance

These artifacts should **not** be executed. They are preserved only to document the
previous operator workflows. For all supported actions use the canonical entry points
documented in `README.md` and `docs/SCRIPTS_GUIDE.md`.
