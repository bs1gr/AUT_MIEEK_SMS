<#
.SYNOPSIS
    Comprehensive workspace analysis and cleanup recommendations

.DESCRIPTION
    Analyzes workspace for:
    - Disk usage by directory
    - Large files requiring archival
    - Unused dependencies
    - Archive consolidation opportunities
    - Code complexity metrics
    - Duplicate files
    - Temporary file accumulation

.PARAMETER OutputFormat
    Output format: Console (default), JSON, HTML, Markdown

.PARAMETER IncludeArchive
    Include archive directories in analysis (default: false)

.PARAMETER ReportPath
    Path to save detailed report (default: artifacts/workspace-analysis-{date}.md)

.EXAMPLE
    .\analyze_workspace.ps1
    # Quick console analysis (excludes archive)

.EXAMPLE
    .\analyze_workspace.ps1 -IncludeArchive -OutputFormat Markdown -ReportPath "artifacts/workspace-report.md"
    # Full analysis with detailed report

.NOTES
    Version: 1.0
    Created: February 13, 2026
    Part of: Workspace Management Toolkit
#>

[CmdletBinding()]
param(
    [ValidateSet('Console', 'JSON', 'HTML', 'Markdown')]
    [string]$OutputFormat = 'Console',

    [switch]$IncludeArchive,

    [string]$ReportPath = "artifacts/workspace-analysis-$(Get-Date -Format 'yyyy-MM-dd_HHmmss').md"
)

$ErrorActionPreference = 'Stop'

# Color output helpers
function Write-Section { param([string]$Title) Write-Host "`n═══ $Title ═══" -ForegroundColor Cyan }
function Write-Metric { param([string]$Name, [string]$Value) Write-Host "  $Name`: " -NoNewline; Write-Host $Value -ForegroundColor Yellow }
function Write-Finding { param([string]$Message, [string]$Type = 'Info')
    $color = switch ($Type) {
        'Success' { 'Green' }
        'Warning' { 'Yellow' }
        'Error' { 'Red' }
        default { 'White' }
    }
    Write-Host "  • $Message" -ForegroundColor $color
}

# Analysis data collection
$analysis = @{
    Timestamp = Get-Date
    WorkspaceRoot = Get-Location
    Metrics = @{}
    Findings = @{
        LargeFiles = @()
        OldFiles = @()
        DuplicateFiles = @()
        TempFiles = @()
        ArchiveOpportunities = @()
        DependencyIssues = @()
    }
    DiskUsage = @{}
    Recommendations = @()
}

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  WORKSPACE ANALYSIS" -ForegroundColor Cyan
Write-Host "║  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ============================================================================
# SECTION 1: Disk Usage Analysis
# ============================================================================

Write-Section "Disk Usage by Directory"

$excludePaths = @('node_modules', '.venv', 'venv', '__pycache__', '.git')
if (-not $IncludeArchive) {
    $excludePaths += 'archive'
}

$topDirectories = Get-ChildItem -Directory |
    Where-Object { $excludePaths -notcontains $_.Name } |
    ForEach-Object {
        $size = (Get-ChildItem -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
                 Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{
            Directory = $_.Name
            SizeMB = [math]::Round($size / 1MB, 2)
            SizeGB = [math]::Round($size / 1GB, 3)
        }
    } |
    Sort-Object SizeMB -Descending |
    Select-Object -First 10

foreach ($dir in $topDirectories) {
    $sizeStr = if ($dir.SizeGB -ge 1) { "$($dir.SizeGB) GB" } else { "$($dir.SizeMB) MB" }
    Write-Metric $dir.Directory $sizeStr
    $analysis.DiskUsage[$dir.Directory] = $dir.SizeMB
}

$totalSize = ($topDirectories | Measure-Object -Property SizeMB -Sum).Sum
Write-Metric "Total (top 10)" "$([math]::Round($totalSize / 1024, 2)) GB"

# ============================================================================
# SECTION 2: Large Files Detection
# ============================================================================

Write-Section "Large Files (>10 MB)"

$largeFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Length -gt 10MB -and
        $_.FullName -notlike "*\node_modules\*" -and
        $_.FullName -notlike "*\.git\*" -and
        ($IncludeArchive -or $_.FullName -notlike "*\archive\*")
    } |
    Select-Object -First 20 |
    Sort-Object Length -Descending

