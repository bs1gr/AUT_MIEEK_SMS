#!/usr/bin/env pwsh
# Run commit ready to identify CI issues
Write-Host "=== Running COMMIT_READY to identify issues ===" -ForegroundColor Cyan

cd d:\SMS\student-management-system

# Run quick check
& ".\COMMIT_READY.ps1" -Quick -Verbose 2>&1 | Tee-Object -FilePath "commit_ready_output.txt"

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
