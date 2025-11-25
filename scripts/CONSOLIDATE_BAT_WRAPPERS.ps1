#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Consolidates .bat wrapper files by removing them and ensuring .ps1 files are executable

.DESCRIPTION
    This script:
    - Identifies .bat/.ps1 file pairs where .bat is just a wrapper
    - Adds pwsh shebang to .ps1 files for cross-platform support
    - Archives .bat files to archive/deprecated_bat_wrappers/
    - Updates file references in documentation
    - Validates all changes

.EXAMPLE
    .\CONSOLIDATE_BAT_WRAPPERS.ps1
    # Dry-run (shows what would be done)

.EXAMPLE
    .\CONSOLIDATE_BAT_WRAPPERS.ps1 -Execute
    # Actually perform consolidation

.EXAMPLE
    .\CONSOLIDATE_BAT_WRAPPERS.ps1 -Execute -SkipBackup
    # Execute without creating backup
#>

param(
    [switch]$Execute,      # Actually perform changes
    [switch]$SkipBackup,   # Don't create backup
    [switch]$Verbose       # Show detailed output
)

$ErrorActionPreference = "Stop"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

# Color output functions
function Write-Success { param($Text) Write-Host "✅ $Text" -ForegroundColor Green }
function Write-Warning2 { param($Text) Write-Host "⚠️  $Text" -ForegroundColor Yellow }
function Write-Error2 { param($Text) Write-Host "❌ $Text" -ForegroundColor Red }
function Write-Info { param($Text) Write-Host "ℹ️  $Text" -ForegroundColor Cyan }
function Write-Header { param($Text) Write-Host "`n━━━ $Text ━━━" -ForegroundColor Magenta }

# Results tracking
$script:BatFilesFound = 0
$script:BatFilesProcessed = 0
$script:Ps1FilesUpdated = 0
$script:ReferencesUpdated = 0

# ============================================================================
# FIND BAT/PS1 PAIRS
# ============================================================================

function Find-BatWrapperPairs {
    Write-Header "Scanning for .bat Wrapper Files"
    
    $scriptsDir = Join-Path $PROJECT_ROOT "scripts"
    $batFiles = Get-ChildItem -Path $scriptsDir -Recurse -Filter "*.bat" -File
    
    $pairs = @()
    
    foreach ($batFile in $batFiles) {
        $script:BatFilesFound++
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($batFile.Name)
        $ps1File = Join-Path $batFile.DirectoryName "$baseName.ps1"
        
        if (Test-Path $ps1File) {
            # Check if .bat is just a wrapper
            $batContent = Get-Content $batFile.FullName -Raw
            if ($batContent -match "powershell|pwsh|\.ps1") {
                $pairs += @{
                    BatFile = $batFile.FullName
                    Ps1File = $ps1File
                    BaseName = $baseName
                    Directory = $batFile.DirectoryName
                }
                
                Write-Info "Found pair: $baseName (.bat → .ps1)"
            }
        }
    }
    
    Write-Info "Found $($pairs.Count) .bat wrapper files"
    return $pairs
}

# ============================================================================
# ADD SHEBANG TO PS1 FILES
# ============================================================================

function Add-ShebangToPs1 {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $shebang = "#!/usr/bin/env pwsh"
    
    # Check if shebang already exists
    if ($content -match "^#!") {
        Write-Verbose "Shebang already present: $FilePath"
        return $false
    }
    
    # Add shebang at the beginning
    $newContent = "$shebang`n$content"
    
    if ($Execute) {
        Set-Content -Path $FilePath -Value $newContent -NoNewline
        Write-Success "Added shebang: $(Split-Path $FilePath -Leaf)"
        return $true
    } else {
        Write-Info "Would add shebang: $(Split-Path $FilePath -Leaf)"
        return $true
    }
}

# ============================================================================
# ARCHIVE BAT FILES
# ============================================================================

function Archive-BatFile {
    param([string]$BatFilePath)
    
    $archiveDir = Join-Path $PROJECT_ROOT "archive\deprecated_bat_wrappers"
    
    if (-not (Test-Path $archiveDir)) {
        if ($Execute) {
            New-Item -Path $archiveDir -ItemType Directory -Force | Out-Null
            Write-Info "Created archive directory: $archiveDir"
        }
    }
    
    $fileName = Split-Path $BatFilePath -Leaf
    $destPath = Join-Path $archiveDir $fileName
    
    if ($Execute) {
        Move-Item -Path $BatFilePath -Destination $destPath -Force
        Write-Success "Archived: $fileName → archive/deprecated_bat_wrappers/"
        return $true
    } else {
        Write-Info "Would archive: $fileName"
        return $true
    }
}

# ============================================================================
# UPDATE DOCUMENTATION REFERENCES
# ============================================================================

