#!/usr/bin/env pwsh
<#
  DEPRECATED: This file has been moved to `scripts/operator/KILL_FRONTEND_NOW.ps1`.
  The canonical operator-only script now lives under `scripts/operator/`.

  Purpose: Emergency interactive host-level frontend killer (operator-only).

  Reason for change: consolidate destructive operator scripts in a single
  operator-only directory to reduce accidental invocation and to simplify
  CI/approval policies.

  To run the operator script (interactive confirmation required):

    .\scripts\operator\KILL_FRONTEND_NOW.ps1 -Confirm

  This file is intentionally non-destructive and will exit immediately.
#>

Write-Host "This script has been moved to scripts/operator/KILL_FRONTEND_NOW.ps1."
Write-Host "Run the operator script with: .\scripts\operator\KILL_FRONTEND_NOW.ps1 -Confirm"
exit 0
