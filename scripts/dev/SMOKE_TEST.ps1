# Student Management System - Smoke Test
param(
    [int]$TimeoutSec = 8
)

$ErrorActionPreference = 'Stop'

function Test-HttpEndpoint {
    param(
        [Parameter(Mandatory=$true)][string]$Url,
        [int]$TimeoutSec = 8
    )
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec
        [pscustomobject]@{
            Url        = $Url
            StatusCode = $resp.StatusCode
            Success    = $true
            Note       = ''
        }
    }
    catch {
        $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        [pscustomobject]@{
            Url        = $Url
            StatusCode = $status
            Success    = $false
            Note       = $_.Exception.Message
        }
    }
}

Write-Host "=== SMS Smoke Test ===" -ForegroundColor Cyan

$candidates = @(
    'http://localhost:8080',
    'http://localhost:8000'
)

$base = $null
$healthResult = $null
foreach ($cand in $candidates) {
    $probe = Test-HttpEndpoint -Url ("$cand/health") -TimeoutSec $TimeoutSec
    if ($probe.Success -and $probe.StatusCode -eq 200) {
        $base = $cand
        $healthResult = $probe
        break
    }
}

if (-not $base) {
    Write-Host "Health check failed on all candidates (8080, 8000)." -ForegroundColor Red
    foreach ($cand in $candidates) {
        $r = Test-HttpEndpoint -Url ("$cand/health") -TimeoutSec $TimeoutSec
        Write-Host (" - {0} -> {1} {2}" -f $r.Url, $r.StatusCode, ($(if($r.Success){'OK'}else{'FAIL'})))
        if (-not $r.Success -and $r.Note) { Write-Host ("   Note: {0}" -f $r.Note) }
    }
    exit 1
}

Write-Host ("Base URL: {0}" -f $base) -ForegroundColor Green
Write-Host ("Health: {0} -> {1}" -f $healthResult.Url, $healthResult.StatusCode)

# Optional endpoints
$optional = @('health/ready','health/live','control','')
$results = @()
foreach ($path in $optional) {
    $url = if ($path -eq '') { "$base/" } else { "$base/$path" }
    $res = Test-HttpEndpoint -Url $url -TimeoutSec $TimeoutSec
    $results += $res
}

foreach ($r in $results) {
    $statusLabel = if ($r.Success -and $r.StatusCode -eq 200) { 'OK' } elseif ($r.StatusCode -eq 404) { 'NOT FOUND' } else { 'FAIL' }
    Write-Host (" - {0} -> {1} ({2})" -f $r.Url, $r.StatusCode, $statusLabel)
}

# Frontend dev server (native mode) check
if ($base -eq 'http://localhost:8000') {
    $vite = Test-HttpEndpoint -Url 'http://localhost:5173' -TimeoutSec $TimeoutSec
    $viteLabel = if ($vite.Success -and $vite.StatusCode -in 200..399) { 'OK' } else { 'OFF' }
    Write-Host ("Vite dev server: http://localhost:5173 -> {0} ({1})" -f $vite.StatusCode, $viteLabel)
}

# Exit code: success if base health was 200
exit 0