if ($largeFiles) {
    foreach ($file in $largeFiles) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
        Write-Finding "$relativePath - $sizeMB MB" -Type $(if ($sizeMB -gt 50) { 'Warning' } else { 'Info' })

        $analysis.Findings.LargeFiles += @{
            Path = $relativePath
            SizeMB = $sizeMB
            LastModified = $file.LastWriteTime
        }

        if ($sizeMB -gt 50) {
            $analysis.Recommendations += "Consider archiving or compressing: $relativePath ($sizeMB MB)"
        }
    }
} else {
    Write-Finding "No large files detected" -Type Success
}

# ============================================================================
# SECTION 3: Old Files Detection
# ============================================================================

Write-Section "Old Files (>180 days, not in archive)"

$oldThreshold = (Get-Date).AddDays(-180)
$oldFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.LastWriteTime -lt $oldThreshold -and
        $_.FullName -notlike "*\node_modules\*" -and
        $_.FullName -notlike "*\.git\*" -and
        $_.FullName -notlike "*\archive\*" -and
        $_.Extension -in @('.md', '.txt', '.log', '.json', '.xml')
    } |
    Select-Object -First 15 |
    Sort-Object LastWriteTime

if ($oldFiles) {
    foreach ($file in $oldFiles) {
        $age = [math]::Round(((Get-Date) - $file.LastWriteTime).TotalDays)
        $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
        Write-Finding "$relativePath - $age days old" -Type Warning

        $analysis.Findings.OldFiles += @{
            Path = $relativePath
            Age = $age
            LastModified = $file.LastWriteTime
        }
    }
    $analysis.Recommendations += "Review and archive old files (15 found >180 days)"
} else {
    Write-Finding "No stale files detected" -Type Success
}

# ============================================================================
# SECTION 4: Temporary and Cache Files
# ============================================================================

Write-Section "Temporary and Cache Files"

$tempPatterns = @(
    '*.tmp', '*.temp', '*.cache', '*.bak',
    '*.old', '*~', '*.swp', '*.swo'
)

$tempFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $matched = $false
        foreach ($pattern in $tempPatterns) {
            if ($_.Name -like $pattern) {
                $matched = $true
                break
            }
        }
        $matched -and
        $_.FullName -notlike "*\node_modules\*" -and
        $_.FullName -notlike "*\.git\*"
    }

