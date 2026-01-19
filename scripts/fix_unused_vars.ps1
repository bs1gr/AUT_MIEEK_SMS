# Script to automatically fix unused variables using ESLint
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "frontend"

Write-Host "Running ESLint Auto-Fix for Unused Variables..." -ForegroundColor Cyan

Push-Location $FrontendDir
try {
    # Run ESLint with --fix flag
    # This handles 'no-unused-vars' if configured to warn/error
    $output = & npm run lint -- --fix 2>&1

    $output | ForEach-Object { Write-Host $_ }

    Write-Host "✅ ESLint fix complete." -ForegroundColor Green
}
catch {
    Write-Error "Failed to run ESLint fix: $_"
}
finally {
    Pop-Location
}
