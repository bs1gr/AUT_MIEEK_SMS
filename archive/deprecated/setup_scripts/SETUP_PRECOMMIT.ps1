param()

Write-Host "Setting up pre-commit hooks (backend venv expected at backend/.venv)"

$venvActivate = "./backend/.venv/Scripts/Activate.ps1"
if (Test-Path $venvActivate) {
    & $venvActivate
} else {
    Write-Host "No backend venv found at backend/.venv. Please create one and activate, or run this from the venv." -ForegroundColor Yellow
}

Write-Host "Checking pip version..." -ForegroundColor Cyan
$pipCheck = python -m pip list --outdated --format=json --disable-pip-version-check 2>$null | ConvertFrom-Json | Where-Object { $_.name -eq 'pip' }
if ($pipCheck) {
    Write-Host "Upgrading pip..." -ForegroundColor Cyan
    python -m pip install --upgrade pip --quiet
} else {
    Write-Host "pip is already up to date" -ForegroundColor Green
}

pip install pre-commit ruff isort

pre-commit install
Write-Host "pre-commit hooks installed. Run 'pre-commit run --all-files' to check the repo." -ForegroundColor Green
