#!/usr/bin/env pwsh
# Wait for tests and check results
Start-Sleep -Seconds 5  # Give batch runner time to finish if close

# Check if results file exists
if (Test-Path "test-results/backend_batch_full.txt") {
    $content = Get-Content "test-results/backend_batch_full.txt" -Raw

    # Count batches
    $completedBatches = $content | Select-String "Batch.*successfully" | Measure-Object | Select-Object -ExpandProperty Count
    $totalBatches = 17

    Write-Host "`nTest Results Summary:" -ForegroundColor Cyan
    Write-Host "Batches completed: $completedBatches / $totalBatches"

    # Check for success message
    if ($content -match "All tests passed") {
        Write-Host "`nStatus: ALL TESTS PASSED" -ForegroundColor Green
    } elseif ($content -match "FAILED") {
        Write-Host "`nStatus: SOME TESTS FAILED" -ForegroundColor Red
        $content | Select-String "FAILED" | Write-Host -ForegroundColor Red
    } else {
        Write-Host "`nStatus: Tests still running or not complete" -ForegroundColor Yellow
    }

    # Show last 20 lines
    Write-Host "`nLast 20 lines of output:" -ForegroundColor Cyan
    $lines = $content -split "`n"
    $lines[-20..-1] | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "Results file not found yet" -ForegroundColor Yellow
}
