param()

Write-Host "Setting up pre-commit hooks (backend venv expected at backend/.venv)"

$venvActivate = "./backend/.venv/Scripts/Activate.ps1"
if (Test-Path $venvActivate) {
    & $venvActivate
} else {
    Write-Host "No backend venv found at backend/.venv. Please create one and activate, or run this from the venv." -ForegroundColor Yellow
}

python -m pip install --upgrade pip
pip install pre-commit ruff isort

pre-commit install
Write-Host "pre-commit hooks installed. Run 'pre-commit run --all-files' to check the repo." -ForegroundColor Green
