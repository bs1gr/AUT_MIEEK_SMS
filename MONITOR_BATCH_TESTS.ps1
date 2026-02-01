#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Monitor batch test results in real-time or view existing results
.DESCRIPTION
    Tails the latest batch test log file, or displays a summary of all batch runs
    
.PARAMETER Follow
    Follow/tail the log file in real-time (like `tail -f`)
.PARAMETER Latest
    Show latest batch test log (default action)
.PARAMETER List
    List all batch test logs
.PARAMETER Summary
    Show summary of all batch runs

.EXAMPLE
    .\MONITOR_BATCH_TESTS.ps1
    # Show latest test results

.EXAMPLE
    .\MONITOR_BATCH_TESTS.ps1 -Follow
    # Tail the latest log in real-time

.EXAMPLE
    .\MONITOR_BATCH_TESTS.ps1 -List
    # Show all batch test logs

.EXAMPLE
    .\MONITOR_BATCH_TESTS.ps1 -Summary
    # Show summary of all batch runs
#>

param(
    [switch]$Follow,
    [switch]$Latest,
    [switch]$List,
    [switch]$Summary
)

$testResultsDir = "test-results"

# Ensure directory exists
if (-not (Test-Path $testResultsDir)) {
    Write-Host "❌ No test-results directory found" -ForegroundColor Red
    Write-Host "Run tests first with: .\RUN_TESTS_BATCH.ps1" -ForegroundColor Yellow
    exit 1
}

# Get all batch log files
$batchLogs = Get-ChildItem "$testResultsDir" -Filter "backend_batch_run_*.txt" -File | Sort-Object LastWriteTime -Descending

if ($batchLogs.Count -eq 0) {
    Write-Host "❌ No batch test logs found" -ForegroundColor Red
    exit 1
}

# Default to showing latest if no flags specified
if (-not ($Follow -or $Latest -or $List -or $Summary)) {
    $Latest = $true
}

# Show list of all logs
if ($List) {
    Write-Host "`n📋 Batch Test Logs:" -ForegroundColor Cyan
    Write-Host ""
    $batchLogs | ForEach-Object {
        $age = [Math]::Round(((Get-Date) - $_.LastWriteTime).TotalMinutes, 1)
        $size = [Math]::Round($_.Length / 1KB, 1)
        Write-Host "  • $($_.Name)" -ForegroundColor Gray
        Write-Host "    Modified: $($_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')) ($age min ago) - $size KB" -ForegroundColor DarkGray
    }
    Write-Host ""
    exit 0
}

# Show summary
if ($Summary) {
    Write-Host "`n📊 Batch Test Summary:" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($log in $batchLogs | Select-Object -First 10) {
        Write-Host "  $($log.Name)" -ForegroundColor Gray
        Write-Host "    Modified: $($log.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor DarkGray
        
        # Extract summary line from log
        $content = Get-Content $log.FullName -ErrorAction SilentlyContinue
        $summaryLine = $content | Select-String -Pattern "✓|✗" | Select-Object -Last 5
        
        if ($summaryLine) {
            Write-Host "    Summary:" -ForegroundColor Gray
            foreach ($line in $summaryLine) {
                $text = $line.Line -replace '\e\[[0-9;]*m', ''
                if ($text) {
                    Write-Host "      $text" -ForegroundColor DarkGray
                }
            }
        }
    }
    Write-Host ""
    exit 0
}

# Get latest log
$latestLog = $batchLogs[0]

if ($Follow) {
    Write-Host "📝 Following test log (Ctrl+C to exit):" -ForegroundColor Cyan
    Write-Host "   $($latestLog.FullName)" -ForegroundColor Gray
    Write-Host ""
    
    # Follow the file
    Get-Content $latestLog.FullName -Wait -Tail 100 | ForEach-Object {
        # Color certain patterns
        if ($_ -match "✓") {
            Write-Host $_ -ForegroundColor Green
        } elseif ($_ -match "✗") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "⚠|⏳") {
            Write-Host $_ -ForegroundColor Yellow
        } else {
            Write-Host $_
        }
    }
} else {
    # Show latest log (tail)
    Write-Host "📝 Latest Test Results:" -ForegroundColor Cyan
    Write-Host "   $($latestLog.FullName)" -ForegroundColor Gray
    Write-Host "   Modified: $($latestLog.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor DarkGray
    Write-Host ""
    
    $content = Get-Content $latestLog.FullName -ErrorAction SilentlyContinue
    
    # Show last 50 lines
    $content | Select-Object -Last 50 | ForEach-Object {
        # Color output
        if ($_ -match "✓") {
            Write-Host $_ -ForegroundColor Green
        } elseif ($_ -match "✗") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "⚠|⏳") {
            Write-Host $_ -ForegroundColor Yellow
        } elseif ($_ -match "^│|^├|^└|^┌|^╔|^║|^╚") {
            Write-Host $_ -ForegroundColor Cyan
        } else {
            Write-Host $_
        }
    }
    
    Write-Host ""
    Write-Host "💡 Tip: Use -Follow to tail in real-time, or -List to see all logs" -ForegroundColor Gray
}
