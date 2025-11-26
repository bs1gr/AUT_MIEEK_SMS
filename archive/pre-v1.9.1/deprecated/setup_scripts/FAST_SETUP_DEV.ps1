<#
FAST_SETUP_DEV.ps1

Automates a minimal developer setup on Windows PowerShell:
- Creates a venv in `backend/.venv`
- Activates it and upgrades pip
- Installs development requirements
- Installs pre-commit and registers hooks

Run from repository root (PowerShell):
    .\scripts\FAST_SETUP_DEV.ps1
#>

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Host "FAST_SETUP_DEV: Starting developer setup..."

# Create backend venv if missing
$venvPath = Join-Path -Path $PSScriptRoot -ChildPath "..\backend\.venv"
$venvActivate = Join-Path -Path $venvPath -ChildPath "Scripts\Activate.ps1"

if (-not (Test-Path $venvActivate) -or $Force) {
    Write-Host "Creating virtual environment at backend/.venv..."
    python -m venv "$PSScriptRoot\..\backend\.venv"
}

# Activate
Write-Host "Activating virtual environment..."
. "$venvActivate"

Write-Host "Checking pip version..."
$pipCheck = python -m pip list --outdated --format=json --disable-pip-version-check 2>$null | ConvertFrom-Json | Where-Object { $_.name -eq 'pip' }
if ($pipCheck) {
    Write-Host "Upgrading pip from $($pipCheck.version) to $($pipCheck.latest_version)..." -ForegroundColor Cyan
    python -m pip install --upgrade pip --quiet
} else {
    Write-Host "pip is already up to date" -ForegroundColor Green
}

Write-Host "Installing development requirements..."
if (Test-Path "$PSScriptRoot\..\backend\requirements-dev.txt") {
    pip install -r "$PSScriptRoot\..\backend\requirements-dev.txt"
} else {
    Write-Host "requirements-dev.txt not found — installing common dev tools (pre-commit, ruff)..."
    pip install pre-commit ruff mypy pytest
}

Write-Host "Installing pre-commit hooks and running them once across repository..."
pip install pre-commit
pre-commit install
pre-commit run --all-files || Write-Host "pre-commit reported issues; fix them and re-run pre-commit run --all-files"

Write-Host 'Setup complete. Activate venv in a new shell with: . .\backend\.venv\Scripts\Activate.ps1'

exit 0
