<#
.SYNOPSIS
  Simple documentation audit: checks Last Updated dates and presence of status banners.
.DESCRIPTION
  Scans docs and root markdown files, reports files older than 120 days, missing status markers for drafts/deprecated.
.NOTES
  Draft utility – extend with link validation or CI integration later.
#>

Param(
  [int]$MaxAgeDays = 120
)

Write-Host "[audit] Starting documentation audit..." -ForegroundColor Cyan

$now = Get-Date
$files = Get-ChildItem -Path (Join-Path $PSScriptRoot '..' '..' 'docs') -Filter *.md -Recurse
$rootFiles = Get-ChildItem -Path (Join-Path $PSScriptRoot '..' '..') -Filter *.md | Where-Object { $_.Name -in @('README.md','TODO.md','CHANGELOG.md','INSTALLATION_GUIDE.md','DEPLOYMENT_GUIDE.md') }
$all = $files + $rootFiles | Sort-Object FullName -Unique

$result = @()

foreach ($f in $all) {
  $content = Get-Content $f.FullName -ErrorAction SilentlyContinue
  if (-not $content) { continue }

  $lastUpdatedLine = $content | Select-String -Pattern '^\*\*Last Updated\*\*:\s*(.+)$'
  # Accept either blockquote status ("> **Status**:") or plain status line ("**Status**:")
  $statusLine = $content | Select-String -Pattern '^> *\*\*Status\*\*:|^\*\*Status\*\*:'

  $ageDays = $null
  $lastUpdated = $null
  if ($lastUpdatedLine) {
    $dateText = $lastUpdatedLine.Matches[0].Groups[1].Value.Trim()
    $lastUpdated = Get-Date $dateText -ErrorAction SilentlyContinue
    if ($lastUpdated) {
      $ageDays = [int]($now - $lastUpdated).TotalDays
    }
  }

  $flags = @()
  if ($ageDays -ne $null -and $ageDays -gt $MaxAgeDays) { $flags += "STALE:$ageDays" }
  if (-not $statusLine -and ($f.Name -match 'RUNBOOK|API_EXAMPLES|ARCHITECTURE_DIAGRAMS|LOAD_TEST_PLAYBOOK')) { $flags += 'MISSING_STATUS' }

  if ($flags.Count -gt 0) {
    $result += [PSCustomObject]@{ File = $f.FullName; Flags = ($flags -join ', ') }
  }
}

if ($result.Count -eq 0) {
  Write-Host "[audit] No issues detected." -ForegroundColor Green
} else {
  Write-Host "[audit] Issues:" -ForegroundColor Yellow
  $result | Format-Table -AutoSize
}

Write-Host "[audit] Completed." -ForegroundColor Cyan