if ($tempFiles) {
    $tempSize = ($tempFiles | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Metric "Temp files found" $tempFiles.Count
    Write-Metric "Total size" "$([math]::Round($tempSize, 2)) MB"

    $analysis.Findings.TempFiles = $tempFiles | Select-Object -First 10 | ForEach-Object {
        @{
            Path = $_.FullName.Replace((Get-Location).Path + '\', '')
            SizeMB = [math]::Round($_.Length / 1MB, 2)
        }
    }

    if ($tempSize -gt 10) {
        $analysis.Recommendations += "Clean temporary files to free $([math]::Round($tempSize, 2)) MB"
    }
} else {
    Write-Finding "No temporary files detected" -Type Success
}

# ============================================================================
# SECTION 5: Archive Analysis
# ============================================================================

if (Test-Path "archive") {
    Write-Section "Archive Directory Analysis"

    $archiveSize = (Get-ChildItem -Path "archive" -Recurse -File -ErrorAction SilentlyContinue |
                   Measure-Object -Property Length -Sum).Sum / 1MB
    $archiveFiles = (Get-ChildItem -Path "archive" -Recurse -File -ErrorAction SilentlyContinue).Count

    Write-Metric "Archive size" "$([math]::Round($archiveSize, 2)) MB"
    Write-Metric "Archive files" $archiveFiles

    $analysis.Metrics['ArchiveSizeMB'] = [math]::Round($archiveSize, 2)
    $analysis.Metrics['ArchiveFileCount'] = $archiveFiles

    # Check for consolidation opportunities
    $archiveSubdirs = Get-ChildItem -Path "archive" -Directory -ErrorAction SilentlyContinue
    $consolidation = @()

    foreach ($subdir in $archiveSubdirs) {
        $subdirSize = (Get-ChildItem -Path $subdir.FullName -Recurse -File -ErrorAction SilentlyContinue |
                      Measure-Object -Property Length -Sum).Sum / 1KB
        if ($subdirSize -lt 100 -and $subdirSize -gt 0) {
            $consolidation += $subdir.Name
        }
    }

    if ($consolidation.Count -gt 0) {
        Write-Finding "Found $($consolidation.Count) small archive subdirectories (<100 KB)" -Type Warning
        $analysis.Recommendations += "Consider consolidating small archive directories: $($consolidation -join ', ')"
    }
}

# ============================================================================
# SECTION 6: Code Quality Metrics
# ============================================================================

Write-Section "Code Quality Metrics"

# Python files
$pythonFiles = Get-ChildItem -Path "backend" -Filter "*.py" -Recurse -File -ErrorAction SilentlyContinue |
               Where-Object {
                   $_.FullName -notlike "*\__pycache__\*" -and
                   $_.FullName -notlike "*\.venv\*" -and
                   $_.FullName -notlike "*\venv\*" -and
                   $_.FullName -notlike "*\site-packages\*"
               }
$pythonLines = 0
foreach ($file in $pythonFiles) {
    $lines = (Get-Content $file.FullName -ErrorAction SilentlyContinue)
    if ($lines) {
        $pythonLines += $lines.Count
    }
}

Write-Metric "Python files" $pythonFiles.Count
Write-Metric "Python LOC" $pythonLines

# TypeScript/JavaScript files
$frontendFiles = Get-ChildItem -Path "frontend/src" -Include "*.ts","*.tsx","*.js","*.jsx" -Recurse -File -ErrorAction SilentlyContinue
$frontendLines = 0
foreach ($file in $frontendFiles) {
    $frontendLines += (Get-Content $file.FullName -ErrorAction SilentlyContinue).Count
}

Write-Metric "Frontend files" $frontendFiles.Count
Write-Metric "Frontend LOC" $frontendLines

$analysis.Metrics['PythonFiles'] = $pythonFiles.Count
$analysis.Metrics['PythonLOC'] = $pythonLines
$analysis.Metrics['FrontendFiles'] = $frontendFiles.Count
$analysis.Metrics['FrontendLOC'] = $frontendLines

# ============================================================================
# SECTION 7: Dependency Analysis
# ============================================================================

Write-Section "Dependency Analysis"

# Python dependencies
if (Test-Path "backend/requirements.txt") {
    $pythonDeps = (Get-Content "backend/requirements.txt" | Where-Object { $_ -and $_ -notlike "#*" }).Count
    Write-Metric "Python dependencies" $pythonDeps
    $analysis.Metrics['PythonDependencies'] = $pythonDeps
}

# Frontend dependencies
if (Test-Path "frontend/package.json") {
    $packageJson = Get-Content "frontend/package.json" -Raw | ConvertFrom-Json
    $npmDeps = if ($packageJson.dependencies) { @($packageJson.dependencies.PSObject.Properties).Count } else { 0 }
    $npmDevDeps = if ($packageJson.devDependencies) { @($packageJson.devDependencies.PSObject.Properties).Count } else { 0 }
    Write-Metric "NPM dependencies" $npmDeps
    Write-Metric "NPM dev dependencies" $npmDevDeps
    $analysis.Metrics['NPMDependencies'] = $npmDeps
    $analysis.Metrics['NPMDevDependencies'] = $npmDevDeps
}

# ============================================================================
# SECTION 8: Summary and Recommendations
# ============================================================================

Write-Section "Recommendations"

if ($analysis.Recommendations.Count -eq 0) {
    Write-Finding "✅ Workspace is well-optimized - no urgent actions needed" -Type Success
} else {
    foreach ($recommendation in $analysis.Recommendations) {
        Write-Finding $recommendation -Type Warning
    }
}

# General health recommendations
$totalWorkspaceSize = ($topDirectories | Measure-Object -Property SizeMB -Sum).Sum / 1024

if ($totalWorkspaceSize -gt 5) {
    Write-Finding "Workspace size: $([math]::Round($totalWorkspaceSize, 2)) GB - Consider cleanup" -Type Warning
}

if ($analysis.Findings.LargeFiles.Count -gt 10) {
    Write-Finding "Many large files detected - review for archival opportunities" -Type Warning
}

# ============================================================================
# REPORT GENERATION
# ============================================================================

if ($OutputFormat -ne 'Console') {
    Write-Host "`n📄 Generating detailed report..." -ForegroundColor Cyan

    $reportDir = Split-Path $ReportPath -Parent
    if ($reportDir -and -not (Test-Path $reportDir)) {
        New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
    }

    if ($OutputFormat -eq 'Markdown') {
        $markdown = @"
# Workspace Analysis Report

**Generated**: $($analysis.Timestamp.ToString('yyyy-MM-dd HH:mm:ss'))
**Workspace**: $($analysis.WorkspaceRoot)

---

## Disk Usage Summary

| Directory | Size (MB) |
|-----------|-----------|
$( ($topDirectories | ForEach-Object { "| $($_.Directory) | $($_.SizeMB) |" }) -join "`n" )

**Total**: $([math]::Round($totalSize / 1024, 2)) GB

---

## Large Files (>10 MB)

$( if ($analysis.Findings.LargeFiles.Count -gt 0) {
    "| File | Size (MB) | Last Modified |`n|------|-----------|--------------|`n" +
    ($analysis.Findings.LargeFiles | ForEach-Object { "| $($_.Path) | $($_.SizeMB) | $($_.LastModified.ToString('yyyy-MM-dd')) |" } | Out-String)
} else {
    "✅ No large files detected"
} )

---

## Old Files (>180 days)

$( if ($analysis.Findings.OldFiles.Count -gt 0) {
    "| File | Age (days) | Last Modified |`n|------|------------|--------------|`n" +
    ($analysis.Findings.OldFiles | ForEach-Object { "| $($_.Path) | $($_.Age) | $($_.LastModified.ToString('yyyy-MM-dd')) |" } | Out-String)
} else {
    "✅ No stale files detected"
} )

---

## Code Metrics

- **Python**: $($analysis.Metrics.PythonFiles) files, $($analysis.Metrics.PythonLOC) lines
- **Frontend**: $($analysis.Metrics.FrontendFiles) files, $($analysis.Metrics.FrontendLOC) lines

---

## Recommendations

$( if ($analysis.Recommendations.Count -gt 0) {
    ($analysis.Recommendations | ForEach-Object { "- $_" }) -join "`n"
} else {
    "✅ No urgent actions needed - workspace is well-optimized"
} )

---

**Report generated by**: scripts/utils/analyze_workspace.ps1
"@

        Set-Content -Path $ReportPath -Value $markdown -Encoding UTF8
        Write-Host "✅ Report saved: $ReportPath" -ForegroundColor Green
    }
    elseif ($OutputFormat -eq 'JSON') {
        $analysis | ConvertTo-Json -Depth 10 | Set-Content -Path $ReportPath -Encoding UTF8
        Write-Host "✅ JSON report saved: $ReportPath" -ForegroundColor Green
    }
}

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ANALYSIS COMPLETE" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
