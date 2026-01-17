#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test Git Operations with Greek Encoding Fix
.DESCRIPTION
    Runs repetitive git commands to verify encoding fix doesn't block operations
#>

Write-Host "`n=== GIT ENCODING FIX VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Testing git commands with encoding fix enabled...`n"

$passed = 0
$failed = 0

# Test 1-5: Basic git commands
$tests = @(
    @{Name="git status"; Cmd={git status}},
    @{Name="git log -3"; Cmd={git log -3 --oneline}},
    @{Name="git branch"; Cmd={git branch}},
    @{Name="git diff"; Cmd={git diff --name-only}},
    @{Name="git config"; Cmd={git config --get-regexp "i18n"}}
)

foreach ($test in $tests) {
    Write-Host "Testing: $($test.Name)" -NoNewline
    try {
        $null = & $test.Cmd 2>&1
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
            Write-Host " ✓" -ForegroundColor Green
            $passed++
        } else {
            Write-Host " ✗ (Exit: $LASTEXITCODE)" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host " ✗ (Error: $_)" -ForegroundColor Red
        $failed++
    }
}

# Repetitive test (x20)
Write-Host "`nRepetitive Test (20 iterations):"
for ($i = 1; $i -le 20; $i++) {
    Write-Host "  $i." -NoNewline
    $null = git status --short 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓" -ForegroundColor Green -NoNewline
        $passed++
    } else {
        Write-Host " ✗" -ForegroundColor Red -NoNewline
        $failed++
    }
    if ($i % 10 -eq 0) { Write-Host "" }
}

Write-Host "`n`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if($failed -eq 0){'Green'}else{'Red'})

# Display current encoding
Write-Host "`nCurrent Encoding:" -ForegroundColor Cyan
Write-Host "  Console: $([System.Console]::OutputEncoding.EncodingName) (CP$([System.Console]::OutputEncoding.CodePage))"

# Greek character test
Write-Host "`nGreek Characters: αβγψΨ Ψυχή" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "`n✅ SUCCESS: All git operations work with encoding fix!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠ WARNING: Some operations failed" -ForegroundColor Yellow
    exit 1
}
