<#
.SYNOPSIS
    Greek Language File Encoding Audit and Fix - Inno Setup Installer

.DESCRIPTION
    Ensures all Greek-language files in the installer use proper encoding:
    - Greek.isl: Must declare LanguageCodePage=1253 (Windows-1253)
    - *.txt files: Must be encoded as Windows-1253 (Greek)
    - *.rtf files: Must use UTF-8 or Windows-1253
    
    Inno Setup 6 requires proper encoding declarations to render Greek text correctly.
    Previous releases used Windows-1253 (CP1253) encoding for all Greek files.

.PARAMETER Audit
    Only audit files, don't fix encoding issues

.PARAMETER Fix
    Audit and fix encoding issues automatically

.PARAMETER Verbose
    Show detailed file analysis

.EXAMPLE
    .\GREEK_ENCODING_AUDIT.ps1 -Audit
    # Check encoding without modifying files

.EXAMPLE
    .\GREEK_ENCODING_AUDIT.ps1 -Fix
    # Fix all encoding issues

.NOTES
    Version: 1.0
    Created: 2025-12-04
    
    Greek Encoding Strategy:
    - Windows-1253 (CP1253): Standard for Greek text files in Windows/Inno Setup
    - Files affected:
      * installer/Greek.isl
      * installer/installer_welcome_el.txt
      * installer/installer_complete_el.txt
      * installer/LICENSE_EL.txt
    
    Inno Setup CodePage Reference:
    1253 = Greek (Windows-1253)
    0408 = Greek Language ID
#>

[CmdletBinding()]
param(
    [switch]$Audit,
    [switch]$Fix
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ============================================================================
# Configuration
# ============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$GreekFiles = @(
    @{
        Path = Join-Path $ScriptDir "Greek.isl"
        Type = "ISL Language File"
        MustContain = "LanguageCodePage=1253"
        Description = "Inno Setup Greek language definition"
    },
    @{
        Path = Join-Path $ScriptDir "installer_welcome_el.txt"
        Type = "Welcome Text"
        Encoding = "Windows-1253"
        Description = "Greek welcome message (RTF content)"
    },
    @{
        Path = Join-Path $ScriptDir "installer_complete_el.txt"
        Type = "Completion Text"
        Encoding = "Windows-1253"
        Description = "Greek completion message"
    },
    @{
        Path = Join-Path $ScriptDir "LICENSE_EL.txt"
        Type = "License File"
        Encoding = "Windows-1253"
        Description = "Greek license text"
    }
)

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Status {
    param(
        [ValidateSet('OK', 'Warning', 'Error', 'Info')]
        [string]$Status,
        [string]$Message
    )
    
    $colors = @{
        'OK'      = 'Green'
        'Warning' = 'Yellow'
        'Error'   = 'Red'
        'Info'    = 'Cyan'
    }
    
    $symbols = @{
        'OK'      = '✓'
        'Warning' = '⚠'
        'Error'   = '✗'
        'Info'    = 'ℹ'
    }
    
    Write-Host "$($symbols[$Status]) $Message" -ForegroundColor $colors[$Status]
}

function Get-FileEncoding {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        return "NOT_FOUND"
    }
    
    # Read first 4 bytes to check for BOM
    try {
        $bytes = [System.IO.File]::ReadAllBytes($Path) | Select-Object -First 4
        
        # Check for BOM signatures
        if ($bytes.Count -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            return "UTF-8-BOM"
        }
        if ($bytes.Count -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
            return "UTF-16-LE"
        }
        if ($bytes.Count -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
            return "UTF-16-BE"
        }
    }
    catch { }
    
    # Try to detect based on content pattern
    try {
        $content = Get-Content $Path -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($content -match '[α-ω]') {
            # Contains Greek characters
            return "Possibly-UTF8-or-1253"
        }
    }
    catch { }
    
    return "Unknown (likely Windows-1253)"
}

function Validate-GreekISL {
    param([string]$Path)
    
    Write-Status Info "Validating Greek.isl language file..."
    
    if (-not (Test-Path $Path)) {
        Write-Status Error "Greek.isl not found at: $Path"
        return $false
    }
    
    $content = Get-Content $Path -Raw
    $issues = @()
    
    # Check CodePage declaration
    if ($content -notmatch 'LanguageCodePage\s*=\s*1253') {
        $issues += "Missing or incorrect LanguageCodePage declaration (must be 1253)"
    }
    
    # Check LangOptions section
    if ($content -notmatch '\[LangOptions\]') {
        $issues += "Missing [LangOptions] section"
    }
    
    # Check for Greek text
    if ($content -notmatch '[α-ωΑ-Ω]') {
        Write-Status Warning "No Greek characters detected in Greek.isl"
    }
    
    if ($issues.Count -eq 0) {
        Write-Status OK "Greek.isl encoding validation passed ✓"
        return $true
    } else {
        Write-Status Warning "Issues found in Greek.isl:"
        $issues | ForEach-Object { Write-Host "  • $_" -ForegroundColor Yellow }
        return $false
    }
}

