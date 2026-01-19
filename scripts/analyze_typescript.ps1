# Script to run TypeScript analysis and log errors
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "frontend"
$LogFile = Join-Path $RootDir "typescript-errors.log"

Write-Host "Running TypeScript Analysis..." -ForegroundColor Cyan

Push-Location $FrontendDir
try {
    # Run tsc and capture output
    $output = & npx tsc --noEmit 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ No TypeScript errors found." -ForegroundColor Green
        if (Test-Path $LogFile) { Remove-Item $LogFile }
    } else {
        Write-Host "❌ TypeScript errors found:" -ForegroundColor Red
        $output | ForEach-Object { Write-Host $_ }
        $output | Out-File $LogFile -Encoding UTF8
        Write-Host "`nErrors saved to $LogFile" -ForegroundColor Yellow
    }
}
catch {
    Write-Error "Failed to execute TypeScript compiler: $_"
}
finally {
    Pop-Location
}
