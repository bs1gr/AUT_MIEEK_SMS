<#
Install git hooks from the repository .githooks directory into .git/hooks

Usage (PowerShell):
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  pwsh ./scripts/install-git-hooks.ps1

This script copies all files under .githooks to .git/hooks and ensures they are executable
on platforms that support file permissions.
#>

param(
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$githooksDir = Join-Path $repoRoot ".githooks"
$hookTarget = Join-Path $repoRoot ".git\hooks"

if (-not (Test-Path $githooksDir)) {
    Write-Host "No .githooks folder found at: $githooksDir" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $hookTarget)) {
    Write-Host ".git/hooks not found — this is not a working git repository." -ForegroundColor Red
    exit 1
}

Write-Host "Installing git hooks from $githooksDir -> $hookTarget" -ForegroundColor Cyan

$files = Get-ChildItem -Path $githooksDir -File -ErrorAction Stop
foreach ($file in $files) {
    $destination = Join-Path $hookTarget $file.Name
    if ((Test-Path $destination) -and -not $Force) {
        Write-Host "Skipping existing hook: $($file.Name) (use -Force to overwrite)" -ForegroundColor Yellow
        continue
    }

    Copy-Item -Path $file.FullName -Destination $destination -Force:$Force
    Write-Host "Installed hook: $($file.Name)" -ForegroundColor Green

    # Make sure file is executable on POSIX systems if possible
    try {
        if ($IsLinux -or $IsMacOS) {
            & chmod +x $destination
        }
    } catch {
        # ignore
    }
}

Write-Host "Git hooks installation complete." -ForegroundColor Cyan
