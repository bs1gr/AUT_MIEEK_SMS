#!/usr/bin/env pwsh
# Simple test runner - bypass escaping issues

$env:SMS_ALLOW_DIRECT_PYTEST = "1"
$env:SMS_TEST_RUNNER = "batch"

Write-Host "Running batch tests with BatchSize 3..." -ForegroundColor Cyan
cd d:\SMS\student-management-system
& .\RUN_TESTS_BATCH.ps1 -BatchSize 3

Write-Host "Test run completed" -ForegroundColor Green
