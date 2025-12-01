. .\COMMIT_READY.ps1
$Mode = 'quick'
$exitCode = Invoke-MainWorkflow
Write-Host "Workflow exit: $exitCode"
$script:Results | ConvertTo-Json -Depth 5 | Out-File -FilePath debug_results.json -Encoding UTF8
Write-Host "Wrote debug_results.json"
Get-Content debug_results.json -Raw | Write-Host
