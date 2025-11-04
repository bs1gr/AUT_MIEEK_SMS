param(
  [string]$runId = '19072208065',
  [string]$repo = 'bs1gr/AUT_MIEEK_SMS',
  [int]$pr = 8,
  [int]$timeout = 600,
  [int]$interval = 10
)

$elapsed = 0
$conclusion = $null
Write-Output "Polling run $runId for up to $timeout seconds (interval ${interval}s)..."
while ($elapsed -lt $timeout) {
  try {
    $conclusion = gh run view $runId --json conclusion -q '.conclusion' 2>$null
  } catch {
    $conclusion = $null
  }
  if (-not $conclusion) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    Write-Output "waiting... ($elapsed/$timeout)s"
    continue
  }
  Write-Output "Run concluded: $conclusion"
  Write-Output "--- Log start ---"
  gh run view $runId --log
  Write-Output "--- Log end ---"
  break
}

if (-not $conclusion) {
  Write-Output "Timed out waiting for run $runId (elapsed $elapsed s)."
  exit 2
}

if ($conclusion -eq 'success') {
  Write-Output "Static-analysis succeeded — merging PR #$pr (will delete branch)."
    $mergeCmd = "gh pr merge $pr --repo $repo --merge --delete-branch"
    Write-Host "Running: $mergeCmd"
    try {
      $mergeResult = & gh pr merge $pr --repo $repo --merge --delete-branch 2>&1
      $exit = $LASTEXITCODE
      Write-Host $mergeResult
      if ($exit -ne 0) {
        Write-Host "Merge failed (exit code $exit). See output above."
      } else {
        Write-Host "PR #$pr merged and branch deleted."
      }
    } catch {
      Write-Host "Exception while running gh: $_"
    }
  exit $LASTEXITCODE
} else {
  Write-Output "Run concluded with conclusion='$conclusion' — not merging PR."
  exit 3
}