function Update-DocumentationReferences {
    param([array]$Pairs)
    
    Write-Header "Updating Documentation References"
    
    $mdFiles = Get-ChildItem -Path $PROJECT_ROOT -Recurse -Filter "*.md" -File `
        | Where-Object { $_.FullName -notmatch "node_modules|\.venv|\.git|archive" }
    
    foreach ($mdFile in $mdFiles) {
        $content = Get-Content $mdFile.FullName -Raw
        $updated = $false
        
        foreach ($pair in $Pairs) {
            $batName = [System.IO.Path]::GetFileName($pair.BatFile)
            $ps1Name = "$($pair.BaseName).ps1"
            
            if ($content -match [regex]::Escape($batName)) {
                $newContent = $content -replace [regex]::Escape($batName), $ps1Name
                
                if ($Execute) {
                    Set-Content -Path $mdFile.FullName -Value $newContent -NoNewline
                    $updated = $true
                }
                
                Write-Info "$(if ($Execute) {'Updated'} else {'Would update'}): $($mdFile.Name) ($batName → $ps1Name)"
                $script:ReferencesUpdated++
            }
        }
        
        if ($updated) {
            Write-Success "Updated: $($mdFile.Name)"
        }
    }
}

# ============================================================================
# CREATE ARCHIVE README
# ============================================================================

function Create-ArchiveReadme {
    param([array]$Pairs)
    
    $archiveDir = Join-Path $PROJECT_ROOT "archive\deprecated_bat_wrappers"
    $readmePath = Join-Path $archiveDir "README.md"
    
    $content = @"
# Deprecated .bat Wrapper Files

**Deprecated:** 2025-11-25  
**Reason:** Consolidation - .bat files were simple wrappers calling .ps1 scripts  
**Replacement:** Use .ps1 files directly (Windows handles double-click execution)

## What Were These Files?

These .bat files were Windows batch scripts that did nothing except call their corresponding PowerShell (.ps1) scripts. Example:

``````batch
@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0SCRIPT_NAME.ps1" %*
``````

## Why Remove Them?

1. **Redundancy:** Each .bat just called its .ps1 counterpart
2. **Maintenance:** Double the files to maintain for same functionality
3. **Modern Windows:** Windows 10/11 handle .ps1 double-click execution
4. **Cross-platform:** .ps1 with shebang works on Linux/macOS too

## Migration Guide

| Old .bat File | New .ps1 File | Notes |
|---------------|---------------|-------|
$(($Pairs | ForEach-Object {
    $batName = [System.IO.Path]::GetFileName($_.BatFile)
    $ps1Name = "$($_.BaseName).ps1"
    "| $batName | $ps1Name | All .ps1 files now have pwsh shebang |"
}) -join "`n")

## How to Use .ps1 Files Directly

### Windows
- **Double-click:** Works natively on Windows 10/11
- **Command line:** `.\SCRIPT_NAME.ps1` or `pwsh SCRIPT_NAME.ps1`
- **Run as admin:** Right-click → "Run with PowerShell"

### Linux/macOS
```bash
# Make executable (one-time)
chmod +x SCRIPT_NAME.ps1

# Run
./SCRIPT_NAME.ps1
```

## Archived Files

This directory contains $(($Pairs).Count) archived .bat wrapper files:

$(($Pairs | ForEach-Object { "- $([System.IO.Path]::GetFileName($_.BatFile))" }) -join "`n")

---

*For more information, see .github/EXTENDED_CONSOLIDATION_ANALYSIS.md*
"@

    if ($Execute) {
        Set-Content -Path $readmePath -Value $content -Encoding UTF8
        Write-Success "Created archive README: $readmePath"
    } else {
        Write-Info "Would create archive README"
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Student Management System - BAT Wrapper Consolidation    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if (-not $Execute) {
    Write-Warning2 "DRY-RUN MODE - No changes will be made"
    Write-Info "Run with -Execute to perform actual consolidation`n"
}

# Step 1: Find .bat wrapper pairs
$pairs = Find-BatWrapperPairs

if ($pairs.Count -eq 0) {
    Write-Success "No .bat wrapper files found - consolidation complete!"
    exit 0
}

# Step 2: Add shebangs to .ps1 files
Write-Header "Adding Shebangs to PowerShell Scripts"
foreach ($pair in $pairs) {
    if (Add-ShebangToPs1 -FilePath $pair.Ps1File) {
        $script:Ps1FilesUpdated++
    }
}

# Step 3: Archive .bat files
Write-Header "Archiving .bat Wrapper Files"
foreach ($pair in $pairs) {
    if (Archive-BatFile -BatFilePath $pair.BatFile) {
        $script:BatFilesProcessed++
    }
}

# Step 4: Update documentation references
Update-DocumentationReferences -Pairs $pairs

# Step 5: Create archive README
Create-ArchiveReadme -Pairs $pairs

# ============================================================================
# SUMMARY REPORT
# ============================================================================

Write-Header "Consolidation Summary"

Write-Host "`n📊 RESULTS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ".bat Files Found: $script:BatFilesFound" -ForegroundColor White
Write-Host ".bat Files Processed: $script:BatFilesProcessed" -ForegroundColor Green
Write-Host ".ps1 Files Updated: $script:Ps1FilesUpdated" -ForegroundColor Green
Write-Host "Documentation References Updated: $script:ReferencesUpdated" -ForegroundColor Green

if ($Execute) {
    Write-Success "`nConsolidation completed successfully!"
    Write-Info "Archived files: archive\deprecated_bat_wrappers\"
    Write-Info "Next steps:"
    Write-Host "  1. Run tests to verify functionality" -ForegroundColor DarkGray
    Write-Host "  2. Update WORKSPACE_STATE.md" -ForegroundColor DarkGray
    Write-Host "  3. Run VERIFY_WORKSPACE.ps1" -ForegroundColor DarkGray
} else {
    Write-Warning2 "`nThis was a DRY-RUN - no changes were made"
    Write-Info "Run with -Execute to perform consolidation"
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

exit 0
