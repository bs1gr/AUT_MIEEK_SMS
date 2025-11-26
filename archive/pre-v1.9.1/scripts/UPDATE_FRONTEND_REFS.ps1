#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Updates frontend script references to use v2.0 consolidated scripts

.DESCRIPTION
    This script:
    - Updates translation files (help.js, controlPanel.js)
    - Updates React components (HelpDocumentation.tsx, ControlPanel.tsx)
    - Replaces deprecated script references with v2.0 equivalents
    - Validates all changes with frontend tests

.EXAMPLE
    .\UPDATE_FRONTEND_REFS.ps1
    # Dry-run (shows what would be changed)

.EXAMPLE
    .\UPDATE_FRONTEND_REFS.ps1 -Execute
    # Actually perform updates

.EXAMPLE
    .\UPDATE_FRONTEND_REFS.ps1 -Execute -RunTests
    # Execute and run frontend tests
#>

param(
    [switch]$Execute,    # Actually perform changes
    [switch]$RunTests,   # Run frontend tests after update
    [switch]$Verbose     # Show detailed output
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
$script:FilesUpdated = 0
$script:ReferencesReplaced = 0

# ============================================================================
# REFERENCE MAPPING
# ============================================================================

$REFERENCE_MAP = @{
    # Deprecated scripts → v2.0 equivalents
    "CLEANUP_OBSOLETE_FILES.ps1" = "DOCKER.ps1 -DeepClean"
    "run-native.ps1" = "NATIVE.ps1 -Start"
    "scripts\\dev\\run-native.ps1" = "NATIVE.ps1 -Start"
    "RUN.ps1" = "DOCKER.ps1 -Start"
    "INSTALL.ps1" = "DOCKER.ps1 -Install"
    "SMS.ps1" = "DOCKER.ps1 or NATIVE.ps1 (depending on mode)"
    
    # Old paths → new paths
    "scripts\\CLEANUP_OBSOLETE_FILES.ps1" = "DOCKER.ps1 -DeepClean"
    ".\\RUN.ps1" = ".\\DOCKER.ps1 -Start"
    ".\\INSTALL.ps1" = ".\\DOCKER.ps1 -Install"
    ".\\SMS.ps1" = ".\\DOCKER.ps1 or .\\NATIVE.ps1"
    
    # Documentation references
    "run native mode" = "start native development mode with NATIVE.ps1"
    "RUN script" = "DOCKER.ps1 script"
    "INSTALL script" = "DOCKER.ps1 installation"
}

# ============================================================================
# UPDATE TRANSLATION FILES
# ============================================================================

function Update-TranslationFile {
    param(
        [string]$FilePath,
        [string]$DisplayName
    )
    
    Write-Header "Updating: $DisplayName"
    
    if (-not (Test-Path $FilePath)) {
        Write-Warning2 "File not found: $FilePath"
        return
    }
    
    $content = Get-Content $FilePath -Raw
    $originalContent = $content
    $replacements = 0
    
    foreach ($old in $REFERENCE_MAP.Keys) {
        $new = $REFERENCE_MAP[$old]
        
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), $new
            $replacements++
            $script:ReferencesReplaced++
            Write-Info "  Replaced: '$old' → '$new'"
        }
    }
    
    if ($replacements -gt 0) {
        if ($Execute) {
            Set-Content -Path $FilePath -Value $content -NoNewline -Encoding UTF8
            Write-Success "  Updated $replacements references in $DisplayName"
            $script:FilesUpdated++
        } else {
            Write-Info "  Would update $replacements references"
        }
    } else {
        Write-Success "  No updates needed"
    }
}

# ============================================================================
# UPDATE REACT COMPONENTS
# ============================================================================

