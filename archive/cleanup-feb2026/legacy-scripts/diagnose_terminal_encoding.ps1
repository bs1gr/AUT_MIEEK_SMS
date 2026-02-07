#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive Terminal Encoding Diagnostic - Find and fix corruption
.DESCRIPTION
    Identifies and fixes terminal encoding issues causing PowerShell command corruption
#>

Write-Host "`n========== TERMINAL ENCODING DIAGNOSTICS ==========" -ForegroundColor Cyan
Write-Host "Searching for root cause of encoding corruption..." -ForegroundColor Yellow

# Test 1: Console output encoding
Write-Host "`n[1] Console Output Encoding" -ForegroundColor Green
Write-Host "  Current console encoding: $([System.Console]::OutputEncoding.EncodingName)"
Write-Host "  Input encoding: $([System.Console]::InputEncoding.EncodingName)"

# Test 2: System code page
Write-Host "`n[2] System Code Page (Windows Locale)" -ForegroundColor Green
$codePage = chcp
Write-Host "  $codePage"

# Test 3: Environment variables
Write-Host "`n[3] Environment Variables" -ForegroundColor Green
Write-Host "  LANG: $env:LANG"
Write-Host "  LC_ALL: $env:LC_ALL"
Write-Host "  PYTHONIOENCODING: $env:PYTHONIOENCODING"
$psVersion = $PSVersionTable.PSVersion
Write-Host "  PowerShell Version: $psVersion"

# Test 4: File encoding check - scan for BOM issues
Write-Host "`n[4] Script File Encoding Check" -ForegroundColor Green
$scriptFiles = @(
    "COMMIT_READY.ps1",
    "RUN_TESTS_BATCH.ps1",
    "NATIVE.ps1",
    "DOCKER.ps1"
)

foreach ($file in $scriptFiles) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $first3 = $bytes[0..2]
        $bomInfo = if ($first3[0] -eq 0xEF -and $first3[1] -eq 0xBB -and $first3[2] -eq 0xBF) {
            "UTF-8 with BOM"
        } elseif ($first3[0] -eq 0xFF -and $first3[1] -eq 0xFE) {
            "UTF-16 LE (DANGEROUS)"
        } else {
            "UTF-8 (no BOM) or ANSI"
        }
        Write-Host "  $file : $bomInfo"
    }
}

# Test 5: VS Code settings
Write-Host "`n[5] VS Code Settings" -ForegroundColor Green
$vsCodeSettingsPath = "$env:APPDATA\Code\User\settings.json"
if (Test-Path $vsCodeSettingsPath) {
    $settings = Get-Content $vsCodeSettingsPath -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($settings) {
        $terminalEncoding = $settings.'terminal.integrated.env.windows' -or $settings.'terminal.integrated.encoding'
        Write-Host "  VS Code terminal encoding setting: $($settings.'terminal.integrated.encoding' ?? 'Not set (using system default)')"
        Write-Host "  VS Code shell (Windows): $($settings.'terminal.integrated.shell.windows' ?? 'Not set')"
    }
} else {
    Write-Host "  VS Code settings file not found at $vsCodeSettingsPath"
}

# Test 6: Python encoding
Write-Host "`n[6] Python Encoding" -ForegroundColor Green
python -c "import sys; print('  Python default encoding:', sys.stdout.encoding); print('  Filesystem encoding:', sys.getfilesystemencoding())"

# Test 7: Check for suspicious characters in terminal history
Write-Host "`n[7] Terminal Character Integrity" -ForegroundColor Green
$testString = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
Write-Host "  Test string: $testString"
$testBytes = [System.Text.Encoding]::UTF8.GetBytes($testString)
Write-Host "  Bytes: $($testBytes.Count) bytes for $($testString.Length) chars (should be equal for ASCII)"

# Test 8: PowerShell profile
Write-Host "`n[8] PowerShell Profile" -ForegroundColor Green
$profilePath = $profile
Write-Host "  Profile path: $profilePath"
if (Test-Path $profilePath) {
    Write-Host "  Profile exists: YES"
    $profileContent = Get-Content $profilePath -Raw
    if ($profileContent -match '[^\x00-\x7F]') {
        Write-Host "  ⚠️  WARNING: Profile contains non-ASCII characters!" -ForegroundColor Red
    } else {
        Write-Host "  Profile encoding: OK (ASCII safe)"
    }
} else {
    Write-Host "  Profile exists: NO"
}

# Test 9: Recent command history
Write-Host "`n[9] PowerShell History Analysis" -ForegroundColor Green
$historyPath = (Get-PSReadlineOption).HistorySavePath
if (Test-Path $historyPath) {
    $history = Get-Content $historyPath -Tail 10 -ErrorAction SilentlyContinue
    Write-Host "  Last 10 commands:"
    $history | ForEach-Object { Write-Host "    $_" }

    # Check for corrupted characters in history
    $history | ForEach-Object {
        if ($_ -match 'ψ|Ή|έ|ζ|Ζ|γ') {
            Write-Host "  ⚠️  FOUND CORRUPTED COMMAND IN HISTORY: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  History file not found"
}

# Test 10: Registry check for code page
Write-Host "`n[10] Windows Registry (Code Page Settings)" -ForegroundColor Green
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Nls\CodePage"
if (Test-Path $regPath) {
    $oemCP = (Get-ItemProperty $regPath).OEMCP
    $acp = (Get-ItemProperty $regPath).ACP
    Write-Host "  OEMCP (OEM Code Page): $oemCP"
    Write-Host "  ACP (ANSI Code Page): $acp"
    if ($acp -ne "1252" -and $acp -ne "65001") {
        Write-Host "  ⚠️  WARNING: ACP is $acp (should be 1252 for English or 65001 for UTF-8)" -ForegroundColor Yellow
    }
}

# Test 11: Check for corrupted environment variables
Write-Host "`n[11] Environment Variable Integrity" -ForegroundColor Green
$suspiciousEnvVars = @()
Get-ChildItem Env: | ForEach-Object {
    if ($_.Value -match 'ψ|Ή|έ|ζ|Ζ|γ') {
        $suspiciousEnvVars += "$($_.Name)=$($_.Value)"
    }
}
if ($suspiciousEnvVars.Count -gt 0) {
    Write-Host "  ⚠️  FOUND CORRUPTED ENVIRONMENT VARIABLES:" -ForegroundColor Red
    $suspiciousEnvVars | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "  All environment variables: OK"
}

Write-Host "`n========== DIAGNOSTICS COMPLETE ==========" -ForegroundColor Cyan
Write-Host "`nNext step: Run .\terminal_encoding_fix.ps1 to apply fixes" -ForegroundColor Yellow
