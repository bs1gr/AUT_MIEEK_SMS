#!/usr/bin/env pwsh
Write-Host "[DEPRECATED] scripts/STOP.ps1 has been consolidated." -ForegroundColor Yellow
Write-Host "Use '.\\DOCKER.ps1 -Stop' (for Docker) or '.\\NATIVE.ps1 -Stop' (for native development)." -ForegroundColor Cyan
Write-Host "See SCRIPTS_CONSOLIDATION_GUIDE.md for details." -ForegroundColor Gray
exit 1