function Update-ReactComponent {
    param(
        [string]$FilePath,
        [string]$DisplayName
    )
    
    Write-Header "Updating: $DisplayName"
    
    if (-not (Test-Path $FilePath)) {
        Write-Warning2 "File not found: $FilePath"
        return
    }
    
    $content = Get-Content $FilePath -Raw
    $originalContent = $content
    $replacements = 0
    
    # Update JSX string literals
    foreach ($old in $REFERENCE_MAP.Keys) {
        $new = $REFERENCE_MAP[$old]
        
        # Match in JSX strings: {"old"} or 'old' or `old`
        $patterns = @(
            [regex]::Escape($old),
            "\{`"$([regex]::Escape($old))`"\}",
            "'$([regex]::Escape($old))'",
            "``$([regex]::Escape($old))``"
        )
        
        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                $content = $content -replace $pattern, $new
                $replacements++
                $script:ReferencesReplaced++
                Write-Info "  Replaced: '$old' → '$new'"
            }
        }
    }
    
    if ($replacements -gt 0) {
        if ($Execute) {
            Set-Content -Path $FilePath -Value $content -NoNewline -Encoding UTF8
            Write-Success "  Updated $replacements references in $DisplayName"
            $script:FilesUpdated++
        } else {
            Write-Info "  Would update $replacements references"
        }
    } else {
        Write-Success "  No updates needed"
    }
}

# ============================================================================
# RUN FRONTEND TESTS
# ============================================================================

function Invoke-FrontendTests {
    Write-Header "Running Frontend Tests"
    
    $frontendDir = Join-Path $PROJECT_ROOT "frontend"
    
    Push-Location $frontendDir
    try {
        Write-Info "Running npm test..."
        $result = npm run test -- --run 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "All frontend tests passed"
            return $true
        } else {
            Write-Error2 "Frontend tests failed"
            Write-Host $result -ForegroundColor Red
            return $false
        }
    }
    finally {
        Pop-Location
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Student Management System - Frontend Reference Update     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if (-not $Execute) {
    Write-Warning2 "DRY-RUN MODE - No changes will be made"
    Write-Info "Run with -Execute to perform actual updates`n"
}

# Step 1: Update translation files
$localesDir = Join-Path $PROJECT_ROOT "frontend\src\locales"

Update-TranslationFile `
    -FilePath (Join-Path $localesDir "en\help.js") `
    -DisplayName "help.js (English translations)"

Update-TranslationFile `
    -FilePath (Join-Path $localesDir "el\help.js") `
    -DisplayName "help.js (Greek translations)"

Update-TranslationFile `
    -FilePath (Join-Path $localesDir "en\controlPanel.js") `
    -DisplayName "controlPanel.js (English Control Panel translations)"

Update-TranslationFile `
    -FilePath (Join-Path $localesDir "el\controlPanel.js") `
    -DisplayName "controlPanel.js (Greek Control Panel translations)"

# Step 2: Update React components
$componentsDir = Join-Path $PROJECT_ROOT "frontend\src\components"

Update-ReactComponent `
    -FilePath (Join-Path $componentsDir "ControlPanel.tsx") `
    -DisplayName "ControlPanel.tsx (Control Panel component)"

Update-ReactComponent `
    -FilePath (Join-Path $componentsDir "common\ServerControl.tsx") `
    -DisplayName "ServerControl.tsx (Server Control component)"

# Step 3: Check for other occurrences
Write-Header "Scanning for Additional References"

$frontendSrc = Join-Path $PROJECT_ROOT "frontend\src"
$additionalFiles = Get-ChildItem -Path $frontendSrc -Recurse -Include "*.js","*.jsx","*.ts","*.tsx" `
    | Where-Object { 
        $_.Name -notmatch "test|spec" -and 
        $_.FullName -notmatch "node_modules|dist|build"
    }

$foundAdditional = $false
foreach ($file in $additionalFiles) {
    $content = Get-Content $file.FullName -Raw
    
    foreach ($old in $REFERENCE_MAP.Keys) {
        if ($content -match [regex]::Escape($old)) {
            Write-Warning2 "Found '$old' in: $($file.FullName)"
            $foundAdditional = $true
        }
    }
}

if (-not $foundAdditional) {
    Write-Success "No additional references found"
}

# Step 4: Run tests if requested
if ($Execute -and $RunTests) {
    $testsPassed = Invoke-FrontendTests
    
    if (-not $testsPassed) {
        Write-Error2 "Tests failed - consider reverting changes"
        exit 1
    }
}

# ============================================================================
# SUMMARY REPORT
# ============================================================================

Write-Header "Update Summary"

Write-Host "`n📊 RESULTS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Files Updated: $script:FilesUpdated" -ForegroundColor Green
Write-Host "References Replaced: $script:ReferencesReplaced" -ForegroundColor Green

Write-Host "`n📋 UPDATED MAPPINGS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
foreach ($old in $REFERENCE_MAP.Keys | Select-Object -First 6) {
    Write-Host "  $old" -ForegroundColor DarkGray
    Write-Host "    → $($REFERENCE_MAP[$old])" -ForegroundColor Green
}

if ($Execute) {
    Write-Success "`nUpdate completed successfully!"
    Write-Info "Next steps:"
    Write-Host "  1. Verify changes in frontend files" -ForegroundColor DarkGray
    Write-Host "  2. Run 'npm run test' to verify no regressions" -ForegroundColor DarkGray
    Write-Host "  3. Update WORKSPACE_STATE.md" -ForegroundColor DarkGray
    Write-Host "  4. Test application UI help/control panel sections" -ForegroundColor DarkGray
} else {
    Write-Warning2 "`nThis was a DRY-RUN - no changes were made"
    Write-Info "Run with -Execute to perform updates"
    Write-Info "Add -RunTests to automatically verify changes"
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

exit 0
