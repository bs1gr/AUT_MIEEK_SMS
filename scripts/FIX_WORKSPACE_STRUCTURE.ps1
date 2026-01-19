# scripts/FIX_WORKSPACE_STRUCTURE.ps1

$ErrorActionPreference = "Stop"

function Move-FileSafe {
    param($Src, $Dest)
    if (Test-Path $Src) {
        if (-not (Test-Path $Dest)) {
            Move-Item -Path $Src -Destination $Dest
            Write-Host "Renamed $Src to $Dest" -ForegroundColor Green
        } else {
            Write-Host "Destination $Dest already exists. Removing source $Src." -ForegroundColor Yellow
            Remove-Item $Src -Force
        }
    }
}

function Remove-FileSafe {
    param($Path)
    if (Test-Path $Path) {
        Remove-Item $Path -Force
        Write-Host "Removed $Path" -ForegroundColor Green
    }
}

Write-Host "Starting Workspace Structure Fixes..." -ForegroundColor Cyan

# 1. Enforce 'v' prefix for release notes
Move-FileSafe "docs/releases/RELEASE_NOTES_1.17.2.md" "docs/releases/RELEASE_NOTES_v1.17.2.md"

# 2. Fix mismatched installer improvements filename
Move-FileSafe "docs/plans/INSTALLER_IMPROVEMENTS_v1.12.3+.md" "docs/plans/INSTALLER_IMPROVEMENTS_v1.15.2+.md"

# 3. Remove temporary/duplicate files
Remove-FileSafe "docs/releases/file.tmp"
Remove-FileSafe "docs/file.tmp"

# 4. Remove lowercase 'version' file if uppercase 'VERSION' exists
# Note: On case-insensitive filesystems (Windows), we must be careful not to delete VERSION.
# We check if 'version' exists and if 'VERSION' exists, and if they are the same file object.
if (Test-Path "VERSION") {
    $items = Get-ChildItem "." | Where-Object { $_.Name -ceq "version" }
    foreach ($item in $items) {
        Remove-Item $item.FullName -Force
        Write-Host "Removed lowercase 'version' file (duplicate/incorrect case)." -ForegroundColor Green
    }
}

Write-Host "Workspace structure fixes completed." -ForegroundColor Green
