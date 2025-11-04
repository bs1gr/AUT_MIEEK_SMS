<#
Cleanup generated lint/type/artifact files created during local runs or CI smoke-tests.

Usage (PowerShell):
  ./scripts/cleanup-artifacts.ps1 [-WhatIf]

This script removes common ruff/mypy temporary files residing under `backend/`.
It is safe to run multiple times; it prints which files were removed and which remain.
#>

param(
    [switch]$WhatIf
)

$patterns = @(
    'backend/ruff-*.json',
    'backend/ruff-*.txt',
    'backend/ruff-*.log',
    'backend/mypy-*.txt',
    'backend/pip-audit-report-ci.json'
)

$deleted = @()

foreach ($pattern in $patterns) {
    Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
        if ($WhatIf) {
            Write-Output "Would remove: $($_.FullName)"
        } else {
            try {
                Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Stop
                $deleted += $_.FullName
            } catch {
                Write-Warning "Failed to remove $($_.FullName): $_"
            }
        }
    }
}

if ($WhatIf) { return }

Write-Output "Removed files:"
if ($deleted.Count -eq 0) { Write-Output '  (none)'; } else { $deleted | ForEach-Object { Write-Output "  $_" } }

Write-Output "Remaining ruff* files under backend/ (if any):"
$remaining = Get-ChildItem -Path backend -Filter 'ruff*' -File -ErrorAction SilentlyContinue -Force
if (!$remaining) { Write-Output '  (none)' } else { $remaining | ForEach-Object { Write-Output "  $($_.FullName)" } }

Write-Output "Done."