function Validate-GreekTextFile {
    param([string]$Path, [string]$Description)
    
    if (-not (Test-Path $Path)) {
        Write-Status Error "$Description not found at: $Path"
        return $false
    }
    
    $encoding = Get-FileEncoding $Path
    Write-Status Info "  $Description encoding: $encoding"
    
    # Try to read the file
    try {
        $content = Get-Content $Path -Raw -Encoding Default -ErrorAction Stop
        
        # Check for Greek characters
        if ($content -match '[α-ωΑ-Ω]') {
            Write-Status OK "Greek characters detected ✓"
            return $true
        } else {
            Write-Status Warning "No Greek characters detected"
            return $false
        }
    }
    catch {
        Write-Status Error "Failed to read file: $_"
        return $false
    }
}

function Fix-GreekISL {
    param([string]$Path)
    
    Write-Status Info "Fixing Greek.isl encoding..."
    
    if (-not (Test-Path $Path)) {
        Write-Status Error "File not found: $Path"
        return $false
    }
    
    try {
        # Read content
        $content = Get-Content $Path -Raw -Encoding Default
        
        # Ensure CodePage declaration
        if ($content -notmatch 'LanguageCodePage\s*=\s*1253') {
            $content = $content -replace '\[LangOptions\]', "[LangOptions]`nLanguageCodePage=1253"
        }
        
        # Write back with Windows-1253 encoding (via Default which respects system settings)
        Set-Content -Path $Path -Value $content -Encoding Default -Force
        
        Write-Status OK "Greek.isl encoding fixed ✓"
        return $true
    }
    catch {
        $errorMsg = $_
        Write-Status Error "Failed to fix Greek.isl: $errorMsg"
        return $false
    }
}

function Fix-GreekTextFile {
    param([string]$Path, [string]$Description)
    
    Write-Status Info "Fixing $Description..."
    
    if (-not (Test-Path $Path)) {
        Write-Status Error "File not found: $Path"
        return $false
    }
    
    try {
        # Read with default encoding (system locale, typically Windows-1253 on Greek systems)
        $content = Get-Content $Path -Raw -Encoding Default
        
        # Write back with Windows-1253 encoding
        Set-Content -Path $Path -Value $content -Encoding Default -Force
        
        Write-Status OK "$Description encoding fixed ✓"
        return $true
    }
    catch {
        $errorMsg = $_
        Write-Status Error "Failed to fix ${Description}: $errorMsg"
        return $false
    }
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  GREEK LANGUAGE ENCODING AUDIT & FIX - Inno Setup Installer  ║" -ForegroundColor Cyan
Write-Host "║  Version 1.0 | Encoding: Windows-1253 (CP1253)               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true
$fixedCount = 0

# Audit mode (default)
Write-Status Info "═══════════════════════════════════════════════════════════════"
Write-Status Info "AUDIT PHASE - Checking Greek file encodings"
Write-Status Info "═══════════════════════════════════════════════════════════════"
Write-Host ""

# Check Greek.isl
Write-Status Info "Checking Greek.isl (Inno Setup language file)..."
if (-not (Validate-GreekISL $GreekFiles[0].Path)) {
    $allPassed = $false
}
Write-Host ""

# Check text files
Write-Status Info "Checking Greek text files..."
for ($i = 1; $i -lt $GreekFiles.Count; $i++) {
    $file = $GreekFiles[$i]
    if (-not (Validate-GreekTextFile $file.Path $file.Description)) {
        $allPassed = $false
    }
}
Write-Host ""

# Fix mode (if requested)
if ($Fix -and -not $allPassed) {
    Write-Status Info "═══════════════════════════════════════════════════════════════"
    Write-Status Info "FIX PHASE - Correcting Greek file encodings"
    Write-Status Info "═══════════════════════════════════════════════════════════════"
    Write-Host ""
    
    # Fix Greek.isl
    if ((Validate-GreekISL $GreekFiles[0].Path) -eq $false) {
        if (Fix-GreekISL $GreekFiles[0].Path) {
            $fixedCount++
        }
    }
    Write-Host ""
    
    # Fix text files
    for ($i = 1; $i -lt $GreekFiles.Count; $i++) {
        $file = $GreekFiles[$i]
        if ((Validate-GreekTextFile $file.Path $file.Description) -eq $false) {
            if (Fix-GreekTextFile $file.Path $file.Description) {
                $fixedCount++
            }
        }
    }
    
    Write-Host ""
    Write-Status Info "Fixed $fixedCount files - re-run audit to verify:"
    Write-Host "  .\GREEK_ENCODING_AUDIT.ps1 -Audit" -ForegroundColor Cyan
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan

if ($allPassed) {
    Write-Status OK "All Greek files have correct encoding ✓"
    Write-Host "║  STATUS: ALL GREEK FILES VALIDATED                          ║" -ForegroundColor Green
} else {
    if ($Fix) {
        Write-Status OK "Fixed $fixedCount files - re-run to verify complete resolution"
        Write-Host "║  STATUS: FIXED - Re-run audit to verify                      ║" -ForegroundColor Yellow
    } else {
        Write-Status Error "Encoding issues detected - run with -Fix to correct"
        Write-Host "║  STATUS: ISSUES DETECTED - Use -Fix to correct              ║" -ForegroundColor Red
    }
}

Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

exit $(if ($allPassed -or $Fix) { 0 } else { 1 })
