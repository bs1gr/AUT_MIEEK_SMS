#!/usr/bin/env pwsh
# Comprehensive test completion checker

Write-Host "Checking test completion status...`n" -ForegroundColor Cyan

# Wait up to 5 minutes for batch runner to complete
$maxWait = 300  # 5 minutes
$checkInterval = 5  # Check every 5 seconds
$elapsed = 0

while ($elapsed -lt $maxWait) {
    $resultsFile = "test-results/backend_batch_full.txt"

    if (Test-Path $resultsFile) {
        $content = Get-Content $resultsFile -Raw

        # Check for completion markers
        if ($content -match "(?:All tests passed|Tests COMPLETED)" -or $content -match "Batch 17.*successfully") {
            Write-Host "`n✓ Tests completed!" -ForegroundColor Green

            # Extract summary
            if ($content -match "(\d+)\s+passed") {
                $passed = $matches[1]
                Write-Host "Tests passed: $passed" -ForegroundColor Green
            }

            if ($content -match "(\d+)\s+failed") {
                $failed = $matches[1]
                Write-Host "Tests failed: $failed" -ForegroundColor Red
            }

            # Show last 30 lines
            Write-Host "`nTest output (last 30 lines):" -ForegroundColor Cyan
            $lines = $content -split "`n"
            $lines[-30..-1] | ForEach-Object { if ($_) { Write-Host $_ } }

            exit 0
        }
    }

    # Show progress
    $batchMatch = [regex]::Match((Get-Content $resultsFile -Raw -ErrorAction SilentlyContinue), "Batch (\d+) of (\d+)")
    if ($batchMatch.Success) {
        Write-Host -NoNewline "`rBatch $($batchMatch.Groups[1].Value)/$($batchMatch.Groups[2].Value) running... ($elapsed/$maxWait seconds)"
    } else {
        Write-Host -NoNewline "`rWaiting for tests... ($elapsed/$maxWait seconds)"
    }

    Start-Sleep -Seconds $checkInterval
    $elapsed += $checkInterval
}

Write-Host "`n⚠ Tests took longer than 5 minutes" -ForegroundColor Yellow
if (Test-Path "test-results/backend_batch_full.txt") {
    Write-Host "`nPartial results:" -ForegroundColor Yellow
    Get-Content "test-results/backend_batch_full.txt" | Select-Object -Last 50 | ForEach-Object { Write-Host $_ }
}
