param()

$projectRoot = Split-Path -Parent $PSScriptRoot
$smsScript = Join-Path $projectRoot 'SMS.ps1'

if (-not (Test-Path $smsScript)) {
	Write-Host "✗ Unable to locate SMS.ps1 at $smsScript" -ForegroundColor Red
	exit 1
}

Write-Host "Delegating to .\\SMS.ps1 -Stop ..." -ForegroundColor Yellow
& $smsScript -Stop
exit $LASTEXITCODE
