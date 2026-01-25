#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
  Automated markdown formatter to fix common linting issues.
.DESCRIPTION
  Fixes the following markdown lint issues across all .md files:
  - MD022: Missing blank line after headings
  - MD031: Missing blank line before/after code fences
  - MD032: Missing blank line before/after lists
  - FENCE_LANG: Unlabeled code fences (adds language tags)
.PARAMETER DocsPath
  Path to the docs directory (default: ./docs).
.PARAMETER DryRun
  Show changes without writing files (default: $false).
.PARAMETER Verbose
  Show detailed output for each file (default: $false).
#>

[CmdletBinding()]
param(
  [Parameter()] [string] $DocsPath = "./docs",
  [Parameter()] [switch] $DryRun,
  [Parameter()] [switch] $ShowVerbose
)

$ErrorActionPreference = "Continue"

if (-not (Test-Path $DocsPath)) {
  Write-Error "Docs path not found: $DocsPath"
  exit 1
}

$filesProcessed = 0
$filesModified = 0
$issuesFixed = 0

Write-Host "=== Markdown Formatter ===" -ForegroundColor Cyan
Write-Host "Path: $DocsPath" -ForegroundColor Gray
Write-Host "DryRun: $DryRun" -ForegroundColor Gray
Write-Host ""

$mdFiles = Get-ChildItem -Path $DocsPath -Filter "*.md" -Recurse
Write-Host "Found $($mdFiles.Count) markdown files to process." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $mdFiles) {
  $filesProcessed++
  $content = Get-Content -Path $file.FullName -Raw
  $originalContent = $content

  # Track fixes for this file
  $fileFixes = 0

  # ========== FIX 1: MD022 - Missing blank line after headings ==========
  # Match headings followed by non-blank content, insert blank line
  $pattern1 = '(^#{1,6}\s+[^\n]+\n)(?!\n)([^\n])'
  $replacement1 = "`$1`n`$2"
  $newContent1 = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern1, $replacement1, 'Multiline')
  if ($newContent1 -ne $content) {
    $fileFixes += ($content | Select-String $pattern1 -AllMatches | Measure-Object).Count
    $content = $newContent1
  }

  # ========== FIX 2: MD031 - Missing blank line before fenced code blocks ==========
  # Ensure blank line before ``` (but not at start of file or after blank line already)
  $pattern2 = '(?<!`\n)(?<!\n\n)(^```)'
  $replacement2 = "`n`$1"
  $newContent2 = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern2, $replacement2, 'Multiline')
  if ($newContent2 -ne $content) {
    $fileFixes += ($content | Select-String $pattern2 -AllMatches | Measure-Object).Count
    $content = $newContent2
  }

  # ========== FIX 3: MD031 - Missing blank line after fenced code blocks ==========
  # Ensure blank line after ``` (closing fence)
  $pattern3 = '(^```\s*$)(?!\n)([^\n])'
  $replacement3 = "`$1`n`$2"
  $newContent3 = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern3, $replacement3, 'Multiline')
  if ($newContent3 -ne $content) {
    $fileFixes += ($content | Select-String $pattern3 -AllMatches | Measure-Object).Count
    $content = $newContent3
  }

  # ========== FIX 4: FENCE_LANG - Unlabeled code fences ==========
  # Replace bare ``` with ```text (or infer from context if detectable)
  $pattern4 = '^```\s*$'
  $newContent4 = $content
  $fenceMatches = [System.Text.RegularExpressions.Regex]::Matches($content, $pattern4, 'Multiline')
  if ($fenceMatches.Count -gt 0) {
    # Process from bottom to top to preserve indices
    for ($i = $fenceMatches.Count - 1; $i -ge 0; $i--) {
      $match = $fenceMatches[$i]
      $newContent4 = $newContent4.Substring(0, $match.Index) + '```text' + $newContent4.Substring($match.Index + $match.Length)
      $fileFixes++
    }
  }
  $content = $newContent4

  # ========== FIX 5: MD032 - Missing blank line before lists ==========
  # Ensure blank line before list items (- or * or +) when preceded by non-blank
  $pattern5 = '(?<!^)\n(?<!`\n)(?<!\n)(^\s*[-*+]\s+)'
  $replacement5 = "`n`n`$1"
  $newContent5 = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern5, $replacement5, 'Multiline')
  if ($newContent5 -ne $content) {
    $fileFixes += ($content | Select-String $pattern5 -AllMatches | Measure-Object).Count
    $content = $newContent5
  }

  # ========== FIX 6: MD032 - Missing blank line after lists ==========
  # Ensure blank line after list items when followed by non-list content
  $pattern6 = '(^\s*[-*+]\s+[^\n]+\n)(?!\s*[-*+]\s+)(?!\n)([^\n])'
  $replacement6 = "`$1`n`$2"
  $newContent6 = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern6, $replacement6, 'Multiline')
  if ($newContent6 -ne $content) {
    $fileFixes += ($content | Select-String $pattern6 -AllMatches | Measure-Object).Count
    $content = $newContent6
  }

  if ($content -ne $originalContent) {
    $filesModified++
    $issuesFixed += $fileFixes

    if ($ShowVerbose) {
      Write-Host "  ✓ $($file.Name) - $fileFixes issues fixed" -ForegroundColor Green
    }

    if (-not $DryRun) {
      Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    }
  } elseif ($ShowVerbose) {
    Write-Host "  ○ $($file.Name) - no changes" -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Files processed: $filesProcessed"
Write-Host "Files modified: $filesModified"
Write-Host "Issues fixed: $issuesFixed"
if ($DryRun) {
  Write-Host "(DryRun mode - no files were written)" -ForegroundColor Yellow
} else {
  Write-Host "✅ Markdown files updated successfully" -ForegroundColor Green
}
